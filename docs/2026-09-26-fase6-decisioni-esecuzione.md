# Fase 6 del ridisegno: le decisioni prese durante l'esecuzione

**Data:** 26/09/2026 · **Ramo:** `fase6-fine-spesa` · **Piano:** `docs/superpowers/plans/2026-09-26-fine-spesa.md` ·
**Spec:** `docs/superpowers/specs/2026-09-26-fine-spesa-design.md`

L'esecuzione subagent-driven tiene il suo registro in `.superpowers/`, una cartella che git ignora e
che a fine lavoro viene cancellata. Questo file la sostituisce. Raccoglie le decisioni prese al posto
di Andrea durante l'esecuzione, ognuna con quanto costa se è sbagliata, le misure fatte nel browser e
quello che resta da provare sul telefono. Etichette: `[misurato]` per quello che è stato misurato,
`[ipotesi]` per quello che non lo è.

**In breve.** Tre schermate portate nel sistema: Fine spesa (`/lista/fatta`), Confezioni
(`/lista/confezioni`) ed Entra (`/entra`). Il comportamento sui dati non cambia: lo hanno verificato
una review di correttezza sul Task 4 e la review finale, che hanno confrontato ogni scrittura con il
codice di prima. Nessuna migrazione.

## Le decisioni, con il loro costo

| # | Decisione | Perché | Costo se è sbagliata |
|---|---|---|---|
| 1 | In volo i primari pieni sono `disabled` con lo **stato spento** del sistema, non con l'opacità 0,5 che la spec scriveva (§A.4, §C.2) | il commento su `.dock-primario:disabled` in `globals.css`: con l'opacità il testo bianco scende sotto soglia di contrasto; il Dock del Piano faceva già così. Scritto in `DESIGN.md` §13 (26/09, punto 6) con un rimando in §9 | un tasto in volo appare «spento» invece che «attenuato»; si cambia in una riga |
| 2 | In Confezioni il codice letto sta sulla voce aperta (`Attiva.codice`), non dentro gli esiti | la spec (§B.4) vuole `CODICE {ean}` in cima al riquadro «quando il codice c'è», anche negli esiti che non hanno un ean da scrivere (unità diversa, catalogo irraggiungibile) | un campo in più nello stato locale |
| 3 | La guardia del doppio tocco è di **400 ms** e conta dal primo render con i dati (un `useEffect` su `stato`) | la spec (§A.4); un tocco che arriva prima che l'effetto parta trova la guardia chiusa e si ignora, cioè sbaglia dal lato sicuro. La review finale ha verificato che non può bloccare la chiusura per sempre | un tocco volontario entro 400 ms dalla comparsa non fa niente e non lo dice |
| 4 | Il terzo giro di correzione del Task 5 è andato a un implementatore nuovo (sonnet) invece di riprendere il primo (haiku) | haiku rovinava il file con sed e perl (UTF-8 e a capo); il blocco dipendeva dallo strumento usato, non da contesto mancante | un giro speso su un modello più caro |
| 5 | La sonda nel browser misura solo quello che non chiede un backend: Entra (la pagina vera) e il foglio di Confezioni (composto con i componenti veri in una pagina sonda) | Fine spesa e Confezioni leggono i dati da Supabase all'apertura, e un Supabase finto che risponda alle loro query costerebbe più di quello che misura | il tempo reale fra i due Dock (HAI PRESO TUTTO → CHIUDI LA SPESA) non è misurato prima del merge: resta ai test di unità e alla prova dal telefono. La review finale ha trovato col ragionamento un difetto di layout che la sonda non vedeva (vedi sotto, «Dopo la review finale») |
| 6 | Il campo EMAIL di Entra resta a 14 px | è il Campo di testo di §8 usato in tutta l'app. Andrea non ha mai segnalato lo zoom | su iOS un campo sotto i 16 px può far zoomare la pagina al tocco [ipotesi]: la prima schermata zoomerebbe. Si corregge in una riga |
| 7 | La Lista conta anche le spunte in coda offline; Fine spesa e Confezioni leggono dal server. La differenza resta | era già così, e il commento della Lista lo diceva. Non tocca i dati | offline con una spunta in coda, HAI PRESO TUTTO porta a una pagina che rimanda alla Lista |

## Misure nel browser

Dev server con chiavi Supabase finte, 360 × 640, 26/09.

- **Entra, la pagina vera** [misurato]:
  - larghezza del documento 360, uguale alla finestra: niente scorrimento orizzontale;
  - «Dispesa» 52; campo 44 × 328; `ENTRA CON UN LINK` 54 × 328; il Marchio con 6 caselle; il fondo è il gradiente `--sfondo-schermata`;
  - errore d'invio (col backend finto l'invio fallisce di sicuro): «Non siamo riusciti a inviare il link. Riprova.» in `rgb(196,66,62)`, cioè `--errore`, come `role="alert"`, e il tasto torna attivo.
- **Il foglio di Confezioni con la proposta** [misurato]. È composto con i componenti veri e le misure della pagina, in una pagina sonda poi cancellata:
  - il foglio parte a y 102 ed è alto 552;
  - `AGGIORNA` sta fra y 430 e 484, con 156 px liberi sotto;
  - il corpo del foglio non scorre (492 su 492).
