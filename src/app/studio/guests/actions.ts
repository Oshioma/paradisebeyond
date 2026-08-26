"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getHostBookings } from "@/lib/data/bookings";
import { getHost } from "@/lib/data/repository";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { guestMemoriesEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/siteUrl";
import { getExperienceIdBySlug, resolveBookingEmail, upsertInvite, isPastVisit } from "@/lib/memories/store";

export type SendResult = { ok: true; sent: number; skipped: number } | { ok: false; error: string };

/**
 * Host emails selected past guests a branded invitation with a magic link to
 * add photos and review the retreat. One durable token per booking (resending
 * reuses it), so old emails keep working.
 */
export async function messagePastGuests(formData: FormData): Promise<SendResult> {
  const user = await requireRole("host");
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Guest emails need the live database — this demo environment can't send them." };
  }

  const bookingIds = formData.getAll("bookingIds").map(String).filter(Boolean);
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 200);
  const message = String(formData.get("message") ?? "").trim().slice(0, 5000);
  if (!bookingIds.length) return { ok: false, error: "Select at least one guest." };
  if (!message) return { ok: false, error: "Write a short message to your guests." };

  // RLS scopes this to the host's own bookings (admins see all); double-check
  // ownership per booking anyway so a forged id can never email a stranger.
  const bookings = await getHostBookings(user.hostSlug ?? "");
  const selected = bookings.filter(
    (b) =>
      bookingIds.includes(b.id) &&
      isPastVisit(b) &&
      (user.role === "admin" || (user.hostSlug && b.experience.hostSlugs.includes(user.hostSlug))),
  );
  if (!selected.length) return { ok: false, error: "None of the selected guests are past visitors of your retreats." };

  let sent = 0;
  let skipped = 0;
  for (const b of selected) {
    const email = await resolveBookingEmail(b.id, b.guestId);
    const experienceId = await getExperienceIdBySlug(b.experience.slug);
    if (!email || !experienceId) {
      skipped++;
      continue;
    }
    const token = await upsertInvite({
      bookingId: b.id,
      experienceId,
      email,
      guestName: b.guestName,
    });
    const host = await getHost(b.experience.hostSlugs[0]);
    const tpl = guestMemoriesEmail({
      guestName: b.guestName,
      hostName: host?.name ?? b.experience.name,
      experienceName: b.experience.name,
      subject: subject || undefined,
      message,
      link: `${siteUrl()}/memories/${token}`,
      brandColor: host?.brandColor,
      logoUrl: host?.logoUrl,
      tagline: host?.tagline,
    });
    const res = await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
    if (res.ok) sent++;
    else skipped++;
  }

  revalidatePath("/studio/guests");
  if (sent === 0) {
    return {
      ok: false,
      error: isEmailConfigured()
        ? "No emails could be sent — we couldn't find an email address for the selected guests."
        : "Email isn't configured yet (RESEND_API_KEY). Invites were prepared but not delivered.",
    };
  }
  return { ok: true, sent, skipped };
}
