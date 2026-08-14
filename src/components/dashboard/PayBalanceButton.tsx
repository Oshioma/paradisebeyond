"use client";

import { useFormStatus } from "react-dom";

/** Submit button for the pay-balance form, disabled while the action runs. */
export function PayBalanceButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full rounded-full bg-clay-500 px-6 py-3.5 text-xs uppercase tracking-eyebrow text-sand-50 transition-colors hover:bg-clay-600 disabled:opacity-60"
    >
      {pending ? "Redirecting…" : "Pay balance"}
    </button>
  );
}
