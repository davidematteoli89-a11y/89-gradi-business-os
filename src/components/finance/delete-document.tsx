"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { deleteDocument } from "@/app/actions/finance";

export function DeleteDocumentButton({ id, description, hasPayments }: { id: string; description: string; hasPayments: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-brand" disabled={pending}>
          <Trash2 /> Elimina
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-ivory">
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare “{description}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasPayments
              ? "Questo documento ha pagamenti registrati: eliminali prima, così cassa e conti dei soci restano coerenti."
              : "Il documento sparisce dai report. L'operazione resta nel registro modifiche con autore e orario."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          {!hasPayments ? (
            <AlertDialogAction
              onClick={() =>
                start(async () => {
                  const res = await deleteDocument(id);
                  if (!res.ok) return void toast.error(res.message);
                  toast.success(res.message);
                  router.refresh();
                })
              }
            >
              Elimina documento
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
