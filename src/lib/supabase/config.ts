/**
 * Whether a real Supabase project is configured. When false, the app runs in
 * DEMO MODE: a cookie-backed session and seeded data stand in for auth and the
 * database, so every dashboard is fully clickable and the build stays green
 * without live credentials. Set the NEXT_PUBLIC_SUPABASE_* env vars to switch
 * to the real, RLS-enforced Supabase path.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
