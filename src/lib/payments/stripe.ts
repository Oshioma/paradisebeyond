import Stripe from "stripe";

/**
 * Stripe client (server-only). Uses the secret key; never import into client
 * components. Stripe Connect powers the marketplace: guests pay, the platform
 * takes its commission as an application fee, and the remainder is destined for
 * the host's connected account — so the platform never holds host funds.
 */
let client: Stripe | null = null;

export function isStripeEnabled(): boolean {
  return process.env.PAYMENTS_PROVIDER === "stripe" && Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  }
  return client;
}
