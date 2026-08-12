"use client";

import { useState, useTransition } from "react";
import { saveCriteria } from "@/app/desk/verification/actions";

/** Editable verification-criteria checklist. Saved to app_settings. */
export function CriteriaEditor({ initial }: { initial: string[] }) {
  const [items, setItems] = useState<string[]>(initial.length ? initial : [""]);
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function save() {
    start(async () => {
      const fd = new FormData();
      fd.set("items", JSON.stringify(items.map((i) => i.trim()).filter(Boolean)));
      await saveCriteria(fd);
      setSavedAt(new Date().toLocaleTimeString());
    });
  }

  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-6">
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-ink/5 text-xs text-ink-muted">{i + 1}</span>
            <input
              value={it}
              onChange={(e) => setItems((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder="A criterion guests can trust…"
              className="w-full rounded-lg border border-ink/15 bg-sand-50 px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
            />
            <button onClick={() => setItems((a) => a.filter((_, j) => j !== i))} aria-label="Remove" className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-ink-muted hover:bg-clay-500/10 hover:text-clay-600">✕</button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={() => setItems((a) => [...a, ""])} className="rounded-full border border-dashed border-ink/25 px-4 py-2 text-xs uppercase tracking-eyebrow text-ink-muted hover:border-ink/50 hover:text-ink">+ Add criterion</button>
        <button onClick={save} disabled={pending} className="rounded-full bg-clay-500 px-6 py-2 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600 disabled:opacity-50">
          {pending ? "Saving…" : "Save criteria"}
        </button>
        {savedAt && <span className="text-xs text-palm-600">✓ Saved {savedAt}</span>}
      </div>
    </div>
  );
}
