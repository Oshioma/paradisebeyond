"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteExperience } from "@/app/desk/experiences/actions";

/**
 * Admin-only: permanently delete a retreat, with a typed confirmation so it
 * can't happen by accident. Refused server-side if the retreat has bookings.
 */
export function DeleteExperienceButton({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!window.confirm(`Delete “${name}” permanently? This can't be undone.`)) return;
    setError(null);
    start(async () => {
      const res = await deleteExperience(slug);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Couldn't delete.");
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={onDelete}
        disabled={pending}
        className="text-xs uppercase tracking-eyebrow text-clay-600 hover:underline disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="text-[0.62rem] normal-case tracking-normal text-clay-600">{error}</span>}
    </span>
  );
}
