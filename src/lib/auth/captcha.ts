/**
 * Bot protection for sign-up, sign-in and password reset: Cloudflare Turnstile,
 * checked by Supabase Auth (Authentication → Attack Protection → CAPTCHA).
 *
 * The widget only appears when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, and the
 * token is only sent when there is one — so the forms keep working before the
 * key exists. Roll out in that order: site key + deploy, THEN switch CAPTCHA on
 * in Supabase (with the secret key). The other way round blocks every sign-in.
 */

/** The form field the Turnstile widget writes its token into. */
export const CAPTCHA_FIELD = "captchaToken";

export function turnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
}

/** `{ captchaToken }` for a Supabase auth call, or nothing if there's no token. */
export function captchaOptions(formData: FormData): { captchaToken?: string } {
  const token = formData.get(CAPTCHA_FIELD);
  return typeof token === "string" && token.length > 0 ? { captchaToken: token } : {};
}

/** Supabase's captcha errors are technical; say what the person should do. */
export function friendlyAuthError(message: string): string {
  return /captcha/i.test(message)
    ? "Please complete the security check, then try again."
    : message;
}
