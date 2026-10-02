import { describe, it, expect } from "vitest";
import { buildContent } from "@/lib/retreat/publish";
import { emptyDraft, validateForSubmit, type RetreatDraft } from "@/lib/retreat/schema";
import { emptyOffGrid } from "./types";
import { OFFGRID_STEPS } from "./schema";

function offGridDraft(patch: Partial<RetreatDraft> = {}): RetreatDraft {
  const o = emptyOffGrid();
  o.stay.accommodationType = "Hut";
  o.contribution.description = "Mornings in the food forest.";
  o.pricing = { unit: "day", amountMinor: 2200 };
  return {
    ...emptyDraft("d1"),
    marketplace: "spendtimeoffgrid",
    name: "Tropical permaculture farm",
    categorySlugs: ["permaculture"],
    locationLabel: "Pemba Island, Tanzania",
    hostName: "Mwanaisha",
    departures: [{ startDate: "2026-11-01", endDate: "2027-01-31", capacity: 3 }],
    offGrid: o,
    ...patch,
  };
}

describe("buildContent for an off-grid listing", () => {
  const c = buildContent(offGridDraft(), "farm", ["mwanaisha"]);

  it("is tagged with its marketplace and carries the off-grid details", () => {
    expect(c.marketplace).toBe("spendtimeoffgrid");
    expect(c.offGrid?.contribution.hoursPerDay).toBe(3);
    expect(c.offGrid?.pricing).toEqual({ unit: "day", amountMinor: 2200 });
  });

  it("availability windows become bookable departures, paid in full (no deposit)", () => {
    expect(c.departures).toHaveLength(1);
    expect(c.departures[0]).toMatchObject({ startDate: "2026-11-01", endDate: "2027-01-31", capacity: 3, depositMinor: 0, priceFromMinor: 2200 });
  });

  it("always has exactly one bookable room — the accommodation", () => {
    expect(c.stay.roomTypes).toHaveLength(1);
    expect(c.stay.roomTypes[0]).toMatchObject({ name: "Hut", occupancy: "private", priceDeltaMinor: 0 });
  });

  it("drops blank list entries", () => {
    expect(c.offGrid?.contribution.typicalTasks).toEqual([]);
  });

  it("a Paradise Beyond draft is unaffected", () => {
    const pb = buildContent({ ...emptyDraft("p"), name: "Retreat" }, "retreat", []);
    expect(pb.marketplace).toBeUndefined();
    expect(pb.offGrid).toBeUndefined();
  });
});

describe("off-grid submit validation", () => {
  it("accepts a complete listing", () => {
    expect(validateForSubmit(offGridDraft())).toEqual({ ok: true });
  });

  it("allows a free stay (price 0)", () => {
    const d = offGridDraft();
    d.offGrid!.pricing.amountMinor = 0;
    expect(validateForSubmit(d).ok).toBe(true);
  });

  it("allows 0 contribution hours but not more than 4", () => {
    const d = offGridDraft();
    d.offGrid!.contribution.hoursPerDay = 0;
    expect(validateForSubmit(d).ok).toBe(true);
    d.offGrid!.contribution.hoursPerDay = 5;
    expect(validateForSubmit(d).ok).toBe(false);
  });

  it("points each error at the step that fixes it", () => {
    const d = offGridDraft({ locationLabel: "", departures: [] });
    const v = validateForSubmit(d);
    expect(v.ok).toBe(false);
    if (v.ok) return;
    const steps = v.errors.map((e) => OFFGRID_STEPS[e.step]);
    expect(steps).toContain("Location");
    expect(steps).toContain("Availability");
  });

  it("rejects a max stay shorter than the min", () => {
    const d = offGridDraft();
    d.offGrid!.stay.minNights = 14;
    d.offGrid!.stay.maxNights = 7;
    expect(validateForSubmit(d).ok).toBe(false);
  });
});
