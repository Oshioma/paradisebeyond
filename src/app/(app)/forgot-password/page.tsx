import type { Metadata } from "next";
import Link from "next/link";
import { sendPasswordReset } from "@/app/(app)/login/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getBrand } from "@/lib/brand/server";
import { turnstileSiteKey } from "@/lib/auth/captcha";
import { AuthForm } from "@/components/auth/AuthForm";
import { Turnstile } from "@/components/auth/Turnstile";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage({ searchParams }: { searchParams: { sent?: string; error?: string } }) {
  return (
    <div className="container-editorial flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <p className="eyebrow text-ocean-700">{getBrand().name}</p>
        <h1 className="mt-3 text-headline font-semibold text-ink">Reset your password</h1>

        {!isSupabaseConfigured() && (
          <p className="mt-4 rounded-xl bg-sand-100 px-4 py-3 text-sm text-ink-muted">
            Demo mode has no email — sign in via the role buttons on the{" "}
            <Link href="/login" className="text-ink underline underline-offset-4">login page</Link>.
          </p>
        )}

        {searchParams.error && (
          <p className="mt-4 rounded-lg bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{searchParams.error}</p>
        )}

        {searchParams.sent ? (
          <p className="mt-6 rounded-xl bg-palm-500/10 px-4 py-3 text-sm text-palm-600">
            If an account exists for that email, we&apos;ve sent a reset link. Open it to choose a new password.
          </p>
        ) : (
          <AuthForm action={sendPasswordReset} draftKey="forgot-password" keep={["email"]} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
              <input name="email" type="email" required className={inp} placeholder="you@email.com" />
            </label>
            <Turnstile siteKey={turnstileSiteKey()} />
            <button className="w-full rounded-full bg-ink px-6 py-3.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-ink-soft">
              Send reset link
            </button>
          </AuthForm>
        )}

        <p className="mt-6 text-center text-sm text-ink-muted">
          <Link href="/login" className="text-ink underline underline-offset-4">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

const inp = "w-full rounded-xl border border-ink/15 bg-sand-50 px-4 py-3 text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500";
