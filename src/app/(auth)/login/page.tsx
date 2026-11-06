import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata = { title: "Accedi" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; errore?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
      <div className="w-full max-w-[360px]">
        <Image src="/brand/logo-89gradi.png" alt="89 Gradi" width={88} height={111} priority className="mx-auto" />
        <h1 className="mt-10 text-center text-[24px] font-semibold tracking-[-0.02em]">Accedi</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Area riservata ai soci di 89 Gradi.</p>
        {sp.errore === "non-autorizzato" ? (
          <p role="alert" className="mt-6 rounded-[12px] border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-brand">
            Questo account non è abilitato. Chiedi a un amministratore di aggiungerti.
          </p>
        ) : null}
        <LoginForm next={sp.next} />
      </div>
    </main>
  );
}
