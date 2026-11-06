"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { NAV_ITEMS, isActive } from "./nav-items";
import { useShell } from "./shell-context";

export function Sidebar({ userName, roleLabel }: { userName: string; roleLabel: string }) {
  const pathname = usePathname();
  const { openQuickAdd, openSearch } = useShell();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-ivory lg:flex">
      <div className="flex items-end gap-3 px-6 pt-7 pb-6">
        <Logo height={58} priority />
        <div className="pb-1 text-[13px] leading-4 text-muted-foreground">
          Business
          <br />
          OS
        </div>
      </div>

      <div className="px-4">
        <button
          type="button"
          onClick={openSearch}
          className="flex h-10 w-full items-center gap-2 rounded-[10px] border border-line bg-paper px-3 text-sm text-muted-foreground transition-colors hover:border-input"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Cerca</span>
          <Kbd>⌘K</Kbd>
        </button>
      </div>

      <nav aria-label="Sezioni" className="mt-5 flex-1 px-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[15px] transition-colors",
                    active ? "bg-paper font-medium text-ink" : "text-ink/75 hover:bg-paper/70 hover:text-ink",
                  )}
                >
                  <Icon className={cn("size-[18px]", active ? "text-ink" : "text-ash")} strokeWidth={1.75} />
                  {item.label}
                  {active ? (
                    // il grado del logo come indicatore di sezione attiva
                    <span aria-hidden className="absolute top-2.5 right-3 size-[7px] rounded-full border-[1.5px] border-brand" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-4 p-4">
        <Button className="w-full" size="lg" onClick={() => openQuickAdd()}>
          <Plus /> Nuovo
        </Button>
        <div className="flex items-center gap-3 rounded-[12px] px-2 py-1">
          <span className="grid size-8 place-items-center rounded-full bg-ink text-xs font-semibold text-paper">
            {userName.replace("Socio ", "").slice(0, 1)}
          </span>
          <div className="min-w-0 text-sm leading-tight">
            <p className="truncate font-medium">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
