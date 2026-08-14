"use client";

/**
 * Client-side image preparation for uploads — the key to reliable uploads from
 * phones. High-resolution phone photos are often 10–25 MB and would hit the
 * server size cap; here we downscale + re-encode them in the browser BEFORE
 * they're sent, so big photos "just work" and the payload stays small.
 *
 * As a bonus this converts HEIC/HEIF (iPhone) to JPEG whenever the browser can
 * decode it (iOS Safari can), sidestepping "unsupported image type". When a
 * format can't be decoded (e.g. HEIC on desktop Chrome), we return the original
 * file untouched and let the server handle it.
 */

export interface PrepareOptions {
  /** Longest edge, in px, the image is scaled down to (never scaled up). */
  maxDimension?: number;
  /** Only re-encode when the file is larger than this (bytes). */
  maxBytes?: number;
  /** JPEG quality 0–1 for the re-encoded output. */
  quality?: number;
  /** Target aspect ratio (width / height) to crop to. When set, the image is
   *  cropped to this ratio at the focal point below (used by the reposition UI). */
  aspect?: number;
  /** Horizontal focal point 0–1 (0 = left, 1 = right). Default centre. */
  focalX?: number;
  /** Vertical focal point 0–1 (0 = top, 1 = bottom). Default centre. */
  focalY?: number;
}

const DEFAULTS: Required<Pick<PrepareOptions, "maxDimension" | "maxBytes" | "quality">> = {
  // Callers pass a per-slot maxDimension (≈ 2× the display size) so a 56px
  // thumbnail isn't stored as a 2048px photo. The fallback cap suits the hero.
  maxDimension: 2048,
  // Re-encode aggressively so uploads stay small and pages load fast — most
  // photos compress well below this and land far under Vercel's ~4.5 MB cap.
  maxBytes: 700 * 1024,
  quality: 0.78,
};

/**
 * Return an upload-ready File: downscaled/compressed when that helps, or the
 * original untouched when it doesn't (or can't). Never throws — on any failure
 * it falls back to the original file so uploading still proceeds.
 */
export async function prepareImageForUpload(file: File, options: PrepareOptions = {}): Promise<File> {
  const { maxDimension, maxBytes, quality } = { ...DEFAULTS, ...options };

  // Only touch raster photos we can safely re-encode. Never rasterise GIFs
  // (loses animation), SVGs (loses scalability), or non-images.
  if (typeof document === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await decodeToBitmap(file);
  } catch {
    return file; // undecodable (e.g. HEIC on a browser that can't) → send as-is
  }
  if (!bitmap) return file;

  try {
    const { width, height } = bitmap;
    const aspect = options.aspect;
    const cropping = Boolean(aspect && isFinite(aspect) && aspect > 0);

    // Source crop rectangle. Full image unless a target aspect + focal point are
    // given (the reposition UI), in which case crop to that ratio at the focal.
    let sx = 0, sy = 0, sw = width, sh = height;
    if (cropping) {
      const focalX = clamp01(options.focalX ?? 0.5);
      const focalY = clamp01(options.focalY ?? 0.5);
      const srcAspect = width / height;
      if (srcAspect > aspect!) {
        sh = height;
        sw = Math.round(height * aspect!);
        sx = Math.round((width - sw) * focalX);
      } else {
        sw = width;
        sh = Math.round(width / aspect!);
        sy = Math.round((height - sh) * focalY);
      }
    }

    const scale = Math.min(1, maxDimension / Math.max(sw, sh));
    const needsResize = scale < 1;
    const needsRecompress = file.size > maxBytes;
    // When cropping we always re-encode (the crop is the whole point).
    if (!cropping && !needsResize && !needsRecompress) return file;

    const outW = Math.max(1, Math.round(sw * scale));
    const outH = Math.max(1, Math.round(sh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    // When not cropping, keep the original if re-encoding didn't shrink it.
    if (!blob || (!cropping && blob.size >= file.size)) return file;

    const name = file.name.replace(/\.[^./\\]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } finally {
    bitmap.close?.();
  }
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Decode via createImageBitmap (fast, respects EXIF orientation), falling back
 * to an <img> element for formats createImageBitmap rejects. */
async function decodeToBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image decode failed"));
        img.src = url;
      });
      return await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
