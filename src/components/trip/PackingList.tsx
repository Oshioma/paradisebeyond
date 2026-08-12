"use client";

import { useEffect, useState } from "react";
import type { PackingGroup } from "@/lib/trip/packing";
import { cn } from "@/lib/utils";

/** Tickable packing checklist. Ticks persist locally (no server needed). */
export function PackingList({ bookingId, groups }: { bookingId: string; groups: PackingGroup[] }) {
  const [open, setOpen] = useState(false);
  const key = `pb:packing:${bookingId}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setChecked(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [key]);

  function toggle(item: string) {
    setChecked((c) => {
      const next = { ...c, [item]: !c[item] };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const done = groups.reduce((n, g) => n + g.items.filter((i) => checked[i]).length, 0);

  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-lg font-semibold text-ink">Packing list</h4>
          <p className="mt-1 text-sm text-ink-muted">Tailored to your experience and the season.</p>
        </div>
        <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[0.6rem] uppercase tracking-eyebrow text-ink-muted">{done}/{total}</span>
      </div>

      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-4 rounded-full border border-ink/15 px-4 py-2 text-xs uppercase tracking-eyebrow text-ink-soft hover:border-ink/40">View list</button>
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="eyebrow text-ocean-700">{g.title}</p>
              <ul className="mt-2 space-y-1.5">
                {g.items.map((item) => (
                  <li key={item}>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-soft">
                      <input type="checkbox" checked={!!checked[item]} onChange={() => toggle(item)} className="mt-0.5 h-4 w-4 flex-none accent-clay-500" />
                      <span className={cn(checked[item] && "text-ink-muted line-through")}>{item}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <button onClick={() => setOpen(false)} className="text-xs uppercase tracking-eyebrow text-ink-muted hover:text-ink">Close</button>
        </div>
      )}
    </div>
  );
}
