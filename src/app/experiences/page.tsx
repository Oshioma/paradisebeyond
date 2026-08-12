import type { Metadata } from "next";
import { Suspense } from "react";
import { FilterBar } from "@/components/experience/FilterBar";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { FlightsNote } from "@/components/experience/FlightsNote";
import {
  filterExperiences,
  getAllCategories,
  getAllDestinations,
} from "@/lib/data/repository";
import { categoryLabel } from "@/lib/data/categories";

export const metadata: Metadata = {
  title: "Explore experiences",
  description:
    "Browse curated 7 & 14-day retreats and experience-led holidays in Zanzibar. Filter by category, date, destination and budget.",
};

function parseInt10(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

export default async function ExperiencesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const get = (k: string) => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const durationRaw = parseInt10(get("duration"));
  const duration = durationRaw === 7 || durationRaw === 14 ? durationRaw : undefined;

  const [categories, destinations] = await Promise.all([
    getAllCategories(),
    getAllDestinations(),
  ]);

  const experiences = await filterExperiences({
    duration,
    category: get("category"),
    destination: get("destination"),
    month: parseInt10(get("month")),
    maxPriceMinor: parseInt10(get("budget")),
  });

  const heading =
    duration === 7 ? "7-Day Experiences" : duration === 14 ? "14-Day Experiences" : "All Experiences";
  const sub =
    duration === 7
      ? "A week away from ordinary."
      : duration === 14
        ? "Go deeper. Stay longer. Come back different."
        : "Every escape we're running this season.";

  return (
    <div className="container-editorial py-14 sm:py-20">
      <header className="max-w-2xl">
        <p className="eyebrow text-ocean-700">Discover</p>
        <h1 className="mt-3 text-display font-semibold text-ink">{heading}</h1>
        <p className="mt-4 text-lg text-ink-muted">{sub}</p>
      </header>

      <div className="mt-10">
        <Suspense fallback={<div className="h-16 rounded-xl2 bg-sand-100" />}>
          <FilterBar
            categories={categories.map((c) => ({ value: c.slug, label: categoryLabel(c) }))}
            destinations={destinations.map((d) => ({ value: d.slug, label: d.name }))}
          />
        </Suspense>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          {experiences.length} {experiences.length === 1 ? "experience" : "experiences"}
        </p>
      </div>

      <div className="mt-8">
        {experiences.length > 0 ? (
          <ExperienceGrid experiences={experiences} priorityCount={3} />
        ) : (
          <div className="rounded-xl2 border border-dashed border-ink/20 py-20 text-center">
            <p className="font-display text-2xl text-ink">Nothing quite matches — yet.</p>
            <p className="mt-2 text-ink-muted">
              Try widening your dates or budget. New experiences are added every season.
            </p>
          </div>
        )}
      </div>

      <div className="mt-16">
        <FlightsNote />
      </div>
    </div>
  );
}
