-- Paradise Beyond — fix infinite recursion in retreat_drafts / editors RLS.
-- =============================================================================
-- 0023 gave retreat_drafts a policy that reads retreat_draft_editors, and gave
-- retreat_draft_editors a policy that reads retreat_drafts. Evaluating either
-- one triggers the other, which triggers the first again → Postgres raises
-- "infinite recursion detected in policy for relation retreat_drafts", so no
-- host can save or open a draft.
--
-- Break the cycle by moving the cross-table lookups into SECURITY DEFINER
-- functions. A definer function owned by the table owner bypasses RLS on the
-- tables it reads (same trick as is_admin()), so a policy that calls it never
-- re-enters the other table's policy. The *owner* check stays inline as a direct
-- read of `hosts` against the row's own host_id column — that never recursed,
-- and keeping it inline means a brand-new draft still passes INSERT (a definer
-- that re-queried retreat_drafts by id would find nothing mid-insert).
-- =============================================================================

-- True if auth.uid() is an invited co-host editor of the draft. Definer, so the
-- retreat_drafts policy can call it without triggering retreat_draft_editors RLS.
create or replace function public.is_draft_editor(p_draft_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from retreat_draft_editors de
    join hosts h on h.id = de.host_id
    where de.draft_id = p_draft_id and h.owner_id = auth.uid()
  );
$$;

-- True if auth.uid() owns the draft (its host row). Definer, so the
-- retreat_draft_editors policy can call it without triggering retreat_drafts RLS.
create or replace function public.owns_draft(p_draft_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from retreat_drafts d
    join hosts h on h.id = d.host_id
    where d.id = p_draft_id and h.owner_id = auth.uid()
  );
$$;

grant execute on function public.is_draft_editor(text) to authenticated;
grant execute on function public.owns_draft(text) to authenticated;

-- retreat_drafts: owner (inline hosts read — works on INSERT) OR admin OR a
-- co-host editor (via definer, so no recursion into retreat_draft_editors).
drop policy if exists retreat_drafts_owner on retreat_drafts;
create policy retreat_drafts_owner on retreat_drafts
  for all
  using (
    is_admin()
    or exists (select 1 from hosts h where h.id = retreat_drafts.host_id and h.owner_id = auth.uid())
    or public.is_draft_editor(retreat_drafts.id)
  )
  with check (
    is_admin()
    or exists (select 1 from hosts h where h.id = retreat_drafts.host_id and h.owner_id = auth.uid())
    or public.is_draft_editor(retreat_drafts.id)
  );

-- retreat_draft_editors: the draft owner + admins manage rows; a host may read
-- their own membership. Owner check via definer, so no recursion into
-- retreat_drafts.
drop policy if exists rde_access on retreat_draft_editors;
create policy rde_access on retreat_draft_editors
  for all
  using (
    is_admin()
    or public.owns_draft(retreat_draft_editors.draft_id)
    or exists (select 1 from hosts h where h.id = retreat_draft_editors.host_id and h.owner_id = auth.uid())
  )
  with check (
    is_admin()
    or public.owns_draft(retreat_draft_editors.draft_id)
  );
