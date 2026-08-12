"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Create a promo code (admin, live mode only). */
export async function createPromo(formData: FormData) {
  await requireRole("admin");
  if (!isSupabaseConfigured()) return;
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const type = String(formData.get("type") ?? "percent");
  const value = Number(formData.get("value") ?? 0);
  const max = String(formData.get("maxRedemptions") ?? "").trim();
  const expires = String(formData.get("expiresAt") ?? "").trim();
  if (!code || value <= 0) return;

  const row: Record<string, unknown> = { code, active: true, redeemed: 0 };
  if (type === "percent") row.discount_bps = Math.round(value * 100);
  else { row.amount_minor = Math.round(value * 100); row.currency = "USD"; }
  if (max) row.max_redemptions = Number(max);
  if (expires) row.expires_at = new Date(expires).toISOString();

  const { createClient } = await import("@/lib/supabase/server");
  await createClient().from("promo_codes").insert(row);
  revalidatePath("/desk/promos");
}

export async function togglePromo(formData: FormData) {
  await requireRole("admin");
  if (!isSupabaseConfigured()) return;
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  const { createClient } = await import("@/lib/supabase/server");
  await createClient().from("promo_codes").update({ active: !active }).eq("id", id);
  revalidatePath("/desk/promos");
}

export async function deletePromo(formData: FormData) {
  await requireRole("admin");
  if (!isSupabaseConfigured()) return;
  const id = String(formData.get("id") ?? "");
  const { createClient } = await import("@/lib/supabase/server");
  await createClient().from("promo_codes").delete().eq("id", id);
  revalidatePath("/desk/promos");
}
