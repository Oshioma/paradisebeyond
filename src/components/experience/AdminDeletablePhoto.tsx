"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePhoto } from "@/app/studio/photos/actions";

/**
 * Wraps a guest photo on the public retreat page / microsite and, for an
 * admin viewer only, overlays an "×" that deletes the photo in one click.
 * Guests and hosts see the photo exactly as before (this renders nothing
 * extra until /api/me confirms the admin role). The server action re-checks
 * permission, so the button is a convenience, not the security boundary.
 *
 * One /api/me lookup is shared across every photo on the page.
 */
let adminLookup: Promise<boolean> | null = null;
function isViewerAdmin(): Promise<boolean> {
  if (!adminLookup) {
    adminLookup = fetch("/api/me")
      .then((r) => r.json())
      .then((d) => d?.role === "admin")
      .catch(() => false);
  }
  return adminLookup;
}

export function AdminDeletablePhoto({
  photoId,
  as: Tag = "div",
  className,
  children,
}: {
  photoId: string;
  /** Wrapper element — "figure" when the children include a figcaption. */
  as?: "div" | "figure";
  /** Classes for the wrapper (the photo's positioned frame). */
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [admin, setAdmin] = useState(false);
  const [gone, setGone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    isViewerAdmin().then((a) => { if (alive) setAdmin(a); });
    return () => { alive = false; };
  }, []);

  if (gone) return null;

  function remove() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("photoId", photoId);
      const res = await deletePhoto(fd);
      if (res.ok) {
        // Hide immediately, then refresh so the same photo disappears from the
        // gallery AND its itinerary day without a full reload.
        setGone(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Tag className={className}>
      {children}
      {admin && (
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label="Delete this photo"
          title={error ?? "Delete this photo (admin)"}
          className={`absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full text-sand-50 shadow-soft transition-opacity hover:opacity-100 disabled:opacity-50 ${error ? "bg-clay-600" : "bg-ink/70 opacity-80"}`}
        >
          {pending ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-sand-50/40 border-t-sand-50" />
          ) : (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          )}
        </button>
      )}
    </Tag>
  );
}
