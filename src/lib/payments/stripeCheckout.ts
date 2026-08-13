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
  promoCode?: string;
  discountMinor?: number;
}): Promise<{ url?: string; soldOut?: boolean; error?: boolean }> {
  const { createClient, createServiceRoleClient } = await import("@/lib/supabase/server");
  const supabase = createClient();

  // 0. Idempotency: if this guest already has an OPEN checkout for the same
  //    departure + room (e.g. a double-submit or retry), reuse it instead of
  //    reserving and charging a second time. Best-effort — any hiccup falls
  //    through to a fresh flow.
  try {
    const { data: prior } = await supabase
      .from("bookings")
      .select("stripe_session_id")
      .eq("guest_id", p.guestId)
      .eq("departure_id", p.departure.id)
      .eq("room_type_id", p.room.id)
      .eq("status", "pending")
      .not("stripe_session_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prior?.stripe_session_id) {
      const priorSession = await getStripe().checkout.sessions.retrieve(prior.stripe_session_id as string);
      if (priorSession.status === "open" && priorSession.url) return { url: priorSession.url };
    }
  } catch { /* no reusable session — continue to a fresh checkout */ }

  // 1. Hold the spot.
  const { data: reserved, error: reserveError } = await supabase.rpc("reserve_departure", {
    p_departure: p.departure.id,
    p_qty: p.guests,
  });
  if (reserveError || !reserved) return { soldOut: true };

  // Everything after the reservation must hand the seat back on failure — a
  // thrown Stripe error would otherwise strand the held seat permanently (with
  // no session there is no checkout.session.expired webhook to release it).
  let bookingId: string | undefined;
  try {
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
        promo_code: p.promoCode ?? null,
        discount_minor: p.discountMinor ?? 0,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertError || !inserted) throw insertError ?? new Error("booking insert failed");
    bookingId = inserted.id as string;
    // Note: the promo is redeemed by the webhook once payment succeeds — never
    // here, so abandoned checkouts don't burn a limited code.

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

    // Persist the session id via the service role — guests have no UPDATE on bookings.
    await createServiceRoleClient().from("bookings").update({ stripe_session_id: session.id }).eq("id", bookingId);
    return { url: session.url ?? undefined };
  } catch (e) {
    console.error("[startStripeCheckout]", e);
    const admin = createServiceRoleClient();
    await admin.rpc("release_departure", { p_departure: p.departure.id, p_qty: p.guests });
    if (bookingId) await admin.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    return { error: true };
  }
}

/**
 * Checkout for the remaining BALANCE on an existing booking (no new booking, no
 * re-reservation). The webhook records the balance payment and confirms the trip.
 */
export async function startBalanceCheckout(
  bookingId: string,
  guestEmail: string,
): Promise<{ url?: string; done?: boolean; error?: string }> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("departure_id, balance_minor, subtotal_minor, platform_fee_minor, currency")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { error: "Booking not found" };
  if ((booking.balance_minor ?? 0) <= 0) return { done: true };

  const { getAllExperiences } = await import("@/lib/data/repository");
  const all = await getAllExperiences();
  let experience: Experience | undefined;
  let departure: Departure | undefined;
  for (const e of all) {
    const d = e.departures.find((x) => x.id === booking.departure_id);
    if (d) { experience = e; departure = d; break; }
  }

  // The balance leg's fee is the REMAINDER of the snapshotted platform fee after
  // the deposit leg — not an independent round — so deposit fee + balance fee
  // reconcile exactly to platform_fee_minor (no stray cent lost to the host).
  const paidSoFar = (booking.subtotal_minor ?? 0) - (booking.balance_minor ?? 0);
  const feeDeposit = booking.subtotal_minor
    ? Math.round((booking.platform_fee_minor * paidSoFar) / booking.subtotal_minor)
    : 0;
  const feeBalance = Math.max(0, (booking.platform_fee_minor ?? 0) - feeDeposit);

  const { data: host } = await supabase
    .from("hosts")
    .select("stripe_account_id, stripe_onboarded")
    .eq("slug", experience?.hostSlugs[0] ?? "")
    .maybeSingle();

  const stripe = getStripe();
  const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {
    metadata: { booking_id: bookingId, kind: "balance" },
  };
  if (host?.stripe_account_id && host?.stripe_onboarded) {
    paymentIntentData.application_fee_amount = feeBalance;
    paymentIntentData.transfer_data = { destination: host.stripe_account_id };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: guestEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: (booking.currency as string).toLowerCase(),
          unit_amount: booking.balance_minor,
          product_data: { name: `${experience?.name ?? "Your trip"} — balance` },
        },
      },
    ],
    payment_intent_data: paymentIntentData,
    metadata: { booking_id: bookingId, kind: "balance" },
    success_url: `${siteUrl()}/account/trips/${bookingId}?paid=1`,
    cancel_url: `${siteUrl()}/account/trips/${bookingId}`,
  });

  return { url: session.url ?? undefined };
}
