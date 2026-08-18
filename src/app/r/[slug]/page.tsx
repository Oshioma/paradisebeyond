import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getExperienceBySlug, getAllExperiences, getHost } from "@/lib/data/repository";
import { subdomainLabel } from "@/lib/siteUrl";
import type { Experience } from "@/lib/types";
import { hero, img, portrait } from "@/lib/images";
import { formatFrom } from "@/lib/money";
import { getCategory, categoryLabel } from "@/lib/data/categories";
import { ReservePanel } from "@/components/experience/ReservePanel";
import { Itinerary } from "@/components/experience/Itinerary";
import { getExperienceReviews } from "@/lib/data/reviews";
import { summarize } from "@/lib/reviews/types";
import { RatingSummary } from "@/components/reviews/Stars";
import { ReviewList } from "@/components/reviews/ReviewList";

export const dynamic = "force-dynamic";

const DEFAULT_BRAND = "#B4633B";

/** Resolve by the exact slug, or by the hyphen-free subdomain label. */
async function resolveExperience(param: string): Promise<Experience | undefined> {
  const exact = await getExperienceBySlug(param);
  if (exact) return exact;
  const label = subdomainLabel(param);
  return (await getAllExperiences()).find((e) => subdomainLabel(e.slug) === label);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const e = await resolveExperience(params.slug);
  if (!e) return { title: "Retreat" };
  return { title: `${e.name} · ${e.location}`, description: e.strapline };
}

export default async function MicrositePage({ params }: { params: { slug: string } }) {
  const e = await resolveExperience(params.slug);
  if (!e) notFound();

  const host = e.hostSlugs[0] ? await getHost(e.hostSlugs[0]) : undefined;
  const brand = host?.brandColor || DEFAULT_BRAND;
  const category = getCategory(e.categorySlugs[0]);
  const reviews = await getExperienceReviews(params.slug);
  const rsum = summarize(reviews);
  const socials = (host?.socials ?? []).filter((s) => s.label && s.href);

  return (
    <div className="min-h-screen bg-sand-50 text-ink">
      {/* Minimal branded top bar (no marketplace nav). */}
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-sand-50/90 backdrop-blur">
        <div className="container-editorial flex items-center justify-between py-3">
          <span className="font-display text-lg font-semibold text-ink">{e.name}</span>
          <a href="#reserve" style={{ backgroundColor: brand }} className="rounded-full px-4 py-2 text-[0.62rem] uppercase tracking-eyebrow text-sand-50">
            Reserve
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[72vh] items-end overflow-hidden">
        <Image src={hero(e.heroImageSeed)} alt={e.name} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent" />
        <div className="container-editorial relative w-full pb-14 pt-24 text-sand-50">
          <p className="eyebrow" style={{ color: "#fff" }}>{category ? categoryLabel(category) : "Retreat"} · {e.location}</p>
          <h1 className="mt-3 max-w-3xl text-display-lg font-semibold">{e.name}</h1>
          <p className="mt-3 max-w-xl text-lg text-sand-100/90">{e.strapline}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a href="#reserve" style={{ backgroundColor: brand }} className="rounded-full px-7 py-3.5 text-sm uppercase tracking-[0.16em] text-sand-50 shadow-soft">
              Reserve your place
            </a>
            <span className="text-sand-100/90">{e.duration} days · from {formatFrom(e.priceFromMinor, e.currency)} pp</span>
          </div>
        </div>
      </section>

      <div className="container-editorial grid gap-12 py-16 lg:grid-cols-[1fr_360px]">
        <div className="space-y-14">
          {e.story.filter(Boolean).length > 0 && (
            <Section brand={brand} eyebrow="The experience">
              <div className="space-y-4 text-lg leading-relaxed text-ink-soft">
                {e.story.filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </Section>
          )}

          {e.highlights.length > 0 && (
            <Section brand={brand} eyebrow="Signature moments">
              <div className="grid gap-4 sm:grid-cols-2">
                {e.highlights.map((h) => (
                  <div key={h.title} className="overflow-hidden rounded-xl2 border border-ink/10 bg-sand-50">
                    <div className="relative aspect-[16/10] bg-sand-200">
                      <Image src={img(h.imageSeed, 640, 400)} alt={h.title} fill sizes="(max-width:768px) 90vw, 40vw" className="object-cover" />
                    </div>
                    <div className="p-4">
                      <p className="font-medium text-ink">{h.title}</p>
                      <p className="mt-1 text-sm text-ink-muted">{h.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {e.gallerySeeds.length > 0 && (
            <Section brand={brand} eyebrow="A glimpse">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {e.gallerySeeds.map((s, i) => (
                  <div key={s} className="relative aspect-square overflow-hidden rounded-xl bg-sand-200">
                    <Image src={img(s, 500, 500)} alt={`${e.name} ${i + 1}`} fill sizes="(max-width:768px) 45vw, 30vw" className="object-cover" />
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section brand={brand} eyebrow="Day by day">
            <Itinerary days={e.itinerary} />
          </Section>

          {host && (
            <Section brand={brand} eyebrow="Your host">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <Image src={portrait(host.imageSeed)} alt={host.name} width={120} height={144} className="h-36 w-30 flex-none rounded-xl2 object-cover" />
                <div>
                  <p className="font-display text-2xl font-semibold text-ink">{host.name}</p>
                  {host.headline && <p className="text-ink-muted">{host.headline}</p>}
                  {host.bio && <p className="mt-3 max-w-prose leading-relaxed text-ink-soft">{host.bio}</p>}
                  {socials.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {socials.map((s) => (
                        <a key={s.href} href={s.href} target="_blank" rel="noreferrer" style={{ borderColor: brand, color: brand }} className="rounded-full border px-4 py-1.5 text-xs uppercase tracking-eyebrow hover:opacity-80">
                          {s.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}

          <Section brand={brand} eyebrow="Reviews">
            {rsum.count > 0 ? (
              <>
                <RatingSummary average={rsum.average} count={rsum.count} />
                <div className="mt-6"><ReviewList reviews={reviews} /></div>
              </>
            ) : (
              <p className="text-ink-muted">No reviews yet — be one of the first.</p>
            )}
          </Section>
        </div>

        {/* Reserve */}
        <aside id="reserve" className="lg:sticky lg:top-20 lg:self-start scroll-mt-24">
          <ReservePanel departures={e.departures} currency={e.currency} accent={brand} />
        </aside>
      </div>

      <footer className="border-t border-ink/10 py-8 text-center text-xs text-ink-muted">
        <Link href={`/experiences/${e.slug}`} className="hover:text-ink">Powered by Paradise Beyond</Link>
      </footer>
    </div>
  );
}

function Section({ eyebrow, brand, children }: { eyebrow: string; brand: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="eyebrow mb-4" style={{ color: brand }}>{eyebrow}</p>
      {children}
    </section>
  );
}
