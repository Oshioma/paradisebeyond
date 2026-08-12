import type { Metadata } from "next";
import Link from "next/link";
import { updatePassword } from "@/app/login/actions";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="container-editorial flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <p className="eyebrow text-ocean-700">Paradise Beyond</p>
        <h1 className="mt-3 text-headline font-semibold text-ink">Choose a new password</h1>
        <p className="mt-2 text-sm text-ink-muted">
          You reached this from your reset link. Set a new password below.
        </p>

        {searchParams.error && (
          <p className="mt-4 rounded-lg bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{searchParams.error}</p>
        )}

        <form action={updatePassword} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">New password</span>
            <input name="password" type="password" required minLength={8} className={inp} placeholder="At least 8 characters" />
          </label>
          <button className="w-full rounded-full bg-ink px-6 py-3.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-ink-soft">
            Update password
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          <Link href="/login" className="text-ink underline underline-offset-4">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

const inp = "w-full rounded-xl border border-ink/15 bg-sand-50 px-4 py-3 text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500";
