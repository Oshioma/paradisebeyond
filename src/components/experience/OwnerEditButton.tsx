"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Me = { role: string | null; hostSlug: string | null };

/**
 * Owner-only "Edit this retreat" affordance shown on the public experience page.
 * Checks the viewer client-side via /api/me so the page itself stays static —
 * it renders nothing for guests, the owning host, or admins until confirmed.
 * Links to the retreat builder, the same editor used from Studio and the Desk.
 */
export function OwnerEditButton({
  hostSlugs,
  retreatDraftId,
}: {
  hostSlugs: string[];
  retreatDraftId?: string;
}) {
  const [me, setMe] = useState<Me | null>(null);

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
      <Link
        href={`/studio/retreats/new?id=${retreatDraftId}`}
        className="inline-flex items-center gap-2 rounded-full bg-sand-50/95 px-4 py-2 text-xs font-medium uppercase tracking-eyebrow text-ink shadow-soft backdrop-blur transition-colors hover:bg-sand-50"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 20h9" strokeLinecap="round" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {me.role === "admin" ? "Edit this retreat (admin)" : "Edit this retreat"}
      </Link>
    </div>
  );
}
