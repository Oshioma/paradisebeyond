"use client";

import { cn } from "@/lib/utils";
import { useWishlist } from "./WishlistProvider";

export function WishlistButton({
  slug,
  className,
  variant = "overlay",
}: {
  slug: string;
  className?: string;
  variant?: "overlay" | "inline";
}) {
  const { isSaved, toggle } = useWishlist();
  const saved = isSaved(slug);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save experience"}
      className={cn(
        "group/heart inline-flex items-center justify-center rounded-full transition-all duration-300 ease-out-soft",
        variant === "overlay"
          ? "h-10 w-10 bg-sand-50/85 backdrop-blur hover:bg-sand-50 shadow-soft"
          : "h-11 w-11 border border-ink/15 hover:border-ink/40",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className={cn(
          "h-5 w-5 transition-all duration-300",
          saved ? "fill-clay-500 stroke-clay-500 scale-110" : "fill-none stroke-ink",
        )}
        strokeWidth="1.6"
      >
        <path d="M12 21s-7.5-4.7-9.7-9.2C1 8.7 2.4 5.5 5.5 5.1c2-.3 3.6.8 4.5 2.2.9-1.4 2.5-2.5 4.5-2.2 3.1.4 4.5 3.6 3.2 6.7C19.5 16.3 12 21 12 21z" />
      </svg>
    </button>
  );
}

export function WishlistCount() {
  const { saved, ready } = useWishlist();
  return (
    <span className="tabular-nums">
      Saved{ready && saved.length > 0 ? ` (${saved.length})` : ""}
    </span>
  );
}
