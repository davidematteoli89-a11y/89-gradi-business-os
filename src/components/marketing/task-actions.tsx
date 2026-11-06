"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setMarketingStatus } from "@/app/actions/marketing";
import type { MarketingTaskStatus } from "@/lib/domain/types";

const NEXT: Partial<Record<MarketingTaskStatus, { to: MarketingTaskStatus; label: string; icon: "send" | "check" }>> = {
  da_fare: { to: "in_corso", label: "Inizia", icon: "send" },
  in_corso: { to: "in_approvazione", label: "Invia in approvazione", icon: "send" },
  in_approvazione: { to: "approvato", label: "Approva", icon: "check" },
  approvato: { to: "pubblicato", label: "Segna come pubblicata", icon: "check" },
};

export function MarketingTaskActions({ taskId, status }: { taskId: string; status: MarketingTaskStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = NEXT[status];
  if (!next) return null;
  return (
    <div className="flex items-start gap-2">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setMarketingStatus({ taskId, status: next.to });
            if (!res.ok) return void toast.error(res.message);
            toast.success(res.message, {
              action: { label: "Annulla", onClick: () => void setMarketingStatus({ taskId, status }).then(() => router.refresh()) },
            });
            router.refresh();
          })
        }
      >
        {pending ? <LoaderCircle className="animate-spin" /> : next.icon === "check" ? <Check /> : <Send />}
        {next.label}
      </Button>
    </div>
  );
}
