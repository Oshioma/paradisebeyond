"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getManagedExperiences } from "@/lib/data/repository";
import {
  addPhotoUrls,
  deletePhotoRow,
  getExperienceIdsBySlugs,
  getExperienceSlugById,
  getPhotoById,
  setPhotoDay,
  setPhotoPublished,
} from "@/lib/memories/store";

/**
 * Host studio photo management: allocate guest/imported photos to itinerary
 * days, publish/hide, delete, and bulk-add by URL. Every action re-checks that
 * the target photo belongs to a retreat this user manages before the
 * service-role write.
 */

export type PhotoActionResult = { ok: true } | { ok: false; error: string };

async function managedIds(user: { role: string; hostSlug?: string }): Promise<Set<string>> {
  const experiences = await getManagedExperiences(user);
  const map = await getExperienceIdsBySlugs(experiences.map((e) => e.slug));
  return new Set(Object.values(map));
}

async function authorisePhoto(photoId: string): Promise<{ experienceId: string } | { error: string }> {
  const user = await requireRole("host");
  if (!isSupabaseConfigured()) return { error: "Photo management needs the live database." };
  const photo = await getPhotoById(photoId);
  if (!photo) return { error: "Photo not found." };
  const ids = await managedIds(user);
  if (!ids.has(photo.experienceId)) return { error: "You don't manage this retreat." };
  return { experienceId: photo.experienceId };
}

async function revalidateForExperience(experienceId: string) {
  const slug = await getExperienceSlugById(experienceId);
  if (slug) {
    revalidatePath(`/experiences/${slug}`);
    revalidatePath(`/r/${slug}`);
  }
  revalidatePath("/studio/photos");
}

export async function allocatePhotoDay(formData: FormData): Promise<PhotoActionResult> {
  const photoId = String(formData.get("photoId") ?? "");
  const dayRaw = String(formData.get("day") ?? "");
  const auth = await authorisePhoto(photoId);
  if ("error" in auth) return { ok: false, error: auth.error };
  const day = dayRaw === "" ? null : Math.round(Number(dayRaw));
  if (day !== null && !(day >= 1)) return { ok: false, error: "Invalid day." };
  try {
    await setPhotoDay(photoId, day);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save." };
  }
  await revalidateForExperience(auth.experienceId);
  return { ok: true };
}

export async function togglePhotoPublished(formData: FormData): Promise<PhotoActionResult> {
  const photoId = String(formData.get("photoId") ?? "");
  const publish = String(formData.get("published") ?? "") === "true";
  const auth = await authorisePhoto(photoId);
  if ("error" in auth) return { ok: false, error: auth.error };
  try {
    await setPhotoPublished(photoId, publish);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save." };
  }
  await revalidateForExperience(auth.experienceId);
  return { ok: true };
}

export async function deletePhoto(formData: FormData): Promise<PhotoActionResult> {
  const photoId = String(formData.get("photoId") ?? "");
  const auth = await authorisePhoto(photoId);
  if ("error" in auth) return { ok: false, error: auth.error };
  try {
    await deletePhotoRow(photoId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't delete." };
  }
  await revalidateForExperience(auth.experienceId);
  return { ok: true };
}

/** Bulk-add photos by pasting image URLs (one per line) — e.g. from another gallery. */
export async function addPhotosByUrl(formData: FormData): Promise<PhotoActionResult & { added?: number }> {
  const user = await requireRole("host");
  if (!isSupabaseConfigured()) return { ok: false, error: "Photo management needs the live database." };
  const experienceSlug = String(formData.get("experienceSlug") ?? "");
  const urls = String(formData.get("urls") ?? "")
    .split(/\s+/)
    .map((u) => u.trim())
    .filter(Boolean);
  const dayRaw = String(formData.get("day") ?? "");
  const day = dayRaw === "" ? null : Math.round(Number(dayRaw));
  if (!urls.length) return { ok: false, error: "Paste at least one image URL." };

  const managed = await getManagedExperiences(user);
  if (!managed.some((e) => e.slug === experienceSlug)) {
    return { ok: false, error: "You don't manage this retreat." };
  }
  const ids = await getExperienceIdsBySlugs([experienceSlug]);
  const experienceId = ids[experienceSlug];
  if (!experienceId) return { ok: false, error: "Retreat not found." };

  let added = 0;
  try {
    added = await addPhotoUrls(experienceId, urls, { dayNumber: day, source: "host" });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't add those URLs." };
  }
  await revalidateForExperience(experienceId);
  return { ok: true, added };
}
