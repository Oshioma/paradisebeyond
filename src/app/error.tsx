"use client";

import { useEffect } from "react";

/**
 * Root error boundary. Any uncaught error in a server component or action lands
 * here instead of Next's bare error screen — branded, with a retry. The actual
 * message + digest are shown in a collapsible panel so a problem can be reported
 * precisely instead of "something went wrong".
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface the real error in the console / server logs for diagnosis.
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <div className="container-editorial flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow text-ocean-700">Something went wrong</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink">We hit an unexpected snag</h1>
      <p className="mt-3 max-w-md text-ink-muted">
        Sorry about that — the issue has been logged. Try again, and if it keeps happening please get in touch.
      </p>

      {(error?.message || error?.digest) && (
        <details className="mt-6 w-full max-w-lg text-left">
          <summary className="cursor-pointer text-xs uppercase tracking-eyebrow text-ink-muted hover:text-ink">
            Technical details
          </summary>
          <div className="mt-2 rounded-xl border border-ink/10 bg-sand-100 p-3">
            {error.message && <p className="break-words font-mono text-xs text-clay-600">{error.message}</p>}
            {error.digest && <p className="mt-1 font-mono text-[0.65rem] text-ink-muted">ref: {error.digest}</p>}
          </div>
        </details>
      )}

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
