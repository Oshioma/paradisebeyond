"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { republishExperience } from "@/app/desk/experiences/actions";

/**
 * Re-push a live experience from its current builder draft — used to sync photos
 * or other edits a host saved after approval (editing doesn't auto-publish).
 */
export function RepublishButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run() {
    setMsg(null);
    start(async () => {
      const res = await republishExperience(slug);
      setMsg(res.ok ? { ok: true, text: "Re-published" } : { ok: false, text: res.error ?? "Failed" });
      if (res.ok) router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        title="Re-copy the builder draft (photos and all) to the live listing"
        className="text-xs uppercase tracking-eyebrow text-ocean-700 hover:underline disabled:opacity-50"
      >
        {pending ? "Re-publishing…" : "Re-publish"}
      </button>
      {msg && <span className={`text-[0.6rem] uppercase tracking-eyebrow ${msg.ok ? "text-palm-600" : "text-clay-600"}`}>{msg.ok ? "✓ " : ""}{msg.text}</span>}
    </span>
  );
}
