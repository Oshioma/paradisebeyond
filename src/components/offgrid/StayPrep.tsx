import Link from "next/link";
import type { HydratedBooking } from "@/lib/booking/types";
import type { Message } from "@/lib/messaging/types";
import type { TripPrep } from "@/lib/trip/types";
import { OFF_GRID_FACILITIES, type OffGridDetails } from "@/lib/offgrid/types";
import { buildChecklist, type ChecklistSide } from "@/lib/offgrid/checklist";
import type { StayChecklists } from "@/lib/offgrid/checklistStore";
import { accommodationLine, contributionLine, mealsLine } from "@/lib/offgrid/summary";
import { bookingDates } from "@/lib/data/bookings";
import { formatDateRange, formatFullDate } from "@/lib/utils";
import { saveArrivalDetails, saveDirections, saveEmergencyContact, saveIntroduction } from "@/lib/offgrid/checklistActions";
import { ChecklistList, DraftForm, type ChecklistRow } from "@/components/offgrid/StayChecklist";

/**
 * "Before you go" (traveller) and "Before they arrive" (host) for a Spend Time
 * Off Grid stay. Both read the same two checklist rows; each side sees the
 * other's notes because they're preparing for the same stay.
 */

interface Props {
  trip: HydratedBooking & { experience: { offGrid?: OffGridDetails } };
  checklists: StayChecklists;
  messages: Message[];
  prep: TripPrep | null;
  /** First names, for friendlier copy. */
  hostName: string;
  guestName: string;
}

function rowsFor(side: ChecklistSide, p: Props): ChecklistRow[] {
  return buildChecklist({ side, guest: p.checklists.guest, host: p.checklists.host, messages: p.messages, prep: p.prep }).map(
    ({ key, label, hint, kind, done, canToggle }) => ({ key, label, hint, kind, done, canToggle }),
  );
}

export function TravellerBeforeYouGo(p: Props) {
  const { trip, checklists } = p;
  const g = checklists.guest;
  return (
    <div className="space-y-8">
      <ChecklistList bookingId={trip.id} rows={rowsFor("guest", p)} eyebrow="Before you go" title="Get to know each other before you travel." />

      <Agreed trip={trip} />

      <Panel
        title={g.introduction ? "Your introduction" : "Tell your host a little about yourself"}
        intro={g.introduction ? `Sent to ${p.hostName} in your messages.` : "Who are you, why would you like to stay here, and what interests you about this way of life?"}
      >
        {g.introduction ? (
          <p className="whitespace-pre-line rounded-xl bg-sand-50 p-4 text-ink-soft">{g.introduction}</p>
        ) : (
          <DraftForm
            bookingId={trip.id}
            draftKey={`stay-intro:${trip.id}`}
            fields={[{ name: "introduction", label: "Your introduction", type: "textarea", rows: 6, required: true, placeholder: "A few sentences — no need for a CV." }]}
            initial={{}}
            action={saveIntroduction}
            submitLabel="Send introduction"
            savedLabel="Sent"
          />
        )}
      </Panel>

      <Panel title="Arrival details" intro={`You arrive on ${formatFullDate(bookingDates(trip).start)}. Let ${p.hostName} know roughly when and how.`}>
        <DraftForm
          bookingId={trip.id}
          draftKey={`stay-arrival:${trip.id}`}
          fields={[
            { name: "arrivalTime", label: "Approximate arrival time", placeholder: "e.g. Afternoon, around 3pm" },
            { name: "transport", label: "How you're getting there", placeholder: "e.g. Ferry, then taxi" },
            { name: "pickup", label: "Pickup needed?", placeholder: "e.g. From the ferry port, if possible" },
          ]}
          initial={{ arrivalTime: g.arrival?.time, transport: g.arrival?.transport, pickup: g.arrival?.pickup }}
          action={saveArrivalDetails}
          submitLabel="Save arrival details"
        />
        {checklists.host.directions && (
          <div className="mt-5 rounded-xl bg-sand-50 p-4">
            <p className="text-[0.66rem] font-semibold uppercase tracking-eyebrow text-forest-700">Directions from {p.hostName}</p>
            <p className="mt-1.5 whitespace-pre-line text-ink-soft">{checklists.host.directions}</p>
          </div>
        )}
      </Panel>

      <Panel title="Emergency contact" intro={`Someone ${p.hostName} can reach if something goes wrong while you’re there. Private — only you and your host can see it.`}>
        <DraftForm
          bookingId={trip.id}
          draftKey={`stay-emergency:${trip.id}`}
          fields={[
            { name: "emergencyName", label: "Name", required: true },
            { name: "emergencyRelationship", label: "Relationship", placeholder: "e.g. Sister" },
            { name: "emergencyPhone", label: "Phone", type: "tel", required: true },
            { name: "emergencyEmail", label: "Email", type: "email" },
          ]}
          initial={{
            emergencyName: p.prep?.emergencyName,
            emergencyRelationship: p.prep?.emergencyRelationship,
            emergencyPhone: p.prep?.emergencyPhone,
            emergencyEmail: p.prep?.emergencyEmail,
          }}
          action={saveEmergencyContact}
          submitLabel="Save contact"
        />
      </Panel>

      <ShareYourPlans />
    </div>
  );
}

