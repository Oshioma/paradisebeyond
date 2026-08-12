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

/**
 * The repository is the single seam between the magazine and its data source.
 * Today it serves curated seed content (synchronously). When Supabase is wired,
 * a SupabaseRepository implementing the same shape drops in behind these
 * functions — pages already `await`, so nothing above this layer changes.
 */

export interface ExperienceFilter {
  duration?: 7 | 14;
  category?: string;
  destination?: string;
  /** Month index 0-11 within the filter year, matched against any departure. */
  month?: number;
  /** Maximum "from" price in minor units. */
  maxPriceMinor?: number;
}

function nextOpenDeparture(e: Experience) {
  return [...e.departures]
    .filter((d) => d.status === "open" || d.status === "waitlist")
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
}

/** The soonest upcoming departure regardless of status (for display). */
export function upcomingDeparture(e: Experience) {
  return [...e.departures].sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
}

export async function getAllExperiences(): Promise<Experience[]> {
  return EXPERIENCES;
}

export async function getFeaturedExperiences(limit = 6): Promise<Experience[]> {
  return EXPERIENCES.filter((e) => e.featured).slice(0, limit);
}

export async function filterExperiences(
  filter: ExperienceFilter,
): Promise<Experience[]> {
  return EXPERIENCES.filter((e) => {
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
  return EXPERIENCES.find((e) => e.slug === slug);
}

export async function getExperiencesByHost(hostSlug: string): Promise<Experience[]> {
  return EXPERIENCES.filter((e) => e.hostSlugs.includes(hostSlug));
}

export async function getExperiencesByCategory(categorySlug: string): Promise<Experience[]> {
  return EXPERIENCES.filter((e) => e.categorySlugs.includes(categorySlug as never));
}

export async function getExperiencesByDestination(destinationSlug: string): Promise<Experience[]> {
  return EXPERIENCES.filter((e) => e.destinationSlug === destinationSlug);
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

export { nextOpenDeparture };
