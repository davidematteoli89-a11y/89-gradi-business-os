import { PageHeader } from "@/components/app/page-header";
import { Panel, PanelHeader } from "@/components/domain/panel";
import { PartnerAvatar } from "@/components/domain/partner-chip";
import { getDataset } from "@/lib/data/source";
import { sharesAt } from "@/lib/domain/partners";
import { formatDate, relativeTime } from "@/lib/format";
import { formatPercentBp } from "@/lib/money";

export const metadata = { title: "Impostazioni" };

const VAT_LABEL = { ordinario: "Regime ordinario", forfettario: "Regime forfettario", da_definire: "Da definire" } as const;
const NATURE = { evento: "Evento", generale: "Generale", ricorrente: "Ricorrente", investimento: "Investimento", marketing: "Marketing" } as const;

export default async function ImpostazioniPage() {
  const ds = await getDataset();
  const shares = sharesAt(ds.shares, ds.today);
  const isAdmin = ds.currentUser.role === "admin";

  return (
    <>
      <PageHeader title="Impostazioni" description={isAdmin ? "Regole economiche, soci, categorie e modelli." : "Solo un amministratore può modificare queste impostazioni."} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Soci e quote" description="Usate per ripartire l'utile stimato. Nessuna quota predefinita." />
          <ul className="mt-3 divide-y divide-line">
            {ds.partners.map((p) => {
              const s = shares?.find((x) => x.partnerId === p.id);
              return (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                  <PartnerAvatar partner={p} />
                  <span className="flex-1 text-[15px]">{p.name}</span>
                  <span className="tabular font-medium">{s ? formatPercentBp(s.shareBp) : "Non impostata"}</span>
                </li>
              );
            })}
          </ul>
          <p className="px-5 pt-1 pb-5 text-[13px] text-muted-foreground sm:px-6">
            {shares ? `Valide dal ${formatDate(shares[0].validFrom, "full")}. ` : ""}Una nuova ripartizione si registra con una data di inizio: lo storico resta.
          </p>
        </Panel>

        <Panel>
          <PanelHeader title="Regime IVA" description="Decide se i margini si calcolano sull'imponibile o sul totale." />
          <div className="p-5 sm:px-6">
            <p className="text-[17px] font-medium">{VAT_LABEL[ds.vatMode]}</p>
            <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
              {ds.vatMode === "da_definire"
                ? "Finché non è confermato con il commercialista, i margini sono mostrati al netto dell'IVA. Vedi docs/06-decisioni-da-confermare.md."
                : ds.vatMode === "forfettario"
                  ? "I costi contano al lordo perché l'IVA sugli acquisti non è recuperabile."
                  : "Margini sull'imponibile; l'IVA è un debito o credito verso l'Erario."}
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Categorie" description="Ogni categoria ha una natura che la colloca nei report." />
          <ul className="mt-3 divide-y divide-line">
            {ds.categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[15px] sm:px-6">
                <span>{c.name}</span>
                <span className="text-[13px] text-muted-foreground">
                  {c.direction === "in" ? "Entrata" : "Uscita"} · {NATURE[c.nature]}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel id="registro">
          <PanelHeader title="Registro modifiche" description="Ogni inserimento, modifica ed eliminazione, con autore. Non modificabile." />
          <ol className="mt-3 divide-y divide-line">
            {ds.activity.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3 text-sm sm:px-6">
                <PartnerAvatar partner={ds.partners.find((p) => p.id === a.actorPartnerId)} className="size-5 text-[9px]" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-muted-foreground">{a.entity} {a.action}:</span> {a.summary}
                </span>
                <span className="shrink-0 text-[13px] text-muted-foreground">{relativeTime(a.at)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}
