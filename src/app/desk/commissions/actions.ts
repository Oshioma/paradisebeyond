"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { setCommissionBps, clearDestinationOverride } from "@/lib/booking/commission";

/**
 * Admin: set the global commission rate or a per-destination override. Rate is
 * entered as a percentage and stored as basis points. Clearing a destination's
 * field removes its override so it inherits the global rate.
 */
export async function setCommission(formData: FormData): Promise<void> {
  await requireRole("admin");
  const scope = String(formData.get("scope") ?? "global"); // "global" or a destination slug
  const rawRate = String(formData.get("rate") ?? "").trim();
  const destinationSlug = scope === "global" ? undefined : scope;

  // Empty field on a destination row = clear the override.
  if (destinationSlug && rawRate === "") {
    await clearDestinationOverride(destinationSlug);
    revalidatePath("/desk/commissions");
    redirect("/desk/commissions?saved=1");
  }

  const pct = Number(rawRate);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    redirect("/desk/commissions?error=" + encodeURIComponent("Enter a rate between 0 and 100."));
  }
  const res = await setCommissionBps(Math.round(pct * 100), destinationSlug);
  if (!res.ok) redirect("/desk/commissions?error=" + encodeURIComponent(res.error ?? "Could not save."));

  revalidatePath("/desk/commissions");
  revalidatePath("/experiences");
  redirect("/desk/commissions?saved=1");
}
