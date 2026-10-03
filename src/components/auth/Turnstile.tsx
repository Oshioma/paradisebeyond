"use client";

import { useEffect, useRef } from "react";
import { CAPTCHA_FIELD } from "@/lib/auth/captcha";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<TurnstileApi> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    let s = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (!s) {
      s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
    s.addEventListener("load", () => (window.turnstile ? resolve(window.turnstile) : reject()));
    s.addEventListener("error", () => reject());
  });
}

/**
 * Cloudflare Turnstile "security check" for the auth forms. Writes its token
 * into a hidden `captchaToken` field of the surrounding form. Renders nothing
 * when no site key is configured (`siteKey` is null).
 */
export function Turnstile({ siteKey }: { siteKey: string | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let id: string | null = null;
    let cancelled = false;
    loadScript()
      .then((t) => {
        if (cancelled || !ref.current) return;
        id = t.render(ref.current, {
          sitekey: siteKey,
          "response-field-name": CAPTCHA_FIELD,
          theme: "light",
          size: "flexible",
        });
      })
      .catch(() => { /* blocked or offline — the server will say to retry */ });
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={ref} className="min-h-[65px]" aria-label="Security check" />;
}
