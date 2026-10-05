"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ownsDraft, listEditors, listPendingInvites, type CoHost, type PendingInvite } from "@/lib/retreat/coHosts";

async function canManage(userId: string, role: string, draftId: string): Promise<boolean> {
  return role === "admin" || (await ownsDraft(userId, draftId));
}

/** List a draft's co-hosts (owner, admin, or a co-host can view). */
export async function listCoHosts(draftId: string): Promise<CoHost[]> {
  await requireRole("host");
  return listEditors(draftId);
}

/** Invites waiting for the person to sign up. */
export async function listCoHostInvites(draftId: string): Promise<PendingInvite[]> {
  await requireRole("host");
  return listPendingInvites(draftId);
}

/**
 * Invite a co-host by email. Only the main host (owner) or an admin can.
 *  - Already a host → attached straight away.
 *  - Has an account but isn't a host → promoted to host (no application needed:
 *    the inviting host vouches for them) and attached.
 *  - No account yet → a pending invite is saved and they're emailed a sign-up
 *    link; signing up with that email makes them a host on this retreat
 *    (handle_new_user → claim_cohost_invites).
 */
export async function addCoHost(
  draftId: string,
  email: string,
): Promise<{ ok: boolean; error?: string; invited?: boolean }> {
  const user = await requireRole("host");
  if (!isSupabaseConfigured()) return { ok: false, error: "Co-hosts need the live database." };
  if (!(await canManage(user.id, user.role, draftId))) return { ok: false, error: "Only the main host can add co-hosts." };

  const clean = email.trim().toLowerCase();
  if (!clean) return { ok: false, error: "Enter their email." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { ok: false, error: "That doesn't look like an email address." };

  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const db = createServiceRoleClient();

  const { data: draft } = await db.from("retreat_drafts").select("host_id, data").eq("id", draftId).maybeSingle();
  if (!draft) return { ok: false, error: "Retreat not found." };
  const retreatName = (draft.data as { name?: string } | null)?.name?.trim() || "a retreat";

  async function findHost() {
    const { data } = await db.rpc("host_for_email", { p_email: clean });
    return (Array.isArray(data) ? data[0] : data) as { id: string; slug: string; name: string } | null;
  }

  let host = await findHost();
  if (!host?.id) {
    // An existing account that isn't a host yet: make them one (creates their
    // host row too). No-op if there's no account with that email.
    await db.rpc("promote_host_by_email", { p_email: clean });
    host = await findHost();
  }

  const { sendEmail } = await import("@/lib/email");
  const { siteUrl } = await import("@/lib/siteUrl");

  // No account at all → save a pending invite and send a sign-up link.
  if (!host?.id) {
    const { error } = await db
      .from("cohost_invites")
      .upsert(
        { draft_id: draftId, email: clean, invited_by: user.id, accepted_at: null },
        { onConflict: "draft_id,email", ignoreDuplicates: false },
      );
    if (error) return { ok: false, error: `Couldn't invite them: ${error.message}` };

    try {
      await sendEmail({
        to: clean,
        subject: `${user.name} invited you to co-host ${retreatName}`,
        html: `<p>Hi there,</p>
<p><strong>${user.name}</strong> has invited you to co-host <strong>${retreatName}</strong> on Paradise Beyond.</p>
<p>Create your free account using <strong>this email address (${clean})</strong> and you'll be set up as a host on the retreat straight away. There's no host application to fill in.</p>
<p><a href="${siteUrl()}/signup">Create your account →</a></p>
<p>Once you've confirmed your email and signed in, you'll find the retreat in your <a href="${siteUrl()}/studio/retreats">Studio</a>.</p>`,
      });
    } catch {
      /* non-fatal — the invite is saved; they can still sign up */
    }

    revalidatePath("/studio/retreats/new");
    return { ok: true, invited: true };
  }

  if (draft.host_id === host.id) return { ok: false, error: "They're already the main host of this retreat." };

  const { error } = await db
    .from("retreat_draft_editors")
    .upsert({ draft_id: draftId, host_id: host.id }, { onConflict: "draft_id,host_id", ignoreDuplicates: true });
  if (error) return { ok: false, error: `Couldn't add them: ${error.message}` };

  // A co-host is a host: make sure their account role reflects that, so they can
  // open the builder (which requires the host role) and see the owner "Edit"
  // controls on their retreat's pages. Never downgrade an admin.
  const { data: hostRow } = await db.from("hosts").select("owner_id").eq("id", host.id).maybeSingle();
  const ownerId = (hostRow?.owner_id as string | null) ?? null;
  if (ownerId) {
    await db.from("profiles").update({ role: "host" }).eq("id", ownerId).neq("role", "admin");
  }

  // Let the new co-host know they've been given access (best-effort).
  try {
    await sendEmail({
      to: clean,
      subject: `You're now a co-host of ${retreatName}`,
      html: `<p>Hi ${host.name?.split(" ")[0] || "there"},</p>
<p><strong>${user.name}</strong> added you as a co-host of <strong>${retreatName}</strong> on Paradise Beyond. You can now open, edit and submit it alongside them.</p>
<p><a href="${siteUrl()}/studio/retreats">Open it in your Studio →</a></p>`,
    });
  } catch {
    /* non-fatal — they still have access */
  }

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

/** Cancel an invite that hasn't been accepted yet. Owner or admin only. */
export async function cancelCoHostInvite(draftId: string, inviteId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireRole("host");
  if (!isSupabaseConfigured()) return { ok: false, error: "Co-hosts need the live database." };
  if (!(await canManage(user.id, user.role, draftId))) return { ok: false, error: "Only the main host can cancel invites." };

  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  await createServiceRoleClient()
    .from("cohost_invites")
    .delete()
    .eq("id", inviteId)
    .eq("draft_id", draftId)
    .is("accepted_at", null);
  revalidatePath("/studio/retreats/new");
  return { ok: true };
}
