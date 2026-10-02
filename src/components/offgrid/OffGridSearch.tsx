import { cn } from "@/lib/utils";
import { DateField } from "@/components/offgrid/DateField";
import { CalendarIcon, ClockIcon, HouseIcon, PinIcon, SearchIcon, SproutIcon } from "@/components/offgrid/icons";

/**
 * Spend Time Off Grid search. A plain GET form to /experiences, so it works
 * without JavaScript and every search is a shareable URL. The params are read
 * by the explore page and applied by the shared catalogue filter
 * (src/lib/data/filter.ts): where → q, when → date, help per day (`hours`) →
 * maxHours, minimum stay (`stay`) → stayNights.
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
        "grid w-full items-stretch overflow-hidden rounded-2xl border border-ink/10 bg-sand-50",
        "divide-y divide-ink/10 lg:divide-x lg:divide-y-0",
        hero
          ? "shadow-[0_18px_50px_-20px_rgba(20,35,25,0.45)] lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto]"
          : "shadow-soft sm:grid-cols-2 sm:divide-x lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_auto]",
      )}
    >
      <Cell label="Where" icon={<PinIcon />}>
        <input name="where" defaultValue={values.where} placeholder="Anywhere" className={inputCls} autoComplete="off" />
      </Cell>
      <Cell label="When" icon={<CalendarIcon />}>
        <DateField name="date" defaultValue={values.date} className={inputCls} />
      </Cell>
      <Cell label="Help per day" icon={<SproutIcon />}>
        <select name="hours" defaultValue={values.hours ?? ""} className={inputCls}>
          {HOURS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Cell>
      <Cell label="Minimum stay" icon={<ClockIcon />}>
        <select name="stay" defaultValue={values.stay ?? ""} className={inputCls}>
          {STAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Cell>
      {categories && (
        <Cell label="Kind of place" icon={<HouseIcon />}>
          <select name="category" defaultValue={values.category ?? ""} className={inputCls}>
            <option value="">Any</option>
            {categories.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Cell>
      )}
      <div className={cn("flex items-stretch p-2.5", !hero && "sm:col-span-2 lg:col-span-1")}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest-700 px-7 py-3.5 text-sm font-medium text-sand-50 transition-colors hover:bg-forest-800"
        >
          <SearchIcon className="h-4 w-4" />
          Search
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full min-w-0 bg-transparent text-[0.95rem] text-ink placeholder:text-ink focus:outline-none";

function Cell({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-3 px-4 py-3 transition-colors focus-within:bg-sand-100 sm:px-5">
      <span className="flex-none text-forest-800">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.7rem] font-medium text-ink-muted">{label}</span>
        {children}
      </span>
    </label>
  );
}
