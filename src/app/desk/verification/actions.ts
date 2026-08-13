"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { setVerificationCriteria, setExperienceVerified, setExperienceFeatured } from "@/lib/admin/verification";

/** Admin: save the editable verification criteria checklist. */
export async function saveCriteria(formData: FormData): Promise<void> {
  await requireRole("admin");
  let items: string[] = [];
  try {
    const raw = JSON.parse(String(formData.get("items") ?? "[]"));
    if (Array.isArray(raw)) items = raw.map(String);
  } catch { /* ignore */ }
  await setVerificationCriteria(items);
  revalidatePath("/desk/verification");
}

/** Admin: award or revoke the Verified badge on an experience. */
export async function toggleVerified(formData: FormData): Promise<void> {
  await requireRole("admin");
  const slug = String(formData.get("slug") ?? "");
  const verified = String(formData.get("verified") ?? "") === "1";
  if (!slug) return;
  await setExperienceVerified(slug, verified);
  revalidatePath("/desk/verification");
  revalidatePath("/desk/experiences");
  revalidatePath("/experiences");
  revalidatePath(`/experiences/${slug}`);
}

/** Admin: feature or unfeature an experience (surfaces it on the homepage). */
export async function toggleFeatured(formData: FormData): Promise<void> {
  await requireRole("admin");
  const slug = String(formData.get("slug") ?? "");
  const featured = String(formData.get("featured") ?? "") === "1";
  if (!slug) return;
  await setExperienceFeatured(slug, featured);
  revalidatePath("/desk/verification");
  revalidatePath("/desk/experiences");
  revalidatePath("/experiences");
  revalidatePath("/");
  revalidatePath(`/experiences/${slug}`);
}
