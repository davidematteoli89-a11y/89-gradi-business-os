"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dataMode, getDataset } from "@/lib/data/source";
import { nextEventCode } from "@/lib/domain/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { eventSchema } from "@/lib/validation/events";
import type { ActionResult } from "@/lib/validation/finance";

const DEMO = "Modalità demo: nessuna modifica salvata.";

async function guard(): Promise<ActionResult | null> {
  const ds = await getDataset();
  return ds.currentUser.role === "viewer" ? { ok: false, message: "Il tuo profilo è in sola lettura." } : null;
}

export async function createEvent(input: unknown): Promise<ActionResult> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Controlla i campi evidenziati.", fieldErrors };
  }
  const denied = await guard();
  if (denied) return denied;
  const v = parsed.data;
  const ds = await getDataset();
  const code = nextEventCode(ds.events.map((e) => e.code), Number(v.date.slice(0, 4)));
  if (dataMode() === "demo") return { ok: true, message: `Evento ${code} verificato. ${DEMO}` };

  const sb = await createSupabaseServerClient();
  const { data: client, error: ce } = await sb
    .from("contacts")
    .insert({ kind: "cliente", name: v.clientName, phone: v.clientPhone || null, email: v.clientEmail || null })
    .select("id")
    .single();
  if (ce) return { ok: false, message: `Cliente non salvato: ${ce.message}` };
  const { data: ev, error } = await sb
    .from("events")
    .insert({
      code,
      title: v.title,
      client_id: client.id,
      status: v.status,
      event_date: v.date,
      start_time: v.startTime || null,
      end_time: v.endTime || null,
      venue_name: v.venueName ?? "",
      venue_address: v.venueAddress || null,
      guests: v.guests,
      has_pizza: v.hasPizza,
      has_cocktail: v.hasCocktail,
      lead_source: v.leadSource || null,
      notes: v.notes || null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: `Evento non salvato: ${error.message}` };

  if (v.checklistTemplate) {
    const { data: items } = await sb.from("checklist_template_items").select("*").eq("template_id", v.checklistTemplate);
    if (items?.length) {
      await sb.from("event_tasks").insert(
        items.map((it) => {
          const d = new Date(`${v.date}T00:00:00Z`);
          d.setUTCDate(d.getUTCDate() - it.days_before);
          return { event_id: ev.id, label: it.label, phase: it.phase, position: it.position, due_date: d.toISOString().slice(0, 10) };
        }),
      );
    }
  }
  revalidatePath("/", "layout");
  return { ok: true, id: ev.id, message: `Evento ${code} creato` };
}

const statusSchema = z.object({
  eventId: z.string().min(1),
  status: z.enum(["richiesta", "preventivo", "trattativa", "confermato", "in_preparazione", "completato", "annullato"]),
});

export async function updateEventStatus(input: unknown): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Stato non valido." };
  const denied = await guard();
  if (denied) return denied;
  if (dataMode() === "demo") return { ok: true, message: `Stato aggiornato. ${DEMO}` };
  const sb = await createSupabaseServerClient();
  const { error } = await sb.from("events").update({ status: parsed.data.status }).eq("id", parsed.data.eventId);
  if (error) return { ok: false, message: `Stato non aggiornato: ${error.message}` };
  revalidatePath("/", "layout");
  return { ok: true, message: "Stato aggiornato" };
}

/**
 * Duplica un evento: copia dati organizzativi, ultimo preventivo come bozza, budget e checklist (da rifare).
 * Non copia documenti, pagamenti e file: appartengono all'evento originale.
 */
export async function duplicateEvent(eventId: string): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  const ds = await getDataset();
  const src = ds.events.find((e) => e.id === eventId);
  if (!src) return { ok: false, message: "Evento non trovato." };
  const year = Number(ds.today.slice(0, 4));
  const code = nextEventCode(ds.events.map((e) => e.code), year);
  if (dataMode() === "demo") return { ok: true, message: `Copia ${code} pronta. ${DEMO}` };

  const sb = await createSupabaseServerClient();
  const { data: ev, error } = await sb
    .from("events")
    .insert({
      code,
      title: `${src.title} (copia)`,
      client_id: src.clientId || null,
      status: "richiesta",
      event_date: src.date,
      start_time: src.startTime ?? null,
      end_time: src.endTime ?? null,
      venue_name: src.venueName,
      venue_address: src.venueAddress ?? null,
      guests: src.guests,
      has_pizza: src.hasPizza,
      has_cocktail: src.hasCocktail,
      duplicated_from: src.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: `Duplicazione non riuscita: ${error.message}` };

  const quote = ds.quotes.filter((q) => q.eventId === src.id).sort((a, b) => b.version - a.version)[0];
  if (quote) {
    const { data: nq } = await sb.from("event_quotes").insert({ event_id: ev.id, version: 1, status: "bozza" }).select("id").single();
    if (nq)
      await sb.from("event_quote_lines").insert(
        quote.lines.map((l, i) => ({ quote_id: nq.id, service: l.service, description: l.description, qty: l.qty, unit_price_cents: l.unitPriceCents, vat_bp: l.vatBp, position: i })),
      );
  }
  const budget = ds.budget.filter((b) => b.eventId === src.id);
  if (budget.length)
    await sb.from("event_budget_lines").insert(budget.map((b) => ({ event_id: ev.id, service: b.service, description: b.description, amount_cents: b.amountCents, kind: b.kind })));
  const tasks = ds.tasks.filter((t) => t.eventId === src.id);
  if (tasks.length) await sb.from("event_tasks").insert(tasks.map((t, i) => ({ event_id: ev.id, label: t.label, phase: t.phase, position: i })));

  revalidatePath("/", "layout");
  return { ok: true, id: ev.id, message: `Evento duplicato come ${code}` };
}

export async function toggleTask(input: { taskId: string; done: boolean }): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  if (dataMode() === "demo") return { ok: true, message: input.done ? "Fatto" : "Riaperta" };
  const sb = await createSupabaseServerClient();
  const { error } = await sb.from("event_tasks").update({ done_at: input.done ? new Date().toISOString() : null }).eq("id", input.taskId);
  if (error) return { ok: false, message: `Non aggiornata: ${error.message}` };
  revalidatePath("/", "layout");
  return { ok: true, message: input.done ? "Fatto" : "Riaperta" };
}

export async function toggleResourceCheck(input: { id: string; field: "loaded" | "returned"; value: boolean }): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  if (dataMode() === "demo") return { ok: true, message: "Aggiornato" };
  const sb = await createSupabaseServerClient();
  const col = input.field === "loaded" ? "loaded_at" : "returned_at";
  const { error } = await sb.from("event_resources").update({ [col]: input.value ? new Date().toISOString() : null }).eq("id", input.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: "Aggiornato" };
}
