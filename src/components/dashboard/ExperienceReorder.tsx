"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { reorderExperiences } from "@/app/desk/experiences/actions";
import { StartFromSampleButton } from "@/components/dashboard/StartFromSampleButton";

export interface ReorderItem {
  slug: string;
  name: string;
  location: string;
  host: string;
  meta: string; // e.g. "14 days · From $1,650"
  verified: boolean;
  featured: boolean;
  editHref?: string;
}

/**
 * Drag-free reordering that's reliable on touch: each row has Top / ↑ / ↓
 * controls. Moves apply instantly to local state (which drives the list), and
 * the new order is saved in the background — debounced so rapid taps coalesce
 * into one write. Buttons are never disabled mid-save, so a quick second tap
 * always registers.
 */
export function ExperienceReorder({ items }: { items: ReorderItem[] }) {
  const [order, setOrder] = useState<ReorderItem[]>(items);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const latest = useRef<ReorderItem[]>(items);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function scheduleSave() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      setStatus(null);
      const res = await reorderExperiences(latest.current.map((i) => i.slug));
      setSaving(false);
      setStatus(res.ok ? { ok: true, text: "Order saved." } : { ok: false, text: res.error ?? "Couldn't save the order." });
    }, 450);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    latest.current = next;
    setOrder(next);
    setStatus(null);
    scheduleSave();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          Use <span className="font-medium text-ink">Top</span> / <span className="font-medium text-ink">↑</span> / <span className="font-medium text-ink">↓</span> to set the order guests see. Changes save and go live automatically.
        </p>
        <p aria-live="polite" className="text-xs">
          {saving ? <span className="text-ink-muted">Saving…</span> : status ? <span className={status.ok ? "text-palm-600" : "text-clay-600"}>{status.ok ? "✓ " : ""}{status.text}</span> : null}
        </p>
      </div>

      <ol className="mt-4 space-y-2">
        {order.map((e, i) => (
          <li key={e.slug} className="flex items-center gap-3 rounded-xl border border-ink/10 bg-sand-50 p-3">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ink/5 text-xs font-semibold text-ink-muted">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">
                {e.name}
                {i === 0 && <span className="ml-2 rounded-full bg-clay-500/15 px-2 py-0.5 text-[0.56rem] uppercase tracking-eyebrow text-clay-600">First</span>}
                {e.featured && <span className="ml-2 rounded-full bg-ocean-500/12 px-2 py-0.5 text-[0.56rem] uppercase tracking-eyebrow text-ocean-700">Featured</span>}
              </p>
              <p className="truncate text-xs text-ink-muted">{e.location} · {e.host} · {e.meta}</p>
            </div>
            <div className="flex flex-none items-center gap-1">
              <Link href={`/experiences/${e.slug}`} className="hidden px-2 text-[0.62rem] uppercase tracking-eyebrow text-ink hover:underline sm:inline">View</Link>
              {e.editHref ? (
                // Already a real, owned retreat → edit it (no "Make mine").
                <Link href={e.editHref} className="px-2 text-[0.62rem] uppercase tracking-eyebrow text-ocean-700 hover:underline">Edit</Link>
              ) : (
                // A sample with no draft behind it → offer a copy to make it yours.
                <span className="px-1"><StartFromSampleButton slug={e.slug} /></span>
              )}
              <MoveBtn label="Move to top" disabled={i === 0} onClick={() => move(i, 0)}>Top</MoveBtn>
              <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>↑</IconBtn>
              <IconBtn label="Move down" disabled={i === order.length - 1} onClick={() => move(i, i + 1)}>↓</IconBtn>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MoveBtn({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="rounded-full border border-ink/15 px-3 py-1.5 text-[0.6rem] uppercase tracking-eyebrow text-ink-soft hover:border-ink/40 disabled:opacity-30">
      {children}
    </button>
  );
}
function IconBtn({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-ink/15 text-ink-soft hover:border-ink/40 disabled:opacity-30">
      {children}
    </button>
  );
}
