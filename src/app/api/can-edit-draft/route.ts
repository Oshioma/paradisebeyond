import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { canEditDraft } from "@/lib/retreat/coHosts";

export const dynamic = "force-dynamic";

/**
 * Authoritative check for the owner "Edit this retreat" affordance: given a
 * retreat's draft id, may the current viewer edit it? Uses the real permission
 * model (admin / owner / co-host editor) rather than the client guessing from
 * host slugs, so co-hosts always get the button.
 */
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ canEdit: false });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ canEdit: false });
  const canEdit = await canEditDraft({ id: user.id, role: user.role }, id);
  return NextResponse.json({ canEdit, admin: user.role === "admin" });
}
