"use client";

import { useRef, useState, useTransition } from "react";
import { uploadGuestPhotos, submitGuestReview } from "@/app/memories/[token]/actions";
import { prepareImageForUpload } from "@/lib/media/clientImage";
import { cn } from "@/lib/utils";

export interface DayOption {
  day: number;
  title: string;
}

/**
 * The guest side of a memories invite: upload photos (optionally pinned to a
 * specific retreat day) and leave a review. Token-authenticated — no sign-in.
 */
export function GuestPhotoUploader({
  token,
  days,
  accent,
  initialPhotos,
}: {
  token: string;
  days: DayOption[];
  accent: string;
  initialPhotos: { id: string; url: string; dayNumber: number | null }[];
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [day, setDay] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    const files = [...list];
    let failures = 0;
    for (let i = 0; i < files.length; i++) {
      setBusy(files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : "Uploading…");
      // Downscale big phone photos in the browser (like the host wizard does)
      // so each request stays well under the server's upload cap.
      const ready = await prepareImageForUpload(files[i]);
      const fd = new FormData();
      fd.set("token", token);
      if (day) fd.set("day", day);
      fd.append("files", ready);
      try {
        const res = await uploadGuestPhotos(fd);
        if (res.ok) {
          setPhotos((p) => [
            { id: `${Date.now()}-${i}`, url: URL.createObjectURL(files[i]), dayNumber: day ? Number(day) : null },
            ...p,
          ]);
        } else {
          failures++;
          setError(res.error);
        }
      } catch {
        failures++;
      }
    }
    setBusy(null);
    if (failures && !error) setError(`${failures} photo${failures > 1 ? "s" : ""} didn't go through — try again.`);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-xl2 border border-ink/10 bg-white p-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-ink" htmlFor="memory-day">
          These photos are from
        </label>
        <select
          id="memory-day"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="rounded-xl border border-ink/15 bg-sand-50 px-3 py-2 text-sm text-ink focus:outline-none"
        >
          <option value="">The whole retreat</option>
          {days.map((d) => (
            <option key={d.day} value={d.day}>
              Day {d.day}{d.title ? ` — ${d.title}` : ""}
            </option>
          ))}
        </select>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={Boolean(busy)}
        style={{ backgroundColor: accent }}
        className="mt-4 w-full rounded-xl px-6 py-4 text-sm uppercase tracking-eyebrow text-sand-50 disabled:opacity-60"
      >
        {busy ?? "Choose photos to upload"}
      </button>
      {error && <p className="mt-3 text-sm text-clay-600">{error}</p>}

      {photos.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-eyebrow text-ink-muted">Your photos on this retreat</p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => (
              <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-sand-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                {p.dayNumber != null && (
                  <span className="absolute bottom-1 left-1 rounded-full bg-ink/70 px-2 py-0.5 text-[0.6rem] text-sand-50">
                    Day {p.dayNumber}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const SUBS: { key: string; label: string }[] = [
  { key: "ratingHost", label: "Host" },
  { key: "ratingAccommodation", label: "Stay" },
  { key: "ratingActivities", label: "Activities" },
  { key: "ratingFood", label: "Food" },
  { key: "ratingValue", label: "Value" },
];

/** Token-authenticated variant of the trip review form (no sign-in needed). */
export function GuestReviewForm({ token, accent }: { token: string; accent: string }) {
  const [overall, setOverall] = useState(0);
  const [subs, setSubs] = useState<Record<string, number>>({});
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!overall) {
      setError("Please choose an overall rating.");
      return;
    }
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("token", token);
      fd.set("ratingOverall", String(overall));
      for (const { key } of SUBS) if (subs[key]) fd.set(key, String(subs[key]));
      fd.set("body", body);
      const res = await submitGuestReview(fd);
      if (res.ok) setDone(true);
      else setError(res.error);
    });
  }

  if (done) {
    return (
      <div className="rounded-xl2 border border-palm-500/40 bg-palm-500/5 p-6 text-sm text-palm-600">
        Thank you — your review has been submitted and will appear once it&apos;s been checked.
      </div>
    );
  }

  return (
    <div className="rounded-xl2 border border-ink/10 bg-white p-6">
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
        style={{ backgroundColor: accent }}
        className="mt-4 rounded-full px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 disabled:opacity-50"
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
