# Decisioni da confermare

Punti in cui il brief non dà indicazioni e che non vanno inventati. Ognuno è già un'impostazione o un comportamento facilmente modificabile.

| # | Tema | Comportamento attuale | Da confermare con |
|---|---|---|---|
| 1 | Regime IVA (ordinario / forfettario) | Impostazione `vat_mode`. In ordinario i margini si calcolano sull'imponibile; in forfettario sui totali (IVA dei costi non recuperabile, ricavi senza IVA). Default: `da_definire` → margini mostrati sull'imponibile con avviso. | Commercialista |
| 2 | Quote di ripartizione soci | Configurabili con data di validità. Nessun default 50/50: finché non sono impostate, i report di ripartizione mostrano "quote non impostate". | Soci |
| 3 | Conferimenti iniziali | Registrati sul conto capitale, non rimborsabili automaticamente. Se alcuni investimenti iniziali vanno trattati come prestiti, si registrano come prestito. | Soci + commercialista |
| 4 | Incassi trattenuti da un socio (es. contanti) | Diventano un debito del socio verso l'azienda sul conto finanziamento. | Soci |
| 5 | Compensazioni tra soci | Un movimento con controparte: −X sul socio che cede, +X sull'altro, stesso conto. | Soci |
| 6 | Utile distribuibile | Mostrato solo come stima (margine − costi generali − accantonamenti configurati). Nessuna logica fiscale applicata. | Commercialista |
| 7 | Ammortamento investimenti iniziali | Non calcolato. Gli investimenti sono classificati con natura `investimento` e mostrati a parte in Analisi. | Commercialista |
| 8 | Numerazione eventi | `89-AAAA-NNN` progressiva per anno. | Soci |
| 9 | Ruolo commercialista in sola lettura | Previsto nei permessi (`viewer`), non attivato. | Soci |
| 10 | Logo | L'asset in `public/brand` è stato estratto fedelmente dalla grafica vetrina "02_Centro_89_GRADI" (rimozione dello sfondo, nessun ridisegno). Se esiste un file vettoriale ufficiale (SVG/AI/PDF), sostituirlo. | Soci / grafico |
| 11 | Google Drive | Solo campo `external_url` sui file. Integrazione OAuth da decidere. | Soci |
