"use client";

import { useMemo, useState, useTransition } from "react";
import type { Departure, Experience } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import { formatDateRange } from "@/lib/utils";
import { priceBooking } from "@/lib/booking/pricing";
import { cn } from "@/lib/utils";
import { createBooking, checkPromo } from "@/app/book/[departureId]/actions";

export function BookingFlow({
  experience,
  departure,
}: {
  experience: Experience;
  departure: Departure;
}) {
  const maxGuests = Math.max(1, Math.min(departure.spacesRemaining, 6));
  const [roomId, setRoomId] = useState(experience.stay.roomTypes[0].id);
  const [guests, setGuests] = useState(1);
  const [payFull, setPayFull] = useState(false);
  const [pending, startTransition] = useTransition();
  const [promoCode, setPromoCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discountMinor: number; label: string } | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();

  const room = experience.stay.roomTypes.find((r) => r.id === roomId)!;
  const breakdown = useMemo(
    () => priceBooking(experience, departure, room, guests),
    [experience, departure, room, guests],
  );

  const c = experience.currency;
  const discount = applied?.discountMinor ?? 0;
  const subtotalAfter = Math.max(0, breakdown.subtotalMinor - discount);
  const depositAfter = Math.min(breakdown.depositDueNowMinor, subtotalAfter);
  const dueNow = payFull ? subtotalAfter : depositAfter;
  const balanceAfter = subtotalAfter - dueNow;

  function applyPromo() {
    setPromoMsg(null);
    startChecking(async () => {
      const res = await checkPromo(promoCode, breakdown.subtotalMinor);
      if (res) {
        setApplied(res);
        setPromoMsg(`${res.label} applied`);
      } else {
        setApplied(null);
        setPromoMsg("That code isn't valid.");
      }
    });
  }

  function reserve() {
    const fd = new FormData();
    fd.set("departureId", departure.id);
    fd.set("roomId", roomId);
    fd.set("guests", String(guests));
    fd.set("payFull", String(payFull));
    if (applied) fd.set("promo", applied.code);
    startTransition(() => {
      // Server action re-validates the promo, creates the booking, and redirects.
      createBooking(fd);
    });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        <Step n={1} title="Your room">
          <div className="space-y-2">
            {experience.stay.roomTypes.map((r) => (
              <button
                key={r.id}
                onClick={() => setRoomId(r.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                  r.id === roomId ? "border-ink bg-ink text-sand-50" : "border-ink/15 hover:border-ink/40",
                )}
              >
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className={cn("text-sm", r.id === roomId ? "text-sand-100/80" : "text-ink-muted")}>{r.description}</p>
                </div>
                <span className="text-sm">
                  {r.priceDeltaMinor === 0 ? "Included" : `+${formatMoney(r.priceDeltaMinor, c, { showDecimals: false })}`}
                </span>
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title="Guests">
          <div className="flex items-center gap-4">
            <Stepper value={guests} setValue={setGuests} min={1} max={maxGuests} />
            <p className="text-sm text-ink-muted">{departure.spacesRemaining} spaces remaining on this departure</p>
          </div>
        </Step>

        <Step n={3} title="How would you like to pay?">
          <div className="grid gap-3 sm:grid-cols-2">
            <PayOption
              active={!payFull}
              onClick={() => setPayFull(false)}
              title="Reserve with a deposit"
              amount={formatMoney(depositAfter, c)}
              note={`Balance ${formatMoney(subtotalAfter - depositAfter, c)} due ${breakdown.balanceDueDays} days before`}
            />
            <PayOption
              active={payFull}
              onClick={() => setPayFull(true)}
              title="Pay in full"
              amount={formatMoney(subtotalAfter, c)}
              note="Nothing more to pay"
            />
          </div>
        </Step>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-6 shadow-soft">
          <p className="eyebrow text-ocean-700">Your reservation</p>
          <p className="mt-2 font-display text-xl font-semibold text-ink">{experience.name}</p>
          <p className="text-sm text-ink-muted">
            {formatDateRange(departure.startDate, departure.endDate)} · {experience.duration} days
          </p>

          <dl className="mt-5 space-y-2 border-t border-ink/10 pt-5 text-sm">
            <Row label={`${room.name} × ${guests}`} value={formatMoney(breakdown.perGuestMinor * guests, c)} />
            {discount > 0 && (
              <Row label={`Discount (${applied?.code})`} value={`− ${formatMoney(discount, c)}`} />
            )}
            <Row label="Package total" value={formatMoney(subtotalAfter, c)} strong />
            <div className="my-2 border-t border-ink/10" />
            <Row label="Due now" value={formatMoney(dueNow, c)} strong />
            {!payFull && (
              <Row label={`Balance in ${breakdown.balanceDueDays}d`} value={formatMoney(balanceAfter, c)} muted />
            )}
          </dl>

          {/* Promo code */}
          <div className="mt-4">
            <div className="flex gap-2">
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Promo code"
                className="w-full rounded-xl border border-ink/15 bg-sand-50 px-3 py-2 text-sm uppercase tracking-wide text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
              />
              <button
                onClick={applyPromo}
                disabled={checking || !promoCode.trim()}
                className="rounded-xl border border-ink/20 px-4 py-2 text-xs uppercase tracking-eyebrow text-ink-soft hover:border-ink/40 disabled:opacity-50"
              >
                {checking ? "…" : "Apply"}
              </button>
            </div>
            {promoMsg && (
              <p className={`mt-1.5 text-xs ${applied ? "text-palm-600" : "text-clay-600"}`}>{promoMsg}</p>
            )}
          </div>

          <button
            onClick={reserve}
            disabled={pending}
            className="mt-6 flex w-full items-center justify-center rounded-full bg-clay-500 px-6 py-4 text-sm uppercase tracking-[0.16em] text-sand-50 shadow-soft transition-all hover:bg-clay-600 hover:shadow-lift disabled:opacity-60"
          >
            {pending ? "Securing…" : "Reserve my place"}
          </button>
          <p className="mt-3 text-center text-xs text-ink-muted">
            Flights not included · secure your dates with {formatMoney(dueNow, c)} now
          </p>
        </div>
      </aside>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-sand-50">{n}</span>
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Stepper({ value, setValue, min, max }: { value: number; setValue: (v: number) => void; min: number; max: number }) {
  return (
    <div className="inline-flex items-center rounded-full border border-ink/15">
      <button onClick={() => setValue(Math.max(min, value - 1))} className="px-4 py-2 text-lg text-ink-soft disabled:opacity-30" disabled={value <= min}>−</button>
      <span className="w-8 text-center tabular-nums">{value}</span>
      <button onClick={() => setValue(Math.min(max, value + 1))} className="px-4 py-2 text-lg text-ink-soft disabled:opacity-30" disabled={value >= max}>+</button>
    </div>
  );
}

function PayOption({ active, onClick, title, amount, note }: { active: boolean; onClick: () => void; title: string; amount: string; note: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all",
        active ? "border-ink bg-ink text-sand-50" : "border-ink/15 hover:border-ink/40",
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{amount}</p>
      <p className={cn("mt-1 text-xs", active ? "text-sand-100/80" : "text-ink-muted")}>{note}</p>
    </button>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={cn(strong ? "font-semibold text-ink" : muted ? "text-ink-muted" : "text-ink-soft")}>{value}</dd>
    </div>
  );
}
