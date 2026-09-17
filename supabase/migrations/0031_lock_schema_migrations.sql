-- Lock down the migration ledger (public._schema_migrations).
--
-- Fixes Supabase database advisor lint 0013 (rls_disabled_in_public):
-- "Table `public._schema_migrations` is public, but RLS has not been enabled."
--
-- The ledger is created by scripts/db-migrate.sh to record which migrations
-- have run. It lives in `public`, and `public` is exposed through PostgREST, so
-- Supabase's default privileges hand `anon` and `authenticated` full table
-- rights on anything created there — meaning the Data API would happily let a
-- browser read the ledger, or insert/delete rows in it and so cause a migration
-- to be skipped or re-applied on the next deploy.
--
-- Nothing in the app touches this table: it is written only by db-migrate.sh
-- over a direct psql connection as `postgres`. So take both belts:
--   1. revoke the API roles' privileges  (they can't reach the table at all)
--   2. enable RLS with no policies       (deny-all even if a grant comes back)
-- The owner (`postgres`) and `service_role` bypass RLS, so the migration runner
-- is unaffected. Do NOT add `force row level security` here — that would subject
-- the owner to the (empty) policy set and break db-migrate.sh outright.
--
-- Idempotent.

-- Self-contained: db-migrate.sh normally creates this before applying anything,
-- but don't depend on that if this file is ever run on its own.
create table if not exists public._schema_migrations (
  name       text primary key,
  applied_at timestamptz not null default now()
);

-- `anon` and `authenticated` are Supabase's roles and may be absent on a bare
-- Postgres, so revoke from each only where it exists.
revoke all on table public._schema_migrations from public;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public._schema_migrations from %I', r);
    end if;
  end loop;
end;
$$;

alter table public._schema_migrations enable row level security;

comment on table public._schema_migrations is
  'Internal migration ledger written by scripts/db-migrate.sh. Not part of the API: RLS on with no policies, and no grants to anon/authenticated.';
