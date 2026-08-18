"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { setExperienceOrder } from "@/lib/data/experienceOrder";
import { invalidateExperiences, getExperienceBySlug } from "@/lib/data/repository";
import { ensureHostForOwner } from "@/lib/host/ensureHost";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Experience } from "@/lib/types";

/**
 * Persist the admin's chosen order of experiences (a list of slugs, top first).
 * Applied everywhere the listing appears, so revalidate those paths.
 */
export async function reorderExperiences(slugs: string[]): Promise<{ ok: boolean; error?: string }> {
  await requireRole("admin");
  if (!Array.isArray(slugs) || slugs.some((s) => typeof s !== "string")) {
    return { ok: false, error: "Invalid order." };
  }
  try {
    await setExperienceOrder(slugs);
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Couldn't save the order." };
  }
  invalidateExperiences();
  revalidatePath("/desk/experiences");
  revalidatePath("/experiences");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Admin shortcut: fork any experience (including a built-in sample) into a fresh,
 * editable wizard draft owned by the admin, then open it in the builder. Lets you
 * turn a good-looking sample into your own real retreat by editing rather than
 * starting from a blank wizard. On publish it becomes a normal DB experience,
 * which also replaces the placeholder samples on the public site.
 */
export async function startDraftFromSample(slug: string): Promise<{ ok: false; error: string }> {
  const user = await requireRole("admin");
  if (!isSupabaseConfigured()) return { ok: false, error: "This needs the live database." };

  const exp = await getExperienceBySlug(slug);
  if (!exp) return { ok: false, error: "Couldn't find that experience." };

  const id = `r-${crypto.randomUUID().slice(0, 8)}`;
  const { draftFromExperience } = await import("@/lib/retreat/fromExperience");
  const draft = draftFromExperience(exp, id);
  draft.hostName = user.name;

  // Carry the photos across. Each image is a seed: if a real photo was uploaded
  // for it, use that file's URL directly (so the copy is decoupled from the
  // sample); otherwise carry the seed's generated image URL. Publish then writes
  // these as this experience's own photo overrides.
  const { getOverride } = await import("@/lib/media/store");
  const { slotKey, img } = await import("@/lib/images");
  const resolveImage = async (seed: string, w: number, h: number): Promise<string> =>
    (await getOverride(slotKey(seed))) ?? img(seed, w, h);
  if (exp.heroImageSeed) draft.heroImageUrl = await resolveImage(exp.heroImageSeed, 2000, 1200);
  const gallerySeeds = exp.gallerySeeds?.length ? exp.gallerySeeds : exp.stay?.imageSeeds ?? [];
  draft.galleryUrls = await Promise.all(gallerySeeds.map((s) => resolveImage(s, 1600, 1200)));
  // Own it — attach the admin's host row so the copy is theirs on publish.
  const hostId = await ensureHostForOwner(user.id, user.name);
  if (hostId) draft.hostId = hostId;
  draft.updatedAt = new Date().toISOString();

  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const { error } = await createServiceRoleClient().from("retreat_drafts").upsert(
      { id: draft.id, host_id: draft.hostId ?? null, status: draft.status, data: draft, updated_at: draft.updatedAt },
      { onConflict: "id" },
    );
    if (error) return { ok: false, error: `Couldn't create the draft: ${error.message}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Couldn't create the draft." };
  }

  // Success → straight into the builder, pre-filled and ready to edit.
  redirect(`/studio/retreats/new?id=${id}`);
}

/**
 * Assign a different host to an experience. Updates both the stored content
 * (`hostSlugs`, which the public site reads) and the experience_hosts join, so
 * the change is consistent everywhere. Admin only; service-role write.
 */
export async function setExperienceHost(slug: string, hostSlug: string): Promise<{ ok: boolean; error?: string }> {
  await requireRole("admin");
  if (!slug || !hostSlug) return { ok: false, error: "Missing experience or host." };
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Changing the host needs the live database (Supabase)." };
  }
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const supabase = createServiceRoleClient();

    const { data: exp, error: expErr } = await supabase
      .from("experiences")
      .select("id, content")
      .eq("slug", slug)
      .maybeSingle();
    if (expErr || !exp) return { ok: false, error: "Couldn't find that experience." };

    const { data: host, error: hostErr } = await supabase
      .from("hosts")
      .select("id")
      .eq("slug", hostSlug)
      .maybeSingle();
    if (hostErr || !host) return { ok: false, error: "Couldn't find that host." };

    const content = { ...(exp.content as Experience), hostSlugs: [hostSlug] };
    const { error: upErr } = await supabase.from("experiences").update({ content }).eq("id", exp.id);
    if (upErr) return { ok: false, error: `Saving failed: ${upErr.message}` };

    // Replace the join so the experience points at exactly this host.
    await supabase.from("experience_hosts").delete().eq("experience_id", exp.id);
    const { error: joinErr } = await supabase
      .from("experience_hosts")
      .insert({ experience_id: exp.id, host_id: host.id });
    if (joinErr) return { ok: false, error: `Linking the host failed: ${joinErr.message}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Couldn't change the host." };
  }

  invalidateExperiences();
  revalidatePath("/desk/experiences");
  revalidatePath(`/experiences/${slug}`);
  revalidatePath("/experiences");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Re-run publishing for a live experience from its current linked draft. Copies
 * the draft's latest state — photos included — into the live listing and its
 * image overrides. Fixes the case where a host edited/added photos after
 * approval (which doesn't auto-publish), so the live slots were left empty.
 */
export async function republishExperience(slug: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireRole("admin");
  if (!slug) return { ok: false, error: "Missing experience." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Re-publishing needs the live database." };

  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { data: exp } = await createServiceRoleClient()
    .from("experiences")
    .select("retreat_draft_id")
    .eq("slug", slug)
    .maybeSingle();
  const draftId = exp?.retreat_draft_id as string | null | undefined;
  if (!draftId) return { ok: false, error: "This experience isn't linked to a builder draft, so there's nothing to re-publish from." };

  const { getDraft } = await import("@/lib/retreat/store");
  const draft = await getDraft(draftId);
  if (!draft) return { ok: false, error: "Couldn't load the linked draft." };

  const { publishDraft } = await import("@/lib/retreat/publish");
  const res = await publishDraft(draft, admin.id);
  if (!res.ok) return { ok: false, error: res.error };

  invalidateExperiences();
  revalidatePath("/desk/experiences");
  revalidatePath("/experiences");
  revalidatePath(`/experiences/${res.slug}`);
  revalidatePath("/");
  return { ok: true };
}
