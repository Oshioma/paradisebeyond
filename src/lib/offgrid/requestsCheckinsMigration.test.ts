import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Guards on migration 0034: who can see and change stay requests and check-ins. */
const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0034_stay_requests_and_checkins.sql"), "utf8").toLowerCase();
const block = (start: string) => { const i = sql.indexOf(start); return sql.slice(i, sql.indexOf("$$;", i) > -1 && start.includes("function") ? sql.indexOf("$$;", i) : sql.indexOf(";", i)); };

describe("stay_requests", () => {
  it("RLS on; readable by its traveller, the listing's host, or admin", () => {
    expect(sql).toContain("alter table public.stay_requests enable row level security");
    expect(block("create policy stay_requests_read")).toContain("guest_id = auth.uid() or is_departure_host(departure_id) or is_admin()");
  });
  it("travellers can only create their own pending, unlinked, undecided request on an off-grid listing", () => {
    const p = block("create policy stay_requests_insert");
    for (const bit of ["guest_id = auth.uid()", "status = 'pending'", "booking_id is null", "host_note is null", "decided_at is null", "is_offgrid_departure(departure_id)"]) {
      expect(p).toContain(bit);
    }
  });
  it("no direct updates or deletes — status changes only through the checked functions", () => {
    expect(sql).toContain("revoke update, delete, truncate on public.stay_requests from authenticated");
    expect(sql).not.toMatch(/create policy \w+ on public\.stay_requests\s+for (update|delete|all)/);
    expect(block("create or replace function public.decide_stay_request")).toContain("is_departure_host(r.departure_id) or is_admin()");
    expect(block("create or replace function public.decide_stay_request")).toContain("r.status <> 'pending'");
    expect(block("create or replace function public.withdraw_stay_request")).toContain("guest_id = auth.uid()");
    const link = block("create or replace function public.link_stay_request");
    expect(link).toContain("r.status = 'accepted'");
    expect(link).toContain("b.guest_id = auth.uid()");
    expect(link).toContain("b.departure_id = r.departure_id");
  });
  it("one open request per traveller per window", () => {
    expect(sql).toMatch(/unique index if not exists stay_requests_one_open[\s\S]*where status in \('pending', 'accepted'\)/);
  });
  it("no anonymous access", () => {
    expect(sql).toContain("revoke all on public.stay_requests from anon");
  });
});

describe("stay_checkins", () => {
  it("only the traveller (and admins) can read — not the host", () => {
    const p = block("create policy stay_checkins_read");
    expect(p).toContain("is_booking_guest(booking_id) or is_admin()");
    expect(p).not.toContain("host");
  });
  it("no direct writes; answers only through respond_stay_checkin for the traveller, once due", () => {
    expect(sql).toContain("revoke insert, update, delete, truncate on public.stay_checkins from authenticated");
    const f = block("create or replace function public.respond_stay_checkin");
    expect(f).toContain("is_booking_guest(p_booking)");
    expect(f).toContain("due_at <= now()");
  });
  it("cron-only functions aren't callable by users", () => {
    expect(sql).toContain("revoke all on function public.queue_stay_checkins() from public, anon, authenticated");
    expect(sql).toContain("revoke all on function public.ping_checkin_mailer() from public, anon, authenticated");
  });
  it("queues only off-grid live stays, recent only; secret comes from vault, not this file", () => {
    const q = block("create or replace function public.queue_stay_checkins");
    expect(q).toContain("marketplace = 'spendtimeoffgrid'");
    expect(q).toContain("status in ('reserved', 'confirmed')");
    expect(q).toContain("interval '2 days'");
    expect(sql).toContain("vault.decrypted_secrets");
    expect(sql).toMatch(/cron\.schedule\(\s*'stay-checkins'/);
  });
});
