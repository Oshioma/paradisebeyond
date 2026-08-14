"use client";

import { useEffect, useState, useTransition } from "react";
import { toggleVerified, toggleFeatured } from "@/app/desk/verification/actions";

/**
 * The Verified / Featured status pills and their toggle buttons for one
 * experience row. Runs the server action inside a transition and flips the UI
 * optimistically, so the badge changes the instant you click instead of waiting
 * for the page to revalidate. If the action fails, the incoming props (the real
 * server state after revalidation) win and the pill reverts.
 *
 * Returns the three trailing <td>s of the row (Verified, Featured, Actions).
 */
export function ExperienceBadgeCells({
  slug,
  verified,
  featured,
}: {
  slug: string;
  verified: boolean;
  featured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [optVerified, setOptVerified] = useState(verified);
  const [optFeatured, setOptFeatured] = useState(featured);

  // Re-sync with the server's truth once a revalidation lands (or on failure).
  useEffect(() => setOptVerified(verified), [verified]);
  useEffect(() => setOptFeatured(featured), [featured]);

  function toggle(kind: "verified" | "featured") {
    const next = kind === "verified" ? !optVerified : !optFeatured;
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set(kind, next ? "1" : "0");
    startTransition(async () => {
      if (kind === "verified") setOptVerified(next);
      else setOptFeatured(next);
      if (kind === "verified") await toggleVerified(fd);
      else await toggleFeatured(fd);
    });
  }

  return (
    <>
      <td className="px-4 py-3">
        {optVerified
          ? <span className="rounded-full bg-palm-500/15 px-2.5 py-1 text-[0.62rem] uppercase tracking-eyebrow text-palm-600">Verified</span>
          : <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[0.62rem] uppercase tracking-eyebrow text-ink-muted">Not verified</span>}
      </td>
      <td className="px-4 py-3">
        {optFeatured
          ? <span className="rounded-full bg-ocean-500/12 px-2.5 py-1 text-[0.62rem] uppercase tracking-eyebrow text-ocean-700">Featured</span>
          : <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[0.62rem] uppercase tracking-eyebrow text-ink-muted">Not featured</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => toggle("verified")}
            disabled={pending}
            className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-eyebrow transition-colors disabled:opacity-50 ${optVerified ? "border border-ink/15 text-ink-muted hover:border-clay-500 hover:text-clay-600" : "bg-palm-500 text-sand-50 hover:bg-palm-600"}`}
          >
            {optVerified ? "Revoke" : "Award"}
          </button>
          <button
            type="button"
            onClick={() => toggle("featured")}
            disabled={pending}
            className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-eyebrow transition-colors disabled:opacity-50 ${optFeatured ? "border border-ink/15 text-ink-muted hover:border-ocean-500 hover:text-ocean-700" : "border border-ocean-500/40 text-ocean-700 hover:bg-ocean-500/10"}`}
          >
            {optFeatured ? "Unfeature" : "Feature"}
          </button>
        </div>
      </td>
    </>
  );
}
