import { unstable_noStore as noStore } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Guest memories — photos from past visitors attached to a live retreat, and
 * the magic-link invites that let those visitors add photos / leave a review
 * without signing in.
 *
 * Reads of published photos use the anon client (RLS opens them publicly);
 * every write goes through the service role and is reached only from
 * permission-checked server actions (host studio) or token-checked ones
 * (/memories/<token>).
 */

export type PhotoSource = "guest" | "host" | "import";

export interface RetreatPhoto {
  id: string;
  experienceId: string;
  /** Itinerary day (1-based) this photo is allocated to; null = general gallery. */
  dayNumber: number | null;
  url: string;
  caption: string | null;
  uploaderName: string | null;
  source: PhotoSource;
  published: boolean;
  createdAt: string;
}

export interface GuestInvite {
  token: string;
  /** Set for a booking-backed invite; null for a contact-backed one. */
  bookingId: string | null;
  /** Set for a contact-backed invite (imported attendee); null otherwise. */
  contactId: string | null;
  experienceId: string;
  email: string;
  guestName: string | null;
}

export interface RetreatContact {
  id: string;
  experienceId: string;
  name: string | null;
  email: string | null;
  status: string | null;
  invitedAt: string | null;
}

const BUCKET = "media";

/** A booking counts as a "past visit" once its departure has ended. */
export function isPastVisit(b: { departure: { endDate: string }; status: string }): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return b.departure.endDate < today && !["cancelled", "refunded"].includes(b.status);
}

function mapPhoto(r: Record<string, unknown>): RetreatPhoto {
  return {
    id: r.id as string,
    experienceId: r.experience_id as string,
    dayNumber: (r.day_number as number | null) ?? null,
    url: r.url as string,
    caption: (r.caption as string | null) ?? null,
    uploaderName: (r.uploader_name as string | null) ?? null,
    source: (r.source as PhotoSource) ?? "guest",
    published: Boolean(r.published),
    createdAt: (r.created_at as string) ?? "",
  };
}

// ---- reads -----------------------------------------------------------------

export async function getExperienceIdBySlug(slug: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { createAnonClient } = await import("@/lib/supabase/server");
  const { data } = await createAnonClient().from("experiences").select("id").eq("slug", slug).maybeSingle();
  return (data?.id as string) ?? null;
}

/** Published photos for a retreat's public page. Empty in demo mode. */
export async function getPublishedPhotos(experienceSlug: string): Promise<RetreatPhoto[]> {
  if (!isSupabaseConfigured()) return [];
  noStore();
  try {
    const id = await getExperienceIdBySlug(experienceSlug);
    if (!id) return [];
    const { createAnonClient } = await import("@/lib/supabase/server");
    const { data } = await createAnonClient()
      .from("retreat_photos")
      .select("*")
      .eq("experience_id", id)
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    return (data ?? []).map(mapPhoto);
  } catch {
    return [];
  }
}

/** Every photo (published or not) for a set of experiences — host studio view. */
export async function getPhotosForExperienceIds(ids: string[]): Promise<RetreatPhoto[]> {
  if (!isSupabaseConfigured() || ids.length === 0) return [];
  noStore();
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { data } = await createServiceRoleClient()
    .from("retreat_photos")
    .select("*")
    .in("experience_id", ids)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapPhoto);
}

export async function getPhotoById(photoId: string): Promise<RetreatPhoto | null> {
  if (!isSupabaseConfigured()) return null;
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { data } = await createServiceRoleClient().from("retreat_photos").select("*").eq("id", photoId).maybeSingle();
  return data ? mapPhoto(data) : null;
}

/** Group photos by allocated day for the itinerary display. */
export function photosByDay(photos: RetreatPhoto[]): Record<number, RetreatPhoto[]> {
  const map: Record<number, RetreatPhoto[]> = {};
  for (const p of photos) {
    if (p.dayNumber == null) continue;
    (map[p.dayNumber] ??= []).push(p);
  }
  return map;
}

// ---- writes (service role; callers must have checked permission) -----------

