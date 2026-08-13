import type {
  Category,
  Destination,
  Experience,
  Host,
} from "@/lib/types";
import { CATEGORIES } from "./categories";
import { DESTINATIONS } from "./destinations";
import { HOSTS } from "./hosts";
import { EXPERIENCES } from "./experiences";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { nextOpenDeparture, upcomingDeparture } from "./helpers";

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

async function source(): Promise<Experience[]> {
  if (!isSupabaseConfigured()) return EXPERIENCES;
  // Small per-request-ish cache to avoid refetching the catalogue repeatedly
  // within a single render pass.
  if (cache && Date.now() - cache.at < 5000) return cache.data;
  const supa = await import("./supabaseRepository");
  const data = await supa.getAllExperiences();
  cache = { at: Date.now(), data };
  return data.length ? data : EXPERIENCES;
}

export interface ExperienceFilter {
  duration?: 7 | 14;
  category?: string;
  destination?: string;
  /** Month index 0-11 within the filter year, matched against any departure. */
  month?: number;
  /** Maximum "from" price in minor units. */
  maxPriceMinor?: number;
}

export async function getAllExperiences(): Promise<Experience[]> {
  return source();
}

export async function getFeaturedExperiences(limit = 6): Promise<Experience[]> {
  return (await source()).filter((e) => e.featured).slice(0, limit);
}

export async function filterExperiences(
  filter: ExperienceFilter,
): Promise<Experience[]> {
  const matched = (await source()).filter((e) => {
    if (filter.duration && e.duration !== filter.duration) return false;
    if (filter.category && !e.categorySlugs.includes(filter.category as never)) return false;
    if (filter.destination && e.destinationSlug !== filter.destination) return false;
    if (filter.maxPriceMinor && e.priceFromMinor > filter.maxPriceMinor) return false;
    if (filter.month !== undefined) {
      const hasMonth = e.departures.some((d) => {
        const m = new Date(d.startDate + "T00:00:00Z").getUTCMonth();
        return m === filter.month;
      });
      if (!hasMonth) return false;
    }
    return true;
  });
  // Featured experiences lead the listing; order is otherwise preserved
  // (Array.prototype.sort is stable).
  return matched.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
}

export async function getExperienceBySlug(slug: string): Promise<Experience | undefined> {
  return (await source()).find((e) => e.slug === slug);
}

export async function getExperiencesByHost(hostSlug: string): Promise<Experience[]> {
  return (await source()).filter((e) => e.hostSlugs.includes(hostSlug));
}

export async function getExperiencesByCategory(categorySlug: string): Promise<Experience[]> {
  return (await source()).filter((e) => e.categorySlugs.includes(categorySlug as never));
}

export async function getExperiencesByDestination(destinationSlug: string): Promise<Experience[]> {
  return (await source()).filter((e) => e.destinationSlug === destinationSlug);
}

export async function getAllCategories(): Promise<Category[]> {
  return CATEGORIES;
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
    // The Host type routes images through img(seed); reuse the seed host's
    // curated seed when known, else a deterministic per-slug placeholder.
    imageSeed: seed?.imageSeed ?? `host-${row.slug as string}`,
    since: seed?.since ?? (row.created_at ? new Date(row.created_at as string).getFullYear() : new Date().getFullYear()),
  };
}

export async function getAllHosts(): Promise<Host[]> {
  if (!isSupabaseConfigured()) return HOSTS;
  if (hostsCache && Date.now() - hostsCache.at < 15_000) return hostsCache.data;
  const { createAnonClient } = await import("@/lib/supabase/server");
  const { data, error } = await createAnonClient().from("hosts").select("*").order("name");
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
