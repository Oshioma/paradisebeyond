import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getExperiencesByHost } from "@/lib/data/repository";
import { getHostBookings } from "@/lib/data/bookings";
import { getHost } from "@/lib/data/hosts";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Host Studio", robots: { index: false } };

export default async function StudioPage() {
  const user = await requireRole("host", "/studio");
  const hostSlug = user.hostSlug ?? "amina-yusuf";
  const host = getHost(hostSlug);
  const experiences = await getExperiencesByHost(hostSlug);
  const bookings = await getHostBookings(hostSlug);

  const upcomingDepartures = experiences.flatMap((e) => e.departures).length;
  const guests = bookings.reduce((sum, b) => sum + b.guestCount, 0);
  const grossMinor = bookings.reduce((sum, b) => sum + b.subtotalMinor, 0);
  const netMinor = bookings.reduce((sum, b) => sum + b.hostNetMinor, 0);
  const currency = bookings[0]?.currency ?? "USD";

  return (
    <div className="container-editorial py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-ocean-700">Welcome, {user.name.split(" ")[0]}</p>
          <h1 className="mt-2 text-display font-semibold text-ink">Host Studio</h1>
        </div>
        <Link href="/studio/retreats/new" className="rounded-full bg-clay-500 px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600">
          + New retreat
        </Link>
      </header>

      {host && (
        <div className="mt-6 flex items-center gap-3 rounded-xl2 border border-ink/10 bg-sand-50 p-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-palm-500/15 px-3 py-1 text-[0.66rem] font-medium uppercase tracking-eyebrow text-palm-600">
            {host.verified ? "Verified host" : "Application approved"}
          </span>
          <p className="text-sm text-ink-muted">
            Your host profile is live. Travellers can find you at{" "}
            <Link href={`/hosts/${host.slug}`} className="text-ink underline underline-offset-4">
              /hosts/{host.slug}
            </Link>
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Live retreats" value={String(experiences.length)} />
        <StatCard label="Upcoming departures" value={String(upcomingDepartures)} />
        <StatCard label="Guests booked" value={String(guests)} />
        <StatCard label="Your earnings" value={formatMoney(netMinor, currency)} sub={`of ${formatMoney(grossMinor, currency)} gross`} />
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <Panel title="Your retreats" href="/studio/retreats" cta="Manage">
          {experiences.length === 0 ? (
            <Empty>No retreats yet. Create your first.</Empty>
          ) : (
            <ul className="divide-y divide-ink/10">
              {experiences.map((e) => (
                <li key={e.slug} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-ink">{e.name}</p>
                    <p className="text-sm text-ink-muted">{e.duration} days · {e.departures.length} departures</p>
                  </div>
                  <Link href={`/experiences/${e.slug}`} className="text-xs uppercase tracking-eyebrow text-ink hover:underline">
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent bookings" href="/studio/bookings" cta="All bookings">
          {bookings.length === 0 ? (
            <Empty>No bookings yet.</Empty>
          ) : (
            <ul className="divide-y divide-ink/10">
              {bookings.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-ink">{b.guestName}</p>
                    <p className="text-sm text-ink-muted">{b.experience.name} · {b.guestCount} guests</p>
                  </div>
                  <span className="text-sm font-medium text-palm-600">{formatMoney(b.hostNetMinor, b.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-5">
      <p className="text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}

function Panel({ title, href, cta, children }: { title: string; href: string; cta: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
        <Link href={href} className="text-xs uppercase tracking-eyebrow text-ink-muted hover:text-ink">{cta} →</Link>
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-ink-muted">{children}</p>;
}
