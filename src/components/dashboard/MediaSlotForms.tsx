"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadImage, setImageUrl, type MediaResult } from "@/app/desk/media/actions";

/**
 * Upload / set-URL controls for one media slot, with real success + error
 * feedback. Previously these were bare server-action forms, so any failure
 * (missing bucket, missing service key, RLS) looked like "nothing happened".
 */
export function MediaSlotForms({ seed }: { seed: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(action: (fd: FormData) => Promise<MediaResult>, form: HTMLFormElement) {
    const fd = new FormData(form);
    setMsg(null);
    startTransition(async () => {
      const res = await action(fd);
      if (res.ok) {
        setMsg({ ok: true, text: "Saved." });
        form.reset();
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Something went wrong." });
      }
    });
  }

  return (
    <div className="space-y-2">
      <form
        onSubmit={(e) => { e.preventDefault(); submit(uploadImage, e.currentTarget); }}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="seed" value={seed} />
        <input
          type="file"
          name="file"
          accept="image/*"
          required
          className="block w-full text-xs text-ink-muted file:mr-2 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-[0.62rem] file:uppercase file:tracking-eyebrow file:text-sand-50 hover:file:bg-ink-soft"
        />
        <button
          disabled={pending}
          className="flex-none rounded-full bg-clay-500 px-3 py-1.5 text-[0.62rem] uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600 disabled:opacity-50"
        >
          {pending ? "…" : "Upload"}
        </button>
      </form>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(setImageUrl, e.currentTarget); }}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="seed" value={seed} />
        <input
          name="url"
          placeholder="or paste image URL"
          className="w-full rounded-lg border border-ink/15 bg-sand-50 px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
        />
        <button
          disabled={pending}
          className="flex-none rounded-full border border-ink/15 px-3 py-1.5 text-[0.62rem] uppercase tracking-eyebrow text-ink-soft hover:border-ink/40 disabled:opacity-50"
        >
          Set
        </button>
      </form>

      {msg && <p className={`text-xs ${msg.ok ? "text-palm-600" : "text-clay-600"}`}>{msg.text}</p>}
    </div>
  );
}
