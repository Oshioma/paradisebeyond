"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { saveUpload, setOverrideUrl, clearOverride } from "@/lib/media/store";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

export async function uploadImage(formData: FormData) {
  await requireRole("admin");
  const seed = String(formData.get("seed") ?? "");
  const file = formData.get("file");
  if (!seed || !(file instanceof File) || file.size === 0) return;
  if (file.size > MAX_BYTES) throw new Error("Image too large (max 8MB).");
  if (file.type && !OK_TYPES.includes(file.type)) throw new Error("Unsupported image type.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  await saveUpload(seed, { name: file.name, bytes, contentType: file.type || "image/jpeg" });
  revalidatePath("/desk/media");
}

export async function setImageUrl(formData: FormData) {
  await requireRole("admin");
  const seed = String(formData.get("seed") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  if (!seed || !url) return;
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
    throw new Error("Enter a full https:// URL or a site-relative /path.");
  }
  await setOverrideUrl(seed, url);
  revalidatePath("/desk/media");
}

export async function resetImage(formData: FormData) {
  await requireRole("admin");
  const seed = String(formData.get("seed") ?? "");
  if (!seed) return;
  await clearOverride(seed);
  revalidatePath("/desk/media");
}
