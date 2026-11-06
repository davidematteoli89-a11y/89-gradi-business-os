import type { Partner } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function PartnerAvatar({ partner, className }: { partner?: Partner; className?: string }) {
  if (!partner) {
    return (
      <span
        aria-label="Azienda"
        className={cn("inline-grid size-6 shrink-0 place-items-center rounded-full border border-line bg-ivory text-[10px] font-semibold text-ash", className)}
      >
        89
      </span>
    );
  }
  return (
    <span
      aria-label={partner.name}
      title={partner.name}
      className={cn("inline-grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-paper", className)}
      style={{ backgroundColor: partner.color }}
    >
      {partner.shortName}
    </span>
  );
}
