import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { hero, portrait } from "@/lib/images";
import { HOSTS, getHost } from "@/lib/data/hosts";
import { getExperiencesByHost } from "@/lib/data/repository";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { VerifiedBadge } from "@/components/ui/Badge";

export async function generateStaticParams() {
  return HOSTS.map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const h = getHost(params.slug);
  if (!h) return { title: "Host not found" };
  return {
    title: h.name,
    description: `${h.headline}. ${h.bio.slice(0, 140)}`,
    openGraph: { title: `${h.name} · Paradise Beyond host`, description: h.headline, images: [portrait(h.imageSeed)] },
  };
}

export default async function HostPage({ params }: { params: { slug: string } }) {
  const h = getHost(params.slug);
  if (!h) notFound();
  const experiences = await getExperiencesByHost(h.slug);

  return (
    <>
      <section className="relative flex min-h-[46vh] items-end overflow-hidden">
        <Image src={hero(`host-cover-${h.imageSeed}`)} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-ink/20" />
      </section>

      <div className="container-editorial -mt-24 relative pb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <Image
            src={portrait(h.imageSeed)}
            alt={h.name}
            width={180}
            height={216}
            className="h-48 w-40 flex-none rounded-xl2 border-4 border-sand-50 object-cover shadow-lift"
          />
          <div className="pb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-display font-semibold text-ink">{h.name}</h1>
              {h.verified && <VerifiedBadge />}
            </div>
            <p className="mt-1 text-lg text-ocean-700">{h.headline}</p>
            <p className="mt-1 text-sm text-ink-muted">Hosting with Paradise Beyond since {h.since}</p>
          </div>
        </div>
      </div>

      <div className="container-editorial grid gap-12 pb-16 lg:grid-cols-[1fr_320px]">
        <div className="max-w-2xl">
          <p className="text-lg leading-relaxed text-ink-soft">{h.bio}</p>
          {h.socials.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {h.socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  className="rounded-full border border-ink/15 px-4 py-2 text-xs uppercase tracking-eyebrow text-ink-soft transition-colors hover:border-ink/40"
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6 rounded-xl2 bg-sand-100 p-6">
          <div>
            <p className="eyebrow text-ocean-700">Qualifications</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              {h.qualifications.map((q) => <li key={q}>{q}</li>)}
            </ul>
          </div>
          <div>
            <p className="eyebrow text-ocean-700">Specialisms</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {h.specialisms.map((s) => (
                <span key={s} className="rounded-full bg-sand-50 px-3 py-1 text-xs text-ink-soft">{s}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {experiences.length > 0 && (
        <section className="container-editorial pb-24">
          <p className="eyebrow text-ocean-700">Upcoming</p>
          <h2 className="mt-2 text-headline font-semibold text-ink">
            {h.name.split(" ")[0]}&apos;s Paradise Beyond experiences
          </h2>
          <div className="mt-10">
            <ExperienceGrid experiences={experiences} />
          </div>
        </section>
      )}
    </>
  );
}
