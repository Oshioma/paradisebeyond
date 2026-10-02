import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getHostBookings } from "@/lib/data/bookings";
import { formatMoney } from "@/lib/money";
import { formatDateRange } from "@/lib/utils";
import { StatusPill } from "@/components/dashboard/StatusPill";

export const metadata: Metadata = { title: "Bookings", robots: { index: false } };

export default async function StudioBookingsPage() {
  const user = await requireRole("host", "/studio/bookings");
  const bookings = await getHostBookings(user.hostSlug ?? "");

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Host Studio</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Bookings & guests</h1>
        <p className="mt-3 text-ink-muted">Everyone joining your retreats, and what you&apos;ll receive.</p>
      </header>

      {bookings.length === 0 ? (
        <p className="mt-10 rounded-xl2 border border-dashed border-ink/20 py-16 text-center text-ink-muted">
          No bookings yet.
        </p>
      ) : (
        <div className="mt-10 overflow-x-auto rounded-xl2 border border-ink/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-sand-100 text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">
              <tr>
                <Th>Guest</Th><Th>Experience</Th><Th>Dates</Th><Th>Guests</Th><Th>Status</Th><Th>Your net</Th><Th>Flights</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {bookings.map((b) => (
                <tr key={b.id} className="bg-sand-50">
                  <Td className="font-medium text-ink">{b.guestName}</Td>
                  <Td>{b.experience.name}</Td>
                  <Td>{formatDateRange(b.departure.startDate, b.departure.endDate)}</Td>
                  <Td>{b.guestCount}</Td>
                  <Td><StatusPill status={b.status} /></Td>
                  <Td className="font-medium text-palm-600">{formatMoney(b.hostNetMinor, b.currency)}</Td>
                  <Td>{b.flight?.arrivalFlight ? b.flight.arrivalFlight : <span className="text-ink-muted">—</span>}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-ink-soft ${className ?? ""}`}>{children}</td>;
}
