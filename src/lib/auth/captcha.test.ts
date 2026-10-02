import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { captchaOptions, friendlyAuthError } from "./captcha";

describe("captcha helpers", () => {
  it("sends the Turnstile token only when there is one", () => {
    const fd = new FormData();
    expect(captchaOptions(fd)).toEqual({});
    fd.set("captchaToken", "");
    expect(captchaOptions(fd)).toEqual({});
    fd.set("captchaToken", "tok-123");
    expect(captchaOptions(fd)).toEqual({ captchaToken: "tok-123" });
  });

  it("turns Supabase's captcha errors into an instruction", () => {
    expect(friendlyAuthError("captcha protection: request disallowed (no captcha response)")).toBe(
      "Please complete the security check, then try again.",
    );
    expect(friendlyAuthError("Invalid login credentials")).toBe("Invalid login credentials");
  });
});

describe("Supabase auth email templates", () => {
  for (const file of ["confirm-signup.html", "reset-password.html"]) {
    const html = readFileSync(path.join(process.cwd(), "supabase/templates", file), "utf8");
    it(`${file} links to the confirmation URL and speaks as the person's site`, () => {
      expect(html).toContain("{{ .ConfirmationURL }}");
      // Guarded so accounts without a site (older ones) safely get Paradise Beyond.
      expect(html).toContain('{{ if .Data.site }}{{ if eq .Data.site "spendtimeoffgrid" }}');
      expect(html).toContain("Spend Time Off Grid");
      expect(html).toContain("Paradise Beyond");
    });
  }
});
