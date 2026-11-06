import Image from "next/image";

export function Unconfigured() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <Image src="/brand/logo-89gradi.png" alt="89 Gradi" width={64} height={81} priority />
      <h1 className="mt-8 text-[28px] leading-9 font-semibold tracking-[-0.02em]">Collega il database per iniziare</h1>
      <p className="mt-3 text-[15px] text-muted-foreground">
        L&apos;app non mostra numeri inventati: senza un database collegato non c&apos;è nulla da visualizzare.
      </p>
      <ol className="mt-6 list-decimal space-y-2 pl-5 text-[15px]">
        <li>
          Imposta <code className="rounded bg-sand px-1.5 py-0.5 text-[13px]">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code className="rounded bg-sand px-1.5 py-0.5 text-[13px]">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>.
        </li>
        <li>Applica le migrazioni in <code className="rounded bg-sand px-1.5 py-0.5 text-[13px]">supabase/migrations</code>.</li>
        <li>
          Solo in sviluppo, per vedere il prototipo: <code className="rounded bg-sand px-1.5 py-0.5 text-[13px]">DEMO_DATA=1</code>.
        </li>
      </ol>
      <p className="mt-6 text-sm text-muted-foreground">Istruzioni complete in docs/07-setup.md.</p>
    </main>
  );
}
