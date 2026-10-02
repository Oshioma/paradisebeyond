"use client";

import { useEffect, useState } from "react";
import { BRAND_PREVIEW_COOKIE, PARADISE_BEYOND, brandForHost, type Brand } from "@/lib/brand/config";
import { SiteHeader } from "@/components/site/SiteHeader";
import { NotFoundContent } from "./[site]/not-found";

/**
 * Unmatched URLs. Next renders this boundary into every page's tree, so it
 * must not read request headers — that would make every page dynamic. It
 * resolves the brand from the hostname in the browser instead (same rules as
 * middleware).
 */
export default function NotFound() {
  const [brand, setBrand] = useState<Brand>(PARADISE_BEYOND);
  useEffect(() => {
    const preview = document.cookie.match(new RegExp(`(?:^|; )${BRAND_PREVIEW_COOKIE}=([^;]+)`))?.[1];
    setBrand(brandForHost(window.location.hostname, preview));
  }, []);
  return (
    <>
      <SiteHeader brand={brand} />
      <main>
        <NotFoundContent brandId={brand.id} />
      </main>
    </>
  );
}
