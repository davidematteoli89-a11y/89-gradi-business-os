import "server-only";
import { cache } from "react";
import { buildDemoDataset, type Dataset } from "./demo/dataset";
import { loadSupabaseDataset } from "./supabase/load";

export type DataMode = "demo" | "supabase" | "unconfigured";

export function isProductionDeploy() {
  return process.env.VERCEL_ENV === "production";
}

export function dataMode(): DataMode {
  if (process.env.DEMO_DATA === "1") {
    if (isProductionDeploy()) {
      throw new Error("DEMO_DATA non è consentito in produzione. Rimuovi la variabile dall'ambiente di produzione.");
    }
    return "demo";
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return "supabase";
  return "unconfigured";
}

/** Dataset della richiesta corrente (una sola lettura per richiesta). */
export const getDataset = cache(async (): Promise<Dataset & { mode: DataMode }> => {
  const mode = dataMode();
  if (mode === "demo") return { ...buildDemoDataset(new Date()), mode };
  if (mode === "supabase") return { ...(await loadSupabaseDataset()), mode };
  throw new Error("UNCONFIGURED");
});
