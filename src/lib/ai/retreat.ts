import { callClaude, isAiEnabled, parseJsonObject } from "@/lib/ai/anthropic";

/**
 * AI-assisted retreat drafting. Given a short brief from the host, produce
 * starter copy for the Retreat Builder — a name, strapline, "ideal guest"
 * lines, a story, signature activities and a day-by-day itinerary.
 *
 * IMPORTANT: this only ever produces a *draft*. The host reviews, edits and
 * approves everything in the wizard before anything is submitted, and admin
 * still approves by hand before it goes live. AI assists; it never publishes.
 *
 * When no ANTHROPIC_API_KEY is set (or the call fails), we fall back to a local
 * heuristic so the feature degrades gracefully and the demo stays green.
 */

export interface RetreatDraftSuggestion {
  name: string;
  strapline: string;
  idealGuest: string[];
  story: string[];
  propertyDescription: string;
  inclusions: string[];
  highlights: { title: string; description: string }[];
  itinerary: { day: number; title: string; summary: string; items: string[] }[];
  /** True when the copy came from the LLM; false when it's the local heuristic. */
  ai: boolean;
}

export interface DraftInput {
  brief: string;
  duration: 7 | 14;
  destinationName: string;
  locationLabel?: string;
  category?: string;
}

const SYSTEM = `You are a senior travel-magazine editor writing for "Paradise Beyond", a curated marketplace for premium, experience-led retreats. Your voice is warm, evocative and precise — never salesy, never generic listicle copy. You sell the feeling of the week, not a checklist of amenities. Guests arrange their own international flights; the price covers the experience on the ground.

You reply with ONE JSON object and nothing else — no prose, no markdown fences. Use this exact shape:
{
  "name": string,                       // evocative, 2–4 words, not generic
  "strapline": string,                  // one short line, under 12 words
  "idealGuest": string[],               // 3 lines, each starting a "This is for you if…" thought
  "story": string[],                    // 2–3 short paragraphs, second-person, no bullet lists
  "propertyDescription": string,        // 2–3 sentences on where guests stay
  "inclusions": string[],               // 5–8 concrete things included on the ground
  "highlights": [{ "title": string, "description": string }],  // 3–5 signature moments
  "itinerary": [{ "day": number, "title": string, "summary": string, "items": string[] }]  // one entry per day
}
Keep it grounded and specific to the destination. Do not invent flights or airfare.`;

function briefToPrompt({ brief, duration, destinationName, locationLabel, category }: DraftInput): string {
  return [
    `Draft a ${duration}-day retreat for Paradise Beyond.`,
    `Destination: ${destinationName}${locationLabel ? ` (${locationLabel})` : ""}.`,
    category ? `Primary category: ${category}.` : "",
    `The itinerary array must have exactly ${duration} entries, day 1 to day ${duration}.`,
    "",
    `Host's brief: ${brief}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Coerce the model's loose JSON into a well-formed suggestion. */
function coerce(raw: unknown, duration: number): Omit<RetreatDraftSuggestion, "ai"> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v.trim() : fallback);
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean) : [];

  const highlights = Array.isArray(o.highlights)
    ? o.highlights
        .map((h) => {
          const hh = (h ?? {}) as Record<string, unknown>;
          return { title: str(hh.title), description: str(hh.description) };
        })
        .filter((h) => h.title || h.description)
    : [];

  const itinerary = Array.isArray(o.itinerary)
    ? o.itinerary
        .map((d, i) => {
          const dd = (d ?? {}) as Record<string, unknown>;
          return {
            day: typeof dd.day === "number" ? dd.day : i + 1,
            title: str(dd.title),
            summary: str(dd.summary),
            items: strArr(dd.items).length ? strArr(dd.items) : [""],
          };
        })
        .filter((d) => d.day >= 1 && d.day <= duration)
    : [];

  const name = str(o.name);
  const strapline = str(o.strapline);
  if (!name && !strapline && !itinerary.length) return null; // nothing usable

  return {
    name,
    strapline,
    idealGuest: strArr(o.idealGuest),
    story: strArr(o.story),
    propertyDescription: str(o.propertyDescription),
    inclusions: strArr(o.inclusions),
    highlights,
    itinerary,
  };
}

/**
 * Produce a draft suggestion. Tries the LLM first (when configured), then falls
 * back to a deterministic local heuristic. Never throws.
 */
export async function draftRetreat(input: DraftInput): Promise<RetreatDraftSuggestion> {
  if (isAiEnabled()) {
    const text = await callClaude({
      system: SYSTEM,
      prompt: briefToPrompt(input),
      maxTokens: 2600,
    });
    const parsed = coerce(parseJsonObject(text), input.duration);
    if (parsed) return { ...parsed, ai: true };
  }
  return { ...heuristicDraft(input), ai: false };
}

// ---------------------------------------------------------------------------
// Local fallback — usable, on-brand starter copy without any AI call.
// ---------------------------------------------------------------------------
function heuristicDraft({ brief, duration, destinationName, locationLabel, category }: DraftInput): Omit<RetreatDraftSuggestion, "ai"> {
  const place = locationLabel || destinationName || "Zanzibar";
  const cat = (category || "wellness").toLowerCase();
  const focus = brief.trim().replace(/\.$/, "") || `a ${cat} retreat`;

  const itinerary: RetreatDraftSuggestion["itinerary"] = [];
  for (let d = 1; d <= duration; d++) {
    if (d === 1) itinerary.push({ day: 1, title: "Arrive & unwind", summary: `Land, transfer to ${place}, and settle in.`, items: ["Airport pickup & transfer", "Welcome dinner", "Sunset by the water"] });
    else if (d === duration) itinerary.push({ day: d, title: "Farewell", summary: "A gentle final morning before departure.", items: ["Morning practice", "Closing circle", "Transfer to airport"] });
    else itinerary.push({ day: d, title: `Day ${d}`, summary: `A full day of ${cat} and rest.`, items: ["Morning session", "Free time & lunch", "Afternoon experience"] });
  }

  return {
    name: `${destinationName} Reset`,
    strapline: `${duration} days of ${cat} in ${place} — come back different.`,
    idealGuest: [
      `You want ${cat} without pressure or dogma.`,
      "You'd rather arrive as a stranger and leave with a small, warm group of friends.",
      `You're ready to give yourself ${duration} proper days.`,
    ],
    story: [
      `Set on the ${place} coast, this ${duration}-day experience is built around one idea: ${focus}. Days move at the pace of the tide.`,
      "You'll be looked after from the moment you land — accommodation, meals and every scheduled moment handled — so all you have to do is arrive and be present.",
    ],
    propertyDescription: `A small, characterful place to stay in ${place}, chosen for comfort and a sense of calm rather than for a brand name. Steps from where the days unfold.`,
    inclusions: [
      `${duration - 1} nights accommodation`,
      "Daily breakfast and most meals",
      "All scheduled activities and sessions",
      "Airport transfers on arrival and departure",
      "Local host and on-the-ground support",
    ],
    highlights: [
      { title: `Daily ${cat}`, description: "Unhurried, well-led sessions built into the rhythm of each day." },
      { title: "A sense of place", description: `Time to actually be in ${place} — its coast, its light, its pace.` },
      { title: "A small group", description: "Kept intentionally small so no one is a stranger by the end." },
    ],
    itinerary,
  };
}
