import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getAllHosts } from "@/lib/data/repository";
import { img } from "@/lib/images";

export const metadata: Metadata = { title: "Hosts", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DeskHostsPage() {
  await requireRole("admin", "/desk/hosts");
  const hosts = await getAllHosts();

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Admin Desk</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Hosts</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Every host on the site. Open one to edit their name, headline, bio,
          specialisms, verified badge and photos.
        </p>
      </header>

      <ol className="mt-10 grid gap-3 sm:grid-cols-2">
        {hosts.map((h) => (
          <li key={h.slug}>
            <Link
              href={`/desk/hosts/${h.slug}`}
              className="flex items-center gap-4 rounded-xl2 border border-ink/10 bg-sand-50 p-4 transition-colors hover:border-ink/25"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(h.imageSeed, 120, 120)} alt="" className="h-14 w-14 flex-none rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium text-ink">
                  <span className="truncate">{h.name}</span>
                  {h.verified && <span className="flex-none rounded-full bg-palm-500/15 px-2 py-0.5 text-[0.56rem] uppercase tracking-eyebrow text-palm-600">Verified</span>}
                </p>
                <p className="truncate text-xs text-ink-muted">{h.headline || "No headline yet"}</p>
              </div>
              <span className="flex-none text-[0.62rem] uppercase tracking-eyebrow text-ocean-700">Edit →</span>
            </Link>
          </li>
        ))}
      </ol>

      {hosts.length === 0 && (
        <p className="mt-10 rounded-xl2 border border-ink/10 bg-sand-50 p-6 text-sm text-ink-muted">
          No hosts yet. Hosts appear here once someone is approved in Applications, or when you build an experience for a new host.
        </p>
      )}
    </div>
  );
}
