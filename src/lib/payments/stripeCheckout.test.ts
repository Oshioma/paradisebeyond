import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Departure, Experience, RoomType } from "@/lib/types";

/**
 * Stripe return URLs must land the traveller back on the brand they booked on
 * (their auth cookies live there). Paradise Beyond keeps siteUrl().
 */
const created: Record<string, unknown>[] = [];
const inserts: Record<string, unknown>[] = [];

vi.mock("./stripe", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        retrieve: vi.fn(),
        create: async (args: Record<string, unknown>) => {
          created.push(args);
          return { id: "cs_1", url: "https://checkout.stripe.test/cs_1" };
        },
      },
    },
  }),
}));
vi.mock("@/lib/supabase/server", () => {
  const chain: Record<string, unknown> = {};
  const q = () => chain;
  Object.assign(chain, {
    select: q, eq: q, not: q, order: q, limit: q,
    maybeSingle: async () => ({ data: null }),
    insert: (row: Record<string, unknown>) => {
      inserts.push(row);
      return { select: () => ({ single: async () => ({ data: { id: "bk-1" }, error: null }) }) };
    },
    update: () => ({ eq: async () => ({}) }),
  });
  const client = { rpc: async () => ({ data: true, error: null }), from: () => chain };
  return { createClient: () => client, createServiceRoleClient: () => client };
});

const { startStripeCheckout } = await import("./stripeCheckout");

const experience = { name: "Farm", hostSlugs: ["h"] } as unknown as Experience;
const departure = { id: "dep-1", startDate: "2026-11-01", endDate: "2027-01-31" } as Departure;
const room = { id: "room-1", name: "Hut" } as RoomType;
const base = {
  guestId: "u1", guestEmail: "t@example.com", experience, departure, room, guests: 1, kind: "full" as const,
  currency: "USD", subtotalMinor: 15_400, depositMinor: 15_400, balanceMinor: 0, dueNowMinor: 15_400,
  feeDueNowMinor: 2310, commissionRateBps: 1500, platformFeeMinor: 2310, hostNetMinor: 13_090, reference: "R1",
};

beforeEach(() => {
  created.length = 0;
  inserts.length = 0;
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.paradisebeyond.com";
});

describe("Stripe return URLs", () => {
  it("off-grid bookings return to spendtimeoffgrid.com", async () => {
    await startStripeCheckout({ ...base, origin: "https://spendtimeoffgrid.com", extraBookingFields: { marketplace: "spendtimeoffgrid" } });
    expect(created[0].success_url).toBe("https://spendtimeoffgrid.com/account/trips/bk-1?paid=1");
    expect(created[0].cancel_url).toBe("https://spendtimeoffgrid.com/book/dep-1?canceled=1");
  });

  it("Paradise Beyond bookings keep the original siteUrl() behaviour", async () => {
    await startStripeCheckout(base);
    expect(created[0].success_url).toBe("https://www.paradisebeyond.com/account/trips/bk-1?paid=1");
    expect(created[0].cancel_url).toBe("https://www.paradisebeyond.com/book/dep-1?canceled=1");
  });
});

describe("booking row snapshot", () => {
  it("off-grid rows snapshot marketplace + commission", async () => {
    await startStripeCheckout({ ...base, origin: "https://spendtimeoffgrid.com", extraBookingFields: { marketplace: "spendtimeoffgrid", stay_start_date: "2026-11-10", stay_nights: 7 } });
    expect(inserts[0]).toMatchObject({
      marketplace: "spendtimeoffgrid",
      stay_start_date: "2026-11-10",
      stay_nights: 7,
      commission_rate_bps: 1500,
      platform_fee_minor: 2310,
      host_net_minor: 13_090,
      status: "pending",
    });
  });

  it("Paradise Beyond rows are written exactly as before (DB default sets marketplace)", async () => {
    await startStripeCheckout(base);
    expect(Object.keys(inserts[0])).not.toContain("marketplace");
    expect(Object.keys(inserts[0])).not.toContain("stay_nights");
  });
});
