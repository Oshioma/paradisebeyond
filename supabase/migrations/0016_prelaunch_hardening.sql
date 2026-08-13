-- 0016_prelaunch_hardening.sql
-- Pre-launch security & data-integrity hardening. Closes RLS gaps found in the
-- launch-readiness sweep: self-service admin escalation, forgeable bookings /
-- reviews / publishing, a missing unique constraint, over-exposed host columns,
-- an unguarded inventory function, and two missing indexes. Idempotent.

-- 1. CRITICAL — stop self-service role escalation on profiles.
--    profiles_self_update had a USING but no WITH CHECK, so Postgres reused the
--    USING (id = auth.uid()) as the check — constraining only the row id, not
--    the role column. A guard trigger is the real protection (a WITH CHECK
--    subquery on the same row is unreliable): block any role change unless the
--    caller is an admin, or the service role (which runs with a null auth.uid()).
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'not authorized to change role';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- 2. CRITICAL — flight_details.booking_id needs a unique constraint for the
--    upsert(onConflict:"booking_id") to work at all. Collapse any duplicates
--    (keep the most recent row) before adding it.
delete from public.flight_details a
  using public.flight_details b
  where a.booking_id = b.booking_id and a.ctid < b.ctid;
alter table public.flight_details
  drop constraint if exists flight_details_booking_key;
alter table public.flight_details
  add constraint flight_details_booking_key unique (booking_id);

-- 3. HIGH — lock down guest booking inserts. The old check verified only
--    ownership, letting a guest forge a 'completed'/'refunded' booking (or one
--    with negative amounts) via the REST API. Restrict to the statuses the
--    booking flow legitimately sets at creation, and require non-negative money.
--    (A forged booking still can't appear PAID: paidMinor is summed from the
--    payments table, which is service-role-only to write.)
drop policy if exists bookings_owner_insert on public.bookings;
create policy bookings_owner_insert on public.bookings
  for insert with check (
    guest_id = auth.uid()
    and status in ('pending', 'reserved', 'confirmed')
    and subtotal_minor >= 0
    and balance_minor >= 0
    and guest_count >= 1
  );

-- 4. HIGH — hosts must not self-publish or self-verify. experiences_host_write
--    (0012) let an owner change any column; publishing/verification is meant to
--    be admin-only. Guard status/verified transitions with a trigger so hosts
--    keep full edit rights on everything else.
create or replace function public.guard_experience_publish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.status is distinct from old.status
       or coalesce(new.verified, false) is distinct from coalesce(old.verified, false))
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'only an administrator can change status or verified';
  end if;
  return new;
end;
$$;
drop trigger if exists experiences_guard_publish on public.experiences;
create trigger experiences_guard_publish
  before update on public.experiences
  for each row execute function public.guard_experience_publish();

-- 5. HIGH — guests must not insert already-published reviews (bypassing
--    moderation). Only the admin policy may set published = true.
drop policy if exists reviews_owner_write on public.reviews;
create policy reviews_owner_write on public.reviews
  for insert with check (
    guest_id = auth.uid()
    and published = false
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.guest_id = auth.uid()
        and b.status in ('completed')
    )
  );

-- 6. LOW — release_departure increases inventory and was left executable by
--    PUBLIC (unlike reserve_departure). Lock it to the service role; all app
--    callers now release via the service-role client.
revoke execute on function public.release_departure(uuid, int) from public;
revoke execute on function public.release_departure(uuid, int) from anon, authenticated;

-- 7. MEDIUM — the public hosts catalogue is world-readable (using (true)),
--    exposing stripe_account_id (acct_…) and owner_id (host→user mapping) to
--    anonymous callers. Revoke those two columns from anon; the app's public
--    read selects only display columns.
revoke select (stripe_account_id, owner_id) on public.hosts from anon;

-- 8. LOW — indexes for hot lookups that were sequential scans.
create index if not exists reviews_experience_idx on public.reviews (experience_id);
create index if not exists bookings_stripe_pi_idx on public.bookings (stripe_payment_intent);
