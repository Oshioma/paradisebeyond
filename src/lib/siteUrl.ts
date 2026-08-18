/**
 * The canonical site origin, used to build absolute redirect URLs for Supabase
 * auth emails (password reset, confirmation, magic links). Set
 * NEXT_PUBLIC_SITE_URL to your deployed URL so links don't point at localhost.
 * Falls back to Vercel's URL, then localhost for dev.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * The default "own website" URL for an experience: a per-experience subdomain
 * (`<slug>.paradisebeyond.com`) on a real registrable domain, resolved by
 * middleware to the microsite. Falls back to `<site>/r/<slug>` on hosts where a
 * wildcard subdomain isn't available (localhost, Vercel preview URLs) — which
 * also serves the same page, so links always work.
 */
export function micrositeUrl(slug: string): string {
  const base = siteUrl();
  try {
    const u = new URL(base);
    const host = u.host.replace(/^www\./, "");
    const registrable = host.split(".").length >= 2 && !host.endsWith("vercel.app") && !host.startsWith("localhost");
    if (registrable) return `${u.protocol}//${slug}.${host}`;
  } catch {
    /* fall through to path form */
  }
  return `${base}/r/${slug}`;
}
