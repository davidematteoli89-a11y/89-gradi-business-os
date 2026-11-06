# Piano incrementale

Ogni fase termina con typecheck, lint, test e build verdi, e un commit dedicato.

| # | Fase | Stato |
|---|---|---|
| 1 | Ispezione repository, nuova app isolata | ✅ cartella vuota di codice → nuova app `89-gradi-business-os` |
| 2 | Documentazione: PRD, architettura, schema, design system, piano | ✅ |
| 3 | Prototipo navigabile Home, Eventi, Finanze, Marketing con dati demo dichiarati | ✅ più Risorse, Analisi, Impostazioni in versione essenziale |
| 4 | Verifica responsive e accessibilità | ✅ prima passata: nessun overflow orizzontale a 390px su tutte le pagine, focus visibile, skip link, `aria-current`, target 44px, reduced motion |
| 5 | Supabase: migrazioni, RLS, storage, audit log; Auth; CRUD spese | 🟡 migrazioni e RLS testate su Postgres in memoria; login, proxy, spesa rapida con foto (RPC transazionale), incassi ed eliminazione scritti ma **non ancora provati su un progetto Supabase reale** |
| 6 | Conti soci e riconciliazione | 🟡 calcoli, vista SQL, estratto conto, riconciliazione suggerita e registrazione movimenti; da provare su DB reale |
| 7 | Eventi e movimenti economici | 🟡 margini previsto/consuntivo, acconti/saldi, duplicazione, checklist, stato; editor preventivi e costi previsti da costruire |
| 8 | Marketing e Risorse | 🟡 consultazione e avanzamento stato; moduli di creazione e upload versioni da costruire |
| 9 | Test | 🟡 65 test: calcoli monetari, scenari contabili, conti soci, RLS/permessi, vincoli DB, seed. Mancano test end-to-end dei flussi evento |
| 10 | Documentazione setup e variabili d'ambiente | ✅ `docs/07-setup.md` |

## Prossimi passi concreti
1. Creare (o indicare) il progetto Supabase di sviluppo e applicare `supabase/migrations` lì, non in produzione. Poi provare login, spesa rapida con foto e incasso su dati veri.
2. Invitare i due soci da dashboard Supabase, creare le righe `app_users` e `partners`, impostare le quote.
3. Sostituire la sorgente demo con quella Supabase sezione per sezione, a partire da Finanze → Spese.
4. Editor preventivi (righe pizza/cocktail/extra, versioni) e costi previsti; moduli Marketing con upload versioni e approvazioni.
5. Test end-to-end (Playwright) dei flussi: nuova spesa da iPhone, evento da richiesta a saldo.
