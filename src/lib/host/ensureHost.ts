import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Create (or return) the `hosts` row owned by a user, idempotent by `owner_id`.
 * Service-role write (hosts is admin-managed under RLS). Returns the host id, or
 * undefined in demo mode / when no user id is given.
 *
 * Keying on owner_id means every entry point that needs a host for a user —
 * approving their application, or their first retreat build — resolves to the
 * SAME row, so a host is never duplicated.
 */
export async function ensureHostForOwner(userId: string | null | undefined, displayName: string): Promise<string | undefined> {
  if (!isSupabaseConfigured() || !userId) return undefined;
  const { createServiceRoleClient } = await import("@/lib/supabase/server");
  const db = createServiceRoleClient();

  const { data: existing } = await db.from("hosts").select("id").eq("owner_id", userId).maybeSingle();
  if (existing?.id) return existing.id as string;

  const base =
    (displayName || "host")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "host";
  let slug = base;
  for (let n = 2; n < 60; n++) {
    const { data: clash } = await db.from("hosts").select("id").eq("slug", slug).maybeSingle();
    if (!clash) break;
    slug = `${base}-${n}`;
  }

  const { data: created } = await db
    .from("hosts")
    .insert({ owner_id: userId, slug, name: displayName || "Host" })
    .select("id")
    .maybeSingle();
  return (created?.id as string) ?? undefined;
}
