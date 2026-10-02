import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { bookingDates, getTrip } from "@/lib/data/bookings";
import { getMessages } from "@/lib/data/messages";
import { formatDateRange } from "@/lib/utils";
import { MessageThread } from "@/components/messaging/MessageThread";
import { checklistSide } from "@/lib/offgrid/checklist";
import { getStayChecklists } from "@/lib/offgrid/checklistStore";
import { getTripPrep } from "@/lib/trip/prep";
import { HostBeforeTheyArrive } from "@/components/offgrid/StayPrep";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function HostThreadPage({ params }: { params: { bookingId: string } }) {
  const user = await requireRole("host", `/studio/messages/${params.bookingId}`);
  const trip = await getTrip(user, params.bookingId);
  if (!trip) notFound();
  const messages = await getMessages(params.bookingId);
  // Spend Time Off Grid stays: the host's pre-arrival checklist beside the thread.
  const offGrid = checklistSide(user, trip) === "host";
  const [checklists, prep] = offGrid ? await Promise.all([getStayChecklists(trip.id), getTripPrep(trip.id)]) : [null, null];
  // Until the traveller's introduction is carried into the stay, show the one
  // they wrote with their request.
  if (checklists && !checklists.guest.introduction) {
    const { requestForStay } = await import("@/lib/offgrid/requestAdopt");
    const req = await requestForStay(trip);
    if (req) checklists.guest = { ...checklists.guest, introduction: req.introduction };
  }
  const dates = bookingDates(trip);

  return (
    <div className="container-editorial py-12">
      <Link href="/studio/messages" className="text-sm text-ink-muted hover:text-ink">← All messages</Link>
      <header className="mt-3">
        <p className="eyebrow text-ocean-700">{trip.experience.name}</p>
        <h1 className="mt-1 text-headline font-semibold text-ink">{trip.guestName}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {formatDateRange(dates.start, dates.end)} · {trip.guestCount} {offGrid ? "traveller" : "guest"}(s) · Ref {trip.reference}
        </p>
      </header>

      <div className={offGrid ? "mt-8 grid items-start gap-8 lg:grid-cols-[1.15fr_1fr]" : "mt-6"}>
        {offGrid && checklists && (
          <HostBeforeTheyArrive
            trip={trip}
            checklists={checklists}
            messages={messages}
            prep={prep}
            hostName={user.name.split(" ")[0]}
            guestName={trip.guestName.split(" ")[0]}
          />
        )}
        <div className={offGrid ? "lg:sticky lg:top-6" : "max-w-2xl"}>
          {offGrid && <h2 className="mb-4 font-display text-2xl font-semibold text-ink">Messages</h2>}
          <MessageThread
            bookingId={trip.id}
            messages={messages}
            currentUserId={user.id}
            names={{ host: user.name, guest: trip.guestName, admin: offGrid ? "Spend Time Off Grid" : "Paradise Beyond" }}
          />
        </div>
      </div>
    </div>
  );
}
