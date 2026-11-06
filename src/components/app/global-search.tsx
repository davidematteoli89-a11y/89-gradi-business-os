"use client";

import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { NAV_ITEMS } from "./nav-items";

export type SearchItem = { type: string; label: string; hint: string; href: string };

export function GlobalSearch({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: SearchItem[];
}) {
  const router = useRouter();
  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };
  const groups = items.reduce<Record<string, SearchItem[]>>((acc, i) => {
    (acc[i.type] ??= []).push(i);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Cerca" description="Cerca eventi, spese, clienti e attività">
      <CommandInput placeholder="Cerca eventi, spese, clienti, fornitori…" />
      <CommandList className="max-h-[min(60vh,440px)]">
        <CommandEmpty>Nessun risultato. Prova con il nome del cliente o del fornitore.</CommandEmpty>
        <CommandGroup heading="Sezioni">
          {NAV_ITEMS.map((n) => (
            <CommandItem key={n.href} value={`sezione ${n.label}`} onSelect={() => go(n.href)}>
              <n.icon className="text-ash" />
              {n.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {Object.entries(groups).map(([type, list]) => (
          <CommandGroup key={type} heading={type}>
            {list.map((i, idx) => (
              <CommandItem key={`${i.href}-${idx}`} value={`${type} ${i.label} ${i.hint}`} onSelect={() => go(i.href)}>
                <span className="truncate">{i.label}</span>
                {i.hint ? <span className="ml-auto truncate pl-3 text-xs text-muted-foreground">{i.hint}</span> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
