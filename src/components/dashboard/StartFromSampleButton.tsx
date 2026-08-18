"use client";

import { useState, useTransition } from "react";
import { startDraftFromSample } from "@/app/desk/experiences/actions";

/**
 * Admin-only: fork an experience into a fresh editable draft and jump into the
 * builder. On success the server action redirects, so this just shows progress
 * and surfaces any error.
 */
export function StartFromSampleButton({ slug }: { slug: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await startDraftFromSample(slug);
            // Only returns on failure — success redirects into the builder.
            if (res && !res.ok) setError(res.error);
          });
        }}
        disabled={pending}
        title="Make an editable copy of this retreat that's yours"
        className="text-xs uppercase tracking-eyebrow text-clay-600 hover:underline disabled:opacity-50"
      >
        {pending ? "Copying…" : "Make mine"}
      </button>
      {error && <span className="text-[0.62rem] normal-case tracking-normal text-clay-600">{error}</span>}
    </span>
  );
}
