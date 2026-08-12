-- Paradise Beyond — media overrides
-- =============================================================================
-- Maps an image slot key (the seed used by src/lib/images.ts) to an uploaded
-- image URL, so admins can replace any placeholder from the Media manager.
-- Uploaded files live in the Storage bucket `media` (create it in the Supabase
-- dashboard: Storage → New bucket → "media", public).
-- =============================================================================

create table if not exists media_overrides (
  seed        text primary key,
  url         text not null,
  updated_by  uuid references profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table media_overrides enable row level security;

-- Anyone may read overrides (they resolve public images shown on the site).
create policy media_overrides_public_read on media_overrides
  for select using (true);

-- Only admins may set or clear an override.
create policy media_overrides_admin_write on media_overrides
  for all using (is_admin()) with check (is_admin());
