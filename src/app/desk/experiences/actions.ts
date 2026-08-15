"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { setExperienceOrder } from "@/lib/data/experienceOrder";
import { invalidateExperiences } from "@/lib/data/repository";

/**
 * Persist the admin's chosen order of experiences (a list of slugs, top first).
 * Applied everywhere the listing appears, so revalidate those paths.
 */
export async function reorderExperiences(slugs: string[]): Promise<{ ok: boolean; error?: string }> {
  await requireRole("admin");
  if (!Array.isArray(slugs) || slugs.some((s) => typeof s !== "string")) {
    return { ok: false, error: "Invalid order." };
  }
  try {
    await setExperienceOrder(slugs);
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Couldn't save the order." };
  }
  invalidateExperiences();
  revalidatePath("/desk/experiences");
  revalidatePath("/experiences");
  revalidatePath("/");
  return { ok: true };
}
