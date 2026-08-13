import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getAllBookings } from "@/lib/data/bookings";
import { getAllDestinations } from "@/lib/data/repository";
import { getActiveCommissionBps, getDestinationOverrideBps } from "@/lib/booking/commission";
import { formatMoney, splitCommission } from "@/lib/money";
import { setCommission } from "./actions";

export const metadata: Metadata = { title: "Commissions", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CommissionsPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  await requireRole("admin", "/desk/commissions");
  const [bookings, destinations, globalBps] = await Promise.all([
    getAllBookings(),
    getAllDestinations(),
    getActiveCommissionBps(),
  ]);
  const overrides = await Promise.all(
    destinations.map(async (d) => ({ slug: d.slug, name: d.name, bps: await getDestinationOverrideBps(d.slug) })),
  );

  const currency = bookings[0]?.currency ?? "USD";
  const totalFees = bookings.reduce((s, b) => s + b.platformFeeMinor, 0);
  const example = splitCommission(180000, globalBps);

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Admin Desk</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Commission</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Paradise Beyond takes a configurable commission on each sale. Set it
          here — the rate in force is snapshotted onto every booking, so changes
          only affect <em>future</em> bookings.
        </p>
      </header>

      {searchParams.saved && (
        <div className="mt-6 rounded-xl2 border border-palm-500/40 bg-palm-500/5 p-4 text-sm text-palm-600">✓ Commission updated. Applies to future bookings.</div>
      )}
      {searchParams.error && (
        <div className="mt-6 rounded-xl2 border border-clay-500/50 bg-clay-500/10 p-4 text-sm text-clay-600">✗ {searchParams.error}</div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Editor */}
        <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-6">
          <p className="eyebrow text-ocean-700">Global rate</p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-display text-5xl font-semibold text-ink">{(globalBps / 100).toFixed(globalBps % 100 ? 1 : 0)}%</span>
            <span className="text-sm text-ink-muted">{globalBps} bps · applies everywhere unless overridden</span>
          </div>
          <form action={setCommission} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="scope" value="global" />
            <label className="text-sm">
              <span className="mb-1 block text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">New rate (%)</span>
              <input name="rate" type="number" step="0.1" min={0} max={100} defaultValue={globalBps / 100}
                className="w-32 rounded-xl border border-ink/15 bg-sand-50 px-3 py-2 text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500" />
            </label>
            <button className="rounded-full bg-clay-500 px-6 py-2.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600">Save global rate</button>
          </form>

          <p className="mt-6 eyebrow text-ocean-700">Per-destination overrides</p>
          <p className="mt-1 text-xs text-ink-muted">Leave blank to inherit the global rate.</p>
          <div className="mt-3 space-y-2">
            {overrides.map((o) => (
              <form key={o.slug} action={setCommission} className="flex items-center gap-3 rounded-lg border border-ink/10 bg-sand-100 px-3 py-2">
                <input type="hidden" name="scope" value={o.slug} />
                <span className="flex-1 text-sm text-ink">{o.name}</span>
                <input
                  name="rate"
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  defaultValue={o.bps == null ? "" : o.bps / 100}
                  placeholder={`${(globalBps / 100).toFixed(0)} (global)`}
                  className="w-28 rounded-lg border border-ink/15 bg-sand-50 px-3 py-1.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
                />
                <button className="rounded-full border border-ink/15 px-4 py-1.5 text-xs uppercase tracking-eyebrow text-ink-soft hover:border-ink/40">Save</button>
              </form>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-sand-100 p-4 text-sm">
            <p className="font-medium text-ink">Worked example (global rate)</p>
            <dl className="mt-2 space-y-1">
              <ExRow label="Package sale" value={formatMoney(example.grossMinor, currency)} />
              <ExRow label={`Paradise Beyond commission (${(globalBps / 100).toFixed(globalBps % 100 ? 1 : 0)}%)`} value={formatMoney(example.platformFeeMinor, currency)} />
              <ExRow label="Host receives" value={formatMoney(example.hostNetMinor, currency)} strong />
            </dl>
          </div>
        </div>

        {/* Collected to date */}
        <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-6">
          <p className="eyebrow text-ocean-700">Collected to date</p>
          <p className="mt-3 font-display text-4xl font-semibold text-ink">{formatMoney(totalFees, currency)}</p>
          <p className="mt-1 text-sm text-ink-muted">across {bookings.length} bookings</p>

          <div className="mt-6 space-y-2">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg bg-sand-100 px-4 py-2 text-sm">
                <span className="text-ink-soft">{b.reference}</span>
                <span className="text-ocean-700">{formatMoney(b.platformFeeMinor, b.currency)} <span className="text-ink-muted">@ {(b.commissionRateBps / 100).toFixed(0)}%</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={strong ? "font-semibold text-ink" : "text-ink-soft"}>{value}</dd>
    </div>
  );
}
