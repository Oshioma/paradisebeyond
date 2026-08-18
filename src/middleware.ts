import { NextResponse, type NextRequest } from "next/server";

/**
 * Per-experience subdomains: `<slug>.paradisebeyond.com` serves that retreat's
 * microsite. We only rewrite the LANDING root ("/") to `/r/<slug>` — every other
 * path (/book, /api, /experiences, assets) passes through untouched, so booking
 * and images work the same on the subdomain. Needs a wildcard domain
 * (`*.paradisebeyond.com`) configured in hosting + DNS to actually resolve.
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

export function middleware(req: NextRequest) {
  const base = baseDomain();
  if (!base) return NextResponse.next();

  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  if (!host.endsWith("." + base)) return NextResponse.next();

  const sub = host.slice(0, host.length - (base.length + 1));
  if (!sub || sub === "www") return NextResponse.next();

  const rw = req.nextUrl.clone();
  rw.pathname = `/r/${sub}`;
  return NextResponse.rewrite(rw);
}

// Only run on the landing root; deeper paths route normally on any host.
export const config = { matcher: ["/"] };
