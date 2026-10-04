import { afterEach, describe, expect, it, vi } from "vitest";

const transports: { host: string; port: number; secure: boolean; auth: { user: string; pass: string } }[] = [];
const sent: { from: string; to: string; replyTo?: string }[] = [];
let failWith: string | null = null;

vi.mock("nodemailer", () => ({
  createTransport: (opts: (typeof transports)[number]) => {
    transports.push(opts);
    return {
      sendMail: async (m: (typeof sent)[number]) => {
        if (failWith) throw new Error(failWith);
        sent.push(m);
      },
    };
  },
}));

const { sendEmail, isEmailConfigured, domainOf, loginFor } = await import("./index");

const ENV = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "OFFGRID_SMTP_USER", "OFFGRID_SMTP_PASSWORD", "EMAIL_FROM"];

function configure() {
  process.env.SMTP_USER = "hello@paradisebeyond.com";
  process.env.SMTP_PASSWORD = "test-pb-placeholder";
  process.env.OFFGRID_SMTP_USER = "noreply@spendtimeoffgrid.com";
  process.env.OFFGRID_SMTP_PASSWORD = "test-og-placeholder";
  process.env.EMAIL_FROM = "Paradise Beyond <hello@paradisebeyond.com>";
}

describe("sendEmail via ImprovMX SMTP", () => {
  afterEach(() => {
    for (const k of ENV) delete process.env[k];
    transports.length = 0;
    sent.length = 0;
    failWith = null;
  });

  it("reads the domain from a bare or named address", () => {
    expect(domainOf("Spend Time Off Grid <noreply@SpendTimeOffGrid.com>")).toBe("spendtimeoffgrid.com");
    expect(domainOf("hello@paradisebeyond.com")).toBe("paradisebeyond.com");
  });

  it("is a no-op that reports success when no login matches", async () => {
    const res = await sendEmail({ to: "a@example.com", subject: "s", html: "h" });
    expect(res.ok).toBe(true);
    expect(isEmailConfigured()).toBe(false);
    expect(transports).toHaveLength(0);
  });

  it("sends Paradise Beyond's emails with its own login on smtp.improvmx.com:587", async () => {
    configure();
    await sendEmail({ to: "a@example.com", subject: "s", html: "h" });
    expect(transports[0]).toMatchObject({
      host: "smtp.improvmx.com",
      port: 587,
      secure: false,
      auth: { user: "hello@paradisebeyond.com", pass: "test-pb-placeholder" },
    });
    expect(sent[0].from).toBe("Paradise Beyond <hello@paradisebeyond.com>");
  });

  it("sends Spend Time Off Grid's emails with its own login, sender and reply-to", async () => {
    configure();
    await sendEmail({
      to: "a@example.com",
      subject: "s",
      html: "h",
      from: "Spend Time Off Grid <noreply@spendtimeoffgrid.com>",
      replyTo: "support@spendtimeoffgrid.com",
    });
    expect(transports[0].auth).toEqual({ user: "noreply@spendtimeoffgrid.com", pass: "test-og-placeholder" });
    expect(sent[0]).toMatchObject({
      from: "Spend Time Off Grid <noreply@spendtimeoffgrid.com>",
      replyTo: "support@spendtimeoffgrid.com",
    });
  });

  it("never uses one site's login for the other site's sender", () => {
    process.env.SMTP_USER = "hello@paradisebeyond.com";
    process.env.SMTP_PASSWORD = "test-pb-placeholder";
    expect(loginFor("Spend Time Off Grid <noreply@spendtimeoffgrid.com>")).toBeNull();
    expect(isEmailConfigured("Spend Time Off Grid <noreply@spendtimeoffgrid.com>")).toBe(false);
  });

  it("uses TLS from the start on port 465", async () => {
    configure();
    process.env.SMTP_PORT = "465";
    await sendEmail({ to: "a@example.com", subject: "s", html: "h" });
    expect(transports[0]).toMatchObject({ port: 465, secure: true });
  });

  it("returns the SMTP error instead of throwing", async () => {
    configure();
    failWith = "535 Authentication failed";
    const res = await sendEmail({ to: "a@example.com", subject: "s", html: "h" });
    expect(res).toEqual({ ok: false, error: "SMTP: 535 Authentication failed" });
  });
});
