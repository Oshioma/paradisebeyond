"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { saveUpload, setOverrideUrl, setOverridesBulk, clearOverride, clearAllOverrides } from "@/lib/media/store";
import { allDemoPhotos } from "@/lib/media/demoPhotos";

// Generous cap: the browser downscales large photos before upload, but leave
// headroom for originals that couldn't be re-encoded (e.g. HEIC on desktop).
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/heic", "image/heif"];

/**
 * These return a {ok, error} result rather than throwing. Next.js redacts
 * thrown Server Action error messages in production (the client just gets a
 * generic, often empty, message) — so a returned reason is the only way the
 * real cause (e.g. "create a public media bucket") actually reaches the UI.
 */
export type MediaResult = { ok: true } | { ok: false; error: string };

export async function uploadImage(formData: FormData): Promise<MediaResult> {
  await requireRole("admin");
  const seed = String(formData.get("seed") ?? "");
  const file = formData.get("file");
  const original = formData.get("original");
  if (!seed) return { ok: false, error: "Missing image slot." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "No file selected." };
  if (file.size > MAX_BYTES) return { ok: false, error: `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB — too large (max 20MB). Try a smaller photo.` };
  if (file.type && !OK_TYPES.includes(file.type)) return { ok: false, error: `Unsupported image type (${file.type}). Use JPEG, PNG, WebP or HEIC.` };

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    // Optionally keep the uncropped source for later re-framing. It's already
    // downscaled client-side; skip it silently if it's missing or oversized so a
    // stray original never blocks the actual upload.
    let opts: { original?: { name: string; bytes: Uint8Array; contentType: string } } | undefined;
    if (original instanceof File && original.size > 0 && original.size <= MAX_BYTES) {
      opts = { original: { name: original.name, bytes: new Uint8Array(await original.arrayBuffer()), contentType: original.type || "image/jpeg" } };
    }
    await saveUpload(seed, { name: file.name, bytes, contentType: file.type || "image/jpeg" }, opts);
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Upload failed on the server. Try again or paste an image URL." };
  }
  revalidatePath("/desk/media");
  return { ok: true };
}

export async function setImageUrl(formData: FormData): Promise<MediaResult> {
  await requireRole("admin");
  const seed = String(formData.get("seed") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  if (!seed) return { ok: false, error: "Missing image slot." };
  if (!url) return { ok: false, error: "Enter an image URL first." };
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
    return { ok: false, error: "Enter a full https:// URL or a site-relative /path." };
  }
  try {
    await setOverrideUrl(seed, url);
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Couldn't save that URL." };
  }
  revalidatePath("/desk/media");
  return { ok: true };
}

export async function resetImage(formData: FormData): Promise<MediaResult> {
  await requireRole("admin");
  const seed = String(formData.get("seed") ?? "");
  if (!seed) return { ok: false, error: "Missing image slot." };
  try {
    await clearOverride(seed);
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Couldn't reset." };
  }
  revalidatePath("/desk/media");
  return { ok: true };
}

/** Point every slot at demo stock photography, in a SINGLE write. */
export async function loadDemoPhotos(): Promise<{ ok: boolean; count: number }> {
  await requireRole("admin");
  const entries = allDemoPhotos().map(({ key, url }) => ({ seed: key, url }));
  await setOverridesBulk(entries);
  revalidatePath("/desk/media");
  return { ok: true, count: entries.length };
}

/** Clear every override, restoring the generated placeholders — SINGLE write. */
export async function clearAllPhotos(): Promise<{ ok: boolean }> {
  await requireRole("admin");
  await clearAllOverrides();
  revalidatePath("/desk/media");
  return { ok: true };
}
