import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Auth callback — exchanges the code from a Supabase email link (confirmation,
 * password recovery, magic link) for a session, then continues to `next`.
 * Because the email's redirect is built from NEXT_PUBLIC_SITE_URL, links land
 * here on the deployed site rather than localhost.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  if (code && isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Sign-up confirmations default to /account; send hosts (including
      // invited co-hosts, who become hosts on sign-up) to the Studio and admins
      // to the Desk instead. Explicit destinations (e.g. password reset) are kept.
      let dest = safeNext;
      if (safeNext === "/account") {
        const { dashboardForUser } = await import("@/lib/auth/dashboard");
        const { data } = await supabase.auth.getUser();
        dest = await dashboardForUser(supabase, data.user?.id);
      }
      return NextResponse.redirect(`${origin}${dest}`);
    }
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }
  return NextResponse.redirect(`${origin}/login`);
}
