import { formatMoney } from "@/lib/money";
import { formatDateRange } from "@/lib/utils";
import { siteUrl } from "@/lib/siteUrl";
import type { HydratedBooking } from "@/lib/booking/types";

/** A simple, warm booking-confirmation email. Inline styles for client support. */
export function bookingConfirmationEmail(b: {
  guestName: string;
  experienceName: string;
  location: string;
  startDate: string;
  endDate: string;
  reference: string;
  paidMinor: number;
  balanceMinor: number;
  currency: string;
  bookingId: string;
}) {
  const url = `${siteUrl()}/account/trips/${b.bookingId}`;
  const subject = `You're going to ${b.experienceName} ✨`;
  const html = `
  <div style="font-family:Georgia,serif;background:#faf7f2;padding:32px;color:#1c1a16">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee">
      <div style="background:#1b4242;color:#faf7f2;padding:28px 28px 24px">
        <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;opacity:.8">Paradise Beyond</div>
        <div style="font-size:26px;margin-top:8px">Your place is reserved.</div>
      </div>
      <div style="padding:28px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#3a352c">
        <p>Dear ${b.guestName},</p>
        <p>You're booked onto <strong>${b.experienceName}</strong> in ${b.location}.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr><td style="padding:6px 0;color:#6b6357">Dates</td><td style="text-align:right"><strong>${formatDateRange(b.startDate, b.endDate)}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#6b6357">Reference</td><td style="text-align:right">${b.reference}</td></tr>
          <tr><td style="padding:6px 0;color:#6b6357">Paid now</td><td style="text-align:right">${formatMoney(b.paidMinor, b.currency)}</td></tr>
          ${b.balanceMinor > 0 ? `<tr><td style="padding:6px 0;color:#6b6357">Balance later</td><td style="text-align:right">${formatMoney(b.balanceMinor, b.currency)}</td></tr>` : ""}
        </table>
        <p style="background:#f4efe6;border-radius:10px;padding:14px;color:#3a352c">Your international flights aren't included — get yourself to the destination and we'll take care of the rest. Add your flight details in your trip page so we can arrange your transfer.</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${url}" style="background:#c9744a;color:#faf7f2;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:13px;letter-spacing:.12em;text-transform:uppercase">View your trip</a>
        </p>
        <p style="color:#6b6357;font-size:13px">See you there,<br/>The Paradise Beyond team</p>
      </div>
    </div>
  </div>`;
  return { subject, html };
}

function shell(heading: string, bodyHtml: string) {
  return `
  <div style="font-family:Georgia,serif;background:#faf7f2;padding:32px;color:#1c1a16">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee">
      <div style="background:#1b4242;color:#faf7f2;padding:26px">
        <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;opacity:.8">Paradise Beyond</div>
        <div style="font-size:24px;margin-top:8px">${heading}</div>
      </div>
      <div style="padding:26px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#3a352c">${bodyHtml}</div>
    </div>
  </div>`;
}

/** Host application decision email. */
export function applicationStatusEmail(name: string, status: string, notes?: string) {
  const map: Record<string, { subject: string; heading: string; body: string }> = {
    approved: {
      subject: "Your Paradise Beyond application is approved 🎉",
      heading: "You're in.",
      body: `<p>Dear ${name},</p><p>We'd love to have you host with Paradise Beyond. Your account is now set up to create experiences — click below to open the builder and start your first one. We'll do a final review before it goes live.</p><p style="margin:24px 0"><a href="${siteUrl()}/studio/retreats/new" style="background:#c9744a;color:#faf7f2;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:13px;letter-spacing:.12em;text-transform:uppercase">Create your experience</a></p><p style="color:#6b6357;font-size:13px">If the button doesn't open, sign in at ${siteUrl()}/login and head to Studio.</p>`,
    },
    changes_requested: {
      subject: "A note on your Paradise Beyond application",
      heading: "Nearly there.",
      body: `<p>Dear ${name},</p><p>Thanks for applying. Before we can approve, we'd love a few tweaks:</p><p style="background:#f4efe6;border-radius:10px;padding:12px">${notes || "We'll follow up with details."}</p>`,
    },
    rejected: {
      subject: "Your Paradise Beyond application",
      heading: "Thank you for applying.",
      body: `<p>Dear ${name},</p><p>Thank you for your interest in hosting with Paradise Beyond. On this occasion we're not able to move forward, but we'd welcome a future application as our collection grows.</p>`,
    },
  };
  const m = map[status] ?? { subject: "Update on your application", heading: "Application update", body: `<p>Dear ${name},</p><p>Your application status is now: ${status}.</p>` };
  return { subject: m.subject, html: shell(m.heading, m.body) };
}

/** Balance-paid receipt. */
export function balancePaidEmail(name: string, experienceName: string) {
  return {
    subject: `Balance settled — you're all set for ${experienceName}`,
    html: shell("You're all set.", `<p>Dear ${name},</p><p>We've received your balance for <strong>${experienceName}</strong> — nothing more to pay. We can't wait to welcome you.</p><p><a href="${siteUrl()}/account" style="background:#c9744a;color:#faf7f2;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:13px;letter-spacing:.1em;text-transform:uppercase">View your trip</a></p>`),
  };
}

/** On-demand deliverability check, sent from the admin System page. */
export function testEmail(name: string) {
  return {
    subject: "Paradise Beyond — test email ✅",
    html: shell(
      "Deliverability check",
      `<p>Hi ${name},</p><p>This is a <strong>test email</strong> from your Paradise Beyond admin desk. If it reached your inbox, Resend is configured correctly and your transactional emails — booking confirmations, balance receipts, host application updates — will deliver.</p><p style="background:#f4efe6;border-radius:10px;padding:14px;color:#3a352c">Sent on demand from <strong>System &amp; environment → Email deliverability</strong>.</p><p style="color:#6b6357;font-size:13px">— Paradise Beyond</p>`,
    ),
  };
}

export function bookingConfirmationFromHydrated(b: HydratedBooking, guestEmail: string) {
  return {
    to: guestEmail,
    ...bookingConfirmationEmail({
      guestName: b.guestName,
      experienceName: b.experience.name,
      location: b.experience.location,
      startDate: b.departure.startDate,
      endDate: b.departure.endDate,
      reference: b.reference,
      paidMinor: b.paidMinor,
      balanceMinor: b.balanceMinor,
      currency: b.currency,
      bookingId: b.id,
    }),
  };
}
