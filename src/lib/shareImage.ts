import { createHash } from "crypto";
import { getOverride } from "@/lib/media/store";
import { slotKey } from "@/lib/images";
import type { Experience } from "@/lib/types";

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

/** The retreat's uploaded main (hero) photo, or null while it's still a placeholder. */
export async function mainPhotoUrl(e: Experience): Promise<string | null> {
  return getOverride(slotKey(e.heroImageSeed));
}

/**
 * The og:image for a retreat link preview: its main photo, resized by
 * /api/share-image, versioned by the photo so a new upload gets a new URL (chat
 * apps cache previews per image URL). Falls back to the branded text card.
 */
export async function shareImageFor(e: Experience, base: string) {
  const photo = await mainPhotoUrl(e);
  if (!photo) {
    return { url: `${base}/experiences/${e.slug}/opengraph-image`, ...SHARE_IMAGE_SIZE, type: "image/png", alt: e.name };
  }
  const v = createHash("sha1").update(photo).digest("hex").slice(0, 10);
  return {
    url: `${base}/api/share-image?slug=${encodeURIComponent(e.slug)}&v=${v}`,
    ...SHARE_IMAGE_SIZE,
    type: "image/jpeg",
    alt: e.name,
  };
}
