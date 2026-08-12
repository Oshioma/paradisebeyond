import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getMyTrips } from "@/lib/data/bookings";
import { img } from "@/lib/images";
import { formatMoney } from "@/lib/money";
import { formatDateRange, formatFullDate } from "@/lib/utils";
import { StatusPill } from "@/components/dashboard/StatusPill";

export const metadata: Metadata = { title: "My Trips", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const trips = await getMyTrips(user);

  return (
    <div className="container-editorial py-12">
      <header className="max-w-2xl">
        <p className="eyebrow text-ocean-700">Welcome back, {user.name.split(" ")[0]}</p>
        <h1 className="mt-2 text-display font-semibold text-ink">My Trips</h1>
        <p className="mt-3 text-ink-muted">
          Everything you&apos;ve booked, and everything waiting for you on the ground.
        </p>
      </header>

      {trips.length === 0 ? (
        <div className="mt-10 rounded-xl2 border border-dashed border-ink/20 py-20 text-center">
          <p className="font-display text-2xl text-ink">No trips yet.</p>
          <p className="mt-2 text-ink-muted">When you reserve an experience, it appears here.</p>
          <Link href="/experiences" className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-ink-soft">
            Explore experiences
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-5">
          {trips.map((t) => (
            <Link
              key={t.id}
              href={`/account/trips/${t.id}`}
              className="group flex flex-col overflow-hidden rounded-xl2 border border-ink/10 bg-sand-50 transition-all hover:shadow-soft sm:flex-row"
            >
              <div className="relative h-40 w-full flex-none sm:h-auto sm:w-64">
                <Image src={img(t.experience.heroImageSeed, 500, 400)} alt={t.experience.name} fill sizes="256px" className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col justify-between gap-4 p-6">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="eyebrow text-ocean-700">{t.experience.location} · {t.experience.duration} days</p>
                    <StatusPill status={t.status} />
                  </div>
                  <h2 className="mt-1.5 font-display text-2xl font-semibold text-ink group-hover:text-ocean-700">
                    {t.experience.name}
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {formatDateRange(t.departure.startDate, t.departure.endDate)} · {t.guestCount} {t.guestCount === 1 ? "guest" : "guests"} · {t.room.name}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                  <span className="text-ink-muted">Ref {t.reference}</span>
                  {t.balanceMinor > 0 ? (
                    <span className="font-medium text-clay-600">
                      {formatMoney(t.balanceMinor, t.currency)} due by {formatFullDate(t.balanceDueDate)}
                    </span>
                  ) : (
                    <span className="font-medium text-palm-600">Paid in full</span>
                  )}
                  <span className="ml-auto text-xs uppercase tracking-eyebrow text-ink group-hover:underline">
                    View trip →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
