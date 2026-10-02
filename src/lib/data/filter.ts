import type { Experience } from "@/lib/types";
import { marketplaceOf, type MarketplaceId } from "@/lib/brand/config";

/**
 * Pure catalogue filtering (no data-source imports, so it's unit-testable and
 * shared by every listing page). The repository applies it to the live
 * catalogue.
 */
export interface ExperienceFilter {
  /** Which marketplace's listings to return. Defaults to Paradise Beyond, so
   *  existing callers never see another marketplace's listings. */
  marketplace?: MarketplaceId;
  duration?: 7 | 14;
  category?: string;
  destination?: string;
  /** Month index 0-11 within the filter year, matched against any departure. */
  month?: number;
  /** Maximum "from" price in minor units. */
  maxPriceMinor?: number;
  // --- Off-grid search (Spend Time Off Grid) ---------------------------------
  /** Free-text "where" — matched against location, country and name. */
  q?: string;
  /** Maximum contribution hours per day the traveller is happy with. */
  maxHours?: number;
  /** Nights the traveller wants to stay — listing's min/max must allow it. */
  stayNights?: number;
  /** ISO arrival date the traveller wants — an open availability window must
   *  contain it. */
  date?: string;
}

function isOpen(d: Experience["departures"][number]) {
  return d.status === "open" || d.status === "waitlist";
}

export function matchesFilter(e: Experience, filter: ExperienceFilter): boolean {
  const market = filter.marketplace ?? "paradise-beyond";
  if (marketplaceOf(e) !== market) return false;
  if (filter.duration && e.duration !== filter.duration) return false;
  if (filter.category && !e.categorySlugs.includes(filter.category as never)) return false;
  if (filter.destination && e.destinationSlug !== filter.destination) return false;
  if (filter.maxPriceMinor && e.priceFromMinor > filter.maxPriceMinor) return false;
  if (filter.month !== undefined) {
    const hasMonth = e.departures.some((d) => new Date(d.startDate + "T00:00:00Z").getUTCMonth() === filter.month);
    if (!hasMonth) return false;
  }

  const q = filter.q?.trim().toLowerCase();
  if (q) {
    const hay = [e.location, e.name, e.strapline].join(" ").toLowerCase();
    if (!q.split(/[\s,]+/).filter(Boolean).every((w) => hay.includes(w))) return false;
  }

  const og = e.offGrid;
  if (filter.maxHours !== undefined) {
    if (!og) return false;
    if (og.contribution.hoursPerDay > filter.maxHours) return false;
  }
  if (filter.stayNights !== undefined) {
    if (!og) return false;
    const n = filter.stayNights;
    if (og.stay.minNights > n) return false;
    if (og.stay.maxNights && og.stay.maxNights > 0 && og.stay.maxNights < n) return false;
  }
  if (filter.date) {
    const date = filter.date;
    const nights = filter.stayNights ?? og?.stay.minNights ?? 1;
    const fits = e.departures.some((d) => {
      if (!isOpen(d) || d.spacesRemaining <= 0) return false;
      if (date < d.startDate || date >= d.endDate) return false;
      const depart = new Date(date + "T00:00:00Z");
      depart.setUTCDate(depart.getUTCDate() + nights);
      return depart.toISOString().slice(0, 10) <= d.endDate;
    });
    if (!fits) return false;
  }
  return true;
}

/** Is a listing shown on a marketplace's public pages? (No cross-marketplace
 *  discovery: each marketplace only ever surfaces its own inventory.) */
export function visibleOn(e: Experience, marketplace: MarketplaceId): boolean {
  return marketplaceOf(e) === marketplace;
}

/** Only the listings a marketplace may surface, order preserved. */
export function onlyMarketplace(list: Experience[], marketplace: MarketplaceId): Experience[] {
  return list.filter((e) => visibleOn(e, marketplace));
}

/**
 * Is a host's public profile shown on a marketplace? Yes when they have
 * listings there. A host with no listings at all keeps Paradise Beyond's
 * existing behaviour (profile visible there only); a host whose listings are
 * all on the other marketplace is not shown.
 */
export function hostVisibleOn(hostListings: Experience[], marketplace: MarketplaceId): boolean {
  if (hostListings.some((e) => visibleOn(e, marketplace))) return true;
  return hostListings.length === 0 && marketplace === "paradise-beyond";
}
