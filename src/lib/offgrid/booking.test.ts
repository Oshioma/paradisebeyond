import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OFFGRID_DEMO_EXPERIENCES } from "@/lib/demo/offgridSamples";
import { EXPERIENCES } from "@/lib/data/experiences";

/**
 * createOffGridBooking in LIVE mode (Supabase + Stripe configured), with the
 * outside world mocked. Verifies: free stays never reach Stripe; paid stays go
 * to Stripe with the 15% fee and a brand-correct return origin; the booking
 * row snapshots marketplace + commission.
 */

const startStripeCheckout = vi.fn(async (..._args: unknown[]) => ({ url: "https://checkout.stripe.test/s" }));
const inserted: Record<string, unknown>[] = [];
const rpc = vi.fn(async (..._args: unknown[]) => ({ data: true, error: null }));
const paymentIntent = vi.fn();

vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/payments/stripe", () => ({ isStripeEnabled: () => true }));
vi.mock("@/lib/payments/stripeCheckout", () => ({ startStripeCheckout: (...a: unknown[]) => startStripeCheckout(...a) }));
vi.mock("@/lib/payments", () => ({ getPaymentProvider: () => ({ name: "mock", createPaymentIntent: paymentIntent }) }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/supabase/server", () => {
  const client = {
    rpc: (...a: unknown[]) => rpc(...a),
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        inserted.push(row);
        return { select: () => ({ single: async () => ({ data: { id: "booking-1" }, error: null }) }) };
      },
      upsert: async () => ({ error: null }),
    }),
  };
  return { createClient: () => client, createServiceRoleClient: () => client };
});

const { createOffGridBooking } = await import("./booking");
const { getCommissionBpsFor } = await import("@/lib/booking/commission");

const user = { id: "u1", email: "t@example.com", name: "Tess", role: "guest" as const, demo: false };
const paidListing = { ...OFFGRID_DEMO_EXPERIENCES[0], offGrid: OFFGRID_DEMO_EXPERIENCES[0].offGrid! }; // $22/day
const freeListing = { ...OFFGRID_DEMO_EXPERIENCES[2], offGrid: OFFGRID_DEMO_EXPERIENCES[2].offGrid! }; // free
const future = (iso: string) => iso; // sample windows: 2026-11 → 2027

beforeEach(() => {
  // The sample windows are fixed dates; pin "today" so these stay valid.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-02T12:00:00Z"));
  startStripeCheckout.mockClear();
  rpc.mockClear();
  paymentIntent.mockClear();
  inserted.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("commission resolution", () => {
  it("Spend Time Off Grid listings always use the fixed 15%", async () => {
    expect(await getCommissionBpsFor(paidListing)).toBe(1500);
  });
});

describe("free / exchange-only stay", () => {
  it("creates a reserved booking without Stripe or any payment", async () => {
    const dest = await createOffGridBooking({
      user, experience: freeListing, departure: freeListing.departures[0],
      arrival: future("2026-12-05"), nights: 10, guests: 1, origin: "https://spendtimeoffgrid.com",
    });
    expect(startStripeCheckout).not.toHaveBeenCalled();
    expect(paymentIntent).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("reserve_departure", { p_departure: "og-wales-1", p_qty: 1 });
    expect(dest).toBe("/account/trips/booking-1?new=1");
    expect(inserted[0]).toMatchObject({
      status: "reserved",
      subtotal_minor: 0,
      platform_fee_minor: 0,
      host_net_minor: 0,
      marketplace: "spendtimeoffgrid",
      stay_start_date: "2026-12-05",
      stay_nights: 10,
    });
  });
});

describe("paid stay", () => {
  it("goes to Stripe Checkout with the 15% application fee, brand origin and snapshot fields", async () => {
    const dest = await createOffGridBooking({
      user, experience: paidListing, departure: paidListing.departures[0],
      arrival: future("2026-11-10"), nights: 7, guests: 2, origin: "https://spendtimeoffgrid.com",
    });
    expect(dest).toBe("https://checkout.stripe.test/s");
    expect(startStripeCheckout).toHaveBeenCalledOnce();
    const args = startStripeCheckout.mock.calls[0][0] as Record<string, unknown>;
    expect(args).toMatchObject({
      kind: "full",
      subtotalMinor: 2200 * 7 * 2,
      dueNowMinor: 2200 * 7 * 2,
      balanceMinor: 0,
      commissionRateBps: 1500,
      platformFeeMinor: Math.round(2200 * 7 * 2 * 0.15),
      feeDueNowMinor: Math.round(2200 * 7 * 2 * 0.15),
      hostNetMinor: 2200 * 7 * 2 - Math.round(2200 * 7 * 2 * 0.15),
      origin: "https://spendtimeoffgrid.com",
      extraBookingFields: { marketplace: "spendtimeoffgrid", stay_start_date: "2026-11-10", stay_nights: 7 },
    });
  });

  it("rejects an invalid stay before touching payments or inventory", async () => {
    const dest = await createOffGridBooking({
      user, experience: paidListing, departure: paidListing.departures[0],
      arrival: future("2026-11-10"), nights: 3, guests: 1, origin: "https://spendtimeoffgrid.com",
    });
    expect(dest).toMatch(/^\/book\/og-pemba-1\?error=/);
    expect(startStripeCheckout).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("Paradise Beyond is untouched", () => {
  it("PB listings have no off-grid details, so createBooking never takes this path", () => {
    expect(EXPERIENCES.every((e) => !e.offGrid && !e.marketplace)).toBe(true);
  });
});
