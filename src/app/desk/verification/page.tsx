import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getAllExperiences, getAllHosts } from "@/lib/data/repository";
import { getVerificationCriteria, getDemoVerifiedSlugs, getDemoFeaturedSlugs } from "@/lib/admin/verification";
import { CriteriaEditor } from "@/components/admin/CriteriaEditor";
import { ExperienceBadgeCells } from "@/components/admin/ExperienceBadgeCells";

export const metadata: Metadata = { title: "Verification", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  await requireRole("admin", "/desk/verification");
  const [criteria, experiences, demoVerified, demoFeatured, hosts] = await Promise.all([
    getVerificationCriteria(),
    getAllExperiences(),
    getDemoVerifiedSlugs(),
    getDemoFeaturedSlugs(),
    getAllHosts(),
  ]);
  const overrides = new Set(demoVerified);
  const featuredOverrides = new Set(demoFeatured);
  const hostBySlug = new Map(hosts.map((h) => [h.slug, h]));

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Admin Desk</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Verification</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          The Verified badge is a promise to guests. It&apos;s awarded by admins
          only — never self-serve. Set the criteria you check against, then award
          or revoke per experience.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">Criteria</h2>
        <p className="mt-1 text-sm text-ink-muted">What must be true before an experience earns Verified. Editable — applies to future reviews.</p>
        <div className="mt-4">
          <CriteriaEditor initial={criteria} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">Experiences</h2>
        <p className="mt-1 text-sm text-ink-muted">Award Verified once you&apos;ve checked every criterion above. Feature an experience to surface it on the homepage.</p>
        <div className="mt-4 overflow-x-auto rounded-xl2 border border-ink/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-sand-100 text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Experience</th>
                <th className="px-4 py-3 font-medium">Host</th>
                <th className="px-4 py-3 font-medium">Verified</th>
                <th className="px-4 py-3 font-medium">Featured</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {experiences.map((e) => {
                const host = hostBySlug.get(e.hostSlugs[0]);
                const verified = e.verified || overrides.has(e.slug);
                const featured = e.featured || featuredOverrides.has(e.slug);
                return (
                  <tr key={e.slug} className="bg-sand-50">
                    <td className="px-4 py-3">
                      <Link href={`/experiences/${e.slug}`} className="font-medium text-ink hover:underline">{e.name}</Link>
                      <span className="block text-xs text-ink-muted">{e.location}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{host?.name ?? "—"}</td>
                    <ExperienceBadgeCells slug={e.slug} verified={verified} featured={featured} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-ink-muted">Awarding updates the badge everywhere the experience appears. Host and property verification follow the same criteria.</p>
      </section>
    </div>
  );
}
