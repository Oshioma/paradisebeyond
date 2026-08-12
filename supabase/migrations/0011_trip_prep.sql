-- Per-booking pre-trip preparation: the guest questionnaire (dietary needs,
-- experience level, medical notes, their emergency contact). Kept as JSON so it
-- can evolve without migrations. The packing list is generated on the fly and
-- needs no storage.

create table if not exists public.trip_prep (
  booking_id uuid primary key references bookings(id) on delete cascade,
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.trip_prep enable row level security;

-- The booking's guest manages their prep; admins can see all.
drop policy if exists trip_prep_guest on public.trip_prep;
create policy trip_prep_guest on public.trip_prep
  for all
  using (exists (select 1 from bookings b where b.id = booking_id and (b.guest_id = auth.uid() or is_admin())))
  with check (exists (select 1 from bookings b where b.id = booking_id and (b.guest_id = auth.uid() or is_admin())));

-- The host running the departure can read it (dietary needs, etc.).
drop policy if exists trip_prep_host_read on public.trip_prep;
create policy trip_prep_host_read on public.trip_prep
  for select
  using (exists (
    select 1 from bookings b
    join departures d on d.id = b.departure_id
    join experience_hosts eh on eh.experience_id = d.experience_id
    where b.id = booking_id and owns_host(eh.host_id)
  ));
