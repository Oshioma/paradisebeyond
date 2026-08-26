-- Paradise Beyond — imported retreat contacts (past attendees who never booked
-- through the platform), so a host can email them the photos/review invite.
-- =============================================================================
-- retreat_contacts holds people brought in from an external source (e.g. the
-- Oshioma events guest list). They are PRIVATE: no anon/public read policy at
-- all — only the service role (used by permission-checked host actions) reads
-- or writes them. A contact can be emailed the same branded "guest memories"
-- invite as a real past guest; its magic link lets them add photos and, now,
-- leave a review even though they have no booking.
--
-- To support that, guest_invites, reviews and retreat_photos gain an optional
-- contact_id alongside the existing booking_id (exactly one is set per row).
-- =============================================================================

create table if not exists retreat_contacts (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references experiences(id) on delete cascade,
  name          text,
  email         text,
  -- Stable id from the source system (e.g. the event_guests row id), so a
  -- re-import updates rather than duplicates.
  external_ref  text,
  status        text,        -- source RSVP/status label (e.g. Confirmed / Maybe)
  source        text not null default 'import',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
-- Dedupe within a retreat by source id (the upsert conflict target). Email is
-- indexed but NOT unique — two source rows can legitimately share an email, and
-- an import must never fail on that; the host picks who to email regardless.
create unique index if not exists retreat_contacts_extref_key
  on retreat_contacts (experience_id, external_ref) where external_ref is not null;
create index if not exists retreat_contacts_email_idx
  on retreat_contacts (experience_id, lower(email)) where email is not null;

alter table retreat_contacts enable row level security;
-- No policies: service-role only. Host-facing reads go through permission-checked
-- server actions using the service role.

-- guest_invites: allow a contact-backed invite (no booking).
alter table guest_invites alter column booking_id drop not null;
alter table guest_invites add column if not exists contact_id uuid references retreat_contacts(id) on delete cascade;
create unique index if not exists guest_invites_contact_key
  on guest_invites (contact_id) where contact_id is not null;
-- Exactly one subject per invite.
do $$ begin
  alter table guest_invites add constraint guest_invites_subject_ck
    check ((booking_id is not null) <> (contact_id is not null));
exception when duplicate_object then null; end $$;

-- reviews: allow a contact-backed review (no booking, no profile). Moderation
-- and display key on experience_id + published, so nothing else changes.
alter table reviews alter column booking_id drop not null;
alter table reviews alter column guest_id drop not null;
alter table reviews add column if not exists contact_id uuid references retreat_contacts(id) on delete set null;
create unique index if not exists reviews_contact_key
  on reviews (contact_id) where contact_id is not null;

-- retreat_photos: tag a contact's own uploads so we can show them back on the
-- invite page (parity with booking_id).
alter table retreat_photos add column if not exists contact_id uuid references retreat_contacts(id) on delete set null;
