-- Paradise Beyond — guest ↔ host messaging
-- =============================================================================
-- Messages are scoped to a booking. The participants — the booking's guest and
-- the host of its departure (plus admins) — can read and post. RLS enforces it.
-- =============================================================================

create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  sender_id   uuid references profiles(id) on delete set null,
  sender_role text not null check (sender_role in ('guest', 'host', 'admin')),
  body        text not null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index if not exists messages_booking_idx on messages (booking_id, created_at);

alter table messages enable row level security;

-- A participant of the booking is: its guest, the host of its departure, or admin.
create policy messages_participant_read on messages
  for select using (
    is_admin() or exists (
      select 1 from bookings b
      where b.id = messages.booking_id
        and (
          b.guest_id = auth.uid()
          or exists (
            select 1 from departures d
            join experience_hosts eh on eh.experience_id = d.experience_id
            where d.id = b.departure_id and owns_host(eh.host_id)
          )
        )
    )
  );

create policy messages_participant_insert on messages
  for insert with check (
    sender_id = auth.uid() and exists (
      select 1 from bookings b
      where b.id = booking_id
        and (
          b.guest_id = auth.uid()
          or is_admin()
          or exists (
            select 1 from departures d
            join experience_hosts eh on eh.experience_id = d.experience_id
            where d.id = b.departure_id and owns_host(eh.host_id)
          )
        )
    )
  );
