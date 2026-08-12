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
  "The basics", "7 or 14 days", "Location", "Dates", "Accommodation",
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
          <StepContent step={step} draft={draft} set={set} setDraft={setDraft} categories={categories} destinations={destinations} validation={validation} router={router} />
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
              <button onClick={() => go(step + 1)} className="rounded-full bg-ink px-6 py-2.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-ink-soft">
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
type SetFn = <K extends keyof RetreatDraft>(key: K, value: RetreatDraft[K]) => void;

function StepContent({
  step, draft, set, setDraft, categories, destinations, validation, router,
}: {
  step: number;
  draft: RetreatDraft;
  set: SetFn;
  setDraft: React.Dispatch<React.SetStateAction<RetreatDraft>>;
  categories: Opt[];
  destinations: { slug: string; name: string; country: string }[];
  validation: ReturnType<typeof validateForSubmit>;
  router: ReturnType<typeof useRouter>;
}) {
  switch (step) {
    case 0:
      return (
        <div className="space-y-5">
          <AiDraftPanel draft={draft} setDraft={setDraft} />
          <Field label="Retreat name" hint="Evocative, not generic. e.g. “Zanzibar Reconnection”">
            <input className={inp} value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Zanzibar Reconnection" />
          </Field>
          <Field label="Strapline" suggest={<Suggest kind="strapline" draft={draft} apply={(v) => set("strapline", v[0] ?? "")} />}>
            <input className={inp} value={draft.strapline} onChange={(e) => set("strapline", e.target.value)} placeholder="Seven days to come back to yourself." />
          </Field>
          <Field label="Categories" hint="Pick all that fit.">
            <Chips options={categories} selected={draft.categorySlugs} onToggle={(v) => set("categorySlugs", toggle(draft.categorySlugs, v))} />
          </Field>
          <Field label="This experience is for you if…" suggest={<Suggest kind="idealGuest" draft={draft} apply={(v) => set("idealGuest", v)} />}>
            <ListEditor items={draft.idealGuest} onChange={(v) => set("idealGuest", v)} placeholder="You've been running on empty…" />
          </Field>
          <Field label="The story" hint="Tell it, don't list features." suggest={<Suggest kind="story" draft={draft} apply={(v) => set("story", v)} />}>
            <ListEditor items={draft.story} onChange={(v) => set("story", v)} textarea placeholder="A week built around one idea…" />
          </Field>
        </div>
      );
    case 1:
      return (
        <Field label="How long is your retreat?">
          <div className="grid gap-4 sm:grid-cols-2">
            {[7, 14].map((n) => (
              <button
                key={n}
                onClick={() => setDraft((d) => ({ ...d, duration: n as 7 | 14, itinerary: resizeItinerary({ ...d, duration: n as 7 | 14 }) }))}
                className={cn("rounded-xl2 border p-6 text-left transition-all", draft.duration === n ? "border-ink bg-ink text-sand-50" : "border-ink/15 hover:border-ink/40")}
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
                <Sub label="Start"><input type="date" className={inp} value={dep.startDate} onChange={(e) => updateArr(setDraft, "departures", i, { startDate: e.target.value })} /></Sub>
                <Sub label="End"><input type="date" className={inp} value={dep.endDate} onChange={(e) => updateArr(setDraft, "departures", i, { endDate: e.target.value })} /></Sub>
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
        <div className="space-y-5">
          <Field label="Property / accommodation name"><input className={inp} value={draft.propertyName} onChange={(e) => set("propertyName", e.target.value)} placeholder="Kendwa Beach House" /></Field>
          <Field label="Describe where guests stay"><textarea rows={4} className={inp} value={draft.propertyDescription} onChange={(e) => set("propertyDescription", e.target.value)} placeholder="A small, barefoot-luxury beach house steps from the sand…" /></Field>
        </div>
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
        <Field label="Room options" hint="Shared, private, upgrades. Prices are added to the base price.">
          <div className="space-y-3">
            {draft.rooms.map((r, i) => (
              <div key={i} className="grid gap-3 rounded-xl border border-ink/10 p-4 sm:grid-cols-[1fr_1.5fr_120px_120px_auto]">
                <input className={inp} placeholder="Shared Twin" value={r.name} onChange={(e) => updateArr(setDraft, "rooms", i, { name: e.target.value })} />
                <input className={inp} placeholder="Room shared with one guest" value={r.description} onChange={(e) => updateArr(setDraft, "rooms", i, { description: e.target.value })} />
                <select className={inp} value={r.occupancy} onChange={(e) => updateArr(setDraft, "rooms", i, { occupancy: e.target.value as never })}>
                  <option value="shared">Shared</option><option value="private">Private</option><option value="single">Single</option>
                </select>
                <Sub label="+ USD"><input type="number" className={inp} value={r.priceDeltaUsd} onChange={(e) => updateArr(setDraft, "rooms", i, { priceDeltaUsd: Number(e.target.value) })} /></Sub>
                <RemoveBtn onClick={() => set("rooms", draft.rooms.filter((_, j) => j !== i))} />
              </div>
            ))}
            <AddBtn onClick={() => set("rooms", [...draft.rooms, { name: "", description: "", occupancy: "private", priceDeltaUsd: 0 }])}>Add a room option</AddBtn>
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
          <Field label="Gallery" hint="A handful of images that tell the story.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {draft.galleryUrls.map((u, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  <button onClick={() => set("galleryUrls", draft.galleryUrls.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-ink/70 px-2 py-0.5 text-[0.6rem] uppercase tracking-eyebrow text-sand-50">Remove</button>
                </div>
              ))}
              <PhotoUpload draftId={draft.id} slot={`g${draft.galleryUrls.length}`} url="" compact onUploaded={(u) => set("galleryUrls", [...draft.galleryUrls, u])} />
            </div>
          </Field>
          <p className="text-xs text-ink-muted">Photos are optional to save a draft; add them before you submit for the best listing.</p>
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
      return <SubmitStep draft={draft} validation={validation} router={router} />;
    default:
      return null;
  }
}

// ---- Submit step -----------------------------------------------------------
function SubmitStep({ draft, validation, router }: { draft: RetreatDraft; validation: ReturnType<typeof validateForSubmit>; router: ReturnType<typeof useRouter> }) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<string[]>(validation.ok ? [] : validation.errors);

  function doSubmit() {
    start(async () => {
      const res = await submitRetreat(draft);
      if (res.ok) {
        try { localStorage.removeItem(`pb:retreat:${draft.id}`); } catch { /* ignore */ }
        // Admin direct-publish returns the live slug; hosts go to the queue.
        router.push(res.slug ? `/experiences/${res.slug}` : "/studio/retreats?submitted=1");
      } else {
        setErrors(res.errors ?? ["Something went wrong."]);
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
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
            {errors.map((e) => <li key={e}>{e}</li>)}
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
        propertyDescription: s.propertyDescription || d.propertyDescription,
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

function PhotoUpload({ draftId, slot, url, onUploaded, onClear, compact }: { draftId: string; slot: string; url: string; onUploaded: (u: string) => void; onClear?: () => void; compact?: boolean }) {
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    start(async () => {
      const u = await uploadRetreatPhoto(draftId, slot, fd);
      if (u) onUploaded(u);
      if (ref.current) ref.current.value = "";
    });
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
    <label className={cn("flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-ink/25 text-center text-xs text-ink-muted hover:border-ink/50", compact ? "aspect-square" : "h-40")}>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {pending ? "Uploading…" : compact ? "+ Add" : "Click to upload a photo"}
    </label>
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
