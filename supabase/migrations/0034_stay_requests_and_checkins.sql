-- Spend Time Off Grid: request-to-book, and arrival / first-night check-ins.
--
-- 1. stay_requests — a traveller asks to stay (dates, travellers and a proper
--    introduction) BEFORE anything is reserved or charged. The host accepts or
--    declines; only then can the traveller book, through the existing engine.
-- 2. stay_checkins — "Have you arrived safely?" on arrival day and "Everything
--    okay with your stay?" the next morning. Queued by pg_cron; the app emails
--    the traveller and alerts support on "I need help" or no reply in 24h.
--
-- Both tables are private: never public, never in experience content, search,
-- sitemaps or metadata. Status changes go through security-definer functions
-- so nobody can, say, accept their own request.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Is the current user a host of the experience this departure belongs to?
create or replace function public.is_departure_host(p_departure uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from departures d
    join experience_hosts eh on eh.experience_id = d.experience_id
    where d.id = p_departure and owns_host(eh.host_id)
  );
$$;

-- Does this departure belong to a Spend Time Off Grid listing?
create or replace function public.is_offgrid_departure(p_departure uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from departures d
    join experiences e on e.id = d.experience_id
    where d.id = p_departure and e.marketplace = 'spendtimeoffgrid'
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. Stay requests
-- ---------------------------------------------------------------------------

create table if not exists public.stay_requests (
  id           uuid primary key default gen_random_uuid(),
  guest_id     uuid not null references public.profiles(id) on delete cascade,
  guest_name   text,
  departure_id uuid not null references public.departures(id) on delete cascade,
  arrival      date not null,
  nights       int  not null check (nights between 1 and 365),
  guests       int  not null check (guests between 1 and 20),
  introduction text not null check (char_length(introduction) between 40 and 2000),
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'declined', 'withdrawn', 'booked')),
  host_note    text check (host_note is null or char_length(host_note) <= 2000),
  booking_id   uuid references public.bookings(id) on delete set null,
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  updated_at   timestamptz not null default now()
);
create index if not exists stay_requests_departure_idx on public.stay_requests (departure_id, status);
create index if not exists stay_requests_guest_idx on public.stay_requests (guest_id, created_at desc);
-- One open request per traveller per availability window.
create unique index if not exists stay_requests_one_open
  on public.stay_requests (guest_id, departure_id) where status in ('pending', 'accepted');

alter table public.stay_requests enable row level security;

drop policy if exists stay_requests_read on public.stay_requests;
create policy stay_requests_read on public.stay_requests
  for select using (guest_id = auth.uid() or is_departure_host(departure_id) or is_admin());

-- A traveller may only create their own, pending, unlinked request, on an
-- off-grid listing.
drop policy if exists stay_requests_insert on public.stay_requests;
create policy stay_requests_insert on public.stay_requests
  for insert with check (
    guest_id = auth.uid() and status = 'pending' and booking_id is null
    and host_note is null and decided_at is null and is_offgrid_departure(departure_id)
  );

-- No update/delete policies: changes go through the functions below.
revoke all on public.stay_requests from anon;
grant select, insert on public.stay_requests to authenticated;
revoke update, delete, truncate on public.stay_requests from authenticated;

-- Host accepts or declines a pending request.
create or replace function public.decide_stay_request(p_request uuid, p_accept boolean, p_note text)
returns text language plpgsql security definer set search_path = public as $$
declare r stay_requests;
begin
  select * into r from stay_requests where id = p_request for update;
  if not found then raise exception 'not found'; end if;
  if not (is_departure_host(r.departure_id) or is_admin()) then raise exception 'not allowed'; end if;
  if r.status <> 'pending' then raise exception 'already decided'; end if;
  update stay_requests
     set status = case when p_accept then 'accepted' else 'declined' end,
         host_note = nullif(left(coalesce(p_note, ''), 2000), ''),
         decided_at = now(), updated_at = now()
   where id = p_request;
  return case when p_accept then 'accepted' else 'declined' end;
end;
$$;

