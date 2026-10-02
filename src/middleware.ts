import { NextResponse, type NextRequest } from "next/server";
import {
  BRAND_HEADER,
  BRAND_PREVIEW_COOKIE,
  BRAND_PREVIEW_PARAM,
  PARADISE_BEYOND,
  brandForHost,
  isBrandId,
  isPreviewHost,
  type Brand,
} from "@/lib/brand/config";
import { isSitePagePath, sitePath } from "@/lib/brand/paths";

/**
 * Retreat microsites reachable two ways, both scoped to a single retreat so the
 * whole marketplace never "leaks" under the wrong name:
 *
 *   1. Per-experience subdomain — `<label>.paradisebeyond.com`
 *      (needs a wildcard domain `*.paradisebeyond.com` in hosting + DNS)
 *   2. The host's own custom domain — e.g. `aminaretreats.com`
 *      (any host reaching us that isn't our own domain / a preview URL; the
 *      domain must be added to the hosting project + pointed here via DNS)
 *
 * On either, we route tightly:
 *   - "/"                    → rewrite to that retreat's microsite (/r/<key>)
 *   - booking / api / assets → pass through, so Reserve + images work here
 *   - anything else          → redirect to the canonical www site
 *
 * For a custom domain the request Host itself is the key; the microsite resolves
 * it against experiences.custom_domain.
 */
function baseDomain(): string | null {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (!explicit) return null;
  try {
    const h = new URL(explicit).host.replace(/^www\./, "").split(":")[0].toLowerCase();
    if (!h || h.endsWith("vercel.app") || h.startsWith("localhost")) return null;
    return h;
  } catch {
    return null;
  }
}

// Paths that must keep working ON a retreat subdomain (booking flow + system).
const ALLOW_ON_SUBDOMAIN = ["/api", "/book", "/memories", "/_next", "/uploads", "/favicon", "/icon", "/robots", "/sitemap", "/manifest"];

/**
 * Continue with the resolved brand stamped on the request (BRAND_HEADER, read
 * by request-time routes via getBrand()). Public marketing pages are rewritten
 * to their `[site]` route — `/experiences` → `/<brand>/experiences` — so they
 * stay statically generated per brand. Always overwrites any client-sent value
 * of the header.
 */
function withBrand(req: NextRequest, brand: Brand, rewriteTo?: URL): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(BRAND_HEADER, brand.id);
  let target = rewriteTo;
  if (!target && isSitePagePath(req.nextUrl.pathname)) {
    target = req.nextUrl.clone();
    target.pathname = sitePath(brand.id, req.nextUrl.pathname);
  }
  return target
    ? NextResponse.rewrite(target, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
}

/** The internal `/<brand>/…` paths aren't public URLs: send visitors to the
 *  clean path (generated asset routes like opengraph-image are allowed). */
function internalBrandPath(pathname: string): string | null {
  const first = pathname.split("/")[1] ?? "";
  if (!isBrandId(first)) return null;
  if (pathname.endsWith("/opengraph-image") || pathname.includes("/opengraph-image/")) return null;
  return pathname.slice(first.length + 1) || "/";
}

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();

  // --- Brand resolution -------------------------------------------------------
  // Dedicated brand domains (spendtimeoffgrid.com) are matched FIRST, before the
  // custom-domain fallback below would treat them as a host's microsite. On
  // preview hosts only, `?site=<brand>` sets a cookie to view another brand.
  const previewParam = req.nextUrl.searchParams.get(BRAND_PREVIEW_PARAM);
  const previewCookie = req.cookies.get(BRAND_PREVIEW_COOKIE)?.value;
  const preview = previewParam ?? previewCookie ?? null;
  // Brand by the ORIGINAL host: Next's own internal requests (e.g. rendering a
  // server action's redirect target) arrive with Host: localhost and the real
  // host in x-forwarded-host, as do requests behind Vercel's edge.
  const brandHost = (req.headers.get("x-forwarded-host") || host).split(",")[0].trim();
  const brand = brandForHost(brandHost, preview);
  const internal = internalBrandPath(req.nextUrl.pathname);
  if (internal !== null) {
    const to = req.nextUrl.clone();
    to.pathname = internal;
    return NextResponse.redirect(to, 308);
  }
  const finish = (res: NextResponse) => {
    if (previewParam !== null && isPreviewHost(brandHost)) {
      if (isBrandId(previewParam) && previewParam !== PARADISE_BEYOND.id) {
        res.cookies.set(BRAND_PREVIEW_COOKIE, previewParam, { path: "/", sameSite: "lax" });
      } else {
        res.cookies.delete(BRAND_PREVIEW_COOKIE);
      }
    }
    return res;
  };
  if (brand.id !== PARADISE_BEYOND.id) return finish(withBrand(req, brand));

  // --- Paradise Beyond: existing retreat-microsite routing, unchanged ---------
  const base = baseDomain();
  if (!base) return finish(withBrand(req, brand));

  const path = req.nextUrl.pathname;
  const isAsset = ALLOW_ON_SUBDOMAIN.some((p) => path === p || path.startsWith(p + "/"));

  // Route a single retreat's microsite, given its lookup key (subdomain label or
  // full custom-domain host). "/" → microsite; booking/assets stay put; the rest
  // belongs on the canonical marketplace.
  const routeMicrosite = (key: string) => {
    if (path === "/") {
      const rw = req.nextUrl.clone();
      rw.pathname = `/r/${key}`;
      return withBrand(req, brand, rw);
    }
    if (isAsset) return withBrand(req, brand);
    const to = new URL(req.url);
    to.protocol = "https:";
    to.host = `www.${base}`;
    return NextResponse.redirect(to, 307);
  };

  // 1. Subdomain of our base domain (`<label>.paradisebeyond.com`).
  if (host.endsWith("." + base)) {
    const sub = host.slice(0, host.length - (base.length + 1));
    if (!sub || sub === "www") return withBrand(req, brand);
    return routeMicrosite(sub);
  }

  // 2. Our own apex/www, or a preview/local host → normal marketplace.
  if (host === base || host === `www.${base}` || host.endsWith(".vercel.app") || host.startsWith("localhost")) {
    return finish(withBrand(req, brand));
  }

  // 3. Anything else is a host's own custom domain pointed at us → their
  //    retreat, keyed by the request Host (resolved via experiences.custom_domain).
  return routeMicrosite(host);
}

// Run on everything except Next's static asset pipeline (which needs no rewrite).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
