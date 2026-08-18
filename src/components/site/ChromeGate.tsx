"use client";

import { usePathname } from "next/navigation";

/**
 * Hides marketplace chrome (footer) on host microsites (/r/<slug>), which supply
 * their own branded header/footer. Wraps a server component as children.
 */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/r/")) return null;
  return <>{children}</>;
}
