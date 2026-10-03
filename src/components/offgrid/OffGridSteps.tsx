"use client";

import type { useRouter } from "next/navigation";
import type { RetreatDraft, validateForSubmit } from "@/lib/retreat/schema";
import {
  DIFFICULTY_LABEL,
  MAX_DAYS_PER_WEEK,
  MAX_HOURS_PER_DAY,
  OFF_GRID_FACILITIES,
  emptyOffGrid,
  type OffGridDetails,
  type PriceUnit,
} from "@/lib/offgrid/types";
import { perGuestStayPrice } from "@/lib/offgrid/pricing";
import { splitCommission, formatMoney } from "@/lib/money";
import { SPEND_TIME_OFF_GRID } from "@/lib/brand/config";
import { cn } from "@/lib/utils";
import { CoHostManager } from "@/components/retreat/CoHostManager";
import {
  AddBtn,
  Chips,
  Field,
  GalleryUrlAdd,
  ListEditor,
  PhotoUpload,
  RemoveBtn,
  Sub,
  SubmitStep,
  Toggle,
  UrlPasteRow,
  inp,
  toggle,
  updateArr,
} from "@/components/retreat/RetreatWizard";

type SetFn = <K extends keyof RetreatDraft>(key: K, value: RetreatDraft[K]) => void;
type Opt = { value: string; label: string };

/**
 * The "List your land" steps (see OFFGRID_STEPS). Rendered inside the shared
 * Retreat Builder, so autosave, photo uploads, co-hosts and submit/publish are
 * exactly the existing ones. Copy speaks to hosts of land, not employers.
 */
