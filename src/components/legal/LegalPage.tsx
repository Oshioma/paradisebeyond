import Link from "next/link";
import { LEGAL } from "@/lib/legal";

/**
 * Shared chrome for the legal pages (/terms, /privacy). Editorial rather than
 * boilerplate: the same sand/ink palette as the magazine, a numbered section
 * spine, and a measure capped at `max-w-prose` so long policy text stays
 * readable on mobile.
 */

export function LegalShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-ink/10 bg-sand-100">
        <div className="container-editorial py-20 sm:py-24">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-display font-semibold text-ink">{title}</h1>
          <p className="mt-5 max-w-prose text-lg leading-relaxed text-ink-muted">{intro}</p>
          <p className="mt-8 text-sm text-ink-muted">
            Last updated {LEGAL.lastUpdated} · Questions?{" "}
            <a href={`mailto:${LEGAL.email}`} className="link-underline text-ink">
              {LEGAL.email}
            </a>
          </p>
        </div>
      </header>

      <div className="container-editorial py-16 sm:py-20">
        <div className="max-w-prose">{children}</div>

        <div className="mt-16 max-w-prose border-t border-ink/10 pt-8 text-sm text-ink-muted">
          <p>
            Read this alongside our{" "}
            <Link href="/terms" className="link-underline text-ink">
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="link-underline text-ink">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}

/** A numbered policy section. `n` is passed explicitly so renumbering is a diff. */
export function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  const id = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return (
    <section id={id} className="scroll-mt-28 border-t border-ink/10 py-10 first:border-t-0 first:pt-0">
      <p className="eyebrow">Section {n}</p>
      <h2 className="mt-3 font-display text-2xl font-semibold text-ink sm:text-3xl">{title}</h2>
      <div className="mt-5 space-y-4 leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

/** Body paragraph. */
export function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

/** Bulleted list with the site's marker treatment. */
export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ocean-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A labelled definition row — used for lawful bases and data categories. */
export function DefRow({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-100/60 p-5">
      <p className="font-display text-lg font-semibold text-ink">{term}</p>
      <div className="mt-2 text-sm leading-relaxed text-ink-muted">{children}</div>
    </div>
  );
}

/** Emphasised callout for the things guests most often get caught out by. */
export function Callout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl2 border border-clay-400/40 bg-clay-400/10 p-5">
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      <div className="mt-2 text-sm leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

/** The one published contact route, rendered as a mailto link. */
export function ContactEmail() {
  return (
    <a href={`mailto:${LEGAL.email}`} className="link-underline text-ink">
      {LEGAL.email}
    </a>
  );
}
