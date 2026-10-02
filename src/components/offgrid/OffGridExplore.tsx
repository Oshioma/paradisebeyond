import type { Brand } from "@/lib/brand/config";
import { filterExperiences, getAllCategories } from "@/lib/data/repository";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { OffGridSearch } from "@/components/offgrid/OffGridSearch";
import { getCategory } from "@/lib/data/categories";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function int(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Spend Time Off Grid explore page: the search + the matching stays. */
export async function OffGridExplore({ brand, get }: { brand: Brand; get: (k: string) => string | undefined }) {
  const values = {
    where: get("where")?.slice(0, 80),
    date: ISO.test(get("date") ?? "") ? get("date") : undefined,
    hours: get("hours"),
    stay: get("stay"),
    category: get("category"),
  };
  const categories = await getAllCategories(brand.id);
  const category = values.category && categories.some((c) => c.slug === values.category) ? values.category : undefined;
  const experiences = await filterExperiences({
    marketplace: brand.id,
    q: values.where,
    date: values.date,
    maxHours: int(values.hours),
    stayNights: int(values.stay),
    category,
  });
  const active = getCategory(category ?? "");

  return (
    <div className="container-editorial py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="eyebrow text-forest-700">Explore</p>
        <h1 className="mt-3 text-display font-semibold text-ink">{active ? active.name : "Places to stay off grid"}</h1>
        <p className="mt-4 text-lg text-ink-muted">
          {active ? active.description : "Every stay shows what you'll help with, what you'll receive and what it costs — up front."}
        </p>
      </header>

      <div className="mt-8">
        <OffGridSearch values={{ ...values, category }} variant="bar" categories={categories.map((c) => ({ value: c.slug, label: c.name }))} />
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        {experiences.length} {experiences.length === 1 ? "stay" : "stays"}
      </p>

      <div className="mt-6">
        {experiences.length > 0 ? (
          <ExperienceGrid experiences={experiences} priorityCount={3} />
        ) : (
          <div className="rounded-xl2 border border-dashed border-ink/20 px-6 py-20 text-center">
            <p className="font-display text-2xl text-ink">Nothing matches that search yet.</p>
            <p className="mx-auto mt-2 max-w-md text-ink-muted">
              Try other dates, a longer stay or more hours of help. New hosts are listing their land all the time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
