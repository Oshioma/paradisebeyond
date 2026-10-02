import { describe, it, expect } from "vitest";
import {
  PARADISE_BEYOND,
  SPEND_TIME_OFF_GRID,
  brandForHost,
  dedicatedBrandForHost,
  getBrandById,
  isPreviewHost,
  marketplaceOf,
} from "./config";
import { isSitePagePath, sitePath } from "./paths";
import { brandMetadata } from "./metadata";

describe("brandForHost — domain → brand", () => {
  it("spendtimeoffgrid.com and www resolve to Spend Time Off Grid", () => {
    expect(brandForHost("spendtimeoffgrid.com").id).toBe("spendtimeoffgrid");
    expect(brandForHost("www.spendtimeoffgrid.com").id).toBe("spendtimeoffgrid");
  });

  it("is case- and port-insensitive", () => {
    expect(brandForHost("WWW.SpendTimeOffGrid.com:443").id).toBe("spendtimeoffgrid");
  });

  it("Paradise Beyond's domains and anything unknown stay Paradise Beyond", () => {
    for (const h of ["paradisebeyond.com", "www.paradisebeyond.com", "amina.paradisebeyond.com", "aminaretreats.com", "", undefined]) {
      expect(brandForHost(h).id).toBe("paradise-beyond");
    }
  });

  it("doesn't match look-alike hosts", () => {
    expect(dedicatedBrandForHost("spendtimeoffgrid.com.evil.io")).toBeNull();
    expect(dedicatedBrandForHost("notspendtimeoffgrid.com")).toBeNull();
    expect(dedicatedBrandForHost("shop.spendtimeoffgrid.com")).toBeNull();
  });
});

describe("preview override (?site= / cookie)", () => {
  it("is honoured on localhost and *.vercel.app", () => {
    expect(brandForHost("localhost", "spendtimeoffgrid").id).toBe("spendtimeoffgrid");
    expect(brandForHost("paradise-git-branch.vercel.app", "spendtimeoffgrid").id).toBe("spendtimeoffgrid");
  });

  it("is ignored on production domains (can't re-skin a live site)", () => {
    expect(brandForHost("www.paradisebeyond.com", "spendtimeoffgrid").id).toBe("paradise-beyond");
    expect(brandForHost("spendtimeoffgrid.com", "paradise-beyond").id).toBe("spendtimeoffgrid");
  });

  it("ignores unknown brand ids", () => {
    expect(brandForHost("localhost", "nope").id).toBe("paradise-beyond");
  });

  it("knows which hosts are preview hosts", () => {
    expect(isPreviewHost("localhost:3000")).toBe(true);
    expect(isPreviewHost("x.vercel.app")).toBe(true);
    expect(isPreviewHost("spendtimeoffgrid.com")).toBe(false);
  });
});

describe("brand configuration", () => {
  it("Spend Time Off Grid has a fixed 15% commission; Paradise Beyond uses its rules", () => {
    expect(SPEND_TIME_OFF_GRID.fixedCommissionBps).toBe(1500);
    expect(PARADISE_BEYOND.fixedCommissionBps).toBeNull();
  });

  it("each brand has its own contact address", () => {
    expect(SPEND_TIME_OFF_GRID.contactEmail).toBe("offgrid@guestlist.net");
    expect(PARADISE_BEYOND.contactEmail).toBe("paradisebeyond@guestlist.net");
  });

  it("Spend Time Off Grid's canonical origin is its own domain", () => {
    expect(SPEND_TIME_OFF_GRID.canonicalOrigin).toBe("https://spendtimeoffgrid.com");
  });

  it("listings without a marketplace are Paradise Beyond", () => {
    expect(marketplaceOf({})).toBe("paradise-beyond");
    expect(marketplaceOf({ marketplace: "spendtimeoffgrid" })).toBe("spendtimeoffgrid");
    expect(marketplaceOf({ marketplace: "bogus" })).toBe("paradise-beyond");
    expect(getBrandById("bogus").id).toBe("paradise-beyond");
  });
});

describe("metadata per brand", () => {
  it("Paradise Beyond keeps its original title and description", () => {
    const m = brandMetadata(PARADISE_BEYOND);
    expect(m.title).toEqual({ default: "Paradise Beyond — Come for more than a holiday", template: "%s · Paradise Beyond" });
    expect(m.description).toBe("Curated 7 & 14-day experiences in extraordinary places. Come for more than a holiday.");
  });

  it("Spend Time Off Grid has its own title, description and canonical base", () => {
    const m = brandMetadata(SPEND_TIME_OFF_GRID);
    expect(m.title).toEqual({
      default: "Spend Time Off Grid | Farms, Homesteads & Off-Grid Experiences",
      template: "%s · Spend Time Off Grid",
    });
    expect(String(m.description)).toContain("Stay on farms, homesteads and off-grid projects");
    expect(m.metadataBase?.toString()).toBe("https://spendtimeoffgrid.com/");
  });
});

describe("[site] rewrite paths", () => {
  it("public marketing paths are served per brand", () => {
    for (const p of ["/", "/experiences", "/experiences/x", "/categories/farms", "/host", "/host/apply", "/hosts/a", "/saved", "/terms", "/privacy", "/signup", "/destinations/zanzibar"]) {
      expect(isSitePagePath(p)).toBe(true);
    }
  });

  it("app areas are not rewritten", () => {
    for (const p of ["/account", "/book/x", "/studio", "/desk", "/login", "/api/img", "/r/x", "/hostsx", "/experiencesx"]) {
      expect(isSitePagePath(p)).toBe(false);
    }
  });

  it("maps to the brand segment", () => {
    expect(sitePath("spendtimeoffgrid", "/")).toBe("/spendtimeoffgrid");
    expect(sitePath("paradise-beyond", "/experiences/a")).toBe("/paradise-beyond/experiences/a");
  });
});
