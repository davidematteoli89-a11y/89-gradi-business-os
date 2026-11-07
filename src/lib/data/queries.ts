import { sumCents } from "@/lib/money";
import { documentBalance, type DocumentBalance } from "@/lib/domain/documents";
import { ACTIVE_EVENT, OPEN_PIPELINE, eventEconomics, quoteTotals, forecastQuote } from "@/lib/domain/events";
import { buildLedger, contributionBalance, contributionBreakdown, partnerBalances, partnerEquilibrium, partnerStatement, sharesAt } from "@/lib/domain/partners";
import { monthlyReport, totals } from "@/lib/domain/reports";
import type { EventRecord, EventStatus, FinDocument, ISODate } from "@/lib/domain/types";
import type { Dataset } from "./demo/dataset";

export type DS = Dataset;

export function addDays(date: ISODate, days: number): ISODate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: ISODate, to: ISODate) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export const lookup = (ds: DS) => ({
  contact: (id?: string) => ds.contacts.find((c) => c.id === id),
  partner: (id?: string) => ds.partners.find((p) => p.id === id),
  category: (id?: string) => ds.categories.find((c) => c.id === id),
  event: (id?: string) => ds.events.find((e) => e.id === id),
  campaign: (id?: string) => ds.campaigns.find((c) => c.id === id),
  resource: (id?: string) => ds.resources.find((r) => r.id === id),
});

export function economicsFor(ds: DS, eventId: string) {
  return eventEconomics({
    eventId,
    quotes: ds.quotes,
    budget: ds.budget,
    documents: ds.documents,
    payments: ds.payments,
    vatMode: ds.vatMode,
  });
}

export type DocWithBalance = FinDocument & { balance: DocumentBalance };

export function documentsWithBalance(ds: DS): DocWithBalance[] {
  return ds.documents.map((d) => ({ ...d, balance: documentBalance(d, ds.payments, ds.today) }));
}

export function ledger(ds: DS) {
  return buildLedger(ds.payments, ds.documents, ds.movements);
}

/* ───────────────────────── Home ───────────────────────── */

