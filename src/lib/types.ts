/**
 * Domain types for Paradise Beyond.
 *
 * These mirror the relational schema in supabase/migrations. The magazine
 * (public site) reads through the repository in src/lib/data, which currently
 * serves curated seed data and is Supabase-ready.
 *
 * MONEY: every monetary value is an integer in the currency's *minor units*
 * (e.g. cents). Never store or compute money as a float. See src/lib/money.ts.
 */

export type Duration = 7 | 14;

export type CategorySlug =
  | "wellness"
  | "adventure"
  | "family"
  | "food"
  | "creative"
  | "nature"
  | "work"
  | "transformation"
  | "paradise-holidays";

export interface Category {
  slug: CategorySlug;
  name: string;
  tagline: string;
  description: string;
  /** Homepage label may differ from the canonical name (e.g. "Connection"). */
  displayLabel?: string;
  imageSeed: string;
}

export interface Destination {
  slug: string;
  name: string;
  country: string;
  region?: string;
  summary: string;
  description: string;
  imageSeed: string;
  featured: boolean;
}

export interface Host {
  slug: string;
  name: string;
  headline: string;
  bio: string;
  qualifications: string[];
  specialisms: string[];
  socials: { label: string; href: string }[];
  verified: boolean;
  imageSeed: string;
  since: number;
  /** Optional brand accent colour (hex) for the host's microsite/pages. */
  brandColor?: string;
  /** Optional logo image URL shown on the host's microsite/pages. */
  logoUrl?: string;
  /** Optional short tagline shown under the retreat name on the microsite. */
  tagline?: string;
}

export interface ItineraryItem {
  time?: string;
  title: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  summary?: string;
  items: ItineraryItem[];
}

export interface RoomType {
  id: string;
  /** Hotel / property this option is at (optional). */
  property?: string;
  name: string;
  description: string;
  occupancy: "single" | "shared" | "private";
  /** Price delta vs the departure base price, in minor units (can be 0 or negative). */
  priceDeltaMinor: number;
}

/** A specific dated instance of an experience. Availability lives here. */
export interface Departure {
  id: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  priceFromMinor: number;
  currency: string;
  capacity: number;
  spacesRemaining: number;
  depositMinor: number;
  balanceDueDays: number; // days before start the balance is due
  status: "open" | "waitlist" | "sold_out" | "closed";
}

export interface Experience {
  slug: string;
  name: string;
  strapline: string;
  duration: Duration;
  destinationSlug: string;
  location: string; // e.g. "Kendwa, Zanzibar"
  categorySlugs: CategorySlug[];
  hostSlugs: string[];
  /** Host display info resolved at read time (so cards can show the host even
   *  when it's a DB host not in the static seed). Optional; falls back to seed. */
  hostName?: string;
  hostImageSeed?: string;
  verified: boolean;
  currency: string;
  priceFromMinor: number;
  maxGroupSize: number;
  heroImageSeed: string;
  gallerySeeds: string[];
  /** Rich narrative sections. */
  forYouIf: string[];
  story: string[];
  highlights: { title: string; description: string; imageSeed: string }[];
  stay: {
    property: string;
    description: string;
    /** All hotels/properties guests can choose from (optional; multi-hotel retreats). */
    hotels?: { name: string; description: string }[];
    roomTypes: RoomType[];
    imageSeeds: string[];
  };
  inclusions: string[];
  exclusions: string[];
  itinerary: ItineraryDay[];
  departures: Departure[];
  featured: boolean;
  /**
   * The retreat draft this listing was materialised from (live/Supabase only).
   * Lets a host reopen their published experience in the builder to edit it.
   */
  retreatDraftId?: string;
  /** Custom vanity subdomain label for the microsite (else derived from slug). */
  subdomain?: string;
  /** The host's own custom domain (e.g. aminaretreats.com) → this microsite. */
  customDomain?: string;
}
