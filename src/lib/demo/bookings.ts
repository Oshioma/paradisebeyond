import type { Booking } from "@/lib/booking/types";

/**
 * Seed bookings for the demo guest (Ava Traveller). One reserved with a balance
 * still due, one paid in full — enough to show My Trips, payment status,
 * Before You Go and flight entry.
 */
export const DEMO_BOOKINGS: Booking[] = [
  {
    id: "bk-1001",
    reference: "PB-8F2A1C7D",
    guestId: "demo-guest",
    guestName: "Ava Traveller",
    experienceSlug: "zanzibar-reconnection",
    departureId: "zr-2026-10",
    roomTypeId: "private-garden",
    guestCount: 1,
    currency: "USD",
    subtotalMinor: 200000,
    depositMinor: 45000,
    balanceMinor: 155000,
    paidMinor: 45000,
    balanceDueDate: "2026-08-28",
    commissionRateBps: 1500,
    platformFeeMinor: 30000,
    hostNetMinor: 170000,
    status: "reserved",
    createdAt: "2026-07-30",
  },
  {
    id: "bk-1002",
    reference: "PB-3B9E4A6F",
    guestId: "demo-guest",
    guestName: "Ava Traveller",
    experienceSlug: "fourteen-days-beyond-zanzibar",
    departureId: "bz-2026-11",
    roomTypeId: "shared",
    guestCount: 2,
    currency: "USD",
    subtotalMinor: 672000,
    depositMinor: 200000,
    balanceMinor: 0,
    paidMinor: 672000,
    balanceDueDate: "2026-09-23",
    commissionRateBps: 1500,
    platformFeeMinor: 100800,
    hostNetMinor: 571200,
    status: "confirmed",
    createdAt: "2026-06-12",
  },
];
