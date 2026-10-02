import { cn } from "@/lib/utils";

/**
 * Spend Time Off Grid search. A plain GET form to /experiences, so it works
 * without JavaScript and every search is a shareable URL. The params are read
 * by the explore page and applied by the shared catalogue filter
 * (src/lib/data/filter.ts): where → q, when → date, contribution → maxHours,
 * stay → stayNights.
 */
export interface OffGridSearchValues {
  where?: string;
  date?: string;
  hours?: string;
  stay?: string;
  category?: string;
}

export const HOURS_OPTIONS = [
  { value: "", label: "Any" },
  { value: "2", label: "Up to 2 hours" },
  { value: "3", label: "Up to 3 hours" },
  { value: "4", label: "Up to 4 hours" },
];

export const STAY_OPTIONS = [
  { value: "", label: "Any length" },
  { value: "7", label: "About a week" },
  { value: "14", label: "Two weeks" },
  { value: "30", label: "A month" },
  { value: "60", label: "Two months +" },
];

export function OffGridSearch({
  values = {},
  variant = "hero",
  categories,
}: {
  values?: OffGridSearchValues;
  variant?: "hero" | "bar";
  /** Optional category select (explore page). */
  categories?: { value: string; label: string }[];
}) {
  const hero = variant === "hero";
  return (
    <form
      action="/experiences"
      method="get"
      role="search"
      className={cn(
        "grid w-full gap-px overflow-hidden rounded-2xl border bg-ink/10 shadow-soft",
        hero ? "border-sand-50/30 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto]" : "border-ink/10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]",
      )}
    >
      <Cell label="Where">
        <input
          name="where"
          defaultValue={values.where}
          placeholder="Anywhere"
          className={inputCls}
          autoComplete="off"
        />
      </Cell>
      <Cell label="When">
        <input name="date" type="date" defaultValue={values.date} className={inputCls} aria-label="Arrival date (optional)" />
      </Cell>
      <Cell label="Contribution">
        <select name="hours" defaultValue={values.hours ?? ""} className={inputCls}>
          {HOURS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Cell>
      <Cell label="Stay">
        <select name="stay" defaultValue={values.stay ?? ""} className={inputCls}>
          {STAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Cell>
      {categories && (
        <Cell label="Kind of place">
          <select name="category" defaultValue={values.category ?? ""} className={inputCls}>
            <option value="">Any</option>
            {categories.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Cell>
      )}
      <div className="flex items-stretch bg-sand-50 p-2">
        <button
          type="submit"
          className="w-full rounded-xl bg-forest-700 px-6 py-3 text-xs font-medium uppercase tracking-eyebrow text-sand-50 transition-colors hover:bg-forest-800"
        >
          Search
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "mt-0.5 w-full bg-transparent text-[0.95rem] text-ink placeholder:text-ink-muted/70 focus:outline-none";

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block bg-sand-50 px-4 py-3 focus-within:bg-sand-100">
      <span className="block text-[0.62rem] font-semibold uppercase tracking-eyebrow text-forest-700">{label}</span>
      {children}
    </label>
  );
}
