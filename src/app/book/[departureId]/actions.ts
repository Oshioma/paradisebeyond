"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAllExperiences } from "@/lib/data/repository";
import { findByDeparture, priceBooking } from "@/lib/booking/pricing";
import { getPaymentProvider } from "@/lib/payments";
import { money } from "@/lib/money";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateDemoState } from "@/lib/demo/state";
import type { Booking } from "@/lib/booking/types";

/**
 * Create a booking. Computes the price and the commission split, snapshots the
 * commission rate onto the booking, and takes the amount due now through the
 * active payment provider (mock today, Stripe Connect later). Requires a
 * signed-in guest — redirects to login otherwise.
 */
export async function createBooking(formData: FormData) {
  const user = await requireUser("/experiences");

  const departureId = String(formData.get("departureId") ?? "");
  const roomId = String(formData.get("roomId") ?? "");
  const guests = Math.max(1, Number(formData.get("guests") ?? 1));
  const payFull = String(formData.get("payFull") ?? "") === "true";

  const experiences = await getAllExperiences();
  const found = findByDeparture(experiences, departureId);
  if (!found) redirect("/experiences");
  const { experience, departure } = found;
  const room = experience.stay.roomTypes.find((r) => r.id === roomId) ?? experience.stay.roomTypes[0];

  const breakdown = priceBooking(experience, departure, room, guests);
  const dueNowMinor = payFull ? breakdown.subtotalMinor : breakdown.depositDueNowMinor;
  const paidMinor = dueNowMinor;
  const balanceMinor = breakdown.subtotalMinor - paidMinor;

  const bookingId = "bk-" + crypto.randomUUID().slice(0, 8);
  const reference = "PB-" + crypto.randomUUID().slice(0, 8).toUpperCase();

  // Take payment for the amount due now. Idempotency prevents double charges.
  const provider = getPaymentProvider();
  await provider.createPaymentIntent({
    bookingId,
    kind: payFull ? "full" : "deposit",
    amount: money(dueNowMinor, breakdown.currency),
    applicationFeeMinor: Math.round((breakdown.platformFeeMinor * paidMinor) / breakdown.subtotalMinor),
    idempotencyKey: `${bookingId}:${payFull ? "full" : "deposit"}`,
  });

  const booking: Booking = {
    id: bookingId,
    reference,
    guestId: user.id,
    guestName: user.name,
    experienceSlug: experience.slug,
    departureId: departure.id,
    roomTypeId: room.id,
    guestCount: guests,
    currency: breakdown.currency,
    subtotalMinor: breakdown.subtotalMinor,
    depositMinor: breakdown.depositDueNowMinor,
    balanceMinor,
    paidMinor,
    balanceDueDate: departure.startDate, // simplified: balance by start; real path uses schedule
    commissionRateBps: breakdown.commissionRateBps,
    platformFeeMinor: breakdown.platformFeeMinor,
    hostNetMinor: breakdown.hostNetMinor,
    status: payFull ? "confirmed" : "reserved",
    createdAt: new Date().toISOString().slice(0, 10),
  };

  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    // RLS: a guest may insert only their own booking. Money/commission columns
    // are computed server-side here (not trusted from the client).
    await supabase.from("bookings").insert({
      id: bookingId,
      reference,
      guest_id: user.id,
      departure_id: departure.id,
      room_type_id: room.id,
      guest_count: guests,
      currency: breakdown.currency,
      subtotal_minor: breakdown.subtotalMinor,
      deposit_minor: breakdown.depositDueNowMinor,
      balance_minor: balanceMinor,
      commission_rate_bps: breakdown.commissionRateBps,
      platform_fee_minor: breakdown.platformFeeMinor,
      host_net_minor: breakdown.hostNetMinor,
      status: booking.status,
    });
  } else {
    updateDemoState((s) => {
      s.bookings.push(booking);
    });
  }

  redirect(`/account/trips/${bookingId}?new=1`);
}
