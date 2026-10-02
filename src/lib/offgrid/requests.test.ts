import { describe, it, expect } from "vitest";
import { bookingAllowed, currentRequest, introError, type StayRequest } from "./requests";

const req = (over: Partial<StayRequest> = {}): StayRequest => ({
  id: "r1", guestId: "g1", departureId: "d1", arrival: "2026-11-12", nights: 14, guests: 1,
  introduction: "x".repeat(60), status: "accepted", createdAt: "2026-10-01T00:00:00Z", ...over,
});
const want = { guestId: "g1", departureId: "d1", arrival: "2026-11-12", nights: 14, guests: 1 };

describe("introductions", () => {
  it("need a few real sentences", () => {
    expect(introError("Hi, can I stay?")).toMatch(/a little more/);
    expect(introError("I'm Ava, a teacher who has grown vegetables for years.")).toBeNull();
    expect(introError("x".repeat(2001))).toMatch(/long/);
  });
});

describe("currentRequest", () => {
  it("prefers an open request, else the latest", () => {
    const old = req({ id: "old", status: "declined", createdAt: "2026-09-01T00:00:00Z" });
    const open = req({ id: "open", status: "pending", createdAt: "2026-08-01T00:00:00Z" });
    expect(currentRequest([old, open], "d1", "g1")?.id).toBe("open");
    expect(currentRequest([old], "d1", "g1")?.id).toBe("old");
  });
  it("ignores other travellers and other windows", () => {
    expect(currentRequest([req({ guestId: "g2" }), req({ departureId: "d2" })], "d1", "g1")).toBeNull();
  });
});

describe("bookingAllowed — only an accepted request, for exactly what was asked", () => {
  it("allows the accepted request as asked", () => {
    expect(bookingAllowed(req(), want)).toEqual({ ok: true });
  });
  it("refuses with no request, someone else's, or another window", () => {
    expect(bookingAllowed(null, want).ok).toBe(false);
    expect(bookingAllowed(req({ guestId: "g2" }), want).ok).toBe(false);
    expect(bookingAllowed(req({ departureId: "d2" }), want).ok).toBe(false);
  });
  it("refuses pending, declined, withdrawn and already-booked requests", () => {
    for (const status of ["pending", "declined", "withdrawn", "booked"] as const) {
      expect(bookingAllowed(req({ status }), want).ok).toBe(false);
    }
  });
  it("refuses different dates, nights or travellers", () => {
    expect(bookingAllowed(req(), { ...want, arrival: "2026-11-13" }).ok).toBe(false);
    expect(bookingAllowed(req(), { ...want, nights: 7 }).ok).toBe(false);
    expect(bookingAllowed(req(), { ...want, guests: 2 }).ok).toBe(false);
  });
});
