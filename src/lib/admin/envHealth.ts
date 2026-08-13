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
      {
        key: "ADMIN_EMAIL",
        label: "Ops notifications recipient",
        level: (present("ADMIN_EMAIL") ? "ok" : "warn") as Level,
        detail: present("ADMIN_EMAIL") ? "Set" : "Optional — new host-application alerts won't be emailed",
        secret: false,
        required: false,
      },
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

export interface ReadinessCheck {
  label: string;
  ok: boolean;
  detail: string;
  /** Which migration/setup provides this, for a quick fix pointer. */
  fix?: string;
}

/**
 * Live readiness board for the end-to-end flows (create → publish → book).
 * Each check runs a harmless probe against the live DB so a missing migration
 * shows up here instead of as a cryptic error mid-flow. Admin-gated page.
 */
export async function probeReadiness(): Promise<ReadinessCheck[] | null> {
  if (!isSupabaseConfigured()) return null;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const checks: ReadinessCheck[] = [];

  async function column(label: string, table: string, col: string, fix: string) {
    const { error } = await supabase.from(table).select(col).limit(1);
    checks.push({ label, ok: !error, detail: error ? error.message : "present", fix: error ? fix : undefined });
  }

  // Schema pieces the flows depend on.
  await column("experiences.content", "experiences", "content", "Run 0005_go_live.sql");
  await column("departures.code", "departures", "code", "Run 0005_go_live.sql");
  await column("room_types.code", "room_types", "code", "Run 0005_go_live.sql");
  await column("experiences.retreat_draft_id", "experiences", "retreat_draft_id", "Run 0010_publish.sql");
  await column("retreat_drafts table", "retreat_drafts", "id", "Run 0004_retreat_drafts.sql");
  await column("messages table", "messages", "id", "Run 0008_messages.sql");
  await column("app_settings table", "app_settings", "key", "Run 0009_app_settings.sql");

  // Data presence.
  const counts: Array<[string, string, Record<string, string> | null]> = [
    ["Destinations", "destinations", null],
    ["Published experiences", "experiences", { status: "published" }],
    ["Departures", "departures", null],
  ];
  for (const [label, table, filter] of counts) {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (filter) for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
    const { count, error } = await q;
    checks.push({
      label,
      ok: !error && (count ?? 0) > 0,
      detail: error ? error.message : `${count ?? 0} row(s)`,
      fix: error ? "Check migrations & seed" : (count ?? 0) === 0 ? "None yet — create/seed some" : undefined,
    });
  }

  return checks;
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
