"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { getTrip } from "@/lib/data/bookings";
import { saveTripPrep, type TripPrep } from "@/lib/trip/prep";

/** Guest saves their pre-trip questionnaire. Only for their own booking. */
export async function saveQuestionnaire(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return { ok: false, error: "Missing booking." };

  // Ownership check (belt-and-braces alongside RLS).
  const trip = await getTrip(user, bookingId);
  if (!trip) return { ok: false, error: "Trip not found." };

  const level = String(formData.get("experienceLevel") ?? "");
  const prep: TripPrep = {
    dietary: String(formData.get("dietary") ?? "").trim().slice(0, 2000) || undefined,
    experienceLevel: (["first-timer", "some", "experienced"].includes(level) ? level : undefined) as TripPrep["experienceLevel"],
    medical: String(formData.get("medical") ?? "").trim().slice(0, 2000) || undefined,
    emergencyName: String(formData.get("emergencyName") ?? "").trim().slice(0, 200) || undefined,
    emergencyPhone: String(formData.get("emergencyPhone") ?? "").trim().slice(0, 60) || undefined,
    notes: String(formData.get("notes") ?? "").trim().slice(0, 2000) || undefined,
  };

  await saveTripPrep(bookingId, prep);
  revalidatePath(`/account/trips/${bookingId}`);
  return { ok: true };
}
