import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getApplications } from "@/lib/data/applications";
import { StatusPill } from "@/components/dashboard/StatusPill";
import { setApplicationStatus } from "./actions";

export const metadata: Metadata = { title: "Applications", robots: { index: false } };

export default async function ApplicationsPage() {
  await requireRole("admin", "/desk/applications");
  const apps = await getApplications();

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Admin Desk</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Host applications</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Every application is reviewed by hand. Approve to open the Retreat
          Builder for the host — nothing is auto-published.
        </p>
      </header>

      <div className="mt-10 space-y-5">
        {apps.map((a) => (
          <div key={a.id} className="rounded-xl2 border border-ink/10 bg-sand-50 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-xl font-semibold text-ink">{a.name}</h2>
                  <StatusPill status={a.status} />
                </div>
                <p className="text-sm text-ink-muted">{a.email} · applied {a.createdAt}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium text-ink">{a.destination} · {a.duration} days</p>
                <p className="text-ink-muted">~${a.expectedPriceUsd} pp · {a.expectedGroupSize} guests · {a.approxDates}</p>
              </div>
            </div>

            <p className="mt-4 text-ink-soft">{a.retreatIdea}</p>
            <div className="mt-3 grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
              <p><span className="font-medium text-ink">Background:</span> {a.background}</p>
              <p><span className="font-medium text-ink">Accommodation:</span> {a.accommodation}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
              <StatusButton id={a.id} status="approved" label="Approve" variant="primary" disabled={a.status === "approved"} />
              <StatusButton id={a.id} status="under_review" label="Mark under review" disabled={a.status === "under_review"} />
              <StatusButton id={a.id} status="changes_requested" label="Request changes" disabled={a.status === "changes_requested"} />
              <StatusButton id={a.id} status="rejected" label="Reject" variant="danger" disabled={a.status === "rejected"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusButton({
  id,
  status,
  label,
  variant,
  disabled,
}: {
  id: string;
  status: string;
  label: string;
  variant?: "primary" | "danger";
  disabled?: boolean;
}) {
  const cls =
    variant === "primary"
      ? "bg-palm-500 text-sand-50 hover:bg-palm-600"
      : variant === "danger"
        ? "border border-ink/15 text-ink-muted hover:border-clay-500 hover:text-clay-600"
        : "border border-ink/15 text-ink-soft hover:border-ink/40";
  return (
    <form action={setApplicationStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        disabled={disabled}
        className={`rounded-full px-4 py-2 text-xs uppercase tracking-eyebrow transition-colors disabled:opacity-40 ${cls}`}
      >
        {label}
      </button>
    </form>
  );
}
