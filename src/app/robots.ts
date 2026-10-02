import type { MetadataRoute } from "next";
import { getBrand, brandOrigin } from "@/lib/brand/server";

/** Allow the public marketing surface; keep private/app areas out of the index.
 *  Per request, so each domain points at its own sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/studio", "/desk", "/api", "/book", "/login", "/signup", "/forgot-password", "/reset-password", "/auth", "/saved"],
      },
    ],
    sitemap: `${brandOrigin(getBrand())}/sitemap.xml`,
  };
}
