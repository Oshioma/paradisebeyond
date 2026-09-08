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
  /**
   * Dietary and medical answers are "data concerning health" under UK GDPR
   * Art. 9, which we may only process on the guest's explicit consent. This
   * flag records that consent; `healthConsentAt` is when it was given, so we
   * can demonstrate it. Without consent those two fields are never stored —
   * see `saveQuestionnaire`, which drops them server-side.
   */
  healthConsent?: boolean;
  healthConsentAt?: string;
}

export const EXPERIENCE_LEVELS: { value: NonNullable<TripPrep["experienceLevel"]>; label: string }[] = [
  { value: "first-timer", label: "First-timer" },
  { value: "some", label: "Some experience" },
  { value: "experienced", label: "Experienced" },
];
