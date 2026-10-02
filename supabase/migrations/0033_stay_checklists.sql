-- Spend Time Off Grid: the pre-arrival checklist on a stay.
--
-- One row per booking per side ('guest' = the traveller, 'host'). Each row
-- holds that side's manual confirmations plus their own notes — the
-- traveller's introduction and arrival details, the host's directions. It is
-- PRIVATE to the two parties of the booking: never public, never in
-- experience content, search, sitemaps or metadata.
--
-- Emergency contacts are NOT stored here: they already live in trip_prep
-- (migration 0011), which the guest owns and the booking's host can read.

create table if not exists public.stay_checklists (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  side       text not null check (side in ('guest', 'host')),
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (booking_id, side)
);

alter table public.stay_checklists enable row level security;

-- Is the current user this booking's traveller?
create or replace function public.is_booking_guest(p_booking uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from bookings b where b.id = p_booking and b.guest_id = auth.uid());
$$;

-- Is the current user a host of the experience this booking is for?
create or replace function public.is_booking_host(p_booking uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from bookings b
    join departures d on d.id = b.departure_id
    join experience_hosts eh on eh.experience_id = d.experience_id
    where b.id = p_booking and owns_host(eh.host_id)
  );
$$;

-- Only Spend Time Off Grid stays have a checklist.
create or replace function public.is_offgrid_booking(p_booking uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from bookings b where b.id = p_booking and b.marketplace = 'spendtimeoffgrid');
$$;

-- Both parties can read both sides (the host reads the introduction, the
-- traveller reads the directions). Nobody else can, apart from admins.
drop policy if exists stay_checklists_read on public.stay_checklists;
create policy stay_checklists_read on public.stay_checklists
  for select using (
    is_admin() or (is_offgrid_booking(booking_id) and (is_booking_guest(booking_id) or is_booking_host(booking_id)))
  );

-- Each side writes only its own row.
drop policy if exists stay_checklists_write_insert on public.stay_checklists;
create policy stay_checklists_write_insert on public.stay_checklists
  for insert with check (
    is_offgrid_booking(booking_id) and (
      (side = 'guest' and is_booking_guest(booking_id))
      or (side = 'host' and (is_booking_host(booking_id) or is_admin()))
    )
  );

drop policy if exists stay_checklists_write_update on public.stay_checklists;
create policy stay_checklists_write_update on public.stay_checklists
  for update using (
    (side = 'guest' and is_booking_guest(booking_id))
    or (side = 'host' and (is_booking_host(booking_id) or is_admin()))
  ) with check (
    is_offgrid_booking(booking_id) and (
      (side = 'guest' and is_booking_guest(booking_id))
      or (side = 'host' and (is_booking_host(booking_id) or is_admin()))
    )
  );

-- No deletes from the app; rows go with their booking (on delete cascade).

revoke all on public.stay_checklists from anon;
grant select, insert, update on public.stay_checklists to authenticated;
