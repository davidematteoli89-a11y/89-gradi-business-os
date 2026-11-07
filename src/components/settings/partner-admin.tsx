"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LoaderCircle, Percent, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { addPartner, linkPartnerAccount, setShares } from "@/app/actions/settings";
import type { Partner } from "@/lib/domain/types";
import { PARTNER_COLORS, linkSchema, partnerSchema, sharesSchema, type PartnerInput, type SharesInput } from "@/lib/validation/settings";
import { cn } from "@/lib/utils";
import type { z } from "zod";

const ROLE_OPTIONS = [
  { value: "admin", label: "Amministratore", hint: "tutto, comprese quote e impostazioni" },
  { value: "editor", label: "Può modificare", hint: "tutti i dati operativi" },
  { value: "viewer", label: "Sola lettura", hint: "ad esempio il commercialista" },
] as const;

function Err({ m }: { m?: string }) {
  return m ? <p role="alert" className="mt-1 text-[13px] text-brand">{m}</p> : null;
}

export function AddPartnerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const { register, control, handleSubmit, formState, reset, setError } = useForm<PartnerInput>({
    resolver: zodResolver(partnerSchema),
    defaultValues: { name: "", shortName: "", color: PARTNER_COLORS[0], email: "", role: "admin" },
  });
  const e = formState.errors;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus /> Aggiungi socio
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-ivory sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Nuovo socio</DialogTitle>
          <DialogDescription>
            Se indichi l&apos;email del suo account, potrà accedere all&apos;app. L&apos;account deve già esistere su Supabase.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) =>
            start(async () => {
              const res = await addPartner(v);
              if (!res.ok) {
                for (const [k, m] of Object.entries(res.fieldErrors ?? {})) setError(k as keyof PartnerInput, { message: m });
                return void toast.error(res.message);
              }
              toast.success(res.message);
              reset();
              setOpen(false);
              router.refresh();
            }),
          )}
        >
          <div className="grid grid-cols-[1fr_88px] gap-3">
            <div>
              <Label htmlFor="pa-name">Nome e cognome</Label>
              <Input id="pa-name" className="mt-1.5" autoComplete="off" aria-invalid={!!e.name} {...register("name")} />
              <Err m={e.name?.message} />
            </div>
            <div>
              <Label htmlFor="pa-short">Sigla</Label>
              <Input id="pa-short" className="mt-1.5 uppercase" maxLength={2} placeholder="DM" aria-invalid={!!e.shortName} {...register("shortName")} />
              <Err m={e.shortName?.message} />
            </div>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Colore</legend>
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <div role="radiogroup" aria-label="Colore" className="mt-2 flex gap-2">
                  {PARTNER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={field.value === c}
                      aria-label={c}
                      onClick={() => field.onChange(c)}
                      className={cn("size-9 rounded-full ring-offset-2 ring-offset-ivory", field.value === c && "ring-2 ring-ink")}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
            />
          </fieldset>
          <div>
            <Label htmlFor="pa-email">Email dell&apos;account (facoltativa)</Label>
            <Input id="pa-email" type="email" className="mt-1.5" autoComplete="off" aria-invalid={!!e.email} {...register("email")} />
            <Err m={e.email?.message} />
          </div>
          <div>
            <Label htmlFor="pa-role">Permessi</Label>
            <NativeSelect id="pa-role" className="mt-1.5" {...register("role")}>
              {ROLE_OPTIONS.map((r) => (
                <NativeSelectOption key={r.value} value={r.value}>
                  {r.label} — {r.hint}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? <LoaderCircle className="animate-spin" /> : null} Aggiungi socio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LinkAccountDialog({ partner }: { partner: Partner }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  type In = z.input<typeof linkSchema>;
  const { register, handleSubmit, formState, setError } = useForm<In>({
    resolver: zodResolver(linkSchema),
    defaultValues: { partnerId: partner.id, email: "", role: "admin" },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <KeyRound /> Collega accesso
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-ivory sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Accesso per {partner.name}</DialogTitle>
          <DialogDescription>Usa l&apos;email con cui entra nell&apos;app. L&apos;account deve già esistere su Supabase.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) =>
            start(async () => {
              const res = await linkPartnerAccount(v);
              if (!res.ok) {
                if (res.fieldErrors?.email) setError("email", { message: res.fieldErrors.email });
                return void toast.error(res.message);
              }
              toast.success(res.message);
              setOpen(false);
              router.refresh();
            }),
          )}
        >
          <div>
            <Label htmlFor="la-email">Email</Label>
            <Input id="la-email" type="email" className="mt-1.5" aria-invalid={!!formState.errors.email} {...register("email")} />
            <Err m={formState.errors.email?.message} />
          </div>
          <div>
            <Label htmlFor="la-role">Permessi</Label>
            <NativeSelect id="la-role" className="mt-1.5" {...register("role")}>
              {ROLE_OPTIONS.map((r) => (
                <NativeSelectOption key={r.value} value={r.value}>
                  {r.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : null} Collega accesso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SharesDialog({ partners, today, current }: { partners: Partner[]; today: string; current: Record<string, number> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const even = partners.length ? (100 / partners.length).toFixed(2).replace(/\.?0+$/, "") : "0";
  const { register, control, handleSubmit, formState } = useForm<SharesInput>({
    resolver: zodResolver(sharesSchema),
    defaultValues: {
      validFrom: today,
      shares: partners.map((p) => ({ partnerId: p.id, percent: current[p.id] !== undefined ? String(current[p.id] / 100) : even })),
    },
  });
  const { fields } = useFieldArray({ control, name: "shares" });
  const rootErr = (formState.errors.shares as { message?: string; root?: { message?: string } } | undefined)?.root?.message ?? formState.errors.shares?.message;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!partners.length}>
          <Percent /> Imposta quote
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-ivory sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Quote dei soci</DialogTitle>
          <DialogDescription>Valgono dalla data indicata; le quote precedenti restano nello storico.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) =>
            start(async () => {
              const res = await setShares(v);
              if (!res.ok) return void toast.error(res.message);
              toast.success(res.message);
              setOpen(false);
              router.refresh();
            }),
          )}
        >
          <ul className="space-y-3">
            {fields.map((f, i) => (
              <li key={f.id} className="flex items-center gap-3">
                <span className="flex-1 text-[15px]">{partners.find((p) => p.id === f.partnerId)?.name}</span>
                <div className="relative w-28">
                  <Input inputMode="decimal" aria-label="Percentuale" className="tabular pr-8 text-right" {...register(`shares.${i}.percent`)} />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
              </li>
            ))}
          </ul>
          <Err m={rootErr} />
          <div>
            <Label htmlFor="sh-from">Valide dal</Label>
            <Input id="sh-from" type="date" className="mt-1.5" {...register("validFrom")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : null} Salva quote
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
