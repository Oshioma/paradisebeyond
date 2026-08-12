"use client";

import { useState, useTransition } from "react";
import { submitReview } from "@/lib/reviews/actions";
import { cn } from "@/lib/utils";

const SUBS: { key: string; label: string }[] = [
  { key: "ratingHost", label: "Host" },
  { key: "ratingAccommodation", label: "Stay" },
  { key: "ratingActivities", label: "Activities" },
  { key: "ratingFood", label: "Food" },
  { key: "ratingValue", label: "Value" },
];

/** Guest review form shown on a completed trip. Submits for moderation. */
export function ReviewForm({ bookingId, experienceSlug }: { bookingId: string; experienceSlug: string }) {
  const [overall, setOverall] = useState(0);
  const [subs, setSubs] = useState<Record<string, number>>({});
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!overall) { setError("Please choose an overall rating."); return; }
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("bookingId", bookingId);
      fd.set("experienceSlug", experienceSlug);
      fd.set("ratingOverall", String(overall));
      for (const { key } of SUBS) if (subs[key]) fd.set(key, String(subs[key]));
      fd.set("body", body);
      const res = await submitReview(fd);
      if (res.ok) setDone(true);
      else setError(res.error ?? "Something went wrong.");
    });
  }

  if (done) {
    return (
      <div className="rounded-xl2 border border-palm-500/40 bg-palm-500/5 p-6 text-sm text-palm-600">
        Thank you — your review has been submitted and will appear once our team has checked it.
      </div>
    );
  }

  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-100 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-ink">Overall</span>
        <Picker value={overall} onChange={setOverall} big />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SUBS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 bg-sand-50 px-3 py-2">
            <span className="text-sm text-ink-soft">{label}</span>
            <Picker value={subs[key] ?? 0} onChange={(v) => setSubs((s) => ({ ...s, [key]: v }))} />
          </div>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Tell future guests what the week was really like…"
        className="mt-4 w-full rounded-xl border border-ink/15 bg-sand-50 px-4 py-3 text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
      />
      {error && <p className="mt-3 text-sm text-clay-600">{error}</p>}
      <button
        onClick={submit}
        disabled={pending}
        className="mt-4 rounded-full bg-clay-500 px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}

function Picker({ value, onChange, big }: { value: number; onChange: (v: number) => void; big?: boolean }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span className={cn("inline-flex", big ? "text-2xl" : "text-lg")} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
          className={cn("px-0.5 leading-none transition-colors", i <= shown ? "text-clay-500" : "text-ink/20 hover:text-clay-400")}
        >
          ★
        </button>
      ))}
    </span>
  );
}
