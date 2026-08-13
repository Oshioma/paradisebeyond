import type { Message } from "@/lib/messaging/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readDemoState } from "@/lib/demo/state";

/** A seeded host greeting so demo threads aren't empty. */
const DEMO_SEED: Record<string, Message[]> = {
  "bk-1001": [
    {
      id: "m-seed-1",
      bookingId: "bk-1001",
      senderId: "demo-host",
      senderRole: "host",
      senderName: "Amina Yusuf",
      body: "Karibu! I'm so glad you're joining Zanzibar Reconnection. Let me know if you have any questions before you travel — and don't forget to add your flight details so we can arrange your transfer.",
      createdAt: "2026-08-01T09:00:00.000Z",
    },
  ],
};

export async function getMessages(bookingId: string): Promise<Message[]> {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient(); // RLS scopes to booking participants
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });
    return (data ?? []).map((r: any) => ({
      id: r.id,
      bookingId: r.booking_id,
      senderId: r.sender_id,
      senderRole: r.sender_role,
      senderName: r.sender_name || r.sender_role,
      body: r.body,
      createdAt: r.created_at,
    }));
  }
  const state = readDemoState();
  const seeded = DEMO_SEED[bookingId] ?? [];
  const own = state.messages.filter((m) => m.bookingId === bookingId);
  return [...seeded, ...own].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export interface Conversation {
  bookingId: string;
  guestName: string;
  experienceName: string;
  lastBody: string;
  lastAt: string;
  count: number;
}

/** Conversations for the host inbox — one per booking that has messages. */
export async function getHostConversations(hostSlug: string): Promise<Conversation[]> {
  const { getHostBookings } = await import("@/lib/data/bookings");
  const bookings = await getHostBookings(hostSlug);
  const convos: Conversation[] = [];
  for (const b of bookings) {
    const msgs = await getMessages(b.id);
    if (msgs.length === 0) continue;
    const last = msgs[msgs.length - 1];
    convos.push({
      bookingId: b.id,
      guestName: b.guestName,
      experienceName: b.experience.name,
      lastBody: last.body,
      lastAt: last.createdAt,
      count: msgs.length,
    });
  }
  return convos.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}
