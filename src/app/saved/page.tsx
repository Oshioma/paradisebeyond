import type { Metadata } from "next";
import { getAllExperiences } from "@/lib/data/repository";
import { SavedList } from "@/components/wishlist/SavedList";

export const metadata: Metadata = {
  title: "My saved experiences",
  description: "The experiences you've saved on Paradise Beyond.",
  robots: { index: false },
};

export default async function SavedPage() {
  const all = await getAllExperiences();

  return (
    <div className="container-editorial py-16 sm:py-20">
      <header className="max-w-2xl">
        <p className="eyebrow text-ocean-700">Your collection</p>
        <h1 className="mt-3 text-display font-semibold text-ink">My saved experiences</h1>
        <p className="mt-4 text-lg text-ink-muted">
          The trips you&apos;re dreaming about. Come back when you&apos;re ready to choose your dates.
        </p>
      </header>
      <div className="mt-12">
        <SavedList all={all} />
      </div>
    </div>
  );
}
