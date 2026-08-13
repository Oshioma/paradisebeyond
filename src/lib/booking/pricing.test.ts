import { describe, it, expect } from "vitest";
import { priceBooking, DEFAULT_COMMISSION_BPS } from "./pricing";
import type { Departure, Experience, RoomType } from "@/lib/types";

const experience = { currency: "USD" } as Experience;
const departure = { priceFromMinor: 150_000, depositMinor: 50_000, balanceDueDays: 60 } as Departure;
const room = { priceDeltaMinor: 20_000 } as RoomType;

describe("priceBooking", () => {
  it("computes per-guest, subtotal, deposit and balance", () => {
    const b = priceBooking(experience, departure, room, 2, 1500);
    expect(b.perGuestMinor).toBe(170_000);
    expect(b.subtotalMinor).toBe(340_000);
    expect(b.depositDueNowMinor).toBe(100_000);
    expect(b.balanceMinor).toBe(240_000);
  });

  it("snapshots a commission split that reconciles to the subtotal", () => {
    const b = priceBooking(experience, departure, room, 2, 1500);
    expect(b.platformFeeMinor + b.hostNetMinor).toBe(b.subtotalMinor);
    expect(b.platformFeeMinor).toBe(51_000); // 15% of 340,000
  });

  it("defaults to the platform commission rate", () => {
    const b = priceBooking(experience, departure, room, 1);
    expect(b.commissionRateBps).toBe(DEFAULT_COMMISSION_BPS);
  });
});
