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
(booking confirmation, balance receipt, host-application decisions via ImprovMX SMTP).
Run migrations `0006_stripe.sql` and `0007_promos.sql` for these.

---

## Scheduled data cleanup (required)

Guests' dietary and medical answers are special category data, held only while
the trip needs them. Migration `0029_purge_trip_health_data.sql` adds
`purge_ended_trip_health_data()`, which clears those answers for departures that
have ended, and `0030_schedule_health_data_purge.sql` puts it on Supabase Cron
at 03:17 UTC nightly.

1. **Enable pg_cron** — Dashboard → Database → Extensions → toggle `pg_cron`.
   Do this *before* running `0030`. The migration will create the extension
   itself if you skip this, but creating it from a migration doesn't always set
   the schema grants up correctly ([supabase/cli#1591]); toggling it in the
   dashboard once fixes that, and re-running `0030` is safe.
2. **Run migrations** `0029` then `0030`.
3. **Check it's scheduled**:
   ```sql
   select jobname, schedule, active from cron.job
    where jobname = 'purge-ended-trip-health-data';
   ```
4. **Check it's running** (after the first night):
   ```sql
   select status, return_message, start_time
     from cron.job_run_details order by runid desc limit 5;
   ```
   `return_message` is the number of rows purged.

Without this the app still hides health answers for finished trips, but the rows
keep the data — the schedule is what actually deletes it, so don't skip it.

[supabase/cli#1591]: https://github.com/supabase/cli/issues/1591

## Spend Time Off Grid (second marketplace, same deployment)

`spendtimeoffgrid.com` is served by this same app. Middleware maps the host to a
brand (`src/lib/brand/config.ts`); everything brand-specific lives there.

1. **Run migration `0032_marketplaces.sql`** before off-grid hosts publish or
   travellers book. It's additive (every existing row defaults to
   `paradise-beyond`) and idempotent. Paradise Beyond keeps working without it.
2. **Supabase Auth → URL Configuration → Redirect URLs**: add
   `https://spendtimeoffgrid.com/**` and `https://www.spendtimeoffgrid.com/**`
   so confirmation / password-reset links can return to the off-grid site.
3. **Stripe**: nothing new. The same webhook endpoint handles both sites;
   off-grid bookings return to `spendtimeoffgrid.com` after Checkout.
4. **Photos**: Desk → Media has a "Spend Time Off Grid" group (homepage hero,
   how-it-works image, host banner, the 13 category cards). Until real photos
   are uploaded these show earthy placeholders.
5. **Preview deployments** (`*.vercel.app`, localhost): add `?site=spendtimeoffgrid`
   to any URL to view the off-grid site; `?site=paradise-beyond` switches back.
6. **Run migration `0033_stay_checklists.sql`** for the "Before you go" /
   "Before they arrive" checklist on stays. It adds one private table with
   row-level security (each side writes only its own row; only the booking's
   traveller, its host and admins can read; off-grid bookings only). Until it's
   run, the checklist shows but confirmations can't be saved. Emergency
   contacts reuse `trip_prep` (migration 0011) — no change there.
7. **Run migration `0034_stay_requests_and_checkins.sql`** for request-to-book
   and arrival check-ins. It adds `stay_requests` and `stay_checkins` (both
   with row-level security; status changes only through checked functions),
   enables `pg_net`, and schedules the hourly `stay-checkins` cron job.
   Then set up the check-in mailer (one shared secret):
   - Supabase SQL: `select vault.create_secret('https://www.spendtimeoffgrid.com/api/cron/checkins', 'checkins_mailer_url');`
     and `select vault.create_secret('<random secret>', 'checkins_mailer_secret');`
   - Vercel env: `CHECKINS_CRON_SECRET=<the same secret>` (Production).
   Until both are set the cron still queues check-ins (shown on the stay page)
   but no emails go out. Emails need the SMTP logins in step 8.
8. **Email (ImprovMX)**: every app email goes through ImprovMX SMTP
   (`smtp.improvmx.com`, port 587), logging in on the sender's own domain.
   SMTP sending needs an ImprovMX plan that includes it.
   - ImprovMX → each domain → **SMTP credentials**: create one for
     `hello@paradisebeyond.com` and one for `noreply@spendtimeoffgrid.com`
     (the senders), and add the SPF/DKIM DNS records ImprovMX shows.
   - Vercel env (Production): `SMTP_USER` / `SMTP_PASSWORD` (Paradise Beyond)
     and `OFFGRID_SMTP_USER` / `OFFGRID_SMTP_PASSWORD` (Spend Time Off Grid).
     `EMAIL_FROM` stays Paradise Beyond's sender; Spend Time Off Grid's is
     `Spend Time Off Grid <noreply@spendtimeoffgrid.com>` (brand config).
   - Check it on `/desk/settings` → **Send test emails** (one per site).
   - Replies go to `support@`, `bookings@`, `hosts@` or `safety@`, and check-in
     alerts go to `safety@` — make sure those aliases forward somewhere in ImprovMX.
9. **Run migration `0035_booking_snapshot_guards.sql`** (already applied on
   the live database). Off-grid bookings must have `stay_start_date` and
   `stay_nights`, and a booking's currency, discount and deposit join its
   frozen financial snapshot. `balance_minor`, `status` and the Stripe ids stay
   editable.
10. **Bot protection (Cloudflare Turnstile)** on sign-up, sign-in and password
    reset. Do it in this order, or every sign-in is blocked:
    1. Cloudflare dashboard → Turnstile → Add widget, hostnames
       `paradisebeyond.com`, `www.paradisebeyond.com`, `spendtimeoffgrid.com`,
       `www.spendtimeoffgrid.com`; mode Managed. Copy the site key and secret key.
    2. Vercel env (Production + Preview): `NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>`,
       then redeploy. The security check now shows on the three forms.
    3. Supabase → Authentication → Attack Protection → Enable CAPTCHA protection,
       provider Turnstile, paste the **secret** key, save.
11. **Account emails per site**: Supabase sends sign-up and reset emails itself,
    from one sender. Paste `supabase/templates/confirm-signup.html` into
    Authentication → Emails → "Confirm signup" (subject "Confirm your email") and
    `supabase/templates/reset-password.html` into "Reset password" (subject
    "Reset your password"). They read `user_metadata.site`, set at sign-up, so
    Spend Time Off Grid members get Spend Time Off Grid wording; everyone else
    gets Paradise Beyond.
