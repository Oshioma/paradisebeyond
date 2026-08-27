import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { getManagedExperiences } from "@/lib/data/repository";
import { getContactsForExperienceIds, getExperienceIdsBySlugs } from "@/lib/memories/store";
import { ContactsComposer, type ContactGroup } from "@/components/host/ContactsComposer";

export const metadata: Metadata = { title: "Contacts", robots: { index: false } };

/**
 * Imported contacts (past attendees brought in from an external guest list).
 * A host can email them the branded photos/review invite, just like past
 * guests who booked through the platform.
 */
export default async function StudioContactsPage() {
  const user = await requireRole("host", "/studio/contacts");
  const experiences = await getManagedExperiences(user);
  const idsBySlug = await getExperienceIdsBySlugs(experiences.map((e) => e.slug));
  const contacts = await getContactsForExperienceIds(Object.values(idsBySlug));

  // Every managed retreat gets a section — so there's always somewhere to paste
  // contacts in, even before any have been added.
  const groups: ContactGroup[] = experiences.map((e) => {
    const id = idsBySlug[e.slug];
    return {
      experienceSlug: e.slug,
      experienceName: e.name,
      contacts: contacts
        .filter((c) => c.experienceId === id)
        .map((c) => ({ id: c.id, name: c.name, email: c.email, status: c.status, invitedAt: c.invitedAt })),
    };
  });

  return (
    <div className="container-editorial py-12">
      <header>
        <p className="eyebrow text-ocean-700">Host Studio</p>
        <h1 className="mt-2 text-display font-semibold text-ink">Contacts</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          People who joined your retreat, imported from your guest list. Email them a branded invitation to add
          their photos and review the retreat — each gets a personal link, no sign-in needed.
        </p>
      </header>

      {groups.length === 0 ? (
        <p className="mt-10 rounded-xl2 border border-dashed border-ink/20 py-16 text-center text-ink-muted">
          No live retreats yet — publish a retreat and you can add contacts to it here.
        </p>
      ) : (
        <div className="mt-10 space-y-10">
          {groups.map((g) => (
            <ContactsComposer key={g.experienceSlug} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}
