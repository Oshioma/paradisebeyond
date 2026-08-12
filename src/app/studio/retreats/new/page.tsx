import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { CATEGORIES, categoryLabel } from "@/lib/data/categories";
import { DESTINATIONS } from "@/lib/data/destinations";
import { getHost } from "@/lib/data/hosts";
import { getDraft } from "@/lib/retreat/store";
import { emptyDraft, type RetreatDraft } from "@/lib/retreat/schema";
import { RetreatWizard } from "@/components/retreat/RetreatWizard";

export const metadata: Metadata = { title: "Build a retreat", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewRetreatPage({ searchParams }: { searchParams: { id?: string } }) {
  const user = await requireRole("host", "/studio/retreats/new");

  // Stable draft id so autosave/resume works across visits.
  if (!searchParams.id) {
    redirect(`/studio/retreats/new?id=r-${crypto.randomUUID().slice(0, 8)}`);
  }
  const id = searchParams.id;

  const host = getHost(user.hostSlug ?? "amina-yusuf");
  const existing = await getDraft(id);
  const initial: RetreatDraft =
    existing ?? {
      ...emptyDraft(id),
      hostName: host?.name ?? user.name,
      hostHeadline: host?.headline ?? "",
      hostBio: host?.bio ?? "",
    };

  return (
    <div className="container-editorial py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/studio/retreats" className="text-sm text-ink-muted hover:text-ink">← My Retreats</Link>
          <h1 className="mt-2 text-display font-semibold text-ink">Build your retreat</h1>
          <p className="mt-2 max-w-xl text-ink-muted">
            Sixteen simple steps. Your work saves as you go — leave and come back
            any time. We&apos;ll review it before anything goes live.
          </p>
        </div>
      </div>

      <RetreatWizard
        initialDraft={initial}
        categories={CATEGORIES.map((c) => ({ value: c.slug, label: categoryLabel(c) }))}
        destinations={DESTINATIONS.map((d) => ({ slug: d.slug, name: d.name, country: d.country }))}
      />
    </div>
  );
}
