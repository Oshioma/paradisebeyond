import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "12–18 October" or "28 Feb – 6 Mar" style range. */
export function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso + "T00:00:00Z");
  const end = new Date(endIso + "T00:00:00Z");
  const sd = start.getUTCDate();
  const ed = end.getUTCDate();
  const sm = start.getUTCMonth();
  const em = end.getUTCMonth();
  if (sm === em) {
    return `${sd}–${ed} ${MONTHS[em]}`;
  }
  return `${sd} ${MONTHS[sm].slice(0, 3)} – ${ed} ${MONTHS[em].slice(0, 3)}`;
}

export function formatFullDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function monthKey(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function monthName(monthIndex: number): string {
  return MONTHS[monthIndex];
}
