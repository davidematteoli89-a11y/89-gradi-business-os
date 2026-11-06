"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, LoaderCircle, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useShell } from "@/components/app/shell-context";
import { duplicateEvent, updateEventStatus } from "@/app/actions/events";
import { EVENT_STATUSES } from "@/lib/domain/events";
import type { EventStatus } from "@/lib/domain/types";

export function EventActions({ eventId, status, title }: { eventId: string; status: EventStatus; title: string }) {
  const router = useRouter();
  const { openQuickAdd } = useShell();
  const [current, setCurrent] = useState(status);
  const [confirm, setConfirm] = useState<EventStatus | null>(null);
  const [pending, start] = useTransition();

  const applyStatus = (next: EventStatus) => {
    const prev = current;
    setCurrent(next);
    start(async () => {
      const res = await updateEventStatus({ eventId, status: next });
      if (!res.ok) {
        setCurrent(prev);
        toast.error(res.message);
        return;
      }
      toast.success(res.message, {
        action: {
          label: "Annulla",
          onClick: () => {
            setCurrent(prev);
            void updateEventStatus({ eventId, status: prev });
          },
        },
      });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="ev-status">
        Stato evento
      </label>
      <NativeSelect
        id="ev-status"
        value={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as EventStatus;
          if (next === "annullato") setConfirm(next);
          else applyStatus(next);
        }}
        wrapperClassName="w-48"
      >
        {EVENT_STATUSES.map((s) => (
          <NativeSelectOption key={s.value} value={s.value}>
            {s.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Button variant="outline" onClick={() => openQuickAdd("spesa")}>
        <Receipt /> Spesa
      </Button>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await duplicateEvent(eventId);
            if (!res.ok) return void toast.error(res.message);
            toast.success(res.message);
            if (res.id) router.push(`/eventi/${res.id}`);
          })
        }
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <Copy />} Duplica
      </Button>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="bg-ivory">
          <AlertDialogHeader>
            <AlertDialogTitle>Annullare “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;evento resta in archivio con documenti e pagamenti. Gli acconti già incassati non vengono stornati
              automaticamente: registra il rimborso al cliente se previsto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non annullare</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                applyStatus("annullato");
                setConfirm(null);
              }}
            >
              Annulla evento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
