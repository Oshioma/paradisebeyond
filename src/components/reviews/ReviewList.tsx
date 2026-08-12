import type { Review } from "@/lib/reviews/types";
import { Stars } from "@/components/reviews/Stars";
import { formatFullDate } from "@/lib/utils";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="rounded-xl2 border border-dashed border-ink/20 py-10 text-center text-sm text-ink-muted">No reviews yet — be the first to travel and tell the story.</p>;
  }
  return (
    <div className="space-y-5">
      {reviews.map((r) => (
        <figure key={r.id} className="rounded-xl2 border border-ink/10 bg-sand-50 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ocean-500/12 text-sm font-semibold text-ocean-700">
                {r.guestName.charAt(0).toUpperCase()}
              </span>
              <div>
                <figcaption className="font-medium text-ink">{r.guestName}</figcaption>
                <p className="text-xs text-ink-muted">{formatFullDate(r.createdAt)}</p>
              </div>
            </div>
            <Stars value={r.ratingOverall} />
          </div>
          {r.body && <blockquote className="mt-4 text-ink-soft">{r.body}</blockquote>}
        </figure>
      ))}
    </div>
  );
}
