# Schema database

Tutti gli importi sono **interi in centesimi** (`bigint`). Le aliquote IVA sono in **punti base** (`2200` = 22%). Le date documento/scadenza/pagamento sono `date`; i timestamp tecnici `timestamptz`.

## Modello contabile (il punto più importante)

```
 documento (fin_documents)            pagamento (fin_payments)
 ─────────────────────────            ────────────────────────
 cosa è dovuto e per cosa      1 ──<  quando e come è stato pagato
 data documento, scadenza             data pagamento, importo, metodo
 imponibile, IVA, totale              chi ha pagato/incassato:
 evento, servizio, categoria          azienda | socio A | socio B
```

- **Competenza** (ricavi, costi, margini) si calcola sui **documenti**.
- **Cassa** (incassi, uscite, saldo) si calcola sui **pagamenti**.
- **Acconto e saldo** di un evento sono due pagamenti dello stesso documento di ricavo: il ricavo si conta una volta sola. Se il cliente riceve due fatture (acconto + saldo), sono due documenti che insieme fanno il totale, senza sovrapposizioni.
- **Stato di un documento** (da pagare, parziale, pagato, scaduto) è derivato: `somma pagamenti` vs `totale` e `scadenza` vs oggi.
- **Spesa rapida**: un unico form crea documento + pagamento nella stessa transazione.

### Soci
- Un pagamento di una **spesa** fatto da un socio genera automaticamente un **anticipo** a suo credito.
- Un **incasso** ricevuto personalmente da un socio genera un **debito** del socio verso l'azienda.
- Movimenti espliciti in `partner_movements`: conferimento, prestito, restituzione prestito, rimborso, versamento, prelievo/distribuzione, compensazione.
- Ogni movimento appartiene a uno di due conti distinti per socio:
  - **Conto finanziamento** (rimborsabile): anticipi, prestiti, rimborsi, incassi trattenuti, compensazioni. Saldo positivo = l'azienda deve al socio.
  - **Conto capitale** (non rimborsabile automaticamente): conferimenti, distribuzioni di utile.
- Le **quote di ripartizione** sono in `partner_shares` con data di validità; non si assume 50/50.
- L'estratto conto è una vista (`v_partner_ledger`) che unisce pagamenti fatti dai soci e movimenti espliciti, ordinati per data, con saldo progressivo.

### Tre numeri da non confondere
| Indicatore | Fonte | Significato |
|---|---|---|
| Margine | documenti (competenza) | ricavi − costi attribuiti, per evento o servizio |
| Utile distribuibile | margine totale − costi generali − ammortamenti/accantonamenti configurati | *da validare con il commercialista*; mostrato come stima |
| Saldo di cassa | pagamenti dell'azienda + movimenti soci | denaro dell'azienda effettivamente entrato − uscito. Una spesa pagata da un socio non esce dalla cassa (diventa un anticipo); conferimenti, prestiti e versamenti entrano; rimborsi, restituzioni e prelievi escono; le compensazioni tra soci non la toccano |

## Tabelle

### Identità e configurazione
- `app_users` (`user_id` → `auth.users`, `role`: admin | editor | viewer, `partner_id` nullable, `display_name`)
- `partners` (`id`, `name`, `short_name`, `color`, `active`)
- `partner_shares` (`partner_id`, `share_bp`, `valid_from`) — somma = 10000 per ogni data, controllata da funzione
- `settings` (riga singola: `business_name`, `vat_mode` ordinario | forfettario | da_definire, `default_vat_bp`, `currency`)
- `categories` (`id`, `name`, `direction` in | out, `nature` evento | generale | ricorrente | investimento | marketing, `archived`)

### Anagrafiche e risorse
- `contacts` (`id`, `kind` cliente | fornitore | collaboratore, `name`, `company`, `email`, `phone`, `vat_number`, `tax_code`, `notes`)
- `resources` (`id`, `kind` attrezzatura | materiale | prodotto, `name`, `unit`, `supplier_id`, `notes`)
- `price_list_items` (`resource_id`, `supplier_id`, `unit_cost_cents`, `vat_bp`, `valid_from`)

