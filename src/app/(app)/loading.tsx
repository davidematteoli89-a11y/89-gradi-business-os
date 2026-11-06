export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Caricamento…</span>
      <div className="h-9 w-56 rounded-[10px] bg-sand" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-sand/70" />
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="h-64 rounded-[20px] bg-sand/60" />
        <div className="h-64 rounded-[20px] bg-sand/60" />
      </div>
      <div className="mt-5 h-36 rounded-[20px] bg-sand/50" />
    </div>
  );
}
