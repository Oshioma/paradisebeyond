import type { Role } from "@/lib/auth/types";

/** Where each role lands by default after signing in or confirming their email. */
export const DASHBOARD: Record<Role, string> = {
  guest: "/account",
  host: "/studio",
  admin: "/desk",
};

/**
 * The landing page for a signed-in Supabase user, from their profile role.
 * Falls back to the guest account page if the role can't be read.
 */
export async function dashboardForUser(
  supabase: ReturnType<typeof import("@/lib/supabase/server").createClient>,
  userId: string | undefined,
): Promise<string> {
  if (!userId) return DASHBOARD.guest;
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = (data?.role as Role | undefined) ?? "guest";
  return DASHBOARD[role] ?? DASHBOARD.guest;
}
