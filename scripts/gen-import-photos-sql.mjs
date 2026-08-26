#!/usr/bin/env node
/**
 * Generate idempotent SQL that imports guest photos from the Oshioma events
 * app into a retreat's `retreat_photos` — for environments that have the
 * Postgres connection string (like the db-migrate GitHub workflow) but not
 * the Supabase service-role API key.
 *
 * The events app exposes a small public JSON endpoint,
 *   /api/public/event-photos?eventId=<uuid>
 * returning the event plus every photo with its daily-event label. This
 * script reads that, maps the daily events to retreat day numbers, and prints
 * SQL on stdout. Pipe it to psql:
 *
 *   RETREAT=zanzibargeminibirthdaycelebration \
 *   SOURCE_SITE=https://www.oshioma.com \
 *   SOURCE_EVENT=<event uuid> \
 *   node scripts/gen-import-photos-sql.mjs > import.sql
 *   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f import.sql
 *
 * Env:
 *   RETREAT        (required) target retreat slug / subdomain label / host
 *   SOURCE_EVENT   (required) source event UUID
 *   SOURCE_SITE    events app origin (default https://www.oshioma.com)
 *   SOURCE_ENDPOINT  full endpoint URL, overrides SOURCE_SITE/SOURCE_EVENT
 *
 * This links the source image URLs (SQL can't copy storage objects). For a
 * full file copy into this project's own bucket, run
 * scripts/import-event-photos.mjs with API keys; it dedupes against these
 * rows by URL either way.
 */

const die = (msg) => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};
const log = (msg) => console.error(msg); // stderr, so stdout stays pure SQL

const RETREAT = process.env.RETREAT || die("Set RETREAT");
const SOURCE_SITE = (process.env.SOURCE_SITE || "https://www.oshioma.com").replace(/\/$/, "");
const SOURCE_EVENT = process.env.SOURCE_EVENT;
const ENDPOINT =
  process.env.SOURCE_ENDPOINT ||
  (SOURCE_EVENT
    ? `${SOURCE_SITE}/api/public/event-photos?eventId=${encodeURIComponent(SOURCE_EVENT)}`
    : die("Set SOURCE_EVENT (the source event UUID) or SOURCE_ENDPOINT."));

const label = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);

/**
 * Map each distinct day label to a retreat day number by ordering the labels
 * chronologically and numbering them 1, 2, 3, … — so the trip's first day of
 * photos becomes retreat Day 1, regardless of the source event's absolute
 * dates or gaps. Handles date labels ("15 June 26") and "Day N" labels; any
 * label that sorts is ranked, unrecognised ones fall to the end.
 *
 * (A retreat and the source event don't share a calendar, so a sequential
 * mapping is the predictable choice; the host can fine-tune any photo in
 * Studio → Guest photos afterwards.)
 */
function buildDayMap(labels) {
  const sortKey = (l) => {
    // Explicit "Day 3" wins first — Date.parse is lenient enough to mis-read it.
    const dayN = /\bday\s*(\d+)/i.exec(l);
    if (dayN) return { a: 0, b: Number(dayN[1]) };
    const t = Date.parse(l);
    if (!Number.isNaN(t)) return { a: 1, b: t };
    const m = /(\d+)/.exec(l);
    if (m) return { a: 2, b: Number(m[1]) };
    return { a: 3, b: 0, s: l };
  };
  const distinct = [...new Set(labels.filter(Boolean).map(String))];
  distinct.sort((x, y) => {
    const kx = sortKey(x), ky = sortKey(y);
    return kx.a - ky.a || kx.b - ky.b || String(kx.s ?? "").localeCompare(String(ky.s ?? ""));
  });
  const map = new Map();
  distinct.forEach((l, i) => map.set(l, i + 1));
  return map;
}

