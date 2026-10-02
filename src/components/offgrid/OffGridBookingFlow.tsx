"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Departure, Experience } from "@/lib/types";
import type { OffGridDetails } from "@/lib/offgrid/types";
import { formatMoney } from "@/lib/money";
import { formatDateRange, formatFullDate } from "@/lib/utils";
import { MAX_TRAVELLERS_PER_BOOKING, addDaysIso, checkStayRequest, maxNightsFrom, quoteOffGridStay, unitLabel } from "@/lib/offgrid/pricing";
import { contributionLine, mealsLine, accommodationLine } from "@/lib/offgrid/summary";
import { clearDraft, loadDraft, saveDraft } from "@/lib/forms/drafts";
import { createBooking } from "@/app/(app)/book/[departureId]/actions";
import { requestStay } from "@/lib/offgrid/requestActions";
import { INTRO_MIN, introError } from "@/lib/offgrid/requests";

type Choice = { arrival: string; nights: number; guests: number };

/**
 * Off-grid stays are request-to-book:
 *   - "request": choose arrival, nights and travellers, introduce yourself and
 *     send a request. Nothing is reserved or charged.
 *   - "confirm": the host said yes — the accepted dates are locked and this
 *     books them through the usual engine (free reservation or payment).
 * The summary is computed with the same pure functions the server uses, so
 * what you see is what's charged. Choices autosave and survive a refresh
 * (cleared on submit / sign-out).
 */
