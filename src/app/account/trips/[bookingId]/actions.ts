"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateDemoState } from "@/lib/demo/state";
import type { FlightDetails } from "@/lib/booking/types";

/**
 * Save the guest's flight details so the retreat organiser can coordinate
 * transfers. We never sell flights — the guest arranges their own and enters
 * them here once booked.
 */
export async function saveFlightDetails(bookingId: string, formData: FormData) {
  const user = await requireUser();

  const flight: FlightDetails = {
    arrivalFlight: String(formData.get("arrivalFlight") ?? "").trim() || undefined,
    arrivalDate: String(formData.get("arrivalDate") ?? "").trim() || undefined,
    departureFlight: String(formData.get("departureFlight") ?? "").trim() || undefined,
    departureDate: String(formData.get("departureDate") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };

  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    // RLS ensures the guest can only write flight_details for their own booking.
    const { error } = await supabase.from("flight_details").upsert(
      {
        booking_id: bookingId,
        arrival_flight: flight.arrivalFlight,
        arrival_time: flight.arrivalDate ? new Date(flight.arrivalDate).toISOString() : null,
        departure_flight: flight.departureFlight,
        departure_time: flight.departureDate ? new Date(flight.departureDate).toISOString() : null,
        notes: flight.notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "booking_id" },
    );
    if (error) return { ok: false, error: "Couldn't save your flight details. Please try again." };
  } else {
    void user;
    updateDemoState((s) => {
      s.flights[bookingId] = flight;
    });
  }

  revalidatePath(`/account/trips/${bookingId}`);
  return { ok: true };
}

/** Pay the remaining balance on a booking. */
export async function payBalance(formData: FormData) {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return;

  const { isStripeEnabled } = await import("@/lib/payments/stripe");
  if (isStripeEnabled() && isSupabaseConfigured()) {
    const { startBalanceCheckout } = await import("@/lib/payments/stripeCheckout");
    const res = await startBalanceCheckout(bookingId, user.email);
    if (res.url) redirect(res.url);
    redirect(`/account/trips/${bookingId}`);
  }

  if (isSupabaseConfigured()) {
    // Mock provider: mark the balance settled.
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data: b } = await supabase
      .from("bookings")
      .select("balance_minor, currency")
      .eq("id", bookingId)
      .maybeSingle();
    if (b && (b.balance_minor ?? 0) > 0) {
      // Settling the balance and recording the payment are financial writes —
      // service-role-only under RLS. Use it so the balance actually clears
      // instead of failing silently on the guest's session.
      const { createServiceRoleClient } = await import("@/lib/supabase/server");
      const admin = createServiceRoleClient();
      await admin.from("bookings").update({ balance_minor: 0, status: "confirmed" }).eq("id", bookingId);
      await admin.from("payments").upsert(
        { booking_id: bookingId, kind: "balance", amount_minor: b.balance_minor, currency: b.currency, provider: "mock", status: "succeeded", idempotency_key: `${bookingId}:balance` },
        { onConflict: "idempotency_key", ignoreDuplicates: true },
      );
    }
    await notifyBalancePaid(user, bookingId);
    revalidatePath(`/account/trips/${bookingId}`);
    redirect(`/account/trips/${bookingId}?paid=1`);
  }

  // Demo
  updateDemoState((s) => {
    if (!s.balancePaid.includes(bookingId)) s.balancePaid.push(bookingId);
  });
  await notifyBalancePaid(user, bookingId);
  redirect(`/account/trips/${bookingId}?paid=1`);
}

async function notifyBalancePaid(user: { name: string; email: string }, bookingId: string) {
  try {
    const { getTrip } = await import("@/lib/data/bookings");
    const trip = await getTrip(user as never, bookingId);
    if (!trip) return;
    const { sendEmail } = await import("@/lib/email");
    const { balancePaidEmail } = await import("@/lib/email/templates");
    await sendEmail({ to: user.email, ...balancePaidEmail(user.name, trip.experience.name) });
  } catch { /* non-fatal */ }
}
