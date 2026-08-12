"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { saveDraft } from "@/lib/retreat/store";
import { validateForSubmit, type RetreatDraft } from "@/lib/retreat/schema";
import { saveUpload } from "@/lib/media/store";

/** Persist the current draft (autosave / "Save draft"). */
export async function saveRetreatDraft(draft: RetreatDraft) {
  const user = await requireRole("host");
  draft.hostId = user.hostSlug ? undefined : draft.hostId; // hostId is a hosts.id in live mode
  if (draft.status === "approved" || draft.status === "submitted") return; // don't overwrite a submitted draft
  await saveDraft(draft);
  revalidatePath("/studio/retreats");
}

/** Submit for approval. Validates required fields; sets status → submitted. */
export async function submitRetreat(draft: RetreatDraft): Promise<{ ok: boolean; errors?: string[] }> {
  await requireRole("host");
  const check = validateForSubmit(draft);
  if (!check.ok) return { ok: false, errors: check.errors };
  draft.status = "submitted";
  await saveDraft(draft);
  revalidatePath("/studio/retreats");
  revalidatePath("/desk/submissions");
  revalidatePath("/desk");
  return { ok: true };
}

/** Upload a photo used inside a draft; returns its URL. */
export async function uploadRetreatPhoto(draftId: string, slot: string, formData: FormData): Promise<string | null> {
  await requireRole("host");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > 8 * 1024 * 1024) throw new Error("Image too large (max 8MB).");
  const bytes = new Uint8Array(await file.arrayBuffer());
  return saveUpload(`retreat-${draftId}-${slot}`, { name: file.name, bytes, contentType: file.type || "image/jpeg" });
}

/**
 * Lightweight, local "AI assist". Real LLM-backed drafting is a Phase 2 wiring;
 * this generates useful starter copy from the host's inputs so the approve-
 * before-publish flow is demonstrable today. The host edits/approves everything.
 */
export async function suggestCopy(kind: string, draft: RetreatDraft): Promise<string[]> {
  await requireRole("host");
  const place = draft.locationLabel || draft.destinationName || "Zanzibar";
  const cat = draft.categorySlugs[0] ?? "wellness";
  const nights = draft.duration;
  switch (kind) {
    case "strapline":
      return [`${nights} days of ${cat} in ${place} — come back different.`];
    case "story":
      return [
        `Set on the ${place} coast, this ${nights}-day experience is built around one idea: that you deserve more than a holiday. Days move at the pace of the tide.`,
        `You'll be looked after from the moment you land — accommodation, meals and every scheduled moment handled — so all you have to do is arrive and be present.`,
      ];
    case "idealGuest":
      return [
        `You want ${cat} without pressure or dogma.`,
        `You'd rather arrive as a stranger and leave with a small, warm group of friends.`,
        `You're ready to give yourself ${nights} proper days.`,
      ];
    default:
      return [];
  }
}
