"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { answerCheckin } from "@/lib/offgrid/checkinActions";
import { CHECKIN_COPY, type Checkin, type CheckinResponse } from "@/lib/offgrid/checkins";
import { cn } from "@/lib/utils";

/** "Have you arrived safely?" / "Everything okay with your stay?" — one tap, with a clear way to ask for help. */
export function CheckinCard({ checkin, contactEmail }: { checkin: Checkin; contactEmail: string }) {
  const router = useRouter();
  const copy = CHECKIN_COPY[checkin.kind];
  const [helping, setHelping] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = (response: CheckinResponse) =>
    start(async () => {
      const fd = new FormData();
      fd.set("bookingId", checkin.bookingId);
      fd.set("kind", checkin.kind);
      fd.set("response", response);
      if (response === "help") fd.set("note", note);
      const res = await answerCheckin(fd);
      if (!res.ok) return setError(res.error ?? "Couldn't save — please try again.");
      router.refresh();
    });

  const answered = checkin.response;
  const help = answered === "help";
  return (
    <section
      id="check-in"
      className={cn(
        "scroll-mt-24 rounded-xl2 border p-5 sm:p-7",
        help ? "border-earth-500/50 bg-earth-500/5" : answered ? "border-forest-700/20 bg-sand-50" : "border-forest-700/40 bg-forest-900 text-sand-50",
      )}
    >
      <p className={cn("eyebrow", answered ? "text-forest-700" : "text-sand-100/70")}>Check-in</p>
      <h2 className={cn("mt-2 font-display text-2xl font-semibold", answered ? "text-ink" : "text-sand-50")}>{copy.question}</h2>

      {answered === "ok" && <p className="mt-2 text-ink-soft">{copy.thanks}</p>}
      {help && (
        <p className="mt-2 text-ink-soft">
          We&apos;ve let the Spend Time Off Grid team know and someone will be in touch. You can also email{" "}
          <a href={`mailto:${contactEmail}`} className="underline underline-offset-4">{contactEmail}</a>.
        </p>
      )}

      {!answered && !helping && (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => send("ok")}
            className="rounded-full bg-sand-50 px-6 py-3 text-xs font-medium uppercase tracking-eyebrow text-forest-900 hover:bg-sand-100 disabled:opacity-50"
          >
            {copy.yes}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setHelping(true)}
            className="rounded-full border border-sand-50/40 px-6 py-3 text-xs font-medium uppercase tracking-eyebrow text-sand-50 hover:border-sand-50 disabled:opacity-50"
          >
            {copy.no}
          </button>
        </div>
      )}

      {!answered && helping && (
        <div className="mt-5 space-y-4">
          <p className="rounded-xl bg-sand-50/10 p-4 text-sm leading-relaxed text-sand-100">
            <strong className="text-sand-50">If you&apos;re in danger,</strong> leave if you can do so safely and call the local
            emergency services first. We can&apos;t send help ourselves.
          </p>
          <label className="block">
            <span className="text-sm text-sand-100">What&apos;s happening? (optional)</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-2 w-full rounded-xl border border-sand-50/20 bg-sand-50 px-4 py-3 text-[0.95rem] text-ink focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => send("help")}
              className="rounded-full bg-sand-50 px-6 py-3 text-xs font-medium uppercase tracking-eyebrow text-forest-900 hover:bg-sand-100 disabled:opacity-50"
            >
              {pending ? "Sending…" : "Tell the team"}
            </button>
            <button type="button" onClick={() => setHelping(false)} className="text-sm text-sand-100/80 underline underline-offset-4">
              Back
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-clay-600">{error}</p>}
    </section>
  );
}
