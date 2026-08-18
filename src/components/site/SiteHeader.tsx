"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { WishlistCount } from "@/components/wishlist/WishlistButton";

const NAV = [
  { label: "Experiences", href: "/experiences" },
  { label: "7 Days", href: "/experiences?duration=7" },
  { label: "14 Days", href: "/experiences?duration=14" },
  { label: "Host a Retreat", href: "/host" },
];

type Me = { role: "guest" | "host" | "admin" | null };

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Me["role"]>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch the current role so we can show Studio (host) / Admin (admin) links.
  useEffect(() => {
    let live = true;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : { role: null }))
      .then((d: Me) => { if (live) setRole(d.role); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const roleLink =
    role === "admin"
      ? { label: "Admin", href: "/desk" }
      : role === "host"
        ? { label: "Studio", href: "/studio" }
        : null;

  // Host microsites (/r/<slug>) render their own branded chrome — no marketplace nav.
  if (pathname?.startsWith("/r/")) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-500 ease-out-soft",
        scrolled
          ? "bg-sand-50/90 backdrop-blur-md shadow-[0_1px_0_rgba(28,26,22,0.08)]"
          : "bg-transparent",
      )}
    >
      <div className="container-editorial flex h-[var(--paradise-nav-h)] items-center justify-between">
        <Link href="/" className="group flex flex-col leading-none">
          <span className="font-display text-xl font-semibold tracking-tight text-ink">
            Paradise Beyond
          </span>
          <span className="mt-0.5 text-[0.6rem] uppercase tracking-eyebrow text-ink-muted">
            Curated escapes
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="link-underline text-sm text-ink-soft hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/saved"
            className="hidden items-center gap-1.5 text-sm text-ink-soft hover:text-ink sm:flex"
            aria-label="Saved experiences"
          >
            <HeartIcon className="h-4 w-4" />
            <WishlistCount />
          </Link>
          {roleLink && (
            <Link
              href={roleLink.href}
              className="hidden rounded-full border border-ink/20 px-3 py-1.5 text-xs uppercase tracking-eyebrow text-ink-soft hover:border-ink/50 hover:text-ink sm:inline-flex"
            >
              {roleLink.label}
            </Link>
          )}
          <Link
            href="/account"
            className="hidden text-sm text-ink-soft hover:text-ink sm:inline"
          >
            Account
          </Link>
          <Link
            href="/experiences"
            className="hidden rounded-full bg-ink px-5 py-2 text-xs uppercase tracking-eyebrow text-sand-50 transition-colors hover:bg-ink-soft md:inline-flex"
          >
            Explore
          </Link>
          <button
            className="md:hidden"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="block h-px w-6 bg-ink" />
            <span className="mt-1.5 block h-px w-6 bg-ink" />
            <span className="mt-1.5 block h-px w-6 bg-ink" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink/10 bg-sand-50 md:hidden">
          <nav className="container-editorial flex flex-col py-4">
            {NAV.concat(
              { label: "Saved", href: "/saved" },
              { label: "Account", href: "/account" },
              ...(roleLink ? [roleLink] : []),
            ).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="py-3 text-sm text-ink-soft"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 21s-7.5-4.7-9.7-9.2C1 8.7 2.4 5.5 5.5 5.1c2-.3 3.6.8 4.5 2.2.9-1.4 2.5-2.5 4.5-2.2 3.1.4 4.5 3.6 3.2 6.7C19.5 16.3 12 21 12 21z" />
    </svg>
  );
}
