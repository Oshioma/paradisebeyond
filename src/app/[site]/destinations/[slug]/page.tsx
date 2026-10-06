import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { hero } from "@/lib/images";
import { DESTINATIONS, getDestination } from "@/lib/data/destinations";
import { getExperiencesByDestination } from "@/lib/data/repository";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { FlightsNote } from "@/components/experience/FlightsNote";
import { brandFromParams, type SiteParams } from "@/lib/brand/site";

type Params = SiteParams & { slug: string };

// Destinations are a Paradise Beyond concept; other marketplaces have none.
export async function generateStaticParams({ params }: { params: SiteParams }) {
  return params.site === "paradise-beyond" ? DESTINATIONS.map((d) => ({ slug: d.slug })) : [];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = brandFromParams(params).id === "paradise-beyond" ? getDestination(params.slug) : undefined;
  if (!d) return { title: "Destination not found" };
  return {
    title: `${d.name} experiences`,
    description: d.summary,
    openGraph: { title: `${d.name} · Paradise Beyond`, description: d.summary, images: [hero(d.imageSeed)] },
  };
}

export default async function DestinationPage({ params }: { params: Params }) {
  const brand = brandFromParams(params);
  const d = brand.id === "paradise-beyond" ? getDestination(params.slug) : undefined;
  if (!d) notFound();
  const experiences = await getExperiencesByDestination(d.slug, brand.id);

  return (
    <>
      <section className="relative flex min-h-[60vh] items-end overflow-hidden">
        <Image src={hero(d.imageSeed)} alt={d.name} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/30" />
        <div className="container-editorial relative pb-14 pt-32">
          <p className="eyebrow text-sand-100">{d.country}{d.region ? ` · ${d.region}` : ""}</p>
          <h1 className="mt-3 text-display-lg font-semibold text-sand-50">{d.name}</h1>
          <p className="mt-4 max-w-xl text-lg text-sand-100/90">{d.summary}</p>
        </div>
      </section>

      <div className="container-editorial py-16">
        <div className="max-w-prose">
          <p className="text-lg leading-relaxed text-ink-soft">{d.description}</p>
        </div>
        <div className="mt-8 max-w-2xl">
          <FlightsNote place={d.name} />
        </div>

        <div className="mt-14">
          <p className="eyebrow text-ocean-700">Experiences here</p>
          <h2 className="mt-2 text-headline font-semibold text-ink">{experiences.length} ways to experience {d.name}</h2>
          <div className="mt-10">
            <ExperienceGrid experiences={experiences} priorityCount={3} />
          </div>
        </div>
      </div>
    </>
  );
}
