import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getExperienceBySlug, getAllExperiences, getHost } from "@/lib/data/repository";
import { subdomainLabel, siteUrl } from "@/lib/siteUrl";
import type { Experience, Host } from "@/lib/types";
import { hero } from "@/lib/images";
import { formatFrom } from "@/lib/money";
import { getCategory, categoryLabel } from "@/lib/data/categories";
import { VerifiedBadge } from "@/components/ui/Badge";
import { OwnerEditButton } from "@/components/experience/OwnerEditButton";
import { ReservePanel } from "@/components/experience/ReservePanel";
import { ExperienceBody } from "@/components/experience/ExperienceBody";
import { getExperienceReviews } from "@/lib/data/reviews";

export const dynamic = "force-dynamic";

const DEFAULT_BRAND = "#B4633B";

/** Resolve by exact slug, the host's own custom domain, a custom vanity
 *  subdomain, or the hyphen-free slug (middleware passes the request Host for
 *  custom domains, so a full domain also lands here). */
async function resolveExperience(param: string): Promise<Experience | undefined> {
  const exact = await getExperienceBySlug(param);
  if (exact) return exact;
  const all = await getAllExperiences();
  const domain = param.toLowerCase().replace(/^www\./, "");
  const byDomain = all.find(
    (e) => e.customDomain && e.customDomain.toLowerCase().replace(/^www\./, "") === domain,
  );
  if (byDomain) return byDomain;
  const label = subdomainLabel(param);
  return (
    all.find((e) => e.subdomain && subdomainLabel(e.subdomain) === label) ??
    all.find((e) => subdomainLabel(e.slug) === label)
  );
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const e = await resolveExperience(params.slug);
  if (!e) return { title: "Retreat" };
  const base = siteUrl();
  const url = `${base}/experiences/${e.slug}`;
  // Reuse the main page's branded share card, and canonicalise to the one
  // authoritative URL so the subdomain / path / main page aren't seen as
  // duplicate content.
  const ogImage = `${base}/experiences/${e.slug}/opengraph-image`;
  return {
    title: `${e.name} · ${e.location}`,
    description: e.strapline,
    alternates: { canonical: url },
    openGraph: { title: `${e.name} · ${e.location}`, description: e.strapline, url, images: [ogImage] },
    twitter: { card: "summary_large_image", title: `${e.name} · Paradise Beyond`, description: e.strapline, images: [ogImage] },
  };
}

export default async function MicrositePage({ params }: { params: { slug: string } }) {
  const e = await resolveExperience(params.slug);
  if (!e) notFound();

  const hosts = (await Promise.all(e.hostSlugs.map((s) => getHost(s)))).filter(Boolean) as Host[];
  const brand = hosts[0]?.brandColor || DEFAULT_BRAND;
  const logoUrl = hosts[0]?.logoUrl;
  const tagline = hosts[0]?.tagline;
  const category = getCategory(e.categorySlugs[0]);
  const reviews = await getExperienceReviews(e.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: e.name,
    description: e.strapline,
    touristType: e.categorySlugs.map((s) => getCategory(s)?.name).filter(Boolean),
    provider: hosts[0] ? { "@type": "Organization", name: hosts[0].name } : undefined,
    offers: {
      "@type": "Offer",
      price: (e.priceFromMinor / 100).toFixed(2),
      priceCurrency: e.currency,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="min-h-screen bg-sand-50 text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Minimal branded top bar (no marketplace nav). */}
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-sand-50/90 backdrop-blur">
        <div className="container-editorial flex items-center justify-between gap-3 py-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={e.name} className="h-8 w-auto max-w-[180px] object-contain" />
          ) : (
            <span className="truncate font-display text-lg font-semibold text-ink">{e.name}</span>
          )}
          <a href="#reserve" style={{ backgroundColor: brand }} className="flex-none rounded-full px-4 py-2 text-[0.62rem] uppercase tracking-eyebrow text-sand-50">
            Reserve
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[72vh] items-end overflow-hidden">
        <Image src={hero(e.heroImageSeed)} alt={e.name} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent" />
        <div className="container-editorial relative w-full pb-14 pt-24 text-sand-50">
          {/* Owner-only "Edit this retreat" — renders nothing for guests. */}
          <OwnerEditButton hostSlugs={e.hostSlugs} retreatDraftId={e.retreatDraftId} />
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow text-sand-100/90">{category ? categoryLabel(category) : "Retreat"} · {e.location}</p>
            {e.verified && <VerifiedBadge />}
          </div>
          <h1 className="mt-3 max-w-3xl text-display-lg font-semibold">{e.name}</h1>
          <p className="mt-3 max-w-xl text-lg text-sand-100/90">{e.strapline}</p>
          {tagline && <p className="mt-1 max-w-xl italic text-sand-100/80">{tagline}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a href="#reserve" style={{ backgroundColor: brand }} className="rounded-full px-7 py-3.5 text-sm uppercase tracking-[0.16em] text-sand-50 shadow-soft">
              Reserve your place
            </a>
            <span className="text-sand-100/90">{e.duration} days · from {formatFrom(e.priceFromMinor, e.currency)} pp</span>
          </div>
        </div>
      </section>

      {/* Full experience content (identical to the main site) + branded reserve. */}
      <div className="container-editorial grid gap-12 py-16 lg:grid-cols-[1fr_360px]">
        <div className="max-w-2xl">
          <ExperienceBody e={e} hosts={hosts} reviews={reviews} accent={brand} />
        </div>
        <aside id="reserve" className="scroll-mt-24 lg:sticky lg:top-20 lg:self-start">
          <ReservePanel departures={e.departures} currency={e.currency} accent={brand} />
        </aside>
      </div>

      <footer className="border-t border-ink/10 py-8 text-center text-xs text-ink-muted">
        <a href={siteUrl()} className="hover:text-ink">Powered by Paradise Beyond</a>
      </footer>
    </div>
  );
}
