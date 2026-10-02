"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { setSelectedModel } from "@/lib/ai/settings";
import { findModel } from "@/lib/ai/models";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { testEmail } from "@/lib/email/templates";

/** Admin: choose the AI model used by the Retreat Builder. */
export async function setAiModel(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = String(formData.get("model") ?? "");
  if (!findModel(id)) return;
  await setSelectedModel(id);
  revalidatePath("/desk/settings");
}

export type TestEmailResult = { ok: boolean; configured: boolean; to: string; error?: string };

/**
 * Send a live test email to the signed-in admin and return Resend's actual
 * result — so "does email actually send?" gets a real answer (including the
 * common failures: missing key, unverified EMAIL_FROM domain, bad key). The
 * app's own sends are best-effort and swallow errors; this one surfaces them.
 */
export async function sendTestEmail(): Promise<TestEmailResult> {
  const user = await requireRole("admin", "/desk/settings");

  if (!isEmailConfigured()) {
    return {
      ok: false,
      configured: false,
      to: user.email,
      error: "RESEND_API_KEY isn't set — email sending is a no-op right now, so nothing is actually delivered.",
    };
  }

  const res = await sendEmail({ to: user.email, ...testEmail(user.name) });
  return { ok: res.ok, configured: true, to: user.email, error: res.error };
}
