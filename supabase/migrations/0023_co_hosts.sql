-- Paradise Beyond — co-hosts (multiple people editing one retreat).
-- =============================================================================
-- A retreat draft is owned by one host. This lets that owner invite other hosts
-- as co-editors: they can open, edit and submit the same retreat, and they show
-- as hosts on the published experience. Kept in a dedicated table so RLS can
-- grant access cleanly (rather than reading JSON).
-- =============================================================================

create table if not exists retreat_draft_editors (
  draft_id   text not null references retreat_drafts(id) on delete cascade,
  host_id    uuid not null references hosts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (draft_id, host_id)
);

alter table retreat_draft_editors enable row level security;

-- Broaden draft access: owner OR admin OR a co-host editor of the draft.
drop policy if exists retreat_drafts_owner on retreat_drafts;
create policy retreat_drafts_owner on retreat_drafts
  for all
  using (
    is_admin()
    or exists (select 1 from hosts h where h.id = retreat_drafts.host_id and h.owner_id = auth.uid())
    or exists (
      select 1 from retreat_draft_editors de
      join hosts h on h.id = de.host_id
      where de.draft_id = retreat_drafts.id and h.owner_id = auth.uid()
    )
  )
  with check (
    is_admin()
    or exists (select 1 from hosts h where h.id = retreat_drafts.host_id and h.owner_id = auth.uid())
    or exists (
      select 1 from retreat_draft_editors de
      join hosts h on h.id = de.host_id
      where de.draft_id = retreat_drafts.id and h.owner_id = auth.uid()
    )
  );

-- Editors table RLS: the draft owner + admins manage rows; a host may read their
-- own membership rows.
drop policy if exists rde_access on retreat_draft_editors;
create policy rde_access on retreat_draft_editors
  for all
  using (
    is_admin()
    or exists (select 1 from retreat_drafts d join hosts h on h.id = d.host_id where d.id = retreat_draft_editors.draft_id and h.owner_id = auth.uid())
    or exists (select 1 from hosts h where h.id = retreat_draft_editors.host_id and h.owner_id = auth.uid())
  )
  with check (
    is_admin()
    or exists (select 1 from retreat_drafts d join hosts h on h.id = d.host_id where d.id = retreat_draft_editors.draft_id and h.owner_id = auth.uid())
  );

-- Resolve a host by the account email, for inviting a co-host. SECURITY DEFINER
-- so it can read auth.users; never granted to anon/authenticated.
create or replace function public.host_for_email(p_email text)
returns table(id uuid, slug text, name text)
language sql security definer set search_path = public as $$
  select h.id, h.slug, h.name
  from public.hosts h
  join public.profiles p on p.id = h.owner_id
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(p_email)
  limit 1;
$$;

revoke all on function public.host_for_email(text) from public, anon, authenticated;
