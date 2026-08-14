-- 0017_reviews_live_and_names.sql
-- Makes the review feature reachable in production and shows real names on
-- reviews and message threads. Idempotent.

-- 1. Reviews were gated on booking.status = 'completed', but nothing ever sets
--    a booking to 'completed', so the feature was silently dead in live mode.
--    Gate on the trip having ENDED instead (departure end_date in the past) for
--    an active booking — no completion cron required. Still enforces
--    published = false so moderation stays admin-only (from 0016).
drop policy if exists reviews_owner_write on public.reviews;
create policy reviews_owner_write on public.reviews
  for insert with check (
    guest_id = auth.uid()
    and published = false
    and exists (
      select 1 from public.bookings b
      join public.departures d on d.id = b.departure_id
      where b.id = booking_id
        and b.guest_id = auth.uid()
        and b.status in ('reserved', 'confirmed', 'completed')
        and d.end_date < current_date
    )
  );

-- 2. Display names. Public review authors and message senders rendered as
--    "Guest"/"host" in live mode because profiles_self_read blocks reading other
--    users' names. Denormalize the display name at write time (populated by the
--    server actions) so reads never need a cross-party profile join.
alter table public.reviews  add column if not exists guest_name  text;
alter table public.messages add column if not exists sender_name text;
