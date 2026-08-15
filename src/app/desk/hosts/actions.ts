"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type HostUpdate = {
  name: string;
  headline: string;
  bio: string;
  specialisms: string[];
  verified: boolean;
};

export type HostResult = { ok: true } | { ok: false; error: string };

/**
 * Update a host profile. Admin only; writes with the service role (host rows are
 * admin-managed) and CHECKs the error so a genuine failure surfaces rather than
 * silently vanishing. Returns {ok,error} because Next redacts thrown Server
 * Action messages in production.
 */
export async function updateHost(slug: string, fields: HostUpdate): Promise<HostResult> {
  await requireRole("admin");
  if (!slug) return { ok: false, error: "Missing host." };
  const name = fields.name.trim();
  if (!name) return { ok: false, error: "A host needs a name." };
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Editing hosts needs the live database (Supabase). This is the demo catalogue." };
  }

  const specialisms = fields.specialisms.map((s) => s.trim()).filter(Boolean);
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const { error } = await createServiceRoleClient()
      .from("hosts")
      .update({
        name,
        headline: fields.headline.trim() || null,
        bio: fields.bio.trim() || null,
        specialisms,
        verified: fields.verified,
      })
      .eq("slug", slug);
    if (error) return { ok: false, error: `Saving the host failed: ${error.message}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Couldn't save the host." };
  }

  revalidatePath("/desk/hosts");
  revalidatePath(`/desk/hosts/${slug}`);
  revalidatePath(`/hosts/${slug}`);
  revalidatePath("/hosts");
  return { ok: true };
}
