import type { BrandId } from "./config";

/**
 * Paths whose pages live under `[site]` (static/SSG per brand). Middleware
 * rewrites these; every other route (account, book, studio, desk, login, api…)
 * is already request-time rendered and resolves the brand from a header.
 */
export const SITE_PAGE_PREFIXES = [
  "/experiences",
  "/categories",
  "/destinations",
  "/hosts",
  "/host",
  "/saved",
  "/terms",
  "/privacy",
  "/signup",
  "/trust",
] as const;

export function isSitePagePath(pathname: string): boolean {
  if (pathname === "/") return true;
  return SITE_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** `/experiences` → `/<brand>/experiences`; `/` → `/<brand>`. */
export function sitePath(brand: BrandId, pathname: string): string {
  return pathname === "/" ? `/${brand}` : `/${brand}${pathname}`;
}
