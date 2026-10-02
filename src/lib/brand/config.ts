/**
 * Multi-brand configuration.
 *
 * One deployment serves two marketplaces:
 *   - Paradise Beyond (the original curated 7 & 14-day retreat marketplace)
 *   - Spend Time Off Grid (stays on farms, homesteads & off-grid projects)
 *
 * Everything that differs between them — name, domain, metadata, navigation,
 * terminology, commission, theme — lives here, so components ask the brand
 * rather than checking hostnames. The brand for a request is resolved once in
 * middleware (`brandForHost`) and passed down via the BRAND_HEADER request
 * header; server code reads it with `getBrand()` (src/lib/brand/server.ts).
 *
 * This module is pure (no Next.js request APIs) so it is safe in middleware,
 * client components and tests.
 */

export type BrandId = "paradise-beyond" | "spendtimeoffgrid";
/** The marketplace a listing belongs to. One brand ↔ one marketplace. */
export type MarketplaceId = BrandId;

export const PARADISE_BEYOND_ID: BrandId = "paradise-beyond";
export const SPEND_TIME_OFF_GRID_ID: BrandId = "spendtimeoffgrid";

export interface NavLink {
  label: string;
  href: string;
}

export interface Brand {
  id: BrandId;
  name: string;
  /** Wordmark shown in the header (may be styled differently from `name`). */
  wordmark: string;
  /** Small line under the wordmark. */
  wordmarkSub: string;
  /**
   * Production domain(s) that serve this brand. Empty for Paradise Beyond,
   * whose domain comes from NEXT_PUBLIC_SITE_URL (and which is the fallback for
   * every host that isn't another brand's).
   */
  domains: string[];
  /** Canonical origin for links, metadata and Stripe/auth return URLs. Null =
   *  use siteUrl() (Paradise Beyond's existing behaviour). */
  canonicalOrigin: string | null;
  metadata: {
    defaultTitle: string;
    titleTemplate: string;
    description: string;
  };
  nav: NavLink[];
  /** Primary header button. */
  headerCta: NavLink;
  /** Where "List your land"/"Host a retreat" goes. */
  hostCta: NavLink;
  footerBlurb: string;
  /** Words that differ between the two marketplaces. */
  terms: {
    experience: string;
    experiences: string;
    guest: string;
    guests: string;
    trips: string;
    upcoming: string;
    hostArea: string;
    listing: string;
    newListing: string;
  };
  /**
   * Fixed platform commission in basis points for this marketplace, or null to
   * use the admin-configurable `commission_rules` (Paradise Beyond).
   */
  fixedCommissionBps: number | null;
  /** Visual theme key used by shared chrome (header/footer/dashboards). */
  theme: "paradise" | "earth";
}

export const PARADISE_BEYOND: Brand = {
  id: "paradise-beyond",
  name: "Paradise Beyond",
  wordmark: "Paradise Beyond",
  wordmarkSub: "Curated escapes",
  domains: [],
  canonicalOrigin: null,
  metadata: {
    defaultTitle: "Paradise Beyond — Come for more than a holiday",
    titleTemplate: "%s · Paradise Beyond",
    description: "Curated 7 & 14-day experiences in extraordinary places. Come for more than a holiday.",
  },
  nav: [
    { label: "Experiences", href: "/experiences" },
    { label: "7 Days", href: "/experiences?duration=7" },
    { label: "14 Days", href: "/experiences?duration=14" },
    { label: "Host a Retreat", href: "/host" },
  ],
  headerCta: { label: "Explore", href: "/experiences" },
  hostCta: { label: "Host a Retreat", href: "/host" },
  footerBlurb:
    "Come for more than a holiday. Curated 7 & 14-day experiences in extraordinary places — starting in Zanzibar.",
  terms: {
    experience: "experience",
    experiences: "experiences",
    guest: "guest",
    guests: "guests",
    trips: "My Trips",
    upcoming: "Everything you've booked, and everything waiting for you on the ground.",
    hostArea: "Studio",
    listing: "retreat",
    newListing: "Build a retreat",
  },
  fixedCommissionBps: null,
  theme: "paradise",
};

