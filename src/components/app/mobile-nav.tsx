"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, Plus, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { NAV_ITEMS, isActive } from "./nav-items";
import { useShell } from "./shell-context";
import { useState } from "react";

export function MobileTopBar({ demo }: { demo: boolean }) {
  const { openSearch } = useShell();
  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line/70 bg-paper/90 px-4 backdrop-blur-md lg:hidden">
      <div className="flex items-center gap-3">
        <Logo height={40} priority />
        {demo ? <DemoTag /> : null}
      </div>
      <button
        type="button"
        onClick={openSearch}
        aria-label="Cerca"
        className="grid size-11 place-items-center rounded-full text-ink hover:bg-sand"
      >
        <Search className="size-5" strokeWidth={1.75} />
      </button>
    </div>
  );
}

export function DemoTag() {
  return (
    <span
      title="Stai vedendo dati dimostrativi: nessun dato è reale"
      className="inline-flex h-6 items-center gap-1.5 rounded-full border border-dashed border-brand/50 px-2.5 text-[11px] font-medium text-brand"
    >
      Dati dimostrativi
    </span>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const { openQuickAdd } = useShell();
  const [more, setMore] = useState(false);
  const primary = NAV_ITEMS.filter((i) => i.primaryMobile);
  const secondary = NAV_ITEMS.filter((i) => !i.primaryMobile);
  const secondaryActive = secondary.some((i) => isActive(pathname, i.href));

  return (
    <>
      <button
        type="button"
        onClick={() => openQuickAdd()}
        aria-label="Nuovo: spesa, evento, incasso o attività"
        className="fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 grid size-14 place-items-center rounded-full bg-brand text-primary-foreground shadow-float transition-transform active:scale-95 lg:hidden"
      >
        <Plus className="size-6" />
      </button>

      <nav
        aria-label="Sezioni"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory/95 backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-full flex-col items-center justify-center gap-1 text-[11px]",
                    active ? "font-medium text-ink" : "text-ash",
                  )}
                >
                  <Icon className="size-[22px]" strokeWidth={active ? 2 : 1.6} />
                  {item.label}
                  {active ? <span aria-hidden className="absolute top-2 right-[calc(50%-18px)] size-1.5 rounded-full border border-brand" /> : null}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMore(true)}
              className={cn(
                "flex h-full w-full flex-col items-center justify-center gap-1 text-[11px]",
                secondaryActive ? "font-medium text-ink" : "text-ash",
              )}
            >
              <Ellipsis className="size-[22px]" strokeWidth={1.6} />
              Altro
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="rounded-t-[24px] border-line bg-ivory pb-[calc(16px+env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle>Altre sezioni</SheetTitle>
          </SheetHeader>
          <ul className="px-4 pb-2">
            {secondary.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMore(false)}
                    className="flex h-14 items-center gap-4 rounded-[12px] px-3 text-[16px] hover:bg-sand"
                  >
                    <Icon className="size-5 text-ash" strokeWidth={1.75} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
