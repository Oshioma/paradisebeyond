import type { Metadata } from "next";
import { ApplyForm } from "@/components/host/ApplyForm";

export const metadata: Metadata = {
  title: "Apply to host",
  description: "Apply to host a 7 or 14-day retreat with Paradise Beyond.",
};

export default function ApplyPage() {
  return (
    <div className="container-editorial py-16 sm:py-20">
      <header className="max-w-2xl">
        <p className="eyebrow text-ocean-700">Host a Retreat</p>
        <h1 className="mt-3 text-display font-semibold text-ink">Apply to host</h1>
        <p className="mt-4 text-lg text-ink-muted">
          Tell us about you and the experience you have in mind. If it&apos;s a
          fit, we&apos;ll open the Retreat Builder and help you bring it to life.
        </p>
      </header>
      <div className="mt-10 max-w-3xl">
        <ApplyForm />
      </div>
    </div>
  );
}
