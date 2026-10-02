import { describe, it, expect } from "vitest";
import { checkStayRequest, maxNightsFrom, perGuestStayPrice, quoteOffGridStay } from "./pricing";
import { offGridPaymentRoute, planOffGridBooking } from "./booking";
import { cardPrice, contributionLine, minStayLine, priceLine, accommodationLine, mealsLine } from "./summary";
import { OFFGRID_DEMO_EXPERIENCES } from "@/lib/demo/offgridSamples";
import { SPEND_TIME_OFF_GRID } from "@/lib/brand/config";
import type { OffGridDetails } from "./types";
import { formatMoney } from "@/lib/money";

const BPS = SPEND_TIME_OFF_GRID.fixedCommissionBps!; // 1500

describe("price per traveller", () => {
  it("per day × nights", () => {
    expect(perGuestStayPrice({ unit: "day", amountMinor: 2200 }, 7)).toBe(15_400);
  });
  it("per week is pro-rated by the night", () => {
    expect(perGuestStayPrice({ unit: "week", amountMinor: 14_000 }, 7)).toBe(14_000);
    expect(perGuestStayPrice({ unit: "week", amountMinor: 14_000 }, 10)).toBe(20_000);
  });
  it("per stay is flat", () => {
    expect(perGuestStayPrice({ unit: "stay", amountMinor: 30_000 }, 3)).toBe(30_000);
    expect(perGuestStayPrice({ unit: "stay", amountMinor: 30_000 }, 30)).toBe(30_000);
  });
});

describe("15% commission (Spend Time Off Grid)", () => {
  it("is 15% of the paid amount, taken from the host's share", () => {
    const q = quoteOffGridStay({ unit: "day", amountMinor: 2200 }, 7, 1, BPS, "USD");
    expect(q.subtotalMinor).toBe(15_400); // exactly what the traveller pays
    expect(q.commissionRateBps).toBe(1500);
    expect(q.platformFeeMinor).toBe(2310); // 15%
    expect(q.hostNetMinor).toBe(13_090);
  });

  it("never adds anything on top for the traveller", () => {
    const q = quoteOffGridStay({ unit: "day", amountMinor: 2200 }, 10, 2, BPS, "USD");
    expect(q.subtotalMinor).toBe(2200 * 10 * 2);
    expect(q.platformFeeMinor + q.hostNetMinor).toBe(q.subtotalMinor);
  });

  it("rounds to the cent without losing one", () => {
    for (const amount of [1, 333, 999, 2199, 12_345]) {
      for (const nights of [1, 3, 7, 11, 29]) {
        const q = quoteOffGridStay({ unit: "day", amountMinor: amount }, nights, 3, BPS, "USD");
        expect(q.platformFeeMinor + q.hostNetMinor).toBe(q.subtotalMinor);
        expect(q.platformFeeMinor).toBe(Math.round(q.subtotalMinor * 0.15));
      }
    }
  });
});

describe("free / exchange-only stays", () => {
  const q = quoteOffGridStay({ unit: "day", amountMinor: 0 }, 14, 2, BPS, "USD");
  it("cost nothing and take no commission", () => {
    expect(q.isFree).toBe(true);
    expect(q.subtotalMinor).toBe(0);
    expect(q.platformFeeMinor).toBe(0);
  });
  it("never route to Stripe (or any payment provider) in live mode", () => {
    expect(offGridPaymentRoute(q, { stripe: true, supabase: true })).toBe("free");
    expect(offGridPaymentRoute(q, { stripe: false, supabase: true })).toBe("free");
  });
  it("paid stays do route to Stripe when it's configured", () => {
    const paid = quoteOffGridStay({ unit: "day", amountMinor: 100 }, 7, 1, BPS, "USD");
    expect(offGridPaymentRoute(paid, { stripe: true, supabase: true })).toBe("stripe");
    expect(offGridPaymentRoute(paid, { stripe: false, supabase: true })).toBe("direct");
    expect(offGridPaymentRoute(paid, { stripe: true, supabase: false })).toBe("demo");
  });
});

