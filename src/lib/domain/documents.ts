import { sumCents, type Cents } from "@/lib/money";
import type { FinDocument, ISODate, Payment } from "./types";

export type PaymentState = "da_pagare" | "parziale" | "pagato" | "scaduto" | "eccedenza";

export type DocumentBalance = {
  totalCents: Cents;
  paidCents: Cents;
  residualCents: Cents;
  state: PaymentState;
  overdue: boolean;
};

export function paymentsFor(docId: string, payments: readonly Payment[]): Payment[] {
  return payments.filter((p) => p.documentId === docId);
}

export function documentBalance(
  doc: Pick<FinDocument, "id" | "totalCents" | "dueDate">,
  payments: readonly Payment[],
  today: ISODate,
): DocumentBalance {
  const paid = sumCents(paymentsFor(doc.id, payments).map((p) => p.amountCents));
  const residual = doc.totalCents - paid;
  const overdue = residual > 0 && !!doc.dueDate && doc.dueDate < today;
  let state: PaymentState;
  if (residual < 0) state = "eccedenza";
  else if (residual === 0) state = "pagato";
  else if (overdue) state = "scaduto";
  else if (paid > 0) state = "parziale";
  else state = "da_pagare";
  return { totalCents: doc.totalCents, paidCents: paid, residualCents: residual, state, overdue };
}

/** Verifica che un nuovo pagamento non porti il documento oltre il totale. */
export function validateNewPayment(
  doc: Pick<FinDocument, "id" | "totalCents">,
  existing: readonly Payment[],
  amountCents: Cents,
): { ok: true } | { ok: false; reason: string } {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return { ok: false, reason: "Inserisci un importo maggiore di zero." };
  }
  const paid = sumCents(paymentsFor(doc.id, existing).map((p) => p.amountCents));
  if (paid + amountCents > doc.totalCents) {
    return {
      ok: false,
      reason: "Il pagamento supera il residuo del documento. Controlla l'importo o il documento collegato.",
    };
  }
  return { ok: true };
}

/** Coerenza degli importi di un documento. */
export function validateDocumentAmounts(d: Pick<FinDocument, "netCents" | "vatCents" | "totalCents">) {
  return d.netCents + d.vatCents === d.totalCents && d.totalCents >= 0;
}
