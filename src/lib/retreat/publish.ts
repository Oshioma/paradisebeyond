import type { RetreatDraft } from "@/lib/retreat/schema";
import type { CategorySlug, Departure, Experience, ItineraryDay, RoomType } from "@/lib/types";
import { slotKey } from "@/lib/images";
import { setOverrideUrl } from "@/lib/media/store";

/**
 * Materialise an approved retreat draft into the live catalogue.
 *
 * The public site reads an experience from `experiences.content` (the full
 * editorial JSON) and overlays live `departures` / `room_types` rows. So
 * publishing writes all three, plus image overrides so uploaded photos show
 * through the standard `/api/img` path.
 *
 * Idempotent: keyed on `retreat_draft_id`, so re-approving updates the same
 * experience instead of creating duplicates. Runs as the acting admin — RLS's
 * `is_admin()` permits the writes; no service-role key required.
 */

export type PublishResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "experience";
}

const usdToMinor = (v: number) => Math.round((Number.isFinite(v) ? v : 0) * 100);

/** Build the editorial Experience JSON stored in experiences.content. */
function buildContent(draft: RetreatDraft, slug: string, hostSlugs: string[]): Experience {
  const hotels = (draft.hotels ?? []).filter((h) => h.name?.trim()).map((h) => ({ name: h.name.trim(), description: h.description ?? "" }));
  const heroSeed = `${slug}-hero`;
  const gallerySeeds = (draft.galleryUrls ?? []).map((_, i) => `${slug}-g${i}`);
  const imageSeeds = gallerySeeds.length ? gallerySeeds : [heroSeed];
  const currency = draft.currency || "USD";

  const roomTypes: RoomType[] = (draft.rooms ?? [])
    .filter((r) => r.name?.trim())
    // List accommodation options highest price first.
    .slice()
    .sort((a, b) => (b.priceDeltaUsd ?? 0) - (a.priceDeltaUsd ?? 0))
    .map((r, i) => ({
      id: `${slug}-r${i}`, // matches room_types.code; swapped to a real UUID on read
      property: r.property?.trim() || undefined,
      name: r.name,
      description: r.description ?? "",
      occupancy: r.occupancy,
      priceDeltaMinor: usdToMinor(r.priceDeltaUsd),
    }));

  const itinerary: ItineraryDay[] = (draft.itinerary ?? []).map((d) => ({
    day: d.day,
    title: d.title,
    summary: d.summary || undefined,
    items: (d.items ?? []).filter(Boolean).map((title) => ({ title })),
  }));

  const departures: Departure[] = (draft.departures ?? [])
    .filter((d) => d.startDate && d.endDate)
    .map((d, i) => ({
      id: `${slug}-d${i}`,
      startDate: d.startDate,
      endDate: d.endDate,
      priceFromMinor: usdToMinor(draft.priceFromUsd),
      currency,
      capacity: d.capacity,
      spacesRemaining: d.capacity,
      depositMinor: usdToMinor(draft.depositUsd),
      balanceDueDays: draft.balanceDueDays,
      status: "open",
    }));

  return {
    slug,
    name: draft.name,
    strapline: draft.strapline,
    duration: draft.duration,
    destinationSlug: draft.destinationSlug,
    location: draft.locationLabel || draft.destinationName,
    categorySlugs: (draft.categorySlugs ?? []) as CategorySlug[],
    hostSlugs,
    verified: false,
    currency,
    priceFromMinor: usdToMinor(draft.priceFromUsd),
    maxGroupSize: draft.maxGroupSize,
    heroImageSeed: heroSeed,
    gallerySeeds,
    forYouIf: (draft.idealGuest ?? []).filter(Boolean),
    story: (draft.story ?? []).filter(Boolean),
    highlights: (draft.highlights ?? [])
      .filter((h) => h.title?.trim() || h.description?.trim())
      .map((h, i) => ({ title: h.title, description: h.description, imageSeed: imageSeeds[i % imageSeeds.length] })),
    stay: {
      property: hotels[0]?.name ?? draft.propertyName ?? "",
      description: hotels[0]?.description ?? draft.propertyDescription ?? "",
      hotels: hotels.length ? hotels : undefined,
      roomTypes,
      imageSeeds,
    },
    inclusions: (draft.inclusions ?? []).filter(Boolean),
    exclusions: (draft.exclusions ?? []).filter(Boolean),
    itinerary,
    departures,
    featured: false,
  };
}

