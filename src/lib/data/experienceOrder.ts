import { promises as fs } from "node:fs";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Admin-defined display order for experiences, stored as a list of slugs in
 * app_settings (jsonb) — or a local file in demo mode. An experience listed
 * here sorts to that position; anything not listed falls in after, keeping the
 * previous (featured-first) order. Empty = original behaviour, unchanged.
 */
const KEY = "experience_order";
const FILE = path.join(process.cwd(), ".data", "experience-order.json");

export async function getExperienceOrder(): Promise<string[]> {
  if (isSupabaseConfigured()) {
    // Don't let Next's Data Cache pin this read to a stale order (same lesson as
    // the media overrides): a reorder must show immediately.
    noStore();
    try {
      const { createAnonClient } = await import("@/lib/supabase/server");
      const { data } = await createAnonClient()
        .from("app_settings")
        .select("value")
        .eq("key", KEY)
        .maybeSingle();
      const slugs = (data?.value as { slugs?: unknown } | null)?.slugs;
      return Array.isArray(slugs) ? slugs.filter((s): s is string => typeof s === "string") : [];
    } catch {
      return [];
    }
  }
  try {
    const raw = JSON.parse(await fs.readFile(FILE, "utf8")) as { slugs?: unknown } | unknown[];
    const slugs = Array.isArray(raw) ? raw : (raw as { slugs?: unknown }).slugs;
    return Array.isArray(slugs) ? slugs.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export async function setExperienceOrder(slugs: string[]): Promise<void> {
  if (isSupabaseConfigured()) {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const { error } = await createServiceRoleClient()
      .from("app_settings")
      .upsert({ key: KEY, value: { slugs }, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(`Saving the order failed: ${error.message}`);
  } else {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify({ slugs }, null, 2));
  }
}

/**
 * Sort experiences by the admin order: listed slugs first in their chosen
 * sequence, then everything else featured-first (stable) — so with no saved
 * order the result is identical to the previous default.
 */
export function applyExperienceOrder<T extends { slug: string; featured?: boolean }>(list: T[], order: string[]): T[] {
  const idx = new Map(order.map((slug, i) => [slug, i] as const));
  return [...list].sort((a, b) => {
    const ai = idx.has(a.slug) ? idx.get(a.slug)! : Infinity;
    const bi = idx.has(b.slug) ? idx.get(b.slug)! : Infinity;
    if (ai !== bi) return ai - bi;
    return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  });
}
