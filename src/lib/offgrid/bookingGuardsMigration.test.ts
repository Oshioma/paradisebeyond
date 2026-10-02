import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Guards on migration 0035 (booking snapshot rules), which mirrors what's live. */
const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0035_booking_snapshot_guards.sql"), "utf8").toLowerCase();
const freeze = sql.slice(sql.indexOf("create or replace function public.bookings_freeze_economics"), sql.indexOf("end $$;", sql.indexOf("create or replace function public.bookings_freeze_economics")));

describe("booking snapshot guards", () => {
  it("off-grid bookings need their own dates; Paradise Beyond bookings don't", () => {
    expect(sql).toContain("add constraint bookings_offgrid_dates_check");
    expect(sql).toContain("marketplace <> 'spendtimeoffgrid' or (stay_start_date is not null and stay_nights is not null)");
  });

  it("freezes the marketplace and the whole financial snapshot", () => {
    for (const col of ["marketplace", "currency", "subtotal_minor", "discount_minor", "deposit_minor", "commission_rate_bps", "platform_fee_minor", "host_net_minor"]) {
      expect(freeze).toContain(`new.${col} is distinct from old.${col}`);
    }
  });

  it("leaves what the app does change editable: balance, status and Stripe ids", () => {
    for (const col of ["balance_minor", "status", "stripe_session_id", "stripe_payment_intent"]) {
      expect(freeze).not.toContain(`new.${col}`);
    }
  });

  it("re-attaches the trigger and is safe to run twice", () => {
    expect(sql).toContain("if not exists (select 1 from pg_constraint where conname = 'bookings_offgrid_dates_check')");
    expect(sql).toContain("drop trigger if exists bookings_freeze_economics on public.bookings");
    expect(sql).toMatch(/create trigger bookings_freeze_economics\s+before update on public\.bookings/);
  });
});
