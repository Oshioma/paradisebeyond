#!/usr/bin/env bash
# Run all migrations + seed against a Postgres/Supabase database, in order.
#
# Usage:
#   DATABASE_URL="postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres" \
#   bash scripts/db-setup.sh
#
# Get the connection string from Supabase → Project Settings → Database →
# Connection string (URI). Requires `psql` (Postgres client).
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to your Supabase connection string}"

FILES=(
  supabase/migrations/0001_schema.sql
  supabase/migrations/0002_rls.sql
  supabase/migrations/0003_media_overrides.sql
  supabase/migrations/0004_retreat_drafts.sql
  supabase/seed.sql
)

for f in "${FILES[@]}"; do
  echo "▶ Running $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "✓ Schema + seed applied."
echo "Next: create auth users & roles →  npm run bootstrap:auth"
