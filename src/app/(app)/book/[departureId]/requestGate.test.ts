import { describe, it, expect, vi, beforeEach } from "vitest";
import { OFFGRID_DEMO_EXPERIENCES } from "@/lib/demo/offgridSamples";
import type { StayRequest } from "@/lib/offgrid/requests";

/** createBooking for an off-grid stay goes ahead only for an accepted request, as asked. */

const listing = OFFGRID_DEMO_EXPERIENCES.find((e) => e.slug === "tropical-permaculture-farm-pemba")!;
const dep = listing.departures[0];
let requests: StayRequest[] = [];
const created: unknown[] = [];
const adopted: unknown[] = [];

vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));
vi.mock("@/lib/auth/session", () => ({ requireUser: async () => ({ id: "traveller-1", email: "t@x", name: "Ava", role: "guest" }) }));
vi.mock("@/lib/data/repository", () => ({ getAllExperiences: async () => OFFGRID_DEMO_EXPERIENCES }));
vi.mock("@/lib/brand/server", () => ({ brandOrigin: () => "https://www.spendtimeoffgrid.com" }));
vi.mock("@/lib/offgrid/requestStore", () => ({ listVisibleRequests: async () => requests }));
vi.mock("@/lib/offgrid/booking", () => ({ createOffGridBooking: async (a: unknown) => (created.push(a), "/account/trips/bk-new?new=1") }));
vi.mock("@/lib/offgrid/requestAdopt", () => ({ adoptRequestIntoStay: async (...a: unknown[]) => void adopted.push(a) }));

const { createBooking } = await import("./actions");
const book = (o: Record<string, string> = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ departureId: dep.id, arrival: dep.startDate, nights: "7", guests: "1", ...o })) f.set(k, v);
  return createBooking(f).then(() => "no redirect", (e: Error) => e.message);
};
const accepted = (over: Partial<StayRequest> = {}): StayRequest => ({
  id: "r1", guestId: "traveller-1", departureId: dep.id, arrival: dep.startDate, nights: 7, guests: 1,
  introduction: "x".repeat(60), status: "accepted", createdAt: "2026-10-01T00:00:00Z", ...over,
});

beforeEach(() => { requests = []; created.length = 0; adopted.length = 0; });

describe("off-grid booking needs an accepted request", () => {
  it("no request → back to the booking page, nothing created", async () => {
    expect(await book()).toMatch(/^REDIRECT:\/book\/.+\?error=/);
    expect(created).toHaveLength(0);
  });
  it("pending → refused", async () => {
    requests = [accepted({ status: "pending" })];
    expect(await book()).toMatch(/error=/);
    expect(created).toHaveLength(0);
  });
  it("different nights than accepted → refused", async () => {
    requests = [accepted()];
    expect(await book({ nights: "10" })).toMatch(/error=/);
    expect(created).toHaveLength(0);
  });
  it("accepted, as asked → booked, then the request is linked", async () => {
    requests = [accepted()];
    expect(await book()).toBe("REDIRECT:/account/trips/bk-new?new=1");
    expect(created).toHaveLength(1);
    expect(adopted[0]).toEqual([
      expect.objectContaining({ id: "traveller-1" }),
      expect.objectContaining({ id: "bk-new", departureId: dep.id, stayStartDate: dep.startDate, stayNights: 7, marketplace: "spendtimeoffgrid" }),
    ]);
  });
});
