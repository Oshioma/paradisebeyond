import { cn } from "@/lib/utils";

/** Read-only star row for a 0–5 rating (supports halves). */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 align-middle", className)} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return <Star key={i} fill={fill} />;
      })}
    </span>
  );
}

function Star({ fill }: { fill: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[1em] leading-none">
      <span className="absolute inset-0 text-ink/15">★</span>
      <span className="absolute inset-0 overflow-hidden text-clay-500" style={{ width: `${fill * 100}%` }}>★</span>
    </span>
  );
}

/** Compact "★ 4.8 · 12 reviews" summary. */
export function RatingSummary({ average, count, className }: { average: number; count: number; className?: string }) {
  if (count === 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <Stars value={average} />
      <span className="font-medium text-ink">{average.toFixed(1)}</span>
      <span className="text-ink-muted">· {count} review{count === 1 ? "" : "s"}</span>
    </span>
  );
}
