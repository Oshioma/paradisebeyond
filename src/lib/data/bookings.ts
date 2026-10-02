import type { Booking, FlightDetails, HydratedBooking } from "@/lib/booking/types";
import type { SessionUser } from "@/lib/auth/types";
import { getExperience } from "@/lib/data/experiences";
import { getAllExperiences } from "@/lib/data/repository";
import { DEMO_BOOKINGS } from "@/lib/demo/bookings";
import { OFFGRID_DEMO_EXPERIENCES } from "@/lib/demo/offgridSamples";
import { readDemoState } from "@/lib/demo/state";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isBrandId, type MarketplaceId } from "@/lib/brand/config";

/** A booking's marketplace — its snapshot (older rows: Paradise Beyond). */
export function bookingMarketplace(b: Pick<Booking, "marketplace">): MarketplaceId {
  return b.marketplace ?? "paradise-beyond";
}

/** The dates a booking actually covers: an off-grid traveller's own arrival +
 *  nights, else the departure's dates. */
export function bookingDates(b: HydratedBooking): { start: string; end: string } {
  if (b.stayStartDate && b.stayNights) {
    const end = new Date(b.stayStartDate + "T00:00:00Z");
    end.setUTCDate(end.getUTCDate() + b.stayNights);
    return { start: b.stayStartDate, end: end.toISOString().slice(0, 10) };
  }
  return { start: b.departure.startDate, end: b.departure.endDate };
}

/**
 * Bookings access. In demo mode this reads seeded bookings plus any created in
 * the current session. When Supabase is configured it queries the RLS-protected
 * `bookings` table (RLS scopes rows to the signed-in guest/host/admin, so the
 * same functions return the right subset per role) and hydrates each row using
 * the live catalogue read model.
 */

// ---- Demo ------------------------------------------------------------------
function allDemoBookings(): Booking[] {
  const state = readDemoState();
  const merged = [...DEMO_BOOKINGS, ...state.bookings];
  return merged.map((b) => {
    let next: Booking = { ...b, flight: state.flights[b.id] ?? b.flight };
    if (state.balancePaid?.includes(b.id)) {
      next = { ...next, paidMinor: next.subtotalMinor, balanceMinor: 0, status: "confirmed" };
    }
    if (state.refunded?.includes(b.id)) {
      next = { ...next, status: "refunded" };
    }
    return next;
  });
}

export function hydrate(booking: Booking): HydratedBooking | null {
  const experience = getExperience(booking.experienceSlug) ?? OFFGRID_DEMO_EXPERIENCES.find((e) => e.slug === booking.experienceSlug);
  if (!experience) return null;
  const departure = experience.departures.find((d) => d.id === booking.departureId);
  const room = experience.stay.roomTypes.find((r) => r.id === booking.roomTypeId);
  if (!departure || !room) return null;
  return { ...booking, experience, departure, room };
}

function hydrateAll(bookings: Booking[]): HydratedBooking[] {
  return bookings.map(hydrate).filter(Boolean) as HydratedBooking[];
}