export function OffGridBookingFlow({
  experience,
  departure,
  commissionBps,
  brandName,
  isAuthed = true,
  loginHref = "/login",
  mode = "request",
  locked,
  hostName = "your host",
}: {
  experience: Experience & { offGrid: OffGridDetails };
  departure: Departure;
  commissionBps: number;
  brandName: string;
  isAuthed?: boolean;
  loginHref?: string;
  mode?: "request" | "confirm";
  /** Confirm mode: what the host accepted. */
  locked?: Choice;
  hostName?: string;
}) {
  const router = useRouter();
  const confirm = mode === "confirm" && Boolean(locked);
  const o = experience.offGrid;
  const c = experience.currency;
  const today = new Date().toISOString().slice(0, 10);
  const firstArrival = departure.startDate > today ? departure.startDate : today;
  const minNights = Math.max(1, o.stay.minNights || 1);
  const draftKey = `book:${departure.id}`;

  const introKey = `stay-request-intro:${departure.id}`;
  const [choice, setChoice] = useState<Choice>(locked ?? { arrival: firstArrival, nights: minNights, guests: 1 });
  const [intro, setIntro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Restore what they'd chosen/written before a refresh (not in confirm mode,
  // where the accepted request decides the dates).
  useEffect(() => {
    if (confirm) return;
    const d = loadDraft<Choice>(draftKey);
    if (d) setChoice((c0) => ({ ...c0, ...d }));
    const i = loadDraft<{ text: string }>(introKey);
    if (i?.text) setIntro(i.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!confirm) saveDraft(draftKey, choice);
  }, [confirm, draftKey, choice]);

  const lastArrival = addDaysIso(departure.endDate, -minNights);
  const maxNights = Math.max(minNights, maxNightsFrom(o.stay, departure, choice.arrival || firstArrival));
  const maxGuests = Math.max(1, Math.min(departure.spacesRemaining, MAX_TRAVELLERS_PER_BOOKING));
  const check = checkStayRequest({ window: departure, stay: o.stay, arrival: choice.arrival, nights: choice.nights, today });
  const quote = useMemo(
    () => quoteOffGridStay(o.pricing, choice.nights, choice.guests, commissionBps, c),
    [o.pricing, choice.nights, choice.guests, commissionBps, c],
  );
  const pct = commissionBps / 100;

  function formData() {
    const fd = new FormData();
    fd.set("departureId", departure.id);
    fd.set("arrival", choice.arrival);
    fd.set("nights", String(choice.nights));
    fd.set("guests", String(choice.guests));
    return fd;
  }

  function submit() {
    if (!check.ok) return;
    if (confirm) {
      start(() => {
        createBooking(formData());
      });
      return;
    }
    const bad = introError(intro);
    if (bad) return setError(bad);
    const fd = formData();
    fd.set("introduction", intro.trim());
    start(async () => {
      const res = await requestStay(fd);
      if (!res.ok) return setError(res.error ?? "Couldn't send your request.");
      clearDraft(draftKey);
      clearDraft(introKey);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        {confirm ? (
          <section className="rounded-xl2 border border-forest-700/25 bg-sand-50 p-6">
            <p className="eyebrow text-forest-700">What {hostName} accepted</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">
              {formatFullDate(choice.arrival)} → {check.ok ? formatFullDate(check.departDate) : ""}
            </p>
            <p className="mt-1 text-ink-soft">
              {choice.nights} nights · {choice.guests} {choice.guests === 1 ? "traveller" : "travellers"}
            </p>
            <p className="mt-3 text-sm text-ink-muted">Want different dates? Withdraw this and send a new request.</p>
          </section>
        ) : (
        <>
        <Step n={1} title="When will you arrive?">
          <p className="mb-3 text-sm text-ink-muted">
            Your host is hosting {formatDateRange(departure.startDate, departure.endDate)}.
          </p>
          <input
            type="date"
            min={firstArrival}
            max={lastArrival}
            value={choice.arrival}
            onChange={(e) => setChoice({ ...choice, arrival: e.target.value })}
            className="w-full max-w-xs rounded-xl border border-ink/15 bg-sand-50 px-4 py-3 text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-500"
          />
        </Step>

        <Step n={2} title="How long will you stay?">
          <div className="flex flex-wrap items-center gap-4">
            <Stepper value={choice.nights} min={minNights} max={maxNights} onChange={(nights) => setChoice({ ...choice, nights })} />
            <p className="text-sm text-ink-muted">
              nights · minimum {minNights}{o.stay.maxNights ? `, maximum ${o.stay.maxNights}` : ""}
            </p>
          </div>
          {check.ok && (
            <p className="mt-3 text-sm text-ink-soft">
              {formatFullDate(choice.arrival)} → {formatFullDate(check.departDate)}
            </p>
          )}
        </Step>

        <Step n={3} title="Travellers">
          <div className="flex items-center gap-4">
            <Stepper value={choice.guests} min={1} max={maxGuests} onChange={(guests) => setChoice({ ...choice, guests })} />
            <p className="text-sm text-ink-muted">{departure.spacesRemaining} places left for these dates</p>
          </div>
        </Step>

        <Step n={4} title={`Tell ${hostName} a little about yourself`}>
          <p className="mb-3 max-w-prose text-sm text-ink-muted">
            Who are you, why would you like to stay here, and what interests you about this way of life? A few honest
            sentences — no need for a CV.
          </p>
          <textarea
            value={intro}
            rows={6}
            onChange={(e) => {
              setIntro(e.target.value);
              saveDraft(introKey, { text: e.target.value });
              setError(null);
            }}
            placeholder="Hi! I'm…"
            className="w-full rounded-xl border border-ink/15 bg-sand-50 px-4 py-3 text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:border-forest-700 focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-ink-muted">
            {intro.trim().length < INTRO_MIN ? `At least ${INTRO_MIN} characters` : "Looks good"}
          </p>
        </Step>
        </>
        )}

        <section className="rounded-xl2 bg-sand-100 p-5">
          <p className="eyebrow text-forest-700">The exchange</p>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
            <li><strong className="font-medium text-ink">You&apos;ll help:</strong> {contributionLine(o)}</li>
            <li><strong className="font-medium text-ink">You&apos;ll receive:</strong> {accommodationLine(o)} · {mealsLine(o)}</li>
            <li><strong className="font-medium text-ink">Getting there:</strong> {o.practical.transfersAvailable ? "you arrange travel; your host can help with transfers" : "you arrange and pay for your own travel"}</li>
          </ul>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-6 shadow-soft">
          <p className="eyebrow text-forest-700">Your stay</p>
          <p className="mt-2 font-display text-xl font-semibold text-ink">{experience.name}</p>
          <p className="text-sm text-ink-muted">{experience.location}</p>

          <dl className="mt-5 space-y-2 border-t border-ink/10 pt-5 text-sm">
            {quote.isFree ? (
              <Row label="Price" value="Free · exchange only" strong />
            ) : (
              <>
                <Row
                  label={`${formatMoney(o.pricing.amountMinor, c, { showDecimals: false })}/${unitLabel(o.pricing.unit)}${o.pricing.unit === "stay" ? "" : ` × ${choice.nights} nights`}${choice.guests > 1 ? ` × ${choice.guests}` : ""}`}
                  value={formatMoney(quote.subtotalMinor, c)}
                />
                <Row label="Booking fees" value="None" />
                <div className="my-2 border-t border-ink/10" />
                <Row label={confirm ? "Total to pay now" : "Total if accepted"} value={formatMoney(quote.subtotalMinor, c)} strong />
              </>
            )}
          </dl>
          {!quote.isFree && (
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              The price is set by your host. {brandName}&apos;s {pct}% commission comes out of the
              host&apos;s share — nothing is added on top for you.
            </p>
          )}

          {!check.ok && <p className="mt-4 text-sm text-clay-600">{check.error}</p>}
          {error && <p className="mt-4 text-sm text-clay-600">{error}</p>}
          {!confirm && (
            <p className="mt-4 rounded-xl bg-sand-100 p-3 text-xs leading-relaxed text-ink-soft">
              This is a request. Nothing is reserved or charged until {hostName} says yes — then you confirm.
            </p>
          )}

          {isAuthed ? (
            <button
              onClick={submit}
              disabled={pending || !check.ok}
              className="mt-6 flex w-full items-center justify-center rounded-full bg-forest-700 px-6 py-4 text-sm uppercase tracking-[0.16em] text-sand-50 shadow-soft transition-colors hover:bg-forest-800 disabled:opacity-60"
            >
              {pending
                ? "One moment…"
                : !confirm
                  ? "Send request"
                  : quote.isFree
                    ? "Confirm my place"
                    : `Pay ${formatMoney(quote.subtotalMinor, c)} & book`}
            </button>
          ) : (
            <a
              href={loginHref}
              className="mt-6 flex w-full items-center justify-center rounded-full bg-forest-700 px-6 py-4 text-sm uppercase tracking-[0.16em] text-sand-50 shadow-soft hover:bg-forest-800"
            >
              Sign in to request a stay
            </a>
          )}
          <p className="mt-3 text-center text-xs leading-relaxed text-ink-muted">
            {quote.isFree ? "No payment is taken for this stay. " : ""}
            {confirm ? "By booking" : "By requesting"} you accept our{" "}
            <Link href="/terms" className="link-underline text-ink-soft">Terms</Link> and the host&apos;s cancellation policy.
          </p>
          {o.cancellationPolicy && (
            <details className="mt-3 text-xs text-ink-muted">
              <summary className="cursor-pointer text-ink-soft">Cancellation policy</summary>
              <p className="mt-1 whitespace-pre-line leading-relaxed">{o.cancellationPolicy}</p>
            </details>
          )}
        </div>
      </aside>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-700 text-xs font-semibold text-sand-50">{n}</span>
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center rounded-full border border-ink/15">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="px-4 py-2 text-lg text-ink-soft disabled:opacity-30" aria-label="Fewer">−</button>
      <span className="w-10 text-center tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="px-4 py-2 text-lg text-ink-soft disabled:opacity-30" aria-label="More">+</button>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={strong ? "font-semibold text-ink" : "text-ink-soft"}>{value}</dd>
    </div>
  );
}
