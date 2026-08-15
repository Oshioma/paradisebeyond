"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHost, type HostUpdate } from "@/app/desk/hosts/actions";

/**
 * Edit a host's profile text, specialisms and verified badge. Photos are edited
 * separately via the media cards rendered alongside this on the page.
 */
export function HostEditor({ slug, initial }: { slug: string; initial: HostUpdate }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [headline, setHeadline] = useState(initial.headline);
  const [bio, setBio] = useState(initial.bio);
  const [specialisms, setSpecialisms] = useState<string[]>(initial.specialisms.length ? initial.specialisms : [""]);
  const [verified, setVerified] = useState(initial.verified);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setStatus(null);
    start(async () => {
      const res = await updateHost(slug, {
        name,
        headline,
        bio,
        specialisms: specialisms.map((s) => s.trim()).filter(Boolean),
        verified,
      });
      if (res.ok) {
        setStatus({ ok: true, text: "Saved." });
        router.refresh();
      } else {
        setStatus({ ok: false, text: res.error });
      }
    });
  }

  return (
    <div className="space-y-5">
      <Field label="Name">
        <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Amina Yusuf" />
      </Field>
      <Field label="Headline" hint="One line under their name. e.g. “Yoga teacher & breathwork guide”">
        <input className={inp} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Yoga teacher & breathwork guide" />
      </Field>
      <Field label="Bio" hint="A short paragraph in their voice.">
        <textarea rows={5} className={inp} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Amina has taught yoga on the Zanzibari coast for over a decade…" />
      </Field>
      <Field label="Specialisms" hint="What they're known for — one per line.">
        <ListEditor items={specialisms} onChange={setSpecialisms} placeholder="Restorative yoga" />
      </Field>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-ink/10 bg-sand-50 p-4">
        <div>
          <p className="text-sm font-medium text-ink">Verified badge</p>
          <p className="text-xs text-ink-muted">Awarded by admins only. Shows a verified mark on the host and their retreats.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={verified}
          onClick={() => setVerified((v) => !v)}
          className={cn("relative h-7 w-12 flex-none rounded-full transition-colors", verified ? "bg-palm-500" : "bg-ink/15")}
        >
          <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-sand-50 shadow-soft transition-all", verified ? "left-6" : "left-1")} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-full bg-clay-500 px-6 py-3 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save profile"}
        </button>
        {status && (
          <p aria-live="polite" className={`text-sm ${status.ok ? "text-palm-600" : "text-clay-600"}`}>
            {status.ok ? "✓ " : ""}{status.text}
          </p>
        )}
      </div>
    </div>
  );
}

const inp = "w-full rounded-xl border border-ink/15 bg-sand-50 px-4 py-3 text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500";

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-ink">{label}</label>
      {hint && <p className="mb-2 mt-0.5 text-xs text-ink-muted">{hint}</p>}
      {!hint && <div className="mb-2" />}
      {children}
    </div>
  );
}

function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className={inp}
            value={it}
            placeholder={placeholder}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <button
            type="button"
            aria-label="Remove"
            onClick={() => onChange(items.filter((_, j) => j !== i).length ? items.filter((_, j) => j !== i) : [""])}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-ink-muted hover:bg-clay-500/10 hover:text-clay-600"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="rounded-full border border-dashed border-ink/25 px-4 py-2 text-xs uppercase tracking-eyebrow text-ink-muted hover:border-ink/50 hover:text-ink"
      >
        + Add
      </button>
    </div>
  );
}
