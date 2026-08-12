-- DANGER — clean slate. Wipes the entire `public` schema (all Paradise Beyond
-- tables AND their data) so the migrations can run fresh without
-- "already exists" errors. Use ONLY for first-time setup or a deliberate reset.
-- Your Supabase auth users are NOT affected (they live in the `auth` schema).

drop trigger if exists on_auth_user_created on auth.users;

drop schema if exists public cascade;
create schema public;

-- Restore Supabase's default grants on the fresh schema.
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
