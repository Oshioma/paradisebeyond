"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { setDraftStatus } from "@/lib/retreat/store";
import type { RetreatStatus } from "@/lib/retreat/schema";

const ALLOWED: RetreatStatus[] = ["under_review", "changes_requested", "approved", "rejected"];

/**
 * Move a submitted retreat through review. Admin only. Approval is explicit and
 * audited — nothing publishes automatically. On approval the host can go on to
 * materialise the draft into the live catalogue.
 */
export async function reviewSubmission(formData: FormData) {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as RetreatStatus;
  const notes = String(formData.get("notes") ?? "") || undefined;
  if (!id || !ALLOWED.includes(status)) return;

  await setDraftStatus(id, status, notes);

  const { isSupabaseConfigured } = await import("@/lib/supabase/config");
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    await createClient().from("admin_actions").insert({
      actor_id: admin.id,
      action: `retreat:${status}`,
      subject_type: "retreat_draft",
      subject_id: null,
      detail: { id },
    });
  }

  revalidatePath("/desk/submissions");
  revalidatePath("/desk");
}
