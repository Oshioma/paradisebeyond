import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readDemoState, updateDemoState } from "@/lib/demo/state";
import type { TripPrep } from "@/lib/trip/types";

export type { TripPrep } from "@/lib/trip/types";
export { EXPERIENCE_LEVELS } from "@/lib/trip/types";

export async function getTripPrep(bookingId: string): Promise<TripPrep | null> {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const { data } = await createClient().from("trip_prep").select("data").eq("booking_id", bookingId).maybeSingle();
    return (data?.data as TripPrep) ?? null;
  }
  return readDemoState().tripPrep[bookingId] ?? null;
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
