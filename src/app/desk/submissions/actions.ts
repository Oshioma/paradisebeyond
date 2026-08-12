"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getDraft, setDraftStatus } from "@/lib/retreat/store";
import type { RetreatStatus } from "@/lib/retreat/schema";

const ALLOWED: RetreatStatus[] = ["under_review", "changes_requested", "approved", "rejected"];

/**
 * Move a submitted retreat through review. Admin only. Approval is explicit and
 * audited. On approval the draft is materialised into the live catalogue — it
 * becomes a real, bookable experience — via publishDraft. Feedback is passed
 * back to the page via a redirect query param.
 */
export async function reviewSubmission(formData: FormData): Promise<void> {
  const admin = await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as RetreatStatus;
  const notes = String(formData.get("notes") ?? "") || undefined;
  if (!id || !ALLOWED.includes(status)) redirect("/desk/submissions?error=Invalid+request");

  const { isSupabaseConfigured } = await import("@/lib/supabase/config");

  let publishedSlug: string | undefined;
  if (status === "approved") {
    if (!isSupabaseConfigured()) {
      redirect("/desk/submissions?error=" + encodeURIComponent("Publishing requires a live Supabase connection (demo mode is read-only)."));
    }
    const draft = await getDraft(id);
    if (!draft) redirect("/desk/submissions?error=Draft+not+found");
    const { publishDraft } = await import("@/lib/retreat/publish");
    const res = await publishDraft(draft!, admin.id);
    if (!res.ok) redirect("/desk/submissions?error=" + encodeURIComponent(res.error));
    publishedSlug = res.slug;
  }

  await setDraftStatus(id, status, notes);

  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    await createClient().from("admin_actions").insert({
      actor_id: admin.id,
      action: `retreat:${status}`,
      subject_type: "retreat_draft",
      subject_id: null,
      detail: publishedSlug ? { id, slug: publishedSlug } : { id },
    });
  }

  revalidatePath("/desk/submissions");
  revalidatePath("/desk/experiences");
  revalidatePath("/experiences");
  revalidatePath("/desk");
  if (publishedSlug) {
    revalidatePath(`/experiences/${publishedSlug}`);
    redirect(`/desk/submissions?published=${encodeURIComponent(publishedSlug)}`);
  }
  redirect(`/desk/submissions?status=${encodeURIComponent(status)}`);
}
