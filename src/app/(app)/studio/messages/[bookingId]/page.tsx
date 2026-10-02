import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getTrip } from "@/lib/data/bookings";
import { getMessages } from "@/lib/data/messages";
import { formatDateRange } from "@/lib/utils";
import { MessageThread } from "@/components/messaging/MessageThread";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function HostThreadPage({ params }: { params: { bookingId: string } }) {
  const user = await requireRole("host", `/studio/messages/${params.bookingId}`);
  const trip = await getTrip(user, params.bookingId);
  if (!trip) notFound();
  const messages = await getMessages(params.bookingId);

  return (
    <div className="container-editorial py-12">
      <Link href="/studio/messages" className="text-sm text-ink-muted hover:text-ink">← All messages</Link>
      <header className="mt-3">
        <p className="eyebrow text-ocean-700">{trip.experience.name}</p>
        <h1 className="mt-1 text-headline font-semibold text-ink">{trip.guestName}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {formatDateRange(trip.departure.startDate, trip.departure.endDate)} · {trip.guestCount} guest(s) · Ref {trip.reference}
        </p>
      </header>

      <div className="mt-6 max-w-2xl">
        <MessageThread
          bookingId={trip.id}
          messages={messages}
          currentUserId={user.id}
          names={{ host: user.name, guest: trip.guestName, admin: "Paradise Beyond" }}
        />
      </div>
    </div>
  );
}
