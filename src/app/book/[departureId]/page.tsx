import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllExperiences } from "@/lib/data/repository";
import { findByDeparture } from "@/lib/booking/pricing";
import { BookingFlow } from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Reserve your place",
  robots: { index: false },
};

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: { departureId: string };
  searchParams: { canceled?: string };
}) {
  const all = await getAllExperiences();
  const found = findByDeparture(all, params.departureId);
  if (!found) notFound();
  const { experience, departure } = found;
  const soldOut = departure.spacesRemaining <= 0;

  return (
    <div className="container-editorial py-14 sm:py-20">
      <Link href={`/experiences/${experience.slug}`} className="text-sm text-ink-muted hover:text-ink">
        ← Back to {experience.name}
      </Link>
      <header className="mt-4 max-w-2xl">
        <p className="eyebrow text-ocean-700">Reserve</p>
        <h1 className="mt-3 text-display font-semibold text-ink">Secure your place</h1>
        <p className="mt-4 text-lg text-ink-muted">
          A deposit holds your spot. The balance comes later — and your
          international flights aren&apos;t included.
        </p>
      </header>

      {searchParams.canceled && !soldOut && (
        <div className="mt-8 rounded-xl2 border border-clay-500/40 bg-clay-500/5 p-5 text-sm text-clay-600">
          <p className="font-medium">Payment canceled — your place wasn&apos;t reserved.</p>
          <p className="mt-1 text-ink-muted">No charge was made. You can pick up where you left off below whenever you&apos;re ready.</p>
        </div>
      )}

      {soldOut ? (
        <div className="mt-10 rounded-xl2 border border-ink/10 bg-sand-100 p-8 text-center">
          <p className="eyebrow text-clay-600">Fully booked</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink">This departure is sold out</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Every place on these dates has been taken. Other departures may still have space.
          </p>
          <Link
            href={`/experiences/${experience.slug}`}
            className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-ink/90"
          >
            See other dates
          </Link>
        </div>
      ) : (
        <div className="mt-10">
          <BookingFlow experience={experience} departure={departure} />
        </div>
      )}
    </div>
  );
}
