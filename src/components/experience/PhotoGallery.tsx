"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Accommodation photos: a swipeable carousel that opens full screen.
 *
 * One component serves both shapes on the experience page — the per-property
 * strip inside each hotel card (`carousel`) and the "Where you'll stay" gallery
 * (`grid`) — so both share the same viewer and can't drift apart.
 *
 * Each photo carries a small `thumb` and a large `full` source. Seeded imagery
 * comes from /api/img, which sizes on request, so full screen asks for a bigger
 * crop rather than stretching a thumbnail; host-uploaded URLs use the same file
 * for both.
 */

export interface GalleryPhoto {
  /** Small source for the strip or grid. */
  thumb: string;
  /** Large source for the full-screen view. */
  full: string;
  alt: string;
}

export function PhotoGallery({
  photos,
  layout = "carousel",
  label = "Photos",
  className,
}: {
  photos: GalleryPhoto[];
  layout?: "carousel" | "grid";
  /** Names the gallery for screen readers, e.g. "Sunset Hotel photos". */
  label?: string;
  className?: string;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const shots = photos.filter((p) => p.thumb && p.full);
  if (!shots.length) return null;

  return (
    <>
      {layout === "grid" ? (
        <Grid photos={shots} onOpen={setIndex} className={className} />
      ) : (
        <Carousel photos={shots} onOpen={setIndex} label={label} className={className} />
      )}
      <Lightbox photos={shots} index={index} setIndex={setIndex} label={label} />
    </>
  );
}

/* ---------------------------------------------------------------- carousel */

function Carousel({
  photos,
  onOpen,
  label,
  className,
}: {
  photos: GalleryPhoto[];
  onOpen: (i: number) => void;
  label: string;
  className?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  // Arrows appear only when there is actually somewhere to scroll, and a
  // ResizeObserver re-checks it when the column width changes.
  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(max <= 1 || el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  function scrollByPage(dir: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  }

  const scrollable = !(atStart && atEnd);

  return (
    <div className={className ?? "relative mt-3"}>
      <ul
        ref={trackRef}
        onScroll={measure}
        aria-label={label}
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((p, i) => (
          <li key={`${p.thumb}-${i}`} className="w-[46%] flex-none snap-start sm:w-[31%] lg:w-[23%]">
            <button
              type="button"
              onClick={() => onOpen(i)}
              aria-label={`${p.alt} — view full screen`}
              className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-sand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
            >
              {/* Host-uploaded URLs, so plain img rather than next/image domain config. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumb}
                alt={p.alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.04]"
              />
              <span className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors group-hover:bg-ink/10" />
            </button>
          </li>
        ))}
      </ul>

      {scrollable && (
        <>
          <Arrow side="left" disabled={atStart} onClick={() => scrollByPage(-1)} />
          <Arrow side="right" disabled={atEnd} onClick={() => scrollByPage(1)} />
        </>
      )}
    </div>
  );
}

function Arrow({ side, disabled, onClick }: { side: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous photos" : "More photos"}
      className={[
        "absolute top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-ink/10 bg-sand-50/95 p-2 text-ink shadow-soft transition-opacity sm:flex",
        side === "left" ? "-left-3" : "-right-3",
        disabled ? "pointer-events-none opacity-0" : "opacity-100 hover:bg-sand-50",
      ].join(" ")}
    >
      <Chevron dir={side} />
    </button>
  );
}

/* ------------------------------------------------------------------- grid */

function Grid({
  photos,
  onOpen,
  className,
}: {
  photos: GalleryPhoto[];
  onOpen: (i: number) => void;
  className?: string;
}) {
  return (
    <div className={className ?? "mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3"}>
      {photos.map((p, i) => (
        <button
          key={`${p.thumb}-${i}`}
          type="button"
          onClick={() => onOpen(i)}
          aria-label={`${p.alt} — view full screen`}
          className="group relative aspect-square overflow-hidden rounded-xl bg-sand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.thumb}
            alt={p.alt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.04]"
          />
          <span className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors group-hover:bg-ink/10" />
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- lightbox */

function Lightbox({
  photos,
  index,
  setIndex,
  label,
}: {
  photos: GalleryPhoto[];
  index: number | null;
  setIndex: (i: number | null) => void;
  label: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = index !== null;
  const current = open ? photos[index] : null;

  // A native <dialog> gives the top layer, focus trap, backdrop and Escape
  // handling for free — worth more than a hand-rolled overlay.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Keep the page behind from scrolling while the viewer is up.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const step = useCallback(
    (dir: 1 | -1) => setIndex(index === null ? null : (index + dir + photos.length) % photos.length),
    [index, photos.length, setIndex],
  );

  // Fetch the neighbours so arrowing through doesn't flash empty.
  useEffect(() => {
    if (index === null) return;
    for (const i of [index - 1, index + 1]) {
      const p = photos[(i + photos.length) % photos.length];
      if (p) new window.Image().src = p.full;
    }
  }, [index, photos]);

  const touchX = useRef<number | null>(null);
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
  }

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={() => setIndex(null)}
      onCancel={() => setIndex(null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      }}
      className="m-0 h-full max-h-full w-full max-w-full bg-transparent p-0 backdrop:bg-ink/95 open:flex open:items-center open:justify-center"
    >
      {current && (
        <div className="relative flex h-full w-full items-center justify-center">
          {/*
            The dim lives here rather than only on ::backdrop: the backdrop does
            not reliably paint above a sticky header, whereas the dialog's own
            content is in the top layer everywhere. Doubles as the click-to-close
            surround, the way every photo viewer behaves.
          */}
          <button
            type="button"
            aria-label="Close photo viewer"
            onClick={() => setIndex(null)}
            className="absolute inset-0 cursor-zoom-out bg-ink/95"
            tabIndex={-1}
          />

          <div
            className="relative z-10 max-h-[86vh] max-w-[92vw]"
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={onTouchEnd}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.full}
              alt={current.alt}
              className="max-h-[86vh] max-w-[92vw] rounded-lg object-contain shadow-lift"
            />
          </div>

          <button
            type="button"
            onClick={() => setIndex(null)}
            aria-label="Close photo viewer"
            className="absolute right-4 top-4 z-20 rounded-full border border-sand-50/25 bg-ink/60 p-2.5 text-sand-50 hover:bg-ink/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-sand-50"
          >
            <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>

          {photos.length > 1 && (
            <>
              <LightboxArrow side="left" onClick={() => step(-1)} />
              <LightboxArrow side="right" onClick={() => step(1)} />
              <p
                aria-live="polite"
                className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-ink/60 px-4 py-1.5 text-xs tracking-eyebrow text-sand-50"
              >
                {(index ?? 0) + 1} / {photos.length}
              </p>
            </>
          )}
        </div>
      )}
    </dialog>
  );
}

function LightboxArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={[
        "absolute top-1/2 z-20 -translate-y-1/2 rounded-full border border-sand-50/25 bg-ink/60 p-3 text-sand-50 hover:bg-ink/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-sand-50",
        side === "left" ? "left-3 sm:left-6" : "right-3 sm:right-6",
      ].join(" ")}
    >
      <Chevron dir={side} />
    </button>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={dir === "left" ? "M12.5 4L6.5 10l6 6" : "M7.5 4l6 6-6 6"} />
    </svg>
  );
}
