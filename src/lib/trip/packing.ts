import type { Experience } from "@/lib/types";

export interface PackingGroup {
  title: string;
  items: string[];
}

/**
 * Generate a tailored packing list from the experience — its duration, its
 * categories and its destination. Deterministic (no storage): the guest ticks
 * items client-side. Tuned for warm, coastal destinations like Zanzibar; the
 * category add-ons layer on top.
 */
export function packingList(e: Experience): PackingGroup[] {
  const cats = new Set(e.categorySlugs);
  const groups: PackingGroup[] = [];

  groups.push({
    title: "Essentials",
    items: [
      "Passport (valid 6+ months) and any visa",
      "Travel insurance documents",
      "This booking confirmation and your flight details",
      "A card and a little local cash for tips",
      "Any personal medication, in its original packaging",
    ],
  });

  groups.push({
    title: "For the climate",
    items: [
      "Light, breathable clothing for warm days",
      "A light layer for cooler evenings and sea breeze",
      "High-SPF reef-safe sunscreen",
      "Sun hat and sunglasses",
      "Insect repellent",
      "Reusable water bottle",
    ],
  });

  const beachy = cats.has("wellness") || cats.has("nature") || cats.has("paradise-holidays") || cats.has("adventure");
  if (beachy) {
    groups.push({
      title: "For the water & sand",
      items: ["Swimwear (a spare is wise)", "Quick-dry towel", "Sandals or water shoes", "A dry bag for phone and valuables"],
    });
  }

  if (cats.has("wellness")) {
    groups.push({ title: "For your practice", items: ["Comfortable yoga / movement wear", "A light shawl for meditation", "A journal and pen"] });
  }
  if (cats.has("adventure") || cats.has("nature")) {
    groups.push({ title: "For adventures", items: ["Sturdy trainers or hiking shoes", "A small daypack", "Head torch", "Refillable snacks for long days"] });
  }
  if (cats.has("food")) {
    groups.push({ title: "For the table", items: ["Stretchy trousers (you'll eat well)", "A note of any allergies to share with your host"] });
  }
  if (cats.has("creative")) {
    groups.push({ title: "For making", items: ["Your sketchbook / camera / instrument", "Anything you create best with"] });
  }

  if (e.duration >= 14) {
    groups.push({ title: "For a longer stay", items: ["Laundry essentials or plan to wash midway", "A book or two for slow afternoons", "Any home comforts for two weeks away"] });
  }

  return groups;
}
