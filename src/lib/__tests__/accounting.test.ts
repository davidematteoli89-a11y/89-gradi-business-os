import { describe, expect, it } from "vitest";
import { documentBalance, validateNewPayment } from "@/lib/domain/documents";
import { eventEconomics, nextEventCode, quoteTotals, serviceMarginsWithSharedCosts } from "@/lib/domain/events";
import { monthlyReport, toCsv, totals, centsToCsv } from "@/lib/domain/reports";
import type { BudgetLine, FinDocument, Payment, Quote } from "@/lib/domain/types";

const doc = (p: Partial<FinDocument> & Pick<FinDocument, "id" | "direction" | "netCents">): FinDocument => {
  const vatBp = p.vatBp ?? 2200;
  const vatCents = p.vatCents ?? Math.round((p.netCents * vatBp) / 10000);
  return {
    docType: "fattura",
    documentDate: "2026-06-10",
    categoryId: "c",
    nature: "evento",
    description: "doc",
    vatBp,
    vatCents,
    totalCents: p.netCents + vatCents,
    ...p,
  };
};

const pay = (p: Partial<Payment> & Pick<Payment, "id" | "documentId" | "amountCents">): Payment => ({
  paidOn: "2026-06-10",
  method: "bonifico",
  payer: "azienda",
  ...p,
});

describe("acconti e saldi: nessuna doppia contabilizzazione", () => {
  const invoice = doc({ id: "f1", direction: "in", netCents: 300000, vatBp: 1000, eventId: "e1", service: "pizza" });
  const acconto = pay({ id: "p1", documentId: "f1", amountCents: 99000, paidOn: "2026-05-01" });
  const saldo = pay({ id: "p2", documentId: "f1", amountCents: 231000, paidOn: "2026-06-12" });

  it("il ricavo resta quello del documento anche dopo acconto e saldo", () => {
    const econ = eventEconomics({
      eventId: "e1",
      quotes: [],
      budget: [],
      documents: [invoice],
      payments: [acconto, saldo],
      vatMode: "ordinario",
    });
    expect(econ.actual.revenue.total).toBe(300000);
    expect(econ.cash.receivedCents).toBe(330000);
    expect(econ.cash.invoicedCents).toBe(330000);
  });

  it("lo stato passa da parziale a pagato", () => {
    expect(documentBalance(invoice, [acconto], "2026-05-02").state).toBe("parziale");
    expect(documentBalance(invoice, [acconto, saldo], "2026-06-20").state).toBe("pagato");
    expect(documentBalance(invoice, [acconto, saldo], "2026-06-20").residualCents).toBe(0);
  });

  it("rifiuta un pagamento che supera il residuo", () => {
    expect(validateNewPayment(invoice, [acconto], 231000).ok).toBe(true);
    expect(validateNewPayment(invoice, [acconto], 231001).ok).toBe(false);
    expect(validateNewPayment(invoice, [], 0).ok).toBe(false);
  });

  it("segnala lo scaduto solo se c'è residuo", () => {
    const d = { ...invoice, dueDate: "2026-06-01" };
    expect(documentBalance(d, [acconto], "2026-06-02").state).toBe("scaduto");
    expect(documentBalance(d, [acconto, saldo], "2026-07-01").overdue).toBe(false);
  });
});

