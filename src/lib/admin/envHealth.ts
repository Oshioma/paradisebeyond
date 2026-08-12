import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Environment/keys health for the admin System page.
 *
 * SECURITY: secret values are NEVER returned to the client. For public values
 * (URLs, publishable keys) we return a masked preview; for secrets we return
 * only presence, a recognised scheme, and length. All computation is
 * server-side; the page is admin-gated.
 */

export type Level = "ok" | "warn" | "missing";

export interface Check {
  key: string;
  label: string;
  level: Level;
  detail: string;
  /** Safe, masked preview (never a secret value). */
  preview?: string;
  secret: boolean;
  required: boolean;
}

function maskPublic(v: string): string {
  if (v.length <= 12) return v.slice(0, 4) + "…";
  return `${v.slice(0, 12)}…${v.slice(-4)}`;
}

function keyScheme(v: string): string {
  if (v.startsWith("sb_publishable_")) return "publishable (new)";
  if (v.startsWith("sb_secret_")) return "secret (new)";
  if (v.startsWith("eyJ")) return "legacy JWT";
  if (v.startsWith("sk-ant-")) return "Anthropic key";
  if (v.startsWith("sk_")) return "Stripe secret";
  if (v.startsWith("pk_")) return "Stripe publishable";
  if (v.startsWith("whsec_")) return "Stripe webhook";
  return "unrecognised format";
}

function present(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/** A public var (URL or publishable key): show a masked preview. */
function publicCheck(name: string, label: string, required: boolean, opts: { url?: boolean; expectScheme?: string } = {}): Check {
  const v = present(name);
  if (!v) {
    return { key: name, label, level: required ? "missing" : "warn", detail: required ? "Not set" : "Optional — not set", secret: false, required };
  }
  let level: Level = "ok";
  let detail = "Set";
  if (opts.url) {
    try {
      const u = new URL(v);
      detail = u.host;
      if (u.protocol !== "https:") { level = "warn"; detail += " (not https)"; }
    } catch {
      level = "warn";
      detail = "Not a valid URL";
    }
  } else {
    const scheme = keyScheme(v);
    detail = scheme;
    if (opts.expectScheme && !scheme.includes(opts.expectScheme)) {
      level = "warn";
      detail += ` — expected ${opts.expectScheme}`;
    }
  }
  return { key: name, label, level, detail, preview: maskPublic(v), secret: false, required };
}

/** A secret var: presence + scheme + length only. Never previewed. */
function secretCheck(name: string, label: string, required: boolean, expectScheme?: string): Check {
  const v = present(name);
  if (!v) {
    return { key: name, label, level: required ? "missing" : "warn", detail: required ? "Not set" : "Optional — not set", secret: true, required };
  }
  const scheme = keyScheme(v);
  let level: Level = "ok";
  let detail = `${scheme} · ${v.length} chars`;
  if (expectScheme && !scheme.includes(expectScheme)) {
    level = "warn";
    detail = `${scheme} · expected ${expectScheme}`;
  }
  // Guard: a secret must not be exposed via a NEXT_PUBLIC_ variable.
  return { key: name, label, level, detail, secret: true, required };
}

export interface EnvHealth {
  mode: "live" | "demo";
  groups: { title: string; note?: string; checks: Check[] }[];
  dangerous: string[];
}

export function getEnvHealth(): EnvHealth {
  const supabaseGroup = {
    title: "Supabase",
    note: "Publishable key → anon slot; secret key → service-role slot (server only).",
    checks: [
      publicCheck("NEXT_PUBLIC_SUPABASE_URL", "Project URL", true, { url: true }),
      publicCheck("NEXT_PUBLIC_SUPABASE_ANON_KEY", "Publishable / anon key", true),
      secretCheck("SUPABASE_SERVICE_ROLE_KEY", "Secret / service-role key", true),
    ],
  };

  const paymentsProvider = present("PAYMENTS_PROVIDER") ?? "mock";
  const stripeRequired = paymentsProvider === "stripe";
  const paymentsGroup = {
    title: "Payments",
    note: `Active provider: ${paymentsProvider}. Stripe keys are required only when PAYMENTS_PROVIDER=stripe.`,
    checks: [
      { key: "PAYMENTS_PROVIDER", label: "Provider", level: "ok" as Level, detail: paymentsProvider, secret: false, required: false },
      secretCheck("STRIPE_SECRET_KEY", "Stripe secret key", stripeRequired, "Stripe secret"),
      publicCheck("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "Stripe publishable key", stripeRequired, { expectScheme: "Stripe publishable" }),
      secretCheck("STRIPE_WEBHOOK_SECRET", "Stripe webhook secret", stripeRequired, "Stripe webhook"),
    ],
  };

  const emailGroup = {
    title: "Email (Resend)",
    note: "For the app's transactional emails. Supabase auth emails are configured separately (Auth → SMTP Settings → point at Resend).",
    checks: [
      secretCheck("RESEND_API_KEY", "Resend API key", false),
      publicCheck("EMAIL_FROM", "From address", false),
    ],
  };

  const aiGroup = {
    title: "AI (Anthropic)",
    note: `Powers "Draft with AI" in the Retreat Builder. Optional — without a key it falls back to local heuristic copy. Model: ${present("ANTHROPIC_MODEL") ?? "claude-opus-5 (default)"}.`,
    checks: [
      secretCheck("ANTHROPIC_API_KEY", "Anthropic API key", false, "Anthropic key"),
      { key: "ANTHROPIC_MODEL", label: "Model override", level: "ok" as Level, detail: present("ANTHROPIC_MODEL") ?? "claude-opus-5 (default)", secret: false, required: false },
    ],
  };

  const siteGroup = {
    title: "Site",
    note: "Set the Site URL so auth email links resolve to your deployment, not localhost.",
    checks: [publicCheck("NEXT_PUBLIC_SITE_URL", "Site URL", false, { url: true })],
  };

  // Danger checks: any secret accidentally exposed to the browser.
  const dangerous: string[] = [];
  for (const name of Object.keys(process.env)) {
    if (!name.startsWith("NEXT_PUBLIC_")) continue;
    const v = process.env[name] ?? "";
    if (v.startsWith("sb_secret_") || v.startsWith("sk_") || v.startsWith("whsec_")) {
      dangerous.push(name);
    }
  }

  return {
    mode: isSupabaseConfigured() ? "live" : "demo",
    groups: [supabaseGroup, paymentsGroup, emailGroup, aiGroup, siteGroup],
    dangerous,
  };
}

/**
 * Live connectivity probe — only meaningful when Supabase is configured. Runs a
 * trivial read and reports whether the DB is reachable and the schema present.
 */
export async function probeSupabase(): Promise<{ ok: boolean; detail: string } | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { count, error } = await supabase
      .from("destinations")
      .select("*", { count: "exact", head: true });
    if (error) return { ok: false, detail: error.message };
    return { ok: true, detail: `Reachable · ${count ?? 0} destinations found` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "Unknown error" };
  }
}
