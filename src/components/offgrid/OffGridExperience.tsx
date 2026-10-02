import Image from "next/image";
import Link from "next/link";
import type { Experience, Host } from "@/lib/types";
import type { OffGridDetails } from "@/lib/offgrid/types";
import { DIFFICULTY_LABEL, OFF_GRID_FACILITIES } from "@/lib/offgrid/types";
import type { Review } from "@/lib/reviews/types";
import { summarize } from "@/lib/reviews/types";
import { hero, img, portrait } from "@/lib/images";
import { getCategory } from "@/lib/data/categories";
import {
  accommodationLine,
  contributionLine,
  mealsLine,
  minStayLine,
  priceLine,
} from "@/lib/offgrid/summary";
import { PhotoGallery } from "@/components/experience/PhotoGallery";
import { OwnerEditButton } from "@/components/experience/OwnerEditButton";
import { ShareButton } from "@/components/experience/ShareButton";
import { WishlistButton } from "@/components/wishlist/WishlistButton";
import { VerifiedBadge } from "@/components/ui/Badge";
import { RatingSummary, Stars } from "@/components/reviews/Stars";
import { ReviewList } from "@/components/reviews/ReviewList";
import { OffGridReservePanel } from "@/components/offgrid/OffGridReservePanel";

/**
 * A Spend Time Off Grid listing. Ordered to answer, in turn: where am I
 * staying, what will I do, how much do I contribute, what do I get, what will
 * I learn, what does it cost, how long can I stay and who is my host.
 * Reuses the shared gallery, reviews, wishlist, share and owner-edit pieces.
 */
