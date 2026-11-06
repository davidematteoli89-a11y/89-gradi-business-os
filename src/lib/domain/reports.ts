import { sumCents, type Cents } from "@/lib/money";
import { marginAmount } from "./events";
import type { FinDocument, ISODate, PartnerMovement, Payment, VatMode } from "./types";

export type MonthRow = {
  month: string; // yyyy-mm
  revenueCents: Cents; // competenza
  costCents: Cents; // competenza, esclusi investimenti
  investmentCents: Cents;
  marginCents: Cents;
  cashInCents: Cents;
  cashOutCents: Cents;
};

export function monthKey(date: ISODate) {
  return date.slice(0, 7);
}

export function monthsBetween(from: ISODate, to: ISODate): string[] {
  const out: string[] = [];
  let [y, m] = from.slice(0, 7).split("-").map(Number);
  const [ty, tm] = to.slice(0, 7).split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export function monthlyReport(input: {
  from: ISODate;
  to: ISODate;
  documents: readonly FinDocument[];
  payments: readonly Payment[];
  /** movimenti soci che spostano denaro nella cassa aziendale */
  movements?: readonly PartnerMovement[];
  vatMode: VatMode;
}): MonthRow[] {
  const rows = new Map<string, MonthRow>(
    monthsBetween(input.from, input.to).map((m) => [
      m,
      { month: m, revenueCents: 0, costCents: 0, investmentCents: 0, marginCents: 0, cashInCents: 0, cashOutCents: 0 },
    ]),
  );
  for (const d of input.documents) {
    const r = rows.get(monthKey(d.documentDate));
    if (!r) continue;
    const amount = marginAmount(d, input.vatMode);
    if (d.direction === "in") r.revenueCents += amount;
    else if (d.nature === "investimento") r.investmentCents += amount;
    else r.costCents += amount;
  }
  const dir = new Map(input.documents.map((d) => [d.id, d.direction]));
  for (const p of input.payments) {
    // la cassa aziendale si muove solo se paga/incassa l'azienda:
    // quando paga un socio nasce un anticipo, non un'uscita di cassa
    if (p.payer !== "azienda") continue;
    const r = rows.get(monthKey(p.paidOn));
    if (!r) continue;
    if (dir.get(p.documentId) === "in") r.cashInCents += p.amountCents;
    else if (dir.get(p.documentId) === "out") r.cashOutCents += p.amountCents;
  }
  for (const m of input.movements ?? []) {
    const r = rows.get(monthKey(m.occurredOn));
    if (!r) continue;
    const flow = movementCashFlow(m);
    if (flow > 0) r.cashInCents += flow;
    else r.cashOutCents += -flow;
  }
  for (const r of rows.values()) r.marginCents = r.revenueCents - r.costCents;
  return [...rows.values()];
}

/** Effetto di un movimento socio sulla cassa aziendale (positivo = entra denaro). */
export function movementCashFlow(m: Pick<PartnerMovement, "type" | "amountCents">): Cents {
  switch (m.type) {
    case "conferimento":
    case "prestito":
    case "versamento":
      return m.amountCents;
    case "rimborso":
    case "restituzione_prestito":
    case "prelievo":
      return -m.amountCents;
    case "compensazione":
      return 0; // avviene tra i soci, fuori dalla cassa aziendale
  }
}

export function totals(rows: readonly MonthRow[]) {
  const pick = (k: keyof Omit<MonthRow, "month">) => sumCents(rows.map((r) => r[k]));
  return {
    revenueCents: pick("revenueCents"),
    costCents: pick("costCents"),
    investmentCents: pick("investmentCents"),
    marginCents: pick("marginCents"),
    cashInCents: pick("cashInCents"),
    cashOutCents: pick("cashOutCents"),
    cashBalanceCents: pick("cashInCents") - pick("cashOutCents"),
  };
}

/** CSV con separatore ";" e virgola decimale, come si aspetta Excel in italiano. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
}

export function centsToCsv(cents: Cents): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}