export function OffGridStepContent({
  step,
  draft,
  set,
  setDraft,
  categories,
  validation,
  router,
  go,
  draftId,
  isOwner,
  isLiveListing,
}: {
  step: number;
  draft: RetreatDraft;
  set: SetFn;
  setDraft: React.Dispatch<React.SetStateAction<RetreatDraft>>;
  categories: Opt[];
  validation: ReturnType<typeof validateForSubmit>;
  router: ReturnType<typeof useRouter>;
  go: (i: number) => void;
  draftId: string;
  isOwner: boolean;
  isLiveListing: boolean;
}) {
  const o = draft.offGrid ?? emptyOffGrid();
  /** Update the off-grid details immutably. */
  const og = (fn: (x: OffGridDetails) => OffGridDetails) =>
    setDraft((d) => ({ ...d, offGrid: fn(d.offGrid ?? emptyOffGrid()) }));
  const currency = draft.currency || "USD";

  switch (step) {
    case 0:
      return (
        <div className="space-y-5">
          <Field label="What's your place called?" hint="A name travellers will remember, e.g. “Mto Wa Mbu Food Forest”.">
            <input className={inp} value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Live on a tropical permaculture farm" />
          </Field>
          <Field label="One line about it">
            <input className={inp} value={draft.strapline} onChange={(e) => set("strapline", e.target.value)} placeholder="Spice trees, food forest and long evenings by the fire." />
          </Field>
          <Field label="What kind of place is it?" hint="Pick all that fit.">
            <Chips options={categories} selected={draft.categorySlugs} onToggle={(v) => setDraft((d) => ({ ...d, categorySlugs: toggle(d.categorySlugs, v) }))} />
          </Field>
          <Field label="Tell travellers about your place" hint="The land, the project, the people, why it exists. Tell it — don't list features.">
            <ListEditor items={draft.story.length ? draft.story : [""]} onChange={(v) => set("story", v)} textarea placeholder="A family farm slowly turned into a food forest…" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Your name (as host)">
              <input className={inp} value={draft.hostName} onChange={(e) => set("hostName", e.target.value)} placeholder="Mwanaisha" />
            </Field>
            <Field label="Your headline">
              <input className={inp} value={draft.hostHeadline} onChange={(e) => set("hostHeadline", e.target.value)} placeholder="Permaculture farmer" />
            </Field>
          </div>
          <Field label="About you">
            <textarea rows={3} className={inp} value={draft.hostBio} onChange={(e) => set("hostBio", e.target.value)} placeholder="Who you are and how you came to this land." />
          </Field>
          <CoHostManager draftId={draftId} isOwner={isOwner} />
        </div>
      );
    case 1:
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Where is it?" hint="Town or area, and region — what travellers will search for.">
            <input className={inp} value={draft.locationLabel} onChange={(e) => set("locationLabel", e.target.value)} placeholder="Pemba Island, Tanzania" />
          </Field>
          <Field label="Country">
            <input className={inp} value={draft.country} onChange={(e) => set("country", e.target.value)} placeholder="Tanzania" />
          </Field>
        </div>
      );
    case 2:
      return (
        <div className="space-y-6">
          <Field label="Main photo" hint="The land at its best — the view travellers will fall for.">
            <PhotoUpload draftId={draft.id} slot="hero" url={draft.heroImageUrl} onUploaded={(u) => set("heroImageUrl", u)} onClear={() => set("heroImageUrl", "")} />
          </Field>
          <Field label="More photos" hint="The work, the food, the people, the evenings. Select several at once.">
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
        </div>
      );
    case 3: {
      const images = draft.hotels?.[0]?.images ?? [];
      const setImages = (next: string[]) =>
        setDraft((d) => ({ ...d, hotels: [{ name: "", description: "", images: next }] }));
      return (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Type of accommodation" hint="e.g. Hut, Cabin, Bell tent, Room in the farmhouse, Bunkhouse.">
              <input className={inp} value={o.stay.accommodationType} onChange={(e) => og((x) => ({ ...x, stay: { ...x.stay, accommodationType: e.target.value } }))} placeholder="Hut" />
            </Field>
            <Field label="Private or shared?">
              <div className="flex gap-2">
                {(["private", "shared"] as const).map((p) => (
                  <Toggle key={p} label={p === "private" ? "Private" : "Shared"} on={o.stay.privacy === p} onClick={() => og((x) => ({ ...x, stay: { ...x.stay, privacy: p } }))} />
                ))}
              </div>
            </Field>
          </div>
          <Field label="Describe where guests sleep" hint="Bed, bedding, light, warmth, what's shared.">
            <textarea rows={4} className={inp} value={o.stay.description} onChange={(e) => og((x) => ({ ...x, stay: { ...x.stay, description: e.target.value } }))} placeholder="A palm-thatched hut with a double bed and mosquito net…" />
          </Field>
          <Field label="Photos of the accommodation">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((u, j) => (
                <div key={`${u}-${j}`} className="relative aspect-square overflow-hidden rounded-lg bg-sand-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setImages(images.filter((_, k) => k !== j))} className="absolute right-1 top-1 rounded-full bg-ink/70 px-2 py-0.5 text-[0.6rem] text-sand-50">✕</button>
                </div>
              ))}
              <PhotoUpload draftId={draft.id} slot={`stay-${images.length}`} url="" compact multiple onUploaded={(u) => setImages([...images, u])} onUploadedMany={(urls) => setImages([...images, ...urls])} />
            </div>
            <div className="mt-2"><UrlPasteRow label="…or paste an image URL (https://…)" onAdd={(u) => setImages([...images, u])} /></div>
          </Field>
        </div>
      );
    }
    case 4:
      return (
        <div className="space-y-5">
          <Field label="Are meals included?">
            <div className="flex gap-2">
              <Toggle label="Meals included" on={o.food.mealsIncluded} onClick={() => og((x) => ({ ...x, food: { ...x.food, mealsIncluded: true } }))} />
              <Toggle label="Self-catering" on={!o.food.mealsIncluded} onClick={() => og((x) => ({ ...x, food: { ...x.food, mealsIncluded: false } }))} />
            </div>
          </Field>
          {o.food.mealsIncluded && (
            <Field label="Meals per day">
              <NumberRow value={o.food.mealsPerDay} min={1} max={3} onChange={(n) => og((x) => ({ ...x, food: { ...x.food, mealsPerDay: n } }))} />
            </Field>
          )}
          <Field label="What's the food like?" hint="Where it comes from, who cooks, how you eat together.">
            <textarea rows={3} className={inp} value={o.food.description} onChange={(e) => og((x) => ({ ...x, food: { ...x.food, description: e.target.value } }))} placeholder="Shared family meals, mostly from the farm…" />
          </Field>
          <Field label="Dietary options you can cater for">
            <ListEditor items={o.food.dietaryOptions.length ? o.food.dietaryOptions : [""]} onChange={(v) => og((x) => ({ ...x, food: { ...x.food, dietaryOptions: v } }))} placeholder="Vegetarian" small />
          </Field>
        </div>
      );
    case 5:
      return (
        <div className="space-y-6">
          <p className="max-w-xl text-sm text-ink-muted">
            You decide what you ask of guests. Be honest — clear expectations make for good stays.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Hours per day" hint={`0–${MAX_HOURS_PER_DAY} hours. 0 = no set contribution.`}>
              <NumberRow value={o.contribution.hoursPerDay} min={0} max={MAX_HOURS_PER_DAY} step={0.5} onChange={(n) => og((x) => ({ ...x, contribution: { ...x.contribution, hoursPerDay: n } }))} suffix="hrs/day" />
            </Field>
            <Field label="Days per week" hint={`0–${MAX_DAYS_PER_WEEK} days.`}>
              <NumberRow value={o.contribution.daysPerWeek} min={0} max={MAX_DAYS_PER_WEEK} onChange={(n) => og((x) => ({ ...x, contribution: { ...x.contribution, daysPerWeek: n } }))} suffix="days/week" />
            </Field>
          </div>
          <Field label="What will guests help with?" hint="The rhythm of a typical day's contribution.">
            <textarea rows={4} className={inp} value={o.contribution.description} onChange={(e) => og((x) => ({ ...x, contribution: { ...x.contribution, description: e.target.value } }))} placeholder="Mornings in the food forest alongside us — planting, mulching, harvesting…" />
          </Field>
          <Field label="How physical is it?">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DIFFICULTY_LABEL) as (keyof typeof DIFFICULTY_LABEL)[]).map((k) => (
                <Toggle key={k} label={DIFFICULTY_LABEL[k]} on={o.contribution.physicalDifficulty === k} onClick={() => og((x) => ({ ...x, contribution: { ...x.contribution, physicalDifficulty: k } }))} />
              ))}
            </div>
          </Field>
          <Field label="Skills needed (optional)" hint="Leave empty if no experience is needed.">
            <ListEditor items={o.contribution.skillsRequired.length ? o.contribution.skillsRequired : [""]} onChange={(v) => og((x) => ({ ...x, contribution: { ...x.contribution, skillsRequired: v } }))} placeholder="Comfortable with heights" small />
          </Field>
        </div>
      );
    case 6:
      return (
        <Field label="Typical tasks" hint="A few concrete examples, so travellers know what to expect.">
          <ListEditor items={o.contribution.typicalTasks.length ? o.contribution.typicalTasks : [""]} onChange={(v) => og((x) => ({ ...x, contribution: { ...x.contribution, typicalTasks: v } }))} placeholder="Harvesting and drying spices" />
        </Field>
      );
    case 7:
      return (
        <div className="space-y-6">
          <Field label="What will guests learn?" hint="Skills and knowledge they'll take home.">
            <ListEditor items={o.contribution.skillsYouCanLearn.length ? o.contribution.skillsYouCanLearn : [""]} onChange={(v) => og((x) => ({ ...x, contribution: { ...x.contribution, skillsYouCanLearn: v } }))} placeholder="Food-forest design basics" />
          </Field>
          <Field label="Moments they'll remember (optional)" hint="The experiences beyond the work.">
            <div className="space-y-3">
              {draft.highlights.map((h, i) => (
                <div key={i} className="grid gap-3 rounded-xl border border-ink/10 p-4 sm:grid-cols-[1fr_2fr_auto]">
                  <input className={inp} placeholder="Night fishing with the village" value={h.title} onChange={(e) => updateArr(setDraft, "highlights", i, { title: e.target.value })} />
                  <input className={inp} placeholder="Short description" value={h.description} onChange={(e) => updateArr(setDraft, "highlights", i, { description: e.target.value })} />
                  <RemoveBtn onClick={() => set("highlights", draft.highlights.filter((_, j) => j !== i))} />
                </div>
              ))}
              <AddBtn onClick={() => set("highlights", [...draft.highlights, { title: "", description: "" }])}>Add a moment</AddBtn>
            </div>
          </Field>
        </div>
      );
    case 8: {
      const groups = ["Power", "Water", "Washing", "Connectivity"] as const;
      return (
        <div className="space-y-6">
          {groups.map((g) => (
            <Field key={g} label={g}>
              <Chips
                options={OFF_GRID_FACILITIES.filter((f) => f.group === g).map((f) => ({ value: f.key, label: f.label }))}
                selected={o.facilities}
                onToggle={(v) => og((x) => ({ ...x, facilities: toggle(x.facilities, v) }))}
              />
            </Field>
          ))}
          <Field label="Life off grid" hint="How power, water, washing and signal actually work day to day.">
            <textarea rows={3} className={inp} value={o.lifeOffGrid} onChange={(e) => og((x) => ({ ...x, lifeOffGrid: e.target.value }))} placeholder="Solar lights in the main house; bucket showers warmed by the sun…" />
          </Field>
        </div>
      );
    }
    case 9:
      return (
        <Field
          label="When can you host?"
          hint="Add the periods you're open. Travellers choose their own arrival and length within a period. Places = how many travellers each period can take; each booking uses its travellers' places for that period, so shorter periods (e.g. a month) give you finer control."
        >
          <div className="space-y-3">
            {draft.departures.map((dep, i) => (
              <div key={i} className="grid items-end gap-3 rounded-xl border border-ink/10 p-4 sm:grid-cols-[1fr_1fr_110px_auto]">
                <Sub label="From"><input type="date" className={inp} value={dep.startDate} onChange={(e) => updateArr(setDraft, "departures", i, { startDate: e.target.value })} /></Sub>
                <Sub label="Until"><input type="date" className={inp} value={dep.endDate} onChange={(e) => updateArr(setDraft, "departures", i, { endDate: e.target.value })} /></Sub>
                <Sub label="Places"><input type="number" min={1} inputMode="numeric" className={inp} value={dep.capacity || ""} onChange={(e) => updateArr(setDraft, "departures", i, { capacity: Number(e.target.value) })} /></Sub>
                <RemoveBtn onClick={() => set("departures", draft.departures.filter((_, j) => j !== i))} />
              </div>
            ))}
            <AddBtn onClick={() => set("departures", [...draft.departures, { startDate: "", endDate: "", capacity: 2 }])}>Add a period</AddBtn>
          </div>
        </Field>
      );
    case 10:
      return (
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Minimum stay" hint="Nights.">
            <NumberRow value={o.stay.minNights} min={1} max={365} onChange={(n) => og((x) => ({ ...x, stay: { ...x.stay, minNights: n } }))} suffix="nights" />
          </Field>
          <Field label="Maximum stay (optional)" hint="Leave at 0 for no maximum.">
            <NumberRow value={o.stay.maxNights ?? 0} min={0} max={365} onChange={(n) => og((x) => ({ ...x, stay: { ...x.stay, maxNights: n || undefined } }))} suffix="nights" />
          </Field>
        </div>
      );
    case 11: {
      const bps = SPEND_TIME_OFF_GRID.fixedCommissionBps ?? 0;
      const example = perGuestStayPrice(o.pricing, Math.max(7, o.stay.minNights));
      const split = splitCommission(example, bps);
      const units: { v: PriceUnit; l: string }[] = [
        { v: "day", l: "Per day" },
        { v: "week", l: "Per week" },
        { v: "stay", l: "Fixed per stay" },
      ];
      return (
        <div className="space-y-6">
          <Field label="How do you charge?">
            <div className="flex flex-wrap gap-2">
              {units.map((u) => (
                <Toggle key={u.v} label={u.l} on={o.pricing.unit === u.v} onClick={() => og((x) => ({ ...x, pricing: { ...x.pricing, unit: u.v } }))} />
              ))}
            </div>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Price per traveller" hint="Set 0 for a free, exchange-only stay.">
              <div className="flex items-center rounded-xl border border-ink/15 bg-sand-50">
                <span className="px-3 text-sm text-ink-muted">{currency}</span>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  className="w-full bg-transparent px-1 py-3 text-ink focus:outline-none"
                  value={o.pricing.amountMinor ? o.pricing.amountMinor / 100 : 0}
                  onChange={(e) => og((x) => ({ ...x, pricing: { ...x.pricing, amountMinor: Math.max(0, Math.round(Number(e.target.value) * 100)) } }))}
                />
              </div>
            </Field>
            <Field label="Currency">
              <select className={inp} value={currency} onChange={(e) => set("currency", e.target.value)}>
                {["USD", "EUR", "GBP"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="rounded-xl2 bg-sand-100 p-5 text-sm text-ink-soft">
            {o.pricing.amountMinor ? (
              <>
                <p>
                  Travellers pay exactly your price — no fees are added on top. Spend Time Off Grid takes{" "}
                  <strong className="text-ink">{bps / 100}%</strong> of paid bookings from that amount.
                </p>
                <p className="mt-2">
                  Example: a {Math.max(7, o.stay.minNights)}-night stay at your price is{" "}
                  <strong className="text-ink">{formatMoney(example, currency)}</strong>; you receive{" "}
                  <strong className="text-ink">{formatMoney(split.hostNetMinor, currency)}</strong>.
                </p>
              </>
            ) : (
              <p>A free stay: travellers request a place and nothing is charged — no commission is taken.</p>
            )}
          </div>
        </div>
      );
    }
    case 12:
      return (
        <div className="space-y-6">
          <Field label="House & project rules" hint="What you ask of everyone living with you.">
            <textarea rows={5} className={inp} value={o.houseRules} onChange={(e) => og((x) => ({ ...x, houseRules: e.target.value }))} placeholder="Quiet after 10pm. No smoking near the barns…" />
          </Field>
          <Field label="Cancellation policy" hint="Shown to travellers before they book.">
            <textarea rows={4} className={inp} value={o.cancellationPolicy} onChange={(e) => og((x) => ({ ...x, cancellationPolicy: e.target.value }))} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Toggle label="Children welcome" on={o.practical.childrenAllowed} onClick={() => og((x) => ({ ...x, practical: { ...x.practical, childrenAllowed: !x.practical.childrenAllowed } }))} />
            <Toggle label="Pets allowed" on={o.practical.petsAllowed} onClick={() => og((x) => ({ ...x, practical: { ...x.practical, petsAllowed: !x.practical.petsAllowed } }))} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Accessibility">
              <input className={inp} value={o.practical.accessibility} onChange={(e) => og((x) => ({ ...x, practical: { ...x.practical, accessibility: e.target.value } }))} placeholder="Uneven paths; not suitable for wheelchairs" />
            </Field>
            <Field label="Languages spoken">
              <ListEditor items={o.practical.languages.length ? o.practical.languages : [""]} onChange={(v) => og((x) => ({ ...x, practical: { ...x.practical, languages: v } }))} placeholder="English" small />
            </Field>
          </div>
        </div>
      );
    case 13:
      return (
        <div className="space-y-6">
          <Field label="How do travellers get to you?" hint="Travellers arrange and pay for their own transport unless you include transfers.">
            <textarea rows={3} className={inp} value={o.practical.gettingThere} onChange={(e) => og((x) => ({ ...x, practical: { ...x.practical, gettingThere: e.target.value } }))} placeholder="Ferry to Pemba, then a 40-minute taxi — we'll send directions." />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nearest airport">
              <input className={inp} value={o.practical.nearestAirport} onChange={(e) => og((x) => ({ ...x, practical: { ...x.practical, nearestAirport: e.target.value } }))} placeholder="Pemba (PMA)" />
            </Field>
            <Field label="Transfers">
              <Toggle label="I can arrange transfers" on={o.practical.transfersAvailable} onClick={() => og((x) => ({ ...x, practical: { ...x.practical, transfersAvailable: !x.practical.transfersAvailable } }))} />
            </Field>
          </div>
          <Field label="What to bring">
            <ListEditor items={o.practical.whatToBring.length ? o.practical.whatToBring : [""]} onChange={(v) => og((x) => ({ ...x, practical: { ...x.practical, whatToBring: v } }))} placeholder="Head torch" small />
          </Field>
          <Field label="Anything else to know? (optional)">
            <textarea rows={3} className={inp} value={o.practical.notes} onChange={(e) => og((x) => ({ ...x, practical: { ...x.practical, notes: e.target.value } }))} />
          </Field>
        </div>
      );
    case 14:
      return <SubmitStep draft={draft} validation={validation} router={router} go={go} isLiveListing={isLiveListing} />;
    default:
      return null;
  }
}

function NumberRow({
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (n: number) => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center rounded-full border border-ink/15">
        <button type="button" onClick={() => onChange(clamp(value - step))} disabled={value <= min} className={cn("px-4 py-2 text-lg text-ink-soft disabled:opacity-30")} aria-label="Less">−</button>
        <span className="w-12 text-center tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(clamp(value + step))} disabled={value >= max} className="px-4 py-2 text-lg text-ink-soft disabled:opacity-30" aria-label="More">+</button>
      </div>
      {suffix && <span className="text-sm text-ink-muted">{suffix}</span>}
    </div>
  );
}
