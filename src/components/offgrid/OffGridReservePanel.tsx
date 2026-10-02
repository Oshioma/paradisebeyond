"use client";

import Link from "next/link";
import { useState } from "react";
import type { Departure } from "@/lib/types";
import type { OffGridDetails } from "@/lib/offgrid/types";
import { formatDateRange, cn } from "@/lib/utils";
import { contributionLine, mealsLine, minStayLine, priceLine } from "@/lib/offgrid/summary";

/**
 * Booking panel for an off-grid stay: the price and the exchange at a glance,
 * then the host's availability windows. Picking one continues to the booking
 * page, where the traveller chooses their arrival date and number of nights.
 */
export function OffGridReservePanel({
  offGrid,
  departures,
  currency,
  sample = false,
}: {
  offGrid: OffGridDetails;
  departures: Departure[];
  currency: string;
  /** Sample listings show their dates but can't be booked. */
  sample?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const windows = departures.filter((d) => d.status !== "closed" && d.endDate > today);
  const firstOpen = windows.find((d) => d.status === "open" && d.spacesRemaining > 0) ?? windows[0];
  const [selectedId, setSelectedId] = useState(firstOpen?.id);
  const selected = windows.find((d) => d.id === selectedId) ?? firstOpen;
  const free = !offGrid.pricing.amountMinor;

  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-6 shadow-soft">
      <p className="font-display text-3xl font-semibold text-ink">{priceLine(offGrid, currency)}</p>
      <p className="mt-1 text-sm text-ink-muted">
        {free ? "No payment — you contribute your time instead." : "Price set by your host. No booking fees added."}
      </p>

      <ul className="mt-5 space-y-1.5 border-t border-ink/10 pt-5 text-sm text-ink-soft">
        <li>{contributionLine(offGrid)}</li>
        <li>{minStayLine(offGrid)}</li>
        <li>{mealsLine(offGrid)} · accommodation included</li>
      </ul>

      {windows.length === 0 ? (
        <p className="mt-5 rounded-xl bg-sand-100 p-4 text-sm text-ink-muted">
          This host hasn&apos;t opened any dates yet. Save it and check back soon.
        </p>
      ) : (
        <>
          <p className="mt-5 eyebrow text-forest-700">Available dates</p>
          <div className="mt-3 space-y-2">
            {windows.map((d) => {
              const active = d.id === selected?.id;
              const full = d.status === "sold_out" || d.spacesRemaining <= 0;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  disabled={full}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                    active ? "border-forest-700 bg-forest-700 text-sand-50" : "border-ink/15 hover:border-ink/40",
                    full && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className="text-sm font-medium">{formatDateRange(d.startDate, d.endDate)}</span>
                  <span className={cn("text-xs", active ? "text-sand-100/80" : "text-ink-muted")}>
                    {full ? "Full" : `${d.spacesRemaining} ${d.spacesRemaining === 1 ? "place" : "places"}`}
                  </span>
                </button>
              );
            })}
          </div>
          {sample ? (
            <p className="mt-6 rounded-full bg-ink/10 px-6 py-4 text-center text-sm uppercase tracking-[0.16em] text-ink-muted">
              Sample listing · not bookable
            </p>
          ) : selected && selected.status !== "sold_out" && selected.spacesRemaining > 0 && (
            <Link
              href={`/book/${selected.id}`}
              className="mt-6 flex w-full items-center justify-center rounded-full bg-forest-700 px-6 py-4 text-sm uppercase tracking-[0.16em] text-sand-50 shadow-soft transition-colors hover:bg-forest-800"
            >
              {free ? "Request to stay" : "Choose your dates"}
            </Link>
          )}
        </>
      )}

      <p className="mt-3 text-center text-xs text-ink-muted">
        You arrange your own travel{offGrid.practical.transfersAvailable ? " · host can help with transfers" : ""}
      </p>
    </div>
  );
}
