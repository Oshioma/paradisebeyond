import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { isStripeEnabled } from "@/lib/payments/stripe";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { startOnboarding, refreshPayoutStatus } from "./actions";
import { syncOnboardedByAccountId } from "@/lib/payments/connect";

export const metadata: Metadata = { title: "Payouts", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PayoutsPage({ searchParams }: { searchParams: { error?: string; done?: string } }) {
  const user = await requireRole("host", "/studio/payouts");

  let host: { stripe_account_id?: string | null; stripe_onboarded?: boolean } | null = null;
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const { data } = await createClient()
      .from("hosts")
      .select("stripe_account_id, stripe_onboarded")
      .eq("owner_id", user.id)
      .maybeSingle();
    host = data;
  }

  const started = Boolean(host?.stripe_account_id);
  let ready = Boolean(host?.stripe_onboarded);

  // Just returned from Stripe onboarding — re-check status now so the page shows
  // "Connected" immediately, instead of waiting for a manual "Refresh status".
  if (searchParams.done && started && !ready && host?.stripe_account_id && isStripeEnabled()) {
    const synced = await syncOnboardedByAccountId(host.stripe_account_id);
    if (synced != null) ready = synced;
  }

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Host Studio</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Payouts</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Get paid directly. Connect your Stripe account and guest payments flow
          to you automatically — minus Paradise Beyond&apos;s commission, which is
          taken at the point of sale. We never hold your funds.
        </p>
      </header>

      {searchParams.error && (
        <p className="mt-6 rounded-lg bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{searchParams.error}</p>
      )}

      {!isStripeEnabled() ? (
        <div className="mt-8 rounded-xl2 border border-clay-500/40 bg-clay-500/5 p-6">
          <p className="font-medium text-ink">Payments aren&apos;t configured yet.</p>
          <p className="mt-1 text-sm text-ink-muted">
            An admin needs to set <code>PAYMENTS_PROVIDER=stripe</code> and the Stripe keys.
            Until then, bookings run on the demo provider.
          </p>
        </div>
      ) : (
        <div className="mt-8 max-w-lg rounded-xl2 border border-ink/10 bg-sand-50 p-6">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${ready ? "bg-palm-500" : started ? "bg-clay-500" : "bg-ink/20"}`} />
            <p className="font-medium text-ink">
              {ready ? "Connected — ready to receive payouts" : started ? "Onboarding started — finish the steps" : "Not connected yet"}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <form action={startOnboarding}>
              <button className="rounded-full bg-clay-500 px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600">
                {started ? "Continue onboarding" : "Connect with Stripe"}
              </button>
            </form>
            {started && (
              <form action={refreshPayoutStatus}>
                <button className="rounded-full border border-ink/15 px-6 py-3 text-xs uppercase tracking-eyebrow text-ink-soft hover:border-ink/40">
                  Refresh status
                </button>
              </form>
            )}
          </div>

          <p className="mt-5 text-xs text-ink-muted">
            Stripe handles identity verification and pays out to your bank on its
            schedule. You can update your details any time from Stripe.
          </p>
        </div>
      )}
    </div>
  );
}
