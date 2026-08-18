import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getHost, getExperiencesByHost } from "@/lib/data/repository";
import { micrositeUrl } from "@/lib/siteUrl";
import { BrandingForm } from "@/components/dashboard/BrandingForm";

export const metadata: Metadata = { title: "Customise your page", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  const user = await requireRole("host", "/studio/branding");
  const host = user.hostSlug ? await getHost(user.hostSlug) : undefined;
  const experiences = user.hostSlug ? await getExperiencesByHost(user.hostSlug) : [];

  return (
    <div className="container-editorial py-12">
      <header className="max-w-2xl">
        <p className="eyebrow text-ocean-700">Host Studio</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Customise your page</h1>
        <p className="mt-3 text-ink-muted">
          Make your retreat page feel like your own. Pick your colour and add your
          links — it&apos;s applied to your shareable page below.
        </p>
      </header>

      {experiences.length > 0 && (
        <div className="mt-8 max-w-2xl rounded-xl2 border border-ink/10 bg-sand-50 p-5">
          <p className="text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">Your shareable pages</p>
          <ul className="mt-2 space-y-1.5">
            {experiences.map((e) => (
              <li key={e.slug} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-ink">{e.name}</span>
                <a href={micrositeUrl(e.slug)} target="_blank" rel="noreferrer" className="break-all font-mono text-xs text-ocean-700 hover:underline">
                  {micrositeUrl(e.slug).replace(/^https?:\/\//, "")}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-muted">Share these links — they open a clean page of just your retreat.</p>
        </div>
      )}

      <div className="mt-10 max-w-2xl">
        <BrandingForm
          initialColor={host?.brandColor ?? ""}
          initialSocials={host?.socials ?? []}
          initialTagline={host?.tagline ?? ""}
          initialLogoUrl={host?.logoUrl ?? ""}
        />
      </div>

      {experiences.length > 0 && (
        <p className="mt-8">
          <Link href={`/r/${experiences[0].slug}`} className="text-sm text-ocean-700 hover:underline">Preview your page →</Link>
        </p>
      )}
    </div>
  );
}