export async function addPhotoUrls(
  experienceId: string,
  urls: string[],
  opts: { dayNumber?: number | null; source: PhotoSource; uploaderName?: string; bookingId?: string; contactId?: string; caption?: string },
): Promise<number> {
  const clean = [...new Set(urls.map((u) => u.trim()).filter((u) => /^https?:\/\//i.test(u) || u.startsWith("/")))];
  if (!clean.length) return 0;
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const supabase = createServiceRoleClient();
  // Skip URLs this retreat already has, so re-running an import never duplicates.
  const { data: existing } = await supabase
    .from("retreat_photos")
    .select("url")
    .eq("experience_id", experienceId)
    .in("url", clean);
  const seen = new Set((existing ?? []).map((r: { url: string }) => r.url));
  const rows = clean
    .filter((u) => !seen.has(u))
    .map((url) => ({
      experience_id: experienceId,
      url,
      day_number: opts.dayNumber ?? null,
      source: opts.source,
      uploader_name: opts.uploaderName ?? null,
      booking_id: opts.bookingId ?? null,
      contact_id: opts.contactId ?? null,
      caption: opts.caption ?? null,
    }));
  if (!rows.length) return 0;
  const { error } = await supabase.from("retreat_photos").insert(rows);
  if (error) throw new Error(`Saving photos failed: ${error.message}`);
  return rows.length;
}

/** Store uploaded photo bytes in the public media bucket; returns the public URL. */
export async function saveGuestPhotoFile(
  experienceId: string,
  file: { name: string; bytes: Uint8Array; contentType: string },
): Promise<string> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Photo uploads need SUPABASE_SERVICE_ROLE_KEY set on the server.");
  }
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const supabase = createServiceRoleClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const objectPath = `guest-photos/${experienceId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file.bytes, {
    contentType: file.contentType,
    upsert: false,
  });
  if (error) throw new Error(`Photo upload failed (${error.message}).`);
  return supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

export async function setPhotoDay(photoId: string, dayNumber: number | null) {
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { error } = await createServiceRoleClient()
    .from("retreat_photos")
    .update({ day_number: dayNumber })
    .eq("id", photoId);
  if (error) throw new Error(error.message);
}

export async function setPhotoPublished(photoId: string, published: boolean) {
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { error } = await createServiceRoleClient().from("retreat_photos").update({ published }).eq("id", photoId);
  if (error) throw new Error(error.message);
}

export async function deletePhotoRow(photoId: string) {
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { error } = await createServiceRoleClient().from("retreat_photos").delete().eq("id", photoId);
  if (error) throw new Error(error.message);
}

// ---- guest invites ---------------------------------------------------------

/** One token per booking: create it on first send, reuse (and refresh) after. */
export async function upsertInvite(i: {
  bookingId: string;
  experienceId: string;
  email: string;
  guestName?: string;
}): Promise<string> {
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("guest_invites")
    .upsert(
      {
        booking_id: i.bookingId,
        experience_id: i.experienceId,
        email: i.email,
        guest_name: i.guestName ?? null,
        last_sent_at: new Date().toISOString(),
      },
      { onConflict: "booking_id" },
    )
    .select("id")
    .single();
  if (error || !data?.id) throw new Error(`Couldn't create the invite: ${error?.message ?? "no id"}`);
  return data.id as string;
}

export async function getInvite(token: string): Promise<GuestInvite | null> {
  if (!isSupabaseConfigured()) return null;
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { data } = await createServiceRoleClient().from("guest_invites").select("*").eq("id", token).maybeSingle();
  if (!data) return null;
  return {
    token: data.id as string,
    bookingId: (data.booking_id as string | null) ?? null,
    contactId: (data.contact_id as string | null) ?? null,
    experienceId: data.experience_id as string,
    email: data.email as string,
    guestName: (data.guest_name as string | null) ?? null,
  };
}

// ---- contacts (imported past attendees; service-role only) ------------------

/** Every imported contact for a set of experiences — host studio view. */
export async function getContactsForExperienceIds(ids: string[]): Promise<RetreatContact[]> {
  if (!isSupabaseConfigured() || ids.length === 0) return [];
  noStore();
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const supabase = createServiceRoleClient();
  const [{ data: contacts }, { data: invites }] = await Promise.all([
    supabase.from("retreat_contacts").select("id, experience_id, name, email, status").in("experience_id", ids).order("name", { ascending: true }),
    supabase.from("guest_invites").select("contact_id, last_sent_at").not("contact_id", "is", null),
  ]);
  const sentByContact = new Map<string, string>();
  for (const r of invites ?? []) if (r.last_sent_at) sentByContact.set(r.contact_id as string, r.last_sent_at as string);
  return (contacts ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    experienceId: c.experience_id as string,
    name: (c.name as string | null) ?? null,
    email: (c.email as string | null) ?? null,
    status: (c.status as string | null) ?? null,
    invitedAt: sentByContact.get(c.id as string)?.slice(0, 10) ?? null,
  }));
}

