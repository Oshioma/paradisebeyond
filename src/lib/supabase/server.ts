import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Supabase client, scoped to the signed-in user via cookies. Respects
 * RLS. Use this in Server Components, Route Handlers and Server Actions for
 * user-context reads/writes.
 */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware refreshes.
          }
        },
      },
    },
  );
}

/**
 * Cookie-less anon client for PUBLIC reads (catalogue). Uses the anon key and
 * relies on RLS (published experiences are world-readable). Safe to call during
 * static generation, where request cookies aren't available.
 */
export function createAnonClient() {
  const { createClient: createSbClient } = require("@supabase/supabase-js");
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Service-role client — BYPASSES RLS. Use ONLY in trusted server code for
 * privileged operations (writing payment/commission rows, admin actions).
 * Never import this into a client component. The key is server-only.
 */
export function createServiceRoleClient() {
  const { createClient: createSbClient } = require("@supabase/supabase-js");
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
