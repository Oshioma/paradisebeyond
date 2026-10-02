import Image from "next/image";
import Link from "next/link";
import type { Brand } from "@/lib/brand/config";
import { hero, img } from "@/lib/images";
import { getAllCategories, getFeaturedExperiences, getMarketplaceExperiences } from "@/lib/data/repository";
import { categoriesWithListings } from "@/lib/data/filter";
import { CategorySlider } from "@/components/offgrid/CategorySlider";
import { ExperienceCard } from "@/components/experience/ExperienceCard";
import { OffGridSearch } from "@/components/offgrid/OffGridSearch";
import { TrustTeaser, TryTheLife } from "@/components/offgrid/HomeStory";
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
          <div className="absolute inset-0 bg-sand-50/75 sm:bg-transparent sm:bg-gradient-to-r sm:from-sand-50/95 sm:via-sand-50/65 sm:via-40% sm:to-sand-50/0 sm:to-70%" />
        </div>

        <div className="container-editorial relative pb-10 pt-14 sm:pb-12 sm:pt-[4.5rem] lg:pt-[5.5rem]">
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
            <p className="mt-4 max-w-md leading-relaxed text-ink animate-fade-up">
              Stay on farms, homesteads and off-grid projects around the world. Food and accommodation included.
            </p>
          </div>

          <div className="mt-8 max-w-5xl sm:mt-12 lg:mt-16 animate-fade-up">
            <OffGridSearch />
            <Link
              href="/experiences"
              className="group mt-4 inline-flex items-center gap-1.5 text-sm text-forest-900 decoration-forest-900/30 underline-offset-4 hover:underline"
            >
              or browse all experiences
              <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
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
          <CategorySlider
            header={
              <div className="max-w-3xl reveal">
                <p className="eyebrow text-forest-700">Find your kind of off-grid</p>
                <h2 className="mt-3 text-headline font-semibold text-ink">Places worth getting your hands dirty for</h2>
                <p className="mt-3 text-ink-muted">Farms, homesteads, eco-projects and communities around the world.</p>
              </div>
            }
            items={kinds.map(({ category: c, count }) => ({
              slug: c.slug,
              name: c.name,
              image: img(c.imageSeed, kinds.length <= 2 ? 1200 : kinds.length <= 4 ? 800 : 520, 680),
              count,
            }))}
          />
        </section>
      )}

      {/* Featured stays — same warm background, no hard break. */}
      <section className="container-editorial pb-14 pt-12 sm:pb-20 sm:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4 reveal">
          <div className="max-w-3xl">
            <p className="eyebrow text-forest-700">Featured stays</p>
            <h2 className="mt-3 text-headline font-semibold text-ink">Live somewhere different for a while.</h2>
            <p className="mt-3 text-ink-muted">What you&apos;ll help with, where you&apos;ll sleep and what you&apos;ll eat — on every card.</p>
          </div>
          {featured.length > 0 && (
            <Link href="/experiences" className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-forest-700">
              View all experiences
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        <div className="mt-8">
          {featured.length > 0 ? (
            <div
              className={cn(
                "grid grid-cols-1 gap-6 sm:grid-cols-2",
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

      {/* Try the life — the deeper reason the marketplace exists. */}
      <TryTheLife lives={kinds.map(({ category: c }) => ({ label: c.name, href: `/categories/${c.slug}` }))} />

      {/* The experience — an editorial split on deep forest. */}
      <section className="bg-forest-900 text-sand-50">
        <div className="container-editorial grid items-center gap-8 py-14 sm:gap-10 sm:py-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-20">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl2 reveal sm:aspect-[4/3] lg:aspect-[5/4]">
            <Image
              src={img("stog-home-how", 1200, 960)}
              alt="Hands in the soil, planting out seedlings"
              fill
              sizes="(max-width: 1024px) 92vw, 46vw"
              className="object-cover"
            />
          </div>
          <div className="reveal">
            <p className="eyebrow text-sand-100/60">The experience</p>
            <p className="mt-5 font-display text-[clamp(2.1rem,3.4vw,3rem)] font-semibold leading-[1.06] tracking-[-0.015em]">
              Don&apos;t just visit.
              <br />
              <span className="text-sand-100/70">Live it.</span>
            </p>
            <div className="mt-8 h-px w-16 bg-earth-400" />
            <p className="mt-8 max-w-lg font-display text-xl italic leading-snug text-sand-100 sm:text-2xl">
              Stay with people doing something different. Help out, share meals, learn skills and become part of the
              place for a while.
            </p>
          </div>
        </div>
      </section>

      {/* How it works — four numbered steps, joined on desktop. */}
      <section id="how-it-works" className="scroll-mt-24 py-14 sm:py-20">
        <div className="container-editorial">
          <div className="mx-auto max-w-3xl text-center reveal">
            <p className="eyebrow text-forest-700">How it works</p>
            <h2 className="mt-3 text-balance text-headline font-semibold text-ink">A simple way to stay, help and learn.</h2>
          </div>
          <div className="relative mt-10 lg:mt-12">
            {/* The thread between the steps (desktop). */}
            <div aria-hidden className="absolute left-[12.5%] right-[12.5%] top-7 hidden border-t border-dashed border-forest-700/30 lg:block" />
            <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {STEPS.map(({ title, body, Icon }, i) => (
                <li
                  key={title}
                  className="relative flex gap-4 rounded-xl2 bg-sand-100 p-5 reveal lg:flex-col lg:items-center lg:bg-transparent lg:p-0 lg:text-center"
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <span className="relative flex h-14 w-14 flex-none items-center justify-center rounded-full border border-forest-700/20 bg-sand-50 text-forest-800 shadow-[0_6px_20px_-12px_rgba(20,35,25,0.5)]">
                    <Icon className="h-6 w-6" />
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-forest-700 text-[0.62rem] font-semibold text-sand-50">
                      {i + 1}
                    </span>
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink lg:mt-5">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-muted lg:mx-auto lg:max-w-[15rem]">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Trust — compact; the detail is on /trust. */}
      <TrustTeaser />

      {/* Host CTA — runs straight into the footer (cancels its top margin). */}
      <section className="relative -mb-24 overflow-hidden">
        <div className="absolute inset-0">
          <Image src={hero("stog-home-host")} alt="A host walking their land at dusk" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-forest-900/90 via-forest-900/80 to-forest-900/55" />
        </div>
        <div className="container-editorial relative grid items-center gap-10 py-16 text-sand-50 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <p className="eyebrow text-sand-100/80 reveal">For hosts</p>
            <h2 className="mt-3 text-display font-semibold reveal">Have land worth experiencing?</h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-sand-100/90 reveal">
              Open your farm, homestead or off-grid project to people who want to help, learn and live differently.
            </p>
            <p className="mt-3 max-w-xl leading-relaxed text-sand-100/80 reveal">
              You decide what guests help with, what you provide and what the stay costs.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4 reveal">
              <Link
                href={brand.hostCta.href}
                className="inline-flex rounded-full bg-sand-50 px-7 py-3.5 text-xs font-medium uppercase tracking-[0.16em] text-forest-800 hover:bg-sand-100"
              >
                {brand.hostCta.label}
              </Link>
              <Link href={brand.hostCta.href} className="group inline-flex items-center gap-1.5 text-sm text-sand-100/85 hover:text-sand-50">
                How hosting works
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
          <ul className="divide-y divide-sand-50/15 rounded-xl2 border border-sand-50/15 bg-forest-900/40 backdrop-blur-sm reveal">
            {hostPoints(brand).map((p) => (
              <li key={p.t} className="p-5 sm:p-6">
                <p className="font-display text-xl font-semibold">{p.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-sand-100/80">{p.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

const EXCHANGE = [
  { eyebrow: "You help", lines: ["A few hours each day", "Helping with the project"], Icon: SproutIcon },
  { eyebrow: "You get", lines: ["Accommodation", "and food included"], Icon: HouseIcon },
  { eyebrow: "You experience", lines: ["A different way of living", "and learn new skills"], Icon: BookIcon },
];

/** The same three facts the /host page leads with — kept short here. */
function hostPoints(brand: Brand) {
  const pct = (brand.fixedCommissionBps ?? 0) / 100;
  return [
    { t: "Your place, your terms", d: "Set the hours, the days, the food and the bed. Travellers see the exchange before they book." },
    { t: "People who want to be there", d: "Travellers come to help, learn and live the way you do." },
    { t: "Simple, transparent money", d: `Charge per day, week or stay — or nothing. We take ${pct}% of paid bookings; free stays cost you nothing.` },
  ];
}

const STEPS = [
  { title: "Find somewhere", body: "Discover farms, homesteads and off-grid projects around the world.", Icon: SearchIcon },
  {
    title: "Request your stay",
    body: "Introduce yourself and see exactly what you'll help with. Nothing is charged until your host says yes.",
    Icon: CalendarIcon,
  },
  {
    title: "Get yourself there",
    body: "You arrange your own journey unless your host includes transfers.",
    Icon: PlaneIcon,
  },
  {
    title: "Live it",
    body: "Stay with your host, help out for a few hours and become part of the place for a while.",
    Icon: SproutIcon,
  },
];
