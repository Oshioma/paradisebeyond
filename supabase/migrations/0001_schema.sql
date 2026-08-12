-- Paradise Beyond — core schema
-- =============================================================================
-- Conventions
--   * Money is stored as BIGINT in the currency's MINOR units (e.g. cents),
--     always paired with a 3-letter `currency` column. Never floats.
--   * Commission rates are stored in BASIS POINTS (integer; 1% = 100 bps).
--   * The commission rate in force is SNAPSHOTTED onto each booking so that
--     changing the platform rate never rewrites historical financials.
--   * The data model is destination-agnostic: nothing hard-codes Zanzibar.
--   * Every table gets RLS (see 0002_rls.sql). This file defines structure.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ------------------------------------------------------------
create type user_role as enum ('guest', 'host', 'admin');
create type application_status as enum
  ('draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'rejected');
create type experience_status as enum ('draft', 'submitted', 'under_review', 'published', 'archived');
create type duration_days as enum ('7', '14');
create type departure_status as enum ('open', 'waitlist', 'sold_out', 'closed');
create type booking_status as enum
  ('pending', 'reserved', 'confirmed', 'balance_due', 'completed', 'cancelled', 'refunded');
create type payment_kind as enum ('deposit', 'balance', 'full');
create type payment_status as enum ('requires_payment', 'processing', 'succeeded', 'failed', 'refunded');
create type verifiable_type as enum ('host', 'property', 'experience');

-- ---------- Identity ---------------------------------------------------------
-- profiles: 1:1 with auth.users (Supabase). Holds the platform role.
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  avatar_url    text,
  role          user_role not null default 'guest',
  created_at    timestamptz not null default now()
);

-- hosts: a public host persona/organisation, owned by a profile.
create table hosts (
  id            uuid primary key default gen_random_uuid(),
  -- Nullable: catalogue hosts are seeded before any auth user exists, then
  -- linked to their owning profile by scripts/bootstrap-auth.mjs.
  owner_id      uuid references profiles(id) on delete set null,
  slug          text unique not null,
  name          text not null,
  headline      text,
  bio           text,
  qualifications text[] not null default '{}',
  specialisms   text[] not null default '{}',
  socials       jsonb not null default '[]',
  image_url     text,
  verified      boolean not null default false,
  created_at    timestamptz not null default now()
);

