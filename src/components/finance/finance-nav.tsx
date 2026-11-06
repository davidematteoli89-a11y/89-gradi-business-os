import Link from "next/link";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/finanze", label: "Movimenti" },
  { href: "/finanze/soci", label: "Soci" },
  { href: "/finanze/report", label: "Report" },
];

export function FinanceNav({ active }: { active: string }) {
  return (
    <nav aria-label="Finanze" className="mb-6 border-b border-line">
      <ul className="flex gap-1">
        {ITEMS.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              aria-current={active === i.href ? "page" : undefined}
              className={cn(
                "relative inline-flex h-11 items-center px-3 text-[15px]",
                active === i.href ? "font-medium text-ink" : "text-muted-foreground hover:text-ink",
              )}
            >
              {i.label}
              {active === i.href ? <span aria-hidden className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-brand" /> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
