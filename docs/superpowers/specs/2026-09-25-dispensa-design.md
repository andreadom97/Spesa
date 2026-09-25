# Fase 4 del redesign: la Dispensa — design

**Data:** 25/09/2026 · **Stato:** bozza per la review di Andrea · **Base:** `main` `46ef8f4`,
`design/sistema/DESIGN.md` v3, i mockup in `design/ridisegno/dispensa-v2/` (scaricati il 25/09
dal progetto Claude Design `5f1a24e3-…`):
- `Dispensa - modifiche v2.dc.html` (**v2**, frame 01–12), la fonte principale;
- `Dispensa - foglio del dock.dc.html` (**v1**, frame 01–19), che vale dove la v2 la richiama;
- `Dispensa pagina v2.dc.html`, la pagina riusata sotto i frame;
- `CLAUDE.md` del progetto, con il verbale delle correzioni del 25/09.

La pagina approvata il 19/09 (`design/ridisegno/Dispensa - tinta d'area e dock.html`) resta la
base visiva delle tessere e dei widget d'area.

**Obiettivo.** Portare la Dispensa nel ridisegno. La pagina mostra quello che c'è in casa in
widget d'area con la ricerca in cima; il tocco su una tessera apre il dettaglio, dove si
corregge a mano; la nota e la voce passano da `Modifica con l'AI`. Successo: dal telefono si
trova un ingrediente scrivendone il nome, lo si segna finito o in casa, se ne corregge residuo e
scadenza, si aggiunge una confezione con lo scanner, e si manda una nota dettata tenendo premuto
il microfono. La suite resta verde, le prove dal telefono passano, e la lista della spesa
continua a dare gli stessi numeri a parità di dati.

**Le decisioni di Andrea che questa spec applica.**

Del 25/09, in Claude Design (verbale in `dispensa-v2/CLAUDE.md`):
1. Il tocco sulla tessera apre il dettaglio dell'ingrediente. Spariscono `A mano` e il foglio a
   tre voci.
2. Il Dock dice `Modifica con l'AI`, col microfono accanto.
3. La scansione legge il codice a barre di una confezione e vive nel dettaglio dell'ingrediente
   e nel foglio Nuovo ingrediente. Un codice nuovo si lega all'ingrediente aperto: sparisce la
   scelta da elenco (v1 14).
4. La ricerca sta in pagina e filtra i widget. I mai comprati compaiono solo fra i risultati.
5. Nessun risultato → `Crea «…»`, che apre il foglio Nuovo ingrediente.
6. Il dettaglio ha In casa, Residuo con `SALVA`, Congelatore, la scadenza correggibile a mano
   con la stima come default.
7. Nota e voce sono un widget sopra la pagina; tenendo premuto il microfono si detta, e al
   rilascio niente parte da solo.
8. `Fai le modifiche` (era `Correggi`) manda la nota, con la luce sul testo mentre l'AI lavora.
9. Il caricamento sono i widget vuoti attraversati dalla stessa luce.
10. Niente contatori sulle etichette dei widget.

Del 25/09, in chat, sulle due domande aperte dal disegno:
- **Una scadenza per ingrediente, correggibile**, non una per confezione. La correzione entra
  davvero nel calcolo della lista (§E). Le confezioni vere, con una riga ciascuna, restano
  fuori da questa fase.
- **Segnare «finito» costa due tocchi** (tessera → `FINITO`). La tessera non è più un
  interruttore.

Del 23/09, ancora in vigore: i mai comprati fuori dalla pagina; gli avvisi «decaduto» e
«dimenticato» come pillola bianca sulla tessera; la riga `Da quando usi Dispesa: …` va nelle
Impostazioni (fase 5).

**Fuori scope, esplicitamente:**
- le confezioni come righe con scadenza propria (tabella nuova, consumo dalla più vecchia);
- la riga `Da quando usi Dispesa` nelle Impostazioni: la mostra la fase 5, e fino ad allora non
  si vede da nessuna parte (§K);
- `/lista/confezioni` e il suo scanner, che restano come sono;
- la route `/api/dispensa/correggi` e il modello dell'AI: cambia solo l'interfaccia che li usa;
- le Impostazioni, fase 5.

**Il database cambia di una colonna**: `pantry_state.scadenza_manuale` (§E). La migrazione va
applicata in produzione **prima** del deploy, con l'ok di Andrea.

---

## A. La pagina

Frame: v2 01, 02, 05; v1 17, 18, 19; `Dispensa pagina v2`.

**Dall'alto:**
1. **Testata** `Dispensa` col menù utente, come le altre sezioni.
2. **Campo di ricerca** 44, margine `4 / 16 / 14`, raggio 14, `--ombra-campo`, lente 18,
   segnaposto e `aria-label` `Cerca in dispensa`. Scorre con la pagina, non resta fisso. Non
   prende il fuoco all'apertura.
3. **Un widget per area**, nell'ordine delle aree delle Impostazioni (`ordineAree`). Etichetta
   col quadratino d'area, **senza contatore**. Un'area senza tessere non ha widget.
4. **Il widget Pronti**, in fondo, solo con almeno un lotto utilizzabile
   (`porzioniUtilizzabili > 0`, come oggi). Nessun colore d'area; tessere su fondo 0,04.
5. **Il Dock**: pillola 56 `Modifica con l'AI` con l'icona AI, e il tondo 56 del microfono
   `Registra un vocale` solo se il browser ha `SpeechRecognition` (v1 15: senza, la pillola
   resta allineata a destra e nessun posto vuoto).

**Cosa c'è nei widget.** Le tessere di ogni ingrediente con residuo > 0 (**in casa**) o con
residuo 0 e almeno un acquisto (**finite**). Dentro il widget, ordine per nome A–Z, finite
mescolate alle altre: il reparto e il nome dicono dove trovarle, lo stato no. I **mai
comprati** (residuo 0, nessun acquisto) non ci sono: si trovano solo dalla ricerca (§B).

**La tessera di dispensa.** Resta quella di `DESIGN.md` §8 nella forma (tinta d'area al 26% in
casa, tratteggiata e barrata finita), ma **cambia il gesto**:
- è un `<button>` con `aria-label` `Apri {Nome}`, **senza `aria-pressed`**: il tocco apre il
  dettaglio (§D);
