import { PageHeader } from "@/components/app/page-header";
import { AmountKind } from "@/components/domain/amount-kind";
import { FilterChips } from "@/components/domain/filter-chips";
import { Money } from "@/components/domain/money";
import { Panel, PanelHeader } from "@/components/domain/panel";
import { FinanceNav } from "@/components/finance/finance-nav";
import { getDataset } from "@/lib/data/source";
import { monthlyReport, totals } from "@/lib/domain/reports";
import { monthLabel } from "@/lib/format";

export const metadata = { title: "Report" };

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ anno?: string }> }) {
  const sp = await searchParams;
  const ds = await getDataset();
  const currentYear = Number(ds.today.slice(0, 4));
  const years = [...new Set(ds.documents.map((d) => Number(d.documentDate.slice(0, 4))))].concat(currentYear).filter((y, i, a) => a.indexOf(y) === i).sort((a, b) => b - a);
  const year = years.includes(Number(sp.anno)) ? Number(sp.anno) : currentYear;
  const to = year === currentYear ? ds.today : `${year}-12-31`;
  const rows = monthlyReport({ from: `${year}-01-01`, to, documents: ds.documents, payments: ds.payments, movements: ds.movements, vatMode: ds.vatMode });
  const t = totals(rows);

  return (
    <>
      <PageHeader title="Finanze" description="Report mensile e annuale: competenza (documenti) e cassa (pagamenti) in colonne separate." />
      <FinanceNav active="/finanze/report" />
      <FilterChips
        className="mb-5"
        label="Anno"
        chips={years.map((y) => ({ label: String(y), href: `/finanze/report?anno=${y}`, active: y === year }))}
      />
      <Panel className="overflow-hidden">
        <PanelHeader title={`Anno ${year}`} description="Ricavi e costi al netto dell'IVA; investimenti esclusi dal margine. La cassa conta solo il denaro dell'azienda, inclusi conferimenti e rimborsi ai soci." action={<AmountKind kind="effettivo" />} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-[15px]">
            <thead>
              <tr className="border-y border-line bg-paper/60 text-right text-[13px] text-muted-foreground">
                <th className="px-5 py-2.5 text-left font-normal sm:px-6">Mese</th>
                <th className="px-3 py-2.5 font-normal">Ricavi</th>
                <th className="px-3 py-2.5 font-normal">Costi</th>
                <th className="px-3 py-2.5 font-normal">Margine</th>
                <th className="px-3 py-2.5 font-normal">Investimenti</th>
                <th className="border-l border-line px-3 py-2.5 font-normal">Entrate cassa</th>
                <th className="px-3 py-2.5 font-normal">Uscite cassa</th>
                <th className="px-5 py-2.5 font-normal sm:px-6">Saldo cassa</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="border-b border-line/70 text-right">
                  <th scope="row" className="px-5 py-2.5 text-left font-normal capitalize sm:px-6">{monthLabel(r.month).split(" ")[0]}</th>
                  <td className="px-3 py-2.5"><Money cents={r.revenueCents} round /></td>
                  <td className="px-3 py-2.5"><Money cents={r.costCents} round /></td>
                  <td className="px-3 py-2.5 font-medium"><Money cents={r.marginCents} round /></td>
                  <td className="px-3 py-2.5"><Money cents={r.investmentCents} round muted /></td>
                  <td className="border-l border-line px-3 py-2.5"><Money cents={r.cashInCents} round /></td>
                  <td className="px-3 py-2.5"><Money cents={r.cashOutCents} round /></td>
                  <td className="px-5 py-2.5 sm:px-6"><Money cents={r.cashInCents - r.cashOutCents} round /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-right font-semibold">
                <th scope="row" className="px-5 py-3.5 text-left sm:px-6">Totale</th>
                <td className="px-3 py-3.5"><Money cents={t.revenueCents} round /></td>
                <td className="px-3 py-3.5"><Money cents={t.costCents} round /></td>
                <td className="px-3 py-3.5"><Money cents={t.marginCents} round /></td>
                <td className="px-3 py-3.5"><Money cents={t.investmentCents} round /></td>
                <td className="border-l border-line px-3 py-3.5"><Money cents={t.cashInCents} round /></td>
                <td className="px-3 py-3.5"><Money cents={t.cashOutCents} round /></td>
                <td className="px-5 py-3.5 sm:px-6"><Money cents={t.cashBalanceCents} round /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
      <p className="mt-3 max-w-[70ch] text-[13px] text-muted-foreground">
        Il margine non è l&apos;utile distribuibile: mancano ammortamenti, imposte e accantonamenti, da definire con il commercialista.
      </p>
    </>
  );
}
