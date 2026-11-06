"use client";

import { useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Segmented } from "@/components/domain/segmented";
import { registerIncome } from "@/app/actions/finance";
import { centsToInput, formatEuro, parseEuro, type Cents } from "@/lib/money";
import type { Partner } from "@/lib/domain/types";
import { PAYMENT_METHODS, incomePaymentSchema, type IncomePaymentInput } from "@/lib/validation/finance";

export type IncomeFormData = {
  today: string;
  partners: Partner[];
  receivables: { id: string; label: string; residualCents: Cents; totalCents: Cents }[];
};

export function IncomeForm({ data, onDone, defaultDocumentId }: { data: IncomeFormData; onDone: () => void; defaultDocumentId?: string }) {
  const [pending, startTransition] = useTransition();
  const first = data.receivables.find((r) => r.id === defaultDocumentId) ?? data.receivables[0];
  const form = useForm<IncomePaymentInput>({
    resolver: zodResolver(incomePaymentSchema),
    defaultValues: {
      documentId: first?.id ?? "",
      amount: first ? centsToInput(first.residualCents) : "",
      date: data.today,
      method: "bonifico",
      receiver: "azienda",
    },
  });
  const { register, control, handleSubmit, setValue, setError, formState } = form;
  const [documentId, amount] = useWatch({ control, name: ["documentId", "amount"] });
  const selected = data.receivables.find((r) => r.id === documentId);
  const cents = parseEuro(String(amount ?? ""));

  if (!data.receivables.length) {
    return (
      <div className="p-5 text-sm text-muted-foreground">
        Non ci sono importi da incassare. Gli incassi si registrano su un documento di entrata, come la fattura di un evento: così
        acconto e saldo non vengono contati due volte.
      </div>
    );
  }

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const res = await registerIncome(values);
      if (!res.ok) {
        for (const [k, m] of Object.entries(res.fieldErrors ?? {})) setError(k as keyof IncomePaymentInput, { message: m });
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      onDone();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <div>
          <Label htmlFor="inc-doc">Cosa stai incassando</Label>
          <NativeSelect
            id="inc-doc"
            className="mt-1.5"
            {...register("documentId", {
              onChange: (e) => {
                const r = data.receivables.find((x) => x.id === e.target.value);
                if (r) setValue("amount", centsToInput(r.residualCents));
              },
            })}
          >
            {data.receivables.map((r) => (
              <NativeSelectOption key={r.id} value={r.id}>
                {r.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {selected ? (
            <p className="tabular mt-1.5 text-[13px] text-muted-foreground">
              Residuo {formatEuro(selected.residualCents)} su {formatEuro(selected.totalCents)}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="inc-amount" className="text-[13px] text-muted-foreground">
            Importo ricevuto
          </Label>
          <div className="mt-1.5 flex items-baseline gap-2 border-b border-line pb-1 focus-within:border-ink">
            <input
              id="inc-amount"
              inputMode="decimal"
              autoComplete="off"
              className="tabular w-full bg-transparent text-[40px] leading-[52px] font-semibold tracking-[-0.03em] outline-none"
              aria-invalid={!!formState.errors.amount}
              {...register("amount")}
            />
            <span className="text-2xl font-medium text-ash">€</span>
          </div>
          {formState.errors.amount ? (
            <p role="alert" className="mt-1.5 text-[13px] text-brand">
              {formState.errors.amount.message}
            </p>
          ) : selected && cents && cents < selected.residualCents ? (
            <p className="mt-1.5 text-[13px] text-muted-foreground">Registrato come acconto: il resto rimane da incassare.</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="inc-date">Data incasso</Label>
            <Input id="inc-date" type="date" className="mt-1.5" {...register("date")} />
          </div>
          <div>
            <Label htmlFor="inc-method">Metodo</Label>
            <NativeSelect id="inc-method" className="mt-1.5" {...register("method")}>
              {PAYMENT_METHODS.map((m) => (
                <NativeSelectOption key={m.value} value={m.value}>
                  {m.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Chi ha ricevuto il denaro</legend>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Se lo trattiene un socio, risulta come suo debito verso l&apos;azienda.</p>
          <Controller
            control={control}
            name="receiver"
            render={({ field }) => (
              <Segmented
                label="Chi ha ricevuto il denaro"
                className="mt-2"
                value={field.value}
                onChange={field.onChange}
                options={[{ value: "azienda", label: "Azienda" }, ...data.partners.map((p) => ({ value: p.id, label: p.name }))]}
              />
            )}
          />
        </fieldset>
      </div>
      <div className="border-t border-line bg-ivory px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          {pending ? "Registrazione…" : "Registra incasso"}
        </Button>
      </div>
    </form>
  );
}
