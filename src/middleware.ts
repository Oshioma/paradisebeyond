import { NextResponse, type NextRequest } from "next/server";

/**
 * Per-experience subdomains: `<label>.paradisebeyond.com` is a single retreat's
 * microsite. To stop the subdomain "leaking" the whole marketplace (and showing
 * other retreats under the wrong name), we scope it tightly:
 *   - "/"                    → rewrite to that retreat's microsite (/r/<label>)
 *   - booking / api / assets → pass through, so Reserve + images work here
 *   - anything else          → redirect to the canonical www site
 *
 * Needs a wildcard domain (`*.paradisebeyond.com`) in hosting + DNS to resolve.
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
  if (!host.endsWith("." + base)) return NextResponse.next(); // apex / www → normal marketplace

  const sub = host.slice(0, host.length - (base.length + 1));
  if (!sub || sub === "www") return NextResponse.next();

  const path = req.nextUrl.pathname;

  // The retreat's landing page.
  if (path === "/") {
    const rw = req.nextUrl.clone();
    rw.pathname = `/r/${sub}`;
    return NextResponse.rewrite(rw);
  }

  // Booking + assets stay on the subdomain so checkout and images just work.
  if (ALLOW_ON_SUBDOMAIN.some((p) => path === p || path.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Everything else belongs on the main site — never under a retreat's subdomain.
  const to = new URL(req.url);
  to.protocol = "https:";
  to.host = `www.${base}`;
  return NextResponse.redirect(to, 307);
}

// Run on everything except Next's static asset pipeline (which needs no rewrite).
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
