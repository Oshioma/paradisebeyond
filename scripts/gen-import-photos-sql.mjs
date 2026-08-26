#!/usr/bin/env node
/**
 * Generate idempotent SQL that imports guest photos from the Oshioma events
 * app into a retreat's `retreat_photos` — for environments that have the
 * Postgres connection string (like the db-migrate GitHub workflow) but not
 * the Supabase service-role API key.
 *
 * The events app exposes its gallery publicly (anon-readable `event_photos`,
 * `events`, `event_itinerary_items`), and — like any browser app — ships its
 * public Supabase URL + publishable key in its own frontend bundle. This
 * script auto-discovers that config from the live site, reads the photos, and
 * prints SQL on stdout. Pipe it to psql:
 *
 *   RETREAT=zanzibargeminibirthdaycelebration \
 *   SOURCE_SITE=https://www.oshioma.com \
 *   node scripts/gen-import-photos-sql.mjs > import.sql
 *   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f import.sql
 *
 * Env:
 *   RETREAT       (required) target retreat slug / subdomain label / host
 *   SOURCE_SITE   events app URL to auto-discover config from
 *                 (default https://www.oshioma.com), or set both:
 *   SOURCE_SUPABASE_URL, SOURCE_SUPABASE_KEY   to skip discovery
 *   SOURCE_EVENT  source event slug/id (default: match RETREAT, else the
 *                 only event with photos)
 *
 * Note: this route LINKS the source image URLs (no file copy — SQL can't
 * move storage objects). Keep the events project's storage alive, or run
 * scripts/import-event-photos.mjs with API keys for a full copy; it dedupes
 * against these rows by URL either way.
 */

const die = (msg) => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};
const log = (msg) => console.error(msg); // stderr, so stdout stays pure SQL

