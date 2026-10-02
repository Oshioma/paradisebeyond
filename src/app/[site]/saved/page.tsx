import type { Metadata } from "next";
import { getMarketplaceExperiences } from "@/lib/data/repository";
import { brandFromParams, type SiteParams } from "@/lib/brand/site";
import { SavedList } from "@/components/wishlist/SavedList";

export function generateMetadata({ params }: { params: SiteParams }): Metadata {
  const brand = brandFromParams(params);
  return {
    title: `My saved ${brand.terms.experiences}`,
    description: `The ${brand.terms.experiences} you've saved on ${brand.name}.`,
    robots: { index: false },
  };
}

export default async function SavedPage({ params }: { params: SiteParams }) {
  const brand = brandFromParams(params);
  // Only this marketplace's listings — a heart saved on the other site's
  // listing never surfaces here.
  const all = await getMarketplaceExperiences(brand.id);

  return (
    <div className="container-editorial py-16 sm:py-20">
      <header className="max-w-2xl">
        <p className="eyebrow text-ocean-700">Your collection</p>
        <h1 className="mt-3 text-display font-semibold text-ink">My saved {brand.terms.experiences}</h1>
        <p className="mt-4 text-lg text-ink-muted">
          The trips you&apos;re dreaming about. Come back when you&apos;re ready to choose your dates.
        </p>
      </header>
      <div className="mt-12">
        <SavedList all={all} />
      </div>
    </div>
  );
}
