import type { Brand } from "@/lib/brand/config";
import type { Category, Destination, Experience } from "@/lib/types";

/**
 * /llms.txt: a plain-text guide to the site for AI assistants (ChatGPT, Claude,
 * Perplexity), following the llms.txt convention. Pure, so it is unit tested;
 * the route supplies the brand's real listings (never samples).
 */

// One line of the file: no line breaks, no Markdown link syntax from listing text.
function clean(text: string, max = 280): string {
  const flat = text.replace(/\s+/g, " ").replace(/[[\]]/g, "").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

const link = (name: string, url: string, text?: string) => `- [${clean(name, 120)}](${url})${text ? `: ${clean(text)}` : ""}`;

/** Spend Time Off Grid: what a stay is, in the words people search with. */
const OFF_GRID_INTRO = [
  "Spend Time Off Grid lists stays on farms, homesteads, eco-villages and off-grid projects around the world. Travellers help out for a few hours a day and in return get accommodation and food, learn practical skills and live another way for a while. Stays run from about a week to a few months.",
  "",
  "It suits people who want to spend time off grid, try farm or homestead life, volunteer on a permaculture or conservation project, or take a slow, low-cost trip with a purpose. Every listing says what you'll help with, where you'll sleep, what you'll eat and how many hours a day.",
  "",
  "Landowners and projects can list their place for free at /host.",
];

export function llmsTxt(input: {
  brand: Brand;
  origin: string;
  categories: Category[];
  experiences: Experience[];
  destinations?: Destination[];
}): string {
  const { brand, origin, categories, destinations = [] } = input;
  const offGrid = brand.id === "spendtimeoffgrid";
  const experiences = input.experiences.filter((e) => !e.sample);
  const lines: string[] = [`# ${brand.name}`, "", `> ${clean(brand.metadata.description, 400)}`, ""];

  if (offGrid) lines.push(...OFF_GRID_INTRO.map((l) => l.replace("/host", `${origin}/host`)), "");

  lines.push(`## Kinds of ${brand.terms.experiences}`, "", ...categories.map((c) => link(c.name, `${origin}/categories/${c.slug}`, c.description)), "");

  lines.push(`## ${brand.terms.experiences[0].toUpperCase()}${brand.terms.experiences.slice(1)}`, "");
  if (experiences.length) {
    lines.push(...experiences.map((e) => link(e.name, `${origin}/experiences/${e.slug}`, [e.location, e.strapline].filter(Boolean).join(". "))));
  } else {
    lines.push(`New ${brand.terms.experiences} are being added. Browse them all at ${origin}/experiences.`);
  }
  lines.push("");

  if (destinations.length) {
    lines.push("## Destinations", "", ...destinations.map((d) => link(d.name, `${origin}/destinations/${d.slug}`, d.summary)), "");
  }

  lines.push(
    "## Optional",
    "",
    link(`All ${brand.terms.experiences}`, `${origin}/experiences`),
    link(offGrid ? "List your land" : "Host with us", `${origin}/host`),
    ...(offGrid ? [link("Trust & safety", `${origin}/trust`)] : []),
    link("Terms", `${origin}/terms`),
    link("Privacy", `${origin}/privacy`),
    link("Sitemap", `${origin}/sitemap.xml`),
    "",
    `Contact: ${brand.contactEmail}`,
    "",
  );
  return lines.join("\n");
}
