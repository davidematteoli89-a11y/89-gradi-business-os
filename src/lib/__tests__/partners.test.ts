import { describe, expect, it } from "vitest";
import {
  buildLedger,
  movementEntries,
  partnerBalances,
  partnerStatement,
  sharesAt,
  splitByShares,
  suggestSettlement,
} from "@/lib/domain/partners";
import type { FinDocument, PartnerMovement, Payment } from "@/lib/domain/types";

const expense: FinDocument = {
  id: "d1",
  direction: "out",
  docType: "scontrino",
  documentDate: "2026-03-01",
  categoryId: "c",
  nature: "evento",
  description: "Farina e mozzarella",
  netCents: 10000,
  vatBp: 2200,
  vatCents: 2200,
  totalCents: 12200,
};
const income: FinDocument = { ...expense, id: "d2", direction: "in", description: "Saldo evento in contanti" };

describe("conti soci", () => {
  const payments: Payment[] = [
    { id: "p1", documentId: "d1", paidOn: "2026-03-01", amountCents: 12200, method: "carta", payer: "socio", partnerId: "A" },
    { id: "p2", documentId: "d2", paidOn: "2026-03-05", amountCents: 50000, method: "contanti", payer: "socio", partnerId: "B" },
    { id: "p3", documentId: "d1", paidOn: "2026-03-02", amountCents: 100, method: "carta", payer: "azienda" },
  ];
  const movements: PartnerMovement[] = [
    { id: "m1", partnerId: "A", type: "conferimento", amountCents: 500000, occurredOn: "2026-01-10", description: "Conferimento iniziale" },
    { id: "m2", partnerId: "B", type: "prestito", amountCents: 200000, occurredOn: "2026-01-15", description: "Prestito forno" },
    { id: "m3", partnerId: "A", type: "rimborso", amountCents: 2200, occurredOn: "2026-03-10", description: "Rimborso parziale" },
    { id: "m4", partnerId: "A", counterpartPartnerId: "B", type: "compensazione", amountCents: 1000, occurredOn: "2026-03-11", description: "B ha pagato A" },
  ];
  const ledger = buildLedger(payments, [expense, income], movements);

  it("la spesa pagata da un socio diventa un anticipo a suo credito", () => {
    const a = ledger.find((e) => e.id === "pay:p1")!;
    expect(a).toMatchObject({ partnerId: "A", kind: "anticipo_spesa", amountCents: 12200, account: "finanziamento" });
  });

  it("l'incasso trattenuto da un socio è un debito verso l'azienda", () => {
    const b = ledger.find((e) => e.id === "pay:p2")!;
    expect(b).toMatchObject({ partnerId: "B", kind: "incasso_trattenuto", amountCents: -50000 });
  });

  it("i pagamenti dell'azienda non toccano i conti soci", () => {
    expect(ledger.some((e) => e.id === "pay:p3")).toBe(false);
  });

  it("separa conto finanziamento e conto capitale", () => {
    const [a, b] = partnerBalances(["A", "B"], ledger);
    // A: +12200 anticipo −2200 rimborso −1000 compensazione
    expect(a).toEqual({ partnerId: "A", financingCents: 9000, capitalCents: 500000, advancesCents: 12200 });
    // B: +200000 prestito −50000 incasso trattenuto +1000 compensazione
    expect(b).toEqual({ partnerId: "B", financingCents: 151000, capitalCents: 0, advancesCents: 0 });
  });

  it("l'estratto conto è cronologico con saldo progressivo verificabile", () => {
    const rows = partnerStatement("A", "finanziamento", ledger);
    expect(rows.map((r) => r.date)).toEqual(["2026-03-01", "2026-03-10", "2026-03-11"]);
    expect(rows.map((r) => r.runningCents)).toEqual([12200, 10000, 9000]);
  });

  it("la compensazione richiede un socio diverso", () => {
    expect(() =>
      movementEntries({ id: "x", partnerId: "A", type: "compensazione", amountCents: 1, occurredOn: "2026-01-01", description: "" }),
    ).toThrow();
    expect(() =>
      movementEntries({ id: "x", partnerId: "A", type: "prestito", amountCents: 0, occurredOn: "2026-01-01", description: "" }),
    ).toThrow();
  });

  it("propone rimborsi e versamenti per riconciliare", () => {
    const s = suggestSettlement(
      [
        { partnerId: "A", financingCents: 9000, capitalCents: 0, advancesCents: 0 },
        { partnerId: "B", financingCents: -3000, capitalCents: 0, advancesCents: 0 },
        { partnerId: "C", financingCents: 0, capitalCents: 0, advancesCents: 0 },
      ],
      "2026-04-01",
    );
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ partnerId: "A", type: "rimborso", amountCents: 9000 });
    expect(s[1]).toMatchObject({ partnerId: "B", type: "versamento", amountCents: 3000 });
  });
});

describe("quote di ripartizione", () => {
  const shares = [
    { partnerId: "A", shareBp: 6000, validFrom: "2026-01-01" },
    { partnerId: "B", shareBp: 4000, validFrom: "2026-01-01" },
    { partnerId: "A", shareBp: 5500, validFrom: "2026-07-01" },
    { partnerId: "B", shareBp: 4500, validFrom: "2026-07-01" },
  ];
  it("usa le quote valide alla data", () => {
    expect(sharesAt(shares, "2026-03-01")?.map((s) => s.shareBp)).toEqual([6000, 4000]);
    expect(sharesAt(shares, "2026-08-01")?.map((s) => s.shareBp)).toEqual([5500, 4500]);
  });
  it("restituisce null se non configurate o incoerenti", () => {
    expect(sharesAt(shares, "2025-12-31")).toBeNull();
    expect(sharesAt([{ partnerId: "A", shareBp: 5000, validFrom: "2026-01-01" }], "2026-02-01")).toBeNull();
  });
  it("ripartisce senza perdere centesimi", () => {
    const parts = splitByShares(100001, sharesAt(shares, "2026-08-01")!);
    expect(parts.reduce((a, p) => a + p.amountCents, 0)).toBe(100001);
  });
});
