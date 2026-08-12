"use client";

import { useState, useTransition } from "react";
import type { FlightDetails } from "@/lib/booking/types";
import { saveFlightDetails } from "@/app/account/trips/[bookingId]/actions";

export function FlightForm({
  bookingId,
  flight,
}: {
  bookingId: string;
  flight?: FlightDetails;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={(fd) => {
        setSaved(false);
        startTransition(async () => {
          await saveFlightDetails(bookingId, fd);
          setSaved(true);
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Arrival flight number">
          <input name="arrivalFlight" defaultValue={flight?.arrivalFlight} placeholder="e.g. KL569" className={inputCls} />
        </Field>
        <Field label="Arrival date & time">
          <input name="arrivalDate" type="datetime-local" defaultValue={flight?.arrivalDate} className={inputCls} />
        </Field>
        <Field label="Departure flight number">
          <input name="departureFlight" defaultValue={flight?.departureFlight} placeholder="e.g. KL568" className={inputCls} />
        </Field>
        <Field label="Departure date & time">
          <input name="departureDate" type="datetime-local" defaultValue={flight?.departureDate} className={inputCls} />
        </Field>
      </div>
      <Field label="Notes for the organiser">
        <textarea name="notes" rows={2} defaultValue={flight?.notes} placeholder="Anything the team should know about your arrival…" className={inputCls} />
      </Field>
      <div className="flex items-center gap-3">
        <button
          disabled={pending}
          className="rounded-full bg-ink px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 transition-colors hover:bg-ink-soft disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save flight details"}
        </button>
        {saved && <span className="text-sm text-palm-600">Saved — the team will coordinate your transfer.</span>}
      </div>
    </form>
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

const inputCls =
  "w-full rounded-xl border border-ink/15 bg-sand-50 px-4 py-3 text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500";
