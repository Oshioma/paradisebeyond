"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getManagedExperiences, getHost } from "@/lib/data/repository";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { guestMemoriesEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/siteUrl";
import {
  addManualContacts,
  getContactsByIds,
  getExperienceIdsBySlugs,
  getExperienceSlugById,
  upsertContactInvite,
} from "@/lib/memories/store";

export type SendResult = { ok: true; sent: number; skipped: number } | { ok: false; error: string };
export type AddResult = { ok: true; added: number; duplicates: number; invalid: number } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parse pasted contact lines. Accepts, one per line:
 *   Name <email@x.com> · Name, email@x.com · Name<TAB>email@x.com · email@x.com
 * The token that looks like an email is the email; the rest is the name.
 */
function parseContactLines(text: string): { rows: { name: string | null; email: string }[]; invalid: number } {
  const rows: { name: string | null; email: string }[] = [];
  let invalid = 0;
  // Find the email anywhere in the line; whatever's left is the name. Handles
  // "Name, email", "Name <email>", "Name<TAB>email", "Name email", "email".
  const EMAIL_IN_LINE = /[^\s,;<>()"]+@[^\s,;<>()"]+\.[^\s,;<>()"]+/;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = EMAIL_IN_LINE.exec(line);
    if (!m || !EMAIL_RE.test(m[0])) {
      invalid++;
      continue;
    }
    const email = m[0];
    const name =
      line.replace(email, "").replace(/[<>(),;\t"]+/g, " ").replace(/\s+/g, " ").trim() || null;
    rows.push({ name, email });
  }
  return { rows, invalid };
}

/** Add contacts a host pastes in (name + email), to a retreat they manage. */
export async function addPastedContacts(formData: FormData): Promise<AddResult> {
  const user = await requireRole("host");
  if (!isSupabaseConfigured()) return { ok: false, error: "Adding contacts needs the live database." };
  const experienceSlug = String(formData.get("experienceSlug") ?? "");
  const text = String(formData.get("text") ?? "");

  const managed = await getManagedExperiences(user);
  if (!managed.some((e) => e.slug === experienceSlug)) {
    return { ok: false, error: "You don't manage this retreat." };
  }
  const experienceId = (await getExperienceIdsBySlugs([experienceSlug]))[experienceSlug];
  if (!experienceId) return { ok: false, error: "Retreat not found." };

  const { rows, invalid } = parseContactLines(text);
  if (!rows.length) return { ok: false, error: invalid ? "No valid email addresses found." : "Paste at least one contact." };

  try {
    const { added, duplicates } = await addManualContacts(experienceId, rows);
    revalidatePath("/studio/contacts");
    return { ok: true, added, duplicates, invalid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't add those contacts." };
  }
}

/**
 * Email selected imported contacts (past attendees) the branded "guest
 * memories" invite — a magic link to add photos and review the retreat. One
 * durable token per contact (resending reuses it).
 */
export async function messageContacts(formData: FormData): Promise<SendResult> {
  const user = await requireRole("host");
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Contact emails need the live database — this demo environment can't send them." };
  }

  const contactIds = formData.getAll("contactIds").map(String).filter(Boolean);
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 200);
  const message = String(formData.get("message") ?? "").trim().slice(0, 5000);
  if (!contactIds.length) return { ok: false, error: "Select at least one contact." };
  if (!message) return { ok: false, error: "Write a short message to your contacts." };

  // Only contacts on retreats this user manages, and only those with an email.
  const managed = await getManagedExperiences(user);
  const managedIds = new Set(Object.values(await getExperienceIdsBySlugs(managed.map((e) => e.slug))));
  const contacts = (await getContactsByIds(contactIds)).filter((c) => managedIds.has(c.experienceId) && c.email);
  if (!contacts.length) return { ok: false, error: "None of the selected contacts are on your retreats (or they have no email)." };

  const slugByExp: Record<string, string> = {};
  for (const e of managed) slugByExp[e.slug] = e.slug;

  let sent = 0;
  let skipped = 0;
  for (const c of contacts) {
    try {
      const token = await upsertContactInvite({
        contactId: c.id,
        experienceId: c.experienceId,
        email: c.email as string,
        guestName: c.name ?? undefined,
      });
      const slug = await getExperienceSlugById(c.experienceId);
      const exp = managed.find((e) => e.slug === slug);
      const host = exp ? await getHost(exp.hostSlugs[0]) : undefined;
      const tpl = guestMemoriesEmail({
        guestName: c.name || "there",
        hostName: host?.name ?? exp?.name ?? "Your host",
        experienceName: exp?.name ?? "our retreat",
        subject: subject || undefined,
        message,
        link: `${siteUrl()}/memories/${token}`,
        brandColor: host?.brandColor,
        logoUrl: host?.logoUrl,
        tagline: host?.tagline,
      });
      const res = await sendEmail({ to: c.email as string, subject: tpl.subject, html: tpl.html });
      if (res.ok) sent++;
      else skipped++;
    } catch {
      skipped++;
    }
  }

  revalidatePath("/studio/contacts");
  if (sent === 0) {
    return {
      ok: false,
      error: isEmailConfigured()
        ? "No emails could be sent — please try again."
        : "Email isn't configured yet (RESEND_API_KEY). Invites were prepared but not delivered.",
    };
  }
  return { ok: true, sent, skipped };
}
