import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getEnvHealth, probeSupabase, type Level } from "@/lib/admin/envHealth";

export const metadata: Metadata = { title: "System", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireRole("admin", "/desk/settings");
  const health = getEnvHealth();
  const probe = await probeSupabase();

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Admin Desk</p>
        <h1 className="mt-2 text-display font-semibold text-ink">System &amp; environment</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Confirm every key and environment variable is wired correctly. Secret
          values are never shown here — only whether they&apos;re set and valid.
        </p>
      </header>

      {/* Mode banner */}
      <div className={`mt-8 rounded-xl2 border p-5 ${health.mode === "live" ? "border-palm-500/40 bg-palm-500/5" : "border-clay-500/40 bg-clay-500/5"}`}>
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${health.mode === "live" ? "bg-palm-500" : "bg-clay-500"}`} />
          <p className="font-medium text-ink">
            {health.mode === "live" ? "Live mode — Supabase connected" : "Demo mode — no Supabase configured"}
          </p>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {health.mode === "live"
            ? "Auth, data and RLS run against your Supabase project."
            : "Cookie-backed session and seeded data are standing in. Set the Supabase env vars to go live."}
        </p>
        {probe && (
          <p className={`mt-3 text-sm ${probe.ok ? "text-palm-600" : "text-clay-600"}`}>
            {probe.ok ? "✓ " : "✗ "}Database probe: {probe.detail}
          </p>
        )}
      </div>

      {/* Danger */}
      {health.dangerous.length > 0 && (
        <div className="mt-6 rounded-xl2 border border-clay-500 bg-clay-500/10 p-5">
          <p className="font-medium text-clay-600">⚠ Secret exposed to the browser</p>
          <p className="mt-1 text-sm text-ink-soft">
            These <code>NEXT_PUBLIC_</code> variables contain what looks like a secret key and are shipped to the browser. Move them to a non-public variable immediately: {health.dangerous.join(", ")}
          </p>
        </div>
      )}

      {/* Groups */}
      <div className="mt-8 space-y-8">
        {health.groups.map((g) => (
          <section key={g.title}>
            <h2 className="font-display text-2xl font-semibold text-ink">{g.title}</h2>
            {g.note && <p className="mt-1 text-sm text-ink-muted">{g.note}</p>}
            <div className="mt-4 overflow-hidden rounded-xl2 border border-ink/10">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-ink/10">
                  {g.checks.map((c) => (
                    <tr key={c.key} className="bg-sand-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{c.label}</p>
                        <p className="font-mono text-xs text-ink-muted">
                          {c.key}
                          {c.secret && <span className="ml-2 rounded bg-ink/5 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-eyebrow">secret</span>}
                          {c.required && <span className="ml-1 text-clay-500">*</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {c.detail}
                        {c.preview && <span className="ml-2 font-mono text-xs text-ink-muted">{c.preview}</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Dot level={c.level} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs text-ink-muted">
        Set these in <code>.env.local</code> (local) or your host&apos;s environment settings (Vercel / Claude Code environment). Publishable key → <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>; secret key → <code>SUPABASE_SERVICE_ROLE_KEY</code> (never a <code>NEXT_PUBLIC_</code> var).
      </p>
    </div>
  );
}

function Dot({ level }: { level: Level }) {
  const map = {
    ok: ["bg-palm-500/15 text-palm-600", "Set"],
    warn: ["bg-clay-500/15 text-clay-600", "Check"],
    missing: ["bg-ink/10 text-ink-muted", "Missing"],
  } as const;
  const [cls, label] = map[level];
  return <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[0.66rem] font-medium uppercase tracking-eyebrow ${cls}`}>{label}</span>;
}
