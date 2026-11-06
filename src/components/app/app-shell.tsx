"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MobileTabBar, MobileTopBar } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { ShellContext, type QuickAddKind } from "./shell-context";
import { QuickAdd, type QuickAddData } from "./quick-add";
import { GlobalSearch, type SearchItem } from "./global-search";

export function AppShell({
  children,
  demo,
  userName,
  roleLabel,
  searchIndex,
  quickAddData,
}: {
  children: React.ReactNode;
  demo: boolean;
  userName: string;
  roleLabel: string;
  searchIndex: SearchItem[];
  quickAddData: QuickAddData;
}) {
  const [quickAdd, setQuickAdd] = useState<QuickAddKind | null>(null);
  const [search, setSearch] = useState(false);

  const openQuickAdd = useCallback((kind: QuickAddKind = "menu") => setQuickAdd(kind), []);
  const openSearch = useCallback(() => setSearch(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ctx = useMemo(() => ({ openQuickAdd, openSearch }), [openQuickAdd, openSearch]);

  return (
    <ShellContext value={ctx}>
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
      >
        Vai al contenuto
      </a>
      <div className="flex min-h-dvh">
        <Sidebar userName={userName} roleLabel={roleLabel} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar demo={demo} />
          {demo ? (
            <div className="hidden justify-end px-10 pt-5 lg:flex">
              <span
                title="Stai vedendo dati dimostrativi: nessun dato è reale"
                className="inline-flex h-7 items-center rounded-full border border-dashed border-brand/50 px-3 text-xs font-medium text-brand"
              >
                Dati dimostrativi · nessun dato reale
              </span>
            </div>
          ) : null}
          <main id="contenuto" className="mx-auto w-full max-w-[1180px] flex-1 px-4 pt-6 pb-36 sm:px-6 lg:px-10 lg:pt-6 lg:pb-16">
            {children}
          </main>
        </div>
      </div>
      <MobileTabBar />
      <QuickAdd kind={quickAdd} onKindChange={setQuickAdd} data={quickAddData} demo={demo} />
      <GlobalSearch open={search} onOpenChange={setSearch} items={searchIndex} />
    </ShellContext>
  );
}
