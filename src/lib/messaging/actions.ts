"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateDemoState } from "@/lib/demo/state";

/** Post a message on a booking thread. Guest, host or admin participants only. */
export async function sendMessage(formData: FormData) {
  const user = await requireUser();
  const bookingId = String(formData.get("bookingId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!bookingId || !body) return { ok: false, error: "Write a message first." };

  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    // RLS ensures only booking participants can insert. sender_name is
    // denormalized so threads show a real name without a cross-party profile read.
    const { error } = await createClient().from("messages").insert({
      booking_id: bookingId,
      sender_id: user.id,
      sender_role: user.role,
      sender_name: user.name,
      body,
    });
    if (error) return { ok: false, error: "Message couldn't be sent. Please try again." };
  } else {
    updateDemoState((s) => {
      s.messages.push({
        id: "m-" + crypto.randomUUID().slice(0, 8),
        bookingId,
        senderId: user.id,
        senderRole: user.role,
        senderName: user.name,
        body,
        createdAt: new Date().toISOString(),
      });
    });
  }

  revalidatePath(`/account/trips/${bookingId}`);
  revalidatePath(`/studio/messages/${bookingId}`);
  revalidatePath("/studio/messages");
  return { ok: true };
}
