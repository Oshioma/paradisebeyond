/**
 * Imagery.
 *
 * Every image in the magazine flows through this single helper, so swapping the
 * demo placeholders for real photography (Supabase Storage, Cloudinary, etc.)
 * is a one-file change: return your CDN URL from `img()` and re-enable
 * `next/image` optimisation + `remotePatterns` in next.config.mjs.
 *
 * Today it returns a self-contained, deterministic gradient from the local
 * /api/placeholder route — no external photo host required, so the site renders
 * identically online or offline.
 */

export function img(seed: string, width: number, height: number): string {
  const s = encodeURIComponent(`pb-${seed}`);
  return `/api/placeholder?seed=${s}&w=${Math.round(width)}&h=${Math.round(height)}`;
}

/** A wide editorial/hero crop. */
export function hero(seed: string): string {
  return img(seed, 2000, 1200);
}

/** A portrait crop for host photos. */
export function portrait(seed: string): string {
  return img(seed, 600, 720);
}
