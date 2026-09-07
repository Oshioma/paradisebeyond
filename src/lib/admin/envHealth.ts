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
  /**
   * True when an admin has something to do about this row. A required var that
   * is missing or wrong qualifies; so does an optional var that is set but
   * wrong (e.g. a Stripe test key). An optional var that is simply not set is
   * a choice, not a problem, so it stays out of the attention board.
   */
  needsAttention: boolean;
}

/** One row of the "Needs attention" board at the top of the System page. */
export interface AttentionItem {
  key: string;
  label: string;
  /** Which system it belongs to — matches a group title where there is one. */
  group: string;
  detail: string;
  level: Level;
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
  if (v.startsWith("sk_live_") || v.startsWith("rk_live_")) return "Stripe secret (live)";
  if (v.startsWith("sk_test_") || v.startsWith("rk_test_")) return "Stripe secret (test)";
  if (v.startsWith("sk_") || v.startsWith("rk_")) return "Stripe secret";
  if (v.startsWith("pk_live_")) return "Stripe publishable (live)";
  if (v.startsWith("pk_test_")) return "Stripe publishable (test)";
  if (v.startsWith("pk_")) return "Stripe publishable";
  if (v.startsWith("whsec_")) return "Stripe webhook";
  return "unrecognised format";
}

/** Live vs test mode, read off a Stripe key's prefix. */
export type StripeKeyMode = "live" | "test" | "unknown";

export function stripeKeyMode(v: string): StripeKeyMode {
  if (/^(sk|rk|pk)_live_/.test(v)) return "live";
  if (/^(sk|rk|pk)_test_/.test(v)) return "test";
  return "unknown";
}

