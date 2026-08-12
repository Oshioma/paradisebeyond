import { ImageResponse } from "next/og";
import { getExperienceBySlug } from "@/lib/data/repository";
import { formatFrom } from "@/lib/money";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Paradise Beyond experience";

/**
 * Branded Open Graph card per experience. Text-only and self-contained (no
 * external images or fonts), so shared links render a premium editorial card
 * on every platform — including where the SVG gradient placeholders don't.
 */
export default async function Image({ params }: { params: { slug: string } }) {
  const e = await getExperienceBySlug(params.slug);
  const name = e?.name ?? "Paradise Beyond";
  const strapline = e?.strapline ?? "Come for more than a holiday.";
  const location = e?.location ?? "";
  const price = e ? `From ${formatFrom(e.priceFromMinor, e.currency)} pp` : "";
  const duration = e ? `${e.duration} days` : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #1c1a16 0%, #2f3b3a 55%, #b5563f 140%)",
          color: "#faf6ef",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: "#e9dfce" }}>
          <span>Paradise Beyond</span>
          {duration && <span style={{ color: "#f0c9a0" }}>{duration}</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 600, lineHeight: 1.05, maxWidth: 1000 }}>{name}</div>
          <div style={{ fontSize: 34, marginTop: 24, color: "#efe6d6", maxWidth: 900 }}>{strapline}</div>
        </div>

        <div style={{ display: "flex", gap: 28, alignItems: "center", fontSize: 30, color: "#e9dfce" }}>
          {location && <span>{location}</span>}
          {location && price && <span style={{ color: "#8a8072" }}>·</span>}
          {price && <span style={{ color: "#f0c9a0" }}>{price}</span>}
        </div>
      </div>
    ),
    { ...size },
  );
}
