import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getAllHosts } from "@/lib/data/repository";
import { getAllOverrides, getAllOriginals } from "@/lib/media/store";
import { slotKey } from "@/lib/images";
import { HostEditor } from "@/components/dashboard/HostEditor";
import { MediaSlotCard } from "@/components/dashboard/MediaSlotCard";
import type { Slot } from "@/lib/media/registry";

export const metadata: Metadata = { title: "Edit host", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DeskHostEditPage({ params }: { params: { slug: string } }) {
  await requireRole("admin", `/desk/hosts/${params.slug}`);
  const hosts = await getAllHosts();
  const host = hosts.find((h) => h.slug === params.slug);
  if (!host) notFound();

  const [overrides, originals] = await Promise.all([getAllOverrides(), getAllOriginals()]);
  const version = Date.now();

  // Photo slots for this host — same keys the media manager and the site use.
  const portrait: Slot = { key: slotKey(host.imageSeed), seed: host.imageSeed, label: "Portrait photo", w: 600, h: 720 };
  const cover: Slot = { key: slotKey(`host-cover-${host.imageSeed}`), seed: `host-cover-${host.imageSeed}`, label: "Cover photo", w: 2000, h: 1200 };

  return (
    <div className="container-editorial py-12">
      <Link href="/desk/hosts" className="text-xs uppercase tracking-eyebrow text-ink-muted hover:text-ink">← All hosts</Link>
      <header className="mt-3">
        <p className="eyebrow text-ocean-700">Admin Desk · Hosts</p>
        <h1 className="mt-2 text-display font-semibold text-ink">{host.name}</h1>
        <Link href={`/hosts/${host.slug}`} className="mt-1 inline-block text-xs uppercase tracking-eyebrow text-ocean-700 hover:underline">
          View public profile →
        </Link>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold text-ink">Profile</h2>
          <HostEditor
            slug={host.slug}
            initial={{
              name: host.name,
              headline: host.headline ?? "",
              bio: host.bio ?? "",
              specialisms: host.specialisms ?? [],
              verified: host.verified,
            }}
          />
        </section>

        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold text-ink">Photos</h2>
          <div className="space-y-5">
            <MediaSlotCard slot={portrait} override={overrides[portrait.key]} original={originals[portrait.key]} version={version} />
            <MediaSlotCard slot={cover} override={overrides[cover.key]} original={originals[cover.key]} version={version} />
          </div>
        </section>
      </div>
    </div>
  );
}
