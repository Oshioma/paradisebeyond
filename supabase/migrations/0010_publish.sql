-- Link a published experience back to the retreat draft it was materialised
-- from, so re-approving a draft updates the same experience instead of creating
-- a duplicate (publishDraft upserts on this column).

alter table public.experiences add column if not exists retreat_draft_id text;

create unique index if not exists experiences_retreat_draft_id_key
  on public.experiences (retreat_draft_id)
  where retreat_draft_id is not null;
