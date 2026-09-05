#!/usr/bin/env node
/**
 * Import guest photos from the Oshioma events app into a Paradise Beyond
 * retreat's guest gallery (`retreat_photos`).
 *
 * The source app stores visitor uploads in `event_photos` (public URLs into
 * its Supabase storage), optionally linked to a daily itinerary item. This
 * script copies each image into THIS project's `media` bucket (so the photos
 * survive the source project) and inserts `retreat_photos` rows into the
 * retreat's general gallery. Days are NOT assigned by the import (a retreat
 * and the source event don't share a calendar); the source's day label is
 * kept in the caption as a hint and days are allocated by hand in Studio →
 * Guest photos. Re-running is safe: object paths are deterministic and
 * already-imported URLs are skipped.
 *
 * Photos land published (visible in the retreat's "Guest memories" gallery
 * immediately).
 *
 * Usage:
 *   SOURCE_SUPABASE_URL=https://<events-project>.supabase.co \
 *   SOURCE_SUPABASE_KEY=<anon or service key of the events project> \
 *   NEXT_PUBLIC_SUPABASE_URL=https://<pb-project>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<paradise beyond service role key> \
 *   RETREAT=zanzibargeminibirthdaycelebration \
 *   [SOURCE_EVENT=<event slug or id>] \
 *   [COPY_FILES=0]   # link source URLs directly instead of copying bytes
 *   [DRY_RUN=1]      # print what would happen, write nothing
 *   npm run import:event-photos
 *
 * RETREAT accepts a slug, a vanity subdomain label, or a full microsite host
 * (e.g. zanzibargeminibirthdaycelebration.paradisebeyond.com).
 */

import { createClient } from "@supabase/supabase-js";

const env = (k, fallback) => process.env[k] ?? fallback;
const die = (msg) => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};

const SOURCE_URL = env("SOURCE_SUPABASE_URL");
const SOURCE_KEY = env("SOURCE_SUPABASE_KEY");
const TARGET_URL = env("NEXT_PUBLIC_SUPABASE_URL", env("SUPABASE_URL"));
const TARGET_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const RETREAT = env("RETREAT");
const SOURCE_EVENT = env("SOURCE_EVENT");
const COPY_FILES = env("COPY_FILES", "1") !== "0";
const DRY_RUN = env("DRY_RUN") === "1";
const BUCKET = "media";

if (!SOURCE_URL || !SOURCE_KEY) die("Set SOURCE_SUPABASE_URL and SOURCE_SUPABASE_KEY (the events app's project).");
if (!TARGET_URL || !TARGET_KEY) die("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (this project).");
if (!RETREAT) die("Set RETREAT to the target retreat's slug, subdomain label, or microsite host.");

const source = createClient(SOURCE_URL, SOURCE_KEY, { auth: { persistSession: false } });
const target = createClient(TARGET_URL, TARGET_KEY, { auth: { persistSession: false } });

