import type {
  Category,
  Destination,
  Experience,
  Host,
} from "@/lib/types";
import { DESTINATIONS } from "./destinations";
import { HOSTS } from "./hosts";
import { EXPERIENCES } from "./experiences";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { nextOpenDeparture, upcomingDeparture } from "./helpers";
import { getExperienceOrder, applyExperienceOrder } from "./experienceOrder";
import { matchesFilter, onlyMarketplace, visibleOn, type ExperienceFilter } from "./filter";
import { categoriesFor } from "./categories";
import type { MarketplaceId } from "@/lib/brand/config";

/**
 * The repository is the single seam between the magazine and its data source.
 * When Supabase is configured, experiences (and their live departures/rooms)
 * come from the database via supabaseRepository; otherwise the curated seed is
 * served. Categories/destinations/hosts are config-like and served from seed in
 * both modes. Nothing above this layer changes — pages already `await`.
 *
 * Experiences are read through a single `source()` so every query below stays
 * consistent whichever backend is active.
 */

let cache: { at: number; data: Experience[] } | null = null;

/** Drop the in-memory experiences cache so the next read is fresh — call after
 *  a write that changes the catalogue or its order. */
export function invalidateExperiences() {
  cache = null;
}

async function source(): Promise<Experience[]> {
  if (!isSupabaseConfigured()) {
    // Demo mode: the sample catalogue for both marketplaces.
    const { OFFGRID_DEMO_EXPERIENCES } = await import("@/lib/demo/offgridSamples");
    return withHostDisplay(applyExperienceOrder([...EXPERIENCES, ...OFFGRID_DEMO_EXPERIENCES], await getExperienceOrder()));
  }
  // Small per-request-ish cache to avoid refetching the catalogue repeatedly
  // within a single render pass.
  if (cache && Date.now() - cache.at < 5000) return cache.data;
  const supa = await import("./supabaseRepository");
  const data = await supa.getAllExperiences();
  const list = data.length ? data : EXPERIENCES;
  // Apply the admin-defined display order so every listing on the site is
  // consistent (the reorder screen writes this order).
  const ordered = applyExperienceOrder(list, await getExperienceOrder());
  const enriched = await withHostDisplay(ordered);
  cache = { at: Date.now(), data: enriched };
  return enriched;
}

/** Attach each experience's host name + image seed from the real host list, so
 *  cards render the host even when it's a DB host outside the static seed. */
async function withHostDisplay(list: Experience[]): Promise<Experience[]> {
  const hosts = await getAllHosts();
  const bySlug = new Map(hosts.map((h) => [h.slug, h] as const));
  return list.map((e) => {
    const h = e.hostSlugs?.[0] ? bySlug.get(e.hostSlugs[0]) : undefined;
    return h ? { ...e, hostName: h.name, hostImageSeed: h.imageSeed } : e;
  });
}

export type { ExperienceFilter };

/** Every published listing, across marketplaces. Use for lookups by id/slug
 *  and admin views — public listing pages should use the filtered queries. */
export async function getAllExperiences(): Promise<Experience[]> {
  return source();
}

/** All listings of one marketplace (default Paradise Beyond). */
export async function getMarketplaceExperiences(marketplace: MarketplaceId = "paradise-beyond"): Promise<Experience[]> {
  return onlyMarketplace(await source(), marketplace);
}

export async function getFeaturedExperiences(limit = 6, marketplace: MarketplaceId = "paradise-beyond"): Promise<Experience[]> {
  const list = await getMarketplaceExperiences(marketplace);
  const featured = list.filter((e) => e.featured);
  // A young marketplace may have nothing flagged yet: show its real listings
  // (never placeholders) rather than an empty section.
  if (!featured.length && marketplace !== "paradise-beyond") return list.slice(0, limit);
  return featured.slice(0, limit);
}

export async function filterExperiences(
  filter: ExperienceFilter,
): Promise<Experience[]> {
  // Order is already applied globally in source() (admin order, then
  // featured-first). Filtering preserves it, so just return the matches.
  return (await source()).filter((e) => matchesFilter(e, filter));
}

/** Any listing by slug, across marketplaces (admin / booking lookups). Public
 *  pages use getPublicExperienceBySlug. */
export async function getExperienceBySlug(slug: string): Promise<Experience | undefined> {
  return (await source()).find((e) => e.slug === slug);
}

