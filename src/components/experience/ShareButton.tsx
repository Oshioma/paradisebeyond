"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ShareButton({
  title,
  text,
  className,
  label = "Share",
}: {
  title: string;
  text?: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      onClick={onShare}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-xs uppercase tracking-eyebrow text-ink transition-colors hover:border-ink/40",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" />
      </svg>
      {copied ? "Link copied" : label}
    </button>
  );
}
