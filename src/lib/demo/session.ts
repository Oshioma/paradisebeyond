import { cookies } from "next/headers";
import type { Role, SessionUser } from "@/lib/auth/types";

/**
 * Demo session — active only when Supabase isn't configured.
 *
 * A signed-in identity is represented by a small cookie holding a role. This
 * lets you walk through the guest, host and admin experiences end-to-end with
 * no backend. In production the real Supabase session replaces all of this.
 */

export const DEMO_COOKIE = "pb_demo_role";

const DEMO_USERS: Record<Role, SessionUser> = {
  guest: {
    id: "demo-guest",
    email: "guest@paradisebeyond.demo",
    name: "Ava Traveller",
    role: "guest",
    demo: true,
  },
  host: {
    id: "demo-host",
    email: "amina@paradisebeyond.demo",
    name: "Amina Yusuf",
    role: "host",
    hostSlug: "amina-yusuf",
    demo: true,
  },
  admin: {
    id: "demo-admin",
    email: "desk@paradisebeyond.demo",
    name: "Paradise Desk",
    role: "admin",
    demo: true,
  },
};

export function demoUserForRole(role: Role): SessionUser {
  return DEMO_USERS[role];
}

export function getDemoUser(): SessionUser | null {
  const role = cookies().get(DEMO_COOKIE)?.value as Role | undefined;
  if (role && (role === "guest" || role === "host" || role === "admin")) {
    return DEMO_USERS[role];
  }
  return null;
}
