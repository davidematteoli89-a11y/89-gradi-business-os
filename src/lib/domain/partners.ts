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
  apporto_non_monetario: "Apporto non monetario",
  conversione_in_capitale: "Credito convertito in capitale",
};

const RULES: Record<
  Exclude<PartnerMovementType, "versamento" | "compensazione" | "conversione_in_capitale">,
  { account: PartnerAccount; sign: 1 | -1 }
> = {
  conferimento: { account: "capitale", sign: 1 },
  apporto_non_monetario: { account: "capitale", sign: 1 },
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
  if (m.type === "conversione_in_capitale") {
    return [
      { ...base, id: `${m.id}:fin`, partnerId: m.partnerId, account: "finanziamento", kind: m.type, amountCents: -m.amountCents },
      { ...base, id: `${m.id}:cap`, partnerId: m.partnerId, account: "capitale", kind: m.type, amountCents: m.amountCents },
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

/** Composizione del capitale di un socio per tipo di apporto. */
export type ContributionBreakdown = {
  partnerId: string;
  cashCents: number; // conferimenti e versamenti in conto capitale
  nonCashCents: number; // apporti non monetari (lavoro, compensi rinunciati, beni)
  convertedCents: number; // crediti rinunciati e portati a capitale
  withdrawnCents: number; // prelievi / distribuzioni (positivo = uscito)
  netCents: number;
};

export function contributionBreakdown(partnerIds: readonly string[], entries: readonly LedgerEntry[]): ContributionBreakdown[] {
  return partnerIds.map((id) => {
    const b: ContributionBreakdown = { partnerId: id, cashCents: 0, nonCashCents: 0, convertedCents: 0, withdrawnCents: 0, netCents: 0 };
    for (const e of entries) {
      if (e.partnerId !== id || e.account !== "capitale") continue;
      if (e.kind === "apporto_non_monetario") b.nonCashCents += e.amountCents;
      else if (e.kind === "conversione_in_capitale") b.convertedCents += e.amountCents;
      else if (e.kind === "prelievo") b.withdrawnCents += -e.amountCents;
      else b.cashCents += e.amountCents;
      b.netCents += e.amountCents;
    }
    return b;
  });
}

/**
 * Equilibrio degli apporti rispetto alle quote.
 * Per ogni socio: la quota attesa del totale e quanto dovrebbe ancora apportare
 * perché tutti siano in proporzione alle quote senza che nessuno debba "restituire".
 */
export function contributionBalance(breakdown: readonly ContributionBreakdown[], shares: readonly PartnerShare[]) {
  const total = breakdown.reduce((a, b) => a + b.netCents, 0);
  const shareOf = (id: string) => shares.find((s) => s.partnerId === id)?.shareBp ?? 0;
  // livello comune: il massimo rapporto apporto/quota tra i soci
  let level = 0;
  for (const b of breakdown) {
    const s = shareOf(b.partnerId);
    if (s > 0) level = Math.max(level, b.netCents / s);
  }
  return breakdown.map((b) => {
    const s = shareOf(b.partnerId);
    const expectedOfTotal = s ? Math.round((total * s) / 10000) : 0;
    const toLevel = s ? Math.max(0, Math.round(level * s) - b.netCents) : 0;
    return {
      partnerId: b.partnerId,
      shareBp: s,
      contributedCents: b.netCents,
      actualShareBp: total ? Math.round((b.netCents * 10000) / total) : 0,
      expectedOfTotalCents: expectedOfTotal,
      /** differenza rispetto alla quota attesa del totale attuale (negativo = sotto quota) */
      deltaCents: b.netCents - expectedOfTotal,
      /** quanto dovrebbe ancora apportare per pareggiare senza ridurre gli altri */
      toLevelCents: toLevel,
    };
  });
}

/* ───────────── Equilibrio complessivo tra i soci ─────────────
 * Tutto quello che ogni socio ha messo nell'attività (spese pagate di tasca propria,
 * denaro investito, apporti non monetari, prestiti) meno quello che ha ricevuto indietro
 * (rimborsi, restituzioni, prelievi, incassi trattenuti), confrontato con la sua quota.
 */
export type EquilibriumGroup = "spese" | "investimenti" | "apporti" | "prestiti" | "ricevuti" | "compensazioni";

export const EQUILIBRIUM_LABELS: Record<EquilibriumGroup, string> = {
  spese: "Spese pagate di tasca propria",
  investimenti: "Denaro investito",
  apporti: "Apporti non monetari",
  prestiti: "Prestiti all'azienda",
  ricevuti: "Ricevuto indietro",
  compensazioni: "Compensazioni tra soci",
};

function groupOf(e: LedgerEntry): EquilibriumGroup | null {
  switch (e.kind) {
    case "anticipo_spesa":
      return "spese";
    case "conferimento":
    case "versamento":
      return "investimenti";
    case "apporto_non_monetario":
      return "apporti";
    case "prestito":
      return "prestiti";
    case "rimborso":
    case "restituzione_prestito":
    case "prelievo":
    case "incasso_trattenuto":
      return "ricevuti";
    case "compensazione":
      return "compensazioni";
    case "conversione_in_capitale":
      return null; // sposta tra conti dello stesso socio: il totale non cambia
  }
}

export function partnerEquilibrium(
  partnerIds: readonly string[],
  entries: readonly LedgerEntry[],
  shares: readonly PartnerShare[],
) {
  const rows = partnerIds.map((id) => {
    const groups: Record<EquilibriumGroup, number> = { spese: 0, investimenti: 0, apporti: 0, prestiti: 0, ricevuti: 0, compensazioni: 0 };
    for (const e of entries) {
      if (e.partnerId !== id) continue;
      const g = groupOf(e);
      if (g) groups[g] += e.amountCents;
    }
    const net = Object.values(groups).reduce((a, b) => a + b, 0);
    return { partnerId: id, groups, netCents: net };
  });
  const total = rows.reduce((a, r) => a + r.netCents, 0);
  const shareBps = shares.map((s) => s.shareBp);
  const ids = shares.map((s) => s.partnerId);
  const fair = allocateByShares(total, shareBps);
  const withFair = rows.map((r) => {
    const i = ids.indexOf(r.partnerId);
    const fairCents = i >= 0 ? fair[i] : 0;
    return { ...r, shareBp: i >= 0 ? shareBps[i] : 0, fairCents, deltaCents: r.netCents - fairCents };
  });

  // Conguagli suggeriti: chi è sotto la sua quota versa a chi è sopra (minimo numero di passaggi)
  const creditors = withFair.filter((r) => r.deltaCents > 0).map((r) => ({ id: r.partnerId, left: r.deltaCents }));
  const debtors = withFair.filter((r) => r.deltaCents < 0).map((r) => ({ id: r.partnerId, left: -r.deltaCents }));
  const transfers: { fromPartnerId: string; toPartnerId: string; amountCents: number }[] = [];
  for (const d of debtors) {
    for (const c of creditors) {
      if (d.left === 0) break;
      const x = Math.min(d.left, c.left);
      if (x > 0) {
        transfers.push({ fromPartnerId: d.id, toPartnerId: c.id, amountCents: x });
        d.left -= x;
        c.left -= x;
      }
    }
  }
  return { totalCents: total, partners: withFair, transfers };
}
