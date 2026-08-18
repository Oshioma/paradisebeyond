import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getHost, getExperiencesByHost } from "@/lib/data/repository";
import { siteUrl, subdomainLabel } from "@/lib/siteUrl";
import { BrandingForm } from "@/components/dashboard/BrandingForm";
import { SubdomainEditor } from "@/components/dashboard/SubdomainEditor";

export const metadata: Metadata = { title: "Customise your page", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  const user = await requireRole("host", "/studio/branding");
  const host = user.hostSlug ? await getHost(user.hostSlug) : undefined;
  const experiences = user.hostSlug ? await getExperiencesByHost(user.hostSlug) : [];

  // The registrable domain suffix (e.g. paradisebeyond.com) for the address UI.
  let hostSuffix = "paradisebeyond.com";
  try { hostSuffix = new URL(siteUrl()).host.replace(/^www\./, ""); } catch { /* keep default */ }

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
        <div className="mt-8 max-w-2xl">
          <h2 className="font-display text-2xl font-semibold text-ink">Your web address</h2>
          <p className="mt-1 text-sm text-ink-muted">Pick a short address for each retreat — it&apos;s the clean page you share.</p>
          <div className="mt-4 space-y-3">
            {experiences.map((e) => (
              <SubdomainEditor
                key={e.slug}
                slug={e.slug}
                name={e.name}
                currentLabel={e.subdomain ?? ""}
                defaultLabel={subdomainLabel(e.slug)}
                hostSuffix={hostSuffix}
              />
            ))}
          </div>
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
