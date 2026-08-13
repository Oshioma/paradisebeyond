import type { RetreatDraft } from "@/lib/retreat/schema";
import type { CategorySlug, Departure, Experience, ItineraryDay, RoomType } from "@/lib/types";
import { slotKey } from "@/lib/images";

/**
 * Materialise an approved retreat draft into the live catalogue.
 *
 * The public site reads an experience from `experiences.content` (the full
 * editorial JSON) and overlays live `departures` / `room_types` rows. So
 * publishing writes all three, plus image overrides so uploaded photos show
 * through the standard `/api/img` path.
 *
 * Idempotent: keyed on `retreat_draft_id`, so re-approving updates the same
 * experience instead of creating duplicates.
 *
 * Runs with the service role. The `departures` and `room_types` tables are
 * read-only under RLS (SELECT policies only, no write policy), so even an admin
 * session can't insert their rows. Publishing is only ever reached through an
 * admin-gated server action, so bypassing RLS here is safe and avoids scattering
 * write policies across every catalogue table.
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
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const supabase = createServiceRoleClient();

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
  const { data: prior } = await supabase
    .from("experiences")
    .select("id, slug, verified, featured")
    .eq("retreat_draft_id", draft.id)
    .maybeSingle();
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
  // buildContent starts every experience unverified and unfeatured. On a
  // re-publish (a host edited a live listing), carry the admin's existing
  // Verified / Featured flags forward so an edit never silently drops them.
  const keepVerified = Boolean(prior?.verified);
  const keepFeatured = Boolean(prior?.featured);
  content.verified = keepVerified;
  content.featured = keepFeatured;

  // Point the experience's image seeds at the uploaded photos. Write straight
  // through the service-role client already in scope: media_overrides is
  // admin-only under RLS and the user-client write silently swallowed failures,
  // which left the hero/gallery blank on the live page.
  const overrides: { seed: string; url: string; updated_at: string }[] = [];
  const stamp = new Date().toISOString();
  if (draft.heroImageUrl) overrides.push({ seed: slotKey(`${slug}-hero`), url: draft.heroImageUrl, updated_at: stamp });
  (draft.galleryUrls ?? []).forEach((url, i) => { if (url) overrides.push({ seed: slotKey(`${slug}-g${i}`), url, updated_at: stamp }); });
  if (overrides.length) {
    const { error: ovErr } = await supabase.from("media_overrides").upsert(overrides, { onConflict: "seed" });
    if (ovErr) return { ok: false, error: `Saving photos failed: ${ovErr.message}` };
  }

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
        verified: keepVerified,
        featured: keepFeatured,
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

  // --- Booking-safe sync of departures & rooms --------------------------------
  // On a first publish there's nothing here yet. On a *re-publish* (a host edited
  // a live listing and it was re-approved) we must not orphan guests: bookings
  // reference departures and room_types with ON DELETE RESTRICT, and blindly
  // resetting spaces_remaining would oversell. So instead of delete-all +
  // insert, we reconcile in place:
  //  - departures are matched by start_date (a stable, human key), updated with
  //    already-sold spaces preserved; new dates are inserted; dropped dates are
  //    deleted only when unbooked (booked ones are closed, never removed);
  //  - room_types are matched by code, updated or inserted; dropped ones are
  //    deleted only when unbooked.
  type DepRow = { id: string; code: string; start_date: string; capacity: number; spaces_remaining: number };
  type RoomRow = { id: string; code: string };
  const [depsRes, roomsRes] = await Promise.all([
    supabase.from("departures").select("id, code, start_date, capacity, spaces_remaining").eq("experience_id", experienceId),
    supabase.from("room_types").select("id, code").eq("experience_id", experienceId),
  ]);
  const existingDeps = (depsRes.data ?? []) as DepRow[];
  const existingRooms = (roomsRes.data ?? []) as RoomRow[];

  const existingDepIds = existingDeps.map((d) => d.id);
  const existingRoomIds = existingRooms.map((r) => r.id);
  const bookedDepIds = new Set<string>();
  const bookedRoomIds = new Set<string>();
  if (existingDepIds.length) {
    const { data } = await supabase.from("bookings").select("departure_id").in("departure_id", existingDepIds);
    for (const b of data ?? []) bookedDepIds.add(b.departure_id as string);
  }
  if (existingRoomIds.length) {
    const { data } = await supabase.from("bookings").select("room_type_id").in("room_type_id", existingRoomIds);
    for (const b of data ?? []) bookedRoomIds.add(b.room_type_id as string);
  }

  // Departures — match by date so re-ordering or inserting a date never shuffles
  // an existing booking onto the wrong departure.
  const depByDate = new Map(existingDeps.map((d) => [d.start_date, d] as const));
  const desiredDates = new Set(content.departures.map((d) => d.startDate));
  for (let i = 0; i < content.departures.length; i++) {
    const d = content.departures[i];
    const prior = depByDate.get(d.startDate);
    if (prior) {
      // Carry forward however many spaces are already sold on this date.
      const sold = Math.max(0, Number(prior.capacity) - Number(prior.spaces_remaining));
      const spaces = Math.max(0, Math.min(d.capacity, d.capacity - sold));
      const { error } = await supabase
        .from("departures")
        .update({
          end_date: d.endDate,
          currency: d.currency,
          price_from_minor: d.priceFromMinor,
          deposit_minor: d.depositMinor,
          balance_due_days: d.balanceDueDays,
          capacity: d.capacity,
          spaces_remaining: spaces,
          status: "open", // a previously-closed date that's back in the plan reopens
        })
        .eq("id", prior.id);
      if (error) return { ok: false, error: `Departures: ${error.message}` };
    } else {
      const { error } = await supabase.from("departures").insert({
        experience_id: experienceId,
        code: `${slug}-d${i}-${d.startDate}`,
        start_date: d.startDate,
        end_date: d.endDate,
        currency: d.currency,
        price_from_minor: d.priceFromMinor,
        deposit_minor: d.depositMinor,
        balance_due_days: d.balanceDueDays,
        capacity: d.capacity,
        spaces_remaining: d.spacesRemaining,
        status: "open",
      });
      if (error) return { ok: false, error: `Departures: ${error.message}` };
    }
  }
  for (const dep of existingDeps) {
    if (desiredDates.has(dep.start_date)) continue;
    if (bookedDepIds.has(dep.id)) {
      // Guests hold this date — take it off sale rather than delete (FK RESTRICT).
      await supabase.from("departures").update({ status: "closed" }).eq("id", dep.id);
    } else {
      await supabase.from("departures").delete().eq("id", dep.id);
    }
  }

  // Rooms — match by code.
  const roomByCode = new Map(existingRooms.map((r) => [r.code, r] as const));
  const desiredRoomCodes = new Set(content.stay.roomTypes.map((_, i) => `${slug}-r${i}`));
  for (let i = 0; i < content.stay.roomTypes.length; i++) {
    const r = content.stay.roomTypes[i];
    const code = `${slug}-r${i}`;
    const prior = roomByCode.get(code);
    const fields = {
      name: r.name,
      description: r.description,
      occupancy: r.occupancy,
      price_delta_minor: r.priceDeltaMinor,
      sort_order: i,
    };
    if (prior) {
      const { error } = await supabase.from("room_types").update(fields).eq("id", prior.id);
      if (error) return { ok: false, error: `Rooms: ${error.message}` };
    } else {
      const { error } = await supabase.from("room_types").insert({ experience_id: experienceId, code, ...fields });
      if (error) return { ok: false, error: `Rooms: ${error.message}` };
    }
  }
  for (const room of existingRooms) {
    if (desiredRoomCodes.has(room.code)) continue;
    // Keep a room a guest has booked (FK RESTRICT); drop the rest.
    if (!bookedRoomIds.has(room.id)) {
      await supabase.from("room_types").delete().eq("id", room.id);
    }
  }

  if (hostId) {
    await supabase.from("experience_hosts").upsert({ experience_id: experienceId, host_id: hostId }, { onConflict: "experience_id,host_id" });
  }

  return { ok: true, slug };
}