export function homeData(ds: DS) {
  const today = ds.today;
  const month = today.slice(0, 7);
  const prevMonthDate = addDays(`${month}-01`, -1);
  const prevMonth = prevMonthDate.slice(0, 7);
  const yearStart = `${today.slice(0, 4)}-01-01`;

  const docs = documentsWithBalance(ds);
  const dir = new Map(ds.documents.map((d) => [d.id, d.direction]));
  const cashIn = (m: string) =>
    sumCents(ds.payments.filter((p) => p.paidOn.startsWith(m) && dir.get(p.documentId) === "in").map((p) => p.amountCents));

  const completedThisYear = ds.events.filter((e) => e.status === "completato" && e.date >= yearStart && e.date <= today);
  const actualMargin = sumCents(completedThisYear.map((e) => economicsFor(ds, e.id).actual.marginCents));
  const actualRevenue = sumCents(completedThisYear.map((e) => economicsFor(ds, e.id).actual.revenue.total));

  const upcoming = ds.events
    .filter((e) => e.date >= today && e.status !== "annullato" && e.status !== "completato")
    .sort((a, b) => a.date.localeCompare(b.date));
  const confirmedUpcoming = upcoming.filter((e) => ACTIVE_EVENT.includes(e.status));
  const forecastMargin = sumCents(confirmedUpcoming.map((e) => economicsFor(ds, e.id).forecast.marginCents));

  const payables = docs.filter((d) => d.direction === "out" && d.balance.residualCents > 0);
  const receivables = docs.filter((d) => d.direction === "in" && d.balance.residualCents > 0);

  const balances = partnerBalances(
    ds.partners.map((p) => p.id),
    ledger(ds),
  );

  const horizon = addDays(today, 3);
  const urgentEventTasks = ds.tasks
    .filter((t) => !t.done && t.dueDate && t.dueDate <= horizon)
    .map((t) => ({ id: t.id, label: t.label, dueDate: t.dueDate!, href: `/eventi/${t.eventId}?tab=organizzazione`, context: lookup(ds).event(t.eventId)?.title ?? "", ownerId: t.assigneePartnerId }));
  const urgentMarketing = ds.marketingTasks
    .filter((m) => m.dueDate && m.dueDate <= horizon && !["pubblicato", "approvato", "annullato"].includes(m.status))
    .map((m) => ({ id: m.id, label: m.title, dueDate: m.dueDate!, href: `/marketing?task=${m.id}`, context: "Marketing", ownerId: m.ownerPartnerId }));
  const urgentPayables = payables
    .filter((d) => d.dueDate && d.dueDate <= horizon)
    .map((d) => ({ id: d.id, label: `Pagare: ${d.description}`, dueDate: d.dueDate!, href: `/finanze?stato=da_saldare&q=${encodeURIComponent(d.description)}`, context: "Finanze", ownerId: undefined }));
  const urgent = [...urgentEventTasks, ...urgentMarketing, ...urgentPayables].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Calendario: prossimi 14 giorni
  const calendar = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i);
    return {
      date,
      events: ds.events.filter((e) => e.date === date && e.status !== "annullato"),
      deadlines: urgentDeadlinesOn(ds, date, docs),
    };
  });

  return {
    today,
    kpi: {
      cashInMonth: cashIn(month),
      cashInPrevMonth: cashIn(prevMonth),
      actualMargin,
      actualRevenue,
      completedCount: completedThisYear.length,
      forecastMargin,
      confirmedUpcomingCount: confirmedUpcoming.length,
      payablesTotal: sumCents(payables.map((d) => d.balance.residualCents)),
      payablesCount: payables.length,
      overdueCount: payables.filter((d) => d.balance.overdue).length,
      receivablesTotal: sumCents(receivables.map((d) => d.balance.residualCents)),
      upcomingCount30: upcoming.filter((e) => e.date <= addDays(today, 30)).length,
      partnerBalances: balances,
      urgentCount: urgent.length,
    },
    nextEvent: upcoming[0] ? eventSummary(ds, upcoming[0]) : null,
    upcoming: upcoming.slice(0, 5).map((e) => eventSummary(ds, e)),
    urgent: urgent.slice(0, 6),
    calendar,
    activity: [...ds.activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7),
  };
}

function urgentDeadlinesOn(ds: DS, date: ISODate, docs: DocWithBalance[]) {
  return (
    ds.tasks.filter((t) => !t.done && t.dueDate === date).length +
    ds.marketingTasks.filter((m) => m.dueDate === date && !["pubblicato", "approvato", "annullato"].includes(m.status)).length +
    docs.filter((d) => d.dueDate === date && d.balance.residualCents > 0).length
  );
}

/* ───────────────────────── Eventi ───────────────────────── */

export function eventSummary(ds: DS, e: EventRecord) {
  const econ = economicsFor(ds, e.id);
  const tasks = ds.tasks.filter((t) => t.eventId === e.id);
  const { quote } = forecastQuote(ds.quotes.filter((q) => q.eventId === e.id));
  return {
    ...e,
    client: lookup(ds).contact(e.clientId),
    econ,
    quoteGross: quote ? quoteTotals(quote.lines).grossCents : 0,
    daysTo: daysBetween(ds.today, e.date),
    tasksDone: tasks.filter((t) => t.done).length,
    tasksTotal: tasks.length,
  };
}

export type EventSummary = ReturnType<typeof eventSummary>;

export type EventFilter = { stato?: string; q?: string; periodo?: "prossimi" | "passati" | "tutti" };

