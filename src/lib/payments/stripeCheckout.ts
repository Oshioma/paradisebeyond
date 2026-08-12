import type Stripe from "stripe";
import type { Departure, Experience, RoomType } from "@/lib/types";
import { getStripe } from "./stripe";
import { siteUrl } from "@/lib/siteUrl";
import { formatDateRange } from "@/lib/utils";

/**
 * Start a Stripe Checkout for a booking (deposit or full).
 *
 * Flow: reserve the spot atomically → create a PENDING booking → open a Stripe
 * Checkout Session as a DESTINATION CHARGE (platform commission as the
 * application fee, remainder transferred to the host's connected account) →
 * return the hosted URL to redirect the guest to. The booking is confirmed by
 * the webhook (source of truth), not the success redirect.
 */
export async function startStripeCheckout(p: {
  guestId: string;
  guestEmail: string;
  experience: Experience;
  departure: Departure;
  room: RoomType;
  guests: number;
  kind: "deposit" | "full";
  currency: string;
  subtotalMinor: number;
  depositMinor: number;
  balanceMinor: number;
  dueNowMinor: number;
  feeDueNowMinor: number;
  commissionRateBps: number;
  platformFeeMinor: number;
  hostNetMinor: number;
  reference: string;
}): Promise<{ url?: string; soldOut?: boolean }> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();

  // 1. Hold the spot.
  const { data: reserved, error: reserveError } = await supabase.rpc("reserve_departure", {
    p_departure: p.departure.id,
    p_qty: p.guests,
  });
  if (reserveError || !reserved) return { soldOut: true };

  // 2. Pending booking with the commission snapshot (RLS: guest inserts own).
  const { data: inserted, error: insertError } = await supabase
    .from("bookings")
    .insert({
      reference: p.reference,
      guest_id: p.guestId,
      departure_id: p.departure.id,
      room_type_id: p.room.id,
      guest_count: p.guests,
      currency: p.currency,
      subtotal_minor: p.subtotalMinor,
      deposit_minor: p.depositMinor,
      balance_minor: p.balanceMinor,
      balance_due_date: p.departure.startDate,
      commission_rate_bps: p.commissionRateBps,
      platform_fee_minor: p.platformFeeMinor,
      host_net_minor: p.hostNetMinor,
      status: "pending",
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    // Release the hold if we couldn't record the booking.
    await supabase.rpc("release_departure", { p_departure: p.departure.id, p_qty: p.guests });
    return { soldOut: true };
  }
  const bookingId = inserted.id as string;

  // 3. Host's connected account (destination of the transfer).
  const { data: host } = await supabase
    .from("hosts")
    .select("stripe_account_id, stripe_onboarded")
    .eq("slug", p.experience.hostSlugs[0])
    .maybeSingle();

  const stripe = getStripe();
  const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {
    metadata: { booking_id: bookingId, kind: p.kind },
  };
  // Only route to the host when they've completed Connect onboarding; otherwise
  // the platform collects and settles with the host separately.
  if (host?.stripe_account_id && host?.stripe_onboarded) {
    paymentIntentData.application_fee_amount = p.feeDueNowMinor;
    paymentIntentData.transfer_data = { destination: host.stripe_account_id };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: p.guestEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: p.currency.toLowerCase(),
          unit_amount: p.dueNowMinor,
          product_data: {
            name: `${p.experience.name} — ${p.kind === "full" ? "full payment" : "deposit"}`,
            description: `${formatDateRange(p.departure.startDate, p.departure.endDate)} · ${p.room.name} · ${p.guests} guest(s)`,
          },
        },
      },
    ],
    payment_intent_data: paymentIntentData,
    metadata: { booking_id: bookingId, kind: p.kind },
    success_url: `${siteUrl()}/account/trips/${bookingId}?paid=1`,
    cancel_url: `${siteUrl()}/book/${p.departure.id}?canceled=1`,
  });

  await supabase.from("bookings").update({ stripe_session_id: session.id }).eq("id", bookingId);
  return { url: session.url ?? undefined };
}