- in alto la pillola della quantità (residuo con unità); finita, la pillola `Finito`;
- sotto il nome, **una pillola sola** di stato, bianca, mono 8,5, scelta con questa
  precedenza (v1, note):
  1. `NESSUN PASTO LO USA`, se l'ingrediente è «dimenticato» (stessa condizione di oggi);
  2. `Scade oggi` / `Scade il {gg/mm}`, se ha una scadenza (§E, la scadenza effettiva);
  3. `FORSE NON PIÙ BUONO`, se è «decaduto» (residuo > 0, utilizzabile 0);
  4. `Congelato`, in `--freddo`.

  Le prime tre in `--avviso`. Il testo intero degli avvisi sta nel dettaglio.

**La tessera del lotto** (widget Pronti): porzioni in alto (`4 porz.`), nome del piatto o
`Piatto eliminato`, pillola `Congelato` se lo è. `aria-label` `Apri il lotto di {Piatto}`. Il
tocco apre il dettaglio del lotto (§G).

**Gli stati.**
- **Caricamento** (v2 05): tre widget bianchi vuoti con la barra dell'etichetta e tessere 104
  a fondo 0,06, attraversati dalla **luce dei widget** (§H.5). Ricerca visibile ma ferma,
  niente Dock, `role="status"` con nome `Carico la dispensa`. **Dopo 8 s** senza dati la
  pagina passa all'errore; una risposta arrivata dopo si scarta.
- **Errore di caricamento** (v1 17): il messaggio in `--errore` sotto la testata e `RIPROVA`,
  pillola bianca 44, che rilancia il caricamento. Niente Dock.
- **Vuoto** (v1 18): nessun ingrediente in casa né finito e nessun lotto. Stato vuoto con
  `Ancora niente in dispensa` e il testo di oggi. **Il Dock resta intero**, e la ricerca pure:
  dopo l'import i mai comprati ci sono già, e si trovano da lì.

**Tolto dalla pagina:**
- i gruppi `IN CASA`, `FINITI`, `MAI COMPRATI` e il gruppo `PRONTI` di oggi;
- i campi del residuo e delle porzioni, e i tasti congelatore ed elimina dentro le righe;
- la riga meta `PRESO IL … · IN CONGELATORE · SCADE …`;
- la riga `Da quando usi Dispesa: …`;
- la scheda `Il conto non torna? Correggi con una nota`;
- il sottotitolo `Calcolato da spesa e piano…`, che passa nel dettaglio.

## B. La ricerca, una funzione pura

Frame: v2 02, 03.

Una funzione in `src/domain/ricerca-dispensa.ts`, testata da sola. Usa `normalizza` di
`src/domain/import/mapping.ts` (minuscole, senza accenti, spazi compattati), come la ricerca
dei Piatti.

- **Il filtro parte dal primo carattere.** Una voce corrisponde se il nome normalizzato
  **contiene** la query normalizzata.
- **Cosa si cerca:** tutti gli ingredienti, mai comprati compresi, e i lotti Pronti per nome
  del piatto.
- **Cosa resta:** solo i widget con almeno un risultato e, dentro, solo le tessere che
  corrispondono, nell'ordine di §A. I mai comprati compaiono nel widget della loro area, dopo
  le altre tessere.
- **Il contatore**, sotto il campo: `1 risultato` / `{n} risultati`, mono 10 in `--sec`,
  `aria-live="polite"`.
- **Con la query** il campo ha il bordo 1,5 `--ink` e la X `Svuota la ricerca` (bersaglio 40
  dentro il campo 44). La X svuota e riporta il fuoco nel campo.

**La tessera del mai comprato** (componente nuovo, v2 02): tratteggiata come la finita, pillola
`MAI COMPRATO`, nome in `--testo-2` **non barrato**. Il tocco apre il dettaglio con residuo 0.

**Nessun risultato** (v2 03): al posto dei widget, una scheda 22 (padding 20, gap 14) con:
- `Nessun ingrediente si chiama «{query}»`, 17/700;
- `Crealo ora: entra fra gli ingredienti e da qui lo segni in casa.`, 14 in `--testo-2`;
- `CREA «{QUERY}»`, tasto primario 54 a tutta larghezza, che apre il foglio Nuovo ingrediente
  (§C) col nome preso dalla query così com'è scritta, spazi ai bordi tolti.

Il contatore, a zero risultati, non compare: parla la scheda.

## C. Il foglio Nuovo ingrediente

Frame: v2 04.

Un Foglio dal basso da top 88, `role="dialog"`, `aria-label` `Nuovo ingrediente`, X 44
`Chiudi senza creare`. Dall'alto:

