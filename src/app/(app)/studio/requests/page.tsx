import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getBrand } from "@/lib/brand/server";
import { getAllExperiences } from "@/lib/data/repository";
import { findByDeparture } from "@/lib/booking/pricing";
import { listVisibleRequests } from "@/lib/offgrid/requestStore";
import { STATUS_LABEL, type StayRequest } from "@/lib/offgrid/requests";
import { addDaysIso } from "@/lib/offgrid/pricing";
import { formatDateRange, formatFullDate, cn } from "@/lib/utils";
import { RequestDecision } from "@/components/offgrid/RequestDecision";

export const metadata: Metadata = { title: "Stay requests", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Spend Time Off Grid hosts: requests to stay, newest first, ones needing a reply on top. */
export default async function StudioRequestsPage() {
  const user = await requireRole("host", "/studio/requests");
  if (getBrand().theme !== "earth") notFound();
  const experiences = await getAllExperiences();
  // Requests for this host's listings (row-level security scopes this live),
  // not the host's own requests as a traveller.
  const requests = (await listVisibleRequests()).filter((r) => r.guestId !== user.id);
  const pending = requests.filter((r) => r.status === "pending");
  const rest = requests.filter((r) => r.status !== "pending");

  return (
    <div className="container-editorial py-12">
      <header className="max-w-2xl">
        <p className="eyebrow text-forest-700">Host area</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Stay requests</h1>
        <p className="mt-3 text-ink-muted">
          Travellers introduce themselves and ask to stay. Nothing is booked until you say yes and they confirm. It&apos;s fine
          to decline if it doesn&apos;t feel like the right fit.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">Waiting for your reply{pending.length ? ` (${pending.length})` : ""}</h2>
        {pending.length === 0 ? (
          <p className="mt-4 rounded-xl2 border border-dashed border-ink/20 py-10 text-center text-ink-muted">No requests waiting.</p>
        ) : (
          <div className="mt-5 space-y-5">
            {pending.map((r) => (
              <RequestCard key={r.id} r={r} listing={findByDeparture(experiences, r.departureId)?.experience.name} decide />
            ))}
          </div>
        )}
      </section>

      {rest.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold text-ink">Earlier requests</h2>
          <div className="mt-5 space-y-4">
            {rest.map((r) => (
              <RequestCard key={r.id} r={r} listing={findByDeparture(experiences, r.departureId)?.experience.name} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RequestCard({ r, listing, decide = false }: { r: StayRequest; listing?: string; decide?: boolean }) {
  const name = r.guestName?.split(" ")[0] ?? "This traveller";
  return (
    <article className="rounded-xl2 border border-ink/10 bg-sand-50 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-eyebrow text-forest-700">{listing ?? "Your listing"}</p>
          <h3 className="mt-1 font-display text-xl font-semibold text-ink">{r.guestName ?? "A traveller"}</h3>
          <p className="mt-0.5 text-sm text-ink-muted">
            {formatDateRange(r.arrival, addDaysIso(r.arrival, r.nights))} · {r.nights} nights · {r.guests} {r.guests === 1 ? "traveller" : "travellers"} · sent {formatFullDate(r.createdAt.slice(0, 10))}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-eyebrow",
            r.status === "pending" ? "bg-earth-500/15 text-earth-600" : r.status === "accepted" || r.status === "booked" ? "bg-forest-700 text-sand-50" : "bg-ink/5 text-ink-muted",
          )}
        >
          {r.status === "pending" ? "Needs your reply" : r.status === "accepted" ? "Accepted · waiting for them to confirm" : STATUS_LABEL[r.status]}
        </span>
      </div>
      <p className="mt-4 whitespace-pre-line rounded-xl bg-sand-100 p-4 text-ink-soft">{r.introduction}</p>
      {r.hostNote && <p className="mt-3 text-sm text-ink-muted">Your note: &ldquo;{r.hostNote}&rdquo;</p>}
      {r.status === "booked" && r.bookingId && (
        <Link href={`/studio/messages/${r.bookingId}`} className="mt-4 inline-block text-sm font-medium text-forest-700 hover:underline">
          Before they arrive →
        </Link>
      )}
      {decide && <RequestDecision requestId={r.id} guestName={name} />}
    </article>
  );
}
