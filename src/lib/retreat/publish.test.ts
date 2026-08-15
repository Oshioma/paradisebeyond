import { describe, it, expect } from "vitest";
import { buildContent } from "./publish";
import { emptyDraft, type RetreatDraft } from "./schema";

function draftWith(overrides: Partial<RetreatDraft>): RetreatDraft {
  return { ...emptyDraft("draft-1"), name: "Test Retreat", ...overrides };
}

describe("buildContent — rooms (guards the room-less/unbookable regression)", () => {
  it("keeps every named accommodation option", () => {
    const draft = draftWith({
      rooms: [
        { name: "Garden Room", description: "", occupancy: "private", priceDeltaUsd: 0 },
        { name: "Sea-view Suite", description: "", occupancy: "private", priceDeltaUsd: 300 },
      ],
    });
    const c = buildContent(draft, "test-retreat", ["amina"]);
    expect(c.stay.roomTypes.map((r) => r.name)).toContain("Garden Room");
    expect(c.stay.roomTypes.map((r) => r.name)).toContain("Sea-view Suite");
    expect(c.stay.roomTypes).toHaveLength(2);
  });

  it("drops a whitespace-only room name (the bug that produced an unbookable listing)", () => {
    const draft = draftWith({
      rooms: [
        { name: "Real Room", description: "", occupancy: "private", priceDeltaUsd: 100 },
        { name: "   ", description: "", occupancy: "private", priceDeltaUsd: 0 },
      ],
    });
    const c = buildContent(draft, "test-retreat", []);
    expect(c.stay.roomTypes).toHaveLength(1);
    expect(c.stay.roomTypes[0].name).toBe("Real Room");
  });

  it("orders rooms highest price first, and converts USD deltas to minor units", () => {
    const draft = draftWith({
      rooms: [
        { name: "Cheap", description: "", occupancy: "shared", priceDeltaUsd: 50 },
        { name: "Pricey", description: "", occupancy: "private", priceDeltaUsd: 400 },
      ],
    });
    const c = buildContent(draft, "test-retreat", []);
    expect(c.stay.roomTypes[0].name).toBe("Pricey");
    expect(c.stay.roomTypes[0].priceDeltaMinor).toBe(40_000);
    expect(c.stay.roomTypes[1].priceDeltaMinor).toBe(5_000);
  });
});

describe("buildContent — itinerary (guards the dropped-activities regression)", () => {
  it("maps each day's activity items through, filtering only blanks", () => {
    const draft = draftWith({
      duration: 7,
      itinerary: [
        { day: 1, title: "Arrive", summary: "", items: ["Airport pickup", "Welcome dinner"] },
        { day: 2, title: "Ocean", summary: "", items: ["Morning session", "", "Sunset cruise"] },
      ],
    });
    const c = buildContent(draft, "test-retreat", []);
    expect(c.itinerary[0].items.map((i) => i.title)).toEqual(["Airport pickup", "Welcome dinner"]);
    // The blank middle item is filtered; the real ones survive on every day.
    expect(c.itinerary[1].items.map((i) => i.title)).toEqual(["Morning session", "Sunset cruise"]);
  });

  it("preserves day titles and day numbers", () => {
    const draft = draftWith({
      duration: 7,
      itinerary: [{ day: 1, title: "Arrive", summary: "", items: ["Pickup"] }],
    });
    const c = buildContent(draft, "test-retreat", []);
    expect(c.itinerary[0].day).toBe(1);
    expect(c.itinerary[0].title).toBe("Arrive");
  });
});

describe("buildContent — host + basics", () => {
  it("passes host slugs through to the content", () => {
    const draft = draftWith({
      rooms: [{ name: "Room", description: "", occupancy: "private", priceDeltaUsd: 0 }],
    });
    const c = buildContent(draft, "test-retreat", ["amina-yusuf"]);
    expect(c.hostSlugs).toEqual(["amina-yusuf"]);
  });
});
