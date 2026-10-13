import { describe, it, expect } from "vitest";
import { PARADISE_BEYOND, SPEND_TIME_OFF_GRID } from "@/lib/brand/config";
import { categoriesFor } from "@/lib/data/categories";
import type { Experience } from "@/lib/types";
import { homeJsonLd } from "./jsonld";
import { llmsTxt } from "./llms";

const origin = "https://www.spendtimeoffgrid.com";
const stay = (over: Partial<Experience>) =>
  ({ slug: "welsh-hill-farm", name: "Sheep and sourdough", strapline: "A slow Welsh winter.", location: "Powys, Wales", ...over }) as Experience;

describe("llms.txt", () => {
  it("describes Spend Time Off Grid in the words people search with", () => {
    const text = llmsTxt({ brand: SPEND_TIME_OFF_GRID, origin, categories: categoriesFor("spendtimeoffgrid"), experiences: [] });
    expect(text.startsWith("# Spend Time Off Grid\n")).toBe(true);
    expect(text).toContain("spend time off grid");
    expect(text).toContain("accommodation and food");
    expect(text).toContain(`- [Permaculture](${origin}/categories/permaculture): `);
    expect(text).toContain(`${origin}/host`);
    expect(text).toContain("Contact: hello@spendtimeoffgrid.com");
  });

  it("lists real stays and never samples", () => {
    const text = llmsTxt({
      brand: SPEND_TIME_OFF_GRID,
      origin,
      categories: [],
      experiences: [stay({}), stay({ slug: "demo", name: "Demo stay", sample: true })],
    });
    expect(text).toContain(`- [Sheep and sourdough](${origin}/experiences/welsh-hill-farm): Powys, Wales. A slow Welsh winter.`);
    expect(text).not.toContain("Demo stay");
  });

  it("says stays are coming when none are live yet", () => {
    const text = llmsTxt({ brand: SPEND_TIME_OFF_GRID, origin, categories: [], experiences: [stay({ sample: true })] });
    expect(text).toContain(`New stays are being added. Browse them all at ${origin}/experiences.`);
  });

  it("listing text can't break the Markdown or the line", () => {
    const text = llmsTxt({ brand: SPEND_TIME_OFF_GRID, origin, categories: [], experiences: [stay({ name: "x](https://evil.example) [y", strapline: "a\n## Fake" })] });
    expect(text).not.toContain("](https://evil.example)");
    expect(text).not.toContain("\n## Fake");
  });

  it("works for Paradise Beyond with its own words", () => {
    const text = llmsTxt({ brand: PARADISE_BEYOND, origin: "https://paradisebeyond.com", categories: [], experiences: [] });
    expect(text.startsWith("# Paradise Beyond\n")).toBe(true);
    expect(text).toContain("## Experiences");
    expect(text).not.toContain("spend time off grid");
  });
});

describe("homepage structured data", () => {
  it("names the organisation and website", () => {
    const data = JSON.parse(homeJsonLd(SPEND_TIME_OFF_GRID, origin));
    const [org, site] = data["@graph"];
    expect(org["@type"]).toBe("Organization");
    expect(org.name).toBe("Spend Time Off Grid");
    expect(org.url).toBe(`${origin}/`);
    expect(org.logo).toMatch(/^https:\/\/www\.spendtimeoffgrid\.com\/brand\//);
    expect(site["@type"]).toBe("WebSite");
    expect(site.publisher["@id"]).toBe(org["@id"]);
  });

  it("can't close its script tag", () => {
    expect(homeJsonLd({ ...SPEND_TIME_OFF_GRID, footerBlurb: "</script><b>" }, origin)).not.toContain("</script>");
  });
});
