import Link from "next/link";

export function SiteFooter() {
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
              { label: "Saved experiences", href: "/account/saved" },
              { label: "How it works", href: "/host" },
            ]}
          />
        </div>

        <div className="mt-14 flex flex-col justify-between gap-4 border-t border-ink/10 pt-8 text-xs text-ink-muted sm:flex-row">
          <p>© {2026} Paradise Beyond. Curated with care.</p>
          <p className="uppercase tracking-eyebrow">Zanzibar · and beyond</p>
        </div>
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
