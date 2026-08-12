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
          await supabase
            .from("bookings")
            .update({
              status: kind === "full" ? "confirmed" : "reserved",
              stripe_payment_intent: String(session.payment_intent ?? ""),
            })
            .eq("id", bookingId);

          // Record the payment (idempotent on the session+kind key).
          await supabase.from("payments").upsert(
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
          );
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
