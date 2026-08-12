"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateDemoState } from "@/lib/demo/state";

function clampRating(v: FormDataEntryValue | null): number | undefined {
  const n = Math.round(Number(v));
  return n >= 1 && n <= 5 ? n : undefined;
}

/**
 * Guest submits a review for their own completed booking. Starts unpublished —
 * an admin moderates before it goes public. RLS enforces booking ownership and
 * that the booking is completed (live mode).
 */
export async function submitReview(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") ?? "");
  const experienceSlug = String(formData.get("experienceSlug") ?? "");
  const overall = clampRating(formData.get("ratingOverall"));
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  if (!bookingId || !overall) return { ok: false, error: "Please choose an overall rating." };

  const subs = {
    ratingHost: clampRating(formData.get("ratingHost")),
    ratingAccommodation: clampRating(formData.get("ratingAccommodation")),
    ratingActivities: clampRating(formData.get("ratingActivities")),
    ratingFood: clampRating(formData.get("ratingFood")),
    ratingValue: clampRating(formData.get("ratingValue")),
  };

  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data: exp } = await supabase.from("experiences").select("id").eq("slug", experienceSlug).maybeSingle();
    if (!exp?.id) return { ok: false, error: "Experience not found." };
    const { error } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      experience_id: exp.id,
      guest_id: user.id,
      rating_overall: overall,
      rating_host: subs.ratingHost ?? null,
      rating_accommodation: subs.ratingAccommodation ?? null,
      rating_activities: subs.ratingActivities ?? null,
      rating_food: subs.ratingFood ?? null,
      rating_value: subs.ratingValue ?? null,
      body: body || null,
      published: false,
    });
    if (error) {
      // Unique(booking_id) or RLS (not completed / not owner) failures land here.
      return { ok: false, error: error.message.includes("duplicate") ? "You've already reviewed this trip." : error.message };
    }
  } else {
    updateDemoState((s) => {
      if (s.reviews.some((r) => r.bookingId === bookingId)) return;
      s.reviews.push({
        id: "rv-" + crypto.randomUUID().slice(0, 8),
        bookingId,
        experienceSlug,
        guestId: user.id,
        guestName: user.name,
        ratingOverall: overall,
        ...subs,
        body,
        published: false,
        createdAt: new Date().toISOString(),
      });
    });
  }

  revalidatePath(`/account/trips/${bookingId}`);
  revalidatePath(`/experiences/${experienceSlug}`);
  revalidatePath("/desk/reviews");
  return { ok: true };
}

/** Admin approves (publishes) or rejects (removes) a pending review. */
export async function moderateReview(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!id || !["approve", "reject"].includes(action)) return;

  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    if (action === "approve") await supabase.from("reviews").update({ published: true }).eq("id", id);
    else await supabase.from("reviews").delete().eq("id", id);
  } else {
    updateDemoState((s) => {
      if (action === "approve") {
        const r = s.reviews.find((x) => x.id === id);
        if (r) r.published = true;
      } else {
        s.reviews = s.reviews.filter((x) => x.id !== id);
      }
    });
  }

  revalidatePath("/desk/reviews");
  revalidatePath("/experiences");
}
