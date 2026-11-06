-- SEED DIMOSTRATIVO — SOLO SVILUPPO.
-- Non viene eseguito dalle migrazioni. Rifiuta l'esecuzione se non si imposta esplicitamente:
--   set app.allow_demo_seed = 'on';
-- Nessun dato reale: nomi e importi sono inventati.

do $$
begin
  if coalesce(current_setting('app.allow_demo_seed', true), 'off') <> 'on' then
    raise exception 'Seed demo bloccato. Esegui "set app.allow_demo_seed = ''on'';" solo su un database di sviluppo.';
  end if;
end $$;

insert into public.g89_partners (id, name, short_name, color) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'Socio A', 'A', '#24211F'),
  ('aaaaaaaa-0000-0000-0000-00000000000b', 'Socio B', 'B', '#B42332')
on conflict (id) do nothing;

begin;
insert into public.g89_partner_shares (partner_id, share_bp, valid_from) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 5500, '2025-01-01'),
  ('aaaaaaaa-0000-0000-0000-00000000000b', 4500, '2025-01-01')
on conflict do nothing;
commit;

insert into public.g89_categories (id, name, direction, nature) values
  ('cccccccc-0000-0000-0000-000000000001', 'Ricavi eventi demo', 'in', 'evento'),
  ('cccccccc-0000-0000-0000-000000000002', 'Materie prime pizza', 'out', 'evento'),
  ('cccccccc-0000-0000-0000-000000000003', 'Beverage e bar', 'out', 'evento'),
  ('cccccccc-0000-0000-0000-000000000004', 'Personale extra', 'out', 'evento'),
  ('cccccccc-0000-0000-0000-000000000005', 'Trasporti e carburante', 'out', 'evento'),
  ('cccccccc-0000-0000-0000-000000000006', 'Attrezzature', 'out', 'investimento'),
  ('cccccccc-0000-0000-0000-000000000007', 'Assicurazioni', 'out', 'ricorrente'),
  ('cccccccc-0000-0000-0000-000000000008', 'Marketing e stampa', 'out', 'marketing'),
  ('cccccccc-0000-0000-0000-000000000009', 'Spese generali', 'out', 'generale')
on conflict do nothing;

insert into public.g89_contacts (id, kind, name) values
  ('dddddddd-0000-0000-0000-000000000001', 'cliente', 'Cliente Demo — Matrimonio'),
  ('dddddddd-0000-0000-0000-000000000002', 'fornitore', 'Fornitore Demo — Molino')
on conflict do nothing;

-- Il modello di checklist arriva dalla migrazione di configurazione di base.

insert into public.g89_events (id, code, title, client_id, status, event_date, venue_name, guests, has_pizza, has_cocktail) values
  ('ffffffff-0000-0000-0000-000000000001', '89-DEMO-001', 'Matrimonio dimostrativo', 'dddddddd-0000-0000-0000-000000000001', 'confermato', current_date + 10, 'Villa Demo', 120, true, true)
on conflict do nothing;

insert into public.g89_fin_documents (id, direction, document_date, due_date, contact_id, category_id, event_id, service, nature, description, net_cents, vat_bp, vat_cents, total_cents) values
  ('99999999-0000-0000-0000-000000000001', 'in', current_date - 20, current_date + 10, 'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000001', 'pizza', 'evento', 'Matrimonio dimostrativo — servizio completo', 400000, 1000, 40000, 440000)
on conflict do nothing;
insert into public.g89_fin_payments (document_id, paid_on, amount_cents, method) values
  ('99999999-0000-0000-0000-000000000001', current_date - 18, 132000, 'bonifico');
