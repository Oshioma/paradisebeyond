-- Paradise Beyond — guest memories: photos from past visitors + email invites.
-- =============================================================================
-- Two pieces:
--
--   retreat_photos — photos attached to a live experience (guest uploads,
--   host-added URLs, or bulk imports from an external gallery). A photo can be
--   allocated to a specific itinerary day (day_number) or float in the general
--   "memories" gallery (day_number null). Published photos are public;
--   unpublished ones are only visible in the host studio.
--
--   guest_invites — one magic-link token per booking, created when a host
--   emails past guests. The token authenticates the /memories/<token> page
--   (add photos + leave a review) without requiring a sign-in.
--
-- All writes go through server actions using the service role; RLS only opens
-- anonymous READ access to published photos. Idempotent.
-- =============================================================================

create table if not exists retreat_photos (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references experiences(id) on delete cascade,
  -- Itinerary day this photo belongs to (1-based); null = general gallery.
  day_number    int check (day_number >= 1),
  url           text not null,
  caption       text,
  uploader_name text,
  booking_id    uuid references bookings(id) on delete set null,
  source        text not null default 'guest' check (source in ('guest', 'host', 'import')),
  published     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists retreat_photos_exp_idx
  on retreat_photos (experience_id, published, day_number);

create table if not exists guest_invites (
  id            uuid primary key default gen_random_uuid(),  -- doubles as the magic-link token
  booking_id    uuid not null references bookings(id) on delete cascade,
  experience_id uuid not null references experiences(id) on delete cascade,
  email         text not null,
  guest_name    text,
  created_at    timestamptz not null default now(),
  last_sent_at  timestamptz,
  unique (booking_id)
);

alter table retreat_photos enable row level security;
alter table guest_invites  enable row level security;

-- Anyone can see published photos (they render on the public retreat page).
-- No insert/update/delete policies: writes are service-role only.
drop policy if exists retreat_photos_public_read on retreat_photos;
create policy retreat_photos_public_read on retreat_photos
  for select using (published);

-- guest_invites has no policies at all — tokens are secrets, service-role only.
