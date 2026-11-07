import { PageHeader } from "@/components/app/page-header";
import { AmountKind } from "@/components/domain/amount-kind";
import { Money } from "@/components/domain/money";
import { EmptyState, Panel, PanelHeader } from "@/components/domain/panel";
import { PartnerAvatar } from "@/components/domain/partner-chip";
import { FinanceNav } from "@/components/finance/finance-nav";
import { PartnerMovementDialog } from "@/components/finance/partner-movement";
import { DeleteMovementButton } from "@/components/finance/delete-movement";
import Link from "next/link";
import { getDataset } from "@/lib/data/source";
import { partnersOverview } from "@/lib/data/queries";
import { EQUILIBRIUM_LABELS, MOVEMENT_LABELS, suggestSettlement } from "@/lib/domain/partners";
import { SettleButton } from "@/components/finance/settle-button";
import { capitalize, formatDate } from "@/lib/format";
import { formatEuro, formatPercentBp } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Conti soci" };

export default async function SociPage({ searchParams }: { searchParams: Promise<{ conto?: string }> }) {
  const sp = await searchParams;
  const conto = sp.conto === "capitale" ? "capitale" : "finanziamento";
  const ds = await getDataset();
  const o = partnersOverview(ds);
  const canEdit = ds.currentUser.role !== "viewer";
  const settlement = suggestSettlement(
    o.partners.map((p) => p.balance),
    ds.today,
  );

  return (
    <>
      <PageHeader
        title="Finanze"
        description="Chi ha anticipato cosa, cosa deve l'azienda a ciascun socio e cosa ha conferito."
        actions={<PartnerMovementDialog partners={ds.partners} today={ds.today} />}
      />
      <FinanceNav active="/finanze/soci" />

      <div className="grid gap-5 md:grid-cols-2">
        {o.partners.map(({ partner, balance }) => (
          <Panel key={partner.id} className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <PartnerAvatar partner={partner} className="size-9 text-sm" />
              <div>
                <p className="text-[17px] font-semibold">{partner.name}</p>
                <p className="text-[13px] text-muted-foreground">
                  Quota {o.shares ? formatPercentBp(o.shares.find((s) => s.partnerId === partner.id)?.shareBp ?? 0) : "non impostata"}
                </p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-[13px] text-muted-foreground">L&apos;azienda gli deve</dt>
                <dd className={cn("mt-1 text-[28px] leading-9 font-semibold tracking-[-0.02em]")}>
                  <Money cents={balance.financingCents} />
                </dd>
                <dd className="mt-1 text-[13px] text-muted-foreground">
                  {balance.financingCents < 0 ? "Negativo: il socio deve all'azienda" : "Conto finanziamento, rimborsabile"}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted-foreground">Investito (capitale)</dt>
                <dd className="mt-1 text-[28px] leading-9 font-semibold tracking-[-0.02em]">
                  <Money cents={balance.capitalCents} />
                </dd>
                <dd className="mt-1 text-[13px] text-muted-foreground">Denaro e apporti non monetari</dd>
              </div>
            </dl>
            <p className="mt-5 border-t border-line pt-4 text-sm text-muted-foreground">
              Spese anticipate in totale <Money cents={balance.advancesCents} className="font-medium text-ink" />
            </p>
          </Panel>
        ))}
      </div>

      <Panel className="mt-5 overflow-hidden">
        <PanelHeader
          title="Equilibrio tra i soci"
          description="Tutto quello che ciascuno ha messo nell'attività, meno quello che ha ricevuto indietro, confrontato con la sua quota."
          action={<AmountKind kind="effettivo" />}
        />
        {o.overall && o.overall.totalCents !== 0 ? (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-[15px]">
                <thead>
                  <tr className="border-y border-line bg-paper/60 text-right text-[13px] text-muted-foreground">
                    <th className="px-5 py-2.5 text-left font-normal sm:px-6">Cosa ha messo</th>
                    {o.overall.partners.map((r) => (
                      <th key={r.partnerId} className="px-5 py-2.5 font-normal sm:px-6">
                        <span className="inline-flex items-center gap-2">
                          <PartnerAvatar partner={ds.partners.find((p) => p.id === r.partnerId)} className="size-5 text-[9px]" />
                          {ds.partners.find((p) => p.id === r.partnerId)?.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(EQUILIBRIUM_LABELS) as (keyof typeof EQUILIBRIUM_LABELS)[])
                    .filter((g) => o.overall!.partners.some((r) => r.groups[g] !== 0))
                    .map((g) => (
                      <tr key={g} className="border-b border-line/70 text-right">
                        <th scope="row" className="px-5 py-2.5 text-left font-normal text-muted-foreground sm:px-6">
                          {EQUILIBRIUM_LABELS[g]}
                        </th>
                        {o.overall!.partners.map((r) => (
                          <td key={r.partnerId} className="px-5 py-2.5 sm:px-6">
                            {r.groups[g] ? <Money cents={r.groups[g]} /> : <span className="text-muted-foreground">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  <tr className="border-b border-line text-right font-semibold">
                    <th scope="row" className="px-5 py-3 text-left sm:px-6">Totale messo</th>
                    {o.overall.partners.map((r) => (
                      <td key={r.partnerId} className="px-5 py-3 sm:px-6"><Money cents={r.netCents} /></td>
                    ))}
                  </tr>
                  <tr className="border-b border-line/70 text-right">
                    <th scope="row" className="px-5 py-2.5 text-left font-normal text-muted-foreground sm:px-6">
                      Sua parte del totale (<Money cents={o.overall.totalCents} />)
                    </th>
                    {o.overall.partners.map((r) => (
                      <td key={r.partnerId} className="px-5 py-2.5 sm:px-6">
                        <Money cents={r.fairCents} /> <span className="text-[13px] text-muted-foreground">{formatPercentBp(r.shareBp, 0)}</span>
                      </td>
                    ))}
                  </tr>
                  <tr className="text-right">
                    <th scope="row" className="px-5 py-3 text-left font-medium sm:px-6">Differenza</th>
                    {o.overall.partners.map((r) => (
                      <td key={r.partnerId} className={`px-5 py-3 font-semibold sm:px-6 ${r.deltaCents > 0 ? "text-olive" : r.deltaCents < 0 ? "text-amber" : ""}`}>
                        <Money cents={r.deltaCents} sign />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="m-5 rounded-[14px] bg-paper p-4 sm:mx-6">
              {o.overall.transfers.length === 0 ? (
                <p className="text-[15px]">Siete in pari: ognuno ha messo esattamente la sua parte.</p>
              ) : (
                <ul className="space-y-3">
                  {o.overall.transfers.map((t) => {
                    const from = ds.partners.find((p) => p.id === t.fromPartnerId)!;
                    const to = ds.partners.find((p) => p.id === t.toPartnerId)!;
                    return (
                      <li key={`${t.fromPartnerId}-${t.toPartnerId}`} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[15px]">
                          <span className="font-medium">{to.name}</span> ha coperto <Money cents={t.amountCents} className="font-semibold" /> della
                          parte di <span className="font-medium">{from.name}</span>. Per pareggiare, {from.name} può dargli{" "}
                          <Money cents={t.amountCents} className="font-semibold" />, oppure mettere{" "}
                          <Money cents={t.amountCents * 2} className="font-semibold" /> nell&apos;attività.
                        </p>
                        {canEdit ? (
                          <SettleButton
                            fromId={from.id}
                            fromName={from.name}
                            toId={to.id}
                            toName={to.name}
                            amountCents={t.amountCents}
                            today={ds.today}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="px-5 pb-5 text-[13px] text-muted-foreground sm:px-6">
              Le spese pagate di tasca propria contano finché l&apos;azienda non le rimborsa; i rimborsi ricevuti le riducono. Gli apporti non monetari
              valgono quanto concordato tra voi.
            </p>
          </>
        ) : (
          <EmptyState
            title={o.shares ? "Ancora niente da confrontare" : "Quote dei soci non impostate"}
            description={
              o.shares
                ? "Quando un socio paga una spesa, investe denaro o registra un apporto, qui vedi chi sta coprendo la parte dell'altro."
                : "Imposta le quote in Impostazioni per vedere l'equilibrio tra i soci."
            }
          />
        )}
      </Panel>

      <Panel className="mt-5">
        <PanelHeader
          title="Riconciliazione"
          description="Movimenti suggeriti per azzerare il conto finanziamento. Si registrano solo quando li confermi."
        />
        {settlement.length ? (
          <ul className="mt-3 divide-y divide-line">
            {settlement.map((s) => (
              <li key={s.partnerId} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                <PartnerAvatar partner={ds.partners.find((p) => p.id === s.partnerId)} />
                <span className="flex-1 text-[15px]">
                  {s.type === "rimborso" ? "Rimborsare a" : "Versamento da"} {ds.partners.find((p) => p.id === s.partnerId)?.name}
                </span>
                <Money cents={s.amountCents} className="font-medium" />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Conti in pari" description="Nessun socio ha crediti o debiti verso l'azienda." />
        )}
      </Panel>

      <div className="mt-8 mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold">Estratto conto</h2>
        <nav aria-label="Conto" className="inline-flex rounded-[12px] bg-sand p-1 text-sm">
          {(["finanziamento", "capitale"] as const).map((c) => (
            <a
              key={c}
              href={c === "finanziamento" ? "/finanze/soci" : "/finanze/soci?conto=capitale"}
              aria-current={conto === c ? "page" : undefined}
              className={cn("rounded-[9px] px-3.5 py-1.5", conto === c ? "bg-ivory font-medium shadow-[0_1px_2px_rgb(36_33_31/0.08)]" : "text-ash")}
            >
              {capitalize(c)}
            </a>
          ))}
        </nav>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {o.partners.map(({ partner, financing, capital }) => {
          const rows = conto === "finanziamento" ? financing : capital;
          return (
            <Panel key={partner.id} className="overflow-hidden">
              <PanelHeader title={partner.name} description={`${rows.length} movimenti, dal più recente`} action={<AmountKind kind="effettivo" />} />
              {rows.length ? (
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-y border-line bg-paper/60 text-left text-[13px] text-muted-foreground">
                      <th className="px-5 py-2 font-normal sm:px-6">Movimento</th>
                      <th className="px-2 py-2 text-right font-normal">Importo</th>
                      <th className="px-2 py-2 text-right font-normal">Saldo</th>
                      <th className="w-12 pr-3"><span className="sr-only">Azioni</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-line/70 last:border-0">
                        <td className="px-5 py-2.5 sm:px-6">
                          <span className="block">{MOVEMENT_LABELS[r.kind]}</span>
                          <span className="block text-[13px] text-muted-foreground">
                            {formatDate(r.date, "full")} · {r.description}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          <Money cents={r.amountCents} sign />
                        </td>
                        <td className="px-2 py-2.5 text-right font-medium">
                          <Money cents={r.runningCents} />
                        </td>
                        <td className="pr-3 text-right">
                          {r.source.type === "movement" ? (
                            canEdit ? (
                              <DeleteMovementButton
                                id={r.source.movementId}
                                label={MOVEMENT_LABELS[r.kind]}
                                amount={formatEuro(Math.abs(r.amountCents))}
                                pair={r.kind === "compensazione" || r.kind === "conversione_in_capitale"}
                              />
                            ) : null
                          ) : (
                            <Link
                              href={`/finanze?q=${encodeURIComponent(r.description)}`}
                              title="Nasce da un pagamento: si modifica o elimina dalla spesa o dall'incasso"
                              className="text-[12px] text-muted-foreground underline-offset-4 hover:underline"
                            >
                              Spesa
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="Nessun movimento" description="I pagamenti fatti da questo socio compariranno qui automaticamente." />
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
