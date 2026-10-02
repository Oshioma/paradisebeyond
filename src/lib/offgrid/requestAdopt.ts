import type { SessionUser } from "@/lib/auth/types";
import type { Booking } from "@/lib/booking/types";
import { getStayChecklists, saveStayChecklist } from "@/lib/offgrid/checklistStore";
import { linkRequest, listVisibleRequests } from "@/lib/offgrid/requestStore";
import type { StayRequest } from "@/lib/offgrid/requests";

/**
 * The accepted request a stay was booked from (matched on traveller, window,
 * arrival and nights), if any.
 */
export async function requestForStay(
  booking: Pick<Booking, "id" | "guestId" | "departureId" | "stayStartDate" | "stayNights">,
): Promise<StayRequest | null> {
  const all = await listVisibleRequests();
  return (
    all.find((r) => r.bookingId === booking.id) ??
    all.find(
      (r) =>
        r.status === "accepted" && !r.bookingId && r.guestId === booking.guestId && r.departureId === booking.departureId &&
        r.arrival === booking.stayStartDate && r.nights === booking.stayNights,
    ) ??
    null
  );
}

/**
 * Once a request becomes a booking: link them, and carry the introduction into
 * the stay's checklist and messages (once), so the conversation starts where
 * the request left off. Traveller-only; safe to call repeatedly.
 */
export async function adoptRequestIntoStay(user: SessionUser, booking: Pick<Booking, "id" | "guestId" | "departureId" | "stayStartDate" | "stayNights" | "marketplace">) {
  if (booking.marketplace !== "spendtimeoffgrid" || booking.guestId !== user.id) return;
  const req = await requestForStay(booking);
  if (!req) return;
  if (req.status === "accepted" && !req.bookingId) await linkRequest(req.id, booking.id, user.id);
  const lists = await getStayChecklists(booking.id);
  if (!lists.guest.introduction) {
    const saved = await saveStayChecklist(booking.id, "guest", { ...lists.guest, introduction: req.introduction });
    if (saved) {
      const { sendMessage } = await import("@/lib/messaging/actions");
      const fd = new FormData();
      fd.set("bookingId", booking.id);
      fd.set("body", req.introduction);
      await sendMessage(fd);
    }
  }
}
