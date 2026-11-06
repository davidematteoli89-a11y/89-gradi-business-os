import { divRound, fromNet, sumCents, type Cents } from "@/lib/money";
import type {
  BudgetLine,
  CostService,
  EventStatus,
  FinDocument,
  Payment,
  Quote,
  QuoteLine,
  Service,
  VatMode,
} from "./types";

export const EVENT_STATUSES: { value: EventStatus; label: string }[] = [
  { value: "richiesta", label: "Richiesta" },
  { value: "preventivo", label: "Preventivo" },
  { value: "trattativa", label: "Trattativa" },
  { value: "confermato", label: "Confermato" },
  { value: "in_preparazione", label: "In preparazione" },
  { value: "completato", label: "Completato" },
  { value: "annullato", label: "Annullato" },
];

export const OPEN_PIPELINE: EventStatus[] = ["richiesta", "preventivo", "trattativa"];
export const ACTIVE_EVENT: EventStatus[] = ["confermato", "in_preparazione"];

export type ByRevenueService = Record<Service, Cents> & { total: Cents };
export type ByCostService = Record<CostService, Cents> & { total: Cents };

export type EconomicsBlock = {
  revenue: ByRevenueService;
  costs: ByCostService;
  marginCents: Cents;
  /** margine in punti base sul ricavo, null se ricavo 0 */
  marginBp: number | null;
};

export type EventEconomics = {
  forecast: EconomicsBlock & {
    basis: "accettato" | "ultimo_preventivo" | "nessuno";
    hasEstimates: boolean;
  };
  actual: EconomicsBlock;
  cash: { receivedCents: Cents; invoicedCents: Cents; paidOutCents: Cents };
};

const zeroRev = (): ByRevenueService => ({ pizza: 0, cocktail: 0, extra: 0, total: 0 });
const zeroCost = (): ByCostService => ({ pizza: 0, cocktail: 0, generale: 0, total: 0 });

export function lineNet(l: Pick<QuoteLine, "qty" | "unitPriceCents">): Cents {
  // qty può avere decimali (es. 2,5 ore): arrotondiamo al centesimo
  return divRound(Math.round(l.qty * 1000) * l.unitPriceCents, 1000);
}

export function quoteTotals(lines: readonly QuoteLine[]) {
  const byService = zeroRev();
  let vat = 0;
  for (const l of lines) {
    const net = lineNet(l);
    byService[l.service] += net;
    byService.total += net;
    vat += fromNet(net, l.vatBp).vat;
  }
  return { byService, netCents: byService.total, vatCents: vat, grossCents: byService.total + vat };
}

/** Il preventivo che fa da base al margine previsto. */
export function forecastQuote(quotes: readonly Quote[]): { quote: Quote | null; basis: EventEconomics["forecast"]["basis"] } {
  const accepted = quotes.find((q) => q.status === "accettato");
  if (accepted) return { quote: accepted, basis: "accettato" };
  const candidates = quotes.filter((q) => q.status !== "rifiutato").sort((a, b) => b.version - a.version);
  if (candidates[0]) return { quote: candidates[0], basis: "ultimo_preventivo" };
  return { quote: null, basis: "nessuno" };
}

/** Importo da usare per margini secondo il regime IVA. */
export function marginAmount(doc: Pick<FinDocument, "netCents" | "totalCents">, vatMode: VatMode): Cents {
  return vatMode === "forfettario" ? doc.totalCents : doc.netCents;
}

function block(revenue: ByRevenueService, costs: ByCostService): EconomicsBlock {
  const margin = revenue.total - costs.total;
  return {
    revenue,
    costs,
    marginCents: margin,
    marginBp: revenue.total === 0 ? null : divRound(margin * 10000, revenue.total),
  };
}

export function eventEconomics(input: {
  eventId: string;
  quotes: readonly Quote[];
  budget: readonly BudgetLine[];
  documents: readonly FinDocument[];
  payments: readonly Payment[];
  vatMode: VatMode;
}): EventEconomics {
  const { eventId, vatMode } = input;

  // Previsto
  const { quote, basis } = forecastQuote(input.quotes.filter((q) => q.eventId === eventId));
  const fRev = quote ? quoteTotals(quote.lines).byService : zeroRev();
  const fCost = zeroCost();
  let hasEstimates = basis !== "accettato";
  for (const b of input.budget) {
    if (b.eventId !== eventId) continue;
    fCost[b.service] += b.amountCents;
    fCost.total += b.amountCents;
    if (b.kind === "stimato") hasEstimates = true;
  }

  // Consuntivo (competenza sui documenti)
  const aRev = zeroRev();
  const aCost = zeroCost();
  const docs = input.documents.filter((d) => d.eventId === eventId);
  let invoiced = 0;
  for (const d of docs) {
    const amount = marginAmount(d, vatMode);
    if (d.direction === "in") {
      const s: Service = d.service === "pizza" || d.service === "cocktail" ? d.service : "extra";
      aRev[s] += amount;
      aRev.total += amount;
      invoiced += d.totalCents;
    } else {
      const s: CostService = d.service ?? "generale";
      aCost[s] += amount;
      aCost.total += amount;
    }
  }

  // Cassa
  const docIds = new Map(docs.map((d) => [d.id, d.direction]));
  const evPayments = input.payments.filter((p) => docIds.has(p.documentId));
  const received = sumCents(evPayments.filter((p) => docIds.get(p.documentId) === "in").map((p) => p.amountCents));
  const paidOut = sumCents(evPayments.filter((p) => docIds.get(p.documentId) === "out").map((p) => p.amountCents));

  return {
    forecast: { ...block(fRev, fCost), basis, hasEstimates },
    actual: block(aRev, aCost),
    cash: { receivedCents: received, invoicedCents: invoiced, paidOutCents: paidOut },
  };
}

/**
 * Margine per servizio con i costi comuni ripartiti in proporzione ai ricavi.
 * Il risultato è una stima e va etichettato come tale.
 */
export function serviceMarginsWithSharedCosts(b: EconomicsBlock) {
  const base = b.revenue.pizza + b.revenue.cocktail;
  const shared = b.costs.generale;
  const pizzaShare = base === 0 ? divRound(shared, 2) : divRound(shared * b.revenue.pizza, base);
  const cocktailShare = shared - pizzaShare;
  return {
    pizza: b.revenue.pizza - b.costs.pizza - pizzaShare,
    cocktail: b.revenue.cocktail - b.costs.cocktail - cocktailShare,
    extra: b.revenue.extra,
    sharedCostCents: shared,
  };
}

/** Codice evento 89-AAAA-NNN */
export function nextEventCode(existing: readonly string[], year: number): string {
  const prefix = `89-${year}-`;
  const max = existing
    .filter((c) => c.startsWith(prefix))
    .map((c) => Number(c.slice(prefix.length)))
    .filter(Number.isFinite)
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
