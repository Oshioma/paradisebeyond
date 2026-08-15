"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAllExperiences } from "@/lib/data/repository";
import { findByDeparture, priceBooking, feeForPayment } from "@/lib/booking/pricing";
import { getActiveCommissionBps } from "@/lib/booking/commission";
import { getPaymentProvider } from "@/lib/payments";
import { money, splitCommission } from "@/lib/money";
import { promoDiscount } from "@/lib/promo/validate";
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
  const departureId = String(formData.get("departureId") ?? "");
  // Bring the guest back to this booking page after signing in, not a generic list.
  const user = await requireUser(departureId ? `/book/${departureId}` : "/experiences");

  const roomId = String(formData.get("roomId") ?? "");
  // Clamp to a sane range; the atomic reserve_departure enforces real capacity.
  const guests = Math.min(20, Math.max(1, Math.floor(Number(formData.get("guests")) || 1)));
  const payFull = String(formData.get("payFull") ?? "") === "true";
  // Recoverable failures (Stripe/DB hiccups) send the guest back here with a notice.
  const errorDest = `/book/${departureId}?error=1`;

  const experiences = await getAllExperiences();
  const found = findByDeparture(experiences, departureId);
  if (!found) redirect("/experiences");
  const { experience, departure } = found;
  const room = experience.stay.roomTypes.find((r) => r.id === roomId) ?? experience.stay.roomTypes[0];

  const activeBps = await getActiveCommissionBps(experience.destinationSlug);
  const raw = priceBooking(experience, departure, room, guests, activeBps);

  // Apply a promo code (if valid) to the subtotal, then recompute the split.
  const promoInput = String(formData.get("promo") ?? "").trim();
  const promo = promoInput ? await promoDiscount(promoInput, raw.subtotalMinor) : null;
  const discountMinor = promo?.discountMinor ?? 0;

  const commissionRateBps = raw.commissionRateBps;
  const currency = raw.currency;
  const subtotalMinor = Math.max(0, raw.subtotalMinor - discountMinor);
  const split = splitCommission(subtotalMinor, commissionRateBps);
  const platformFeeMinor = split.platformFeeMinor;
  const hostNetMinor = split.hostNetMinor;
  const depositMinor = Math.min(raw.depositDueNowMinor, subtotalMinor);
  const dueNowMinor = payFull ? subtotalMinor : depositMinor;
  const paidMinor = dueNowMinor;
  const balanceMinor = subtotalMinor - paidMinor;
  const feeDueNowMinor = feeForPayment(platformFeeMinor, subtotalMinor, paidMinor);

  const bookingId = "bk-" + crypto.randomUUID().slice(0, 8);
  const reference = "PB-" + crypto.randomUUID().slice(0, 8).toUpperCase();
  const kind = payFull ? "full" : "deposit";
  const soldOut = `/experiences/${experience.slug}?soldout=1`;
  const provider = getPaymentProvider();

  // --- Stripe path: redirect to hosted Checkout; the webhook confirms. -------
  const { isStripeEnabled } = await import("@/lib/payments/stripe");
  if (isStripeEnabled() && isSupabaseConfigured()) {
    // Compute the destination inside the try, redirect outside it — so a real
    // failure lands on the error page while redirect()'s control-flow throw
    // (NEXT_REDIRECT) is never swallowed by the catch.
    let dest: string;
    try {
      const { startStripeCheckout } = await import("@/lib/payments/stripeCheckout");
      const res = await startStripeCheckout({
        guestId: user.id, guestEmail: user.email, experience, departure, room, guests, kind,
        currency, subtotalMinor, depositMinor, balanceMinor, dueNowMinor, feeDueNowMinor,
        commissionRateBps, platformFeeMinor, hostNetMinor, reference,
        promoCode: promo?.code, discountMinor,
      });
      dest = res.error ? errorDest : res.soldOut || !res.url ? soldOut : res.url;
    } catch (e) {
      console.error("[createBooking:stripe]", e);
      dest = errorDest;
    }
    redirect(dest); // → Stripe hosted checkout, sold-out, or error
  }

  if (isSupabaseConfigured()) {
    let dest: string;
    let reservedOk = false; // only release the seat on failure if we actually took it
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = createClient();

      // 1. Reserve the spot ATOMICALLY before charging — prevents overbooking.
      const { data: reserved, error: reserveError } = await supabase.rpc("reserve_departure", {
        p_departure: departure.id,
        p_qty: guests,
      });
      if (reserveError || !reserved) {
        dest = soldOut;
      } else {
        reservedOk = true;
        // 2. Take payment for the amount due now (idempotent).
        await provider.createPaymentIntent({
          bookingId: reference,
          kind,
          amount: money(dueNowMinor, currency),
          applicationFeeMinor: feeDueNowMinor,
          idempotencyKey: `${reference}:${kind}`,
        });

        // 3. Persist the booking (DB generates the id) with the commission snapshot.
        const { data: inserted, error: bookingError } = await supabase
          .from("bookings")
          .insert({
            reference,
            guest_id: user.id,
            departure_id: departure.id,
            room_type_id: room.id,
            guest_count: guests,
            currency,
            subtotal_minor: subtotalMinor,
            deposit_minor: depositMinor,
            balance_minor: balanceMinor,
            balance_due_date: departure.startDate,
            commission_rate_bps: commissionRateBps,
            platform_fee_minor: platformFeeMinor,
            host_net_minor: hostNetMinor,
            promo_code: promo?.code ?? null,
            discount_minor: discountMinor,
            status: payFull ? "confirmed" : "reserved",
          })
          .select("id")
          .single();
        // If the booking row didn't persist, release the held seat rather than
        // stranding it, and send the guest to the error page.
        if (bookingError || !inserted) throw bookingError ?? new Error("Booking row not created");

        const newId = inserted.id as string;
        // Payments are a service-role-only write under RLS (financial rows).
        // Insert through the service role so the payment is actually recorded,
        // not silently dropped (the webhook already uses the service role).
        const { createServiceRoleClient } = await import("@/lib/supabase/server");
        await createServiceRoleClient().from("payments").upsert(
          {
            booking_id: newId,
            kind,
            amount_minor: dueNowMinor,
            currency,
            application_fee_minor: feeDueNowMinor,
            provider: provider.name,
            status: "succeeded",
            idempotency_key: `${reference}:${kind}`,
          },
          { onConflict: "idempotency_key", ignoreDuplicates: true },
        );
        if (promo) await supabase.rpc("redeem_promo", { p_code: promo.code });

        await sendConfirmation({
          to: user.email, guestName: user.name, experienceName: experience.name, location: experience.location,
          startDate: departure.startDate, endDate: departure.endDate, reference,
          paidMinor, balanceMinor, currency, bookingId: newId,
        });
        dest = `/account/trips/${newId}?new=1`;
      }
    } catch (e) {
      console.error("[createBooking:db]", e);
      // Best-effort: hand the reserved seat back so a failed booking doesn't shrink inventory.
      if (reservedOk) {
        try {
          const { createServiceRoleClient } = await import("@/lib/supabase/server");
          await createServiceRoleClient().rpc("release_departure", { p_departure: departure.id, p_qty: guests });
        } catch { /* ignore */ }
      }
      dest = errorDest;
    }
    redirect(dest);
  }

  // --- Demo path -----------------------------------------------------------
  if (departure.spacesRemaining < guests) redirect(soldOut);
  await provider.createPaymentIntent({
    bookingId,
    kind,
    amount: money(dueNowMinor, currency),
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
    currency,
    subtotalMinor,
    depositMinor,
    balanceMinor,
    paidMinor,
    balanceDueDate: departure.startDate,
    commissionRateBps,
    platformFeeMinor,
    hostNetMinor,
    status: payFull ? "confirmed" : "reserved",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  updateDemoState((s) => {
    s.bookings.push(booking);
  });
  await sendConfirmation({
    to: user.email, guestName: user.name, experienceName: experience.name, location: experience.location,
    startDate: departure.startDate, endDate: departure.endDate, reference,
    paidMinor, balanceMinor, currency, bookingId,
  });
  redirect(`/account/trips/${bookingId}?new=1`);
}

/** Preview a promo code against a subtotal (for the booking summary). */
export async function checkPromo(code: string, subtotalMinor: number) {
  return promoDiscount(code, subtotalMinor);
}
