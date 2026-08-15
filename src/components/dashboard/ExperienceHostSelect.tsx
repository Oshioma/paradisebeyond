"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setExperienceHost } from "@/app/desk/experiences/actions";

/**
 * Reassign an experience to a different host from a dropdown. Saves on change
 * and shows a brief saved/failed state.
 */
export function ExperienceHostSelect({
  slug,
  currentHostSlug,
  hosts,
}: {
  slug: string;
  currentHostSlug?: string;
  hosts: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentHostSlug ?? "");
  const [pending, start] = useTransition();
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");
  const [err, setErr] = useState<string | null>(null);

  function onChange(next: string) {
    const prev = value;
    setValue(next);
    setState("idle");
    setErr(null);
    if (!next || next === currentHostSlug) return;
    start(async () => {
      const res = await setExperienceHost(slug, next);
      if (res.ok) {
        setState("ok");
        router.refresh();
      } else {
        setState("err");
        setErr(res.error ?? "Couldn't change the host.");
        setValue(prev);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[160px] rounded-lg border border-ink/15 bg-sand-50 px-2 py-1.5 text-xs text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 disabled:opacity-60"
      >
        {!currentHostSlug && <option value="">— none —</option>}
        {hosts.map((h) => (
          <option key={h.slug} value={h.slug}>{h.name}</option>
        ))}
      </select>
      {pending && <span className="text-[0.6rem] uppercase tracking-eyebrow text-ink-muted">Saving…</span>}
      {!pending && state === "ok" && <span className="text-[0.6rem] uppercase tracking-eyebrow text-palm-600">✓</span>}
      {!pending && state === "err" && <span title={err ?? undefined} className="text-[0.6rem] uppercase tracking-eyebrow text-clay-600">Failed</span>}
    </div>
  );
}
