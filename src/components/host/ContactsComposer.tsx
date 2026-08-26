"use client";

import { useState, useTransition } from "react";
import { messageContacts, type SendResult } from "@/app/studio/contacts/actions";

export interface ContactGroup {
  experienceSlug: string;
  experienceName: string;
  contacts: {
    id: string;
    name: string | null;
    email: string | null;
    status: string | null;
    invitedAt: string | null;
  }[];
}

/**
 * Per-retreat contacts composer: tick imported attendees (those with an email),
 * write a note, and send the branded photos/review invite.
 */
export function ContactsComposer({ group }: { group: ContactGroup }) {
  const emailable = group.contacts.filter((c) => c.email);
  const [selected, setSelected] = useState<Set<string>>(new Set(emailable.map((c) => c.id)));
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState(
    `Thank you for joining us on ${group.experienceName} — it was a joy to have you. We'd love to see the retreat through your eyes: share your favourite photos and a few words about your experience.`,
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
    for (const id of selected) fd.append("contactIds", id);
    fd.set("subject", subject);
    fd.set("message", message);
    setResult(null);
    startTransition(async () => setResult(await messageContacts(fd)));
  }

  return (
    <section className="rounded-xl2 border border-ink/10 bg-sand-50 p-6">
      <h2 className="font-display text-xl font-semibold text-ink">{group.experienceName}</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {emailable.length} contact{emailable.length === 1 ? "" : "s"} with an email
        {group.contacts.length > emailable.length ? ` · ${group.contacts.length - emailable.length} without` : ""}
      </p>

      <div className="mt-4 max-h-72 space-y-1.5 overflow-y-auto">
        {group.contacts.map((c) => (
          <label
            key={c.id}
            className={`flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm ${c.email ? "cursor-pointer" : "opacity-60"}`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <input
                type="checkbox"
                disabled={!c.email}
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
                className="h-4 w-4 flex-none accent-clay-500"
              />
              <span className="truncate font-medium text-ink">{c.name || c.email || "Unnamed contact"}</span>
              {c.email ? (
                <span className="truncate text-ink-muted">{c.email}</span>
              ) : (
                <span className="text-ink-muted italic">no email</span>
              )}
              {c.status && (
                <span className="flex-none rounded-full bg-sand-100 px-2 py-0.5 text-[0.6rem] uppercase tracking-eyebrow text-ink-muted">
                  {c.status}
                </span>
              )}
            </span>
            {c.invitedAt && (
              <span className="flex-none rounded-full bg-sand-100 px-2.5 py-1 text-[0.62rem] uppercase tracking-eyebrow text-ink-muted">
                Invited {c.invitedAt}
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
            {pending ? "Sending…" : `Email ${selected.size} contact${selected.size === 1 ? "" : "s"}`}
          </button>
          {result && result.ok && (
            <span className="text-sm text-palm-600">
              Sent to {result.sent} contact{result.sent === 1 ? "" : "s"}
              {result.skipped > 0 ? ` · ${result.skipped} skipped` : ""}.
            </span>
          )}
          {result && !result.ok && <span className="text-sm text-clay-600">{result.error}</span>}
        </div>
      </div>
    </section>
  );
}
