# Deploy Paradise Beyond (get a live URL)

You need a hosted deployment to have a website URL. Vercel is the fastest path.

## 1. Deploy to Vercel

1. Go to **vercel.com → Add New → Project**.
2. **Import** the `Oshioma/paradisebeyond` GitHub repo.
3. Framework preset: **Next.js** (auto-detected). Click **Deploy**.

That gives you a URL like `https://paradisebeyond.vercel.app`.

> Deployed **without** Supabase env vars, the site runs in **demo mode** — the
> `/login` page shows "Continue as Admin" to anyone. That's fine for previewing,
> but it is **not** secure. To make the admin truly admin-only, do step 2.

## 2. Make the admin real (admin-only)

Set these in **Vercel → Project → Settings → Environment Variables**, then redeploy:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx      # Supabase "Publishable" key
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx               # Supabase "Secret" key
```

With Supabase configured, the demo buttons disappear and `/login` becomes a real
email + password sign-in. Then:

1. Run the database setup (once): `bash scripts/db-setup.sh` with your
   `DATABASE_URL`, or the **Database setup** GitHub Action.
2. Create your account by signing up / via `npm run bootstrap:auth`.
3. Promote **your** account to admin in the Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@youremail.com');
```

## 3. Your admin URL

Once deployed, sign in at `…/login`, then the super admin lives at:

- `https://<your-domain>/desk` — Admin Desk
- `https://<your-domain>/desk/settings` — System & environment (keys/health)
- `https://<your-domain>/desk/media` — Media manager (upload / "Load demo photography")
- `https://<your-domain>/desk/submissions` — Retreat approvals

`/desk` is gated by middleware + a server-side `role = 'admin'` check, so only
admin accounts can open it once Supabase is configured.