1. **Il nome**, 32/800, preso dalla ricerca e modificabile al tocco (un campo di testo con
   l'aspetto del titolo).
2. **Reparto**: **sei pillole 44**, una per area, in fila che va a capo; la scelta in `--ink`
   con `aria-pressed`. Niente `ALTRI…`: le aree sono sei e ci stanno (§M).
3. **Quanto ne hai**: campo numerico 96 con `aria-label` `Residuo di {Nome}`, e i segmenti
   dell'unità `G` / `PZ` / `ML` (38 dentro il binario 44).
4. **`SCANSIONA LA CONFEZIONE`**, tasto secondario 54 con l'icona di scansione (§F.3).
5. **Deperibile**: riga di impostazione `Sì` / `No`.
6. **`CREA L'INGREDIENTE`**, primario 54 in fondo.

**I default.** Se il nome normalizzato coincide con una voce di `INGREDIENTI_BASE`
(`src/domain/ingredienti-base.ts`), reparto, unità e deperibile vengono da lì. Altrimenti:
nessun reparto scelto, unità `g`, e deperibile segue il reparto appena lo si sceglie
(`AREA_DEPERIBILE`). Classe del residuo e formato della confezione vengono da
`predefinitiIngrediente(area, unita)`, salvo un formato letto dallo scanner.

**`CREA L'INGREDIENTE`** è spento finché il nome è vuoto o il reparto non è scelto. Il campo
della quantità vuoto vale 0. Al tocco:
- nome già usato da un altro ingrediente (confronto normalizzato) → errore sotto il nome,
  `C'è già un ingrediente che si chiama così.`, e niente si scrive;
- altrimenti `salvaIngrediente`, poi, se la quantità è > 0, la regola d'entrata di §E.2. Se
  la scansione ha letto un codice, l'ingrediente nasce con quel `ean`.

Creato l'ingrediente, il foglio si chiude, la ricerca si svuota, e la tessera compare nel suo
widget: in casa se la quantità è > 0; se è 0, l'ingrediente è un mai comprato e si trova dalla
ricerca. Un errore di scrittura lascia il foglio aperto con
`Non siamo riusciti a salvare. Riprova.` sopra il tasto, che torna acceso. La X chiude senza
creare niente.

## D. Il dettaglio dell'ingrediente

Frame: v2 06, 07; v1 04, 05.

Un Foglio dal basso da top 88, `role="dialog"`, `aria-label` `{Nome}`. **Un livello solo**:
- in testata il reparto a sinistra (mono 10 col quadratino) e la X 44 `Chiudi il foglio` a
  destra, senza freccia;
- sotto, il nome 32/800;
- se c'è un avviso, il suo **testo intero** sotto il nome, 11,5 in `--avviso`:
  - «dimenticato»: `Nessun pasto in programma lo usa prima che scada.`
  - «decaduto»: `Troppo tempo per essere ancora buono: la lista lo richiede.`

Poi i blocchi, divisi da filetti 1 px con 16 di distacco. Il foglio scorre dentro di sé.

**1. In casa.** Riga di impostazione con `SÌ` / `FINITO`, `aria-pressed` sul tasto che vale,
`aria-label` `{Nome}: segna in casa` / `{Nome}: segna finito`. **Salva al tocco**, come il
congelatore: è reversibile.
- `SÌ` da residuo 0 → residuo = **una confezione** (`formatoConfezione`), con la regola
  d'entrata (§E.2). Da residuo > 0 non fa niente.
- `FINITO` → residuo 0, scadenza manuale cancellata.

**2. Residuo.** Campo numerico 96 × 44 con l'unità, `aria-label` `Residuo di {Nome}`, e la
pillola `SALVA`:
- spenta (fondo 0,10, testo `--ter`) finché il numero non cambia;
- l'Invio della tastiera vale `SALVA`;
- in volo: opacità 0,5 e `disabled`;
- errore: campo col bordo 1,5, `SALVA` diventa `RIPROVA` pieno, e sotto
  `Non siamo riusciti a salvare la correzione. Riprova.` in `--errore` (v1 05);
- chi chiude senza salvare ritrova il residuo di prima.

Sotto, `Calcolato da spesa e piano: correggi solo se non torna con la realtà.` in `--testo-2`.
Un valore non valido (vuoto, negativo, non numerico) riporta il campo al valore salvato, come
oggi.

**3. In congelatore** (solo deperibili; per gli altri il blocco non c'è, nemmeno spento). `SÌ`
/ `NO` con i nomi di oggi, `{Nome}: metti in congelatore` / `{Nome}: togli dal congelatore`,
`aria-pressed`. Salva al tocco. Cambiarlo **cancella la scadenza manuale** (§E.3).

**4. Scadenza** (solo se c'è una stima, §E.1: deperibile, residuo > 0, un acquisto, area con
soglia). Una riga su fondo 0,04 raggio 14:
- `Scade il {gg/mm}` 14/700, in `--avviso` se scade oggi o domani;
- sotto, in mono 9, l'origine: `STIMA` in `--testo-2` oppure `MODIFICATA DA TE` in `--ink`;
- a destra `MODIFICA`, pillola 44, `aria-label` `Modifica la scadenza di {Nome}`.

`MODIFICA` apre la riga sul posto (v2 07):
- `SCADENZA`, e un campo data 140 × 44 (`type="date"`, `aria-label` `Scadenza di {Nome}`),
  col fuoco; `min` oggi, `max` oggi + 2 anni;
- `SALVA`, con le stesse regole di quella del residuo;
- sotto, `La stima di Dispesa è il {gg/mm}.` in 12,5 `--testo-2`, e `USA LA STIMA`, pillola
  bianca, solo se la scadenza è modificata.

`SALVA` scrive la data e richiude la riga; `USA LA STIMA` cancella la data manuale e richiude.
Una data fuori dall'intervallo non si salva e mostra
`Scegli una data fra oggi e i prossimi due anni.` in `--errore`.

**5. `SCANSIONA UNA CONFEZIONE`**, tasto secondario 54 con l'icona di scansione 20. C'è per
tutti gli ingredienti, anche non deperibili (§F).

**Il mai comprato** apre lo stesso dettaglio con residuo 0, `FINITO` premuto, e senza il
blocco Scadenza. `SÌ` o un residuo salvato > 0 lo fanno entrare in pagina.

**Dopo ogni scrittura riuscita** la pagina sotto si aggiorna in modo ottimistico, come oggi:
stato locale subito, ripristino se la chiamata fallisce. Gli errori dei tocchi che salvano
subito (In casa, Congelatore) dicono `Non siamo riusciti a salvare. Riprova.` sotto la loro
riga.

## E. Il modello della scadenza

È l'unica parte che tocca il calcolo della lista: ha la sua review di correttezza (§N).

**E.1 La scadenza effettiva.** Oggi `scadenzaResiduo` calcola `ultimo_acquisto + soglia` (la
soglia è `GIORNI_CONGELATO` se congelato, `GIORNI_FRESCO[area]` altrimenti), e
`residuoUtilizzabile` azzera il residuo di un deperibile oltre quella soglia. Da questa fase:

- **Colonna nuova** `pantry_state.scadenza_manuale date null`, migrazione
  `0014_scadenza_manuale.sql`. Null = vale la stima.
- **La stima** è la funzione di oggi, rinominata `scadenzaStimata` (stesso contratto: null se
  residuo ≤ 0, non deperibile, mai comprato o soglia nulla).
- **La scadenza effettiva** `scadenzaResiduo` = `scadenzaManuale` se c'è e la stima non è
  nulla, altrimenti la stima. Una data manuale su una voce senza stima si ignora.
- **`residuoUtilizzabile`** legge la scadenza effettiva: residuo intero finché
  `oggi ≤ scadenza`, 0 dopo. Il contratto di `scadenza.ts` resta vero:
  `residuoUtilizzabile(oggi) > 0 ⇔ oggi ≤ scadenza`.
- `ResiduoUtilizzabileInput` e `PantryState` guadagnano `scadenzaManuale: string | null`, e il
  mapper la legge. **Tutti i chiamanti** la passano: `list-builder.ts`, `planner.ts`,
  `conflitto.ts`, `scadenza.ts` (`avvisiScadenza`), `piano/[data]/[slotDefId]/scegli/page.tsx`
  e la Dispensa.

**Senza date manuali, ogni numero resta identico**: è la prova che il cambio non rompe la lista
(§L.1).

**E.2 La regola d'entrata.** Quando il residuo passa **da 0 a più di 0** per un gesto
dell'utente, è roba nuova che entra in casa:
- `ultimo_acquisto` = oggi;
- `scadenza_manuale` = null.

Vale per `SÌ` di In casa, `SALVA` del residuo da 0, `AGGIUNGI` dello scanner, la creazione con
quantità > 0, e le proposte della nota AI applicate su un residuo 0. Da > 0 a > 0 non tocca le
date. È un cambio di comportamento dichiarato: oggi un residuo dichiarato su un mai comprato
non ha acquisto e non scade mai (docstring di `residuoUtilizzabile`), da questa fase scade come
un acquisto.

**E.3 Quando la data manuale si cancella.**
- residuo che va a 0 (`FINITO`, `SALVA` a 0, nota AI);
- regola d'entrata;
- `AGGIUNGI` dello scanner (§F);
- cambio del congelatore, perché la stima cambia da giorni a mesi e la data scritta valeva
  per l'altro stato;
- `chiudiSpesa`, per ogni voce comprata (dove scrive `ultimo_acquisto`).

**E.4 Le funzioni di scrittura** (in `src/data/dispensa.ts`):
- `correggiResiduo(ingredientId, residuo, prima)` riceve il residuo di prima da chi chiama e
  applica E.2 ed E.3 nella stessa `upsert`. Le usano il dettaglio, la creazione e la nota AI.
- `impostaCongelato` cancella anche `scadenza_manuale`.
- **nuova** `impostaScadenza(ingredientId, data: string | null)`; null = `USA LA STIMA`.
- **nuova** `aggiungiConfezione(ingredientId, formato, ean)` (§F.2).

La logica di E.2 ed E.3 sta in una funzione pura di dominio, testata da sola; le funzioni di
dati la applicano.

## F. La scansione

Frame: v2 08; v1 12, 13.

**F.1 Dal dettaglio.** `SCANSIONA UNA CONFEZIONE` porta il foglio del dettaglio a una vista di
lettura, `aria-label` `Scansiona una confezione`. In testata la freccia `Torna a {Nome}`, il
nome e la X; la freccia torna al dettaglio. Dentro, la logica di lettura di `Scanner.tsx`
(BarcodeDetector e fotocamera), estratta nell'hook `useLettoreCodici`; `Scanner.tsx` resta
com'è per `/lista/confezioni`, reso come v1 12 e 13:
- **lettura:** anteprima col raggio 14 e la cornice guida a quattro angoli, riga
  `Inquadra il codice a barre: si legge da solo.`, e `DIGITA IL CODICE` (secondario 54);
- **codice da digitare:** campo mono 14 `Codice a barre`, `inputmode="numeric"`,
  `CERCA IL CODICE` (primario 54, spento a campo vuoto, Invio = cerca). Senza fotocamera la
  riga dice `La fotocamera non è disponibile: digita il codice sotto la confezione.`; con la
  fotocamera, al posto della riga c'è `USA LA FOTOCAMERA` (secondario) per tornare alla
  lettura.

**F.2 L'esito**, sotto l'anteprima su fondo 0,04 (v2 08), secondo il codice letto:

| Codice | Esito | Tasti |
|---|---|---|
| è l'`ean` di questo ingrediente | `Confezione da {formato}` col formato dell'ingrediente, niente rete | `NON È QUESTA` · `AGGIUNGI` |
| è l'`ean` di un altro ingrediente Y | `Questo codice è di {Y}.` | `NON È QUESTA` · `APRI {Y}` |
| nessuno lo ha, e OFF dà un formato nell'unità dell'ingrediente | `Confezione da {formato}` | `NON È QUESTA` · `AGGIUNGI` |
| nessuno lo ha, OFF non lo trova o non dà un formato | `Prodotto non trovato: puoi scrivere il formato a mano.` e il campo del formato con l'unità dell'ingrediente | `NON È QUESTA` · `AGGIUNGI`, spento finché il formato non è valido |
| nessuno lo ha, OFF dà un'altra unità | `Unità diversa ({unità OFF} contro {unità}): scrivi il formato a mano.` e il campo | come sopra |
| la rete o OFF falliscono | `Non riusciamo a interrogare il catalogo. Riprova, o scrivi il formato a mano.` e il campo | come sopra |

Il codice letto sta sopra l'esito in mono 10, `CODICE {ean}`. Per un deperibile, sotto il
formato, `Scade il {gg/mm}, stima: la correggi dopo, qui nel dettaglio.` in 12,5, con la data
= oggi + soglia dell'area (o `GIORNI_CONGELATO` se l'ingrediente è in congelatore).

- **`AGGIUNGI`** chiama `aggiungiConfezione`: residuo + formato, `ultimo_acquisto` = oggi,
  `scadenza_manuale` = null, e sull'ingrediente `ean` = codice e `formato_confezione` = formato
  (come fa già `aggiornaFormatoDaScansione`: l'ultima confezione è la miglior previsione della
  prossima). Poi torna al dettaglio, aggiornato.
- **`NON È QUESTA`** toglie l'esito e riprende la lettura.
- **`APRI {Y}`** sostituisce il dettaglio con quello di Y. Il codice resta a Y: da qui non si
  sposta.
- Un 401 dalla route porta a `/entra`, come in `/lista/confezioni`.

**Il limite dichiarato:** con una scadenza per ingrediente, `AGGIUNGI` rinfresca la scadenza di
tutto il residuo, vecchio compreso. È lo stesso limite che ha già `chiudiSpesa`, e sbaglia
dalla parte del «ce l'hai ancora».

**F.3 Da Nuovo ingrediente.** `SCANSIONA LA CONFEZIONE` apre la stessa vista di lettura dentro
il foglio, con la freccia `Torna al nuovo ingrediente`. Letto il codice:
- se è l'`ean` di un ingrediente Y: `Questo codice è di {Y}.` e `APRI {Y}`, che chiude Nuovo
  ingrediente e apre il dettaglio di Y;
- se OFF dà un formato: torna al foglio con **quantità e unità** riempite dal formato, il
  formato della confezione uguale, e il codice tenuto per la creazione;
- altrimenti: torna al foglio col codice tenuto e, sotto il tasto di scansione, il messaggio
  di OFF della tabella sopra; la quantità si scrive a mano.

## G. Il lotto Pronto

Frame: v1 06, 06b (la v2 li conferma).

Un Foglio dal basso da top 88, `aria-label` `Lotto di {Piatto}`, con la sola X (si apre dalla
pagina, un livello). Etichetta `PRONTI`, nome del piatto, dati
`PREPARATO IL {12 SET}` (+ ` · IN CONGELATORE`) in mono 10 `--testo-2`. Poi:
- **Porzioni**: campo 96 `Porzioni di {Piatto}`, `SALVA` con le regole del residuo; sotto
  `1 impegnata` / `{n} impegnate` in `--testo-2`, nessuna riga se zero;
- **In congelatore**: `SÌ` / `NO`, `{Piatto}: metti in congelatore` / `…: togli dal
  congelatore`, salva al tocco;
- **`ELIMINA IL LOTTO`**, tasto secondario 54 in fondo, `aria-label`
  `Elimina il lotto di {Piatto}`.

**Il dialogo** (v1 06b): secondo velo 0,35 e un foglio piccolo `role="alertdialog"`,
`Elimini il lotto?`, il testo
`{Piatto}, {n} porzioni. {k} sono impegnate dai pasti in programma: dopo, quei pasti non le
trovano più.` (la seconda frase solo con impegnate > 0; `1 porzione`, `1 è impegnata`), e
`ANNULLA` (secondario) · `ELIMINA` (distruttivo pieno in `--errore`). Il velo non chiude. Dopo
`ELIMINA` il foglio del lotto si chiude e la tessera sparisce; un errore lascia il dialogo con
`Non siamo riusciti a salvare. Riprova.`.

## H. Modifica con l'AI

Frame: v2 09–12; v1 11. Sostituisce la scheda `NotaDispensa`; la logica di chiamata, di
applicazione, di `Annulla` e di `Conferma` resta quella di oggi (`NotaDispensa.tsx`), cambia la
forma.

**H.1 Il widget.** Dal tocco su `MODIFICA CON L'AI`:
- velo 0,35 su tutta la pagina, tab bar compresa; il tocco sul velo chiude;
- il Dock sparisce, e al suo posto nasce il widget: scheda bianca a 12 dai lati, raggio 22,
  `--ombra-flottante`, padding `12 / 12 / 12 / 16`, `role="dialog"`, `aria-label`
  `Modifica con l'AI`;
- in cima l'etichetta mono 10 `MODIFICA CON L'AI` con l'icona AI 14, e la X 44 `Chiudi`;
- il campo libero (textarea), col fuoco, minimo 96, cresce col testo fino a 5 righe, 15/1,5,
  segnaposto `Es. ho finito il riso, l'olio è a metà…`;
- sotto, la fila: il tondo 56 del microfono `Registra un vocale` (se c'è la dettatura) e
  `FAI LE MODIFICHE`, primario 54, spento a campo vuoto.

**Posizione.** Con la tastiera aperta il widget poggia sulla tastiera; senza, sta dove stava
il Dock (bottom 114). L'altezza della tastiera si legge da `visualViewport` [ipotesi: su
Android Chrome la tastiera non ridimensiona il layout, quindi senza `visualViewport` il widget
finirebbe sotto; da verificare sul telefono, §L.4].

**Chiudere** (X o velo) con testo scritto lo tiene come bozza fino alla prossima apertura,
nella memoria della pagina (non in `localStorage`). Chiudere dopo l'esito svuota tutto.

**H.2 La dettatura.** `SpeechRecognition` con `lang = 'it-IT'`, `continuous = true`,
`interimResults = true`. Due modi di usarla:
- **tenuto premuto** (eccezione dichiarata a §9, chiesta da Andrea): `pointerdown` avvia; il
  rilascio dopo almeno 350 ms ferma. Il rilascio si ascolta su `window`, perché dal Dock il
  tondo sparisce sotto il dito quando il widget si apre;
- **tocco breve** (rilascio prima di 350 ms, oppure attivazione da tastiera): avvia, e un
  secondo tocco ferma. È la via principale per lo screen reader.

**Mentre detta** (v2 10), niente tastiera; il widget sta a bottom 114:
- il tondo a scala 1,06 con alone 6 px a 0,10;
- accanto, la banda `--ink` 54 con l'**onda di dettatura** (22 barre da 3 px, da 6 a 26 px,
  220 ms alternate, sfasate) e il tempo `0:07` in `tabular-nums`, `role="status"`;
