import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hero, img, portrait } from "@/lib/images";
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
import { DurationBadge, VerifiedBadge, Badge } from "@/components/ui/Badge";
import { WishlistButton } from "@/components/wishlist/WishlistButton";
import { ShareButton } from "@/components/experience/ShareButton";
import { ReservePanel } from "@/components/experience/ReservePanel";
import { Itinerary } from "@/components/experience/Itinerary";
import { getExperienceReviews } from "@/lib/data/reviews";
import { summarize } from "@/lib/reviews/types";
import { Stars, RatingSummary } from "@/components/reviews/Stars";
import { ReviewList } from "@/components/reviews/ReviewList";
import { FlightsNote } from "@/components/experience/FlightsNote";

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
            {/* This experience is for you if */}
            <Section eyebrow="Is this you?" title="This experience is for you if…">
              <ul className="space-y-3">
                {e.forYouIf.map((line, i) => (
                  <li key={i} className="flex items-start gap-3 text-lg leading-relaxed text-ink-soft">
                    <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-clay-500" />
                    {line}
                  </li>
                ))}
              </ul>
            </Section>

            {/* Story */}
            <Section eyebrow="The experience" title="More than somewhere to stay">
              <div className="space-y-4 text-lg leading-relaxed text-ink-soft">
                {e.story.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </Section>

            {/* Highlights */}
            <Section eyebrow="What you'll experience" title="The moments you'll remember">
              <div className="grid gap-5 sm:grid-cols-2">
                {e.highlights.map((h) => (
                  <div key={h.title} className="reveal overflow-hidden rounded-xl2 bg-sand-100">
                    <div className="relative aspect-[16/10]">
                      <Image
                        src={img(h.imageSeed, 640, 400)}
                        alt={h.title}
                        fill
                        sizes="(max-width: 640px) 90vw, 40vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="p-5">
                      <h4 className="font-display text-lg font-semibold text-ink">{h.title}</h4>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{h.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Your stay */}
            <Section eyebrow="Your stay" title={e.stay.hotels && e.stay.hotels.length > 1 ? "Where you'll stay" : e.stay.property}>
              {e.stay.hotels && e.stay.hotels.length > 1 ? (
                <div className="space-y-4">
                  {e.stay.hotels.map((h) => (
                    <div key={h.name} className="rounded-xl2 border border-ink/10 bg-sand-100 p-5">
                      <h4 className="font-display text-xl font-semibold text-ink">{h.name}</h4>
                      {h.description && <p className="mt-1 leading-relaxed text-ink-soft">{h.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-lg leading-relaxed text-ink-soft">{e.stay.description}</p>
              )}
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {e.stay.imageSeeds.map((s) => (
                  <div key={s} className="relative aspect-square overflow-hidden rounded-xl">
                    <Image src={img(s, 400, 400)} alt="Accommodation" fill sizes="30vw" className="object-cover" />
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2">
                <p className="eyebrow text-ocean-700">Accommodation options</p>
                {[...e.stay.roomTypes].sort((a, b) => b.priceDeltaMinor - a.priceDeltaMinor).map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-ink/10 px-4 py-3">
                    <div>
                      {r.property && <p className="text-[0.62rem] uppercase tracking-eyebrow text-ocean-700">{r.property}</p>}
                      <p className="font-medium text-ink">{r.name}</p>
                      <p className="text-sm text-ink-muted">{r.description}</p>
                    </div>
                    <span className="text-sm text-ink-soft">
                      {r.priceDeltaMinor === 0
                        ? "Included"
                        : `+${formatFrom(r.priceDeltaMinor, e.currency)}`}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            {/* Inclusions / exclusions */}
            <Section eyebrow="The details" title="What's included">
              <div className="grid gap-8 sm:grid-cols-2">
                <ul className="space-y-2.5">
                  {e.inclusions.map((inc) => (
                    <li key={inc} className="flex items-start gap-2.5 text-ink-soft">
                      <CheckIcon /> {inc}
                    </li>
                  ))}
                </ul>
                <div>
                  <ul className="space-y-2.5">
                    {e.exclusions.map((exc) => (
                      <li key={exc} className="flex items-start gap-2.5 text-ink-muted">
                        <CrossIcon /> {exc}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    <FlightsNote />
                  </div>
                </div>
              </div>
            </Section>

            {/* Itinerary */}
            <Section eyebrow="Day by day" title={`Your ${e.duration} days`}>
              <Itinerary days={e.itinerary} />
            </Section>

            {/* Hosts */}
            <Section eyebrow="Your host" title={hosts.length > 1 ? "Your hosts" : "Your host"}>
              <div className="space-y-6">
                {hosts.map((h) => (
                  <Link
                    key={h!.slug}
                    href={`/hosts/${h!.slug}`}
                    className="group flex gap-5 rounded-xl2 bg-sand-100 p-5 transition-colors hover:bg-sand-200/60"
                  >
                    <Image
                      src={portrait(h!.imageSeed)}
                      alt={h!.name}
                      width={96}
                      height={116}
                      className="h-28 w-24 flex-none rounded-xl object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display text-xl font-semibold text-ink">{h!.name}</h4>
                        {h!.verified && <VerifiedBadge />}
                      </div>
                      <p className="text-sm text-ocean-700">{h!.headline}</p>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">{h!.bio}</p>
                      <span className="mt-2 inline-flex text-xs uppercase tracking-eyebrow text-ink group-hover:underline">
                        View profile →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>

            {/* Reviews */}
            <Section eyebrow="Reviews" title={rsum.count > 0 ? "What guests say" : "Reviews"}>
              {rsum.count > 0 && <div className="mb-6"><RatingSummary average={rsum.average} count={rsum.count} /></div>}
              <ReviewList reviews={reviews} />
            </Section>

            {/* Share */}
            <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-8">
              <ShareButton title={e.name} text={e.strapline} label="Share this experience" />
              <WishlistButton slug={e.slug} variant="inline" />
              <span className="text-sm text-ink-muted">Save it, or send it to whoever you&apos;d bring.</span>
            </div>
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

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14 first:mt-0 reveal">
      <p className="eyebrow text-ocean-700">{eyebrow}</p>
      <h2 className="mt-2 text-headline font-semibold text-ink">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="mt-1 h-4 w-4 flex-none text-palm-500" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}
function CrossIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="mt-1 h-4 w-4 flex-none text-clay-500" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
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
