import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getAllExperiences, getAllHosts } from "@/lib/data/repository";
import { formatFrom } from "@/lib/money";
import { ExperienceReorder, type ReorderItem } from "@/components/dashboard/ExperienceReorder";
import { ExperienceHostSelect } from "@/components/dashboard/ExperienceHostSelect";
import { RepublishButton } from "@/components/dashboard/RepublishButton";
import { StartFromSampleButton } from "@/components/dashboard/StartFromSampleButton";

export const metadata: Metadata = { title: "Experiences", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DeskExperiencesPage() {
  await requireRole("admin", "/desk/experiences");
  const [experiences, hosts] = await Promise.all([getAllExperiences(), getAllHosts()]);
  const hostBySlug = new Map(hosts.map((h) => [h.slug, h]));
  const hostOptions = hosts.map((h) => ({ slug: h.slug, name: h.name }));

  const reorderItems: ReorderItem[] = experiences.map((e) => ({
    slug: e.slug,
    name: e.name,
    location: e.location,
    host: hostBySlug.get(e.hostSlugs[0])?.name ?? "—",
    meta: `${e.duration} days · ${formatFrom(e.priceFromMinor, e.currency)}`,
    verified: Boolean(e.verified),
    featured: Boolean(e.featured),
    editHref: e.retreatDraftId ? `/studio/retreats/new?id=${e.retreatDraftId}` : undefined,
  }));

  return (
    <div className="container-editorial py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-ocean-700">Admin Desk</p>
          <h1 className="mt-2 text-display font-semibold text-ink">Experiences</h1>
        </div>
        <Link href="/studio/retreats/new" className="rounded-full bg-clay-500 px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600" title="Build a curated experience — publishes on submit">
          + Create experience
        </Link>
      </header>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">Order on the site</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          This is the exact order guests see across the listing and homepage. Put any retreat first by tapping <span className="font-medium text-ink">Top</span>.
        </p>
        <div className="mt-4">
          <ExperienceReorder items={reorderItems} />
        </div>
      </section>

      <h2 className="mt-12 font-display text-2xl font-semibold text-ink">Details</h2>
      <div className="mt-4 overflow-x-auto rounded-xl2 border border-ink/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-sand-100 text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">
            <tr>
              <Th>Experience</Th><Th>Host</Th><Th>Length</Th><Th>From</Th><Th>Verified</Th><Th>Featured</Th><Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {experiences.map((e) => {
              return (
                <tr key={e.slug} className="bg-sand-50">
                  <Td className="font-medium text-ink">{e.name}<span className="block text-xs font-normal text-ink-muted">{e.location}</span></Td>
                  <Td><ExperienceHostSelect slug={e.slug} currentHostSlug={e.hostSlugs[0]} hosts={hostOptions} /></Td>
                  <Td>{e.duration} days</Td>
                  <Td>{formatFrom(e.priceFromMinor, e.currency)}</Td>
                  <Td>{e.verified ? <Dot tone="palm">Verified</Dot> : <Dot tone="muted">Not yet</Dot>}</Td>
                  <Td>{e.featured ? <Dot tone="ocean">Featured</Dot> : <span className="text-ink-muted">—</span>}</Td>
                  <Td>
                    <div className="flex flex-wrap justify-end gap-3">
                      <Link href={`/experiences/${e.slug}`} className="text-xs uppercase tracking-eyebrow text-ink hover:underline">View</Link>
                      {e.retreatDraftId && (
                        <Link href={`/studio/retreats/new?id=${e.retreatDraftId}`} className="text-xs uppercase tracking-eyebrow text-ocean-700 hover:underline">Edit</Link>
                      )}
                      {e.retreatDraftId && <RepublishButton slug={e.slug} />}
                      <StartFromSampleButton slug={e.slug} />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink-muted">
        Verified is awarded by admins only — never self-serve. Criteria are configurable and stored against hosts, properties and experiences.
      </p>
      <p className="mt-2 text-xs text-ink-muted">
        <span className="font-medium text-clay-600">Make mine</span> forks a retreat (including the built-in samples) into a fresh editable draft owned by you and opens the builder — edit it, then publish it as your own.
      </p>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-ink-soft ${className ?? ""}`}>{children}</td>;
}
function Dot({ children, tone }: { children: React.ReactNode; tone: "palm" | "ocean" | "muted" }) {
  const c = tone === "palm" ? "bg-palm-500/15 text-palm-600" : tone === "ocean" ? "bg-ocean-500/12 text-ocean-700" : "bg-ink/5 text-ink-muted";
  return <span className={`rounded-full px-2.5 py-1 text-[0.62rem] uppercase tracking-eyebrow ${c}`}>{children}</span>;
}
