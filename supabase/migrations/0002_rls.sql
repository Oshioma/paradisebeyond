-- Paradise Beyond — Row Level Security
-- =============================================================================
-- Principles
--   * Deny by default: RLS is enabled on every table; access is granted by
--     explicit policy only.
--   * Public catalogue is world-readable ONLY when published.
--   * Guests see their own bookings/payments/wishlists — never anyone else's.
--   * Hosts manage their own experiences and see bookings for their departures.
--   * Admins (profiles.role = 'admin') have full access.
--   * Financial writes (payments, refunds, payouts, commission snapshots) are
--     performed server-side with the service role, which bypasses RLS — the
--     browser never writes money rows directly.
-- =============================================================================

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Helper: does the current user own this host?
create or replace function owns_host(h uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from hosts x where x.id = h and x.owner_id = auth.uid()
  );
$$;

-- Enable RLS everywhere.
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- ---------- Profiles ---------------------------------------------------------
create policy profiles_self_read on profiles
  for select using (id = auth.uid() or is_admin());
create policy profiles_self_update on profiles
  for update using (id = auth.uid());
create policy profiles_admin_all on profiles
  for all using (is_admin()) with check (is_admin());

-- ---------- Public catalogue (read-only when published) ---------------------
create policy destinations_public_read on destinations for select using (true);
create policy categories_public_read on categories for select using (true);

create policy experiences_public_read on experiences
  for select using (status = 'published' or is_admin() or exists (
    select 1 from experience_hosts eh where eh.experience_id = experiences.id and owns_host(eh.host_id)
  ));

-- Child catalogue tables inherit visibility from their parent experience.
create policy exp_hosts_read on experience_hosts for select using (
  exists (select 1 from experiences e where e.id = experience_id
          and (e.status = 'published' or is_admin())));
create policy exp_categories_read on experience_categories for select using (true);
create policy exp_inclusions_read on experience_inclusions for select using (
  exists (select 1 from experiences e where e.id = experience_id
          and (e.status = 'published' or is_admin())));
create policy exp_media_read on experience_media for select using (
  exists (select 1 from experiences e where e.id = experience_id
          and (e.status = 'published' or is_admin())));
create policy itinerary_days_read on itinerary_days for select using (
  exists (select 1 from experiences e where e.id = experience_id
          and (e.status = 'published' or is_admin())));
create policy itinerary_items_read on itinerary_items for select using (
  exists (select 1 from itinerary_days d join experiences e on e.id = d.experience_id
          where d.id = day_id and (e.status = 'published' or is_admin())));
create policy room_types_read on room_types for select using (
  exists (select 1 from experiences e where e.id = experience_id
          and (e.status = 'published' or is_admin())));
create policy departures_public_read on departures for select using (
  exists (select 1 from experiences e where e.id = experience_id
          and (e.status = 'published' or is_admin())));
create policy dep_room_inventory_read on departure_room_inventory for select using (true);
create policy properties_public_read on properties for select using (true);
create policy verifications_public_read on verifications for select using (true);

-- ---------- Hosts ------------------------------------------------------------
create policy hosts_public_read on hosts for select using (true);
create policy hosts_owner_write on hosts
  for all using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());

-- Hosts manage their own experiences (but cannot self-publish/verify — enforced
-- in server logic; status transitions to 'published' are admin-only).
create policy experiences_host_write on experiences
  for all using (
    is_admin() or exists (
      select 1 from experience_hosts eh where eh.experience_id = experiences.id and owns_host(eh.host_id)
    )
  ) with check (
    is_admin() or exists (
      select 1 from experience_hosts eh where eh.experience_id = experiences.id and owns_host(eh.host_id)
    )
  );

-- ---------- Host applications ------------------------------------------------
create policy host_apps_self on host_applications
  for select using (applicant_id = auth.uid() or is_admin());
create policy host_apps_insert on host_applications
  for insert with check (applicant_id = auth.uid() or applicant_id is null);
create policy host_apps_admin on host_applications
  for all using (is_admin()) with check (is_admin());

-- ---------- Bookings & money (guest-owned; money via service role) ----------
create policy bookings_owner_read on bookings
  for select using (
    guest_id = auth.uid() or is_admin() or exists (
      select 1 from departures d
      join experience_hosts eh on eh.experience_id = d.experience_id
      where d.id = bookings.departure_id and owns_host(eh.host_id)
    )
  );
create policy bookings_owner_insert on bookings
  for insert with check (guest_id = auth.uid());
create policy bookings_admin_all on bookings
  for all using (is_admin()) with check (is_admin());

create policy booking_guests_owner on booking_guests
  for all using (
    exists (select 1 from bookings b where b.id = booking_id and (b.guest_id = auth.uid() or is_admin()))
  ) with check (
    exists (select 1 from bookings b where b.id = booking_id and b.guest_id = auth.uid())
  );

-- Guests may read their own payment rows; writes happen server-side only.
create policy payments_owner_read on payments
  for select using (
    exists (select 1 from bookings b where b.id = booking_id and (b.guest_id = auth.uid() or is_admin()))
  );
create policy payment_schedules_owner_read on payment_schedules
  for select using (
    exists (select 1 from bookings b where b.id = booking_id and (b.guest_id = auth.uid() or is_admin()))
  );
create policy refunds_admin_read on refunds for select using (is_admin());
create policy host_payouts_read on host_payouts
  for select using (is_admin() or owns_host(host_id));

-- ---------- Guest artefacts --------------------------------------------------
create policy flight_details_owner on flight_details
  for all using (
    exists (select 1 from bookings b where b.id = booking_id
            and (b.guest_id = auth.uid() or is_admin() or exists (
              select 1 from departures d
              join experience_hosts eh on eh.experience_id = d.experience_id
              where d.id = b.departure_id and owns_host(eh.host_id))))
  ) with check (
    exists (select 1 from bookings b where b.id = booking_id and b.guest_id = auth.uid())
  );

create policy wishlists_owner on wishlists
  for all using (guest_id = auth.uid()) with check (guest_id = auth.uid());

-- Reviews: only the booking's guest can write; published reviews are public.
create policy reviews_public_read on reviews
  for select using (published or guest_id = auth.uid() or is_admin());
create policy reviews_owner_write on reviews
  for insert with check (
    guest_id = auth.uid() and exists (
      select 1 from bookings b
      where b.id = booking_id and b.guest_id = auth.uid()
        and b.status in ('completed')
    )
  );
create policy reviews_admin on reviews for all using (is_admin()) with check (is_admin());

-- ---------- Ops (admin only) -------------------------------------------------
create policy promo_admin on promo_codes for all using (is_admin()) with check (is_admin());
create policy commission_admin on commission_rules for all using (is_admin()) with check (is_admin());
create policy admin_actions_admin on admin_actions for all using (is_admin()) with check (is_admin());
create policy notifications_owner on notifications
  for select using (recipient_id = auth.uid() or is_admin());
