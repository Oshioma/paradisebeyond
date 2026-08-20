import Image from "next/image";
import Link from "next/link";
import { img, portrait } from "@/lib/images";
import { formatFrom } from "@/lib/money";
import type { Experience, Host } from "@/lib/types";
import type { Review } from "@/lib/reviews/types";
import { summarize } from "@/lib/reviews/types";
import { VerifiedBadge } from "@/components/ui/Badge";
import { Itinerary } from "@/components/experience/Itinerary";
import { RatingSummary } from "@/components/reviews/Stars";
import { ReviewList } from "@/components/reviews/ReviewList";
import { FlightsNote } from "@/components/experience/FlightsNote";
import { ShareButton } from "@/components/experience/ShareButton";
import { WishlistButton } from "@/components/wishlist/WishlistButton";

/**
 * The full editorial body of an experience — every section, in one place — so
 * the public experience page and a host's microsite show identical content and
 * can never drift. Pass `accent` (a brand colour) to tint the section eyebrows
 * and accents on a host microsite; omit it for the default marketplace look.
 */
export function ExperienceBody({
  e,
  hosts,
  reviews,
  accent,
}: {
  e: Experience;
  hosts: Host[];
  reviews: Review[];
  accent?: string;
}) {
  const rsum = summarize(reviews);
  const eyebrowClass = accent ? "eyebrow" : "eyebrow text-ocean-700";
  const eyebrowStyle = accent ? { color: accent } : undefined;
  const dotStyle = accent ? { backgroundColor: accent } : undefined;

  function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
    return (
      <section className="mt-14 first:mt-0 reveal">
        <p className={eyebrowClass} style={eyebrowStyle}>{eyebrow}</p>
        <h2 className="mt-2 text-headline font-semibold text-ink">{title}</h2>
        <div className="mt-6">{children}</div>
      </section>
    );
  }

  return (
    <>
      {e.forYouIf.filter(Boolean).length > 0 && (
        <Section eyebrow="Is this you?" title="This experience is for you if…">
          <ul className="space-y-3">
            {e.forYouIf.filter(Boolean).map((line, i) => (
              <li key={i} className="flex items-start gap-3 text-lg leading-relaxed text-ink-soft">
                <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-clay-500" style={dotStyle} />
                {line}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {e.story.filter(Boolean).length > 0 && (
        <Section eyebrow="The experience" title="More than somewhere to stay">
          <div className="space-y-4 text-lg leading-relaxed text-ink-soft">
            {e.story.filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </Section>
      )}

      {e.highlights.length > 0 && (
        <Section eyebrow="What you'll experience" title="The moments you'll remember">
          <div className="grid gap-5 sm:grid-cols-2">
            {e.highlights.map((h) => (
              <div key={h.title} className="reveal overflow-hidden rounded-xl2 bg-sand-100">
                <div className="relative aspect-[16/10]">
                  <Image src={img(h.imageSeed, 640, 400)} alt={h.title} fill sizes="(max-width: 640px) 90vw, 40vw" className="object-cover" />
                </div>
                <div className="p-5">
                  <h4 className="font-display text-lg font-semibold text-ink">{h.title}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{h.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {e.gallerySeeds.length > 0 && (
        <Section eyebrow="A glimpse" title="In pictures">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {e.gallerySeeds.map((s, i) => (
              <div key={s} className="relative aspect-square overflow-hidden rounded-xl bg-sand-200">
                <Image src={img(s, 500, 500)} alt={`${e.name} ${i + 1}`} fill sizes="(max-width: 768px) 45vw, 30vw" className="object-cover" />
              </div>
            ))}
          </div>
        </Section>
      )}

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
        {e.stay.imageSeeds.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {e.stay.imageSeeds.map((s) => (
              <div key={s} className="relative aspect-square overflow-hidden rounded-xl">
                <Image src={img(s, 400, 400)} alt="Accommodation" fill sizes="30vw" className="object-cover" />
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 space-y-2">
          <p className={eyebrowClass} style={eyebrowStyle}>Accommodation options · {e.duration} nights</p>
          {[...e.stay.roomTypes].sort((a, b) => a.priceDeltaMinor - b.priceDeltaMinor).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-ink/10 px-4 py-3">
              <div>
                {r.property && <p className="text-[0.62rem] uppercase tracking-eyebrow text-ocean-700" style={eyebrowStyle}>{r.property}</p>}
                <p className="font-medium text-ink">{r.name}</p>
                <p className="text-sm text-ink-muted">{r.description}</p>
              </div>
              <span className="text-sm text-ink-soft">
                {r.priceDeltaMinor === 0 ? "Included" : `+${formatFrom(r.priceDeltaMinor, e.currency)}`}
              </span>
            </div>
          ))}
        </div>
      </Section>

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
            <div className="mt-5"><FlightsNote /></div>
          </div>
        </div>
      </Section>

      <Section eyebrow="Day by day" title={`Your ${e.duration} days`}>
        <Itinerary days={e.itinerary} />
      </Section>

      {hosts.length > 0 && (
        <Section eyebrow="Your host" title={hosts.length > 1 ? "Your hosts" : "Your host"}>
          <div className="space-y-6">
            {hosts.map((h) => (
              <div key={h.slug} className="rounded-xl2 bg-sand-100 p-5">
                <Link href={`/hosts/${h.slug}`} className="group flex gap-5">
                  <Image src={portrait(h.imageSeed)} alt={h.name} width={96} height={116} className="h-28 w-24 flex-none rounded-xl object-cover" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-xl font-semibold text-ink">{h.name}</h4>
                      {h.verified && <VerifiedBadge />}
                    </div>
                    {h.headline && <p className="text-sm text-ocean-700" style={eyebrowStyle}>{h.headline}</p>}
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">{h.bio}</p>
                    <span className="mt-2 inline-flex text-xs uppercase tracking-eyebrow text-ink group-hover:underline">View profile →</span>
                  </div>
                </Link>
                {h.socials?.filter((s) => s.label && s.href).length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {h.socials.filter((s) => s.label && s.href).map((s) => (
                      <a key={s.href} href={s.href} target="_blank" rel="noreferrer" style={accent ? { borderColor: accent, color: accent } : undefined} className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-eyebrow hover:opacity-80 ${accent ? "" : "border-ink/15 text-ink-soft"}`}>
                        {s.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section eyebrow="Reviews" title={rsum.count > 0 ? "What guests say" : "Reviews"}>
        {rsum.count > 0 && <div className="mb-6"><RatingSummary average={rsum.average} count={rsum.count} /></div>}
        <ReviewList reviews={reviews} />
      </Section>

      {e.communityGuidelines?.trim() && (
        <details className="group mt-14 rounded-xl2 border border-ink/10 bg-sand-100 reveal">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block text-[0.66rem] uppercase tracking-eyebrow" style={eyebrowStyle}>Good to know</span>
              <span className="mt-0.5 block font-display text-xl font-semibold text-ink">Community guidelines</span>
            </span>
            <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none text-ink-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="whitespace-pre-line px-5 pb-5 leading-relaxed text-ink-soft">{e.communityGuidelines.trim()}</div>
        </details>
      )}

      <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-8">
        <ShareButton title={e.name} text={e.strapline} label="Share this experience" />
        <WishlistButton slug={e.slug} variant="inline" />
        <span className="text-sm text-ink-muted">Save it, or send it to whoever you&apos;d bring.</span>
      </div>
    </>
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
