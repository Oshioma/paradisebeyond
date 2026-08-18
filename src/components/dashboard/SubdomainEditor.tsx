"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setExperienceSubdomain } from "@/app/studio/branding/actions";

/**
 * Lets a host choose their retreat's web address label — <label>.<hostSuffix>.
 * `hostSuffix` is the registrable domain (e.g. paradisebeyond.com) or a path
 * hint; `defaultLabel` is the auto label used when they haven't set a custom one.
 */
export function SubdomainEditor({
  slug,
  name,
  currentLabel,
  defaultLabel,
  hostSuffix,
}: {
  slug: string;
  name: string;
  currentLabel: string;
  defaultLabel: string;
  hostSuffix: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentLabel);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const shown = (value.trim() || defaultLabel).toLowerCase().replace(/[^a-z0-9]/g, "");

  function save() {
    setStatus(null);
    start(async () => {
      const res = await setExperienceSubdomain(slug, value.trim());
      setStatus(res.ok ? { ok: true, text: "Saved" } : { ok: false, text: res.error ?? "Failed" });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-ink/10 bg-sand-50 p-4">
      <p className="font-medium text-ink">{name}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={defaultLabel}
          className="w-40 rounded-lg border border-ink/15 bg-sand-50 px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
        />
        <span className="font-mono text-xs text-ink-muted">.{hostSuffix}</span>
        <button
          onClick={save}
          disabled={pending}
          className="rounded-full border border-ink/15 px-4 py-1.5 text-[0.62rem] uppercase tracking-eyebrow text-ink-soft hover:border-ink/40 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save address"}
        </button>
        {status && <span className={`text-[0.62rem] uppercase tracking-eyebrow ${status.ok ? "text-palm-600" : "text-clay-600"}`}>{status.ok ? "✓ " : ""}{status.text}</span>}
      </div>
      <p className="mt-2 break-all text-xs text-ink-muted">
        Your page: <span className="font-mono text-ocean-700">{shown}.{hostSuffix}</span>
      </p>
    </div>
  );
}
