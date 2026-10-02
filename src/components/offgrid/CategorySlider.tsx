"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SliderCategory {
  slug: string;
  name: string;
  image: string;
  count: number;
}

/** Most cards shown across a desktop row before it starts to scroll. */
const FILL_MAX = 6;

/**
 * One row of category cards. On larger screens the cards fill the full width
 * (wider when there are few, slimmer as more appear); past six they keep a
 * sixth of the row each and scroll, with arrows beside the header. On phones
 * it's always a swipeable row.
 */
export function CategorySlider({ items, header }: { items: SliderCategory[]; header?: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = () => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  };

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // On larger screens the cards share the full width while there are few
  // enough of them; past that they keep a minimum width and the row scrolls.
  const fillSm = items.length <= 3;
  const fillLg = items.length <= FILL_MAX;

  const scrollBy = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 flex-1">{header}</div>
        {/* Arrows: only when there's more to see (hidden on touch-sized screens). */}
        {!(edges.start && edges.end) && (
          <div className="hidden gap-2 sm:flex">
            <Arrow dir="prev" disabled={edges.start} onClick={() => scrollBy(-1)} />
            <Arrow dir="next" disabled={edges.end} onClick={() => scrollBy(1)} />
          </div>
        )}
      </div>

      <div
        ref={track}
        onScroll={update}
        className="-mx-5 mt-8 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto scroll-smooth px-5 pb-3 pt-1 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:gap-4 sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((c) => (
          <Link
            key={c.slug}
            href={`/categories/${c.slug}`}
            className={cn(
              "group relative flex aspect-[4/5] w-[46vw] max-w-[220px] flex-none snap-start flex-col justify-end overflow-hidden rounded-xl2 shadow-[0_10px_30px_-20px_rgba(20,35,25,0.6)] transition-transform duration-500 ease-out-soft hover:-translate-y-1",
              // Tablet: share the row when up to three, otherwise fixed cards that scroll.
              fillSm ? "sm:h-[300px] sm:w-auto sm:min-w-0 sm:max-w-none sm:flex-1 sm:aspect-auto" : "sm:w-[200px]",
              // Desktop: share the full width when up to six, otherwise a sixth each and scroll.
              fillLg
                ? "lg:h-[340px] lg:w-auto lg:min-w-0 lg:max-w-none lg:flex-1 lg:aspect-auto"
                : "lg:h-[340px] lg:w-[calc((100%-5rem)/6)] lg:max-w-none lg:aspect-auto",
            )}
          >
            <Image
              src={c.image}
              alt=""
              fill
              sizes={`(max-width: 640px) 46vw, (max-width: 1024px) ${fillSm ? Math.ceil(100 / items.length) : 30}vw, ${Math.ceil(100 / Math.min(items.length, FILL_MAX))}vw`}
              className="object-cover transition-transform duration-[1.4s] ease-out-soft group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-900/85 via-forest-900/15 to-transparent" />
            <div className="relative p-4">
              <h3 className="font-display text-lg font-semibold leading-tight text-sand-50 sm:text-xl">{c.name}</h3>
              <p className="mt-1.5 inline-flex items-center gap-1 text-[0.66rem] font-semibold uppercase tracking-eyebrow text-sand-100/90">
                {c.count} {c.count === 1 ? "stay" : "stays"}
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Arrow({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Previous kinds of place" : "More kinds of place"}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full border border-forest-700/25 text-forest-800 transition-colors hover:bg-forest-700 hover:text-sand-50",
        disabled && "pointer-events-none opacity-30",
      )}
    >
      <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d={dir === "prev" ? "M12 4l-6 6 6 6" : "M8 4l6 6-6 6"} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
