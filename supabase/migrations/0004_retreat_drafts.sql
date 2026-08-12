-- Paradise Beyond — Retreat Builder drafts
-- =============================================================================
-- The 16-step wizard produces a JSON draft. It stays as a draft (owned by the
-- host) until an admin approves it, at which point it's materialised into the
-- normalised catalogue tables. Keeping the working document as JSON lets hosts
-- save and resume freely without partial rows across a dozen tables.
-- =============================================================================

create table if not exists retreat_drafts (
  id          text primary key,
  host_id     uuid references hosts(id) on delete set null,
  status      application_status not null default 'draft',
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists retreat_drafts_status_idx on retreat_drafts (status);

alter table retreat_drafts enable row level security;

-- A host manages their own drafts; admins see and manage all.
create policy retreat_drafts_owner on retreat_drafts
  for all
  using (
    is_admin() or exists (
      select 1 from hosts h where h.id = retreat_drafts.host_id and h.owner_id = auth.uid()
    )
  )
  with check (
    is_admin() or exists (
      select 1 from hosts h where h.id = retreat_drafts.host_id and h.owner_id = auth.uid()
    )
  );
