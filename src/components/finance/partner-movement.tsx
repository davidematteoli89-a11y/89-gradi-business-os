"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { registerPartnerMovement } from "@/app/actions/finance";
import { MOVEMENT_LABELS } from "@/lib/domain/partners";
import type { Partner } from "@/lib/domain/types";
import { partnerMovementSchema, type PartnerMovementInput } from "@/lib/validation/finance";

const HELP: Record<string, string> = {
  conferimento: "Denaro messo nell'azienda come investimento. Va sul conto capitale.",
  apporto_non_monetario:
    "Lavoro, servizi o compensi a cui il socio rinuncia per l'azienda, al valore concordato tra i soci. Conta come investimento, ma non muove la cassa e non è un costo.",
  conversione_in_capitale: "Il socio rinuncia al rimborso di soldi anticipati: il credito diventa investimento.",
  prestito: "Soldi prestati all'azienda, da restituire.",
  restituzione_prestito: "L'azienda restituisce un prestito al socio.",
  rimborso: "L'azienda rimborsa al socio spese anticipate.",
  versamento: "Il socio versa denaro all'azienda: scegli su quale conto.",
  prelievo: "Prelievo o distribuzione di utili dal conto capitale.",
  compensazione: "Un socio paga l'altro direttamente (conguaglio): chi paga prende il credito verso l'azienda di chi riceve.",
};

export function PartnerMovementDialog({ partners, today }: { partners: Partner[]; today: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const form = useForm<PartnerMovementInput>({
    resolver: zodResolver(partnerMovementSchema),
    defaultValues: { type: "rimborso", partnerId: partners[0]?.id ?? "", counterpartPartnerId: partners[1]?.id ?? "", account: "finanziamento", amount: "", date: today, description: "" },
  });
  const { register, handleSubmit, control, formState, reset } = form;
  const type = useWatch({ control, name: "type" });
  const err = formState.errors;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Movimento socio
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-ivory sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nuovo movimento socio</DialogTitle>
          <DialogDescription>Le spese pagate da un socio diventano anticipi da sole: qui registri il resto.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) =>
            start(async () => {
              const res = await registerPartnerMovement(v);
              if (!res.ok) return void toast.error(res.message);
              toast.success(res.message);
              reset();
              setOpen(false);
            }),
          )}
        >
          <div>
            <Label htmlFor="pm-type">Tipo</Label>
            <NativeSelect id="pm-type" className="mt-1.5" {...register("type")}>
              {Object.keys(HELP).map((k) => (
                <NativeSelectOption key={k} value={k}>
                  {MOVEMENT_LABELS[k as keyof typeof MOVEMENT_LABELS]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <p className="mt-1.5 text-[13px] text-muted-foreground">{HELP[type]}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pm-partner">{type === "compensazione" ? "Chi riceve i soldi" : "Socio"}</Label>
              <NativeSelect id="pm-partner" className="mt-1.5" {...register("partnerId")}>
                {partners.map((p) => (
                  <NativeSelectOption key={p.id} value={p.id}>
                    {p.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            {type === "compensazione" ? (
              <div>
                <Label htmlFor="pm-cp">Chi paga</Label>
                <NativeSelect id="pm-cp" className="mt-1.5" {...register("counterpartPartnerId")}>
                  {partners.map((p) => (
                    <NativeSelectOption key={p.id} value={p.id}>
                      {p.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {err.counterpartPartnerId ? <p className="mt-1 text-[13px] text-brand">{err.counterpartPartnerId.message}</p> : null}
              </div>
            ) : type === "versamento" ? (
              <div>
                <Label htmlFor="pm-acc">Conto</Label>
                <NativeSelect id="pm-acc" className="mt-1.5" {...register("account")}>
                  <NativeSelectOption value="finanziamento">Finanziamento</NativeSelectOption>
                  <NativeSelectOption value="capitale">Capitale</NativeSelectOption>
                </NativeSelect>
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pm-amount">Importo</Label>
              <Input id="pm-amount" inputMode="decimal" placeholder="0,00" className="tabular mt-1.5" aria-invalid={!!err.amount} {...register("amount")} />
              {err.amount ? <p className="mt-1 text-[13px] text-brand">{err.amount.message}</p> : null}
            </div>
            <div>
              <Label htmlFor="pm-date">Data</Label>
              <Input id="pm-date" type="date" className="mt-1.5" {...register("date")} />
            </div>
          </div>
          <div>
            <Label htmlFor="pm-desc">Nota</Label>
            <Input
              id="pm-desc"
              className="mt-1.5"
              placeholder={type === "apporto_non_monetario" ? "Es. Compenso marketing rinunciato, ottobre" : "Es. Rimborso spese ottobre"}
              aria-invalid={!!err.description}
              {...register("description")}
            />
            {err.description ? <p className="mt-1 text-[13px] text-brand">{err.description.message}</p> : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? <LoaderCircle className="animate-spin" /> : null} Registra movimento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
