import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getPublicExperienceBySlug } from "@/lib/data/repository";
import { SHARE_IMAGE_SIZE, mainPhotoUrl } from "@/lib/shareImage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Link-preview image for a retreat: its main (hero) photo, cropped to the
 * 1200×630 share size and compressed to a small JPEG. WhatsApp drops preview
 * images that are large or slow, and raw uploads are often 500 KB+, so the
 * original can't be used directly.
 *
 * The microsite's og:image points here with `v=` set to the current photo, so
 * a re-uploaded photo gets a fresh URL and the response can be cached forever.
 * With no uploaded photo it falls back to the branded text card.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") ?? "";
  const e = slug ? await getPublicExperienceBySlug(slug, "paradise-beyond") : undefined;
  if (!e) return new Response("Not found", { status: 404 });

  const card = new URL(`/experiences/${e.slug}/opengraph-image`, req.url);
  const photo = await mainPhotoUrl(e);
  if (!photo) return NextResponse.redirect(card, 307);

  try {
    const res = await fetch(photo.startsWith("http") ? photo : new URL(photo, req.url));
    if (!res.ok) throw new Error(`photo ${res.status}`);
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
      .rotate()
      .resize(SHARE_IMAGE_SIZE.width, SHARE_IMAGE_SIZE.height, { fit: "cover", position: "attention" })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": searchParams.get("v")
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.redirect(card, 307);
  }
}
