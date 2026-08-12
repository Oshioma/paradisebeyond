import type { Booking, HydratedBooking } from "@/lib/booking/types";
import type { SessionUser } from "@/lib/auth/types";
import { getExperience } from "@/lib/data/experiences";
import { DEMO_BOOKINGS } from "@/lib/demo/bookings";
import { readDemoState } from "@/lib/demo/state";

/**
 * Bookings access. In demo mode this reads seeded bookings plus any created or
 * modified in the current session (flight details, new reservations). The
 * Supabase path (when configured) queries the RLS-protected `bookings` table;
 * because RLS scopes rows to the signed-in user/host/admin, the same functions
 * return the correct subset for each role.
 */

function allDemoBookings(): Booking[] {
  const state = readDemoState();
  const merged = [...DEMO_BOOKINGS, ...state.bookings];
  return merged.map((b) => ({ ...b, flight: state.flights[b.id] ?? b.flight }));
}

export function hydrate(booking: Booking): HydratedBooking | null {
  const experience = getExperience(booking.experienceSlug);
  if (!experience) return null;
  const departure = experience.departures.find((d) => d.id === booking.departureId);
  const room = experience.stay.roomTypes.find((r) => r.id === booking.roomTypeId);
  if (!departure || !room) return null;
  return { ...booking, experience, departure, room };
}

function hydrateAll(bookings: Booking[]): HydratedBooking[] {
  return bookings.map(hydrate).filter(Boolean) as HydratedBooking[];
}

export async function getMyTrips(user: SessionUser): Promise<HydratedBooking[]> {
  const rows = allDemoBookings().filter((b) => b.guestId === user.id || user.role === "guest");
  return hydrateAll(rows).sort((a, b) => a.departure.startDate.localeCompare(b.departure.startDate));
}

export async function getTrip(user: SessionUser, bookingId: string): Promise<HydratedBooking | null> {
  const row = allDemoBookings().find((b) => b.id === bookingId);
  if (!row) return null;
  if (user.role === "guest" && row.guestId !== user.id) return null;
  return hydrate(row);
}

export async function getHostBookings(hostSlug: string): Promise<HydratedBooking[]> {
  const rows = allDemoBookings().filter((b) => {
    const e = getExperience(b.experienceSlug);
    return e?.hostSlugs.includes(hostSlug);
  });
  return hydrateAll(rows);
}

export async function getAllBookings(): Promise<HydratedBooking[]> {
  return hydrateAll(allDemoBookings()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
