"use client";

/**
 * Root error boundary. Any uncaught error in a server component or action lands
 * here instead of Next's bare error screen — branded, with a retry.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-editorial flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow text-ocean-700">Something went wrong</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink">We hit an unexpected snag</h1>
      <p className="mt-3 max-w-md text-ink-muted">
        Sorry about that — the issue has been logged. Try again, and if it keeps happening please get in touch.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-clay-500 px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-full border border-ink/20 px-6 py-3 text-xs uppercase tracking-eyebrow text-ink-soft hover:border-ink/40"
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