/** Hyphen-free lowercase label, mirroring the app's subdomainLabel(). */
const label = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function resolveRetreat() {
  const { data, error } = await target.from("experiences").select("id, slug, subdomain, name, duration");
  if (error) die(`Reading experiences failed: ${error.message}`);
  const key = label(String(RETREAT).replace(/^https?:\/\//, "").split(".")[0]);
  const hit =
    data.find((e) => e.slug === RETREAT) ??
    data.find((e) => e.subdomain && label(e.subdomain) === key) ??
    data.find((e) => label(e.slug) === key);
  if (!hit) die(`No retreat matches "${RETREAT}". Known slugs: ${data.map((e) => e.slug).join(", ")}`);
  return hit;
}

async function resolveEvent() {
  const { data, error } = await source.from("events").select("id, name, slug, start_date");
  if (error) die(`Reading source events failed: ${error.message} (does the key have read access?)`);
  if (!data?.length) die("The source project has no events.");
  if (SOURCE_EVENT) {
    const hit = data.find((e) => e.id === SOURCE_EVENT || e.slug === SOURCE_EVENT || label(e.slug) === label(SOURCE_EVENT));
    if (!hit) die(`No source event matches "${SOURCE_EVENT}". Known: ${data.map((e) => e.slug || e.id).join(", ")}`);
    return hit;
  }
  if (data.length === 1) return data[0];
  die(`Multiple source events found — set SOURCE_EVENT. Known: ${data.map((e) => e.slug || e.id).join(", ")}`);
}

async function main() {
  const retreat = await resolveRetreat();
  const event = await resolveEvent();
  console.log(`Importing photos from event "${event.name || event.slug}" → retreat "${retreat.name}" (${retreat.slug})`);

  const [{ data: photos, error: pErr }, { data: items, error: iErr }] = await Promise.all([
    source.from("event_photos").select("*").eq("event_id", event.id).order("created_at", { ascending: true }),
    source.from("event_itinerary_items").select("id, day_label, title").eq("event_id", event.id),
  ]);
  if (pErr) die(`Reading event_photos failed: ${pErr.message}`);
  const itemById = new Map((items ?? []).map((i) => [i.id, i]));
  if (iErr) console.warn(`! Couldn't read itinerary items (${iErr.message}) — photos import without caption hints.`);
  if (!photos?.length) die("The source event has no photos.");
  console.log(`Found ${photos.length} photo(s).`);

  const { data: existingRows } = await target.from("retreat_photos").select("url").eq("experience_id", retreat.id);
  const existing = new Set((existingRows ?? []).map((r) => r.url));

  let imported = 0;
  let skipped = 0;
  for (const p of photos) {
    const item = p.event_itinerary_item_id ? itemById.get(p.event_itinerary_item_id) : null;
    // Gallery only — day allocation is done by hand afterwards.
    const caption = item ? [item.day_label, item.title].filter(Boolean).join(" · ") : null;

    let url = p.image_url;
    if (COPY_FILES) {
      const ext = (new URL(p.image_url).pathname.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const objectPath = `guest-photos/${retreat.id}/import-${p.id}.${ext}`;
      url = target.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
      if (!existing.has(url) && !DRY_RUN) {
        const res = await fetch(p.image_url);
        if (!res.ok) {
          console.warn(`! Skipping ${p.image_url} — download failed (${res.status})`);
          skipped++;
          continue;
        }
        const bytes = new Uint8Array(await res.arrayBuffer());
        const { error: upErr } = await target.storage.from(BUCKET).upload(objectPath, bytes, {
          contentType: res.headers.get("content-type") || "image/jpeg",
          upsert: true,
        });
        if (upErr) {
          console.warn(`! Skipping ${p.image_url} — upload failed (${upErr.message})`);
          skipped++;
          continue;
        }
      }
    }

    if (existing.has(url)) {
      skipped++;
      continue;
    }
    existing.add(url);

    if (DRY_RUN) {
      console.log(`  would import: ${p.image_url}${caption ? ` (${caption})` : ""}`);
      imported++;
      continue;
    }
    const { error: insErr } = await target.from("retreat_photos").insert({
      experience_id: retreat.id,
      url,
      day_number: null,
      caption,
      source: "import",
      uploader_name: null,
      published: true,
    });
    if (insErr) {
      console.warn(`! Insert failed for ${url}: ${insErr.message}`);
      skipped++;
      continue;
    }
    imported++;
    console.log(`  ✓ ${url}`);
  }

  console.log(
    `${DRY_RUN ? "[dry run] " : ""}Done: ${imported} imported, ${skipped} skipped (already present or failed).`,
  );
  if (!DRY_RUN) {
    console.log(`They're live in the "Guest memories" gallery — allocate days in Studio → Guest photos.`);
  }
}

main().catch((e) => die(e instanceof Error ? e.stack || e.message : String(e)));
