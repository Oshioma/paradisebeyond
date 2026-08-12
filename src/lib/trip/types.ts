/**
 * Client-safe trip-prep types & constants (no server-only imports), so client
 * components can use them without pulling in the demo-state/cookies chain.
 */

export interface TripPrep {
  dietary?: string;
  experienceLevel?: "first-timer" | "some" | "experienced";
  medical?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  notes?: string;
  updatedAt?: string;
}

export const EXPERIENCE_LEVELS: { value: NonNullable<TripPrep["experienceLevel"]>; label: string }[] = [
  { value: "first-timer", label: "First-timer" },
  { value: "some", label: "Some experience" },
  { value: "experienced", label: "Experienced" },
];