- il testo dettato entra nel campo **mentre parli**: le parole provvisorie in `--ter`, quelle
  definitive in `--ink`. Il campo ha `aria-live="polite"`;
- sotto, `RILASCIA PER FERMARE` (tenuto) o `TOCCA PER FERMARE` (tocco breve), mono 10.

**Allo stop** il testo resta nel campo, accodato a quello che c'era con uno spazio, e la fila
torna quella di H.1: **niente parte da solo**. Si ferma anche se il browser chiude da sé la
sessione (`onend`), e se il widget si chiude. Dal microfono del Dock il widget si apre già in
dettatura.

**Permesso del microfono negato** o errore del riconoscimento: sotto il campo, in `--errore`,
`Il microfono non è disponibile: scrivi la nota.`, e il tondo resta.

**H.3 `FAI LE MODIFICHE` e la luce sul testo** (v2 11). Al tocco:
- il campo diventa di sola lettura: al posto della textarea, lo stesso testo in un blocco su
  cui passa la **luce sul testo** (§H.5);
- il tondo e `FAI LE MODIFICHE` a opacità 0,5 e `disabled`;
- sotto, `PREPARO LE MODIFICHE…` in mono 10, `role="status"`.

La luce si ferma all'esito o all'errore.

**H.4 L'esito** (v2 12). Il widget cresce verso l'alto fino a top 88, resta sopra la tab bar,
e dentro scorre. I tre gruppi e le righe di proposta di v1 10, stretti di 4:
- `APPLICATE {k} DI {n}`, righe con `ANNULLA` (pillola bianca 44); annullata: nome e cambio
  barrati a 0,34, `ANNULLATA` sotto, nessun tasto;
