import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, FileText, Mail, MapPin, Paperclip, Phone, Users } from "lucide-react";
import { AmountKind } from "@/components/domain/amount-kind";
import { Money } from "@/components/domain/money";
import { EmptyState, Panel, PanelHeader } from "@/components/domain/panel";
import { PartnerAvatar } from "@/components/domain/partner-chip";
import { ServiceIcons } from "@/components/domain/service-icons";
import { EventStatusBadge, MarketingStatusBadge, PaymentStateBadge } from "@/components/domain/status-badge";
import { Checklist, ResourceCheck } from "@/components/events/checklist";
import { EventActions } from "@/components/events/event-actions";
import { getDataset } from "@/lib/data/source";
import { eventDetail, lookup } from "@/lib/data/queries";
import { serviceMarginsWithSharedCosts, quoteTotals, lineNet } from "@/lib/domain/events";
import type { EconomicsBlock } from "@/lib/domain/events";
import { capitalize, formatDate, relativeDay } from "@/lib/format";
import { formatPercentBp } from "@/lib/money";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "panoramica", label: "Panoramica" },
  { key: "economica", label: "Economica" },
  { key: "organizzazione", label: "Organizzazione" },
  { key: "documenti", label: "Documenti" },
  { key: "marketing", label: "Marketing" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ds = await getDataset();
  return { title: lookup(ds).event(id)?.title ?? "Evento" };
}

export default async function EventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const ds = await getDataset();
  const d = eventDetail(ds, id);
  if (!d) notFound();
  const e = d.event;
  const tab: TabKey = (TABS.find((t) => t.key === sp.tab)?.key ?? "panoramica") as TabKey;

  return (
    <>
      <Link href="/eventi" className="-ml-1 inline-flex h-9 items-center gap-1 rounded-md pr-2 text-sm text-muted-foreground hover:text-ink">
        <ChevronLeft className="size-4" /> Eventi
      </Link>

      <header className="mt-2 mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="tabular">{e.code}</span>
            <EventStatusBadge status={e.status} />
          </div>
          <h1 className="mt-2 text-[28px] leading-9 font-semibold tracking-[-0.025em] sm:text-[32px] sm:leading-10">{e.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-muted-foreground">
            <span className="text-ink">
              {capitalize(formatDate(e.date, "long"))}
              {e.status !== "completato" && e.status !== "annullato" && e.daysTo >= 0 ? (
                <span className="text-muted-foreground"> · {relativeDay(e.daysTo)}</span>
              ) : null}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" /> {e.venueName}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-4" /> {e.guests}
            </span>
            <ServiceIcons pizza={e.hasPizza} cocktail={e.hasCocktail} />
          </p>
        </div>
        <EventActions eventId={e.id} status={e.status} title={e.title} />
      </header>

      <nav aria-label="Sezioni evento" className="sticky top-16 z-20 -mx-4 mb-6 border-b border-line bg-paper/90 px-4 backdrop-blur-md sm:mx-0 sm:px-0 lg:top-0">
        <ul className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <li key={t.key}>
              <Link
                href={t.key === "panoramica" ? `/eventi/${e.id}` : `/eventi/${e.id}?tab=${t.key}`}
                scroll={false}
                aria-current={tab === t.key ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-12 items-center px-3 text-[15px] whitespace-nowrap transition-colors",
                  tab === t.key ? "font-medium text-ink" : "text-muted-foreground hover:text-ink",
                )}
              >
                {t.label}
                {tab === t.key ? <span aria-hidden className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-brand" /> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "panoramica" ? <Overview d={d} today={ds.today} /> : null}
      {tab === "economica" ? <Economics d={d} vatMode={ds.vatMode} /> : null}
      {tab === "organizzazione" ? <Organization d={d} today={ds.today} partners={ds.partners} /> : null}
      {tab === "documenti" ? <Documents d={d} /> : null}
      {tab === "marketing" ? <MarketingTab d={d} partners={ds.partners} /> : null}
    </>
  );
}

type Detail = NonNullable<ReturnType<typeof eventDetail>>;

