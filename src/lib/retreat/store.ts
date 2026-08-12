import { promises as fs } from "node:fs";
import path from "node:path";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { RetreatDraft, RetreatStatus } from "./schema";

/**
 * Retreat draft persistence.
 *  - Live (Supabase): `retreat_drafts` table (JSON draft + status, owned by
 *    host; admins review). See supabase/migrations/0004_retreat_drafts.sql.
 *  - Demo: a local JSON file (avoids cookie size limits for full drafts).
 *
 * On approval, an admin/host materialises the draft into the normalised
 * catalogue tables — the draft is the working document until then.
 */
const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "retreats.json");

async function readAll(): Promise<RetreatDraft[]> {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data } = await supabase.from("retreat_drafts").select("data");
    return (data ?? []).map((r) => r.data as RetreatDraft);
  }
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

async function writeAllDemo(list: RetreatDraft[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(list, null, 2));
}

export async function getDraft(id: string): Promise<RetreatDraft | null> {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data } = await supabase.from("retreat_drafts").select("data").eq("id", id).maybeSingle();
    return (data?.data as RetreatDraft) ?? null;
  }
  const all = await readAll();
  return all.find((d) => d.id === id) ?? null;
}

export async function saveDraft(draft: RetreatDraft): Promise<void> {
  draft.updatedAt = new Date().toISOString();
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    await supabase.from("retreat_drafts").upsert(
      { id: draft.id, host_id: draft.hostId ?? null, status: draft.status, data: draft, updated_at: draft.updatedAt },
      { onConflict: "id" },
    );
    return;
  }
  const all = await readAll();
  const i = all.findIndex((d) => d.id === draft.id);
  if (i >= 0) all[i] = draft;
  else all.push(draft);
  await writeAllDemo(all);
}

export async function setDraftStatus(id: string, status: RetreatStatus, reviewNotes?: string): Promise<void> {
  const draft = await getDraft(id);
  if (!draft) return;
  draft.status = status;
  if (reviewNotes !== undefined) draft.reviewNotes = reviewNotes;
  await saveDraft(draft);
}

export async function listDraftsForHost(hostId: string): Promise<RetreatDraft[]> {
  const all = await readAll();
  return all
    .filter((d) => !d.hostId || d.hostId === hostId)
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

/** Submissions awaiting or in admin review (everything past draft). */
export async function listSubmissions(): Promise<RetreatDraft[]> {
  const all = await readAll();
  return all
    .filter((d) => d.status !== "draft")
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}
