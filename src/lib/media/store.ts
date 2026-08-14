import { promises as fs } from "node:fs";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
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
const ORIGINALS_FILE = path.join(DATA_DIR, "image-originals.json");
const DEFAULTS_FILE = path.join(DATA_DIR, "image-defaults.json");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const BUCKET = "media";
// The saved "default set" lives in app_settings (jsonb) under this key.
const DEFAULTS_KEY = "media_defaults";

type Maps = { map: Record<string, string>; originals: Record<string, string> };

// Short-lived cache of the full overrides map, shared across the many image
// requests a single page render fires. Invalidated on any write.
let cache: { at: number; map: Record<string, string>; originals: Record<string, string> } | null = null;
const TTL_MS = 5_000;
function invalidate() {
  cache = null;
}

// ---- read ------------------------------------------------------------------
async function getAll(): Promise<Maps> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  const { map, originals } = await loadOverrides();
  cache = { at: Date.now(), map, originals };
  return cache;
}

/** Seed → display (cropped) image URL. */
export async function getAllOverrides(): Promise<Record<string, string>> {
  return (await getAll()).map;
}

/** Seed → original (uncropped) image URL, for re-framing. */
export async function getAllOriginals(): Promise<Record<string, string>> {
  return (await getAll()).originals;
}

async function loadOverrides(): Promise<Maps> {
  if (isSupabaseConfigured()) {
    // Never serve a cached override map: Next's Data Cache would otherwise pin
    // the Supabase read (a cacheable GET) to a stale result, so an uploaded
    // image never shows even though the DB row is updated. noStore() opts this
    // read out of that cache; the short in-memory map above still coalesces the
    // many image requests within a single render.
    noStore();
    try {
      const { createAnonClient } = await import("@/lib/supabase/server");
      const supabase = createAnonClient();
      const { data } = await supabase.from("media_overrides").select("seed, url, original_url");
      const map: Record<string, string> = {};
      const originals: Record<string, string> = {};
      for (const row of data ?? []) {
        map[row.seed as string] = row.url as string;
        if (row.original_url) originals[row.seed as string] = row.original_url as string;
      }
      return { map, originals };
    } catch {
      return { map: {}, originals: {} };
    }
  }
  const map = await readJsonFile(OVERRIDES_FILE);
  const originals = await readJsonFile(ORIGINALS_FILE);
  return { map, originals };
}

async function readJsonFile(file: string): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return {};
  }
}

export async function getOverride(seed: string): Promise<string | null> {
  return (await getAllOverrides())[seed] ?? null;
}

export async function getOriginal(seed: string): Promise<string | null> {
  return (await getAllOriginals())[seed] ?? null;
}

// ---- write -----------------------------------------------------------------
async function writeJsonFile(file: string, map: Record<string, string>) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(map, null, 2));
}

/**
 * Point a slot at an image. When `originalUrl` is given, the full uncropped
 * source is recorded too (so the photo can be re-framed later); when it's
 * omitted the stored original is left untouched — a re-frame updates only the
 * displayed crop and keeps its existing original.
 */
export async function setOverrideUrl(seed: string, url: string, originalUrl?: string) {
  if (isSupabaseConfigured()) {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const supabase = createServiceRoleClient();
    const row: Record<string, unknown> = { seed, url, updated_at: new Date().toISOString() };
    if (originalUrl) row.original_url = originalUrl;
    const { error } = await supabase.from("media_overrides").upsert(row, { onConflict: "seed" });
    if (error) throw new Error(`Saving the image failed: ${error.message}`);
  } else {
    const { map, originals } = await loadOverrides();
    map[seed] = url;
    await writeJsonFile(OVERRIDES_FILE, map);
    if (originalUrl) {
      originals[seed] = originalUrl;
      await writeJsonFile(ORIGINALS_FILE, originals);
    }
  }
  invalidate();
}

// media_overrides is admin-only under RLS (`for all using (is_admin())`). Going
// through the user client here silently swallowed the write whenever is_admin()
// didn't resolve in the DB session — the upload "succeeded" but nothing saved.
// These writes are only reached through admin-gated actions, so use the service
// role (bypassing RLS) and CHECK the error so a genuine failure surfaces to the
// UI instead of vanishing. Mirrors the approach in retreat/publish.ts.

/** Set many overrides in ONE operation (single upsert / single file write). */
export async function setOverridesBulk(entries: { seed: string; url: string }[]) {
  if (!entries.length) return;
  if (isSupabaseConfigured()) {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("media_overrides")
      .upsert(entries.map((e) => ({ seed: e.seed, url: e.url, updated_at: now })), { onConflict: "seed" });
    if (error) throw new Error(`Saving the image failed: ${error.message}`);
  } else {
    const { map } = await loadOverrides();
    for (const e of entries) map[e.seed] = e.url;
    await writeJsonFile(OVERRIDES_FILE, map);
  }
  invalidate();
}

export async function clearOverride(seed: string) {
  if (isSupabaseConfigured()) {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const { error } = await createServiceRoleClient().from("media_overrides").delete().eq("seed", seed);
    if (error) throw new Error(`Resetting the image failed: ${error.message}`);
  } else {
    const { map, originals } = await loadOverrides();
    delete map[seed];
    delete originals[seed];
    await writeJsonFile(OVERRIDES_FILE, map);
    await writeJsonFile(ORIGINALS_FILE, originals);
  }
  invalidate();
}

