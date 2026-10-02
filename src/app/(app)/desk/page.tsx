import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getApplications } from "@/lib/data/applications";
import { getAllBookings } from "@/lib/data/bookings";
import { getAllExperiences, getAllHosts } from "@/lib/data/repository";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Admin Desk", robots: { index: false } };

export default async function DeskPage() {
  await requireRole("admin", "/desk");
  const [apps, bookings, experiences, hosts] = await Promise.all([
    getApplications(),
    getAllBookings(),
    getAllExperiences(),
    getAllHosts(),
  ]);

  const pending = apps.filter((a) => a.status === "submitted" || a.status === "under_review").length;
  const grossMinor = bookings.reduce((s, b) => s + b.subtotalMinor, 0);
  const feeMinor = bookings.reduce((s, b) => s + b.platformFeeMinor, 0);
  const currency = bookings[0]?.currency ?? "USD";

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Paradise Beyond</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Admin Desk</h1>
        <p className="mt-3 text-ink-muted">The whole marketplace, curated from here.</p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Applications to review" value={String(pending)} href="/desk/applications" accent={pending > 0} />
        <Stat label="Published experiences" value={String(experiences.length)} href="/desk/experiences" />
        <Stat label="Bookings" value={String(bookings.length)} href="/desk/bookings" />
        <Stat label="Platform commission" value={formatMoney(feeMinor, currency)} sub={`of ${formatMoney(grossMinor, currency)} sold`} href="/desk/commissions" />
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        <Manage title="Hosts" count={hosts.length} note="Profiles, verification, payouts" />
        <Manage title="Destinations & properties" count={2} note="Multi-country ready" />
        <Manage title="Homepage & featured" count={experiences.filter((e) => e.featured).length} note="Curate what leads" />
      </div>

      <div className="mt-12 rounded-xl2 border border-ink/10 bg-sand-50 p-6">
        <h2 className="font-display text-xl font-semibold text-ink">Curate the launch</h2>
        <p className="mt-2 max-w-prose text-sm text-ink-muted">
          Paradise Beyond launches curated — around ten exceptional experiences.
          Admins create experiences directly as well as approve host-built ones.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/desk/applications" className="rounded-full bg-ink px-5 py-2.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-ink-soft">Review applications</Link>
          <Link href="/desk/experiences" className="rounded-full border border-ink/15 px-5 py-2.5 text-xs uppercase tracking-eyebrow text-ink-soft hover:border-ink/40">Manage experiences</Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, href, accent }: { label: string; value: string; sub?: string; href: string; accent?: boolean }) {
  return (
    <Link href={href} className={`rounded-xl2 border p-5 transition-colors hover:border-ink/30 ${accent ? "border-clay-500/40 bg-clay-500/5" : "border-ink/10 bg-sand-50"}`}>
      <p className="text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="text-xs text-ink-muted">{sub}</p>}
    </Link>
  );
}

function Manage({ title, count, note }: { title: string; count: number; note: string }) {
  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-ink">{title}</h3>
        <span className="font-display text-lg text-ink-muted">{count}</span>
      </div>
      <p className="mt-1 text-sm text-ink-muted">{note}</p>
    </div>
  );
}
