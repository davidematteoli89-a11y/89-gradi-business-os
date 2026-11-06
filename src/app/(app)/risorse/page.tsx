import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { FilterChips } from "@/components/domain/filter-chips";
import { EmptyState, Panel, PanelHeader } from "@/components/domain/panel";
import { getDataset } from "@/lib/data/source";
import { daysBetween, lookup } from "@/lib/data/queries";
import { capitalize, formatDate, relativeDay } from "@/lib/format";

export const metadata = { title: "Risorse" };

const TABS = { fornitori: "Fornitori", collaboratori: "Collaboratori", attrezzature: "Attrezzature e materiali" } as const;

export default async function RisorsePage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const sp = await searchParams;
  const vista = (sp.vista && sp.vista in TABS ? sp.vista : "attrezzature") as keyof typeof TABS;
  const ds = await getDataset();
  const L = lookup(ds);

  const upcoming = ds.events
    .filter((e) => e.date >= ds.today && e.status !== "annullato" && ds.eventResources.some((r) => r.eventId === e.id))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <>
      <PageHeader title="Risorse" description="Fornitori, collaboratori, attrezzature e materiali. Le assegnazioni si fanno nella scheda di ogni evento." />

      <Panel className="mb-6">
        <PanelHeader title="Prossimi carichi" description="Cosa deve uscire dal magazzino per i prossimi eventi" />
        {upcoming.length ? (
          <ul className="mt-3 grid gap-px bg-line sm:grid-cols-3">
            {upcoming.map((e) => {
              const items = ds.eventResources.filter((r) => r.eventId === e.id);
              const loaded = items.filter((i) => i.loaded).length;
              return (
                <li key={e.id} className="bg-ivory">
                  <Link href={`/eventi/${e.id}?tab=organizzazione`} className="block h-full p-5 hover:bg-paper/60 sm:px-6">
                    <p className="text-[13px] text-muted-foreground">{capitalize(relativeDay(daysBetween(ds.today, e.date)))} · {formatDate(e.date)}</p>
                    <p className="mt-0.5 font-medium">{e.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {items.length} voci · caricate {loaded}/{items.length}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Nessun carico in programma" />
        )}
      </Panel>

      <FilterChips
        className="mb-5"
        label="Vista"
        chips={Object.entries(TABS).map(([k, v]) => ({ label: v, href: `/risorse?vista=${k}`, active: vista === k }))}
      />

      <Panel className="overflow-hidden">
        {vista === "attrezzature" ? (
          <ul className="divide-y divide-line">
            {ds.resources.map((r) => {
              const next = ds.eventResources
                .filter((er) => er.resourceId === r.id)
                .map((er) => L.event(er.eventId))
                .filter((e) => e && e.date >= ds.today)
                .sort((a, b) => a!.date.localeCompare(b!.date))[0];
              return (
                <li key={r.id} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px]">{r.name}</span>
                    <span className="text-[13px] text-muted-foreground capitalize">
                      {r.kind} · unità {r.unit}
                      {r.supplierId ? ` · ${L.contact(r.supplierId)?.name}` : ""}
                    </span>
                  </span>
                  <span className="text-right text-[13px] text-muted-foreground">{next ? `Prossimo uso: ${next.title}` : "Libero"}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="divide-y divide-line">
            {ds.contacts
              .filter((c) => c.kind === (vista === "fornitori" ? "fornitore" : "collaboratore"))
              .map((c) => {
                const spent = ds.documents.filter((d) => d.contactId === c.id && d.direction === "out").length;
                return (
                  <li key={c.id} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px]">{c.name}</span>
                      <span className="text-[13px] text-muted-foreground">{c.company ?? c.notes ?? c.phone ?? ""}</span>
                    </span>
                    <Link href={`/finanze?q=${encodeURIComponent(c.name)}`} className="text-[13px] text-muted-foreground hover:text-ink">
                      {spent} documenti
                    </Link>
                  </li>
                );
              })}
          </ul>
        )}
      </Panel>
      <p className="mt-3 max-w-[70ch] text-[13px] text-muted-foreground">
        Volutamente niente giacenze di magazzino: listini e quantità servono a preparare i carichi degli eventi, non a tenere un inventario.
      </p>
    </>
  );
}
