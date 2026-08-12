import type {
  PaymentProvider,
  PaymentIntentRequest,
  PaymentIntentResult,
  RefundRequest,
  RefundResult,
} from "./provider";

/**
 * Mock payment provider for development and the magazine-phase demo.
 *
 * It records the correct amounts, commission split and idempotency, and
 * simulates a successful capture — so the entire booking flow can be exercised
 * without live keys. Swap in the Stripe Connect provider (same interface) when
 * real credentials are configured; nothing above this layer changes.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  private seen = new Set<string>();

  async createPaymentIntent(req: PaymentIntentRequest): Promise<PaymentIntentResult> {
    if (this.seen.has(req.idempotencyKey)) {
      // Idempotent replay — return a stable, already-succeeded result.
      return {
        id: `mock_pi_${req.idempotencyKey}`,
        status: "succeeded",
        amount: req.amount,
      };
    }
    this.seen.add(req.idempotencyKey);
    return {
      id: `mock_pi_${req.idempotencyKey}`,
      status: "succeeded",
      amount: req.amount,
      clientSecret: `mock_secret_${req.bookingId}`,
    };
  }

  async refund(req: RefundRequest): Promise<RefundResult> {
    return {
      id: `mock_re_${req.idempotencyKey}`,
      status: "succeeded",
      amountMinor: req.amountMinor,
    };
  }
}
