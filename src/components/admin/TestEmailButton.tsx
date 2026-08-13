"use client";

import { useState, useTransition } from "react";
import { sendTestEmail, type TestEmailResult } from "@/app/desk/settings/actions";

/** Fires a live Resend send to the admin's own address and shows the raw result. */
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
        {pending ? "Sending…" : "Send test email"}
      </button>

      {result && (
        <div
          className={`mt-4 rounded-xl2 border p-4 text-sm ${
            result.ok ? "border-palm-500/40 bg-palm-500/5" : "border-clay-500/40 bg-clay-500/5"
          }`}
        >
          {result.ok ? (
            <p className="text-palm-600">
              ✓ Sent to <strong>{result.to}</strong>. Check that inbox (and spam) to confirm delivery.
            </p>
          ) : (
            <>
              <p className="font-medium text-clay-600">
                {result.configured ? "Resend rejected the send." : "Email isn't configured."}
              </p>
              {result.error && <p className="mt-1 break-words text-ink-soft">{result.error}</p>}
              {result.configured && (
                <p className="mt-2 text-xs text-ink-muted">
                  Most common cause: the <code>EMAIL_FROM</code> domain isn&apos;t verified in Resend. Verify the
                  domain (or use an <code>onboarding@resend.dev</code> sender while testing).
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
