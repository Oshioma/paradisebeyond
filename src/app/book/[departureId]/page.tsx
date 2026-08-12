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

export default async function BookingPage({ params }: { params: { departureId: string } }) {
  const all = await getAllExperiences();
  const found = findByDeparture(all, params.departureId);
  if (!found) notFound();
  const { experience, departure } = found;

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
      <div className="mt-10">
        <BookingFlow experience={experience} departure={departure} />
      </div>
    </div>
  );
}
