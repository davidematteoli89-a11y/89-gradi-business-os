"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.email("Inserisci un indirizzo email valido"),
  password: z.string().min(8, "La password ha almeno 8 caratteri"),
  next: z.string().optional(),
});

export type LoginState = { message?: string; email?: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { message: parsed.error.issues[0].message, email };
  const sb = await createSupabaseServerClient();
  const { error } = await sb.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    console.error("[login]", error.status, error.code, error.message);
    if (error.code === "invalid_credentials") return { message: "Email o password non corrette.", email };
    if (error.code === "email_not_confirmed") return { message: "Email non ancora confermata: apri il link ricevuto per posta.", email };
    if (error.status === 429) return { message: "Troppi tentativi. Riprova tra qualche minuto.", email };
    return { message: `Accesso non riuscito (${error.code ?? error.status ?? "errore di rete"}). Controlla la connessione e riprova.`, email };
  }
  const next = parsed.data.next?.startsWith("/") && !parsed.data.next.startsWith("//") ? parsed.data.next : "/";
  redirect(next);
}

export async function logout() {
  const sb = await createSupabaseServerClient();
  await sb.auth.signOut();
  redirect("/login");
}
