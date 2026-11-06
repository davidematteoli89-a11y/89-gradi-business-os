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
  if (error) return { message: "Email o password non corrette.", email };
  const next = parsed.data.next?.startsWith("/") && !parsed.data.next.startsWith("//") ? parsed.data.next : "/";
  redirect(next);
}

export async function logout() {
  const sb = await createSupabaseServerClient();
  await sb.auth.signOut();
  redirect("/login");
}
