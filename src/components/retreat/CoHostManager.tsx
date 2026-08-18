"use client";

import { useEffect, useState, useTransition } from "react";
import { listCoHosts, addCoHost, removeCoHost } from "@/app/studio/retreats/new/coHostActions";
import type { CoHost } from "@/lib/retreat/coHosts";

/**
 * Manage the people who can edit this retreat. The main host (owner) or an admin
 * can invite/remove co-hosts by email; co-hosts see the list read-only. An
 * invited co-host can open, edit and submit the same retreat.
 */
export function CoHostManager({ draftId, isOwner }: { draftId: string; isOwner: boolean }) {
  const [coHosts, setCoHosts] = useState<CoHost[]>([]);
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    listCoHosts(draftId).then((list) => { if (alive) setCoHosts(list); }).catch(() => {});
    return () => { alive = false; };
  }, [draftId]);

  function refresh() {
    listCoHosts(draftId).then(setCoHosts).catch(() => {});
  }

  function add() {
    const e = email.trim();
    if (!e) return;
    setStatus(null);
    start(async () => {
      const res = await addCoHost(draftId, e);
      if (res.ok) { setEmail(""); setStatus({ ok: true, text: "Co-host added." }); refresh(); }
      else setStatus({ ok: false, text: res.error ?? "Couldn't add them." });
    });
  }

  function remove(hostId: string) {
    setStatus(null);
    start(async () => {
      const res = await removeCoHost(draftId, hostId);
      if (res.ok) { setStatus({ ok: true, text: "Removed." }); refresh(); }
      else setStatus({ ok: false, text: res.error ?? "Couldn't remove." });
    });
  }

  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-100 p-5">
      <p className="font-medium text-ink">Co-hosts</p>
      <p className="mt-0.5 text-sm text-ink-muted">
        {isOwner
          ? "Invite another host to help build and run this retreat. They must already be an approved host."
          : "The people who can edit this retreat. Only the main host can change this list."}
      </p>

      <div className="mt-3 space-y-2">
        {coHosts.length === 0 && <p className="text-sm text-ink-muted">No co-hosts yet.</p>}
        {coHosts.map((c) => (
          <div key={c.hostId} className="flex items-center justify-between rounded-lg border border-ink/10 bg-sand-50 px-3 py-2">
            <span className="text-sm font-medium text-ink">{c.name}</span>
            {isOwner && (
              <button type="button" onClick={() => remove(c.hostId)} disabled={pending} className="text-[0.62rem] uppercase tracking-eyebrow text-ink-muted hover:text-clay-600 disabled:opacity-50">
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {isOwner && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder="co-host@email.com"
            disabled={pending}
            className="min-w-[220px] flex-1 rounded-lg border border-ink/15 bg-sand-50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 disabled:opacity-60"
          />
          <button type="button" onClick={add} disabled={pending || !email.trim()} className="rounded-full bg-ink px-5 py-2 text-[0.62rem] uppercase tracking-eyebrow text-sand-50 hover:bg-ink-soft disabled:opacity-50">
            {pending ? "Adding…" : "Add co-host"}
          </button>
        </div>
      )}

      {status && <p className={`mt-2 text-sm ${status.ok ? "text-palm-600" : "text-clay-600"}`}>{status.ok ? "✓ " : ""}{status.text}</p>}
    </div>
  );
}
