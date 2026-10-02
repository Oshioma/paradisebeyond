import type { Metadata } from "next";
import { brandMetadata } from "@/lib/brand/metadata";
import { PARADISE_BEYOND } from "@/lib/brand/config";

/**
 * Retreat microsites are a Paradise Beyond feature. They render their own
 * branded chrome; this layout only supplies Paradise Beyond's title template
 * (the root layout no longer carries one), so their titles are unchanged.
 */
export const metadata: Metadata = brandMetadata(PARADISE_BEYOND);

export default function MicrositeLayout({ children }: { children: React.ReactNode }) {
  return <main>{children}</main>;
}
