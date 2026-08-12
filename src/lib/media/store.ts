import { promises as fs } from "node:fs";
import path from "node:path";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Image override store — maps an image slot key (the seed) to an uploaded image
 * URL, so admins can replace the placeholder for any slot.
 *
 *  - Live (Supabase configured): overrides live in the `media_overrides` table
 *    and files upload to the Storage bucket `media`. Persistent and shared.
 *  - Demo (no Supabase): overrides persist to a local JSON file and files write
 *    to `public/uploads`. Works while the container lives (ephemeral) — fine for
 *    local/sandbox use; on read-only hosts (Vercel), use the Supabase path.
 *
 * The seed key is the full `seed` query value used by the image route
 * (e.g. "pb-reconnection-hero").
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const OVERRIDES_FILE = path.join(DATA_DIR, "image-overrides.json");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const BUCKET = "media";

// ---- read ------------------------------------------------------------------
export async function getOverride(seed: string): Promise<string | null> {
  const all = await getAllOverrides();
  return all[seed] ?? null;
}

export async function getAllOverrides(): Promise<Record<string, string>> {
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();
      const { data } = await supabase.from("media_overrides").select("seed, url");
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.seed] = row.url;
      return map;
    } catch {
      return {};
    }
  }
  try {
    const raw = await fs.readFile(OVERRIDES_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ---- write -----------------------------------------------------------------
async function setOverrideRecord(seed: string, url: string) {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    await supabase.from("media_overrides").upsert(
      { seed, url, updated_at: new Date().toISOString() },
      { onConflict: "seed" },
    );
    return;
  }
  const all = await getAllOverrides();
  all[seed] = url;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(OVERRIDES_FILE, JSON.stringify(all, null, 2));
}

/** Point a slot at an existing image URL (no upload). */
export async function setOverrideUrl(seed: string, url: string) {
  await setOverrideRecord(seed, url);
}

/** Remove an override so the slot falls back to the generated placeholder. */
export async function clearOverride(seed: string) {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    await supabase.from("media_overrides").delete().eq("seed", seed);
    return;
  }
  const all = await getAllOverrides();
  delete all[seed];
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(OVERRIDES_FILE, JSON.stringify(all, null, 2));
}

/** Store uploaded bytes and point the slot at them. Returns the public URL. */
export async function saveUpload(seed: string, file: { name: string; bytes: Uint8Array; contentType: string }): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safe = seed.replace(/[^a-z0-9-_]/gi, "-");
  const filename = `${safe}-${Date.now()}.${ext}`;

  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const objectPath = `overrides/${filename}`;
    await supabase.storage.from(BUCKET).upload(objectPath, file.bytes, {
      contentType: file.contentType,
      upsert: true,
    });
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    await setOverrideRecord(seed, data.publicUrl);
    return data.publicUrl;
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), file.bytes);
  const url = `/uploads/${filename}`;
  await setOverrideRecord(seed, url);
  return url;
}
