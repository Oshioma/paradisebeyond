"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/auth/types";
import { DEMO_COOKIE } from "@/lib/demo/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function safeNext(next: FormDataEntryValue | null, fallback: string): string {
  const n = typeof next === "string" ? next : "";
  // Only allow internal paths.
  return n.startsWith("/") && !n.startsWith("//") ? n : fallback;
}

const DASHBOARD: Record<Role, string> = {
  guest: "/account",
  host: "/studio",
  admin: "/desk",
};

/** Demo sign-in — sets the role cookie. Only meaningful without Supabase. */
export async function signInDemo(formData: FormData) {
  const role = formData.get("role") as Role;
  if (!["guest", "host", "admin"].includes(role)) return;
  cookies().set(DEMO_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect(safeNext(formData.get("next"), DASHBOARD[role]));
}

/** Real Supabase sign-in with email + password. */
export async function signInWithPassword(formData: FormData) {
  if (!isSupabaseConfigured()) return;
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect(safeNext(formData.get("next"), "/account"));
}

/** Create an account (email + password). Emails a confirmation link. */
export async function signUp(formData: FormData) {
  if (!isSupabaseConfigured()) return;
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "");
  const { siteUrl } = await import("@/lib/siteUrl");
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/account`,
    },
  });
  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  redirect(`/login?message=${encodeURIComponent("Check your email to confirm your account, then sign in.")}`);
}

/** Send a password-reset email whose link returns to THIS site (not localhost). */
export async function sendPasswordReset(formData: FormData) {
  if (!isSupabaseConfigured()) return;
  const email = String(formData.get("email") ?? "");
  const { siteUrl } = await import("@/lib/siteUrl");
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  // Always confirm (don't reveal whether the email exists).
  redirect(`/forgot-password?sent=1`);
}

/** Set a new password. Requires an active recovery session (via /auth/callback). */
export async function updatePassword(formData: FormData) {
  if (!isSupabaseConfigured()) return;
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) redirect(`/reset-password?error=${encodeURIComponent("Use at least 8 characters.")}`);
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  redirect(`/login?message=${encodeURIComponent("Password updated — sign in with your new password.")}`);
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    await createClient().auth.signOut();
  } else {
    cookies().delete(DEMO_COOKIE);
  }
  redirect("/");
}
