import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeEnabled } from "@/lib/payments/stripe";

/**
 * Stripe webhook — the SOURCE OF TRUTH for booking state. The client success
 * redirect is never trusted; bookings are confirmed here. Uses the service-role
 * client (no user session in a server-to-server call) and is idempotent.
 *
 * Configure the endpoint in Stripe (…/api/stripe/webhook) and set
 * STRIPE_WEBHOOK_SECRET. Needs the raw request body for signature verification.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isStripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "stripe not configured" }, { status: 400 });
  }

  const sig = req.headers.get("stripe-signature");
  const body = await req.text(); // raw body for signature check
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return NextResponse.json({ error: `signature: ${e instanceof Error ? e.message : "invalid"}` }, { status: 400 });
  }

  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const supabase = createServiceRoleClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        const kind = (session.metadata?.kind as string) ?? "deposit";
        if (bookingId && session.payment_status === "paid") {
          const update: Record<string, unknown> = {
            status: kind === "deposit" ? "reserved" : "confirmed",
            stripe_payment_intent: String(session.payment_intent ?? ""),
          };
          if (kind === "balance" || kind === "full") update.balance_minor = 0;
          await supabase.from("bookings").update(update).eq("id", bookingId);

          // Record the payment (idempotent on the session+kind key). The
          // returned rows tell us whether THIS event inserted the payment — used
          // below to send the guest email exactly once, even if Stripe retries.
          const { data: recorded } = await supabase
            .from("payments")
            .upsert(
              {
                booking_id: bookingId,
                kind,
                amount_minor: session.amount_total ?? 0,
                currency: (session.currency ?? "usd").toUpperCase(),
                provider: "stripe",
                provider_ref: String(session.payment_intent ?? ""),
                status: "succeeded",
                idempotency_key: `${session.id}:${kind}`,
              },
              { onConflict: "idempotency_key", ignoreDuplicates: true },
            )
            .select("id");

          // Email the guest on first record only (confirmation for a booking,
          // receipt for a balance). Best-effort — never fail the webhook on it.
          if (recorded && recorded.length > 0) {
            await sendGuestEmail(supabase, session, bookingId, kind);
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        if (bookingId) {
          // Release the hold if the booking never got paid.
          const { data: b } = await supabase
            .from("bookings")
            .select("departure_id, guest_count, status")
            .eq("id", bookingId)
            .maybeSingle();
          if (b && b.status === "pending") {
            await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
            await supabase.rpc("release_departure", { p_departure: b.departure_id, p_qty: b.guest_count });
          }
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const pi = String(charge.payment_intent ?? "");
        if (pi) {
          const { data: b } = await supabase
            .from("bookings")
            .select("id, departure_id, guest_count")
            .eq("stripe_payment_intent", pi)
            .maybeSingle();
          if (b) {
            await supabase.from("bookings").update({ status: "refunded" }).eq("id", b.id);
            await supabase.rpc("release_departure", { p_departure: b.departure_id, p_qty: b.guest_count });
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    // Log and 500 so Stripe retries.
    console.error("[stripe webhook]", event.type, e);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Send the guest their email after a paid Checkout — the confirmation for a
 * deposit/full booking, or the balance receipt. Runs from the webhook because
 * the Stripe booking flow redirects to hosted Checkout and never touches the
 * inline email path the mock provider uses. Best-effort: any failure is logged,
 * not thrown, so the webhook still acknowledges the event.
 */
async function sendGuestEmail(
  supabase: ReturnType<typeof import("@/lib/supabase/server").createServiceRoleClient>,
  session: Stripe.Checkout.Session,
  bookingId: string,
  kind: string,
) {
  try {
    const guestEmail = session.customer_details?.email ?? session.customer_email ?? "";
    if (!guestEmail) return;

    const { data: booking } = await supabase
      .from("bookings")
      .select("reference, currency, balance_minor, departure_id, guest_id")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) return;

    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", booking.guest_id).maybeSingle();
    const guestName = session.customer_details?.name ?? profile?.full_name ?? guestEmail.split("@")[0];

    const { getAllExperiences } = await import("@/lib/data/repository");
    const all = await getAllExperiences();
    let experience: (typeof all)[number] | undefined;
    let departure: { startDate: string; endDate: string } | undefined;
    for (const e of all) {
      const d = e.departures.find((x) => x.id === booking.departure_id);
      if (d) { experience = e; departure = d; break; }
    }
    if (!experience || !departure) return;

    const { sendEmail } = await import("@/lib/email");
    if (kind === "balance") {
      const { balancePaidEmail } = await import("@/lib/email/templates");
      await sendEmail({ to: guestEmail, ...balancePaidEmail(guestName, experience.name) });
    } else {
      const { bookingConfirmationEmail } = await import("@/lib/email/templates");
      await sendEmail({
        to: guestEmail,
        ...bookingConfirmationEmail({
          guestName,
          experienceName: experience.name,
          location: experience.location,
          startDate: departure.startDate,
          endDate: departure.endDate,
          reference: booking.reference,
          paidMinor: session.amount_total ?? 0,
          balanceMinor: kind === "deposit" ? (booking.balance_minor ?? 0) : 0,
          currency: booking.currency,
          bookingId,
        }),
      });
    }
  } catch (e) {
    console.error("[stripe webhook] guest email", e);
  }
}
