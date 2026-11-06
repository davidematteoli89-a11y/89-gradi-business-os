import { sumCents, type Cents } from "@/lib/money";
import { marginAmount } from "./events";
import type { FinDocument, ISODate, Payment, VatMode } from "./types";

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
    const r = rows.get(monthKey(p.paidOn));
    if (!r) continue;
    if (dir.get(p.documentId) === "in") r.cashInCents += p.amountCents;
    else if (dir.get(p.documentId) === "out") r.cashOutCents += p.amountCents;
  }
  for (const r of rows.values()) r.marginCents = r.revenueCents - r.costCents;
  return [...rows.values()];
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
