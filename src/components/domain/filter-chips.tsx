import Link from "next/link";
import { cn } from "@/lib/utils";

export type Chip = { label: React.ReactNode; href: string; active: boolean; count?: number };

/** Filtri come link: condivisibili, funzionano col tasto indietro, senza JavaScript. */
export function FilterChips({ chips, label, className }: { chips: Chip[]; label: string; className?: string }) {
  return (
    <nav aria-label={label} className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <ul className="flex w-max gap-2">
        {chips.map((c, i) => (
          <li key={i}>
            <Link
              href={c.href}
              scroll={false}
              aria-current={c.active ? "true" : undefined}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm whitespace-nowrap transition-colors",
                c.active ? "border-ink bg-ink text-paper" : "border-line bg-ivory text-ink hover:border-input",
              )}
            >
              {c.label}
              {c.count !== undefined ? (
                <span className={cn("tabular text-xs", c.active ? "text-paper/70" : "text-ash")}>{c.count}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SearchForm({
  action,
  defaultValue,
  placeholder,
  hidden,
}: {
  action: string;
  defaultValue?: string;
  placeholder: string;
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} role="search" className="relative w-full sm:w-72">
      {Object.entries(hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ash" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-[10px] border border-input bg-ivory pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ink"
      />
    </form>
  );
}

export function qs(base: string, params: Record<string, string | undefined | null>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
  const s = u.toString();
  return s ? `${base}?${s}` : base;
}
