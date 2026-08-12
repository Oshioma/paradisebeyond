import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — uses the PUBLIC anon key only. Row Level Security
 * is the security boundary for anything this client touches. The service-role
 * key must NEVER be exposed here; it lives only in server code.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
