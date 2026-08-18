import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hero, img } from "@/lib/images";
import { formatFrom } from "@/lib/money";
import { formatDateRange } from "@/lib/utils";
import {
  getAllExperiences,
  getExperienceBySlug,
  upcomingDeparture,
} from "@/lib/data/repository";
import { getCategory, categoryLabel } from "@/lib/data/categories";
import { getDestination } from "@/lib/data/destinations";
import { getHost } from "@/lib/data/repository";
import type { Host } from "@/lib/types";
import { DurationBadge, VerifiedBadge, Badge } from "@/components/ui/Badge";
import { OwnerEditButton } from "@/components/experience/OwnerEditButton";
import { ReservePanel } from "@/components/experience/ReservePanel";
import { ExperienceBody } from "@/components/experience/ExperienceBody";
import { getExperienceReviews } from "@/lib/data/reviews";
import { summarize } from "@/lib/reviews/types";
import { Stars } from "@/components/reviews/Stars";

export async function generateStaticParams() {
  const all = await getAllExperiences();
  return all.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const e = await getExperienceBySlug(params.slug);
  if (!e) return { title: "Experience not found" };
  const next = upcomingDeparture(e);
  const desc = `${e.duration}-day ${e.location} experience. ${e.strapline} From ${formatFrom(e.priceFromMinor, e.currency)} pp.`;
  return {
    title: e.name,
    description: desc,
    openGraph: {
      title: `${e.name} · ${e.duration} Days in ${e.location}`,
      description: desc,
      // OG/Twitter images come from the branded opengraph-image.tsx card.
    },
    twitter: {
      card: "summary_large_image",
      title: `${e.name} · Paradise Beyond`,
      description: desc,
    },
    alternates: { canonical: `/experiences/${e.slug}` },
    other: next ? { "pb:next-departure": next.startDate } : {},
  };
}

export default async function ExperiencePage({
  params,
}: {
  params: { slug: string };
}) {
  const e = await getExperienceBySlug(params.slug);
  if (!e) notFound();

  const destination = getDestination(e.destinationSlug);
  const next = upcomingDeparture(e);
  const hosts = (await Promise.all(e.hostSlugs.map((s) => getHost(s)))).filter(Boolean);
  const categories = e.categorySlugs.map(getCategory).filter(Boolean);
  const reviews = await getExperienceReviews(params.slug);
  const rsum = summarize(reviews);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: e.name,
    description: e.strapline,
    touristType: categories.map((c) => c!.name),
    offers: {
      "@type": "Offer",
      price: (e.priceFromMinor / 100).toFixed(2),
      priceCurrency: e.currency,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative flex min-h-[80vh] items-end overflow-hidden">
        <Image
          src={hero(e.heroImageSeed)}
          alt={e.name}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-ink/25" />
        <div className="container-editorial relative w-full pb-12 pt-32">
          <OwnerEditButton hostSlugs={e.hostSlugs} retreatDraftId={e.retreatDraftId} />
          <div className="flex flex-wrap items-center gap-2">
            <DurationBadge duration={e.duration} />
            {e.verified && <VerifiedBadge />}
            {categories[0] && (
              <Badge tone="light">{categoryLabel(categories[0]!)}</Badge>
            )}
          </div>
          <h1 className="mt-4 max-w-4xl text-display font-semibold text-sand-50">{e.name}</h1>
          <p className="mt-3 max-w-2xl text-lg text-sand-100/90">{e.strapline}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-sand-100/90">
            <span className="inline-flex items-center gap-1.5">
              <PinIcon /> {e.location}
            </span>
            {next && (
              <span className="inline-flex items-center gap-1.5">
                <CalIcon /> Next {formatDateRange(next.startDate, next.endDate)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              From {formatFrom(e.priceFromMinor, e.currency)} pp
            </span>
            {rsum.count > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Stars value={rsum.average} /> {rsum.average.toFixed(1)} ({rsum.count})
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Body + sticky reserve */}
      <div className="container-editorial py-14 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
          <div className="max-w-2xl">
            <ExperienceBody e={e} hosts={hosts as Host[]} reviews={reviews} />
          </div>

          {/* Sticky reserve */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <ReservePanel departures={e.departures} currency={e.currency} />
            {destination && (
              <Link
                href={`/destinations/${destination.slug}`}
                className="mt-4 flex items-center gap-3 rounded-xl2 border border-ink/10 p-4 transition-colors hover:border-ink/30"
              >
                <div className="relative h-14 w-14 flex-none overflow-hidden rounded-lg">
                  <Image src={img(destination.imageSeed, 120, 120)} alt={destination.name} fill sizes="56px" className="object-cover" />
                </div>
                <div>
                  <p className="text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">Destination</p>
                  <p className="font-display text-lg font-semibold text-ink">{destination.name}</p>
                  <p className="text-xs text-ink-muted">{destination.country}</p>
                </div>
              </Link>
            )}
            <p className="mt-4 px-2 text-center text-xs text-ink-muted">
              Max group size {e.maxGroupSize} · small by design
            </p>
          </aside>
        </div>
      </div>
    </article>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 21s-7-6.3-7-11a7 7 0 1114 0c0 4.7-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
function CalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}
