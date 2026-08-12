import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readDemoState, updateDemoState } from "@/lib/demo/state";
import { DEFAULT_AI_MODEL, findModel } from "@/lib/ai/models";

/**
 * Resolves and persists the AI model used by the Retreat Builder.
 *
 * Precedence when reading:
 *   1. Admin selection stored in app_settings (live) or the demo cookie (demo)
 *   2. ANTHROPIC_MODEL env override
 *   3. DEFAULT_AI_MODEL
 *
 * This makes the admin model switch a true runtime toggle — no redeploy — while
 * still honouring an env override when nothing has been chosen in the UI.
 */

const SETTING_KEY = "ai_model";

function envModel(): string | undefined {
  const v = process.env.ANTHROPIC_MODEL?.trim();
  return v || undefined;
}

/** The model id to use for AI calls. Never throws. */
export async function getSelectedModel(): Promise<string> {
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const { data } = await createClient()
        .from("app_settings")
        .select("value")
        .eq("key", SETTING_KEY)
        .maybeSingle();
      const stored = (data?.value as { id?: string } | null)?.id;
      if (stored && findModel(stored)) return stored;
    } catch {
      /* fall through to env/default */
    }
  } else {
    const stored = readDemoState().aiModelId;
    if (stored && findModel(stored)) return stored;
  }
  return envModel() ?? DEFAULT_AI_MODEL;
}

/** Where the effective model came from — for honest labelling in the admin UI. */
export async function getModelSource(): Promise<"selected" | "env" | "default"> {
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const { data } = await createClient()
        .from("app_settings")
        .select("value")
        .eq("key", SETTING_KEY)
        .maybeSingle();
      const stored = (data?.value as { id?: string } | null)?.id;
      if (stored && findModel(stored)) return "selected";
    } catch {
      /* ignore */
    }
  } else if (readDemoState().aiModelId && findModel(readDemoState().aiModelId)) {
    return "selected";
  }
  return envModel() ? "env" : "default";
}

/** Persist an admin's model choice. Only accepts ids from the catalogue. */
export async function setSelectedModel(id: string): Promise<void> {
  if (!findModel(id)) return;
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    await createClient()
      .from("app_settings")
      .upsert({ key: SETTING_KEY, value: { id }, updated_at: new Date().toISOString() }, { onConflict: "key" });
  } else {
    updateDemoState((s) => { s.aiModelId = id; });
  }
}
