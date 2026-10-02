"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { getAllExperiences } from "@/lib/data/repository";
import { findByDeparture } from "@/lib/booking/pricing";
import { MAX_TRAVELLERS_PER_BOOKING, checkStayRequest } from "@/lib/offgrid/pricing";
import { currentRequest, introError, isOpen } from "@/lib/offgrid/requests";
import { decideRequest, getRequest, hostEmailsForDeparture, insertRequest, listVisibleRequests, userEmail, withdrawRequest } from "@/lib/offgrid/requestStore";

type Result = { ok: boolean; error?: string };

async function stogOrigin() {
  const { getBrandById } = await import("@/lib/brand/config");
  const { brandOrigin } = await import("@/lib/brand/server");
  return brandOrigin(getBrandById("spendtimeoffgrid"));
}

async function email(to: string, msg: { subject: string; html: string }) {
  try {
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({ to, ...msg });
  } catch { /* best-effort */ }
}

/** Traveller: ask to stay. Nothing is reserved or charged. */
export async function requestStay(formData: FormData): Promise<Result> {
  const departureId = String(formData.get("departureId") ?? "");
  const user = await requireUser(departureId ? `/book/${departureId}` : "/experiences");
  const found = findByDeparture(await getAllExperiences(), departureId);
  if (!found || !found.experience.offGrid) return { ok: false, error: "This stay isn't available." };
  const { experience, departure } = found;
  const offGrid = experience.offGrid;
  if (!offGrid) return { ok: false, error: "This stay isn't available." };
  if (experience.sample) return { ok: false, error: "Sample listings can't be requested." };

  const arrival = String(formData.get("arrival") ?? "");
  const nights = Math.floor(Number(formData.get("nights")));
  const guests = Math.floor(Number(formData.get("guests")));
  const introduction = String(formData.get("introduction") ?? "").trim();

  const check = checkStayRequest({ window: departure, stay: offGrid.stay, arrival, nights });
  if (!check.ok) return { ok: false, error: check.error };
  const maxGuests = Math.min(departure.spacesRemaining, MAX_TRAVELLERS_PER_BOOKING);
  if (!Number.isFinite(guests) || guests < 1 || guests > maxGuests) return { ok: false, error: "Choose how many travellers." };
  const bad = introError(introduction);
  if (bad) return { ok: false, error: bad };

  const existing = currentRequest(await listVisibleRequests(), departure.id, user.id);
  if (existing && isOpen(existing)) return { ok: false, error: "You already have a request open for these dates." };

  const created = await insertRequest({ guestId: user.id, guestName: user.name, departureId: departure.id, arrival, nights, guests, introduction });
  if (!created) return { ok: false, error: "Couldn't send your request — please try again." };

  const origin = await stogOrigin();
  const { requestReceivedEmail } = await import("@/lib/offgrid/emails");
  for (const to of await hostEmailsForDeparture(departure.id)) {
    await email(to, requestReceivedEmail({ origin, guestName: user.name, listing: experience.name, arrival, nights, guests, introduction }));
  }
  revalidatePath(`/book/${departure.id}`);
  revalidatePath("/studio/requests");
  return { ok: true };
}

/** Traveller: withdraw an open request. */
export async function withdrawStayRequest(formData: FormData): Promise<Result> {
  const user = await requireUser();
  const id = String(formData.get("requestId") ?? "");
  const req = await getRequest(id);
  if (!req || req.guestId !== user.id) return { ok: false, error: "Request not found." };
  const ok = await withdrawRequest(id, user.id);
  revalidatePath(`/book/${req.departureId}`);
  revalidatePath("/studio/requests");
  return ok ? { ok } : { ok, error: "Couldn't withdraw — please try again." };
}

/** Host: accept or decline. The database checks this host hosts the listing. */
export async function decideStayRequest(formData: FormData): Promise<Result> {
  const user = await requireUser("/studio/requests");
  if (user.role !== "host" && user.role !== "admin") return { ok: false, error: "Only hosts can reply to requests." };
  const id = String(formData.get("requestId") ?? "");
  const accept = String(formData.get("decision") ?? "") === "accept";
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000) || undefined;
  const req = await getRequest(id); // RLS: null unless this host can see it
  if (!req) return { ok: false, error: "Request not found." };
  if (req.status !== "pending") return { ok: false, error: "This request has already been answered." };
  const ok = await decideRequest(id, accept, note);
  if (!ok) return { ok: false, error: "Couldn't save your reply — please try again." };

  const found = findByDeparture(await getAllExperiences(), req.departureId);
  const to = await userEmail(req.guestId);
  if (to && found) {
    const { requestDecidedEmail } = await import("@/lib/offgrid/emails");
    await email(to, requestDecidedEmail({
      origin: await stogOrigin(), listing: found.experience.name, departureId: req.departureId,
      accepted: accept, hostNote: note, arrival: req.arrival, nights: req.nights, guests: req.guests,
    }));
  }
  revalidatePath("/studio/requests");
  revalidatePath(`/book/${req.departureId}`);
  return { ok: true };
}