- `DA CONFERMARE {n}`, righe con `CONFERMA` (pillola `--ink` 44); confermata passa fra le
  applicate;
- `NON RICONOSCIUTI`, le frasi fra caporali, e sotto `Cercali in dispensa.`.

Riga di proposta: `{Nome} {attuale} → {nuovo} {unità}`, `{Nome} frigo → freezer`,
`{Nome} freezer → frigo`, e sotto la motivazione. Le applicate si vedono già sulle tessere
dietro il velo (la pagina rilegge i dati come oggi). La X chiude e il Dock torna.

**Errori** (v1 11), sotto il campo in `--errore`, `role="alert"`, i tre di oggi con le stesse
condizioni:
- 503: `La correzione non è disponibile.`, e `FAI LE MODIFICHE` si spegne;
- 422: `Non ho capito la nota, riprova.`;
- ogni altro errore: `Non siamo riusciti a correggere. Riprova.`

Il testo resta nel campo e si rimanda.

**H.5 Le due luci** (eccezioni dichiarate a §7 e §12):
- **luce dei widget** (`.anim-luce-widget`): una fascia bianca all'85% che attraversa ogni
  widget vuoto da sinistra a destra, 1400 ms, `cubic-bezier(.4,0,.2,1)`, in loop, **in fase su
  tutti i widget**;