export const SPEND_TIME_OFF_GRID: Brand = {
  id: "spendtimeoffgrid",
  name: "Spend Time Off Grid",
  wordmark: "Spend Time Off Grid",
  wordmarkSub: "Stay · Contribute · Learn",
  domains: ["spendtimeoffgrid.com", "www.spendtimeoffgrid.com"],
  canonicalOrigin: "https://spendtimeoffgrid.com",
  metadata: {
    defaultTitle: "Spend Time Off Grid | Farms, Homesteads & Off-Grid Experiences",
    titleTemplate: "%s · Spend Time Off Grid",
    description:
      "Stay on farms, homesteads and off-grid projects around the world. Contribute a few hours, share food, learn new skills and experience another way of living.",
  },
  nav: [
    { label: "Explore", href: "/experiences" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "List your land", href: "/host" },
  ],
  headerCta: { label: "Explore", href: "/experiences" },
  hostCta: { label: "List your land", href: "/host" },
  footerBlurb:
    "Stays on farms, homesteads and off-grid projects, where food and a place to sleep come with a few hours contributing each day.",
  terms: {
    experience: "stay",
    experiences: "stays",
    guest: "traveller",
    guests: "travellers",
    trips: "My Stays",
    upcoming: "Your upcoming and past stays, and everything you need before you go.",
    hostArea: "Host area",
    listing: "listing",
    newListing: "List your land",
  },
  // SpendTimeOffGrid takes 15% of paid bookings — fixed per marketplace so the
  // Paradise Beyond commission rules (destination overrides etc.) never apply.
  fixedCommissionBps: 1500,
  theme: "earth",
};

export const BRANDS: Record<BrandId, Brand> = {
  "paradise-beyond": PARADISE_BEYOND,
  spendtimeoffgrid: SPEND_TIME_OFF_GRID,
};

/** Request header middleware uses to pass the resolved brand to the app. */
export const BRAND_HEADER = "x-site-brand";
/** Preview-only cookie (localhost / *.vercel.app) to view another brand. */
export const BRAND_PREVIEW_COOKIE = "site_preview";
/** Query param that sets the preview cookie, e.g. `?site=spendtimeoffgrid`. */
export const BRAND_PREVIEW_PARAM = "site";

export function isBrandId(v: unknown): v is BrandId {
  return typeof v === "string" && v in BRANDS;
}

export function getBrandById(id: string | null | undefined): Brand {
  return isBrandId(id) ? BRANDS[id] : PARADISE_BEYOND;
}

/** The marketplace of a listing (older listings have none → Paradise Beyond). */
export function marketplaceOf(x: { marketplace?: string | null } | null | undefined): MarketplaceId {
  return isBrandId(x?.marketplace) ? x!.marketplace as MarketplaceId : PARADISE_BEYOND.id;
}

export function normaliseHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0].trim().toLowerCase();
}

/** Hosts where previewing another brand via ?site= / cookie is allowed. */
export function isPreviewHost(host: string | null | undefined): boolean {
  const h = normaliseHost(host);
  return h === "localhost" || h === "127.0.0.1" || h.endsWith(".vercel.app");
}

/**
 * The brand that owns a request host, or null when the host belongs to no
 * dedicated brand (→ Paradise Beyond's existing routing applies: its own
 * domain, retreat subdomains and hosts' custom domains).
 */
export function dedicatedBrandForHost(host: string | null | undefined): Brand | null {
  const h = normaliseHost(host);
  if (!h) return null;
  for (const b of Object.values(BRANDS)) {
    if (b.domains.includes(h)) return b;
  }
  return null;
}

/**
 * Resolve the brand for a request. `preview` (from the ?site= param or preview
 * cookie) is honoured only on preview hosts, so production domains can't be
 * re-skinned by a crafted link.
 */
export function brandForHost(host: string | null | undefined, preview?: string | null): Brand {
  const dedicated = dedicatedBrandForHost(host);
  if (dedicated) return dedicated;
  if (preview && isPreviewHost(host) && isBrandId(preview)) return BRANDS[preview];
  return PARADISE_BEYOND;
}
