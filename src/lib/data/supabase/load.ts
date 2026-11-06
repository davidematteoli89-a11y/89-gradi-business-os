import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Dataset } from "../demo/dataset";
import type {
  ActivityEntry,
  EventRecord,
  FinDocument,
  MarketingTask,
  Payment,
  Quote,
  VatMode,
} from "@/lib/domain/types";

/* eslint-disable @typescript-eslint/no-explicit-any -- righe grezze da PostgREST, mappate qui sotto */

const num = (v: unknown) => (v == null ? 0 : Number(v));
const opt = <T,>(v: T | null | undefined) => (v == null ? undefined : v);
const hhmm = (v: string | null) => (v ? v.slice(0, 5) : undefined);

/**
 * Carica i dati dell'attività con la sessione dell'utente (RLS applicata).
 * Per una realtà di due soci i volumi sono piccoli: un'unica lettura per richiesta
 * permette di riusare gli stessi calcoli puri della modalità demo.
 * Quando i volumi cresceranno, le liste passeranno a query paginate dedicate.
 */
export async function loadSupabaseDataset(): Promise<Dataset> {
  const sb = await createSupabaseServerClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  const q = async (table: string, select = "*") => {
    const { data, error } = await sb.from(table).select(select);
    if (error) throw new Error(`Lettura ${table} non riuscita: ${error.message}`);
    return (data ?? []) as any[];
  };

  const [
    settings, partners, shares, categories, contacts, events, quotes, quoteLines, budget, documents, payments,
    movements, tasks, staff, resources, eventResources, campaigns, marketing, attachments, audit, appUsers, templates,
  ] = await Promise.all([
    q("g89_settings"), q("g89_partners"), q("g89_partner_shares"), q("g89_categories"), q("g89_contacts"), q("g89_events"),
    q("g89_event_quotes"), q("g89_event_quote_lines"), q("g89_event_budget_lines"), q("g89_fin_documents"), q("g89_fin_payments"),
    q("g89_partner_movements"), q("g89_event_tasks"), q("g89_event_staff"), q("g89_resources"), q("g89_event_resources"),
    q("g89_campaigns"), q("g89_marketing_tasks"), q("g89_attachments", "entity, entity_id, version"),
    sb.from("g89_audit_log").select("*").order("at", { ascending: false }).limit(20).then((r) => (r.data ?? []) as any[]),
    q("g89_app_users"),
    q("g89_checklist_templates"),
  ]);

  const attachCount = new Map<string, { n: number; v: number }>();
  for (const a of attachments) {
    const cur = attachCount.get(a.entity_id) ?? { n: 0, v: 0 };
    attachCount.set(a.entity_id, { n: cur.n + 1, v: Math.max(cur.v, a.version) });
  }

  const userPartner = new Map(appUsers.map((u) => [u.user_id, u.partner_id]));
  const linesByQuote = new Map<string, any[]>();
  for (const l of quoteLines) linesByQuote.set(l.quote_id, [...(linesByQuote.get(l.quote_id) ?? []), l]);

  const ACTION: Record<string, ActivityEntry["action"]> = { insert: "creato", update: "modificato", delete: "eliminato" };
  const ENTITY: Record<string, [string, string]> = {
    g89_fin_documents: ["Documento", "/finanze"],
    g89_fin_payments: ["Pagamento", "/finanze"],
    g89_events: ["Evento", "/eventi"],
    g89_event_quotes: ["Preventivo", "/eventi"],
    g89_marketing_tasks: ["Marketing", "/marketing"],
    g89_partner_movements: ["Movimento socio", "/finanze/soci"],
    g89_attachments: ["File", "/finanze"],
  };

  const me = appUsers.find((u) => u.user_id === claims.claims.sub);
  if (!me) redirect("/login?errore=non-autorizzato");

  return {
    today: new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }),
    currentUser: { name: me.display_name as string, partnerId: (me.partner_id ?? undefined) as string | undefined, role: me.role as "admin" | "editor" | "viewer" },
    checklistTemplates: templates.map((t) => ({ id: t.id as string, name: t.name as string })),
    vatMode: (settings[0]?.vat_mode ?? "da_definire") as VatMode,
    partners: partners.map((p) => ({ id: p.id, name: p.name, shortName: p.short_name, color: p.color })),
    shares: shares.map((s) => ({ partnerId: s.partner_id, shareBp: s.share_bp, validFrom: s.valid_from })),
    categories: categories.filter((c) => !c.archived).map((c) => ({ id: c.id, name: c.name, direction: c.direction, nature: c.nature })),
    contacts: contacts.map((c) => ({ id: c.id, kind: c.kind, name: c.name, company: opt(c.company), email: opt(c.email), phone: opt(c.phone), notes: opt(c.notes) })),
    events: events.map(
      (e): EventRecord => ({
        id: e.id, code: e.code, title: e.title, clientId: e.client_id ?? "", status: e.status, date: e.event_date,
        startTime: hhmm(e.start_time), endTime: hhmm(e.end_time), venueName: e.venue_name, venueAddress: opt(e.venue_address),
        guests: e.guests, hasPizza: e.has_pizza, hasCocktail: e.has_cocktail, leadSource: opt(e.lead_source), notes: opt(e.notes),
      }),
    ),
    quotes: quotes.map(
      (qt): Quote => ({
        id: qt.id, eventId: qt.event_id, version: qt.version, status: qt.status, createdAt: qt.created_at.slice(0, 10),
        lines: (linesByQuote.get(qt.id) ?? [])
          .sort((a, b) => a.position - b.position)
          .map((l) => ({ id: l.id, service: l.service, description: l.description, qty: num(l.qty), unitPriceCents: num(l.unit_price_cents), vatBp: l.vat_bp })),
      }),
    ),
    budget: budget.map((b) => ({ id: b.id, eventId: b.event_id, service: b.service, description: b.description, amountCents: num(b.amount_cents), kind: b.kind })),
    documents: documents.map(
      (d): FinDocument => ({
        id: d.id, direction: d.direction, docType: d.doc_type, number: opt(d.number), documentDate: d.document_date, dueDate: opt(d.due_date),
        contactId: opt(d.contact_id), categoryId: d.category_id, eventId: opt(d.event_id), service: opt(d.service), nature: d.nature,
        description: d.description, netCents: num(d.net_cents), vatBp: d.vat_bp, vatCents: num(d.vat_cents), totalCents: num(d.total_cents),
        hasAttachment: attachCount.has(d.id),
      }),
    ),
    payments: payments.map(
      (p): Payment => ({ id: p.id, documentId: p.document_id, paidOn: p.paid_on, amountCents: num(p.amount_cents), method: p.method, payer: p.payer, partnerId: opt(p.partner_id) }),
    ),
    movements: movements.map((m) => ({
      id: m.id, partnerId: m.partner_id, counterpartPartnerId: opt(m.counterpart_partner_id), type: m.type, account: opt(m.account),
      amountCents: num(m.amount_cents), occurredOn: m.occurred_on, description: m.description,
    })),
    tasks: tasks.map((t) => ({ id: t.id, eventId: t.event_id, label: t.label, phase: t.phase, dueDate: opt(t.due_date), done: !!t.done_at, assigneePartnerId: opt(t.assignee_partner_id) })),
    staff: staff.map((s) => ({ id: s.id, eventId: s.event_id, contactId: s.contact_id, role: s.role, hours: s.hours == null ? undefined : num(s.hours), agreedCents: s.agreed_cents == null ? undefined : num(s.agreed_cents) })),
    resources: resources.map((r) => ({ id: r.id, kind: r.kind, name: r.name, unit: r.unit, supplierId: opt(r.supplier_id) })),
    eventResources: eventResources.map((r) => ({ id: r.id, eventId: r.event_id, resourceId: r.resource_id, qty: num(r.qty), transport: opt(r.transport), loaded: !!r.loaded_at, returned: !!r.returned_at })),
    campaigns: campaigns.map((c) => ({ id: c.id, name: c.name, startsOn: c.starts_on, endsOn: opt(c.ends_on), budgetCents: num(c.budget_cents), status: c.status })),
    marketingTasks: marketing.map(
      (m): MarketingTask => ({
        id: m.id, title: m.title, type: m.type, eventId: opt(m.event_id), campaignId: opt(m.campaign_id), ownerPartnerId: opt(m.owner_partner_id),
        status: m.status, dueDate: opt(m.due_date), externalCostCents: m.external_cost_cents == null ? undefined : num(m.external_cost_cents),
        internalMinutes: opt(m.internal_minutes), fileCount: attachCount.get(m.id)?.n, latestVersion: attachCount.get(m.id)?.v, notes: opt(m.notes),
      }),
    ),
    activity: audit
      .filter((a) => ENTITY[a.table_name])
      .map((a) => {
        const row = a.new ?? a.old ?? {};
        const [entity, href] = ENTITY[a.table_name];
        return {
          id: String(a.id),
          at: a.at,
          actorPartnerId: userPartner.get(a.actor) ?? "",
          action: a.table_name === "g89_fin_payments" && a.action === "insert" ? "pagato" : (ACTION[a.action] ?? "modificato"),
          entity,
          summary: row.description ?? row.title ?? row.file_name ?? row.code ?? "",
          href,
        } satisfies ActivityEntry;
      }),
  };
}
