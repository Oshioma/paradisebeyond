import { describe, it, expect, vi, beforeEach } from "vitest";
import { OFFGRID_DEMO_EXPERIENCES } from "@/lib/demo/offgridSamples";
import type { StayRequest } from "./requests";

/**
 * Request-to-book actions with session, storage and email mocked: who may ask,
 * who may answer, what counts as an introduction, and what gets emailed.
 */

let currentUser = { id: "traveller-1", email: "t@x", name: "Ava Traveller", role: "guest" as string };
let requests: StayRequest[] = [];
const decided: unknown[] = [];
const emails: { to: string; subject: string }[] = [];
const listing = OFFGRID_DEMO_EXPERIENCES.find((e) => e.slug === "tropical-permaculture-farm-pemba")!; // min 7 nights
const dep = listing.departures[0];

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: async () => currentUser }));
vi.mock("@/lib/data/repository", () => ({ getAllExperiences: async () => OFFGRID_DEMO_EXPERIENCES }));
vi.mock("@/lib/email", () => ({ sendEmail: async (m: { to: string; subject: string }) => (emails.push(m), { ok: true }) }));
vi.mock("@/lib/brand/server", () => ({ brandOrigin: () => "https://www.spendtimeoffgrid.com" }));
vi.mock("./requestStore", () => ({
  listVisibleRequests: async () => requests,
  getRequest: async (id: string) => requests.find((r) => r.id === id) ?? null,
  insertRequest: async (r: Omit<StayRequest, "id" | "status" | "createdAt">) => {
    const created = { ...r, id: `r${requests.length + 1}`, status: "pending" as const, createdAt: new Date().toISOString() };
    requests.push(created);
    return created;
  },
  decideRequest: async (...a: unknown[]) => (decided.push(a), true),
  withdrawRequest: async () => true,
  hostEmailsForDeparture: async () => ["host@x"],
  userEmail: async () => "t@x",
}));

const actions = await import("./requestActions");
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const INTRO = "Hi! I'm Ava, a primary-school teacher who has grown vegetables on an allotment for years.";
const ask = (o: Record<string, string> = {}) =>
  actions.requestStay(fd({ departureId: dep.id, arrival: dep.startDate, nights: "7", guests: "1", introduction: INTRO, ...o }));

beforeEach(() => {
  currentUser = { id: "traveller-1", email: "t@x", name: "Ava Traveller", role: "guest" };
  requests = []; decided.length = 0; emails.length = 0;
  vi.useFakeTimers({ toFake: ["Date"] }).setSystemTime(new Date("2026-10-02T12:00:00Z"));
});

describe("requestStay", () => {
  it("creates a pending request and emails the host — no booking, no charge", async () => {
    expect(await ask()).toEqual({ ok: true });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ status: "pending", guestId: "traveller-1", nights: 7, introduction: INTRO });
    expect(emails.map((e) => e.to)).toEqual(["host@x"]);
  });
  it("needs a real introduction", async () => {
    expect((await ask({ introduction: "Hi, can I stay?" })).ok).toBe(false);
    expect(requests).toHaveLength(0);
  });
  it("respects the host's minimum stay and window", async () => {
    expect((await ask({ nights: "3" })).ok).toBe(false);
    expect((await ask({ arrival: "2030-01-01" })).ok).toBe(false);
  });
  it("one open request per window", async () => {
    await ask();
    expect(await ask()).toMatchObject({ ok: false, error: expect.stringMatching(/already/) });
  });
});

describe("decideStayRequest", () => {
  beforeEach(async () => { await ask(); emails.length = 0; });
  it("a traveller can't answer requests (even their own)", async () => {
    expect((await actions.decideStayRequest(fd({ requestId: "r1", decision: "accept" }))).ok).toBe(false);
    expect(decided).toHaveLength(0);
  });
  it("a host accepts, with a note, and the traveller is emailed", async () => {
    currentUser = { id: "host-1", email: "h@x", name: "Mwanaisha", role: "host" };
    expect(await actions.decideStayRequest(fd({ requestId: "r1", decision: "accept", note: "Karibu!" }))).toEqual({ ok: true });
    expect(decided[0]).toEqual(["r1", true, "Karibu!"]);
    expect(emails[0]).toMatchObject({ to: "t@x", subject: expect.stringMatching(/said yes/) });
  });
  it("only pending requests can be answered", async () => {
    currentUser = { id: "host-1", email: "h@x", name: "Mwanaisha", role: "host" };
    requests[0].status = "declined";
    expect((await actions.decideStayRequest(fd({ requestId: "r1", decision: "accept" }))).ok).toBe(false);
  });
});

describe("withdrawStayRequest", () => {
  it("only your own request", async () => {
    await ask();
    currentUser = { id: "traveller-2", email: "o@x", name: "Other", role: "guest" };
    expect((await actions.withdrawStayRequest(fd({ requestId: "r1" }))).ok).toBe(false);
    currentUser = { id: "traveller-1", email: "t@x", name: "Ava", role: "guest" };
    expect((await actions.withdrawStayRequest(fd({ requestId: "r1" }))).ok).toBe(true);
  });
});
