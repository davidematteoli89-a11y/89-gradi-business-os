# 89 Gradi Business OS — PRD sintetico

## Contesto
89 Gradi è un'attività di pizza catering mobile e cocktail bar per eventi, gestita da due soci. Il software è privato, per una sola attività: niente multi-tenant, niente piani, niente onboarding generico.

## Problema
Oggi preventivi, spese, anticipi dei soci, materiali e grafiche vivono tra chat, fogli e cartelle. Questo rende difficile rispondere a tre domande:
1. Quanto stiamo guadagnando davvero, evento per evento e per servizio (pizza / cocktail)?
2. Chi ha anticipato cosa, e quanto deve l'azienda a ciascun socio?
3. Cosa bisogna fare questa settimana per i prossimi eventi?

## Utenti
- **Socio A** e **Socio B**: accesso completo, login personale. Uso misto iPhone (sul campo, scontrini) e desktop (preventivi, report).
- In futuro, eventualmente, un ruolo in sola lettura (commercialista). Previsto nei permessi, non nell'interfaccia iniziale.

## Obiettivi misurabili
- Registrare una spesa con foto dello scontrino in meno di 30 secondi da iPhone.
- Margine previsto e consuntivo visibile su ogni evento senza calcoli manuali.
- Saldo di ciascun socio verso l'azienda verificabile movimento per movimento.
- Nessun importo inventato: i numeri della Home vengono solo da dati registrati.

## Ambito per sezione
| Sezione | Contenuto essenziale |
|---|---|
| Home | KPI (incassi, margini, spese da pagare, prossimi eventi, saldi soci, attività urgenti), calendario sintetico, azioni rapide, feed modifiche |
| Eventi | Pipeline per stato, scheda evento unica (Panoramica, Economica, Organizzazione, Documenti, Marketing), preventivi, acconti/saldi, costi, staff, checklist da modello, duplicazione |
| Finanze | Documenti (entrate/uscite) e pagamenti separati, categorie, investimenti iniziali, costi ricorrenti, debiti/crediti, allegati, export CSV, report mensile/annuale, conti soci |
| Marketing | Attività (social, stampa, grafica, menu), campagne, budget, versioni file, approvazioni, scadenze; collegamento a evento/campagna/generale |
| Risorse | Fornitori, collaboratori, attrezzature, materiali/prodotti, listini; assegnazioni per evento con carico e rientro |
| Analisi | Ricavi, costi, margini per evento e per servizio, andamento mensile, investimenti, anticipi soci; filtri periodo; distinzione effettivo / previsto / stimato |
| Impostazioni | Soci e quote di ripartizione, regime IVA, categorie, modelli checklist, utenti e permessi |

## Fuori ambito (per ora)
- Fatturazione elettronica SDI, contabilità in partita doppia, dichiarazioni fiscali.
- ERP di magazzino con giacenze in tempo reale.
- App nativa: l'app è una web app installabile (PWA leggera) su iPhone.
- Integrazione Google Drive: predisposta (campo link esterno sui file), non implementata.

## Principi
1. Un dato si inserisce una volta sola. Acconti e saldi sono pagamenti di un documento, non nuovi ricavi.
2. Previsto, stimato ed effettivo non si mescolano mai nello stesso numero.
3. Margine ≠ utile distribuibile ≠ saldo di cassa: tre indicatori distinti, etichettati in modo esplicito.
4. Quando una regola fiscale o societaria non è nota, diventa un'impostazione o una decisione da confermare (vedi `06-decisioni-da-confermare.md`).
