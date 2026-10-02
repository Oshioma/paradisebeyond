import { describe, it, expect } from "vitest";
import { isSitePagePath } from "@/lib/brand/paths";

const { default: TrustPage, generateMetadata } = await import("./page");

describe("/trust", () => {
  it("is a site page (rewritten per brand by middleware)", () => {
    expect(isSitePagePath("/trust")).toBe(true);
  });
  it("is Spend Time Off Grid only — a 404 on Paradise Beyond", () => {
    expect(() => TrustPage({ params: { site: "paradise-beyond" } })).toThrow(/NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK/);
    expect(generateMetadata({ params: { site: "paradise-beyond" } })).toEqual({});
  });
  it("renders on Spend Time Off Grid", () => {
    expect(TrustPage({ params: { site: "spendtimeoffgrid" } })).toBeTruthy();
    expect(generateMetadata({ params: { site: "spendtimeoffgrid" } })).toMatchObject({ title: "Trust & safety" });
  });
});
