import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { hero } from "@/lib/images";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { signInDemo, signInWithPassword } from "./actions";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const existing = await getSessionUser();
  const next = searchParams.next ?? "";
  if (existing) redirect(next && next.startsWith("/") ? next : "/account");

  const configured = isSupabaseConfigured();

  return (
    <div className="grid min-h-[calc(100vh-var(--paradise-nav-h))] lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <Image src={hero("login-cover")} alt="" fill sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-ocean-700/45" />
        <div className="absolute bottom-12 left-12 right-12 text-sand-50">
          <p className="font-display text-3xl font-semibold">Come for more than a holiday.</p>
          <p className="mt-2 max-w-sm text-sand-100/85">
            Sign in to see your trips, your Before You Go guide and everything waiting for you on the ground.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="eyebrow text-ocean-700">Paradise Beyond</p>
          <h1 className="mt-3 text-headline font-semibold text-ink">Welcome back</h1>

          {searchParams.error && (
            <p className="mt-4 rounded-lg bg-clay-500/10 px-4 py-3 text-sm text-clay-600">
              {searchParams.error}
            </p>
          )}

          {configured ? (
            <form action={signInWithPassword} className="mt-8 space-y-4">
              <input type="hidden" name="next" value={next} />
              <Labeled label="Email">
                <input name="email" type="email" required className={inputCls} placeholder="you@email.com" />
              </Labeled>
              <Labeled label="Password">
                <input name="password" type="password" required className={inputCls} placeholder="••••••••" />
              </Labeled>
              <button className="w-full rounded-full bg-ink px-6 py-3.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-ink-soft">
                Sign in
              </button>
            </form>
          ) : (
            <div className="mt-8">
              <p className="rounded-xl bg-sand-100 px-4 py-3 text-sm text-ink-muted">
                <span className="font-medium text-ink">Demo mode.</span> No Supabase
                is configured, so choose a role to explore each side of the platform.
              </p>
              <div className="mt-5 space-y-3">
                <DemoButton role="guest" next={next} title="Continue as a Guest" sub="My Trips, Before You Go, flights" />
                <DemoButton role="host" next={next} title="Continue as a Host" sub="Your retreats, guests, applications" />
                <DemoButton role="admin" next={next} title="Continue as Admin" sub="Approvals, bookings, commissions" />
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-ink-muted">
            New host?{" "}
            <Link href="/host/apply" className="text-ink underline underline-offset-4">
              Apply to host
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function DemoButton({ role, next, title, sub }: { role: string; next: string; title: string; sub: string }) {
  return (
    <form action={signInDemo}>
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="next" value={next} />
      <button className="group flex w-full items-center justify-between rounded-xl border border-ink/15 px-5 py-4 text-left transition-colors hover:border-ink/40 hover:bg-sand-100">
        <span>
          <span className="block font-medium text-ink">{title}</span>
          <span className="block text-xs text-ink-muted">{sub}</span>
        </span>
        <span className="text-ink-muted transition-transform group-hover:translate-x-1">→</span>
      </button>
    </form>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-ink/15 bg-sand-50 px-4 py-3 text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500";
