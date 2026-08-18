"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ensureHostForOwner } from "@/lib/host/ensureHost";
import { saveUpload } from "@/lib/media/store";
import { siteUrl } from "@/lib/siteUrl";

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

const RESERVED = new Set([
  "www", "api", "app", "admin", "mail", "ftp", "blog", "help", "support",
  "staging", "dev", "test", "cdn", "assets", "static", "book", "studio",
  "desk", "experiences", "hosts", "r", "account", "login", "signup",
]);

/**
 * Set (or clear) an experience's custom vanity subdomain. Host may only set it
 * for their own retreat. Lowercase letters/digits, 3–30 chars, not reserved,
 * unique across experiences. Pass "" to clear (back to the slug default).
 */
export async function setExperienceSubdomain(slug: string, labelRaw: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireRole("host");
  if (!isSupabaseConfigured()) return { ok: false, error: "Needs the live database." };

  const label = labelRaw.trim().toLowerCase();
  if (label) {
    if (!/^[a-z0-9]{3,30}$/.test(label)) return { ok: false, error: "Use 3–30 letters or numbers, no spaces or symbols." };
    if (RESERVED.has(label)) return { ok: false, error: "That address is reserved — try another." };
  }

  const { getExperienceBySlug } = await import("@/lib/data/repository");
  const exp = await getExperienceBySlug(slug);
  if (!exp) return { ok: false, error: "Experience not found." };
  if (user.role !== "admin" && (!user.hostSlug || !exp.hostSlugs.includes(user.hostSlug))) {
    return { ok: false, error: "That's not your retreat to rename." };
  }

  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const { error } = await createServiceRoleClient()
      .from("experiences")
      .update({ subdomain: label || null })
      .eq("slug", slug);
    if (error) {
      if (/duplicate|unique/i.test(error.message)) return { ok: false, error: "That address is already taken — try another." };
      return { ok: false, error: `Couldn't save: ${error.message}` };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Couldn't save the address." };
  }

  const { invalidateExperiences } = await import("@/lib/data/repository");
  invalidateExperiences();
  revalidatePath("/studio/branding");
  revalidatePath(`/experiences/${slug}`);
  return { ok: true };
}

const DOMAIN_RE = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

/**
 * Best-effort: register the domain with the hosting project (Vercel) so it
 * serves the site + gets SSL automatically. No-op unless VERCEL_API_TOKEN and
 * VERCEL_PROJECT_ID are configured; failures are swallowed (the host can add the
 * domain in the dashboard instead), so this never blocks saving.
 */
async function tryAddVercelDomain(domain: string): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return;
  const teamId = process.env.VERCEL_TEAM_ID;
  const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  try {
    await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains${qs}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: domain }),
    });
  } catch {
    /* ignore — the host can add the domain in the hosting dashboard manually */
  }
}

/**
 * Connect (or clear) the host's own custom domain for a retreat's microsite —
 * e.g. aminaretreats.com. Host may only set it for their own retreat. Must be a
 * valid domain, not a paradisebeyond.com address, unique across experiences.
 * Pass "" to disconnect. The host still points DNS + it must be added to the
 * hosting project (attempted automatically when Vercel creds are configured).
 */
export async function setCustomDomain(slug: string, domainRaw: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireRole("host");
  if (!isSupabaseConfigured()) return { ok: false, error: "Needs the live database." };

  let domain = domainRaw.trim().toLowerCase();
  if (domain) {
    domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "").replace(/\.$/, "");
    if (!DOMAIN_RE.test(domain)) return { ok: false, error: "Enter a valid domain like retreats.example.com." };
    let ownBase = "";
    try { ownBase = new URL(siteUrl()).host.replace(/^www\./, "").toLowerCase(); } catch { /* none */ }
    if (ownBase && (domain === ownBase || domain.endsWith("." + ownBase))) {
      return { ok: false, error: "Use your own domain, not a paradisebeyond.com address." };
    }
  }

  const { getExperienceBySlug } = await import("@/lib/data/repository");
  const exp = await getExperienceBySlug(slug);
  if (!exp) return { ok: false, error: "Experience not found." };
  if (user.role !== "admin" && (!user.hostSlug || !exp.hostSlugs.includes(user.hostSlug))) {
    return { ok: false, error: "That's not your retreat." };
  }

  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const { error } = await createServiceRoleClient()
      .from("experiences")
      .update({ custom_domain: domain || null })
      .eq("slug", slug);
    if (error) {
      if (/duplicate|unique/i.test(error.message)) return { ok: false, error: "That domain is already connected to another retreat." };
      return { ok: false, error: `Couldn't save: ${error.message}` };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Couldn't save the domain." };
  }

  if (domain) await tryAddVercelDomain(domain);

  const { invalidateExperiences } = await import("@/lib/data/repository");
  invalidateExperiences();
  revalidatePath("/studio/branding");
  revalidatePath(`/experiences/${slug}`);
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
