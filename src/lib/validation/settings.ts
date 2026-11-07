import { z } from "zod";

export const PARTNER_COLORS = ["#24211F", "#B42332", "#4F6B45", "#A0611A", "#1B6FA8"] as const;

export const partnerSchema = z.object({
  name: z.string().trim().min(2, "Scrivi nome e cognome").max(80),
  shortName: z
    .string()
    .trim()
    .min(1, "Una o due lettere")
    .max(2, "Al massimo due lettere")
    .transform((s) => s.toUpperCase()),
  color: z.enum(PARTNER_COLORS),
  email: z.email("Email non valida").optional().or(z.literal("")),
  role: z.enum(["admin", "editor", "viewer"]),
});
export type PartnerInput = z.input<typeof partnerSchema>;

export const sharesSchema = z
  .object({
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Scegli la data"),
    shares: z.array(z.object({ partnerId: z.string().min(1), percent: z.string() })).min(1),
  })
  .superRefine((v, ctx) => {
    let total = 0;
    v.shares.forEach((s, i) => {
      const n = Number(s.percent.replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > 100 || Math.round(n * 100) !== n * 100) {
        ctx.addIssue({ code: "custom", path: ["shares", i, "percent"], message: "Percentuale non valida" });
      } else total += Math.round(n * 100);
    });
    if (total !== 10000) ctx.addIssue({ code: "custom", path: ["shares"], message: `Le quote devono fare 100% (ora ${total / 100}%)` });
  });
export type SharesInput = z.input<typeof sharesSchema>;

export const linkSchema = z.object({
  partnerId: z.string().min(1),
  email: z.email("Email non valida"),
  role: z.enum(["admin", "editor", "viewer"]),
});
