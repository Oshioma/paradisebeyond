import { describe, it, expect } from "vitest";
import { splitCommission, formatMoney, minorUnitFactor, money } from "./money";

describe("splitCommission", () => {
  it("always reconciles fee + net back to gross", () => {
    for (const gross of [0, 1, 99, 100, 12_345, 165_000]) {
      for (const bps of [0, 1500, 3333, 10_000]) {
        const s = splitCommission(gross, bps);
        expect(s.platformFeeMinor + s.hostNetMinor).toBe(gross);
      }
    }
  });

  it("computes a 15% fee", () => {
    const s = splitCommission(10_000, 1500);
    expect(s.platformFeeMinor).toBe(1500);
    expect(s.hostNetMinor).toBe(8500);
  });
});

describe("minorUnitFactor", () => {
  it("is 1 for zero-decimal currencies (case-insensitive)", () => {
    expect(minorUnitFactor("JPY")).toBe(1);
    expect(minorUnitFactor("jpy")).toBe(1);
  });
  it("is 100 for regular currencies", () => {
    expect(minorUnitFactor("USD")).toBe(100);
    expect(minorUnitFactor("EUR")).toBe(100);
  });
});

describe("money", () => {
  it("rounds to an integer minor amount", () => {
    expect(money(10.6, "USD").amountMinor).toBe(11);
  });
});

describe("formatMoney", () => {
  it("omits decimals for a whole amount", () => {
    const s = formatMoney(165_000, "USD");
    expect(s).toContain("1,650");
    expect(s).not.toContain(".00");
  });
  it("shows decimals for a fractional amount", () => {
    expect(formatMoney(165_050, "USD")).toContain("1,650.50");
  });
  it("treats zero-decimal currencies without cents", () => {
    const s = formatMoney(1500, "JPY");
    expect(s).toContain("1,500");
    expect(s).not.toContain(".");
  });
});
