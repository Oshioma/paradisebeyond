import type { Experience } from "@/lib/types";
import { DESTINATIONS } from "@/lib/data/destinations";
import { emptyDraft, DEFAULT_EXCLUSIONS, type RetreatDraft } from "./schema";

/**
 * Build a fresh, editable wizard draft pre-filled from an existing experience —
 * the inverse of publish.ts `buildContent`. Used by the admin "Start from this
 * sample" shortcut so a good-looking sample can be turned into a real retreat by
 * editing rather than typing from a blank wizard.
 *
 * Photos are resolved and filled in by the caller (it needs DB access to look up
 * any real uploaded override per seed), so this leaves the URL fields blank.
 * Money comes back from minor units to whole units.
 */
const minorToUsd = (m: number) => Math.round(Number(m) || 0) / 100;

export function draftFromExperience(e: Experience, id: string): RetreatDraft {
  const base = emptyDraft(id);
  const dest = DESTINATIONS.find((d) => d.slug === e.destinationSlug);

  const hotels = e.stay?.hotels?.length
    ? e.stay.hotels.map((h) => ({ name: h.name, description: h.description ?? "" }))
    : e.stay?.property
      ? [{ name: e.stay.property, description: e.stay.description ?? "" }]
      : base.hotels;

  const rooms = (e.stay?.roomTypes ?? []).map((r) => ({
    property: r.property,
    name: r.name,
    description: r.description ?? "",
    occupancy: r.occupancy,
    priceDeltaUsd: minorToUsd(r.priceDeltaMinor),
  }));

  const itinerary = (e.itinerary ?? []).map((d) => ({
    day: d.day,
    title: d.title,
    summary: d.summary ?? "",
    items: (d.items ?? []).map((it) => it.title).filter(Boolean),
  }));

  const departures = (e.departures ?? [])
    .map((d) => ({ startDate: d.startDate, endDate: d.endDate, capacity: d.capacity }))
    .filter((d) => d.startDate && d.endDate);

  const idealGuest = (e.forYouIf ?? []).slice();
  while (idealGuest.length < 3) idealGuest.push("");

  const firstDep = e.departures?.[0];

  return {
    ...base,
    name: e.name ? `${e.name} (my version)` : "",
    strapline: e.strapline ?? "",
    categorySlugs: [...(e.categorySlugs ?? [])],
    idealGuest,
    story: e.story?.length ? [...e.story] : [""],
    duration: e.duration,
    durationChosen: true,
    destinationSlug: e.destinationSlug || base.destinationSlug,
    destinationName: dest?.name ?? base.destinationName,
    country: dest?.country ?? base.country,
    locationLabel: e.location ?? "",
    departures: departures.length ? departures : base.departures,
    hotels,
    inclusions: e.inclusions?.length ? [...e.inclusions] : base.inclusions,
    exclusions: e.exclusions?.length ? [...e.exclusions] : [...DEFAULT_EXCLUSIONS],
    highlights: e.highlights?.length
      ? e.highlights.map((h) => ({ title: h.title, description: h.description }))
      : base.highlights,
    itinerary,
    rooms: rooms.length ? rooms : base.rooms,
    currency: e.currency || "USD",
    priceFromUsd: minorToUsd(e.priceFromMinor),
    maxGroupSize: e.maxGroupSize || base.maxGroupSize,
    depositUsd: minorToUsd(firstDep?.depositMinor ?? 0),
    balanceDueDays: firstDep?.balanceDueDays ?? base.balanceDueDays,
    // Photos are populated by the caller (see startDraftFromSample).
    heroImageUrl: "",
    galleryUrls: [],
  };
}
