import { cookies, headers } from "next/headers";
import { siteUrl } from "@/lib/siteUrl";
import {
  BRAND_HEADER,
  BRAND_PREVIEW_COOKIE,
  BRAND_PREVIEW_PARAM,
  brandForHost,
  PARADISE_BEYOND,
  getBrandById,
  isPreviewHost,
  normaliseHost,
  type Brand,
} from "./config";

/**
 * Server-side brand resolution. Middleware stamps the resolved brand onto the
 * request (BRAND_HEADER); this reads it. Some renders don't carry middleware's
 * request headers (e.g. the page Next renders after a server action
 * redirects), so without the header it applies the same rules to the Host and
 * preview cookie. Outside a request (build time) it's Paradise Beyond.
 */
export function getBrand(): Brand {
  try {
    const h = headers();
    const stamped = h.get(BRAND_HEADER);
    if (stamped) return getBrandById(stamped);
    return brandForHost(h.get("x-forwarded-host") ?? h.get("host"), cookies().get(BRAND_PREVIEW_COOKIE)?.value);
  } catch {
    return PARADISE_BEYOND;
  }
}

function requestHost(): string {
  try {
    const h = headers();
    return normaliseHost(h.get("x-forwarded-host") ?? h.get("host"));
  } catch {
    return "";
  }
}

function requestOrigin(): string | null {
  try {
    const h = headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return null;
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  } catch {
    return null;
  }
}

/**
 * The origin to use for absolute links that must land back on this brand —
 * Stripe success/cancel URLs, auth email redirects, canonical metadata.
 *
 * Paradise Beyond keeps its existing behaviour exactly (siteUrl()). Other
 * brands use their canonical domain in production, and the current request
 * origin on preview hosts (localhost / *.vercel.app) so QA round-trips work.
 */
export function brandOrigin(brand: Brand = getBrand()): string {
  if (!brand.canonicalOrigin) return siteUrl();
  if (isPreviewHost(requestHost())) return requestOrigin() ?? brand.canonicalOrigin;
  return brand.canonicalOrigin;
}

/** A brand's production origin, for contexts with no request (webhooks,
 *  emails). Paradise Beyond: siteUrl(), exactly as before. */
export function canonicalOriginFor(brand: Brand): string {
  return brand.canonicalOrigin ?? siteUrl();
}

/**
 * An absolute URL for `path` on another brand's site — used when a listing is
 * opened on the wrong domain. On preview hosts it stays on the same host and
 * switches the preview brand instead.
 */
export function crossBrandUrl(target: Brand, path: string): string {
  if (isPreviewHost(requestHost())) {
    const sep = path.includes("?") ? "&" : "?";
    return `${path}${sep}${BRAND_PREVIEW_PARAM}=${target.id}`;
  }
  return `${target.canonicalOrigin ?? siteUrl()}${path}`;
}

/** Link to a listing's public page on its OWN marketplace's site — relative
 *  when that's the current site, absolute otherwise (admin/host areas list
 *  both marketplaces' listings). */
export function listingHref(e: { slug: string; marketplace?: string | null }): string {
  const path = `/experiences/${e.slug}`;
  const owner = getBrandById(e.marketplace);
  return owner.id === getBrand().id ? path : crossBrandUrl(owner, path);
}
