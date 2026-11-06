"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-20">
      <span aria-hidden className="block size-3 rounded-full border-2 border-brand" />
      <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.02em]">Qualcosa non ha funzionato</h1>
      <p className="mt-2 max-w-[60ch] text-muted-foreground">
        I dati non sono stati caricati. Controlla la connessione e riprova. {error.digest ? `Codice: ${error.digest}` : ""}
      </p>
      <Button className="mt-6" onClick={reset}>
        Riprova
      </Button>
    </div>
  );
}
