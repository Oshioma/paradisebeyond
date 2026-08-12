"use client";

import { useRef } from "react";
import type { Message } from "@/lib/messaging/types";
import { sendMessage } from "@/lib/messaging/actions";
import { cn } from "@/lib/utils";

/**
 * Booking-scoped message thread, shared by the guest trip page and the host
 * inbox. Own messages sit on the right; the other party's on the left, labelled
 * by role from `names`.
 */
export function MessageThread({
  bookingId,
  messages,
  currentUserId,
  names,
}: {
  bookingId: string;
  messages: Message[];
  currentUserId: string;
  names: { host: string; guest: string; admin: string };
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col rounded-xl2 border border-ink/10 bg-sand-50">
      <div className="max-h-[420px] space-y-3 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            No messages yet. Say hello — your host is here to help.
          </p>
        ) : (
          messages.map((m) => {
            const own = m.senderId === currentUserId;
            const label = own ? "You" : names[m.senderRole] ?? "Guest";
            return (
              <div key={m.id} className={cn("flex flex-col", own ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    own ? "bg-ink text-sand-50" : "bg-sand-100 text-ink-soft",
                  )}
                >
                  {!own && <p className="mb-0.5 text-[0.66rem] uppercase tracking-eyebrow text-ocean-700">{label}</p>}
                  {m.body}
                </div>
                <time className="mt-1 px-1 text-[0.62rem] text-ink-muted">
                  {new Date(m.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </time>
              </div>
            );
          })
        )}
      </div>

      <form
        ref={formRef}
        action={async (fd) => {
          await sendMessage(fd);
          formRef.current?.reset();
        }}
        className="flex items-end gap-2 border-t border-ink/10 p-3"
      >
        <input type="hidden" name="bookingId" value={bookingId} />
        <textarea
          name="body"
          required
          rows={1}
          placeholder="Write a message…"
          className="min-h-[42px] w-full resize-none rounded-xl border border-ink/15 bg-sand-50 px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
        />
        <button className="rounded-full bg-clay-500 px-5 py-2.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600">
          Send
        </button>
      </form>
    </div>
  );
}
