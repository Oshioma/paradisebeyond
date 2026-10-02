"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { getTrip } from "@/lib/data/bookings";
import { checklistSide } from "@/lib/offgrid/checklist";
import { getCheckins, respondCheckin } from "@/lib/offgrid/checkinStore";
import type { CheckinKind, CheckinResponse } from "@/lib/offgrid/checkins";

/**
 * Traveller answers "Have you arrived safely?" / "Everything okay?". A request
 * for help alerts the Spend Time Off Grid team straight away (not the host).
 */
export async function answerCheckin(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") ?? "");
  const kind = String(formData.get("kind") ?? "") as CheckinKind;
  const response = String(formData.get("response") ?? "") as CheckinResponse;
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000) || undefined;
  if (!["arrival", "settled"].includes(kind) || !["ok", "help"].includes(response)) return { ok: false, error: "Something went wrong." };

  const trip = await getTrip(user, bookingId);
  if (!trip || checklistSide(user, trip) !== "guest") return { ok: false, error: "Stay not found." };
  if (!(await getCheckins(trip)).some((c) => c.kind === kind)) return { ok: false, error: "This check-in isn't open." };
  if (!(await respondCheckin(trip.id, kind, response, note))) return { ok: false, error: "Couldn't save — please try again." };

  if (response === "help") {
    try {
      const { SPEND_TIME_OFF_GRID } = await import("@/lib/brand/config");
      const { canonicalOriginFor } = await import("@/lib/brand/server");
      const { supportAlertEmail } = await import("@/lib/offgrid/emails");
      const { sendEmail } = await import("@/lib/email");
      await sendEmail({
        to: SPEND_TIME_OFF_GRID.contactEmail,
        replyTo: user.email,
        ...supportAlertEmail({
          origin: canonicalOriginFor(SPEND_TIME_OFF_GRID), reason: "help", kind, reference: trip.reference,
          listing: trip.experience.name, travellerName: user.name, travellerEmail: user.email, note,
        }),
      });
    } catch { /* the answer is saved; the alert is best-effort */ }
  }
  revalidatePath(`/account/trips/${trip.id}`);
  return { ok: true };
}
