import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";
import { getAllExperiences, getAllHosts } from "@/lib/data/repository";
import { DESTINATIONS } from "@/lib/data/destinations";

/** Public marketing routes + every experience, host and destination detail page. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/experiences`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/host`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/host/apply`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const [experiences, hosts] = await Promise.all([getAllExperiences(), getAllHosts()]);

  const experienceRoutes: MetadataRoute.Sitemap = experiences.map((e) => ({
    url: `${base}/experiences/${e.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));
  const hostRoutes: MetadataRoute.Sitemap = hosts.map((h) => ({
    url: `${base}/hosts/${h.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const destinationRoutes: MetadataRoute.Sitemap = DESTINATIONS.map((d) => ({
    url: `${base}/destinations/${d.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...experienceRoutes, ...hostRoutes, ...destinationRoutes];
}
