import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Orario non valido").optional().or(z.literal(""));

export const eventSchema = z
  .object({
    title: z.string().trim().min(3, "Dai un nome all'evento, ad esempio “Matrimonio Rossi”").max(120),
    clientName: z.string().trim().min(2, "Indica il cliente").max(120),
    clientPhone: z.string().trim().max(40).optional().or(z.literal("")),
    clientEmail: z.email("Email non valida").optional().or(z.literal("")),
    status: z.enum(["richiesta", "preventivo", "trattativa", "confermato", "in_preparazione", "completato", "annullato"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Scegli la data"),
    startTime: time,
    endTime: time,
    venueName: z.string().trim().max(120).optional().or(z.literal("")),
    venueAddress: z.string().trim().max(200).optional().or(z.literal("")),
    guests: z.coerce.number().int("Numero intero").min(0).max(5000),
    hasPizza: z.boolean(),
    hasCocktail: z.boolean(),
    leadSource: z.string().trim().max(60).optional().or(z.literal("")),
    checklistTemplate: z.string().optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .refine((v) => v.hasPizza || v.hasCocktail, { message: "Scegli almeno un servizio", path: ["hasPizza"] });

export type EventInput = z.input<typeof eventSchema>;