export async function getContactsByIds(contactIds: string[]): Promise<RetreatContact[]> {
  if (!isSupabaseConfigured() || contactIds.length === 0) return [];
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { data } = await createServiceRoleClient()
    .from("retreat_contacts")
    .select("id, experience_id, name, email, status")
    .in("id", contactIds);
  return (data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    experienceId: c.experience_id as string,
    name: (c.name as string | null) ?? null,
    email: (c.email as string | null) ?? null,
    status: (c.status as string | null) ?? null,
    invitedAt: null,
  }));
}

/** One token per contact: create on first send, reuse (and refresh) after. */
export async function upsertContactInvite(i: {
  contactId: string;
  experienceId: string;
  email: string;
  guestName?: string;
}): Promise<string> {
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { data, error } = await createServiceRoleClient()
    .from("guest_invites")
    .upsert(
      {
        contact_id: i.contactId,
        experience_id: i.experienceId,
        email: i.email,
        guest_name: i.guestName ?? null,
        last_sent_at: new Date().toISOString(),
      },
      { onConflict: "contact_id" },
    )
    .select("id")
    .single();
  if (error || !data?.id) throw new Error(`Couldn't create the invite: ${error?.message ?? "no id"}`);
  return data.id as string;
}

export async function hasContactReview(contactId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { data } = await createServiceRoleClient().from("reviews").select("id").eq("contact_id", contactId).maybeSingle();
  return Boolean(data);
}

export async function getPhotosForContact(contactId: string): Promise<RetreatPhoto[]> {
  if (!isSupabaseConfigured()) return [];
  noStore();
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { data } = await createServiceRoleClient()
    .from("retreat_photos")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapPhoto);
}

/** slug → id for a set of experiences, in one query. */
export async function getExperienceIdsBySlugs(slugs: string[]): Promise<Record<string, string>> {
  if (!isSupabaseConfigured() || slugs.length === 0) return {};
  const { createAnonClient } = await import("@/lib/supabase/server");
  const { data } = await createAnonClient().from("experiences").select("id, slug").in("slug", slugs);
  const map: Record<string, string> = {};
  for (const r of data ?? []) map[r.slug as string] = r.id as string;
  return map;
}

export async function getExperienceSlugById(id: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { createAnonClient } = await import("@/lib/supabase/server");
  const { data } = await createAnonClient().from("experiences").select("slug").eq("id", id).maybeSingle();
  return (data?.slug as string) ?? null;
}

/** Booking facts the token page needs: owner, trip end, state. Service role. */
export async function getBookingMeta(
  bookingId: string,
): Promise<{ guestId: string; endDate: string; status: string } | null> {
  if (!isSupabaseConfigured()) return null;
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const supabase = createServiceRoleClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("guest_id, status, departure_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return null;
  const { data: d } = await supabase.from("departures").select("end_date").eq("id", b.departure_id).maybeSingle();
  return { guestId: b.guest_id as string, endDate: (d?.end_date as string) ?? "", status: b.status as string };
}

export async function hasReview(bookingId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { data } = await createServiceRoleClient().from("reviews").select("id").eq("booking_id", bookingId).maybeSingle();
  return Boolean(data);
}

export async function getPhotosForBooking(bookingId: string): Promise<RetreatPhoto[]> {
  if (!isSupabaseConfigured()) return [];
  noStore();
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { data } = await createServiceRoleClient()
    .from("retreat_photos")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapPhoto);
}

/** When each booking's guest was last invited (bookingId → ISO timestamp). */
export async function getInviteSendTimes(bookingIds: string[]): Promise<Record<string, string>> {
  if (!isSupabaseConfigured() || bookingIds.length === 0) return {};
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const { data } = await createServiceRoleClient()
    .from("guest_invites")
    .select("booking_id, last_sent_at")
    .in("booking_id", bookingIds);
  const map: Record<string, string> = {};
  for (const r of data ?? []) if (r.last_sent_at) map[r.booking_id as string] = r.last_sent_at as string;
  return map;
}

/**
 * The guest's email for a booking: their auth account email, falling back to
 * the lead guest captured at checkout. Service role only.
 */
export async function resolveBookingEmail(bookingId: string, guestId: string): Promise<string | null> {
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const supabase = createServiceRoleClient();
  try {
    const { data } = await supabase.auth.admin.getUserById(guestId);
    if (data?.user?.email) return data.user.email;
  } catch {
    /* fall through to booking_guests */
  }
  const { data: guests } = await supabase
    .from("booking_guests")
    .select("email, is_lead")
    .eq("booking_id", bookingId)
    .order("is_lead", { ascending: false })
    .limit(1);
  return (guests?.[0]?.email as string | undefined) ?? null;
}
