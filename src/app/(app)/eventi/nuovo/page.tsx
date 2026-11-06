import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/domain/panel";
import { EventForm } from "@/components/events/event-form";
import { getDataset } from "@/lib/data/source";

export const metadata = { title: "Nuovo evento" };

export default async function NewEventPage() {
  const ds = await getDataset();
  return (
    <>
      <Link href="/eventi" className="-ml-1 inline-flex h-9 items-center gap-1 rounded-md pr-2 text-sm text-muted-foreground hover:text-ink">
        <ChevronLeft className="size-4" /> Eventi
      </Link>
      <PageHeader title="Nuovo evento" description="Bastano nome, cliente e data: il resto si completa strada facendo." className="mt-2" />
      <Panel className="max-w-3xl p-5 sm:p-7">
        <EventForm today={ds.today} templates={[{ id: "", name: "Nessuna" }, ...ds.checklistTemplates]} />
      </Panel>
    </>
  );
}
