-- Purge the health answers from trip questionnaires once a trip is over.
--
-- `trip_prep.data` holds dietary and medical free text — special category data
-- under UK GDPR Art. 9, collected on the guest's explicit consent so their host
-- can cater for them safely. Once the departure has ended that purpose is spent,
-- and Art. 5(1)(e) (storage limitation) says we should not keep it. The rest of
-- the questionnaire (experience level, emergency contact, notes) is retained
-- with the booking record.
--
-- The app also strips these fields when a finished trip is read, but that only
-- fires if somebody opens the page. This is the sweep that does not depend on
-- anyone looking.

create or replace function public.purge_ended_trip_health_data()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  purged integer;
begin
  with ended as (
    select tp.booking_id
      from trip_prep tp
      join bookings b   on b.id = tp.booking_id
      join departures d on d.id = b.departure_id
     where d.end_date < current_date
       and (tp.data ? 'dietary' or tp.data ? 'medical' or tp.data ? 'healthConsent')
  )
  update trip_prep tp
     set data = tp.data - 'dietary' - 'medical' - 'healthConsent' - 'healthConsentAt',
         updated_at = now()
    from ended
   where tp.booking_id = ended.booking_id;

  get diagnostics purged = row_count;
  return purged;
end;
$$;

comment on function public.purge_ended_trip_health_data() is
  'Clears dietary/medical answers and the consent flag from trip_prep for departures that have ended. Returns the number of rows purged. Run daily.';

-- Only the service role runs this; it must never be callable from the browser.
-- `anon` and `authenticated` are Supabase's roles and may be absent on a bare
-- Postgres, so revoke from each only where it exists.
revoke all on function public.purge_ended_trip_health_data() from public;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on function public.purge_ended_trip_health_data() from %I', r);
    end if;
  end loop;
end;
$$;

-- Schedule it daily if pg_cron is installed. Supabase projects without the
-- extension skip this silently — call the function from a scheduled Edge
-- Function or an external cron instead.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge-ended-trip-health-data',
      '17 3 * * *',
      $cron$select public.purge_ended_trip_health_data();$cron$
    );
  end if;
exception
  when others then
    raise notice 'pg_cron present but scheduling failed (%): schedule purge_ended_trip_health_data() externally.', sqlerrm;
end;
$$;
