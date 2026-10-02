"use client";

import { useState, useTransition } from "react";
import { sendTestEmail, type TestEmailResult } from "@/app/(app)/desk/settings/actions";

/** Fires a live SMTP send from each site's sender to the admin's own address and shows the raw result. */
export function TestEmailButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<TestEmailResult | null>(null);

  return (
    <div>
      <button
        onClick={() => start(async () => setResult(await sendTestEmail()))}
        disabled={pending}
        className="rounded-full bg-ink px-5 py-2.5 text-xs uppercase tracking-eyebrow text-sand-50 transition-colors hover:bg-ink/90 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send test emails"}
      </button>

      {result && (
        <ul className="mt-4 space-y-3">
          {result.sends.map((s) => (
            <li
              key={s.brand}
              className={`rounded-xl2 border p-4 text-sm ${
                s.ok ? "border-palm-500/40 bg-palm-500/5" : "border-clay-500/40 bg-clay-500/5"
              }`}
            >
              <p className="text-xs uppercase tracking-eyebrow text-ink-muted">
                {s.brand} · <span className="normal-case tracking-normal">{s.from}</span>
              </p>
              {s.ok ? (
                <p className="mt-1 text-palm-600">
                  ✓ Sent to <strong>{result.to}</strong>. Check that inbox (and spam) to confirm delivery.
                </p>
              ) : (
                <>
                  <p className="mt-1 font-medium text-clay-600">
                    {s.configured ? "The SMTP server rejected the send." : "Email isn't configured for this site."}
                  </p>
                  {s.error && <p className="mt-1 break-words text-ink-soft">{s.error}</p>}
                  {s.configured && (
                    <p className="mt-2 text-xs text-ink-muted">
                      Most common causes: a wrong SMTP password, or a login on a different address from the sender. In
                      ImprovMX, create the SMTP credential for the sender address itself, on a plan that includes SMTP.
                    </p>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
