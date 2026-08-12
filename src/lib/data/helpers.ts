import type { Experience } from "@/lib/types";

/**
 * Pure catalogue helpers with NO data-source imports, so they're safe to use in
 * client components (unlike repository.ts, which reaches server-only code).
 */

export function nextOpenDeparture(e: Experience) {
  return [...e.departures]
    .filter((d) => d.status === "open" || d.status === "waitlist")
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
}

/** The soonest upcoming departure regardless of status (for display). */
export function upcomingDeparture(e: Experience) {
  return [...e.departures].sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
}
