import type { Metadata } from "next";
import Image from "next/image";
import { hero, img } from "@/lib/images";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Host a retreat",
  description:
    "Bring the experience. We'll help you bring the people. Apply to host a 7 or 14-day retreat with Paradise Beyond.",
};

const STEPS = [
  "The basics", "7 or 14 days", "Location", "Dates", "Accommodation", "What's included",
  "Activities", "Itinerary", "Rooms", "Pricing", "Deposit & terms", "Cancellation",
  "Photos", "Host profile", "Preview", "Submit for approval",
];

export default function HostLandingPage() {
  return (
    <>
      <section className="relative flex min-h-[80vh] items-end overflow-hidden">
        <Image src={hero("host-landing")} alt="A host leading a beach yoga session" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ocean-700/90 via-ocean-700/40 to-ocean-700/30" />
        <div className="container-editorial relative pb-20 pt-32 text-sand-50">
          <p className="eyebrow text-sand-100/80">Host a Retreat</p>
          <h1 className="mt-4 max-w-3xl text-display-lg font-semibold">
            Bring the experience. We&apos;ll help you bring the people.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-sand-100/90">
            Yoga teachers, chefs, dive centres, artists, farmers, guides — if you
            can create something extraordinary, Paradise Beyond helps you fill it,
            handle the money and look world-class doing it.
          </p>
          <div className="mt-8">
            <Button href="/host/apply" size="lg" variant="primary">Apply to Host</Button>
          </div>
        </div>
      </section>

      {/* Why host */}
      <section className="container-editorial py-20 sm:py-28">
        <div className="grid gap-10 md:grid-cols-3">
          {[
            { t: "You bring the magic", d: "Your teaching, your kitchen, your reef, your eye. The thing only you can lead." },
            { t: "We bring the craft", d: "A beautiful listing, curated discovery, secure deposits and balances, and travellers who are ready to book." },
            { t: "Curated, not crowded", d: "We're not chasing 500 mediocre retreats. We want a small number of exceptional ones — and yours could be one." },
          ].map((c) => (
            <div key={c.t} className="reveal">
              <p className="font-display text-2xl font-semibold text-ink">{c.t}</p>
              <p className="mt-3 leading-relaxed text-ink-muted">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Builder overview */}
      <section className="bg-ink py-20 text-sand-50 sm:py-28">
        <div className="container-editorial">
          <div className="max-w-2xl reveal">
            <p className="eyebrow text-sand-100/70">The Retreat Builder</p>
            <h2 className="mt-3 text-headline font-semibold">Sixteen simple steps. Genuinely easy.</h2>
            <p className="mt-4 text-sand-100/80">
              A guided wizard takes you from a blank page to a professional listing.
              AI can draft your name, description, itinerary and more — you approve
              every word before anything goes live.
            </p>
          </div>
          <ol className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s} className="rounded-xl border border-sand-50/15 p-4 reveal" style={{ transitionDelay: `${(i % 4) * 50}ms` }}>
                <span className="font-display text-lg text-sand-100/60">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1 text-sm text-sand-50">{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* How approval works */}
      <section className="container-editorial py-20 sm:py-28">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="reveal">
            <p className="eyebrow text-ocean-700">How it works</p>
            <h2 className="mt-3 text-headline font-semibold text-ink">Apply first. Build once you&apos;re in.</h2>
            <ol className="mt-6 space-y-4">
              {[
                ["Apply", "Tell us about you and the experience you have in mind."],
                ["We review", "Our team reviews every application by hand. Curated means curated."],
                ["Build", "Once approved, the Retreat Builder walks you through the full listing."],
                ["Go live", "We give it a final check, award Verified where earned, and open your dates."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-clay-500 text-sm font-semibold text-sand-50">{i + 1}</span>
                  <div>
                    <p className="font-medium text-ink">{t}</p>
                    <p className="text-sm text-ink-muted">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8">
              <Button href="/host/apply" variant="ink">Start your application</Button>
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl2 reveal">
            <Image src={img("host-build", 900, 1125)} alt="A host planning a retreat" fill sizes="(max-width: 768px) 90vw, 45vw" className="object-cover" />
          </div>
        </div>
      </section>
    </>
  );
}
