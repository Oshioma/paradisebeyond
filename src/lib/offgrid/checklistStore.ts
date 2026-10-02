import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readDemoState, updateDemoState } from "@/lib/demo/state";
import type { ChecklistData, ChecklistSide } from "@/lib/offgrid/checklist";

/**
 * Persistence for the stay checklist (table `stay_checklists`, migration
 * 0033). Reads and writes go through the user's own Supabase session, so the
 * row-level policies decide who sees and changes what — this module adds no
 * privileges of its own.
 */

export interface StayChecklists {
  guest: ChecklistData;
  host: ChecklistData;
}

export async function getStayChecklists(bookingId: string): Promise<StayChecklists> {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const { data } = await createClient().from("stay_checklists").select("side, data").eq("booking_id", bookingId);
    const out: StayChecklists = { guest: {}, host: {} };
    for (const row of (data ?? []) as { side: ChecklistSide; data: ChecklistData }[]) out[row.side] = row.data ?? {};
    return out;
  }
  const s = readDemoState().stayChecklists?.[bookingId];
  return { guest: s?.guest ?? {}, host: s?.host ?? {} };
}

/** Save one side's row. Returns false when the write is refused or fails. */
export async function saveStayChecklist(bookingId: string, side: ChecklistSide, data: ChecklistData): Promise<boolean> {
  const value: ChecklistData = { ...data, updatedAt: new Date().toISOString() };
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const { error } = await createClient()
      .from("stay_checklists")
      .upsert({ booking_id: bookingId, side, data: value, updated_at: value.updatedAt }, { onConflict: "booking_id,side" });
    return !error;
  }
  updateDemoState((s) => {
    s.stayChecklists = s.stayChecklists ?? {};
    s.stayChecklists[bookingId] = { ...(s.stayChecklists[bookingId] ?? {}), [side]: value };
  });
  return true;
}
