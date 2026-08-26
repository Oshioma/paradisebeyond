import type { Metadata } from "next";
import Image from "next/image";
import { getInvite, getExperienceSlugById, getPhotosForBooking, hasReview } from "@/lib/memories/store";
import { getExperienceBySlug, getHost } from "@/lib/data/repository";
import { hero } from "@/lib/images";
import { siteUrl } from "@/lib/siteUrl";
import { GuestPhotoUploader, GuestReviewForm } from "@/components/memories/GuestMemories";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Share your memories", robots: { index: false } };

const DEFAULT_BRAND = "#B4633B";

/**
 * The magic-link landing page from a host's "past guests" email: add photos
 * (optionally pinned to a retreat day) and review the retreat. The token in
 * the URL — only ever sent to the guest's own inbox — is the authentication.
 */
export default async function MemoriesPage({ params }: { params: { token: string } }) {
  const invite = await getInvite(params.token);
  const slug = invite ? await getExperienceSlugById(invite.experienceId) : null;
  const e = slug ? await getExperienceBySlug(slug) : undefined;

  if (!invite || !e) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand-50 px-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">This link isn&apos;t valid any more</h1>
          <p className="mt-3 text-ink-muted">
            Ask your host to send a fresh invitation, or visit{" "}
            <a href={siteUrl()} className="underline">Paradise Beyond</a>.
          </p>
        </div>
      </div>
    );
  }

  const host = await getHost(e.hostSlugs[0]);
  const brand = host?.brandColor || DEFAULT_BRAND;
  const [myPhotos, reviewed] = await Promise.all([getPhotosForBooking(invite.bookingId), hasReview(invite.bookingId)]);
  const firstName = (invite.guestName ?? "").split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-sand-50 text-ink">
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-sand-50/90 backdrop-blur">
        <div className="container-editorial flex items-center justify-between gap-3 py-3">
          {host?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={host.logoUrl} alt={e.name} className="h-8 w-auto max-w-[180px] object-contain" />
          ) : (
            <span className="truncate font-display text-lg font-semibold text-ink">{e.name}</span>
          )}
          <span className="text-xs uppercase tracking-eyebrow text-ink-muted">Your memories</span>
        </div>
      </header>

      <section className="relative flex min-h-[38vh] items-end overflow-hidden">
        <Image src={hero(e.heroImageSeed)} alt={e.name} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent" />
        <div className="container-editorial relative w-full pb-10 pt-20 text-sand-50">
          <p className="eyebrow text-sand-100/90">{e.location}</p>
          <h1 className="mt-2 max-w-3xl text-display font-semibold">Welcome back, {firstName}.</h1>
          <p className="mt-2 max-w-xl text-sand-100/90">
            Thank you for being part of <strong>{e.name}</strong>. Share your photos and tell future guests what
            it was like.
          </p>
        </div>
      </section>

      <div className="container-editorial max-w-3xl space-y-14 py-14">
        <section id="photos" className="scroll-mt-24">
          <p className="eyebrow" style={{ color: brand }}>Your photos</p>
          <h2 className="mt-2 text-headline font-semibold text-ink">Add your pictures</h2>
          <p className="mt-2 text-ink-muted">
            Pick the day they&apos;re from — or add them to the whole retreat — and your host can feature them on
            the retreat&apos;s page.
          </p>
          <div className="mt-6">
            <GuestPhotoUploader
              token={invite.token}
              accent={brand}
              days={e.itinerary.map((d) => ({ day: d.day, title: d.title }))}
              initialPhotos={myPhotos.map((p) => ({ id: p.id, url: p.url, dayNumber: p.dayNumber }))}
            />
          </div>
        </section>

        <section id="review" className="scroll-mt-24">
          <p className="eyebrow" style={{ color: brand }}>Your review</p>
          <h2 className="mt-2 text-headline font-semibold text-ink">How was it, really?</h2>
          <p className="mt-2 text-ink-muted">Your review is published after a quick check by our team.</p>
          <div className="mt-6">
            {reviewed ? (
              <div className="rounded-xl2 border border-palm-500/40 bg-palm-500/5 p-6 text-sm text-palm-600">
                You&apos;ve already reviewed this retreat — thank you!
              </div>
            ) : (
              <GuestReviewForm token={invite.token} accent={brand} />
            )}
          </div>
        </section>
      </div>

      <footer className="border-t border-ink/10 py-8 text-center text-xs text-ink-muted">
        <a href={siteUrl()} className="hover:text-ink">Powered by Paradise Beyond</a>
      </footer>
    </div>
  );
}
