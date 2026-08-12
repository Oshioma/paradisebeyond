import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getHostConversations } from "@/lib/data/messages";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MessagesInboxPage() {
  const user = await requireRole("host", "/studio/messages");
  const convos = await getHostConversations(user.hostSlug ?? "amina-yusuf");

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Host Studio</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Messages</h1>
        <p className="mt-3 text-ink-muted">Talk to your guests before they travel.</p>
      </header>

      {convos.length === 0 ? (
        <p className="mt-10 rounded-xl2 border border-dashed border-ink/20 py-16 text-center text-ink-muted">
          No conversations yet. When a guest messages you, it appears here.
        </p>
      ) : (
        <div className="mt-10 divide-y divide-ink/10 overflow-hidden rounded-xl2 border border-ink/10 bg-sand-50">
          {convos.map((c) => (
            <Link key={c.bookingId} href={`/studio/messages/${c.bookingId}`} className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-sand-100">
              <div className="min-w-0">
                <p className="font-medium text-ink">{c.guestName}</p>
                <p className="text-xs text-ink-muted">{c.experienceName}</p>
                <p className="mt-1 truncate text-sm text-ink-soft">{c.lastBody}</p>
              </div>
              <div className="flex flex-none items-center gap-3 text-xs text-ink-muted">
                <span>{new Date(c.lastAt).toLocaleDateString()}</span>
                <span className="rounded-full bg-ink/5 px-2 py-1">{c.count}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
