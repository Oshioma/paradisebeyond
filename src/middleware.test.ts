import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

/**
 * Middleware routing per host: which brand is stamped on the request, which
 * `[site]` route public pages are rewritten to, and that Paradise Beyond's
 * retreat-microsite routing is unchanged.
 */
function run(url: string, init: { cookie?: string } = {}) {
  const u = new URL(url);
  const headers = new Headers({ host: u.host });
  if (init.cookie) headers.set("cookie", init.cookie);
  const res = middleware(new NextRequest(url, { headers }));
  return {
    res,
    brand: res.headers.get("x-middleware-request-x-site-brand"),
    rewrite: res.headers.get("x-middleware-rewrite") ? new URL(res.headers.get("x-middleware-rewrite")!).pathname : null,
    location: res.headers.get("location"),
    setCookie: res.headers.get("set-cookie"),
  };
}

const ORIGINAL = process.env.NEXT_PUBLIC_SITE_URL;
beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.paradisebeyond.com";
});
afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL;
});

describe("spendtimeoffgrid.com", () => {
  it("apex: homepage → /spendtimeoffgrid with the brand header", () => {
    const r = run("https://spendtimeoffgrid.com/");
    expect(r.brand).toBe("spendtimeoffgrid");
    expect(r.rewrite).toBe("/spendtimeoffgrid");
  });

  it("www: public pages are rewritten to the brand's [site] route", () => {
    const r = run("https://www.spendtimeoffgrid.com/experiences/some-farm");
    expect(r.brand).toBe("spendtimeoffgrid");
    expect(r.rewrite).toBe("/spendtimeoffgrid/experiences/some-farm");
  });

  it("is never treated as a host's custom-domain microsite", () => {
    const r = run("https://spendtimeoffgrid.com/");
    expect(r.rewrite).not.toMatch(/^\/r\//);
  });

  it("app areas keep their path and carry the brand header", () => {
    const r = run("https://spendtimeoffgrid.com/account");
    expect(r.rewrite).toBeNull();
    expect(r.brand).toBe("spendtimeoffgrid");
  });

  it("ignores a client-sent brand header (always overwritten)", () => {
    const req = new NextRequest("https://www.paradisebeyond.com/account", {
      headers: { host: "www.paradisebeyond.com", "x-site-brand": "spendtimeoffgrid" },
    });
    expect(middleware(req).headers.get("x-middleware-request-x-site-brand")).toBe("paradise-beyond");
  });
});

describe("internal requests (x-forwarded-host)", () => {
  it("Next's server-action redirect render keeps the original brand", () => {
    const req = new NextRequest("http://localhost:3000/book/og-1", {
      headers: { host: "localhost:3000", "x-forwarded-host": "spendtimeoffgrid.com" },
    });
    expect(middleware(req).headers.get("x-middleware-request-x-site-brand")).toBe("spendtimeoffgrid");
  });

  it("Paradise Beyond's internal requests stay Paradise Beyond", () => {
    const req = new NextRequest("http://localhost:3000/book/x", {
      headers: { host: "localhost:3000", "x-forwarded-host": "www.paradisebeyond.com" },
    });
    expect(middleware(req).headers.get("x-middleware-request-x-site-brand")).toBe("paradise-beyond");
  });
});

describe("Paradise Beyond (unchanged routing)", () => {
  it("www homepage → /paradise-beyond", () => {
    const r = run("https://www.paradisebeyond.com/");
    expect(r.brand).toBe("paradise-beyond");
    expect(r.rewrite).toBe("/paradise-beyond");
  });

  it("retreat subdomain still opens its microsite", () => {
    expect(run("https://amina.paradisebeyond.com/").rewrite).toBe("/r/amina");
  });

  it("a host's custom domain still opens its microsite", () => {
    expect(run("https://aminaretreats.com/").rewrite).toBe("/r/aminaretreats.com");
  });

  it("non-booking paths on a microsite domain still redirect to www", () => {
    const r = run("https://aminaretreats.com/experiences");
    expect(r.location).toBe("https://www.paradisebeyond.com/experiences");
  });

  it("booking paths on a microsite domain still pass through", () => {
    const r = run("https://aminaretreats.com/book/dep-1");
    expect(r.location).toBeNull();
    expect(r.rewrite).toBeNull();
  });

  it("works with no NEXT_PUBLIC_SITE_URL (local dev)", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const r = run("http://localhost:3000/experiences");
    expect(r.brand).toBe("paradise-beyond");
    expect(r.rewrite).toBe("/paradise-beyond/experiences");
  });
});

describe("preview cookie", () => {
  it("?site=spendtimeoffgrid on a preview host switches brand and sets the cookie", () => {
    const r = run("https://pb-git-x.vercel.app/?site=spendtimeoffgrid");
    expect(r.brand).toBe("spendtimeoffgrid");
    expect(r.rewrite).toBe("/spendtimeoffgrid");
    expect(r.setCookie).toContain("site_preview=spendtimeoffgrid");
  });

  it("the cookie keeps the preview brand on later requests", () => {
    const r = run("https://pb-git-x.vercel.app/experiences", { cookie: "site_preview=spendtimeoffgrid" });
    expect(r.brand).toBe("spendtimeoffgrid");
    expect(r.rewrite).toBe("/spendtimeoffgrid/experiences");
  });

  it("?site=paradise-beyond clears it", () => {
    const r = run("https://pb-git-x.vercel.app/?site=paradise-beyond", { cookie: "site_preview=spendtimeoffgrid" });
    expect(r.brand).toBe("paradise-beyond");
    expect(r.setCookie).toMatch(/site_preview=;/);
  });

  it("is ignored on production domains", () => {
    const r = run("https://www.paradisebeyond.com/?site=spendtimeoffgrid", { cookie: "site_preview=spendtimeoffgrid" });
    expect(r.brand).toBe("paradise-beyond");
    expect(r.setCookie).toBeNull();
  });
});

describe("internal [site] paths aren't public URLs", () => {
  it("redirects /spendtimeoffgrid/experiences to /experiences", () => {
    const r = run("https://spendtimeoffgrid.com/spendtimeoffgrid/experiences");
    expect(new URL(r.location!).pathname).toBe("/experiences");
  });

  it("lets generated OG images through", () => {
    const r = run("https://spendtimeoffgrid.com/spendtimeoffgrid/experiences/x/opengraph-image");
    expect(r.location).toBeNull();
  });
});
