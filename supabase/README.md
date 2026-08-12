# Supabase setup

Run these **in order**. The seed depends on the schema, so running `seed.sql`
first fails with `relation "commission_rules" does not exist` — run the
migrations first.

## Option A — Supabase SQL editor (copy/paste)

Paste and run each file, top to bottom:

1. `migrations/0001_schema.sql` — tables, enums, indexes
2. `migrations/0002_rls.sql` — Row Level Security policies
3. `migrations/0003_media_overrides.sql` — image override table
4. `migrations/0004_retreat_drafts.sql` — Retreat Builder drafts
5. `migrations/0005_go_live.sql` — signup trigger, read model, reservation fns
6. `migrations/0006_stripe.sql` — Stripe Connect fields on hosts/bookings
7. `migrations/0007_promos.sql` — promo booking columns + validation fns
8. `seed.sql` — catalogue data (destinations, categories, hosts, experiences…)

> **Half-applied DB / "already exists" errors?** Run `reset.sql` FIRST to wipe
> the `public` schema, then run 1–6 fresh. This deletes app data (auth users are
> untouched). It's the reliable way to recover from an earlier partial run.

### Auth emails hit a rate limit? (Resend)

Supabase's built-in email is limited to a few messages/hour. To send auth emails
(confirmation, password reset) via **Resend**: Supabase → **Authentication →
SMTP Settings** → enable Custom SMTP:

```
Host:     smtp.resend.com
Port:     465        (or 587)
Username: resend
Password: <your Resend API key, re_...>
Sender:   hello@paradisebeyond.com   (a verified domain address)
```

(Setting `RESEND_API_KEY` in the app only powers the app's own emails, e.g.
booking confirmations — it does not change Supabase's auth emails.)

To just get in immediately without email: Supabase → Authentication → Providers
→ Email → turn **off** "Confirm email", then sign up and sign in.

Then, from your machine, create the auth users and roles:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx \
npm run bootstrap:auth
```

## Option B — Supabase CLI

```bash
supabase link --project-ref <ref>
supabase db push            # applies everything in migrations/ in order
psql "$DATABASE_URL" -f supabase/seed.sql
npm run bootstrap:auth
```

## Storage (for uploaded images)

Create a **public** bucket named `media` (Storage → New bucket) so the admin
Media manager can upload photos in live mode.

## Regenerating the seed

`seed.sql` is generated from the app's seed data so the two never drift:

```bash
npm run gen:seed
```
