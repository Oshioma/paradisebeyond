import Image from "next/image";
import Link from "next/link";
import type { Experience } from "@/lib/types";
import type { OffGridDetails } from "@/lib/offgrid/types";
import { img } from "@/lib/images";
import { getCategory } from "@/lib/data/categories";
import { WishlistButton } from "@/components/wishlist/WishlistButton";
import { BedIcon, MealIcon, SproutIcon } from "@/components/offgrid/icons";
import { accommodationLine, cardPrice, contributionLine, mealsLine, minStayLine } from "@/lib/offgrid/summary";

/**
 * Spend Time Off Grid listing card. Reads top to bottom like a travel listing:
 * where, what, then the exchange — help, bed, food — each on its own line with
 * a small icon, and the price last. Only real listing data is shown (no
 * ratings unless genuine reviews exist; none are rendered here).
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
  const { amount, unit } = cardPrice(o, e.currency);
  return (
    <Link href={`/experiences/${e.slug}`} className="group block h-full focus:outline-none">
      <article className="flex h-full flex-col overflow-hidden rounded-xl2 border border-ink/10 bg-sand-50 shadow-[0_10px_30px_-22px_rgba(20,35,25,0.5)] transition-shadow group-hover:shadow-[0_18px_40px_-22px_rgba(20,35,25,0.55)] group-focus-visible:ring-2 group-focus-visible:ring-forest-700">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand-200">
          <Image
            src={img(e.heroImageSeed, 900, 675)}
            alt={e.name}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw"
            priority={priority}
            className="object-cover transition-transform duration-[1.2s] ease-out-soft group-hover:scale-[1.04]"
          />
          {(category || e.sample) && (
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              {category && (
                <span className="rounded-full bg-sand-50/90 px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-eyebrow text-forest-800 backdrop-blur">
                  {category.name}
                </span>
              )}
              {e.sample && (
                <span className="rounded-full bg-earth-500 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-eyebrow text-sand-50">
                  Sample listing
                </span>
              )}
            </div>
          )}
          <div className="absolute right-3 top-3">
            <WishlistButton slug={e.slug} />
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <p className="text-[0.7rem] font-medium uppercase tracking-eyebrow text-forest-700">{e.location}</p>
          <h3 className="mt-1.5 font-display text-xl font-semibold leading-snug text-ink transition-colors group-hover:text-forest-700">
            {e.name}
          </h3>
          {e.hostName && <p className="mt-1 text-sm text-ink-muted">Hosted by {e.hostName}</p>}
          <ul className="mt-4 space-y-2 text-[0.88rem] text-ink-soft">
            <Fact icon={<SproutIcon className="h-4 w-4" />} label="Help">{contributionLine(o)}</Fact>
            <Fact icon={<BedIcon className="h-4 w-4" />} label="Accommodation">{accommodationLine(o)}</Fact>
            <Fact icon={<MealIcon className="h-4 w-4" />} label="Food">{mealsLine(o)}</Fact>
          </ul>
          <div className="flex-1" />
          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-ink/10 pt-3.5">
            {unit ? (
              <p className="text-ink">
                <span className="font-display text-xl font-semibold">{amount}</span>
                <span className="text-sm text-ink-muted">/{unit}</span>
              </p>
            ) : (
              <p className="font-semibold text-forest-700">{amount}</p>
            )}
            <p className="text-xs text-ink-muted">{minStayLine(o)}</p>
          </div>
        </div>
      </article>
    </Link>
  );
}

function Fact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-2.5">
      <span className="flex-none text-forest-700">{icon}</span>
      <span className="sr-only">{label}: </span>
      <span className="truncate">{children}</span>
    </li>
  );
}
