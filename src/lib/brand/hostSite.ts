import { marketplaceOf, type Brand, type MarketplaceId } from "./config";

/**
 * The host area (Studio) is shared by both sites but shows one site at a time:
 * on spendtimeoffgrid.com a host sees only their Spend Time Off Grid listings,
 * drafts, bookings and messages; on paradisebeyond.com only Paradise Beyond's.
 * Anything without a marketplace (older rows) belongs to Paradise Beyond.
 */
export function onSite<T extends { marketplace?: string | null }>(items: T[], site: MarketplaceId): T[] {
  return items.filter((i) => marketplaceOf(i) === site);
}

/** How the host area talks on each site. Paradise Beyond's wording is unchanged. */
export function hostWords(brand: Brand) {
  const og = brand.theme === "earth";
  return {
    area: og ? brand.terms.hostArea : "Host Studio",
    listing: og ? "listing" : "retreat",
    listings: og ? "listings" : "retreats",
    myListings: og ? "My listings" : "My Retreats",
    newListing: og ? "+ List your land" : "+ New retreat",
    guests: og ? "travellers" : "guests",
    dates: og ? "Availability" : "Departures",
    openDates: og ? "Open dates" : "Upcoming departures",
  };
}
