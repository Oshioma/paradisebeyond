import type { Brand } from "@/lib/brand/config";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ChromeGate } from "@/components/site/ChromeGate";

/**
 * The marketplace chrome (header + footer) for a brand. Used by the `[site]`
 * layout (brand from the route param → static) and by the request-time app
 * areas (brand from the middleware header).
 */
export function BrandChrome({ brand, children }: { brand: Brand; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader brand={brand} />
      <main>{children}</main>
      <ChromeGate><SiteFooter brand={brand} /></ChromeGate>
    </>
  );
}
