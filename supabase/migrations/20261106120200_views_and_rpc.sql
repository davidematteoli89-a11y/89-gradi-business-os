-- Viste di supporto ai report e funzione transazionale per la spesa rapida.

create or replace view public.g89_v_document_balance with (security_invoker = true) as
select
  d.id,
  d.direction,
  d.document_date,
  d.due_date,
  d.total_cents,
  coalesce(sum(p.amount_cents), 0)::bigint as paid_cents,
  (d.total_cents - coalesce(sum(p.amount_cents), 0))::bigint as residual_cents,
  case
    when d.total_cents - coalesce(sum(p.amount_cents), 0) = 0 then 'pagato'
    when d.due_date is not null and d.due_date < current_date then 'scaduto'
    when coalesce(sum(p.amount_cents), 0) > 0 then 'parziale'
    else 'da_pagare'
  end as state
from public.g89_fin_documents d
left join public.g89_fin_payments p on p.document_id = d.id
group by d.id;

-- Estratto conto soci: pagamenti fatti/incassati dai soci + movimenti espliciti
create or replace view public.g89_v_partner_ledger with (security_invoker = true) as
select
  p.partner_id,
  p.paid_on as date,
  'finanziamento'::public.g89_partner_account as account,
  case when d.direction = 'out' then 'anticipo_spesa' else 'incasso_trattenuto' end as kind,
  d.description,
  case when d.direction = 'out' then p.amount_cents else -p.amount_cents end as amount_cents,
  'payment' as source_type,
  p.id as source_id
from public.g89_fin_payments p
join public.g89_fin_documents d on d.id = p.document_id
where p.payer = 'socio'
union all
select
  m.partner_id,
  m.occurred_on,
  case
    when m.type in ('conferimento', 'prelievo') then 'capitale'::public.g89_partner_account
    when m.type in ('versamento', 'compensazione') then coalesce(m.account, 'finanziamento')
    else 'finanziamento'
  end,
  m.type::text,
  m.description,
  case when m.type in ('restituzione_prestito', 'rimborso', 'prelievo', 'compensazione') then -m.amount_cents else m.amount_cents end,
  'movement',
  m.id
from public.g89_partner_movements m
union all
select
  m.counterpart_partner_id,
  m.occurred_on,
  coalesce(m.account, 'finanziamento'),
  m.type::text,
  m.description,
  m.amount_cents,
  'movement',
  m.id
from public.g89_partner_movements m
where m.type = 'compensazione';

-- Spesa rapida: documento + pagamento opzionale in un'unica transazione
create or replace function public.g89_create_quick_expense(
  p_description text,
  p_document_date date,
  p_category_id uuid,
  p_total_cents bigint,
  p_vat_bp integer,
  p_doc_type public.g89_doc_type default 'scontrino',
  p_contact_id uuid default null,
  p_event_id uuid default null,
  p_service public.g89_cost_service default null,
  p_due_date date default null,
  p_paid boolean default true,
  p_paid_on date default null,
  p_method public.g89_payment_method default 'carta',
  p_payer public.g89_payer default 'azienda',
  p_partner_id uuid default null
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_net bigint;
  v_doc uuid;
  v_nature public.g89_cost_nature;
begin
  if not public.g89_can_edit() then
    raise exception 'Permesso negato' using errcode = '42501';
  end if;
  if p_total_cents <= 0 then
    raise exception 'Importo non valido' using errcode = 'check_violation';
  end if;
  -- scorporo con arrotondamento half-up: net + vat = totale
  v_net := round(p_total_cents::numeric * 10000 / (10000 + p_vat_bp));
  select case when p_event_id is not null then 'evento' else nature end into v_nature
    from public.g89_categories where id = p_category_id;
  if v_nature is null then
    raise exception 'Categoria inesistente';
  end if;

  insert into public.g89_fin_documents (direction, doc_type, document_date, due_date, contact_id, category_id, event_id, service, nature, description, net_cents, vat_bp, vat_cents, total_cents)
  values ('out', p_doc_type, p_document_date, p_due_date, p_contact_id, p_category_id, p_event_id, p_service, v_nature, p_description, v_net, p_vat_bp, p_total_cents - v_net, p_total_cents)
  returning id into v_doc;

  if p_paid then
    insert into public.g89_fin_payments (document_id, paid_on, amount_cents, method, payer, partner_id)
    values (v_doc, coalesce(p_paid_on, p_document_date), p_total_cents, p_method, p_payer, case when p_payer = 'socio' then p_partner_id end);
  end if;
  return v_doc;
end $$;

revoke all on function public.g89_create_quick_expense from public, anon;
grant execute on function public.g89_create_quick_expense to authenticated;
