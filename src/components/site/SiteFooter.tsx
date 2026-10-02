import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import { PARADISE_BEYOND, type Brand } from "@/lib/brand/config";
import { offGridCategories } from "@/lib/data/categories";

export function SiteFooter({ brand = PARADISE_BEYOND }: { brand?: Brand }) {
  if (brand.theme === "earth") return <OffGridFooter brand={brand} />;
  return (
    <footer className="mt-24 border-t border-ink/10 bg-sand-100">
      <div className="container-editorial py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="font-display text-2xl font-semibold text-ink">Paradise Beyond</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
              Come for more than a holiday. Curated 7 &amp; 14-day experiences in
              extraordinary places — starting in Zanzibar.
            </p>
            <p className="mt-6 text-sm text-ink-soft">
              Your international flights aren&apos;t included. Get yourself to
              Zanzibar and we&apos;ll take care of the rest.
            </p>
            <p className="mt-6 text-sm text-ink-soft">
              <a href={`mailto:${LEGAL.email}`} className="link-underline">
                {LEGAL.email}
              </a>
            </p>
          </div>

          <FooterCol
            title="Explore"
            links={[
              { label: "All experiences", href: "/experiences" },
              { label: "7-day escapes", href: "/experiences?duration=7" },
              { label: "14-day journeys", href: "/experiences?duration=14" },
              { label: "Zanzibar", href: "/destinations/zanzibar" },
            ]}
          />
          <FooterCol
            title="Categories"
            links={[
              { label: "Wellness", href: "/categories/wellness" },
              { label: "Adventure", href: "/categories/adventure" },
              { label: "Food", href: "/categories/food" },
              { label: "Paradise Holidays", href: "/categories/paradise-holidays" },
            ]}
          />
          <FooterCol
            title="Paradise Beyond"
            links={[
              { label: "Host a retreat", href: "/host" },
              { label: "Apply to host", href: "/host/apply" },
              { label: "Saved experiences", href: "/saved" },
              { label: "How it works", href: "/host" },
            ]}
          />
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-ink/10 pt-8 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {2026} Paradise Beyond. Curated with care.</p>

          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/terms" className="transition-colors hover:text-ink">
              Terms &amp; Conditions
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy Policy
            </Link>
            <a href={`mailto:${LEGAL.email}`} className="transition-colors hover:text-ink">
              Contact
            </a>
          </nav>

          <p className="uppercase tracking-eyebrow">Zanzibar · and beyond</p>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-ink-muted">
          {LEGAL.legalEntity}. We act as agent for the hosts who run the experiences
          listed here; your international flights are arranged separately by you.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="eyebrow mb-4">{title}</p>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-sm text-ink-soft transition-colors hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Footer for off-grid marketplaces (Spend Time Off Grid). */
function OffGridFooter({ brand }: { brand: Brand }) {
  const cats = offGridCategories().slice(0, 5);
  return (
    <footer className="mt-24 bg-forest-900 text-sand-100">
      <div className="container-editorial py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sand-50">{brand.wordmark}</p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-sand-100/75">{brand.footerBlurb}</p>
            <p className="mt-6 text-sm text-sand-100/75">
              Travellers arrange their own way there unless a host includes transfers.
            </p>
            <p className="mt-6 text-sm">
              <a href={`mailto:${LEGAL.email}`} className="link-underline text-sand-50">
                {LEGAL.email}
              </a>
            </p>
          </div>
          <OffGridCol
            title="Explore"
            links={[
              { label: "All stays", href: "/experiences" },
              { label: "How it works", href: "/#how-it-works" },
              { label: "Saved", href: "/saved" },
            ]}
          />
          <OffGridCol title="Kinds of place" links={cats.map((c) => ({ label: c.name, href: `/categories/${c.slug}` }))} />
          <OffGridCol
            title="Hosts"
            links={[
              { label: "List your land", href: "/host" },
              { label: "Apply to host", href: "/host/apply" },
              { label: "Your account", href: "/account" },
            ]}
          />
        </div>
        <div className="mt-14 flex flex-col gap-5 border-t border-sand-50/10 pt-8 text-xs text-sand-100/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {2026} {brand.name}.</p>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/terms" className="transition-colors hover:text-sand-50">Terms &amp; Conditions</Link>
            <Link href="/privacy" className="transition-colors hover:text-sand-50">Privacy Policy</Link>
            <a href={`mailto:${LEGAL.email}`} className="transition-colors hover:text-sand-50">Contact</a>
          </nav>
          <p className="uppercase tracking-eyebrow">Stay · Contribute · Learn</p>
        </div>
      </div>
    </footer>
  );
}

function OffGridCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="mb-4 text-xs font-medium uppercase tracking-eyebrow text-sand-100/50">{title}</p>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-sm text-sand-100/85 transition-colors hover:text-sand-50">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