function present(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/** A public var (URL or publishable key): show a masked preview. */
function publicCheck(name: string, label: string, required: boolean, opts: { url?: boolean; expectScheme?: string } = {}): Check {
  const v = present(name);
  if (!v) {
    return {
      key: name,
      label,
      level: required ? "missing" : "warn",
      detail: required ? "Not set" : "Optional — not set",
      secret: false,
      required,
      needsAttention: required,
    };
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
  return { key: name, label, level, detail, preview: maskPublic(v), secret: false, required, needsAttention: level !== "ok" };
}

/** A secret var: presence + scheme + length only. Never previewed. */
function secretCheck(name: string, label: string, required: boolean, expectScheme?: string): Check {
  const v = present(name);
  if (!v) {
    return {
      key: name,
      label,
      level: required ? "missing" : "warn",
      detail: required ? "Not set" : "Optional — not set",
      secret: true,
      required,
      needsAttention: required,
    };
  }
  const scheme = keyScheme(v);
  let level: Level = "ok";
  let detail = `${scheme} · ${v.length} chars`;
  if (expectScheme && !scheme.includes(expectScheme)) {
    level = "warn";
    detail = `${scheme} · expected ${expectScheme}`;
  }
  // Guard: a secret must not be exposed via a NEXT_PUBLIC_ variable.
  return { key: name, label, level, detail, secret: true, required, needsAttention: level !== "ok" };
}

/**
 * A Stripe API key. Only a LIVE key reads as "Set" here: a test key still only
 * takes fake cards, so on a go-live board it is not a configured payment
 * system — it shows amber until it is swapped for the live key.
 */
function stripeKeyCheck(name: string, label: string, required: boolean, kind: "secret" | "publishable"): Check {
  const isSecret = kind === "secret";
  const expected = isSecret ? "sk_live_…" : "pk_live_…";
  const v = present(name);
  if (!v) {
    return {
      key: name,
      label,
      level: required ? "missing" : "warn",
      detail: required ? `Not set — a live ${expected} key is required` : `Optional while the provider isn't Stripe — needs a live ${expected} key`,
      secret: isSecret,
      required,
      needsAttention: required,
    };
  }
  const preview = isSecret ? undefined : maskPublic(v);
  const mode = stripeKeyMode(v);
  if (mode === "live") {
    const detail = isSecret ? `${keyScheme(v)} · ${v.length} chars` : keyScheme(v);
    return { key: name, label, level: "ok", detail, preview, secret: isSecret, required, needsAttention: false };
  }
  const detail = mode === "test"
    ? `Test key — real payments need a live ${expected} key`
    : `Unrecognised format — expected a live ${expected} key`;
  return { key: name, label, level: "warn", detail, preview, secret: isSecret, required, needsAttention: true };
}

export interface Group {
  title: string;
  note?: string;
  checks: Check[];
}

export interface EnvHealth {
  mode: "live" | "demo";
  /** Ordered worst-first: the systems that need attention sort to the top. */
  groups: Group[];
  dangerous: string[];
  /** Every check with something to fix, worst-first. */
  attention: AttentionItem[];
}

/** Sort weight for a check — lower is more urgent. */
function rank(c: Check): number {
  if (c.level === "missing") return c.required ? 0 : 1;
  if (c.level === "warn") return c.needsAttention ? (c.required ? 2 : 3) : 5;
  return 4;
}

function worstRank(g: Group): number {
  return g.checks.reduce((min, c) => Math.min(min, c.needsAttention ? rank(c) : 6), 6);
}

export function getEnvHealth(): EnvHealth {
  const supabaseGroup: Group = {
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
  const secretKey = present("STRIPE_SECRET_KEY");
  const stripeMode = secretKey ? stripeKeyMode(secretKey) : "unknown";
  const paymentsGroup: Group = {
    title: "Payments",
    note: `Active provider: ${paymentsProvider}. Only live keys (sk_live_… / pk_live_…) count as set up — a test key takes fake cards, so it stays amber here. Webhook secrets look identical in both modes, so check the endpoint you copied it from is the live one.`,
    checks: [
      {
        key: "PAYMENTS_PROVIDER",
        label: "Provider",
        level: (stripeRequired ? "ok" : "warn") as Level,
        detail: stripeRequired ? paymentsProvider : `${paymentsProvider} — payments are simulated, no money moves`,
        secret: false,
        required: false,
        needsAttention: !stripeRequired,
      },
      stripeKeyCheck("STRIPE_SECRET_KEY", "Stripe secret key", stripeRequired, "secret"),
      stripeKeyCheck("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "Stripe publishable key", stripeRequired, "publishable"),
      secretCheck("STRIPE_WEBHOOK_SECRET", "Stripe webhook secret", stripeRequired, "Stripe webhook"),
    ],
  };

  // A live secret key paired with a test publishable key (or vice versa) fails
  // at checkout in a way that is hard to read from either row alone.
  const publishableKey = present("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  const publishableMode = publishableKey ? stripeKeyMode(publishableKey) : "unknown";
  if (secretKey && publishableKey && stripeMode !== publishableMode) {
    paymentsGroup.checks.push({
      key: "STRIPE_KEY_PAIR",
      label: "Stripe key pair",
      level: "warn",
      detail: `Mismatched modes — secret key is ${stripeMode}, publishable key is ${publishableMode}`,
      secret: false,
      required: false,
      needsAttention: true,
    });
  }

  const emailGroup: Group = {
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
        needsAttention: false,
      },
    ],
  };

  const aiGroup: Group = {
    title: "AI (Anthropic)",
    note: `Powers "Draft with AI" in the Retreat Builder. Optional — without a key it falls back to local heuristic copy. Model: ${present("ANTHROPIC_MODEL") ?? "claude-opus-5 (default)"}.`,
    checks: [
      secretCheck("ANTHROPIC_API_KEY", "Anthropic API key", false, "Anthropic key"),
      {
        key: "ANTHROPIC_MODEL",
        label: "Model override",
        level: "ok" as Level,
        detail: present("ANTHROPIC_MODEL") ?? "claude-opus-5 (default)",
        secret: false,
        required: false,
        needsAttention: false,
      },
    ],
  };

  const siteGroup: Group = {
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

  const groups = [supabaseGroup, paymentsGroup, emailGroup, aiGroup, siteGroup];
  // Systems with something to fix float to the top; ties keep the source order.
  const ordered = groups
    .map((g, i) => ({ g, i, worst: worstRank(g) }))
    .sort((a, b) => a.worst - b.worst || a.i - b.i)
    .map((x) => x.g);

  const attention: AttentionItem[] = ordered
    .flatMap((g) => g.checks.filter((c) => c.needsAttention).map((c) => ({ c, group: g.title })))
    .sort((a, b) => rank(a.c) - rank(b.c))
    .map(({ c, group }) => ({ key: c.key, label: c.label, group, detail: c.detail, level: c.level }));

  return {
    mode: isSupabaseConfigured() ? "live" : "demo",
    groups: ordered,
    dangerous,
    attention,
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

  // Failing rows first, so what needs attention reads at the top.
  return checks.sort((a, b) => Number(a.ok) - Number(b.ok));
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