/** A listing by slug only if it belongs to `marketplace` — public pages. */
export async function getPublicExperienceBySlug(
  slug: string,
  marketplace: MarketplaceId,
): Promise<Experience | undefined> {
  const e = await getExperienceBySlug(slug);
  return e && visibleOn(e, marketplace) ? e : undefined;
}

export async function getExperiencesByHost(hostSlug: string): Promise<Experience[]> {
  return (await source()).filter((e) => e.hostSlugs.includes(hostSlug));
}

/**
 * The retreats a Studio user may manage: an admin manages every retreat, a host
 * only their own. Used by the host dashboard so admins (who have no host slug of
 * their own) still see and edit the full catalogue.
 */
export async function getManagedExperiences(user: { role: string; hostSlug?: string }): Promise<Experience[]> {
  if (user.role === "admin") return source();
  return user.hostSlug ? getExperiencesByHost(user.hostSlug) : [];
}

export async function getExperiencesByCategory(
  categorySlug: string,
  marketplace: MarketplaceId = "paradise-beyond",
): Promise<Experience[]> {
  return onlyMarketplace(await source(), marketplace).filter((e) => e.categorySlugs.includes(categorySlug as never));
}

export async function getExperiencesByDestination(
  destinationSlug: string,
  marketplace: MarketplaceId = "paradise-beyond",
): Promise<Experience[]> {
  return onlyMarketplace(await source(), marketplace).filter((e) => e.destinationSlug === destinationSlug);
}

/** A marketplace's categories (default: Paradise Beyond's, unchanged). */
export async function getAllCategories(marketplace: MarketplaceId = "paradise-beyond"): Promise<Category[]> {
  return categoriesFor(marketplace);
}

export async function getAllDestinations(): Promise<Destination[]> {
  return DESTINATIONS;
}

// --- Hosts: DB-backed in live mode, seed in demo -----------------------------
let hostsCache: { at: number; data: Host[] } | null = null;

function mapHostRow(row: Record<string, unknown>): Host {
  const seed = HOSTS.find((h) => h.slug === row.slug);
  return {
    slug: row.slug as string,
    name: (row.name as string) ?? seed?.name ?? "",
    headline: (row.headline as string) ?? seed?.headline ?? "",
    bio: (row.bio as string) ?? seed?.bio ?? "",
    qualifications: (row.qualifications as string[]) ?? seed?.qualifications ?? [],
    specialisms: (row.specialisms as string[]) ?? seed?.specialisms ?? [],
    socials: Array.isArray(row.socials) ? (row.socials as { label: string; href: string }[]) : (seed?.socials ?? []),
    verified: Boolean(row.verified),
    brandColor: (row.brand_color as string) || undefined,
    logoUrl: (row.logo_url as string) || undefined,
    tagline: (row.tagline as string) || undefined,
    // The Host type routes images through img(seed); reuse the seed host's
    // curated seed when known, else a deterministic per-slug placeholder.
    imageSeed: seed?.imageSeed ?? `host-${row.slug as string}`,
    since: seed?.since ?? (row.created_at ? new Date(row.created_at as string).getFullYear() : new Date().getFullYear()),
  };
}

export async function getAllHosts(): Promise<Host[]> {
  if (!isSupabaseConfigured()) {
    const { OFFGRID_DEMO_HOSTS } = await import("@/lib/demo/offgridSamples");
    return [...HOSTS, ...OFFGRID_DEMO_HOSTS];
  }
  if (hostsCache && Date.now() - hostsCache.at < 15_000) return hostsCache.data;
  const { createAnonClient } = await import("@/lib/supabase/server");
  // Explicit display columns only — stripe_account_id/owner_id are revoked from
  // the anon role (migration 0016), and `select *` would fail on them.
  const { data, error } = await createAnonClient()
    .from("hosts")
    .select("slug, name, headline, bio, qualifications, specialisms, socials, verified, brand_color, logo_url, tagline, created_at")
    .order("name");
  if (error || !data) return HOSTS; // fail safe to seed
  const hosts = data.map(mapHostRow);
  hostsCache = { at: Date.now(), data: hosts };
  return hosts;
}

/** A single host by slug (live: hosts table; demo: seed). Falls back to seed. */
export async function getHost(slug: string): Promise<Host | undefined> {
  if (!slug) return undefined;
  const all = await getAllHosts();
  return all.find((h) => h.slug === slug) ?? HOSTS.find((h) => h.slug === slug);
}

export { nextOpenDeparture, upcomingDeparture };
