import type { Experience, Departure, RoomType } from "@/lib/types";
import type { MarketplaceId } from "@/lib/brand/config";

export type BookingStatus =
  | "pending"
  | "reserved"
  | "confirmed"
  | "balance_due"
  | "completed"
  | "cancelled"
  | "refunded";

export interface FlightDetails {
  arrivalFlight?: string;
  arrivalDate?: string;
  departureFlight?: string;
  departureDate?: string;
  notes?: string;
}

export interface Booking {
  id: string;
  reference: string;
  guestId: string;
  guestName: string;
  experienceSlug: string;
  departureId: string;
  roomTypeId: string;
  guestCount: number;
  currency: string;
  subtotalMinor: number;
  depositMinor: number;
  balanceMinor: number;
  paidMinor: number;
  balanceDueDate: string;
  commissionRateBps: number;
  platformFeeMinor: number;
  hostNetMinor: number;
  status: BookingStatus;
  createdAt: string;
  flight?: FlightDetails;
  /** Marketplace SNAPSHOT at booking time (absent on older rows = Paradise
   *  Beyond). Never derived from the experience's current marketplace. */
  marketplace?: MarketplaceId;
  /** Off-grid stays: the traveller's own arrival date and length. */
  stayStartDate?: string;
  stayNights?: number;
}

/** A booking joined with its catalogue objects, for rendering. */
export interface HydratedBooking extends Booking {
  experience: Experience;
  departure: Departure;
  room: RoomType;
}
