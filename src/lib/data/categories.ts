import type { Category } from "@/lib/types";

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

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function categoryLabel(c: Category): string {
  return c.displayLabel ?? c.name;
}
