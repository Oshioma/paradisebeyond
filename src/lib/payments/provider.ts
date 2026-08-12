import type { Money } from "@/lib/money";

/**
 * Payment provider abstraction.
 *
 * Paradise Beyond is a marketplace: guests pay, the platform takes a commission,
 * and the remainder is destined for the host. The concrete provider (Stripe
 * Connect via destination charges, or a country-specific provider later) sits
 * behind this interface so the booking flow never depends on one processor.
 *
 * Design intent for the real Stripe implementation:
 *  - Guest funds are collected against a connected host account, with the
 *    platform commission taken as an application fee — the platform does not
 *    hold client funds indefinitely.
 *  - Deposits and balances are separate PaymentIntents against a schedule.
 *  - Booking state transitions on webhooks, never on client redirects.
 *  - Every charge carries an idempotency key.
 */

export interface PaymentIntentRequest {
  bookingId: string;
  /** What this charge is for. */
  kind: "deposit" | "balance" | "full";
  amount: Money;
  /** Platform commission for this charge, in the same currency's minor units. */
  applicationFeeMinor: number;
  /** The host's connected-account id (destination of the transfer). */
  hostAccountRef?: string;
  /** Prevents duplicate charges on retry. */
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  id: string;
  status: "requires_payment" | "processing" | "succeeded" | "failed";
  amount: Money;
  /** URL/token the client uses to complete payment (hosted checkout, etc.). */
  clientActionUrl?: string;
  clientSecret?: string;
}

export interface RefundRequest {
  paymentIntentId: string;
  amountMinor: number;
  reason: "cancellation" | "changes_requested" | "goodwill";
  /** Whether to also reverse the platform commission for this refund. */
  reverseApplicationFee: boolean;
  idempotencyKey: string;
}

export interface RefundResult {
  id: string;
  status: "pending" | "succeeded" | "failed";
  amountMinor: number;
}

export interface PaymentProvider {
  readonly name: string;
  createPaymentIntent(req: PaymentIntentRequest): Promise<PaymentIntentResult>;
  refund(req: RefundRequest): Promise<RefundResult>;
}
