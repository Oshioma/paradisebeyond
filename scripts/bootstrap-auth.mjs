/**
 * Bootstrap auth users, profile roles and the host link for a fresh Supabase
 * project — so the real (RLS-enforced) path comes up ready to sign in, matching
 * the demo. Idempotent: re-running updates roles rather than duplicating users.
 *
 * Prerequisites: run supabase/migrations + supabase/seed.sql first.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/bootstrap-auth.mjs
 *
 * Optional overrides:
 *   PB_ADMIN_EMAIL, PB_HOST_EMAIL, PB_GUEST_EMAIL, PB_DEFAULT_PASSWORD
 *
 * The SERVICE ROLE / secret key is used here because creating users and setting
 * roles are privileged operations. Run this from a trusted machine only; never
 * ship the secret key to the browser.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
      "(the Supabase 'secret' key).",
  );
  process.exit(1);
}

const password = process.env.PB_DEFAULT_PASSWORD || "paradise-demo-2026";

const USERS = [
  { key: "admin", email: process.env.PB_ADMIN_EMAIL || "desk@paradisebeyond.dev", name: "Paradise Desk", role: "admin" },
  { key: "host", email: process.env.PB_HOST_EMAIL || "amina@paradisebeyond.dev", name: "Amina Yusuf", role: "host", hostSlug: "amina-yusuf" },
  { key: "guest", email: process.env.PB_GUEST_EMAIL || "ava@paradisebeyond.dev", name: "Ava Traveller", role: "guest" },
];

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email) {
  // Paginate through users (fine for a bootstrap-scale project).
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureUser(u) {
  let user = await findUserByEmail(u.email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: u.name },
    });
    if (error) throw error;
    user = data.user;
    console.log(`✓ created ${u.role} — ${u.email}`);
  } else {
    console.log(`• exists  ${u.role} — ${u.email}`);
  }

  // Upsert the profile with the correct role.
  const { error: pErr } = await supabase
    .from("profiles")
    .upsert({ id: user.id, full_name: u.name, role: u.role }, { onConflict: "id" });
  if (pErr) throw pErr;

  // Link the host persona to this owner.
  if (u.hostSlug) {
    const { error: hErr } = await supabase
      .from("hosts")
      .update({ owner_id: user.id })
      .eq("slug", u.hostSlug);
    if (hErr) throw hErr;
    console.log(`  ↳ linked host '${u.hostSlug}' to ${u.email}`);
  }
  return user;
}

async function main() {
  console.log(`Bootstrapping auth on ${url}\n`);
  for (const u of USERS) {
    try {
      await ensureUser(u);
    } catch (e) {
      console.error(`✗ ${u.email}:`, e.message ?? e);
      process.exitCode = 1;
    }
  }
  console.log(`\nDone. Default password for all demo accounts: ${password}`);
  console.log("Change these immediately for any non-throwaway environment.");
}

main();
