"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { reorderExperiences } from "@/app/desk/experiences/actions";

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
 * controls. Every move saves the new order immediately and shows a saved state,
 * so an admin can pin any retreat (or their own) to the top of the listing.
 */
export function ExperienceReorder({ items }: { items: ReorderItem[] }) {
  const router = useRouter();
  const [order, setOrder] = useState<ReorderItem[]>(items);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  function persist(next: ReorderItem[]) {
    setOrder(next);
    setStatus(null);
    startTransition(async () => {
      const res = await reorderExperiences(next.map((i) => i.slug));
      if (res.ok) {
        setStatus({ ok: true, text: "Order saved." });
        router.refresh();
      } else {
        setStatus({ ok: false, text: res.error ?? "Couldn't save the order." });
      }
    });
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    persist(next);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          Use <span className="font-medium text-ink">Top</span> / <span className="font-medium text-ink">↑</span> / <span className="font-medium text-ink">↓</span> to set the order guests see. Changes save and go live immediately.
        </p>
        {status && (
          <p aria-live="polite" className={`text-xs ${status.ok ? "text-palm-600" : "text-clay-600"}`}>
            {status.ok ? "✓ " : ""}{status.text}
          </p>
        )}
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
              {e.editHref && <Link href={e.editHref} className="hidden px-2 text-[0.62rem] uppercase tracking-eyebrow text-ocean-700 hover:underline sm:inline">Edit</Link>}
              <MoveBtn label="Move to top" disabled={pending || i === 0} onClick={() => move(i, 0)}>Top</MoveBtn>
              <IconBtn label="Move up" disabled={pending || i === 0} onClick={() => move(i, i - 1)}>↑</IconBtn>
              <IconBtn label="Move down" disabled={pending || i === order.length - 1} onClick={() => move(i, i + 1)}>↓</IconBtn>
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
