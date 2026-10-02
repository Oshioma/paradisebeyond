import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./index";

const sent: { from: string; reply_to?: string }[] = [];

describe("sendEmail sender", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    sent.length = 0;
  });

  function stub() {
    process.env.RESEND_API_KEY = "test";
    process.env.EMAIL_FROM = "Paradise Beyond <hello@paradisebeyond.com>";
    vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
      sent.push(JSON.parse(init.body));
      return new Response("{}", { status: 200 });
    });
  }

  it("uses EMAIL_FROM when no sender is given (Paradise Beyond)", async () => {
    stub();
    await sendEmail({ to: "a@example.com", subject: "s", html: "h" });
    expect(sent[0].from).toBe("Paradise Beyond <hello@paradisebeyond.com>");
  });

  it("uses the brand's sender when one is given (Spend Time Off Grid)", async () => {
    stub();
    await sendEmail({
      to: "a@example.com",
      subject: "s",
      html: "h",
      from: "Spend Time Off Grid <noreply@spendtimeoffgrid.com>",
      replyTo: "support@spendtimeoffgrid.com",
    });
    expect(sent[0]).toMatchObject({
      from: "Spend Time Off Grid <noreply@spendtimeoffgrid.com>",
      reply_to: "support@spendtimeoffgrid.com",
    });
  });
});
