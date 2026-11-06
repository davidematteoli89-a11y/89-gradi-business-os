"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dataMode, getDataset } from "@/lib/data/source";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/validation/finance";

const schema = z.object({
  taskId: z.string().min(1),
  status: z.enum(["da_fare", "in_corso", "in_approvazione", "approvato", "pubblicato", "annullato"]),
});

export async function setMarketingStatus(input: unknown): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Stato non valido." };
  const ds = await getDataset();
  if (ds.currentUser.role === "viewer") return { ok: false, message: "Il tuo profilo è in sola lettura." };
  const label = { da_fare: "Riportata a da fare", in_corso: "In corso", in_approvazione: "Inviata in approvazione", approvato: "Approvata", pubblicato: "Segnata come pubblicata", annullato: "Annullata" }[parsed.data.status];
  if (dataMode() === "demo") return { ok: true, message: `${label}. Modalità demo: non salvato.` };
  const sb = await createSupabaseServerClient();
  const { error } = await sb.from("marketing_tasks").update({ status: parsed.data.status }).eq("id", parsed.data.taskId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/marketing");
  return { ok: true, message: label };
}