- **luce sul testo** (`.anim-luce-testo`): sfumatura `--ink` → `#B9AEF5` → `#9CC7F2` →
  `#B9AEF5` → `--ink`, larga il 300%, ritagliata sulle lettere, 1600 ms lineare, in loop.

Entrambe durano quanto l'attesa e stanno dentro `prefers-reduced-motion: no-preference`. Con
meno moto: widget vuoti fermi, testo fermo in `--ink`, e parla solo la riga di stato.

## I. Copy che cambia

Le righe segnate **nuovo** sono testo scritto per questa fase: vanno approvate con la spec.

| Dove | Oggi | Diventa |
|---|---|---|
| Ricerca in pagina | — | **nuovo** `Cerca in dispensa` (segnaposto e `aria-label`) |
| Svuota la ricerca | — | **nuovo** `Svuota la ricerca` (`aria-label`) |
| Contatore dei risultati | — | **nuovo** `1 risultato` / `{n} risultati` |
| Etichette dei widget | `{n} voci` | via |
| Tessera, nome accessibile | interruttore con `aria-pressed` | **nuovo** `Apri {Nome}` |
| Tessera del lotto | — | **nuovo** `Apri il lotto di {Piatto}`; `{n} porz.` |
| Tessera mai comprata | gruppo `MAI COMPRATI` | pillola `MAI COMPRATO` (v1) |
| Avviso «dimenticato», tessera | la frase intera | `NESSUN PASTO LO USA` (v1) |
| Avviso «decaduto», tessera | la frase intera + ` Se l'hai congelato, dillo qui accanto.` | `FORSE NON PIÙ BUONO` (v1); nel dettaglio la frase senza la coda, perché il congelatore sta subito sotto |
| Scadenza, tessera | `SCADE OGGI` / `SCADE IL 12 SET` | `Scade oggi` / `Scade il {gg/mm}` (disegno approvato) |
| Nessun risultato | — | **nuovo** `Nessun ingrediente si chiama «{query}»` · `Crealo ora: entra fra gli ingredienti e da qui lo segni in casa.` · `CREA «{QUERY}»` |
| Nuovo ingrediente | — | **nuovo** `Nuovo ingrediente` · `Chiudi senza creare` · `Reparto` · `Quanto ne hai` · `SCANSIONA LA CONFEZIONE` · `Deperibile` · `CREA L'INGREDIENTE` · `C'è già un ingrediente che si chiama così.` · `Nome` (nome accessibile del campo del nome) |
| Dettaglio, In casa | tessera interruttore | **nuovo** `In casa` · `SÌ` / `FINITO` · `{Nome}: segna in casa` / `{Nome}: segna finito` |
| Dettaglio, residuo | salva al blur | `Residuo` · `SALVA` / `RIPROVA` (v1) |
| Dettaglio, scadenza | — | **nuovo** `Scadenza` · `Scade il {gg/mm}` · `STIMA` · `MODIFICATA DA TE` · `MODIFICA` · `Modifica la scadenza di {Nome}` · `SCADENZA` · `Scadenza di {Nome}` · `La stima di Dispesa è il {gg/mm}.` · `USA LA STIMA` · `Scegli una data fra oggi e i prossimi due anni.` |
| Dettaglio, scanner | — | **nuovo** `SCANSIONA UNA CONFEZIONE` |
| Scansione | — | v1: `Inquadra il codice a barre: si legge da solo.` · `DIGITA IL CODICE` · `La fotocamera non è disponibile: digita il codice sotto la confezione.` · `Codice a barre` · `CERCA IL CODICE` · `USA LA FOTOCAMERA` |
| Scansione, testata | — | **nuovo** `Scansiona una confezione` · `Torna a {Nome}` · `Torna al nuovo ingrediente` |
| Scansione, esito | — | **nuovo** `CODICE {ean}` · `Confezione da {formato}` · `Scade il {gg/mm}, stima: la correggi dopo, qui nel dettaglio.` · `NON È QUESTA` · `AGGIUNGI` · `Questo codice è di {Y}.` · `APRI {Y}` · `Unità diversa ({u} contro {u}): scrivi il formato a mano.` · `Formato della confezione di {Nome}` (nome accessibile del campo del formato) |
| Scansione, OFF | in `/lista/confezioni` | invariati: `Prodotto non trovato: puoi scrivere il formato a mano.` · `Non riusciamo a interrogare il catalogo. Riprova, o scrivi il formato a mano.` |
| Lotto | icone | `PRONTI` · `Porzioni` · `ELIMINA IL LOTTO` (v1) |
| Dialogo del lotto | nessuno | v1: `Elimini il lotto?` · `{Piatto}, {n} porzioni. {k} sono impegnate dai pasti in programma: dopo, quei pasti non le trovano più.` · `ANNULLA` · `ELIMINA` |
| Dialogo del lotto, singolare | nessuno | **nuovo** (Task 6) con 1 porzione: `{Piatto}, 1 porzione.`; con 1 impegnata: ` 1 è impegnata dai pasti in programma: dopo, quei pasti non la trovano più.` |
| Dock | `Fai una modifica` (disegno) | **nuovo** `Modifica con l'AI` (reso `MODIFICA CON L'AI`) |
| Microfono | `Detta la nota` | `Registra un vocale`, ovunque |
| Widget AI | scheda `Il conto non torna? Correggi con una nota` | **nuovo** `Modifica con l'AI` (nome del dialogo ed etichetta) · `Chiudi` |
| Dettatura | — | **nuovo** `RILASCIA PER FERMARE` · `TOCCA PER FERMARE` · `Il microfono non è disponibile: scrivi la nota.` |
| Mandare la nota | `Correggi` | **nuovo** `FAI LE MODIFICHE` |
| In volo | — | **nuovo** `PREPARO LE MODIFICHE…` |
| Contatori dei gruppi dell'esito | `APPLICATE`, `DA CONFERMARE` | `APPLICATE {k} DI {n}`, `DA CONFERMARE {n}` (v1) |
| Non riconosciuti | nessuna indicazione | **nuovo** `Cercali in dispensa.` |
| Caricamento | nessun testo | **nuovo** `Carico la dispensa` (nome dello stato) |
| Errore di caricamento | `Non riusciamo a caricare la dispensa. Riprova più tardi.` | `Non riusciamo a caricare la dispensa. Riprova.` + `RIPROVA` (proposta v1: «più tardi» contraddice il tasto accanto) |