export function OffGridExperience({
  e,
  hosts,
  reviews,
}: {
  e: Experience & { offGrid: OffGridDetails };
  hosts: Host[];
  reviews: Review[];
}) {
  const o = e.offGrid;
  const rsum = summarize(reviews);
  const category = getCategory(e.categorySlugs[0]);
  const host = hosts[0];
  // The hero already leads the page; "In pictures" shows the rest.
  const photos = e.gallerySeeds.map((s, i) => ({
    thumb: img(s, 1200, 900),
    full: img(s, 1800, 1350),
    alt: `${e.name} — photo ${i + 1}`,
  }));
  const stayPhotos = (e.stay.hotels?.[0]?.images ?? []).filter(Boolean).map((url, i) => ({
    thumb: url,
    full: url,
    alt: `Where you'll stay — photo ${i + 1}`,
  }));
  const facilities = OFF_GRID_FACILITIES.filter((f) => o.facilities.includes(f.key));
  const tasks = o.contribution.typicalTasks.filter(Boolean);
  const learn = o.contribution.skillsYouCanLearn.filter(Boolean);
  const bring = o.practical.whatToBring.filter(Boolean);

  return (
    <article>
      {/* Gallery */}
      <section className="relative">
        <div className="relative h-[52vh] min-h-[320px] w-full overflow-hidden sm:h-[64vh]">
          <Image src={hero(e.heroImageSeed)} alt={e.name} fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-900/50 via-transparent to-transparent" />
        </div>
      </section>

      <div className="container-editorial pt-8 sm:pt-10">
        {e.sample && (
          <div className="mb-6 rounded-xl2 border border-earth-500/40 bg-earth-500/10 p-4 text-sm text-ink-soft">
            <span className="font-semibold text-ink">Sample listing.</span> This stay shows how listings on Spend Time
            Off Grid work. It isn&apos;t a real place and can&apos;t be booked.
          </div>
        )}
        <OwnerEditButton hostSlugs={e.hostSlugs} retreatDraftId={e.retreatDraftId} />
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-eyebrow text-forest-700">
          {category && <Link href={`/categories/${category.slug}`} className="hover:underline">{category.name}</Link>}
          {e.verified && <VerifiedBadge />}
        </div>
        <h1 className="mt-3 max-w-4xl text-display font-semibold text-ink">{e.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-ink-soft">
          <span>{e.location}</span>
          {host && (
            <Link href={`/hosts/${host.slug}`} className="hover:text-ink">
              Hosted by <span className="font-medium text-ink">{host.name}</span>
            </Link>
          )}
          {rsum.count > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Stars value={rsum.average} /> {rsum.average.toFixed(1)} · {rsum.count} {rsum.count === 1 ? "review" : "reviews"}
            </span>
          ) : (
            <span className="text-sm text-ink-muted">No reviews yet</span>
          )}
        </div>

        {/* The exchange, at a glance */}
        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl2 border border-ink/10 bg-ink/10 sm:grid-cols-3 lg:grid-cols-6">
          <Glance label="Contribution" value={o.contribution.hoursPerDay ? `${o.contribution.hoursPerDay} hrs/day` : "No set hours"} />
          <Glance label="Days" value={o.contribution.daysPerWeek ? `${o.contribution.daysPerWeek} days/week` : "Flexible"} />
          <Glance label="Stay" value={minStayLine(o)} />
          <Glance label="Sleep" value={accommodationLine(o)} />
          <Glance label="Food" value={mealsLine(o)} />
          <Glance label="Price" value={priceLine(o, e.currency)} strong />
        </dl>
      </div>

      <div className="container-editorial py-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
          <div className="max-w-2xl">
            {e.story.filter(Boolean).length > 0 && (
              <Section eyebrow="The experience" title={e.strapline || "What it's like"}>
                <div className="space-y-4 text-lg leading-relaxed text-ink-soft">
                  {e.story.filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </Section>
            )}

            <Section eyebrow="What you'll contribute" title={contributionLine(o)}>
              {o.contribution.description && <p className="text-lg leading-relaxed text-ink-soft">{o.contribution.description}</p>}
              {tasks.length > 0 && (
                <>
                  <p className="mt-6 text-sm font-medium text-ink">Typical tasks</p>
                  <ul className="mt-2 space-y-2">{tasks.map((t) => <Bullet key={t}>{t}</Bullet>)}</ul>
                </>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                <Chip>{DIFFICULTY_LABEL[o.contribution.physicalDifficulty]}</Chip>
                {o.contribution.skillsRequired.filter(Boolean).length === 0 ? (
                  <Chip>No experience needed</Chip>
                ) : (
                  o.contribution.skillsRequired.filter(Boolean).map((s) => <Chip key={s}>Needs: {s}</Chip>)
                )}
              </div>
            </Section>

            {(learn.length > 0 || e.highlights.length > 0) && (
              <Section eyebrow="What you'll learn" title="Skills and moments to take home">
                {learn.length > 0 && <ul className="space-y-2">{learn.map((t) => <Bullet key={t}>{t}</Bullet>)}</ul>}
                {e.highlights.length > 0 && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {e.highlights.map((h) => (
                      <div key={h.title} className="rounded-xl2 bg-sand-100 p-5">
                        <h3 className="font-display text-lg font-semibold text-ink">{h.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{h.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            <Section eyebrow="Where you'll stay" title={accommodationLine(o)}>
              {o.stay.description && <p className="text-lg leading-relaxed text-ink-soft">{o.stay.description}</p>}
              {stayPhotos.length > 0 && <PhotoGallery photos={stayPhotos} label="Accommodation photos" />}
              <p className="mt-4 text-sm text-ink-muted">{minStayLine(o)}{o.stay.maxNights ? "" : " · stay longer by arrangement within the host's dates"}</p>
            </Section>

            <Section eyebrow="Food" title={o.food.mealsIncluded ? mealsLine(o) + " included" : "Self-catering"}>
              {o.food.description && <p className="text-lg leading-relaxed text-ink-soft">{o.food.description}</p>}
              {o.food.dietaryOptions.filter(Boolean).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">{o.food.dietaryOptions.filter(Boolean).map((d) => <Chip key={d}>{d}</Chip>)}</div>
              )}
            </Section>

            {(o.lifeOffGrid || facilities.length > 0) && (
              <Section eyebrow="Life off grid" title="Power, water and signal">
                {o.lifeOffGrid && <p className="text-lg leading-relaxed text-ink-soft">{o.lifeOffGrid}</p>}
                {facilities.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">{facilities.map((f) => <Chip key={f.key}>{f.label}</Chip>)}</div>
                )}
              </Section>
            )}

            {photos.length > 0 && (
              <Section eyebrow="In pictures" title="A glimpse of the place">
                <PhotoGallery photos={photos} layout="grid" label={`${e.name} photos`} />
              </Section>
            )}

            {hosts.length > 0 && (
              <Section eyebrow="Meet your host" title={hosts.length > 1 ? "Your hosts" : host!.name}>
                <div className="space-y-5">
                  {hosts.map((h) => (
                    <Link key={h.slug} href={`/hosts/${h.slug}`} className="group flex gap-5 rounded-xl2 bg-sand-100 p-5">
                      <Image src={portrait(h.imageSeed)} alt={h.name} width={96} height={116} className="h-28 w-24 flex-none rounded-xl object-cover" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-xl font-semibold text-ink">{h.name}</p>
                          {h.verified && <VerifiedBadge />}
                        </div>
                        {h.headline && <p className="text-sm text-forest-700">{h.headline}</p>}
                        <p className="mt-1 text-xs text-ink-muted">Joined {h.since}</p>
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">{h.bio}</p>
                        <span className="mt-2 inline-flex text-xs uppercase tracking-eyebrow text-ink group-hover:underline">View profile →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            <Section eyebrow="Getting there" title="You arrange your own way there">
              <div className="space-y-3 text-ink-soft">
                {o.practical.gettingThere && <p className="text-lg leading-relaxed">{o.practical.gettingThere}</p>}
                <dl className="grid gap-3 sm:grid-cols-2">
                  {o.practical.nearestAirport && <Fact label="Nearest airport" value={o.practical.nearestAirport} />}
                  <Fact label="Transfers" value={o.practical.transfersAvailable ? "Host can arrange transfers" : "Not included — travel is on you"} />
                </dl>
              </div>
            </Section>

            {bring.length > 0 && (
              <Section eyebrow="What to bring" title="Pack for the place">
                <ul className="grid gap-2 sm:grid-cols-2">{bring.map((t) => <Bullet key={t}>{t}</Bullet>)}</ul>
              </Section>
            )}

            <Section eyebrow="Good to know" title="Practical details">
              <dl className="grid gap-3 sm:grid-cols-2">
                <Fact label="Children" value={o.practical.childrenAllowed ? "Welcome" : "Not suitable"} />
                <Fact label="Pets" value={o.practical.petsAllowed ? "Allowed" : "Not allowed"} />
                {o.practical.languages.filter(Boolean).length > 0 && <Fact label="Languages" value={o.practical.languages.filter(Boolean).join(", ")} />}
                {o.practical.accessibility && <Fact label="Accessibility" value={o.practical.accessibility} />}
              </dl>
              {o.practical.notes && <p className="mt-4 leading-relaxed text-ink-soft">{o.practical.notes}</p>}
              {o.houseRules && <Detail title="House & project rules" body={o.houseRules} />}
              {o.cancellationPolicy && <Detail title="Cancellation policy" body={o.cancellationPolicy} />}
            </Section>

            <Section eyebrow="Reviews" title={rsum.count > 0 ? "What travellers say" : "Reviews"}>
              {rsum.count > 0 && <div className="mb-6"><RatingSummary average={rsum.average} count={rsum.count} /></div>}
              <ReviewList reviews={reviews} />
            </Section>

            <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-8">
              <ShareButton title={e.name} text={e.strapline} label="Share this stay" />
              <WishlistButton slug={e.slug} variant="inline" />
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <OffGridReservePanel offGrid={o} departures={e.departures} currency={e.currency} sample={e.sample} />
          </aside>
        </div>
      </div>
    </article>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14 first:mt-0 reveal">
      <p className="eyebrow text-forest-700">{eyebrow}</p>
      <h2 className="mt-2 text-headline font-semibold text-ink">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Glance({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="bg-sand-50 px-4 py-4">
      <dt className="text-[0.62rem] font-semibold uppercase tracking-eyebrow text-ink-muted">{label}</dt>
      <dd className={strong ? "mt-1 font-display text-lg font-semibold text-forest-700" : "mt-1 text-[0.95rem] font-medium text-ink"}>{value}</dd>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-ink-soft">
      <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-earth-500" />
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-forest-700/20 bg-forest-50 px-3 py-1 text-xs text-forest-800">{children}</span>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink/10 px-4 py-3">
      <dt className="text-[0.62rem] font-semibold uppercase tracking-eyebrow text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}

function Detail({ title, body }: { title: string; body: string }) {
  return (
    <details className="group mt-4 rounded-xl2 border border-ink/10 bg-sand-100">
      <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-ink-muted transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <p className="whitespace-pre-line px-4 pb-4 leading-relaxed text-ink-soft">{body}</p>
    </details>
  );
}
