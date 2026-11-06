# Architettura

## Stack
- **Next.js 16** (App Router, Server Components, Server Actions; `cacheComponents` disattivato perché ogni pagina dipende dalla sessione) + **TypeScript** strict.
- **Tailwind CSS v4** + componenti **shadcn/ui** (new-york v4, copiati in `src/components/ui`, basati su Radix).
- **Supabase**: PostgreSQL, Auth (email + password / magic link), Storage privato.
- **React Hook Form + Zod** per i form; gli stessi schemi Zod validano lato server nelle Server Actions.
- **Recharts** (tramite il wrapper `chart` di shadcn) per i grafici di Analisi.
- **Vitest** per i test di dominio.
- Deploy predisposto per **Vercel** (nessun deploy eseguito senza autorizzazione).

## Struttura cartelle
```
src/
  app/
    (auth)/login/            pagina di accesso
    (app)/                   area autenticata, layout con sidebar e tab bar
      page.tsx               Home
      eventi/                elenco + [id] scheda evento
      finanze/               documenti, pagamenti, soci, report
      marketing/
      risorse/
      analisi/
      impostazioni/
  components/
    ui/                      primitive shadcn (non modificare a mano se non per il tema)
    app/                     shell: sidebar, tab bar, ricerca globale, azioni rapide
    domain/                  componenti di dominio riusabili (StatusBadge, Money, ...)
  lib/
    money.ts                 aritmetica in centesimi, formattazione EUR
    domain/                  calcoli puri: IVA, margini, saldi soci, stato pagamento
    validation/              schemi Zod condivisi client/server
    data/                    accesso ai dati (interfaccia unica)
      demo/                  dataset demo dichiarato, solo sviluppo
      supabase/              implementazione reale
    supabase/                client browser/server (mai service role nel client)
  proxy.ts                   refresh sessione Supabase e redirect al login
supabase/
  migrations/                SQL versionato
  seed/demo.sql              seed demo, separato, mai in produzione
docs/
```

## Flusso dei dati
1. Le pagine sono Server Components che chiamano funzioni di `lib/data` (Data Access Layer).
2. `lib/data` sceglie la sorgente: **demo** se `DEMO_DATA=1` e non siamo in produzione, altrimenti **Supabase** con il cookie di sessione dell'utente (RLS applicata dal database).
3. Le mutazioni passano da Server Actions: validazione Zod → controllo permesso → query con il client dell'utente → `revalidatePath` → toast di conferma lato client.
4. I calcoli (IVA, margini, saldi) stanno in `lib/domain`, sono funzioni pure e testate; il database conserva i dati grezzi, le viste SQL replicano gli stessi calcoli per report ed export.

## Sicurezza
- **Auth Supabase** con due utenti invitati manualmente (registrazione pubblica disattivata).
- **RLS** su ogni tabella: accesso solo a utenti presenti in `app_users`; scrittura solo con ruolo `admin` o `editor`.
- **Storage** bucket `documenti` privato; lettura tramite **signed URL** a scadenza breve generati lato server.
- **Service role** usata solo in script locali/CLI, mai importata in codice che arriva al browser (`server-only`).
- **Audit log** con trigger su tabelle sensibili: chi, quando, prima/dopo.
- **Proxy** (ex middleware) aggiorna la sessione e reindirizza al login; i controlli di autorizzazione veri restano nel DAL e nella RLS.

## Modalità demo
- Attiva solo con `DEMO_DATA=1`. Se `VERCEL_ENV=production` o `NODE_ENV=production` senza `ALLOW_DEMO_BUILD=1`, la modalità demo viene rifiutata all'avvio.
- Quando è attiva, un'etichetta "Dati dimostrativi" è sempre visibile nell'intestazione.
- Il seed SQL demo è in un file separato, non eseguito dalle migrazioni.

## Rendering e prestazioni
- Le pagine dati sono dinamiche (sessione); `loading.tsx` con skeleton fedeli al layout per ogni sezione.
- Le liste lunghe sono paginate lato server; i filtri vivono nei `searchParams` (link condivisibili, tasto indietro funzionante).

## Accessibilità
- Contrasto AA su tutti i testi (verificato sui token), focus visibile, navigazione da tastiera, `aria-current` sulla navigazione, target touch ≥ 44px su mobile, `prefers-reduced-motion` rispettato.