- **Non misurato:**
  - il foglio con la tastiera aperta [ipotesi]: una tastiera di circa 290 px coprirebbe `AGGIORNA` se il foglio non si accorcia col viewport visibile. Il caso «formato a mano» ha un campo in più, circa 52 px;
  - il tempo fra i due Dock (decisione 5).

## Dopo la review finale (26/09)

La review finale (opus) ha dato «pronto dopo correzioni». Sui dati il ramo è pulito. Le correzioni
sono state fatte in un'ondata sola:

- **Fine spesa tagliava la parte alta.** Lo scroller centrava il contenuto in verticale con
  `justify-content: center`. A 360 × 640, con la Testata alta e la pillola della settimana, il
  contenuto (circa 510 px) supera lo spazio (circa 454): la parte alta, cioè il Marchio e «Hai preso
  tutto», usciva sopra il bordo e non si raggiungeva scorrendo [misurato dal revisore con una sonda
  CSS dello stesso meccanismo; le altezze reali sono stimate]. Il difetto c'era già prima della fase.
  Corretto con `safe center`.
- **Confezioni, la race sulla stessa voce.** Si legge un codice, il catalogo è lento, si chiude, si
  riapre la stessa voce e si legge un altro codice. Se la risposta vecchia arrivava dopo, copriva
  quella nuova, e `AGGIORNA` scriveva il formato del codice vecchio sull'ingrediente. La race c'era
  già; la riga `CODICE` la rendeva ingannevole. Ora una risposta vale solo se la voce **e** il codice
  sono ancora quelli aperti.
- Minori:
  - l'errore di scrittura di Confezioni ora è `role="alert"`;
  - Fine spesa ha i test di pagina per «senza settimana» e «lista non finita»;
  - il log del catalogo non dice più `dispensa:` quando lo chiama Confezioni;
  - il foglio si rimonta quando cambia voce;
  - in `DESIGN-SYSTEM.md` c'era una cella che citava `Scanner.tsx` come vivo;
  - `DESIGN.md` §9 ora rimanda alla decisione sullo stato spento.
- **La ri-review della correzione** (opus) ha dato tutti gli otto rilievi risolti. Ha misurato che il
  test nuovo della race fallisce sul codice di prima [misurato]. Ha trovato un buco di copertura: nessun
  test protegge la guardia del ramo «formato uguale», quello che scrive da solo. Togliendo il
  confronto sul codice, la suite di Confezioni resta verde [misurato dal revisore, in una copia]. Il
  codice è giusto, ma se in futuro qualcuno toglie la guardia nessun test se ne accorge.
- **Restano, di proposito:**
  - il test della guardia del «formato uguale», di cui sopra;
  - con lo **stesso** codice riletto dopo ✕, se la prima ricerca fallisce in ritardo il foglio passa a
    «Non riusciamo a interrogare il catalogo». Nessuna scrittura sbagliata, solo un messaggio che
    confonde [per lettura del codice];
  - in `scrivi` l'errore e la guardia `scrivendo` guardano ancora solo la voce: un errore della
    scrittura vecchia può comparire sul foglio della lettura nuova della stessa voce. Il piano vietava
    di toccare `scrivi`, ed era già così;
  - `justify-content: safe center` è supportato dai browser recenti [ipotesi, versioni non
    verificate]. Dove manca, il contenuto si allinea in alto ma resta raggiungibile;
  - `FoglioDalBasso` non trattiene il Tab: da tastiera si raggiunge la pagina sotto il velo. Il
    componente è condiviso con la Dispensa, e va sistemato una volta per tutti i fogli;
  - l'errore di chiusura di Fine spesa sta in coda allo scroller e su uno schermo basso può restare
    sotto la piega. `role="alert"` lo annuncia comunque. Da guardare nella prova dal telefono;
  - il commento in `lista/__tests__/page.test.tsx:165` nomina ancora `tuttoFatto()`; il warning di
    Vite su `vitest.config.ts` è preesistente; il campo EMAIL non ha `aria-describedby`; una riga
    lunga in `DESIGN.md`.

## Prove dal telefono

Da fare dopo il merge, in produzione, con la spesa vera:

1. **Fine spesa.** Spunta tutto e tocca `HAI PRESO TUTTO` **due volte di fila, in fretta**: la spesa
   non deve chiudersi. Poi guarda che Marchio e «Hai preso tutto» si vedano in alto e che la pagina
   scorra fino al link `CONFEZIONI DIVERSE? SCANSIONA`.
2. **Confezioni.** Scansiona una confezione con un formato diverso e apri il campo «Quante ne hai
   comprate?»: con la tastiera aperta, `AGGIORNA` si vede o si raggiunge scorrendo il foglio?
3. **Entra.** Esci dal pannello e rientra col link: la pagina non deve scorrere di lato; toccando il
   campo EMAIL la pagina non deve zoomare (decisione 6); dopo l'invio compare l'indirizzo, e
   `USA UN’ALTRA EMAIL` riporta al campo vuoto.
4. **Chiudi la spesa** con un tocco solo, passati i 400 ms: si arriva al Piano, come prima.
