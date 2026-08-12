export interface SupportContact {
  label: string;
  value: string;
  note?: string;
}

const PARADISE_LINE: SupportContact = {
  label: "Paradise Beyond 24/7 support",
  value: "+44 20 4525 0199",
  note: "Reach the team any time during your trip.",
};

/** Local emergency & support numbers, keyed by destination slug. */
const BY_DESTINATION: Record<string, SupportContact[]> = {
  zanzibar: [
    { label: "Emergency services (Tanzania)", value: "112", note: "Police, fire and ambulance." },
    { label: "Tourist police, Zanzibar", value: "+255 24 223 0700" },
    { label: "Mnazi Mmoja Hospital, Stone Town", value: "+255 24 223 1071" },
  ],
  pemba: [
    { label: "Emergency services (Tanzania)", value: "112", note: "Police, fire and ambulance." },
    { label: "Abdalla Mzee Hospital, Mkoani", value: "+255 24 245 2003" },
  ],
};

export function supportContacts(destinationSlug: string): SupportContact[] {
  return [PARADISE_LINE, ...(BY_DESTINATION[destinationSlug] ?? [{ label: "Local emergency services", value: "Ask your host on arrival" }])];
}
