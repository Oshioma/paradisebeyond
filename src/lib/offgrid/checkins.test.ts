import { describe, it, expect } from "vitest";
import { checkinDueAt, dueCheckins, latestCheckin, needsEscalation } from "./checkins";
import { authorised } from "./cronAuth";

const stay = { id: "b1", marketplace: "spendtimeoffgrid" as const, status: "confirmed" as const, stayStartDate: "2026-11-12", stayNights: 14 };

describe("check-in timing (mirrors queue_stay_checkins in migration 0034)", () => {
  it("arrival 16:00 UTC on arrival day; settled 10:00 UTC next morning", () => {
    expect(checkinDueAt("arrival", "2026-11-12")).toBe("2026-11-12T16:00:00.000Z");
    expect(checkinDueAt("settled", "2026-11-12")).toBe("2026-11-13T10:00:00.000Z");
  });
  it("nothing before it's due; arrival then both as time passes", () => {
    expect(dueCheckins(stay, new Date("2026-11-12T15:59:00Z"))).toEqual([]);
    expect(dueCheckins(stay, new Date("2026-11-12T16:00:00Z")).map((c) => c.kind)).toEqual(["arrival"]);
    expect(dueCheckins(stay, new Date("2026-11-13T10:30:00Z")).map((c) => c.kind)).toEqual(["arrival", "settled"]);
  });
  it("never back-fills old stays (2-day window)", () => {
    expect(dueCheckins(stay, new Date("2026-11-20T00:00:00Z"))).toEqual([]);
  });
  it("one-night stays only get the arrival check-in", () => {
    expect(dueCheckins({ ...stay, stayNights: 1 }, new Date("2026-11-13T11:00:00Z")).map((c) => c.kind)).toEqual(["arrival"]);
  });
  it("only live Spend Time Off Grid stays", () => {
    const at = new Date("2026-11-12T17:00:00Z");
    expect(dueCheckins({ ...stay, marketplace: "paradise-beyond" }, at)).toEqual([]);
    expect(dueCheckins({ ...stay, marketplace: undefined }, at)).toEqual([]);
    expect(dueCheckins({ ...stay, status: "cancelled" }, at)).toEqual([]);
    expect(dueCheckins({ ...stay, stayStartDate: undefined }, at)).toEqual([]);
    expect(dueCheckins({ ...stay, status: "reserved" }, at)).toHaveLength(1);
  });
  it("latestCheckin is the most recently due", () => {
    expect(latestCheckin(dueCheckins(stay, new Date("2026-11-13T11:00:00Z")))?.kind).toBe("settled");
    expect(latestCheckin([])).toBeNull();
  });
});

describe("escalation", () => {
  const c = { bookingId: "b1", kind: "arrival" as const, dueAt: "2026-11-12T16:00:00Z", notifiedAt: "2026-11-12T16:07:00Z" };
  it("only unanswered arrival check-ins, 24h after the email, once", () => {
    expect(needsEscalation(c, new Date("2026-11-13T16:06:00Z"))).toBe(false);
    expect(needsEscalation(c, new Date("2026-11-13T16:07:00Z"))).toBe(true);
    expect(needsEscalation({ ...c, response: "ok" }, new Date("2026-11-14T00:00:00Z"))).toBe(false);
    expect(needsEscalation({ ...c, escalatedAt: "x" }, new Date("2026-11-14T00:00:00Z"))).toBe(false);
    expect(needsEscalation({ ...c, kind: "settled" }, new Date("2026-11-14T00:00:00Z"))).toBe(false);
    expect(needsEscalation({ ...c, notifiedAt: undefined }, new Date("2026-11-14T00:00:00Z"))).toBe(false);
  });
});

describe("cron endpoint auth", () => {
  it("needs the exact bearer secret; no secret configured = locked", () => {
    expect(authorised("Bearer s3cret", "s3cret")).toBe(true);
    expect(authorised("Bearer nope", "s3cret")).toBe(false);
    expect(authorised("s3cret", "s3cret")).toBe(false);
    expect(authorised(null, "s3cret")).toBe(false);
    expect(authorised("Bearer ", undefined)).toBe(false);
    expect(authorised("Bearer anything", "")).toBe(false);
  });
});
