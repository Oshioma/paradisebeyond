import type { Metadata } from "next";
import { BrandChrome } from "@/components/site/BrandChrome";
import { brandFromParams, siteStaticParams, type SiteParams } from "@/lib/brand/site";
import { brandMetadata } from "@/lib/brand/metadata";

/**
 * Public marketing pages, once per brand. Middleware rewrites each public
 * request to `/<brand>/<path>`, so the brand is a static route param and these
 * pages prerender per brand (no request headers).
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return siteStaticParams();
}

export function generateMetadata({ params }: { params: SiteParams }): Metadata {
  return brandMetadata(brandFromParams(params));
}

export default function SiteLayout({ children, params }: { children: React.ReactNode; params: SiteParams }) {
  const brand = brandFromParams(params);
  return (
    <div data-brand={brand.id}>
      <BrandChrome brand={brand}>{children}</BrandChrome>
    </div>
  );
}