describe("stay rules", () => {
  const window = { startDate: "2026-11-01", endDate: "2027-01-31" };
  const stay = { minNights: 7, maxNights: 30 };
  const today = "2026-10-02";
  const ok = (arrival: string, nights: number) => checkStayRequest({ window, stay, arrival, nights, today });

  it("accepts a stay inside the window", () => {
    expect(ok("2026-11-10", 7)).toEqual({ ok: true, departDate: "2026-11-17" });
  });
  it("enforces the minimum and maximum", () => {
    expect(ok("2026-11-10", 6).ok).toBe(false);
    expect(ok("2026-11-10", 31).ok).toBe(false);
  });
  it("must start and end within the window (leaving on the last day is fine)", () => {
    expect(ok("2026-10-30", 7).ok).toBe(false);
    expect(ok("2027-01-24", 7)).toEqual({ ok: true, departDate: "2027-01-31" });
    expect(ok("2027-01-25", 7).ok).toBe(false);
  });
  it("rejects past arrivals and bad input", () => {
    expect(checkStayRequest({ window: { startDate: "2026-01-01", endDate: "2027-01-01" }, stay, arrival: "2026-09-01", nights: 7, today }).ok).toBe(false);
    expect(ok("not-a-date", 7).ok).toBe(false);
    expect(ok("2026-11-10", 0).ok).toBe(false);
  });
  it("max nights is capped by the window", () => {
    expect(maxNightsFrom({ maxNights: 30 }, window, "2027-01-20")).toBe(11);
    expect(maxNightsFrom({}, window, "2026-11-01")).toBe(91);
  });
});

describe("planOffGridBooking", () => {
  const e = { ...OFFGRID_DEMO_EXPERIENCES[0], offGrid: OFFGRID_DEMO_EXPERIENCES[0].offGrid! };
  const d = e.departures[0];
  it("prices a valid request with the fixed commission and the listing's marketplace", () => {
    const plan = planOffGridBooking({ experience: e, departure: d, arrival: "2026-11-05", nights: 7, guests: 1, commissionBps: BPS, today: "2026-10-02" });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.marketplace).toBe("spendtimeoffgrid");
    expect(plan.quote.subtotalMinor).toBe(15_400);
    expect(plan.quote.platformFeeMinor).toBe(2310);
  });
  it("refuses more travellers than places left", () => {
    const plan = planOffGridBooking({ experience: e, departure: { ...d, spacesRemaining: 1 }, arrival: "2026-11-05", nights: 7, guests: 2, commissionBps: BPS, today: "2026-10-02" });
    expect(plan.ok).toBe(false);
  });
  it("refuses a closed window", () => {
    const plan = planOffGridBooking({ experience: e, departure: { ...d, status: "closed" }, arrival: "2026-11-05", nights: 7, guests: 1, commissionBps: BPS, today: "2026-10-02" });
    expect(plan.ok).toBe(false);
  });
});

describe("card / summary lines", () => {
  const o = OFFGRID_DEMO_EXPERIENCES[0].offGrid as OffGridDetails;
  it("reads like the brief's example", () => {
    expect(contributionLine(o)).toBe("3 hrs/day · 5 days/week");
    expect(minStayLine(o)).toBe("Minimum 7 nights");
    expect(priceLine(o, "USD")).toBe(`${formatMoney(2200, "USD", { showDecimals: false })}/day`);
    expect(accommodationLine(o)).toBe("Private hut");
    expect(mealsLine(o)).toBe("3 meals/day");
  });
  it("free stays say so", () => {
    expect(priceLine({ ...o, pricing: { unit: "day", amountMinor: 0 } }, "USD")).toBe("Free · exchange only");
  });

  it("card price: short symbol from the listing's own currency", () => {
    expect(cardPrice(o, "USD")).toEqual({ amount: "$22", unit: "day" });
    expect(cardPrice(o, "EUR")).toEqual({ amount: "€22", unit: "day" });
    expect(cardPrice(o, "GBP")).toEqual({ amount: "£22", unit: "day" });
    expect(cardPrice({ ...o, pricing: { unit: "week", amountMinor: 12550 } }, "USD")).toEqual({ amount: "$125.50", unit: "week" });
    expect(cardPrice({ ...o, pricing: { unit: "day", amountMinor: 0 } }, "USD")).toEqual({ amount: "Free · exchange only" });
  });
  it("no contribution hours reads honestly", () => {
    expect(contributionLine({ ...o, contribution: { ...o.contribution, hoursPerDay: 0 } })).toBe("No set hours of help");
  });
});
