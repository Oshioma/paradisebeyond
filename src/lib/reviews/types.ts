/** A guest review of a completed trip. Money-free; ratings are 1–5 integers. */
export interface Review {
  id: string;
  bookingId: string;
  experienceSlug: string;
  guestId: string;
  guestName: string;
  ratingOverall: number;
  ratingHost?: number;
  ratingAccommodation?: number;
  ratingActivities?: number;
  ratingFood?: number;
  ratingValue?: number;
  body: string;
  published: boolean;
  createdAt: string;
  /** Filled on the admin moderation list. */
  experienceName?: string;
}

export interface ReviewSummary {
  average: number; // 0 when no reviews
  count: number;
}

export function summarize(reviews: Review[]): ReviewSummary {
  if (!reviews.length) return { average: 0, count: 0 };
  const sum = reviews.reduce((s, r) => s + r.ratingOverall, 0);
  return { average: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}
