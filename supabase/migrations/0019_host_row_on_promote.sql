-- Paradise Beyond — create the host PROFILE row (not just the role) for an
-- approved host, at both entry points, so they appear in Desk → Hosts as soon
-- as they exist — without waiting for them to build a retreat.
-- =============================================================================
-- Background: approving an application grants the `host` role, but Desk → Hosts
-- lists rows from the `hosts` table. Someone who applied while logged out has no
-- account to link a host row to at approval time. So we create the row:
--   1. when an approved applicant signs up (handle_new_user), and
--   2. when an admin (re-)approves and an account with that email already exists
--      (promote_host_by_email).
-- Both are idempotent — keyed on owner_id, a user never gets two host rows, and
-- this never collides with the app's own ensureHostForOwner (same guard).
-- =============================================================================

-- Shared helper: create a host row for a user if they don't have one, minting a
-- unique slug from their name. SECURITY DEFINER so it can write `hosts`.
create or replace function public.ensure_host_row(p_uid uuid, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_base text;
  v_slug text;
  n int := 1;
begin
  if p_uid is null then return; end if;
  if exists (select 1 from public.hosts where owner_id = p_uid) then return; end if;

  v_base := nullif(trim(both '-' from regexp_replace(lower(coalesce(p_name, 'host')), '[^a-z0-9]+', '-', 'g')), '');
  v_base := coalesce(v_base, 'host');
  v_slug := v_base;
  while exists (select 1 from public.hosts where slug = v_slug) loop
    n := n + 1;
    v_slug := v_base || '-' || n;
  end loop;

  insert into public.hosts (owner_id, slug, name) values (p_uid, v_slug, coalesce(p_name, 'Host'));
end $$;

revoke all on function public.ensure_host_row(uuid, text) from public, anon, authenticated;

-- 1. Approval path: promote the account AND create its host row (matched by email).
create or replace function public.promote_host_by_email(p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid;
  v_name text;
begin
  select u.id, coalesce(p.full_name, split_part(u.email, '@', 1))
    into v_uid, v_name
    from auth.users u
    join public.profiles p on p.id = u.id
   where lower(u.email) = lower(p_email)
     and p.role <> 'admin';   -- never touch an admin
  if v_uid is null then return; end if;

  update public.profiles set role = 'host' where id = v_uid;
  perform public.ensure_host_row(v_uid, v_name);
end $$;

revoke all on function public.promote_host_by_email(text) from public, anon, authenticated;

-- 2. Sign-up path: an approved applicant who signs up becomes a host AND gets a
--    host row immediately.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_approved_host boolean;
  v_name text;
begin
  select exists (
    select 1 from public.host_applications
     where lower(email) = lower(new.email) and status = 'approved'
  ) into is_approved_host;

  v_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  insert into public.profiles (id, full_name, role)
  values (new.id, v_name, case when is_approved_host then 'host'::user_role else 'guest'::user_role end)
  on conflict (id) do nothing;

  if is_approved_host then
    perform public.ensure_host_row(new.id, v_name);
  end if;

  return new;
end $$;
