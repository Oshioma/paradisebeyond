import type { Departure, Experience } from "@/lib/types";

/**
 * Supabase-backed read model for the catalogue.
 *
 * The full editorial Experience lives in `experiences.content` (JSON), so we
 * hydrate the exact shape the UI already uses, then overlay the LIVE
 * transactional rows — departures and room types — from their normalised tables
 * (with real UUIDs and current availability). This keeps display rich while the
 * booking-critical ids and spaces come from the source of truth.
 */

function mapDeparture(row: Record<string, unknown>): Departure {
  return {
    id: row.id as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    priceFromMinor: Number(row.price_from_minor),
    currency: row.currency as string,
    capacity: Number(row.capacity),
    spacesRemaining: Number(row.spaces_remaining),
    depositMinor: Number(row.deposit_minor),
    balanceDueDays: Number(row.balance_due_days),
    status: row.status as Departure["status"],
  };
}

export async function getAllExperiences(): Promise<Experience[]> {
  const { createAnonClient } = await import("@/lib/supabase/server");
  const supabase = createAnonClient();

  const { data: exps, error } = (await supabase
    .from("experiences")
    .select("id, content, retreat_draft_id")
    .eq("status", "published")) as {
    data: { id: string; content: Experience; retreat_draft_id: string | null }[] | null;
    error: unknown;
  };
  if (error || !exps) return [];

  const ids = exps.map((e) => e.id);
  const [{ data: deps }, { data: rooms }] = await Promise.all([
    supabase.from("departures").select("*").in("experience_id", ids),
    supabase.from("room_types").select("id, code, experience_id").in("experience_id", ids),
  ]);

  const depsByExp = new Map<string, Departure[]>();
  for (const row of deps ?? []) {
    const key = row.experience_id as string;
    (depsByExp.get(key) ?? depsByExp.set(key, []).get(key)!).push(mapDeparture(row));
  }
  const roomCodeToId = new Map<string, Map<string, string>>();
  for (const row of rooms ?? []) {
    const key = row.experience_id as string;
    const m = roomCodeToId.get(key) ?? roomCodeToId.set(key, new Map()).get(key)!;
    if (row.code) m.set(row.code as string, row.id as string);
  }

  return exps.map((e) => {
    const experience = e.content as Experience;
    const expId = e.id as string;
    // Carry the draft link so hosts can reopen a published listing to edit it.
    if (e.retreat_draft_id) experience.retreatDraftId = e.retreat_draft_id;
    // Live departures (real UUIDs + current availability), soonest first.
    const live = (depsByExp.get(expId) ?? []).sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (live.length) experience.departures = live;
    // Swap room ids to real UUIDs (matched by code) so bookings reference real rows.
    const codeMap = roomCodeToId.get(expId);
    if (codeMap) {
      experience.stay.roomTypes = experience.stay.roomTypes.map((r) => ({
        ...r,
        id: codeMap.get(r.id) ?? r.id,
      }));
    }
    return experience;
  });
}
