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
 * script reads that and prints SQL on stdout that adds every photo to the
 * retreat's general "Guest memories" gallery. Photos are NOT allocated to
 * itinerary days by the import: a retreat and the source event don't share a
 * calendar, so day allocation is done by hand in Studio → Guest photos, and
 * a re-run never touches the day of a photo the retreat already has. The
 * source's day label is kept in the caption as a hint. Pipe it to psql:
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
 *   CLEAR_IMPORTED_DAYS=1  one-off: also reset day_number to null on every
 *                  imported photo of this retreat (undoes an earlier automatic
 *                  day mapping). Manual allocations made afterwards are kept
 *                  on later runs because the flag is off by default.
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

const CLEAR_IMPORTED_DAYS = process.env.CLEAR_IMPORTED_DAYS === "1";

const label = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);

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
  const labels = [...new Set(photos.map(dayField).filter(Boolean).map(String))];
  log(`  photos with a source day label: ${withDay}/${photos.length}${labels.length ? ` (${labels.join(", ")})` : ""}`);
  log(`  day allocation: none — every photo goes to the gallery; allocate days in Studio → Guest photos.`);
  if (CLEAR_IMPORTED_DAYS) log(`  CLEAR_IMPORTED_DAYS=1: resetting day_number on this retreat's imported photos.`);

  const rows = [];
  for (const p of photos) {
    const imageUrl = p.image_url ?? p.url;
    if (typeof imageUrl !== "string" || !/^https:\/\//.test(imageUrl)) continue;
    // Keep the source's day label + item title as a caption hint for whoever
    // allocates days by hand later.
    const caption = [dayField(p), titleField(p)].filter(Boolean).join(" · ").slice(0, 300) || null;
    rows.push(`(${q(imageUrl.slice(0, 2000))}, ${q(caption)})`);
  }
  if (!rows.length) die("No importable photo URLs (expected https image_url values).");

  const key = label(String(RETREAT).replace(/^https?:\/\//, "").split(".")[0]);
  console.log(`-- Import ${rows.length} guest photos from ${ENDPOINT}
-- into retreat "${RETREAT}" (gallery only; days are allocated by hand).
-- Idempotent: re-runs skip URLs the retreat already has and never change the
-- day of an existing photo. Generated by scripts/gen-import-photos-sql.mjs.
do $$
declare
  exp uuid;
begin
  select id into exp from experiences
  where lower(coalesce(subdomain, '')) = '${key}'
     or lower(regexp_replace(slug, '[^a-z0-9]', '', 'g')) = '${key}'
     or slug = ${q(RETREAT)}
  limit 1;
  if exp is null then
    raise exception 'No retreat matches "${key}"';
  end if;

  create temporary table _incoming (url text, caption text) on commit drop;
  insert into _incoming (url, caption) values
    ${rows.join(",\n    ")};

  -- Add photos this retreat doesn't have yet, straight into the gallery.
  insert into retreat_photos (experience_id, url, day_number, caption, source, published)
  select exp, v.url, null, v.caption, 'import', true
  from _incoming v
  where not exists (
    select 1 from retreat_photos rp where rp.experience_id = exp and rp.url = v.url
  );

  -- Fill in a missing caption hint on rows an earlier run added; never touches
  -- day_number, so hand allocation survives re-runs.
  update retreat_photos rp
     set caption = v.caption
    from _incoming v
   where rp.experience_id = exp
     and rp.url = v.url
     and rp.source = 'import'
     and rp.caption is null
     and v.caption is not null;
${CLEAR_IMPORTED_DAYS ? `
  -- One-off reset (CLEAR_IMPORTED_DAYS=1): undo the automatic day mapping an
  -- earlier import applied. Scoped to imported photos of this retreat only;
  -- guest uploads and host-added photos keep their days.
  update retreat_photos
     set day_number = null
   where experience_id = exp
     and source = 'import'
     and day_number is not null;
` : ""}
  raise notice 'Imported photos for retreat %', exp;
end $$;`);
}

main().catch((e) => die(e instanceof Error ? e.stack || e.message : String(e)));
