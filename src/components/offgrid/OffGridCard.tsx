import Image from "next/image";
import Link from "next/link";
import type { Experience } from "@/lib/types";
import type { OffGridDetails } from "@/lib/offgrid/types";
import { img } from "@/lib/images";
import { getCategory } from "@/lib/data/categories";
import { WishlistButton } from "@/components/wishlist/WishlistButton";
import {
  accommodationLine,
  contributionLine,
  includedLine,
  mealsLine,
  minStayLine,
  priceLine,
} from "@/lib/offgrid/summary";

/**
 * Spend Time Off Grid listing card. Built for scanning on a phone: price,
 * place, contribution, minimum stay, food and bed are all visible without
 * opening the listing.
 */
export function OffGridCard({
  experience: e,
  priority = false,
}: {
  experience: Experience & { offGrid: OffGridDetails };
  priority?: boolean;
}) {
  const o = e.offGrid;
  const category = getCategory(e.categorySlugs[0]);
  return (
    <Link href={`/experiences/${e.slug}`} className="group block focus:outline-none">
      <article className="flex h-full flex-col">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl2 bg-sand-200 sm:aspect-[4/5]">
          <Image
            src={img(e.heroImageSeed, 900, 1125)}
            alt={e.name}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1200px) 45vw, 30vw"
            priority={priority}
            className="object-cover transition-transform duration-[1.2s] ease-out-soft group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-900/45 via-transparent to-transparent" />
          {e.sample && (
            <span className="absolute left-3 top-11 rounded-full bg-earth-500 px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-eyebrow text-sand-50">
              Sample listing
            </span>
          )}
          {category && (
            <span className="absolute left-3 top-3 rounded-full bg-sand-50/90 px-3 py-1 text-[0.64rem] font-medium uppercase tracking-eyebrow text-forest-800 backdrop-blur">
              {category.name}
            </span>
          )}
          <div className="absolute right-3 top-3">
            <WishlistButton slug={e.slug} />
          </div>
          <p className="absolute bottom-3 left-3 rounded-full bg-forest-800/90 px-3 py-1 text-sm font-semibold text-sand-50">
            {priceLine(o, e.currency)}
          </p>
        </div>

        <div className="flex flex-1 flex-col pt-3.5">
          <p className="text-sm text-ink-muted">{e.location}</p>
          <h3 className="mt-0.5 font-display text-xl font-semibold leading-snug text-ink transition-colors group-hover:text-forest-700">
            {e.name}
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[0.8rem] text-ink-soft">
            <Fact label="Contribution">{contributionLine(o)}</Fact>
            <Fact label="Stay">{minStayLine(o)}</Fact>
            <Fact label="Accommodation">{accommodationLine(o)}</Fact>
            <Fact label="Food">{mealsLine(o)}</Fact>
          </dl>
          <p className="mt-3 border-t border-ink/10 pt-3 text-xs font-medium uppercase tracking-eyebrow text-forest-700">
            {includedLine(o)}
          </p>
        </div>
      </article>
    </Link>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="sr-only">{label}</dt>
      <dd className="truncate">{children}</dd>
    </div>
  );
}
