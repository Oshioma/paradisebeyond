"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { setExperienceOrder } from "@/lib/data/experienceOrder";
import { invalidateExperiences } from "@/lib/data/repository";
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
