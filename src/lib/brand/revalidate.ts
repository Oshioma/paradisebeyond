import { revalidatePath } from "next/cache";
import { BRANDS, type BrandId } from "./config";
import { sitePath } from "./paths";

/**
 * Revalidate a PUBLIC page (one that lives under `[site]`) for every brand.
 * Public pages are served from `/<brand>/<path>` behind a middleware rewrite,
 * so `revalidatePath("/experiences")` alone would no longer reach them.
 */
export function revalidateSitePath(path: string): void {
  for (const id of Object.keys(BRANDS) as BrandId[]) revalidatePath(sitePath(id, path));
}
