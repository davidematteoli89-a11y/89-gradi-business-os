"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Client browser: usa solo la chiave pubblica. Mai la service role. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