-- Traveller withdraws their own pending or accepted request.
create or replace function public.withdraw_stay_request(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update stay_requests set status = 'withdrawn', updated_at = now()
   where id = p_request and guest_id = auth.uid() and status in ('pending', 'accepted');
  if not found then raise exception 'not allowed'; end if;
end;
$$;

-- Traveller links their accepted request to the booking it became.
create or replace function public.link_stay_request(p_request uuid, p_booking uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update stay_requests r set status = 'booked', booking_id = p_booking, updated_at = now()
   where r.id = p_request and r.guest_id = auth.uid() and r.status = 'accepted'
     and exists (
       select 1 from bookings b
        where b.id = p_booking and b.guest_id = auth.uid()
          and b.departure_id = r.departure_id and b.marketplace = 'spendtimeoffgrid'
     );
  if not found then raise exception 'not allowed'; end if;
end;
$$;

revoke all on function public.decide_stay_request(uuid, boolean, text) from public, anon;
revoke all on function public.withdraw_stay_request(uuid) from public, anon;
revoke all on function public.link_stay_request(uuid, uuid) from public, anon;
grant execute on function public.decide_stay_request(uuid, boolean, text) to authenticated;
grant execute on function public.withdraw_stay_request(uuid) to authenticated;
grant execute on function public.link_stay_request(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Check-ins
-- ---------------------------------------------------------------------------

create table if not exists public.stay_checkins (
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  kind         text not null check (kind in ('arrival', 'settled')),
  due_at       timestamptz not null,
  notified_at  timestamptz,
  response     text check (response in ('ok', 'help')),
  note         text check (note is null or char_length(note) <= 2000),
  responded_at timestamptz,
  escalated_at timestamptz,
  primary key (booking_id, kind)
);
create index if not exists stay_checkins_pending_idx on public.stay_checkins (due_at) where response is null;

alter table public.stay_checkins enable row level security;

-- Only the traveller (and admins) can read their check-ins. Hosts can't —
-- a request for help goes to Spend Time Off Grid, not to the host.
drop policy if exists stay_checkins_read on public.stay_checkins;
create policy stay_checkins_read on public.stay_checkins
  for select using (is_booking_guest(booking_id) or is_admin());

revoke all on public.stay_checkins from anon;
grant select on public.stay_checkins to authenticated;
revoke insert, update, delete, truncate on public.stay_checkins from authenticated;

-- Traveller answers a check-in that's due.
create or replace function public.respond_stay_checkin(p_booking uuid, p_kind text, p_response text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_response not in ('ok', 'help') then raise exception 'bad response'; end if;
  update stay_checkins
     set response = p_response, note = nullif(left(coalesce(p_note, ''), 2000), ''), responded_at = now()
   where booking_id = p_booking and kind = p_kind and due_at <= now() and is_booking_guest(p_booking);
  if not found then raise exception 'not allowed'; end if;
end;
$$;
revoke all on function public.respond_stay_checkin(uuid, text, text, text) from public, anon;
grant execute on function public.respond_stay_checkin(uuid, text, text, text) to authenticated;

-- Queue check-ins that have come due (run by pg_cron). Arrival: 16:00 UTC on
-- the arrival day. Settled: 10:00 UTC the next morning (stays of 2+ nights).
-- Only recent ones (last 2 days), so nothing is back-filled for old stays.
-- Keep in step with src/lib/offgrid/checkins.ts.
create or replace function public.queue_stay_checkins()
returns integer language plpgsql security definer set search_path = public as $$
declare added integer;
begin
  with live as (
    select id, stay_start_date, stay_nights from bookings
     where marketplace = 'spendtimeoffgrid' and status in ('reserved', 'confirmed')
       and stay_start_date is not null
  ), due as (
    select id as booking_id, 'arrival'::text as kind,
           (stay_start_date + time '16:00') at time zone 'UTC' as due_at
      from live
    union all
    select id, 'settled', (stay_start_date + 1 + time '10:00') at time zone 'UTC'
      from live where coalesce(stay_nights, 0) >= 2
  )
  insert into stay_checkins (booking_id, kind, due_at)
  select booking_id, kind, due_at from due
   where due_at <= now() and due_at > now() - interval '2 days'
  on conflict do nothing;
  get diagnostics added = row_count;
  return added;
end;
$$;
revoke all on function public.queue_stay_checkins() from public, anon, authenticated;

-- Ask the app to send what's due (emails + support alerts). The endpoint URL
-- and shared secret live in Supabase Vault, never in this file:
--   select vault.create_secret('<https://www.spendtimeoffgrid.com/api/cron/checkins>', 'checkins_mailer_url');
--   select vault.create_secret('<random secret>', 'checkins_mailer_secret');
-- The same secret goes in the app's CHECKINS_CRON_SECRET environment variable.
create extension if not exists pg_net;

create or replace function public.ping_checkin_mailer()
returns void language plpgsql security definer set search_path = public as $$
declare v_url text; v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'checkins_mailer_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'checkins_mailer_secret';
  if v_url is null or v_secret is null then return; end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := '{}'::jsonb
  );
end;
$$;
revoke all on function public.ping_checkin_mailer() from public, anon, authenticated;

-- Hourly, a few minutes past (off the busy :00).
select cron.unschedule(jobid) from cron.job where jobname = 'stay-checkins';
select cron.schedule(
  'stay-checkins',
  '7 * * * *',
  $$select public.queue_stay_checkins(); select public.ping_checkin_mailer();$$
);
