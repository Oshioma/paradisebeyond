import type { Departure, Experience } from "@/lib/types";
import type { Booking } from "@/lib/booking/types";
import type { SessionUser } from "@/lib/auth/types";
import type { OffGridDetails } from "./types";
import { MAX_TRAVELLERS_PER_BOOKING, checkStayRequest, quoteOffGridStay, type OffGridQuote } from "./pricing";
import { marketplaceOf, type MarketplaceId } from "@/lib/brand/config";

/**
 * Off-grid (Spend Time Off Grid) bookings, on the SAME booking engine as
 * Paradise Beyond: the atomic `reserve_departure` hold, the `bookings` row with
 * its commission snapshot, Stripe Checkout destination charges + webhook, and
 * the demo provider. What differs:
 *   - the traveller picks an arrival date and nights within a host's window;
 *   - price = host's rate × nights (or per week / per stay), paid in full;
 *   - commission is the marketplace's fixed rate (15%);
 *   - a free / exchange-only stay takes no payment at all — it reserves the
 *     place and creates the booking directly, never touching Stripe;
 *   - marketplace + stay dates are snapshotted onto the booking.
 */

export { MAX_TRAVELLERS_PER_BOOKING };

export type PaymentRoute = "free" | "stripe" | "direct" | "demo";

/** Which payment path a quote takes. Free stays never reach a payment provider. */
export function offGridPaymentRoute(q: Pick<OffGridQuote, "isFree">, env: { stripe: boolean; supabase: boolean }): PaymentRoute {
  if (!env.supabase) return "demo"; // demo mode never takes real payments
  if (q.isFree) return "free";
  return env.stripe ? "stripe" : "direct";
}

export type OffGridPlan =
  | {
      ok: true;
      marketplace: MarketplaceId;
      arrival: string;
      departDate: string;
      nights: number;
      guests: number;
      quote: OffGridQuote;
    }
  | { ok: false; error: string };

/** Validate the request and price it. Pure. */
export function planOffGridBooking(args: {
  experience: Experience & { offGrid: OffGridDetails };
  departure: Departure;
  arrival: string;
  nights: number;
  guests: number;
  commissionBps: number;
  today?: string;
}): OffGridPlan {
  const { experience: e, departure: d } = args;
  if (d.status !== "open" && d.status !== "waitlist") return { ok: false, error: "These dates are no longer available." };
  const guests = Math.min(MAX_TRAVELLERS_PER_BOOKING, Math.max(1, Math.floor(args.guests || 1)));
  if (guests > d.spacesRemaining) return { ok: false, error: "There aren't enough places left for that many travellers." };
  const check = checkStayRequest({ window: d, stay: e.offGrid.stay, arrival: args.arrival, nights: args.nights, today: args.today });
  if (!check.ok) return check;
  const nights = Math.floor(args.nights);
  return {
    ok: true,
    marketplace: marketplaceOf(e),
    arrival: args.arrival,
    departDate: check.departDate,
    nights,
    guests,
    quote: quoteOffGridStay(e.offGrid.pricing, nights, guests, args.commissionBps, e.currency),
  };
}

/** The booking-row columns an off-grid booking snapshots. */
export function offGridBookingFields(plan: Extract<OffGridPlan, { ok: true }>) {
  return {
    marketplace: plan.marketplace,
    stay_start_date: plan.arrival,
    stay_nights: plan.nights,
  };
}

/**
 * Create the booking and return where to send the traveller next (a Stripe
 * Checkout URL, their stay page, or back to the form with an error). Never
 * redirects itself, so it's testable; the server action redirects.
 */
