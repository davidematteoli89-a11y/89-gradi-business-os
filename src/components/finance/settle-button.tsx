"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, LoaderCircle } from "lucide-react";
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
import { registerPartnerMovement } from "@/app/actions/finance";
import { centsToInput, formatEuro } from "@/lib/money";

/** Registra il conguaglio: chi è sotto quota paga direttamente l'altro socio. */
export function SettleButton({
  fromId,
  fromName,
  toId,
  toName,
  amountCents,
  today,
}: {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountCents: number;
  today: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HandCoins /> Registra conguaglio
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-ivory">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {fromName} ha dato {formatEuro(amountCents)} a {toName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Registralo solo quando il pagamento tra voi è avvenuto davvero. Non passa dalla cassa dell&apos;azienda: sposta il credito
            verso l&apos;azienda da {toName} a {fromName}, e i conti tornano in pari.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await registerPartnerMovement({
                  type: "compensazione",
                  partnerId: toId,
                  counterpartPartnerId: fromId,
                  account: "finanziamento",
                  amount: centsToInput(amountCents),
                  date: today,
                  description: `Conguaglio: ${fromName} paga ${toName}`,
                });
                if (!res.ok) return void toast.error(res.message);
                toast.success(res.message);
                router.refresh();
              })
            }
          >
            {pending ? <LoaderCircle className="animate-spin" /> : null} Registra conguaglio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
