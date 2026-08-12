/**
 * Transactional email via Resend.
 *
 * Sends the app's own emails (booking confirmations, etc.) through Resend when
 * RESEND_API_KEY is set; otherwise it's a no-op that logs, so nothing breaks in
 * demo/dev. Server-only — never import into client components.
 *
 * NOTE: Supabase AUTH emails (sign-up confirmation, password reset) are sent by
 * Supabase, not this module — configure those via Supabase → Authentication →
 * SMTP Settings (point Custom SMTP at Resend) so they bypass the built-in limit.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || "Paradise Beyond <hello@paradisebeyond.com>";
}

export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.info(`[email:noop] would send "${msg.subject}" to ${msg.to}`);
    return { ok: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "email failed" };
  }
}
