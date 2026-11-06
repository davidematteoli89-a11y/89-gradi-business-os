import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { MonthlyChart } from "@/components/analysis/monthly-chart";
import { AmountKind } from "@/components/domain/amount-kind";
import { FilterChips } from "@/components/domain/filter-chips";
import { Money } from "@/components/domain/money";
import { EmptyState, Panel, PanelHeader } from "@/components/domain/panel";
import { PartnerAvatar } from "@/components/domain/partner-chip";
import { getDataset } from "@/lib/data/source";
import { addDays, economicsFor, ledger, lookup } from "@/lib/data/queries";
import { partnerBalances } from "@/lib/domain/partners";
import { serviceMarginsWithSharedCosts } from "@/lib/domain/events";
import { monthlyReport, totals } from "@/lib/domain/reports";
import { formatDateSmart, monthLabel } from "@/lib/format";
import { formatPercentBp, sumCents } from "@/lib/money";

export const metadata = { title: "Analisi" };

const PERIODS = {
  anno: "Anno in corso",
  "12m": "Ultimi 12 mesi",
  tutto: "Dall'inizio",
} as const;

export default async function AnalisiPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const sp = await searchParams;
  const periodo = (sp.periodo && sp.periodo in PERIODS ? sp.periodo : "anno") as keyof typeof PERIODS;
  const ds = await getDataset();
  const L = lookup(ds);
  const earliest = [...ds.documents.map((d) => d.documentDate), ds.today].sort()[0];
  const from = periodo === "anno" ? `${ds.today.slice(0, 4)}-01-01` : periodo === "12m" ? `${addDays(ds.today, -365).slice(0, 7)}-01` : `${earliest.slice(0, 7)}-01`;
  const rows = monthlyReport({ from, to: ds.today, documents: ds.documents, payments: ds.payments, movements: ds.movements, vatMode: ds.vatMode });
  const t = totals(rows);

  const inPeriod = ds.events.filter((e) => e.date >= from && e.status !== "annullato");
  const evRows = inPeriod
    .map((e) => {
      const econ = economicsFor(ds, e.id);
      const done = e.status === "completato";
      return { e, done, block: done ? econ.actual : econ.forecast, kind: done ? ("effettivo" as const) : econ.forecast.hasEstimates ? ("stimato" as const) : ("previsto" as const) };
    })
    .filter((r) => r.block.revenue.total > 0)
    .sort((a, b) => a.e.date.localeCompare(b.e.date));

  const doneRows = evRows.filter((r) => r.done);
  const svc = doneRows.reduce(
    (acc, r) => {
      const m = serviceMarginsWithSharedCosts(r.block);
      acc.pizzaRev += r.block.revenue.pizza;
      acc.cocktailRev += r.block.revenue.cocktail;
      acc.pizza += m.pizza;
      acc.cocktail += m.cocktail;
      return acc;
    },
    { pizzaRev: 0, cocktailRev: 0, pizza: 0, cocktail: 0 },
  );
  const balances = partnerBalances(ds.partners.map((p) => p.id), ledger(ds));
  const investments = ds.documents.filter((d) => d.nature === "investimento");

  return (
    <>
      <PageHeader title="Analisi" description="Ricavi, costi e margini. Ogni numero dichiara se è effettivo, previsto o stimato." />
      <FilterChips
        className="mb-6"
        label="Periodo"
        chips={Object.entries(PERIODS).map(([k, v]) => ({ label: v, href: k === "anno" ? "/analisi" : `/analisi?periodo=${k}`, active: periodo === k }))}
      />

      <Panel>
        <PanelHeader
          title="Andamento mensile"
          description={`Competenza, al netto dell'IVA · ${monthLabel(from.slice(0, 7))} – ${monthLabel(ds.today.slice(0, 7))}`}
          action={<AmountKind kind="effettivo" />}
        />
        <div className="px-3 pt-4 pb-2 sm:px-5">
          <MonthlyChart data={rows.map((r) => ({ mese: monthLabel(r.month, true), ricavi: r.revenueCents, costi: r.costCents }))} />
        </div>
        <dl className="grid grid-cols-2 border-t border-line sm:grid-cols-4">
          {[
            ["Ricavi", t.revenueCents],
            ["Costi", t.costCents],
            ["Margine", t.marginCents],
            ["Saldo di cassa nel periodo", t.cashBalanceCents],
          ].map(([label, v], i) => (
            <div key={label} className={`p-5 ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "max-sm:border-b" : ""} sm:[&:not(:last-child)]:border-r border-line`}>
              <dt className="text-[13px] text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-[22px] font-semibold tracking-[-0.02em]"><Money cents={v as number} round /></dd>
            </div>
          ))}
        </dl>
      </Panel>
      <p className="mt-2 text-sm text-muted-foreground">
        I dati del grafico in tabella sono nel{" "}
        <Link href="/finanze/report" className="text-ink underline underline-offset-4 hover:text-brand">report mensile</Link>.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Pizza e cocktail bar" description="Eventi completati nel periodo · costi comuni ripartiti sui ricavi" action={<AmountKind kind="stimato" />} />
          {doneRows.length ? (
            <dl className="grid grid-cols-2 gap-4 p-5 sm:px-6">
              {[
                ["Pizza", svc.pizzaRev, svc.pizza],
                ["Cocktail bar", svc.cocktailRev, svc.cocktail],
              ].map(([label, rev, m]) => (
                <div key={label as string} className="rounded-[14px] bg-paper p-4">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-[22px] font-semibold"><Money cents={m as number} round /></dd>
                  <dd className="text-[13px] text-muted-foreground">
                    margine su <Money cents={rev as number} round /> di ricavi
                    {(rev as number) > 0 ? ` · ${formatPercentBp(Math.round(((m as number) * 10000) / (rev as number)), 0)}` : ""}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <EmptyState title="Nessun evento completato nel periodo" />
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Investimenti e soci" action={<AmountKind kind="effettivo" />} />
          <dl className="divide-y divide-line px-5 py-2 sm:px-6">
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm text-muted-foreground">Investimenti iniziali ({investments.length})</dt>
              <dd className="text-[15px] font-medium"><Money cents={sumCents(investments.map((d) => d.totalCents))} /></dd>
            </div>
            {balances.map((b) => (
              <div key={b.partnerId} className="flex items-center justify-between py-3">
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                  <PartnerAvatar partner={L.partner(b.partnerId)} className="size-5 text-[9px]" />
                  Anticipi da rimborsare a {L.partner(b.partnerId)?.name}
                </dt>
                <dd className="text-[15px] font-medium"><Money cents={b.financingCents} /></dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <Panel className="mt-5 overflow-hidden">
        <PanelHeader title="Margine per evento" description="Completati: dai documenti. Futuri: dal preventivo e dai costi previsti." />
        {evRows.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-[15px]">
              <thead>
                <tr className="border-y border-line bg-paper/60 text-right text-[13px] text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-normal sm:px-6">Evento</th>
                  <th className="px-3 py-2.5 text-left font-normal">Tipo di dato</th>
                  <th className="px-3 py-2.5 font-normal">Ricavi</th>
                  <th className="px-3 py-2.5 font-normal">Costi</th>
                  <th className="px-3 py-2.5 font-normal">Margine</th>
                  <th className="px-5 py-2.5 font-normal sm:px-6">%</th>
                </tr>
              </thead>
              <tbody>
                {evRows.map(({ e, block, kind }) => (
                  <tr key={e.id} className="border-b border-line/70 text-right last:border-0">
                    <td className="px-5 py-2.5 text-left sm:px-6">
                      <Link href={`/eventi/${e.id}?tab=economica`} className="hover:underline">{e.title}</Link>
                      <span className="block text-[13px] text-muted-foreground">{formatDateSmart(e.date, ds.today)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-left"><AmountKind kind={kind} /></td>
                    <td className="px-3 py-2.5"><Money cents={block.revenue.total} round /></td>
                    <td className="px-3 py-2.5">{block.costs.total ? <Money cents={block.costs.total} round /> : <span className="text-muted-foreground">da stimare</span>}</td>
                    <td className="px-3 py-2.5 font-medium">{block.costs.total ? <Money cents={block.marginCents} round /> : "—"}</td>
                    <td className="tabular px-5 py-2.5 sm:px-6">{block.costs.total && block.marginBp !== null ? formatPercentBp(block.marginBp, 0) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nessun evento con ricavi nel periodo" />
        )}
      </Panel>
    </>
  );
}
