export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "rejected";

export interface HostApplication {
  id: string;
  name: string;
  email: string;
  destination: string;
  retreatIdea: string;
  duration: "7" | "14";
  approxDates: string;
  expectedPriceUsd: number;
  expectedGroupSize: number;
  accommodation: string;
  background: string;
  status: ApplicationStatus;
  createdAt: string;
}

/** Seed applications for the admin desk to review in demo mode. */
export const DEMO_APPLICATIONS: HostApplication[] = [
  {
    id: "app-1",
    name: "Leila Rahman",
    email: "leila@example.com",
    destination: "Zanzibar",
    retreatIdea: "A women's sound-healing and free-diving week combining breathwork with the ocean.",
    duration: "7",
    approxDates: "March 2027",
    expectedPriceUsd: 1850,
    expectedGroupSize: 10,
    accommodation: "Boutique eco-lodge, Matemwe",
    background: "Sound therapist & AIDA free-diving instructor, 6 years running retreats in Bali.",
    status: "submitted",
    createdAt: "2026-08-05",
  },
  {
    id: "app-2",
    name: "Tomás Vella",
    email: "tomas@example.com",
    destination: "Pemba",
    retreatIdea: "A 14-day sailing and marine-photography voyage around the Pemba channel.",
    duration: "14",
    approxDates: "January 2027",
    expectedPriceUsd: 3400,
    expectedGroupSize: 8,
    accommodation: "Liveaboard dhow + one night eco-lodge",
    background: "Yachtmaster & published marine photographer.",
    status: "under_review",
    createdAt: "2026-08-02",
  },
  {
    id: "app-3",
    name: "Grace Wanjiru",
    email: "grace@example.com",
    destination: "Zanzibar",
    retreatIdea: "Farm-to-table permaculture week on an organic spice farm.",
    duration: "7",
    approxDates: "November 2026",
    expectedPriceUsd: 1450,
    expectedGroupSize: 12,
    accommodation: "Farm guesthouse, central Unguja",
    background: "Permaculture designer running a working spice farm.",
    status: "submitted",
    createdAt: "2026-08-09",
  },
];
