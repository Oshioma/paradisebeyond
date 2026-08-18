-- Paradise Beyond — host page branding.
-- =============================================================================
-- Lets a host personalise their retreat's public page ("their own website"):
-- a brand accent colour used across their microsite and listing. Socials already
-- live on hosts.socials (jsonb array of {label, href}) from 0001. Public display
-- data, readable by anon (like name/headline).
-- =============================================================================

alter table hosts
  add column if not exists brand_color text;
