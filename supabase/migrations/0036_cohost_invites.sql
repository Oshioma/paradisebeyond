-- Paradise Beyond — invite co-hosts who aren't hosts yet.
-- =============================================================================
-- Until now a co-host had to already be an approved host, which meant filling
-- in the full host application (retreat idea, destination, price…) even though
-- they're only joining someone else's retreat. Now the main host can invite any
-- email:
--   * an existing account is promoted to host and attached straight away (the
--     app does this via promote_host_by_email + retreat_draft_editors), and
--   * an email with no account gets a pending row here. When that person signs
--     up, handle_new_user makes them a host, creates their host row and attaches
--     them to every retreat they were invited to — no application, no approval.
-- The inviting host is already vetted, so their invite is trusted.
-- =============================================================================

create table if not exists cohost_invites (
  id          uuid primary key default gen_random_uuid(),
  draft_id    text not null references retreat_drafts(id) on delete cascade,
  email       text not null,
  invited_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  constraint cohost_invites_email_lower check (email = lower(email)),
  constraint cohost_invites_draft_email unique (draft_id, email)
);

create index if not exists cohost_invites_pending_email
  on cohost_invites (lower(email)) where accepted_at is null;

alter table cohost_invites enable row level security;

-- Only read/written by the server with the service role; admins may inspect.
drop policy if exists cohost_invites_admin on cohost_invites;
create policy cohost_invites_admin on cohost_invites
  for all using (is_admin()) with check (is_admin());

-- Turn every pending invite for this email into a real co-host link. Makes the
-- user a host (never touching an admin's role) and ensures their host row.
-- Idempotent. SECURITY DEFINER; never granted to anon/authenticated.
create or replace function public.claim_cohost_invites(p_uid uuid, p_email text, p_name text)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_host uuid;
  n int := 0;
begin
  if p_uid is null or p_email is null then return 0; end if;
  if not exists (
    select 1 from public.cohost_invites where lower(email) = lower(p_email) and accepted_at is null
  ) then return 0; end if;

  update public.profiles set role = 'host' where id = p_uid and role <> 'admin';
  perform public.ensure_host_row(p_uid, p_name);
  select id into v_host from public.hosts where owner_id = p_uid limit 1;
  if v_host is null then return 0; end if;

  insert into public.retreat_draft_editors (draft_id, host_id)
  select i.draft_id, v_host
    from public.cohost_invites i
    join public.retreat_drafts d on d.id = i.draft_id
   where lower(i.email) = lower(p_email) and i.accepted_at is null
     and d.host_id <> v_host
  on conflict (draft_id, host_id) do nothing;
  get diagnostics n = row_count;

  update public.cohost_invites set accepted_at = now()
   where lower(email) = lower(p_email) and accepted_at is null;

  return n;
end $$;

revoke all on function public.claim_cohost_invites(uuid, text, text) from public, anon, authenticated;

-- Sign-up path: same as 0019, plus an invited co-host becomes a host and is
-- attached to their retreats.
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

  perform public.claim_cohost_invites(new.id, new.email, v_name);

  return new;
end $$;
