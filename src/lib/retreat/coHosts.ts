import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { RetreatDraft } from "@/lib/retreat/schema";

export type CoHost = { hostId: string; slug: string; name: string };

/**
 * Load a draft for a user who is allowed to edit it — the admin, the owning
 * host, or a co-host editor — using the service role so an unreliable is_admin()
 * / RLS session can't wrongly return nothing (which made the builder open blank).
 * Returns null if the user isn't permitted (or the draft doesn't exist).
 */
export async function loadDraftForUser(
  user: { id: string; role: string },
  id: string,
): Promise<RetreatDraft | null> {
  if (!isSupabaseConfigured()) {
    const { getDraft } = await import("@/lib/retreat/store");
    return getDraft(id);
  }
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const db = createServiceRoleClient();
  const { data } = await db.from("retreat_drafts").select("data, host_id").eq("id", id).maybeSingle();
  if (!data?.data) return null;
  const draft = data.data as RetreatDraft;
  if (user.role === "admin") return draft;

  const { data: myHosts } = await db.from("hosts").select("id").eq("owner_id", user.id);
  const myHostIds = new Set(((myHosts ?? []) as { id: string }[]).map((h) => h.id));
  if (data.host_id && myHostIds.has(data.host_id as string)) return draft; // owner
  const editors = await editorHostIds(id);
  if (editors.some((hid) => myHostIds.has(hid))) return draft; // co-host
  return null;
}

/** True if the user owns the draft (its host row is owned by them). */
export async function ownsDraft(userId: string, draftId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const db = createServiceRoleClient();
  const { data: draft } = await db.from("retreat_drafts").select("host_id").eq("id", draftId).maybeSingle();
  if (!draft?.host_id) return false;
  const { data: host } = await db.from("hosts").select("id").eq("id", draft.host_id).eq("owner_id", userId).maybeSingle();
  return Boolean(host);
}

/** The co-host editors of a draft (excludes the owner). */
export async function listEditors(draftId: string): Promise<CoHost[]> {
  if (!isSupabaseConfigured()) return [];
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const db = createServiceRoleClient();
  const { data } = await db
    .from("retreat_draft_editors")
    .select("host_id, hosts(slug, name)")
    .eq("draft_id", draftId);
  return ((data ?? []) as { host_id: string; hosts?: { slug?: string; name?: string } | null }[]).map((r) => ({
    hostId: r.host_id,
    slug: r.hosts?.slug ?? "",
    name: r.hosts?.name ?? "Host",
  }));
}

/** Slugs of a draft's co-host editors — used at publish to add them as hosts. */
export async function editorHostIds(draftId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const db = createServiceRoleClient();
  const { data } = await db.from("retreat_draft_editors").select("host_id").eq("draft_id", draftId);
  return ((data ?? []) as { host_id: string }[]).map((r) => r.host_id);
}
