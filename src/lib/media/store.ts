import { promises as fs } from "node:fs";
import path from "node:path";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Image override store — maps an image slot key (the seed) to an image URL, so
 * admins can replace the placeholder for any slot.
 *
 *  - Live (Supabase): overrides in `media_overrides`; uploads to Storage bucket
 *    `media`. Reads are cached in-memory (short TTL) so serving many images on a
 *    page doesn't hammer the DB. Bulk operations use a single query.
 *  - Demo (no Supabase): a local JSON file + `public/uploads`.
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const OVERRIDES_FILE = path.join(DATA_DIR, "image-overrides.json");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const BUCKET = "media";

// Short-lived cache of the full overrides map, shared across the many image
// requests a single page render fires. Invalidated on any write.
let cache: { at: number; map: Record<string, string> } | null = null;
const TTL_MS = 30_000;
function invalidate() {
  cache = null;
}

// ---- read ------------------------------------------------------------------
export async function getAllOverrides(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  const map = await loadOverrides();
  cache = { at: Date.now(), map };
  return map;
}

async function loadOverrides(): Promise<Record<string, string>> {
  if (isSupabaseConfigured()) {
    try {
      const { createAnonClient } = await import("@/lib/supabase/server");
      const supabase = createAnonClient();
      const { data } = await supabase.from("media_overrides").select("seed, url");
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.seed as string] = row.url as string;
      return map;
    } catch {
      return {};
    }
  }
  try {
    return JSON.parse(await fs.readFile(OVERRIDES_FILE, "utf8"));
  } catch {
    return {};
  }
}

export async function getOverride(seed: string): Promise<string | null> {
  const all = await getAllOverrides();
  return all[seed] ?? null;
}

// ---- write -----------------------------------------------------------------
async function writeFileOverrides(map: Record<string, string>) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(OVERRIDES_FILE, JSON.stringify(map, null, 2));
}

export async function setOverrideUrl(seed: string, url: string) {
  await setOverridesBulk([{ seed, url }]);
}

/** Set many overrides in ONE operation (single upsert / single file write). */
export async function setOverridesBulk(entries: { seed: string; url: string }[]) {
  if (!entries.length) return;
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const now = new Date().toISOString();
    await supabase
      .from("media_overrides")
      .upsert(entries.map((e) => ({ seed: e.seed, url: e.url, updated_at: now })), { onConflict: "seed" });
  } else {
    const map = await loadOverrides();
    for (const e of entries) map[e.seed] = e.url;
    await writeFileOverrides(map);
  }
  invalidate();
}

export async function clearOverride(seed: string) {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    await createClient().from("media_overrides").delete().eq("seed", seed);
  } else {
    const map = await loadOverrides();
    delete map[seed];
    await writeFileOverrides(map);
  }
  invalidate();
}

/** Remove every override in ONE operation. */
export async function clearAllOverrides() {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    await createClient().from("media_overrides").delete().neq("seed", "");
  } else {
    await writeFileOverrides({});
  }
  invalidate();
}

/** Store uploaded bytes and point the slot at them. Returns the public URL. */
export async function saveUpload(seed: string, file: { name: string; bytes: Uint8Array; contentType: string }): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safe = seed.replace(/[^a-z0-9-_]/gi, "-");
  const filename = `${safe}-${Date.now()}.${ext}`;

  if (isSupabaseConfigured()) {
    // Use the service role so Storage RLS/policies can't silently block the
    // upload, and CHECK the error — otherwise getPublicUrl returns a URL that
    // 404s (a broken image). On any failure, throw so the UI can fall back to
    // pasting an image URL.
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const supabase = createServiceRoleClient();
    const objectPath = `overrides/${filename}`;
    const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file.bytes, {
      contentType: file.contentType,
      upsert: true,
    });
    if (error) {
      throw new Error(
        `Photo upload failed (${error.message}). Create a public Storage bucket named "${BUCKET}" in Supabase, or paste an image URL instead.`,
      );
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    await setOverrideUrl(seed, data.publicUrl);
    return data.publicUrl;
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), file.bytes);
  const url = `/uploads/${filename}`;
  await setOverrideUrl(seed, url);
  return url;
}
