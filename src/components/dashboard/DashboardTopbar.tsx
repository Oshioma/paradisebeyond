"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth/types";
import { signOut } from "@/app/login/actions";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
}

/**
 * Shared chrome for the guest, host and admin dashboards. Keeps the dashboards
 * feeling like part of Paradise Beyond, not a generic admin panel.
 */
export function DashboardTopbar({
  user,
  area,
  nav,
}: {
  user: SessionUser;
  area: string;
  nav: NavItem[];
}) {
  const pathname = usePathname();

  return (
    <div className="border-b border-ink/10 bg-sand-100/60">
      <div className="container-editorial flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="font-display text-lg font-semibold text-ink">
            Paradise Beyond
          </Link>
          <span className="text-ink-muted">/</span>
          <span className="eyebrow text-ocean-700">{area}</span>
        </div>
        <div className="flex items-center gap-4">
          {user.demo && (
            <span className="rounded-full bg-clay-500/15 px-3 py-1 text-[0.62rem] uppercase tracking-eyebrow text-clay-600">
              Demo · {user.role}
            </span>
          )}
          <span className="hidden text-sm text-ink-muted sm:inline">{user.name}</span>
          <form action={signOut}>
            <button className="rounded-full border border-ink/15 px-4 py-1.5 text-xs uppercase tracking-eyebrow text-ink-soft transition-colors hover:border-ink/40">
              Sign out
            </button>
          </form>
        </div>
      </div>
      <div className="container-editorial">
        <nav className="flex gap-1 overflow-x-auto pb-1">
          {nav.map((item) => {
            const active =
              item.href === pathname ||
              (item.href !== "/account" &&
                item.href !== "/studio" &&
                item.href !== "/desk" &&
                pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-t-lg border-b-2 px-4 py-3 text-sm transition-colors",
                  active
                    ? "border-clay-500 font-medium text-ink"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
