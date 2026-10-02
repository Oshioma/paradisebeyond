import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StayRequest } from "./requests";
import type { ChecklistData } from "./checklist";

let requests: StayRequest[] = [];
let guestRow: ChecklistData = {};
const linked: unknown[] = [];
const messages: string[] = [];

vi.mock("./requestStore", () => ({
  listVisibleRequests: async () => requests,
  linkRequest: async (...a: unknown[]) => (linked.push(a), true),
}));
vi.mock("./checklistStore", () => ({
  getStayChecklists: async () => ({ guest: guestRow, host: {} }),
  saveStayChecklist: async (_id: string, _side: string, d: ChecklistData) => ((guestRow = d), true),
}));
vi.mock("@/lib/messaging/actions", () => ({ sendMessage: async (fd: FormData) => void messages.push(String(fd.get("body"))) }));

const { adoptRequestIntoStay } = await import("./requestAdopt");
const user = { id: "g1", email: "t@x", name: "Ava", role: "guest" as const, demo: false };
const stay = { id: "bk1", guestId: "g1", departureId: "d1", stayStartDate: "2026-11-12", stayNights: 14, marketplace: "spendtimeoffgrid" as const };
const INTRO = "Hi, I'm Ava — a teacher who has grown vegetables for years.";

beforeEach(() => {
  requests = [{ id: "r1", guestId: "g1", departureId: "d1", arrival: "2026-11-12", nights: 14, guests: 1, introduction: INTRO, status: "accepted", createdAt: "2026-10-01" }];
  guestRow = {}; linked.length = 0; messages.length = 0;
});

describe("adoptRequestIntoStay", () => {
  it("links the request and carries the introduction into the stay, once", async () => {
    await adoptRequestIntoStay(user, stay);
    expect(linked).toEqual([["r1", "bk1", "g1"]]);
    expect(guestRow.introduction).toBe(INTRO);
    expect(messages).toEqual([INTRO]);
    requests[0] = { ...requests[0], status: "booked", bookingId: "bk1" };
    await adoptRequestIntoStay(user, stay);
    expect(linked).toHaveLength(1);
    expect(messages).toHaveLength(1);
  });
  it("does nothing for someone else's stay, Paradise Beyond, or a request for other dates", async () => {
    await adoptRequestIntoStay({ ...user, id: "g2" }, stay);
    await adoptRequestIntoStay(user, { ...stay, marketplace: "paradise-beyond" });
    await adoptRequestIntoStay(user, { ...stay, stayNights: 7 });
    expect(linked).toHaveLength(0);
    expect(messages).toHaveLength(0);
  });
});
