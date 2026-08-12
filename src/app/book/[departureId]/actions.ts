"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAllExperiences } from "@/lib/data/repository";
import { findByDeparture, priceBooking } from "@/lib/booking/pricing";
import { getPaymentProvider } from "@/lib/payments";
import { money } from "@/lib/money";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateDemoState } from "@/lib/demo/state";
import { sendEmail } from "@/lib/email";
import { bookingConfirmationEmail } from "@/lib/email/templates";
import type { Booking } from "@/lib/booking/types";

/** Fire the booking confirmation email (best-effort; never blocks the booking). */
async function sendConfirmation(args: {
  to: string; guestName: string; experienceName: string; location: string;
  startDate: string; endDate: string; reference: string; paidMinor: number;
  balanceMinor: number; currency: string; bookingId: string;
}) {
  try {
    await sendEmail({ to: args.to, ...bookingConfirmationEmail(args) });
  } catch { /* non-fatal */ }
}

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
  const kind = payFull ? "full" : "deposit";
  const feeDueNowMinor = Math.round((breakdown.platformFeeMinor * paidMinor) / breakdown.subtotalMinor);
  const soldOut = `/experiences/${experience.slug}?soldout=1`;
  const provider = getPaymentProvider();

  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();

    // 1. Reserve the spot ATOMICALLY before charging — prevents overbooking.
    const { data: reserved, error: reserveError } = await supabase.rpc("reserve_departure", {
      p_departure: departure.id,
      p_qty: guests,
    });
    if (reserveError || !reserved) redirect(soldOut);

    // 2. Take payment for the amount due now (idempotent).
    await provider.createPaymentIntent({
      bookingId: reference,
      kind,
      amount: money(dueNowMinor, breakdown.currency),
      applicationFeeMinor: feeDueNowMinor,
      idempotencyKey: `${reference}:${kind}`,
    });

    // 3. Persist the booking (DB generates the id) with the commission snapshot.
    const { data: inserted } = await supabase
      .from("bookings")
      .insert({
        reference,
        guest_id: user.id,
        departure_id: departure.id,
        room_type_id: room.id,
        guest_count: guests,
        currency: breakdown.currency,
        subtotal_minor: breakdown.subtotalMinor,
        deposit_minor: breakdown.depositDueNowMinor,
        balance_minor: balanceMinor,
        balance_due_date: departure.startDate,
        commission_rate_bps: breakdown.commissionRateBps,
        platform_fee_minor: breakdown.platformFeeMinor,
        host_net_minor: breakdown.hostNetMinor,
        status: payFull ? "confirmed" : "reserved",
      })
      .select("id")
      .single();

    const newId = inserted?.id ?? bookingId;
    await supabase.from("payments").insert({
      booking_id: newId,
      kind,
      amount_minor: dueNowMinor,
      currency: breakdown.currency,
      application_fee_minor: feeDueNowMinor,
      provider: provider.name,
      status: "succeeded",
      idempotency_key: `${reference}:${kind}`,
    });

    await sendConfirmation({
      to: user.email, guestName: user.name, experienceName: experience.name, location: experience.location,
      startDate: departure.startDate, endDate: departure.endDate, reference,
      paidMinor, balanceMinor, currency: breakdown.currency, bookingId: newId,
    });
    redirect(`/account/trips/${newId}?new=1`);
  }

  // --- Demo path -----------------------------------------------------------
  if (departure.spacesRemaining < guests) redirect(soldOut);
  await provider.createPaymentIntent({
    bookingId,
    kind,
    amount: money(dueNowMinor, breakdown.currency),
    applicationFeeMinor: feeDueNowMinor,
    idempotencyKey: `${bookingId}:${kind}`,
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
    balanceDueDate: departure.startDate,
    commissionRateBps: breakdown.commissionRateBps,
    platformFeeMinor: breakdown.platformFeeMinor,
    hostNetMinor: breakdown.hostNetMinor,
    status: payFull ? "confirmed" : "reserved",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  updateDemoState((s) => {
    s.bookings.push(booking);
  });
  await sendConfirmation({
    to: user.email, guestName: user.name, experienceName: experience.name, location: experience.location,
    startDate: departure.startDate, endDate: departure.endDate, reference,
    paidMinor, balanceMinor, currency: breakdown.currency, bookingId,
  });
  redirect(`/account/trips/${bookingId}?new=1`);
}
