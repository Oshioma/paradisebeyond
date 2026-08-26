"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getInvite,
  getBookingMeta,
  getExperienceSlugById,
  saveGuestPhotoFile,
  addPhotoUrls,
} from "@/lib/memories/store";

/**
 * Actions on the guest magic-link page. The token (a guest_invites row id,
 * only ever sent to the guest's own email) is the authentication: every action
 * re-resolves it server-side and touches only that invite's booking/retreat.
 */

const MAX_BYTES = 20 * 1024 * 1024; // matches the admin media uploader
const MAX_FILES = 12;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/heic", "image/heif"];

export type GuestActionResult = { ok: true; count?: number } | { ok: false; error: string };

function revalidateRetreat(slug: string) {
  revalidatePath(`/experiences/${slug}`);
  revalidatePath(`/r/${slug}`);
}

export async function uploadGuestPhotos(formData: FormData): Promise<GuestActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Photo uploads need the live site." };
  const token = String(formData.get("token") ?? "");
  const invite = await getInvite(token);
  if (!invite) return { ok: false, error: "This link is no longer valid." };

  const dayRaw = Number(formData.get("day"));
  const dayNumber = Number.isInteger(dayRaw) && dayRaw >= 1 ? dayRaw : null;
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { ok: false, error: "Choose at least one photo." };
  if (files.length > MAX_FILES) return { ok: false, error: `Up to ${MAX_FILES} photos per upload, please.` };

  const urls: string[] = [];
  for (const file of files) {
    if (file.size > MAX_BYTES) {
      return { ok: false, error: `“${file.name}” is over 20MB — try a smaller photo.` };
    }
    if (file.type && !OK_TYPES.includes(file.type)) {
      return { ok: false, error: `“${file.name}” isn't a supported image type.` };
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      urls.push(
        await saveGuestPhotoFile(invite.experienceId, {
          name: file.name,
          bytes,
          contentType: file.type || "image/jpeg",
        }),
      );
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Upload failed — please try again." };
    }
  }

  await addPhotoUrls(invite.experienceId, urls, {
    dayNumber,
    source: "guest",
    uploaderName: invite.guestName ?? undefined,
    bookingId: invite.bookingId,
  });

  const slug = await getExperienceSlugById(invite.experienceId);
  if (slug) revalidateRetreat(slug);
  return { ok: true, count: urls.length };
}

export async function submitGuestReview(formData: FormData): Promise<GuestActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Reviews need the live site." };
  const token = String(formData.get("token") ?? "");
  const invite = await getInvite(token);
  if (!invite) return { ok: false, error: "This link is no longer valid." };

  const overall = Math.round(Number(formData.get("ratingOverall")));
  if (!(overall >= 1 && overall <= 5)) return { ok: false, error: "Please choose an overall rating." };
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  const sub = (key: string) => {
    const n = Math.round(Number(formData.get(key)));
    return n >= 1 && n <= 5 ? n : null;
  };

  // The service role bypasses RLS, so re-apply its rules here: the trip must
  // have ended, the booking must be active, and one review per booking.
  const meta = await getBookingMeta(invite.bookingId);
  if (!meta) return { ok: false, error: "We couldn't find your booking." };
  if (!["reserved", "confirmed", "completed"].includes(meta.status)) {
    return { ok: false, error: "This booking can't be reviewed." };
  }
  if (!meta.endDate || meta.endDate >= new Date().toISOString().slice(0, 10)) {
    return { ok: false, error: "Reviews open once your trip has ended." };
  }

  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { error } = await createServiceRoleClient().from("reviews").insert({
    booking_id: invite.bookingId,
    experience_id: invite.experienceId,
    guest_id: meta.guestId,
    guest_name: invite.guestName,
    rating_overall: overall,
    rating_host: sub("ratingHost"),
    rating_accommodation: sub("ratingAccommodation"),
    rating_activities: sub("ratingActivities"),
    rating_food: sub("ratingFood"),
    rating_value: sub("ratingValue"),
    body: body || null,
    published: false, // moderated at /desk/reviews like every review
  });
  if (error) {
    return {
      ok: false,
      error: error.message.includes("duplicate") ? "You've already reviewed this trip — thank you!" : error.message,
    };
  }

  const slug = await getExperienceSlugById(invite.experienceId);
  if (slug) revalidateRetreat(slug);
  return { ok: true };
}
