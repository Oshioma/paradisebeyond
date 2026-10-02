import Image from "next/image";
import Link from "next/link";
import type { Brand } from "@/lib/brand/config";
import { hero, img } from "@/lib/images";
import { getAllCategories, getFeaturedExperiences, getMarketplaceExperiences } from "@/lib/data/repository";
import { categoriesWithListings } from "@/lib/data/filter";
import { CategorySlider } from "@/components/offgrid/CategorySlider";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { OffGridSearch } from "@/components/offgrid/OffGridSearch";

/**
 * Spend Time Off Grid homepage. Same editorial building blocks as Paradise
 * Beyond (full-bleed photography, display serif, generous space) in the
 * forest / earth palette. Featured stays are real published listings only —
 * no placeholder inventory or invented numbers.
 */
export async function OffGridHome({ brand }: { brand: Brand }) {
  const [categories, featured, listings] = await Promise.all([
    getAllCategories(brand.id),
    getFeaturedExperiences(6, brand.id),
    getMarketplaceExperiences(brand.id),
  ]);
  const kinds = categoriesWithListings(categories, listings);

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[88vh] items-end overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={hero("stog-home-hero")}
            alt="Morning over a hillside homestead with vegetable beds and a wooden cabin"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-900/90 via-forest-900/35 to-forest-900/25" />
        </div>

        <div className="container-editorial relative pb-10 pt-28 sm:pb-16">
          <p className="eyebrow text-sand-100 animate-fade-up">Stay somewhere real</p>
          <h1 className="mt-4 max-w-4xl text-display-lg font-semibold text-sand-50 animate-fade-up">
            Spend time off grid.
          </h1>
          <p className="mt-4 font-display text-2xl text-sand-100 sm:text-3xl animate-fade-up">
            Contribute. Learn. Live differently.
          </p>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-sand-100/90 animate-fade-up">
            Find farms, homesteads, eco-projects and communities where your stay
            includes food, a place to sleep and a few hours contributing each day.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row animate-fade-up">
            <Link
              href="/experiences"
              className="inline-flex items-center justify-center rounded-full bg-sand-50 px-7 py-3.5 text-xs font-medium uppercase tracking-[0.16em] text-forest-800 transition-colors hover:bg-sand-100"
            >
              Explore experiences
            </Link>
            <Link
              href={brand.hostCta.href}
              className="inline-flex items-center justify-center rounded-full border border-sand-50/50 px-7 py-3.5 text-xs font-medium uppercase tracking-[0.16em] text-sand-50 transition-colors hover:bg-sand-50 hover:text-forest-800"
            >
              {brand.hostCta.label}
            </Link>
          </div>
          <div className="mt-10 max-w-5xl animate-fade-up">
            <OffGridSearch />
          </div>
        </div>
      </section>

      {/* Find your kind of off-grid — only kinds that have stays, so every
          card leads somewhere; one sideways-scrolling row. */}
      {kinds.length > 0 && (
        <section className="container-editorial py-16 sm:py-20">
          <div className="max-w-2xl reveal">
            <p className="eyebrow text-forest-700">Find your kind of off-grid</p>
            <h2 className="mt-3 text-headline font-semibold text-ink">Places worth getting your hands dirty for</h2>
            <p className="mt-4 text-lg text-ink-muted">Not a hotel. Not a job listing. A real stay with a real exchange.</p>
          </div>
          <div className="mt-10">
            <CategorySlider
              items={kinds.map(({ category: c, count }) => ({
                slug: c.slug,
                name: c.name,
                tagline: c.tagline,
                image: img(c.imageSeed, 700, 875),
                count,
              }))}
            />
          </div>
        </section>
      )}

      {/* Featured stays */}
      <section className="bg-sand-100 py-20 sm:py-28">
        <div className="container-editorial">
          <div className="flex flex-wrap items-end justify-between gap-4 reveal">
            <div className="max-w-xl">
              <p className="eyebrow text-forest-700">Featured stays</p>
              <h2 className="mt-3 text-headline font-semibold text-ink">Somewhere to spend a few weeks</h2>
            </div>
            {featured.length > 0 && (
              <Link href="/experiences" className="link-underline text-sm font-medium text-ink">
                See all stays →
              </Link>
            )}
          </div>

          <div className="mt-12">
            {featured.length > 0 ? (
              <ExperienceGrid experiences={featured} priorityCount={0} />
            ) : (
              <div className="rounded-xl2 border border-dashed border-forest-700/25 bg-sand-50 px-6 py-16 text-center reveal">
                <p className="font-display text-2xl text-ink">The first hosts are listing their land now.</p>
                <p className="mx-auto mt-3 max-w-md text-ink-muted">
                  Have a farm, homestead or off-grid project? Be one of the first places travellers find here.
                </p>
                <Link
                  href={brand.hostCta.href}
                  className="mt-6 inline-flex rounded-full bg-forest-700 px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-forest-800"
                >
                  {brand.hostCta.label}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 container-editorial py-20 sm:py-28">
        <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="max-w-xl reveal">
              <p className="eyebrow text-forest-700">How it works</p>
              <h2 className="mt-3 text-headline font-semibold text-ink">A simple exchange, made clear up front</h2>
            </div>
            <ol className="mt-10 space-y-8">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-5 reveal" style={{ transitionDelay: `${i * 60}ms` }}>
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-forest-700/30 font-display text-lg font-semibold text-forest-700">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">{s.title}</h3>
                    <p className="mt-1.5 max-w-prose leading-relaxed text-ink-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-10 font-display text-2xl text-forest-700 reveal">Stay. Contribute. Learn. Live differently.</p>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl2 reveal">
            <Image
              src={img("stog-home-how", 1000, 1250)}
              alt="Hands in the soil, planting out seedlings"
              fill
              sizes="(max-width: 1024px) 90vw, 45vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Host CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src={hero("stog-home-host")} alt="A host walking their land at dusk" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-forest-800/80" />
        </div>
        <div className="container-editorial relative py-24 text-sand-50 sm:py-32">
          <div className="max-w-2xl">
            <p className="eyebrow text-sand-100/80 reveal">For hosts</p>
            <h2 className="mt-3 text-headline font-semibold reveal">Have land worth experiencing?</h2>
            <p className="mt-5 text-lg leading-relaxed text-sand-100/90 reveal">
              Open your farm, homestead or off-grid project to people who want to
              contribute, learn and live differently. You decide what guests do,
              what you provide and what the stay costs.
            </p>
            <div className="mt-9 reveal">
              <Link
                href={brand.hostCta.href}
                className="inline-flex rounded-full bg-sand-50 px-7 py-3.5 text-xs font-medium uppercase tracking-[0.16em] text-forest-800 hover:bg-sand-100"
              >
                {brand.hostCta.label}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const STEPS = [
  { title: "Find somewhere", body: "Discover farms, homesteads and off-grid projects around the world." },
  { title: "Book your stay", body: "See exactly what you'll contribute and what you'll receive." },
  {
    title: "Get yourself there",
    body: "Travellers arrange and pay for their own transport unless a host explicitly includes transfers.",
  },
  { title: "Live it", body: "Stay with your host, contribute a few hours and become part of the place for a while." },
];
