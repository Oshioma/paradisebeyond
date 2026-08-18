import { NextResponse, type NextRequest } from "next/server";

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
const ALLOW_ON_SUBDOMAIN = ["/api", "/book", "/_next", "/uploads", "/favicon", "/icon", "/robots", "/sitemap", "/manifest"];

export function middleware(req: NextRequest) {
  const base = baseDomain();
  if (!base) return NextResponse.next();

  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  const path = req.nextUrl.pathname;
  const isAsset = ALLOW_ON_SUBDOMAIN.some((p) => path === p || path.startsWith(p + "/"));

  // Route a single retreat's microsite, given its lookup key (subdomain label or
  // full custom-domain host). "/" → microsite; booking/assets stay put; the rest
  // belongs on the canonical marketplace.
  const routeMicrosite = (key: string) => {
    if (path === "/") {
      const rw = req.nextUrl.clone();
      rw.pathname = `/r/${key}`;
      return NextResponse.rewrite(rw);
    }
    if (isAsset) return NextResponse.next();
    const to = new URL(req.url);
    to.protocol = "https:";
    to.host = `www.${base}`;
    return NextResponse.redirect(to, 307);
  };

  // 1. Subdomain of our base domain (`<label>.paradisebeyond.com`).
  if (host.endsWith("." + base)) {
    const sub = host.slice(0, host.length - (base.length + 1));
    if (!sub || sub === "www") return NextResponse.next();
    return routeMicrosite(sub);
  }

  // 2. Our own apex/www, or a preview/local host → normal marketplace.
  if (host === base || host === `www.${base}` || host.endsWith(".vercel.app") || host.startsWith("localhost")) {
    return NextResponse.next();
  }

  // 3. Anything else is a host's own custom domain pointed at us → their
  //    retreat, keyed by the request Host (resolved via experiences.custom_domain).
  return routeMicrosite(host);
}

// Run on everything except Next's static asset pipeline (which needs no rewrite).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
