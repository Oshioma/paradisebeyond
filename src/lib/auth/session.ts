import { redirect } from "next/navigation";
import type { Role, SessionUser } from "./types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getDemoUser } from "@/lib/demo/session";

/**
 * Resolve the current user for Server Components / Server Actions.
 *
 * Real path: reads the Supabase auth user and joins their `profiles.role`.
 * Demo path (no Supabase configured): reads the demo role cookie.
 * Returns null when signed out.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) {
    return getDemoUser();
  }

  // Real Supabase path.
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  let hostSlug: string | undefined;
  if (profile?.role === "host") {
    const { data: host } = await supabase
      .from("hosts")
      .select("slug")
      .eq("owner_id", user.id)
      .maybeSingle();
    hostSlug = host?.slug ?? undefined;
  }

  return {
    id: user.id,
    email: user.email ?? "",
    name: profile?.full_name ?? user.email?.split("@")[0] ?? "Traveller",
    role: (profile?.role as Role) ?? "guest",
    hostSlug,
    demo: false,
  };
}

/** Require any signed-in user, or redirect to login (preserving return path). */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`);
  }
  return user;
}

/** Require a specific role (admins satisfy every requirement). */
export async function requireRole(role: Role, returnTo?: string): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (user.role !== role && user.role !== "admin") {
    redirect("/account?denied=1");
  }
  return user;
}
