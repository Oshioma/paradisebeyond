import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { listPendingReviews } from "@/lib/data/reviews";
import { moderateReview } from "@/lib/reviews/actions";
import { Stars } from "@/components/reviews/Stars";
import { formatFullDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Reviews", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DeskReviewsPage() {
  await requireRole("admin", "/desk/reviews");
  const pending = await listPendingReviews();

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Admin Desk</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Reviews</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Guest reviews awaiting moderation. Approve to publish on the experience
          page, or reject to remove. Reviews stay private until you approve them.
        </p>
      </header>

      {pending.length === 0 ? (
        <p className="mt-10 rounded-xl2 border border-dashed border-ink/20 py-16 text-center text-ink-muted">
          Nothing to moderate. New guest reviews appear here for approval.
        </p>
      ) : (
        <div className="mt-10 space-y-5">
          {pending.map((r) => (
            <div key={r.id} className="rounded-xl2 border border-ink/10 bg-sand-50 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <Stars value={r.ratingOverall} className="text-lg" />
                    <span className="font-medium text-ink">{r.ratingOverall}/5</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {r.guestName} ·{" "}
                    {r.experienceSlug ? (
                      <Link href={`/experiences/${r.experienceSlug}`} className="hover:underline">{r.experienceName ?? r.experienceSlug}</Link>
                    ) : (
                      r.experienceName ?? "—"
                    )}{" "}
                    · {formatFullDate(r.createdAt)}
                  </p>
                </div>
              </div>
              {r.body && <blockquote className="mt-4 text-ink-soft">{r.body}</blockquote>}
              <div className="mt-5 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
                <form action={moderateReview}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="action" value="approve" />
                  <button className="rounded-full bg-palm-500 px-5 py-2 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-palm-600">Approve &amp; publish</button>
                </form>
                <form action={moderateReview}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="action" value="reject" />
                  <button className="rounded-full border border-ink/15 px-5 py-2 text-xs uppercase tracking-eyebrow text-ink-muted hover:border-clay-500 hover:text-clay-600">Reject</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
