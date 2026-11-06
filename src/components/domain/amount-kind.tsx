import { cn } from "@/lib/utils";

const LABEL = { effettivo: "Effettivo", previsto: "Previsto", stimato: "Stimato" } as const;

/** Etichetta obbligatoria accanto a ogni numero che non è un dato effettivo. */
export function AmountKind({ kind, className }: { kind: keyof typeof LABEL; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] leading-4 font-medium",
        kind === "effettivo" && "bg-ink text-paper",
        kind === "previsto" && "border border-ink/25 text-ink",
        kind === "stimato" && "border border-dashed border-ash/60 text-ash",
        className,
      )}
    >
      {LABEL[kind]}
    </span>
  );
}
