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
    // Short cache only. The redirect must stay fresh so a newly-uploaded image
    // shows within seconds — the OLD headers (max-age=600 + 24h stale-while-
    // revalidate) meant the browser kept following the redirect to the previous
    // image for up to 10 minutes. The image FILE it points at is uniquely named
    // per upload, so it's still cached long by Supabase's CDN + the browser.
    res.headers.set("Cache-Control", "public, max-age=15, must-revalidate");
    return res;
  }

  return new Response(placeholderSvg(seed, w, h), {
    headers: {
      "Content-Type": "image/svg+xml",
      // Short too, so a slot updates promptly once an override is added.
      "Cache-Control": "public, max-age=15, must-revalidate",
    },
  });
}