/** Remove every override in ONE operation. */
export async function clearAllOverrides() {
  if (isSupabaseConfigured()) {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const { error } = await createServiceRoleClient().from("media_overrides").delete().neq("seed", "");
    if (error) throw new Error(`Clearing images failed: ${error.message}`);
  } else {
    await writeJsonFile(OVERRIDES_FILE, {});
    await writeJsonFile(ORIGINALS_FILE, {});
  }
  invalidate();
}

type UploadFile = { name: string; bytes: Uint8Array; contentType: string };

/**
 * Store uploaded bytes and point the slot at them. Returns the public URL of the
 * displayed (cropped) image. When `opts.original` is given, the uncropped source
 * is stored alongside so the photo can be re-framed later without quality loss.
 */
export async function saveUpload(
  seed: string,
  file: UploadFile,
  opts?: { original?: UploadFile },
): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safe = seed.replace(/[^a-z0-9-_]/gi, "-");
  const stamp = Date.now();
  const filename = `${safe}-${stamp}.${ext}`;

  if (isSupabaseConfigured()) {
    // Uploads REQUIRE the service-role key (Storage writes bypass RLS with it).
    // isSupabaseConfigured() only checks the public URL/anon key, so guard the
    // service key explicitly — otherwise the client is built with an undefined
    // key and fails with a confusing 401.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "Image upload needs SUPABASE_SERVICE_ROLE_KEY, which isn't set. Add it to your environment (Supabase → Project Settings → API → service_role key), or paste an image URL instead.",
      );
    }
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

    // Store the uncropped source too (best-effort — a failure here must not fail
    // the upload; the slot still gets its cropped image, just without re-framing).
    let originalUrl: string | undefined;
    if (opts?.original) {
      const oext = (opts.original.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const oPath = `overrides/${safe}-orig-${stamp}.${oext}`;
      const { error: oErr } = await supabase.storage.from(BUCKET).upload(oPath, opts.original.bytes, {
        contentType: opts.original.contentType,
        upsert: true,
      });
      if (!oErr) originalUrl = supabase.storage.from(BUCKET).getPublicUrl(oPath).data.publicUrl;
    }

    await setOverrideUrl(seed, data.publicUrl, originalUrl);
    return data.publicUrl;
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), file.bytes);
  const url = `/uploads/${filename}`;
  let originalUrl: string | undefined;
  if (opts?.original) {
    const oext = (opts.original.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const oName = `${safe}-orig-${stamp}.${oext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, oName), opts.original.bytes);
    originalUrl = `/uploads/${oName}`;
  }
  await setOverrideUrl(seed, url, originalUrl);
  return url;
}

// ---- saved "default set" ----------------------------------------------------
// A snapshot of the current images (display URL + original) that an admin can
// re-apply anytime. This is what "Load demo photography" restores once saved,
// instead of random stock — a safe, self-chosen restore point.
type DefaultsSnapshot = { map: Record<string, string>; originals: Record<string, string> };

export async function getDefaults(): Promise<DefaultsSnapshot> {
  if (isSupabaseConfigured()) {
    noStore();
    try {
      const { createAnonClient } = await import("@/lib/supabase/server");
      const { data } = await createAnonClient()
        .from("app_settings")
        .select("value")
        .eq("key", DEFAULTS_KEY)
        .maybeSingle();
      const v = (data?.value ?? null) as Partial<DefaultsSnapshot> | null;
      return { map: v?.map ?? {}, originals: v?.originals ?? {} };
    } catch {
      return { map: {}, originals: {} };
    }
  }
  try {
    const raw = JSON.parse(await fs.readFile(DEFAULTS_FILE, "utf8")) as Partial<DefaultsSnapshot>;
    return { map: raw.map ?? {}, originals: raw.originals ?? {} };
  } catch {
    return { map: {}, originals: {} };
  }
}

/** Snapshot the images currently set as the default set. Returns how many. */
export async function saveCurrentAsDefaults(): Promise<number> {
  const { map, originals } = await getAll();
  const snapshot: DefaultsSnapshot = { map: { ...map }, originals: { ...originals } };
  if (isSupabaseConfigured()) {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const { error } = await createServiceRoleClient()
      .from("app_settings")
      .upsert({ key: DEFAULTS_KEY, value: snapshot, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(`Saving the default set failed: ${error.message}`);
  } else {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DEFAULTS_FILE, JSON.stringify(snapshot, null, 2));
  }
  return Object.keys(map).length;
}

/** Re-apply the saved default set. Returns how many slots were restored (0 if
 *  nothing is saved). Also restores each slot's original so re-framing still
 *  works and no stale original lingers. */
export async function restoreDefaults(): Promise<number> {
  const { map, originals } = await getDefaults();
  const seeds = Object.keys(map);
  if (!seeds.length) return 0;
  if (isSupabaseConfigured()) {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const now = new Date().toISOString();
    const rows = seeds.map((seed) => ({ seed, url: map[seed], original_url: originals[seed] ?? null, updated_at: now }));
    const { error } = await createServiceRoleClient().from("media_overrides").upsert(rows, { onConflict: "seed" });
    if (error) throw new Error(`Restoring the default set failed: ${error.message}`);
  } else {
    const cur = await loadOverrides();
    for (const seed of seeds) {
      cur.map[seed] = map[seed];
      if (originals[seed]) cur.originals[seed] = originals[seed];
      else delete cur.originals[seed];
    }
    await writeJsonFile(OVERRIDES_FILE, cur.map);
    await writeJsonFile(ORIGINALS_FILE, cur.originals);
  }
  invalidate();
  return seeds.length;
}