const RETREAT = process.env.RETREAT || die("Set RETREAT");
const SOURCE_SITE = (process.env.SOURCE_SITE || "https://www.oshioma.com").replace(/\/$/, "");
const label = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function discoverSourceConfig() {
  if (process.env.SOURCE_SUPABASE_URL && process.env.SOURCE_SUPABASE_KEY) {
    return { url: process.env.SOURCE_SUPABASE_URL, key: process.env.SOURCE_SUPABASE_KEY };
  }
  log(`Discovering Supabase config from ${SOURCE_SITE} …`);
  // Each page only lists its own JS chunks, and the Supabase client only
  // loads on pages that use it in the browser — the public event gallery
  // (/events/<slug>) being the reliable one. Sweep it plus a few fallbacks;
  // SOURCE_PAGES adds more (comma-separated paths).
  const extra = (process.env.SOURCE_PAGES ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  const guess = process.env.SOURCE_EVENT ? [`/events/${process.env.SOURCE_EVENT}`] : [];
  const pages = [...extra, ...guess, "/", "/login", "/events", "/eternal", "/private-login"];
  const UA = { "user-agent": "Mozilla/5.0 (compatible; ParadiseBeyondImport/1.0)" };
  const MAX_CHUNKS = Number(process.env.MAX_CHUNKS || 400);
  let blob = "";
  const chunkPaths = new Set();
  const buildIds = new Set();
  const addChunks = (text) => {
    for (const m of text.match(/\/_next\/static\/[^"'`\s\\)]+\.js/g) ?? []) chunkPaths.add(m);
    // Chunks are often listed by bare filename in the webpack/build manifests.
    for (const m of text.match(/"static\/chunks\/[^"'`\s\\]+\.js"/g) ?? []) chunkPaths.add("/_next/" + m.slice(1, -1));
    for (const m of text.match(/"buildId":"([^"]+)"/g) ?? []) buildIds.add(m.slice(11, -1));
    for (const m of text.match(/\/_next\/static\/([^/]+)\/_(?:buildManifest|ssgManifest)\.js/g) ?? []) {
      buildIds.add(m.split("/")[3]);
    }
  };
  for (const page of pages) {
    try {
      const res = await fetch(SOURCE_SITE + page, { headers: UA });
      const html = await res.text();
      log(`  ${page} → ${res.status}, ${html.length} bytes`);
      blob += html;
      addChunks(html);
    } catch (e) {
      log(`  ${page} → failed (${e instanceof Error ? e.message : e})`);
    }
  }
  // Next.js links most route chunks lazily via the build manifest rather than
  // in the initial HTML — fetch the manifests so their chunk lists surface.
  for (const id of buildIds) {
    for (const name of ["_buildManifest.js", "_ssgManifest.js", "_app-build-manifest.js"]) {
      try {
        addChunks(await (await fetch(`${SOURCE_SITE}/_next/static/${id}/${name}`, { headers: UA })).text());
      } catch {
        /* manifest may not exist */
      }
    }
  }
  log(`  scanning ${chunkPaths.size} JS chunk(s) (buildIds: ${[...buildIds].join(", ") || "none"})`);
  let found = 0;
  for (const p of [...chunkPaths].slice(0, MAX_CHUNKS)) {
    try {
      blob += await (await fetch(p.startsWith("http") ? p : SOURCE_SITE + p, { headers: UA })).text();
      found++;
      if (blob.includes(".supabase.co") && /sb_publishable_|eyJ[A-Za-z0-9_-]{20,}\./.test(blob)) break; // early exit once both are present
    } catch {
      /* skip unfetchable chunk */
    }
  }
  log(`  fetched ${found} chunk(s)`);
  const url = (blob.match(/https:\/\/[a-z0-9]+\.supabase\.co/g) ?? [])[0];
  if (!url) die("Couldn't find a supabase.co URL in the site's frontend.");
  // New-style publishable key, else a legacy anon JWT (payload role must be "anon").
  let key = (blob.match(/sb_publishable_[A-Za-z0-9_-]+/g) ?? [])[0];
  if (!key) {
    for (const t of new Set(blob.match(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g) ?? [])) {
      try {
        const payload = JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString("utf8"));
        if (payload.role === "anon") {
          key = t;
          break;
        }
      } catch {
        /* not a JWT */
      }
    }
  }
  if (!key) die("Couldn't find the public API key in the site's frontend.");
  log(`Found ${url} (key ${key.slice(0, 18)}…)`);
  return { url, key };
}

async function rest(cfg, path) {
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
  });
  if (!res.ok) die(`Source query ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Best-effort day number for an itinerary item ("Day 3", a date, etc.). */
function dayNumberFor(item, eventStartDate) {
  if (!item) return null;
  const fromLabel = /(\d+)/.exec(item.day_label ?? "");
  if (/day/i.test(item.day_label ?? "") && fromLabel) return Number(fromLabel[1]);
  const asDate = Date.parse(item.day_label ?? "");
  const start = Date.parse(eventStartDate ?? "");
  if (!Number.isNaN(asDate) && !Number.isNaN(start)) {
    const diff = Math.round((asDate - start) / 86_400_000) + 1;
    if (diff >= 1) return diff;
  }
  return fromLabel ? Number(fromLabel[1]) : null;
}

const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);

async function main() {
  const cfg = await discoverSourceConfig();
  const events = await rest(cfg, "events?select=id,name,slug,start_date");
  if (!events.length) die("Source has no events.");

  const want = process.env.SOURCE_EVENT || RETREAT;
  let event =
    events.find((e) => e.id === want || e.slug === want) ??
    events.find((e) => label(e.slug) === label(want) || label(e.name) === label(want));
  if (!event) {
    const withPhotos = [];
    for (const e of events) {
      const n = await rest(cfg, `event_photos?select=id&event_id=eq.${e.id}&limit=1`);
      if (n.length) withPhotos.push(e);
    }
    if (withPhotos.length === 1) event = withPhotos[0];
    else die(`Can't pick a source event — set SOURCE_EVENT. Candidates: ${events.map((e) => e.slug || e.id).join(", ")}`);
  }
  log(`Source event: "${event.name || event.slug}"`);

  const [photos, items] = await Promise.all([
    rest(cfg, `event_photos?select=*&event_id=eq.${event.id}&order=created_at.asc`),
    rest(cfg, `event_itinerary_items?select=id,day_label,title&event_id=eq.${event.id}`),
  ]);
  if (!photos.length) die("The source event has no photos.");
  const itemById = new Map(items.map((i) => [i.id, i]));
  log(`Found ${photos.length} photo(s).`);

  const rows = [];
  for (const p of photos) {
    if (!/^https:\/\//.test(p.image_url ?? "")) continue;
    const item = p.event_itinerary_item_id ? itemById.get(p.event_itinerary_item_id) : null;
    const day = dayNumberFor(item, event.start_date);
    const caption = item ? [item.day_label, item.title].filter(Boolean).join(" · ").slice(0, 300) : null;
    rows.push(`(${q(p.image_url.slice(0, 2000))}, ${day ?? "null"}::int, ${q(caption)})`);
  }
  if (!rows.length) die("No importable photo URLs.");

  const key = label(String(RETREAT).replace(/^https?:\/\//, "").split(".")[0]);
  console.log(`-- Import ${rows.length} guest photos from ${SOURCE_SITE} into retreat "${RETREAT}".
-- Idempotent: re-runs skip URLs the retreat already has. Generated by
-- scripts/gen-import-photos-sql.mjs.
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

  insert into retreat_photos (experience_id, url, day_number, caption, source, published)
  select exp,
         v.url,
         case when v.day is not null and v.day <= dur then v.day end,
         v.caption,
         'import',
         true
  from (values
    ${rows.join(",\n    ")}
  ) as v(url, day, caption)
  where not exists (
    select 1 from retreat_photos rp where rp.experience_id = exp and rp.url = v.url
  );

  raise notice 'Imported photos into retreat %', exp;
end $$;`);
}

main().catch((e) => die(e instanceof Error ? e.stack || e.message : String(e)));
