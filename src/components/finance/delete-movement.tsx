"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deletePartnerMovement } from "@/app/actions/finance";

export function DeleteMovementButton({ id, label, amount, pair }: { id: string; label: string; amount: string; pair?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label={`Elimina ${label}`}
          disabled={pending}
          className="grid size-9 place-items-center rounded-full text-ash transition-colors hover:bg-sand hover:text-brand"
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-ivory">
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare questo movimento?</AlertDialogTitle>
          <AlertDialogDescription>
            {label}, {amount}. Saldi ed equilibrio degli investimenti vengono ricalcolati.
            {pair ? " Il movimento ha due righe (una per conto o per socio): spariscono entrambe." : ""} L&apos;eliminazione
            resta nel registro modifiche.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                const res = await deletePartnerMovement(id);
                if (!res.ok) return void toast.error(res.message);
                toast.success(res.message);
                router.refresh();
              })
            }
          >
            Elimina movimento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
