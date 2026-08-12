import { NextRequest } from "next/server";
import { placeholderSvg } from "@/lib/media/placeholder";

/**
 * Legacy placeholder endpoint (kept for direct links). New image requests flow
 * through /api/img, which also honours admin overrides. Both share the same
 * generator in src/lib/media/placeholder.ts.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const seed = searchParams.get("seed") ?? "paradise";
  const w = Number(searchParams.get("w")) || 1200;
  const h = Number(searchParams.get("h")) || 800;
  return new Response(placeholderSvg(seed, w, h), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
