import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { AmountKind } from "@/components/domain/amount-kind";
import { FilterChips, SearchForm, qs } from "@/components/domain/filter-chips";
import { Money } from "@/components/domain/money";
import { EmptyState, Panel } from "@/components/domain/panel";
import { PartnerAvatar } from "@/components/domain/partner-chip";
import { ServiceIcons } from "@/components/domain/service-icons";
import { EVENT_STATUS_LABEL, EventStatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { getDataset } from "@/lib/data/source";
import { daysBetween, listEvents, lookup, type EventFilter, type EventSummary } from "@/lib/data/queries";
import { capitalize, formatDate, monthLabel, relativeDay } from "@/lib/format";
import { formatPercentBp } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { EventStatus } from "@/lib/domain/types";

export const metadata = { title: "Eventi" };

type SP = { stato?: string; q?: string; periodo?: string; vista?: string };

export default async function EventiPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ds = await getDataset();
  const periodo = (["prossimi", "passati", "tutti"].includes(sp.periodo ?? "") ? sp.periodo : "prossimi") as EventFilter["periodo"];
  const { events, counts } = listEvents(ds, { stato: sp.stato, q: sp.q, periodo });

  const base = { q: sp.q, periodo: periodo === "prossimi" ? undefined : periodo };
  const pipeline = counts.richiesta + counts.preventivo + counts.trattativa;
  const statusChips: { key?: string; label: string; count?: number }[] = [
    { label: "Tutti" },
    { key: "pipeline", label: "Da chiudere", count: pipeline },
    ...(["confermato", "in_preparazione", "completato", "annullato"] as EventStatus[]).map((s) => ({
      key: s,
      label: EVENT_STATUS_LABEL[s],
      count: counts[s],
    })),
  ];

  if (sp.vista === "attivita") return <TasksView />;

  const groups = events.reduce<Record<string, EventSummary[]>>((acc, e) => {
    (acc[e.date.slice(0, 7)] ??= []).push(e);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Eventi"
        description="Dalla richiesta al saldo: preventivi, organizzazione e margini di ogni evento."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/eventi?vista=attivita">Attività</Link>
            </Button>
            <Button asChild>
              <Link href="/eventi/nuovo">
                <CalendarPlus /> Nuovo evento
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          label="Periodo"
          chips={[
            { label: "Prossimi", href: qs("/eventi", { ...base, periodo: undefined, stato: sp.stato }), active: periodo === "prossimi" },
            { label: "Passati", href: qs("/eventi", { ...base, periodo: "passati", stato: sp.stato }), active: periodo === "passati" },
            { label: "Tutti", href: qs("/eventi", { ...base, periodo: "tutti", stato: sp.stato }), active: periodo === "tutti" },
          ]}
        />
        <SearchForm action="/eventi" defaultValue={sp.q} placeholder="Cerca evento, cliente, luogo" hidden={{ periodo: base.periodo, stato: sp.stato }} />
      </div>
      <FilterChips
        className="mb-6"
        label="Stato"
        chips={statusChips.map((c) => ({
          label: c.label,
          count: c.count,
          href: qs("/eventi", { ...base, stato: c.key }),
          active: (sp.stato ?? undefined) === c.key,
        }))}
      />

      {events.length === 0 ? (
        <Panel>
          <EmptyState
            title={sp.q ? `Nessun evento per “${sp.q}”` : "Nessun evento in questa vista"}
            description="Cambia filtro o crea un nuovo evento: parte come richiesta e lo porti fino al saldo."
            action={
              <Button asChild size="sm">
                <Link href="/eventi/nuovo">Nuovo evento</Link>
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([month, list]) => (
            <section key={month} aria-labelledby={`m-${month}`}>
              <h2 id={`m-${month}`} className="mb-3 text-[15px] font-semibold capitalize">
                {monthLabel(month)}
                <span className="ml-2 text-sm font-normal text-muted-foreground">{list.length}</span>
              </h2>
              <Panel className="overflow-hidden">
                <ul className="divide-y divide-line">
                  {list.map((e) => (
                    <EventRow key={e.id} e={e} />
                  ))}
                </ul>
              </Panel>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function EventRow({ e }: { e: EventSummary }) {
  const f = e.econ.forecast;
  const a = e.econ.actual;
  const done = e.status === "completato";
  const block = done && a.revenue.total > 0 ? a : f;
  const cancelled = e.status === "annullato";
  return (
    <li>
      <Link
        href={`/eventi/${e.id}`}
        className={cn(
          "grid grid-cols-[56px_1fr] gap-x-4 gap-y-2 px-4 py-4 transition-colors hover:bg-paper/60 sm:px-6 md:grid-cols-[56px_1fr_150px_170px] md:items-center",
          cancelled && "opacity-60",
        )}
      >
        <div className="row-span-2 text-center md:row-span-1">
          <p className="text-[11px] text-ash uppercase">{formatDate(e.date, "weekday")}</p>
          <p className="tabular text-[26px] leading-8 font-semibold tracking-[-0.03em]">{formatDate(e.date, "day")}</p>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[16px] font-medium">{e.title}</p>
            <ServiceIcons pizza={e.hasPizza} cocktail={e.hasCocktail} className="shrink-0" />
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {e.client?.name} · {e.venueName} · {e.guests} ospiti
          </p>
        </div>
        <div className="flex items-center gap-2 md:block">
          <EventStatusBadge status={e.status} />
          {!done && !cancelled && e.daysTo >= 0 ? (
            <p className="text-xs text-muted-foreground md:mt-1">{capitalize(relativeDay(e.daysTo))}</p>
          ) : null}
        </div>
        <div className="col-start-2 flex items-center justify-between gap-3 md:col-start-auto md:block md:text-right">
          {block.revenue.total > 0 ? (
            <>
              <p className="text-[15px] font-medium">
                <Money cents={block.revenue.total} round />
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground md:justify-end">
                <AmountKind kind={block === a ? "effettivo" : f.hasEstimates ? "stimato" : "previsto"} />
                {block.costs.total === 0
                  ? "costi da stimare"
                  : `margine ${block.marginBp !== null ? formatPercentBp(block.marginBp, 0) : "—"}`}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nessun preventivo</p>
          )}
        </div>
      </Link>
    </li>
  );
}

async function TasksView() {
  const ds = await getDataset();
  const L = lookup(ds);
  const open = ds.tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  return (
    <>
      <PageHeader
        title="Attività"
        description="Tutte le cose da fare per gli eventi, in ordine di scadenza. Per aggiungerne una, apri l'evento e vai su Organizzazione."
        actions={
          <Button variant="outline" asChild>
            <Link href="/eventi">Torna agli eventi</Link>
          </Button>
        }
      />
      <Panel className="overflow-hidden">
        {open.length ? (
          <ul className="divide-y divide-line">
            {open.map((t) => {
              const d = t.dueDate ? daysBetween(ds.today, t.dueDate) : null;
              return (
                <li key={t.id}>
                  <Link href={`/eventi/${t.eventId}?tab=organizzazione`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-paper/60 sm:px-6">
                    <span className={cn("w-20 shrink-0 text-[13px] font-medium", d !== null && d < 0 ? "text-amber" : d === 0 ? "text-brand" : "text-ash")}>
                      {d === null ? "Senza data" : d < 0 ? "In ritardo" : capitalize(relativeDay(d))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{t.label}</span>
                      <span className="block truncate text-[13px] text-muted-foreground">{L.event(t.eventId)?.title}</span>
                    </span>
                    {t.assigneePartnerId ? <PartnerAvatar partner={L.partner(t.assigneePartnerId)} /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Nessuna attività aperta" description="Le checklist degli eventi compariranno qui." />
        )}
      </Panel>
    </>
  );
}
