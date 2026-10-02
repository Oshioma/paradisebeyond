"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { getBrandById, type BrandId } from "@/lib/brand/config";

const COPY: Record<BrandId, { eyebrow: string; title: string; body: string; cta: string }> = {
  "paradise-beyond": {
    eyebrow: "Lost paradise",
    title: "This page has drifted out to sea.",
    body: "The experience you're looking for isn't here — but there are plenty more worth crossing an ocean for.",
    cta: "Explore experiences",
  },
  spendtimeoffgrid: {
    eyebrow: "Off the map",
    title: "This path doesn't lead anywhere.",
    body: "The stay you're looking for isn't here — but there are other places worth getting your hands dirty for.",
    cta: "Explore stays",
  },
};

export function NotFoundContent({ brandId }: { brandId?: string }) {
  const brand = getBrandById(brandId);
  const c = COPY[brand.id];
  // Not-found boundaries are static (shared by every page), so the server-side
  // <title> can't know the host; correct it in the browser.
  useEffect(() => {
    document.title = `Page not found · ${brand.name}`;
  }, [brand.name]);
  return (
    <div className="container-editorial flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="eyebrow text-ocean-700">{c.eyebrow}</p>
      <h1 className="mt-3 text-display font-semibold text-ink">{c.title}</h1>
      <p className="mt-4 max-w-md text-ink-muted">{c.body}</p>
      <Link
        href="/experiences"
        className="mt-8 rounded-full bg-ink px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-ink-soft"
      >
        {c.cta}
      </Link>
    </div>
  );
}

export default function NotFound() {
  const params = useParams<{ site?: string }>();
  return <NotFoundContent brandId={params?.site} />;
}
