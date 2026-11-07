import Link from "next/link";
import { ArrowDownLeft, ChevronDown, Download, Paperclip, Receipt } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { OpenQuickAddButton } from "@/components/app/quick-actions";
import { AmountKind } from "@/components/domain/amount-kind";
import { FilterChips, SearchForm, qs } from "@/components/domain/filter-chips";
import { Money } from "@/components/domain/money";
import { EmptyState, Panel } from "@/components/domain/panel";
import { PartnerAvatar } from "@/components/domain/partner-chip";
import { PaymentStateBadge } from "@/components/domain/status-badge";
import { DeleteDocumentButton } from "@/components/finance/delete-document";
import { DeletePaymentButton } from "@/components/finance/delete-payment";
import { FinanceNav } from "@/components/finance/finance-nav";
import { Button } from "@/components/ui/button";
import { getDataset } from "@/lib/data/source";
import { financeOverview, listDocuments, lookup, type FinanceFilter } from "@/lib/data/queries";
import { capitalize, formatDate, formatDateSmart } from "@/lib/format";
import { formatEuro, formatPercentBp } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Finanze" };

const NATURE_LABEL: Record<string, string> = {
  evento: "Eventi",
  generale: "Spese generali",
  ricorrente: "Ricorrenti",
  investimento: "Investimenti",
  marketing: "Marketing",
};

type SP = { tipo?: string; stato?: string; natura?: string; mese?: string; q?: string };

