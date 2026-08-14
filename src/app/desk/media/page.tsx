import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getMediaGroups, type Slot } from "@/lib/media/registry";
import { getAllOverrides } from "@/lib/media/store";
import { resetImage } from "./actions";
import { MediaBulkActions } from "@/components/dashboard/MediaBulkActions";
import { MediaSlotForms } from "@/components/dashboard/MediaSlotForms";

export const metadata: Metadata = { title: "Media", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MediaPage() {
  await requireRole("admin", "/desk/media");
  const groups = getMediaGroups();
  const overrides = await getAllOverrides();
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
        <MediaBulkActions />
        <p className="mt-2 text-xs text-ink-muted">
          Demo photography uses generic stock and resolves on a live deployment
          (external image hosts are blocked in this sandbox). Replace any slot
          with real photography above.
        </p>
      </header>

      <div className="mt-10 space-y-12">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="mb-4 font-display text-2xl font-semibold text-ink">{g.title}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {g.slots.map((s) => (
                <SlotCard key={s.key} slot={s} override={overrides[s.key]} version={version} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SlotCard({ slot, override, version }: { slot: Slot; override?: string; version: number }) {
  const previewSrc = `/api/img?seed=${encodeURIComponent(slot.key)}&w=${slot.w}&h=${slot.h}&v=${version}`;
  return (
    <div className="overflow-hidden rounded-xl2 border border-ink/10 bg-sand-50">
      <div className="relative aspect-[16/10] bg-sand-200">
        {/* Plain <img> so the override redirect and cache-bust are honoured. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewSrc} alt={slot.label} className="h-full w-full object-cover" />
        {override && (
          <span className="absolute left-2 top-2 rounded-full bg-palm-500 px-2.5 py-1 text-[0.6rem] font-medium uppercase tracking-eyebrow text-sand-50">
            Custom
          </span>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="font-medium text-ink">{slot.label}</p>
          <p className="font-mono text-[0.66rem] text-ink-muted">{slot.key}</p>
        </div>

        <MediaSlotForms seed={slot.key} />

        {override && (
          <form action={resetImage}>
            <input type="hidden" name="seed" value={slot.key} />
            <button className="text-[0.66rem] uppercase tracking-eyebrow text-ink-muted underline-offset-4 hover:text-clay-600 hover:underline">
              Reset to placeholder
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
