"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadImage, setImageUrl, resetImage } from "@/app/desk/media/actions";
import { prepareImageForUpload } from "@/lib/media/clientImage";
import type { Slot } from "@/lib/media/registry";

/**
 * A single media slot with clear upload feedback. Choosing a file starts the
 * upload immediately and shows a working spinner, then a ✓ result (or the error
 * message) — so an admin adding a hero/gallery image always sees that it's
 * uploading and whether it landed, instead of a form that looks frozen.
 */
export function MediaSlotCard({
  slot,
  override,
  original,
  version,
}: {
  slot: Slot;
  override?: string;
  original?: string;
  version: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"upload" | "url" | "reset" | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  // Bump on success so the preview re-fetches the new image (cache-bust).
  const [ver, setVer] = useState(version);
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlValue, setUrlValue] = useState("");
  const [imgError, setImgError] = useState(false);
  // Reposition step: after picking a file (or editing), the admin frames it by
  // DRAGGING the photo inside the frame (sliders were fiddly on phones).
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [focalX, setFocalX] = useState(0.5);
  const [focalY, setFocalY] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  // Whether the loaded photo actually has room to pan in the frame. False for an
  // image already cropped to the slot's shape (no stored original) — then there's
  // nothing to reposition and the admin should replace it instead. `measured`
  // gates the UI until the image has loaded, so no hint flashes prematurely.
  const [canPan, setCanPan] = useState(false);
  const [measured, setMeasured] = useState(false);
  // An edit re-crops the STORED original — no new original is uploaded, and the
  // existing one is preserved server-side.
  const [isReframe, setIsReframe] = useState(false);
  const [reframeLoading, setReframeLoading] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const natRef = useRef<{ w: number; h: number } | null>(null);

  const previewSrc = `/api/img?seed=${encodeURIComponent(slot.key)}&w=${slot.w}&h=${slot.h}&v=${ver}`;
  const hasCustom = Boolean(override);
  const aspect = slot.w / slot.h;

  // Revoke the object URL when it changes or the card unmounts.
  useEffect(() => () => { if (cropUrl) URL.revokeObjectURL(cropUrl); }, [cropUrl]);

  // Measure whether the loaded photo overflows the frame (so it can be panned),
  // and update focal from a drag using true pixel movement over the overflow.
  function overflow() {
    const el = frameRef.current;
    const nat = natRef.current;
    if (!el || !nat) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const scale = Math.max(rect.width / nat.w, rect.height / nat.h); // object-cover
    return { x: nat.w * scale - rect.width, y: nat.h * scale - rect.height };
  }

  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const t = e.currentTarget;
    natRef.current = { w: t.naturalWidth, h: t.naturalHeight };
    const o = overflow();
    setCanPan(o.x > 1 || o.y > 1);
    setMeasured(true);
  }

  function onDragStart(e: React.PointerEvent) {
    if (pending) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, fx: focalX, fy: focalY };
    setDragging(true);
  }

  function onDragMove(e: React.PointerEvent) {
    const st = dragRef.current;
    if (!st) return;
    const o = overflow();
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    // Dragging the photo right reveals its left edge → focal moves left.
    if (o.x > 1) setFocalX(clamp01(st.fx - dx / o.x));
    if (o.y > 1) setFocalY(clamp01(st.fy - dy / o.y));
  }

  function onDragEnd() {
    dragRef.current = null;
    setDragging(false);
  }

  // Choosing a file opens the reposition step rather than uploading immediately.
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    setFocalX(0.5);
    setFocalY(0.5);
    setCanPan(false);
    setMeasured(false);
    setIsReframe(false);
    setCropUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    setCropFile(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  // Edit: pull the current photo (its stored original if we have one) back
  // through our proxy and open the drag-to-reposition editor on it, so framing
  // can be changed anytime without re-uploading.
  async function onEdit() {
    setStatus(null);
    setReframeLoading(true);
    try {
      const res = await fetch(`/api/img/original?seed=${encodeURIComponent(slot.key)}&v=${ver}`);
      if (!res.ok) throw new Error("Couldn't load this photo to edit.");
      const blob = await res.blob();
      const file = new File([blob], "original.jpg", { type: blob.type || "image/jpeg" });
      setFocalX(0.5);
      setFocalY(0.5);
      setCanPan(false);
      setMeasured(false);
      setIsReframe(true);
      setCropUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
      setCropFile(file);
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : "Couldn't load this photo." });
    } finally {
      setReframeLoading(false);
    }
  }

  function cancelCrop() {
    setIsReframe(false);
    setCropFile(null);
    setCanPan(false);
    setMeasured(false);
    setCropUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
  }

  // Crop to the slot's aspect at the chosen focal point, then upload.
  function confirmCrop() {
    if (!cropFile) return;
    const file = cropFile;
    const reframe = isReframe;
    setStatus(null);
    setBusy("upload");
    setUploadingName(reframe ? slot.label : file.name);
    startTransition(async () => {
      try {
        const maxDimension = Math.min(2048, Math.max(768, Math.round(Math.max(slot.w, slot.h) * 2)));
        const ready = await prepareImageForUpload(file, { maxDimension, aspect, focalX, focalY });
        const fd = new FormData();
        fd.set("seed", slot.key);
        fd.set("file", ready);
        // On a fresh upload, also keep the uncropped source so it can be
        // re-framed later. On a re-frame the source is already stored — don't
        // re-send it (the server preserves the existing original).
        if (!reframe) {
          const source = await prepareImageForUpload(file, { maxDimension: 2560 });
          fd.set("original", source);
        }
        const res = await uploadImage(fd);
        if (res.ok) {
          setVer(Date.now());
          setStatus({ ok: true, text: reframe ? "Re-framed." : `Uploaded ${file.name}` });
          cancelCrop();
          router.refresh();
        } else {
          setStatus({ ok: false, text: res.error });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setStatus({ ok: false, text: `Upload error: ${msg} — if the photo is very large try a smaller one or paste a URL.` });
      } finally {
        setBusy(null);
        setUploadingName(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  function onSetUrl() {
    const url = urlValue.trim();
    if (!url) return;
    setStatus(null);
    setBusy("url");
    const fd = new FormData();
    fd.set("seed", slot.key);
    fd.set("url", url);
    startTransition(async () => {
      try {
        const res = await setImageUrl(fd);
        if (res.ok) {
          setVer(Date.now());
          setStatus({ ok: true, text: "Image set from URL." });
          setUrlValue("");
          router.refresh();
        } else {
          setStatus({ ok: false, text: res.error });
        }
      } catch {
        setStatus({ ok: false, text: "Couldn't set that URL — please try again." });
      } finally {
        setBusy(null);
      }
    });
  }

  function onReset() {
    setStatus(null);
    setBusy("reset");
    const fd = new FormData();
    fd.set("seed", slot.key);
    startTransition(async () => {
      try {
        const res = await resetImage(fd);
        if (res.ok) {
          setVer(Date.now());
          setStatus({ ok: true, text: "Reset to placeholder." });
          router.refresh();
        } else {
          setStatus({ ok: false, text: res.error });
        }
      } catch {
        setStatus({ ok: false, text: "Couldn't reset — please try again." });
      } finally {
        setBusy(null);
      }
    });
  }

  const uploading = busy === "upload";

  return (
    <div className="overflow-hidden rounded-xl2 border border-ink/10 bg-sand-50">
      {/* Single hidden file input, shared by the Upload button and the editor's
          Replace button (so both work whether or not the editor is open). */}
      <input
        ref={fileRef}
        type="file"
        name="file"
        accept="image/*"
        className="hidden"
        disabled={pending}
        onChange={onPickFile}
      />
      <div className="relative aspect-[16/10] bg-sand-200">
        {/* Plain <img> so the override redirect and cache-bust are honoured. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt={slot.label}
          className="h-full w-full object-cover"
          onLoad={() => setImgError(false)}
          onError={() => setImgError(true)}
        />
        {hasCustom && !uploading && (
          <span className="absolute left-2 top-2 rounded-full bg-palm-500 px-2.5 py-1 text-[0.6rem] font-medium uppercase tracking-eyebrow text-sand-50">
            Custom
          </span>
        )}
        {hasCustom && !uploading && !cropFile && (
          <button
            type="button"
            onClick={onEdit}
            disabled={pending || reframeLoading}
            className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-sand-50/95 px-3 py-1.5 text-[0.6rem] font-medium uppercase tracking-eyebrow text-ink shadow-soft backdrop-blur transition-colors hover:bg-sand-50 disabled:opacity-70"
          >
            {reframeLoading ? <Spinner /> : <ReframeIcon />}
            {reframeLoading ? "Loading…" : "Edit"}
          </button>
        )}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/60 text-sand-50">
            <Spinner big />
            <span className="max-w-[85%] truncate px-2 text-[0.66rem] uppercase tracking-eyebrow">
              Uploading{uploadingName ? ` ${uploadingName}` : ""}…
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="font-medium text-ink">{slot.label}</p>
          <p className="font-mono text-[0.66rem] text-ink-muted">{slot.key}</p>
        </div>

        {cropFile && cropUrl ? (
          /* Editor — DRAG the photo inside the frame to choose what shows. */
          <div className="space-y-2">
            <p className="text-[0.62rem] uppercase tracking-eyebrow text-ink-muted">
              {canPan ? "Drag the photo to reposition it" : "Photo preview"}
            </p>
            <div
              ref={frameRef}
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
              className={`relative w-full select-none overflow-hidden rounded-xl bg-ink/10 ${canPan ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
              style={{ aspectRatio: `${slot.w} / ${slot.h}`, touchAction: "none" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cropUrl}
                alt="Photo preview"
                draggable={false}
                onLoad={onImgLoad}
                className="h-full w-full object-cover"
                style={{ objectPosition: `${focalX * 100}% ${focalY * 100}%` }}
              />
              {canPan && !dragging && (
                <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/65 px-2.5 py-1 text-[0.56rem] uppercase tracking-eyebrow text-sand-50">
                  ✥ Drag to reposition
                </span>
              )}
            </div>
            {measured && !canPan && (
              <p className="text-[0.62rem] leading-relaxed text-ink-muted">
                This photo already fits the frame, so there&apos;s nothing to reposition. To change the crop, tap Replace and pick it again.
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={confirmCrop}
                disabled={pending}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-clay-500 px-3 py-2 text-[0.62rem] uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600 disabled:opacity-50"
              >
                {uploading ? <><Spinner /> Saving…</> : "Save framing"}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={pending}
                className="rounded-full border border-ink/15 px-3 py-2 text-[0.62rem] uppercase tracking-eyebrow text-ink-soft hover:border-ink/40 disabled:opacity-50"
              >
                Replace
              </button>
              <button
                onClick={cancelCrop}
                disabled={pending}
                className="rounded-full border border-ink/15 px-3 py-2 text-[0.62rem] uppercase tracking-eyebrow text-ink-soft hover:border-ink/40 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Upload — choosing a file opens the drag editor. */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-clay-500 px-3 py-2 text-[0.62rem] uppercase tracking-eyebrow text-sand-50 transition-colors hover:bg-clay-600 disabled:opacity-50"
            >
              <UploadIcon />
              {hasCustom ? "Replace photo" : "Upload a photo"}
            </button>

            {/* Or set from a URL. */}
            <div className="flex items-center gap-2">
              <input
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSetUrl(); } }}
                placeholder="or paste image URL"
                disabled={pending}
                className="w-full rounded-lg border border-ink/15 bg-sand-50 px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 disabled:opacity-60"
              />
              <button
                onClick={onSetUrl}
                disabled={pending || !urlValue.trim()}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-[0.62rem] uppercase tracking-eyebrow text-ink-soft hover:border-ink/40 disabled:opacity-50"
              >
                {busy === "url" && <Spinner />}
                {busy === "url" ? "Setting…" : "Set"}
              </button>
            </div>
          </>
        )}

        {status && (
          <p aria-live="polite" className={`text-[0.7rem] leading-relaxed ${status.ok ? "text-palm-600" : "text-clay-600"}`}>
            {status.ok ? "✓ " : ""}{status.text}
          </p>
        )}

        {/* Diagnostic: what URL is actually stored for this slot, and whether it
            loaded. If this shows the NEW file after an upload but the image is
            blank, the URL is unreachable (bucket not public). If it still shows
            the OLD file, the override didn't update. */}
        {override && (
          <p className="break-all text-[0.6rem] leading-relaxed text-ink-muted">
            Saved:{" "}
            <a href={override} target="_blank" rel="noreferrer" className="underline hover:text-ink">
              {override.length > 64 ? `…${override.slice(-60)}` : override}
            </a>
            {imgError && <span className="mt-0.5 block text-clay-600">⚠ This URL didn&apos;t load — the bucket may not be public, or the file is missing.</span>}
          </p>
        )}

        {!cropFile && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {hasCustom && (
              <button
                onClick={onEdit}
                disabled={pending || reframeLoading}
                className="inline-flex items-center gap-1.5 text-[0.66rem] uppercase tracking-eyebrow text-ocean-700 underline-offset-4 hover:underline disabled:opacity-50"
              >
                {reframeLoading ? <Spinner /> : <ReframeIcon />}
                {reframeLoading ? "Loading…" : "Edit / reposition"}
              </button>
            )}
            {hasCustom && (
              <button
                onClick={onReset}
                disabled={pending}
                className="inline-flex items-center gap-1.5 text-[0.66rem] uppercase tracking-eyebrow text-ink-muted underline-offset-4 hover:text-clay-600 hover:underline disabled:opacity-50"
              >
                {busy === "reset" && <Spinner />}
                {busy === "reset" ? "Resetting…" : "Reset to placeholder"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner({ big = false }: { big?: boolean }) {
  // Three gently pulsing dots instead of a rotating arc — a calm "working"
  // signal that doesn't read as frantic.
  const d = big ? "h-2.5 w-2.5" : "h-1.5 w-1.5";
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      <span className={`${d} rounded-full bg-current animate-pulse [animation-duration:1.1s]`} />
      <span className={`${d} rounded-full bg-current animate-pulse [animation-duration:1.1s] [animation-delay:0.18s]`} />
      <span className={`${d} rounded-full bg-current animate-pulse [animation-duration:1.1s] [animation-delay:0.36s]`} />
    </span>
  );
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function ReframeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9V5a2 2 0 0 1 2-2h4M21 9V5a2 2 0 0 0-2-2h-4M3 15v4a2 2 0 0 0 2 2h4M21 15v4a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 16V4M7 9l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" strokeLinecap="round" />
    </svg>
  );
}
