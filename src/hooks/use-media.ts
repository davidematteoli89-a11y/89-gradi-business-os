"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string) {
  return (cb: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  };
}

export function useMediaQuery(query: string, serverDefault = false) {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}

export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
