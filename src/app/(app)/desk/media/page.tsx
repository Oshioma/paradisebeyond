import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getMediaGroups } from "@/lib/media/registry";
import { getAllOverrides, getAllOriginals, getDefaults } from "@/lib/media/store";
import { getAllHosts } from "@/lib/data/repository";
import { MediaBulkActions } from "@/components/dashboard/MediaBulkActions";
import { MediaSlotCard } from "@/components/dashboard/MediaSlotCard";

export const metadata: Metadata = { title: "Media", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MediaPage() {
  await requireRole("admin", "/desk/media");
  const hosts = await getAllHosts();
  const groups = getMediaGroups(hosts);
  const overrides = await getAllOverrides();
  const originals = await getAllOriginals();
  const hasDefaults = Object.keys((await getDefaults()).map).length > 0;
  const version = Date.now(); // cache-bust previews after a change
  const totalSlots = groups.reduce((n, g) => n + g.slots.length, 0);
  const set = Object.keys(overrides).length;

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Admin Desk</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Media</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Replace the placeholder for any image slot — upload a file or paste an
          image URL. Changes appear everywhere that image is used, immediately.
          {" "}
          <span className="text-ink">{set}</span> of {totalSlots} slots customised.
        </p>
        <MediaBulkActions hasDefaults={hasDefaults} />
        <p className="mt-2 text-xs text-ink-muted">
          {hasDefaults
            ? "“Save current as default” overwrites your saved set with whatever’s showing now. “Restore default images” brings that saved set back."
            : "Tip: once your images look right, “Save current as default” snapshots them — then “Restore default images” brings them back anytime. Until you save a set, that button loads generic demo stock instead."}
        </p>
      </header>

      <div className="mt-10 space-y-12">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="mb-4 font-display text-2xl font-semibold text-ink">{g.title}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {g.slots.map((s) => (
                <MediaSlotCard key={s.key} slot={s} override={overrides[s.key]} original={originals[s.key]} version={version} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
