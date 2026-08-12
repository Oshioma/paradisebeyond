import type { HostApplication } from "@/lib/demo/applications";
import { DEMO_APPLICATIONS } from "@/lib/demo/applications";
import { readDemoState } from "@/lib/demo/state";

/**
 * Host applications for the admin desk. Demo mode reads the seed set with any
 * status changes made this session layered on top; the Supabase path queries
 * the RLS-protected `host_applications` table (admin-only writes).
 */
export async function getApplications(): Promise<HostApplication[]> {
  const state = readDemoState();
  return DEMO_APPLICATIONS.map((a) => ({
    ...a,
    status: state.apps[a.id] ?? a.status,
  }));
}
