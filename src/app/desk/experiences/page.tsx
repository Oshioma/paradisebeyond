import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getAllExperiences } from "@/lib/data/repository";
import { getHost } from "@/lib/data/hosts";
import { formatFrom } from "@/lib/money";

export const metadata: Metadata = { title: "Experiences", robots: { index: false } };

export default async function DeskExperiencesPage() {
  await requireRole("admin", "/desk/experiences");
  const experiences = await getAllExperiences();

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

      <div className="mt-10 overflow-x-auto rounded-xl2 border border-ink/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-sand-100 text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">
            <tr>
              <Th>Experience</Th><Th>Host</Th><Th>Length</Th><Th>From</Th><Th>Verified</Th><Th>Featured</Th><Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {experiences.map((e) => {
              const host = getHost(e.hostSlugs[0]);
              return (
                <tr key={e.slug} className="bg-sand-50">
                  <Td className="font-medium text-ink">{e.name}<span className="block text-xs font-normal text-ink-muted">{e.location}</span></Td>
                  <Td>{host?.name ?? "—"}</Td>
                  <Td>{e.duration} days</Td>
                  <Td>{formatFrom(e.priceFromMinor, e.currency)}</Td>
                  <Td>{e.verified ? <Dot tone="palm">Verified</Dot> : <Dot tone="muted">Not yet</Dot>}</Td>
                  <Td>{e.featured ? <Dot tone="ocean">Featured</Dot> : <span className="text-ink-muted">—</span>}</Td>
                  <Td><Link href={`/experiences/${e.slug}`} className="text-xs uppercase tracking-eyebrow text-ink hover:underline">View</Link></Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink-muted">
        Verified is awarded by admins only — never self-serve. Criteria are configurable and stored against hosts, properties and experiences.
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
