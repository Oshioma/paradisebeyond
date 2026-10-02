import { describe, it, expect } from "vitest";
import {
  buildChecklist,
  checklistSide,
  manualKeys,
  progress,
  sanitizeDetails,
  toggleManual,
  type ChecklistInputs,
} from "./checklist";

const base: ChecklistInputs = { side: "guest", guest: {}, host: {}, messages: [], prep: null };
const item = (i: ChecklistInputs, key: string) => buildChecklist(i).find((x) => x.key === key)!;

describe("who sees which checklist", () => {
  const stay = { guestId: "traveller-1", marketplace: "spendtimeoffgrid" as const };
  it("the booking's traveller gets the guest side", () => {
    expect(checklistSide({ id: "traveller-1", role: "guest" }, stay)).toBe("guest");
  });
  it("another traveller gets nothing", () => {
    expect(checklistSide({ id: "traveller-2", role: "guest" }, stay)).toBeNull();
  });
  it("hosts and admins get the host side", () => {
    expect(checklistSide({ id: "h", role: "host" }, stay)).toBe("host");
    expect(checklistSide({ id: "a", role: "admin" }, stay)).toBe("host");
  });
  it("Paradise Beyond bookings never have one", () => {
    expect(checklistSide({ id: "traveller-1", role: "guest" }, { guestId: "traveller-1", marketplace: "paradise-beyond" })).toBeNull();
    expect(checklistSide({ id: "traveller-1", role: "guest" }, { guestId: "traveller-1" })).toBeNull();
    expect(checklistSide({ id: "h", role: "host" }, { guestId: "x", marketplace: "paradise-beyond" })).toBeNull();
  });
});

describe("derived items come only from real data", () => {
  it("introduction is done once written", () => {
    expect(item(base, "introduction").done).toBe(false);
    expect(item({ ...base, guest: { introduction: "Hi, I'm Tess…" } }, "introduction").done).toBe(true);
  });
  it("messages need a message from each side", () => {
    expect(item({ ...base, messages: [{ senderRole: "guest" }] }, "messages").done).toBe(false);
    expect(item({ ...base, messages: [{ senderRole: "guest" }, { senderRole: "host" }] }, "messages").done).toBe(true);
  });
  it("emergency contact needs a name and a phone", () => {
    expect(item({ ...base, prep: { emergencyName: "Sam" } }, "emergency").done).toBe(false);
    expect(item({ ...base, prep: { emergencyName: "Sam", emergencyPhone: "+44 7000" } }, "emergency").done).toBe(true);
  });
  it("host directions are done once written", () => {
    expect(item({ ...base, side: "host", host: { directions: "Left at the barn" } }, "directions").done).toBe(true);
  });
  it("a stored tick never marks a derived item done", () => {
    const i = { ...base, guest: { done: { introduction: "2026-01-01", messages: "2026-01-01", emergency: "2026-01-01" } } };
    expect(item(i, "introduction").done).toBe(false);
    expect(item(i, "messages").done).toBe(false);
    expect(item(i, "emergency").done).toBe(false);
  });
});

describe("manual items", () => {
  it("are done only when that side confirmed them", () => {
    expect(item(base, "videoCall").done).toBe(false);
    expect(item({ ...base, guest: { done: { videoCall: "t" } } }, "videoCall").done).toBe(true);
    // The other side's tick doesn't count for you.
    expect(item({ ...base, host: { done: { videoCall: "t" } } }, "videoCall").done).toBe(false);
  });
  it("toggleManual refuses derived, coming-soon and other-side keys", () => {
    for (const key of ["introduction", "messages", "emergency", "identity", "profile", "readIntro", "nonsense"]) {
      expect(toggleManual({}, "guest", key, true)).toEqual({});
    }
    for (const key of ["messages", "directions", "identity", "help-me"]) {
      expect(toggleManual({}, "host", key, true)).toEqual({});
    }
    expect(toggleManual({}, "guest", "videoCall", true, new Date("2026-10-02T00:00:00Z")).done).toEqual({ videoCall: "2026-10-02T00:00:00.000Z" });
    expect(toggleManual({ done: { videoCall: "x" } }, "guest", "videoCall", false).done).toEqual({});
  });
  it("a host can't confirm reading an introduction that doesn't exist", () => {
    const host = { ...base, side: "host" as const, host: { done: { readIntro: "t" } } };
    expect(item(host, "readIntro")).toMatchObject({ done: false, canToggle: false });
    expect(item({ ...host, guest: { introduction: "Hello" } }, "readIntro")).toMatchObject({ done: true, canToggle: true });
  });
  it("each side has its own manual keys", () => {
    expect(manualKeys("guest")).toEqual(["videoCall", "help", "stay", "arrival"]);
    expect(manualKeys("host")).toEqual(["readIntro", "videoCall", "help", "sleeping", "meals", "arrivalTime"]);
  });
});

describe("progress", () => {
  it("never counts coming-soon items (profile, identity)", () => {
    const items = buildChecklist(base);
    expect(items.find((x) => x.key === "identity")).toMatchObject({ kind: "soon", done: false, canToggle: false });
    expect(progress(items)).toEqual({ done: 0, total: 7 });
    expect(progress(buildChecklist({ ...base, side: "host" }))).toEqual({ done: 0, total: 8 });
  });
  it("counts derived and manual items that are done", () => {
    const i: ChecklistInputs = {
      ...base,
      guest: { introduction: "Hello there", done: { videoCall: "t", help: "t" } },
      messages: [{ senderRole: "guest" }, { senderRole: "host" }],
      prep: { emergencyName: "Sam", emergencyPhone: "1" },
    };
    expect(progress(buildChecklist(i))).toEqual({ done: 5, total: 7 });
  });
});

describe("sanitizeDetails", () => {
  it("only keeps the fields a side owns, trimmed and capped", () => {
    expect(sanitizeDetails("guest", { introduction: "  hi  ", directions: "nope" })).toEqual({ introduction: "hi" });
    expect(sanitizeDetails("host", { introduction: "nope", directions: " left " })).toEqual({ directions: "left" });
    expect(sanitizeDetails("guest", { introduction: "x".repeat(5000) }).introduction).toHaveLength(2000);
    expect(sanitizeDetails("guest", { arrivalTime: "3pm", transport: "bus", done: { x: 1 } })).toEqual({
      arrival: { time: "3pm", transport: "bus", pickup: undefined },
    });
  });
});