// ---- Supabase --------------------------------------------------------------
function mapFlight(row: Record<string, unknown> | undefined): FlightDetails | undefined {
  if (!row) return undefined;
  return {
    arrivalFlight: (row.arrival_flight as string) ?? undefined,
    arrivalDate: (row.arrival_time as string) ?? undefined,
    departureFlight: (row.departure_flight as string) ?? undefined,
    departureDate: (row.departure_time as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
  };
}

async function fetchDbBookings(where?: (q: any) => any): Promise<HydratedBooking[]> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  let query = supabase.from("bookings").select("*").order("created_at", { ascending: false });
  if (where) query = where(query);
  const { data: rows } = await query;
  if (!rows?.length) return [];

  const ids = rows.map((r: any) => r.id);
  const guestIds = [...new Set(rows.map((r: any) => r.guest_id))];
  const [{ data: pays }, { data: flights }, { data: profiles }, experiences] = await Promise.all([
    supabase.from("payments").select("booking_id, amount_minor, status").in("booking_id", ids),
    supabase.from("flight_details").select("*").in("booking_id", ids),
    supabase.from("profiles").select("id, full_name").in("id", guestIds),
    getAllExperiences(),
  ]);

  const paid = new Map<string, number>();
  for (const p of pays ?? []) if (p.status === "succeeded") paid.set(p.booking_id, (paid.get(p.booking_id) ?? 0) + Number(p.amount_minor));
  const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
  const flightById = new Map((flights ?? []).map((f: any) => [f.booking_id, f]));

  const depIndex = new Map<string, { e: (typeof experiences)[number]; d: any }>();
  const roomIndex = new Map<string, any>();
  for (const e of experiences) {
    for (const d of e.departures) depIndex.set(d.id, { e, d });
    for (const r of e.stay.roomTypes) roomIndex.set(r.id, r);
  }

  return rows
    .map((r: any): HydratedBooking | null => {
      const de = depIndex.get(r.departure_id);
      if (!de) return null;
      const room = roomIndex.get(r.room_type_id) ?? de.e.stay.roomTypes[0];
      return {
        id: r.id,
        reference: r.reference,
        guestId: r.guest_id,
        guestName: (nameById.get(r.guest_id) as string) ?? "Guest",
        experienceSlug: de.e.slug,
        departureId: r.departure_id,
        roomTypeId: r.room_type_id,
        guestCount: r.guest_count,
        currency: r.currency,
        subtotalMinor: Number(r.subtotal_minor),
        depositMinor: Number(r.deposit_minor),
        balanceMinor: Number(r.balance_minor),
        paidMinor: paid.get(r.id) ?? 0,
        balanceDueDate: r.balance_due_date ?? de.d.startDate,
        commissionRateBps: r.commission_rate_bps,
        platformFeeMinor: Number(r.platform_fee_minor),
        hostNetMinor: Number(r.host_net_minor),
        status: r.status,
        createdAt: (r.created_at ?? "").slice(0, 10),
        flight: mapFlight(flightById.get(r.id)),
        // The booking's OWN snapshot — never re-derived from the experience,
        // so moving or editing a listing can't change a past booking.
        marketplace: isBrandId(r.marketplace) ? r.marketplace : "paradise-beyond",
        stayStartDate: r.stay_start_date ?? undefined,
        stayNights: r.stay_nights ?? undefined,
        experience: de.e,
        departure: de.d,
        room,
      };
    })
    .filter(Boolean) as HydratedBooking[];
}

// ---- Public API ------------------------------------------------------------
/**
 * A traveller's bookings. Pass `marketplace` to show only that marketplace's
 * (each site's account area lists its own trips/stays). Omitted = all, as
 * before.
 */
export async function getMyTrips(user: SessionUser, marketplace?: MarketplaceId): Promise<HydratedBooking[]> {
  const scope = (list: HydratedBooking[]) =>
    (marketplace ? list.filter((b) => bookingMarketplace(b) === marketplace) : list).sort((a, b) =>
      bookingDates(a).start.localeCompare(bookingDates(b).start),
    );
  if (isSupabaseConfigured()) {
    return scope(await fetchDbBookings((q) => q.eq("guest_id", user.id)));
  }
  const rows = allDemoBookings().filter((b) => b.guestId === user.id || user.role === "guest");
  return scope(hydrateAll(rows));
}

export async function getTrip(user: SessionUser, bookingId: string): Promise<HydratedBooking | null> {
  if (isSupabaseConfigured()) {
    const rows = await fetchDbBookings((q) => q.eq("id", bookingId)); // RLS enforces access
    return rows[0] ?? null;
  }
  const row = allDemoBookings().find((b) => b.id === bookingId);
  if (!row) return null;
  if (user.role === "guest" && row.guestId !== user.id) return null;
  return hydrate(row);
}

export async function getHostBookings(hostSlug: string): Promise<HydratedBooking[]> {
  if (isSupabaseConfigured()) {
    // RLS already scopes bookings to this host's departures.
    return fetchDbBookings();
  }
  const rows = allDemoBookings().filter((b) => {
    const e = getExperience(b.experienceSlug);
    return e?.hostSlugs.includes(hostSlug);
  });
  return hydrateAll(rows);
}

export async function getAllBookings(): Promise<HydratedBooking[]> {
  if (isSupabaseConfigured()) return fetchDbBookings(); // admin sees all via RLS
  return hydrateAll(allDemoBookings()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
