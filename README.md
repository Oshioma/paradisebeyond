# Paradise Beyond

> Come for more than a holiday.

A curated marketplace for **7-day and 14-day** retreats and experience-led
holidays, launching in **Zanzibar**. Paradise Beyond sells the experience on the
ground — place, people, accommodation, activities, programme, story and
community, woven together. **Guests arrange their own international flights.**

This repository currently contains **Phase 1a: Foundation + the Magazine** — the
public, editorial, mobile-first website plus the data, money and payment
architecture the rest of the platform builds on.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS with a custom editorial design system |
| Data | Supabase (Postgres + Auth + Storage + RLS) — schema in `supabase/migrations` |
| Payments | Modular `PaymentProvider` (Stripe Connect–ready); mock provider for the demo |
| Hosting | Vercel (image optimisation via `next/image`) |

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run typecheck    # tsc --noEmit
```

No environment variables are required to run the magazine — it serves curated
seed data. Supabase/Stripe keys (see `.env.example`) are needed only when wiring
the live data and payment layers.

---

## What's built

**Public magazine**

- `/` — homepage: editorial hero, "What do you want to experience?" category
  grid, "Choose your escape" 7/14-day split, featured experiences, host CTA.
- `/experiences` — discovery with filters: length, category, destination, month,
  budget (URL-driven, shareable).
- `/experiences/[slug]` — the experience page: hero, "for you if", story, visual
  highlights, your stay + rooms, what's included/excluded, day-by-day itinerary
  (condensed for 14-day), hosts, share, sticky **Reserve** panel with per-
  departure availability. Full OpenGraph + JSON-LD for social/SEO.
- `/categories/[category]`, `/destinations/[slug]`, `/hosts/[slug]`.
- `/book/[departureId]` — booking flow (room → guests → deposit/full) running on
  the mock payment provider, with the live commission split computed.
- `/host` + `/host/apply` — host marketing and the validated application form.
- `/account/saved` — wishlist (❤️), persisted locally, account-ready.

**Cross-cutting**

- Money as **integer minor units** everywhere (`src/lib/money.ts`); commission
  in **basis points**; per-booking commission **snapshot**.
- The single warm "flights not included" message, reused everywhere.
- Reduced-motion aware animation; mobile-first throughout.

## Architecture notes

- **Repository seam** (`src/lib/data/repository.ts`): every page reads through
  async repository functions serving seed content today. A `SupabaseRepository`
  implementing the same shape drops in with no page changes.
- **Payments** (`src/lib/payments/`): `PaymentProvider` interface + `MockProvider`.
  Swap in Stripe Connect (destination charges, deposits/balances as scheduled
  PaymentIntents, webhooks as source of truth, idempotency keys) behind the same
  interface. The platform is designed **not** to hold client funds indefinitely.
- **Security**: RLS on every table (`supabase/migrations/0002_rls.sql`). The
  browser uses the anon key only; the service-role key is server-only and used
  for financial writes.
- **Destination-agnostic**: nothing hard-codes Zanzibar — `destinations` is a
  first-class table.

## Data model

See `supabase/migrations/0001_schema.sql` for the full relational model:
identity & roles, catalogue (destinations → properties → experiences →
itinerary/rooms), date-led departures with per-room inventory, bookings with a
commission snapshot, payments/schedules/refunds/payouts, and guest artefacts
(flights, wishlists, reviews, questionnaires).

## Roadmap

- **Phase 1b** — Supabase auth + roles, live repository, real booking writes,
  guest dashboard (My Trips / Before You Go / flight entry), host dashboard,
  admin desk (approvals, curation, Verified, commissions, homepage content).
- **Phase 1c** — Stripe Connect: deposits, balances, payouts, refunds, webhooks.
- **Phase 2** — reviews, promo codes, guest messaging, AI retreat builder,
  automated emails, richer search.
- **Phase 3** — multi-country expansion, referrals, concierge, recommendations.

## Note on imagery

Demo photography is served via a single helper (`src/lib/images.ts`) using
deterministic placeholders. Point it at your real media CDN / Supabase Storage
to swap in true photography in one place.
