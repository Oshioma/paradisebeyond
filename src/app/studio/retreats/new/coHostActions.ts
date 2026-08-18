"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ownsDraft, listEditors, type CoHost } from "@/lib/retreat/coHosts";

async function canManage(userId: string, role: string, draftId: string): Promise<boolean> {
  return role === "admin" || (await ownsDraft(userId, draftId));
}

/** List a draft's co-hosts (owner, admin, or a co-host can view). */
export async function listCoHosts(draftId: string): Promise<CoHost[]> {
  await requireRole("host");
  return listEditors(draftId);
}

/**
 * Invite a co-host by email. Only the main host (owner) or an admin can. The
 * invitee must already be an approved host (have a host account).
 */
export async function addCoHost(draftId: string, email: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireRole("host");
  if (!isSupabaseConfigured()) return { ok: false, error: "Co-hosts need the live database." };
  if (!(await canManage(user.id, user.role, draftId))) return { ok: false, error: "Only the main host can add co-hosts." };

  const clean = email.trim().toLowerCase();
  if (!clean) return { ok: false, error: "Enter their email." };

  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const db = createServiceRoleClient();
  const { data: found } = await db.rpc("host_for_email", { p_email: clean });
  const host = Array.isArray(found) ? found[0] : found;
  if (!host?.id) return { ok: false, error: "No host account with that email. They need to sign up and be approved as a host first." };

  const { data: draft } = await db.from("retreat_drafts").select("host_id").eq("id", draftId).maybeSingle();
  if (draft?.host_id === host.id) return { ok: false, error: "They're already the main host of this retreat." };

  const { error } = await db
    .from("retreat_draft_editors")
    .upsert({ draft_id: draftId, host_id: host.id }, { onConflict: "draft_id,host_id", ignoreDuplicates: true });
  if (error) return { ok: false, error: `Couldn't add them: ${error.message}` };

  revalidatePath("/studio/retreats/new");
  return { ok: true };
}

/** Remove a co-host. Owner or admin only. */
export async function removeCoHost(draftId: string, hostId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireRole("host");
  if (!isSupabaseConfigured()) return { ok: false, error: "Co-hosts need the live database." };
  if (!(await canManage(user.id, user.role, draftId))) return { ok: false, error: "Only the main host can remove co-hosts." };

  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  await createServiceRoleClient().from("retreat_draft_editors").delete().eq("draft_id", draftId).eq("host_id", hostId);
  revalidatePath("/studio/retreats/new");
  return { ok: true };
}
