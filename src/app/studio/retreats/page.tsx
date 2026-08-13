import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getExperiencesByHost } from "@/lib/data/repository";
import { getHostBookings } from "@/lib/data/bookings";
import { listDraftsForHost } from "@/lib/retreat/store";
import { img } from "@/lib/images";
import { formatDateRange } from "@/lib/utils";
import { formatFrom } from "@/lib/money";
import { StatusPill } from "@/components/dashboard/StatusPill";

export const metadata: Metadata = { title: "My Retreats", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function RetreatsPage({ searchParams }: { searchParams: { submitted?: string } }) {
  const user = await requireRole("host", "/studio/retreats");
  const hostSlug = user.hostSlug ?? "";
  const [experiences, bookings, drafts] = await Promise.all([
    getExperiencesByHost(hostSlug),
    getHostBookings(hostSlug),
    listDraftsForHost(user.hostSlug ? "" : user.id),
  ]);

  const bookedByDeparture = new Map<string, number>();
  for (const b of bookings) {
    bookedByDeparture.set(b.departureId, (bookedByDeparture.get(b.departureId) ?? 0) + b.guestCount);
  }

  return (
    <div className="container-editorial py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-ocean-700">Host Studio</p>
          <h1 className="mt-2 text-display font-semibold text-ink">My Retreats</h1>
        </div>
        <Link href="/studio/retreats/new" className="rounded-full bg-clay-500 px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600">
          + New retreat
        </Link>
      </header>

      {searchParams.submitted && (
        <div className="mt-6 rounded-xl2 border border-palm-500/40 bg-palm-500/5 p-4 text-sm text-palm-600">
          Submitted for approval — the Paradise Beyond team will review it and be in touch.
        </div>
      )}

      {/* Drafts & submissions from the Retreat Builder */}
      {drafts.length > 0 && (
        <section className="mt-8">
          <p className="eyebrow text-ocean-700">Your builder</p>
          <div className="mt-3 space-y-3">
            {drafts.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-ink/10 bg-sand-50 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{d.name || "Untitled retreat"}</p>
                    <StatusPill status={d.status} />
                  </div>
                  <p className="text-sm text-ink-muted">{d.duration} days · {d.locationLabel || "location TBC"} · updated {d.updatedAt ? new Date(d.updatedAt).toLocaleDateString() : "—"}</p>
                </div>
                {d.status === "draft" || d.status === "changes_requested" ? (
                  <Link href={`/studio/retreats/new?id=${d.id}`} className="rounded-full bg-ink px-5 py-2 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-ink-soft">Continue</Link>
                ) : (
                  <span className="text-xs uppercase tracking-eyebrow text-ink-muted">In review</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Published experiences */}
      <section className="mt-10 space-y-6">
        {experiences.length > 0 && <p className="eyebrow text-ocean-700">Published</p>}
        {experiences.map((e) => (
          <div key={e.slug} className="overflow-hidden rounded-xl2 border border-ink/10 bg-sand-50">
            <div className="flex flex-col sm:flex-row">
              <div className="relative h-40 w-full flex-none sm:h-auto sm:w-56">
                <Image src={img(e.heroImageSeed, 400, 320)} alt={e.name} fill sizes="224px" className="object-cover" />
              </div>
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="eyebrow text-ocean-700">{e.location} · {e.duration} days</p>
                    <h2 className="mt-1 font-display text-2xl font-semibold text-ink">{e.name}</h2>
                  </div>
                  <span className="rounded-full bg-palm-500/15 px-3 py-1 text-[0.66rem] uppercase tracking-eyebrow text-palm-600">Published</span>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="eyebrow text-ink-muted">Departures</p>
                  {e.departures.map((d) => {
                    const booked = bookedByDeparture.get(d.id) ?? (d.capacity - d.spacesRemaining);
                    return (
                      <div key={d.id} className="flex items-center justify-between rounded-lg bg-sand-100 px-4 py-2 text-sm">
                        <span className="text-ink">{formatDateRange(d.startDate, d.endDate)}</span>
                        <span className="text-ink-muted">{booked}/{d.capacity} booked · from {formatFrom(d.priceFromMinor, d.currency)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex gap-3">
                  <Link href={`/experiences/${e.slug}`} className="rounded-full border border-ink/15 px-4 py-2 text-xs uppercase tracking-eyebrow text-ink-soft hover:border-ink/40">View listing</Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
