"use client";

import { useState } from "react";
import { hostApplicationSchema } from "@/lib/validation/hostApplication";
import { cn } from "@/lib/utils";

type Errors = Record<string, string>;

export function ApplyForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

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
      // Scroll to first error
      const firstKey = parsed.error.issues[0]?.path[0] as string;
      document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    // TODO(server): POST to a server action → insert into host_applications
    // with status 'submitted'; email the admin desk. For now we confirm receipt.
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (submitted) {
    return (
      <div className="rounded-xl2 bg-ocean-700 p-10 text-center text-sand-50">
        <p className="font-display text-3xl font-semibold">Thank you — we&apos;ve got it.</p>
        <p className="mx-auto mt-3 max-w-md text-sand-100/90">
          Our team reviews every application by hand. We&apos;ll be in touch by
          email. If it&apos;s a fit, we&apos;ll open the Retreat Builder for you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
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
        <Field id="background" label="Your background & qualifications" error={errors.background}>
          <textarea name="background" rows={3} className={inputCls(errors.background)} placeholder="500hr yoga, 8 years teaching…" />
        </Field>
        <Field id="experience" label="Experience hosting or leading groups" error={errors.experience}>
          <textarea name="experience" rows={3} className={inputCls(errors.experience)} placeholder="Tell us what you've run before…" />
        </Field>
      </Fieldset>

      <Fieldset legend="Your retreat idea">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="destination" label="Proposed destination" error={errors.destination}>
            <input name="destination" className={inputCls(errors.destination)} placeholder="Zanzibar" />
          </Field>
          <Field id="duration" label="7 or 14 days" error={errors.duration}>
            <select name="duration" className={inputCls(errors.duration)} defaultValue="7">
              <option value="7">7 days</option>
              <option value="14">14 days</option>
            </select>
          </Field>
          <Field id="approxDates" label="Approximate dates" error={errors.approxDates}>
            <input name="approxDates" className={inputCls(errors.approxDates)} placeholder="October–November 2026" />
          </Field>
          <Field id="expectedGroupSize" label="Expected group size" error={errors.expectedGroupSize}>
            <input name="expectedGroupSize" type="number" className={inputCls(errors.expectedGroupSize)} placeholder="12" />
          </Field>
          <Field id="expectedPriceUsd" label="Expected price (USD pp)" error={errors.expectedPriceUsd}>
            <input name="expectedPriceUsd" type="number" className={inputCls(errors.expectedPriceUsd)} placeholder="1650" />
          </Field>
          <Field id="accommodation" label="Accommodation / property" error={errors.accommodation}>
            <input name="accommodation" className={inputCls(errors.accommodation)} placeholder="Beach house in Kendwa" />
          </Field>
        </div>
        <Field id="retreatIdea" label="What's the retreat?" error={errors.retreatIdea}>
          <textarea name="retreatIdea" rows={3} className={inputCls(errors.retreatIdea)} placeholder="A women's reset week combining yoga, breathwork and rest…" />
        </Field>
        <Field id="description" label="Anything else we should know" error={errors.description}>
          <textarea name="description" rows={3} className={inputCls(errors.description)} placeholder="Photos, partners, the feeling you want guests to leave with…" />
        </Field>
      </Fieldset>

      <div className="flex flex-col items-start gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">Every application is reviewed by hand. No auto-publishing.</p>
        <button
          type="submit"
          className="rounded-full bg-clay-500 px-8 py-4 text-sm uppercase tracking-[0.16em] text-sand-50 shadow-soft transition-all hover:bg-clay-600 hover:shadow-lift"
        >
          Submit application
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
