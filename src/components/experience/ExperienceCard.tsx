import Image from "next/image";
import Link from "next/link";
import type { Experience } from "@/lib/types";
import { img } from "@/lib/images";
import { micrositeUrl } from "@/lib/siteUrl";
import { formatFrom } from "@/lib/money";
import { formatDateRange } from "@/lib/utils";
import { upcomingDeparture } from "@/lib/data/helpers";
import { getCategory, categoryLabel } from "@/lib/data/categories";
import { getHost } from "@/lib/data/hosts";
import { DurationBadge, VerifiedBadge } from "@/components/ui/Badge";
import { WishlistButton } from "@/components/wishlist/WishlistButton";

export function ExperienceCard({
  experience,
  priority = false,
  linkMode = "marketplace",
}: {
  experience: Experience;
  priority?: boolean;
  /** "marketplace" → the /experiences page (your brand); "microsite" → the
   *  retreat's own branded microsite/subdomain. */
  linkMode?: "marketplace" | "microsite";
}) {
  const e = experience;
  const next = upcomingDeparture(e);
  const primaryCategory = getCategory(e.categorySlugs[0]);
  // Prefer the host info resolved at read time (covers DB hosts); fall back to
  // the static seed lookup for the demo catalogue.
  const seedHost = getHost(e.hostSlugs[0]);
  const host = e.hostName
    ? { name: e.hostName, imageSeed: e.hostImageSeed ?? seedHost?.imageSeed ?? `host-${e.hostSlugs[0] ?? ""}` }
    : seedHost;
  const scarce = next && next.spacesRemaining > 0 && next.spacesRemaining <= 5;

  const inner = (
      <article className="flex h-full flex-col">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl2 bg-sand-200">
          <Image
            src={img(e.heroImageSeed, 900, 1125)}
            alt={e.name}
            fill
            sizes="(max-width: 768px) 90vw, (max-width: 1200px) 45vw, 30vw"
            priority={priority}
            className="object-cover transition-transform duration-[1.2s] ease-out-soft group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent opacity-70" />

          <div className="absolute left-4 top-4 flex items-center gap-2">
            <DurationBadge duration={e.duration} />
            {e.verified && <VerifiedBadge />}
          </div>
          <div className="absolute right-4 top-4">
            <WishlistButton slug={e.slug} />
          </div>

          {scarce && (
            <div className="absolute bottom-4 left-4">
              <span className="rounded-full bg-clay-500/95 px-3 py-1 text-[0.66rem] font-medium uppercase tracking-eyebrow text-sand-50">
                {next!.spacesRemaining} {next!.spacesRemaining === 1 ? "space" : "spaces"} left
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col pt-4">
          <p className="eyebrow text-ocean-700">
            {primaryCategory ? categoryLabel(primaryCategory) : "Experience"} · {e.location}
          </p>
          <h3 className="mt-1.5 font-display text-xl font-semibold leading-snug text-ink transition-colors group-hover:text-ocean-700">
            {e.name}
          </h3>

          {next && (
            <p className="mt-2 text-sm text-ink-muted">
              Next · {formatDateRange(next.startDate, next.endDate)}
            </p>
          )}

          <div className="mt-4 flex items-end justify-between border-t border-ink/10 pt-4">
            <div>
              <p className="text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">From</p>
              <p className="font-display text-lg font-semibold text-ink">
                {formatFrom(e.priceFromMinor, e.currency)}
                <span className="ml-1 text-xs font-normal text-ink-muted">pp</span>
              </p>
            </div>
            {host && (
              <div className="flex items-center gap-2">
                <Image
                  src={img(host.imageSeed, 64, 64)}
                  alt={host.name}
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full object-cover"
                />
                <span className="text-xs text-ink-muted">{host.name.split(" ")[0]}</span>
              </div>
            )}
          </div>
        </div>
      </article>
  );

  // Microsite link is a different origin (subdomain) → plain <a>. Marketplace is
  // same-origin → <Link> for smooth client navigation + prefetch.
  return linkMode === "microsite" ? (
    <a href={micrositeUrl(e.slug, e.subdomain)} className="group block focus:outline-none">{inner}</a>
  ) : (
    <Link href={`/experiences/${e.slug}`} className="group block focus:outline-none">{inner}</Link>
  );
}
