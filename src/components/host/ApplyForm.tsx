"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { clearDraft, loadDraft, saveDraft } from "@/lib/forms/drafts";
import { hostApplicationSchema } from "@/lib/validation/hostApplication";
import { submitHostApplication } from "@/app/[site]/host/apply/actions";
import { cn } from "@/lib/utils";

type Errors = Record<string, string>;

/** Wording per marketplace. The fields (and the review pipeline) are shared. */
const COPY = {
  retreat: {
    ideaLegend: "Your retreat idea",
    destination: ["Proposed destination", "Zanzibar"],
    groupSize: ["Expected group size", "12"],
    price: ["Expected price (USD pp)", "1650"],
    accommodation: ["Accommodation / property", "Beach house in Kendwa"],
    idea: ["What's the retreat?", "A women's reset week combining yoga, breathwork and rest…"],
    background: ["Your background & qualifications", "500hr yoga, 8 years teaching…"],
    experience: ["Experience hosting or leading groups", "Tell us what you've run before…"],
    builder: "Retreat Builder",
  },
  offgrid: {
    ideaLegend: "Your land",
    destination: ["Where is it?", "Pemba Island, Tanzania"],
    groupSize: ["How many travellers at once?", "2"],
    price: ["Expected price (USD per day, 0 if free)", "22"],
    accommodation: ["Where would travellers sleep?", "Two private huts"],
    idea: ["What is your place, and what would travellers help with?", "A family permaculture farm. Mornings planting and harvesting in the food forest…"],
    background: ["About you and your project", "We've farmed this land for 12 years…"],
    experience: ["Have you hosted people before?", "Friends, volunteers, workshops…"],
    builder: "listing builder",
  },
} as const;

/** Autosaved so a refresh never loses an application (no passwords/cards). */
const DRAFT_KEY = "host-application";

