import type { Category } from "@/lib/types";
import type { MarketplaceId } from "@/lib/brand/config";

/**
 * Categories are data, not hard-coded UI. The homepage may show a different
 * label for a category than its canonical name (the brief lists "Connection"
 * on the homepage and "Work" in the product spec — both are expressed here).
 */
export const CATEGORIES: Category[] = [
  {
    slug: "wellness",
    name: "Wellness",
    tagline: "Yoga, meditation, detox, sound healing.",
    description:
      "Slow mornings, salt air and practices that put you back together. Wellness experiences are built around rest, movement and stillness.",
    imageSeed: "wellness-yoga",
  },
  {
    slug: "adventure",
    name: "Adventure",
    tagline: "Diving, kitesurfing, sailing, hiking.",
    description:
      "For the ones who'd rather be in the water than beside it. Adventure experiences move — reefs, wind, open ocean and long horizons.",
    imageSeed: "adventure-dive",
  },
  {
    slug: "family",
    name: "Family",
    tagline: "Adventure weeks and nature for all ages.",
    description:
      "Time together that everyone actually remembers. Family experiences balance wonder for children with real rest for parents.",
    imageSeed: "family-beach",
  },
  {
    slug: "food",
    name: "Food",
    tagline: "Cooking, spice, farm-to-table.",
    description:
      "Zanzibar is the Spice Island. Food experiences take you from the farm and the market to the fire and the table.",
    imageSeed: "food-spice",
  },
  {
    slug: "creative",
    name: "Creative",
    tagline: "Photography, writing, art and music.",
    description:
      "Make something while the light is this good. Creative experiences pair craft with place, mentored by working artists.",
    imageSeed: "creative-photo",
  },
  {
    slug: "nature",
    name: "Nature",
    tagline: "Conservation, marine life and wildlife.",
    description:
      "Get close to the living reef and the forest. Nature experiences are led by conservationists and marine scientists.",
    imageSeed: "nature-reef",
  },
  {
    slug: "work",
    name: "Work",
    displayLabel: "Connection",
    tagline: "Founder, team and remote-work retreats.",
    description:
      "Take the team somewhere that changes the conversation. Work experiences blend focused sessions with genuine connection.",
    imageSeed: "work-retreat",
  },
  {
    slug: "transformation",
    name: "Transformation",
    tagline: "Fitness, personal development, lifestyle.",
    description:
      "Give yourself the fourteen days it actually takes. Transformation experiences are structured programmes with real outcomes.",
    imageSeed: "transformation-run",
  },
  {
    slug: "paradise-holidays",
    name: "Paradise Holidays",
    tagline: "Curated holidays, beautifully arranged.",
    description:
      "Not every trip is a retreat. Paradise Holidays are curated journeys — accommodation, transfers and selected experiences, handled.",
    imageSeed: "paradise-dhow",
  },
];

/**
 * Spend Time Off Grid categories. Kept as data (like Paradise Beyond's) so the
 * list, copy and imagery are edited here, and each card's photo is replaceable
 * in Desk → Media (slot = imageSeed).
 */
const og = (slug: Category["slug"], name: string, tagline: string, description: string): Category => ({
  slug,
  name,
  tagline,
  description,
  imageSeed: `stog-cat-${slug}`,
  marketplace: "spendtimeoffgrid",
});

export const OFF_GRID_CATEGORIES: Category[] = [
  og("farms", "Farms", "Harvests, animals and early mornings.", "Working farms where you help with the season's work and eat what the land gives."),
  og("permaculture", "Permaculture", "Food forests and closed loops.", "Designed landscapes that feed people and soil. Learn the patterns by working inside them."),
  og("homesteads", "Homesteads", "Self-reliant living, by hand.", "Small households living close to the land — wood, water, food and fixing things yourself."),
  og("eco-villages", "Eco Villages", "Shared land, shared tables.", "Intentional communities trying another way of living together. Join the rhythm for a while."),
  og("natural-building", "Natural Building", "Cob, straw, timber and lime.", "Build with earth and hands. Projects raising homes, ovens and shelters from local materials."),
  og("conservation", "Conservation", "Protecting what's wild.", "Habitat restoration, species monitoring and the slow work of keeping places alive."),
  og("animal-care", "Animal Care", "Sanctuaries, herds and hives.", "Spend your days with animals — feeding, mucking out, healing and handling."),
  og("rewilding", "Rewilding", "Letting land find its way back.", "Projects returning land to nature — tree planting, wetland work and patient observation."),
  og("community-projects", "Community Projects", "Work alongside local people.", "Gardens, schools, kitchens and workshops run by and for their communities."),
  og("retreat-centres", "Retreat Centres", "Quiet places that need many hands.", "Retreat and gathering spaces where you help run the place in exchange for being part of it."),
  og("remote-islands", "Remote Islands", "Far out, slow and salty.", "Island projects where the boat schedule sets the pace of the week."),
  og("sailing", "Sailing / Liveaboard", "Crew, cook, learn the ropes.", "Boats and liveaboard projects where you help sail, maintain and live on the water."),
  og("sustainable-living", "Sustainable Living", "Lighter ways to live.", "Off-grid systems, zero-waste kitchens and low-impact homes to learn from first-hand."),
];

/** Every category across marketplaces (for lookups by slug). */
export const ALL_CATEGORIES: Category[] = [...CATEGORIES, ...OFF_GRID_CATEGORIES];

export function getCategory(slug: string): Category | undefined {
  return ALL_CATEGORIES.find((c) => c.slug === slug);
}

export function offGridCategories(): Category[] {
  return OFF_GRID_CATEGORIES;
}

/** The categories a marketplace offers (Paradise Beyond's list is unchanged). */
export function categoriesFor(marketplace: MarketplaceId): Category[] {
  return marketplace === "spendtimeoffgrid" ? OFF_GRID_CATEGORIES : CATEGORIES;
}

/** The marketplace a category belongs to. */
export function categoryMarketplace(c: Category): MarketplaceId {
  return c.marketplace ?? "paradise-beyond";
}

export function categoryLabel(c: Category): string {
  return c.displayLabel ?? c.name;
}
