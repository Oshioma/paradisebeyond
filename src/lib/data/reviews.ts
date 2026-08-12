import type { Review } from "@/lib/reviews/types";
import { summarize } from "@/lib/reviews/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readDemoState } from "@/lib/demo/state";

/**
 * Reviews read model. Live path reads the `reviews` table (RLS: published are
 * public, a guest sees their own, admins see all). Demo path serves a seeded
 * published review plus anything submitted into demo state.
 */

const DEMO_SEED: Review[] = [
  {
    id: "rv-seed-1",
    bookingId: "bk-seed-1",
    experienceSlug: "zanzibar-reconnection",
    guestId: "demo-guest-2",
    guestName: "Leïla M.",
    ratingOverall: 5,
    ratingHost: 5,
    ratingAccommodation: 5,
    ratingActivities: 5,
    ratingFood: 4,
    ratingValue: 5,
    body: "I arrived exhausted and left feeling like myself again. Amina holds space so gently, the beach house is heaven, and the pace was exactly right. Worth every day.",
    published: true,
    createdAt: "2026-05-20T10:00:00.000Z",
  },
  {
    id: "rv-seed-2",
    bookingId: "bk-seed-2",
    experienceSlug: "zanzibar-reconnection",
    guestId: "demo-guest-3",
    guestName: "Tom R.",
    ratingOverall: 4,
    body: "A beautiful week. The yoga and the food were highlights. Only wish it were a day or two longer.",
    published: true,
    createdAt: "2026-04-11T10:00:00.000Z",
  },
];

function mapRow(r: Record<string, unknown>, idToSlug?: Map<string, string>): Review {
  const guest = (r.guest ?? null) as { full_name?: string } | null;
  const exp = (r.experiences ?? null) as { slug?: string; name?: string } | null;
  return {
    id: r.id as string,
    bookingId: r.booking_id as string,
    experienceSlug: exp?.slug ?? idToSlug?.get(r.experience_id as string) ?? "",
    guestId: r.guest_id as string,
    guestName: guest?.full_name || "Guest",
    ratingOverall: Number(r.rating_overall),
    ratingHost: r.rating_host == null ? undefined : Number(r.rating_host),
    ratingAccommodation: r.rating_accommodation == null ? undefined : Number(r.rating_accommodation),
    ratingActivities: r.rating_activities == null ? undefined : Number(r.rating_activities),
    ratingFood: r.rating_food == null ? undefined : Number(r.rating_food),
    ratingValue: r.rating_value == null ? undefined : Number(r.rating_value),
    body: (r.body as string) ?? "",
    published: Boolean(r.published),
    createdAt: r.created_at as string,
    experienceName: exp?.name,
  };
}

/** Published reviews for a set of experience slugs (used per-experience and per-host). */
export async function getReviewsForSlugs(slugs: string[]): Promise<Review[]> {
  const clean = slugs.filter(Boolean);
  if (clean.length === 0) return [];

  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data: exps } = await supabase.from("experiences").select("id, slug").in("slug", clean);
    const idToSlug = new Map<string, string>((exps ?? []).map((e: Record<string, unknown>) => [e.id as string, e.slug as string]));
    const ids = Array.from(idToSlug.keys());
    if (ids.length === 0) return [];
    const { data } = await supabase
      .from("reviews")
      .select("*, guest:profiles(full_name)")
      .in("experience_id", ids)
      .eq("published", true)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r: Record<string, unknown>) => mapRow(r, idToSlug));
  }

  const state = readDemoState();
  const all = [...DEMO_SEED, ...state.reviews.filter((r) => r.published)];
  return all
    .filter((r) => clean.includes(r.experienceSlug))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getExperienceReviews(slug: string): Promise<Review[]> {
  return getReviewsForSlugs([slug]);
}

export async function getExperienceReviewSummary(slug: string) {
  return summarize(await getExperienceReviews(slug));
}

export async function getHostReviewSummary(experienceSlugs: string[]) {
  return summarize(await getReviewsForSlugs(experienceSlugs));
}

/** The current guest's review for a booking, if any (published or pending). */
export async function getBookingReview(bookingId: string, guestId: string): Promise<Review | null> {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const { data } = await createClient().from("reviews").select("*").eq("booking_id", bookingId).maybeSingle();
    return data ? mapRow(data as Record<string, unknown>) : null;
  }
  const state = readDemoState();
  return state.reviews.find((r) => r.bookingId === bookingId && r.guestId === guestId) ?? null;
}

/** Admin moderation queue: unpublished reviews, newest first. */
export async function listPendingReviews(): Promise<Review[]> {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const { data } = await createClient()
      .from("reviews")
      .select("*, guest:profiles(full_name), experiences(slug, name)")
      .eq("published", false)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r: Record<string, unknown>) => mapRow(r));
  }
  const state = readDemoState();
  return state.reviews.filter((r) => !r.published).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
