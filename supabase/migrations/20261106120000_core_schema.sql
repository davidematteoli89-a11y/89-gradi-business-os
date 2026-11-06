-- 89 Gradi Business OS — schema principale
-- Importi in centesimi (bigint), aliquote in punti base (2200 = 22%).

-- gen_random_uuid() è nativo da Postgres 13: nessuna estensione necessaria.

-- ─────────────────────────────────────────────────────────────
-- Tipi
-- ─────────────────────────────────────────────────────────────
create type public.app_role as enum ('admin', 'editor', 'viewer');
create type public.vat_mode as enum ('ordinario', 'forfettario', 'da_definire');
create type public.event_status as enum ('richiesta', 'preventivo', 'trattativa', 'confermato', 'in_preparazione', 'completato', 'annullato');
create type public.service as enum ('pizza', 'cocktail', 'extra');
create type public.cost_service as enum ('pizza', 'cocktail', 'generale');
create type public.doc_direction as enum ('in', 'out');
create type public.doc_type as enum ('fattura', 'ricevuta', 'scontrino', 'proforma', 'altro');
create type public.cost_nature as enum ('evento', 'generale', 'ricorrente', 'investimento', 'marketing');
create type public.payment_method as enum ('contanti', 'carta', 'bonifico', 'pos', 'altro');
create type public.payer as enum ('azienda', 'socio');
create type public.partner_movement_type as enum ('conferimento', 'prestito', 'restituzione_prestito', 'rimborso', 'versamento', 'prelievo', 'compensazione');
create type public.partner_account as enum ('finanziamento', 'capitale');
create type public.quote_status as enum ('bozza', 'inviato', 'accettato', 'rifiutato');
create type public.contact_kind as enum ('cliente', 'fornitore', 'collaboratore');
create type public.resource_kind as enum ('attrezzatura', 'materiale', 'prodotto');
create type public.task_phase as enum ('prima', 'carico', 'evento', 'rientro');
create type public.marketing_type as enum ('social', 'stampa', 'grafica', 'menu', 'altro');
create type public.marketing_status as enum ('da_fare', 'in_corso', 'in_approvazione', 'approvato', 'pubblicato', 'annullato');
create type public.campaign_status as enum ('pianificata', 'attiva', 'conclusa');
create type public.attachment_entity as enum ('document', 'event', 'marketing_task', 'contact');

-- ─────────────────────────────────────────────────────────────
-- Identità e configurazione
-- ─────────────────────────────────────────────────────────────
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  color text not null default '#24211F',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.app_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'editor',
  partner_id uuid references public.partners (id),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.partner_shares (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id),
  share_bp integer not null check (share_bp between 0 and 10000),
  valid_from date not null,
  unique (partner_id, valid_from)
);

create table public.settings (
  id boolean primary key default true check (id),
  business_name text not null default '89 Gradi',
  vat_mode public.vat_mode not null default 'da_definire',
  default_vat_bp integer not null default 2200,
  updated_at timestamptz not null default now()
);
insert into public.settings default values;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  direction public.doc_direction not null,
  nature public.cost_nature not null,
  archived boolean not null default false,
  unique (name, direction)
);

-- ─────────────────────────────────────────────────────────────
-- Anagrafiche e risorse
-- ─────────────────────────────────────────────────────────────
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  kind public.contact_kind not null,
  name text not null,
  company text,
  email text,
  phone text,
  vat_number text,
  tax_code text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  kind public.resource_kind not null,
  name text not null,
  unit text not null default 'pz',
  supplier_id uuid references public.contacts (id),
  notes text
);

create table public.price_list_items (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  supplier_id uuid references public.contacts (id),
  unit_cost_cents bigint not null check (unit_cost_cents >= 0),
  vat_bp integer not null default 2200,
  valid_from date not null default current_date
);

-- ─────────────────────────────────────────────────────────────
-- Eventi
-- ─────────────────────────────────────────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  client_id uuid references public.contacts (id),
  status public.event_status not null default 'richiesta',
  event_date date not null,
  start_time time,
  end_time time,
  venue_name text not null default '',
  venue_address text,
  guests integer not null default 0 check (guests >= 0),
  has_pizza boolean not null default true,
  has_cocktail boolean not null default false,
  lead_source text,
  notes text,
  duplicated_from uuid references public.events (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.events (event_date);
create index on public.events (status);

create table public.event_quotes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  version integer not null,
  status public.quote_status not null default 'bozza',
  valid_until date,
  notes text,
  created_at timestamptz not null default now(),
  unique (event_id, version)
);
-- un solo preventivo accettato per evento
create unique index event_quotes_one_accepted on public.event_quotes (event_id) where status = 'accettato';

create table public.event_quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.event_quotes (id) on delete cascade,
  service public.service not null,
  description text not null,
  qty numeric(10, 3) not null check (qty > 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  vat_bp integer not null check (vat_bp between 0 and 10000),
  position integer not null default 0
);

create table public.event_budget_lines (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  service public.cost_service not null,
  category_id uuid references public.categories (id),
  description text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  kind text not null default 'previsto' check (kind in ('previsto', 'stimato'))
);

