"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loadDemoPhotos, clearAllPhotos } from "@/app/desk/media/actions";

/**
 * Bulk media controls with clear working/done feedback — so "Load demo
 * photography" visibly shows progress and a result rather than looking frozen.
 */
export function MediaBulkActions() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"load" | "clear" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function run(which: "load" | "clear") {
    setMessage(null);
    setBusy(which);
    startTransition(async () => {
      try {
        if (which === "load") {
          const res = await loadDemoPhotos();
          setMessage(`✓ Demo photography applied to ${res.count} slots. Refresh the site to see it.`);
        } else {
          await clearAllPhotos();
          setMessage("✓ Cleared — all slots back to placeholders.");
        }
        router.refresh();
      } catch (e) {
        setMessage(`Something went wrong: ${e instanceof Error ? e.message : "unknown error"}`);
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => run("load")}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs uppercase tracking-eyebrow text-sand-50 transition-colors hover:bg-ink-soft disabled:opacity-60"
        >
          {busy === "load" && <Spinner />}
          {busy === "load" ? "Applying…" : "Load demo photography"}
        </button>
        <button
          onClick={() => run("clear")}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-xs uppercase tracking-eyebrow text-ink-soft transition-colors hover:border-ink/40 disabled:opacity-60"
        >
          {busy === "clear" && <Spinner />}
          {busy === "clear" ? "Clearing…" : "Clear all"}
        </button>
      </div>
      {message && (
        <p className={`mt-3 text-sm ${message.startsWith("✓") ? "text-palm-600" : "text-clay-600"}`}>{message}</p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
      <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