create table host_applications (
  id            uuid primary key default gen_random_uuid(),
  applicant_id  uuid references profiles(id) on delete set null,
  name          text not null,
  email         text not null,
  links         text,
  background    text,
  experience    text,
  destination   text,
  retreat_idea  text,
  duration      duration_days,
  approx_dates  text,
  expected_price_minor bigint,
  currency      char(3) not null default 'USD',
  expected_group_size int,
  accommodation text,
  description   text,
  status        application_status not null default 'submitted',
  review_notes  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- Catalogue --------------------------------------------------------
create table destinations (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  country       text not null,
  region        text,
  summary       text,
  description   text,
  image_url     text,
  featured      boolean not null default false,
  created_at    timestamptz not null default now()
);

create table properties (
  id            uuid primary key default gen_random_uuid(),
  destination_id uuid not null references destinations(id) on delete restrict,
  host_id       uuid references hosts(id) on delete set null,
  name          text not null,
  description   text,
  location_label text,
  verified      boolean not null default false,
  created_at    timestamptz not null default now()
);

create table categories (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  display_label text,
  tagline       text,
  description   text,
  sort_order    int not null default 0
);

create table experiences (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  strapline     text,
  status        experience_status not null default 'draft',
  duration      duration_days not null,
  destination_id uuid not null references destinations(id) on delete restrict,
  property_id   uuid references properties(id) on delete set null,
  location_label text,
  currency      char(3) not null default 'USD',
  price_from_minor bigint not null default 0,
  max_group_size int not null default 12,
  verified      boolean not null default false,
  featured      boolean not null default false,
  hero_image_url text,
  -- Narrative blocks kept as structured JSON for flexible editorial content.
  story         jsonb not null default '[]',
  for_you_if    jsonb not null default '[]',
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table experience_hosts (
  experience_id uuid not null references experiences(id) on delete cascade,
  host_id       uuid not null references hosts(id) on delete cascade,
  primary key (experience_id, host_id)
);

create table experience_categories (
  experience_id uuid not null references experiences(id) on delete cascade,
  category_id   uuid not null references categories(id) on delete cascade,
  primary key (experience_id, category_id)
);

create table experience_inclusions (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references experiences(id) on delete cascade,
  kind          text not null check (kind in ('included', 'excluded')),
  label         text not null,
  sort_order    int not null default 0
);

create table experience_media (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references experiences(id) on delete cascade,
  url           text not null,
  alt           text,
  kind          text not null default 'image' check (kind in ('image', 'video')),
  sort_order    int not null default 0
);

create table itinerary_days (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references experiences(id) on delete cascade,
  day_number    int not null,
  title         text not null,
  summary       text,
  unique (experience_id, day_number)
);

create table itinerary_items (
  id            uuid primary key default gen_random_uuid(),
  day_id        uuid not null references itinerary_days(id) on delete cascade,
  title         text not null,
  time_label    text,
  sort_order    int not null default 0
);

-- ---------- Rooms ------------------------------------------------------------
create table room_types (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references experiences(id) on delete cascade,
  name          text not null,
  description   text,
  occupancy     text not null check (occupancy in ('single', 'shared', 'private')),
  price_delta_minor bigint not null default 0,
  sort_order    int not null default 0
);

-- ---------- Dates & inventory (the date-led heart) --------------------------
create table departures (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references experiences(id) on delete cascade,
  start_date    date not null,
  end_date      date not null,
  currency      char(3) not null default 'USD',
  price_from_minor bigint not null,
  deposit_minor bigint not null default 0,
  balance_due_days int not null default 45,
  capacity      int not null,
  spaces_remaining int not null,
  status        departure_status not null default 'open',
  created_at    timestamptz not null default now(),
  check (end_date > start_date),
  check (spaces_remaining >= 0 and spaces_remaining <= capacity)
);
create index on departures (experience_id, start_date);
create index on departures (start_date);

-- Availability per room per departure (single source of truth for spaces).
create table departure_room_inventory (
  id            uuid primary key default gen_random_uuid(),
  departure_id  uuid not null references departures(id) on delete cascade,
  room_type_id  uuid not null references room_types(id) on delete cascade,
  capacity      int not null,
  spaces_remaining int not null,
  unique (departure_id, room_type_id),
  check (spaces_remaining >= 0 and spaces_remaining <= capacity)
);

-- ---------- Commission -------------------------------------------------------
-- Versioned, configurable. The active rule is copied onto each booking.
create table commission_rules (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  rate_bps      int not null check (rate_bps between 0 and 10000),
  destination_id uuid references destinations(id) on delete cascade, -- null = global
  active        boolean not null default true,
  effective_from timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- ---------- Bookings & money -------------------------------------------------
create table bookings (
  id            uuid primary key default gen_random_uuid(),
  reference     text unique not null default ('PB-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  guest_id      uuid not null references profiles(id) on delete restrict,
  departure_id  uuid not null references departures(id) on delete restrict,
  room_type_id  uuid not null references room_types(id) on delete restrict,
  guest_count   int not null check (guest_count > 0),
  currency      char(3) not null,
  subtotal_minor bigint not null,
  deposit_minor bigint not null,
  balance_minor bigint not null,
  balance_due_date date,
  -- Commission SNAPSHOT — frozen at purchase time.
  commission_rate_bps int not null,
  platform_fee_minor bigint not null,
  host_net_minor bigint not null,
  status        booking_status not null default 'pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on bookings (guest_id);
create index on bookings (departure_id);

create table booking_guests (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id) on delete cascade,
  full_name     text not null,
  email         text,
  is_lead       boolean not null default false
);

create table payment_schedules (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id) on delete cascade,
  kind          payment_kind not null,
  amount_minor  bigint not null,
  currency      char(3) not null,
  due_date      date,
  paid          boolean not null default false
);

create table payments (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id) on delete restrict,
  kind          payment_kind not null,
  amount_minor  bigint not null,
  currency      char(3) not null,
  application_fee_minor bigint not null default 0,
  provider      text not null default 'mock',
  provider_ref  text,          -- Stripe PaymentIntent id, etc.
  status        payment_status not null default 'requires_payment',
  idempotency_key text unique,
  created_at    timestamptz not null default now()
);
create index on payments (booking_id);

create table refunds (
  id            uuid primary key default gen_random_uuid(),
  payment_id    uuid not null references payments(id) on delete restrict,
  amount_minor  bigint not null,
  reason        text,
  reverses_fee  boolean not null default false,
  provider_ref  text,
  status        payment_status not null default 'processing',
  created_at    timestamptz not null default now()
);

create table host_payouts (
  id            uuid primary key default gen_random_uuid(),
  host_id       uuid not null references hosts(id) on delete restrict,
  booking_id    uuid references bookings(id) on delete set null,
  amount_minor  bigint not null,
  currency      char(3) not null,
  status        text not null default 'pending',
  provider_ref  text,
  created_at    timestamptz not null default now()
);

-- ---------- Guest experience -------------------------------------------------
create table flight_details (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id) on delete cascade,
  arrival_flight text,
  arrival_time  timestamptz,
  departure_flight text,
  departure_time timestamptz,
  notes         text,
  updated_at    timestamptz not null default now()
);

create table wishlists (
  guest_id      uuid not null references profiles(id) on delete cascade,
  experience_id uuid not null references experiences(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (guest_id, experience_id)
);

create table reviews (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id) on delete cascade,
  experience_id uuid not null references experiences(id) on delete cascade,
  guest_id      uuid not null references profiles(id) on delete cascade,
  rating_overall int not null check (rating_overall between 1 and 5),
  rating_host   int check (rating_host between 1 and 5),
  rating_accommodation int check (rating_accommodation between 1 and 5),
  rating_activities int check (rating_activities between 1 and 5),
  rating_food   int check (rating_food between 1 and 5),
  rating_value  int check (rating_value between 1 and 5),
  body          text,
  photos        jsonb not null default '[]',
  published     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (booking_id)  -- one review per booking
);

create table promo_codes (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  discount_bps  int check (discount_bps between 0 and 10000),
  amount_minor  bigint,
  currency      char(3),
  max_redemptions int,
  redeemed      int not null default 0,
  active        boolean not null default true,
  expires_at    timestamptz
);

-- ---------- Verification & ops ----------------------------------------------
create table verifications (
  id            uuid primary key default gen_random_uuid(),
  subject_type  verifiable_type not null,
  subject_id    uuid not null,
  awarded_by    uuid references profiles(id) on delete set null,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (subject_type, subject_id)
);

create table admin_actions (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references profiles(id) on delete set null,
  action        text not null,
  subject_type  text,
  subject_id    uuid,
  detail        jsonb,
  created_at    timestamptz not null default now()
);

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references profiles(id) on delete cascade,
  kind          text not null,
  title         text,
  body          text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
