# Spike P0 — parsing di diete vere: cosa è emerso

**Obiettivo:** capire se un LLM estrae pasti, giorni, grammature e alternative dalle diete
reali con accuratezza da onboarding (>90% senza ritocco). Eseguito il 29/08/2026 su 6
diete fornite da Andrea (`diete/`, fuori da git — contengono dati sanitari di persone
vere). Le estrazioni sono in `diete/estrazioni/*.json`. Codice: nessuno da tenere
(conversioni textutil/pypdf usa-e-getta).

## Verdetto

**La feature è costruibile, ma il problema non è quello che pensavamo.** L'estrazione
in sé funziona: 4 diete su 6 estratte complete al primo colpo, e la foto — il caso
principale della nicchia — è la parte che funziona *meglio* (perfino foto di uno schermo,
con moiré, non del foglio). I due veri ostacoli scoperti sono a monte e a valle del
parsing: i formati Word con contenuto che l'estrazione testuale perde, e — molto più
importante — **un archetipo di dieta che il modello dati di Spesa oggi non sa
rappresentare: le alternative**. Numeri sotto; la soglia >90% resta **da validare** con
lo spot-check di Andrea sulle estrazioni e con un campione più grande.

## Il campione: 6 diete, 4 archetipi

| Dieta | Formato | Archetipo | Esito estrazione [misurato ora] |
|---|---|---|---|
| 6 | 7 foto WhatsApp (di uno schermo!) | Menu settimanale per giorno | **Completa**: 7 giorni, tutti i pasti e le grammature leggibili nonostante moiré e inclinazione |
| 2 | docx discorsivo | Menu su 2 settimane a rotazione | Completa (è il piano già caricato nell'app); insidia: grammature in tabella porzioni separata dal menu |
| 5 | PDF da software | Giornata unica ciclizzata, alternative per piatto | Completa; encoding sporco ma contenuto integro; contiene marchi (Findus, Nestlé, Santa Lucia) |
| 3 | PDF "consigli alimentari" | Schema giornaliero unico, alternative per porzione | Completa |
| 4 | docx a griglia | Griglia giorni × pasti + liste alternative | **A rischio**: la tabella linearizzata rende ambigua l'assegnazione blocco→pasto (6 colonne dichiarate, 5 blocchi per giorno). Risolvibile col parsing strutturale del docx, non col testo piatto |
| 1 | .doc legacy | Schema a macro, nessun alimento | **Fallita sul cuore**: lo schema pasti è un foglio di calcolo incorporato (`EMBED CalcDocument`) invisibile all'estrazione testuale. Recuperati solo regolamento e target |

Conteggi: ~80 voci alimento estratte dalla sola Dieta 6, ~60 alternative dalla 5, ~50
dalla 3 [misurato ora, contabili nei JSON].

**Verifica indipendente (29/08/2026):** Andrea ha controllato `dieta6.json` contro le 7
foto: **tutto corretto** — 100% sul caso foto, l'unico verificato da un occhio diverso
dall'estrattore. Le altre 5 estrazioni restano auto-valutate; la soglia >90% si giudica
sul campione allargato a ~20 diete.

## Le tre scoperte che cambiano il backlog

**1. Le alternative sono la regola, non l'eccezione.** 5 diete su 6 sono piene di
"oppure": alternative per piatto (dieta 5), per porzione (3), per pasto (4), dentro il
singolo piatto (6: "bresaola + spalmabile *o* cotto + scamorza *o* ricotta + noci").
Il modello di Spesa oggi ha piatti fissi ruotati dal planner: **non esiste il concetto di
scelta**. Senza, l'import appiattisce la dieta su una variante sola e la lista della spesa
compra sempre le stesse cose — l'opposto del "varia il più possibile" che i professionisti
scrivono ovunque. Questa è la modifica al dominio più importante emersa dallo spike, e va
progettata prima della UI di import (impatta `planner`, `list-builder` e lo schema).

**2. Il problema dei formati è di pipeline, non di intelligenza.** La foto — il caso che
temevamo — si legge benissimo. Quello che si rompe è il Word: tabelle linearizzate che
mescolano i pasti (dieta 4) e oggetti incorporati che spariscono (dieta 1). La pipeline
giusta è: docx → parsing strutturale (XML), .doc/PDF impaginati → **rendering a immagine
e lettura visiva**, foto → visione diretta. Cioè: la via visiva, che serve comunque per le
foto, è anche il fallback universale per i formati d'ufficio. Da verificare il costo per
dieta, ma l'architettura si semplifica: una via visiva + una strutturale, niente zoo di parser.

**3. Esiste un archetipo fuori portata (ed è giusto lasciarlo fuori).** La dieta a macro
(1) non prescrive alimenti: 5 "pasti a scelta" con target proteine/carbo/grassi e un
regolamento di equivalenze. Non c'è lista della spesa derivabile senza che l'utente
componga i pasti — è un prodotto diverso (composizione assistita con vincoli). Il flusso
di import deve **riconoscere l'archetipo e dirlo onestamente** ("questa dieta non ha un
menu: Spesa non fa per lei"), non produrre un import vuoto.

Scoperte minori ma concrete per il P1: grammature in range (70/80g, 120–150g — oggi lo
schema ha porzioni secche), unità non-gramme ("1 scatoletta piccola", "1 porzione",
"q.b.", "2-3 olive"), condimenti come blocco giornaliero e non per pasto, pasto libero
flottante, marchi specifici nel testo che aiutano il mapping formati.

## Prossimi passi

1. ~~Spot-check di Andrea su dieta6.json~~ **Fatto, esito: tutto corretto.**
2. **Allargare il campione a ~20 diete in totale** (oggi 6), privilegiando i casi non
   ancora coperti: foto annotate a penna (le porta Andrea appena può), altre griglie
   Word, altri software. Non servono 20 annotate a penna: ne bastano 3-4 — il campione
   deve coprire gli archetipi, non ripetere lo stesso caso.
3. **Progettare le alternative nel dominio** (brainstorm/spec dedicata) prima della UI
   di import: è diventato il prerequisito vero del P1.
4. Verificare il rendering .doc/.docx→immagine in pipeline (LibreOffice headless o
   equivalente) — NON ESEGUITO in questo spike.
