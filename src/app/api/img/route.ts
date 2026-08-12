import { NextRequest, NextResponse } from "next/server";
import { placeholderSvg } from "@/lib/media/placeholder";
import { getOverride } from "@/lib/media/store";

/**
 * Unified image endpoint. Every image on the site is requested through here
 * (see src/lib/images.ts), so an admin upload for a slot is reflected
 * everywhere automatically. If an override exists for the seed we redirect to
 * the uploaded image; otherwise we render the deterministic placeholder.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const seed = searchParams.get("seed") ?? "paradise";
  const w = Number(searchParams.get("w")) || 1200;
  const h = Number(searchParams.get("h")) || 800;

  const override = await getOverride(seed);
  if (override) {
    const target = override.startsWith("http") ? override : new URL(override, req.url).toString();
    const res = NextResponse.redirect(target, 307);
    // Let the browser/CDN cache the redirect so repeat views don't re-hit the DB.
    res.headers.set("Cache-Control", "public, max-age=600, stale-while-revalidate=86400");
    return res;
  }

  return new Response(placeholderSvg(seed, w, h), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=60",
    },
  });
}
