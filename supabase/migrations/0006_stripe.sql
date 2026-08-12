-- Paradise Beyond — Stripe Connect
-- =============================================================================
-- Hosts receive payouts via their own Stripe connected (Express) account. Guest
-- payments are destination charges: the platform takes an application fee (the
-- commission) and the remainder is transferred to the host's account. Stripe
-- handles host payouts on its schedule, so the platform doesn't hold host funds.
-- =============================================================================

alter table hosts add column if not exists stripe_account_id text;
alter table hosts add column if not exists stripe_onboarded boolean not null default false;

alter table bookings add column if not exists stripe_session_id text;
alter table bookings add column if not exists stripe_payment_intent text;
create index if not exists bookings_stripe_session_idx on bookings (stripe_session_id);
