-- Paradise Beyond — go-live: auth trigger, read model, atomic reservations
-- =============================================================================

-- 1. Auto-create a profile row when a new auth user signs up, so roles and
--    host links have somewhere to live. New users default to 'guest'.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'guest'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Rich read model. The normalised tables stay the source of truth for the
--    transactional/relational side (departures, inventory, bookings, RLS); the
--    denormalised `content` JSON carries the full editorial experience so the
--    SupabaseRepository can hydrate the exact same shape the UI already uses.
alter table experiences add column if not exists content jsonb;

-- 3. Stable human codes on departures and rooms (match the seed ids), so the
--    catalogue can map a displayed departure/room to its real row for booking.
alter table departures add column if not exists code text;
create unique index if not exists departures_code_key on departures (code);

alter table room_types add column if not exists code text;
create index if not exists room_types_code_idx on room_types (experience_id, code);

-- 4. Atomic reservation — decrements remaining spaces only if enough are left,
--    preventing overbooking under concurrency. Called from createBooking before
--    money moves. SECURITY DEFINER so guests can reserve without direct write
--    access to `departures`.
create or replace function public.reserve_departure(p_departure uuid, p_qty int)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update departures
     set spaces_remaining = spaces_remaining - p_qty,
         status = case when spaces_remaining - p_qty <= 0 then 'sold_out'::departure_status else status end
   where id = p_departure
     and status in ('open', 'waitlist')
     and spaces_remaining >= p_qty;
  return found;
end $$;

grant execute on function public.reserve_departure(uuid, int) to authenticated;

-- Release spaces (e.g. on cancellation/refund). Admin/service use.
create or replace function public.release_departure(p_departure uuid, p_qty int)
returns void language plpgsql security definer set search_path = public as $$
begin
  update departures
     set spaces_remaining = least(capacity, spaces_remaining + p_qty),
         status = case when status = 'sold_out' and spaces_remaining + p_qty > 0 then 'open'::departure_status else status end
   where id = p_departure;
end $$;
