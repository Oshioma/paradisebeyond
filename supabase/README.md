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
5. `seed.sql` — catalogue data (destinations, categories, hosts, experiences…)

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
