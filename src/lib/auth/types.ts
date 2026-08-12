export type Role = "guest" | "host" | "admin";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** When acting as a host, the host persona slug they own. */
  hostSlug?: string;
  /** True when running without a live Supabase (cookie-backed demo identity). */
  demo: boolean;
}
