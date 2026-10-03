"use client";

import { useEffect, useRef } from "react";
import { clearDraft, loadDraft, saveDraft } from "@/lib/forms/drafts";

/**
 * A sign-in / sign-up / reset form whose plain fields (name, email) survive a
 * refresh. Only the fields named in `keep` are saved — never passwords, and
 * never the captcha token. The draft clears on submit.
 */
export function AuthForm({
  action,
  draftKey,
  keep,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  draftKey: string;
  keep: string[];
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const fields = keep.filter((k) => k !== "password" && k !== "captchaToken");

  useEffect(() => {
    const form = ref.current;
    const draft = loadDraft<Record<string, string>>(draftKey);
    if (!form || !draft) return;
    for (const name of fields) {
      const el = form.elements.namedItem(name);
      if (el instanceof HTMLInputElement && el.type !== "password" && !el.value && draft[name]) el.value = draft[name];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once on mount
  }, [draftKey]);

  function save() {
    const form = ref.current;
    if (!form) return;
    const value: Record<string, string> = {};
    for (const name of fields) {
      const el = form.elements.namedItem(name);
      if (el instanceof HTMLInputElement && el.type !== "password") value[name] = el.value;
    }
    saveDraft(draftKey, value);
  }

  return (
    <form ref={ref} action={action} onInput={save} onSubmit={() => clearDraft(draftKey)} className={className}>
      {children}
    </form>
  );
}
