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
}

const DEFAULTS: Required<PrepareOptions> = {
  // Kept intentionally conservative so a prepared photo lands well under common
  // host request-body caps (e.g. Vercel's ~4.5 MB), which otherwise reject the
  // upload before it reaches the Server Action. 2048px is plenty for the
  // largest on-site render (the 2000px hero).
  maxDimension: 2048,
  maxBytes: 3 * 1024 * 1024, // re-encode anything over 3 MB
  quality: 0.82,
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
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const needsResize = scale < 1;
    const needsRecompress = file.size > maxBytes;
    if (!needsResize && !needsRecompress) return file;

    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    // Keep the original if re-encoding didn't actually shrink it.
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^./\\]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } finally {
    bitmap.close?.();
  }
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
