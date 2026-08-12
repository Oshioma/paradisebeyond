import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { DEFAULT_COMMISSION_BPS } from "@/lib/booking/pricing";
import { getAllBookings } from "@/lib/data/bookings";
import { formatMoney, splitCommission } from "@/lib/money";

export const metadata: Metadata = { title: "Commissions", robots: { index: false } };

export default async function CommissionsPage() {
  await requireRole("admin", "/desk/commissions");
  const bookings = await getAllBookings();
  const currency = bookings[0]?.currency ?? "USD";
  const totalFees = bookings.reduce((s, b) => s + b.platformFeeMinor, 0);

  // Worked example on a sample sale, using the current default rule.
  const example = splitCommission(180000, DEFAULT_COMMISSION_BPS);

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Admin Desk</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Commission</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Paradise Beyond takes a configurable commission on each sale. The rate
          is never hard-coded, and the rate in force is stored on every booking.
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-6">
          <p className="eyebrow text-ocean-700">Active rule</p>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-display text-5xl font-semibold text-ink">{(DEFAULT_COMMISSION_BPS / 100).toFixed(0)}%</span>
            <span className="text-sm text-ink-muted">global default · {DEFAULT_COMMISSION_BPS} bps</span>
          </div>
          <p className="mt-4 text-sm text-ink-muted">
            Stored in <code className="rounded bg-sand-100 px-1">commission_rules</code> as basis points, with
            optional per-destination overrides and effective dates. Editing the
            rule affects only <em>future</em> bookings.
          </p>
          <div className="mt-5 rounded-xl bg-sand-100 p-4 text-sm">
            <p className="font-medium text-ink">Worked example</p>
            <dl className="mt-2 space-y-1">
              <ExRow label="Package sale" value={formatMoney(example.grossMinor, currency)} />
              <ExRow label={`Paradise Beyond commission (${DEFAULT_COMMISSION_BPS / 100}%)`} value={formatMoney(example.platformFeeMinor, currency)} />
              <ExRow label="Host receives" value={formatMoney(example.hostNetMinor, currency)} strong />
            </dl>
          </div>
        </div>

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
