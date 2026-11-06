"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, FileText, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/domain/segmented";
import { createQuickExpense } from "@/app/actions/finance";
import { formatEuro, parseEuro, splitGross } from "@/lib/money";
import type { Category, EventRecord, Partner } from "@/lib/domain/types";
import {
  PAYMENT_METHODS,
  RECEIPT_MAX_BYTES,
  VAT_OPTIONS,
  quickExpenseSchema,
  type QuickExpenseInput,
} from "@/lib/validation/finance";
import { cn } from "@/lib/utils";

export type ExpenseFormData = {
  today: string;
  categories: Category[];
  partners: Partner[];
  currentPartnerId?: string;
  events: Pick<EventRecord, "id" | "title" | "date">[];
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[13px] text-brand">
      {message}
    </p>
  );
}

export function ExpenseForm({ data, onDone, defaultEventId }: { data: ExpenseFormData; onDone: () => void; defaultEventId?: string }) {
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement | null>(null);

  const outCategories = useMemo(() => data.categories.filter((c) => c.direction === "out"), [data.categories]);

  const form = useForm<QuickExpenseInput>({
    resolver: zodResolver(quickExpenseSchema),
    defaultValues: {
      amount: "",
      description: "",
      categoryId: "",
      date: data.today,
      vatBp: 2200,
      payer: data.currentPartnerId ?? "azienda",
      method: "carta",
      paid: true,
      dueDate: "",
      eventId: defaultEventId ?? "",
      service: "",
    },
  });
  const { register, control, handleSubmit, formState, setError } = form;
  const errors = formState.errors;
  const [amount, vatBp, paid, eventId] = useWatch({ control, name: ["amount", "vatBp", "paid", "eventId"] });

  useEffect(() => {
    // su iPhone il focus apre subito il tastierino numerico
    const t = setTimeout(() => amountRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const cents = parseEuro(String(amount ?? ""));
  const split = cents && cents > 0 ? splitGross(cents, Number(vatBp)) : null;

  const onSubmit = handleSubmit((values) => {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(values));
    if (file) fd.set("receipt", file);
    startTransition(async () => {
      const res = await createQuickExpense(fd);
      if (!res.ok) {
        if (res.fieldErrors) {
          for (const [k, m] of Object.entries(res.fieldErrors)) setError(k as keyof QuickExpenseInput, { message: m });
        }
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      onDone();
    });
  });

  const amountField = register("amount");

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
        {/* Importo */}
        <div>
          <Label htmlFor="exp-amount" className="text-[13px] text-muted-foreground">
            Importo totale
          </Label>
          <div className="mt-1.5 flex items-baseline gap-2 border-b border-line pb-1 focus-within:border-ink">
            <input
              id="exp-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? "exp-amount-err" : "exp-amount-hint"}
              className="tabular w-full bg-transparent text-[40px] leading-[52px] font-semibold tracking-[-0.03em] outline-none placeholder:text-ink/20"
              {...amountField}
              ref={(el) => {
                amountField.ref(el);
                amountRef.current = el;
              }}
            />
            <span className="text-2xl font-medium text-ash">€</span>
          </div>
          <p id="exp-amount-hint" className="tabular mt-1.5 text-[13px] text-muted-foreground">
            {split ? `Imponibile ${formatEuro(split.net)} · IVA ${formatEuro(split.vat)}` : "IVA inclusa, come sullo scontrino"}
          </p>
          <FieldError id="exp-amount-err" message={errors.amount?.message} />
        </div>

        {/* Descrizione */}
        <div>
          <Label htmlFor="exp-desc">Cosa</Label>
          <Input
            id="exp-desc"
            className="mt-1.5"
            placeholder="Es. Fiordilatte per il matrimonio"
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? "exp-desc-err" : undefined}
            {...register("description")}
          />
          <FieldError id="exp-desc-err" message={errors.description?.message} />
        </div>

        {/* Categoria */}
        <fieldset>
          <legend className="text-sm font-medium">Categoria</legend>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Segmented
                wrap
                size="sm"
                label="Categoria"
                className="mt-2"
                value={field.value}
                onChange={field.onChange}
                options={outCategories.map((c) => ({ value: c.id, label: c.name }))}
              />
            )}
          />
          <FieldError id="exp-cat-err" message={errors.categoryId?.message} />
        </fieldset>

        {/* Data e IVA */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="exp-date">Data documento</Label>
            <Input id="exp-date" type="date" className="mt-1.5" {...register("date")} />
          </div>
          <div>
            <Label htmlFor="exp-vat">IVA</Label>
            <NativeSelect id="exp-vat" className="mt-1.5" {...register("vatBp")}>
              {VAT_OPTIONS.map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>

        {/* Chi ha pagato */}
        <fieldset>
          <legend className="text-sm font-medium">Chi ha pagato</legend>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Se paga un socio, diventa un anticipo a suo credito.</p>
          <Controller
            control={control}
            name="payer"
            render={({ field }) => (
              <Segmented
                label="Chi ha pagato"
                className="mt-2"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: "azienda", label: "Azienda" },
                  ...data.partners.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            )}
          />
        </fieldset>

        {/* Pagamento */}
        <div className="space-y-3 rounded-[14px] border border-line bg-paper p-4">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="exp-paid" className="text-sm font-medium">
              Già pagata
            </Label>
            <Controller
              control={control}
              name="paid"
              render={({ field }) => <Switch id="exp-paid" checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>
          {paid ? (
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <Segmented
                  wrap
                  size="sm"
                  label="Metodo di pagamento"
                  value={field.value}
                  onChange={field.onChange}
                  options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))}
                />
              )}
            />
          ) : (
            <div>
              <Label htmlFor="exp-due">Scadenza</Label>
              <Input id="exp-due" type="date" className="mt-1.5" aria-invalid={!!errors.dueDate} {...register("dueDate")} />
              <FieldError id="exp-due-err" message={errors.dueDate?.message} />
            </div>
          )}
        </div>

        {/* Evento */}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <Label htmlFor="exp-event">Evento collegato</Label>
            <NativeSelect id="exp-event" className="mt-1.5" {...register("eventId")}>
              <NativeSelectOption value="">Nessuno, spesa generale</NativeSelectOption>
              {data.events.map((e) => (
                <NativeSelectOption key={e.id} value={e.id}>
                  {e.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          {eventId ? (
            <div>
              <Label htmlFor="exp-service">Servizio</Label>
              <NativeSelect id="exp-service" className="mt-1.5" {...register("service")}>
                <NativeSelectOption value="">Comune</NativeSelectOption>
                <NativeSelectOption value="pizza">Pizza</NativeSelectOption>
                <NativeSelectOption value="cocktail">Cocktail bar</NativeSelectOption>
              </NativeSelect>
            </div>
          ) : null}
        </div>

        {/* Ricevuta */}
        <div>
          <span className="text-sm font-medium">Ricevuta</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="sr-only"
            id="exp-file"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > RECEIPT_MAX_BYTES) {
                toast.error("Il file supera 12 MB. Scatta una nuova foto o comprimi il PDF.");
                e.target.value = "";
                return;
              }
              setFile(f);
            }}
          />
          {file ? (
            <div className="mt-2 flex items-center gap-3 rounded-[12px] border border-line bg-paper p-2 pr-3">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- anteprima locale da blob
                <img src={preview} alt="Anteprima ricevuta" className="size-14 rounded-[8px] object-cover" />
              ) : (
                <span className="grid size-14 place-items-center rounded-[8px] bg-sand">
                  <FileText className="size-5 text-ash" />
                </span>
              )}
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button
                type="button"
                aria-label="Rimuovi ricevuta"
                className="grid size-9 place-items-center rounded-full text-ash hover:bg-sand hover:text-ink"
                onClick={() => {
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="exp-file"
              className="mt-2 flex h-14 cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-dashed border-input text-sm font-medium text-ink transition-colors hover:border-ink focus-within:ring-2"
            >
              <Camera className="size-[18px] text-brand" />
              Scatta o allega la ricevuta
            </label>
          )}
          <FieldError id="exp-file-err" message={errors.root?.message} />
        </div>
      </div>

      <div className={cn("border-t border-line bg-ivory px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]")}>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          {pending ? "Salvataggio…" : cents && cents > 0 ? `Salva spesa di ${formatEuro(cents)}` : "Salva spesa"}
        </Button>
      </div>
    </form>
  );
}
