# Piano incrementale

Ogni fase termina con typecheck, lint, test e build verdi, e un commit dedicato.

| # | Fase | Stato |
|---|---|---|
| 1 | Ispezione repository, nuova app isolata | ✅ |
| 2 | Documentazione: PRD, architettura, schema, design system, piano | ✅ |
| 3 | Prototipo navigabile Home, Eventi, Finanze, Marketing con dati demo dichiarati | ✅ |
| 4 | Verifica responsive e accessibilità (screenshot desktop/mobile, focus, contrasti) | ✅ prima passata |
| 5 | Supabase: migrazioni, RLS, storage, audit log; Auth; CRUD spese reale | 🟡 SQL e logica pronti, collegamento in attesa del progetto Supabase |
| 6 | Conti soci e riconciliazione (estratto conto, saldi, compensazioni) | 🟡 calcoli e test pronti, UI su dati demo |
| 7 | Eventi e movimenti economici (preventivi, acconti/saldi, margini) | 🟡 calcoli e UI pronti, persistenza da collegare |
| 8 | Marketing e Risorse su database | ⏳ |
| 9 | Test: calcoli monetari ✅, scenari contabili ✅, permessi (test SQL RLS) ⏳, flussi evento e2e ⏳ | 🟡 |
| 10 | Documentazione setup e variabili d'ambiente | ✅ |

## Prossimi passi concreti
1. Creare (o indicare) il progetto Supabase di sviluppo e applicare `supabase/migrations` lì, non in produzione.
2. Invitare i due soci da dashboard Supabase, creare le righe `app_users` e `partners`, impostare le quote.
3. Sostituire la sorgente demo con quella Supabase sezione per sezione, a partire da Finanze → Spese.
4. Aggiungere test RLS con `supabase test db` (pgTAP) per i permessi.
