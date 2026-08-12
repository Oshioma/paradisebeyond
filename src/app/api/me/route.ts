import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Lightweight "who am I" for the client header. Returns only what the nav needs
 * — role and first name — so the header can show Studio/Admin links without
 * forcing the whole (mostly static) site to render dynamically.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ role: null });
  return NextResponse.json({
    role: user.role,
    name: user.name?.split(" ")[0] ?? "",
    hostSlug: user.hostSlug ?? null,
  });
}