export async function createOffGridBooking(args: {
  user: SessionUser;
  experience: Experience & { offGrid: OffGridDetails };
  departure: Departure;
  arrival: string;
  nights: number;
  guests: number;
  /** Origin for Stripe return URLs (the brand the traveller is on). */
  origin: string;
}): Promise<string> {
  const { user, experience, departure } = args;
  const back = (msg: string) => `/book/${departure.id}?error=${encodeURIComponent(msg)}`;
  // Sample listings are illustrations: never reserve or charge for them.
  if (experience.sample) return `/experiences/${experience.slug}`;

  const { getCommissionBpsFor } = await import("@/lib/booking/commission");
  const plan = planOffGridBooking({ ...args, commissionBps: await getCommissionBpsFor(experience) });
  if (!plan.ok) return back(plan.error);
  const q = plan.quote;

  const { isSupabaseConfigured } = await import("@/lib/supabase/config");
  const { isStripeEnabled } = await import("@/lib/payments/stripe");
  const route = offGridPaymentRoute(q, { stripe: isStripeEnabled(), supabase: isSupabaseConfigured() });

  const reference = "STOG-" + crypto.randomUUID().slice(0, 8).toUpperCase();
  const room = experience.stay.roomTypes[0];
  if (!room) return back("This stay isn't bookable yet.");
  const extra = offGridBookingFields(plan);
  const lineDescription = `${plan.nights} nights from ${plan.arrival} · ${plan.guests} traveller(s)`;
  const soldOut = `/experiences/${experience.slug}?soldout=1`;

  // --- Paid, live: Stripe Checkout (webhook confirms) -------------------------
  if (route === "stripe") {
    const { startStripeCheckout } = await import("@/lib/payments/stripeCheckout");
    const res = await startStripeCheckout({
      guestId: user.id, guestEmail: user.email, experience, departure, room, guests: plan.guests, kind: "full",
      currency: q.currency, subtotalMinor: q.subtotalMinor, depositMinor: q.subtotalMinor, balanceMinor: 0,
      dueNowMinor: q.subtotalMinor, feeDueNowMinor: q.platformFeeMinor, commissionRateBps: q.commissionRateBps,
      platformFeeMinor: q.platformFeeMinor, hostNetMinor: q.hostNetMinor, reference,
      origin: args.origin, extraBookingFields: extra, lineDescription,
    });
    if (res.error) return back("Something went wrong starting payment. No charge was made — please try again.");
    return res.soldOut || !res.url ? soldOut : res.url;
  }

  // --- Free stay, or live without Stripe: reserve + insert directly ----------
  if (route === "free" || route === "direct") {
    const { createClient, createServiceRoleClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data: reserved, error: reserveError } = await supabase.rpc("reserve_departure", { p_departure: departure.id, p_qty: plan.guests });
    if (reserveError || !reserved) return soldOut;
    try {
      if (route === "direct") {
        const { getPaymentProvider } = await import("@/lib/payments");
        const { money } = await import("@/lib/money");
        await getPaymentProvider().createPaymentIntent({
          bookingId: reference, kind: "full", amount: money(q.subtotalMinor, q.currency),
          applicationFeeMinor: q.platformFeeMinor, idempotencyKey: `${reference}:full`,
        });
      }
      const { data: inserted, error } = await supabase
        .from("bookings")
        .insert({
          reference, guest_id: user.id, departure_id: departure.id, room_type_id: room.id, guest_count: plan.guests,
          currency: q.currency, subtotal_minor: q.subtotalMinor, deposit_minor: q.subtotalMinor, balance_minor: 0,
          balance_due_date: plan.arrival, commission_rate_bps: q.commissionRateBps, platform_fee_minor: q.platformFeeMinor,
          host_net_minor: q.hostNetMinor, discount_minor: 0,
          // A free stay holds the place with nothing to pay; a paid one is settled.
          status: route === "free" ? "reserved" : "confirmed",
          ...extra,
        })
        .select("id")
        .single();
      if (error || !inserted) throw error ?? new Error("booking insert failed");
      const id = inserted.id as string;
      if (route === "direct") {
        await createServiceRoleClient().from("payments").upsert(
          {
            booking_id: id, kind: "full", amount_minor: q.subtotalMinor, currency: q.currency,
            application_fee_minor: q.platformFeeMinor, provider: "mock", status: "succeeded", idempotency_key: `${reference}:full`,
          },
          { onConflict: "idempotency_key", ignoreDuplicates: true },
        );
      }
      await confirmationEmail(args, plan, reference, id);
      return `/account/trips/${id}?new=1`;
    } catch (e) {
      console.error("[createOffGridBooking]", e);
      try {
        const { createServiceRoleClient: admin } = await import("@/lib/supabase/server");
        await admin().rpc("release_departure", { p_departure: departure.id, p_qty: plan.guests });
      } catch { /* ignore */ }
      return back("Something went wrong taking your booking. Nothing was charged — please try again.");
    }
  }

  // --- Demo mode -------------------------------------------------------------
  const { updateDemoState } = await import("@/lib/demo/state");
  const id = "bk-" + crypto.randomUUID().slice(0, 8);
  const booking: Booking = {
    id, reference, guestId: user.id, guestName: user.name, experienceSlug: experience.slug,
    departureId: departure.id, roomTypeId: room.id, guestCount: plan.guests, currency: q.currency,
    subtotalMinor: q.subtotalMinor, depositMinor: q.subtotalMinor, balanceMinor: 0, paidMinor: q.subtotalMinor,
    balanceDueDate: plan.arrival, commissionRateBps: q.commissionRateBps, platformFeeMinor: q.platformFeeMinor,
    hostNetMinor: q.hostNetMinor, status: q.isFree ? "reserved" : "confirmed", createdAt: new Date().toISOString().slice(0, 10),
    marketplace: plan.marketplace, stayStartDate: plan.arrival, stayNights: plan.nights,
  };
  updateDemoState((s) => { s.bookings.push(booking); });
  return `/account/trips/${id}?new=1`;
}

async function confirmationEmail(
  args: { user: SessionUser; experience: Experience; origin: string },
  plan: Extract<OffGridPlan, { ok: true }>,
  reference: string,
  bookingId: string,
) {
  try {
    const { sendEmail } = await import("@/lib/email");
    const { bookingConfirmationEmail } = await import("@/lib/email/templates");
    const { getBrandById } = await import("@/lib/brand/config");
    await sendEmail({
      to: args.user.email,
      ...bookingConfirmationEmail({
        guestName: args.user.name, experienceName: args.experience.name, location: args.experience.location,
        startDate: plan.arrival, endDate: plan.departDate, reference, paidMinor: plan.quote.subtotalMinor,
        balanceMinor: 0, currency: plan.quote.currency, bookingId,
        brand: { name: getBrandById(plan.marketplace).name, origin: args.origin, offGrid: true },
      }),
    });
  } catch { /* non-fatal */ }
}
