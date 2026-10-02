import type { MetadataRoute } from "next";
import { getAllHosts, getExperiencesByHost, getMarketplaceExperiences } from "@/lib/data/repository";
import { DESTINATIONS } from "@/lib/data/destinations";
import { categoriesFor } from "@/lib/data/categories";
import { hostVisibleOn } from "@/lib/data/filter";
import { getBrand, brandOrigin } from "@/lib/brand/server";

/**
 * Public marketing routes + every experience, host and destination detail page
 * — for the brand being requested. One /sitemap.xml serves both domains, so it
 * is rendered per request (it varies by host) and each lists only its own
 * marketplace's URLs on its own origin.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const brand = getBrand();
  const base = brandOrigin(brand);
  const now = new Date();
  const paradise = brand.id === "paradise-beyond";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/experiences`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/host`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/host/apply`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    // Spend Time Off Grid only.
    ...(paradise ? [] : [{ url: `${base}/trust`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 }]),
  ];

  const [experiences, hosts] = await Promise.all([getMarketplaceExperiences(brand.id), getAllHosts()]);
  const visibleHosts = [];
  for (const h of hosts) {
    if (hostVisibleOn(await getExperiencesByHost(h.slug), brand.id)) visibleHosts.push(h);
  }

  const experienceRoutes: MetadataRoute.Sitemap = experiences.filter((e) => !e.sample).map((e) => ({
    url: `${base}/experiences/${e.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));
  const hostRoutes: MetadataRoute.Sitemap = visibleHosts.map((h) => ({
    url: `${base}/hosts/${h.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const destinationRoutes: MetadataRoute.Sitemap = paradise
    ? DESTINATIONS.map((d) => ({
        url: `${base}/destinations/${d.slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      }))
    : [];
  // Paradise Beyond's sitemap never listed categories; keep it identical and
  // list them for the new marketplace, where they're the main way in.
  const categoryRoutes: MetadataRoute.Sitemap = paradise
    ? []
    : categoriesFor(brand.id).map((c) => ({
        url: `${base}/categories/${c.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      }));

  return [...staticRoutes, ...experienceRoutes, ...categoryRoutes, ...hostRoutes, ...destinationRoutes];
}
