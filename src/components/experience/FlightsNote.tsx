import { cn } from "@/lib/utils";

/**
 * The single, consistent "flights not included" message. It should feel like a
 * warm aside, never a warning. Used across cards, the experience page and the
 * footer so the promise is always framed the same way.
 */
export function FlightsNote({ className, tone = "sand" }: { className?: string; tone?: "sand" | "ocean" }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl2 p-5",
        tone === "sand" ? "bg-sand-100" : "bg-ocean-700 text-sand-50",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" aria-hidden className={cn("mt-0.5 h-5 w-5 flex-none", tone === "ocean" ? "text-sand-100" : "text-ocean-600")} fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10.5 19l1.5-5 6.5 2 2-2-6-4 1-6-2-1-3 5-5-1-1.5 1.5 3.5 3-2 4 2 1z" />
      </svg>
      <p className={cn("text-sm leading-relaxed", tone === "ocean" ? "text-sand-100" : "text-ink-soft")}>
        <span className={cn("font-medium", tone === "ocean" ? "text-sand-50" : "text-ink")}>
          Your international flights aren&apos;t included.
        </span>{" "}
        Get yourself to Zanzibar and we&apos;ll take care of the rest — transfers,
        stay, and every scheduled moment.
      </p>
    </div>
  );
}
