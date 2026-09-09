"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { getTrip } from "@/lib/data/bookings";
import { getTripPrep, saveTripPrep, tripHasEnded, type TripPrep } from "@/lib/trip/prep";

/** Guest saves their pre-trip questionnaire. Only for their own booking. */
export async function saveQuestionnaire(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return { ok: false, error: "Missing booking." };

  // Ownership check (belt-and-braces alongside RLS).
  const trip = await getTrip(user, bookingId);
  if (!trip) return { ok: false, error: "Trip not found." };

  const level = String(formData.get("experienceLevel") ?? "");

  // Once the trip is over the safety purpose has expired, so health answers are
  // purged and cannot be re-added — a late save keeps the rest of the answers.
  const ended = tripHasEnded(trip.departure.endDate);
  const healthConsent = !ended && String(formData.get("healthConsent") ?? "") === "yes";

  const dietary = String(formData.get("dietary") ?? "").trim().slice(0, 2000) || undefined;
  const medical = String(formData.get("medical") ?? "").trim().slice(0, 2000) || undefined;

  // Dietary and medical answers are special category data (UK GDPR Art. 9).
  // Explicit consent is the only basis we rely on, so without the tick we
  // simply don't store them — and because this runs on every save, clearing
  // the tick erases what was stored before. The client enforces this too, but
  // the decision has to be made here, where it can't be bypassed.
  if (!healthConsent && (dietary || medical) && !ended) {
    return { ok: false, error: "Please agree to us sharing your health and dietary details with your host, or clear those two answers." };
  }

  // Keep the ORIGINAL consent timestamp while consent stands — that is the
  // moment we have to be able to evidence. A withdrawal followed by a fresh
  // consent correctly starts a new one.
  const existing = await getTripPrep(bookingId);
  const consentAt = healthConsent
    ? (existing?.healthConsent && existing.healthConsentAt) || new Date().toISOString()
    : undefined;

  const prep: TripPrep = {
    dietary: healthConsent ? dietary : undefined,
    experienceLevel: (["first-timer", "some", "experienced"].includes(level) ? level : undefined) as TripPrep["experienceLevel"],
    medical: healthConsent ? medical : undefined,
    emergencyName: String(formData.get("emergencyName") ?? "").trim().slice(0, 200) || undefined,
    emergencyPhone: String(formData.get("emergencyPhone") ?? "").trim().slice(0, 60) || undefined,
    notes: String(formData.get("notes") ?? "").trim().slice(0, 2000) || undefined,
    healthConsent: healthConsent || undefined,
    healthConsentAt: consentAt,
  };

  await saveTripPrep(bookingId, prep);
  revalidatePath(`/account/trips/${bookingId}`);
  return { ok: true };
}
