"use client";

import { useState, useTransition } from "react";
import { saveQuestionnaire } from "@/lib/trip/actions";
import { EXPERIENCE_LEVELS, type TripPrep } from "@/lib/trip/types";
import { cn } from "@/lib/utils";

const inp = "w-full rounded-xl border border-ink/15 bg-sand-50 px-4 py-3 text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500";

/** Pre-trip questionnaire. Saved per booking; your host can see it. */
export function TripQuestionnaire({ bookingId, initial }: { bookingId: string; initial: TripPrep | null }) {
  const [open, setOpen] = useState(false);
  const [prep, setPrep] = useState<TripPrep>(initial ?? {});
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const complete = Boolean(prep.dietary || prep.experienceLevel || prep.emergencyName);

  function save() {
    start(async () => {
      const fd = new FormData();
      fd.set("bookingId", bookingId);
      fd.set("dietary", prep.dietary ?? "");
      fd.set("experienceLevel", prep.experienceLevel ?? "");
      fd.set("medical", prep.medical ?? "");
      fd.set("emergencyName", prep.emergencyName ?? "");
      fd.set("emergencyPhone", prep.emergencyPhone ?? "");
      fd.set("notes", prep.notes ?? "");
      const res = await saveQuestionnaire(fd);
      if (res.ok) { setSavedAt(new Date().toLocaleTimeString()); setOpen(false); }
    });
  }

  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-lg font-semibold text-ink">Guest questionnaire</h4>
          <p className="mt-1 text-sm text-ink-muted">Dietary needs, experience level and an emergency contact — shared with your host.</p>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-[0.6rem] uppercase tracking-eyebrow", complete ? "bg-palm-500/15 text-palm-600" : "bg-clay-500/10 text-clay-600")}>
          {complete ? "Complete" : "To do"}
        </span>
      </div>

      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-4 rounded-full border border-ink/15 px-4 py-2 text-xs uppercase tracking-eyebrow text-ink-soft hover:border-ink/40">
          {complete ? "Edit answers" : "Complete now"}
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          <Field label="Dietary needs & allergies">
            <textarea rows={2} className={inp} value={prep.dietary ?? ""} onChange={(e) => setPrep((p) => ({ ...p, dietary: e.target.value }))} placeholder="Vegetarian, nut allergy, etc." />
          </Field>
          <Field label="Your experience level">
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setPrep((p) => ({ ...p, experienceLevel: l.value }))}
                  className={cn("rounded-full px-4 py-2 text-xs uppercase tracking-eyebrow transition-colors", prep.experienceLevel === l.value ? "bg-ink text-sand-50" : "border border-ink/15 text-ink-soft hover:border-ink/40")}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Anything we should know? (medical, mobility, etc.)">
            <textarea rows={2} className={inp} value={prep.medical ?? ""} onChange={(e) => setPrep((p) => ({ ...p, medical: e.target.value }))} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Emergency contact name">
              <input className={inp} value={prep.emergencyName ?? ""} onChange={(e) => setPrep((p) => ({ ...p, emergencyName: e.target.value }))} />
            </Field>
            <Field label="Emergency contact phone">
              <input className={inp} value={prep.emergencyPhone ?? ""} onChange={(e) => setPrep((p) => ({ ...p, emergencyPhone: e.target.value }))} />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={pending} className="rounded-full bg-clay-500 px-6 py-2.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600 disabled:opacity-50">
              {pending ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setOpen(false)} className="text-xs uppercase tracking-eyebrow text-ink-muted hover:text-ink">Cancel</button>
          </div>
        </div>
      )}
      {savedAt && <p className="mt-2 text-xs text-palm-600">✓ Saved {savedAt}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
