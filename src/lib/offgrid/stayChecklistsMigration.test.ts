import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Guards on the row-level security of migration 0033 (stay_checklists). */
const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0033_stay_checklists.sql"), "utf8").toLowerCase();

describe("stay_checklists privacy", () => {
  it("has row-level security on, and no anonymous access", () => {
    expect(sql).toContain("alter table public.stay_checklists enable row level security");
    expect(sql).toContain("revoke all on public.stay_checklists from anon");
    expect(sql).not.toMatch(/grant[^;]*to\s+anon/);
  });
  it("reads are limited to the booking's traveller, its host, or admin — off-grid only", () => {
    const read = sql.slice(sql.indexOf("create policy stay_checklists_read"), sql.indexOf(";", sql.indexOf("create policy stay_checklists_read")));
    expect(read).toContain("is_offgrid_booking(booking_id)");
    expect(read).toContain("is_booking_guest(booking_id)");
    expect(read).toContain("is_booking_host(booking_id)");
  });
  it("each side may only write its own row", () => {
    for (const name of ["stay_checklists_write_insert", "stay_checklists_write_update"]) {
      const at = sql.indexOf(`create policy ${name}`);
      const policy = sql.slice(at, sql.indexOf(";", at));
      expect(policy).toContain("side = 'guest' and is_booking_guest(booking_id)");
      expect(policy).toContain("side = 'host' and (is_booking_host(booking_id) or is_admin())");
      expect(policy).toContain("is_offgrid_booking(booking_id)");
    }
  });
  it("has no delete policy (rows go with their booking)", () => {
    expect(sql).not.toMatch(/for\s+delete/);
    expect(sql).toContain("on delete cascade");
  });
});
