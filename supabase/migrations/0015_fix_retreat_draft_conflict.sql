-- Paradise Beyond — fix publishing a retreat (ON CONFLICT inference).
-- =============================================================================
-- Migration 0010 created a PARTIAL unique index on experiences.retreat_draft_id:
--
--   create unique index ... on experiences (retreat_draft_id)
--     where retreat_draft_id is not null;
--
-- Postgres will not use a partial index to satisfy `ON CONFLICT (retreat_draft_id)`
-- unless the statement repeats the exact predicate — and supabase-js's `upsert`
-- can't express that WHERE clause. So publishing a retreat failed with:
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification".
--
-- A plain (non-partial) unique index enforces the same rule — Postgres treats
-- NULLs as distinct, so multiple experiences with a NULL draft id are still
-- allowed — but it DOES match the ON CONFLICT inference. Swap the index.

drop index if exists public.experiences_retreat_draft_id_key;

create unique index if not exists experiences_retreat_draft_id_key
  on public.experiences (retreat_draft_id);
