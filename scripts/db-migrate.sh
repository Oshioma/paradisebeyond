#!/usr/bin/env bash
# Apply PENDING migrations only — idempotent, safe to run on every deploy.
#
# Unlike db-setup.sh (first-time full setup + seed), this tracks which
# migrations have been applied in a ledger table (public._schema_migrations)
# and runs only the ones not yet applied, each in a single transaction. Running
# it repeatedly is a no-op once everything is up to date.
#
# Usage:
#   DATABASE_URL="postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres" \
#   bash scripts/db-migrate.sh
#
# On a BRAND-NEW database, run db-setup.sh first (schema + seed), then this for
# every migration added afterwards. On an existing database already set up by
# hand, the first run baselines the base migrations (records them as applied
# without re-running them) so only newer migrations get applied.
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to your Supabase Postgres connection string (not the API URL)}"

# Migrations assumed already present on an existing DB. Override with BASELINE=""
# to force everything to be (re-)applied — only safe if every migration is
# idempotent.
# Only the base migrations that are NOT re-runnable (create type / create table
# without guards). Everything from 0008 on is idempotent, so the runner applies
# it even on an existing DB — recovering a DB that's missing a later migration.
BASELINE_DEFAULT="0001_schema 0002_rls 0003_media_overrides 0004_retreat_drafts 0005_go_live 0006_stripe 0007_promos"
BASELINE="${BASELINE-$BASELINE_DEFAULT}"

run() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "$1"; }
query() { psql "$DATABASE_URL" -t -A -c "$1"; }

run "create table if not exists public._schema_migrations (name text primary key, applied_at timestamptz not null default now());"

# First run on an existing DB: record the base migrations as already applied.
if [ "$(query "select count(*) from public._schema_migrations;")" = "0" ] && [ -n "$BASELINE" ]; then
  for b in $BASELINE; do
    run "insert into public._schema_migrations(name) values ('$b') on conflict do nothing;"
  done
  echo "▶ Baselined existing schema: $BASELINE"
fi

applied_any=0
for f in supabase/migrations/*.sql; do
  name="$(basename "$f" .sql)"
  if [ "$(query "select 1 from public._schema_migrations where name='$name';")" = "1" ]; then
    echo "· skip $name"
    continue
  fi
  echo "▶ apply $name"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f "$f"
  run "insert into public._schema_migrations(name) values ('$name') on conflict do nothing;"
  applied_any=1
done

[ "$applied_any" = "1" ] && echo "✓ Pending migrations applied." || echo "✓ Already up to date."
