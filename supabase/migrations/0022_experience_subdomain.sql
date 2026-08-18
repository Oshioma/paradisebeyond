-- Paradise Beyond — custom vanity subdomain per experience.
-- =============================================================================
-- By default a retreat's microsite is <slug-without-hyphens>.paradisebeyond.com.
-- This lets a host choose a custom label instead (e.g. aminayoga). Unique
-- (case-insensitive) across experiences so two retreats can't claim the same
-- subdomain.
-- =============================================================================

alter table experiences
  add column if not exists subdomain text;

create unique index if not exists experiences_subdomain_key
  on experiences (lower(subdomain))
  where subdomain is not null;
