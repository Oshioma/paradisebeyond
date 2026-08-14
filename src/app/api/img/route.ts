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
    // Cache the redirect generously and revalidate in the BACKGROUND (stale-
    // while-revalidate) so the hero never blocks or flickers on a reload. This
    // no longer risks a stale image: the mapping read itself is uncached
    // (noStore in the store), so each revalidation resolves the current row, and
    // a hard refresh shows a new upload instantly. The image file is immutable
    // (unique name per upload), so it's cached long by its own URL.
    res.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=604800");
    return res;
  }

  return new Response(placeholderSvg(seed, w, h), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=604800",
    },
  });
}
