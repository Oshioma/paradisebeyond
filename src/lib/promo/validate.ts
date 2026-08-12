import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Demo promo codes (used when Supabase isn't configured). */
export const DEMO_PROMOS: { code: string; discountBps?: number; amountMinor?: number; label: string }[] = [
  { code: "WELCOME10", discountBps: 1000, label: "10% off" },
  { code: "ZANZIBAR50", amountMinor: 5000, label: "$50 off" },
];

export interface PromoResult {
  code: string;
  discountMinor: number;
  label: string;
}

/**
 * Compute the discount for a code against a subtotal (in minor units), or null
 * if it's invalid/expired/used up. Live mode uses the `promo_discount` SQL
 * function (so the promo table stays admin-only); demo uses DEMO_PROMOS.
 */
export async function promoDiscount(codeRaw: string, subtotalMinor: number): Promise<PromoResult | null> {
  const code = codeRaw.trim();
  if (!code) return null;

  if (isSupabaseConfigured()) {
    try {
      const { createAnonClient } = await import("@/lib/supabase/server");
      const { data } = await createAnonClient().rpc("promo_discount", {
        p_code: code,
        p_subtotal: subtotalMinor,
      });
      const d = Number(data ?? 0);
      return d > 0 ? { code: code.toUpperCase(), discountMinor: d, label: `Code ${code.toUpperCase()} applied` } : null;
    } catch {
      return null;
    }
  }

  const p = DEMO_PROMOS.find((x) => x.code.toUpperCase() === code.toUpperCase());
  if (!p) return null;
  let d = p.discountBps ? Math.round((subtotalMinor * p.discountBps) / 10000) : p.amountMinor ?? 0;
  d = Math.min(d, subtotalMinor);
  return d > 0 ? { code: p.code, discountMinor: d, label: p.label } : null;
}
