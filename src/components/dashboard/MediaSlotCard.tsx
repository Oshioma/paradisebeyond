"use client";

import { useRef, useState, useTransition } from "react";
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
  version,
}: {
  slot: Slot;
  override?: string;
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

  const previewSrc = `/api/img?seed=${encodeURIComponent(slot.key)}&w=${slot.w}&h=${slot.h}&v=${ver}`;
  const hasCustom = Boolean(override);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    setBusy("upload");
    setUploadingName(file.name);
    startTransition(async () => {
      try {
        // Downscale/compress big phone photos in the browser first so they
        // don't hit the server size cap and upload fast on mobile data.
        const ready = await prepareImageForUpload(file);
        const fd = new FormData();
        fd.set("seed", slot.key);
        fd.set("file", ready);
        await uploadImage(fd);
        setVer(Date.now());
        setStatus({ ok: true, text: `Uploaded ${file.name}` });
        router.refresh();
      } catch (err) {
        setStatus({ ok: false, text: err instanceof Error ? err.message : "Upload failed — try again or paste an image URL." });
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
        await setImageUrl(fd);
        setVer(Date.now());
        setStatus({ ok: true, text: "Image set from URL." });
        setUrlValue("");
        router.refresh();
      } catch (err) {
        setStatus({ ok: false, text: err instanceof Error ? err.message : "Couldn't set that URL." });
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
        await resetImage(fd);
        setVer(Date.now());
        setStatus({ ok: true, text: "Reset to placeholder." });
        router.refresh();
      } catch (err) {
        setStatus({ ok: false, text: err instanceof Error ? err.message : "Couldn't reset." });
      } finally {
        setBusy(null);
      }
    });
  }

  const uploading = busy === "upload";

  return (
    <div className="overflow-hidden rounded-xl2 border border-ink/10 bg-sand-50">
      <div className="relative aspect-[16/10] bg-sand-200">
        {/* Plain <img> so the override redirect and cache-bust are honoured. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewSrc} alt={slot.label} className="h-full w-full object-cover" />
        {hasCustom && !uploading && (
          <span className="absolute left-2 top-2 rounded-full bg-palm-500 px-2.5 py-1 text-[0.6rem] font-medium uppercase tracking-eyebrow text-sand-50">
            Custom
          </span>
        )}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/60 text-sand-50">
            <Spinner />
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

        {/* Upload — choosing a file starts the upload immediately. */}
        <label
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2 text-[0.62rem] uppercase tracking-eyebrow text-sand-50 transition-colors ${
            uploading ? "bg-ink" : "bg-clay-500 hover:bg-clay-600"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept="image/*"
            className="hidden"
            disabled={pending}
            onChange={onPickFile}
          />
          {uploading ? <Spinner /> : <UploadIcon />}
          {uploading ? "Uploading…" : hasCustom ? "Replace photo" : "Upload a photo"}
        </label>

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

        {status && (
          <p aria-live="polite" className={`text-[0.7rem] leading-relaxed ${status.ok ? "text-palm-600" : "text-clay-600"}`}>
            {status.ok ? "✓ " : ""}{status.text}
          </p>
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

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 16V4M7 9l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" strokeLinecap="round" />
    </svg>
  );
}
