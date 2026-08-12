import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { listSubmissions } from "@/lib/retreat/store";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { reviewSubmission } from "./actions";

export const metadata: Metadata = { title: "Retreat submissions", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  await requireRole("admin", "/desk/submissions");
  const submissions = await listSubmissions();

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Admin Desk</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Retreat submissions</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Retreats built by hosts, awaiting review. Approve to let the host take
          it live, or request changes with a note. Nothing publishes on its own.
        </p>
      </header>

      {submissions.length === 0 ? (
        <p className="mt-10 rounded-xl2 border border-dashed border-ink/20 py-16 text-center text-ink-muted">
          No submissions yet. When a host submits from the Retreat Builder, it appears here.
        </p>
      ) : (
        <div className="mt-10 space-y-5">
          {submissions.map((s) => (
            <div key={s.id} className="rounded-xl2 border border-ink/10 bg-sand-50 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-xl font-semibold text-ink">{s.name || "Untitled"}</h2>
                    <StatusPill status={s.status} />
                  </div>
                  <p className="text-sm text-ink-muted">{s.hostName} · {s.duration} days · {s.locationLabel}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium text-ink">{s.currency} {s.priceFromUsd} pp</p>
                  <p className="text-ink-muted">{s.departures.filter((d) => d.startDate).length} departures · max {s.maxGroupSize}</p>
                </div>
              </div>

              <p className="mt-3 text-ink-soft">{s.strapline}</p>
              <div className="mt-3 grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
                <p><span className="font-medium text-ink">Included:</span> {s.inclusions.filter(Boolean).slice(0, 4).join(", ") || "—"}</p>
                <p><span className="font-medium text-ink">Rooms:</span> {s.rooms.map((r) => r.name).filter(Boolean).join(", ") || "—"}</p>
              </div>
              {s.reviewNotes && <p className="mt-3 rounded-lg bg-clay-500/10 px-3 py-2 text-sm text-clay-600">Note to host: {s.reviewNotes}</p>}

              <form action={reviewSubmission} className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-4">
                <input type="hidden" name="id" value={s.id} />
                <input name="notes" placeholder="Optional note to the host…" className="min-w-[200px] flex-1 rounded-lg border border-ink/15 bg-sand-50 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500" />
                <StatusBtn status="approved" label="Approve" variant="primary" disabled={s.status === "approved"} />
                <StatusBtn status="under_review" label="Under review" disabled={s.status === "under_review"} />
                <StatusBtn status="changes_requested" label="Request changes" />
                <StatusBtn status="rejected" label="Reject" variant="danger" disabled={s.status === "rejected"} />
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBtn({ status, label, variant, disabled }: { status: string; label: string; variant?: "primary" | "danger"; disabled?: boolean }) {
  const cls = variant === "primary"
    ? "bg-palm-500 text-sand-50 hover:bg-palm-600"
    : variant === "danger"
      ? "border border-ink/15 text-ink-muted hover:border-clay-500 hover:text-clay-600"
      : "border border-ink/15 text-ink-soft hover:border-ink/40";
  return (
    <button name="status" value={status} disabled={disabled} className={`rounded-full px-4 py-2 text-xs uppercase tracking-eyebrow transition-colors disabled:opacity-40 ${cls}`}>
      {label}
    </button>
  );
}
