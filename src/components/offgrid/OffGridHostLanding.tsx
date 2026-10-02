import Image from "next/image";
import Link from "next/link";
import { hero } from "@/lib/images";
import { OFFGRID_STEPS } from "@/lib/offgrid/schema";
import { SPEND_TIME_OFF_GRID } from "@/lib/brand/config";

/** "List your land" — the Spend Time Off Grid host page. */
export function OffGridHostLanding({ canBuild }: { canBuild: boolean }) {
  const href = canBuild ? "/studio/retreats/new" : "/host/apply";
  const label = canBuild ? "Start your listing" : "Apply to host";
  const pct = (SPEND_TIME_OFF_GRID.fixedCommissionBps ?? 0) / 100;
  return (
    <>
      <section className="relative flex min-h-[78vh] items-end overflow-hidden">
        <Image src={hero("stog-host-landing")} alt="A host's vegetable beds and cabin at the edge of a forest" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-900/90 via-forest-900/40 to-forest-900/25" />
        <div className="container-editorial relative pb-16 pt-28 text-sand-50 sm:pb-20">
          <p className="eyebrow text-sand-100/80">List your land</p>
          <h1 className="mt-4 max-w-3xl text-display-lg font-semibold">Have land worth experiencing?</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-sand-100/90">
            Have a farm, homestead, eco-project or piece of land? Invite people to experience it. You decide
            what guests do, what you provide and what the stay costs.
          </p>
          <div className="mt-8">
            <Link href={href} className="inline-flex rounded-full bg-sand-50 px-7 py-3.5 text-xs font-medium uppercase tracking-[0.16em] text-forest-800 hover:bg-sand-100">
              {label}
            </Link>
          </div>
        </div>
      </section>

      <section className="container-editorial py-20 sm:py-28">
        <div className="grid gap-10 md:grid-cols-3">
          {[
            { t: "Your place, your terms", d: "Set the hours, the days, the food and the bed. Travellers see exactly what the exchange is before they book." },
            { t: "People who want to be there", d: "Travellers come to contribute, learn and live the way you do — not to be served, and not to be employed." },
            { t: "Simple, transparent money", d: `Charge per day, per week or per stay — or nothing at all. Travellers pay your price; we take ${pct}% of paid bookings. Free stays cost you nothing.` },
          ].map((c) => (
            <div key={c.t} className="reveal">
              <p className="font-display text-2xl font-semibold text-ink">{c.t}</p>
              <p className="mt-3 leading-relaxed text-ink-muted">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-forest-800 py-20 text-sand-50 sm:py-28">
        <div className="container-editorial">
          <div className="max-w-2xl reveal">
            <p className="eyebrow text-sand-100/70">How listing works</p>
            <h2 className="mt-3 text-headline font-semibold">Apply, then build your listing step by step.</h2>
            <p className="mt-4 text-sand-100/80">
              We review every host by hand. Once you&apos;re in, a guided builder walks you through everything
              travellers need to know. It saves as you go.
            </p>
          </div>
          <ol className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {OFFGRID_STEPS.map((s, i) => (
              <li key={s} className="rounded-xl border border-sand-50/15 p-4 reveal" style={{ transitionDelay: `${(i % 5) * 50}ms` }}>
                <span className="font-display text-lg text-sand-100/60">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1 text-sm text-sand-50">{s}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12">
            <Link href={href} className="inline-flex rounded-full bg-sand-50 px-7 py-3.5 text-xs font-medium uppercase tracking-[0.16em] text-forest-800 hover:bg-sand-100">
              {label}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
