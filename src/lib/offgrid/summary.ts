import { formatMoney, minorUnitFactor } from "@/lib/money";
import type { OffGridDetails } from "./types";
import { unitLabel } from "./pricing";

/**
 * Human one-liners for an off-grid stay, used by cards, the experience page
 * summary and the booking panel so the exchange always reads the same way.
 * Pure — safe in client components.
 */

export function contributionLine(o: OffGridDetails): string {
  const { hoursPerDay: h, daysPerWeek: d } = o.contribution;
  if (!h || !d) return "No set hours of help";
  const hrs = `${trim(h)} ${h === 1 ? "hr" : "hrs"}/day`;
  return `${hrs} · ${d} ${d === 1 ? "day" : "days"}/week`;
}

export function minStayLine(o: OffGridDetails): string {
  const min = Math.max(1, o.stay.minNights || 1);
  const max = o.stay.maxNights;
  if (max && max > 0) return min === max ? `${min} nights` : `${min}–${max} nights`;
  return `Minimum ${min} ${min === 1 ? "night" : "nights"}`;
}

export function mealsLine(o: OffGridDetails): string {
  if (!o.food.mealsIncluded) return "Self-catering";
  const n = o.food.mealsPerDay;
  return n > 0 ? `${n} ${n === 1 ? "meal" : "meals"}/day` : "Meals included";
}

export function accommodationLine(o: OffGridDetails): string {
  const type = o.stay.accommodationType.trim();
  const privacy = o.stay.privacy === "private" ? "Private" : "Shared";
  if (!type) return `${privacy} accommodation`;
  // "Private hut", "Shared dorm" — avoid "Private private room".
  return type.toLowerCase().startsWith(privacy.toLowerCase()) ? type : `${privacy} ${type.toLowerCase()}`;
}

/** "Food + accommodation included" style line for cards. */
export function includedLine(o: OffGridDetails): string {
  return o.food.mealsIncluded ? "Food + accommodation included" : "Accommodation included";
}

export function priceLine(o: OffGridDetails, currency: string): string {
  if (!o.pricing.amountMinor) return "Free · exchange only";
  return `${formatMoney(o.pricing.amountMinor, currency, { showDecimals: false })}/${unitLabel(o.pricing.unit)}`;
}

/**
 * Compact price for listing cards, split so the unit can be styled:
 * { amount: "$22", unit: "day" } (the currency's short symbol — €, £, $ —
 * from the listing's own currency), or { amount: "Free · exchange only" }.
 */
export function cardPrice(o: OffGridDetails, currency: string): { amount: string; unit?: string } {
  if (!o.pricing.amountMinor) return { amount: "Free · exchange only" };
  const factor = minorUnitFactor(currency);
  const value = o.pricing.amountMinor / factor;
  const whole = o.pricing.amountMinor % factor === 0;
  const amount = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(value);
  return { amount, unit: unitLabel(o.pricing.unit) };
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
