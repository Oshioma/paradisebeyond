import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readDemoState, updateDemoState } from "@/lib/demo/state";
import { hasHealthData, tripHasEnded, withoutHealthData, type TripPrep } from "@/lib/trip/types";

export type { TripPrep } from "@/lib/trip/types";
export { EXPERIENCE_LEVELS, tripHasEnded, hasHealthData, withoutHealthData } from "@/lib/trip/types";

export async function getTripPrep(bookingId: string): Promise<TripPrep | null> {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const { data } = await createClient().from("trip_prep").select("data").eq("booking_id", bookingId).maybeSingle();
    return (data?.data as TripPrep) ?? null;
  }
  return readDemoState().tripPrep[bookingId] ?? null;
}

/**
 * Read a booking's questionnaire, dropping the health answers once the trip is
 * over — the safety purpose we collected them for has expired, so we no longer
 * have a basis to keep them (UK GDPR Art. 5(1)(e)).
 *
 * This purges on read, which means it only fires when someone opens the trip.
 * The guaranteed sweep is `purge_ended_trip_health_data()` in migration 0029,
 * which clears every ended trip whether or not anyone looks; this is the belt
 * to that migration's braces, so a page never *displays* expired health data
 * even if the sweep has not run yet.
 */
export async function getTripPrepForTrip(bookingId: string, departureEndDate: string): Promise<TripPrep | null> {
  const prep = await getTripPrep(bookingId);
  if (!prep || !tripHasEnded(departureEndDate) || !hasHealthData(prep)) return prep;

  const purged = withoutHealthData(prep);

  // Best-effort write-back. This runs during a render, where Next forbids
  // cookie writes (demo mode) and a database write can fail — neither may take
  // the page down, and the caller must get the purged view regardless. The row
  // itself is guaranteed by migration 0029's sweep, not by this.
  try {
    await saveTripPrep(bookingId, purged);
  } catch (err) {
    console.warn(`[trip-prep] could not persist health-data purge for ${bookingId}:`, err);
  }

  return purged;
}

export async function saveTripPrep(bookingId: string, prep: TripPrep): Promise<void> {
  const value: TripPrep = { ...prep, updatedAt: new Date().toISOString() };
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    // RLS: only the booking's guest (or admin) can upsert.
    await createClient().from("trip_prep").upsert({ booking_id: bookingId, data: value, updated_at: value.updatedAt }, { onConflict: "booking_id" });
  } else {
    updateDemoState((s) => { s.tripPrep[bookingId] = value; });
  }
}

/** True when the guest has filled in the essentials. */
export function prepComplete(prep: TripPrep | null): boolean {
  return Boolean(prep && (prep.dietary || prep.experienceLevel || prep.emergencyName));
}
