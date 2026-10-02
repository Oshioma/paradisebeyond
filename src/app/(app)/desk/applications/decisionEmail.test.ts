import { beforeEach, describe, expect, it, vi } from "vitest";

const emails: { to: string; subject: string; html: string; from?: string; replyTo?: string }[] = [];

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireRole: async () => ({ id: "admin-1" }) }));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => false }));
vi.mock("@/lib/demo/state", () => ({ updateDemoState: vi.fn() }));
vi.mock("@/lib/demo/applications", () => ({
  DEMO_APPLICATIONS: [
    { id: "pb-1", name: "Amina", email: "amina@example.com" },
    { id: "og-1", name: "Tom", email: "tom@example.com", marketplace: "spendtimeoffgrid" },
  ],
}));
vi.mock("@/lib/email", () => ({ sendEmail: async (m: (typeof emails)[number]) => (emails.push(m), { ok: true }) }));
vi.mock("@/lib/brand/server", () => ({ canonicalOriginFor: () => "https://www.spendtimeoffgrid.com" }));

const { setApplicationStatus } = await import("./actions");

function decide(id: string, status: string, notes = "") {
  const fd = new FormData();
  fd.set("id", id);
  fd.set("status", status);
  fd.set("notes", notes);
  return setApplicationStatus(fd);
}

describe("host application decision emails", () => {
  beforeEach(() => { emails.length = 0; });

  it("Spend Time Off Grid applicants get its own email, sender and reply-to", async () => {
    await decide("og-1", "approved");
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({
      to: "tom@example.com",
      from: "Spend Time Off Grid <noreply@spendtimeoffgrid.com>",
      replyTo: "hosts@spendtimeoffgrid.com",
      subject: expect.stringMatching(/Spend Time Off Grid/),
    });
    expect(emails[0].html).toContain("https://www.spendtimeoffgrid.com/studio/retreats/new");
    expect(emails[0].html).not.toMatch(/Paradise Beyond/);
  });

  it("changes requested and declined carry the reviewer's note, escaped", async () => {
    await decide("og-1", "changes_requested", "Photos of the <b>sleeping</b> space, please");
    await decide("og-1", "rejected", "Not a fit for now");
    expect(emails.map((e) => e.subject)).toEqual(["A note on your hosting application", "About your hosting application"]);
    expect(emails[0].html).toContain("&lt;b&gt;sleeping&lt;/b&gt;");
    expect(emails[1].html).toContain("Not a fit for now");
  });

  it("Paradise Beyond applicants still get the Paradise Beyond email", async () => {
    await decide("pb-1", "approved");
    expect(emails[0].from).toBeUndefined();
    expect(emails[0].subject).toMatch(/Paradise Beyond/);
  });

  it("sends nothing for in-between states", async () => {
    await decide("og-1", "under_review");
    expect(emails).toHaveLength(0);
  });
});
