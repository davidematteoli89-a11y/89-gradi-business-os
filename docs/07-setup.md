# Setup e variabili d'ambiente

## Requisiti
- Node.js 20.9+ (sviluppato con Node 22) e npm
- Un progetto Supabase **di sviluppo** (separato da quello di produzione)
- Opzionale: Supabase CLI per applicare le migrazioni da terminale

## Avvio rapido con dati dimostrativi
```bash
npm install
cp .env.example .env.local
echo "DEMO_DATA=1" >> .env.local
npm run dev
```
Apri http://localhost:3000. Un'etichetta "Dati dimostrativi" resta sempre visibile. I moduli validano i dati ma non salvano nulla.

## Variabili d'ambiente
| Variabile | Dove | Note |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | tutti gli ambienti reali | URL del progetto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | tutti gli ambienti reali | chiave pubblicabile; la protezione è la RLS |
| `DEMO_DATA` | solo sviluppo locale | `1` attiva i dati dimostrativi; bloccata se `VERCEL_ENV=production` |

La **service role key non serve** e non va configurata: tutte le query passano dalla sessione dell'utente e dalla RLS.

Senza database e senza `DEMO_DATA` l'app mostra solo la pagina `/configura`: nessun numero inventato.

## Database attuale
Il database è nel progetto Supabase **aidady-business-os** (`ffpknnpwydsyuxcaovyk`, Francoforte), condiviso con altre applicazioni.
Per non interferire, **tutti gli oggetti di 89 Gradi hanno il prefisso `g89_`** (tabelle, tipi, funzioni, viste, policy) e il bucket file è `g89-documenti`.
Le migrazioni non modificano nulla al di fuori di questi oggetti; un test lo verifica.
Le impostazioni di autenticazione (registrazione pubblica, email, URL di redirect) sono condivise con le altre app: non vanno cambiate solo per 89 Gradi.

Applicate il 6/11/2026: `g89_core_schema`, `g89_security`, `g89_views_and_rpc`, `g89_base_config` (12 categorie e il modello di checklist), `g89_revoke_trigger_functions`.
Accesso amministratore concesso a davide.matteoli89@gmail.com (nessun socio associato).

## Database (nuova installazione)
1. Crea il progetto Supabase di sviluppo.
2. Applica le migrazioni in ordine:
   ```bash
   supabase link --project-ref <ref-sviluppo>
   supabase db push
   ```
   oppure incolla i file di `supabase/migrations/` nell'editor SQL, in ordine di nome.
3. Facoltativo, **solo sviluppo**: seed dimostrativo.
   ```sql
   set app.allow_demo_seed = 'on';
   -- poi esegui supabase/seed/demo.sql
   ```
   Senza quella riga il seed si rifiuta di partire.

## Utenti e permessi
1. La registrazione pubblica non serve: anche se un estraneo creasse un account, senza riga in `g89_app_users` non vede nulla (RLS).
2. Authentication → Users → **Invite user** per ciascun socio.
3. Collega ogni utente a un socio e a un ruolo (SQL editor):
   ```sql
   insert into public.g89_partners (name, short_name, color) values ('Nome socio A', 'A', '#24211F'), ('Nome socio B', 'B', '#B42332');
   insert into public.g89_app_users (user_id, role, partner_id, display_name)
   select u.id, 'admin', p.id, p.name from auth.users u, public.g89_partners p
   where u.email = 'socio-a@esempio.it' and p.short_name = 'A';
   -- ripeti per il socio B
   ```
4. Imposta le quote nella stessa transazione (devono sommare al 100%):
   ```sql
   begin;
   insert into public.g89_partner_shares (partner_id, share_bp, valid_from) select id, 5000, current_date from public.g89_partners where short_name = 'A';
   insert into public.g89_partner_shares (partner_id, share_bp, valid_from) select id, 5000, current_date from public.g89_partners where short_name = 'B';
   commit;
   ```
   I valori sopra sono un esempio: usate le vostre quote reali.

Ruoli: `admin` (tutto, incluse impostazioni e quote), `editor` (tutti i dati operativi), `viewer` (sola lettura, es. commercialista).

## Comandi
| Comando | Cosa fa |
|---|---|
| `npm run dev` | sviluppo |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Vitest: calcoli monetari, scenari contabili, conti soci, migrazioni + RLS su Postgres in memoria (PGlite) |
| `npm run build` | build di produzione |
| `npm run check` | typecheck + lint + test |

## Deploy su Vercel (quando autorizzato)
1. Importa il repository in Vercel.
2. Imposta le due variabili Supabase per Production e Preview (Preview → progetto Supabase di sviluppo).
3. **Non** impostare `DEMO_DATA` in Production.
4. In Supabase → Authentication → URL Configuration aggiungi il dominio Vercel.

Nessun deploy è stato eseguito.
