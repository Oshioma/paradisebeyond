"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type RetreatDraft,
  resizeItinerary,
  validateForSubmit,
} from "@/lib/retreat/schema";
import {
  aiDraftRetreat,
  saveRetreatDraft,
  submitRetreat,
  suggestCopy,
  uploadRetreatPhoto,
} from "@/app/studio/retreats/new/actions";
import { cn } from "@/lib/utils";

interface Opt { value: string; label: string }

const STEPS = [
  "7 or 14 days", "The basics", "Location", "Dates", "Accommodation",
  "What's included", "Activities", "Itinerary", "Rooms", "Pricing",
  "Deposit & payment", "Cancellation", "Photos", "Host profile", "Preview", "Submit",
] as const;

export function RetreatWizard({
  initialDraft,
  categories,
  destinations,
}: {
  initialDraft: RetreatDraft;
  categories: Opt[];
  destinations: { slug: string; name: string; country: string }[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<RetreatDraft>(initialDraft);
  const [step, setStep] = useState(0);
  const [saving, startSaving] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const storageKey = `pb:retreat:${initialDraft.id}`;

  // Hydrate from localStorage (resume) once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDraft((d) => ({ ...d, ...JSON.parse(raw) }));
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave to localStorage on every change.
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(draft)); } catch { /* ignore */ }
  }, [draft, storageKey]);

  const set = <K extends keyof RetreatDraft>(key: K, value: RetreatDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function saveDraftNow() {
    startSaving(async () => {
      await saveRetreatDraft(draft);
      setSavedAt(new Date().toLocaleTimeString());
    });
  }

  const validation = useMemo(() => validateForSubmit(draft), [draft]);

  const go = (i: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, i)));

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      {/* Stepper */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <ol className="hidden space-y-1 lg:block">
          {STEPS.map((label, i) => (
            <li key={label}>
              <button
                onClick={() => go(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  i === step ? "bg-ink text-sand-50" : "text-ink-muted hover:bg-ink/5",
                )}
              >
                <span className={cn("flex h-5 w-5 flex-none items-center justify-center rounded-full text-[0.62rem]", i === step ? "bg-sand-50 text-ink" : "bg-ink/10 text-ink-muted")}>{i + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>
        <div className="lg:hidden">
          <p className="eyebrow text-ocean-700">Step {step + 1} of {STEPS.length}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-clay-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>
        <button onClick={saveDraftNow} disabled={saving} className="mt-4 hidden w-full rounded-full border border-ink/15 px-4 py-2 text-xs uppercase tracking-eyebrow text-ink-soft hover:border-ink/40 disabled:opacity-50 lg:block">
          {saving ? "Saving…" : "Save draft"}
        </button>
        {savedAt && <p className="mt-2 hidden text-center text-xs text-ink-muted lg:block">Saved {savedAt}</p>}
      </aside>

      {/* Step content */}
      <div>
        <div className="mb-6">
          <p className="eyebrow text-clay-600">Step {step + 1}</p>
          <h2 className="mt-1 font-display text-3xl font-semibold text-ink">{STEPS[step]}</h2>
        </div>

        <div className="min-h-[340px]">
          <StepContent step={step} draft={draft} set={set} setDraft={setDraft} categories={categories} destinations={destinations} validation={validation} router={router} go={go} />
        </div>

        {/* Nav */}
        <div className="mt-10 flex items-center justify-between border-t border-ink/10 pt-6">
          <button onClick={() => go(step - 1)} disabled={step === 0} className="rounded-full border border-ink/15 px-5 py-2.5 text-xs uppercase tracking-eyebrow text-ink-soft hover:border-ink/40 disabled:opacity-40">
            Back
          </button>
          <div className="flex items-center gap-3">
            <button onClick={saveDraftNow} disabled={saving} className="text-xs uppercase tracking-eyebrow text-ink-muted hover:text-ink disabled:opacity-50">
              {saving ? "Saving…" : "Save draft"}
            </button>
            {step < STEPS.length - 1 && (
              <button
                onClick={() => go(step + 1)}
                disabled={step === 0 && !draft.durationChosen}
                title={step === 0 && !draft.durationChosen ? "Choose 7 or 14 days first" : undefined}
                className="rounded-full bg-ink px-6 py-2.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-ink-soft disabled:opacity-40"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add `n` nights to a YYYY-MM-DD date, returning YYYY-MM-DD. Uses UTC so the
// result never drifts a day from timezone offsets.
function addNights(iso: string, n: number): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
type SetFn = <K extends keyof RetreatDraft>(key: K, value: RetreatDraft[K]) => void;

function StepContent({
  step, draft, set, setDraft, categories, destinations, validation, router, go,
}: {
  step: number;
  draft: RetreatDraft;
  set: SetFn;
  setDraft: React.Dispatch<React.SetStateAction<RetreatDraft>>;
  categories: Opt[];
  destinations: { slug: string; name: string; country: string }[];
  validation: ReturnType<typeof validateForSubmit>;
  router: ReturnType<typeof useRouter>;
  go: (i: number) => void;
}) {
  switch (step) {
    case 0:
      return (
        <Field label="How long is your retreat?" hint="Choose first — your name, strapline and itinerary are tailored to it.">
          <div className="grid gap-4 sm:grid-cols-2">
            {[7, 14].map((n) => (
              <button
                key={n}
                onClick={() => setDraft((d) => ({ ...d, duration: n as 7 | 14, durationChosen: true, itinerary: resizeItinerary({ ...d, duration: n as 7 | 14 }) }))}
                className={cn("rounded-xl2 border p-6 text-left transition-all", draft.durationChosen && draft.duration === n ? "border-ink bg-ink text-sand-50" : "border-ink/15 hover:border-ink/40")}
              >
                <p className="font-display text-3xl font-semibold">{n} Days</p>
                <p className={cn("mt-1 text-sm", draft.duration === n ? "text-sand-100/80" : "text-ink-muted")}>
                  {n === 7 ? "A week away from ordinary." : "Go deeper. Stay longer. Come back different."}
                </p>
              </button>
            ))}
          </div>
        </Field>
      );
    case 1:
      return (
        <div className="space-y-5">
          <AiDraftPanel draft={draft} setDraft={setDraft} />
          <Field label="Retreat name" hint="Evocative, not generic. e.g. “Zanzibar Reconnection”">
            <input className={inp} value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Zanzibar Reconnection" />
          </Field>
          <Field label="Strapline" suggest={<Suggest kind="strapline" draft={draft} apply={(v) => set("strapline", v[0] ?? "")} />}>
            <input className={inp} value={draft.strapline} onChange={(e) => set("strapline", e.target.value)} placeholder={`${draft.duration} days to come back to yourself.`} />
          </Field>
          <Field label="Categories" hint="Pick all that fit.">
            <Chips options={categories} selected={draft.categorySlugs} onToggle={(v) => set("categorySlugs", toggle(draft.categorySlugs, v))} />
          </Field>
          <Field label="This experience is for you if…" suggest={<Suggest kind="idealGuest" draft={draft} apply={(v) => set("idealGuest", v)} />}>
            <ListEditor items={draft.idealGuest} onChange={(v) => set("idealGuest", v)} placeholder="You've been running on empty…" />
          </Field>
          <Field label="The story" hint="Tell it, don't list features." suggest={<Suggest kind="story" draft={draft} apply={(v) => set("story", v)} />}>
            <ListEditor items={draft.story} onChange={(v) => set("story", v)} textarea placeholder={`A ${draft.duration === 14 ? "fortnight" : "week"} built around one idea…`} />
          </Field>
        </div>
      );
    case 2:
      return (
        <div className="space-y-5">
          <Field label="Destination">
            <select className={inp} value={draft.destinationSlug} onChange={(e) => {
              const d = destinations.find((x) => x.slug === e.target.value);
              setDraft((s) => ({ ...s, destinationSlug: e.target.value, destinationName: d?.name ?? s.destinationName, country: d?.country ?? s.country }));
            }}>
              {destinations.map((d) => <option key={d.slug} value={d.slug}>{d.name}, {d.country}</option>)}
            </select>
          </Field>
          <Field label="Location label" hint="Where guests will actually be. e.g. “Kendwa, Zanzibar”">
            <input className={inp} value={draft.locationLabel} onChange={(e) => set("locationLabel", e.target.value)} placeholder="Kendwa, Zanzibar" />
          </Field>
        </div>
      );
    case 3:
      return (
        <Field label="Departures" hint="Each set of dates guests can book. Add as many as you run.">
          <div className="space-y-3">
            {draft.departures.map((dep, i) => (
              <div key={i} className="grid items-end gap-3 rounded-xl border border-ink/10 p-4 sm:grid-cols-[1fr_1fr_100px_auto]">
                <Sub label="Start"><input type="date" className={inp} value={dep.startDate} onChange={(e) => {
                  const startDate = e.target.value;
                  // Default the End to the retreat's length (7 or 14 nights) later,
                  // but don't overwrite an End the host has already picked.
                  const patch: Partial<typeof dep> = { startDate };
                  if (startDate && !dep.endDate) patch.endDate = addNights(startDate, draft.duration);
                  updateArr(setDraft, "departures", i, patch);
                }} /></Sub>
                <Sub label={`End${dep.startDate && dep.endDate ? "" : ` (defaults to +${draft.duration} nights)`}`}><input type="date" className={inp} value={dep.endDate} onChange={(e) => updateArr(setDraft, "departures", i, { endDate: e.target.value })} /></Sub>
                <Sub label="Capacity"><input type="number" className={inp} value={dep.capacity} onChange={(e) => updateArr(setDraft, "departures", i, { capacity: Number(e.target.value) })} /></Sub>
                <RemoveBtn onClick={() => set("departures", draft.departures.filter((_, j) => j !== i))} />
              </div>
            ))}
            <AddBtn onClick={() => set("departures", [...draft.departures, { startDate: "", endDate: "", capacity: draft.maxGroupSize }])}>Add a departure</AddBtn>
          </div>
        </Field>
      );
    case 4:
      return (
        <Field label="Hotels / properties" hint="Add every hotel guests can choose from. You'll set room options and rates for each on the Rooms step.">
          <div className="space-y-3">
            {(draft.hotels ?? []).map((h, i) => (
              <div key={i} className="space-y-3 rounded-xl border border-ink/10 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-clay-500 text-xs font-semibold text-sand-50">{i + 1}</span>
                  <input className={inp} placeholder="Hotel / property name (e.g. Sunset Hotel)" value={h.name} onChange={(e) => updateArr(setDraft, "hotels", i, { name: e.target.value })} />
                  <RemoveBtn onClick={() => set("hotels", (draft.hotels ?? []).filter((_, j) => j !== i))} />
                </div>
                <textarea rows={3} className={cn(inp, "ml-8 w-[calc(100%-2rem)]")} placeholder="Describe where guests stay — the feel, the location, why you chose it…" value={h.description} onChange={(e) => updateArr(setDraft, "hotels", i, { description: e.target.value })} />
              </div>
            ))}
            <AddBtn onClick={() => set("hotels", [...(draft.hotels ?? []), { name: "", description: "" }])}>Add a hotel</AddBtn>
          </div>
        </Field>
      );
    case 5:
      return (
        <div className="grid gap-8 sm:grid-cols-2">
          <Field label="What's included" hint="Nights, meals, activities, transfers…">
            <ListEditor items={draft.inclusions} onChange={(v) => set("inclusions", v)} placeholder="7 nights accommodation" />
          </Field>
          <Field label="What's not included" hint="Flights are never included — keep it clear, not cold.">
            <ListEditor items={draft.exclusions} onChange={(v) => set("exclusions", v)} placeholder="International flights" />
          </Field>
        </div>
      );
    case 6:
      return (
        <Field label="Signature activities" hint="The moments guests will remember.">
          <div className="space-y-3">
            {draft.highlights.map((h, i) => (
              <div key={i} className="grid gap-3 rounded-xl border border-ink/10 p-4 sm:grid-cols-[1fr_2fr_auto]">
                <input className={inp} placeholder="Daily beachfront yoga" value={h.title} onChange={(e) => updateArr(setDraft, "highlights", i, { title: e.target.value })} />
                <input className={inp} placeholder="Two unhurried practices a day…" value={h.description} onChange={(e) => updateArr(setDraft, "highlights", i, { description: e.target.value })} />
                <RemoveBtn onClick={() => set("highlights", draft.highlights.filter((_, j) => j !== i))} />
              </div>
            ))}
            <AddBtn onClick={() => set("highlights", [...draft.highlights, { title: "", description: "" }])}>Add an activity</AddBtn>
          </div>
        </Field>
      );
    case 7: {
      const days = draft.itinerary.length ? draft.itinerary : resizeItinerary(draft);
      if (!draft.itinerary.length) setTimeout(() => set("itinerary", days), 0);
      return (
        <Field label={`Day-by-day (${draft.duration} days)`} hint="A title per day, plus the moments in it.">
          <div className="space-y-3">
            {days.map((d, i) => (
              <div key={d.day} className="rounded-xl border border-ink/10 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-clay-500 text-xs font-semibold text-sand-50">{d.day}</span>
                  <input className={inp} placeholder={`Day ${d.day} title — e.g. Arrive`} value={d.title} onChange={(e) => updateArr(setDraft, "itinerary", i, { title: e.target.value })} />
                </div>
                <div className="mt-3 pl-10">
                  <ListEditor items={d.items} onChange={(items) => updateArr(setDraft, "itinerary", i, { items })} placeholder="Airport pickup" small />
                </div>
              </div>
            ))}
          </div>
        </Field>
      );
    }
    case 8:
      return (
        <Field label="Accommodation options" hint="Add as many as you offer — guests pick one, and its price is added to the base. Shown to guests highest price first.">
          <div className="space-y-3">
            {draft.rooms.map((r, i) => (
              <div key={i} className="space-y-3 rounded-xl border border-ink/10 p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <select className={inp} value={r.property ?? ""} onChange={(e) => updateArr(setDraft, "rooms", i, { property: e.target.value })}>
                    <option value="">Which hotel?</option>
                    {(draft.hotels ?? []).filter((h) => h.name.trim()).map((h) => <option key={h.name} value={h.name}>{h.name}</option>)}
                  </select>
                  <input className={inp} placeholder="Room name (e.g. Sea-view Suite)" value={r.name} onChange={(e) => updateArr(setDraft, "rooms", i, { name: e.target.value })} />
                  <RemoveBtn onClick={() => set("rooms", draft.rooms.filter((_, j) => j !== i))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-[1.6fr_130px_130px]">
                  <input className={inp} placeholder="Short description" value={r.description} onChange={(e) => updateArr(setDraft, "rooms", i, { description: e.target.value })} />
                  <select className={inp} value={r.occupancy} onChange={(e) => updateArr(setDraft, "rooms", i, { occupancy: e.target.value as never })}>
                    <option value="shared">Shared</option><option value="private">Private</option><option value="single">Single</option>
                  </select>
                  <Sub label="Rate + USD"><input type="number" className={inp} value={r.priceDeltaUsd} onChange={(e) => updateArr(setDraft, "rooms", i, { priceDeltaUsd: Number(e.target.value) })} /></Sub>
                </div>
              </div>
            ))}
            <AddBtn onClick={() => set("rooms", [...draft.rooms, { property: "", name: "", description: "", occupancy: "private", priceDeltaUsd: 0 }])}>Add an accommodation option</AddBtn>
          </div>
        </Field>
      );
    case 9:
      return (
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Starting price (per person)"><MoneyInput value={draft.priceFromUsd} onChange={(v) => set("priceFromUsd", v)} currency={draft.currency} /></Field>
          <Field label="Currency">
            <select className={inp} value={draft.currency} onChange={(e) => set("currency", e.target.value)}>
              {["USD", "EUR", "GBP"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Max group size"><input type="number" className={inp} value={draft.maxGroupSize} onChange={(e) => set("maxGroupSize", Number(e.target.value))} /></Field>
        </div>
      );
    case 10:
      return (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Deposit to reserve (per person)"><MoneyInput value={draft.depositUsd} onChange={(v) => set("depositUsd", v)} currency={draft.currency} /></Field>
            <Field label="Balance due (days before start)"><input type="number" className={inp} value={draft.balanceDueDays} onChange={(e) => set("balanceDueDays", Number(e.target.value))} /></Field>
          </div>
          <div className="flex flex-wrap gap-3">
            <Toggle label="Allow deposit" on={draft.allowDeposit} onClick={() => set("allowDeposit", !draft.allowDeposit)} />
            <Toggle label="Allow pay in full" on={draft.allowFull} onClick={() => set("allowFull", !draft.allowFull)} />
          </div>
          <p className="text-sm text-ink-muted">Paradise Beyond takes a configurable commission on each sale; your net is calculated automatically and shown before payout.</p>
        </div>
      );
    case 11:
      return (
        <Field label="Cancellation policy" hint="Be clear and fair. Guests read this before booking.">
          <textarea rows={5} className={inp} value={draft.cancellationPolicy} onChange={(e) => set("cancellationPolicy", e.target.value)} />
        </Field>
      );
    case 12:
      return (
        <div className="space-y-6">
          <Field label="Hero photo" hint="The one image that sells the whole experience.">
            <PhotoUpload draftId={draft.id} slot="hero" url={draft.heroImageUrl} onUploaded={(u) => set("heroImageUrl", u)} onClear={() => set("heroImageUrl", "")} />
          </Field>
          <Field label="Gallery" hint="A handful of images that tell the story — select several at once to add them together.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {draft.galleryUrls.map((u, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  <button onClick={() => set("galleryUrls", draft.galleryUrls.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-ink/70 px-2 py-0.5 text-[0.6rem] uppercase tracking-eyebrow text-sand-50">Remove</button>
                </div>
              ))}
              <PhotoUpload
                draftId={draft.id}
                slot={`g${draft.galleryUrls.length}`}
                url=""
                compact
                multiple
                onUploaded={(u) => set("galleryUrls", [...draft.galleryUrls, u])}
                onUploadedMany={(urls) => set("galleryUrls", [...draft.galleryUrls, ...urls])}
              />
            </div>
            <GalleryUrlAdd onAdd={(u) => set("galleryUrls", [...draft.galleryUrls, u])} />
          </Field>
          <p className="text-xs text-ink-muted">Photos are optional to save a draft; add them before you submit for the best listing. You can upload a file or paste an image link from the web.</p>
        </div>
      );
    case 13:
      return (
        <div className="space-y-5">
          <Field label="Your name (as host)"><input className={inp} value={draft.hostName} onChange={(e) => set("hostName", e.target.value)} placeholder="Amina Yusuf" /></Field>
          <Field label="Headline"><input className={inp} value={draft.hostHeadline} onChange={(e) => set("hostHeadline", e.target.value)} placeholder="Yoga teacher & breathwork guide" /></Field>
          <Field label="Short bio"><textarea rows={4} className={inp} value={draft.hostBio} onChange={(e) => set("hostBio", e.target.value)} placeholder="Amina has taught yoga on the Zanzibari coast for over a decade…" /></Field>
        </div>
      );
    case 14:
      return <Preview draft={draft} />;
    case 15:
      return <SubmitStep draft={draft} validation={validation} router={router} go={go} />;
    default:
      return null;
  }
}

// ---- Submit step -----------------------------------------------------------
function SubmitStep({ draft, validation, router, go }: { draft: RetreatDraft; validation: ReturnType<typeof validateForSubmit>; router: ReturnType<typeof useRouter>; go: (i: number) => void }) {
  const [pending, start] = useTransition();
  const [serverErrors, setServerErrors] = useState<{ message: string; step: number }[] | null>(null);
  // Live client validation until the server rejects (which shouldn't happen
  // while the button is gated, but keep the fallback honest).
  const errors = serverErrors ?? (validation.ok ? [] : validation.errors);

  function doSubmit() {
    start(async () => {
      const res = await submitRetreat(draft);
      if (res.ok) {
        try { localStorage.removeItem(`pb:retreat:${draft.id}`); } catch { /* ignore */ }
        // Admin direct-publish returns the live slug; hosts go to the queue.
        router.push(res.slug ? `/experiences/${res.slug}` : "/studio/retreats?submitted=1");
      } else {
        setServerErrors((res.errors ?? ["Something went wrong."]).map((m) => ({ message: m, step: 15 })));
      }
    });
  }

  return (
    <div className="max-w-xl">
      <p className="text-ink-muted">
        When you submit, the Paradise Beyond team reviews your retreat by hand.
        Nothing goes live automatically — you&apos;ll hear back by email, and we
        may suggest a few refinements first.
      </p>
      {errors.length > 0 ? (
        <div className="mt-6 rounded-xl2 border border-clay-500/40 bg-clay-500/5 p-5">
          <p className="font-medium text-clay-600">A few things to finish first:</p>
          <p className="mt-1 text-xs text-ink-muted">Click any item to jump straight to the step that fixes it.</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {errors.map((e) => (
              <li key={`${e.step}:${e.message}`}>
                <button
                  type="button"
                  onClick={() => go(e.step)}
                  className="group flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-ink-soft transition-colors hover:bg-clay-500/10 hover:text-ink"
                >
                  <span className="mt-0.5 flex-none text-clay-500">•</span>
                  <span className="underline decoration-clay-500/40 underline-offset-2 group-hover:decoration-clay-500">{e.message}</span>
                  <span className="ml-auto flex-none pl-2 text-[0.65rem] uppercase tracking-eyebrow text-clay-600 opacity-0 transition-opacity group-hover:opacity-100">Fix →</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-6 rounded-xl2 border border-palm-500/40 bg-palm-500/5 p-5 text-sm text-palm-600">
          Everything looks ready. Submit whenever you&apos;re happy.
        </div>
      )}
      <button
        onClick={doSubmit}
        disabled={pending || !validation.ok}
        className="mt-6 rounded-full bg-clay-500 px-8 py-4 text-sm uppercase tracking-[0.16em] text-sand-50 shadow-soft transition-all hover:bg-clay-600 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit for approval"}
      </button>
    </div>
  );
}

// ---- Preview ---------------------------------------------------------------
function Preview({ draft }: { draft: RetreatDraft }) {
  return (
    <div className="overflow-hidden rounded-xl2 border border-ink/10">
      <div className="relative aspect-[16/9] bg-sand-200">
        {draft.heroImageUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={draft.heroImageUrl} alt="" className="h-full w-full object-cover" />
          : <div className="flex h-full items-center justify-center text-ink-muted">Add a hero photo</div>}
      </div>
      <div className="p-6">
        <p className="eyebrow text-ocean-700">{draft.categorySlugs.join(" · ") || "Category"} · {draft.locationLabel || "Location"}</p>
        <h3 className="mt-1 font-display text-3xl font-semibold text-ink">{draft.name || "Your retreat name"}</h3>
        <p className="mt-1 text-ink-muted">{draft.strapline}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink-soft">
          <span>{draft.duration} days</span>
          <span>From {draft.currency} {draft.priceFromUsd || "—"} pp</span>
          <span>{draft.departures.filter((d) => d.startDate).length} departures</span>
          <span>Max {draft.maxGroupSize}</span>
        </div>
        {draft.inclusions.filter(Boolean).length > 0 && (
          <ul className="mt-4 grid gap-1 text-sm text-ink-soft sm:grid-cols-2">
            {draft.inclusions.filter(Boolean).map((i) => <li key={i}>✓ {i}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---- Field primitives ------------------------------------------------------
const inp = "w-full rounded-xl border border-ink/15 bg-sand-50 px-4 py-3 text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500";

function Field({ label, hint, suggest, children }: { label: string; hint?: string; suggest?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-ink">{label}</label>
        {suggest}
      </div>
      {hint && <p className="mb-2 text-xs text-ink-muted">{hint}</p>}
      {children}
    </div>
  );
}
function Sub({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">{label}</span>{children}</label>;
}

function ListEditor({ items, onChange, placeholder, textarea, small }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string; textarea?: boolean; small?: boolean }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2">
          {textarea
            ? <textarea rows={2} className={inp} value={it} placeholder={placeholder} onChange={(e) => onChange(items.map((x, j) => j === i ? e.target.value : x))} />
            : <input className={cn(inp, small && "py-2 text-sm")} value={it} placeholder={placeholder} onChange={(e) => onChange(items.map((x, j) => j === i ? e.target.value : x))} />}
          <RemoveBtn onClick={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <AddBtn onClick={() => onChange([...items, ""])}>Add</AddBtn>
    </div>
  );
}

function Chips({ options, selected, onToggle }: { options: Opt[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button key={o.value} onClick={() => onToggle(o.value)} className={cn("rounded-full px-4 py-2 text-xs uppercase tracking-eyebrow transition-colors", on ? "bg-ink text-sand-50" : "border border-ink/15 text-ink-soft hover:border-ink/40")}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function MoneyInput({ value, onChange, currency }: { value: number; onChange: (v: number) => void; currency: string }) {
  return (
    <div className="flex items-center rounded-xl border border-ink/15 bg-sand-50 focus-within:ring-2 focus-within:ring-ocean-500">
      <span className="px-3 text-sm text-ink-muted">{currency}</span>
      <input type="number" min={0} className="w-full bg-transparent px-1 py-3 text-ink focus:outline-none" value={value || ""} onChange={(e) => onChange(Number(e.target.value))} placeholder="1650" />
    </div>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-eyebrow transition-colors", on ? "border-ink bg-ink text-sand-50" : "border-ink/15 text-ink-muted")}>
      <span className={cn("h-2 w-2 rounded-full", on ? "bg-palm-500" : "bg-ink/20")} />{label}
    </button>
  );
}

function AddBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="rounded-full border border-dashed border-ink/25 px-4 py-2 text-xs uppercase tracking-eyebrow text-ink-muted hover:border-ink/50 hover:text-ink">+ {children}</button>;
}
function RemoveBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} aria-label="Remove" className="mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-full text-ink-muted hover:bg-clay-500/10 hover:text-clay-600">✕</button>;
}

/**
 * "Draft with AI" — the host describes their retreat in a sentence or two and we
 * generate starter copy for the whole listing (name, story, itinerary, and
 * more). Everything lands in the wizard as an editable draft: the host reviews
 * and changes anything before submitting, and admin still approves by hand
 * before it goes live. AI assists; it never publishes.
 */
function AiDraftPanel({ draft, setDraft }: { draft: RetreatDraft; setDraft: React.Dispatch<React.SetStateAction<RetreatDraft>> }) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const hasContent = Boolean(draft.name || draft.strapline || draft.story.some(Boolean) || draft.itinerary.some((d) => d.title));

  function generate() {
    if (!brief.trim()) return;
    if (hasContent && !confirm("This replaces the copy fields on this step (name, strapline, story, ideal guest) and your itinerary, accommodation, inclusions and activities with AI suggestions you can then edit. Continue?")) return;
    setNote(null);
    start(async () => {
      const s = await aiDraftRetreat(brief, draft);
      setDraft((d) => ({
        ...d,
        name: s.name || d.name,
        strapline: s.strapline || d.strapline,
        idealGuest: s.idealGuest.length ? s.idealGuest : d.idealGuest,
        story: s.story.length ? s.story : d.story,
        hotels: s.propertyDescription
          ? [{ name: (d.hotels ?? [])[0]?.name || "", description: s.propertyDescription }, ...(d.hotels ?? []).slice(1)]
          : (d.hotels ?? [{ name: "", description: "" }]),
        inclusions: s.inclusions.length ? s.inclusions : d.inclusions,
        highlights: s.highlights.length ? s.highlights : d.highlights,
        itinerary: s.itinerary.length
          ? resizeItinerary({ ...d, itinerary: s.itinerary.map((x) => ({ ...x, items: x.items.length ? x.items : [""] })) })
          : d.itinerary,
      }));
      setNote(
        s.ai
          ? "Drafted with AI. Review and edit everything below — nothing is submitted until you say so."
          : "Drafted from a template (AI isn't configured on this site). Edit everything below to make it yours.",
      );
    });
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl2 border border-ocean-500/30 bg-ocean-500/5 p-5">
        <div>
          <p className="font-display text-lg font-semibold text-ink">✨ Draft with AI</p>
          <p className="mt-0.5 text-sm text-ink-muted">Describe your retreat in a sentence and we&apos;ll write a first draft you can edit.</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex-none rounded-full bg-ocean-600 px-5 py-2.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-ocean-700">
          Try it
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl2 border border-ocean-500/30 bg-ocean-500/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-lg font-semibold text-ink">✨ Draft with AI</p>
        <button onClick={() => setOpen(false)} className="text-xs uppercase tracking-eyebrow text-ink-muted hover:text-ink">Close</button>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        e.g. “A yoga &amp; breathwork retreat for women wanting to reset after burnout, slow mornings and beach walks.”
      </p>
      <textarea
        rows={3}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="Describe the retreat, who it's for, and the feeling you want guests to leave with…"
        className={cn(inp, "mt-3")}
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={generate}
          disabled={pending || !brief.trim()}
          className="rounded-full bg-ocean-600 px-6 py-2.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-ocean-700 disabled:opacity-50"
        >
          {pending ? "Drafting…" : "Draft my retreat"}
        </button>
        <span className="text-xs text-ink-muted">Uses your duration ({draft.duration} days) &amp; destination ({draft.destinationName}).</span>
      </div>
      {note && <p className="mt-3 rounded-lg bg-palm-500/10 px-3 py-2 text-xs text-palm-600">{note}</p>}
    </div>
  );
}

function Suggest({ kind, draft, apply }: { kind: string; draft: RetreatDraft; apply: (v: string[]) => void }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => apply(await suggestCopy(kind, draft)))}
      disabled={pending}
      className="rounded-full bg-ocean-500/12 px-3 py-1 text-[0.62rem] uppercase tracking-eyebrow text-ocean-700 hover:bg-ocean-500/20 disabled:opacity-50"
    >
      {pending ? "…" : "✨ Suggest"}
    </button>
  );
}

function GalleryUrlAdd({ onAdd }: { onAdd: (u: string) => void }) {
  const [v, setV] = useState("");
  const [err, setErr] = useState<string | null>(null);
  function add() {
    const url = v.trim();
    if (!/^https?:\/\/\S+/i.test(url)) { setErr("Enter a link starting with http:// or https://"); return; }
    setErr(null); onAdd(url); setV("");
  }
  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Paste an image URL to add to the gallery (https://…)"
          className="w-full rounded-lg border border-ink/15 bg-sand-50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
        />
        <button type="button" onClick={add} className="flex-none rounded-full border border-ink/15 px-4 py-2 text-xs uppercase tracking-eyebrow text-ink-soft hover:border-ink/40">Add</button>
      </div>
      {err && <p className="mt-1 text-xs text-clay-600">{err}</p>}
    </div>
  );
}

function PhotoUpload({ draftId, slot, url, onUploaded, onUploadedMany, onClear, compact, multiple }: { draftId: string; slot: string; url: string; onUploaded: (u: string) => void; onUploadedMany?: (urls: string[]) => void; onClear?: () => void; compact?: boolean; multiple?: boolean }) {
  const [pending, start] = useTransition();
  const [urlInput, setUrlInput] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setErr(null);
    start(async () => {
      const uploaded: string[] = [];
      let failures = 0;
      for (let i = 0; i < files.length; i++) {
        if (files.length > 1) setProgress(`Uploading ${i + 1} of ${files.length}…`);
        const fd = new FormData();
        fd.set("file", files[i]);
        // Unique slot per file so concurrent images don't overwrite each other.
        const fileSlot = files.length > 1 ? `${slot}-${i}` : slot;
        try {
          const u = await uploadRetreatPhoto(draftId, fileSlot, fd);
          if (u) uploaded.push(u);
          else failures++;
        } catch (err) {
          failures++;
          if (files.length === 1) setErr(err instanceof Error ? err.message : "Upload failed — paste an image URL instead.");
        }
      }
      setProgress(null);
      if (uploaded.length) {
        if (onUploadedMany) onUploadedMany(uploaded);
        else uploaded.forEach(onUploaded);
      }
      if (failures) setErr(`${failures} photo${failures > 1 ? "s" : ""} didn’t go through — try again or paste a URL.`);
      if (ref.current) ref.current.value = "";
    });
  }

  function applyUrl() {
    const v = urlInput.trim();
    if (!/^https?:\/\/\S+/i.test(v)) { setErr("Enter a link starting with http:// or https://"); return; }
    setErr(null);
    onUploaded(v);
    setUrlInput("");
  }

  if (url && !compact) {
    return (
      <div className="relative inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="aspect-[16/9] w-full max-w-md rounded-xl object-cover" />
        <button onClick={onClear} className="absolute right-2 top-2 rounded-full bg-ink/70 px-3 py-1 text-[0.6rem] uppercase tracking-eyebrow text-sand-50">Replace</button>
      </div>
    );
  }
  return (
    <div className={compact ? "" : "space-y-2"}>
      <label className={cn("flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-ink/25 px-2 text-center text-xs text-ink-muted hover:border-ink/50", compact ? "aspect-square" : "h-32")}>
        <input ref={ref} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={onFile} />
        {pending ? (progress ?? "Uploading…") : compact ? (multiple ? "+ Add photos" : "+ Add") : "Click to upload a photo"}
      </label>
      {!compact && (
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyUrl(); } }}
            placeholder="…or paste an image URL (https://…)"
            className="w-full rounded-lg border border-ink/15 bg-sand-50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
          />
          <button type="button" onClick={applyUrl} className="flex-none rounded-full border border-ink/15 px-4 py-2 text-xs uppercase tracking-eyebrow text-ink-soft hover:border-ink/40">Use</button>
        </div>
      )}
      {err && <p className="text-xs text-clay-600">{err}</p>}
    </div>
  );
}

// ---- helpers ---------------------------------------------------------------
function toggle(list: string[], v: string) { return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]; }
function updateArr<K extends keyof RetreatDraft>(setDraft: React.Dispatch<React.SetStateAction<RetreatDraft>>, key: K, i: number, patch: object) {
  setDraft((d) => {
    const arr = [...(d[key] as unknown as object[])];
    arr[i] = { ...(arr[i] as object), ...patch };
    return { ...d, [key]: arr } as RetreatDraft;
  });
}
