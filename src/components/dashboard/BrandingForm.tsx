"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHostBranding, type Social } from "@/app/studio/branding/actions";

const PRESETS = ["#B4633B", "#1F6F6B", "#2E5B8A", "#7A5C3E", "#8A5A83", "#3F7A52", "#C08A2D", "#1B1B1A"];

export function BrandingForm({
  initialColor,
  initialSocials,
}: {
  initialColor: string;
  initialSocials: Social[];
}) {
  const router = useRouter();
  const [color, setColor] = useState(initialColor || "#B4633B");
  const [socials, setSocials] = useState<Social[]>(initialSocials.length ? initialSocials : [{ label: "Instagram", href: "" }]);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setStatus(null);
    start(async () => {
      const res = await updateHostBranding(color, socials);
      setStatus(res.ok ? { ok: true, text: "Saved — your page is updated." } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-medium text-ink">Brand colour</h2>
        <p className="mt-0.5 text-sm text-ink-muted">Used for buttons and accents across your page.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Use ${c}`}
              className={`h-9 w-9 rounded-full border-2 transition-transform ${color.toLowerCase() === c.toLowerCase() ? "border-ink scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <label className="ml-2 inline-flex items-center gap-2 text-sm text-ink-muted">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-ink/15 bg-transparent" />
            <span className="font-mono text-xs">{color}</span>
          </label>
        </div>
      </section>

      <section>
        <h2 className="font-medium text-ink">Your links</h2>
        <p className="mt-0.5 text-sm text-ink-muted">Instagram, your website, anywhere guests can find you. Full https:// links.</p>
        <div className="mt-3 space-y-2">
          {socials.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                value={s.label}
                onChange={(e) => setSocials(socials.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                placeholder="Instagram"
                className="w-32 rounded-lg border border-ink/15 bg-sand-50 px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
              />
              <input
                value={s.href}
                onChange={(e) => setSocials(socials.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))}
                placeholder="https://instagram.com/you"
                className="min-w-[200px] flex-1 rounded-lg border border-ink/15 bg-sand-50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
              />
              <button
                type="button"
                aria-label="Remove"
                onClick={() => setSocials(socials.filter((_, j) => j !== i).length ? socials.filter((_, j) => j !== i) : [{ label: "", href: "" }])}
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-ink-muted hover:bg-clay-500/10 hover:text-clay-600"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSocials([...socials, { label: "", href: "" }])}
            className="rounded-full border border-dashed border-ink/25 px-4 py-2 text-xs uppercase tracking-eyebrow text-ink-muted hover:border-ink/50 hover:text-ink"
          >
            + Add a link
          </button>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-full px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 disabled:opacity-50"
          style={{ backgroundColor: color }}
        >
          {pending ? "Saving…" : "Save my page"}
        </button>
        {status && <p className={`text-sm ${status.ok ? "text-palm-600" : "text-clay-600"}`}>{status.ok ? "✓ " : ""}{status.text}</p>}
      </div>
    </div>
  );
}
