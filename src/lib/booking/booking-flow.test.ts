import { describe, it, expect } from "vitest";
import { priceBooking, findByDeparture, feeForPayment } from "./pricing";
import { splitCommission } from "@/lib/money";
import type { Departure, Experience, RoomType } from "@/lib/types";

const room = (id: string, priceDeltaMinor: number): RoomType =>
  ({ id, name: id, description: "", occupancy: "private", priceDeltaMinor } as RoomType);

const departure = (id: string): Departure =>
  ({ id, startDate: "2026-06-01", endDate: "2026-06-08", priceFromMinor: 150_000, depositMinor: 50_000, balanceDueDays: 60, currency: "USD", capacity: 8, spacesRemaining: 8, status: "open" } as Departure);

const experience = (slug: string, deps: Departure[]): Experience =>
  ({ slug, currency: "USD", departures: deps, stay: { roomTypes: [] } } as unknown as Experience);

describe("findByDeparture (booking page resolves the right listing)", () => {
  const a = experience("alpha", [departure("dep-a1"), departure("dep-a2")]);
  const b = experience("beta", [departure("dep-b1")]);

  it("finds the experience + departure that owns an id", () => {
    const found = findByDeparture([a, b], "dep-b1");
    expect(found?.experience.slug).toBe("beta");
    expect(found?.departure.id).toBe("dep-b1");
  });

  it("returns null for an unknown departure (page will 404, not crash)", () => {
    expect(findByDeparture([a, b], "nope")).toBeNull();
  });

  it("returns null when there are no experiences", () => {
    expect(findByDeparture([], "dep-a1")).toBeNull();
  });
});

describe("priceBooking edge cases", () => {
  const exp = { currency: "USD" } as Experience;
  const dep = departure("d");

  it("an included room adds nothing to the per-guest price", () => {
    const b = priceBooking(exp, dep, room("std", 0), 1, 1500);
    expect(b.perGuestMinor).toBe(150_000);
    expect(b.roomDeltaPerGuestMinor).toBe(0);
  });

  it("balance is always subtotal minus deposit", () => {
    const b = priceBooking(exp, dep, room("suite", 20_000), 3, 1500);
    expect(b.balanceMinor).toBe(b.subtotalMinor - b.depositDueNowMinor);
  });

  it("carries the currency from the experience", () => {
    const b = priceBooking({ currency: "EUR" } as Experience, dep, room("std", 0), 1, 1500);
    expect(b.currency).toBe("EUR");
  });
});

describe("commission split reconciles (no cent lost)", () => {
  it("platform fee + host net always equals the gross", () => {
    for (const gross of [0, 1, 99, 100, 150_000, 340_000, 999_999, 1_234_567]) {
      for (const bps of [0, 500, 1000, 1500, 2000, 3333, 10_000]) {
        const s = splitCommission(gross, bps);
        expect(s.platformFeeMinor + s.hostNetMinor).toBe(gross);
        expect(s.platformFeeMinor).toBeGreaterThanOrEqual(0);
        expect(s.platformFeeMinor).toBeLessThanOrEqual(gross);
      }
    }
  });
});

describe("feeForPayment splits the fee across deposit + balance legs", () => {
  it("deposit-leg fee + balance-leg fee equals the whole platform fee exactly", () => {
    for (const subtotal of [100_000, 340_000, 777_777, 1_000_001]) {
      for (const bps of [500, 1500, 2500]) {
        const { platformFeeMinor } = splitCommission(subtotal, bps);
        for (const payNow of [0, 1, subtotal / 3, subtotal / 2, subtotal - 1, subtotal]) {
          const deposit = feeForPayment(platformFeeMinor, subtotal, Math.round(payNow));
          const balance = Math.max(0, platformFeeMinor - deposit);
          expect(deposit + balance).toBe(platformFeeMinor); // no stray cent
          expect(deposit).toBeGreaterThanOrEqual(0);
          expect(deposit).toBeLessThanOrEqual(platformFeeMinor);
        }
      }
    }
  });

  it("is zero when there's nothing to pay against", () => {
    expect(feeForPayment(5_000, 0, 0)).toBe(0);
  });

  it("pay-in-full takes the entire fee on the one leg", () => {
    const { platformFeeMinor } = splitCommission(340_000, 1500);
    expect(feeForPayment(platformFeeMinor, 340_000, 340_000)).toBe(platformFeeMinor);
  });
});
