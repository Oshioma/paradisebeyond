import { isSupabaseConfigured } from "@/lib/supabase/config";

export type CoHost = { hostId: string; slug: string; name: string };

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
