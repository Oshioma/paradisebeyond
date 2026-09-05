"use client";

import { useState } from "react";
import type { ItineraryDay } from "@/lib/types";
import { AdminDeletablePhoto } from "@/components/experience/AdminDeletablePhoto";

/**
 * Day-by-day itinerary. Every day shows its activities directly — no per-day
 * accordion to tap open (guests were only seeing the first day's items). Long
 * (14-day) itineraries condense to the first few days behind a "show all"
 * toggle so the section doesn't run on forever.
 */
interface DayPhoto {
  id: string;
  url: string;
  uploaderName: string | null;
}

export function Itinerary({
  days,
  photosByDay = {},
}: {
  days: ItineraryDay[];
  /** Published guest photos allocated to each day (day number → photos). */
  photosByDay?: Record<number, DayPhoto[]>;
}) {
  const isLong = days.length > 7;
  const [expanded, setExpanded] = useState(!isLong);
  const visible = expanded ? days : days.slice(0, 4);

  return (
    <div>
      <ol className="relative border-l border-ink/15">
        {visible.map((d) => (
          <li key={d.day} className="relative pl-8 pb-8 last:pb-0">
            <span className="absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-clay-500 bg-sand-50" />
            <p className="eyebrow text-clay-600">Day {d.day}</p>
            <h4 className="mt-1 font-display text-xl font-semibold text-ink">{d.title}</h4>
            {d.summary && <p className="mt-1 max-w-prose text-sm text-ink-muted">{d.summary}</p>}
            {d.items.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {d.items.map((item, i) => (
                  <li key={i} className="rounded-full bg-sand-100 px-3 py-1.5 text-xs text-ink-soft">
                    {item.title}
                  </li>
                ))}
              </ul>
            )}
            {(photosByDay[d.day]?.length ?? 0) > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {photosByDay[d.day].map((p) => (
                  <AdminDeletablePhoto key={p.id} photoId={p.id} className="relative h-20 w-20 sm:h-24 sm:w-24">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt={p.uploaderName ? `Guest photo by ${p.uploaderName}` : "Guest photo"}
                      title={p.uploaderName ? `By ${p.uploaderName}` : undefined}
                      loading="lazy"
                      className="h-full w-full rounded-lg object-cover"
                    />
                  </AdminDeletablePhoto>
                ))}
              </div>
            )}
          </li>
        ))}
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
