import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ChecklistData } from "./checklist";

/**
 * The server actions behind "Before you go" / "Before they arrive", with the
 * session, bookings and storage mocked. The side always comes from the
 * booking, never the form; another traveller's or a Paradise Beyond booking is
 * refused; each side writes only its own row.
 */

let currentUser = { id: "traveller-1", email: "t@x", name: "Tess", role: "guest" as string };
const bookings: Record<string, { id: string; guestId: string; marketplace?: string }> = {
  stay: { id: "stay", guestId: "traveller-1", marketplace: "spendtimeoffgrid" },
  pb: { id: "pb", guestId: "traveller-1", marketplace: "paradise-beyond" },
};
const rows: Record<string, { guest: ChecklistData; host: ChecklistData }> = {};
const saved: { bookingId: string; side: string; data: ChecklistData }[] = [];
const prepSaved: Record<string, unknown>[] = [];
const sent: string[] = [];

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: async () => currentUser }));
vi.mock("@/lib/data/bookings", () => ({
  // Like the real one: a traveller only ever gets their own booking.
  getTrip: async (user: { id: string; role: string }, id: string) => {
    const b = bookings[id];
    if (!b) return null;
    if (user.role === "guest" && b.guestId !== user.id) return null;
    return b;
  },
}));
vi.mock("./checklistStore", () => ({
  getStayChecklists: async (id: string) => rows[id] ?? { guest: {}, host: {} },
  saveStayChecklist: async (bookingId: string, side: "guest" | "host", data: ChecklistData) => {
    saved.push({ bookingId, side, data });
    rows[bookingId] = { ...(rows[bookingId] ?? { guest: {}, host: {} }), [side]: data };
    return true;
  },
}));
vi.mock("@/lib/trip/prep", () => ({
  getTripPrep: async () => ({ dietary: "vegetarian", notes: "keep me" }),
  saveTripPrep: async (_id: string, p: Record<string, unknown>) => void prepSaved.push(p),
}));
vi.mock("@/lib/messaging/actions", () => ({ sendMessage: async (fd: FormData) => void sent.push(String(fd.get("body"))) }));

const actions = await import("./checklistActions");
const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const INTRO = "Hi! I'm Tess, a teacher from Bristol who has always wanted to learn food-forest growing.";

beforeEach(() => {
  currentUser = { id: "traveller-1", email: "t@x", name: "Tess", role: "guest" };
  saved.length = 0;
  prepSaved.length = 0;
  sent.length = 0;
  for (const k of Object.keys(rows)) delete rows[k];
});

describe("traveller", () => {
  it("can tick their own manual items", async () => {
    expect(await actions.toggleChecklistItem(fd({ bookingId: "stay", key: "videoCall", on: "1" }))).toEqual({ ok: true });
    expect(saved[0]).toMatchObject({ side: "guest" });
    expect(Object.keys(saved[0].data.done ?? {})).toEqual(["videoCall"]);
  });
  it("can't tick derived items or host items", async () => {
    await actions.toggleChecklistItem(fd({ bookingId: "stay", key: "messages", on: "1" }));
    await actions.toggleChecklistItem(fd({ bookingId: "stay", key: "readIntro", on: "1" }));
    expect(saved.every((s) => Object.keys(s.data.done ?? {}).length === 0)).toBe(true);
  });
  it("introduction is saved once and posted to the stay's messages", async () => {
    expect(await actions.saveIntroduction(fd({ bookingId: "stay", introduction: INTRO }))).toEqual({ ok: true });
    expect(rows.stay.guest.introduction).toBe(INTRO);
    expect(sent).toEqual([INTRO]);
    await actions.saveIntroduction(fd({ bookingId: "stay", introduction: INTRO + " Also I bake." }));
    expect(sent).toHaveLength(1);
  });
  it("a one-liner isn't an introduction", async () => {
    expect((await actions.saveIntroduction(fd({ bookingId: "stay", introduction: "Hi, can I stay?" }))).ok).toBe(false);
    expect(saved).toHaveLength(0);
  });
  it("can't write the host's directions", async () => {
    expect(await actions.saveDirections(fd({ bookingId: "stay", directions: "x" }))).toMatchObject({ ok: false });
    expect(saved).toHaveLength(0);
  });
  it("emergency contact goes to the private trip_prep record, merged — never the checklist", async () => {
    const r = await actions.saveEmergencyContact(
      fd({ bookingId: "stay", emergencyName: "Sam", emergencyPhone: "+44 7000 000000", emergencyRelationship: "Brother", emergencyEmail: "sam@x" }),
    );
    expect(r).toEqual({ ok: true });
    expect(prepSaved[0]).toMatchObject({ dietary: "vegetarian", notes: "keep me", emergencyName: "Sam", emergencyRelationship: "Brother" });
    expect(saved).toHaveLength(0);
  });
});

describe("access", () => {
  it("another traveller can't read or write someone else's stay", async () => {
    currentUser = { id: "traveller-2", email: "o@x", name: "Other", role: "guest" };
    expect(await actions.toggleChecklistItem(fd({ bookingId: "stay", key: "videoCall", on: "1" }))).toMatchObject({ ok: false });
    expect(await actions.saveIntroduction(fd({ bookingId: "stay", introduction: INTRO }))).toMatchObject({ ok: false });
    expect(await actions.saveEmergencyContact(fd({ bookingId: "stay", emergencyName: "x", emergencyPhone: "1" }))).toMatchObject({ ok: false });
    expect(saved).toHaveLength(0);
    expect(prepSaved).toHaveLength(0);
  });
  it("Paradise Beyond bookings have no checklist", async () => {
    expect(await actions.toggleChecklistItem(fd({ bookingId: "pb", key: "videoCall", on: "1" }))).toMatchObject({ ok: false });
    expect(await actions.saveEmergencyContact(fd({ bookingId: "pb", emergencyName: "x", emergencyPhone: "1" }))).toMatchObject({ ok: false });
    expect(saved).toHaveLength(0);
  });
  it("the host writes only the host row, and can't write the traveller's", async () => {
    currentUser = { id: "host-1", email: "h@x", name: "Ines", role: "host" };
    expect(await actions.saveDirections(fd({ bookingId: "stay", directions: "Turn left at the cork oak." }))).toEqual({ ok: true });
    expect(await actions.toggleChecklistItem(fd({ bookingId: "stay", key: "sleeping", on: "1" }))).toEqual({ ok: true });
    expect(await actions.saveIntroduction(fd({ bookingId: "stay", introduction: INTRO }))).toMatchObject({ ok: false });
    expect(await actions.saveEmergencyContact(fd({ bookingId: "stay", emergencyName: "x", emergencyPhone: "1" }))).toMatchObject({ ok: false });
    expect(saved.every((s) => s.side === "host")).toBe(true);
    expect(rows.stay.host).toMatchObject({ directions: "Turn left at the cork oak." });
    expect(prepSaved).toHaveLength(0);
  });
});
