/**
 * Minimal server-only client for the Anthropic Messages API.
 *
 * We hit the REST endpoint with `fetch` rather than pulling in an SDK: the only
 * call site is retreat drafting, and a single POST keeps the dependency surface
 * (and the cold-start cost on Vercel) small. Everything here runs server-side —
 * ANTHROPIC_API_KEY must never reach the browser.
 *
 * When no key is configured the app stays fully functional: callers fall back
 * to local heuristics, so the demo build is green without any AI credentials.
 */

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-opus-5";

/** True when a real Anthropic key is present. Gate every live call on this. */
export function isAiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim());
}

/** The model in use (override with ANTHROPIC_MODEL). */
export function aiModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

interface CallOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  /** Abort the request after this many ms (default 45s). */
  timeoutMs?: number;
}

/**
 * Send one user turn and return Claude's text response, or `null` on any
 * failure (missing key, network error, timeout, non-2xx). Callers treat `null`
 * as "AI unavailable" and fall back gracefully — this never throws.
 */
export async function callClaude({ system, prompt, maxTokens = 2000, timeoutMs = 45_000 }: CallOptions): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;

  const { getSelectedModel } = await import("@/lib/ai/settings");
  const model = await getSelectedModel();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[ai] Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("")
      .trim();
    return text || null;
  } catch (e) {
    if ((e as Error).name !== "AbortError") console.error("[ai] Anthropic call failed:", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract the first JSON object from a model response. Claude usually returns
 * clean JSON when asked, but may wrap it in ```json fences or a sentence — this
 * tolerates both. Returns `null` if nothing parses.
 */
export function parseJsonObject<T = unknown>(text: string | null): T | null {
  if (!text) return null;
  let candidate = text.trim();
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidate = fence[1].trim();
  if (!candidate.startsWith("{")) {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    candidate = candidate.slice(start, end + 1);
  }
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}
