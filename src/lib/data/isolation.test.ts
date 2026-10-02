import { describe, it, expect, beforeAll } from "vitest";
import type { Experience } from "@/lib/types";
import { matchesFilter, onlyMarketplace, visibleOn, hostVisibleOn } from "./filter";
import { CATEGORIES, OFF_GRID_CATEGORIES, categoriesFor, categoryMarketplace } from "./categories";
import { marketplaceOf } from "@/lib/brand/config";
import { OFFGRID_DEMO_EXPERIENCES } from "@/lib/demo/offgridSamples";
import { EXPERIENCES } from "./experiences";

/**
 * Marketplace isolation: Paradise Beyond must never surface Spend Time Off Grid
 * inventory and vice versa. Exercised against the real repository in demo mode
 * (no Supabase env), where both marketplaces' sample listings are loaded.
 */

const PB = "paradise-beyond" as const;
const STOG = "spendtimeoffgrid" as const;
const isStog = (e: Experience) => marketplaceOf(e) === STOG;
const isPb = (e: Experience) => marketplaceOf(e) === PB;

beforeAll(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});

describe("pure filters", () => {
  const pb = EXPERIENCES[0];
  const og = OFFGRID_DEMO_EXPERIENCES[0];

  it("matchesFilter defaults to Paradise Beyond", () => {
    expect(matchesFilter(pb, {})).toBe(true);
    expect(matchesFilter(og, {})).toBe(false);
  });

  it("matchesFilter only matches the requested marketplace", () => {
    expect(matchesFilter(og, { marketplace: STOG })).toBe(true);
    expect(matchesFilter(pb, { marketplace: STOG })).toBe(false);
  });

  it("onlyMarketplace / visibleOn", () => {
    const mixed = [pb, og];
    expect(onlyMarketplace(mixed, PB)).toEqual([pb]);
    expect(onlyMarketplace(mixed, STOG)).toEqual([og]);
    expect(visibleOn(og, PB)).toBe(false);
  });

  it("host profiles show only where the host has listings", () => {
    expect(hostVisibleOn([pb], PB)).toBe(true);
    expect(hostVisibleOn([pb], STOG)).toBe(false);
    expect(hostVisibleOn([og], PB)).toBe(false);
    expect(hostVisibleOn([og], STOG)).toBe(true);
    expect(hostVisibleOn([pb, og], STOG)).toBe(true);
    // A host with no listings keeps Paradise Beyond's existing behaviour only.
    expect(hostVisibleOn([], PB)).toBe(true);
    expect(hostVisibleOn([], STOG)).toBe(false);
  });

  it("off-grid search filters only match off-grid listings", () => {
    expect(matchesFilter(pb, { maxHours: 4 })).toBe(false);
    expect(matchesFilter(pb, { stayNights: 7 })).toBe(false);
  });
});

describe("off-grid search", () => {
  const farm = OFFGRID_DEMO_EXPERIENCES.find((e) => e.slug === "tropical-permaculture-farm-pemba")!; // 3 hrs, min 7
  const cob = OFFGRID_DEMO_EXPERIENCES.find((e) => e.slug === "cob-house-alentejo")!; // 4 hrs, min 14
  const wales = OFFGRID_DEMO_EXPERIENCES.find((e) => e.slug === "welsh-hill-farm-winter")!; // 10–30 nights
  const f = (x: object) => ({ marketplace: STOG, ...x });

  it("where", () => {
    expect(matchesFilter(farm, f({ q: "pemba" }))).toBe(true);
    expect(matchesFilter(farm, f({ q: "Tanzania, Pemba" }))).toBe(true);
    expect(matchesFilter(farm, f({ q: "portugal" }))).toBe(false);
  });

  it("contribution: up to N hours", () => {
    expect(matchesFilter(farm, f({ maxHours: 3 }))).toBe(true);
    expect(matchesFilter(cob, f({ maxHours: 3 }))).toBe(false);
    expect(matchesFilter(cob, f({ maxHours: 4 }))).toBe(true);
  });

  it("stay length respects min and max", () => {
    expect(matchesFilter(farm, f({ stayNights: 7 }))).toBe(true);
    expect(matchesFilter(cob, f({ stayNights: 7 }))).toBe(false);
    expect(matchesFilter(wales, f({ stayNights: 30 }))).toBe(true);
    expect(matchesFilter(wales, f({ stayNights: 60 }))).toBe(false);
  });

  it("when: an open window must contain the arrival and the stay", () => {
    expect(matchesFilter(farm, f({ date: "2026-12-01" }))).toBe(true);
    expect(matchesFilter(farm, f({ date: "2027-06-01" }))).toBe(false);
    // Window ends 2027-04-30: arriving on the 28th can't fit 7 nights.
    expect(matchesFilter(farm, f({ date: "2027-04-28" }))).toBe(false);
  });
});

