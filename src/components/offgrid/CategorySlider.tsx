"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SliderCategory {
  slug: string;
  name: string;
  tagline: string;
  image: string;
  count: number;
}

/**
 * One row of category cards that scrolls sideways — swipe on touch, arrow
 * buttons on larger screens. Keeps the section short however many kinds of
 * place there are.
 */
export function CategorySlider({ items }: { items: SliderCategory[] }) {
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

  const scrollBy = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={track}
        onScroll={update}
        className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto scroll-smooth px-5 pb-2 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:gap-4 sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((c) => (
          <Link
            key={c.slug}
            href={`/categories/${c.slug}`}
            className="group relative flex aspect-[4/5] w-[62vw] max-w-[260px] flex-none snap-start flex-col justify-end overflow-hidden rounded-xl2 sm:w-[240px]"
          >
            <Image
              src={c.image}
              alt={c.name}
              fill
              sizes="(max-width: 640px) 62vw, 260px"
              className="object-cover transition-transform duration-[1.4s] ease-out-soft group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-900/85 via-forest-900/15 to-transparent" />
            <div className="relative p-4 sm:p-5">
              <h3 className="font-display text-xl font-semibold text-sand-50">{c.name}</h3>
              <p className="mt-1 text-xs leading-relaxed text-sand-100/85">{c.tagline}</p>
              <p className="mt-2 text-[0.66rem] font-semibold uppercase tracking-eyebrow text-sand-50">
                {c.count} {c.count === 1 ? "stay" : "stays"} →
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Arrows: only when there's more to see (hidden on touch-sized screens). */}
      {!(edges.start && edges.end) && (
        <div className="mt-5 hidden justify-end gap-2 sm:flex">
          <Arrow dir="prev" disabled={edges.start} onClick={() => scrollBy(-1)} />
          <Arrow dir="next" disabled={edges.end} onClick={() => scrollBy(1)} />
        </div>
      )}
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
