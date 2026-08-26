import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getManagedExperiences } from "@/lib/data/repository";
import { getExperienceIdsBySlugs, getPhotosForExperienceIds } from "@/lib/memories/store";
import { PhotoManager } from "@/components/host/PhotoManager";

export const metadata: Metadata = { title: "Guest photos", robots: { index: false } };

/**
 * Manage the photos guests (or imports) have added to each retreat: allocate
 * them to itinerary days, hide or delete them, and bulk-add more by URL.
 */
export default async function StudioPhotosPage() {
  const user = await requireRole("host", "/studio/photos");
  const experiences = await getManagedExperiences(user);
  const idsBySlug = await getExperienceIdsBySlugs(experiences.map((e) => e.slug));
  const photos = await getPhotosForExperienceIds(Object.values(idsBySlug));

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Host Studio</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Guest photos</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Photos your guests share appear here. Published photos show in the retreat&apos;s &ldquo;Guest
          memories&rdquo; gallery; allocate a photo to a day and it appears under that day of the itinerary too.
        </p>
      </header>

      {experiences.length === 0 ? (
        <p className="mt-10 rounded-xl2 border border-dashed border-ink/20 py-16 text-center text-ink-muted">
          No live retreats yet.
        </p>
      ) : (
        <div className="mt-10 space-y-10">
          {experiences.map((e) => {
            const id = idsBySlug[e.slug];
            return (
              <PhotoManager
                key={e.slug}
                experienceSlug={e.slug}
                experienceName={e.name}
                days={e.itinerary.map((d) => ({ day: d.day, title: d.title }))}
                photos={photos
                  .filter((p) => p.experienceId === id)
                  .map((p) => ({
                    id: p.id,
                    url: p.url,
                    dayNumber: p.dayNumber,
                    uploaderName: p.uploaderName,
                    source: p.source,
                    published: p.published,
                  }))}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
