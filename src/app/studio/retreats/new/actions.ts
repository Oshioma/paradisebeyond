"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { saveDraft } from "@/lib/retreat/store";
import { validateForSubmit, type RetreatDraft } from "@/lib/retreat/schema";
import { saveUpload } from "@/lib/media/store";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { callClaude, isAiEnabled, parseJsonObject } from "@/lib/ai/anthropic";
import { draftRetreat, type RetreatDraftSuggestion } from "@/lib/ai/retreat";
import { ensureHostForOwner } from "@/lib/host/ensureHost";

/**
 * Resolve — creating if necessary — the hosts.id owned by the current host, so
 * drafts carry a valid host_id (RLS on retreat_drafts / experiences keys off
 * hosts.owner_id). Shared with the application-approval path so a host is never
 * duplicated (both resolve the same row by owner_id).
 */
const ensureOwnedHostId = ensureHostForOwner;

/** Persist the current draft (autosave / "Save draft"). */
export async function saveRetreatDraft(draft: RetreatDraft) {
  const user = await requireRole("host");
  if (user.role === "host") {
    const hostId = await ensureOwnedHostId(user.id, user.name);
    if (hostId) draft.hostId = hostId; // hostId is a hosts.id in live mode
  }
  // Don't let a stale autosave clobber a draft that's mid-review. An `approved`
  // draft, by contrast, is a live listing the host has reopened to edit — those
  // edits must persist (they stay in the draft until re-submitted and
  // re-approved; the published listing is untouched meanwhile).
  if (draft.status === "submitted" || draft.status === "under_review") return;
  await saveDraft(draft);
  revalidatePath("/studio/retreats");
}

/**
 * Submit a retreat. A host submits for admin review; an admin building directly
 * publishes it straight to the live catalogue. Validates required fields first.
 */
export async function submitRetreat(draft: RetreatDraft): Promise<{ ok: boolean; errors?: string[]; slug?: string }> {
  const user = await requireRole("host");
  const check = validateForSubmit(draft);
  if (!check.ok) return { ok: false, errors: check.errors.map((e) => e.message) };

  // Admin direct-create → publish immediately.
  if (user.role === "admin") {
    if (!isSupabaseConfigured()) return { ok: false, errors: ["Publishing requires a live Supabase connection (demo mode is read-only)."] };
    draft.status = "approved";
    await saveDraft(draft);
    const { publishDraft } = await import("@/lib/retreat/publish");
    const res = await publishDraft(draft, user.id);
    if (!res.ok) return { ok: false, errors: [res.error] };
    revalidatePath("/desk/experiences");
    revalidatePath("/experiences");
    revalidatePath(`/experiences/${res.slug}`);
    return { ok: true, slug: res.slug };
  }

  // Host → queue for review.
  if (!draft.hostId) {
    const hostId = await ensureOwnedHostId(user.id, user.name);
    if (hostId) draft.hostId = hostId;
  }
  draft.status = "submitted";
  await saveDraft(draft);
  await notifyOnSubmission(draft, { name: user.name, email: user.email });
  revalidatePath("/studio/retreats");
  revalidatePath("/desk/submissions");
  revalidatePath("/desk");
  return { ok: true };
}

/**
 * Email the admin desk that a retreat needs review — for a brand-new submission
 * or an update to an already-live listing (e.g. a host who added photos after
 * approval). This is what makes edits reach the live site: the admin approves
 * from the email link, which re-publishes. Best-effort; never blocks the submit.
 */
async function notifyOnSubmission(draft: RetreatDraft, host: { name: string; email: string }): Promise<void> {
  try {
    let isUpdate = false;
    if (isSupabaseConfigured()) {
      const { createServiceRoleClient } = await import("@/lib/supabase/server");
      const { data } = await createServiceRoleClient()
        .from("experiences")
        .select("slug")
        .eq("retreat_draft_id", draft.id)
        .maybeSingle();
      isUpdate = Boolean(data?.slug);
    }
    const { sendEmail } = await import("@/lib/email");
    const { siteUrl } = await import("@/lib/siteUrl");
    const base = siteUrl();
    const title = draft.name?.trim() || "Untitled retreat";

    // 1. Admin: there's something to review/approve.
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: isUpdate ? `Retreat update to approve — ${title}` : `New retreat to review — ${title}`,
        html: `<p><strong>${host.name}</strong> ${isUpdate ? "updated their live retreat" : "submitted a retreat for review"}: <strong>${title}</strong>.</p>
${isUpdate ? "<p>Approving pushes their changes — including any new photos — live.</p>" : ""}
<p><a href="${base}/desk/submissions">Review &amp; approve in the admin desk →</a></p>`,
      });
    }

    // 2. Host (first submission only): invite them to personalise their page
    //    while we review — so the retreat goes up first, branding comes after.
    if (!isUpdate && host.email) {
      await sendEmail({
        to: host.email,
        subject: `Your retreat is in review — make its page yours`,
        html: `<p>Hi ${host.name.split(" ")[0] || "there"},</p>
<p>Thanks for submitting <strong>${title}</strong> — our team is reviewing it now, and we'll be in touch soon.</p>
<p>While you wait, you can make your retreat's page feel like your own: pick your brand colour and add your links (Instagram, your website). It'll show on your shareable retreat page.</p>
<p><a href="${base}/studio/branding">Customise your page →</a></p>`,
      });
    }
  } catch {
    /* non-fatal — the submission is queued regardless */
  }
}

