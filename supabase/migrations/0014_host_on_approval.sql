-- Paradise Beyond — grant the host role when an application is approved.
-- =============================================================================
-- Approving a host application emails the applicant a link to the Retreat
-- Builder, but the link only works if their account actually carries the
-- `host` role. Two cases to cover:
--   1. They already have an account (applied signed-in, or signed up before
--      approval) — promote it now, matched by email.
--   2. They have no account yet — default them to `host` the moment they sign
--      up, by teaching the new-user trigger to look for an approved application.

-- 1. Promote any existing account with this email to host. Called (via the
--    service role) from the approval action. SECURITY DEFINER so it can read
--    auth.users and write profiles; never granted to anon/authenticated.
create or replace function public.promote_host_by_email(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles p
     set role = 'host'
    from auth.users u
   where u.id = p.id
     and lower(u.email) = lower(p_email)
     and p.role <> 'admin';   -- never downgrade an admin
end $$;

revoke all on function public.promote_host_by_email(text) from public, anon, authenticated;

-- 2. New sign-ups whose email already has an approved application start as host.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_approved_host boolean;
begin
  select exists (
    select 1 from public.host_applications
     where lower(email) = lower(new.email) and status = 'approved'
  ) into is_approved_host;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case when is_approved_host then 'host'::user_role else 'guest'::user_role end
  )
  on conflict (id) do nothing;
  return new;
end $$;
