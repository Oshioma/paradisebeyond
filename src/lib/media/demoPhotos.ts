import { getMediaGroups, type Slot } from "./registry";

/**
 * Demo photography. Real external photo hosts are blocked in the build sandbox,
 * so we can't bundle photos here — but on a normal deployment (Vercel / local)
 * these Lorem Picsum URLs resolve to real, deterministic photographs. The admin
 * "Load demo photography" action points every slot at one of these; each is
 * still replaceable per-slot with real Zanzibar photography in the Media manager.
 */
export function demoPhotoUrl(slot: Slot): string {
  // Deterministic per slot, sized to the slot's aspect.
  return `https://picsum.photos/seed/${encodeURIComponent(slot.key)}/${slot.w}/${slot.h}`;
}

export function allDemoPhotos(): { key: string; url: string }[] {
  return getMediaGroups().flatMap((g) => g.slots.map((s) => ({ key: s.key, url: demoPhotoUrl(s) })));
}
