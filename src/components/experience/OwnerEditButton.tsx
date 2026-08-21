"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Perm = { canEdit: boolean; admin?: boolean };

/**
 * Owner-only "Edit this retreat" affordance on the public experience page and
 * microsite. Asks the server the authoritative question — can THIS viewer edit
 * this draft (admin / owning host / co-host)? — via /api/can-edit-draft, so the
 * page stays static, guests see nothing, and co-hosts always get the button
 * (the old client-side host-slug guess missed co-hosts with multiple host rows).
 * Navigates via a transition so the button shows an "Opening editor…" state
 * while the (heavy, dynamic) builder page loads.
 */
export function OwnerEditButton({
  retreatDraftId,
}: {
  /** Kept for callers that still pass it; not used for the permission check. */
  hostSlugs?: string[];
  retreatDraftId?: string;
}) {
  const router = useRouter();
  const [perm, setPerm] = useState<Perm | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!retreatDraftId) return;
    let alive = true;
    fetch(`/api/can-edit-draft?id=${encodeURIComponent(retreatDraftId)}`)
      .then((r) => r.json())
      .then((d) => { if (alive) setPerm(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [retreatDraftId]);

  if (!retreatDraftId || !perm?.canEdit) return null;
  const me = { role: perm.admin ? "admin" : "host" };

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => startTransition(() => router.push(`/studio/retreats/new?id=${retreatDraftId}`))}
        disabled={pending}
        aria-busy={pending}
        className="inline-flex items-center gap-2 rounded-full bg-sand-50/95 px-4 py-2 text-xs font-medium uppercase tracking-eyebrow text-ink shadow-soft backdrop-blur transition-colors hover:bg-sand-50 disabled:opacity-90"
      >
        {pending ? (
          <>
            <Dots />
            Opening editor…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 20h9" strokeLinecap="round" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {me.role === "admin" ? "Edit this retreat (admin)" : "Edit this retreat"}
          </>
        )}
      </button>
    </div>
  );
}

function Dots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-duration:1.1s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-duration:1.1s] [animation-delay:0.18s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-duration:1.1s] [animation-delay:0.36s]" />
    </span>
  );
}
