-- Estratto conto soci con apporti non monetari e conversioni di credito in capitale.
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
    when m.type in ('conferimento', 'prelievo', 'apporto_non_monetario') then 'capitale'::public.g89_partner_account
    when m.type in ('versamento', 'compensazione') then coalesce(m.account, 'finanziamento')
    else 'finanziamento'
  end,
  m.type::text,
  m.description,
  case when m.type in ('restituzione_prestito', 'rimborso', 'prelievo', 'compensazione', 'conversione_in_capitale') then -m.amount_cents else m.amount_cents end,
  'movement',
  m.id
from public.g89_partner_movements m
union all
-- seconda gamba: compensazione (altro socio) e conversione (stesso socio, conto capitale)
select
  case when m.type = 'compensazione' then m.counterpart_partner_id else m.partner_id end,
  m.occurred_on,
  case when m.type = 'compensazione' then coalesce(m.account, 'finanziamento') else 'capitale'::public.g89_partner_account end,
  m.type::text,
  m.description,
  m.amount_cents,
  'movement',
  m.id
from public.g89_partner_movements m
where m.type in ('compensazione', 'conversione_in_capitale');

revoke all on public.g89_v_partner_ledger from anon;

-- Un apporto non monetario deve essere descritto (cosa, periodo, come è valorizzato).
alter table public.g89_partner_movements
  add constraint g89_partner_movements_non_cash_description
  check (type <> 'apporto_non_monetario' or length(trim(description)) >= 5);