export default async function FinanzePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ds = await getDataset();
  const L = lookup(ds);
  const f: FinanceFilter = {
    tipo: sp.tipo === "uscite" || sp.tipo === "entrate" ? sp.tipo : undefined,
    stato: sp.stato === "da_saldare" || sp.stato === "scaduti" || sp.stato === "pagati" ? sp.stato : undefined,
    natura: sp.natura && NATURE_LABEL[sp.natura] ? sp.natura : undefined,
    mese: sp.mese && /^\d{4}-\d{2}$/.test(sp.mese) ? sp.mese : undefined,
    q: sp.q,
  };
  const docs = listDocuments(ds, f);
  const o = financeOverview(ds);
  const keep = { tipo: f.tipo, stato: f.stato, natura: f.natura, mese: f.mese, q: f.q };

  return (
    <>
      <PageHeader
        title="Finanze"
        description="Documenti e pagamenti sono separati: la competenza viene dai documenti, la cassa dai pagamenti."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={qs("/finanze/export", keep)} download>
                <Download /> CSV
              </a>
            </Button>
            <OpenQuickAddButton kind="incasso" variant="outline">
              <ArrowDownLeft /> Incasso
            </OpenQuickAddButton>
            <OpenQuickAddButton kind="spesa">
              <Receipt /> Nuova spesa
            </OpenQuickAddButton>
          </>
        }
      />
      <FinanceNav active="/finanze" />

      <Panel className="mb-6">
        <dl className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Saldo di cassa" kind="effettivo" value={<Money cents={o.cashBalanceAllTime} round />} note="Denaro dell'azienda, dall'inizio" />
          <Stat label={`Ricavi ${o.year}`} kind="effettivo" value={<Money cents={o.ytd.revenueCents} round />} note="Per data documento" />
          <Stat label={`Costi ${o.year}`} kind="effettivo" value={<Money cents={o.ytd.costCents} round />} note="Esclusi investimenti" />
          <Stat label="Da pagare" value={<Money cents={o.payables} round />} note={o.overdue ? `${o.overdue} scadute` : "Nessuna scaduta"} warn={o.overdue > 0} />
          <Stat label="Da incassare" value={<Money cents={o.receivables} round />} note="Saldi dei clienti" />
          <Stat label="Investimenti" value={<Money cents={o.investments} round />} note="Attrezzature iniziali" />
        </dl>
      </Panel>

      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          label="Tipo"
          chips={[
            { label: "Tutti", href: qs("/finanze", { ...keep, tipo: undefined }), active: !f.tipo },
            { label: "Uscite", href: qs("/finanze", { ...keep, tipo: "uscite" }), active: f.tipo === "uscite" },
            { label: "Entrate", href: qs("/finanze", { ...keep, tipo: "entrate" }), active: f.tipo === "entrate" },
          ]}
        />
        <SearchForm action="/finanze" defaultValue={f.q} placeholder="Cerca descrizione, fornitore, evento" hidden={{ tipo: f.tipo, stato: f.stato, natura: f.natura, mese: f.mese }} />
      </div>
      <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center">
        <FilterChips
          label="Stato pagamento"
          chips={[
            { label: "Ogni stato", href: qs("/finanze", { ...keep, stato: undefined }), active: !f.stato },
            { label: "Da saldare", href: qs("/finanze", { ...keep, stato: "da_saldare" }), active: f.stato === "da_saldare" },
            { label: "Scaduti", href: qs("/finanze", { ...keep, stato: "scaduti" }), active: f.stato === "scaduti" },
            { label: "Saldati", href: qs("/finanze", { ...keep, stato: "pagati" }), active: f.stato === "pagati" },
          ]}
        />
        <span aria-hidden className="hidden h-6 w-px bg-line xl:block" />
        <FilterChips
          label="Natura"
          chips={[
            { label: "Ogni natura", href: qs("/finanze", { ...keep, natura: undefined }), active: !f.natura },
            ...Object.entries(NATURE_LABEL).map(([k, v]) => ({ label: v, href: qs("/finanze", { ...keep, natura: k }), active: f.natura === k })),
          ]}
        />
      </div>

      <Panel className="overflow-hidden">
        <div className="hidden grid-cols-[88px_1fr_120px_130px_130px_28px] items-center gap-4 border-b border-line bg-paper/60 px-6 py-2.5 text-[13px] text-muted-foreground md:grid">
          <span>Data</span>
          <span>Descrizione</span>
          <span>Pagato da</span>
          <span>Stato</span>
          <span className="text-right">Totale</span>
          <span />
        </div>
        {docs.length ? (
          <ul className="divide-y divide-line">
            {docs.map((d) => {
              const payers = [...new Set(d.payments.map((p) => (p.payer === "socio" ? p.partnerId : "azienda")))];
              return (
                <li key={d.id}>
                  <details className="group">
                    <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 hover:bg-paper/60 sm:px-6 md:grid-cols-[88px_1fr_120px_130px_130px_28px] [&::-webkit-details-marker]:hidden">
                      <span className="text-[13px] text-muted-foreground max-md:order-3 md:text-sm md:text-ink">{capitalize(formatDateSmart(d.documentDate, ds.today))}</span>
                      <span className="min-w-0 max-md:order-1">
                        <span className="flex items-center gap-1.5">
                          <span className={cn("shrink-0 text-xs font-semibold", d.direction === "in" ? "text-olive" : "text-ash")} aria-label={d.direction === "in" ? "Entrata" : "Uscita"}>
                            {d.direction === "in" ? "+" : "−"}
                          </span>
                          <span className="truncate text-[15px]">{d.description}</span>
                          {d.hasAttachment ? <Paperclip aria-label="Con allegato" className="size-3.5 shrink-0 text-ash" /> : null}
                        </span>
                        <span className="block truncate text-[13px] text-muted-foreground">
                          {[d.contact?.name, d.category?.name, d.event?.title].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 max-md:hidden">
                        {payers.length ? (
                          payers.map((p) => <PartnerAvatar key={p} partner={p === "azienda" ? undefined : L.partner(p)} />)
                        ) : (
                          <span className="text-[13px] text-muted-foreground">—</span>
                        )}
                      </span>
                      <span className="max-md:order-4 max-md:justify-self-end">
                        <PaymentStateBadge state={d.balance.state} direction={d.direction} />
                      </span>
                      <span className="text-right max-md:order-2">
                        <Money cents={d.totalCents} className="text-[15px] font-medium" />
                        {d.balance.residualCents > 0 && d.balance.paidCents > 0 ? (
                          <span className="block text-xs text-muted-foreground">
                            resta <Money cents={d.balance.residualCents} />
                          </span>
                        ) : null}
                      </span>
                      <ChevronDown aria-hidden className="size-4 text-ash transition-transform group-open:rotate-180 max-md:hidden" />
                    </summary>
                    <div className="grid gap-6 border-t border-line/70 bg-paper/50 px-4 py-5 sm:px-6 md:grid-cols-2 md:pl-[128px]">
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <Info label="Tipo">{capitalize(d.docType)}{d.number ? ` n. ${d.number}` : ""}</Info>
                        <Info label="Data documento">{formatDate(d.documentDate, "full")}</Info>
                        <Info label="Scadenza">{d.dueDate ? formatDate(d.dueDate, "full") : "—"}</Info>
                        <Info label="Natura">{NATURE_LABEL[d.nature]}</Info>
                        <Info label="Imponibile"><Money cents={d.netCents} /></Info>
                        <Info label={`IVA ${formatPercentBp(d.vatBp)}`}><Money cents={d.vatCents} /></Info>
                        {d.service ? <Info label="Servizio">{d.service === "generale" ? "Comune" : capitalize(d.service)}</Info> : null}
                        {d.event ? (
                          <Info label="Evento">
                            <Link href={`/eventi/${d.event.id}?tab=economica`} className="underline-offset-4 hover:underline">
                              {d.event.title}
                            </Link>
                          </Info>
                        ) : null}
                      </dl>
                      <div>
                        <p className="text-[13px] text-muted-foreground">Pagamenti</p>
                        {d.payments.length ? (
                          <ul className="mt-2 space-y-2 text-sm">
                            {d.payments.map((p) => (
                              <li key={p.id} className="flex items-center gap-3">
                                <PartnerAvatar partner={p.payer === "socio" ? L.partner(p.partnerId) : undefined} className="size-5 text-[9px]" />
                                <span className="flex-1">
                                  {formatDate(p.paidOn, "full")} · {p.method}
                                  {p.payer === "socio" ? (
                                    <span className="text-muted-foreground"> · {d.direction === "out" ? "anticipo" : "incassato da"} {L.partner(p.partnerId)?.name}</span>
                                  ) : null}
                                </span>
                                <Money cents={p.amountCents} />
                                {ds.currentUser.role !== "viewer" ? (
                                  <DeletePaymentButton
                                    id={p.id}
                                    summary={`${formatEuro(p.amountCents)} del ${formatDate(p.paidOn, "full")}`}
                                    byPartner={p.payer === "socio" ? L.partner(p.partnerId)?.name : undefined}
                                  />
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm">Nessun pagamento registrato.</p>
                        )}
                        <div className="mt-4 flex justify-end">
                          <DeleteDocumentButton id={d.id} description={d.description} hasPayments={d.payments.length > 0} />
                        </div>
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            title={f.q ? `Nessun documento per “${f.q}”` : "Nessun documento con questi filtri"}
            description="Togli un filtro o registra una nuova spesa: con la foto dello scontrino servono meno di 30 secondi."
          />
        )}
      </Panel>
      <p className="mt-3 text-[13px] text-muted-foreground">
        {docs.length} documenti · importi IVA inclusa · <AmountKind kind="effettivo" className="align-middle" /> = registrato su documenti o pagamenti reali
      </p>
    </>
  );
}

function Stat({ label, value, note, kind, warn }: { label: string; value: React.ReactNode; note: string; kind?: "effettivo"; warn?: boolean }) {
  return (
    <div className="border-line p-5 max-md:[&:nth-child(odd)]:border-r max-md:[&:nth-child(n+3)]:border-t md:max-xl:[&:not(:nth-child(3n))]:border-r md:max-xl:[&:nth-child(n+4)]:border-t xl:[&:not(:last-child)]:border-r">
      <dt className="flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
        {label}
        {kind ? <AmountKind kind={kind} /> : null}
      </dt>
      <dd className="mt-2 text-[22px] leading-7 font-semibold tracking-[-0.02em]">{value}</dd>
      <dd className={cn("mt-1 text-[13px]", warn ? "font-medium text-amber" : "text-muted-foreground")}>{note}</dd>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
