import { NextResponse, type NextRequest } from "next/server";
import { getDataset } from "@/lib/data/source";
import { listDocuments, type FinanceFilter } from "@/lib/data/queries";
import { centsToCsv, toCsv } from "@/lib/domain/reports";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const ds = await getDataset();
  const f: FinanceFilter = {
    tipo: (sp.get("tipo") as FinanceFilter["tipo"]) ?? undefined,
    stato: (sp.get("stato") as FinanceFilter["stato"]) ?? undefined,
    natura: sp.get("natura") ?? undefined,
    mese: sp.get("mese") ?? undefined,
    q: sp.get("q") ?? undefined,
  };
  const docs = listDocuments(ds, f);
  const csv = toCsv(
    ["Tipo", "Data documento", "Scadenza", "Numero", "Descrizione", "Controparte", "Categoria", "Natura", "Evento", "Servizio", "Imponibile", "Aliquota IVA %", "IVA", "Totale", "Pagato", "Residuo", "Stato", "Ultimo pagamento", "Pagato da"],
    docs.map((d) => [
      d.direction === "in" ? "Entrata" : "Uscita",
      d.documentDate,
      d.dueDate ?? "",
      d.number ?? "",
      d.description,
      d.contact?.name ?? "",
      d.category?.name ?? "",
      d.nature,
      d.event?.title ?? "",
      d.service ?? "",
      centsToCsv(d.netCents),
      (d.vatBp / 100).toString().replace(".", ","),
      centsToCsv(d.vatCents),
      centsToCsv(d.totalCents),
      centsToCsv(d.balance.paidCents),
      centsToCsv(d.balance.residualCents),
      d.balance.state,
      d.payments.at(-1)?.paidOn ?? "",
      [...new Set(d.payments.map((p) => (p.payer === "socio" ? ds.partners.find((x) => x.id === p.partnerId)?.name : "Azienda")))].join(", "),
    ]),
  );
  const name = `89gradi-documenti-${ds.today}${ds.mode === "demo" ? "-DEMO" : ""}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
