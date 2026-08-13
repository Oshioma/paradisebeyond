import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readDemoState, updateDemoState } from "@/lib/demo/state";

/**
 * Verification: the criteria an admin reviews before awarding the Verified
 * badge, plus the award/revoke action. Criteria live in app_settings (0009) so
 * they're editable without a deploy; the badge itself is stored on the
 * experience (column + content.verified, which the read model renders).
 *
 * Verified is admin-only and never self-serve.
 */

const CRITERIA_KEY = "verification_criteria";

export const DEFAULT_CRITERIA = [
  "Host identity verified (government ID)",
  "Public liability insurance on file",
  "Accommodation inspected or credibly documented",
  "At least one cohort completed, or a credible first-run plan",
  "Itinerary, inclusions and pricing are accurate and fair",
  "No unresolved safety or safeguarding concerns",
];

export async function getVerificationCriteria(): Promise<string[]> {
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const { data } = await createClient().from("app_settings").select("value").eq("key", CRITERIA_KEY).maybeSingle();
      const items = (data?.value as { items?: unknown } | null)?.items;
      if (Array.isArray(items) && items.length) return items.map(String);
    } catch {
      /* fall through */
    }
    return DEFAULT_CRITERIA;
  }
  return readDemoState().verificationCriteria ?? DEFAULT_CRITERIA;
}

export async function setVerificationCriteria(items: string[]): Promise<void> {
  const clean = items.map((s) => s.trim()).filter(Boolean).slice(0, 30);
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    await createClient()
      .from("app_settings")
      .upsert({ key: CRITERIA_KEY, value: { items: clean }, updated_at: new Date().toISOString() }, { onConflict: "key" });
  } else {
    updateDemoState((s) => { s.verificationCriteria = clean; });
  }
}

/** Demo-only verified overrides (empty in live mode, where content.verified is truth). */
export async function getDemoVerifiedSlugs(): Promise<string[]> {
  if (isSupabaseConfigured()) return [];
  return readDemoState().verifiedSlugs ?? [];
}

/** Demo-only featured overrides (empty in live mode, where content.featured is truth). */
export async function getDemoFeaturedSlugs(): Promise<string[]> {
  if (isSupabaseConfigured()) return [];
  return readDemoState().featuredSlugs ?? [];
}

/** Award or revoke Verified on an experience (by slug). */
export async function setExperienceVerified(slug: string, verified: boolean): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data, error: readErr } = await supabase.from("experiences").select("content").eq("slug", slug).maybeSingle();
    if (readErr || !data) return { ok: false, error: readErr?.message ?? "Experience not found." };
    const content = { ...(data.content as Record<string, unknown>), verified };
    const { error } = await supabase.from("experiences").update({ verified, content }).eq("slug", slug);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  // Demo: seed catalogue is read-only, but track the override so the toggle works.
  updateDemoState((s) => {
    const set = new Set(s.verifiedSlugs ?? []);
    if (verified) set.add(slug); else set.delete(slug);
    s.verifiedSlugs = Array.from(set);
  });
  return { ok: true };
}

/**
 * Feature or unfeature an experience (by slug). Featured experiences surface on
 * the homepage. Like verified, the flag lives on both the `featured` column and
 * `content.featured` (the read model renders content).
 */
export async function setExperienceFeatured(slug: string, featured: boolean): Promise<{ ok: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data, error: readErr } = await supabase.from("experiences").select("content").eq("slug", slug).maybeSingle();
    if (readErr || !data) return { ok: false, error: readErr?.message ?? "Experience not found." };
    const content = { ...(data.content as Record<string, unknown>), featured };
    const { error } = await supabase.from("experiences").update({ featured, content }).eq("slug", slug);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  // Demo: seed catalogue is read-only, but track the override so the toggle works.
  updateDemoState((s) => {
    const set = new Set(s.featuredSlugs ?? []);
    if (featured) set.add(slug); else set.delete(slug);
    s.featuredSlugs = Array.from(set);
  });
  return { ok: true };
}
