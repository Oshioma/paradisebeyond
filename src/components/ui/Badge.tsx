import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "ocean" | "clay" | "light";
}) {
  const tones = {
    neutral: "bg-ink/5 text-ink-soft",
    ocean: "bg-ocean-500/12 text-ocean-700",
    clay: "bg-clay-500/15 text-clay-600",
    light: "bg-sand-50/85 text-ink backdrop-blur",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[0.68rem] font-medium uppercase tracking-eyebrow",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Paradise Beyond Verified ✓ mark. */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      title="Paradise Beyond Verified — additional checks completed"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-ocean-500/12 px-2.5 py-1 text-[0.66rem] font-medium uppercase tracking-eyebrow text-ocean-700",
        className,
      )}
    >
      <svg viewBox="0 0 20 20" aria-hidden className="h-3 w-3 fill-current">
        <path d="M10 1.5l2.2 1.6 2.7-.2 1 2.5 2.3 1.4-.7 2.6.7 2.6-2.3 1.4-1 2.5-2.7-.2L10 18.5l-2.2-1.6-2.7.2-1-2.5L1.8 13l.7-2.6L1.8 7.8l2.3-1.4 1-2.5 2.7.2L10 1.5z" />
        <path d="M8.6 12.4L6.3 10l1-1 1.3 1.3 3-3 1 1-4 4z" className="fill-sand-50" />
      </svg>
      Verified
    </span>
  );
}

export function DurationBadge({ duration }: { duration: 7 | 14 }) {
  return (
    <Badge tone="light" className="font-semibold tracking-[0.18em]">
      {duration} Days
    </Badge>
  );
}
