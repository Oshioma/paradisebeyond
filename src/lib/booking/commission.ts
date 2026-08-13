import { DEFAULT_COMMISSION_BPS } from "@/lib/booking/pricing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readDemoState, updateDemoState } from "@/lib/demo/state";

/**
 * Platform commission, read from the `commission_rules` table (live) or demo
 * state, in basis points. A destination-specific active rule wins over the
 * global rule; absent both, the built-in default applies. The rate in force is
 * snapshotted onto each booking at purchase, so editing it only affects future
 * bookings.
 */

async function destinationId(slug: string): Promise<string | null> {
  const { createClient } = await import("@/lib/supabase/server");
  const { data } = await createClient().from("destinations").select("id").eq("slug", slug).maybeSingle();
  return (data?.id as string) ?? null;
}

/** The effective rate for a booking (destination override → global → default). */
export async function getActiveCommissionBps(destinationSlug?: string): Promise<number> {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    if (destinationSlug) {
      const destId = await destinationId(destinationSlug);
      if (destId) {
        const { data } = await supabase
          .from("commission_rules")
          .select("rate_bps")
          .eq("active", true)
          .eq("destination_id", destId)
          .order("effective_from", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) return Number(data.rate_bps);
      }
    }
    const { data } = await supabase
      .from("commission_rules")
      .select("rate_bps")
      .eq("active", true)
      .is("destination_id", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? Number(data.rate_bps) : DEFAULT_COMMISSION_BPS;
  }

  const s = readDemoState();
  if (destinationSlug && s.commissionByDest?.[destinationSlug] != null) return s.commissionByDest[destinationSlug];
  return s.commissionGlobalBps ?? DEFAULT_COMMISSION_BPS;
}

/** The destination's OWN override (null if it inherits the global rate). */
export async function getDestinationOverrideBps(destinationSlug: string): Promise<number | null> {
  if (isSupabaseConfigured()) {
    const destId = await destinationId(destinationSlug);
    if (!destId) return null;
    const { createClient } = await import("@/lib/supabase/server");
    const { data } = await createClient()
      .from("commission_rules")
      .select("rate_bps")
      .eq("active", true)
      .eq("destination_id", destId)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? Number(data.rate_bps) : null;
  }
  return readDemoState().commissionByDest?.[destinationSlug] ?? null;
}

/** Set the global rate, or a destination override. Keeps history (deactivate + insert). */
export async function setCommissionBps(rateBps: number, destinationSlug?: string): Promise<{ ok: boolean; error?: string }> {
  const bps = Math.round(rateBps);
  if (!Number.isFinite(bps) || bps < 0 || bps > 10000) return { ok: false, error: "Rate must be between 0% and 100%." };

  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    let destId: string | null = null;
    if (destinationSlug) {
      destId = await destinationId(destinationSlug);
      if (!destId) return { ok: false, error: "Destination not found." };
    }
    const deactivate = supabase.from("commission_rules").update({ active: false }).eq("active", true);
    await (destId ? deactivate.eq("destination_id", destId) : deactivate.is("destination_id", null));
    const { error } = await supabase.from("commission_rules").insert({
      name: destinationSlug ? `Override: ${destinationSlug}` : "Global",
      rate_bps: bps,
      destination_id: destId,
      active: true,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  updateDemoState((s) => {
    if (destinationSlug) {
      s.commissionByDest = { ...(s.commissionByDest ?? {}) };
      s.commissionByDest[destinationSlug] = bps;
    } else {
      s.commissionGlobalBps = bps;
    }
  });
  return { ok: true };
}

/** Remove a destination override so it falls back to the global rate. */
export async function clearDestinationOverride(destinationSlug: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const destId = await destinationId(destinationSlug);
    if (!destId) return;
    const { createClient } = await import("@/lib/supabase/server");
    await createClient().from("commission_rules").update({ active: false }).eq("active", true).eq("destination_id", destId);
  } else {
    updateDemoState((s) => {
      if (s.commissionByDest) delete s.commissionByDest[destinationSlug];
    });
  }
}
