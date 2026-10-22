import { describe, expect, it } from "vitest";
import { PARADISE_BEYOND, SPEND_TIME_OFF_GRID } from "./config";
import { hostWords, onSite } from "./hostSite";

describe("host area per site", () => {
  const items = [
    { id: "pb", marketplace: "paradise-beyond" },
    { id: "old" }, // older rows have no marketplace: Paradise Beyond
    { id: "og", marketplace: "spendtimeoffgrid" },
    { id: "odd", marketplace: "something-else" },
  ];

  it("shows only the current site's items", () => {
    expect(onSite(items, "spendtimeoffgrid").map((i) => i.id)).toEqual(["og"]);
    expect(onSite(items, "paradise-beyond").map((i) => i.id)).toEqual(["pb", "old", "odd"]);
  });

  it("keeps Paradise Beyond's wording and uses Spend Time Off Grid's own", () => {
    expect(hostWords(PARADISE_BEYOND)).toMatchObject({ area: "Host Studio", myListings: "My Retreats", newListing: "+ New retreat" });
    expect(hostWords(SPEND_TIME_OFF_GRID)).toMatchObject({ myListings: "My listings", newListing: "+ List your land", guests: "travellers" });
    expect(JSON.stringify(hostWords(SPEND_TIME_OFF_GRID))).not.toMatch(/retreat/i);
  });
});
