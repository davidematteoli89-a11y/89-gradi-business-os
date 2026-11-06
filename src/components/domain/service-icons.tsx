import { Martini, Pizza } from "lucide-react";
import { cn } from "@/lib/utils";

export function ServiceIcons({ pizza, cocktail, className }: { pizza: boolean; cocktail: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-ash", className)}>
      {pizza ? (
        <span title="Pizza" className="inline-flex">
          <Pizza className="size-4" strokeWidth={1.75} aria-label="Pizza" />
        </span>
      ) : null}
      {cocktail ? (
        <span title="Cocktail bar" className="inline-flex">
          <Martini className="size-4" strokeWidth={1.75} aria-label="Cocktail bar" />
        </span>
      ) : null}
    </span>
  );
}
