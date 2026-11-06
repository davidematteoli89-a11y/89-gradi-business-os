/**
 * Aritmetica monetaria in centesimi interi.
 * Nessun calcolo su importi in virgola mobile: tutto entra ed esce come intero.
 */

export type Cents = number;
/** Aliquota in punti base: 2200 = 22%. */
export type BasisPoints = number;

export function assertCents(value: number, label = "importo"): asserts value is Cents {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} non valido: deve essere un intero in centesimi`);
  }
}

/** Divisione intera con arrotondamento "half away from zero". */
export function divRound(numerator: number, denominator: number): number {
  if (denominator === 0) throw new Error("Divisione per zero");
  const sign = Math.sign(numerator) * Math.sign(denominator);
  const n = Math.abs(numerator);
  const d = Math.abs(denominator);
  const q = Math.floor(n / d);
  const r = n - q * d;
  return sign * (r * 2 >= d ? q + 1 : q);
}

export function sumCents(values: readonly Cents[]): Cents {
  let total = 0;
  for (const v of values) {
    assertCents(v);
    total += v;
  }
  assertCents(total, "totale");
  return total;
}

/** IVA calcolata sull'imponibile. */
export function vatFromNet(net: Cents, vatBp: BasisPoints): Cents {
  assertCents(net, "imponibile");
  assertCents(vatBp, "aliquota");
  return divRound(net * vatBp, 10000);
}

/** Scorporo dal totale: garantisce net + vat === gross. */
export function splitGross(gross: Cents, vatBp: BasisPoints): { net: Cents; vat: Cents } {
  assertCents(gross, "totale");
  assertCents(vatBp, "aliquota");
  const net = divRound(gross * 10000, 10000 + vatBp);
  return { net, vat: gross - net };
}

export function fromNet(net: Cents, vatBp: BasisPoints): { net: Cents; vat: Cents; gross: Cents } {
  const vat = vatFromNet(net, vatBp);
  return { net, vat, gross: net + vat };
}

/**
 * Ripartisce un importo secondo quote in punti base (somma 10000)
 * con il metodo dei resti più grandi: la somma delle parti è sempre esatta.
 */
export function allocateByShares(amount: Cents, sharesBp: readonly BasisPoints[]): Cents[] {
  assertCents(amount);
  const total = sharesBp.reduce((a, b) => a + b, 0);
  if (total !== 10000) throw new Error("Le quote devono sommare al 100%");
  if (sharesBp.some((s) => s < 0 || !Number.isInteger(s))) throw new Error("Quote non valide");
  const sign = amount < 0 ? -1 : 1;
  const abs = Math.abs(amount);
  const raw = sharesBp.map((s) => (abs * s) / 10000);
  const floors = raw.map(Math.floor);
  let remainder = abs - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] += 1;
    remainder -= 1;
  }
  return floors.map((v) => v * sign);
}

/**
 * Converte un input digitato in centesimi.
 * Accetta: "12", "12,5", "12,50", "1.234,56", "1234.56", "€ 12,00", "-3,20".
 * Restituisce null se il testo non è un importo.
 */
export function parseEuro(input: string): Cents | null {
  let s = input.trim().replace(/[€\s]/g, "");
  if (!s) return null;
  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let intPart: string;
  let decPart = "";
  if (lastComma > -1 && lastDot > -1) {
    const decSep = lastComma > lastDot ? "," : ".";
    const thouSep = decSep === "," ? "." : ",";
    const [i, d = ""] = s.split(decSep);
    intPart = i.split(thouSep).join("");
    decPart = d;
  } else if (lastComma > -1) {
    const parts = s.split(",");
    if (parts.length > 2) return null;
    [intPart, decPart = ""] = parts;
  } else if (lastDot > -1) {
    const parts = s.split(".");
    // "1.234" con gruppi da 3 → migliaia; "12.5" → decimali
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3 && /^\d+$/.test(parts[0]))) {
      if (!parts.slice(1).every((p) => p.length === 3)) return null;
      intPart = parts.join("");
    } else {
      [intPart, decPart = ""] = parts;
    }
  } else {
    intPart = s;
  }
  if (!/^\d+$/.test(intPart || "0") || !/^\d{0,2}$/.test(decPart)) return null;
  const cents = Number(intPart || "0") * 100 + Number((decPart + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

const eur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", useGrouping: "always" });
const eurRound = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatEuro(cents: Cents, opts: { sign?: boolean; round?: boolean } = {}): string {
  const fmt = opts.round ? eurRound : eur;
  const text = fmt.format(cents / 100);
  if (opts.sign && cents > 0) return `+${text}`;
  return text;
}

/** Valore per input di testo: 1234,50 */
export function centsToInput(cents: Cents): string {
  const abs = Math.abs(cents);
  const s = `${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
  return cents < 0 ? `-${s}` : s;
}

export function formatPercentBp(bp: BasisPoints, digits = 1): string {
  return `${(bp / 100).toLocaleString("it-IT", { maximumFractionDigits: digits })}%`;
}
