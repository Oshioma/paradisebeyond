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
