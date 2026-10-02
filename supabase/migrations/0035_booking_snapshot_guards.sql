-- Booking snapshot guards (already applied live on 2 Oct 2026 — this file
-- records it so every other environment gets the same rules). Idempotent.
--
-- 1. Off-grid (Spend Time Off Grid) bookings must carry the traveller's own
--    arrival and length of stay. The only off-grid insert path always sets
--    both, and check-ins (queue_stay_checkins) depend on them. Paradise Beyond
--    bookings use their departure's dates, so this doesn't apply to them.
-- 2. Widen the 0032 freeze: a booking's currency, discount and deposit are part
--    of its financial snapshot too. Nothing in the app changes them after
--    insert — only status, balance_minor (settled to 0 when the balance is
--    paid) and the Stripe ids change, and those stay editable.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_offgrid_dates_check') then
    alter table public.bookings add constraint bookings_offgrid_dates_check
      check (marketplace <> 'spendtimeoffgrid' or (stay_start_date is not null and stay_nights is not null));
  end if;
end $$;

create or replace function public.bookings_freeze_economics()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if new.marketplace is distinct from old.marketplace
     or new.currency is distinct from old.currency
     or new.subtotal_minor is distinct from old.subtotal_minor
     or new.discount_minor is distinct from old.discount_minor
     or new.deposit_minor is distinct from old.deposit_minor
     or new.commission_rate_bps is distinct from old.commission_rate_bps
     or new.platform_fee_minor is distinct from old.platform_fee_minor
     or new.host_net_minor is distinct from old.host_net_minor then
    raise exception 'A booking''s marketplace and financial snapshot cannot be changed once created';
  end if;
  return new;
end $$;

drop trigger if exists bookings_freeze_economics on public.bookings;
create trigger bookings_freeze_economics
  before update on public.bookings
  for each row execute function public.bookings_freeze_economics();
