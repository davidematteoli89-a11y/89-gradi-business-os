import { formatEuro, type Cents } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Money({
  cents,
  sign,
  round,
  className,
  muted,
}: {
  cents: Cents;
  sign?: boolean;
  round?: boolean;
  className?: string;
  muted?: boolean;
}) {
  return (
    <span className={cn("tabular whitespace-nowrap", muted && "text-muted-foreground", className)}>
      {formatEuro(cents, { sign, round })}
    </span>
  );
}
