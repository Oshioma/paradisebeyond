import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import { RevealScript } from "@/components/site/RevealScript";

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

const SITE_NAME = "Paradise Beyond";
const SITE_DESC =
  "Curated 7 & 14-day experiences in extraordinary places. Come for more than a holiday.";

export const metadata: Metadata = {
  metadataBase: new URL("https://paradisebeyond.example"),
  title: {
    default: `${SITE_NAME} — Come for more than a holiday`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESC,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Come for more than a holiday`,
    description: SITE_DESC,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-sand-50 text-ink">
        <WishlistProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </WishlistProvider>
        <RevealScript />
      </body>
    </html>
  );
}