describe("categories", () => {
  it("each marketplace has its own categories", () => {
    expect(categoriesFor(PB)).toBe(CATEGORIES);
    expect(categoriesFor(STOG)).toBe(OFF_GRID_CATEGORIES);
    expect(CATEGORIES.every((c) => categoryMarketplace(c) === PB)).toBe(true);
    expect(OFF_GRID_CATEGORIES.every((c) => categoryMarketplace(c) === STOG)).toBe(true);
  });

  it("includes the thirteen requested off-grid categories", () => {
    expect(OFF_GRID_CATEGORIES.map((c) => c.name)).toEqual([
      "Farms", "Permaculture", "Homesteads", "Eco Villages", "Natural Building", "Conservation", "Animal Care",
      "Rewilding", "Community Projects", "Retreat Centres", "Remote Islands", "Sailing / Liveaboard", "Sustainable Living",
    ]);
  });

  it("slugs don't collide across marketplaces", () => {
    const pb = new Set(CATEGORIES.map((c) => c.slug));
    expect(OFF_GRID_CATEGORIES.some((c) => pb.has(c.slug))).toBe(false);
  });
});

describe("repository (demo catalogue with both marketplaces)", () => {
  it("the catalogue really contains both marketplaces", async () => {
    const { getAllExperiences } = await import("./repository");
    const all = await getAllExperiences();
    expect(all.some(isPb)).toBe(true);
    expect(all.some(isStog)).toBe(true);
  });

  it("featured: each homepage only gets its own listings", async () => {
    const { getFeaturedExperiences } = await import("./repository");
    expect((await getFeaturedExperiences(50)).every(isPb)).toBe(true);
    const og = await getFeaturedExperiences(50, STOG);
    expect(og.length).toBeGreaterThan(0);
    expect(og.every(isStog)).toBe(true);
  });

  it("/experiences search: default and explicit marketplace", async () => {
    const { filterExperiences } = await import("./repository");
    expect((await filterExperiences({})).every(isPb)).toBe(true);
    expect((await filterExperiences({ marketplace: PB })).every(isPb)).toBe(true);
    const og = await filterExperiences({ marketplace: STOG });
    expect(og.length).toBe(OFFGRID_DEMO_EXPERIENCES.length);
    expect(og.every(isStog)).toBe(true);
  });

  it("experience detail: a slug only resolves on its own marketplace", async () => {
    const { getPublicExperienceBySlug } = await import("./repository");
    const og = OFFGRID_DEMO_EXPERIENCES[0].slug;
    const pb = EXPERIENCES[0].slug;
    expect(await getPublicExperienceBySlug(og, STOG)).toBeDefined();
    expect(await getPublicExperienceBySlug(og, PB)).toBeUndefined();
    expect(await getPublicExperienceBySlug(pb, PB)).toBeDefined();
    expect(await getPublicExperienceBySlug(pb, STOG)).toBeUndefined();
  });

  it("category pages only list their marketplace", async () => {
    const { getExperiencesByCategory } = await import("./repository");
    expect((await getExperiencesByCategory("permaculture", STOG)).every(isStog)).toBe(true);
    expect(await getExperiencesByCategory("permaculture", PB)).toEqual([]);
    expect((await getExperiencesByCategory("wellness")).every(isPb)).toBe(true);
  });

  it("destination pages never list off-grid stays", async () => {
    const { getExperiencesByDestination } = await import("./repository");
    for (const d of ["zanzibar", "pemba", ""]) {
      expect((await getExperiencesByDestination(d)).every(isPb)).toBe(true);
    }
  });

  it("marketplace lists (saved page, sitemap, static params) are isolated", async () => {
    const { getMarketplaceExperiences } = await import("./repository");
    expect((await getMarketplaceExperiences()).every(isPb)).toBe(true);
    expect((await getMarketplaceExperiences(STOG)).every(isStog)).toBe(true);
  });

  it("host profiles: off-grid hosts aren't shown on Paradise Beyond", async () => {
    const { getExperiencesByHost } = await import("./repository");
    const ogHost = OFFGRID_DEMO_EXPERIENCES[0].hostSlugs[0];
    const pbHost = EXPERIENCES[0].hostSlugs[0];
    expect(hostVisibleOn(await getExperiencesByHost(ogHost), PB)).toBe(false);
    expect(hostVisibleOn(await getExperiencesByHost(ogHost), STOG)).toBe(true);
    expect(hostVisibleOn(await getExperiencesByHost(pbHost), STOG)).toBe(false);
  });
});
