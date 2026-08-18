-- Paradise Beyond — host logo + tagline for their microsite/pages.
-- =============================================================================
-- Extends the page branding (0020's brand_color) with a small logo and a short
-- tagline, so a host's retreat page reads as their own. Public display data.
-- =============================================================================

alter table hosts
  add column if not exists logo_url text,
  add column if not exists tagline text;
