import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import { RevealScript } from "@/components/site/RevealScript";
import { PARADISE_BEYOND } from "@/lib/brand/config";
import { brandMetadata } from "@/lib/brand/metadata";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz"],
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/**
 * Root metadata stays Paradise Beyond's (and static). Brand-specific metadata
 * is set by the `[site]` layout for public pages and by the app-area layouts.
 *
 * The root layout deliberately reads no request data, so pages stay static.
 * Marketplace chrome (header/footer) is rendered one level down: by
 * `[site]/layout.tsx` for public pages and by `BrandChrome` in the
 * request-time app areas.
 */
export const metadata: Metadata = brandMetadata(PARADISE_BEYOND, { root: true });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-sand-50 text-ink">
        {/* Enable scroll-reveal only when JS is present (flash-free, no-JS safe). */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js-reveal')",
          }}
        />
        <WishlistProvider>
          {children}
        </WishlistProvider>
        <RevealScript />
      </body>
    </html>
  );
}
