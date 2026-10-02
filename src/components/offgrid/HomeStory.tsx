import Image from "next/image";
import Link from "next/link";
import { img } from "@/lib/images";
import { ArrowRightIcon } from "@/components/offgrid/icons";

/**
 * Editorial homepage sections for Spend Time Off Grid: "Try the life" and the
 * compact trust teaser (the detail lives on /trust).
 */

export interface LifeLink {
  label: string;
  href: string;
}

/**
 * Try the life before you change your life. `lives` is the hook for a future
 * "Lives you can try" list; today it's fed by the real categories that have
 * stays, so every link leads somewhere and no new taxonomy is needed yet.
 */
export function TryTheLife({ lives = [] }: { lives?: LifeLink[] }) {
  return (
    <section className="bg-sand-100">
      <div className="container-editorial grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="reveal">
          <p className="eyebrow text-forest-700">Try another way of living</p>
          <h2 className="mt-3 max-w-xl font-display text-[clamp(2rem,3.6vw,3.1rem)] font-semibold leading-[1.06] tracking-[-0.015em] text-ink">
            Try the life before you change your life.
          </h2>
          <p className="mt-6 max-w-[34rem] font-display text-xl italic leading-snug text-forest-900 sm:text-[1.35rem]">
            Maybe you&apos;ve wondered what it would be like to grow your own food, live on a farm, build a home from natural
            materials, join a small community, live with less, sail away — or simply step outside the life you know.
          </p>
          <div className="mt-5 max-w-[34rem] space-y-4 leading-relaxed text-ink-soft">
            <p>
              Spend Time Off Grid gives you a chance to experience that life for a while — not from a hotel or a tour, but by
              actually becoming part of it.
            </p>
            <p>
              Stay for a week, a month or longer. Help out, learn from people already doing it, and discover what you love,
              what you don&apos;t, and whether this could be a life you&apos;d want for yourself.
            </p>
          </div>
          {lives.length > 0 && (
            <div className="mt-8">
              <p className="text-[0.66rem] font-semibold uppercase tracking-eyebrow text-ink-muted">Lives you can try</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {lives.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="inline-flex rounded-full border border-forest-700/25 bg-sand-50 px-4 py-1.5 text-sm text-forest-900 transition-colors hover:border-forest-700 hover:bg-forest-700 hover:text-sand-50"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl2 reveal sm:aspect-[4/3] lg:aspect-[5/6]">
          <Image
            src={img("stog-home-try", 1100, 1300)}
            alt="A wooden cabin among tall pines, with a hammock strung outside"
            fill
            sizes="(max-width: 1024px) 92vw, 44vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

/** Compact trust teaser — the detail is on /trust. */
export function TrustTeaser() {
  return (
    <section className="container-editorial pb-14 sm:pb-20">
      <div className="grid gap-8 rounded-xl2 border border-forest-700/15 bg-sand-100 p-6 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:p-12 reveal">
        <div>
          <p className="eyebrow text-forest-700">Trust & safety</p>
          <h2 className="mt-3 font-display text-[clamp(1.9rem,3vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.01em] text-ink">
            Strangers at first.
            <br />
            <span className="text-forest-700">Not by the time you arrive.</span>
          </h2>
        </div>
        <div className="space-y-4 leading-relaxed text-ink-soft">
          <p>
            Staying on someone&apos;s land is more personal than booking a hotel, so hosts and travellers should get to know each
            other before a stay begins.
          </p>
          <p>
            Profiles, messages and a proper introduction come first. Before confirming a stay, both sides should understand who
            they&apos;re meeting, what the experience involves and what each expects from the other.
          </p>
          <p>No one should feel pressured to accept a stay. Either person can decide it doesn&apos;t feel like the right fit.</p>
          <Link href="/trust" className="group inline-flex items-center gap-1.5 pt-1 text-sm font-medium text-forest-800 hover:text-forest-700">
            How we keep stays safer
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
