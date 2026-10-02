import type { Booking } from "@/lib/booking/types";
import type { Message } from "@/lib/messaging/types";
import type { TripPrep } from "@/lib/trip/types";

/**
 * "Before you go" (traveller) / "Before they arrive" (host) — the pre-arrival
 * checklist on a Spend Time Off Grid stay. Pure: no data access, so it's safe
 * in client components and unit-testable.
 *
 * One item list per side, one stored row per side (table `stay_checklists`).
 * Items are either:
 *   - derived  — computed from real data (a message from each side, the
 *                emergency contact saved…). They can't be ticked by hand.
 *   - manual   — only ever done when that person confirms it.
 *   - soon     — shown so the intended trust model is visible, never counted
 *                and never completable (e.g. identity verification).
 */

export type ChecklistSide = "guest" | "host";

/** What a side stores. Everything here is private to the booking's two parties. */
export interface ChecklistData {
  /** Manual items confirmed, by key → ISO time confirmed. */
  done?: Record<string, string>;
  /** Traveller: their introduction to the host. */
  introduction?: string;
  /** Traveller: how and when they expect to arrive. */
  arrival?: { time?: string; transport?: string; pickup?: string };
  /** Host: directions / meeting point and any pickup arrangement. */
  directions?: string;
  updatedAt?: string;
}

export interface ChecklistInputs {
  side: ChecklistSide;
  guest: ChecklistData;
  host: ChecklistData;
  messages: Pick<Message, "senderRole">[];
  prep: Pick<TripPrep, "emergencyName" | "emergencyPhone"> | null;
}

export type ItemKind = "derived" | "manual" | "soon";

export interface ChecklistItemDef {
  key: string;
  label: string;
  hint?: string;
  kind: ItemKind;
  /** Derived items: whether the underlying data is there. */
  derive?: (i: ChecklistInputs) => boolean;
}

export interface ChecklistItem extends ChecklistItemDef {
  done: boolean;
  /** Manual items can be toggled by this side right now. */
  canToggle: boolean;
}

const messagedBothWays = (i: ChecklistInputs) =>
  i.messages.some((m) => m.senderRole === "guest") && i.messages.some((m) => m.senderRole === "host");

export const GUEST_ITEMS: ChecklistItemDef[] = [
  { key: "profile", label: "Complete your profile", hint: "Traveller profiles are coming soon.", kind: "soon" },
  {
    key: "introduction",
    label: "Introduce yourself to your host",
    hint: "Who you are, why you'd like to stay and what interests you about this way of life.",
    kind: "derived",
    derive: (i) => Boolean(i.guest.introduction?.trim()),
  },
  { key: "messages", label: "Message each other", hint: "Ticks itself once you've both written in your messages.", kind: "derived", derive: messagedBothWays },
  { key: "videoCall", label: "Have a video call", hint: "Strongly recommended for first stays, remote places and longer stays.", kind: "manual" },
  { key: "help", label: "Confirm what you'll help with", hint: "Hours, days and the kind of tasks.", kind: "manual" },
  { key: "stay", label: "Confirm accommodation & meals", kind: "manual" },
  { key: "arrival", label: "Confirm arrival details", hint: "When and how you'll get there.", kind: "manual" },
  {
    key: "emergency",
    label: "Share an emergency contact",
    hint: "Private — only you and your host can see it.",
    kind: "derived",
    derive: (i) => Boolean(i.prep?.emergencyName?.trim() && i.prep?.emergencyPhone?.trim()),
  },
  { key: "identity", label: "Identity verification", hint: "Coming soon.", kind: "soon" },
];

