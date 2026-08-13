import { z } from "zod";

/**
 * Retreat Builder draft — the shape the 16-step wizard produces.
 *
 * Money is captured in whole units (e.g. USD dollars) here because that's what
 * hosts think in; it's converted to integer minor units when the approved draft
 * is materialised into the normalised catalogue tables. Everything is optional
 * on a draft; `submitRetreatSchema` enforces what's required to submit.
 */

export type RetreatStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "rejected";

export interface RetreatDeparture {
  startDate: string;
  endDate: string;
  capacity: number;
}
export interface RetreatHighlight {
  title: string;
  description: string;
}
export interface RetreatItineraryDay {
  day: number;
  title: string;
  summary: string;
  items: string[];
}
export interface RetreatRoom {
  /** Hotel / property this option is at (optional — blank uses the retreat's property). */
  property?: string;
  name: string;
  description: string;
  occupancy: "single" | "shared" | "private";
  priceDeltaUsd: number;
}

export interface RetreatDraft {
  id: string;
  status: RetreatStatus;
  hostId?: string;
  reviewNotes?: string;
  // 1 Basics
  name: string;
  strapline: string;
  categorySlugs: string[];
  idealGuest: string[];
  story: string[];
  // 2 Duration
  duration: 7 | 14;
  /** True once the host has explicitly chosen the length (vs the 7-day default). */
  durationChosen?: boolean;
  // 3 Location
  destinationSlug: string;
  destinationName: string;
  country: string;
  locationLabel: string;
  // 4 Dates
  departures: RetreatDeparture[];
  // 5 Accommodation
  propertyName: string;
  propertyDescription: string;
  // 6 What's included
  inclusions: string[];
  exclusions: string[];
  // 7 Activities
  highlights: RetreatHighlight[];
  // 8 Itinerary
  itinerary: RetreatItineraryDay[];
  // 9 Rooms
  rooms: RetreatRoom[];
  // 10 Pricing
  currency: string;
  priceFromUsd: number;
  maxGroupSize: number;
  // 11 Deposit & payment
  depositUsd: number;
  balanceDueDays: number;
  allowDeposit: boolean;
  allowFull: boolean;
  // 12 Cancellation
  cancellationPolicy: string;
  // 13 Photos
  heroImageUrl: string;
  galleryUrls: string[];
  // 14 Host profile
  hostName: string;
  hostHeadline: string;
  hostBio: string;
  updatedAt: string;
}

export const DEFAULT_EXCLUSIONS = [
  "International flights",
  "Travel insurance",
  "Visa fees",
  "Personal purchases",
  "Unscheduled activities & excursions",
];

export function emptyDraft(id: string): RetreatDraft {
  return {
    id,
    status: "draft",
    name: "",
    strapline: "",
    categorySlugs: [],
    idealGuest: ["", "", ""],
    story: [""],
    duration: 7,
    destinationSlug: "zanzibar",
    destinationName: "Zanzibar",
    country: "Tanzania",
    locationLabel: "",
    departures: [{ startDate: "", endDate: "", capacity: 12 }],
    propertyName: "",
    propertyDescription: "",
    inclusions: [""],
    exclusions: [...DEFAULT_EXCLUSIONS],
    highlights: [{ title: "", description: "" }],
    itinerary: [],
    rooms: [{ name: "Shared Room", description: "", occupancy: "shared", priceDeltaUsd: 0 }],
    currency: "USD",
    priceFromUsd: 0,
    maxGroupSize: 12,
    depositUsd: 0,
    balanceDueDays: 45,
    allowDeposit: true,
    allowFull: true,
    cancellationPolicy:
      "Deposits are non-refundable. The balance is refundable up to 45 days before departure; within 45 days the booking is non-refundable. We recommend comprehensive travel insurance.",
    heroImageUrl: "",
    galleryUrls: [],
    hostName: "",
    hostHeadline: "",
    hostBio: "",
    updatedAt: "",
  };
}

/** Regenerate itinerary day slots to match the chosen duration, preserving text. */
export function resizeItinerary(draft: RetreatDraft): RetreatItineraryDay[] {
  const next: RetreatItineraryDay[] = [];
  for (let d = 1; d <= draft.duration; d++) {
    const existing = draft.itinerary.find((x) => x.day === d);
    next.push(existing ?? { day: d, title: "", summary: "", items: [""] });
  }
  return next;
}

/** Requirements to SUBMIT for approval (drafts can be incomplete). */
export const submitRetreatSchema = z.object({
  name: z.string().min(3, "Give your retreat a name"),
  strapline: z.string().min(10, "Add a short strapline"),
  categorySlugs: z.array(z.string()).min(1, "Choose at least one category"),
  duration: z.union([z.literal(7), z.literal(14)]),
  locationLabel: z.string().min(2, "Where does it take place?"),
  departures: z
    .array(z.object({ startDate: z.string().min(1), endDate: z.string().min(1), capacity: z.number().int().positive() }))
    .min(1, "Add at least one departure with dates"),
  propertyName: z.string().min(2, "Name the accommodation"),
  inclusions: z.array(z.string().min(1)).min(1, "List what's included"),
  priceFromUsd: z.number().positive("Set a starting price"),
  rooms: z.array(z.object({ name: z.string().min(1) })).min(1, "Add at least one room option"),
  hostName: z.string().min(2, "Add your host name"),
});

export type SubmitValidation = { ok: true } | { ok: false; errors: string[] };

export function validateForSubmit(draft: RetreatDraft): SubmitValidation {
  const res = submitRetreatSchema.safeParse(draft);
  if (res.success) return { ok: true };
  return { ok: false, errors: res.error.issues.map((i) => i.message) };
}
