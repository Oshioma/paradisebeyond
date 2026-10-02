import Image from "next/image";
import Link from "next/link";
import type { Brand } from "@/lib/brand/config";
import { hero, img } from "@/lib/images";
import { getAllCategories, getFeaturedExperiences, getMarketplaceExperiences } from "@/lib/data/repository";
import { categoriesWithListings } from "@/lib/data/filter";
import { CategorySlider } from "@/components/offgrid/CategorySlider";
import { ExperienceCard } from "@/components/experience/ExperienceCard";
import { OffGridSearch } from "@/components/offgrid/OffGridSearch";
import {
  ArrowRightIcon,
  BookIcon,
  CalendarIcon,
  HouseIcon,
  PlaneIcon,
  SearchIcon,
  SproutIcon,
} from "@/components/offgrid/icons";
import { cn } from "@/lib/utils";

/**
 * Spend Time Off Grid homepage. Same editorial building blocks as Paradise
 * Beyond (full-bleed photography, display serif, generous space) in the
 * forest / earth palette. The search is the hero's one action; the exchange
 * strip right below it explains the model in seconds. Featured stays are real
 * published listings only — no placeholder inventory or invented numbers.
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
      {/* Hero — people living off grid, the search as its one action. */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={hero("stog-home-hero")}
            alt="Life on an off-grid homestead"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[70%_center]"
          />
          {/* Cream wash behind the words: full on phones, from the left on wider screens. */}
          <div className="absolute inset-0 bg-sand-50/75 sm:bg-transparent sm:bg-gradient-to-r sm:from-sand-50/95 sm:via-sand-50/60 sm:via-40% sm:to-sand-50/0 sm:to-70%" />
        </div>

        <div className="container-editorial relative pb-10 pt-14 sm:pb-14 sm:pt-20 lg:pt-24">
          <div className="max-w-xl">
            <h1 className="font-display text-[clamp(2.75rem,6.2vw,5rem)] font-semibold leading-[0.98] tracking-[-0.02em] text-forest-900 animate-fade-up">
              Spend time <br />
              off grid.
            </h1>
            <p className="mt-5 font-display text-xl leading-snug text-forest-900 sm:text-2xl animate-fade-up">
              Stay somewhere extraordinary.
              <br />
              Help out a few hours. Live differently.
            </p>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft animate-fade-up">
              Stay on farms, homesteads and off-grid projects around the world. Food and accommodation included.
            </p>
          </div>

          <div className="mt-8 max-w-5xl sm:mt-10 animate-fade-up">
            <OffGridSearch />
            <Link
              href="/experiences"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full text-sm font-medium text-forest-900 underline underline-offset-4 hover:text-forest-700 sm:bg-sand-50/85 sm:px-4 sm:py-2 sm:no-underline sm:backdrop-blur"
            >
              or browse all experiences <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* The exchange, in one band. */}
      <section aria-label="How the exchange works" className="border-b border-ink/5 bg-sand-100">
        <div className="container-editorial grid divide-y divide-ink/10 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {EXCHANGE.map(({ eyebrow, lines, Icon }) => (
            <div key={eyebrow} className="flex items-center gap-4 py-5 lg:justify-center lg:px-6 lg:py-7">
              <Icon className="h-9 w-9 flex-none text-forest-800 lg:h-11 lg:w-11" />
              <div>
                <p className="text-[0.66rem] font-semibold uppercase tracking-eyebrow text-forest-800">{eyebrow}</p>
                <p className="mt-1 text-sm leading-snug text-ink-soft">
                  {lines[0]}
                  <br />
                  {lines[1]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Find your kind of off-grid — only kinds that have stays, so every
          card leads somewhere; one sideways-scrolling row. */}
      {kinds.length > 0 && (
        <section className="container-editorial pt-14 sm:pt-20">
          <div className="max-w-3xl reveal">
            <p className="eyebrow text-forest-700">Find your kind of off-grid</p>
            <h2 className="mt-3 text-headline font-semibold text-ink">Places worth getting your hands dirty for</h2>
            <p className="mt-3 text-ink-muted">Farms, homesteads, eco-projects and communities around the world.</p>
          </div>
          <div className="mt-8">
            <CategorySlider
              items={kinds.map(({ category: c, count }) => ({
                slug: c.slug,
                name: c.name,
                image: img(c.imageSeed, 400, 480),
                count,
              }))}
            />
          </div>
        </section>
      )}

      {/* Featured stays — same warm background, no hard break. */}
      <section className="container-editorial py-14 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4 reveal">
          <div className="max-w-3xl">
            <p className="eyebrow text-forest-700">Featured stays</p>
            <h2 className="mt-3 text-headline font-semibold text-ink">Live somewhere different for a while.</h2>
          </div>
          {featured.length > 0 && (
            <Link href="/experiences" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-forest-700">
              View all experiences <ArrowRightIcon className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="mt-8">
          {featured.length > 0 ? (
            <div
              className={cn(
                "grid grid-cols-1 gap-5 sm:grid-cols-2",
                featured.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
              )}
            >
              {featured.map((e, i) => (
                <div key={e.slug} className="reveal" style={{ transitionDelay: `${(i % 4) * 70}ms` }}>
                  <ExperienceCard experience={e} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl2 border border-dashed border-forest-700/25 bg-sand-100 px-6 py-16 text-center reveal">
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
      </section>

      {/* What this is (and isn't). */}
      <section className="container-editorial pb-14 sm:pb-20">
        <div className="mx-auto max-w-3xl border-y border-ink/10 py-12 text-center sm:py-16 reveal">
          <p className="font-display text-3xl font-semibold leading-tight text-forest-900 sm:text-4xl">
            This isn&apos;t volunteering.
            <br />
            And it isn&apos;t a hotel.
          </p>
          <p className="mx-auto mt-5 max-w-md font-display text-xl italic leading-snug text-ink-soft sm:text-2xl">
            You&apos;re temporarily joining someone else&apos;s way of life.
          </p>
        </div>
      </section>

      {/* How it works — four steps across. */}
      <section id="how-it-works" className="scroll-mt-24 bg-sand-100 py-14 sm:py-20">
        <div className="container-editorial">
          <div className="text-center reveal">
            <p className="eyebrow text-forest-700">How it works</p>
            <h2 className="mt-3 text-headline font-semibold text-ink">A simple way to stay, contribute and learn.</h2>
          </div>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-0">
            {STEPS.map(({ title, body, Icon }, i) => (
              <li key={title} className="relative flex gap-4 reveal lg:flex-col lg:items-center lg:px-6 lg:text-center" style={{ transitionDelay: `${i * 60}ms` }}>
                <Icon className="h-9 w-9 flex-none text-forest-800 lg:h-11 lg:w-11" />
                <div>
                  <h3 className="font-medium text-ink lg:mt-4">
                    {i + 1}. {title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRightIcon className="absolute -right-2.5 top-3 hidden h-5 w-5 text-ink/30 lg:block" />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Host CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src={hero("stog-home-host")} alt="A host walking their land at dusk" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-forest-800/80" />
        </div>
        <div className="container-editorial relative py-20 text-sand-50 sm:py-28">
          <div className="max-w-2xl">
            <p className="eyebrow text-sand-100/80 reveal">For hosts</p>
            <h2 className="mt-3 text-headline font-semibold reveal">Have land worth experiencing?</h2>
            <p className="mt-5 text-lg leading-relaxed text-sand-100/90 reveal">
              Open your farm, homestead or off-grid project to people who want to help, learn and live differently.
            </p>
            <p className="mt-3 leading-relaxed text-sand-100/80 reveal">
              You decide what guests help with, what you provide and what the stay costs.
            </p>
            <div className="mt-8 reveal">
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

const EXCHANGE = [
  { eyebrow: "You give", lines: ["A few hours each day", "Helping with the project"], Icon: SproutIcon },
  { eyebrow: "You get", lines: ["Accommodation", "and food included"], Icon: HouseIcon },
  { eyebrow: "You experience", lines: ["A different way of living", "and learn new skills"], Icon: BookIcon },
];

const STEPS = [
  { title: "Find somewhere", body: "Discover farms, homesteads and off-grid projects around the world.", Icon: SearchIcon },
  { title: "Book your stay", body: "See exactly what you'll help with and what you'll receive.", Icon: CalendarIcon },
  {
    title: "Get yourself there",
    body: "Travellers arrange and pay for their own transport unless a host includes transfers.",
    Icon: PlaneIcon,
  },
  {
    title: "Live it",
    body: "Stay with your host, help a few hours and become part of the place for a while.",
    Icon: SproutIcon,
  },
];
