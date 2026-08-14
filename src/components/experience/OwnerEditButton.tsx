"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Me = { role: string | null; hostSlug: string | null };

/**
 * Owner-only "Edit this retreat" affordance on the public experience page.
 * Checks the viewer client-side via /api/me so the page stays static — it
 * renders nothing for guests. Navigates via a transition so the button shows an
 * "Opening editor…" state while the (heavy, dynamic) builder page loads, rather
 * than looking dead for a second or two.
 */
export function OwnerEditButton({
  hostSlugs,
  retreatDraftId,
}: {
  hostSlugs: string[];
  retreatDraftId?: string;
}) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => { if (alive) setMe(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!retreatDraftId || !me) return null;
  const canEdit =
    me.role === "admin" ||
    (me.role === "host" && me.hostSlug != null && hostSlugs.includes(me.hostSlug));
  if (!canEdit) return null;

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
