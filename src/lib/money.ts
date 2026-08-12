/**
 * Money handling — integer minor units only.
 *
 * All monetary amounts in Paradise Beyond are stored and computed as integers
 * in the currency's smallest unit (e.g. US cents). This avoids IEEE-754
 * floating-point error in financial calculations. Convert to a display string
 * only at the very edge, using Intl.NumberFormat.
 */

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG",
  "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

export function minorUnitFactor(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1 : 100;
}

export interface Money {
  amountMinor: number;
  currency: string;
}

export function money(amountMinor: number, currency: string): Money {
  return { amountMinor: Math.round(amountMinor), currency };
}

/**
 * Compute a commission split. The rate is expressed in basis points
 * (1% = 100 bps) so it can be stored as an integer and never drifts.
 * Returns the platform fee and host net, both in minor units.
 */
export function splitCommission(grossMinor: number, rateBps: number) {
  const platformFeeMinor = Math.round((grossMinor * rateBps) / 10_000);
  const hostNetMinor = grossMinor - platformFeeMinor;
  return { grossMinor, platformFeeMinor, hostNetMinor, rateBps };
}

export function formatMoney(
  amountMinor: number,
  currency: string,
  opts: { showDecimals?: boolean } = {},
): string {
  const factor = minorUnitFactor(currency);
  const value = amountMinor / factor;
  const isWhole = amountMinor % factor === 0;
  const showDecimals = opts.showDecimals ?? !isWhole;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(value);
}

/** "From $1,650" style compact price. */
export function formatFrom(amountMinor: number, currency: string): string {
  return formatMoney(amountMinor, currency, { showDecimals: false });
}
