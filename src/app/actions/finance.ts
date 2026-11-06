"use server";

import { revalidatePath } from "next/cache";
import { parseEuro } from "@/lib/money";
import { dataMode, getDataset } from "@/lib/data/source";
import { validateNewPayment } from "@/lib/domain/documents";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  RECEIPT_MAX_BYTES,
  RECEIPT_MIME,
  incomePaymentSchema,
  partnerMovementSchema,
  quickExpenseSchema,
  type ActionResult,
} from "@/lib/validation/finance";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0] ?? "form")] ??= i.message;
  return out;
}

async function assertCanEdit(): Promise<ActionResult | null> {
  const ds = await getDataset();
  if (ds.currentUser.role === "viewer") return { ok: false, message: "Il tuo profilo è in sola lettura." };
  return null;
}

export async function createQuickExpense(formData: FormData): Promise<ActionResult> {
  const raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  const parsed = quickExpenseSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Controlla i campi evidenziati.", fieldErrors: fieldErrors(parsed.error.issues) };
  }
  const v = parsed.data;
  const file = formData.get("receipt");
  const receipt = file instanceof File && file.size > 0 ? file : null;
  if (receipt && (receipt.size > RECEIPT_MAX_BYTES || !RECEIPT_MIME.includes(receipt.type))) {
    return { ok: false, message: "La ricevuta deve essere una foto o un PDF fino a 12 MB.", fieldErrors: { receipt: "File non supportato" } };
  }
  const denied = await assertCanEdit();
  if (denied) return denied;

  const totalCents = parseEuro(v.amount)!;
  const mode = dataMode();

  if (mode === "demo") {
    return { ok: true, message: "Spesa verificata. Modalità demo: non è stata salvata." };
  }

  const sb = await createSupabaseServerClient();
  const { data: docId, error } = await sb.rpc("g89_create_quick_expense", {
    p_description: v.description,
    p_document_date: v.date,
    p_category_id: v.categoryId,
    p_total_cents: totalCents,
    p_vat_bp: v.vatBp,
    p_doc_type: receipt ? "scontrino" : "ricevuta",
    p_event_id: v.eventId || null,
    p_service: v.service || null,
    p_due_date: v.paid ? null : v.dueDate || null,
    p_paid: v.paid,
    p_paid_on: v.date,
    p_method: v.method,
    p_payer: v.payer === "azienda" ? "azienda" : "socio",
    p_partner_id: v.payer === "azienda" ? null : v.payer,
  });
  if (error) return { ok: false, message: `Spesa non salvata: ${error.message}` };

  if (receipt) {
    const ext = receipt.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `documenti/${docId}/${crypto.randomUUID()}.${ext}`;
    const up = await sb.storage.from("g89-documenti").upload(path, receipt, { contentType: receipt.type, upsert: false });
    if (up.error) {
      revalidatePath("/", "layout");
      return { ok: true, id: docId, message: "Spesa salvata, ma la foto non è stata caricata. Riprova dalla scheda della spesa." };
    }
    await sb.from("g89_attachments").insert({ path, file_name: receipt.name, mime: receipt.type, size: receipt.size, entity: "document", entity_id: docId });
  }

  revalidatePath("/", "layout");
  return { ok: true, id: docId, message: "Spesa salvata" };
}

export async function deleteDocument(documentId: string): Promise<ActionResult> {
  const denied = await assertCanEdit();
  if (denied) return denied;
  if (dataMode() === "demo") return { ok: true, message: "Modalità demo: nessuna modifica salvata." };
  const sb = await createSupabaseServerClient();
  const { count } = await sb.from("g89_fin_payments").select("id", { count: "exact", head: true }).eq("document_id", documentId);
  if (count) return { ok: false, message: "Elimina prima i pagamenti collegati: così la cassa resta coerente." };
  const { error } = await sb.from("g89_fin_documents").delete().eq("id", documentId);
  if (error) return { ok: false, message: `Eliminazione non riuscita: ${error.message}` };
  revalidatePath("/", "layout");
  return { ok: true, message: "Documento eliminato" };
}

export async function registerIncome(input: unknown): Promise<ActionResult> {
  const parsed = incomePaymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Controlla i campi evidenziati.", fieldErrors: fieldErrors(parsed.error.issues) };
  const denied = await assertCanEdit();
  if (denied) return denied;
  const v = parsed.data;
  const amount = parseEuro(v.amount)!;

  const ds = await getDataset();
  const doc = ds.documents.find((d) => d.id === v.documentId && d.direction === "in");
  if (!doc) return { ok: false, message: "Documento di entrata non trovato.", fieldErrors: { documentId: "Non trovato" } };
  const check = validateNewPayment(doc, ds.payments, amount);
  if (!check.ok) return { ok: false, message: check.reason, fieldErrors: { amount: check.reason } };

  if (dataMode() === "demo") return { ok: true, message: "Incasso verificato. Modalità demo: non è stato salvato." };

  const sb = await createSupabaseServerClient();
  const { error } = await sb.from("g89_fin_payments").insert({
    document_id: v.documentId,
    paid_on: v.date,
    amount_cents: amount,
    method: v.method,
    payer: v.receiver === "azienda" ? "azienda" : "socio",
    partner_id: v.receiver === "azienda" ? null : v.receiver,
  });
  if (error) return { ok: false, message: `Incasso non salvato: ${error.message}` };
  revalidatePath("/", "layout");
  return { ok: true, message: "Incasso registrato" };
}

/** URL firmato a breve scadenza per vedere una ricevuta privata. */
export async function signedReceiptUrl(path: string): Promise<string | null> {
  if (dataMode() !== "supabase") return null;
  const sb = await createSupabaseServerClient();
  const { data } = await sb.storage.from("g89-documenti").createSignedUrl(path, 60 * 5);
  return data?.signedUrl ?? null;
}

export async function registerPartnerMovement(input: unknown): Promise<ActionResult> {
  const parsed = partnerMovementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Controlla i campi evidenziati.", fieldErrors: fieldErrors(parsed.error.issues) };
  const denied = await assertCanEdit();
  if (denied) return denied;
  const v = parsed.data;
  if (dataMode() === "demo") return { ok: true, message: "Movimento verificato. Modalità demo: non è stato salvato." };
  const sb = await createSupabaseServerClient();
  const { error } = await sb.from("g89_partner_movements").insert({
    partner_id: v.partnerId,
    counterpart_partner_id: v.type === "compensazione" ? v.counterpartPartnerId : null,
    type: v.type,
    account: v.type === "versamento" || v.type === "compensazione" ? (v.account ?? "finanziamento") : null,
    amount_cents: parseEuro(v.amount)!,
    occurred_on: v.date,
    description: v.description ?? "",
  });
  if (error) return { ok: false, message: `Movimento non salvato: ${error.message}` };
  revalidatePath("/", "layout");
  return { ok: true, message: "Movimento registrato" };
}
