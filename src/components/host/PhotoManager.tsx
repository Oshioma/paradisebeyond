"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { allocatePhotoDay, togglePhotoPublished, deletePhoto, deletePhotos, addPhotosByUrl, clearImportedDays } from "@/app/studio/photos/actions";

interface ManagedPhoto {
  id: string;
  url: string;
  dayNumber: number | null;
  uploaderName: string | null;
  source: "guest" | "host" | "import";
  published: boolean;
}

/** Per-retreat photo board: allocate to days, hide/show, delete, add by URL. */
export function PhotoManager({
  experienceSlug,
  experienceName,
  days,
  photos,
}: {
  experienceSlug: string;
  experienceName: string;
  days: { day: number; title: string }[];
  photos: ManagedPhoto[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState("");
  const [bulkDay, setBulkDay] = useState("");
  const [added, setAdded] = useState<number | null>(null);
  const [cleared, setCleared] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const importedWithDay = photos.filter((p) => p.source === "import" && p.dayNumber != null).length;

  // Drop selections for photos that no longer exist after a refresh.
  const present = new Set(photos.map((p) => p.id));
  const selectedIds = [...selected].filter((id) => present.has(id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(photos.map((p) => p.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function onDeleteSelected() {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected photo${selectedIds.length === 1 ? "" : "s"}? This can't be undone.`)) return;
    const fd = new FormData();
    for (const id of selectedIds) fd.append("photoIds", id);
    setError(null);
    startTransition(async () => {
      const res = await deletePhotos(fd);
      if (!res.ok) setError(res.error ?? "Couldn't delete those photos.");
      else clearSelection();
      router.refresh();
    });
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      router.refresh();
    });
  }

  function onAllocate(photoId: string, day: string) {
    const fd = new FormData();
    fd.set("photoId", photoId);
    fd.set("day", day);
    run(() => allocatePhotoDay(fd));
  }

  function onToggle(p: ManagedPhoto) {
    const fd = new FormData();
    fd.set("photoId", p.id);
    fd.set("published", String(!p.published));
    run(() => togglePhotoPublished(fd));
  }

  function onDelete(p: ManagedPhoto) {
    if (!window.confirm("Delete this photo? This can't be undone.")) return;
    const fd = new FormData();
    fd.set("photoId", p.id);
    run(() => deletePhoto(fd));
  }

  function onClearImportedDays() {
    if (!window.confirm(`Move all ${importedWithDay} imported photo${importedWithDay === 1 ? "" : "s"} back to the gallery (no day)? You can re-allocate any of them by hand afterwards.`)) return;
    const fd = new FormData();
    fd.set("experienceSlug", experienceSlug);
    setCleared(null);
    setError(null);
    startTransition(async () => {
      const res = await clearImportedDays(fd);
      if (res.ok) setCleared(res.cleared ?? 0);
      else setError(res.error ?? "Couldn't update those photos.");
      router.refresh();
    });
  }

  function onAddUrls() {
    const fd = new FormData();
    fd.set("experienceSlug", experienceSlug);
    fd.set("urls", urls);
    fd.set("day", bulkDay);
    setAdded(null);
    setError(null);
    startTransition(async () => {
      const res = await addPhotosByUrl(fd);
      if (res.ok) {
        setAdded(res.added ?? 0);
        setUrls("");
      } else setError(res.error ?? "Couldn't add those URLs.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl2 border border-ink/10 bg-sand-50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-ink">{experienceName}</h2>
        {(importedWithDay > 0 || cleared !== null) && (
          <div className="flex items-center gap-3">
            {cleared !== null && (
              <span className="text-sm text-palm-600">Moved {cleared} photo{cleared === 1 ? "" : "s"} to the gallery.</span>
            )}
            {importedWithDay > 0 && (
              <button
                onClick={onClearImportedDays}
                disabled={pending}
                title="Imported photos were auto-assigned to days; this clears those so you can set days by hand."
                className="rounded-full border border-ink/20 px-4 py-1.5 text-xs uppercase tracking-eyebrow text-ink hover:border-ink disabled:opacity-50"
              >
                {pending ? "Working…" : `Move ${importedWithDay} imported photo${importedWithDay === 1 ? "" : "s"} to gallery`}
              </button>
            )}
          </div>
        )}
      </div>

      {photos.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-ink/20 py-10 text-center text-sm text-ink-muted">
          No photos yet — invite past guests from the <span className="font-medium">Past guests</span> tab, or add
          image URLs below.
        </p>
      ) : (
        <>
        {/* Selection bar: tick photos and act on them together. */}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm">
          <span className="font-medium text-ink">
            {selectedIds.length ? `${selectedIds.length} selected` : `${photos.length} photo${photos.length === 1 ? "" : "s"}`}
          </span>
          <button onClick={selectAll} disabled={pending} className="text-ink-soft underline-offset-2 hover:underline">
            Select all
          </button>
          {selectedIds.length > 0 && (
            <button onClick={clearSelection} disabled={pending} className="text-ink-soft underline-offset-2 hover:underline">
              Clear
            </button>
          )}
          <button
            onClick={onDeleteSelected}
            disabled={pending || selectedIds.length === 0}
            className="ml-auto rounded-full bg-clay-500 px-4 py-1.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600 disabled:opacity-40"
          >
            {pending ? "Working…" : `Delete ${selectedIds.length || ""} selected`.trim()}
          </button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => {
            const isSelected = selected.has(p.id);
            return (
            <div key={p.id} className={`overflow-hidden rounded-xl border bg-white ${isSelected ? "border-clay-500 ring-2 ring-clay-500/40" : "border-ink/10"} ${p.published ? "" : "opacity-60"}`}>
              <div className="relative aspect-[4/3] bg-sand-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                {/* Selection checkbox */}
                <label className="absolute left-2 top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-white/90 shadow-sm ring-1 ring-ink/10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(p.id)}
                    aria-label="Select photo"
                    className="h-4 w-4 accent-clay-500"
                  />
                </label>
                <span className="absolute right-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[0.6rem] uppercase tracking-eyebrow text-sand-50">
                  {p.source === "guest" ? p.uploaderName || "Guest" : p.source === "import" ? "Imported" : "Host"}
                </span>
                {!p.published && (
                  <span className="absolute bottom-2 right-2 rounded-full bg-clay-500 px-2 py-0.5 text-[0.6rem] uppercase tracking-eyebrow text-sand-50">
                    Hidden
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 p-3">
                <select
                  value={p.dayNumber ?? ""}
                  onChange={(e) => onAllocate(p.id, e.target.value)}
                  disabled={pending}
                  className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-sand-50 px-2 py-1.5 text-xs text-ink focus:outline-none"
                >
                  <option value="">Gallery (no day)</option>
                  {days.map((d) => (
                    <option key={d.day} value={d.day}>
                      Day {d.day}{d.title ? ` — ${d.title}` : ""}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onToggle(p)}
                  disabled={pending}
                  title={p.published ? "Hide from the retreat page" : "Show on the retreat page"}
                  className="rounded-lg border border-ink/15 px-2.5 py-1.5 text-xs text-ink-soft hover:border-ink/40"
                >
                  {p.published ? "Hide" : "Show"}
                </button>
                <button
                  onClick={() => onDelete(p)}
                  disabled={pending}
                  className="rounded-lg border border-clay-500/40 px-2.5 py-1.5 text-xs text-clay-600 hover:bg-clay-500/10"
                >
                  Delete
                </button>
              </div>
            </div>
            );
          })}
        </div>
        </>
      )}

      <div className="mt-6 rounded-xl border border-ink/10 bg-white p-4">
        <p className="text-xs uppercase tracking-eyebrow text-ink-muted">Add photos by URL</p>
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          rows={3}
          placeholder={"https://…/photo-1.jpg\nhttps://…/photo-2.jpg"}
          className="mt-2 w-full rounded-xl border border-ink/15 bg-sand-50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <select
            value={bulkDay}
            onChange={(e) => setBulkDay(e.target.value)}
            className="rounded-lg border border-ink/15 bg-sand-50 px-2 py-1.5 text-xs text-ink focus:outline-none"
          >
            <option value="">Gallery (no day)</option>
            {days.map((d) => (
              <option key={d.day} value={d.day}>
                Day {d.day}{d.title ? ` — ${d.title}` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={onAddUrls}
            disabled={pending || !urls.trim()}
            className="rounded-full bg-ink px-5 py-2 text-xs uppercase tracking-eyebrow text-sand-50 disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add photos"}
          </button>
          {added !== null && <span className="text-sm text-palm-600">Added {added} photo{added === 1 ? "" : "s"}.</span>}
          {error && <span className="text-sm text-clay-600">{error}</span>}
        </div>
      </div>
    </section>
  );
}