export function HostBeforeTheyArrive(p: Props) {
  const { trip, checklists } = p;
  const g = checklists.guest;
  return (
    <div className="space-y-8">
      <ChecklistList bookingId={trip.id} rows={rowsFor("host", p)} eyebrow="Before they arrive" title={`Get to know ${p.guestName} before they travel.`} />

      <Panel title="Their introduction">
        {g.introduction ? (
          <p className="whitespace-pre-line rounded-xl bg-sand-50 p-4 text-ink-soft">{g.introduction}</p>
        ) : (
          <p className="text-sm text-ink-muted">{p.guestName} hasn&apos;t written their introduction yet.</p>
        )}
      </Panel>

      <Panel title="Their arrival">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label="Dates">{formatDateRange(bookingDates(trip).start, bookingDates(trip).end)}</Fact>
          <Fact label="Approximate time">{g.arrival?.time || "Not shared yet"}</Fact>
          <Fact label="Getting there">{g.arrival?.transport || "Not shared yet"}</Fact>
          <Fact label="Pickup">{g.arrival?.pickup || "Not shared yet"}</Fact>
        </dl>
      </Panel>

      <Panel title="Directions & meeting point" intro="How to find you, where to meet, and any pickup you can offer.">
        <DraftForm
          bookingId={trip.id}
          draftKey={`stay-directions:${trip.id}`}
          fields={[{ name: "directions", label: "Directions", type: "textarea", rows: 5, required: true }]}
          initial={{ directions: checklists.host.directions }}
          action={saveDirections}
          submitLabel="Save directions"
        />
      </Panel>

      <Panel title="Emergency contact" intro="Private. Use it only if something goes wrong during the stay.">
        {p.prep?.emergencyName ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <Fact label="Name">{p.prep.emergencyName}{p.prep.emergencyRelationship ? ` (${p.prep.emergencyRelationship})` : ""}</Fact>
            <Fact label="Phone">{p.prep.emergencyPhone}</Fact>
            {p.prep.emergencyEmail && <Fact label="Email">{p.prep.emergencyEmail}</Fact>}
          </dl>
        ) : (
          <p className="text-sm text-ink-muted">{p.guestName} hasn&apos;t shared an emergency contact yet.</p>
        )}
      </Panel>
    </div>
  );
}

/** What the listing says the stay involves — the basis both sides confirm. */
function Agreed({ trip }: { trip: Props["trip"] }) {
  const o = trip.experience.offGrid;
  if (!o) return null;
  const tasks = o.contribution.typicalTasks.filter(Boolean);
  const connectivity = OFF_GRID_FACILITIES.filter((f) => f.group === "Connectivity" && o.facilities.includes(f.key)).map((f) => f.label);
  const bring = o.practical.whatToBring.filter(Boolean);
  return (
    <Panel title="What you're agreeing to" intro="From the listing. Talk through anything that's unclear before you travel.">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Fact label="Dates">{formatDateRange(bookingDates(trip).start, bookingDates(trip).end)}</Fact>
        <Fact label="Help">{contributionLine(o)}</Fact>
        {tasks.length > 0 && <Fact label="Typical tasks">{tasks.join(", ")}</Fact>}
        <Fact label="Accommodation">{accommodationLine(o)}</Fact>
        <Fact label="Food">{mealsLine(o)}{o.food.dietaryOptions.length ? ` · ${o.food.dietaryOptions.join(", ")}` : ""}</Fact>
        {connectivity.length > 0 && <Fact label="Connectivity">{connectivity.join(", ")}</Fact>}
        <Fact label="Transport">{o.practical.transfersAvailable ? "Your host can help with transfers" : "You arrange your own journey"}</Fact>
        {o.houseRules && <Fact label="House rules">{o.houseRules}</Fact>}
        {bring.length > 0 && <Fact label="Bring">{bring.join(", ")}</Fact>}
      </dl>
      <p className="mt-4 text-sm text-ink-muted">Also worth asking: who else will be there during your stay?</p>
    </Panel>
  );
}

function ShareYourPlans() {
  return (
    <div className="rounded-xl2 border border-forest-700/20 p-5 sm:p-6">
      <p className="font-display text-lg font-semibold text-ink">Share your plans with someone you trust</p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
        Tell a friend or family member where you&apos;re going, who you&apos;re staying with, when you arrive and leave, and how
        to reach your host. <Link href="/trust" className="text-forest-700 underline underline-offset-4">How we keep stays safer</Link>
      </p>
    </div>
  );
}

function Panel({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl2 border border-ink/10 bg-sand-50 p-5 sm:p-6">
      <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
      {intro && <p className="mt-1.5 max-w-prose text-sm text-ink-muted">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.66rem] font-semibold uppercase tracking-eyebrow text-ink-muted">{label}</dt>
      <dd className="mt-1 text-[0.95rem] text-ink">{children}</dd>
    </div>
  );
}
