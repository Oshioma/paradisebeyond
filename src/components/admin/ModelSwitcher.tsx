"use client";

import { useState, useTransition } from "react";
import { setAiModel } from "@/app/desk/settings/actions";
import type { AiModelOption } from "@/lib/ai/models";
import { cn } from "@/lib/utils";

/**
 * Admin switch for the AI model used by the Retreat Builder. Persisted server-
 * side (app_settings), so it's a true runtime toggle — no redeploy. Costs are
 * shown so the trade-off is explicit.
 */
export function ModelSwitcher({
  models,
  selected,
  source,
  aiEnabled,
}: {
  models: AiModelOption[];
  selected: string;
  source: "selected" | "env" | "default";
  aiEnabled: boolean;
}) {
  const [choice, setChoice] = useState(selected);
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function save() {
    start(async () => {
      const fd = new FormData();
      fd.set("model", choice);
      await setAiModel(fd);
      setSavedAt(new Date().toLocaleTimeString());
    });
  }

  return (
    <div>
      {!aiEnabled && (
        <p className="mb-4 rounded-lg border border-clay-500/40 bg-clay-500/5 px-4 py-3 text-sm text-clay-600">
          No <code>ANTHROPIC_API_KEY</code> is set, so the builder currently uses local heuristic copy. Your model choice is saved and applies as soon as a key is added.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {models.map((m) => {
          const on = choice === m.id;
          const active = selected === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setChoice(m.id)}
              className={cn(
                "flex flex-col rounded-xl2 border p-4 text-left transition-all",
                on ? "border-ink bg-ink text-sand-50" : "border-ink/15 bg-sand-50 hover:border-ink/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-lg font-semibold">{m.name}</span>
                {active && <span className={cn("rounded-full px-2 py-0.5 text-[0.58rem] uppercase tracking-eyebrow", on ? "bg-sand-50/20 text-sand-50" : "bg-palm-500/15 text-palm-600")}>Active</span>}
              </div>
              <p className={cn("mt-1 text-xs", on ? "text-sand-100/80" : "text-ink-muted")}>{m.blurb}</p>
              <dl className={cn("mt-3 space-y-1 text-xs", on ? "text-sand-100/90" : "text-ink-soft")}>
                <div className="flex justify-between gap-2"><dt className={on ? "text-sand-100/70" : "text-ink-muted"}>Input</dt><dd>${m.inputPerM}/M tokens</dd></div>
                <div className="flex justify-between gap-2"><dt className={on ? "text-sand-100/70" : "text-ink-muted"}>Output</dt><dd>${m.outputPerM}/M tokens</dd></div>
                <div className="flex justify-between gap-2"><dt className={on ? "text-sand-100/70" : "text-ink-muted"}>Per draft</dt><dd className="font-medium">{m.perDraft}</dd></div>
              </dl>
              <p className={cn("mt-3 border-t pt-2 text-[0.7rem]", on ? "border-sand-50/20 text-sand-100/80" : "border-ink/10 text-ink-muted")}>{m.bestFor}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={pending || choice === selected}
          className="rounded-full bg-clay-500 px-6 py-2.5 text-xs uppercase tracking-eyebrow text-sand-50 hover:bg-clay-600 disabled:opacity-40"
        >
          {pending ? "Saving…" : choice === selected ? "Saved" : "Save model"}
        </button>
        <p className="text-xs text-ink-muted">
          {source === "selected" && "Using your saved choice."}
          {source === "env" && "Currently set by the ANTHROPIC_MODEL env var; saving here overrides it."}
          {source === "default" && "Using the default until you choose."}
          {savedAt && <span className="ml-2 text-palm-600">✓ Saved {savedAt}</span>}
        </p>
      </div>
      <p className="mt-2 text-xs text-ink-muted">Prices are Anthropic API list rates per 1M tokens. &ldquo;Per draft&rdquo; is a rough estimate for one full retreat draft.</p>
    </div>
  );
}
