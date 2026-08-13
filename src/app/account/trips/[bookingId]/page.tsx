import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getTrip } from "@/lib/data/bookings";
import { getDestination } from "@/lib/data/destinations";
import { getHost } from "@/lib/data/repository";
import { hero, img, portrait } from "@/lib/images";
import { formatMoney } from "@/lib/money";
import { formatDateRange, formatFullDate } from "@/lib/utils";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { Itinerary } from "@/components/experience/Itinerary";
import { BeforeYouGo } from "@/components/dashboard/BeforeYouGo";
import { FlightForm } from "@/components/dashboard/FlightForm";
import { MessageThread } from "@/components/messaging/MessageThread";
import { getMessages } from "@/lib/data/messages";
import { getBookingReview } from "@/lib/data/reviews";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { Stars } from "@/components/reviews/Stars";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getTripPrep } from "@/lib/trip/prep";
import { packingList } from "@/lib/trip/packing";
import { supportContacts } from "@/lib/trip/support";
import { TripQuestionnaire } from "@/components/trip/TripQuestionnaire";
import { PackingList } from "@/components/trip/PackingList";
import { EmergencyContacts } from "@/components/trip/EmergencyContacts";
import { payBalance } from "./actions";

export const metadata: Metadata = { title: "Your trip", robots: { index: false } };