async function main() {
  log(`Fetching ${ENDPOINT}`);
  const res = await fetch(ENDPOINT, {
    headers: { "user-agent": "ParadiseBeyondImport/1.0", accept: "application/json" },
  });
  if (!res.ok) die(`Endpoint returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
  let data;
  try {
    data = JSON.parse(await res.text());
  } catch {
    die("Endpoint did not return JSON — check the URL and that it's deployed.");
  }
  const event = data.event ?? {};
  const photos = Array.isArray(data.photos) ? data.photos : [];
  log(`Source event: "${event.name || event.slug || SOURCE_EVENT}" — ${photos.length} photo(s).`);
  if (!photos.length) die("The endpoint returned no photos.");
  // Diagnostic: which fields the endpoint actually returns, and how many
  // photos carry a daily-event label (so we can see whether day allocation
  // is coming through).
  log(`  photo fields: ${Object.keys(photos[0] || {}).join(", ")}`);
  const dayField = (p) => p.day_label ?? p.dayLabel ?? p.day ?? null;
  const titleField = (p) => p.item_title ?? p.itemTitle ?? p.title ?? null;
  const withDay = photos.filter((p) => dayField(p)).length;
  const dayMap = buildDayMap(photos.map(dayField));
  log(`  photos with a day label: ${withDay}/${photos.length}`);
  log(`  day mapping: ${[...dayMap].map(([l, n]) => `${l}→${n}`).join(", ") || "none"}`);

  const rows = [];
  for (const p of photos) {
    const imageUrl = p.image_url ?? p.url;
    if (typeof imageUrl !== "string" || !/^https:\/\//.test(imageUrl)) continue;
    const day = dayField(p) ? dayMap.get(String(dayField(p))) ?? null : null;
    const caption = [dayField(p), titleField(p)].filter(Boolean).join(" · ").slice(0, 300) || null;
    rows.push(`(${q(imageUrl.slice(0, 2000))}, ${day ?? "null"}::int, ${q(caption)})`);
  }
  if (!rows.length) die("No importable photo URLs (expected https image_url values).");

  const key = label(String(RETREAT).replace(/^https?:\/\//, "").split(".")[0]);
  console.log(`-- Import ${rows.length} guest photos from ${ENDPOINT}
-- into retreat "${RETREAT}". Idempotent: re-runs skip URLs the retreat
-- already has. Generated by scripts/gen-import-photos-sql.mjs.
do $$
declare
  exp uuid;
  dur int;
begin
  -- duration is an enum ('7' | '14'), so cast via text for the day-cap check.
  select id, (duration::text)::int into exp, dur from experiences
  where lower(coalesce(subdomain, '')) = '${key}'
     or lower(regexp_replace(slug, '[^a-z0-9]', '', 'g')) = '${key}'
     or slug = ${q(RETREAT)}
  limit 1;
  if exp is null then
    raise exception 'No retreat matches "${key}"';
  end if;

  create temporary table _incoming (url text, day int, caption text) on commit drop;
  insert into _incoming (url, day, caption) values
    ${rows.join(",\n    ")};

  -- Insert photos this retreat doesn't have yet.
  insert into retreat_photos (experience_id, url, day_number, caption, source, published)
  select exp,
         v.url,
         case when v.day is not null and v.day <= dur then v.day end,
         v.caption,
         'import',
         true
  from _incoming v
  where not exists (
    select 1 from retreat_photos rp where rp.experience_id = exp and rp.url = v.url
  );

  -- (Re-)sync day allocation onto import rows from the current mapping. Scoped
  -- to source='import' so host/guest photos are never touched, and only when a
  -- day is now known (v.day not null) so a gallery photo is never disturbed.
  -- A re-run therefore re-syncs imported photos to the latest mapping; manual
  -- fine-tuning of imported photos should be done after the final import.
  update retreat_photos rp
     set day_number = case when v.day <= dur then v.day end,
         caption    = coalesce(rp.caption, v.caption)
    from _incoming v
   where rp.experience_id = exp
     and rp.url = v.url
     and rp.source = 'import'
     and v.day is not null
     and rp.day_number is distinct from (case when v.day <= dur then v.day end);

  raise notice 'Imported/updated photos for retreat %', exp;
end $$;`);
}

main().catch((e) => die(e instanceof Error ? e.stack || e.message : String(e)));
