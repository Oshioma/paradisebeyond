import type { Metadata } from "next";
import type { Brand } from "./config";

/**
 * Root metadata for a brand. Paradise Beyond's values are exactly what the root
 * layout has always exported; other brands get their own title, description
 * and canonical origin (so relative canonicals resolve to their domain).
 */
export function brandMetadata(brand: Brand, opts: { root?: boolean } = {}): Metadata {
  const base = brand.canonicalOrigin ?? (process.env.NEXT_PUBLIC_SITE_URL || "https://paradisebeyond.example");
  return {
    metadataBase: new URL(base),
    // The root layout sets a plain title (no template): every page sits under
    // a brand layout that supplies its own default + template, and a root
    // template would be appended to those defaults ("… · Paradise Beyond").
    title: opts.root
      ? brand.metadata.defaultTitle
      : { default: brand.metadata.defaultTitle, template: brand.metadata.titleTemplate },
    description: brand.metadata.description,
    openGraph: {
      type: "website",
      siteName: brand.name,
      title: brand.metadata.defaultTitle,
      description: brand.metadata.description,
    },
    twitter: { card: "summary_large_image" },
    // Paradise Beyond's icon comes from src/app/icon.svg; other brands set
    // their own (which replaces it on their pages).
    ...(brand.icon ? { icons: { icon: brand.icon.svg, apple: brand.icon.apple } } : {}),
  };
}
