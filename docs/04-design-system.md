# Design system — Warm Minimal

## Idea
Un quaderno di lavoro elegante, non un cruscotto. Superfici calde, molto spazio, pochi colori, numeri leggibili. L'unico elemento identitario ricorrente è il **cerchio rosso del grado** preso dal logo: segna l'elemento attivo nella navigazione e gli stati "in corso". Il rosso si usa poco, quindi quando appare significa qualcosa.

## Colori
| Token | Hex | Uso |
|---|---|---|
| `paper` | `#F7F3EE` | sfondo applicazione |
| `ivory` | `#FCFAF6` | superfici, pannelli |
| `ink` | `#24211F` | testo principale, icone |
| `ash` | `#6B645E` | testo secondario (contrasto AA su paper e ivory) |
| `line` | `#E6DED4` | bordi e divisori |
| `accent` | `#B42332` | azione primaria, grado, elementi attivi |
| `olive` | `#4F6B45` | positivo: pagato, completato, margine in crescita |
| `amber` | `#A0611A` | attenzione: in scadenza, in approvazione |

Gli importi negativi non diventano rossi: il rosso è riservato al brand e alle azioni. Si usa il segno meno e, dove serve, l'etichetta testuale.

## Tipografia
- Famiglia unica: **Instrument Sans** (variabile, pesi 400–700), con cifre tabellari per tutti gli importi.
- Scala (rapporto ~1.25): 12 · 13 · 15 (testo) · 17 · 20 · 24 · 30 · 38.
- Titoli di pagina 30/36, peso 600, tracking -0.02em. Etichette in maiuscoletto non usate: sentence case ovunque.
- Larghezza massima del testo descrittivo: 68 caratteri.

## Forme e profondità
- Raggi gerarchici: pannelli 20px, elementi interni 12px, controlli 10px, chip/stati pieni.
- Ombra unica e morbida per i pannelli sollevati (`0 1px 2px rgb(36 33 31 / .04), 0 8px 24px -12px rgb(36 33 31 / .10)`); le liste interne usano solo divisori.
- I KPI della Home stanno in **un solo pannello** diviso da linee, non in sei card identiche.

## Layout
```
Desktop ≥1024px                           Mobile
┌────────┬───────────────────────────┐    ┌──────────────────────┐
│ logo   │ Titolo pagina    [azioni] │    │ logo   ⌕   avatar    │
│        │                           │    ├──────────────────────┤
│ Home ° │ contenuto (max 1180px)    │    │ contenuto            │
│ Eventi │                           │    │                      │
│ ...    │                           │    │                 (+)  │
│        │                           │    ├──────────────────────┤
│ socio  │                           │    │ Home Eventi Fin Mkt ≡│
└────────┴───────────────────────────┘    └──────────────────────┘
```
- Sidebar 248px su avorio, logo ufficiale in alto, sette voci, profilo socio in basso.
- Mobile: tab bar con 4 sezioni (Home, Eventi, Finanze, Marketing) + "Altro"; pulsante "+" fisso per le azioni rapide.
- Allineamento a sinistra ovunque; importi allineati a destra nelle tabelle.

## Componenti di dominio
- `Money`: formatta centesimi in EUR it-IT, cifre tabellari, opzione segno.
- `StatusBadge`: stato evento/documento/attività con punto colorato; "in corso" usa l'anello del grado.
- `AmountKind`: etichetta effettivo / previsto / stimato, sempre accanto a numeri non effettivi.
- `PageHeader`, `Panel`, `EmptyState`, `KpiStrip`, `QuickAdd` (sheet), `GlobalSearch` (⌘K).

## Movimento
- Solo in risposta ad azioni: apertura sheet/dialog, conferma salvataggio (toast), espansione righe.
- `prefers-reduced-motion` disattiva tutte le transizioni non essenziali.

## Testo dell'interfaccia
- Verbi espliciti: "Salva spesa", "Registra incasso", "Duplica evento". Il toast ripete lo stesso verbo: "Spesa salvata".
- Stati vuoti che invitano ad agire: "Nessuna spesa da pagare. Le nuove spese appariranno qui."
- Errori che dicono cosa correggere: "Inserisci un importo maggiore di zero."