### Eventi
- `events` (`id`, `code`, `title`, `client_id`, `status`, `event_date`, `start_time`, `end_time`, `venue_name`, `venue_address`, `guests`, `has_pizza`, `has_cocktail`, `lead_source`, `notes`, `duplicated_from`)
  - `status`: richiesta | preventivo | trattativa | confermato | in_preparazione | completato | annullato
- `event_quotes` (`event_id`, `version`, `status` bozza | inviato | accettato | rifiutato, `valid_until`, `notes`) — un solo preventivo accettato per evento (indice parziale univoco)
- `event_quote_lines` (`quote_id`, `service` pizza | cocktail | extra, `description`, `qty`, `unit_price_cents`, `vat_bp`, `position`)
- `event_budget_lines` (`event_id`, `service`, `category_id`, `description`, `amount_cents`, `kind` previsto | stimato) — costi previsti per il margine previsto
- `event_staff` (`event_id`, `contact_id`, `role`, `hours`, `agreed_cents`)
- `event_resources` (`event_id`, `resource_id`, `qty`, `transport`, `loaded_at`, `returned_at`, `notes`)
- `checklist_templates`, `checklist_template_items` (`template_id`, `label`, `phase`, `days_before`)
- `event_tasks` (`event_id`, `label`, `phase`, `due_date`, `done_at`, `assignee_partner_id`)

### Finanze
- `fin_documents` (`id`, `direction` in | out, `doc_type` fattura | ricevuta | scontrino | proforma | altro, `number`, `document_date`, `due_date`, `contact_id`, `category_id`, `event_id`, `service` pizza | cocktail | generale, `nature` (come categorie), `description`, `net_cents`, `vat_bp`, `vat_cents`, `total_cents`, `recurring_id`, `notes`)
  - vincolo: `total_cents = net_cents + vat_cents`
- `fin_payments` (`id`, `document_id`, `paid_on`, `amount_cents` > 0, `method` contanti | carta | bonifico | pos | altro, `payer` azienda | socio, `partner_id` obbligatorio se `payer = socio`, `reference`)
- `recurring_costs` (`id`, `description`, `contact_id`, `category_id`, `amount_cents`, `vat_bp`, `frequency` mensile | trimestrale | annuale, `next_due`, `active`)
- `partner_movements` (`id`, `partner_id`, `counterpart_partner_id`, `type`, `account` finanziamento | capitale, `amount_cents`, `occurred_on`, `description`, `payment_id`)

### Marketing
- `campaigns` (`id`, `name`, `starts_on`, `ends_on`, `budget_cents`, `status`)
- `marketing_tasks` (`id`, `title`, `type` social | stampa | grafica | menu | altro, `event_id`, `campaign_id` — entrambi null = progetto generale, `owner_partner_id`, `status` da_fare | in_corso | in_approvazione | approvato | pubblicato | annullato, `due_date`, `external_cost_cents`, `document_id`, `internal_minutes`, `notes`)

### File e tracciabilità
- `attachments` (`id`, `bucket`, `path`, `file_name`, `mime`, `size`, `entity` document | event | marketing_task | contact, `entity_id`, `version`, `approved_at`, `approved_by`, `external_url`)
- `audit_log` (`id`, `table_name`, `record_id`, `action`, `actor`, `at`, `old`, `new`)

## Viste
- `v_document_balance`: totale, pagato, residuo, stato per documento.
- `v_event_economics`: ricavi/costi previsti (preventivo accettato + budget) e consuntivi (documenti) per evento e servizio.
- `v_partner_ledger`: movimenti socio con saldo progressivo per conto.
- `v_monthly_report`: competenza e cassa per mese.

## Regole RLS (sintesi)
- `select`: `is_member()` — l'utente è in `app_users`.
- `insert/update/delete`: `can_edit()` — ruolo admin o editor.
- `audit_log`: solo `select` per i membri, scrittura solo da trigger `security definer`.
- `settings`, `partner_shares`, `app_users`: modifica solo admin.
- Storage `documenti`: oggetti leggibili/scrivibili solo dai membri; nessun accesso pubblico.
