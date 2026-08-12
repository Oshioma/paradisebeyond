import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  reserved: "bg-clay-500/15 text-clay-600",
  balance_due: "bg-clay-500/15 text-clay-600",
  confirmed: "bg-palm-500/15 text-palm-600",
  completed: "bg-ocean-500/12 text-ocean-700",
  pending: "bg-ink/5 text-ink-muted",
  cancelled: "bg-ink/5 text-ink-muted",
  refunded: "bg-ink/5 text-ink-muted",
  submitted: "bg-ocean-500/12 text-ocean-700",
  under_review: "bg-clay-500/15 text-clay-600",
  changes_requested: "bg-clay-500/15 text-clay-600",
  approved: "bg-palm-500/15 text-palm-600",
  rejected: "bg-ink/10 text-ink-muted",
};

const LABELS: Record<string, string> = {
  balance_due: "Balance due",
  under_review: "Under review",
  changes_requested: "Changes requested",
};

export function StatusPill({ status }: { status: string }) {
  const label = LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[0.66rem] font-medium uppercase tracking-eyebrow",
        TONES[status] ?? "bg-ink/5 text-ink-muted",
      )}
    >
      {label}
    </span>
  );
}
