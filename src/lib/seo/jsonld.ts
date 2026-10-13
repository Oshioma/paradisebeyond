import type { Brand } from "@/lib/brand/config";

/**
 * Structured data for a brand's homepage: who runs the site (Organization) and
 * what it is (WebSite), so search engines and AI assistants can describe it.
 * Escapes "<" so no value can close the script tag.
 */
export function homeJsonLd(brand: Brand, origin: string): string {
  const url = `${origin}/`;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}#organization`,
        name: brand.name,
        url,
        description: brand.footerBlurb,
        email: brand.contactEmail,
        ...(brand.icon ? { logo: new URL(brand.icon.apple, url).toString() } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        name: brand.name,
        url,
        description: brand.metadata.description,
        inLanguage: "en",
        publisher: { "@id": `${url}#organization` },
      },
    ],
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