export default async function TripPage({ params }: { params: { bookingId: string } }) {
  const user = await requireUser();
  const trip = await getTrip(user, params.bookingId);
  if (!trip) notFound();

  const destination = getDestination(trip.experience.destinationSlug);
  const host = await getHost(trip.experience.hostSlugs[0]);
  const paidPct = Math.round((trip.paidMinor / trip.subtotalMinor) * 100);
  const messages = await getMessages(trip.id);
  const existingReview = await getBookingReview(trip.id, user.id);
  // Live: reviews open once the trip is completed. Demo: always, so it's clickable.
  const canReview = trip.status === "completed" || !isSupabaseConfigured();
  const prep = await getTripPrep(trip.id);
  const packing = packingList(trip.experience);
  const contacts = supportContacts(trip.experience.destinationSlug);

  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-[38vh] items-end overflow-hidden">
        <Image src={hero(trip.experience.heroImageSeed)} alt={trip.experience.name} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/20" />
        <div className="container-editorial relative w-full pb-8 pt-16">
          <Link href="/account" className="text-sm text-sand-100/80 hover:text-sand-50">← My Trips</Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusPill status={trip.status} />
            <span className="text-sm text-sand-100/85">Ref {trip.reference}</span>
          </div>
          <h1 className="mt-2 text-display font-semibold text-sand-50">{trip.experience.name}</h1>
          <p className="mt-1 text-lg text-sand-100/90">
            {formatDateRange(trip.departure.startDate, trip.departure.endDate)} · {trip.experience.location}
          </p>
        </div>
      </section>

      <div className="container-editorial grid gap-10 py-12 lg:grid-cols-[1fr_340px]">
        <div className="space-y-12">
          {/* Booking summary */}
          <section>
            <SectionTitle>Your booking</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Dates" value={formatDateRange(trip.departure.startDate, trip.departure.endDate)} />
              <Stat label="Guests" value={String(trip.guestCount)} />
              <Stat label="Room" value={trip.room.name} />
              <Stat label="Accommodation" value={trip.experience.stay.property} />
              <Stat label="Destination" value={destination?.name ?? trip.experience.location} />
              <Stat label="Duration" value={`${trip.experience.duration} days`} />
            </div>
          </section>

          {/* Itinerary */}
          <section>
            <SectionTitle>Itinerary</SectionTitle>
            <Itinerary days={trip.experience.itinerary} />
          </section>

          {/* Before you go */}
          <section>
            <SectionTitle>Before you go</SectionTitle>
            <BeforeYouGo destination={destination} />
          </section>

          {/* Flights */}
          <section>
            <SectionTitle>Your flights</SectionTitle>
            <div className="rounded-xl2 border border-ink/10 bg-sand-100 p-6">
              <p className="mb-5 max-w-prose text-sm text-ink-muted">
                Your international flights aren&apos;t included — please arrange
                your own. Enter your details here so the team can coordinate your
                airport transfer.
              </p>
              <FlightForm bookingId={trip.id} flight={trip.flight} />
            </div>
          </section>

          {/* Messages with the host */}
          <section>
            <SectionTitle>Messages{host ? ` with ${host.name.split(" ")[0]}` : ""}</SectionTitle>
            <MessageThread
              bookingId={trip.id}
              messages={messages}
              currentUserId={user.id}
              names={{ host: host?.name ?? "Host", guest: user.name, admin: "Paradise Beyond" }}
            />
          </section>

          {/* Your review */}
          <section>
            <SectionTitle>Your review</SectionTitle>
            {existingReview ? (
              <div className="rounded-xl2 border border-ink/10 bg-sand-100 p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Stars value={existingReview.ratingOverall} className="text-xl" />
                  <span className={`rounded-full px-3 py-1 text-[0.62rem] uppercase tracking-eyebrow ${existingReview.published ? "bg-palm-500/15 text-palm-600" : "bg-clay-500/10 text-clay-600"}`}>
                    {existingReview.published ? "Published" : "Pending review"}
                  </span>
                </div>
                {existingReview.body && <p className="mt-3 text-ink-soft">{existingReview.body}</p>}
              </div>
            ) : canReview ? (
              <>
                <p className="mb-4 max-w-prose text-sm text-ink-muted">
                  How was it? Your honest review helps future guests — and your host. It&apos;s checked by our team before it goes live.
                </p>
                <ReviewForm bookingId={trip.id} experienceSlug={trip.experience.slug} />
              </>
            ) : (
              <p className="text-sm text-ink-muted">You&apos;ll be able to leave a review once your trip is complete.</p>
            )}
          </section>

          {/* Documents / questionnaire / packing */}
          <section>
            <SectionTitle>Documents & preparation</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              <TripQuestionnaire bookingId={trip.id} initial={prep} />
              <PackingList bookingId={trip.id} groups={packing} />
              <EmergencyContacts contacts={contacts} prep={prep} />
            </div>
          </section>
        </div>

        {/* Payment sidebar */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-6 shadow-soft">
            <p className="eyebrow text-ocean-700">Payment</p>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Package total" value={formatMoney(trip.subtotalMinor, trip.currency)} strong />
              <Row label="Paid" value={formatMoney(trip.paidMinor, trip.currency)} />
              <Row label="Balance" value={formatMoney(trip.balanceMinor, trip.currency)} />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-palm-500" style={{ width: `${paidPct}%` }} />
            </div>
            {trip.balanceMinor > 0 ? (
              <>
                <p className="mt-4 text-sm text-clay-600">
                  Balance of {formatMoney(trip.balanceMinor, trip.currency)} due by{" "}
                  <span className="font-medium">{formatFullDate(trip.balanceDueDate)}</span>.
                </p>
                <form action={payBalance} className="mt-4">
                  <input type="hidden" name="bookingId" value={trip.id} />
                  <button className="w-full rounded-full bg-clay-500 px-6 py-3.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600">
                    Pay balance
                  </button>
                </form>
              </>
            ) : (
              <p className="mt-4 text-sm text-palm-600">Fully paid — you&apos;re all set.</p>
            )}
          </div>

          {host && (
            <Link href={`/hosts/${host.slug}`} className="mt-4 flex items-center gap-3 rounded-xl2 border border-ink/10 p-4 transition-colors hover:border-ink/30">
              <Image src={portrait(host.imageSeed)} alt={host.name} width={48} height={56} className="h-14 w-12 flex-none rounded-lg object-cover" />
              <div>
                <p className="text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">Your host</p>
                <p className="font-medium text-ink">{host.name}</p>
                <p className="text-xs text-ink-muted">Message your host</p>
              </div>
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-5 font-display text-2xl font-semibold text-ink">{children}</h2>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-sand-50 p-4">
      <p className="text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">{label}</p>
      <p className="mt-1 font-medium text-ink">{value}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className={strong ? "font-semibold text-ink" : "text-ink-soft"}>{value}</span>
    </div>
  );
}

