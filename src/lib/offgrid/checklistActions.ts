"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { getTrip } from "@/lib/data/bookings";
import { checklistSide, sanitizeDetails, toggleManual, type ChecklistSide } from "@/lib/offgrid/checklist";
import { getStayChecklists, saveStayChecklist } from "@/lib/offgrid/checklistStore";
import { getTripPrep, saveTripPrep } from "@/lib/trip/prep";

type Result = { ok: boolean; error?: string };

/**
 * Who is acting on which booking. The side comes from the booking itself —
 * never from the form — and only Spend Time Off Grid stays qualify. In live
 * mode the row-level policies check again on every read and write.
 */
async function context(formData: FormData) {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return null;
  const trip = await getTrip(user, bookingId); // null if this user can't see it
  if (!trip) return null;
  const side = checklistSide(user, trip);
  return side ? { user, trip, side } : null;
}

function refresh(bookingId: string) {
  revalidatePath(`/account/trips/${bookingId}`);
  revalidatePath(`/studio/messages/${bookingId}`);
}

async function update(bookingId: string, side: ChecklistSide, patch: (d: Awaited<ReturnType<typeof getStayChecklists>>["guest"]) => typeof d) {
  const both = await getStayChecklists(bookingId);
  const ok = await saveStayChecklist(bookingId, side, patch(both[side]));
  if (ok) refresh(bookingId);
  return ok;
}

/** Tick / untick one of your own manual items. */
export async function toggleChecklistItem(formData: FormData): Promise<Result> {
  const ctx = await context(formData);
  if (!ctx) return { ok: false, error: "Stay not found." };
  const key = String(formData.get("key") ?? "");
  const on = String(formData.get("on") ?? "") === "1";
  const ok = await update(ctx.trip.id, ctx.side, (d) => toggleManual(d, ctx.side, key, on));
  return ok ? { ok } : { ok, error: "Couldn't save — please try again." };
}

/**
 * Traveller: introduce yourself. Saved on the checklist and posted once to the
 * stay's message thread, which is where the host's inbox picks it up.
 */
export async function saveIntroduction(formData: FormData): Promise<Result> {
  const ctx = await context(formData);
  if (!ctx || ctx.side !== "guest") return { ok: false, error: "Stay not found." };
  const { introduction } = sanitizeDetails("guest", { introduction: formData.get("introduction") });
  if (!introduction || introduction.length < 40) {
    return { ok: false, error: "Tell your host a little more — a few sentences about you and why you'd like to stay." };
  }
  const before = (await getStayChecklists(ctx.trip.id)).guest;
  const ok = await update(ctx.trip.id, "guest", (d) => ({ ...d, introduction }));
  if (!ok) return { ok, error: "Couldn't save — please try again." };
  if (!before.introduction) {
    const { sendMessage } = await import("@/lib/messaging/actions");
    const msg = new FormData();
    msg.set("bookingId", ctx.trip.id);
    msg.set("body", introduction);
    await sendMessage(msg);
  }
  return { ok: true };
}

/** Traveller: how and when they expect to arrive. */
export async function saveArrivalDetails(formData: FormData): Promise<Result> {
  const ctx = await context(formData);
  if (!ctx || ctx.side !== "guest") return { ok: false, error: "Stay not found." };
  const { arrival } = sanitizeDetails("guest", {
    arrivalTime: formData.get("arrivalTime"),
    transport: formData.get("transport"),
    pickup: formData.get("pickup"),
  });
  const ok = await update(ctx.trip.id, "guest", (d) => ({ ...d, arrival }));
  return ok ? { ok } : { ok, error: "Couldn't save — please try again." };
}

/** Host: directions / meeting point and any pickup. */
export async function saveDirections(formData: FormData): Promise<Result> {
  const ctx = await context(formData);
  if (!ctx || ctx.side !== "host") return { ok: false, error: "Stay not found." };
  const { directions } = sanitizeDetails("host", { directions: formData.get("directions") });
  const ok = await update(ctx.trip.id, "host", (d) => ({ ...d, directions }));
  return ok ? { ok } : { ok, error: "Couldn't save — please try again." };
}

/**
 * Traveller: emergency contact. Stored in the stay's private trip_prep record
 * (guest-owned; the booking's host can read it), merged so the rest of that
 * record is untouched.
 */
export async function saveEmergencyContact(formData: FormData): Promise<Result> {
  const ctx = await context(formData);
  if (!ctx || ctx.side !== "guest") return { ok: false, error: "Stay not found." };
  const s = (k: string, n: number) => String(formData.get(k) ?? "").trim().slice(0, n) || undefined;
  const name = s("emergencyName", 200);
  const phone = s("emergencyPhone", 60);
  if (!name || !phone) return { ok: false, error: "Add at least a name and a phone number." };
  const existing = (await getTripPrep(ctx.trip.id)) ?? {};
  await saveTripPrep(ctx.trip.id, {
    ...existing,
    emergencyName: name,
    emergencyPhone: phone,
    emergencyRelationship: s("emergencyRelationship", 100),
    emergencyEmail: s("emergencyEmail", 200),
  });
  refresh(ctx.trip.id);
  return { ok: true };
}
