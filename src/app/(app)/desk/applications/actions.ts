"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateDemoState } from "@/lib/demo/state";
import type { ApplicationStatus } from "@/lib/demo/applications";

const ALLOWED: ApplicationStatus[] = [
  "submitted", "under_review", "changes_requested", "approved", "rejected",
];

/**
 * Move a host application through its review states. Admin only. Once approved,
 * the host can build the full retreat (Retreat Builder — next milestone). We
 * never auto-publish: approval is an explicit, audited admin action.
 */
export async function setApplicationStatus(formData: FormData) {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ApplicationStatus;
  if (!id || !ALLOWED.includes(status)) return;

  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  let applicant: { name: string; email: string } | null = null;

  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    await supabase.from("host_applications").update({ status, review_notes: notes, updated_at: new Date().toISOString() }).eq("id", id);
    const { data } = await supabase.from("host_applications").select("name, email, applicant_id").eq("id", id).maybeSingle();
    if (data) applicant = { name: data.name, email: data.email };
    // On approval: grant the host role AND create their host profile row, so they
    // show up in Desk → Hosts immediately and their drafts/payouts link up. The
    // host row is keyed by owner_id, so the later retreat build reuses it (never
    // duplicates). promote_host_by_email covers the role for any existing account.
    if (applicant && status === "approved") {
      const { createServiceRoleClient } = await import("@/lib/supabase/server");
      await createServiceRoleClient().rpc("promote_host_by_email", { p_email: applicant.email });
      const applicantId = (data?.applicant_id as string | null) ?? null;
      if (applicantId) {
        const { ensureHostForOwner } = await import("@/lib/host/ensureHost");
        await ensureHostForOwner(applicantId, applicant.name);
      }
    }
    await supabase.from("admin_actions").insert({
      actor_id: admin.id,
      action: `application:${status}`,
      subject_type: "host_application",
      subject_id: id,
    });
  } else {
    updateDemoState((s) => {
      s.apps[id] = status;
    });
    const { DEMO_APPLICATIONS } = await import("@/lib/demo/applications");
    const app = DEMO_APPLICATIONS.find((a) => a.id === id);
    if (app) applicant = { name: app.name, email: app.email };
  }

  // Notify the applicant on a decision (best-effort).
  if (applicant && (status === "approved" || status === "rejected" || status === "changes_requested")) {
    try {
      const { sendEmail } = await import("@/lib/email");
      const { applicationStatusEmail } = await import("@/lib/email/templates");
      await sendEmail({ to: applicant.email, ...applicationStatusEmail(applicant.name, status, notes) });
    } catch { /* non-fatal */ }
  }

  revalidatePath("/desk/applications");
  revalidatePath("/desk/hosts");
  revalidatePath("/desk");
}
