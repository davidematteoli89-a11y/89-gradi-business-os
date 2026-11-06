import { allocateByShares, type Cents } from "@/lib/money";
import type {
  FinDocument,
  ISODate,
  PartnerAccount,
  PartnerMovement,
  PartnerMovementType,
  PartnerShare,
  Payment,
} from "./types";

/**
 * Convenzione dei segni: punto di vista del socio verso l'azienda.
 * Conto finanziamento: positivo = l'azienda deve al socio.
 * Conto capitale: positivo = capitale netto conferito dal socio.
 */
export type LedgerEntry = {
  id: string;
  partnerId: string;
  date: ISODate;
  account: PartnerAccount;
  kind: PartnerMovementType | "anticipo_spesa" | "incasso_trattenuto";
  description: string;
  amountCents: Cents; // con segno
  source: { type: "payment"; paymentId: string; documentId: string } | { type: "movement"; movementId: string };
};

export const MOVEMENT_LABELS: Record<LedgerEntry["kind"], string> = {
  anticipo_spesa: "Anticipo spesa",
  incasso_trattenuto: "Incasso trattenuto",
  conferimento: "Conferimento",
  prestito: "Prestito all'azienda",
  restituzione_prestito: "Restituzione prestito",
  rimborso: "Rimborso al socio",
  versamento: "Versamento",
  prelievo: "Prelievo / distribuzione",
  compensazione: "Compensazione tra soci",
};

const RULES: Record<Exclude<PartnerMovementType, "versamento" | "compensazione">, { account: PartnerAccount; sign: 1 | -1 }> = {
  conferimento: { account: "capitale", sign: 1 },
  prelievo: { account: "capitale", sign: -1 },
  prestito: { account: "finanziamento", sign: 1 },
  restituzione_prestito: { account: "finanziamento", sign: -1 },
  rimborso: { account: "finanziamento", sign: -1 },
};

export function movementEntries(m: PartnerMovement): LedgerEntry[] {
  if (m.amountCents <= 0 || !Number.isSafeInteger(m.amountCents)) {
    throw new Error("Importo movimento socio non valido");
  }
  const base = { date: m.occurredOn, description: m.description, source: { type: "movement" as const, movementId: m.id } };
  if (m.type === "compensazione") {
    if (!m.counterpartPartnerId || m.counterpartPartnerId === m.partnerId) {
      throw new Error("La compensazione richiede un altro socio come controparte");
    }
    const account = m.account ?? "finanziamento";
    return [
      { ...base, id: `${m.id}:a`, partnerId: m.partnerId, account, kind: "compensazione", amountCents: -m.amountCents },
      { ...base, id: `${m.id}:b`, partnerId: m.counterpartPartnerId, account, kind: "compensazione", amountCents: m.amountCents },
    ];
  }
  if (m.type === "versamento") {
    return [{ ...base, id: m.id, partnerId: m.partnerId, account: m.account ?? "finanziamento", kind: "versamento", amountCents: m.amountCents }];
  }
  const rule = RULES[m.type];
  return [{ ...base, id: m.id, partnerId: m.partnerId, account: rule.account, kind: m.type, amountCents: rule.sign * m.amountCents }];
}

export function paymentEntries(payments: readonly Payment[], documents: readonly FinDocument[]): LedgerEntry[] {
  const docs = new Map(documents.map((d) => [d.id, d]));
  const out: LedgerEntry[] = [];
  for (const p of payments) {
    if (p.payer !== "socio") continue;
    if (!p.partnerId) throw new Error(`Pagamento ${p.id}: socio mancante`);
    const d = docs.get(p.documentId);
    if (!d) continue;
    const isExpense = d.direction === "out";
    out.push({
      id: `pay:${p.id}`,
      partnerId: p.partnerId,
      date: p.paidOn,
      account: "finanziamento",
      kind: isExpense ? "anticipo_spesa" : "incasso_trattenuto",
      description: d.description,
      amountCents: isExpense ? p.amountCents : -p.amountCents,
      source: { type: "payment", paymentId: p.id, documentId: d.id },
    });
  }
  return out;
}

export type LedgerRow = LedgerEntry & { runningCents: Cents };

/** Estratto conto di un socio per un conto, ordinato per data con saldo progressivo. */
export function partnerStatement(
  partnerId: string,
  account: PartnerAccount,
  entries: readonly LedgerEntry[],
): LedgerRow[] {
  let running = 0;
  return entries
    .filter((e) => e.partnerId === partnerId && e.account === account)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map((e) => {
      running += e.amountCents;
      return { ...e, runningCents: running };
    });
}

export function partnerBalances(partnerIds: readonly string[], entries: readonly LedgerEntry[]) {
  return partnerIds.map((id) => {
    let fin = 0;
    let cap = 0;
    let advances = 0;
    for (const e of entries) {
      if (e.partnerId !== id) continue;
      if (e.account === "finanziamento") fin += e.amountCents;
      else cap += e.amountCents;
      if (e.kind === "anticipo_spesa") advances += e.amountCents;
    }
    return { partnerId: id, financingCents: fin, capitalCents: cap, advancesCents: advances };
  });
}

/** Tutte le voci di libro soci a partire da pagamenti e movimenti. */
export function buildLedger(
  payments: readonly Payment[],
  documents: readonly FinDocument[],
  movements: readonly PartnerMovement[],
): LedgerEntry[] {
  return [...paymentEntries(payments, documents), ...movements.flatMap(movementEntries)];
}

/** Quote valide a una data. Restituisce null se non configurate o incoerenti. */
export function sharesAt(shares: readonly PartnerShare[], date: ISODate): PartnerShare[] | null {
  const valid = shares.filter((s) => s.validFrom <= date);
  if (!valid.length) return null;
  const latest = valid.reduce((a, b) => (a.validFrom > b.validFrom ? a : b)).validFrom;
  const current = valid.filter((s) => s.validFrom === latest);
  const sum = current.reduce((a, s) => a + s.shareBp, 0);
  return sum === 10000 ? current : null;
}

/** Ripartisce un importo (es. utile stimato) secondo le quote. */
export function splitByShares(amount: Cents, shares: readonly PartnerShare[]) {
  const parts = allocateByShares(amount, shares.map((s) => s.shareBp));
  return shares.map((s, i) => ({ partnerId: s.partnerId, amountCents: parts[i] }));
}

/**
 * Riconciliazione: proposta di rimborsi per azzerare il conto finanziamento.
 * Non crea movimenti: restituisce i movimenti suggeriti da confermare.
 */
export function suggestSettlement(balances: ReturnType<typeof partnerBalances>, today: ISODate): Omit<PartnerMovement, "id">[] {
  return balances
    .filter((b) => b.financingCents !== 0)
    .map((b) =>
      b.financingCents > 0
        ? { partnerId: b.partnerId, type: "rimborso" as const, amountCents: b.financingCents, occurredOn: today, description: "Rimborso a saldo" }
        : { partnerId: b.partnerId, type: "versamento" as const, account: "finanziamento" as const, amountCents: -b.financingCents, occurredOn: today, description: "Versamento a saldo" },
    );
}
