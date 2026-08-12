import type { SupportContact } from "@/lib/trip/support";
import type { TripPrep } from "@/lib/trip/types";

/** Local support numbers plus the guest's own emergency contact. Display only. */
export function EmergencyContacts({ contacts, prep }: { contacts: SupportContact[]; prep: TripPrep | null }) {
  return (
    <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-5">
      <h4 className="font-display text-lg font-semibold text-ink">Emergency contacts</h4>
      <p className="mt-1 text-sm text-ink-muted">24/7 support and local numbers for your trip.</p>
      <ul className="mt-4 space-y-3">
        {contacts.map((c) => (
          <li key={c.label}>
            <p className="text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">{c.label}</p>
            <p className="font-medium text-ink">{c.value}</p>
            {c.note && <p className="text-xs text-ink-muted">{c.note}</p>}
          </li>
        ))}
      </ul>
      {(prep?.emergencyName || prep?.emergencyPhone) && (
        <div className="mt-4 border-t border-ink/10 pt-3">
          <p className="text-[0.66rem] uppercase tracking-eyebrow text-ink-muted">Your emergency contact</p>
          <p className="font-medium text-ink">{prep.emergencyName}{prep.emergencyPhone ? ` · ${prep.emergencyPhone}` : ""}</p>
        </div>
      )}
    </div>
  );
}
