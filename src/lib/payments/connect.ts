import { getStripe } from "./stripe";

/**
 * Re-check a connected account's onboarding status from Stripe and persist
 * `stripe_onboarded` on the matching host. A host is "onboarded" only once
 * Stripe reports both details submitted AND charges enabled — the point at which
 * a destination charge to them will actually succeed.
 *
 * Returns the onboarded boolean, or null if the status couldn't be read.
 * Best-effort and never throws — safe to call from a page render or a webhook.
 * Uses the service role so it works without a user session (webhook context).
 */
export async function syncOnboardedByAccountId(accountId: string): Promise<boolean | null> {
  if (!accountId) return null;
  try {
    const account = await getStripe().accounts.retrieve(accountId);
    const onboarded = Boolean(account.details_submitted && account.charges_enabled);
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    await createServiceRoleClient()
      .from("hosts")
      .update({ stripe_onboarded: onboarded })
      .eq("stripe_account_id", accountId);
    return onboarded;
  } catch (e) {
    console.error("[syncOnboardedByAccountId]", e);
    return null;
  }
}
