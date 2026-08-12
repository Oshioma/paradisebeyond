import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { hero } from "@/lib/images";
import { CATEGORIES, getCategory, categoryLabel } from "@/lib/data/categories";
import { getExperiencesByCategory } from "@/lib/data/repository";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { Button } from "@/components/ui/Button";

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const c = getCategory(params.category);
  if (!c) return { title: "Category not found" };
  return {
    title: `${categoryLabel(c)} experiences`,
    description: c.description,
    openGraph: { title: `${categoryLabel(c)} · Paradise Beyond`, description: c.description, images: [hero(c.imageSeed)] },
  };
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const c = getCategory(params.category);
  if (!c) notFound();
  const experiences = await getExperiencesByCategory(c.slug);

  return (
    <>
      <section className="relative flex min-h-[52vh] items-end overflow-hidden">
        <Image src={hero(c.imageSeed)} alt={categoryLabel(c)} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/30" />
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
            <p className="font-display text-2xl text-ink">New {categoryLabel(c)} experiences are on the way.</p>
            <p className="mt-2 text-ink-muted">In the meantime, explore everything else we&apos;re running.</p>
            <div className="mt-6 flex justify-center">
              <Button href="/experiences" variant="ink">All experiences</Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
