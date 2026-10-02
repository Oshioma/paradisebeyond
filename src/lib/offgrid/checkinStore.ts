import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readDemoState, updateDemoState } from "@/lib/demo/state";
import type { Booking } from "@/lib/booking/types";
import { dueCheckins, type Checkin, type CheckinKind, type CheckinResponse } from "@/lib/offgrid/checkins";

/**
 * Check-ins for a stay. Live: rows queued by pg_cron (migration 0034), read
 * under the traveller's own session and answered through the
 * respond_stay_checkin() function. Demo: derived from the stay dates, with
 * answers kept in the demo state.
 */
export async function getCheckins(booking: Pick<Booking, "id" | "marketplace" | "status" | "stayStartDate" | "stayNights">): Promise<Checkin[]> {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const { data } = await createClient().from("stay_checkins").select("*").eq("booking_id", booking.id);
    return (data ?? []).map((r: Record<string, unknown>) => ({
      bookingId: r.booking_id as string,
      kind: r.kind as CheckinKind,
      dueAt: r.due_at as string,
      notifiedAt: (r.notified_at as string) ?? undefined,
      response: (r.response as CheckinResponse) ?? undefined,
      note: (r.note as string) ?? undefined,
      respondedAt: (r.responded_at as string) ?? undefined,
    }));
  }
  const answers = readDemoState().stayCheckins ?? {};
  return dueCheckins(booking).map((c) => ({ ...c, ...(answers[`${c.bookingId}:${c.kind}`] ?? {}) }));
}

export async function respondCheckin(bookingId: string, kind: CheckinKind, response: CheckinResponse, note?: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const { error } = await createClient().rpc("respond_stay_checkin", { p_booking: bookingId, p_kind: kind, p_response: response, p_note: note ?? "" });
    return !error;
  }
  updateDemoState((s) => {
    s.stayCheckins = { ...(s.stayCheckins ?? {}), [`${bookingId}:${kind}`]: { response, note, respondedAt: new Date().toISOString() } };
  });
  return true;
}