**Invariati:** `Ancora niente in dispensa` e il suo testo; `Calcolato da spesa e piano: correggi
solo se non torna con la realtà.`; `Residuo di {Nome}`; i due nomi del congelatore
dell'ingrediente e del lotto; `Porzioni di {Piatto}`; `Elimina il lotto di {Piatto}`;
`PREPARATO IL …`, `IN CONGELATORE`, `1 impegnata` / `{n} impegnate`, `Piatto eliminato`; il
segnaposto della nota; `APPLICATE`, `DA CONFERMARE`, `NON RICONOSCIUTI`, `ANNULLA`,
`CONFERMA`, `annullata`; le forme della riga di proposta; i tre errori della nota; i due errori
di salvataggio.

**Proposta non adottata:** `2 impegnate dai pasti in programma` (v1). Nel foglio del lotto
l'etichetta `Porzioni` sta subito sopra e il numero basta; lo dice per intero il dialogo.

## J. `DESIGN.md`, token e ponte

Il design system cambia **prima** del codice: il primo task del piano aggiorna
`design/sistema/DESIGN.md`, poi il codice lo segue.

- **§8 Tessera di dispensa**: il tocco apre il dettaglio, niente `aria-pressed`; la pillola di
  stato unica con la precedenza di §A; la variante **mai comprato**; la tessera del lotto.
- **§8 Foglio del Dock della Dispensa**: sostituito da **Widget AI** (misure di §H.1) e dal
  **Dettaglio di ingrediente** (§D), col suo blocco **Riga di scadenza**.
- **§8 Dock**: `Modifica con l'AI` con l'icona AI al posto della matita.
- **§8, voci nuove**: Campo di ricerca in pagina; Foglio Nuovo ingrediente; Anteprima di
  scansione (cornice a quattro angoli in piccolo); Dialogo di conferma (foglio a due tasti);
  Onda di dettatura (estensione dello stato "Registro").
- **§6 Icone**: icona AI (due stelle a quattro punte piene, 18 in `--ink`) e icona di
  scansione.
- **§7 Movimento**: `.anim-luce-widget`, `.anim-luce-testo` e l'onda, come eccezioni in loop
  accanto a `.anim-registro`, con la loro variante a meno moto.
- **§2.5 Alfa**: 0,85 (fascia della luce), 0,06 (tessere del caricamento), 0,10 (alone del
  microfono), se non ci sono già.
- **§9 Pattern**: il tocco sulla tessera di dispensa apre (non è più un'eccezione del «tap sulla
  card»); l'eccezione del **tenere premuto** sul microfono, col tocco breve come alternativa; il
  **caricamento a widget vuoti** per la Dispensa, eccezione a «niente scheletro».
- **§12**: long-press e scheletri escono dall'elenco con il rimando alle loro eccezioni; il
  gradiente resta vietato sugli oggetti, con un'eccezione: la luce sulle lettere in attesa.
- **§2.3**: `#B9AEF5` e `#9CC7F2` usati come luce, un quarto uso dei colori d'area, dichiarato.
- **§13**: le decisioni del 25/09.

Token: nessun token di colore nuovo. Le animazioni vanno in `globals.css`; il guardiano
`npm run design:token` resta verde.

Il ponte `docs/superpowers/specs/DESIGN-SYSTEM.md` guadagna una riga per ogni componente nuovo
con il suo file, e segna la fase 4 chiusa con la PR del ramo.

Dopo il merge, Andrea ricarica `DESIGN.md` nel progetto Claude Design «Spesa».

## K. Errori e casi limite

- **Migrazione non applicata:** il codice che scrive `scadenza_manuale` fallisce. Il deploy
  aspetta la migrazione (§N). La lettura tollera la colonna assente (`undefined` → null), così
  un deploy anticipato rompe solo la correzione della scadenza, non la pagina.
- **Dati letti dopo 8 s:** scartati (§A); `RIPROVA` rilancia.
- **Scrittura concorrente** (Andrea e un membro della casa sullo stesso ingrediente):
  `correggiResiduo` riceve il residuo di prima da chi chiama; vince l'ultima scrittura, come oggi.
- **Un ingrediente con residuo > 0 e senza acquisto** (dichiarato prima di questa fase): non ha
  stima, quindi niente blocco Scadenza, e non decade, come oggi.
