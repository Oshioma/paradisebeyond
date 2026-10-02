import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { hero } from "@/lib/images";
import { categoriesFor, categoryMarketplace, getCategory, categoryLabel } from "@/lib/data/categories";
import { brandFromParams, type SiteParams } from "@/lib/brand/site";

type Params = SiteParams & { category: string };

/** A category only exists on its own marketplace. */
function loadCategory(params: Params) {
  const brand = brandFromParams(params);
  const c = getCategory(params.category);
  return c && categoryMarketplace(c) === brand.id ? { brand, c } : null;
}
import { getExperiencesByCategory } from "@/lib/data/repository";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { Button } from "@/components/ui/Button";

export async function generateStaticParams({ params }: { params: SiteParams }) {
  return categoriesFor(brandFromParams(params).id).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = loadCategory(params);
  if (!found) return { title: "Category not found" };
  const { c, brand } = found;
  return {
    title: `${categoryLabel(c)} experiences`,
    description: c.description,
    openGraph: { title: `${categoryLabel(c)} · ${brand.name}`, description: c.description, images: [hero(c.imageSeed)] },
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const found = loadCategory(params);
  if (!found) notFound();
  const { c, brand } = found;
  const experiences = await getExperiencesByCategory(c.slug, brand.id);
  const earth = brand.theme === "earth";

  return (
    <>
      <section className="relative flex min-h-[52vh] items-end overflow-hidden">
        <Image src={hero(c.imageSeed)} alt={categoryLabel(c)} fill priority sizes="100vw" className="object-cover" />
        <div className={earth ? "absolute inset-0 bg-gradient-to-t from-forest-900/85 via-forest-900/25 to-forest-900/30" : "absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/30"} />
        <div className="container-editorial relative pb-14 pt-32">
          <p className="eyebrow text-sand-100">{c.tagline}</p>
          <h1 className="mt-3 text-display-lg font-semibold text-sand-50">{categoryLabel(c)}</h1>
          <p className="mt-4 max-w-xl text-lg text-sand-100/90">{c.description}</p>
        </div>
      </section>

      <div className="container-editorial py-16">
        {experiences.length > 0 ? (
          <ExperienceGrid experiences={experiences} priorityCount={3} />
        ) : (
          <div className="rounded-xl2 border border-dashed border-ink/20 py-20 text-center">
            <p className="font-display text-2xl text-ink">New {categoryLabel(c)} {brand.terms.experiences} are on the way.</p>
            <p className="mt-2 text-ink-muted">In the meantime, explore everything else {earth ? "hosts are offering" : "we're running"}.</p>
            <div className="mt-6 flex justify-center">
              <Button href="/experiences" variant="ink">All {brand.terms.experiences}</Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
