import Link from "next/link";
import { ArrowUpRight, Clock, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { QuickActions } from "@/components/app/quick-actions";
import { CalendarStrip } from "@/components/home/calendar-strip";
import { AmountKind } from "@/components/domain/amount-kind";
import { Money } from "@/components/domain/money";
import { EmptyState, Panel, PanelHeader } from "@/components/domain/panel";
import { PartnerAvatar } from "@/components/domain/partner-chip";
import { EventStatusBadge } from "@/components/domain/status-badge";
import { Progress } from "@/components/ui/progress";
import { getDataset } from "@/lib/data/source";
import { daysBetween, homeData, lookup } from "@/lib/data/queries";
import { capitalize, formatDate, monthLabel, pluralize, relativeDay, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Home" };

function greeting() {
  const h = Number(new Date().toLocaleString("it-IT", { hour: "2-digit", hour12: false, timeZone: "Europe/Rome" }));
  if (h < 5) return "Buonanotte";
  if (h < 13) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

export default async function HomePage() {
  const ds = await getDataset();
  const h = homeData(ds);
  const L = lookup(ds);
  const k = h.kpi;
  const next = h.nextEvent;
  const owedToPartners = k.partnerBalances.reduce((a, b) => a + Math.max(0, b.financingCents), 0);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${ds.currentUser.name}`}
        description={capitalize(formatDate(h.today, "long"))}
        actions={<div className="hidden md:block"><QuickActions /></div>}
      >
        <div className="mt-5 md:hidden">
          <QuickActions />
        </div>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        {/* Prossimo evento: l'elemento più caratteristico della giornata */}
        <Panel className="overflow-hidden">
          {next ? (
            <Link href={`/eventi/${next.id}`} className="group block p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Prossimo evento · <span className="font-medium text-ink">{relativeDay(next.daysTo)}</span>
                </p>
                <EventStatusBadge status={next.status} />
              </div>
              <div className="mt-6 flex items-end gap-5">
                <div className="shrink-0 text-center">
                  <p className="tabular text-[56px] leading-[52px] font-semibold tracking-[-0.04em]">{formatDate(next.date, "day")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatDate(next.date, "monthShort")}</p>
                </div>
                <div className="min-w-0 pb-1">
                  <h2 className="text-[22px] leading-7 font-semibold tracking-[-0.02em] group-hover:underline group-hover:decoration-brand group-hover:decoration-2 group-hover:underline-offset-4">
                    {next.title}
                  </h2>
                  <p className="mt-1 truncate text-[15px] text-muted-foreground">{next.client?.name}</p>
                </div>
              </div>
              <dl className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Luogo</dt>
                  <MapPin className="size-4 text-ash" />
                  <dd>{next.venueName}</dd>
                </div>
                {next.startTime ? (
                  <div className="flex items-center gap-1.5">
                    <dt className="sr-only">Orario</dt>
                    <Clock className="size-4 text-ash" />
                    <dd className="tabular">
                      {next.startTime}
                      {next.endTime ? `–${next.endTime}` : ""}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Ospiti</dt>
                  <Users className="size-4 text-ash" />
                  <dd>{next.guests} ospiti</dd>
                </div>
                <div>
                  <dt className="sr-only">Servizi</dt>
                  <dd>{[next.hasPizza && "Pizza", next.hasCocktail && "Cocktail bar"].filter(Boolean).join(" + ")}</dd>
                </div>
              </dl>
              <div className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
                <div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">Checklist</span>
                    <span className="tabular font-medium">
                      {next.tasksDone}/{next.tasksTotal}
                    </span>
                  </div>
                  <Progress
                    className="mt-2 h-1.5 bg-sand [&>[data-slot=progress-indicator]]:bg-ink"
                    value={next.tasksTotal ? (next.tasksDone / next.tasksTotal) * 100 : 0}
                    aria-label="Avanzamento checklist"
                  />
                </div>
                <div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">Incassato</span>
                    <span className="tabular font-medium">
                      <Money cents={next.econ.cash.receivedCents} round /> <span className="text-muted-foreground">di</span>{" "}
                      <Money cents={next.econ.cash.invoicedCents || next.quoteGross} round />
                    </span>
                  </div>
                  <Progress
                    className="mt-2 h-1.5 bg-sand [&>[data-slot=progress-indicator]]:bg-brand"
                    value={
                      (next.econ.cash.invoicedCents || next.quoteGross)
                        ? (next.econ.cash.receivedCents / (next.econ.cash.invoicedCents || next.quoteGross)) * 100
                        : 0
                    }
                    aria-label="Quota incassata"
                  />
                </div>
              </div>
            </Link>
          ) : (
            <EmptyState
              title="Nessun evento in programma"
              description="Quando confermi un evento, qui trovi data, luogo, checklist e incassi."
              action={
                <Link className="text-sm font-medium text-brand underline-offset-4 hover:underline" href="/eventi/nuovo">
                  Crea un evento
                </Link>
              }
            />
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Prossime due settimane"
            description={
              <span className="inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full border-[1.5px] border-brand" /> evento
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-ash/50" /> scadenza
                </span>
              </span>
            }
          />
          <div className="p-5 pt-4 sm:px-6">
            <CalendarStrip days={h.calendar} today={h.today} />
          </div>
        </Panel>
      </div>

      {/* KPI: un unico pannello, non sei card identiche */}
      <Panel className="mt-5">
        <dl className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <Kpi
            label={`Incassi di ${monthLabel(h.today.slice(0, 7)).split(" ")[0]}`}
            value={<Money cents={k.cashInMonth} round />}
            note={
              k.cashInPrevMonth ? (
                <>
                  Mese prima <Money cents={k.cashInPrevMonth} round />
                </>
              ) : (
                "Nessun incasso il mese prima"
              )
            }
            tag={<AmountKind kind="effettivo" />}
            href="/finanze?tipo=entrate"
          />
          <Kpi
            label={`Margine eventi ${h.today.slice(0, 4)}`}
            value={<Money cents={k.actualMargin} round />}
            note={`${pluralize(k.completedCount, "evento completato", "eventi completati")}`}
            tag={<AmountKind kind="effettivo" />}
            href="/analisi"
          />
          <Kpi
            label="Margine eventi confermati"
            value={<Money cents={k.forecastMargin} round />}
            note={pluralize(k.confirmedUpcomingCount, "evento in arrivo", "eventi in arrivo")}
            tag={<AmountKind kind="previsto" />}
            href="/eventi?stato=confermato"
          />
          <Kpi
            label="Spese da pagare"
            value={<Money cents={k.payablesTotal} round />}
            note={
              k.overdueCount ? (
                <span className="font-medium text-amber">{pluralize(k.overdueCount, "scaduta", "scadute")}</span>
              ) : (
                pluralize(k.payablesCount, "documento", "documenti")
              )
            }
            href="/finanze?tipo=uscite&stato=da_saldare"
          />
          <Kpi
            label="Anticipi dei soci"
            value={<Money cents={owedToPartners} round />}
            note={
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                {k.partnerBalances.map((b) => (
                  <span key={b.partnerId} className="inline-flex items-center gap-1">
                    <PartnerAvatar partner={L.partner(b.partnerId)} className="size-4 text-[9px]" />
                    <Money cents={b.financingCents} round />
                  </span>
                ))}
              </span>
            }
            href="/finanze/soci"
          />
          <Kpi
            label="Da fare entro 3 giorni"
            value={<span className="tabular">{k.urgentCount}</span>}
            note={`${pluralize(k.upcomingCount30, "evento", "eventi")} nei prossimi 30 giorni`}
            href="#da-fare"
          />
        </dl>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Panel id="da-fare">
          <PanelHeader title="Da fare" description="Scadenze di eventi, marketing e pagamenti nei prossimi 3 giorni" />
          {h.urgent.length ? (
            <ul className="mt-3 divide-y divide-line">
              {h.urgent.map((t) => {
                const d = daysBetween(h.today, t.dueDate);
                return (
                  <li key={t.id}>
                    <Link href={t.href} className="flex items-center gap-4 px-5 py-3.5 hover:bg-paper/60 sm:px-6">
                      <span
                        className={cn(
                          "tabular w-16 shrink-0 text-[13px] font-medium",
                          d < 0 ? "text-amber" : d === 0 ? "text-brand" : "text-ash",
                        )}
                      >
                        {d < 0 ? "In ritardo" : capitalize(relativeDay(d))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px]">{t.label}</span>
                        <span className="block truncate text-[13px] text-muted-foreground">{t.context}</span>
                      </span>
                      {t.ownerId ? <PartnerAvatar partner={L.partner(t.ownerId)} /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="Niente in scadenza" description="Le attività con scadenza nei prossimi 3 giorni compariranno qui." />
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Ultime modifiche"
            action={
              <Link href="/impostazioni#registro" className="text-sm text-muted-foreground hover:text-ink">
                Registro
              </Link>
            }
          />
          {h.activity.length ? (
            <ol className="mt-3 space-y-0 px-5 pb-5 sm:px-6">
              {h.activity.map((a, i) => (
                <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < h.activity.length - 1 ? <span aria-hidden className="absolute top-7 bottom-0 left-3 w-px bg-line" /> : null}
                  <PartnerAvatar partner={L.partner(a.actorPartnerId)} />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="leading-6">
                      <span className="font-medium">{L.partner(a.actorPartnerId)?.name ?? "Sistema"}</span>{" "}
                      <span className="text-muted-foreground">
                        ha {a.action} · {a.entity}
                      </span>
                    </p>
                    {a.href ? (
                      <Link href={a.href} className="block truncate text-ink/85 hover:underline">
                        {a.summary}
                      </Link>
                    ) : (
                      <p className="truncate text-ink/85">{a.summary}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{relativeTime(a.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Ancora nessuna modifica" description="Ogni salvataggio importante viene registrato qui, con autore e orario." />
          )}
        </Panel>
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  note,
  tag,
  href,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  tag?: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block border-line p-5 transition-colors hover:bg-paper/60 max-md:[&:nth-child(odd)]:border-r max-md:[&:nth-child(n+3)]:border-t md:max-xl:[&:not(:nth-child(3n))]:border-r md:max-xl:[&:nth-child(n+4)]:border-t xl:[&:not(:last-child)]:border-r"
    >
      <dt className="flex min-h-10 items-start justify-between gap-2 text-[13px] leading-5 text-muted-foreground">
        <span>{label}</span>
        <ArrowUpRight className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      </dt>
      <dd className="mt-2 text-[24px] leading-8 font-semibold tracking-[-0.02em]">{value}</dd>
      <dd className="mt-1.5 flex min-h-5 flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        {tag}
        {note}
      </dd>
    </Link>
  );
}