export async function publishDraft(draft: RetreatDraft, actingUserId: string): Promise<PublishResult> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();

  // Resolve the destination (required, FK). Fall back to any destination so a
  // stray slug never blocks publishing.
  const { data: dest } = await supabase.from("destinations").select("id").eq("slug", draft.destinationSlug).maybeSingle();
  let destinationId = dest?.id as string | undefined;
  if (!destinationId) {
    const { data: anyDest } = await supabase.from("destinations").select("id").limit(1).maybeSingle();
    destinationId = anyDest?.id as string | undefined;
  }
  if (!destinationId) return { ok: false, error: "No destination found to attach the experience to." };

  // Resolve the host (for display + experience_hosts link).
  let hostSlugs: string[] = [];
  let hostId: string | null = draft.hostId ?? null;
  if (hostId) {
    const { data: host } = await supabase.from("hosts").select("slug").eq("id", hostId).maybeSingle();
    if (host?.slug) hostSlugs = [host.slug as string];
  }

  // Reuse the slug from a prior publish of this draft (idempotency), else mint a
  // unique one.
  const { data: prior } = await supabase.from("experiences").select("id, slug").eq("retreat_draft_id", draft.id).maybeSingle();
  let slug = (prior?.slug as string) ?? slugify(draft.name);
  if (!prior) {
    const base = slug;
    for (let n = 2; n < 50; n++) {
      const { data: clash } = await supabase.from("experiences").select("id").eq("slug", slug).maybeSingle();
      if (!clash) break;
      slug = `${base}-${n}`;
    }
  }

  const content = buildContent(draft, slug, hostSlugs);

  // Point uploaded photos at the experience's image seeds.
  if (draft.heroImageUrl) await setOverrideUrl(slotKey(`${slug}-hero`), draft.heroImageUrl);
  await Promise.all((draft.galleryUrls ?? []).map((url, i) => (url ? setOverrideUrl(slotKey(`${slug}-g${i}`), url) : Promise.resolve())));

  const { data: exp, error: expErr } = await supabase
    .from("experiences")
    .upsert(
      {
        retreat_draft_id: draft.id,
        slug,
        name: draft.name,
        strapline: draft.strapline,
        status: "published",
        duration: String(draft.duration),
        destination_id: destinationId,
        location_label: draft.locationLabel || null,
        currency: content.currency,
        price_from_minor: content.priceFromMinor,
        max_group_size: draft.maxGroupSize,
        hero_image_url: draft.heroImageUrl || null,
        story: content.story,
        for_you_if: content.forYouIf,
        created_by: actingUserId,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "retreat_draft_id" },
    )
    .select("id")
    .single();

  if (expErr || !exp) return { ok: false, error: expErr?.message ?? "Could not write the experience." };
  const experienceId = exp.id as string;

  // Replace transactional rows so re-publishing stays consistent.
  await supabase.from("departures").delete().eq("experience_id", experienceId);
  await supabase.from("room_types").delete().eq("experience_id", experienceId);

  const depRows = content.departures.map((d, i) => ({
    experience_id: experienceId,
    code: `${slug}-d${i}`,
    start_date: d.startDate,
    end_date: d.endDate,
    currency: d.currency,
    price_from_minor: d.priceFromMinor,
    deposit_minor: d.depositMinor,
    balance_due_days: d.balanceDueDays,
    capacity: d.capacity,
    spaces_remaining: d.spacesRemaining,
    status: "open",
  }));
  if (depRows.length) {
    const { error } = await supabase.from("departures").insert(depRows);
    if (error) return { ok: false, error: `Departures: ${error.message}` };
  }

  const roomRows = content.stay.roomTypes.map((r, i) => ({
    experience_id: experienceId,
    code: `${slug}-r${i}`,
    name: r.name,
    description: r.description,
    occupancy: r.occupancy,
    price_delta_minor: r.priceDeltaMinor,
    sort_order: i,
  }));
  if (roomRows.length) {
    const { error } = await supabase.from("room_types").insert(roomRows);
    if (error) return { ok: false, error: `Rooms: ${error.message}` };
  }

  if (hostId) {
    await supabase.from("experience_hosts").upsert({ experience_id: experienceId, host_id: hostId }, { onConflict: "experience_id,host_id" });
  }

  return { ok: true, slug };
}
