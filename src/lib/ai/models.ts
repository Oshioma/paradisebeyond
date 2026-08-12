/**
 * Curated catalogue of Anthropic models offered in the admin model switch, with
 * pricing notes. Prices are per 1M tokens (Anthropic first-party API rates) and
 * are shown to the admin so they can trade quality against cost. The "per draft"
 * figure is a rough estimate for one retreat draft (~500 input + ~1,800 output
 * tokens) to make the trade-off tangible.
 *
 * Keep this list tight and current; it's a menu, not the full model line-up.
 */

export interface AiModelOption {
  id: string;
  name: string;
  /** One-line positioning. */
  blurb: string;
  inputPerM: number; // USD / 1M input tokens
  outputPerM: number; // USD / 1M output tokens
  /** Rough cost of a single retreat draft, formatted. */
  perDraft: string;
  /** Short guidance on when to pick this. */
  bestFor: string;
}

export const AI_MODELS: AiModelOption[] = [
  {
    id: "claude-opus-5",
    name: "Claude Opus 5",
    blurb: "Highest quality — the most polished, magazine-grade copy.",
    inputPerM: 5,
    outputPerM: 25,
    perDraft: "~$0.05",
    bestFor: "Best writing. Use when quality matters more than cost.",
  },
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    blurb: "Strong and noticeably cheaper — a great everyday default.",
    inputPerM: 3,
    outputPerM: 15,
    perDraft: "~$0.03",
    bestFor: "The balanced choice for most drafting.",
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    blurb: "Fastest and cheapest — good for quick first passes.",
    inputPerM: 1,
    outputPerM: 5,
    perDraft: "~$0.01",
    bestFor: "High volume or rough drafts you'll heavily edit.",
  },
];

export const DEFAULT_AI_MODEL = "claude-opus-5";

export function findModel(id: string | null | undefined): AiModelOption | undefined {
  return AI_MODELS.find((m) => m.id === id);
}
