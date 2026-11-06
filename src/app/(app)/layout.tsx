import { AppShell } from "@/components/app/app-shell";
import { Unconfigured } from "@/components/app/unconfigured";
import { dataMode, getDataset } from "@/lib/data/source";
import { documentsWithBalance, lookup, searchIndex } from "@/lib/data/queries";

const ROLE_LABEL = { admin: "Amministratore", editor: "Può modificare", viewer: "Sola lettura" } as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (dataMode() === "unconfigured") return <Unconfigured />;
  const ds = await getDataset();
  const L = lookup(ds);

  const selectableEvents = ds.events
    .filter((e) => e.status !== "annullato")
    .sort((a, b) => Math.abs(Date.parse(a.date) - Date.parse(ds.today)) - Math.abs(Date.parse(b.date) - Date.parse(ds.today)))
    .slice(0, 20)
    .map(({ id, title, date }) => ({ id, title, date }));

  const receivables = documentsWithBalance(ds)
    .filter((d) => d.direction === "in" && d.balance.residualCents > 0)
    .map((d) => ({
      id: d.id,
      label: `${d.description}${d.contactId ? ` — ${L.contact(d.contactId)?.name ?? ""}` : ""}`,
      residualCents: d.balance.residualCents,
      totalCents: d.totalCents,
    }));

  return (
    <AppShell
      demo={ds.mode === "demo"}
      userName={ds.currentUser.name}
      roleLabel={ROLE_LABEL[ds.currentUser.role]}
      searchIndex={searchIndex(ds)}
      quickAddData={{
        today: ds.today,
        categories: ds.categories,
        partners: ds.partners,
        currentPartnerId: ds.currentUser.partnerId,
        events: selectableEvents,
        receivables,
      }}
    >
      {children}
    </AppShell>
  );
}
