"use client";

import { useState } from "react";
import type { ItineraryDay } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Itinerary({ days }: { days: ItineraryDay[] }) {
  const isLong = days.length > 7;
  const [expanded, setExpanded] = useState(!isLong);
  const [openDay, setOpenDay] = useState<number | null>(days[0]?.day ?? null);

  // For long (14-day) itineraries, condense to the first 4 days until expanded.
  const visible = expanded ? days : days.slice(0, 4);

  return (
    <div>
      <ol className="relative border-l border-ink/15">
        {visible.map((d) => {
          const open = openDay === d.day;
          return (
            <li key={d.day} className="relative pl-8 pb-8 last:pb-0">
              <span className="absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-clay-500 bg-sand-50" />
              <button
                onClick={() => setOpenDay(open ? null : d.day)}
                className="group flex w-full items-baseline justify-between gap-4 text-left"
              >
                <div>
                  <p className="eyebrow text-clay-600">Day {d.day}</p>
                  <h4 className="mt-1 font-display text-xl font-semibold text-ink group-hover:text-ocean-700">
                    {d.title}
                  </h4>
                </div>
                <svg
                  viewBox="0 0 12 12"
                  className={cn("mt-1 h-3 w-3 flex-none text-ink-muted transition-transform", open && "rotate-180")}
                  aria-hidden
                >
                  <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </button>

              <div
                className={cn(
                  "grid transition-all duration-500 ease-out-soft",
                  open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  {d.summary && <p className="mb-3 max-w-prose text-sm text-ink-muted">{d.summary}</p>}
                  <ul className="flex flex-wrap gap-2">
                    {d.items.map((item, i) => (
                      <li
                        key={i}
                        className="rounded-full bg-sand-100 px-3 py-1.5 text-xs text-ink-soft"
                      >
                        {item.title}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-2 rounded-full border border-ink/20 px-5 py-2.5 text-xs uppercase tracking-eyebrow text-ink transition-colors hover:border-ink hover:bg-ink hover:text-sand-50"
        >
          {expanded ? "Show less" : `Show all ${days.length} days`}
        </button>
      )}
    </div>
  );
}
