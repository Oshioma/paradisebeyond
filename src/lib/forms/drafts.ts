/**
 * Browser-side form drafts: what someone has typed survives a refresh, and is
 * cleared on submit or sign-out. Never store passwords or card details here.
 * Keys share one prefix so sign-out can clear them all.
 */
export const DRAFT_PREFIX = "draft:";

export function loadDraft<T>(key: string): Partial<T> | null {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    return raw ? (JSON.parse(raw) as Partial<T>) : null;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, value: T): void {
  try {
    localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(value));
  } catch { /* storage full / blocked — drafts are best-effort */ }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(DRAFT_PREFIX + key);
  } catch { /* ignore */ }
}

/** Clear every form draft (sign-out). Also clears the retreat builder's local
 *  copies (`pb:retreat:*`); its server-side autosave keeps the real draft. */
export function clearAllDrafts(): void {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(DRAFT_PREFIX) || k.startsWith("pb:retreat:")) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}
