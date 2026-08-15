import type { Departure, Experience, RoomType } from "@/lib/types";
import { splitCommission } from "@/lib/money";

/**
 * The platform commission rate, in basis points (1% = 100 bps). This is the
 * *current* configurable default. On a real booking the rate in force is
 * snapshotted onto the booking row, so later changes never rewrite history.
 * In production this comes from the `commission_rules` table.
 */
export const DEFAULT_COMMISSION_BPS = 1500; // 15%

export interface PriceBreakdown {
  currency: string;
  guests: number;
  perGuestMinor: number;
  roomDeltaPerGuestMinor: number;
  subtotalMinor: number;
  depositDueNowMinor: number;
  balanceMinor: number;
  balanceDueDays: number;
  // Marketplace split (stored per booking with the snapshot rate)
  commissionRateBps: number;
  platformFeeMinor: number;
  hostNetMinor: number;
}

export function priceBooking(
  experience: Experience,
  departure: Departure,
  room: RoomType,
  guests: number,
  commissionBps: number = DEFAULT_COMMISSION_BPS,
): PriceBreakdown {
  const perGuestMinor = departure.priceFromMinor + room.priceDeltaMinor;
  const subtotalMinor = perGuestMinor * guests;
  const depositDueNowMinor = departure.depositMinor * guests;
  const balanceMinor = subtotalMinor - depositDueNowMinor;
  const split = splitCommission(subtotalMinor, commissionBps);

  return {
    currency: experience.currency,
    guests,
    perGuestMinor,
    roomDeltaPerGuestMinor: room.priceDeltaMinor,
    subtotalMinor,
    depositDueNowMinor,
    balanceMinor,
    balanceDueDays: departure.balanceDueDays,
    commissionRateBps: commissionBps,
    platformFeeMinor: split.platformFeeMinor,
    hostNetMinor: split.hostNetMinor,
  };
}

/**
 * The share of the snapshotted platform fee attributable to a partial payment
 * (e.g. the deposit leg), proportional to how much of the subtotal it covers.
 * Using this for the deposit leg and taking the REMAINDER for the balance leg
 * guarantees the two legs' fees sum to exactly `platformFeeMinor` — no stray
 * cent is lost to, or taken from, the host.
 */
export function feeForPayment(platformFeeMinor: number, subtotalMinor: number, payNowMinor: number): number {
  if (subtotalMinor <= 0) return 0;
  return Math.round((platformFeeMinor * payNowMinor) / subtotalMinor);
}

/** Find the experience that owns a given departure id. */
export function findByDeparture(experiences: Experience[], departureId: string) {
  for (const e of experiences) {
    const d = e.departures.find((x) => x.id === departureId);
    if (d) return { experience: e, departure: d };
  }
  return null;
}
