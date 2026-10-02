import type { Booking } from "@/lib/booking/types";

/**
 * Arrival and first-night check-ins for Spend Time Off Grid stays. Pure.
 *
 * Timing — keep in step with queue_stay_checkins() in migration 0034:
 *   arrival  → 16:00 UTC on the arrival day: "Have you arrived safely?"
 *   settled  → 10:00 UTC the next morning (stays of 2+ nights):
 *              "Everything okay with your stay?"
 * Only check-ins due in the last 2 days are queued (no back-filling old stays).
 */

export type CheckinKind = "arrival" | "settled";
export type CheckinResponse = "ok" | "help";

export interface Checkin {
  bookingId: string;
  kind: CheckinKind;
  dueAt: string;
  notifiedAt?: string;
  response?: CheckinResponse;
  note?: string;
  respondedAt?: string;
}

export const CHECKIN_COPY: Record<CheckinKind, { question: string; yes: string; no: string; thanks: string }> = {
  arrival: {
    question: "Have you arrived safely?",
    yes: "Yes — I'm here",
    no: "I need help",
    thanks: "Glad you've arrived. Enjoy settling in.",
  },
  settled: {
    question: "Everything okay with your stay?",
    yes: "Yes, all good",
    no: "I have a problem",
    thanks: "Good to hear. Enjoy the rest of your stay.",
  },
};

export function checkinDueAt(kind: CheckinKind, stayStartDate: string): string {
  const d = new Date(`${stayStartDate}T00:00:00Z`);
  if (kind === "arrival") d.setUTCHours(16);
  else {
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(10);
  }
  return d.toISOString();
}

const WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

/** The check-ins that are due for a booking at `now` (what the cron would queue). */
export function dueCheckins(
  b: Pick<Booking, "id" | "marketplace" | "status" | "stayStartDate" | "stayNights">,
  now: Date = new Date(),
): Checkin[] {
  if (b.marketplace !== "spendtimeoffgrid" || !b.stayStartDate) return [];
  if (b.status !== "reserved" && b.status !== "confirmed") return [];
  const kinds: CheckinKind[] = (b.stayNights ?? 0) >= 2 ? ["arrival", "settled"] : ["arrival"];
  return kinds
    .map((kind) => ({ bookingId: b.id, kind, dueAt: checkinDueAt(kind, b.stayStartDate!) }))
    .filter((c) => {
      const due = new Date(c.dueAt).getTime();
      return due <= now.getTime() && due > now.getTime() - WINDOW_MS;
    });
}

/** The check-in to show: the most recent one that's due (answered or not). */
export function latestCheckin(checkins: Checkin[]): Checkin | null {
  return [...checkins].sort((a, b) => b.dueAt.localeCompare(a.dueAt))[0] ?? null;
}

/** Arrival check-ins with no answer 24h after the email went out — support should follow up. */
export function needsEscalation(c: Checkin & { escalatedAt?: string }, now: Date = new Date()): boolean {
  return (
    c.kind === "arrival" && !c.response && !c.escalatedAt && Boolean(c.notifiedAt) &&
    now.getTime() - new Date(c.notifiedAt!).getTime() >= 24 * 60 * 60 * 1000
  );
}
