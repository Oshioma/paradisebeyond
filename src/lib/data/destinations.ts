import type { Destination } from "@/lib/types";

/**
 * We launch in Zanzibar, but the model is multi-destination from day one.
 * Nothing in the schema hard-codes a single place.
 */
export const DESTINATIONS: Destination[] = [
  {
    slug: "zanzibar",
    name: "Zanzibar",
    country: "Tanzania",
    region: "Unguja",
    summary: "Turquoise water, spice farms and Swahili soul off the coast of East Africa.",
    description:
      "An archipelago in the Indian Ocean where dhow sails still catch the wind and the reefs are close enough to swim to. Stone Town's alleys open onto white-sand beaches; spice farms scent the inland air. Zanzibar is where Paradise Beyond began.",
    imageSeed: "zanzibar-beach",
    featured: true,
  },
  {
    slug: "pemba",
    name: "Pemba",
    country: "Tanzania",
    region: "Pemba Island",
    summary: "The greener, quieter sister island — steep reefs and near-empty coves.",
    description:
      "Less travelled than Unguja, Pemba is hilly, green and ringed by some of the best wall-diving in the Indian Ocean. For those who want the archipelago at its most remote.",
    imageSeed: "pemba-green",
    featured: false,
  },
];

export function getDestination(slug: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.slug === slug);
}
