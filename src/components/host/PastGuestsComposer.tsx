"use client";

import { useState, useTransition } from "react";
import { messagePastGuests, type SendResult } from "@/app/studio/guests/actions";

export interface GuestGroup {
  experienceSlug: string;
  experienceName: string;
  guests: {
    bookingId: string;
    guestName: string;
    dates: string;
    guestCount: number;
    invitedAt: string | null;
  }[];
}

/**
 * Per-retreat composer: tick past guests, write a note, send. The email goes
 * out in the host's branding with a magic link to add photos + review.
 */
export function PastGuestsComposer({ group }: { group: GuestGroup }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(group.guests.map((g) => g.bookingId)));
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState(
    `Thank you for joining us on ${group.experienceName} — it was a joy to host you. We'd love to see the retreat through your eyes: share your favourite photos and a few words about your experience.`,
  );
  const [result, setResult] = useState<SendResult | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function send() {
    const fd = new FormData();
    for (const id of selected) fd.append("bookingIds", id);
    fd.set("subject", subject);
    fd.set("message", message);
    setResult(null);
    startTransition(async () => {
      setResult(await messagePastGuests(fd));
    });
  }

  return (
    <section className="rounded-xl2 border border-ink/10 bg-sand-50 p-6">
      <h2 className="font-display text-xl font-semibold text-ink">{group.experienceName}</h2>

      <div className="mt-4 space-y-1.5">
        {group.guests.map((g) => (
          <label
            key={g.bookingId}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm"
          >
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.has(g.bookingId)}
                onChange={() => toggle(g.bookingId)}
                className="h-4 w-4 accent-clay-500"
              />
              <span className="font-medium text-ink">{g.guestName}</span>
              <span className="text-ink-muted">
                {g.dates} · {g.guestCount} {g.guestCount === 1 ? "guest" : "guests"}
              </span>
            </span>
            {g.invitedAt && (
              <span className="rounded-full bg-sand-100 px-2.5 py-1 text-[0.62rem] uppercase tracking-eyebrow text-ink-muted">
                Invited {g.invitedAt}
              </span>
            )}
          </label>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={`Subject (default: “${group.experienceName} — share your photos & memories”)`}
          className="w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-ink/40 focus:outline-none"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm leading-relaxed text-ink focus:border-ink/40 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={send}
            disabled={pending || selected.size === 0}
            className="rounded-full bg-ink px-6 py-2.5 text-xs uppercase tracking-eyebrow text-sand-50 disabled:opacity-50"
          >
            {pending ? "Sending…" : `Email ${selected.size} guest${selected.size === 1 ? "" : "s"}`}
          </button>
          {result && result.ok && (
            <span className="text-sm text-palm-600">
              Sent to {result.sent} guest{result.sent === 1 ? "" : "s"}
              {result.skipped > 0 ? ` · ${result.skipped} skipped (no email found)` : ""}.
            </span>
          )}
          {result && !result.ok && <span className="text-sm text-clay-600">{result.error}</span>}
        </div>
      </div>
    </section>
  );
}