function Overview({ d, today }: { d: Detail; today: string }) {
  const e = d.event;
  const econ = e.econ;
  const nextTasks = d.tasks.filter((t) => !t.done).sort((a, b) => (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9")).slice(0, 4);
  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-5">
        <Panel>
          <PanelHeader title="Dettagli" />
          <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 sm:px-6">
            <Detail label="Data">{capitalize(formatDate(e.date, "full"))}</Detail>
            <Detail label="Orario">
              {e.startTime ? (
                <span className="tabular inline-flex items-center gap-1.5">
                  <Clock className="size-4 text-ash" />
                  {e.startTime}–{e.endTime ?? "?"}
                </span>
              ) : (
                <span className="text-muted-foreground">Da definire</span>
              )}
            </Detail>
            <Detail label="Luogo">{e.venueName}</Detail>
            <Detail label="Indirizzo">{e.venueAddress ?? <span className="text-muted-foreground">Da definire</span>}</Detail>
            <Detail label="Ospiti">{e.guests}</Detail>
            <Detail label="Servizi">{[e.hasPizza && "Pizza", e.hasCocktail && "Cocktail bar"].filter(Boolean).join(" e ")}</Detail>
            {e.leadSource ? <Detail label="Come ci ha trovato">{e.leadSource}</Detail> : null}
            {e.notes ? (
              <div className="sm:col-span-2">
                <Detail label="Note">{e.notes}</Detail>
              </div>
            ) : null}
          </dl>
        </Panel>

        <Panel>
          <PanelHeader
            title="Prossime attività"
            action={
              <Link href={`/eventi/${e.id}?tab=organizzazione`} className="text-sm text-muted-foreground hover:text-ink">
                Checklist completa
              </Link>
            }
          />
          {nextTasks.length ? (
            <ul className="mt-3 divide-y divide-line">
              {nextTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                  <span aria-hidden className="size-2.5 rounded-full border-[1.5px] border-ash/60" />
                  <span className="min-w-0 flex-1 truncate text-[15px]">{t.label}</span>
                  {t.dueDate ? (
                    <span className={cn("tabular text-[13px]", t.dueDate < today ? "text-amber" : "text-muted-foreground")}>
                      {capitalize(formatDate(t.dueDate))}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nessuna attività aperta" description="Aggiungi una checklist dal modello o voci singole in Organizzazione." />
          )}
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel>
          <PanelHeader title="Cliente" />
          <div className="space-y-2 p-5 text-[15px] sm:px-6">
            <p className="font-medium">{e.client?.name ?? "—"}</p>
            {e.client?.company ? <p className="text-muted-foreground">{e.client.company}</p> : null}
            {e.client?.phone ? (
              <a href={`tel:${e.client.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:underline">
                <Phone className="size-4 text-ash" /> {e.client.phone}
              </a>
            ) : null}
            {e.client?.email ? (
              <a href={`mailto:${e.client.email}`} className="flex items-center gap-2 hover:underline">
                <Mail className="size-4 text-ash" /> {e.client.email}
              </a>
            ) : null}
          </div>
        </Panel>
        <Panel>
          <PanelHeader
            title="In sintesi"
            action={
              <Link href={`/eventi/${e.id}?tab=economica`} className="text-sm text-muted-foreground hover:text-ink">
                Economica
              </Link>
            }
          />
          <dl className="divide-y divide-line px-5 py-2 sm:px-6">
            <Row label={<>Ricavo <AmountKind kind={econ.forecast.hasEstimates ? "stimato" : "previsto"} /></>}>
              <Money cents={econ.forecast.revenue.total} />
            </Row>
            <Row label={<>Margine <AmountKind kind={econ.forecast.hasEstimates ? "stimato" : "previsto"} /></>}>
              <Money cents={econ.forecast.marginCents} />
              {econ.forecast.marginBp !== null ? <span className="ml-2 text-muted-foreground">{formatPercentBp(econ.forecast.marginBp)}</span> : null}
            </Row>
            <Row label={<>Margine <AmountKind kind="effettivo" /></>}>
              {econ.actual.revenue.total || econ.actual.costs.total ? <Money cents={econ.actual.marginCents} /> : <span className="text-muted-foreground">Nessun documento</span>}
            </Row>
            <Row label="Incassato">
              <Money cents={econ.cash.receivedCents} /> <span className="text-muted-foreground">di</span> <Money cents={econ.cash.invoicedCents} />
            </Row>
          </dl>
        </Panel>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[15px]">{children}</dd>
    </div>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">{label}</dt>
      <dd className="tabular text-right text-[15px] font-medium">{children}</dd>
    </div>
  );
}

function Economics({ d, vatMode }: { d: Detail; vatMode: string }) {
  const { forecast: f, actual: a } = d.event.econ;
  const accepted = d.quotes.find((q) => q.status === "accettato") ?? d.quotes[0];
  const completed = d.event.status === "completato";
  const est = serviceMarginsWithSharedCosts(completed && a.revenue.total ? a : f);
  const incoming = d.payments.filter((p) => d.documents.find((x) => x.id === p.documentId)?.direction === "in");
  const paidSoFar = new Map<string, number>();
  const labelled = incoming.map((p) => {
    const doc = d.documents.find((x) => x.id === p.documentId)!;
    const cum = (paidSoFar.get(doc.id) ?? 0) + p.amountCents;
    paidSoFar.set(doc.id, cum);
    return { ...p, label: cum >= doc.totalCents ? "Saldo" : "Acconto", doc: doc.description };
  });
  const rows: { label: string; pick: (b: EconomicsBlock) => number; strong?: boolean; indent?: boolean }[] = [
    { label: "Ricavi pizza", pick: (b) => b.revenue.pizza, indent: true },
    { label: "Ricavi cocktail bar", pick: (b) => b.revenue.cocktail, indent: true },
    { label: "Ricavi extra", pick: (b) => b.revenue.extra, indent: true },
    { label: "Ricavi", pick: (b) => b.revenue.total, strong: true },
    { label: "Costi pizza", pick: (b) => b.costs.pizza, indent: true },
    { label: "Costi cocktail bar", pick: (b) => b.costs.cocktail, indent: true },
    { label: "Costi comuni", pick: (b) => b.costs.generale, indent: true },
    { label: "Costi", pick: (b) => b.costs.total, strong: true },
    { label: "Margine", pick: (b) => b.marginCents, strong: true },
  ];

  return (
    <div className="space-y-5">
      <Panel className="overflow-hidden">
        <PanelHeader
          title="Previsto e consuntivo"
          description={
            vatMode === "forfettario"
              ? "Importi al lordo: in regime forfettario l'IVA sui costi non è recuperabile."
              : "Importi al netto dell'IVA. Il regime IVA è da confermare nelle impostazioni."
          }
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-[15px]">
            <thead>
              <tr className="border-y border-line bg-paper/60 text-left text-[13px] text-muted-foreground">
                <th className="px-5 py-2.5 font-normal sm:px-6">Voce</th>
                <th className="px-3 py-2.5 text-right font-normal">
                  <span className="inline-flex items-center gap-2">
                    {f.basis === "accettato" ? "Preventivo accettato" : f.basis === "ultimo_preventivo" ? "Ultimo preventivo" : "Previsto"}
                    <AmountKind kind={f.hasEstimates ? "stimato" : "previsto"} />
                  </span>
                </th>
                <th className="px-3 py-2.5 text-right font-normal">
                  <span className="inline-flex items-center gap-2">
                    {completed ? "Documenti" : "Documenti finora"} <AmountKind kind="effettivo" />
                  </span>
                </th>
                <th className="px-5 py-2.5 text-right font-normal sm:px-6">Scostamento</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const fv = r.pick(f);
                const av = r.pick(a);
                if (r.indent && fv === 0 && av === 0) return null;
                return (
                  <tr key={r.label} className={cn("border-b border-line/70", r.strong && "font-medium")}>
                    <th scope="row" className={cn("px-5 py-2.5 text-left font-[inherit] sm:px-6", r.indent && "pl-9 font-normal text-muted-foreground sm:pl-10")}>
                      {r.label}
                    </th>
                    <td className="px-3 py-2.5 text-right"><Money cents={fv} /></td>
                    <td className="px-3 py-2.5 text-right"><Money cents={av} /></td>
                    <td className="px-5 py-2.5 text-right sm:px-6">
                      {av === 0 && fv !== 0 ? <span className="text-muted-foreground">—</span> : <Money cents={av - fv} sign muted />}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <th scope="row" className="px-5 py-3 text-left font-normal text-muted-foreground sm:px-6">Margine %</th>
                <td className="tabular px-3 py-3 text-right">{f.marginBp !== null ? formatPercentBp(f.marginBp) : "—"}</td>
                <td className="tabular px-3 py-3 text-right">{a.marginBp !== null ? formatPercentBp(a.marginBp) : "—"}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Margine per servizio"
            description="Costi comuni ripartiti in proporzione ai ricavi di pizza e cocktail."
            action={<AmountKind kind="stimato" />}
          />
          <dl className="grid grid-cols-2 gap-4 p-5 sm:px-6">
            <div className="rounded-[14px] bg-paper p-4">
              <dt className="text-sm text-muted-foreground">Pizza</dt>
              <dd className="mt-1 text-[22px] font-semibold"><Money cents={est.pizza} /></dd>
            </div>
            <div className="rounded-[14px] bg-paper p-4">
              <dt className="text-sm text-muted-foreground">Cocktail bar</dt>
              <dd className="mt-1 text-[22px] font-semibold"><Money cents={est.cocktail} /></dd>
            </div>
          </dl>
        </Panel>

        <Panel>
          <PanelHeader title="Incassi" description="Acconti e saldi sono pagamenti dei documenti di entrata: il ricavo si conta una volta." />
          {labelled.length ? (
            <ol className="mt-3 divide-y divide-line">
              {labelled.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3 text-[15px] sm:px-6">
                  <span className="w-16 shrink-0 text-[13px] text-muted-foreground">{capitalize(formatDate(p.paidOn))}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block">
                      {p.label} <span className="text-[13px] text-muted-foreground">· {p.method}</span>
                    </span>
                    <span className="block truncate text-[13px] text-muted-foreground">{p.doc}</span>
                  </span>
                  <Money cents={p.amountCents} className="font-medium" />
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Nessun incasso registrato" description="Registra l'acconto da “Nuovo incasso” appena arriva." />
          )}
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <PanelHeader
          title="Preventivi"
          description={d.quotes.length ? `${d.quotes.length} versioni` : undefined}
        />
        {accepted ? (
          <>
            <ul className="mt-4 flex flex-wrap gap-2 px-5 sm:px-6">
              {d.quotes.map((q) => (
                <li key={q.id} className={cn("rounded-full border px-3 py-1 text-[13px]", q.id === accepted.id ? "border-ink bg-ink text-paper" : "border-line text-muted-foreground")}>
                  v{q.version} · {q.status}
                </li>
              ))}
            </ul>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-[15px]">
                <thead>
                  <tr className="border-y border-line bg-paper/60 text-left text-[13px] text-muted-foreground">
                    <th className="px-5 py-2.5 font-normal sm:px-6">Descrizione</th>
                    <th className="px-3 py-2.5 text-right font-normal">Quantità</th>
                    <th className="px-3 py-2.5 text-right font-normal">Prezzo</th>
                    <th className="px-3 py-2.5 text-right font-normal">IVA</th>
                    <th className="px-5 py-2.5 text-right font-normal sm:px-6">Imponibile</th>
                  </tr>
                </thead>
                <tbody>
                  {accepted.lines.map((l) => (
                    <tr key={l.id} className="border-b border-line/70">
                      <td className="px-5 py-2.5 sm:px-6">
                        {l.description}
                        <span className="ml-2 text-[13px] text-muted-foreground capitalize">{l.service}</span>
                      </td>
                      <td className="tabular px-3 py-2.5 text-right">{l.qty}</td>
                      <td className="px-3 py-2.5 text-right"><Money cents={l.unitPriceCents} /></td>
                      <td className="tabular px-3 py-2.5 text-right">{formatPercentBp(l.vatBp)}</td>
                      <td className="px-5 py-2.5 text-right sm:px-6"><Money cents={lineNet(l)} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {(() => {
                    const t = quoteTotals(accepted.lines);
                    return (
                      <>
                        <tr><td colSpan={4} className="px-5 pt-3 text-right text-muted-foreground sm:px-6">Imponibile</td><td className="px-5 pt-3 text-right sm:px-6"><Money cents={t.netCents} /></td></tr>
                        <tr><td colSpan={4} className="px-5 text-right text-muted-foreground sm:px-6">IVA</td><td className="px-5 text-right sm:px-6"><Money cents={t.vatCents} /></td></tr>
                        <tr className="font-semibold"><td colSpan={4} className="px-5 pt-1 pb-4 text-right sm:px-6">Totale</td><td className="px-5 pt-1 pb-4 text-right sm:px-6"><Money cents={t.grossCents} /></td></tr>
                      </>
                    );
                  })()}
                </tfoot>
              </table>
            </div>
          </>
        ) : (
          <EmptyState title="Nessun preventivo" description="Prepara il primo preventivo con le opzioni pizza e cocktail bar." />
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Costi previsti" description="Base del margine previsto" />
          {d.budget.length ? (
            <ul className="mt-3 divide-y divide-line">
              {d.budget.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{b.description}</span>
                    <span className="text-[13px] text-muted-foreground capitalize">{b.service === "generale" ? "Comune" : b.service}</span>
                  </span>
                  <AmountKind kind={b.kind} />
                  <Money cents={b.amountCents} className="w-24 text-right" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nessun costo previsto" description="Aggiungi le voci principali per vedere il margine previsto." />
          )}
        </Panel>
        <Panel>
          <PanelHeader title="Documenti dell'evento" description="Fatture, scontrini e ricevute collegati" />
          <DocList docs={d.documents} />
        </Panel>
      </div>
    </div>
  );
}

function DocList({ docs }: { docs: Detail["documents"] }) {
  if (!docs.length) return <EmptyState title="Nessun documento collegato" description="Le spese e le fatture collegate a questo evento compariranno qui." />;
  return (
    <ul className="mt-3 divide-y divide-line">
      {docs.map((doc) => (
        <li key={doc.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold", doc.direction === "in" ? "bg-olive/10 text-olive" : "bg-sand text-ash")}>
            {doc.direction === "in" ? "+" : "−"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[15px]">
              <span className="truncate">{doc.description}</span>
              {doc.hasAttachment ? <Paperclip aria-label="Con allegato" className="size-3.5 shrink-0 text-ash" /> : null}
            </span>
            <span className="text-[13px] text-muted-foreground">{capitalize(formatDate(doc.documentDate))}</span>
          </span>
          <span className="flex flex-col items-end gap-1">
            <Money cents={doc.totalCents} className="text-[15px] font-medium" />
            <PaymentStateBadge state={doc.balance.state} direction={doc.direction} className="h-5 text-[11px]" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Organization({ d, today, partners }: { d: Detail; today: string; partners: Parameters<typeof Checklist>[0]["partners"] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <Panel>
        <PanelHeader title="Checklist" description="Spunta mentre lavori: si salva subito." />
        <div className="p-5 sm:px-6">
          {d.tasks.length ? (
            <Checklist tasks={d.tasks} partners={partners} today={today} />
          ) : (
            <EmptyState className="px-0" title="Nessuna checklist" description="Applica il modello “Evento pizza + cocktail” o aggiungi le voci a mano." />
          )}
        </div>
      </Panel>
      <div className="space-y-5">
        <Panel>
          <PanelHeader title="Personale" />
          {d.staff.length ? (
            <ul className="mt-3 divide-y divide-line">
              {d.staff.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px]">{s.contact?.name}</span>
                    <span className="text-[13px] text-muted-foreground">
                      {s.role}
                      {s.hours ? ` · ${s.hours} h` : ""}
                    </span>
                  </span>
                  {s.agreedCents ? <Money cents={s.agreedCents} className="text-[15px]" /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nessuno assegnato" description="Aggiungi collaboratori dalle Risorse." />
          )}
        </Panel>
        <Panel className="overflow-hidden">
          <PanelHeader title="Attrezzature e materiali" description="Check di carico e rientro" />
          {d.resources.length ? (
            <table className="mt-3 w-full text-[15px]">
              <thead>
                <tr className="border-y border-line bg-paper/60 text-left text-[13px] text-muted-foreground">
                  <th className="px-5 py-2 font-normal sm:px-6">Cosa</th>
                  <th className="px-2 py-2 text-right font-normal">Q.tà</th>
                  <th className="px-2 py-2 text-center font-normal">Carico</th>
                  <th className="px-5 py-2 text-center font-normal sm:px-6">Rientro</th>
                </tr>
              </thead>
              <tbody>
                {d.resources.map((r) => (
                  <tr key={r.id} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-2.5 sm:px-6">
                      {r.resource?.name}
                      {r.transport ? <span className="block text-[13px] text-muted-foreground">{r.transport}</span> : null}
                    </td>
                    <td className="tabular px-2 py-2.5 text-right">
                      {r.qty} <span className="text-muted-foreground">{r.resource?.unit}</span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <ResourceCheck id={r.id} field="loaded" checked={r.loaded} label={`${r.resource?.name}: caricato`} />
                    </td>
                    <td className="px-5 py-2.5 text-center sm:px-6">
                      <ResourceCheck id={r.id} field="returned" checked={r.returned} label={`${r.resource?.name}: rientrato`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="Niente da caricare" description="Assegna forno, banco bar e materiali dalle Risorse." />
          )}
        </Panel>
      </div>
    </div>
  );
}

function Documents({ d }: { d: Detail }) {
  const withFiles = d.documents.filter((x) => x.hasAttachment);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel>
        <PanelHeader title="Contratto e documenti cliente" description="Contratto firmato, preventivo PDF, planimetrie" />
        <div className="p-5 sm:px-6">
          <div className="flex flex-col items-start gap-2 rounded-[14px] border border-dashed border-input p-5">
            <FileText className="size-5 text-ash" />
            <p className="font-medium">Nessun file caricato</p>
            <p className="text-sm text-muted-foreground">
              I file sono privati: si aprono con un link temporaneo valido 5 minuti. PDF e foto fino a 15 MB.
            </p>
          </div>
        </div>
      </Panel>
      <Panel>
        <PanelHeader title="Ricevute e fatture" description={`${withFiles.length} documenti con allegato`} />
        <DocList docs={withFiles} />
      </Panel>
    </div>
  );
}

function MarketingTab({ d, partners }: { d: Detail; partners: { id: string; name: string; shortName: string; color: string }[] }) {
  return (
    <Panel>
      <PanelHeader
        title="Grafica e comunicazione"
        description="Menu personalizzati, cartellini, contenuti social collegati a questo evento"
        action={
          <Link href="/marketing" className="text-sm text-muted-foreground hover:text-ink">
            Apri Marketing
          </Link>
        }
      />
      {d.marketing.length ? (
        <ul className="mt-3 divide-y divide-line">
          {d.marketing.map((m) => (
            <li key={m.id}>
              <Link href={`/marketing?task=${m.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-paper/60 sm:px-6">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px]">{m.title}</span>
                  <span className="text-[13px] text-muted-foreground capitalize">
                    {m.type}
                    {m.latestVersion ? ` · versione ${m.latestVersion}` : ""}
                    {m.dueDate ? ` · entro ${formatDate(m.dueDate)}` : ""}
                  </span>
                </span>
                <MarketingStatusBadge status={m.status} />
                <PartnerAvatar partner={partners.find((p) => p.id === m.ownerPartnerId)} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Niente di collegato" description="Crea il menu personalizzato o un contenuto social per questo evento." />
      )}
    </Panel>
  );
}
