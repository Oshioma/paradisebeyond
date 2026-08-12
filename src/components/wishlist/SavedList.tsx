"use client";

import Link from "next/link";
import type { Experience } from "@/lib/types";
import { useWishlist } from "./WishlistProvider";
import { ExperienceCard } from "@/components/experience/ExperienceCard";

export function SavedList({ all }: { all: Experience[] }) {
  const { saved, ready } = useWishlist();

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-xl2 bg-sand-100" />;
  }

  const savedExperiences = all.filter((e) => saved.includes(e.slug));

  if (savedExperiences.length === 0) {
    return (
      <div className="rounded-xl2 border border-dashed border-ink/20 py-20 text-center">
        <p className="font-display text-2xl text-ink">Nothing saved yet.</p>
        <p className="mx-auto mt-2 max-w-md text-ink-muted">
          Tap the ♥ on any experience to keep it here. Create an account and your
          saved experiences follow you everywhere.
        </p>
        <Link
          href="/experiences"
          className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-ink-soft"
        >
          Browse experiences
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {savedExperiences.map((e) => (
        <ExperienceCard key={e.slug} experience={e} />
      ))}
    </div>
  );
}
