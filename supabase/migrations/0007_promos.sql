-- Paradise Beyond — promo codes
-- =============================================================================
-- The promo_codes table already exists (0001). This adds booking columns to
-- record an applied code + discount, and security-definer functions so guests
-- can validate/redeem a code without direct table access (RLS keeps the table
-- admin-only).
-- =============================================================================

alter table bookings add column if not exists promo_code text;
alter table bookings add column if not exists discount_minor bigint not null default 0;

-- Compute the discount for a code against a subtotal (0 if invalid/expired/used
-- up). Does not consume a redemption.
create or replace function public.promo_discount(p_code text, p_subtotal bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare r record; d bigint;
begin
  select * into r from promo_codes
   where upper(code) = upper(p_code) and active
     and (expires_at is null or expires_at > now())
     and (max_redemptions is null or redeemed < max_redemptions)
   limit 1;
  if not found then return 0; end if;
  if r.discount_bps is not null then d := (p_subtotal * r.discount_bps) / 10000;
  elsif r.amount_minor is not null then d := r.amount_minor;
  else d := 0; end if;
  if d > p_subtotal then d := p_subtotal; end if;
  return greatest(d, 0);
end $$;

grant execute on function public.promo_discount(text, bigint) to anon, authenticated;

-- Consume one redemption atomically at booking time (true if it counted).
create or replace function public.redeem_promo(p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update promo_codes set redeemed = redeemed + 1
   where upper(code) = upper(p_code) and active
     and (expires_at is null or expires_at > now())
     and (max_redemptions is null or redeemed < max_redemptions);
  return found;
end $$;

grant execute on function public.redeem_promo(text) to authenticated;
