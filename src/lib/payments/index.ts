import type { PaymentProvider } from "./provider";
import { MockPaymentProvider } from "./mockProvider";

/**
 * Returns the active payment provider. Today this is the mock provider; when
 * `PAYMENTS_PROVIDER=stripe` and Stripe keys are present, this factory returns
 * the Stripe Connect provider instead. Server-only — never import into client
 * components (it may hold secret keys).
 */
let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  // const provider = process.env.PAYMENTS_PROVIDER;
  // if (provider === "stripe") { cached = new StripeConnectProvider(...); return cached; }
  cached = new MockPaymentProvider();
  return cached;
}

export * from "./provider";
