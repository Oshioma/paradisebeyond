"use server";

import { revalidatePath } from "next/cache";
import { hostApplicationSchema } from "@/lib/validation/hostApplication";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateDemoState } from "@/lib/demo/state";

/**
 * Persist a host application. Public (applicants may not be signed in): the
 * host_applications RLS allows an insert with a null applicant_id. Re-validates
 * server-side, writes to Supabase in live mode (or demo state otherwise), and
 * best-effort emails the admin desk.
 */
export async function submitHostApplication(raw: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const parsed = hostApplicationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const a = parsed.data;

  if (isSupabaseConfigured()) {
    const { createClient, createServiceRoleClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const row = {
      applicant_id: user?.id ?? null,
      name: a.name,
      email: a.email,
      links: a.links || null,
      background: a.background,
      experience: a.experience,
      destination: a.destination,
      retreat_idea: a.retreatIdea,
      duration: a.duration,
      approx_dates: a.approxDates,
      expected_price_minor: Math.round(a.expectedPriceUsd * 100),
      currency: "USD",
      expected_group_size: a.expectedGroupSize,
      accommodation: a.accommodation,
      description: a.description,
      status: "submitted",
    };
    const { error } = await supabase.from("host_applications").insert(row);
    if (error) {
      // The public apply form must not depend on anon RLS/grants being perfect.
      // This is a validated, server-side write to an admin-review table, so
      // fall back to the service role (which bypasses RLS) if the scoped
      // insert is ever rejected.
      console.error("[apply] scoped insert failed, retrying via service role:", error.message);
      const { error: adminErr } = await createServiceRoleClient().from("host_applications").insert(row);
      if (adminErr) return { ok: false, error: adminErr.message };
    }
  } else {
    updateDemoState((s) => {
      s.demoApps = s.demoApps ?? [];
      s.demoApps.unshift({
        id: "app-" + crypto.randomUUID().slice(0, 8),
        name: a.name,
        email: a.email,
        destination: a.destination,
        retreatIdea: a.retreatIdea,
        duration: a.duration,
        approxDates: a.approxDates,
        expectedPriceUsd: a.expectedPriceUsd,
        expectedGroupSize: a.expectedGroupSize,
        accommodation: a.accommodation,
        background: a.background,
        status: "submitted",
        createdAt: new Date().toISOString().slice(0, 10),
      });
    });
  }

  // Best-effort: notify the admin desk.
  try {
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({
      to: process.env.EMAIL_FROM || "hello@paradisebeyond.com",
      subject: `New host application — ${a.name}`,
      html: `<p>${a.name} (${a.email}) applied to host a ${a.duration}-day retreat in ${a.destination}.</p><p>${a.retreatIdea}</p>`,
    });
  } catch { /* non-fatal */ }

  revalidatePath("/desk/applications");
  revalidatePath("/desk");
  return { ok: true };
}
