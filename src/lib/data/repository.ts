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
  return (await source()).filter((e) => {
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

export async function getAllHosts(): Promise<Host[]> {
  return HOSTS;
}

export { nextOpenDeparture, upcomingDeparture };
