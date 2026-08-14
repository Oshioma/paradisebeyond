import { NextRequest, NextResponse } from "next/server";
import { getOriginal, getOverride } from "@/lib/media/store";

/**
 * Streams the stored ORIGINAL (uncropped) image for a slot back through our own
 * origin, so the media manager's "Reframe" tool can load it into a canvas and
 * re-crop it. Proxying keeps the fetch same-origin — avoiding cross-origin CORS
 * and tainted-canvas problems that a direct Storage URL would hit. Falls back to
 * the displayed image when no separate original was stored (older uploads).
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const seed = req.nextUrl.searchParams.get("seed");
  if (!seed) return NextResponse.json({ error: "missing seed" }, { status: 400 });

  const src = (await getOriginal(seed)) ?? (await getOverride(seed));
  if (!src) return NextResponse.json({ error: "no original" }, { status: 404 });

  const target = src.startsWith("http") ? src : new URL(src, req.url).toString();
  let upstream: Response;
  try {
    upstream = await fetch(target);
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }

  const buf = await upstream.arrayBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      // Private + short: this is an admin tool fetch, not a public asset.
      "Cache-Control": "private, max-age=60",
    },
  });
}
