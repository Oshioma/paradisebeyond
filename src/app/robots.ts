import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

/** Allow the public marketing surface; keep private/app areas out of the index. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/studio", "/desk", "/api", "/book", "/login", "/signup", "/forgot-password", "/reset-password", "/auth", "/saved"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
