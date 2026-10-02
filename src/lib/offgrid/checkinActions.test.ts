import { describe, it, expect, vi, beforeEach } from "vitest";

/** Answering a check-in: traveller only, only when due, and "help" alerts support (not the host). */

let currentUser = { id: "traveller-1", email: "t@x", name: "Ava", role: "guest" as string };
const trips: Record<string, { id: string; guestId: string; marketplace?: string; reference: string; experience: { name: string } }> = {
  stay: { id: "stay", guestId: "traveller-1", marketplace: "spendtimeoffgrid", reference: "STOG-1", experience: { name: "Pemba farm" } },
  pb: { id: "pb", guestId: "traveller-1", marketplace: "paradise-beyond", reference: "PB-1", experience: { name: "Zanzibar" } },
};
let due = [{ bookingId: "stay", kind: "arrival", dueAt: "2026-11-12T16:00:00Z" }];
const answers: unknown[] = [];
const emails: { to: string; subject: string }[] = [];

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: async () => currentUser }));
vi.mock("@/lib/data/bookings", () => ({
  getTrip: async (u: { id: string; role: string }, id: string) => {
    const t = trips[id];
    return t && (u.role !== "guest" || t.guestId === u.id) ? t : null;
  },
}));
vi.mock("./checkinStore", () => ({
  getCheckins: async (t: { id: string }) => due.filter((c) => c.bookingId === t.id),
  respondCheckin: async (...a: unknown[]) => (answers.push(a), true),
}));
vi.mock("@/lib/email", () => ({ sendEmail: async (m: { to: string; subject: string }) => (emails.push(m), { ok: true }) }));
vi.mock("@/lib/brand/server", () => ({ canonicalOriginFor: () => "https://www.spendtimeoffgrid.com" }));

const { answerCheckin } = await import("./checkinActions");
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

beforeEach(() => {
  currentUser = { id: "traveller-1", email: "t@x", name: "Ava", role: "guest" };
  due = [{ bookingId: "stay", kind: "arrival", dueAt: "2026-11-12T16:00:00Z" }];
  answers.length = 0; emails.length = 0;
});

describe("answerCheckin", () => {
  it("'yes' is saved and nobody is emailed", async () => {
    expect(await answerCheckin(fd({ bookingId: "stay", kind: "arrival", response: "ok" }))).toEqual({ ok: true });
    expect(answers).toEqual([["stay", "arrival", "ok", undefined]]);
    expect(emails).toHaveLength(0);
  });
  it("'help' alerts the Spend Time Off Grid team, with the note", async () => {
    await answerCheckin(fd({ bookingId: "stay", kind: "arrival", response: "help", note: "Nobody is here" }));
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({ to: "offgrid@guestlist.net", subject: expect.stringMatching(/Help requested/) });
  });
  it("another traveller, a host, or a Paradise Beyond booking can't answer", async () => {
    currentUser = { id: "traveller-2", email: "o@x", name: "Other", role: "guest" };
    expect((await answerCheckin(fd({ bookingId: "stay", kind: "arrival", response: "ok" }))).ok).toBe(false);
    currentUser = { id: "host-1", email: "h@x", name: "Host", role: "host" };
    expect((await answerCheckin(fd({ bookingId: "stay", kind: "arrival", response: "ok" }))).ok).toBe(false);
    currentUser = { id: "traveller-1", email: "t@x", name: "Ava", role: "guest" };
    expect((await answerCheckin(fd({ bookingId: "pb", kind: "arrival", response: "ok" }))).ok).toBe(false);
    expect(answers).toHaveLength(0);
  });
  it("only a check-in that's due", async () => {
    expect((await answerCheckin(fd({ bookingId: "stay", kind: "settled", response: "ok" }))).ok).toBe(false);
    expect((await answerCheckin(fd({ bookingId: "stay", kind: "arrival", response: "maybe" }))).ok).toBe(false);
    expect(answers).toHaveLength(0);
  });
});
