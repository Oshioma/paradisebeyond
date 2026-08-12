import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signUp } from "@/app/login/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  // In demo mode there's no real signup — send people to the role picker.
  if (!isSupabaseConfigured()) redirect("/login");

  return (
    <div className="container-editorial flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <p className="eyebrow text-ocean-700">Paradise Beyond</p>
        <h1 className="mt-3 text-headline font-semibold text-ink">Create your account</h1>

        {searchParams.error && (
          <p className="mt-4 rounded-lg bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{searchParams.error}</p>
        )}

        <form action={signUp} className="mt-6 space-y-4">
          <Labeled label="Name"><input name="name" className={inp} placeholder="Ava Traveller" /></Labeled>
          <Labeled label="Email"><input name="email" type="email" required className={inp} placeholder="you@email.com" /></Labeled>
          <Labeled label="Password"><input name="password" type="password" required minLength={8} className={inp} placeholder="At least 8 characters" /></Labeled>
          <button className="w-full rounded-full bg-ink px-6 py-3.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-ink-soft">
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-ink underline underline-offset-4">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>{children}</label>;
}
const inp = "w-full rounded-xl border border-ink/15 bg-sand-50 px-4 py-3 text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500";
