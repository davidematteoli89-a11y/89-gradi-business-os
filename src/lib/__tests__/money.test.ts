import { describe, expect, it } from "vitest";
import {
  allocateByShares,
  centsToInput,
  divRound,
  formatEuro,
  fromNet,
  parseEuro,
  splitGross,
  sumCents,
  vatFromNet,
} from "@/lib/money";

describe("divRound", () => {
  it("arrotonda half away from zero", () => {
    expect(divRound(5, 2)).toBe(3);
    expect(divRound(-5, 2)).toBe(-3);
    expect(divRound(4, 3)).toBe(1);
    expect(divRound(-4, 3)).toBe(-1);
  });
  it("rifiuta divisione per zero", () => {
    expect(() => divRound(1, 0)).toThrow();
  });
});

describe("IVA", () => {
  it("calcola IVA 22% sull'imponibile", () => {
    expect(vatFromNet(10000, 2200)).toBe(2200);
    expect(vatFromNet(1, 2200)).toBe(0);
    expect(vatFromNet(3, 2200)).toBe(1); // 0,66 → 1
  });
  it("scorporo: net + vat === gross sempre", () => {
    for (const gross of [1, 99, 100, 1220, 12345, 999999]) {
      for (const bp of [0, 400, 500, 1000, 2200]) {
        const { net, vat } = splitGross(gross, bp);
        expect(net + vat).toBe(gross);
        expect(net).toBeGreaterThanOrEqual(0);
      }
    }
    expect(splitGross(12200, 2200)).toEqual({ net: 10000, vat: 2200 });
    expect(splitGross(1100, 1000)).toEqual({ net: 1000, vat: 100 });
  });
  it("fromNet restituisce totale coerente", () => {
    expect(fromNet(4590, 1000)).toEqual({ net: 4590, vat: 459, gross: 5049 });
  });
  it("rifiuta importi non interi", () => {
    expect(() => vatFromNet(10.5, 2200)).toThrow();
  });
});

describe("allocateByShares", () => {
  it("non presuppone 50/50 e somma esattamente", () => {
    expect(allocateByShares(10000, [6000, 4000])).toEqual([6000, 4000]);
    expect(allocateByShares(100, [3333, 6667])).toEqual([33, 67]);
    const parts = allocateByShares(1001, [5000, 5000]);
    expect(parts.reduce((a, b) => a + b)).toBe(1001);
  });
  it("gestisce importi negativi", () => {
    const parts = allocateByShares(-1001, [5000, 5000]);
    expect(parts.reduce((a, b) => a + b)).toBe(-1001);
  });
  it("rifiuta quote che non fanno 100%", () => {
    expect(() => allocateByShares(100, [5000, 4000])).toThrow();
  });
});

describe("parseEuro", () => {
  it.each([
    ["12", 1200],
    ["12,5", 1250],
    ["12,50", 1250],
    ["1.234,56", 123456],
    ["1234.56", 123456],
    ["1,234.56", 123456],
    ["€ 45,00", 4500],
    ["0,99", 99],
    ["1.500", 150000],
    ["12.5", 1250],
    ["-3,20", -320],
  ])("%s → %i", (input, expected) => {
    expect(parseEuro(input)).toBe(expected);
  });
  it.each(["", "abc", "12,345", "1,2,3", "12.34.5"])("rifiuta %s", (input) => {
    expect(parseEuro(input)).toBeNull();
  });
});

describe("formattazione", () => {
  it("formatta in euro italiano", () => {
    expect(formatEuro(123456).replace(/\s/g, " ")).toBe("1.234,56 €");
    expect(formatEuro(1200, { sign: true }).startsWith("+")).toBe(true);
    expect(centsToInput(123456)).toBe("1234,56");
    expect(centsToInput(-5)).toBe("-0,05");
  });
  it("sumCents segnala valori non validi", () => {
    expect(sumCents([1, 2, 3])).toBe(6);
    expect(() => sumCents([1, 0.5])).toThrow();
  });
});
