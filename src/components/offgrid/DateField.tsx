"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Native date input that reads "Any dates" while empty (browsers otherwise
 * show a mm/dd/yyyy mask). Still a plain named input, so the search form
 * submits it as `date` with no JavaScript required.
 */
export function DateField({ name, defaultValue, className }: { name: string; defaultValue?: string; className?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [focused, setFocused] = useState(false);
  const empty = !value && !focused;
  return (
    <span className="relative block">
      <input
        type="date"
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Arrival date (optional)"
        className={cn(className, empty && "text-transparent [&::-webkit-datetime-edit]:text-transparent")}
      />
      {empty && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-[0.95rem] text-ink">
          Any dates
        </span>
      )}
    </span>
  );
}