export function listEvents(ds: DS, f: EventFilter) {
  const q = f.q?.trim().toLowerCase();
  const periodo = f.periodo ?? "prossimi";
  let list = ds.events.filter((e) => {
    if (f.stato === "pipeline" && !OPEN_PIPELINE.includes(e.status)) return false;
    if (f.stato && f.stato !== "pipeline" && e.status !== f.stato) return false;
    if (periodo === "prossimi" && e.date < ds.today) return false;
    if (periodo === "passati" && e.date >= ds.today) return false;
    if (q) {
      const client = lookup(ds).contact(e.clientId)?.name ?? "";
      if (![e.title, e.code, e.venueName, client].some((s) => s.toLowerCase().includes(q))) return false;
    }
    return true;
  });
  list = list.sort((a, b) => (periodo === "passati" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
  const counts = Object.fromEntries(
    (["richiesta", "preventivo", "trattativa", "confermato", "in_preparazione", "completato", "annullato"] as EventStatus[]).map((s) => [
      s,
      ds.events.filter((e) => e.status === s).length,
    ]),
  ) as Record<EventStatus, number>;
  return { events: list.map((e) => eventSummary(ds, e)), counts, total: ds.events.length };
}

export function eventDetail(ds: DS, id: string) {
  const e = lookup(ds).event(id);
  if (!e) return null;
  const docs = documentsWithBalance(ds).filter((d) => d.eventId === id);
  return {
    event: eventSummary(ds, e),
    quotes: ds.quotes.filter((q) => q.eventId === id).sort((a, b) => b.version - a.version),
    budget: ds.budget.filter((b) => b.eventId === id),
    documents: docs,
    payments: ds.payments.filter((p) => docs.some((d) => d.id === p.documentId)).sort((a, b) => a.paidOn.localeCompare(b.paidOn)),
    tasks: ds.tasks.filter((t) => t.eventId === id),
    staff: ds.staff.filter((s) => s.eventId === id).map((s) => ({ ...s, contact: lookup(ds).contact(s.contactId) })),
    resources: ds.eventResources.filter((r) => r.eventId === id).map((r) => ({ ...r, resource: lookup(ds).resource(r.resourceId) })),
    marketing: ds.marketingTasks.filter((m) => m.eventId === id),
  };
}

/* ───────────────────────── Finanze ───────────────────────── */

export type FinanceFilter = {
  tipo?: "uscite" | "entrate";
  stato?: "da_saldare" | "scaduti" | "pagati";
  natura?: string;
  mese?: string;
  q?: string;
};

export function listDocuments(ds: DS, f: FinanceFilter) {
  const q = f.q?.trim().toLowerCase();
  const L = lookup(ds);
  return documentsWithBalance(ds)
    .filter((d) => {
      if (f.tipo === "uscite" && d.direction !== "out") return false;
      if (f.tipo === "entrate" && d.direction !== "in") return false;
      if (f.stato === "da_saldare" && d.balance.residualCents <= 0) return false;
      if (f.stato === "scaduti" && !d.balance.overdue) return false;
      if (f.stato === "pagati" && d.balance.state !== "pagato") return false;
      if (f.natura && d.nature !== f.natura) return false;
      if (f.mese && !d.documentDate.startsWith(f.mese)) return false;
      if (q) {
        const hay = [d.description, d.number ?? "", L.contact(d.contactId)?.name ?? "", L.category(d.categoryId)?.name ?? "", L.event(d.eventId)?.title ?? ""];
        if (!hay.some((s) => s.toLowerCase().includes(q))) return false;
      }
      return true;
    })
    .sort((a, b) => b.documentDate.localeCompare(a.documentDate) || b.id.localeCompare(a.id))
    .map((d) => ({
      ...d,
      contact: L.contact(d.contactId),
      category: L.category(d.categoryId),
      event: L.event(d.eventId),
      payments: ds.payments.filter((p) => p.documentId === d.id),
    }));
}

export function financeOverview(ds: DS) {
  const docs = documentsWithBalance(ds);
  const yearStart = `${ds.today.slice(0, 4)}-01-01`;
  const rows = monthlyReport({ from: yearStart, to: ds.today, documents: ds.documents, payments: ds.payments, movements: ds.movements, vatMode: ds.vatMode });
  const t = totals(rows);
  const allTime = totals(
    monthlyReport({ from: "2000-01-01", to: ds.today, documents: ds.documents, payments: ds.payments, movements: ds.movements, vatMode: ds.vatMode }),
  );
  return {
    year: ds.today.slice(0, 4),
    ytd: t,
    cashBalanceAllTime: allTime.cashBalanceCents,
    payables: sumCents(docs.filter((d) => d.direction === "out" && d.balance.residualCents > 0).map((d) => d.balance.residualCents)),
    receivables: sumCents(docs.filter((d) => d.direction === "in" && d.balance.residualCents > 0).map((d) => d.balance.residualCents)),
    overdue: docs.filter((d) => d.balance.overdue).length,
    investments: sumCents(ds.documents.filter((d) => d.nature === "investimento").map((d) => d.totalCents)),
  };
}

export function partnersOverview(ds: DS) {
  const entries = ledger(ds);
  const balances = partnerBalances(
    ds.partners.map((p) => p.id),
    entries,
  );
  const shares = sharesAt(ds.shares, ds.today);
  const breakdown = contributionBreakdown(
    ds.partners.map((p) => p.id),
    entries,
  );
  return {
    shares,
    breakdown,
    equilibrium: shares ? contributionBalance(breakdown, shares) : null,
    overall: shares
      ? partnerEquilibrium(
          ds.partners.map((p) => p.id),
          entries,
          shares,
        )
      : null,
    partners: ds.partners.map((p) => ({
      partner: p,
      balance: balances.find((b) => b.partnerId === p.id)!,
      financing: partnerStatement(p.id, "finanziamento", entries).reverse(),
      capital: partnerStatement(p.id, "capitale", entries).reverse(),
    })),
  };
}

/* ───────────────────────── Marketing ───────────────────────── */

export function marketingData(ds: DS, f: { link?: "evento" | "campagna" | "generale"; q?: string }) {
  const q = f.q?.trim().toLowerCase();
  const L = lookup(ds);
  const tasks = ds.marketingTasks
    .filter((m) => {
      if (f.link === "evento" && !m.eventId) return false;
      if (f.link === "campagna" && !m.campaignId) return false;
      if (f.link === "generale" && (m.eventId || m.campaignId)) return false;
      if (q && !m.title.toLowerCase().includes(q)) return false;
      return true;
    })
    .map((m) => ({ ...m, event: L.event(m.eventId), campaign: L.campaign(m.campaignId), owner: L.partner(m.ownerPartnerId), daysTo: m.dueDate ? daysBetween(ds.today, m.dueDate) : null }))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));

  const campaigns = ds.campaigns.map((c) => {
    const ct = ds.marketingTasks.filter((m) => m.campaignId === c.id);
    const committed = sumCents(ct.map((m) => m.externalCostCents ?? 0));
    return { ...c, taskCount: ct.length, committedCents: committed };
  });

  const monthStart = `${ds.today.slice(0, 7)}-01`;
  const spentMonth = sumCents(ds.documents.filter((d) => d.nature === "marketing" && d.documentDate >= monthStart).map((d) => d.totalCents));
  const toApprove = ds.marketingTasks.filter((m) => m.status === "in_approvazione").length;
  const internalHours = Math.round(sumCents(ds.marketingTasks.filter((m) => m.status !== "annullato").map((m) => m.internalMinutes ?? 0)) / 6) / 10;

  return { tasks, campaigns, spentMonth, toApprove, internalHours };
}

/* ───────────────────────── Ricerca globale ───────────────────────── */

export function searchIndex(ds: DS) {
  const L = lookup(ds);
  return [
    ...ds.events.map((e) => ({ type: "Evento", label: e.title, hint: `${e.code} · ${L.contact(e.clientId)?.name ?? ""}`, href: `/eventi/${e.id}` })),
    ...ds.documents.map((d) => ({ type: d.direction === "in" ? "Entrata" : "Spesa", label: d.description, hint: L.contact(d.contactId)?.name ?? L.category(d.categoryId)?.name ?? "", href: `/finanze?q=${encodeURIComponent(d.description)}` })),
    ...ds.contacts.map((c) => ({ type: c.kind === "cliente" ? "Cliente" : c.kind === "fornitore" ? "Fornitore" : "Collaboratore", label: c.name, hint: c.company ?? c.notes ?? "", href: c.kind === "cliente" ? `/eventi?q=${encodeURIComponent(c.name)}&periodo=tutti` : "/risorse" })),
    ...ds.marketingTasks.map((m) => ({ type: "Marketing", label: m.title, hint: "", href: `/marketing?task=${m.id}` })),
  ];
}