export function ApplyForm({ variant = "retreat" }: { variant?: keyof typeof COPY }) {
  const c = COPY[variant];
  const formRef = useRef<HTMLFormElement>(null);
  const draftKey = `${DRAFT_KEY}:${variant}`;
  useEffect(() => {
    const saved = loadDraft<Record<string, string>>(draftKey);
    const form = formRef.current;
    if (!saved || !form) return;
    for (const [k, v] of Object.entries(saved)) {
      const el = form.elements.namedItem(k);
      if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) && el.type !== "hidden" && typeof v === "string") {
        el.value = v;
      }
    }
  }, [draftKey]);
  function persist() {
    if (!formRef.current) return;
    saveDraft(draftKey, Object.fromEntries(new FormData(formRef.current).entries()));
  }
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const raw = Object.fromEntries(form.entries());
    const parsed = hostApplicationSchema.safeParse(raw);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        next[issue.path[0] as string] = issue.message;
      }
      setErrors(next);
      const firstKey = parsed.error.issues[0]?.path[0] as string;
      document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    setServerError(null);
    start(async () => {
      const res = await submitHostApplication(raw);
      if (res.ok) {
        clearDraft(draftKey);
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setServerError(res.error ?? "Something went wrong — please try again.");
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-xl2 bg-ocean-700 p-10 text-center text-sand-50">
        <p className="font-display text-3xl font-semibold">Thank you — we&apos;ve got it.</p>
        <p className="mx-auto mt-3 max-w-md text-sand-100/90">
          Our team reviews every application by hand. We&apos;ll be in touch by
          email. If it&apos;s a fit, we&apos;ll open the {c.builder} for you.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} onInput={persist} noValidate className="space-y-6">
      <input type="hidden" name="marketplace" value={variant === "offgrid" ? "spendtimeoffgrid" : "paradise-beyond"} />
      <Fieldset legend="About you">
        <Field id="name" label="Full name" error={errors.name}>
          <input name="name" className={inputCls(errors.name)} placeholder="Amina Yusuf" />
        </Field>
        <Field id="email" label="Email" error={errors.email}>
          <input name="email" type="email" className={inputCls(errors.email)} placeholder="you@email.com" />
        </Field>
        <Field id="links" label="Website / social links" error={errors.links} optional>
          <input name="links" className={inputCls(errors.links)} placeholder="instagram.com/…, yoursite.com" />
        </Field>
        <Field id="background" label={c.background[0]} error={errors.background}>
          <textarea name="background" rows={3} className={inputCls(errors.background)} placeholder={c.background[1]} />
        </Field>
        <Field id="experience" label={c.experience[0]} error={errors.experience}>
          <textarea name="experience" rows={3} className={inputCls(errors.experience)} placeholder={c.experience[1]} />
        </Field>
      </Fieldset>

      <Fieldset legend={c.ideaLegend}>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="destination" label={c.destination[0]} error={errors.destination}>
            <input name="destination" className={inputCls(errors.destination)} placeholder={c.destination[1]} />
          </Field>
          {variant === "offgrid" ? (
            // Off-grid stays have no fixed length; the shared schema still
            // expects one, so send the nominal default.
            <input type="hidden" name="duration" value="7" />
          ) : (
            <Field id="duration" label="7 or 14 days" error={errors.duration}>
              <select name="duration" className={inputCls(errors.duration)} defaultValue="7">
                <option value="7">7 days</option>
                <option value="14">14 days</option>
              </select>
            </Field>
          )}
          <Field id="approxDates" label="Approximate dates" error={errors.approxDates}>
            <input name="approxDates" className={inputCls(errors.approxDates)} placeholder="October–November 2026" />
          </Field>
          <Field id="expectedGroupSize" label={c.groupSize[0]} error={errors.expectedGroupSize}>
            <input name="expectedGroupSize" type="number" className={inputCls(errors.expectedGroupSize)} placeholder={c.groupSize[1]} />
          </Field>
          <Field id="expectedPriceUsd" label={c.price[0]} error={errors.expectedPriceUsd}>
            <input name="expectedPriceUsd" type="number" min={0} className={inputCls(errors.expectedPriceUsd)} placeholder={c.price[1]} />
          </Field>
          <Field id="accommodation" label={c.accommodation[0]} error={errors.accommodation}>
            <input name="accommodation" className={inputCls(errors.accommodation)} placeholder={c.accommodation[1]} />
          </Field>
        </div>
        <Field id="retreatIdea" label={c.idea[0]} error={errors.retreatIdea}>
          <textarea name="retreatIdea" rows={3} className={inputCls(errors.retreatIdea)} placeholder={c.idea[1]} />
        </Field>
        <Field id="description" label="Anything else we should know" error={errors.description}>
          <textarea name="description" rows={3} className={inputCls(errors.description)} placeholder="Photos, partners, the feeling you want guests to leave with…" />
        </Field>
      </Fieldset>

      <div className="flex flex-col items-start gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-ink-muted">Every application is reviewed by hand. No auto-publishing.</p>
          {serverError && <p className="mt-1 text-sm text-clay-600">{serverError}</p>}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-clay-500 px-8 py-4 text-sm uppercase tracking-[0.16em] text-sand-50 shadow-soft transition-all hover:bg-clay-600 hover:shadow-lift disabled:opacity-60"
        >
          {pending ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </form>
  );
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-6 rounded-xl2 border border-ink/10 bg-sand-50 p-6 sm:p-8">
      <legend className="eyebrow px-2 text-ocean-700">{legend}</legend>
      {children}
    </fieldset>
  );
}

function Field({
  id,
  label,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div id={`field-${id}`}>
      <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-ink-muted">Optional</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs text-clay-600">{error}</p>}
    </div>
  );
}

function inputCls(error?: string) {
  return cn(
    "w-full rounded-xl border bg-sand-50 px-4 py-3 text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500",
    error ? "border-clay-500" : "border-ink/15",
  );
}
