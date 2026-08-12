import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getAllBookings } from "@/lib/data/bookings";
import { formatMoney } from "@/lib/money";
import { formatDateRange } from "@/lib/utils";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { refundBooking } from "./actions";

export const metadata: Metadata = { title: "Bookings", robots: { index: false } };

export default async function DeskBookingsPage() {
  await requireRole("admin", "/desk/bookings");
  const bookings = await getAllBookings();
  const currency = bookings[0]?.currency ?? "USD";
  const gross = bookings.reduce((s, b) => s + b.subtotalMinor, 0);
  const fees = bookings.reduce((s, b) => s + b.platformFeeMinor, 0);

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Admin Desk</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Bookings</h1>
        <p className="mt-3 text-ink-muted">
          {bookings.length} bookings · {formatMoney(gross, currency)} sold · {formatMoney(fees, currency)} commission
        </p>
      </header>

      <div className="mt-10 overflow-x-auto rounded-xl2 border border-ink/10">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-sand-100 text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">
            <tr>
              <Th>Ref</Th><Th>Guest</Th><Th>Experience</Th><Th>Dates</Th><Th>Gross</Th><Th>Commission</Th><Th>Host net</Th><Th>Status</Th><Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {bookings.map((b) => (
              <tr key={b.id} className="bg-sand-50">
                <Td className="font-mono text-xs text-ink-muted">{b.reference}</Td>
                <Td className="font-medium text-ink">{b.guestName}</Td>
                <Td>{b.experience.name}</Td>
                <Td>{formatDateRange(b.departure.startDate, b.departure.endDate)}</Td>
                <Td>{formatMoney(b.subtotalMinor, b.currency)}</Td>
                <Td className="text-ocean-700">{formatMoney(b.platformFeeMinor, b.currency)} <span className="text-ink-muted">({(b.commissionRateBps / 100).toFixed(0)}%)</span></Td>
                <Td className="text-palm-600">{formatMoney(b.hostNetMinor, b.currency)}</Td>
                <Td><StatusPill status={b.status} /></Td>
                <Td>
                  {(b.status === "reserved" || b.status === "confirmed") && (
                    <form action={refundBooking}>
                      <input type="hidden" name="bookingId" value={b.id} />
                      <button className="rounded-full border border-ink/15 px-3 py-1.5 text-[0.62rem] uppercase tracking-eyebrow text-ink-muted hover:border-clay-500 hover:text-clay-600">
                        Refund
                      </button>
                    </form>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink-muted">
        The commission rate shown is the rate <em>snapshotted on each booking</em> — changing the platform rate later never rewrites these figures.
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
