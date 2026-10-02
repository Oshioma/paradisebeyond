import { z } from "zod";
import type { RetreatDraft, SubmitValidation, SubmitError } from "@/lib/retreat/schema";
import { MAX_DAYS_PER_WEEK, MAX_HOURS_PER_DAY } from "./types";

/**
 * The "List your land" wizard (Spend Time Off Grid). It runs inside the shared
 * Retreat Builder shell — same autosave, uploads, review and publish pipeline —
 * with these steps instead of the retreat ones.
 */
export const OFFGRID_STEPS = [
  "About your place",
  "Location",
  "Photos",
  "Accommodation",
  "Food",
  "What guests contribute",
  "Typical tasks",
  "What guests learn",
  "Off-grid facilities",
  "Availability",
  "Minimum stay",
  "Price",
  "House & project rules",
  "Getting there",
  "Publish",
] as const;

export const OFFGRID_SUBMIT_STEP = OFFGRID_STEPS.length - 1;

const step = (label: (typeof OFFGRID_STEPS)[number]) => OFFGRID_STEPS.indexOf(label);

/** Requirements to submit an off-grid listing. */
export function validateOffGridForSubmit(d: RetreatDraft): SubmitValidation {
  const o = d.offGrid;
  const errors: SubmitError[] = [];
  const add = (cond: boolean, message: string, at: number) => {
    if (!cond) errors.push({ message, step: at });
  };
  add((d.name ?? "").trim().length >= 3, "Give your place a name.", step("About your place"));
  add((d.categorySlugs ?? []).length > 0, "Choose at least one kind of place.", step("About your place"));
  add((d.hostName ?? "").trim().length >= 2, "Add your name as host.", step("About your place"));
  add((d.locationLabel ?? "").trim().length >= 2, "Say where your place is.", step("Location"));
  if (!o) {
    errors.push({ message: "Fill in the stay details.", step: step("Accommodation") });
    return { ok: false, errors };
  }
  add(o.stay.accommodationType.trim().length >= 2, "Say what kind of accommodation guests get.", step("Accommodation"));
  add(
    z.number().min(0).max(MAX_HOURS_PER_DAY).safeParse(o.contribution.hoursPerDay).success,
    `Contribution hours must be between 0 and ${MAX_HOURS_PER_DAY} a day.`,
    step("What guests contribute"),
  );
  add(
    z.number().int().min(0).max(MAX_DAYS_PER_WEEK).safeParse(o.contribution.daysPerWeek).success,
    `Contribution days must be between 0 and ${MAX_DAYS_PER_WEEK} a week.`,
    step("What guests contribute"),
  );
  add(o.contribution.description.trim().length >= 10, "Describe what guests will help with.", step("What guests contribute"));
  const windows = (d.departures ?? []).filter((w) => w.startDate && w.endDate);
  add(windows.length > 0, "Add at least one period you can host.", step("Availability"));
  add(windows.every((w) => w.endDate > w.startDate && w.capacity > 0), "Each period needs an end after its start, and at least one place.", step("Availability"));
  add(Number.isInteger(o.stay.minNights) && o.stay.minNights >= 1, "Set a minimum stay of at least 1 night.", step("Minimum stay"));
  add(!o.stay.maxNights || o.stay.maxNights >= o.stay.minNights, "The maximum stay can't be shorter than the minimum.", step("Minimum stay"));
  add(Number.isFinite(o.pricing.amountMinor) && o.pricing.amountMinor >= 0, "Set a price (or 0 for a free, exchange-only stay).", step("Price"));
  return errors.length ? { ok: false, errors } : { ok: true };
}
