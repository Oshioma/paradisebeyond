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

  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    await supabase.from("host_applications").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
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
  }

  revalidatePath("/desk/applications");
  revalidatePath("/desk");
}
