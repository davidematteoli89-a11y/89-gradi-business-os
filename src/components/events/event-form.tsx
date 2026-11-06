"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Martini, Pizza } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createEvent } from "@/app/actions/events";
import { EVENT_STATUSES } from "@/lib/domain/events";
import { eventSchema, type EventInput } from "@/lib/validation/events";
import { cn } from "@/lib/utils";

function Err({ m }: { m?: string }) {
  return m ? <p role="alert" className="mt-1.5 text-[13px] text-brand">{m}</p> : null;
}

export function EventForm({ today, templates }: { today: string; templates: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, control, handleSubmit, formState, setError } = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "", clientName: "", clientPhone: "", clientEmail: "", status: "richiesta", date: today, startTime: "", endTime: "",
      venueName: "", venueAddress: "", guests: 50, hasPizza: true, hasCocktail: false, leadSource: "", checklistTemplate: "tpl-standard", notes: "",
    },
  });
  const e = formState.errors;

  return (
    <form
      noValidate
      className="space-y-8"
      onSubmit={handleSubmit((v) =>
        start(async () => {
          const res = await createEvent(v);
          if (!res.ok) {
            for (const [k, m] of Object.entries(res.fieldErrors ?? {})) setError(k as keyof EventInput, { message: m });
            return void toast.error(res.message);
          }
          toast.success(res.message);
          router.push(res.id ? `/eventi/${res.id}` : "/eventi");
        }),
      )}
    >
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-[17px] font-semibold">Evento</legend>
        <div className="sm:col-span-2">
          <Label htmlFor="ev-title">Nome</Label>
          <Input id="ev-title" className="mt-1.5" placeholder="Es. Matrimonio Rossi" aria-invalid={!!e.title} {...register("title")} />
          <Err m={e.title?.message} />
        </div>
        <div>
          <Label htmlFor="ev-date">Data</Label>
          <Input id="ev-date" type="date" className="mt-1.5" {...register("date")} />
          <Err m={e.date?.message} />
        </div>
        <div>
          <Label htmlFor="ev-status">Stato</Label>
          <NativeSelect id="ev-status" className="mt-1.5" {...register("status")}>
            {EVENT_STATUSES.filter((s) => s.value !== "completato" && s.value !== "annullato").map((s) => (
              <NativeSelectOption key={s.value} value={s.value}>{s.label}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ev-start">Inizio</Label>
            <Input id="ev-start" type="time" className="mt-1.5" {...register("startTime")} />
          </div>
          <div>
            <Label htmlFor="ev-end">Fine</Label>
            <Input id="ev-end" type="time" className="mt-1.5" {...register("endTime")} />
          </div>
        </div>
        <div>
          <Label htmlFor="ev-guests">Ospiti</Label>
          <Input id="ev-guests" type="number" inputMode="numeric" min={0} className="mt-1.5" {...register("guests")} />
          <Err m={e.guests?.message} />
        </div>
        <div className="sm:col-span-2">
          <span className="text-sm font-medium">Servizi</span>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {([["hasPizza", "Pizza", Pizza], ["hasCocktail", "Cocktail bar", Martini]] as const).map(([name, label, Icon]) => (
              <Controller
                key={name}
                control={control}
                name={name}
                render={({ field }) => (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={field.value}
                    onClick={() => field.onChange(!field.value)}
                    className={cn(
                      "flex h-14 items-center gap-3 rounded-[12px] border px-4 text-[15px] transition-colors",
                      field.value ? "border-ink bg-ink text-paper" : "border-line bg-ivory hover:border-input",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={1.75} /> {label}
                  </button>
                )}
              />
            ))}
          </div>
          <Err m={e.hasPizza?.message} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-[17px] font-semibold">Cliente e luogo</legend>
        <div className="sm:col-span-2">
          <Label htmlFor="ev-client">Cliente</Label>
          <Input id="ev-client" className="mt-1.5" autoComplete="name" aria-invalid={!!e.clientName} {...register("clientName")} />
          <Err m={e.clientName?.message} />
        </div>
        <div>
          <Label htmlFor="ev-phone">Telefono</Label>
          <Input id="ev-phone" type="tel" className="mt-1.5" {...register("clientPhone")} />
        </div>
        <div>
          <Label htmlFor="ev-email">Email</Label>
          <Input id="ev-email" type="email" className="mt-1.5" {...register("clientEmail")} />
          <Err m={e.clientEmail?.message} />
        </div>
        <div>
          <Label htmlFor="ev-venue">Luogo</Label>
          <Input id="ev-venue" className="mt-1.5" placeholder="Es. Villa Le Corti" {...register("venueName")} />
        </div>
        <div>
          <Label htmlFor="ev-addr">Indirizzo</Label>
          <Input id="ev-addr" className="mt-1.5" {...register("venueAddress")} />
        </div>
        <div>
          <Label htmlFor="ev-lead">Come ci ha trovato</Label>
          <Input id="ev-lead" className="mt-1.5" placeholder="Instagram, passaparola…" {...register("leadSource")} />
        </div>
        <div>
          <Label htmlFor="ev-tpl">Checklist da modello</Label>
          <NativeSelect id="ev-tpl" className="mt-1.5" {...register("checklistTemplate")}>
            {templates.map((t) => (
              <NativeSelectOption key={t.id} value={t.id}>{t.name}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ev-notes">Note</Label>
          <Textarea id="ev-notes" className="mt-1.5" rows={3} {...register("notes")} />
        </div>
      </fieldset>

      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Annulla</Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : null} Crea evento
        </Button>
      </div>
    </form>
  );
}
