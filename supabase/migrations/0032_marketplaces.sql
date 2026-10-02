-- Spend Time Off Grid — a second marketplace on the same platform.
-- =============================================================================
-- Additive only. Every existing row defaults to 'paradise-beyond', so Paradise
-- Beyond's catalogue, applications and bookings are unchanged.
--
-- Off-grid listing details (contribution, food, facilities, pricing unit…) live
-- in the existing experiences.content JSON — no new tables.
--
-- 1. experiences.marketplace      — which marketplace lists the experience.
-- 2. host_applications.marketplace — which marketplace the host applied to.
-- 3. bookings.marketplace         — SNAPSHOT of the marketplace at booking time.
--    Together with the existing commission snapshot (commission_rate_bps,
--    platform_fee_minor, host_net_minor) a booking is a self-contained
--    financial record: editing or moving the experience later never changes it.
-- 4. bookings.stay_start_date / stay_nights — an off-grid traveller chooses
--    their own arrival and length within a host's availability window.
-- 5. A trigger that freezes a booking's marketplace + economics once written.
-- Idempotent.
-- =============================================================================

alter table public.experiences
  add column if not exists marketplace text not null default 'paradise-beyond';
alter table public.host_applications
  add column if not exists marketplace text not null default 'paradise-beyond';
alter table public.bookings
  add column if not exists marketplace text not null default 'paradise-beyond',
  add column if not exists stay_start_date date,
  add column if not exists stay_nights int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'experiences_marketplace_check') then
    alter table public.experiences add constraint experiences_marketplace_check
      check (marketplace in ('paradise-beyond', 'spendtimeoffgrid'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'host_applications_marketplace_check') then
    alter table public.host_applications add constraint host_applications_marketplace_check
      check (marketplace in ('paradise-beyond', 'spendtimeoffgrid'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bookings_marketplace_check') then
    alter table public.bookings add constraint bookings_marketplace_check
      check (marketplace in ('paradise-beyond', 'spendtimeoffgrid'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bookings_stay_nights_check') then
    alter table public.bookings add constraint bookings_stay_nights_check
      check (stay_nights is null or stay_nights > 0);
  end if;
end $$;

create index if not exists experiences_marketplace_idx on public.experiences (marketplace, status);
create index if not exists bookings_marketplace_idx on public.bookings (marketplace);

-- A booking's marketplace and money split are historical facts. No app path
-- updates them after insert (status/balance/stripe ids change; these don't), so
-- enforce it in the database too.
create or replace function public.bookings_freeze_economics()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.marketplace is distinct from old.marketplace
     or new.commission_rate_bps is distinct from old.commission_rate_bps
     or new.platform_fee_minor is distinct from old.platform_fee_minor
     or new.host_net_minor is distinct from old.host_net_minor
     or new.subtotal_minor is distinct from old.subtotal_minor then
    raise exception 'A booking''s marketplace and commission snapshot cannot be changed once created';
  end if;
  return new;
end $$;

drop trigger if exists bookings_freeze_economics on public.bookings;
create trigger bookings_freeze_economics
  before update on public.bookings
  for each row execute function public.bookings_freeze_economics();
