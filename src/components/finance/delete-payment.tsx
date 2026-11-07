"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, X } from "lucide-react";
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
import { deletePayment } from "@/app/actions/finance";

export function DeletePaymentButton({ id, summary, byPartner }: { id: string; summary: string; byPartner?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label={`Elimina pagamento ${summary}`}
          className="grid size-8 place-items-center rounded-full text-ash hover:bg-sand hover:text-brand"
        >
          {pending ? <LoaderCircle className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-ivory">
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare questo pagamento?</AlertDialogTitle>
          <AlertDialogDescription>
            {summary}. Il documento resta e torna da saldare.
            {byPartner ? ` Sparisce anche la riga collegata nel conto di ${byPartner}.` : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              start(async () => {
                const res = await deletePayment(id);
                if (!res.ok) return void toast.error(res.message);
                toast.success(res.message);
                router.refresh();
              })
            }
          >
            Elimina pagamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
