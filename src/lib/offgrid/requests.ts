/**
 * Request-to-book for Spend Time Off Grid. A traveller asks to stay (dates,
 * travellers and an introduction); the host accepts or declines; only an
 * accepted request can become a booking, for exactly what was asked. Pure —
 * safe in client components and unit-testable.
 */

export type RequestStatus = "pending" | "accepted" | "declined" | "withdrawn" | "booked";

export interface StayRequest {
  id: string;
  guestId: string;
  guestName?: string;
  departureId: string;
  arrival: string; // ISO date
  nights: number;
  guests: number;
  introduction: string;
  status: RequestStatus;
  hostNote?: string;
  bookingId?: string;
  createdAt: string;
  decidedAt?: string;
}

/** An introduction is a few real sentences, not "Hi, can I stay?". */
export const INTRO_MIN = 40;
export const INTRO_MAX = 2000;

export function introError(text: string): string | null {
  const t = text.trim();
  if (t.length < INTRO_MIN) return "Tell your host a little more — a few sentences about you and why you'd like to stay.";
  if (t.length > INTRO_MAX) return "That's a little long — keep it under 2,000 characters.";
  return null;
}

/** Open requests are the ones that still count (one per traveller per window). */
export function isOpen(r: Pick<StayRequest, "status">): boolean {
  return r.status === "pending" || r.status === "accepted";
}

/**
 * The request that governs what a traveller sees for one availability window:
 * an open one if there is one, otherwise the most recent.
 */
export function currentRequest(requests: StayRequest[], departureId: string, guestId: string): StayRequest | null {
  const mine = requests
    .filter((r) => r.departureId === departureId && r.guestId === guestId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return mine.find(isOpen) ?? mine[0] ?? null;
}

/** May this booking go ahead? Only for an accepted request, for exactly what was asked. */
export function bookingAllowed(
  req: StayRequest | null,
  b: { guestId: string; departureId: string; arrival: string; nights: number; guests: number },
): { ok: true } | { ok: false; error: string } {
  if (!req || req.guestId !== b.guestId || req.departureId !== b.departureId) {
    return { ok: false, error: "Send your host a request first — you can book once they've said yes." };
  }
  if (req.status === "pending") return { ok: false, error: "Your host hasn't replied to your request yet." };
  if (req.status !== "accepted") return { ok: false, error: "This request isn't open any more. You can send a new one." };
  if (req.arrival !== b.arrival || req.nights !== b.nights || req.guests !== b.guests) {
    return { ok: false, error: "Your host accepted different dates or travellers. Book what they accepted, or send a new request." };
  }
  return { ok: true };
}

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Waiting for the host",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
  booked: "Booked",
};
