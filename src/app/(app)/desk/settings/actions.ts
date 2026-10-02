"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { setSelectedModel } from "@/lib/ai/settings";
import { findModel } from "@/lib/ai/models";
import { sendEmail, isEmailConfigured, domainOf } from "@/lib/email";
import { PARADISE_BEYOND, SPEND_TIME_OFF_GRID } from "@/lib/brand/config";
import { testEmail } from "@/lib/email/templates";

/** Admin: choose the AI model used by the Retreat Builder. */
export async function setAiModel(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = String(formData.get("model") ?? "");
  if (!findModel(id)) return;
  await setSelectedModel(id);
  revalidatePath("/desk/settings");
}

export type TestEmailSend = { brand: string; from: string; ok: boolean; configured: boolean; error?: string };
export type TestEmailResult = { ok: boolean; to: string; sends: TestEmailSend[] };

/**
 * Send a live test email from EACH site's sender to the signed-in admin and
 * return the SMTP server's actual result — so "does email actually send?" gets
 * a real answer (missing login, wrong password, sender not allowed). The app's
 * own sends are best-effort and swallow errors; this one surfaces them.
 */
export async function sendTestEmail(): Promise<TestEmailResult> {
  const user = await requireRole("admin", "/desk/settings");
  const senders = [
    { brand: PARADISE_BEYOND.name, from: process.env.EMAIL_FROM || "Paradise Beyond <hello@paradisebeyond.com>" },
    { brand: SPEND_TIME_OFF_GRID.name, from: SPEND_TIME_OFF_GRID.emailFrom as string },
  ];

  const sends: TestEmailSend[] = [];
  for (const s of senders) {
    if (!isEmailConfigured(s.from)) {
      sends.push({
        ...s,
        ok: false,
        configured: false,
        error: `No SMTP login for ${domainOf(s.from)} — set ${s.brand === PARADISE_BEYOND.name ? "SMTP_USER / SMTP_PASSWORD" : "OFFGRID_SMTP_USER / OFFGRID_SMTP_PASSWORD"}. Nothing is delivered from this site until then.`,
      });
      continue;
    }
    const res = await sendEmail({ to: user.email, from: s.from, ...testEmail(user.name, s.brand) });
    sends.push({ ...s, ok: res.ok, configured: true, error: res.error });
  }
  return { ok: sends.every((s) => s.ok), to: user.email, sends };
}
