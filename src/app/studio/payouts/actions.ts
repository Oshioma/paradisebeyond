"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { isStripeEnabled, getStripe } from "@/lib/payments/stripe";
import { siteUrl } from "@/lib/siteUrl";

async function hostRow(userId: string) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { data } = await supabase
    .from("hosts")
    .select("id, name, stripe_account_id, stripe_onboarded")
    .eq("owner_id", userId)
    .maybeSingle();
  return { supabase, host: data };
}

/** Create (or reuse) the host's Stripe Express account and start onboarding. */
export async function startOnboarding() {
  const user = await requireRole("host");
  if (!isStripeEnabled()) redirect("/studio/payouts?error=Stripe%20is%20not%20configured");
  const { supabase, host } = await hostRow(user.id);
  if (!host) redirect("/studio/payouts?error=No%20host%20profile%20linked%20to%20your%20account");

  const stripe = getStripe();
  let accountId = host.stripe_account_id as string | null;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { host_id: host.id, host_name: host.name },
    });
    accountId = account.id;
    await supabase.from("hosts").update({ stripe_account_id: accountId }).eq("id", host.id);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${siteUrl()}/studio/payouts?refresh=1`,
    return_url: `${siteUrl()}/studio/payouts?done=1`,
    type: "account_onboarding",
  });
  redirect(link.url);
}

/** Re-check onboarding/charges status from Stripe. */
export async function refreshPayoutStatus() {
  const user = await requireRole("host");
  if (!isStripeEnabled()) redirect("/studio/payouts");
  const { supabase, host } = await hostRow(user.id);
  if (!host?.stripe_account_id) redirect("/studio/payouts");

  const account = await getStripe().accounts.retrieve(host.stripe_account_id as string);
  const onboarded = Boolean(account.details_submitted && account.charges_enabled);
  await supabase.from("hosts").update({ stripe_onboarded: onboarded }).eq("id", host.id);
  revalidatePath("/studio/payouts");
  redirect("/studio/payouts");
}
