/**
 * Transactional email via ImprovMX SMTP.
 *
 * Sends the app's own emails (booking confirmations, check-ins, etc.) through
 * ImprovMX's SMTP server, logging in as an address on the SENDER's domain:
 *   - paradisebeyond.com   → SMTP_USER / SMTP_PASSWORD
 *   - spendtimeoffgrid.com → OFFGRID_SMTP_USER / OFFGRID_SMTP_PASSWORD
 * Each login is an SMTP credential created in ImprovMX (Domain → SMTP
 * credentials). When no login matches the sender's domain it's a no-op that
 * logs, so nothing breaks in demo/dev. Server-only — never import into client
 * components.
 *
 * NOTE: Supabase AUTH emails (sign-up confirmation, password reset) are sent by
 * Supabase, not this module — configure those via Supabase → Authentication →
 * SMTP Settings (point Custom SMTP at smtp.improvmx.com).
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  /** Sender ("Name <address>"). Defaults to EMAIL_FROM — pass a brand's
   *  emailFrom for another marketplace's emails. */
  from?: string;
}

export interface SmtpLogin {
  user: string;
  pass: string;
}

const DEFAULT_FROM = "Paradise Beyond <hello@paradisebeyond.com>";

function fromAddress(from?: string | null): string {
  return from || process.env.EMAIL_FROM || DEFAULT_FROM;
}

/** "Name <a@b.com>" or "a@b.com" → "b.com" (lower-cased). */
export function domainOf(address: string): string {
  const email = address.match(/<([^>]+)>/)?.[1] ?? address;
  return email.trim().split("@")[1]?.toLowerCase() ?? "";
}

/** Every SMTP login configured in the environment. */
function logins(): SmtpLogin[] {
  const pairs: [string | undefined, string | undefined][] = [
    [process.env.SMTP_USER, process.env.SMTP_PASSWORD],
    [process.env.OFFGRID_SMTP_USER, process.env.OFFGRID_SMTP_PASSWORD],
  ];
  return pairs.filter((p): p is [string, string] => Boolean(p[0] && p[1])).map(([user, pass]) => ({ user, pass }));
}

/** The login for a sender: the one on the same domain (ImprovMX only sends
 *  from domains you own, using that domain's credentials). */
export function loginFor(from: string): SmtpLogin | null {
  const domain = domainOf(from);
  return logins().find((l) => domainOf(l.user) === domain) ?? null;
}

/** Is there a login for the default sender? (Paradise Beyond's emails.) */
export function isEmailConfigured(from?: string): boolean {
  return loginFor(fromAddress(from)) !== null;
}

export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  const from = fromAddress(msg.from);
  const login = loginFor(from);
  if (!login) {
    console.info(`[email:noop] no SMTP login for ${domainOf(from) || "sender"}; would send "${msg.subject}" to ${msg.to}`);
    return { ok: true };
  }
  try {
    const nodemailer = await import("nodemailer");
    const port = Number(process.env.SMTP_PORT || 587);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.improvmx.com",
      port,
      secure: port === 465, // 465 = TLS from the start; 587 = STARTTLS
      requireTLS: port !== 465,
      auth: { user: login.user, pass: login.pass },
    });
    await transport.sendMail({
      from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? `SMTP: ${e.message}` : "email failed" };
  }
}
