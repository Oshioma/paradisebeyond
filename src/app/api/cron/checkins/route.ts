import { NextResponse } from "next/server";
import { authorised } from "@/lib/offgrid/cronAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Called hourly by Supabase Cron (pg_cron + pg_net, migration 0034) after it
 * queues the check-ins that have come due. Sends each traveller their
 * "Have you arrived safely?" / "Everything okay?" email, and alerts the Spend
 * Time Off Grid team about arrival check-ins left unanswered for 24 hours.
 *
 * Auth: `Authorization: Bearer <CHECKINS_CRON_SECRET>` — the same secret is
 * stored in Supabase Vault as `checkins_mailer_secret`.
 */
export async function POST(req: Request) {
  if (!authorised(req.headers.get("authorization"), process.env.CHECKINS_CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const { isSupabaseConfigured } = await import("@/lib/supabase/config");
  if (!isSupabaseConfigured()) return NextResponse.json({ sent: 0, escalated: 0 });

  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { sendEmail } = await import("@/lib/email");
  const { checkinEmail, supportAlertEmail } = await import("@/lib/offgrid/emails");
  const { SPEND_TIME_OFF_GRID } = await import("@/lib/brand/config");
  const { canonicalOriginFor } = await import("@/lib/brand/server");
  const { getAllExperiences } = await import("@/lib/data/repository");
  const { findByDeparture } = await import("@/lib/booking/pricing");
  const db = createServiceRoleClient();
  const origin = canonicalOriginFor(SPEND_TIME_OFF_GRID);
  const now = new Date();
  const experiences = await getAllExperiences();

  async function context(bookingId: string) {
    const { data: b } = await db.from("bookings").select("id, reference, guest_id, departure_id").eq("id", bookingId).maybeSingle();
    if (!b) return null;
    const [{ data: user }, { data: profile }] = await Promise.all([
      db.auth.admin.getUserById(b.guest_id),
      db.from("profiles").select("full_name").eq("id", b.guest_id).maybeSingle(),
    ]);
    return {
      booking: b,
      email: user?.user?.email ?? null,
      name: profile?.full_name ?? user?.user?.email?.split("@")[0] ?? "A traveller",
      listing: findByDeparture(experiences, b.departure_id)?.experience.name ?? "their stay",
    };
  }

  // 1. Email the traveller for each newly due check-in.
  const since = new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString();
  const { data: due } = await db
    .from("stay_checkins")
    .select("booking_id, kind")
    .is("notified_at", null)
    .is("response", null)
    .lte("due_at", now.toISOString())
    .gt("due_at", since);
  let sent = 0;
  for (const c of due ?? []) {
    const ctx = await context(c.booking_id);
    if (ctx?.email) {
      const res = await sendEmail({ to: ctx.email, ...checkinEmail({ origin, bookingId: c.booking_id, kind: c.kind, listing: ctx.listing }) });
      if (!res.ok) continue; // try again next hour
      sent++;
    }
    await db.from("stay_checkins").update({ notified_at: now.toISOString() }).eq("booking_id", c.booking_id).eq("kind", c.kind);
  }

  // 2. Arrival check-ins with no answer 24h after the email: tell the team.
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const { data: silent } = await db
    .from("stay_checkins")
    .select("booking_id, kind")
    .eq("kind", "arrival")
    .is("response", null)
    .is("escalated_at", null)
    .lte("notified_at", dayAgo);
  let escalated = 0;
  for (const c of silent ?? []) {
    const ctx = await context(c.booking_id);
    if (!ctx) continue;
    const res = await sendEmail({
      to: SPEND_TIME_OFF_GRID.contactEmail,
      ...supportAlertEmail({
        origin, reason: "no-reply", kind: "arrival", reference: ctx.booking.reference, listing: ctx.listing,
        travellerName: ctx.name, travellerEmail: ctx.email ?? undefined,
      }),
    });
    if (!res.ok) continue;
    escalated++;
    await db.from("stay_checkins").update({ escalated_at: now.toISOString() }).eq("booking_id", c.booking_id).eq("kind", c.kind);
  }

  return NextResponse.json({ sent, escalated });
}