/** Upload a photo used inside a draft; returns its URL. */
export async function uploadRetreatPhoto(draftId: string, slot: string, formData: FormData): Promise<string | null> {
  await requireRole("host");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > 20 * 1024 * 1024) throw new Error("Image too large (max 20MB).");
  const bytes = new Uint8Array(await file.arrayBuffer());
  return saveUpload(`retreat-${draftId}-${slot}`, { name: file.name, bytes, contentType: file.type || "image/jpeg" });
}

/**
 * Full AI draft from a short brief. Calls Claude when ANTHROPIC_API_KEY is set,
 * otherwise returns on-brand heuristic copy. Either way this only produces a
 * *suggestion*: the host reviews and edits every field in the wizard, and admin
 * still approves by hand before anything goes live. AI assists; never publishes.
 */
export async function aiDraftRetreat(brief: string, draft: RetreatDraft): Promise<RetreatDraftSuggestion> {
  await requireRole("host");
  return draftRetreat({
    brief: brief.slice(0, 2000),
    duration: draft.duration,
    destinationName: draft.destinationName || "Zanzibar",
    locationLabel: draft.locationLabel || undefined,
    category: draft.categorySlugs[0],
  });
}

/** Whether live AI drafting is available (so the UI can label the assist honestly). */
export async function aiAvailable(): Promise<boolean> {
  await requireRole("host");
  return isAiEnabled();
}

/**
 * Per-field "✨ Suggest". Uses Claude for a single field when configured, with a
 * local heuristic fallback so the button always returns something useful.
 */
export async function suggestCopy(kind: string, draft: RetreatDraft): Promise<string[]> {
  await requireRole("host");
  const place = draft.locationLabel || draft.destinationName || "Zanzibar";
  const cat = draft.categorySlugs[0] ?? "wellness";
  const nights = draft.duration;

  if (isAiEnabled()) {
    const ai = await suggestField(kind, { place, cat, nights, draft });
    if (ai?.length) return ai;
  }

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

async function suggestField(
  kind: string,
  ctx: { place: string; cat: string; nights: number; draft: RetreatDraft },
): Promise<string[] | null> {
  const shapes: Record<string, string> = {
    strapline: `{"lines": [one short strapline under 12 words]}`,
    story: `{"lines": [2–3 short second-person paragraphs, no bullet lists]}`,
    idealGuest: `{"lines": [3 short "this is for you if…" lines]}`,
  };
  const shape = shapes[kind];
  if (!shape) return null;

  const context = [
    ctx.draft.name ? `Retreat name: ${ctx.draft.name}.` : "",
    `A ${ctx.nights}-day ${ctx.cat} retreat in ${ctx.place}.`,
    ctx.draft.strapline && kind !== "strapline" ? `Strapline: ${ctx.draft.strapline}.` : "",
    ctx.draft.story.filter(Boolean).length && kind !== "story" ? `Story so far: ${ctx.draft.story.filter(Boolean).join(" ")}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const text = await callClaude({
    system:
      `You are a senior travel-magazine editor for "Paradise Beyond", writing warm, evocative, precise retreat copy — never salesy or generic. Reply with ONE JSON object and nothing else, in this shape: ${shape}`,
    prompt: `${context}\n\nWrite the "${kind}" copy.`,
    maxTokens: 600,
  });
  const parsed = parseJsonObject<{ lines?: unknown }>(text);
  if (!parsed || !Array.isArray(parsed.lines)) return null;
  const lines = parsed.lines.map((l) => (typeof l === "string" ? l.trim() : "")).filter(Boolean);
  return lines.length ? lines : null;
}
