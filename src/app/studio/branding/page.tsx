import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getHost, getManagedExperiences } from "@/lib/data/repository";
import { siteUrl, subdomainLabel } from "@/lib/siteUrl";
import { BrandingForm } from "@/components/dashboard/BrandingForm";
import { SubdomainEditor } from "@/components/dashboard/SubdomainEditor";
import { CustomDomainEditor } from "@/components/dashboard/CustomDomainEditor";

export const metadata: Metadata = { title: "Customise your page", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  const user = await requireRole("host", "/studio/branding");
  const host = user.hostSlug ? await getHost(user.hostSlug) : undefined;
  const experiences = await getManagedExperiences(user);

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

      {experiences.length > 0 && (
        <div className="mt-10 max-w-2xl">
          <h2 className="font-display text-2xl font-semibold text-ink">Use your own domain</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Optional. Already have a domain? Connect it so guests reach your retreat at your own web address.
          </p>

          <details className="group mt-3 rounded-xl border border-ink/10 bg-sand-100/60 p-4 text-sm text-ink-muted">
            <summary className="cursor-pointer list-none font-medium text-ink [&::-webkit-details-marker]:hidden">
              <span className="text-ocean-700 group-open:hidden">How does this work? ↓</span>
              <span className="hidden text-ocean-700 group-open:inline">How does this work? ↑</span>
            </summary>
            <div className="mt-3 space-y-3">
              <p>
                Your retreat already has its own page. If you own a domain — like{" "}
                <span className="font-mono text-ink">aminaretreats.com</span> — you can point it straight at that page.
              </p>
              <ol className="ml-4 list-decimal space-y-2">
                <li>
                  <span className="font-medium text-ink">Connect it below.</span> Type your domain and hit Connect. Use a
                  bare domain (<span className="font-mono">aminaretreats.com</span>) or a subdomain (
                  <span className="font-mono">go.aminaretreats.com</span>).
                </li>
                <li>
                  <span className="font-medium text-ink">Add one DNS record.</span> We show you the exact record — log in
                  where you bought your domain (GoDaddy, Namecheap, Cloudflare…), open its DNS settings, add the record,
                  and save.
                </li>
                <li>
                  <span className="font-medium text-ink">Wait a little.</span> DNS takes a few minutes to a few hours to
                  spread; the secure padlock turns on by itself once it does. Nothing else to do.
                </li>
              </ol>
              <p>
                In the meantime your retreat stays reachable at its short address, so your links never break while the
                domain settles in. You can connect a different domain to each retreat you host.
              </p>
            </div>
          </details>

          <div className="mt-4 space-y-3">
            {experiences.map((e) => (
              <CustomDomainEditor key={e.slug} slug={e.slug} name={e.name} currentDomain={e.customDomain ?? ""} />
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
