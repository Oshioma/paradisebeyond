import { slotKey } from "@/lib/images";
import { EXPERIENCES } from "@/lib/data/experiences";
import { HOSTS } from "@/lib/data/hosts";
import { CATEGORIES } from "@/lib/data/categories";
import { DESTINATIONS } from "@/lib/data/destinations";

/**
 * Every image slot on the site, so the admin media manager can list and replace
 * them. A slot's `key` is the stable identity an upload is stored against.
 */
export interface Slot {
  key: string;
  seed: string;
  label: string;
  w: number;
  h: number;
}
export interface SlotGroup {
  title: string;
  slots: Slot[];
}

function slot(seed: string, label: string, w = 1200, h = 800): Slot {
  return { key: slotKey(seed), seed, label, w, h };
}

// Ad-hoc seeds used directly in page layouts.
const SITE_SLOTS: Slot[] = [
  slot("home-hero-zanzibar", "Homepage hero", 2000, 1200),
  slot("home-editorial", "Homepage editorial", 1000, 1250),
  slot("home-host", "Homepage host banner", 2000, 1200),
  slot("escape-7", "7-day escape card", 1100, 800),
  slot("escape-14", "14-day escape card", 1100, 800),
  slot("host-landing", "Host page hero", 2000, 1200),
  slot("host-build", "Host page — building", 900, 1125),
  slot("login-cover", "Sign-in cover", 2000, 1200),
];

export function getMediaGroups(
  // Real hosts (including ones created in the Desk) so their photo slots show up
  // here too — not just the built-in seed hosts. Deduped by image seed.
  hosts: { imageSeed: string; name: string }[] = HOSTS,
): SlotGroup[] {
  const groups: SlotGroup[] = [];

  groups.push({ title: "Site", slots: SITE_SLOTS });

  groups.push({
    title: "Destinations",
    slots: DESTINATIONS.map((d) => slot(d.imageSeed, d.name, 2000, 1200)),
  });

  groups.push({
    title: "Categories",
    slots: CATEGORIES.map((c) => slot(c.imageSeed, c.name, 700, 933)),
  });

  const seenHost = new Set<string>();
  const hostList = [...HOSTS, ...hosts].filter((h) => {
    if (seenHost.has(h.imageSeed)) return false;
    seenHost.add(h.imageSeed);
    return true;
  });
  groups.push({
    title: "Hosts",
    slots: hostList.flatMap((h) => [
      slot(h.imageSeed, `${h.name} — portrait`, 600, 720),
      slot(`host-cover-${h.imageSeed}`, `${h.name} — cover`, 2000, 1200),
    ]),
  });

  for (const e of EXPERIENCES) {
    groups.push({
      title: `Experience · ${e.name}`,
      slots: [
        slot(e.heroImageSeed, "Hero", 2000, 1200),
        ...e.gallerySeeds.map((s, i) => slot(s, `Gallery ${i + 1}`)),
        ...e.highlights.map((hl) => slot(hl.imageSeed, `Highlight — ${hl.title}`, 640, 400)),
        ...e.stay.imageSeeds.map((s, i) => slot(s, `Stay ${i + 1}`, 400, 400)),
      ],
    });
  }

  return groups;
}
