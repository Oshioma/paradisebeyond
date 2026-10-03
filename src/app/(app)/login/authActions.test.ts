import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: { fn: string; args: unknown }[] = [];
let authError: { message: string } | null = null;

vi.mock("next/headers", () => ({ cookies: () => ({ set: vi.fn(), delete: vi.fn() }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); },
}));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/brand/server", () => ({
  brandOrigin: () => "https://www.spendtimeoffgrid.com",
  getBrand: () => ({ id: "spendtimeoffgrid" }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      signUp: async (args: unknown) => (calls.push({ fn: "signUp", args }), { error: authError }),
      signInWithPassword: async (args: unknown) => (calls.push({ fn: "signIn", args }), { error: authError }),
      resetPasswordForEmail: async (email: string, opts: unknown) => (calls.push({ fn: "reset", args: { email, opts } }), { error: authError }),
    },
  }),
}));

const { signUp, signInWithPassword, sendPasswordReset } = await import("./actions");

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}
async function redirectOf(p: Promise<unknown>) {
  try { await p; } catch (e) { return (e as Error).message.replace("REDIRECT ", ""); }
  return null;
}

describe("auth actions with CAPTCHA", () => {
  beforeEach(() => { calls.length = 0; authError = null; });

  it("sign-up passes the token and records which site the person joined", async () => {
    await redirectOf(signUp(form({ email: "a@b.com", password: "longenough", name: "Ana", captchaToken: "tok" })));
    expect(calls[0].args).toMatchObject({
      email: "a@b.com",
      options: { data: { full_name: "Ana", site: "spendtimeoffgrid" }, captchaToken: "tok" },
    });
  });

  it("sign-in and password reset pass the token too", async () => {
    await redirectOf(signInWithPassword(form({ email: "a@b.com", password: "x", captchaToken: "tok" })));
    await redirectOf(sendPasswordReset(form({ email: "a@b.com", captchaToken: "tok" })));
    expect(calls[0].args).toMatchObject({ options: { captchaToken: "tok" } });
    expect(calls[1].args).toMatchObject({ email: "a@b.com", opts: { captchaToken: "tok" } });
  });

  it("works without a token (before CAPTCHA is switched on)", async () => {
    await redirectOf(signUp(form({ email: "a@b.com", password: "longenough" })));
    expect((calls[0].args as { options: Record<string, unknown> }).options).not.toHaveProperty("captchaToken");
  });

  it("a failed check asks the person to retry, keeping where they were going", async () => {
    authError = { message: "captcha protection: request disallowed (no captcha response)" };
    expect(await redirectOf(signInWithPassword(form({ email: "a@b.com", password: "x", next: "/book/d1" })))).toBe(
      `/login?error=${encodeURIComponent("Please complete the security check, then try again.")}&next=${encodeURIComponent("/book/d1")}`,
    );
    expect(await redirectOf(sendPasswordReset(form({ email: "a@b.com" })))).toMatch(/^\/forgot-password\?error=/);
  });

  it("password reset still never reveals whether an account exists", async () => {
    authError = { message: "User not found" };
    expect(await redirectOf(sendPasswordReset(form({ email: "nobody@b.com" })))).toBe("/forgot-password?sent=1");
  });
});
