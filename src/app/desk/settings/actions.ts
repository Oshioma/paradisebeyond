"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { setSelectedModel } from "@/lib/ai/settings";
import { findModel } from "@/lib/ai/models";

/** Admin: choose the AI model used by the Retreat Builder. */
export async function setAiModel(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = String(formData.get("model") ?? "");
  if (!findModel(id)) return;
  await setSelectedModel(id);
  revalidatePath("/desk/settings");
}
