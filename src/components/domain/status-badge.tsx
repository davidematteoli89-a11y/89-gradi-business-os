import type { EventStatus, MarketingTaskStatus } from "@/lib/domain/types";
import type { PaymentState } from "@/lib/domain/documents";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "progress" | "positive" | "warning" | "muted" | "brand";

const EVENT: Record<EventStatus, [string, Tone]> = {
  richiesta: ["Richiesta", "neutral"],
  preventivo: ["Preventivo", "neutral"],
  trattativa: ["Trattativa", "warning"],
  confermato: ["Confermato", "brand"],
  in_preparazione: ["In preparazione", "progress"],
  completato: ["Completato", "positive"],
  annullato: ["Annullato", "muted"],
};

const PAYMENT: Record<PaymentState, [string, Tone]> = {
  da_pagare: ["Da saldare", "neutral"],
  parziale: ["Parziale", "progress"],
  pagato: ["Saldato", "positive"],
  scaduto: ["Scaduto", "warning"],
  eccedenza: ["Eccedenza", "warning"],
};

const MARKETING: Record<MarketingTaskStatus, [string, Tone]> = {
  da_fare: ["Da fare", "neutral"],
  in_corso: ["In corso", "progress"],
  in_approvazione: ["Da approvare", "warning"],
  approvato: ["Approvato", "positive"],
  pubblicato: ["Pubblicato", "positive"],
  annullato: ["Annullato", "muted"],
};

const TONE: Record<Tone, string> = {
  neutral: "bg-sand text-ink",
  progress: "bg-sand text-ink",
  positive: "bg-olive/10 text-olive",
  warning: "bg-amber/10 text-amber",
  muted: "bg-transparent text-ash border border-line",
  brand: "bg-brand/8 text-brand",
};

const DOT: Record<Tone, string> = {
  neutral: "bg-ash/60",
  progress: "",
  positive: "bg-olive",
  warning: "bg-amber",
  muted: "bg-ash/40",
  brand: "bg-brand",
};

function Badge({ label, tone, className }: { label: string; tone: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {tone === "progress" ? (
        // anello del grado: "in corso"
        <span aria-hidden className="size-2 rounded-full border-[1.5px] border-brand" />
      ) : (
        <span aria-hidden className={cn("size-1.5 rounded-full", DOT[tone])} />
      )}
      {label}
    </span>
  );
}

export function EventStatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  const [label, tone] = EVENT[status];
  return <Badge label={label} tone={tone} className={className} />;
}

export function PaymentStateBadge({ state, direction, className }: { state: PaymentState; direction?: "in" | "out"; className?: string }) {
  const tone = PAYMENT[state][1];
  let label = PAYMENT[state][0];
  if (direction === "in") {
    if (state === "da_pagare") label = "Da incassare";
    if (state === "pagato") label = "Incassato";
  }
  return <Badge label={label} tone={tone} className={className} />;
}

export function MarketingStatusBadge({ status, className }: { status: MarketingTaskStatus; className?: string }) {
  const [label, tone] = MARKETING[status];
  return <Badge label={label} tone={tone} className={className} />;
}

export const EVENT_STATUS_LABEL = Object.fromEntries(Object.entries(EVENT).map(([k, v]) => [k, v[0]])) as Record<EventStatus, string>;
export const MARKETING_STATUS_LABEL = Object.fromEntries(Object.entries(MARKETING).map(([k, v]) => [k, v[0]])) as Record<MarketingTaskStatus, string>;
