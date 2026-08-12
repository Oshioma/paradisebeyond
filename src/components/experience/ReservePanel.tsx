"use client";

import Link from "next/link";
import { useState } from "react";
import type { Departure } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import { formatDateRange } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function ReservePanel({
  departures,
  currency,
}: {
  departures: Departure[];
  currency: string;
}) {
  const bookable = departures.filter((d) => d.status !== "closed");
  const firstOpen = bookable.find((d) => d.status === "open") ?? bookable[0];
  const [selectedId, setSelectedId] = useState(firstOpen?.id);
  const selected = bookable.find((d) => d.id === selectedId) ?? firstOpen;

  if (!selected) {
    return (
      <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-6">
        <p className="text-ink-muted">Dates for the next season are being confirmed.</p>
      </div>
    );
  }

  const soldOut = selected.status === "sold_out";
  const scarce = selected.spacesRemaining > 0 && selected.spacesRemaining <= 5;

  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-6 shadow-soft">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">From</p>
          <p className="font-display text-3xl font-semibold text-ink">
            {formatMoney(selected.priceFromMinor, currency, { showDecimals: false })}
            <span className="ml-1.5 text-sm font-normal text-ink-muted">per person</span>
          </p>
        </div>
      </div>

      <p className="mt-5 eyebrow text-ocean-700">Choose your departure</p>
      <div className="mt-3 space-y-2">
        {bookable.map((d) => {
          const active = d.id === selected.id;
          const out = d.status === "sold_out";
          return (
            <button
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              disabled={out}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                active ? "border-ink bg-ink text-sand-50" : "border-ink/15 hover:border-ink/40",
                out && "cursor-not-allowed opacity-50",
              )}
            >
              <span className="text-sm font-medium">{formatDateRange(d.startDate, d.endDate)}</span>
              <span className={cn("text-xs", active ? "text-sand-100/80" : "text-ink-muted")}>
                {out
                  ? "Sold out"
                  : d.status === "waitlist"
                    ? "Waitlist"
                    : d.spacesRemaining <= 5
                      ? `${d.spacesRemaining} left`
                      : "Available"}
              </span>
            </button>
          );
        })}
      </div>

      <dl className="mt-5 space-y-2 border-t border-ink/10 pt-5 text-sm">
        <Row label="Deposit to reserve" value={formatMoney(selected.depositMinor, currency)} />
        <Row
          label="Balance due"
          value={`${selected.balanceDueDays} days before`}
          muted
        />
        {scarce && !soldOut && (
          <p className="pt-1 text-xs font-medium text-clay-600">
            Only {selected.spacesRemaining} {selected.spacesRemaining === 1 ? "space" : "spaces"} left on this departure.
          </p>
        )}
      </dl>

      {soldOut ? (
        <button
          disabled
          className="mt-6 w-full cursor-not-allowed rounded-full bg-ink/20 px-6 py-4 text-sm uppercase tracking-[0.16em] text-ink-muted"
        >
          Sold out
        </button>
      ) : (
        <Link
          href={`/book/${selected.id}`}
          className="mt-6 flex w-full items-center justify-center rounded-full bg-clay-500 px-6 py-4 text-sm uppercase tracking-[0.16em] text-sand-50 shadow-soft transition-all hover:bg-clay-600 hover:shadow-lift"
        >
          {selected.status === "waitlist" ? "Join the waitlist" : "Reserve your place"}
        </Link>
      )}

      <p className="mt-3 text-center text-xs text-ink-muted">
        Reserve with a deposit · balance later · flights not included
      </p>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={cn("font-medium", muted ? "text-ink-soft" : "text-ink")}>{value}</dd>
    </div>
  );
}
