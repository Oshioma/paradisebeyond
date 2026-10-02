import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DEMO_PROMOS } from "@/lib/promo/validate";
import { createPromo, togglePromo, deletePromo } from "./actions";

export const metadata: Metadata = { title: "Promo codes", robots: { index: false } };
export const dynamic = "force-dynamic";

interface Row {
  id?: string; code: string; discount_bps?: number | null; amount_minor?: number | null;
  currency?: string | null; max_redemptions?: number | null; redeemed?: number; active?: boolean; expires_at?: string | null;
}

export default async function PromosPage() {
  await requireRole("admin", "/desk/promos");
  const live = isSupabaseConfigured();

  let rows: Row[] = [];
  if (live) {
    const { createClient } = await import("@/lib/supabase/server");
    const { data } = await createClient().from("promo_codes").select("*").order("code");
    rows = (data ?? []) as Row[];
  } else {
    rows = DEMO_PROMOS.map((p) => ({ code: p.code, discount_bps: p.discountBps ?? null, amount_minor: p.amountMinor ?? null, active: true }));
  }

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Admin Desk</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Promo codes</h1>
        <p className="mt-3 text-ink-muted">Discounts applied at checkout. Percentage or fixed amount, with optional limits and expiry.</p>
      </header>

      {live ? (
        <form action={createPromo} className="mt-8 grid gap-3 rounded-xl2 border border-ink/10 bg-sand-50 p-5 sm:grid-cols-[1fr_120px_1fr_1fr_1fr_auto]">
          <input name="code" placeholder="CODE" required className={inp} />
          <select name="type" className={inp} defaultValue="percent">
            <option value="percent">% off</option>
            <option value="amount">$ off</option>
          </select>
          <input name="value" type="number" step="0.01" placeholder="Value (10 = 10% / $10)" required className={inp} />
          <input name="maxRedemptions" type="number" placeholder="Max uses (optional)" className={inp} />
          <input name="expiresAt" type="date" placeholder="Expires" className={inp} />
          <button className="rounded-full bg-clay-500 px-5 py-2.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600">Create</button>
        </form>
      ) : (
        <p className="mt-8 rounded-xl2 bg-sand-100 px-4 py-3 text-sm text-ink-muted">
          Demo mode shows built-in sample codes ({DEMO_PROMOS.map((p) => p.code).join(", ")}). Creating and editing codes needs Supabase configured.
        </p>
      )}

      <div className="mt-8 overflow-x-auto rounded-xl2 border border-ink/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-sand-100 text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">
            <tr><Th>Code</Th><Th>Discount</Th><Th>Used</Th><Th>Expires</Th><Th>Status</Th><Th></Th></tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {rows.map((r) => (
              <tr key={r.id ?? r.code} className="bg-sand-50">
                <Td className="font-mono font-medium text-ink">{r.code}</Td>
                <Td>{r.discount_bps ? `${r.discount_bps / 100}%` : r.amount_minor ? `$${(r.amount_minor / 100).toFixed(0)}` : "—"}</Td>
                <Td>{r.redeemed ?? 0}{r.max_redemptions ? ` / ${r.max_redemptions}` : ""}</Td>
                <Td>{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}</Td>
                <Td>
                  <span className={`rounded-full px-2.5 py-1 text-[0.62rem] uppercase tracking-eyebrow ${r.active ? "bg-palm-500/15 text-palm-600" : "bg-ink/10 text-ink-muted"}`}>
                    {r.active ? "Active" : "Off"}
                  </span>
                </Td>
                <Td>
                  {live && r.id && (
                    <div className="flex gap-2">
                      <form action={togglePromo}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="active" value={String(r.active)} />
                        <button className="text-[0.62rem] uppercase tracking-eyebrow text-ink-muted hover:text-ink">{r.active ? "Disable" : "Enable"}</button>
                      </form>
                      <form action={deletePromo}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="text-[0.62rem] uppercase tracking-eyebrow text-ink-muted hover:text-clay-600">Delete</button>
                      </form>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inp = "rounded-lg border border-ink/15 bg-sand-50 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500";
function Th({ children }: { children?: React.ReactNode }) { return <th className="px-4 py-3 font-medium">{children}</th>; }
function Td({ children, className }: { children: React.ReactNode; className?: string }) { return <td className={`px-4 py-3 text-ink-soft ${className ?? ""}`}>{children}</td>; }
