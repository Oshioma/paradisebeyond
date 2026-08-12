/**
 * Placeholder photography.
 *
 * Every image in the magazine flows through this single helper, so swapping the
 * demo placeholders for real photography (Supabase Storage, Cloudinary, etc.)
 * is a one-file change. Seeds are deterministic, so the same experience always
 * renders the same imagery.
 */

const BASE = "https://picsum.photos/seed";

export function img(seed: string, width: number, height: number): string {
  const safe = encodeURIComponent(seed);
  return `${BASE}/pb-${safe}/${Math.round(width)}/${Math.round(height)}`;
}

/** A wide editorial/hero crop. */
export function hero(seed: string): string {
  return img(seed, 2000, 1200);
}

/** A portrait crop for host photos. */
export function portrait(seed: string): string {
  return img(seed, 600, 720);
}
