-- Fix "infinite recursion detected in policy for relation experiences".
--
-- The old experiences policies did `exists (select ... from experience_hosts)`,
-- while experience_hosts' policy does `exists (select ... from experiences)`, so
-- each policy re-triggered the other and Postgres bailed out. Route the host-
-- ownership check through a SECURITY DEFINER function that bypasses RLS on the
-- inner tables, which breaks the cycle. Idempotent.

create or replace function owns_experience(exp_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from experience_hosts eh
    join hosts h on h.id = eh.host_id
    where eh.experience_id = exp_id and h.owner_id = auth.uid()
  );
$$;

drop policy if exists experiences_public_read on experiences;
create policy experiences_public_read on experiences
  for select using (status = 'published' or is_admin() or owns_experience(id));

drop policy if exists experiences_host_write on experiences;
create policy experiences_host_write on experiences
  for all
  using (is_admin() or owns_experience(id))
  with check (is_admin() or owns_experience(id));
