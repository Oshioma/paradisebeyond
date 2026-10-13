import { getBrand, brandOrigin } from "@/lib/brand/server";
import { categoriesFor } from "@/lib/data/categories";
import { DESTINATIONS } from "@/lib/data/destinations";
import { getMarketplaceExperiences } from "@/lib/data/repository";
import { llmsTxt } from "@/lib/seo/llms";

/** /llms.txt for the brand being requested, like robots.txt and the sitemap:
 *  rendered per request (it varies by host) and CDN-cached for an hour. */
export const dynamic = "force-dynamic";

export async function GET() {
  const brand = getBrand();
  const body = llmsTxt({
    brand,
    origin: brandOrigin(brand),
    categories: categoriesFor(brand.id),
    experiences: await getMarketplaceExperiences(brand.id),
    // Destination pages only exist on Paradise Beyond (see sitemap.ts).
    destinations: brand.id === "paradise-beyond" ? DESTINATIONS : [],
  });
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
