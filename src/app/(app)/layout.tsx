import type { Metadata } from "next";
import { getBrand } from "@/lib/brand/server";
import { brandMetadata } from "@/lib/brand/metadata";
import { BrandChrome } from "@/components/site/BrandChrome";

/**
 * The request-time app areas (account, booking, studio, desk, sign-in…). A
 * route group, so URLs are unchanged. These routes were already rendered per
 * request, so reading the brand middleware resolved from the host costs
 * nothing extra; it gives them the right chrome, title template and metadata.
 */
export function generateMetadata(): Metadata {
  return brandMetadata(getBrand());
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <BrandChrome brand={getBrand()}>{children}</BrandChrome>;
}