create table public.event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  contact_id uuid not null references public.contacts (id),
  role text not null,
  hours numeric(5, 2),
  agreed_cents bigint check (agreed_cents >= 0)
);

create table public.event_resources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  resource_id uuid not null references public.resources (id),
  qty numeric(10, 2) not null default 1,
  transport text,
  loaded_at timestamptz,
  returned_at timestamptz,
  notes text
);

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates (id) on delete cascade,
  label text not null,
  phase public.task_phase not null default 'prima',
  days_before integer not null default 0,
  position integer not null default 0
);

create table public.event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  label text not null,
  phase public.task_phase not null default 'prima',
  due_date date,
  done_at timestamptz,
  assignee_partner_id uuid references public.partners (id),
  position integer not null default 0
);

-- ─────────────────────────────────────────────────────────────
-- Finanze
-- ─────────────────────────────────────────────────────────────
create table public.recurring_costs (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  contact_id uuid references public.contacts (id),
  category_id uuid references public.categories (id),
  amount_cents bigint not null check (amount_cents > 0),
  vat_bp integer not null default 2200,
  frequency text not null check (frequency in ('mensile', 'trimestrale', 'annuale')),
  next_due date not null,
  active boolean not null default true
);

create table public.fin_documents (
  id uuid primary key default gen_random_uuid(),
  direction public.doc_direction not null,
  doc_type public.doc_type not null default 'fattura',
  number text,
  document_date date not null,
  due_date date,
  contact_id uuid references public.contacts (id),
  category_id uuid not null references public.categories (id),
  event_id uuid references public.events (id) on delete set null,
  service public.cost_service,
  nature public.cost_nature not null,
  description text not null,
  net_cents bigint not null,
  vat_bp integer not null check (vat_bp between 0 and 10000),
  vat_cents bigint not null,
  total_cents bigint not null check (total_cents >= 0),
  recurring_id uuid references public.recurring_costs (id),
  notes text,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fin_documents_total_check check (total_cents = net_cents + vat_cents),
  constraint fin_documents_due_check check (due_date is null or due_date >= document_date)
);
create index on public.fin_documents (document_date);
create index on public.fin_documents (event_id);
create index on public.fin_documents (direction, due_date);

create table public.fin_payments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.fin_documents (id) on delete restrict,
  paid_on date not null,
  amount_cents bigint not null check (amount_cents > 0),
  method public.payment_method not null,
  payer public.payer not null default 'azienda',
  partner_id uuid references public.partners (id),
  reference text,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  constraint fin_payments_partner_check check ((payer = 'socio') = (partner_id is not null))
);
create index on public.fin_payments (document_id);
create index on public.fin_payments (paid_on);

-- Il totale pagato non può superare il totale del documento
create or replace function public.check_payment_not_exceeding()
returns trigger language plpgsql as $$
declare
  doc_total bigint;
  paid bigint;
begin
  select total_cents into doc_total from public.fin_documents where id = new.document_id for update;
  select coalesce(sum(amount_cents), 0) into paid
    from public.fin_payments where document_id = new.document_id and id <> new.id;
  if paid + new.amount_cents > doc_total then
    raise exception 'Il pagamento supera il residuo del documento (residuo % centesimi)', doc_total - paid
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger fin_payments_not_exceeding before insert or update on public.fin_payments
  for each row execute function public.check_payment_not_exceeding();

create table public.partner_movements (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id),
  counterpart_partner_id uuid references public.partners (id),
  type public.partner_movement_type not null,
  account public.partner_account,
  amount_cents bigint not null check (amount_cents > 0),
  occurred_on date not null,
  description text not null default '',
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  constraint partner_movements_compensation check (
    (type = 'compensazione') = (counterpart_partner_id is not null)
    and (counterpart_partner_id is null or counterpart_partner_id <> partner_id)
  )
);

-- ─────────────────────────────────────────────────────────────
-- Marketing
-- ─────────────────────────────────────────────────────────────
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date,
  budget_cents bigint not null default 0 check (budget_cents >= 0),
  status public.campaign_status not null default 'pianificata'
);

create table public.marketing_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type public.marketing_type not null,
  event_id uuid references public.events (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  owner_partner_id uuid references public.partners (id),
  status public.marketing_status not null default 'da_fare',
  due_date date,
  external_cost_cents bigint check (external_cost_cents >= 0),
  document_id uuid references public.fin_documents (id) on delete set null,
  internal_minutes integer check (internal_minutes >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- File e audit
-- ─────────────────────────────────────────────────────────────
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'documenti',
  path text not null unique,
  file_name text not null,
  mime text not null,
  size bigint not null check (size >= 0),
  entity public.attachment_entity not null,
  entity_id uuid not null,
  version integer not null default 1,
  approved_at timestamptz,
  approved_by uuid references auth.users (id),
  external_url text,
  uploaded_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index on public.attachments (entity, entity_id);

create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  action text not null,
  actor uuid,
  at timestamptz not null default now(),
  old jsonb,
  new jsonb
);
create index on public.audit_log (at desc);
create index on public.audit_log (table_name, record_id);
