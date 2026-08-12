import type { Destination } from "@/lib/types";

/**
 * The Before You Go preparation area. Content is destination-aware. Flights are
 * NEVER sold here — we point guests to arrange their own, then collect their
 * details for transfer coordination (see FlightForm).
 */
const ITEMS: { title: string; body: string; icon: string }[] = [
  { icon: "✈", title: "Flights", body: "Book your own international flights into the nearest airport for your experience. Aim to arrive on Day 1 before the afternoon so you don't miss the welcome." },
  { icon: "🛂", title: "Visa", body: "Most nationalities can obtain a visa on arrival or an e-visa. Check your specific requirements a few weeks ahead." },
  { icon: "📘", title: "Passport", body: "Make sure your passport is valid for at least six months beyond your travel dates, with a couple of blank pages." },
  { icon: "🛡", title: "Travel insurance", body: "Required. Please arrange comprehensive travel insurance that covers medical care and any activities on your itinerary." },
  { icon: "💉", title: "Health & vaccinations", body: "Consult a travel clinic about recommended vaccinations and anti-malarials for the region well before you fly." },
  { icon: "💵", title: "Currency", body: "Bring some cash for personal spending and tips. Cards are accepted at larger venues; smaller places are cash-only." },
  { icon: "☀", title: "Weather", body: "Expect warm, humid days. We'll share a detailed forecast closer to departure so you can pack for the conditions." },
  { icon: "🎒", title: "What to pack", body: "Light, breathable clothing, swimwear, reef-safe sunscreen, a refillable water bottle and any personal medication." },
  { icon: "🛬", title: "Airport arrival", body: "Once you land, look for your Paradise Beyond transfer. Full meeting instructions are shared before you travel." },
  { icon: "🚐", title: "Transfers", body: "Airport transfers are included. Enter your flight details below so we can be there when you land." },
  { icon: "📍", title: "Local information", body: "Tipping, connectivity, customs and etiquette — a local briefing is shared in your documents before departure." },
];

export function BeforeYouGo({ destination }: { destination?: Destination }) {
  return (
    <div>
      {destination && (
        <p className="mb-6 max-w-prose text-ink-muted">
          Everything you need to prepare for {destination.name}. Get yourself
          there — we take care of the rest.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((it) => (
          <div key={it.title} className="rounded-xl2 border border-ink/10 bg-sand-50 p-5">
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-lg">{it.icon}</span>
              <h4 className="font-display text-lg font-semibold text-ink">{it.title}</h4>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{it.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
