import { describe, it, expect } from "vitest";
import { hasHealthData, tripHasEnded, withoutHealthData, type TripPrep } from "@/lib/trip/types";

/**
 * Dietary and medical answers are special category data (UK GDPR Art. 9). We
 * hold them only while the trip needs them, so these rules decide when they go.
 */

const NOW = new Date("2026-09-08T12:00:00Z");

const FULL: TripPrep = {
  dietary: "Severe nut allergy",
  medical: "Asthma — inhaler in day bag",
  healthConsent: true,
  healthConsentAt: "2026-08-01T09:00:00Z",
  experienceLevel: "some",
  emergencyName: "Sam Traveller",
  emergencyPhone: "+44 7700 900000",
  notes: "Window seat if possible",
  updatedAt: "2026-08-01T09:00:00Z",
};

describe("tripHasEnded", () => {
  it("is true once the end date has passed", () => {
    expect(tripHasEnded("2026-09-01", NOW)).toBe(true);
  });

  it("is false while the trip is still to come", () => {
    expect(tripHasEnded("2026-10-01", NOW)).toBe(false);
  });

  it("keeps the data on the final day — the guest is still on the trip", () => {
    // The date parses to midnight, so a trip ending today is not yet over at noon.
    expect(tripHasEnded("2026-09-08", new Date("2026-09-08T00:00:00Z"))).toBe(false);
  });
});

describe("hasHealthData", () => {
  it("spots dietary, medical or a lingering consent flag", () => {
    expect(hasHealthData({ dietary: "Coeliac" })).toBe(true);
    expect(hasHealthData({ medical: "Bad knee" })).toBe(true);
    expect(hasHealthData({ healthConsent: true })).toBe(true);
  });

  it("is false for a record with nothing to purge", () => {
    expect(hasHealthData(null)).toBe(false);
    expect(hasHealthData({})).toBe(false);
    expect(hasHealthData({ emergencyName: "Sam", experienceLevel: "some" })).toBe(false);
  });
});

describe("withoutHealthData", () => {
  const purged = withoutHealthData(FULL);

  it("removes every health field, including the consent record", () => {
    expect(purged.dietary).toBeUndefined();
    expect(purged.medical).toBeUndefined();
    expect(purged.healthConsent).toBeUndefined();
    expect(purged.healthConsentAt).toBeUndefined();
    expect(hasHealthData(purged)).toBe(false);
  });

  it("keeps the rest of the questionnaire", () => {
    expect(purged.experienceLevel).toBe("some");
    expect(purged.emergencyName).toBe("Sam Traveller");
    expect(purged.emergencyPhone).toBe("+44 7700 900000");
    expect(purged.notes).toBe("Window seat if possible");
  });

  it("does not mutate the record it was given", () => {
    expect(FULL.dietary).toBe("Severe nut allergy");
  });

  it("is safe to run twice", () => {
    expect(withoutHealthData(purged)).toEqual(purged);
  });
});
