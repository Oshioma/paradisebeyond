"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ensureHostForOwner } from "@/lib/host/ensureHost";
import { saveUpload } from "@/lib/media/store";

export type Social = { label: string; href: string };
export type BrandingResult = { ok: true } | { ok: false; error: string };

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Save the host's page branding — brand colour, tagline, logo and social links.
 * Applies across their microsite and public pages. Service-role write (hosts is
 * admin-managed under RLS); scoped to the host row owned by the caller.
 */
export async function updateHostBranding(
  brandColor: string,
  socials: Social[],
  tagline: string,
  logoUrl: string,
): Promise<BrandingResult> {
  const user = await requireRole("host");
  if (!isSupabaseConfigured()) return { ok: false, error: "Customising your page needs the live database." };

  const color = brandColor.trim();
  if (color && !HEX.test(color)) return { ok: false, error: "Pick a valid colour." };

  const clean = socials
    .map((s) => ({ label: s.label.trim(), href: s.href.trim() }))
    .filter((s) => s.label && s.href)
    .filter((s) => /^https?:\/\//i.test(s.href))
    .slice(0, 8);

  const hostId = await ensureHostForOwner(user.id, user.name);
  if (!hostId) return { ok: false, error: "No host profile linked to your account." };

  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const { error } = await createServiceRoleClient()
      .from("hosts")
      .update({ brand_color: color || null, socials: clean, tagline: tagline.trim() || null, logo_url: logoUrl.trim() || null })
      .eq("id", hostId);
    if (error) return { ok: false, error: `Couldn't save: ${error.message}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Couldn't save your page." };
  }

  revalidatePath("/studio/branding");
  return { ok: true };
}

/** Upload a logo image and return its URL (the form persists it on Save). */
export async function uploadHostLogo(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const user = await requireRole("host");
  if (!isSupabaseConfigured()) return { ok: false, error: "Uploading needs the live database." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "No file selected." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Logo too large (max 5MB)." };

  const hostId = (await ensureHostForOwner(user.id, user.name)) ?? user.id;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const url = await saveUpload(`host-logo-${hostId}`, { name: file.name, bytes, contentType: file.type || "image/png" });
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Upload failed." };
  }
}
