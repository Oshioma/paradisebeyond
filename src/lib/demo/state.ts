import { cookies } from "next/headers";
import type { Booking, FlightDetails } from "@/lib/booking/types";
import type { ApplicationStatus } from "@/lib/demo/applications";
import type { Message } from "@/lib/messaging/types";
import type { Review } from "@/lib/reviews/types";
import type { TripPrep } from "@/lib/trip/types";

/**
 * Mutable demo state, persisted in a single cookie so actions taken in one
 * session (saving flight details, approving an application, making a booking)
 * are reflected across pages. Small by design — this only exists in demo mode.
 */
const STATE_COOKIE = "pb_demo_state";

export interface DemoState {
  flights: Record<string, FlightDetails>;
  apps: Record<string, ApplicationStatus>;
  /** Host applications submitted in demo mode (seed apps live in code). */
  demoApps?: import("@/lib/demo/applications").HostApplication[];
  bookings: Booking[];
  /** Booking ids whose balance was paid in demo. */
  balancePaid: string[];
  /** Booking ids refunded/cancelled in demo. */
  refunded: string[];
  /** Messages posted in demo. */
  messages: Message[];
  /** Guest reviews submitted in demo (may be pending or published). */
  reviews: Review[];
  /** Per-booking pre-trip questionnaire answers (demo). */
  tripPrep: Record<string, TripPrep>;
  /** Admin-edited commission (demo): global rate + per-destination overrides, in bps. */
  commissionGlobalBps?: number;
  commissionByDest?: Record<string, number>;
  /** Admin-edited verification criteria (demo). */
  verificationCriteria?: string[];
  /** Experience slugs the admin marked verified (demo). */
  verifiedSlugs?: string[];
  /** Admin-selected AI model (demo mode; per-browser). */
  aiModelId?: string;
}

const EMPTY: DemoState = { flights: {}, apps: {}, bookings: [], balancePaid: [], refunded: [], messages: [], reviews: [], tripPrep: {} };

export function readDemoState(): DemoState {
  try {
    const raw = cookies().get(STATE_COOKIE)?.value;
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

export function writeDemoState(state: DemoState) {
  cookies().set(STATE_COOKIE, JSON.stringify(state), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function updateDemoState(mutate: (s: DemoState) => void) {
  const state = readDemoState();
  mutate(state);
  writeDemoState(state);
}
