import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readDemoState, updateDemoState } from "@/lib/demo/state";
import type { RequestStatus, StayRequest } from "@/lib/offgrid/requests";

/**
 * Persistence for stay requests (table `stay_requests`, migration 0034).
 * Reads and writes go through the user's own Supabase session, so the
 * row-level policies and the security-definer functions decide who can see a
 * request and who can accept, decline, withdraw or link it.
 */

function fromRow(r: Record<string, unknown>): StayRequest {
  return {
    id: r.id as string,
    guestId: r.guest_id as string,
    guestName: (r.guest_name as string) ?? undefined,
    departureId: r.departure_id as string,
    arrival: r.arrival as string,
    nights: Number(r.nights),
    guests: Number(r.guests),
    introduction: r.introduction as string,
    status: r.status as RequestStatus,
    hostNote: (r.host_note as string) ?? undefined,
    bookingId: (r.booking_id as string) ?? undefined,
    createdAt: r.created_at as string,
    decidedAt: (r.decided_at as string) ?? undefined,
  };
}

async function db() {
  const { createClient } = await import("@/lib/supabase/server");
  return createClient();
}

/** Everything this user may see: their own requests, plus (hosts) requests for their listings. */
export async function listVisibleRequests(): Promise<StayRequest[]> {
  if (isSupabaseConfigured()) {
    const { data } = await (await db()).from("stay_requests").select("*").order("created_at", { ascending: false });
    return (data ?? []).map(fromRow);
  }
  return [...(readDemoState().stayRequests ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRequest(id: string): Promise<StayRequest | null> {
  if (isSupabaseConfigured()) {
    const { data } = await (await db()).from("stay_requests").select("*").eq("id", id).maybeSingle();
    return data ? fromRow(data) : null;
  }
  return (readDemoState().stayRequests ?? []).find((r) => r.id === id) ?? null;
}

export async function insertRequest(r: Omit<StayRequest, "id" | "status" | "createdAt">): Promise<StayRequest | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await (await db())
      .from("stay_requests")
      .insert({
        guest_id: r.guestId, guest_name: r.guestName, departure_id: r.departureId,
        arrival: r.arrival, nights: r.nights, guests: r.guests, introduction: r.introduction,
      })
      .select("*")
      .single();
    return error || !data ? null : fromRow(data);
  }
  const created: StayRequest = { ...r, id: "rq-" + crypto.randomUUID().slice(0, 8), status: "pending", createdAt: new Date().toISOString() };
  updateDemoState((s) => { s.stayRequests = [...(s.stayRequests ?? []), created]; });
  return created;
}

/** Host decision. In live mode the database checks the caller hosts this listing. */
export async function decideRequest(id: string, accept: boolean, note?: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const { error } = await (await db()).rpc("decide_stay_request", { p_request: id, p_accept: accept, p_note: note ?? "" });
    return !error;
  }
  let ok = false;
  updateDemoState((s) => {
    const r = (s.stayRequests ?? []).find((x) => x.id === id && x.status === "pending");
    if (r) { r.status = accept ? "accepted" : "declined"; r.hostNote = note || undefined; r.decidedAt = new Date().toISOString(); ok = true; }
  });
  return ok;
}

export async function withdrawRequest(id: string, guestId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const { error } = await (await db()).rpc("withdraw_stay_request", { p_request: id });
    return !error;
  }
  let ok = false;
  updateDemoState((s) => {
    const r = (s.stayRequests ?? []).find((x) => x.id === id && x.guestId === guestId && (x.status === "pending" || x.status === "accepted"));
    if (r) { r.status = "withdrawn"; ok = true; }
  });
  return ok;
}

export async function linkRequest(id: string, bookingId: string, guestId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const { error } = await (await db()).rpc("link_stay_request", { p_request: id, p_booking: bookingId });
    return !error;
  }
  let ok = false;
  updateDemoState((s) => {
    const r = (s.stayRequests ?? []).find((x) => x.id === id && x.guestId === guestId && x.status === "accepted");
    if (r) { r.status = "booked"; r.bookingId = bookingId; ok = true; }
  });
  return ok;
}

/**
 * Email addresses for notifications. Service role (server-only): the host's
 * account email for a listing's departure, and a traveller's account email.
 * Returns [] / null in demo mode or on any failure — emails are best-effort.
 */
export async function hostEmailsForDeparture(departureId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const admin = createServiceRoleClient();
    const { data: dep } = await admin.from("departures").select("experience_id").eq("id", departureId).maybeSingle();
    if (!dep) return [];
    const { data: links } = await admin.from("experience_hosts").select("hosts(owner_id)").eq("experience_id", dep.experience_id);
    const owners = [...new Set((links ?? []).map((l: { hosts?: { owner_id?: string } | null }) => l.hosts?.owner_id).filter(Boolean) as string[])];
    const emails: string[] = [];
    for (const id of owners) {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data?.user?.email) emails.push(data.user.email);
    }
    return emails;
  } catch {
    return [];
  }
}

export async function userEmail(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const { data } = await createServiceRoleClient().auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}
