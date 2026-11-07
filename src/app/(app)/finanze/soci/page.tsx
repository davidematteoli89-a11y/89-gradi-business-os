import { PageHeader } from "@/components/app/page-header";
import { AmountKind } from "@/components/domain/amount-kind";
import { Money } from "@/components/domain/money";
import { EmptyState, Panel, PanelHeader } from "@/components/domain/panel";
import { PartnerAvatar } from "@/components/domain/partner-chip";
import { FinanceNav } from "@/components/finance/finance-nav";
import { PartnerMovementDialog } from "@/components/finance/partner-movement";
import { getDataset } from "@/lib/data/source";
import { partnersOverview } from "@/lib/data/queries";
import { MOVEMENT_LABELS, suggestSettlement } from "@/lib/domain/partners";
import { capitalize, formatDate } from "@/lib/format";
import { formatEuro, formatPercentBp } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Conti soci" };

export default async function SociPage({ searchParams }: { searchParams: Promise<{ conto?: string }> }) {
  const sp = await searchParams;
  const conto = sp.conto === "capitale" ? "capitale" : "finanziamento";
  const ds = await getDataset();
  const o = partnersOverview(ds);
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

      <Panel className="mt-5">
        <PanelHeader
          title="Equilibrio degli investimenti"
          description="Quanto ha messo ciascun socio rispetto alla sua quota: denaro, apporti non monetari e crediti rinunciati."
          action={<AmountKind kind="effettivo" />}
        />
        {o.equilibrium && o.breakdown.some((b) => b.netCents !== 0) ? (
          <div className="p-5 sm:px-6">
            {(() => {
              const max = Math.max(...o.breakdown.map((b) => b.cashCents + b.nonCashCents + b.convertedCents), 1);
              return (
                <ul className="space-y-5">
                  {o.breakdown.map((b) => {
                    const p = ds.partners.find((x) => x.id === b.partnerId)!;
                    const eq = o.equilibrium!.find((e) => e.partnerId === b.partnerId)!;
                    const seg = [
                      { label: "Denaro", v: b.cashCents, cls: "bg-ink" },
                      { label: "Apporti non monetari", v: b.nonCashCents, cls: "bg-brand" },
                      { label: "Crediti rinunciati", v: b.convertedCents, cls: "bg-ash/60" },
                    ];
                    return (
                      <li key={b.partnerId}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="inline-flex items-center gap-2 text-[15px] font-medium">
                            <PartnerAvatar partner={p} className="size-5 text-[9px]" /> {p.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            <Money cents={b.netCents} className="font-medium text-ink" /> · {formatPercentBp(eq.actualShareBp, 0)} del totale, quota{" "}
                            {formatPercentBp(eq.shareBp, 0)}
                          </span>
                        </div>
                        <div className="mt-2 flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-sand" role="img" aria-label={seg.map((x) => `${x.label} ${formatEuro(x.v)}`).join(", ")}>
                          {seg.filter((x) => x.v > 0).map((x) => (
                            <span key={x.label} className={x.cls} style={{ width: `${(x.v / max) * 100}%` }} />
                          ))}
                        </div>
                        <p className="mt-1.5 flex flex-wrap gap-x-4 text-[13px] text-muted-foreground">
                          {seg.map((x) => (
                            <span key={x.label}>
                              {x.label} <Money cents={x.v} round />
                            </span>
                          ))}
                          {b.withdrawnCents ? <span>Prelievi −<Money cents={b.withdrawnCents} round /></span> : null}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
            <div className="mt-6 rounded-[14px] bg-paper p-4 text-[15px]">
              {o.equilibrium.every((e) => e.toLevelCents === 0) ? (
                <p>I soci sono in pari rispetto alle quote.</p>
              ) : (
                o.equilibrium
                  .filter((e) => e.toLevelCents > 0)
                  .map((e) => (
                    <p key={e.partnerId}>
                      Per pareggiare, <span className="font-medium">{ds.partners.find((x) => x.id === e.partnerId)?.name}</span> dovrebbe apportare
                      ancora <Money cents={e.toLevelCents} className="font-semibold" />, in denaro o con apporti non monetari.
                    </p>
                  ))
              )}
            </div>
            <div className="mt-3 flex items-center gap-4 text-[12px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-ink" /> Denaro</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand" /> Apporti non monetari</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-ash/60" /> Crediti rinunciati</span>
            </div>
          </div>
        ) : (
          <EmptyState
            title={o.shares ? "Nessun investimento registrato" : "Quote dei soci non impostate"}
            description={
              o.shares
                ? "Registra conferimenti in denaro, apporti non monetari o crediti convertiti con “Movimento socio”."
                : "Imposta le quote in Impostazioni per vedere chi è in pari."
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
                      <th className="px-5 py-2 text-right font-normal sm:px-6">Saldo</th>
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
                        <td className="px-5 py-2.5 text-right font-medium sm:px-6">
                          <Money cents={r.runningCents} />
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
