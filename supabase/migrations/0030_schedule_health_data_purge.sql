-- Run the health-data purge nightly on Supabase Cron (pg_cron).
--
-- Kept separate from 0029 on purpose: that migration defines
-- purge_ended_trip_health_data(), which must apply everywhere. This one needs
-- the pg_cron extension, so if an environment doesn't have it, only the
-- schedule is missing — the function is still there to be called by hand.

-- pg_cron installs its own `cron` schema. Do NOT force it into `extensions`:
-- that is what breaks the grants (supabase/cli#1591). If this environment has
-- never had pg_cron and the grants below look wrong afterwards, toggle the
-- extension off and on once in Dashboard → Database → Extensions, which sets
-- them up properly; this migration is then a no-op.
create extension if not exists pg_cron;

-- The dashboard toggle grants these; creating the extension from a migration
-- does not always, so state them explicitly.
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Replace any existing job of this name rather than stacking duplicates, so
-- the migration is safe to re-run. Selecting from cron.job avoids the error
-- cron.unschedule() raises for a name that isn't there.
select cron.unschedule(jobid)
  from cron.job
 where jobname = 'purge-ended-trip-health-data';

-- 03:17 UTC daily — off the hour, so it isn't competing with everything else
-- the platform runs at midnight.
select cron.schedule(
  'purge-ended-trip-health-data',
  '17 3 * * *',
  $$select public.purge_ended_trip_health_data();$$
);
