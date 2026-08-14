-- Paradise Beyond — keep the original upload for non-destructive re-framing
-- =============================================================================
-- `url` is the cropped image shown on the site (framed to the slot's aspect at
-- upload time). `original_url` is the full, downscaled-but-uncropped source it
-- was cropped from, so an admin can re-open the reposition sliders later and
-- re-crop from the original with no quality loss. Older rows (uploaded before
-- this column existed, or set from a pasted URL) simply have a null original and
-- don't offer re-framing.
-- =============================================================================

alter table media_overrides
  add column if not exists original_url text;
