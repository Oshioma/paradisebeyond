"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCustomDomain } from "@/app/studio/branding/actions";

/**
 * Lets a host connect their OWN domain (e.g. aminaretreats.com) to a retreat's
 * microsite. Saving stores the domain; the host then points DNS at us and the
 * domain is registered with the hosting project (automatically when configured,
 * otherwise by an admin). Apex vs subdomain DNS hints are shown once connected.
 */
export function CustomDomainEditor({
  slug,
  name,
  currentDomain,
}: {
  slug: string;
  name: string;
  currentDomain: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentDomain);
  const [saved, setSaved] = useState(currentDomain);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setStatus(null);
    start(async () => {
      const res = await setCustomDomain(slug, value.trim());
      if (res.ok) {
        setSaved(value.trim());
        setStatus({ ok: true, text: value.trim() ? "Connected" : "Removed" });
        router.refresh();
      } else {
        setStatus({ ok: false, text: res.error ?? "Failed" });
      }
    });
  }

  // Apex domains (example.com) use an A record; subdomains (go.example.com) a CNAME.
  const isApex = saved ? saved.split(".").length === 2 : false;

  return (
    <div className="rounded-xl border border-ink/10 bg-sand-50 p-4">
      <p className="font-medium text-ink">{name}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="yourdomain.com"
          className="w-56 rounded-lg border border-ink/15 bg-sand-50 px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
        />
        <button
          onClick={save}
          disabled={pending}
          className="rounded-full border border-ink/15 px-4 py-1.5 text-[0.62rem] uppercase tracking-eyebrow text-ink-soft hover:border-ink/40 disabled:opacity-50"
        >
          {pending ? "Saving…" : saved ? "Update domain" : "Connect domain"}
        </button>
        {status && (
          <span className={`text-[0.62rem] uppercase tracking-eyebrow ${status.ok ? "text-palm-600" : "text-clay-600"}`}>
            {status.ok ? "✓ " : ""}{status.text}
          </span>
        )}
      </div>

      {saved ? (
        <div className="mt-3 rounded-lg bg-sand-100 p-3 text-xs text-ink-muted">
          <p className="text-ink">
            Point <span className="font-mono text-ocean-700">{saved}</span> to us by adding this DNS record at your
            registrar:
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="font-mono text-[0.7rem]">
              <tbody>
                {isApex ? (
                  <tr>
                    <td className="pr-4 text-ink">A</td>
                    <td className="pr-4">@</td>
                    <td>76.76.21.21</td>
                  </tr>
                ) : (
                  <tr>
                    <td className="pr-4 text-ink">CNAME</td>
                    <td className="pr-4">{saved.split(".")[0]}</td>
                    <td>cname.vercel-dns.com</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2">
            It can take a little while for DNS to spread and the secure certificate to be issued. Until then, your
            retreat also stays reachable at its short address above.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-ink-muted">
          Already own a domain? Connect it and guests reach this retreat at your own web address.
        </p>
      )}
    </div>
  );
}
