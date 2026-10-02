"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { withdrawStayRequest } from "@/lib/offgrid/requestActions";
import { formatFullDate } from "@/lib/utils";
import type { StayRequest } from "@/lib/offgrid/requests";

/** A traveller's open request: what they asked, what they wrote, and a way to withdraw. */
export function RequestStatusCard({ request, hostName, title, intro }: { request: StayRequest; hostName: string; title: string; intro: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const withdraw = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("requestId", request.id);
      await withdrawStayRequest(fd);
      router.refresh();
    });
  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-100 p-6 sm:p-8">
      <p className="eyebrow text-forest-700">Your request</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-prose text-ink-soft">{intro}</p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-[0.66rem] font-semibold uppercase tracking-eyebrow text-ink-muted">Arriving</dt>
          <dd className="mt-1 text-ink">{formatFullDate(request.arrival)}</dd>
        </div>
        <div>
          <dt className="text-[0.66rem] font-semibold uppercase tracking-eyebrow text-ink-muted">Nights</dt>
          <dd className="mt-1 text-ink">{request.nights}</dd>
        </div>
        <div>
          <dt className="text-[0.66rem] font-semibold uppercase tracking-eyebrow text-ink-muted">Travellers</dt>
          <dd className="mt-1 text-ink">{request.guests}</dd>
        </div>
      </dl>
      <p className="mt-5 text-[0.66rem] font-semibold uppercase tracking-eyebrow text-ink-muted">What you wrote to {hostName}</p>
      <p className="mt-1.5 whitespace-pre-line rounded-xl bg-sand-50 p-4 text-ink-soft">{request.introduction}</p>
      <button
        type="button"
        onClick={withdraw}
        disabled={pending}
        className="mt-5 text-sm text-ink-muted underline underline-offset-4 hover:text-ink disabled:opacity-50"
      >
        {pending ? "Withdrawing…" : "Withdraw this request"}
      </button>
    </div>
  );
}

/** Just the withdraw action (for an accepted request the traveller no longer wants). */
export function WithdrawRequestButton({ requestId, label = "Withdraw this request" }: { requestId: string; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("requestId", requestId);
          await withdrawStayRequest(fd);
          router.refresh();
        })
      }
      className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink disabled:opacity-50"
    >
      {pending ? "Withdrawing…" : label}
    </button>
  );
}