- **Due ingredienti con lo stesso `ean`** (possibile: l'indice non è unico): lo scanner apre il
  primo per nome A–Z.
- **Dettatura che si chiude da sola** (silenzio, limite del browser): vale come stop, e il
  testo resta.
- **Widget aperto e navigazione via tab bar:** il velo copre la tab bar, quindi non si naviga
  senza chiudere.
- **Il foglio aperto su un ingrediente che la nota AI modifica:** non succede, perché widget e
  foglio non stanno aperti insieme.
- **`Da quando usi Dispesa`** sparisce dalla pagina e ricompare con la fase 5. Nel frattempo il
  dato si accumula (tabella `purchase`) ma non si vede. È un buco dichiarato, accettato col
  punto 4 delle decisioni del 23/09.

## L. Test

**L.1 Dominio (puri).**
- `scadenzaStimata`: i casi di oggi di `scadenzaResiduo`, invariati.
- `scadenzaResiduo` con `scadenzaManuale`: vince la manuale; ignorata senza stima.
- `residuoUtilizzabile`: **con `scadenzaManuale` null, stessi risultati di oggi** su tutti i
  casi esistenti; con la manuale, residuo fino al giorno compreso, 0 dopo.
- Il contratto `residuoUtilizzabile(oggi) > 0 ⇔ oggi ≤ scadenza`, anche con la manuale.
- La funzione pura di E.2/E.3: 0 → > 0, > 0 → > 0, > 0 → 0, 0 → 0.
- `ricerca-dispensa`: prefisso e infisso, accenti, mai comprati solo coi risultati, lotti per
  nome, ordine, conteggio, zero risultati.
- Il default di Nuovo ingrediente da `INGREDIENTI_BASE`.
- I test esistenti di `list-builder`, `planner`, `conflitto`, `scadenza` passano senza
  modifiche ai valori attesi.

**L.2 Dati** (client Supabase finto, come oggi): `correggiResiduo` con la regola d'entrata e
la cancellazione della data; `impostaCongelato` che la cancella; `impostaScadenza`;
`aggiungiConfezione` (residuo, date, `ean`, formato); `chiudiSpesa` che la cancella sulle voci
comprate.

**L.3 Componenti e pagina** (Testing Library). I 31 test di `dispensa/__tests__/page.test.tsx`
e i 9 di `NotaDispensa.test.tsx` si censiscono uno per uno: tenuto, riscritto sulla forma
nuova, o tolto perché la funzione è tolta (§A), con la riga nel rapporto del task. Nuovi test
almeno per: la tessera che apre il dettaglio; la precedenza delle pillole; la ricerca e
`Crea «…»`; Nuovo ingrediente (default, validazione, creazione, nome duplicato); In casa `SÌ` /
`FINITO`; `SALVA` / `RIPROVA`; la riga di scadenza aperta, `SALVA`, `USA LA STIMA`, la data
fuori intervallo; le sei righe della tabella di F.2 con `fetch` finto; il lotto e il dialogo;
il widget AI (apertura, bozza, tocco breve e tenuto con `SpeechRecognition` finto, testo
provvisorio e definitivo, `FAI LE MODIFICHE` in volo, esito, i tre errori, permesso negato); il
Dock senza microfono; caricamento, timeout a 8 s, errore e `RIPROVA`, vuoto.

**Il codice di test scritto nel piano è una bozza** da verificare contro il codice vero prima
di scriverlo (lezione della fase 2: 13 difetti; fase 3: zero, con questo vincolo).

**L.4 Nel browser**, con la sonda sotto `src/app/auth/` e dati finti, a 375 × 812:
- il dettaglio scorso fino alla scadenza, e la riga aperta, senza tagli;
- il widget AI a bottom 114 e cresciuto a top 88 con l'esito, sopra la tab bar;
- il tenuto premuto dal Dock: il rilascio arriva anche se il tondo è smontato;
- le due luci in fase, e ferme con `prefers-reduced-motion`;
- il timeout di caricamento.

Poi si cancellano la sonda e `.next/dev/`.

**Non eseguibili senza telefono, restano per il gate di Andrea:**
- la dettatura vera con testo provvisorio, tenuta e a tocchi;
- la tastiera: il widget poggia sulla tastiera;
- la fotocamera vera che legge un codice;
- un giro completo: correggere una scadenza e vedere la lista che cambia.

## M. Dove la spec si discosta dal disegno

1. **Confezioni → Scadenza.** Il disegno (v2 06, 07) ha una riga per confezione, `Confezioni 2`.
   Per la decisione di Andrea del 25/09 c'è una riga sola, `Scadenza`, con la stessa forma
   (origine, `MODIFICA`, riga aperta, `USA LA STIMA`).
2. **`ALTRI…` nel reparto** (v2 04): le aree sono sei, le pillole ci stanno tutte.
3. **Il tocco sulla tessera finita** non la rimette più in casa (decisione del 23/09, punto 2):
   ci pensa `SÌ` nel dettaglio, con la stessa quantità (una confezione).
4. **v1 14, la scelta dell'ingrediente per un codice sconosciuto**: tolta, come dice la v2.
   Resta un caso che il disegno non copre, il codice di un altro ingrediente (§F.2).
5. **Proposte della v1 sul copy**: adottata quella dell'errore di caricamento, non quella
   delle impegnate (§I).

## N. Esecuzione

Un piano in `docs/superpowers/plans/2026-09-25-dispensa.md`, subagent-driven, in un worktree:

1. **`DESIGN.md`** con le voci di §J, le animazioni in `globals.css`, il guardiano verde.
   Nessun codice di schermata.
2. **Il modello della scadenza**: la migrazione `0014`, `scadenzaStimata` /
   `scadenzaResiduo` / `residuoUtilizzabile`, la funzione pura di E.2/E.3, il mapper, tutti i
   chiamanti. Test di L.1.
3. **Le scritture**: `correggiResiduo`, `impostaCongelato`, `impostaScadenza`,
   `aggiungiConfezione`, `chiudiSpesa`. Test di L.2.
4. **`ricerca-dispensa.ts`** e i default di Nuovo ingrediente, puri.
5. **I pezzi della pagina**: tessere (in casa, finita, mai comprata, lotto), widget, widget
   vuoti con la luce, icone AI e di scansione, Dock.
6. **Dettaglio di ingrediente, lotto e dialogo.**
7. **Scansione** nel dettaglio e **Nuovo ingrediente**.
8. **Widget AI**: dettatura, luce sul testo, esito, errori.
9. **La pagina**: assemblaggio, ricerca, `Crea «…»`, stati, rimozioni; censimento dei test.
10. **Verifica nel browser** (§L.4) e il ponte `DESIGN-SYSTEM.md`.

**L'ordine:** il 2 prima del 3; il 3 prima del 6 e del 7; il 4 e il 5 prima del 9; il 6, il
7 e l'8 prima del 9.

**Le review:** dopo ogni task, come sempre; **review di correttezza** sul task 2 (tocca il
calcolo della lista) e sul 3; review finale su tutto il ramo prima della PR.

**I gate di Andrea, in ordine:**
1. l'ok alla migrazione `0014` in produzione;
2. la migrazione applicata;
3. il merge della PR e il deploy;
4. le prove dal telefono di §L.4.
