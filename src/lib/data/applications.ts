import type { HostApplication } from "@/lib/demo/applications";
import { DEMO_APPLICATIONS } from "@/lib/demo/applications";
import { readDemoState } from "@/lib/demo/state";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Host applications for the admin desk. The Supabase path queries the
 * RLS-protected `host_applications` table (admins see all). Demo mode reads the
 * seed set plus anything submitted this session, with status changes layered on.
 */
export async function getApplications(): Promise<HostApplication[]> {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const { data } = await createClient()
      .from("host_applications")
      .select("*")
      .order("created_at", { ascending: false });
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: (r.name as string) ?? "",
      email: (r.email as string) ?? "",
      destination: (r.destination as string) ?? "",
      retreatIdea: (r.retreat_idea as string) ?? "",
      duration: (String(r.duration ?? "7") as "7" | "14"),
      approxDates: (r.approx_dates as string) ?? "",
      expectedPriceUsd: r.expected_price_minor ? Number(r.expected_price_minor) / 100 : 0,
      expectedGroupSize: Number(r.expected_group_size ?? 0),
      accommodation: (r.accommodation as string) ?? "",
      background: (r.background as string) ?? "",
      status: (r.status as HostApplication["status"]) ?? "submitted",
      createdAt: (r.created_at as string) ?? "",
    }));
  }

  const state = readDemoState();
  const all = [...(state.demoApps ?? []), ...DEMO_APPLICATIONS];
  return all.map((a) => ({ ...a, status: state.apps[a.id] ?? a.status }));
}
