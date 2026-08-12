import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getAllExperiences } from "@/lib/data/repository";
import { getHost } from "@/lib/data/hosts";
import { getVerificationCriteria, getDemoVerifiedSlugs } from "@/lib/admin/verification";
import { CriteriaEditor } from "@/components/admin/CriteriaEditor";
import { toggleVerified } from "./actions";

export const metadata: Metadata = { title: "Verification", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerificationPage() {
  await requireRole("admin", "/desk/verification");
  const [criteria, experiences, demoVerified] = await Promise.all([
    getVerificationCriteria(),
    getAllExperiences(),
    getDemoVerifiedSlugs(),
  ]);
  const overrides = new Set(demoVerified);

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
        <p className="mt-1 text-sm text-ink-muted">Award once you&apos;ve checked every criterion above.</p>
        <div className="mt-4 overflow-x-auto rounded-xl2 border border-ink/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-sand-100 text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Experience</th>
                <th className="px-4 py-3 font-medium">Host</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {experiences.map((e) => {
                const host = getHost(e.hostSlugs[0]);
                const verified = e.verified || overrides.has(e.slug);
                return (
                  <tr key={e.slug} className="bg-sand-50">
                    <td className="px-4 py-3">
                      <Link href={`/experiences/${e.slug}`} className="font-medium text-ink hover:underline">{e.name}</Link>
                      <span className="block text-xs text-ink-muted">{e.location}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{host?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {verified
                        ? <span className="rounded-full bg-palm-500/15 px-2.5 py-1 text-[0.62rem] uppercase tracking-eyebrow text-palm-600">Verified</span>
                        : <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[0.62rem] uppercase tracking-eyebrow text-ink-muted">Not verified</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={toggleVerified} className="inline">
                        <input type="hidden" name="slug" value={e.slug} />
                        <input type="hidden" name="verified" value={verified ? "0" : "1"} />
                        <button className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-eyebrow ${verified ? "border border-ink/15 text-ink-muted hover:border-clay-500 hover:text-clay-600" : "bg-palm-500 text-sand-50 hover:bg-palm-600"}`}>
                          {verified ? "Revoke" : "Award"}
                        </button>
                      </form>
                    </td>
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
