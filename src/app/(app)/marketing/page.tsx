import Link from "next/link";
import { CalendarDays, Clock, FolderOpen, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { FilterChips, SearchForm, qs } from "@/components/domain/filter-chips";
import { Money } from "@/components/domain/money";
import { EmptyState, Panel, PanelHeader } from "@/components/domain/panel";
import { PartnerAvatar } from "@/components/domain/partner-chip";
import { MarketingStatusBadge } from "@/components/domain/status-badge";
import { MarketingTaskActions } from "@/components/marketing/task-actions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getDataset } from "@/lib/data/source";
import { marketingData } from "@/lib/data/queries";
import type { MarketingTaskStatus } from "@/lib/domain/types";
import { capitalize, formatDate, relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Marketing" };

const COLUMNS: { key: string; label: string; statuses: MarketingTaskStatus[] }[] = [
  { key: "todo", label: "Da fare", statuses: ["da_fare"] },
  { key: "doing", label: "In corso", statuses: ["in_corso"] },
  { key: "review", label: "Da approvare", statuses: ["in_approvazione"] },
  { key: "done", label: "Fatto", statuses: ["approvato", "pubblicato"] },
];

const TYPE_LABEL = { social: "Social", stampa: "Stampa", grafica: "Grafica", menu: "Menu", altro: "Altro" } as const;

type SP = { link?: string; q?: string; task?: string };

export default async function MarketingPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const link = sp.link === "evento" || sp.link === "campagna" || sp.link === "generale" ? sp.link : undefined;
  const ds = await getDataset();
  const m = marketingData(ds, { link, q: sp.q });
  const selected = sp.task ? m.tasks.find((t) => t.id === sp.task) ?? marketingData(ds, {}).tasks.find((t) => t.id === sp.task) : undefined;
  const keep = { link, q: sp.q };

  return (
    <>
      <PageHeader
        title="Marketing"
        description="Contenuti social, stampa, grafiche e menu: per evento, per campagna o per il marchio."
        actions={
          <Button asChild>
            <Link href={qs("/marketing", { ...keep, task: "nuova" })}>
              <Plus /> Nuova attività
            </Link>
          </Button>
        }
      />

      <Panel className="mb-6">
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          <Cell label="Da approvare" value={<span className="tabular">{m.toApprove}</span>} note="Menu, stampe e grafiche in attesa" />
          <Cell label="Spesa marketing del mese" value={<Money cents={m.spentMonth} round />} note="Documenti registrati" />
          <Cell label="Lavoro interno pianificato" value={<span className="tabular">{m.internalHours.toLocaleString("it-IT")} h</span>} note="Somma delle stime" />
          <Cell label="Campagne attive" value={<span className="tabular">{m.campaigns.filter((c) => c.status === "attiva").length}</span>} note={`${m.campaigns.length} in totale`} />
        </dl>
      </Panel>

      {selected || sp.task === "nuova" ? (
        <Panel className="mb-6">
          <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
            <div className="min-w-0">
              <p className="text-[13px] text-muted-foreground">{selected ? TYPE_LABEL[selected.type] : "Nuova attività"}</p>
              <h2 className="mt-0.5 text-[20px] leading-7 font-semibold tracking-[-0.01em]">{selected?.title ?? "Cosa c'è da preparare?"}</h2>
            </div>
            <Link href={qs("/marketing", keep)} aria-label="Chiudi dettaglio" className="grid size-9 shrink-0 place-items-center rounded-full text-ash hover:bg-sand hover:text-ink">
              <X className="size-4" />
            </Link>
          </div>
          {selected ? (
            <div className="grid gap-6 p-5 sm:px-6 md:grid-cols-[1fr_auto]">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <Info label="Stato"><MarketingStatusBadge status={selected.status} /></Info>
                <Info label="Collegata a">
                  {selected.event ? (
                    <Link href={`/eventi/${selected.event.id}?tab=marketing`} className="underline-offset-4 hover:underline">{selected.event.title}</Link>
                  ) : selected.campaign ? (
                    selected.campaign.name
                  ) : (
                    "Progetto generale"
                  )}
                </Info>
                <Info label="Responsabile">
                  <span className="inline-flex items-center gap-2">
                    <PartnerAvatar partner={selected.owner} className="size-5 text-[9px]" /> {selected.owner?.name ?? "Da assegnare"}
                  </span>
                </Info>
                <Info label="Scadenza">{selected.dueDate ? formatDate(selected.dueDate, "full") : "—"}</Info>
                <Info label="Costo esterno">{selected.externalCostCents ? <Money cents={selected.externalCostCents} /> : "—"}</Info>
                <Info label="Tempo interno">{selected.internalMinutes ? `${Math.round(selected.internalMinutes / 6) / 10} h` : "—"}</Info>
                <Info label="File">{selected.fileCount ? `${selected.fileCount} file · ultima versione v${selected.latestVersion}` : "Nessun file"}</Info>
              </dl>
              <MarketingTaskActions taskId={selected.id} status={selected.status} />
            </div>
          ) : (
            <p className="p-5 text-sm text-muted-foreground sm:px-6">
              Il modulo di creazione arriva con il collegamento al database (fase 8 del piano). Per ora puoi navigare e approvare le attività dimostrative.
            </p>
          )}
        </Panel>
      ) : null}

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          label="Collegamento"
          chips={[
            { label: "Tutte", href: qs("/marketing", { ...keep, link: undefined }), active: !link },
            { label: "Eventi", href: qs("/marketing", { ...keep, link: "evento" }), active: link === "evento" },
            { label: "Campagne", href: qs("/marketing", { ...keep, link: "campagna" }), active: link === "campagna" },
            { label: "Generali", href: qs("/marketing", { ...keep, link: "generale" }), active: link === "generale" },
          ]}
        />
        <SearchForm action="/marketing" defaultValue={sp.q} placeholder="Cerca attività" hidden={{ link }} />
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {COLUMNS.map((col) => {
          const items = m.tasks.filter((t) => col.statuses.includes(t.status));
          return (
            <section key={col.key} aria-labelledby={`col-${col.key}`} className="w-[84vw] max-w-[340px] shrink-0 snap-start lg:w-auto lg:max-w-none">
              <h2 id={`col-${col.key}`} className="mb-3 flex items-center gap-2 text-sm font-medium">
                {col.key === "doing" ? <span aria-hidden className="size-2 rounded-full border-[1.5px] border-brand" /> : null}
                {col.label}
                <span className="tabular text-muted-foreground">{items.length}</span>
              </h2>
              <ul className="space-y-3">
                {items.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={qs("/marketing", { ...keep, task: t.id })}
                      scroll={false}
                      aria-current={selected?.id === t.id ? "true" : undefined}
                      className={cn(
                        "block rounded-[16px] border bg-ivory p-4 transition-colors hover:border-input",
                        selected?.id === t.id ? "border-ink" : "border-line",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
                        <span>{TYPE_LABEL[t.type]}</span>
                        <PartnerAvatar partner={t.owner} className="size-5 text-[9px]" />
                      </div>
                      <p className="mt-1.5 text-[15px] leading-5 font-medium">{t.title}</p>
                      <p className="mt-1 truncate text-[13px] text-muted-foreground">
                        {t.event ? t.event.title : t.campaign ? t.campaign.name : "Progetto generale"}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                        {t.dueDate ? (
                          <span className={cn("inline-flex items-center gap-1", t.daysTo !== null && t.daysTo < 0 && col.key !== "done" && "font-medium text-amber")}>
                            <CalendarDays className="size-3.5" />
                            {col.key === "done" ? formatDate(t.dueDate) : capitalize(relativeDay(t.daysTo ?? 0))}
                          </span>
                        ) : null}
                        {t.internalMinutes ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3.5" /> {Math.round(t.internalMinutes / 6) / 10} h
                          </span>
                        ) : null}
                        {t.fileCount ? (
                          <span className="inline-flex items-center gap-1">
                            <FolderOpen className="size-3.5" /> v{t.latestVersion}
                          </span>
                        ) : null}
                        {t.externalCostCents ? <Money cents={t.externalCostCents} round /> : null}
                      </div>
                    </Link>
                  </li>
                ))}
                {!items.length ? (
                  <li className="rounded-[16px] border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted-foreground">Vuoto</li>
                ) : null}
              </ul>
            </section>
          );
        })}
      </div>

      <Panel className="mt-8">
        <PanelHeader title="Campagne" description="Budget impegnato dalle attività con costo esterno" />
        {m.campaigns.length ? (
          <ul className="mt-3 divide-y divide-line">
            {m.campaigns.map((c) => {
              const pct = c.budgetCents ? Math.min(100, (c.committedCents / c.budgetCents) * 100) : 0;
              return (
                <li key={c.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_240px] sm:items-center sm:px-6">
                  <div>
                    <p className="text-[15px] font-medium">{c.name}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {formatDate(c.startsOn)} – {c.endsOn ? formatDate(c.endsOn) : "in corso"} · {c.taskCount} attività
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-muted-foreground">Impegnato</span>
                      <span className="tabular">
                        <Money cents={c.committedCents} round /> / <Money cents={c.budgetCents} round />
                      </span>
                    </div>
                    <Progress value={pct} className="mt-2 h-1.5 bg-sand [&>[data-slot=progress-indicator]]:bg-ink" aria-label={`Budget impegnato ${Math.round(pct)}%`} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Nessuna campagna" description="Raggruppa contenuti e budget sotto una campagna, ad esempio “Stagione matrimoni”." />
        )}
      </Panel>
      <p className="mt-3 text-[13px] text-muted-foreground">Integrazione Google Drive prevista: ogni file potrà avere un collegamento esterno.</p>
    </>
  );
}

function Cell({ label, value, note }: { label: string; value: React.ReactNode; note: string }) {
  return (
    <div className="border-line p-5 max-lg:[&:nth-child(odd)]:border-r max-lg:[&:nth-child(n+3)]:border-t lg:[&:not(:last-child)]:border-r">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-[22px] leading-7 font-semibold tracking-[-0.02em]">{value}</dd>
      <dd className="mt-1 text-[13px] text-muted-foreground">{note}</dd>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
