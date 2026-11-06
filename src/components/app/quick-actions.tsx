"use client";

import Link from "next/link";
import { ArrowDownLeft, CalendarPlus, ListTodo, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShell } from "./shell-context";

export function QuickActions() {
  const { openQuickAdd } = useShell();
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      <Button onClick={() => openQuickAdd("spesa")} className="shrink-0">
        <Receipt /> Nuova spesa
      </Button>
      <Button variant="outline" onClick={() => openQuickAdd("incasso")} className="shrink-0">
        <ArrowDownLeft /> Nuovo incasso
      </Button>
      <Button variant="outline" asChild className="shrink-0">
        <Link href="/eventi/nuovo">
          <CalendarPlus /> Nuovo evento
        </Link>
      </Button>
      <Button variant="outline" asChild className="shrink-0">
        <Link href="/eventi?vista=attivita">
          <ListTodo /> Nuova attività
        </Link>
      </Button>
    </div>
  );
}

export function OpenQuickAddButton({ kind, children, ...props }: { kind: "spesa" | "incasso" } & React.ComponentProps<typeof Button>) {
  const { openQuickAdd } = useShell();
  return (
    <Button {...props} onClick={() => openQuickAdd(kind)}>
      {children}
    </Button>
  );
}
