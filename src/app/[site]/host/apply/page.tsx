import type { Metadata } from "next";
import Link from "next/link";
import { ApplyForm } from "@/components/host/ApplyForm";
import { getSessionUser } from "@/lib/auth/session";
import { brandFromParams, type SiteParams } from "@/lib/brand/site";

export function generateMetadata({ params }: { params: SiteParams }): Metadata {
  const brand = brandFromParams(params);
  return brand.theme === "earth"
    ? { title: "List your land", description: "Apply to host travellers on your farm, homestead or off-grid project with Spend Time Off Grid." }
    : { title: "Apply to host", description: "Apply to host a 7 or 14-day retreat with Paradise Beyond." };
}

export const dynamic = "force-dynamic";

export default async function ApplyPage({ params }: { params: SiteParams }) {
  const brand = brandFromParams(params);
  const offGrid = brand.theme === "earth";
  const user = await getSessionUser();
  const next = encodeURIComponent("/host/apply");

  return (
    <div className="container-editorial py-16 sm:py-20">
      <header className="max-w-2xl">
        <p className={offGrid ? "eyebrow text-forest-700" : "eyebrow text-ocean-700"}>{brand.hostCta.label}</p>
        <h1 className="mt-3 text-display font-semibold text-ink">Apply to host</h1>
        <p className="mt-4 text-lg text-ink-muted">
          {offGrid ? (
            <>Tell us about your place and what travellers would help with. If it&apos;s
            a fit, we&apos;ll open the listing builder so you can invite people to experience it.</>
          ) : (
            <>Tell us about you and the experience you have in mind. If it&apos;s a
            fit, we&apos;ll open the Retreat Builder and help you bring it to life.</>
          )}
        </p>
      </header>

      {user ? (
        <div className="mt-10 max-w-3xl">
          <ApplyForm variant={offGrid ? "offgrid" : "retreat"} />
        </div>
      ) : (
        <div className="mt-10 max-w-xl rounded-xl2 border border-ink/10 bg-sand-50 p-8">
          <h2 className="font-display text-2xl font-semibold text-ink">First, create your account</h2>
          <p className="mt-2 text-ink-muted">
            You&apos;ll apply from your account so we can open the Retreat Builder for
            you the moment you&apos;re approved — and so your application, drafts and
            payouts all live in one place. It takes a minute.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/signup?next=${next}`} className="rounded-full bg-clay-500 px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600">
              Create an account
            </Link>
            <Link href={`/login?next=${next}`} className="rounded-full border border-ink/15 px-6 py-3 text-xs uppercase tracking-eyebrow text-ink-soft hover:border-ink/40">
              I already have one
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
