-- Paradise Beyond — a host's own custom domain for their retreat microsite.
-- =============================================================================
-- e.g. aminaretreats.com → the retreat's microsite. Stored per experience,
-- unique (case-insensitive). Requests arriving on this host are routed to the
-- microsite by middleware. The domain must also be added to the hosting project
-- (Vercel) + pointed via DNS to actually resolve + get SSL.
-- =============================================================================

alter table experiences
  add column if not exists custom_domain text;

create unique index if not exists experiences_custom_domain_key
  on experiences (lower(custom_domain))
  where custom_domain is not null;
