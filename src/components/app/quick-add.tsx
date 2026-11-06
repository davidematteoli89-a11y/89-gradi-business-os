"use client";

import Link from "next/link";
import { ArrowDownLeft, CalendarPlus, ChevronLeft, ListTodo, Receipt } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsDesktop } from "@/hooks/use-media";
import type { QuickAddKind } from "./shell-context";
import { ExpenseForm, type ExpenseFormData } from "@/components/finance/expense-form";
import { IncomeForm, type IncomeFormData } from "@/components/finance/income-form";

export type QuickAddData = ExpenseFormData & IncomeFormData;

const ACTIONS = [
  { kind: "spesa", label: "Nuova spesa", hint: "Scontrino, fattura o ricevuta", icon: Receipt },
  { kind: "incasso", label: "Nuovo incasso", hint: "Acconto o saldo di un evento", icon: ArrowDownLeft },
  { href: "/eventi/nuovo", label: "Nuovo evento", hint: "Richiesta o preventivo", icon: CalendarPlus },
  { href: "/eventi?tab=attivita", label: "Nuova attività", hint: "Da fare per un evento", icon: ListTodo },
] as const;

export function QuickAdd({
  kind,
  onKindChange,
  data,
  demo,
}: {
  kind: QuickAddKind | null;
  onKindChange: (k: QuickAddKind | null) => void;
  data: QuickAddData;
  demo: boolean;
}) {
  const desktop = useIsDesktop();
  const close = () => onKindChange(null);
  const title = kind === "spesa" ? "Nuova spesa" : kind === "incasso" ? "Nuovo incasso" : "Cosa vuoi aggiungere?";

  return (
    <Sheet open={kind !== null} onOpenChange={(o) => !o && close()}>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        className={
          desktop
            ? "w-full gap-0 border-line bg-ivory p-0 sm:max-w-[460px]"
            : "max-h-[94dvh] gap-0 rounded-t-[24px] border-line bg-ivory p-0"
        }
      >
        <SheetHeader className="border-b border-line px-5 pt-5 pb-4">
          <div className="flex items-center gap-2">
            {kind !== "menu" ? (
              <button
                type="button"
                onClick={() => onKindChange("menu")}
                aria-label="Torna alle azioni"
                className="-ml-2 grid size-9 place-items-center rounded-full text-ash hover:bg-sand hover:text-ink"
              >
                <ChevronLeft className="size-5" />
              </button>
            ) : null}
            <SheetTitle className="text-[19px] font-semibold tracking-[-0.01em]">{title}</SheetTitle>
          </div>
          <SheetDescription className={kind === "menu" ? "" : "sr-only"}>
            {demo ? "Modalità demo: i moduli verificano i dati ma non salvano." : "Scegli un'azione rapida."}
          </SheetDescription>
        </SheetHeader>

        {kind === "menu" ? (
          <ul className="grid grid-cols-2 gap-3 p-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              const inner = (
                <>
                  <Icon className="size-5 text-brand" strokeWidth={1.75} />
                  <span className="mt-4 block text-[15px] font-medium">{a.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{a.hint}</span>
                </>
              );
              const cls = "block h-full w-full rounded-[16px] border border-line bg-paper p-4 text-left transition-colors hover:border-input";
              return (
                <li key={a.label}>
                  {"kind" in a ? (
                    <button type="button" className={cls} onClick={() => onKindChange(a.kind)}>
                      {inner}
                    </button>
                  ) : (
                    <Link href={a.href} className={cls} onClick={close}>
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
        {kind === "spesa" ? <ExpenseForm data={data} onDone={close} /> : null}
        {kind === "incasso" ? <IncomeForm data={data} onDone={close} /> : null}
      </SheetContent>
    </Sheet>
  );
}
