"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateDemoState } from "@/lib/demo/state";

/**
 * Refund a booking (admin). In Stripe mode this reverses the charge, the
 * application fee and the transfer to the host; the `charge.refunded` webhook
 * then finalises status. In mock/demo mode it just marks the booking refunded.
 * Either way the departure's spot is released.
 */
export async function refundBooking(formData: FormData) {
  const admin = await requireRole("admin");
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) return;

  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data: b } = await supabase
      .from("bookings")
      .select("stripe_payment_intent, departure_id, guest_count, status")
      .eq("id", bookingId)
      .maybeSingle();
    if (!b) return;

    const { isStripeEnabled } = await import("@/lib/payments/stripe");
    if (isStripeEnabled() && b.stripe_payment_intent) {
      try {
        const { getStripe } = await import("@/lib/payments/stripe");
        await getStripe().refunds.create({
          payment_intent: b.stripe_payment_intent,
          reverse_transfer: true,
          refund_application_fee: true,
        });
      } catch (e) {
        redirect(`/desk/bookings?error=${encodeURIComponent(e instanceof Error ? e.message : "refund failed")}`);
      }
    }

    await supabase.from("bookings").update({ status: "refunded" }).eq("id", bookingId);
    await supabase.rpc("release_departure", { p_departure: b.departure_id, p_qty: b.guest_count });
    await supabase.from("admin_actions").insert({
      actor_id: admin.id, action: "booking:refunded", subject_type: "booking", subject_id: bookingId,
    });
    revalidatePath("/desk/bookings");
    return;
  }

  updateDemoState((s) => {
    if (!s.refunded.includes(bookingId)) s.refunded.push(bookingId);
  });
  revalidatePath("/desk/bookings");
}
