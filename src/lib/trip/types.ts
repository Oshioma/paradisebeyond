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

/** The Art. 9 fields — the ones we hold only while the trip needs them. */
export const HEALTH_FIELDS = ["dietary", "medical", "healthConsent", "healthConsentAt"] as const;

/** A trip is over once its departure's end date has passed. */
export function tripHasEnded(departureEndDate: string, now: Date = new Date()): boolean {
  return new Date(departureEndDate) < now;
}

/** True when a record still carries health data worth purging. */
export function hasHealthData(prep: TripPrep | null): boolean {
  return Boolean(prep && (prep.dietary || prep.medical || prep.healthConsent));
}

/**
 * Everything except the health answers. The rest of the questionnaire —
 * experience level, emergency contact, notes — is kept with the booking.
 */
export function withoutHealthData(prep: TripPrep): TripPrep {
  const out = { ...prep };
  for (const f of HEALTH_FIELDS) delete out[f];
  return out;
}
