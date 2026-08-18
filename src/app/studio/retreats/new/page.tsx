import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { CATEGORIES, categoryLabel } from "@/lib/data/categories";
import { DESTINATIONS } from "@/lib/data/destinations";
import { getHost, getExperiencesByHost } from "@/lib/data/repository";
import { getDraft } from "@/lib/retreat/store";
import { emptyDraft, type RetreatDraft } from "@/lib/retreat/schema";
import { RetreatWizard } from "@/components/retreat/RetreatWizard";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ownsDraft } from "@/lib/retreat/coHosts";

export const metadata: Metadata = { title: "Build a retreat", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewRetreatPage({ searchParams }: { searchParams: { id?: string } }) {
  const user = await requireRole("host", "/studio/retreats/new");

  // Stable draft id so autosave/resume works across visits.
  if (!searchParams.id) {
    redirect(`/studio/retreats/new?id=r-${crypto.randomUUID().slice(0, 8)}`);
  }
  const id = searchParams.id;

  const host = user.hostSlug ? await getHost(user.hostSlug) : undefined;
  const existing = await getDraft(id);
  // Is this draft already a live listing the host is reopening to edit? If so,
  // be explicit that changes go back for review and the live listing is safe
  // until then.
  const isLiveListing = user.hostSlug
    ? (await getExperiencesByHost(user.hostSlug)).some((e) => e.retreatDraftId === id)
    : false;
  // The main host (owner) or an admin manages co-hosts; co-hosts can edit only.
  const isOwner = user.role === "admin" || !existing || (await ownsDraft(user.id, id));
  // For a brand-new draft, carry over what the host already told us in their
  // approved application — the retreat idea (used to prefill the AI draft) plus
  // destination and duration — so they don't retype it.
  let applicationBrief = "";
  let appSeed: Partial<RetreatDraft> = {};
  if (!existing && isSupabaseConfigured()) {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const { data: app } = await createServiceRoleClient()
      .from("host_applications")
      .select("retreat_idea, description, destination, duration")
      .eq("applicant_id", user.id)
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (app) {
      applicationBrief = [app.retreat_idea, app.description].map((s) => (s ?? "").trim()).filter(Boolean).join("\n\n");
      const dur = Number(app.duration) === 14 ? 14 : Number(app.duration) === 7 ? 7 : undefined;
      const wanted = String(app.destination ?? "").toLowerCase();
      const match = wanted ? DESTINATIONS.find((d) => wanted.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(wanted)) : undefined;
      appSeed = {
        ...(dur ? { duration: dur as 7 | 14, durationChosen: true } : {}),
        ...(match ? { destinationSlug: match.slug, destinationName: match.name, country: match.country } : {}),
      };
    }
  }

  const initial: RetreatDraft = existing
    ? {
        ...existing,
        // Migrate older single-property drafts to the hotels list.
        hotels: existing.hotels?.length
          ? existing.hotels
          : [{ name: existing.propertyName ?? "", description: existing.propertyDescription ?? "" }],
      }
    : {
        ...emptyDraft(id),
        hostName: host?.name ?? user.name,
        hostHeadline: host?.headline ?? "",
        hostBio: host?.bio ?? "",
        ...appSeed,
      };

  return (
    <div className="container-editorial py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/studio/retreats" className="text-sm text-ink-muted hover:text-ink">← My Retreats</Link>
          <h1 className="mt-2 text-display font-semibold text-ink">{isLiveListing ? "Edit your retreat" : "Build your retreat"}</h1>
          <p className="mt-2 max-w-xl text-ink-muted">
            {isLiveListing ? (
              <>Update anything you like. Your work saves as you go, and when
              you&apos;re done we&apos;ll review your changes before they go live —
              your current listing stays exactly as it is until then.</>
            ) : (
              <>Sixteen simple steps. Your work saves as you go — leave and come
              back any time. We&apos;ll review it before anything goes live.</>
            )}
          </p>
        </div>
      </div>

      <RetreatWizard
        initialDraft={initial}
        categories={CATEGORIES.map((c) => ({ value: c.slug, label: categoryLabel(c) }))}
        destinations={DESTINATIONS.map((d) => ({ slug: d.slug, name: d.name, country: d.country }))}
        isLiveListing={isLiveListing}
        applicationBrief={applicationBrief}
        draftId={id}
        isOwner={isOwner}
      />
    </div>
  );
}
