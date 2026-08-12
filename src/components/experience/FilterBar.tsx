"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { monthName } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

export function FilterBar({
  categories,
  destinations,
}: {
  categories: Option[];
  destinations: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const duration = params.get("duration") ?? "";
  const category = params.get("category") ?? "";
  const destination = params.get("destination") ?? "";
  const month = params.get("month") ?? "";
  const budget = params.get("budget") ?? "";

  const hasFilters = duration || category || destination || month || budget;

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i),
    label: monthName(i),
  }));
  const budgets: Option[] = [
    { value: "150000", label: "Under $1,500" },
    { value: "200000", label: "Under $2,000" },
    { value: "300000", label: "Under $3,000" },
    { value: "500000", label: "Under $5,000" },
  ];

  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-50/70 p-4 backdrop-blur sm:p-5">
      {/* Duration pills */}
      <div className="flex flex-wrap items-center gap-2">
        <Pill active={duration === ""} onClick={() => setParam("duration", null)}>
          All lengths
        </Pill>
        <Pill active={duration === "7"} onClick={() => setParam("duration", "7")}>
          7 Days
        </Pill>
        <Pill active={duration === "14"} onClick={() => setParam("duration", "14")}>
          14 Days
        </Pill>

        <span className="mx-1 hidden h-6 w-px bg-ink/10 sm:block" />

        <Select
          label="Category"
          value={category}
          options={categories}
          onChange={(v) => setParam("category", v)}
        />
        <Select
          label="Destination"
          value={destination}
          options={destinations}
          onChange={(v) => setParam("destination", v)}
        />
        <Select
          label="Month"
          value={month}
          options={months}
          onChange={(v) => setParam("month", v)}
        />
        <Select
          label="Budget"
          value={budget}
          options={budgets}
          onChange={(v) => setParam("budget", v)}
        />

        {hasFilters && (
          <button
            onClick={() => router.replace(pathname, { scroll: false })}
            className="ml-auto text-xs uppercase tracking-eyebrow text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-xs uppercase tracking-eyebrow transition-all duration-300",
        active
          ? "bg-ink text-sand-50"
          : "bg-transparent text-ink-soft hover:bg-ink/5",
      )}
    >
      {children}
    </button>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "cursor-pointer appearance-none rounded-full border border-ink/15 bg-sand-50 py-2 pl-4 pr-9 text-xs uppercase tracking-eyebrow text-ink-soft transition-colors hover:border-ink/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500",
          value && "border-ink/50 text-ink",
        )}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 12 12"
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-muted"
      >
        <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </label>
  );
}
