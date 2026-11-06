"use client";

import { createContext, useContext } from "react";

export type QuickAddKind = "menu" | "spesa" | "incasso";

export const ShellContext = createContext<{
  openQuickAdd: (kind?: QuickAddKind) => void;
  openSearch: () => void;
} | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell deve essere usato dentro AppShell");
  return ctx;
}
