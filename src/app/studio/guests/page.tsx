import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getHostBookings } from "@/lib/data/bookings";
import { isPastVisit, getInviteSendTimes } from "@/lib/memories/store";
import { formatDateRange } from "@/lib/utils";
import { PastGuestsComposer, type GuestGroup } from "@/components/host/PastGuestsComposer";

export const metadata: Metadata = { title: "Past guests", robots: { index: false } };

/**
 * Message past visitors: pick guests whose retreat has ended and send them a
 * branded email with a magic link to add photos + review the retreat.
 */
export default async function StudioGuestsPage() {
  const user = await requireRole("host", "/studio/guests");
  const bookings = (await getHostBookings(user.hostSlug ?? "")).filter(isPastVisit);
  const invited = await getInviteSendTimes(bookings.map((b) => b.id));

  const groups = new Map<string, GuestGroup>();
  for (const b of bookings) {
    const g = groups.get(b.experience.slug) ?? {
      experienceSlug: b.experience.slug,
      experienceName: b.experience.name,
      guests: [],
    };
    g.guests.push({
      bookingId: b.id,
      guestName: b.guestName,
      dates: formatDateRange(b.departure.startDate, b.departure.endDate),
      guestCount: b.guestCount,
      invitedAt: invited[b.id] ? invited[b.id].slice(0, 10) : null,
    });
    groups.set(b.experience.slug, g);
  }

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Host Studio</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Past guests</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Send a branded email to guests who&apos;ve travelled with you. Each guest gets a personal link to add
          their photos and review the retreat — no sign-in needed. Their photos can then appear on your retreat
          page, allocated day by day.
        </p>
      </header>

      {groups.size === 0 ? (
        <p className="mt-10 rounded-xl2 border border-dashed border-ink/20 py-16 text-center text-ink-muted">
          No past guests yet — once a departure has ended, its guests appear here.
        </p>
      ) : (
        <div className="mt-10 space-y-10">
          {[...groups.values()].map((g) => (
            <PastGuestsComposer key={g.experienceSlug} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}
