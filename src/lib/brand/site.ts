import { notFound } from "next/navigation";
import { BRANDS, isBrandId, type Brand, type BrandId } from "./config";

/**
 * Public marketing pages live under `src/app/[site]/…`. Middleware rewrites a
 * request like `spendtimeoffgrid.com/experiences` to `/spendtimeoffgrid/experiences`
 * (and Paradise Beyond's to `/paradise-beyond/…`), so the brand arrives as a
 * route param. That keeps these pages statically generated per brand — no
 * request headers are read — exactly as they were before.
 */
export interface SiteParams {
  site: string;
}

export function siteStaticParams(): { site: BrandId }[] {
  return (Object.keys(BRANDS) as BrandId[]).map((site) => ({ site }));
}

/** The brand for a `[site]` route, or 404 for an unknown segment. */
export function brandFromParams(params: SiteParams): Brand {
  if (!isBrandId(params.site)) notFound();
  return BRANDS[params.site];
}

export { SITE_PAGE_PREFIXES, isSitePagePath, sitePath } from "./paths";