export const HOST_ITEMS: ChecklistItemDef[] = [
  { key: "readIntro", label: "Read their introduction", kind: "manual" },
  { key: "messages", label: "Message each other", hint: "Ticks itself once you've both written in your messages.", kind: "derived", derive: messagedBothWays },
  { key: "videoCall", label: "Have a video call", kind: "manual" },
  { key: "help", label: "Confirm help & tasks", kind: "manual" },
  { key: "sleeping", label: "Confirm sleeping arrangements", kind: "manual" },
  { key: "meals", label: "Confirm meals & dietary needs", kind: "manual" },
  {
    key: "directions",
    label: "Send arrival directions",
    hint: "Directions or a meeting point, and any pickup.",
    kind: "derived",
    derive: (i) => Boolean(i.host.directions?.trim()),
  },
  { key: "arrivalTime", label: "Confirm arrival time", kind: "manual" },
  { key: "identity", label: "Identity verification", hint: "Coming soon.", kind: "soon" },
];

export function itemsFor(side: ChecklistSide): ChecklistItemDef[] {
  return side === "guest" ? GUEST_ITEMS : HOST_ITEMS;
}

/** Keys a side may tick by hand — the only ones a save may change. */
export function manualKeys(side: ChecklistSide): string[] {
  return itemsFor(side).filter((d) => d.kind === "manual").map((d) => d.key);
}

/** Resolve every item for a side: derived from data, manual from its own ticks. */
export function buildChecklist(i: ChecklistInputs): ChecklistItem[] {
  const own = i.side === "guest" ? i.guest : i.host;
  return itemsFor(i.side).map((d) => {
    if (d.kind === "soon") return { ...d, done: false, canToggle: false };
    if (d.kind === "derived") return { ...d, done: Boolean(d.derive?.(i)), canToggle: false };
    // A host can't confirm reading an introduction that hasn't been written.
    const blocked = d.key === "readIntro" && !i.guest.introduction?.trim();
    return { ...d, done: Boolean(own.done?.[d.key]) && !blocked, canToggle: !blocked };
  });
}

/** "5 of 8 ready" — "coming soon" items are never counted. */
export function progress(items: ChecklistItem[]): { done: number; total: number } {
  const counted = items.filter((x) => x.kind !== "soon");
  return { done: counted.filter((x) => x.done).length, total: counted.length };
}

/**
 * Apply a side's own manual tick. Unknown keys and derived/soon items are
 * ignored, so a save can never mark something done that isn't confirmable.
 */
export function toggleManual(data: ChecklistData, side: ChecklistSide, key: string, on: boolean, now = new Date()): ChecklistData {
  if (!manualKeys(side).includes(key)) return data;
  const done = { ...(data.done ?? {}) };
  if (on) done[key] = now.toISOString();
  else delete done[key];
  return { ...data, done };
}

/** Text limits — enough for a thoughtful introduction, not an essay. */
export const LIMITS = { introduction: 2000, directions: 2000, short: 200 } as const;

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : undefined);

/** Only the fields a side owns, trimmed and length-capped. */
export function sanitizeDetails(side: ChecklistSide, input: Record<string, unknown>): Partial<ChecklistData> {
  if (side === "guest") {
    const out: Partial<ChecklistData> = {};
    if ("introduction" in input) out.introduction = clip(input.introduction, LIMITS.introduction);
    if ("arrivalTime" in input || "transport" in input || "pickup" in input) {
      out.arrival = {
        time: clip(input.arrivalTime, LIMITS.short),
        transport: clip(input.transport, LIMITS.short),
        pickup: clip(input.pickup, LIMITS.short),
      };
    }
    return out;
  }
  return "directions" in input ? { directions: clip(input.directions, LIMITS.directions) } : {};
}

/**
 * Which side a user is on for a booking, or null if they may not see its
 * checklist. Only Spend Time Off Grid stays have one. The traveller is the
 * booking's guest; hosts (and admins) reach this only for bookings their
 * access already allows — the database policies enforce real ownership.
 */
export function checklistSide(
  user: { id: string; role: string },
  booking: Pick<Booking, "guestId" | "marketplace">,
): ChecklistSide | null {
  if (booking.marketplace !== "spendtimeoffgrid") return null;
  if (user.id === booking.guestId) return "guest";
  if (user.role === "host" || user.role === "admin") return "host";
  return null;
}
