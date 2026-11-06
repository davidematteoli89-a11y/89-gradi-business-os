-- Configurazione di partenza (non sono dati: categorie e un modello di checklist, modificabili).
insert into public.g89_categories (name, direction, nature) values
  ('Ricavi eventi', 'in', 'evento'),
  ('Altri ricavi', 'in', 'generale'),
  ('Materie prime pizza', 'out', 'evento'),
  ('Beverage e bar', 'out', 'evento'),
  ('Personale extra', 'out', 'evento'),
  ('Trasporti e carburante', 'out', 'evento'),
  ('Noleggi', 'out', 'evento'),
  ('Attrezzature', 'out', 'investimento'),
  ('Assicurazioni', 'out', 'ricorrente'),
  ('Software e abbonamenti', 'out', 'ricorrente'),
  ('Marketing e stampa', 'out', 'marketing'),
  ('Spese generali', 'out', 'generale')
on conflict (name, direction) do nothing;

with t as (
  insert into public.g89_checklist_templates (name) values ('Evento pizza + cocktail')
  on conflict (name) do update set name = excluded.name
  returning id
)
insert into public.g89_checklist_template_items (template_id, label, phase, days_before, position)
select t.id, v.label, v.phase::public.g89_task_phase, v.days_before, v.position
from t, (values
  ('Confermare menu e numero ospiti', 'prima', 10, 1),
  ('Confermare staff', 'prima', 7, 2),
  ('Ordinare materie prime e beverage', 'prima', 4, 3),
  ('Avviare impasti (maturazione 48h)', 'prima', 2, 4),
  ('Check carico forno, banco bar, legna e ghiaccio', 'carico', 0, 5),
  ('Incassare il saldo', 'evento', 0, 6),
  ('Rientro attrezzatura e pulizia', 'rientro', -1, 7)
) as v(label, phase, days_before, position);
