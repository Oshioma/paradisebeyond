"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getDraft, setDraftStatus } from "@/lib/retreat/store";
import type { RetreatStatus } from "@/lib/retreat/schema";
import { revalidateSitePath } from "@/lib/brand/revalidate";

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
  // Feedback goes back to the submission that was acted on (and scrolls to it),
  // so on a phone the result isn't hidden at the top of a long page.
  const back = (q: string) => `/desk/submissions?${q}&id=${encodeURIComponent(id)}#s-${encodeURIComponent(id)}`;

  const { isSupabaseConfigured } = await import("@/lib/supabase/config");

  let publishedSlug: string | undefined;
  if (status === "approved") {
    if (!isSupabaseConfigured()) {
      redirect(back("error=" + encodeURIComponent("Publishing requires a live Supabase connection (demo mode is read-only).")));
    }
    const draft = await getDraft(id);
    if (!draft) redirect(back("error=Draft+not+found"));
    const { publishDraft } = await import("@/lib/retreat/publish");
    const res = await publishDraft(draft!, admin.id);
    if (!res.ok) {
      console.error(`[desk/submissions] publish failed for ${id}: ${res.error}`);
      redirect(back("error=" + encodeURIComponent(res.error)));
    }
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
  revalidateSitePath("/experiences");
  revalidatePath("/desk");
  if (publishedSlug) {
    revalidateSitePath(`/experiences/${publishedSlug}`);
    redirect(back(`published=${encodeURIComponent(publishedSlug)}`));
  }
  redirect(back(`status=${encodeURIComponent(status)}`));
}
