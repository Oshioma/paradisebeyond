import Image from "next/image";
import Link from "next/link";
import { img, hero } from "@/lib/images";
import { Button } from "@/components/ui/Button";
import { CategoryCard } from "@/components/home/CategoryCard";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { FlightsNote } from "@/components/experience/FlightsNote";
import {
  getAllCategories,
  getFeaturedExperiences,
} from "@/lib/data/repository";

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    getAllCategories(),
    getFeaturedExperiences(6),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[92vh] items-end overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={hero("home-hero-zanzibar")}
            alt="A dhow on turquoise water off the coast of Zanzibar"
            fill
            priority
            sizes="100vw"
            className="animate-kenburns object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-ink/30" />
        </div>

        <div className="container-editorial relative pb-16 pt-32 sm:pb-24">
          <p className="eyebrow text-sand-100 animate-fade-up">Paradise Beyond · Zanzibar</p>
          <h1 className="mt-4 max-w-4xl text-display-lg font-semibold text-sand-50 animate-fade-up">
            Come for more than a holiday.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-sand-100/90 animate-fade-up">
            Curated 7 &amp; 14-day experiences in extraordinary places. Bring
            yourself — we&apos;ll take care of everything on the ground.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row animate-fade-up">
            <Button href="/experiences" size="lg" variant="primary">
              Explore Experiences
            </Button>
            <Button href="/host" size="lg" variant="outline" className="border-sand-50/50 text-sand-50 hover:bg-sand-50 hover:text-ink">
              Host a Retreat
            </Button>
          </div>
        </div>
      </section>

      {/* What do you want to experience? */}
      <section className="container-editorial py-20 sm:py-28">
        <div className="max-w-2xl reveal">
          <p className="eyebrow text-ocean-700">Begin with a feeling</p>
          <h2 className="mt-3 text-headline font-semibold text-ink">
            What do you want to experience?
          </h2>
          <p className="mt-4 text-ink-muted">
            Don&apos;t search for a room. Choose the shape of the days you want,
            and we&apos;ll show you where they happen.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c, i) => (
            <div key={c.slug} className="reveal" style={{ transitionDelay: `${(i % 5) * 60}ms` }}>
              <CategoryCard category={c} />
            </div>
          ))}
        </div>
      </section>

      {/* Choose your escape — 7 / 14 */}
      <section className="bg-ink py-20 text-sand-50 sm:py-28">
        <div className="container-editorial">
          <div className="max-w-xl reveal">
            <p className="eyebrow text-sand-100/70">Choose your escape</p>
            <h2 className="mt-3 text-headline font-semibold">
              How long do you want to disappear?
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <EscapeCard
              href="/experiences?duration=7"
              seed="escape-7"
              days="7 Days"
              title="A week away from ordinary."
              copy="Short, accessible escapes. Long enough to properly switch off, arrive as a stranger and leave with a warm little group of friends."
            />
            <EscapeCard
              href="/experiences?duration=14"
              seed="escape-14"
              days="14 Days"
              title="Go deeper. Stay longer. Come back different."
              copy="Deeper retreats and immersive journeys. Give yourself the fortnight it actually takes to change something."
            />
          </div>
        </div>
      </section>

      {/* Featured experiences */}
      <section className="container-editorial py-20 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-4 reveal">
          <div className="max-w-xl">
            <p className="eyebrow text-ocean-700">This season in Zanzibar</p>
            <h2 className="mt-3 text-headline font-semibold text-ink">
              Experiences worth crossing an ocean for
            </h2>
          </div>
          <Link href="/experiences" className="link-underline text-sm font-medium text-ink">
            View all experiences →
          </Link>
        </div>

        <div className="mt-12">
          <ExperienceGrid experiences={featured} priorityCount={3} />
        </div>
      </section>

      {/* Editorial band + flights note */}
      <section className="relative overflow-hidden bg-sand-100">
        <div className="container-editorial grid items-center gap-12 py-20 md:grid-cols-2 sm:py-24">
          <div className="reveal">
            <p className="eyebrow text-ocean-700">The Paradise Beyond difference</p>
            <h2 className="mt-3 text-headline font-semibold text-ink">
              You&apos;re not booking a room. You&apos;re choosing a fortnight of your life.
            </h2>
            <p className="mt-5 max-w-prose text-ink-muted">
              Every Paradise Beyond experience is a complete thing — place,
              people, accommodation, activities and story, woven together by a
              host who knows the ground. The value isn&apos;t the bed. It&apos;s
              everything that happens around it.
            </p>
            <div className="mt-8">
              <FlightsNote />
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl2 reveal">
            <Image
              src={img("home-editorial", 1000, 1250)}
              alt="Morning light over a Zanzibar beach"
              fill
              sizes="(max-width: 768px) 90vw, 45vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Host CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src={hero("home-host")} alt="A host welcoming guests" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-ocean-700/80" />
        </div>
        <div className="container-editorial relative py-24 text-center text-sand-50 sm:py-32">
          <p className="eyebrow text-sand-100/80 reveal">Host a Retreat</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-headline font-semibold reveal">
            Bring the experience. We&apos;ll help you bring the people.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sand-100/90 reveal">
            Yoga teachers, chefs, dive centres, artists, farmers and guides — if
            you can create something extraordinary, we&apos;ll help you fill it.
          </p>
          <div className="mt-9 flex justify-center reveal">
            <Button href="/host" size="lg" variant="primary">
              Apply to Host
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function EscapeCard({
  href,
  seed,
  days,
  title,
  copy,
}: {
  href: string;
  seed: string;
  days: string;
  title: string;
  copy: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[22rem] flex-col justify-end overflow-hidden rounded-xl2 reveal"
    >
      <Image
        src={img(seed, 1100, 800)}
        alt={days}
        fill
        sizes="(max-width: 768px) 90vw, 45vw"
        className="object-cover transition-transform duration-[1.4s] ease-out-soft group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
      <div className="relative p-8">
        <p className="font-display text-3xl font-semibold text-sand-50">{days}</p>
        <p className="mt-2 font-display text-xl text-sand-50/95">{title}</p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-sand-100/80">{copy}</p>
        <span className="mt-5 inline-flex text-xs uppercase tracking-eyebrow text-sand-50">
          Explore {days} →
        </span>
      </div>
    </Link>
  );
}
