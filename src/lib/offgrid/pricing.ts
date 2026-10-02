import { splitCommission } from "@/lib/money";
import type { OffGridDetails, OffGridPricing, PriceUnit } from "./types";

/**
 * Pricing and stay rules for Spend Time Off Grid bookings. Pure functions —
 * shared by the booking UI (live summary) and the server action (source of
 * truth), and unit-tested.
 *
 * Commission model (same as Paradise Beyond's Stripe Connect setup): the
 * traveller pays exactly the host's price; the platform's commission is taken
 * from that amount as the application fee, and the host receives the rest. No
 * extra fee is ever added on top for the traveller.
 */

/** Most travellers one booking can include. */
export const MAX_TRAVELLERS_PER_BOOKING = 4;

export interface OffGridQuote {
  currency: string;
  nights: number;
  guests: number;
  unit: PriceUnit;
  unitPriceMinor: number;
  /** What one traveller pays for the whole stay. */
  perGuestMinor: number;
  /** What the booking costs in total (= what the traveller pays). */
  subtotalMinor: number;
  commissionRateBps: number;
  platformFeeMinor: number;
  hostNetMinor: number;
  /** A free / exchange-only stay — no payment is taken. */
  isFree: boolean;
}

/** One traveller's price for `nights` nights. */
export function perGuestStayPrice(pricing: OffGridPricing, nights: number): number {
  const amount = Math.max(0, Math.round(pricing.amountMinor || 0));
  const n = Math.max(0, Math.floor(nights));
  switch (pricing.unit) {
    case "day":
      return amount * n;
    case "week":
      // Pro-rated by the night so a 10-night stay isn't charged as two weeks.
      return Math.round((amount * n) / 7);
    case "stay":
      return amount;
  }
}

export function quoteOffGridStay(
  pricing: OffGridPricing,
  nights: number,
  guests: number,
  commissionBps: number,
  currency: string,
): OffGridQuote {
  const g = Math.max(1, Math.floor(guests));
  const perGuestMinor = perGuestStayPrice(pricing, nights);
  const subtotalMinor = perGuestMinor * g;
  const split = splitCommission(subtotalMinor, commissionBps);
  return {
    currency,
    nights,
    guests: g,
    unit: pricing.unit,
    unitPriceMinor: Math.max(0, Math.round(pricing.amountMinor || 0)),
    perGuestMinor,
    subtotalMinor,
    commissionRateBps: commissionBps,
    platformFeeMinor: split.platformFeeMinor,
    hostNetMinor: split.hostNetMinor,
    isFree: subtotalMinor === 0,
  };
}

/** "per day" / "per week" / "per stay" — for price labels. */
export function unitLabel(unit: PriceUnit): string {
  return unit === "day" ? "day" : unit === "week" ? "week" : "stay";
}

function addDaysIso(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Longest stay a traveller arriving on `arrival` can book within the window. */
export function maxNightsFrom(
  stay: Pick<OffGridDetails["stay"], "maxNights">,
  window: { startDate: string; endDate: string },
  arrival: string,
): number {
  const fit = daysBetween(arrival, window.endDate);
  return stay.maxNights && stay.maxNights > 0 ? Math.min(stay.maxNights, fit) : fit;
}

export type StayCheck = { ok: true; departDate: string } | { ok: false; error: string };

/**
 * Validate a requested stay against the host's availability window and their
 * minimum / maximum stay. `today` is injectable for tests.
 */
export function checkStayRequest(args: {
  window: { startDate: string; endDate: string };
  stay: Pick<OffGridDetails["stay"], "minNights" | "maxNights">;
  arrival: string;
  nights: number;
  today?: string;
}): StayCheck {
  const { window, stay, arrival } = args;
  const nights = Math.floor(args.nights);
  const today = args.today ?? new Date().toISOString().slice(0, 10);
  if (!ISO.test(arrival)) return { ok: false, error: "Choose an arrival date." };
  if (!Number.isFinite(nights) || nights < 1) return { ok: false, error: "Choose how many nights you'd like to stay." };
  if (arrival < today) return { ok: false, error: "Your arrival date is in the past." };
  if (arrival < window.startDate || arrival >= window.endDate) {
    return { ok: false, error: "Your arrival date is outside the host's available dates." };
  }
  const min = Math.max(1, Math.floor(stay.minNights || 1));
  if (nights < min) return { ok: false, error: `This host asks for a minimum stay of ${min} nights.` };
  if (stay.maxNights && stay.maxNights > 0 && nights > stay.maxNights) {
    return { ok: false, error: `This host's maximum stay is ${stay.maxNights} nights.` };
  }
  const departDate = addDaysIso(arrival, nights);
  if (departDate > window.endDate) {
    return { ok: false, error: "That stay runs past the end of the host's available dates." };
  }
  return { ok: true, departDate };
}

export { addDaysIso };