describe("margine previsto vs consuntivo", () => {
  const quote: Quote = {
    id: "q1",
    eventId: "e1",
    version: 2,
    status: "accettato",
    createdAt: "2026-04-01",
    lines: [
      { id: "l1", service: "pizza", description: "Pizza 120 ospiti", qty: 120, unitPriceCents: 1800, vatBp: 1000 },
      { id: "l2", service: "cocktail", description: "Open bar 3h", qty: 1, unitPriceCents: 150000, vatBp: 2200 },
      { id: "l3", service: "extra", description: "Trasferta", qty: 1, unitPriceCents: 10000, vatBp: 2200 },
    ],
  };
  const draft: Quote = { ...quote, id: "q0", version: 1, status: "rifiutato", lines: [] };
  const budget: BudgetLine[] = [
    { id: "b1", eventId: "e1", service: "pizza", description: "Impasti", amountCents: 50000, kind: "previsto" },
    { id: "b2", eventId: "e1", service: "cocktail", description: "Distillati", amountCents: 40000, kind: "stimato" },
    { id: "b3", eventId: "e1", service: "generale", description: "Staff", amountCents: 60000, kind: "previsto" },
  ];

  it("calcola i totali del preventivo per servizio", () => {
    const t = quoteTotals(quote.lines);
    expect(t.byService).toEqual({ pizza: 216000, cocktail: 150000, extra: 10000, total: 376000 });
    expect(t.vatCents).toBe(21600 + 33000 + 2200);
  });

  it("il previsto usa il preventivo accettato e il budget, separato dal consuntivo", () => {
    const docs = [
      doc({ id: "r1", direction: "in", netCents: 376000, eventId: "e1", service: "pizza" }),
      doc({ id: "c1", direction: "out", netCents: 52000, eventId: "e1", service: "pizza" }),
      doc({ id: "c2", direction: "out", netCents: 38000, eventId: "e1", service: "cocktail" }),
      doc({ id: "x", direction: "out", netCents: 99999, eventId: "altro" }),
    ];
    const e = eventEconomics({ eventId: "e1", quotes: [draft, quote], budget, documents: docs, payments: [], vatMode: "ordinario" });
    expect(e.forecast.basis).toBe("accettato");
    expect(e.forecast.hasEstimates).toBe(true); // b2 è stimato
    expect(e.forecast.marginCents).toBe(376000 - 150000);
    expect(e.actual.costs.total).toBe(90000);
    expect(e.actual.marginCents).toBe(376000 - 90000);
    expect(e.actual.marginBp).toBe(7606);
  });

  it("in regime forfettario i costi contano al lordo", () => {
    const docs = [doc({ id: "c1", direction: "out", netCents: 10000, eventId: "e1" })];
    const e = eventEconomics({ eventId: "e1", quotes: [], budget: [], documents: docs, payments: [], vatMode: "forfettario" });
    expect(e.actual.costs.total).toBe(12200);
    expect(e.forecast.basis).toBe("nessuno");
    expect(e.actual.marginBp).toBeNull();
  });

  it("ripartisce i costi comuni tra pizza e cocktail come stima", () => {
    const m = serviceMarginsWithSharedCosts({
      revenue: { pizza: 30000, cocktail: 10000, extra: 0, total: 40000 },
      costs: { pizza: 10000, cocktail: 2000, generale: 1001, total: 13001 },
      marginCents: 26999,
      marginBp: null,
    });
    expect(m.pizza + m.cocktail).toBe(40000 - 13001);
  });

  it("genera codici evento progressivi per anno", () => {
    expect(nextEventCode(["89-2026-001", "89-2026-007", "89-2025-020"], 2026)).toBe("89-2026-008");
    expect(nextEventCode([], 2027)).toBe("89-2027-001");
  });
});

describe("report mensile", () => {
  it("separa competenza, cassa e investimenti", () => {
    const docs = [
      doc({ id: "r", direction: "in", netCents: 100000, documentDate: "2026-05-20" }),
      doc({ id: "c", direction: "out", netCents: 30000, documentDate: "2026-05-21" }),
      doc({ id: "i", direction: "out", netCents: 500000, documentDate: "2026-05-02", nature: "investimento" }),
    ];
    const pays = [pay({ id: "p", documentId: "r", amountCents: 50000, paidOn: "2026-06-03" })];
    const rows = monthlyReport({ from: "2026-05-01", to: "2026-06-30", documents: docs, payments: pays, vatMode: "ordinario" });
    expect(rows.map((r) => r.month)).toEqual(["2026-05", "2026-06"]);
    expect(rows[0]).toMatchObject({ revenueCents: 100000, costCents: 30000, investmentCents: 500000, marginCents: 70000, cashInCents: 0 });
    expect(rows[1].cashInCents).toBe(50000);
    expect(totals(rows).cashBalanceCents).toBe(50000);
  });

  it("esporta CSV compatibile con Excel italiano", () => {
    const csv = toCsv(["Descrizione", "Importo"], [["Farina; tipo 00", centsToCsv(-1250)]]);
    expect(csv).toBe('﻿Descrizione;Importo\r\n"Farina; tipo 00";-12,50');
  });
});

describe("cassa aziendale", () => {
  it("le spese pagate dai soci non escono dalla cassa; conferimenti e rimborsi sì", () => {
    const docs = [doc({ id: "s", direction: "out", netCents: 10000, vatBp: 0, documentDate: "2026-03-01" })];
    const pays = [pay({ id: "p", documentId: "s", amountCents: 10000, paidOn: "2026-03-01", payer: "socio", partnerId: "A" })];
    const rows = monthlyReport({
      from: "2026-03-01",
      to: "2026-03-31",
      documents: docs,
      payments: pays,
      movements: [
        { id: "m1", partnerId: "A", type: "conferimento", amountCents: 50000, occurredOn: "2026-03-02", description: "" },
        { id: "m2", partnerId: "A", type: "rimborso", amountCents: 10000, occurredOn: "2026-03-10", description: "" },
        { id: "m3", partnerId: "A", counterpartPartnerId: "B", type: "compensazione", amountCents: 999, occurredOn: "2026-03-11", description: "" },
      ],
      vatMode: "ordinario",
    });
    expect(rows[0]).toMatchObject({ costCents: 10000, cashInCents: 50000, cashOutCents: 10000 });
  });
});
