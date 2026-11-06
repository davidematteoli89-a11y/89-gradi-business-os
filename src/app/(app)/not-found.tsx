import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="py-20">
      <span aria-hidden className="block size-3 rounded-full border-2 border-brand" />
      <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.02em]">Pagina non trovata</h1>
      <p className="mt-2 text-muted-foreground">L&apos;elemento potrebbe essere stato eliminato o il link non è corretto.</p>
      <Button asChild className="mt-6">
        <Link href="/">Torna alla Home</Link>
      </Button>
    </div>
  );
}
