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

## 4. Payments — Stripe Connect (Phase 1c)

Real payments use **Stripe Connect** (destination charges: the platform takes
its commission as an application fee and the rest goes to the host's connected
account — the platform never holds host funds). Deposits/balances are separate
Checkout sessions, and a webhook confirms bookings (never the success redirect).

1. **Enable Connect** in the Stripe dashboard (Connect → Get started → Platform).
2. **Env vars** (Vercel) — then redeploy:
   ```
   PAYMENTS_PROVIDER=stripe
   STRIPE_SECRET_KEY=sk_live_…            # or sk_test_… while testing
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_…
   STRIPE_WEBHOOK_SECRET=whsec_…          # from step 3
   NEXT_PUBLIC_SITE_URL=https://<your-domain>   # for success/cancel/return URLs
   ```
3. **Webhook** — Stripe → Developers → Webhooks → Add endpoint:
   - URL: `https://<your-domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. **Run migration** `0006_stripe.sql` (adds `hosts.stripe_account_id` etc.).
5. **Hosts connect their account**: a host opens **Studio → Payouts → Connect with
   Stripe** and completes Express onboarding. Until a host is onboarded, their
   bookings are collected by the platform (no auto-transfer).

Booking flow once live: guest picks a date/room → **Reserve** → redirected to
Stripe Checkout → pays the deposit (or full) → the webhook confirms the booking
and records the payment. Refunds issued from the Stripe dashboard sync back
(the `charge.refunded` webhook marks the booking refunded and frees the spot).

Test with Stripe **test mode** keys and card `4242 4242 4242 4242` first. Verify
the whole flow on `/desk/settings` (all green) before going to live keys.

Also live: **pay-balance-later** (trip page → Stripe checkout for the balance),
an **in-app refund** button (Admin → Bookings; reverses charge + fee + transfer),
**promo codes** (Admin → Promos; applied at checkout), and **automated emails**
(booking confirmation, balance receipt, host-application decisions via Resend).
Run migrations `0006_stripe.sql` and `0007_promos.sql` for these.
