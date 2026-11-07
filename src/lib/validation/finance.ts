import { z } from "zod";
import { parseEuro } from "@/lib/money";

export const VAT_OPTIONS = [
  { value: 2200, label: "22%" },
  { value: 1000, label: "10%" },
  { value: 500, label: "5%" },
  { value: 400, label: "4%" },
  { value: 0, label: "Esente / no IVA" },
] as const;

export const PAYMENT_METHODS = [
  { value: "carta", label: "Carta" },
  { value: "contanti", label: "Contanti" },
  { value: "bonifico", label: "Bonifico" },
  { value: "pos", label: "POS" },
  { value: "altro", label: "Altro" },
] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");

export const amountField = z
  .string()
  .trim()
  .min(1, "Inserisci l'importo")
  .refine((v) => {
    const c = parseEuro(v);
    return c !== null && c > 0;
  }, "Inserisci un importo maggiore di zero, ad esempio 24,50");

export const quickExpenseSchema = z
  .object({
    amount: amountField,
    description: z.string().trim().min(2, "Scrivi cosa hai comprato").max(160),
    categoryId: z.string().min(1, "Scegli una categoria"),
    date: isoDate,
    vatBp: z.coerce.number().int().refine((v) => VAT_OPTIONS.some((o) => o.value === v), "Aliquota non valida"),
    /** "azienda" oppure l'id del socio che ha pagato */
    payer: z.string().min(1),
    method: z.enum(["carta", "contanti", "bonifico", "pos", "altro"]),
    paid: z.boolean(),
    dueDate: isoDate.optional().or(z.literal("")),
    eventId: z.string().optional().or(z.literal("")),
    service: z.enum(["pizza", "cocktail", "generale"]).optional().or(z.literal("")),
  })
  .refine((v) => v.paid || !!v.dueDate, { message: "Indica la scadenza se la spesa non è ancora pagata", path: ["dueDate"] });

export type QuickExpenseInput = z.input<typeof quickExpenseSchema>;

export const incomePaymentSchema = z.object({
  documentId: z.string().min(1, "Scegli cosa stai incassando"),
  amount: amountField,
  date: isoDate,
  method: z.enum(["carta", "contanti", "bonifico", "pos", "altro"]),
  /** "azienda" oppure l'id del socio che ha ricevuto il denaro */
  receiver: z.string().min(1),
});

export type IncomePaymentInput = z.input<typeof incomePaymentSchema>;

export const RECEIPT_MAX_BYTES = 12 * 1024 * 1024;
export const RECEIPT_MIME = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "application/pdf"];

export type ActionResult = { ok: true; message: string; id?: string } | { ok: false; message: string; fieldErrors?: Record<string, string> };

export const partnerMovementSchema = z
  .object({
    type: z.enum(["conferimento", "apporto_non_monetario", "conversione_in_capitale", "prestito", "restituzione_prestito", "rimborso", "versamento", "prelievo", "compensazione"]),
    partnerId: z.string().min(1, "Scegli il socio"),
    counterpartPartnerId: z.string().optional().or(z.literal("")),
    account: z.enum(["finanziamento", "capitale"]).optional(),
    amount: amountField,
    date: isoDate,
    description: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine((v) => v.type !== "apporto_non_monetario" || (v.description ?? "").trim().length >= 5, {
    message: "Descrivi l'apporto e come è stato valorizzato, ad esempio “Compenso marketing rinunciato, ottobre”",
    path: ["description"],
  })
  .refine((v) => v.type !== "compensazione" || (v.counterpartPartnerId && v.counterpartPartnerId !== v.partnerId), {
    message: "Per la compensazione scegli l'altro socio",
    path: ["counterpartPartnerId"],
  });

export type PartnerMovementInput = z.input<typeof partnerMovementSchema>;
