/**
 * Spend Time Off Grid listing details.
 *
 * Stored inside the existing `experiences.content` JSON (alongside the shared
 * editorial fields: name, story, photos, host, reviews…), so no new tables are
 * needed. MONEY is integer minor units, like everywhere else.
 */

export type PriceUnit = "day" | "week" | "stay";
export type PhysicalDifficulty = "gentle" | "moderate" | "demanding";
export type Privacy = "private" | "shared";

export interface OffGridPricing {
  /** How the host prices the stay. */
  unit: PriceUnit;
  /** Price per unit in minor units. 0 = a free / exchange-only stay. */
  amountMinor: number;
}

export interface OffGridDetails {
  contribution: {
    /** Hours of help per day the host asks for (0–4 in the UI). */
    hoursPerDay: number;
    /** Days per week that include contribution (0–7). */
    daysPerWeek: number;
    description: string;
    typicalTasks: string[];
    physicalDifficulty: PhysicalDifficulty;
    skillsRequired: string[];
    skillsYouCanLearn: string[];
  };
  stay: {
    minNights: number;
    /** Optional cap; absent = open-ended within an availability window. */
    maxNights?: number;
    accommodationType: string;
    privacy: Privacy;
    description: string;
  };
  food: {
    mealsIncluded: boolean;
    mealsPerDay: number;
    dietaryOptions: string[];
    description: string;
  };
  /** Keys from OFF_GRID_FACILITIES. */
  facilities: string[];
  /** "Life off grid" — free text about the daily rhythm. */
  lifeOffGrid: string;
  practical: {
    gettingThere: string;
    nearestAirport: string;
    transfersAvailable: boolean;
    whatToBring: string[];
    childrenAllowed: boolean;
    petsAllowed: boolean;
    accessibility: string;
    languages: string[];
    notes: string;
  };
  houseRules: string;
  cancellationPolicy: string;
  pricing: OffGridPricing;
}

/** Off-grid facilities a host can tick. Keep the list short and human. */
export const OFF_GRID_FACILITIES: { key: string; label: string; group: "Power" | "Water" | "Washing" | "Connectivity" }[] = [
  { key: "solar", label: "Solar power", group: "Power" },
  { key: "mains", label: "Mains power", group: "Power" },
  { key: "generator", label: "Generator", group: "Power" },
  { key: "no-electricity", label: "No electricity", group: "Power" },
  { key: "well-water", label: "Well water", group: "Water" },
  { key: "rainwater", label: "Rainwater", group: "Water" },
  { key: "hot-water", label: "Hot water", group: "Water" },
  { key: "composting-toilet", label: "Composting toilet", group: "Washing" },
  { key: "conventional-toilet", label: "Conventional toilet", group: "Washing" },
  { key: "shower", label: "Shower", group: "Washing" },
  { key: "internet", label: "Internet", group: "Connectivity" },
  { key: "wifi", label: "Wi-Fi", group: "Connectivity" },
  { key: "mobile-signal", label: "Mobile signal", group: "Connectivity" },
  { key: "no-connectivity", label: "No connectivity", group: "Connectivity" },
];

export function facilityLabel(key: string): string {
  return OFF_GRID_FACILITIES.find((f) => f.key === key)?.label ?? key;
}

export const DIFFICULTY_LABEL: Record<PhysicalDifficulty, string> = {
  gentle: "Gentle",
  moderate: "Moderate",
  demanding: "Physically demanding",
};

/** UI bounds for the contribution sliders. Policy limits can come later. */
export const MAX_HOURS_PER_DAY = 4;
export const MAX_DAYS_PER_WEEK = 7;

export function emptyOffGrid(): OffGridDetails {
  return {
    contribution: {
      hoursPerDay: 3,
      daysPerWeek: 5,
      description: "",
      typicalTasks: [""],
      physicalDifficulty: "moderate",
      skillsRequired: [],
      skillsYouCanLearn: [""],
    },
    stay: { minNights: 7, accommodationType: "", privacy: "private", description: "" },
    food: { mealsIncluded: true, mealsPerDay: 3, dietaryOptions: [], description: "" },
    facilities: [],
    lifeOffGrid: "",
    practical: {
      gettingThere: "",
      nearestAirport: "",
      transfersAvailable: false,
      whatToBring: [""],
      childrenAllowed: false,
      petsAllowed: false,
      accessibility: "",
      languages: ["English"],
      notes: "",
    },
    houseRules: "",
    cancellationPolicy:
      "Free cancellation up to 14 days before arrival. Within 14 days of arrival the booking is non-refundable unless the host can re-fill your place.",
    pricing: { unit: "day", amountMinor: 0 },
  };
}
