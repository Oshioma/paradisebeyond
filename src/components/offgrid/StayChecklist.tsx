"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { clearDraft, loadDraft, saveDraft } from "@/lib/forms/drafts";
import { toggleChecklistItem } from "@/lib/offgrid/checklistActions";
import type { ItemKind } from "@/lib/offgrid/checklist";

/** A checklist item as the server resolved it (serialisable — no functions). */
export interface ChecklistRow {
  key: string;
  label: string;
  hint?: string;
  kind: ItemKind;
  done: boolean;
  canToggle: boolean;
}

/** The list with progress. Manual items toggle; derived and "soon" items don't. */
export function ChecklistList({ bookingId, rows, eyebrow, title }: { bookingId: string; rows: ChecklistRow[]; eyebrow: string; title: string }) {
  const counted = rows.filter((r) => r.kind !== "soon");
  const done = counted.filter((r) => r.done).length;
  const pct = counted.length ? Math.round((done / counted.length) * 100) : 0;
  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-100 p-5 sm:p-7">
      <p className="eyebrow text-forest-700">{eyebrow}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h3 className="font-display text-2xl font-semibold text-ink">{title}</h3>
        <p className="text-sm text-ink-muted">
          <span className="font-semibold text-ink">{done} of {counted.length}</span> ready
        </p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={counted.length}>
        <div className="h-full rounded-full bg-forest-700 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-5 divide-y divide-ink/10">
        {rows.map((r) => (
          <Row key={r.key} bookingId={bookingId} row={r} />
        ))}
      </ul>
    </div>
  );
}

function Row({ bookingId, row }: { bookingId: string; row: ChecklistRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const soon = row.kind === "soon";
  const toggle = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("bookingId", bookingId);
      fd.set("key", row.key);
      fd.set("on", row.done ? "0" : "1");
      await toggleChecklistItem(fd);
      router.refresh();
    });
  return (
    <li className={cn("flex items-start gap-3 py-3.5", soon && "opacity-70")}>
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border",
          row.done ? "border-forest-700 bg-forest-700 text-sand-50" : soon ? "border-dashed border-ink/30" : "border-ink/30",
        )}
      >
        {row.done && (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 8.5l3 3 6-7" />
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[0.95rem] text-ink", row.done && "text-ink-soft")}>
          {row.label}
          <span className="sr-only">{row.done ? " — done" : soon ? " — coming soon" : " — to do"}</span>
        </p>
        {row.hint && <p className="mt-0.5 text-sm text-ink-muted">{row.hint}</p>}
      </div>
      {soon ? (
        <span className="flex-none rounded-full bg-ink/5 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-eyebrow text-ink-muted">Coming soon</span>
      ) : row.kind === "derived" ? (
        <span className="flex-none pt-0.5 text-xs text-ink-muted">{row.done ? "Done" : "Updates itself"}</span>
      ) : (
        <button
          type="button"
          onClick={toggle}
          disabled={pending || !row.canToggle}
          className={cn(
            "flex-none rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40",
            row.done ? "border-ink/15 text-ink-muted hover:border-ink/40" : "border-forest-700 text-forest-800 hover:bg-forest-700 hover:text-sand-50",
          )}
        >
          {row.done ? "Undo" : "Confirm"}
        </button>
      )}
    </li>
  );
}

export interface FieldDef {
  name: string;
  label: string;
  hint?: string;
  type?: "text" | "textarea" | "tel" | "email";
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

/**
 * A small form that keeps a draft in the browser as you type (survives a
 * refresh), and clears it once saved. Nothing secret goes in these forms.
 */
export function DraftForm({
  bookingId,
  draftKey,
  fields,
  initial,
  action,
  submitLabel,
  savedLabel = "Saved",
}: {
  bookingId: string;
  draftKey: string;
  fields: FieldDef[];
  initial: Record<string, string | undefined>;
  action: (fd: FormData) => Promise<{ ok: boolean; error?: string }>;
  submitLabel: string;
  savedLabel?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? ""])),
  );
  const [status, setStatus] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();

  // Restore an unsaved draft once mounted.
  useEffect(() => {
    const d = loadDraft<Record<string, string>>(draftKey);
    if (d) setValues((v) => ({ ...v, ...(d as Record<string, string>) }));
  }, [draftKey]);

  const set = (name: string, value: string) => {
    setValues((v) => {
      const next = { ...v, [name]: value };
      saveDraft(draftKey, next);
      return next;
    });
    setStatus(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const fd = new FormData();
      fd.set("bookingId", bookingId);
      for (const [k, v] of Object.entries(values)) fd.set(k, v);
      const res = await action(fd);
      setStatus(res);
      if (res.ok) {
        clearDraft(draftKey);
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {fields.map((f) => (
        <label key={f.name} className="block">
          <span className="text-sm font-medium text-ink">{f.label}</span>
          {f.hint && <span className="mt-0.5 block text-sm text-ink-muted">{f.hint}</span>}
          {f.type === "textarea" ? (
            <textarea
              name={f.name}
              rows={f.rows ?? 4}
              value={values[f.name]}
              placeholder={f.placeholder}
              required={f.required}
              onChange={(e) => set(f.name, e.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/15 bg-sand-50 px-4 py-3 text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:border-forest-700 focus:outline-none"
            />
          ) : (
            <input
              name={f.name}
              type={f.type ?? "text"}
              value={values[f.name]}
              placeholder={f.placeholder}
              required={f.required}
              onChange={(e) => set(f.name, e.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/15 bg-sand-50 px-4 py-3 text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:border-forest-700 focus:outline-none"
            />
          )}
        </label>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-forest-700 px-5 py-2.5 text-xs font-medium uppercase tracking-eyebrow text-sand-50 transition-colors hover:bg-forest-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        {status?.ok && <span className="text-sm text-forest-700">{savedLabel}</span>}
        {status?.error && <span className="text-sm text-clay-600">{status.error}</span>}
      </div>
    </form>
  );
}
