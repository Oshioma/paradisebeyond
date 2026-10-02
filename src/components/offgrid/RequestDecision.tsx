"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideStayRequest } from "@/lib/offgrid/requestActions";
import { clearDraft, loadDraft, saveDraft } from "@/lib/forms/drafts";

/** Host: accept or decline a request, with an optional note to the traveller (draft survives a refresh). */
export function RequestDecision({ requestId, guestName }: { requestId: string; guestName: string }) {
  const router = useRouter();
  const key = `request-reply:${requestId}`;
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    const d = loadDraft<{ note: string }>(key);
    if (d?.note) setNote(d.note);
  }, [key]);

  const decide = (decision: "accept" | "decline") =>
    start(async () => {
      const fd = new FormData();
      fd.set("requestId", requestId);
      fd.set("decision", decision);
      fd.set("note", note);
      const res = await decideStayRequest(fd);
      if (!res.ok) return setError(res.error ?? "Couldn't save your reply.");
      clearDraft(key);
      router.refresh();
    });

  return (
    <div className="mt-5 border-t border-ink/10 pt-5">
      <label className="block">
        <span className="text-sm font-medium text-ink">A note to {guestName} (optional)</span>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            saveDraft(key, { note: e.target.value });
          }}
          placeholder="e.g. We'd love to have you — let's do a quick video call this week."
          className="mt-2 w-full rounded-xl border border-ink/15 bg-sand-50 px-4 py-3 text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:border-forest-700 focus:outline-none"
        />
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("accept")}
          className="rounded-full bg-forest-700 px-5 py-2.5 text-xs font-medium uppercase tracking-eyebrow text-sand-50 hover:bg-forest-800 disabled:opacity-50"
        >
          Accept
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("decline")}
          className="rounded-full border border-ink/20 px-5 py-2.5 text-xs font-medium uppercase tracking-eyebrow text-ink-soft hover:border-ink/50 disabled:opacity-50"
        >
          Decline
        </button>
        <span className="text-xs text-ink-muted">Accepting doesn&apos;t book or charge anything — {guestName} then confirms.</span>
      </div>
      {error && <p className="mt-3 text-sm text-clay-600">{error}</p>}
    </div>
  );
}
