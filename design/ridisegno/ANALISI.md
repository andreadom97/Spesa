# Analisi del ridisegno Claude Design — 19/09/2026

**Obiettivo di questo documento:** dire, schermata per schermata, che cosa il ridisegno in
`design/ridisegno/` conserva, cambia, aggiunge e toglie rispetto a
`docs/2026-09-19-inventario-schermate.md` e a `docs/superpowers/specs/DESIGN-SYSTEM.md`, così
che Andrea possa decidere cosa mandare in codice e cosa manca ancora. Non contiene proposte:
solo ricollegamento, con il nome del file accanto a ogni affermazione.

**Fonti.** `design/ridisegno/CLAUDE.md` per le scelte di Andrea; i 21 file HTML della cartella
per i disegni; `docs/2026-09-19-inventario-schermate.md` (sezioni 1, 4, 6, 8, 12, 15) e
`docs/superpowers/specs/DESIGN-SYSTEM.md` §1–§4 per il confronto. Le etichette sono copiate
dai file, maiuscole e accenti compresi. Dove un file e `CLAUDE.md` non concordano, sono
riportati entrambi i valori.

**Avvertenza sui riferimenti ai paragrafi.** I file HTML citano «DESIGN.md» con una numerazione
propria (§2.3, §5, §6, §7, §8, §9, §11, §12) che **non corrisponde** a quella di
`docs/superpowers/specs/DESIGN-SYSTEM.md`, dove i gradienti stanno in §1 principio 5 e in §5,
le ombre in §2.7, i componenti in §3, i pattern e l'accessibilità in §4. In questo documento
si cita la numerazione reale di `DESIGN-SYSTEM.md` e si segnala tra parentesi la sigla usata
nel mockup quando serve a ritrovare il passaggio.

---

## 1. Elenco dei file

### 1.1 I 21 file della cartella

| File | Schermata | Tipo | Contenuto |
|---|---|---|---|
| `CLAUDE.md` | tutte | decisioni | Le scelte di Andrea dopo l'approvazione del 17/09; registra in fondo il «Debito verso DESIGN.md» |
| `Mappa delle schermate.html` | tutte | mappa | Lavagna datata **18/09/2026** + proposta Impostazioni a schermata piena + dialogo di conferma |
| `Lista - 5 varianti parte bassa.html` | Lista (barra) | foglio di varianti | A `Pillola chiara, etichette tenute` · B `Pillola chiara, sole icone piene` · C `Pillola inchiostro` · D `Zoccolo a tutta larghezza` · **E `Pillola col marchio`** |
| `Lista - variante E.html` | Lista | versione singola | Prima resa della variante E (sigla nel file: `Variante E · pillola col marchio`) |
| `Lista - variante E v2.html` | Lista | versione singola | Variante E rifatta: gradiente da `#EDECEA`, maschera di scorrimento, menù utente ingrandito |
| `Lista - 5 versioni tasto Impostazioni.html` | Lista (testata) | foglio di varianti | 1 `Tondo bianco, ingranaggio pieno` · 2 `Tondo bianco, burger pieno` · 3 `Quadrato raggio 14, ingranaggio pieno` · 4 `Tondo inchiostro, ingranaggio bianco` · 5 `Pillola larga, burger e etichetta` — tutte scartate |
| `Lista - burger senza sfondo.html` | Lista (testata) | foglio di varianti | 8 varianti: `2a Burger nudo, 26 px` · `2b Burger nudo, 30 px` · `2c Burger 30 px, tondo bianco`, più le cinque del file precedente. Scartate |
| `Lista - menu alternative.html` | Lista (testata) | foglio di varianti | A `Iniziale su tondo inchiostro` · B `Iniziale su tondo chiaro` · C `Kebab nudo, 30 px` · D `Iniziale contornata` · **E `Iniziale e kebab in pillola`**, più le cinque scartate ripetute in un array `SCARTATE` |
| `Lista - sezioni widget 5 versioni.html` | Lista (sezioni) | foglio di varianti | **1 `Scheda bianca, tessere nude`** · 2 `Vassoio in tinta d'area` · 3 `Scheda col cappello colorato` · 4 `Widget senza scatola` · 5 `Scheda con la protagonista a filo` |
| `Lista - barra con nomi 3 versioni.html` | Lista (barra) | foglio di varianti | 1 `Si abbassa` · **2 `Si abbassa e si stringe`** · 3 `Si rimpicciolisce intera` |
| `Settimana - 5 versioni.html` | Piano | foglio di varianti | 1 `Striscia e un widget per il giorno` · 2 `Sette widget, uno per giorno` · 3 `Un widget per pasto` · 4 `Il giorno è la pagina` · 5 `Striscia e righe, senza scatole` |
| `Piano - oggi e domani.html` | Piano | versione singola | La schermata scelta: striscia + righe pasto + scheda dei quattro stati della cella |
| `Piatti - 5 versioni.html` | Piatti | foglio di varianti | 1 `Un widget, tutti i piatti` · 2 `Un widget per categoria` · 3 `Tessere, due per riga` · 4 `Ordinati per come li usi` · **5 `Ricerca e elenco, senza scatole`** |
| `Piatti - versione 5.html` | Piatti | versione singola | La schermata scelta, con la ricerca estesa agli ingredienti |
| `Dispensa - 5 versioni.html` | Dispensa | foglio di varianti | 1 `Elenco unico, come Piatti` · 2 `Un widget per area` · **3 `Tessere con il livello`** · 4 `Ordinata per cosa richiede attenzione` · **5 `Solo cosa c'è, il finito in una riga`** |
| `Dispensa - tessere e inserimento 5 versioni.html` | Dispensa | foglio di varianti | 1 `Quadratino d'area, dock a pillola` · 2 `Bordo pieno o tratteggiato, dock a scheda` · **3 `Fondo in tinta, dock nella barra`** · 4 `Filetto sul fianco, due tondi` · 5 `Pillola della quantità colorata, dock compatto` |
| `Dispensa - tinta d'area e dock.html` | Dispensa | versione singola | La schermata scelta: tinta d'area al 26% + dock `Fai una modifica` / microfono |
| `Impostazioni a pannello - 5 versioni.html` | Impostazioni | foglio di varianti | 1 `Scende dal tasto` · 2 `Foglio dal basso` · 3 `Pannello a cornice` · 4 `Colonna dal fianco` · 5 `Widget ancorato, più trasparente` — **tutte e cinque su fondo scuro** `rgba(20,22,58,0.88)` (la 5 a `0,80`) |
| `Impostazioni a pannello chiaro.html` | Impostazioni | versione singola | La versione scelta: pannello su fondo carta `--fondo`, geometria della 1 (top 76, lati 16, fondo 22) |
| `Fotografa il piano - 5 versioni.html` | Importa · 8c ramo FOTO | foglio di varianti | 1 `Anteprima piena, comandi in pillola` · 2 `Anteprima in scheda, chrome chiaro` · 3 `Anteprima piena con cornice guida` · 4 `Anteprima piena con la striscia dei fogli` · 5 `Anteprima piena, foglio dal basso` |
| `Fotografa il piano - scatto.html` | Importa · 8c ramo FOTO | versione singola | La versione scelta: banda dei comandi + tasto di scatto 76/62 |
| `thumbnail.html` | — | copertina | Parola `Spesa` a 290 px su `--ink` + quattro fasce d'area. Dipende da un `tokens.css` **che non è nella cartella** |

### 1.2 Dove sta la versione scelta, per schermata

| Schermata | File che contiene la versione scelta | Variante | Riscontro in `CLAUDE.md` |
|---|---|---|---|
| **Lista** | **nessun file, va assemblata da tre** | vedi sotto | «Lista — sezioni come widget (versione 1)», «Tab bar (versione B, con i nomi)», «Menù utente in testata (variante E ingrandita)» |
| ↳ sfondo, testata, menù utente, maschera | `Lista - variante E v2.html` | Variante E | «Sfondo… (Variante E, scelta al primo giro)» |
| ↳ sezioni come widget | `Lista - sezioni widget 5 versioni.html` | versione **1** | «Ogni sezione merceologica è una tessera bianca: `margin: 0 12px 12px`, raggio 22, bordo 1 px `--bordo`, `--ombra-pannello`, padding 14 / 12 / 12, gap 12» = misure della `w1` |
| ↳ tab bar a due stati con i nomi | `Lista - barra con nomi 3 versioni.html` | versione **2** | «altezza **66**, voci 54, `left/right: 46`» = misure esatte della versione 2 `Si abbassa e si stringe`. **Il file numera 1/2/3, non A/B/C**: «versione B» di `CLAUDE.md` è la 2 per corrispondenza dei valori, non per etichetta |
| ↳ menù utente | `Lista - menu alternative.html` (variante **E**) per la scelta; `Lista - variante E v2.html` per le misure definitive | E, poi ingrandita | E nel foglio è alta 44 / tondo 32 / iniziale mono 13; la versione **ingrandita** in `variante E v2` è alta **50** / tondo **38** / iniziale mono **16** / larga **81** |
| **Piano** | `Piano - oggi e domani.html` | unica | «La seconda sezione si chiama **Piano**, non Settimana» |
| **Piatti** | `Piatti - versione 5.html` | versione 5 | «Piatti (versione 5)» |
| **Dispensa** | `Dispensa - tinta d'area e dock.html` | tessere della 3 di `tessere e inserimento` + dock della 5 di quel foglio | «Dispensa (versione 3 + dock della 5)». Attenzione: la numerazione di `CLAUDE.md` combacia con il foglio **`Dispensa - tessere e inserimento 5 versioni.html`** (la 3 è `Fondo in tinta`, la 5 ha il dock `AGGIUNGI` + microfono), non con `Dispensa - 5 versioni.html` |
| **Impostazioni** | `Impostazioni a pannello chiaro.html` | unica | «Impostazioni — pannello chiaro» |
| **Fotografa il piano** | `Fotografa il piano - scatto.html` | unica | «Tasto di scatto alla iPhone: anello 76…» = i valori di questo file, **non** quelli del foglio a 5 versioni (che ha 72 / 52 in `--ink`) |

### 1.3 Quale file è il più completo, per schermata

Verificato sul contenuto dei file, non sulle date di modifica.

- **Lista:** `Lista - variante E v2.html` è il più completo per sfondo, testata e maschera (la
  sua nota descrive il gradiente a quattro fermate e la maschera 108 / 68 / 30), ma la sua
  barra è la **vecchia**: `.nav-pill` alta **66 fissa**, senza etichette e senza secondo stato.
  Le sezioni sono ancora piatte, non widget. Quindi nessun file mostra la Lista approvata —
  esattamente quanto dichiara `Mappa delle schermate.html` («Nessun file contiene oggi la
  Lista approvata»).
- **Piano:** `Piano - oggi e domani.html`, unico e completo (include anche una scheda
  esplicativa dei quattro stati della cella).
- **Piatti:** `Piatti - versione 5.html`. Più completo di `Piatti - 5 versioni.html` v5, che
  aveva ancora il segmento `Tutti / Pranzo / Cena` e il segnaposto `Cerca un piatto`.
- **Dispensa:** `Dispensa - tinta d'area e dock.html`. È l'unico che monta insieme tessere in
  tinta e dock a due tasti; i due fogli a 5 versioni sono passi intermedi.
- **Impostazioni:** `Impostazioni a pannello chiaro.html`. È l'unico con la **sotto-vista**
  `Pasti a casa` e il velo `rgba(20,22,58,0.55)`; il foglio a 5 versioni è su fondo scuro,
  scartato.
- **Fotografa il piano:** `Fotografa il piano - scatto.html`.
- **Mappa:** `Mappa delle schermate.html`, ma **è arretrata**: si data 18/09/2026, dichiara che
  «Le Impostazioni oggi non esistono da nessuna parte» e propone una schermata piena, mentre
  `Impostazioni a pannello chiaro.html` esiste; non nomina né
  `Lista - barra con nomi 3 versioni.html` né `Fotografa il piano - scatto.html`.

---

## 2. Le sei schermate, sulla versione scelta

### 2.1 Lista — inventario §1 contro `Lista - variante E v2.html` + `Lista - sezioni widget 5 versioni.html` (v1)

| Elemento dell'inventario | Presente? | Etichetta esatta nel ridisegno | Note |
|---|---|---|---|
| Marchio in testata | **cambiato** | nessuna in testata; in barra `aria-label="Lista"` | Il Marchio esce dalla testata e diventa l'icona della voce Lista in tab bar (`Lista - variante E v2.html`, `<nav class="nav-pill">`). Sparisce quindi il link `Vai alla lista` da ogni testata |
| Ingranaggio | **cambiato** | `aria-label="Andrea: profilo e impostazioni"` | Sostituito dal Menù utente. Nessun file dice dove portino le due destinazioni che l'ingranaggio copriva |
| Tessera (tutta) | sì | `aria-label="Pomodori ramati, da prendere, tocca per segnare presa"` · `aria-label="Limoni, presa, tocca per rimetterla da prendere"`, `aria-pressed` | Formula identica all'inventario. Restano i tre stati: `prot` (protagonista, fondo pieno, nome `nome-g`), `accesa`, `spenta` con `barrato` |
| Pillola `SÌ` | **cambiato** | `Sì` | Minuscola con accento, non `SÌ` maiuscolo. **Manca l'`aria-label`** `"Sì, hai ancora {nome}"` |
| Pillola `NO` | **cambiato** | `No` | Non `NO`. **Manca l'`aria-label`** `"No, comprane una confezione di {nome}"` |
| Blocco `BASE` | **no** | — | Nessun selettore base / top-up in nessuno dei nove file della Lista |
| Blocco `TOP-UP` | **no** | — | idem |
| Tasto primario finale | **no** | — | `HAI PRESO TUTTO` non è reso. `Mappa delle schermate.html` lo dichiara come problema aperto: «Il tasto primario non ha più un posto» |
| Tasto stato vuoto `COMINCIA DAI PIATTI` | **no** | — | Nessuno stato vuoto reso |
| Tasto stato vuoto `VAI ALLA SETTIMANA` | **no** | — | idem; e la destinazione si chiamerebbe ora Piano |
| Tab bar | **cambiato** | `Lista` `Piano` `Piatti` `Dispensa` nel DOM, rese maiuscole da `text-transform:uppercase` in `.nav .lb` | `SETTIMANA` → `PIANO`. In `Lista - variante E v2.html` le etichette **non ci sono affatto**: le porta `Lista - barra con nomi 3 versioni.html` |
| Titolo di schermata | **cambiato** | `Lista` | L'inventario dice che il codice passa `Spesa`. Il ridisegno scrive `Lista`, cioè risolve la divergenza n. 1 di «Non determinato dal codice» a favore del nome della sezione — ma in sentence case, non `LISTA` maiuscolo come vuole `DESIGN-SYSTEM.md` §2.4 |
| Pillola settimana | **cambiato** | `Settimana del 21 settembre` | L'inventario dà il formato `31 AGO — 6 SET` (mono maiuscolo, em-dash). Qui è una frase in italiano, sempre in mono maiuscolo per `text-transform` |
| Etichetta di sezione + quadratino + contatore | sì | `Ortofrutta` / `4 voci`; `Latticini, uova e salumi` / `3 voci`; `Pasta, riso e cereali` / `2 voci`; `Macelleria e pescheria` / `2 voci`; `Dispensa e conserve` / `2 voci` | Quadratino 10 × 10 raggio 4 conservato. Contatore `{n} voci` invariato |
| Riga di controllo | **cambiato** | `Olio: ne hai ancora?` + `controllo ogni 4 settimane` | Il titolo è identico all'inventario; la sottoriga **cambia**: l'inventario ha la stringa fissa `CONTROLLO OGNI 90 GIORNI · SCADUTO`, qui è `controllo ogni 4 settimane` e non dice più «scaduto» |
| Dettaglio dentro la tessera | sì | `serve 1100 g · in casa 0 g` | Formato conservato. Pillola confezioni `2 conf` / `4 pz` conservata |

**ELEMENTI NUOVI**
- **Menù utente** in testata (`Lista - variante E v2.html`): pillola 81 × 50 con iniziale `A` e
  kebab; apre — secondo la sua nota — «un foglio dal basso» di cui nessun file mostra le voci.
- **Maschera di scorrimento**: il contenuto passa dietro la barra e svanisce
  (`Lista - variante E v2.html`, nota «Sfondo e dissolvenza»). Non è un controllo, ma è un
  comportamento nuovo del contenitore.
- **Barra che si restringe allo scorrimento** (`Lista - barra con nomi 3 versioni.html`):
  l'oggetto resta lo stesso, cambia il disegno; le voci restano cliccabili.
- **Widget di sezione** (`Lista - sezioni widget 5 versioni.html`, v1): involucro nuovo, senza
  controlli propri — non collassa, non si sposta. La nota della v4 di quel foglio lo dice:
  «"widget" resta un'impressione, non un oggetto».

**ELEMENTI TOLTI**
Ingranaggio · Marchio in testata (e con esso il link `Vai alla lista`) · `SelettoreTab`
`BASE` / `TOP-UP` con i suoi due contatori e le due righe di spiegazione
(`La spesa grossa, una volta a settimana: quello che si conserva.` e
`Il fresco, e quello che si aggiunge strada facendo se il piano cambia.`) · tasto
`HAI PRESO TUTTO` · entrambi gli stati vuoti · la riga d'errore d'azione.

**Stati mostrati** — offline, con il testo **accorciato**: `Sei offline: la lista è quella
dell'ultima apertura.` contro la versione dell'inventario, che nomina la settimana e spiega la
coda delle spunte. Tessera nei tre stati. Riga di controllo in attesa di risposta.
**Stati non mostrati** — caricamento (`CARICO…` di `DESIGN-SYSTEM.md` §4), errore di
caricamento, Vuoto A, Vuoto B, «Niente da comprare qui.», errore d'azione nelle due forme,
pillola d'azione disabilitata mentre la risposta è in volo, varianti base / top-up.

### 2.2 Piano — inventario §4 contro `Piano - oggi e domani.html`

| Elemento dell'inventario | Presente? | Etichetta esatta nel ridisegno | Note |
|---|---|---|---|
| Marchio in testata | **cambiato** | in barra, `aria-label="Lista"` | Come in Lista |
| Ingranaggio | **cambiato** | `aria-label="Andrea: profilo e impostazioni"` | |
| Link cambio vista | **no** | — | `‹ SETTIMANA SCORSA` / `SETTIMANA CORRENTE ›` non esistono in nessuna delle sei versioni (né nelle cinque di `Settimana - 5 versioni.html`). Con essi spariscono la vista «settimana scorsa» e la sua via d'uscita |
| Riquadro del giorno | sì, **arricchito** | `aria-label="Venerdì 18, domani, 3 pasti a casa, selezionato"` | L'inventario ha `"Venerdì 28"` / `"…, selezionato"`. Il ridisegno aggiunge nell'etichetta la parola temporale e il conteggio |
| Freccia tonda sinistra | **no** | — | `Giorno precedente` esiste solo nella versione 4 scartata di `Settimana - 5 versioni.html` |
| Freccia tonda destra | **no** | — | idem |
| Casetta (60 px) | sì | `aria-label="Pranzo: a casa, tocca per mettere fuori casa"` / `"Colazione: fuori casa, tocca per mettere a casa"`, `aria-pressed` | Formula identica. Zona 60 px conservata, casetta 32 con icona 17 |
| Corpo della riga | sì | `aria-label="Apri Pasta e fagioli"` | Identico |
| Zona destra — chevron | **no** | — | La variante «settimana bozza» non è resa: nessun chevron verso Scegli |
| Zona destra — kebab | **cambiato** | `aria-label="Altre azioni su Pasta e fagioli"` | L'inventario dice `"Azioni per {Pasto}"`: il ridisegno nomina il **piatto**, non il pasto |
| Link scheda vuota | **no** | — | `COMINCIA DAI PIATTI ›` assente |
| Tasto primario | **no** | — | Né `CONFERMA E CREA LA LISTA` né `VAI ALLA LISTA`. È l'atto che genera le liste: senza di esso il flusso non si chiude |
| Tab bar | **cambiato** | `Piano` attivo | |
| Overlay del foglio + 13 voci del foglio + 6 controlli dello stepper | **no** | — | Il foglio dal basso non è reso in nessun file. Restano fuori `Saltato`, `Ho mangiato fuori piano`, `Ho mangiato un altro piatto`, `Cucinato ma non mangiato`, `Torna al piano`, `Cambia piatto`, `Non uso la porzione pronta`, `Uso una porzione pronta ({n} pronta)`, `Ne preparo di più`, lo stepper `−` / `+` / `Frigo` / `Freezer` / `Salva` e i separatori `COM'È ANDATA — {PASTO}` / `PROSSIMAMENTE — {PASTO}` / `MEAL PREP` |
| Contatore dei pasti | **cambiato** | `3 pasti a casa` | L'inventario ha `{n} PASTI A CASA IN SETTIMANA`, calcolato su **tutta la settimana**. Qui il contatore sta accanto all'etichetta del giorno e conta **il giorno scelto**: è un altro numero |
| Pillola settimana | **nuovo qui** | `Settimana del 14 settembre` | L'inventario dice che Settimana **non** passa la pillola. Il ridisegno la aggiunge, e `CLAUDE.md` lo motiva: «la settimana resta il periodo e lo dice la pillola sotto il titolo» |
| Striscia dei giorni | sì | `LUN MAR MER GIO VEN SAB DOM` + numero + pallini | Conservata: sette riquadri `flex 1`, gap 3, raggio 14. `oggi` come `inset 0 0 0 3px --ink` e `selezionato` come fondo pieno restano due stati indipendenti, come vuole l'inventario |
| Righe pasto | sì | `Colazione` `Pranzo` `Cena`; nomi piatto; `2 porzioni`; `Fuori casa`; `Saltato`; `Nessun piatto`; `Ho mangiato fuori piano`; avviso `La ricotta scade il 19/09` | I testi dell'inventario per la riga spenta ci sono tutti. L'avviso di scadenza cambia forma: l'inventario ha `{Nome} in casa: scade {oggi\|domani\|…}, prima di questo pasto` |

**ELEMENTI NUOVI**
- **Etichetta di sezione che titola il giorno scelto**: `Venerdì 18 · Domani`, con la parola
  temporale in `--testo-2`, e a destra `3 pasti a casa`. Solo ieri, oggi e domani hanno la
  parola (nota «L'etichetta del giorno»).
- **Quarto stato della cella**: «oggi e selezionato insieme» — `inset` 3 px bianco più `inset`
  4,5 px `--ink`. L'inventario non lo prevede come stato reso.
- Pillola settimana su questa schermata.

**ELEMENTI TOLTI**
Link di cambio vista e con esso l'intera vista «settimana scorsa» · frecce di navigazione del
giorno · tasto primario di conferma · foglio azioni con tutte le sue voci e lo stepper del
meal prep · scheda «Nessun piatto ancora» · riga d'errore di check-in.

**Stati mostrati** — casa / fuori casa sulla riga; riga senza piatto (`Nessun piatto`);
avviso di scadenza; i quattro stati della cella, resi esplicitamente nel secondo frame.
**Stati non mostrati** — caricamento, errore di caricamento, errore di check-in, errore di
conferma, repertorio vuoto, variante bozza, variante confermata / chiusa (il kebab c'è ma il
foglio no), variante settimana scorsa.

### 2.3 Piatti — inventario §8 contro `Piatti - versione 5.html`

| Elemento dell'inventario | Presente? | Etichetta esatta nel ridisegno | Note |
|---|---|---|---|
| Marchio in testata | **cambiato** | in barra | |
| Ingranaggio in testata | **cambiato** | `aria-label="Andrea: profilo e impostazioni"` | |
| Campo ricerca | **cambiato** | `Cerca un piatto o un ingrediente` (segnaposto **e** `aria-label`) | L'inventario ha `Cerca un piatto`. La nota «La ricerca» dichiara il comportamento nuovo: cerca anche dentro gli ingredienti |
| Pillola filtro pasto | **no** | — | `TUTTI` + una pillola per pasto: **tolte di proposito**. Nota «Cosa è stato tolto»: «un piatto non appartiene a un pasto» |
| Scheda piatto | **cambiato** | `aria-label="Apri Pasta e fagioli"` | Diventa la **Riga piatto**: minimo 68, non più scheda raggio 20. Sottoriga `2 porzioni · 7 ingredienti` al posto di `{N} INGR. · NUTRIZIONISTA` / `{N} INGR. · PROPRIO`: **la fonte del piatto non si vede più**. Spariscono anche la pillola contornata col nome del pasto e il troncamento a due righe (qui è ellissi su riga singola) |
| Tasto nuovo piatto | **cambiato** | `Nuovo piatto` | L'inventario ha `+ NUOVO PIATTO`, tasto primario 54 px a piena larghezza **in fondo**. Qui è un «aggiungi» tratteggiato alto 56 **in cima alla lista**, mono 11 con un più da 16 px |
| Porta 1 (stato vuoto) `IMPORTA LA DIETA` | **no** | — | Lo stato vuoto «le due porte» non è reso |
| Porta 2 (stato vuoto) `SCRIVI I MIEI PIATTI` | **no** | — | idem |
| Link editor completo | **no** | — | `Crea un piatto dall'editor completo` assente |
| Voci TabBar | **cambiato** | `Piatti` attivo | |
| Titolo | sì | `Piatti` | Invariato |
| Quadratini d'area sulla voce | sì | pallini 8 × 8 raggio 2,6, da 2 a 3 per piatto nei dati del file | L'inventario ne ammette fino a 6 |

**ELEMENTI NUOVI**
- **Riga piatto** come componente (dichiarato `COMPONENTE NUOVO` in
  `Piatti - 5 versioni.html`): corpo + zona destra 44 col chevron in `--icona-spenta`, un solo
  bersaglio.
- Nessun altro controllo nuovo: la schermata è più povera di controlli dell'originale.

**ELEMENTI TOLTI**
Filtro per pasto (fila di pillole) · pillola del pasto sulla scheda · la fonte
`NUTRIZIONISTA` / `PROPRIO` · lo stato vuoto con le due porte e il link all'editor completo ·
il tasto primario in fondo.

**Stati mostrati** — solo l'elenco pieno (19 piatti).
**Stati non mostrati** — vuoto (le due porte), caricamento, errore di caricamento
(`Non riusciamo a caricare i piatti. Riprova più tardi.`), ricerca senza risultati
(`Nessun piatto qui` + `Cambia filtro, oppure aggiungine uno.` — e la seconda frase non
avrebbe più senso, perché il filtro non c'è).

### 2.4 Dispensa — inventario §6 contro `Dispensa - tinta d'area e dock.html`

| Elemento dell'inventario | Presente? | Etichetta esatta nel ridisegno | Note |
|---|---|---|---|
| Freccia indietro | **no** | — | Sparisce, e con lei la divergenza n. 3 dell'inventario («Dispensa è una voce di tab bar ma ha la freccia verso `/impostazioni`»). Al suo posto la Testata piena con titolo `Dispensa` e menù utente |
| Intestazione `MAI COMPRATI` (collassabile) | **no** | — | I quattro gruppi `IN CASA` / `FINITI` / `PRONTI` / `MAI COMPRATI` sono sostituiti dai **sei widget d'area**. Non esiste più nessun gruppo apribile e chiudibile, quindi il catalogo dei mai comprati non ha più dove nascondersi |
| Fiocco di neve (riga ingrediente) | **no** | — | Il congelato diventa **testo non toccabile**: `Congelato` in `--freddo` su pillola bianca. Non si può più mettere o togliere dal congelatore da questa schermata |
| Campo residuo | **no** | — | La quantità è una pillola in mono (`600 g`, `1500 g`, `2 conf`), non un campo. La correzione passa solo dal dock |
| Fiocco (tessera Pronto) | **no** | — | Tutta la sezione Pronti è assente |
| Campo porzioni (Pronto) | **no** | — | idem |
| Cestino (Pronto) | **no** | — | idem |
| Card compressa | **cambiato** | `Fai una modifica` | L'inventario ha `Il conto non torna? Correggi con una nota`, una card a una riga nel flusso. Qui è un tasto del dock alto 56, raggio 999, con una matita 18 px. Nota: «L'etichetta dice il verbo e non l'oggetto, perché da qui si aggiunge, si corregge una quantità e si segna finito» |
| X sulla scheda nota | **no** | — | La scheda `NotaDispensa` non è resa |
| Textarea della nota | **no** | — | Il segnaposto `Es. ho finito il riso, l'olio è a metà…` non appare. Nel foglio `Dispensa - tessere e inserimento 5 versioni.html` un campo di testo esiste (`Scrivi cosa hai messo via`), ma la versione scelta non lo mostra |
| Microfono | **cambiato** | `aria-label="Registra un vocale"` | L'inventario ha `Detta la nota`. Qui è un tondo 56 pieno in `--ink`, non un tasto dentro una scheda |
| Tasto della nota `Correggi` | **no** | — | |
| Pillola `Annulla` sulla proposta | **no** | — | Tutto il ciclo delle proposte AI (`APPLICATE`, `DA CONFERMARE`, `NON RICONOSCIUTI`, le 18 voci con condizione) è assente |
| Pillola `Conferma` sulla proposta | **no** | — | idem |
| Tab bar | **cambiato** | `Dispensa` attivo | |
| Tessera / riga della voce | **cambiato** | `aria-label="Zucchine: 600 g in casa, tocca per segnare finito"` / `"Spinaci: finito, tocca per segnare in casa"`, `aria-pressed` | L'inventario ha una **riga** con quadratino, nome, metadati, fiocco e campo numerico. Qui è una **tessera** da 104 in griglia a due colonne, e **tutta la tessera è l'interruttore** casa / finito |
| Riga metadati dell'ingrediente | **cambiato** | `Scade il 22/09/2026`, `Congelato` | L'inventario unisce i segmenti con ` · `: `{NOME AREA} · PRESO IL 12 SET · IN CONGELATORE · SCADE IL 12 SET`. Spariscono il nome area (ridondante dentro il widget), `PRESO IL`, `MAI COMPRATO`; la data passa al formato lungo `22/09/2026` |
| Riga del totale non ricomprato | **no** | — | `Da quando usi Spesa: …` assente |
| Sottotitolo del gruppo `IN CASA` | **no** | — | `Calcolato da spesa e piano: correggi solo se non torna con la realtà.` non c'è più. È la frase che `DESIGN-SYSTEM.md` §1 principio 6 cita come esempio di copy che spiega la causa |
| Etichetta di sezione dell'area | **nuovo qui** | `Ortofrutta` / `2 voci in casa`; `Macelleria e pescheria` / `1 voce in casa`; `Latticini, uova e salumi` / `3 voci in casa`; `Pasta, riso e cereali` / `2 voci in casa`; `Dispensa e conserve` / `3 voci in casa`; `Surgelati` / `2 voci in casa` | Contatore in forma nuova: `{n} voci in casa` |

**ELEMENTI NUOVI**
- **Tessera di dispensa** (`COMPONENTE NUOVO`): fondo in tinta d'area al 26% in casa, contorno
  2 px tratteggiato quando finita, pillola `Finito` in `--testo-2`, nome barrato.
- **Dock di inserimento** (`COMPONENTE NUOVO`): `Fai una modifica` + microfono, a 114 px dal
  fondo, scende a 96 quando la barra si riduce.
- **Stato «Registro»** (`COMPONENTE NUOVO`): pillola inchiostro alta 56 con metro a quattro
  barre, `Registro…`, tempo `0:07` in mono `tabular-nums`, `stop` 44 con
  `aria-label="Ferma la registrazione"`, contenitore `role="status"`.

**ELEMENTI TOLTI**
Freccia verso Impostazioni · i quattro gruppi e il collasso dei `MAI COMPRATI` · il fiocco di
neve su riga e su lotto · i campi numerici di residuo e porzioni · l'intera sezione `PRONTI`
col cestino · la scheda AI `CORREGGI CON UNA NOTA` con textarea, `Correggi`, i tre gruppi di
proposte e le pillole `Annulla` / `Conferma` · la riga del totale non ricomprato · il
sottotitolo del gruppo `IN CASA` · le righe di stato «decaduto» e «dimenticato».

**Stati mostrati** — in casa e finito sulla tessera; congelato; scadenza; la registrazione in
corso (interattiva nel file).
**Stati non mostrati** — caricamento, errore di caricamento
(`Non riusciamo a caricare la dispensa. Riprova più tardi.`), vuoto
(`Ancora niente in dispensa` + `Si riempie da sé: appena chiudi la prima spesa, qui trovi
quello che è rimasto.`), errore di salvataggio nelle due forme, i tre messaggi d'errore della
nota AI (`La correzione non è disponibile.`, `Non ho capito la nota, riprova.`,
`Non siamo riusciti a correggere. Riprova.`), assenza di `SpeechRecognition` (nel ridisegno il
microfono è sempre presente).

### 2.5 Impostazioni — inventario §12 contro `Impostazioni a pannello chiaro.html`

| Elemento dell'inventario | Presente? | Etichetta esatta nel ridisegno | Note |
|---|---|---|---|
| Freccia header `Indietro` | **cambiato** | `aria-label="Chiudi le impostazioni"` (X, tondo 44) e il velo, anch'esso `data-chiudi` | Non è più una schermata: `router.back()` diventa «chiudi il pannello». Nella sotto-vista compare `aria-label="Torna alle impostazioni"` |
| Titolo `Impostazioni` | sì | `Impostazioni` (titolo di dettaglio 32 / 800) | Resta 32/800 come nell'inventario, ma **fisso** nella testata del pannello: non scorre più via |
| Campo nome pasto | **no** | — | `Nome del pasto` assente: **i pasti non si rinominano più** |
| `✕` pasto / freccia su / freccia giù | **no** | — | Non si aggiungono, togliono né riordinano i pasti |
| Pastiglia giorno `L M M G V S D` | **cambiato** | celle della matrice, `aria-label="Lun colazione: di base a casa, tocca per mettere fuori casa"` | L'inventario ha sette pastiglie **per pasto** (disegno 36, tap 44) con etichetta `{Lunedì…}, abitualmente fuori casa`. Qui è una **matrice 7 × 3** (giorni × pasti) con la polarità **invertita**: acceso = a casa, mentre la pastiglia diceva «abitualmente fuori casa». Sigla del giorno larga 45, gap 7, celle alte 44 `flex: 1` → 79,3 px |
| `AGGIUNGI PASTO` | **no** | — | |
| Nota sui pasti | **cambiato** | `Acceso vuole dire a casa. Ogni settimana nuova nasce così: nel Piano puoi correggere il singolo giorno senza cambiare questo default.` | Conserva la sostanza della nota dell'inventario (le settimane già create non cambiano) ma perde il vincolo «Da tre a sei pasti, nell'ordine in cui li fai» |
| Segmento rotazione `NESSUNA` / `2 SETT.` / `3 SETT.` / `4 SETT.` | **no** | — | Tutta la sezione `ROTAZIONE DEL PIANO` è assente, contatore `ORA SEI ALLA {k} DI {n}` compreso |
| `RIPARTI DALLA SETTIMANA 1` | **no** | — | E con esso la conferma a due tocchi `SICURO? RIPARTI DA LUNEDÌ` |
| Riga `Ingredienti` | **no** | — | La sezione `REPERTORIO` non c'è: `/impostazioni/ingredienti` resta senza porta |
| `CREA UN CODICE` | **no** | — | **Tutta la sezione `CASA` è assente** nelle sue tre varianti |
| Campo `Ho un codice` / `ENTRA` | **no** | — | idem |
| `TOGLI` (membro) / `ESCI DALLA CASA` | **no** | — | idem |
| Stepper porzioni `−` / `+` | **cambiato** | `Porzioni di default` con campo numerico `2 porz` | L'inventario ha uno stepper centrato con `Diminuisci porzioni` / `Aumenta porzioni`, minimo 1 massimo 4, dentro una scheda che si chiama `Per quante persone cucini` con un testo lungo. Qui è un campo numerico 78 × 44 e la nota diventa `Quante ne conto quando metti un piatto nel piano.` |
| Riga `Ordine dei reparti` | **cambiato** | `Ordine delle aree`, valore `Personalizzato` | Cambia il nome e la sezione (`SUPERMERCATO` → `Come la vedi in corsia`); sparisce la griglia 3 × 3 dei sei quadratini e il sottotitolo con i nomi veri |
| Riga `Importa la dieta` | **cambiato** | `Importa un piano`, nota `Da un PDF o dalle foto di un piano che hai già.` | L'inventario ha `Importa la dieta` + `DA FOTO O PDF, SOSTITUISCE IL PIANO ATTUALE`: **il ridisegno non dice più che sostituisce il piano attuale** |
| TabBar senza voce attiva | **cambiato** | la barra è dietro il pannello, con `Lista` attiva | Il pannello la **copre**: nota «il pannello copre la tab bar: la navigazione è sospesa finché è aperto». L'inventario prevede la tab bar visibile senza voce attiva |
| Etichette di gruppo | **cambiato** | `La settimana di base` · `Come calcolo la lista` · `Come la vedi in corsia` · `I tuoi dati` · `Account` | L'inventario ha `I TUOI PASTI`, `ROTAZIONE DEL PIANO`, `REPERTORIO`, `CASA`, `SUPERMERCATO`, `DIETA DEL NUTRIZIONISTA`. Nessun nome coincide |

**ELEMENTI NUOVI**
- Riga `I pasti che fai a casa` con nota `Il default con cui nasce ogni settimana nuova.` e
  valore `6 fuori casa`, che apre la **sotto-vista** `Pasti a casa` dentro lo stesso pannello.
- Riga `Arrotonda alle confezioni` con pillole `Sì` / `No` (`aria-pressed`) e nota
  `Con 540 g di zucchine la lista chiede 1 confezione da 600 g.`
- Riga `Cadenza dei controlli`, valore `4 settimane`, nota
  `Ogni quanto ti chiedo se hai ancora olio, sale, farina.` — è il dato che l'inventario
  riporta come stringa fissa `CONTROLLO OGNI 90 GIORNI`: qui diventa configurabile.
- Riga `Unità di misura`, valore `Grammi e ml`.
- Riga `Esporta i tuoi dati`, nota `Piatti, piano e dispensa in un file che puoi tenere.`
- Riga `Cancella la dispensa`, nota `Svuota quello che hai in casa. I piatti e il piano
  restano.`
- Gruppo `Account`: riga `Andrea` / `andrea@esempio.it` e riga **`Esci`**. L'inventario è
  esplicito: «**Logout: non esiste.** Una ricerca su tutto `src/` (`signOut`, `logout`) non
  trova nulla». La nota del file lo registra: «il gruppo Account presuppone un login che il
  sistema non ha mai nominato».
- Riga di piede `Versione 2.0.4 · ultimo salvataggio il 18/09/2026 alle 9:12`.
- Nel riquadro `Cosa cambia` della sotto-vista, un riepilogo che si ricalcola:
  `Di base sei a casa per 15 pasti su 21. La Lista conta solo quelli: i 6 fuori casa non
  entrano nella spesa.`
- **Componenti nuovi dichiarati**: Pannello delle impostazioni, Riga di impostazione, Matrice
  del default settimanale, Blocco di gruppo (scheda media 18).

**ELEMENTI TOLTI**
L'intera gestione dei pasti (nome, aggiunta, rimozione, riordino) · l'intera rotazione del
piano · la riga `Ingredienti` · l'intera sezione casa condivisa nelle tre varianti · lo stepper
delle porzioni · la griglia dei sei quadratini sulla riga dei reparti · la conferma a due
tocchi `SICURO?` · la tab bar utilizzabile.

**Stati mostrati** — pannello aperto; sotto-vista aperta; celle della matrice accese e spente;
pillole `Sì` / `No` con una attiva.
**Stati non mostrati** — caricamento, errore di caricamento
(`Non riusciamo a caricare le impostazioni. Riprova più tardi.`), errore di salvataggio
(`Non siamo riusciti a salvare. Riprova.`), `La casa è cambiata: dati ricaricati. Riprova.`,
tutti gli errori della casa, le tre varianti di ruolo (solo / proprietario / membro), ciclo = 1,
porzioni = 1.
**Nota sulla scala:** la matrice ha **tre colonne fisse** (`Colazione`, `Pranzo`, `Cena`)
mentre l'inventario dichiara da 3 a 6 pasti configurabili («il redesign deve reggere da 3 a 6
righe», punto 6 di «Non determinato»). A sei pasti le celle scenderebbero a circa 36 px,
sotto i 44 richiesti da `DESIGN-SYSTEM.md` §4.

### 2.6 Importa, passo 8c Acquisizione, ramo FOTO — inventario §15 contro `Fotografa il piano - scatto.html`

| Elemento dell'inventario | Presente? | Etichetta esatta nel ridisegno | Note |
|---|---|---|---|
| Freccia in testata | sì | `aria-label="Indietro"` | Diventa un tondo 44 bianco con ombra, sopra l'anteprima, accanto a una pillola di titolo. La Testata 52/800 con `Importa la dieta` che va a capo non c'è più |
| Segmento modalità `FOTO` / `PDF` | **no** | — | La schermata è solo il ramo foto. Il ramo PDF (`Scegli il PDF della dieta`, input nativo visibile) non è reso in nessun file |
| `Scatta` | **cambiato** | `aria-label="Scatta la foto del foglio"`, nessun testo visibile | L'inventario ha un tondo 48 px con l'etichetta `Scatta` resa `SCATTA`. Qui è l'anello 76 con bordo 2 px bianco e disco bianco 62, **senza icona e senza etichetta** |
| `DALLA GALLERIA` | **cambiato** | `Seleziona dalla galleria` | Tasto contornato alto almeno 50, raggio 18, bordo 1,5 px bianco al 62%, a tutta larghezza in fondo alla banda. L'inventario ha due rese diverse (pillola 40 contornata e centrata con la camera attiva, piena `--ink` allineata a sinistra nel fallback): il ridisegno ne dà **una sola** |
| `◀` miniatura | **no** | — | Il riordino delle pagine sparisce |
| `✕` miniatura | **no** | — | L'eliminazione di una singola pagina sparisce |
| `▶` miniatura | **no** | — | |
| Striscia di miniature 84 × 84 con `pag. {i}` | **cambiato** | una miniatura 44, `aria-label="Rivedi i 2 fogli presi"`, accanto al contatore `2 fogli` | Da una striscia di pagine manipolabili a **un solo bersaglio che apre una revisione** non disegnata in nessun file |
| `ESTRAI LA DIETA` | **cambiato** | `Ho finito` | Cambia il verbo e cambia la resa: da tasto primario 54 in `--ink` a **pillola bianca alta 44** sulla banda scura. La nota lo motiva: «il primario pieno… su fondo scuro sparirebbe» |
| Avvisi `role="status"` (`al massimo 12 fogli`, `{k} foto non leggibile…`) | **no** | — | Il tetto delle 12 pagine non è mai nominato |
| Fallback senza fotocamera | **no** | — | `La fotocamera non è disponibile: scegli le foto dei fogli dalla galleria` assente, e con esso la seconda resa di `DALLA GALLERIA` |
| Riquadro vuoto alto 160 px (stato iniziale del componente) | **no** | — | |

**ELEMENTI NUOVI**
- **Pillola di titolo** `Fotografa il piano`: alta 44, raggio 999, bianca, mono 11 / 700 /
  0,08em, accanto alla freccia.
- **Cornice guida**: quattro angoli 30 × 30 a tratto 3 px bianco al 92%, `inset 88 / 40 / 268`,
  `aria-hidden`.
- **Banda dei comandi** (`COMPONENTE NUOVO`).
- **Tasto di scatto** (`COMPONENTE NUOVO`).
- Riga di dettaglio `Ultimo foglio alle 18:04`, su riga propria sotto lo scatto.

**ELEMENTI TOLTI**
Segmento `FOTO` / `PDF` e tutto il ramo PDF · il riordino e l'eliminazione delle pagine · i
tre avvisi sul tetto di 12 fogli · il fallback senza fotocamera · la Testata 52/800 ·
l'etichetta testuale sullo scatto.

**Stati mostrati** — due fogli già presi; l'anteprima come segnaposto scuro (`#1B1D33` a righe
diagonali, riga mono `anteprima della fotocamera`); pressione dello scatto (`:active`, anello
0,96 / disco 0,88 in 180 ms) e `prefers-reduced-motion: reduce` che la annulla;
`:focus-visible` con outline bianco.
**Stati non mostrati** — zero fogli presi (e quindi se `Ho finito` sia spento), oltre 12 fogli,
fotocamera negata o assente, estrazione in corso, rifiuto, errore con `RIPROVA`, ramo PDF.

---

## 3. Componenti e pattern nuovi trasversali

Per ciascuno: cos'è, dove sta, misure e colori esatti, e cosa cambia rispetto a
`docs/superpowers/specs/DESIGN-SYSTEM.md`. Tutto ciò che segue è **una scelta consapevole di
Andrea**: `design/ridisegno/CLAUDE.md` la registra nella sezione finale «Debito verso
DESIGN.md», cioè come regola nuova da scrivere, non come errore da correggere.

### 3.1 Gradiente di sfondo

- **Cos'è:** il fondo della cornice non è più piatto.
  `background:linear-gradient(180deg,#EDECEA 0%,#F2F1EF 34%,#F8F8F7 70%,#FCFCFB 100%)`.
- **Dove:** tutti i file tranne `Fotografa il piano - scatto.html` (dove l'anteprima copre
  tutto). `CLAUDE.md`: «Non è più il fondo carta piatto».
- **Contro il sistema:** `DESIGN-SYSTEM.md` §1 principio 5 dice «**Nessun gradiente**, nessuna
  ombra colorata, nessuna emoji, nessuna animazione decorativa», e §5 «Cosa non c'è, di
  proposito» apre l'elenco con «Gradienti». Il token `--fondo #F1F0EE` (§2.1) resta definito
  ma non è più il fondo pagina: nessuna delle quattro fermate coincide con esso. Il valore più
  scuro, `#EDECEA`, è più scuro di `--fondo`; il più chiaro, `#FCFCFB`, è a un passo dal bianco
  puro di `--superficie #FFFFFF`, che il sistema riserva alle superfici.

### 3.2 Le tre ombre nuove

`CLAUDE.md` le dichiara «Ombre in uso, oltre alle tre di §5»:

| Nome | Valore | Su cosa |
|---|---|---|
| `--ombra-pannello` | `0 1px 2px rgba(20,22,58,.05), 0 6px 16px rgba(20,22,58,.06)` | tessere, widget, campi, celle della striscia |
| `--ombra-nav` | `0 2px 6px rgba(20,22,58,.08), 0 12px 30px rgba(20,22,58,.16)` | tab bar, dock, chrome sopra la fotocamera |
| `--ombra-alta` | `0 8px 24px rgba(20,22,58,.28), 0 26px 64px rgba(20,22,58,.26)` | pannello impostazioni, dock (foglio a 5 versioni) |

In più, non registrate in `CLAUDE.md` ma presenti nei file:
- `box-shadow:0 2px 4px rgba(20,22,58,.10),0 18px 40px rgba(20,22,58,.18)` sulla cornice del
  telefono — è la cornice del mockup, non un elemento di prodotto.
- `0 2px 6px rgba(20,22,58,.20)` sulla cella selezionata della striscia
  (`Piano - oggi e domani.html`).
- `--ombra-scuro: 0 4px 12px rgba(20,22,58,.22), 0 20px 48px rgba(20,22,58,.30)` in
  `Impostazioni a pannello - 5 versioni.html` (versione scartata).
- `--ombra-tasto-alto` nei fogli del tasto di testata (varianti scartate).

**Contro il sistema:** `DESIGN-SYSTEM.md` §2.7 ammette **tre ombre e basta** —
`0 1px 2px rgba(20,22,58,0.05)` sulla tessera accesa, `0 1px 3px rgba(20,22,58,0.28)` sulla
casetta piena, `0 3px 10px rgba(20,22,58,0.24)` sul tasto primario — e chiude con
«Nient'altro ha ombra». La §3 «Scheda» ribadisce «Nessuna ombra». Il ridisegno mette un'ombra
su ogni scheda e ne aggiunge **da tre a sei** livelli nuovi, tutti a **due strati** mentre le
tre ammesse sono a uno. Le due ombre del sistema sopravvissute: `0 1px 3px rgba(20,22,58,.28)`
sulla casetta piena (in `Piano - oggi e domani.html` e `Settimana - 5 versioni.html`) e
`0 3px 10px rgba(20,22,58,.24)` sul tasto primario (nei fogli a 5 versioni).

### 3.3 Maschera di scorrimento

- **Cos'è:** il contenitore che scorre porta una `mask-image` verticale, così il contenuto
  sfuma entrando sotto la tab bar invece di essere tagliato. È una maschera **sul
  contenitore**, non un velo sopra il contenuto (`Lista - variante E v2.html`, nota «Sfondo e
  dissolvenza»: «Sta ferma mentre il contenuto passa»).
- **Valori, che non coincidono fra i file:**

| File | Opaco fino a | 55% a | Nullo a |
|---|---|---|---|
| `Lista - variante E v2.html` | 108 px dal fondo | 68 px | 30 px |
| `Piano - oggi e domani.html`, `Piatti - versione 5.html` | `var(--fine)` = **128** px (barra grande) / **110** px (ridotta) | 74 px | 30 px |
| `Dispensa - tinta d'area e dock.html` | **196** px, fisso | 140 px | 100 px |
| `Lista - barra con nomi 3 versioni.html` | 128 / 112 / 110 px secondo la versione | 74 px | 30 px |
| `CLAUDE.md` | «`--fine` vale **140px** a barra grande e **110px** a barra piccola» | 74 px | 30 px |

  **Il valore di `CLAUDE.md` (140) non compare in nessun file**: i file scrivono 128. La
  Dispensa non usa `--fine` affatto, quindi lì la maschera **non** si adatta quando la barra si
  restringe.
- **Contro il sistema:** `DESIGN-SYSTEM.md` §2.9 elenca quattro classi di movimento e vieta
  «qualunque animazione che ritardi un'azione»; la maschera non è animata, quindi non la
  infrange. Ma §3 «Tab bar» descrive una barra con `padding 10px 16px 20px` **nel flusso**, non
  flottante con contenuto che le passa sotto: la maschera esiste solo perché la barra è
  diventata flottante.

### 3.4 Tab bar che si restringe allo scorrimento

- **Riposo:** `left/right: 16`, `bottom: 22`, altezza **84**, raggio **999**, padding 6, gap 2,
  fondo `#fff`, `--ombra-nav`. Voci `flex: 1` alte **72**, colonna, gap 4, raggio 999; attiva su
  `rgba(20,22,58,.07)`. Icone **26**, spente `#9A9AA6` (= `--off`), accesa `--ink`. Etichette
  mono **8,5 / 500 / 0,12em** in `--off`, attiva `--ink` a **700**, rese maiuscole da
  `text-transform:uppercase`. Il segno sta in uno `.segno` ad altezza fissa 26.
- **Ridotta:** altezza **66**, voci **54**, `left/right: 46`, etichette a
  `max-height: 0; opacity: 0` ma ancora cliccabili. Transizione **200 ms**
  `cubic-bezier(.2,.8,.25,1)`, opacità in 150 ms lineari, tutto dentro
  `@media (prefers-reduced-motion: no-preference)`. Soglia di scorrimento **8 px**; sotto i 4 px
  di scroll torna grande.
- **Dove:** `Piano - oggi e domani.html`, `Piatti - versione 5.html`,
  `Dispensa - tinta d'area e dock.html`, i quattro fogli a 5 versioni,
  `Lista - barra con nomi 3 versioni.html` (v2). **Non** in `Lista - variante E v2.html`, dove
  la barra è alta 66 fissa e senza etichette.
- **Contro il sistema:** §3 «Tab bar» dà «icona **21 px** + micro mono 8.5», voce attiva
  «fondo `rgba(20,22,58,0.06)` **raggio 14**», «`padding 10px 16px 20px`», quattro voci fisse
  **LISTA, SETTIMANA, PIATTI, DISPENSA**. Il ridisegno cambia: icone **26** invece di 21,
  raggio **999** invece di 14, alfa **0,07** invece di 0,06, barra flottante invece che nel
  flusso, **SETTIMANA → PIANO**. §2.9 elenca quattro momenti di movimento
  (`.anim-stato`, `.anim-foglio`, `.anim-apparsa`, `.anim-giorno`): questo è un **quinto**, e
  `Mappa delle schermate.html` lo chiama «un **sesto momento** di movimento non previsto».
  §2.8 vuole icone «solo tratto»: le quattro icone della barra sono **piene**.

### 3.5 Il Marchio come icona della voce Lista

- **Nei file:** `function marchio(l)` con
  `grid-template-columns:repeat(3,${l}px); grid-auto-rows:${l}px`, sei celle, lato **9**, gap
  **4**, raggio **2,52**, bordo **2 px**. Ordine: `[dispensa pieno, latticini pieno, ortofrutta
  vuoto, surgelati pieno, cereali pieno, macelleria vuoto]`, cioè arancio, azzurro, verde /
  lilla, giallo, corallo.
- **Cosa combacia:** l'ordine è **esattamente** quello fissato da `DESIGN-SYSTEM.md` §3
  «Marchio» («ordine fisso: arancio, azzurro, verde / lilla, giallo, corallo») e la logica
  pieno / contornato 2 px è conservata.
- **Cosa non combacia, e va segnalato:** `CLAUDE.md` scrive «L'icona della Lista è il Marchio
  (**griglia 3 × 3** di caselle contornate, lato 9, gap 4, raggio 2,52, bordo 2 px nei sei
  colori d'area)». Nei file la griglia è di **3 colonne per 2 righe con sei celle**, cioè 3 × 2,
  e la nota di `Lista - variante E v2.html` lo dice: «marchio **3×2** a 9 px». `CLAUDE.md` dice
  anche «caselle **contornate**», mentre quattro delle sei sono piene in tutti i file. Sono due
  imprecisioni di `CLAUDE.md`, non due disegni diversi: **i file sono coerenti fra loro e col
  sistema**, la scheda di decisione no.
- **Contro il sistema:** §3 «Marchio» dà **lato 16 px** e lo definisce «link a `/lista`» dentro
  la Testata; qui il lato è **9** e il Marchio diventa l'icona di una voce di navigazione.
  §2.6 ammette cinque raggi (999, 22, 18, 14, 4) con la nota che il quadratino d'area sta a
  `lato × 0.28`: **2,52 = 9 × 0,28**, quindi il valore rispetta la formula ma **non è uno dei
  cinque raggi**, ed è il secondo raggio fuori scala del ridisegno dopo il **26** della cornice
  (che è la cornice del mockup, non un elemento di prodotto).

### 3.6 Menù utente

- **Cos'è:** `COMPONENTE NUOVO` dichiarato in `Lista - variante E v2.html`.
- **Misure definitive (variante E ingrandita):** pillola alta **50**, raggio 999, fondo
  **`rgba(20,22,58,0.07)`** — la stessa tinta della voce attiva della barra — padding
  `0 12 0 6`, gap 5, larghezza risultante **81**. Dentro: tondo **38** in `--ink` con l'iniziale
  in mono **16 / 700 / 0,06em** bianca (17,4:1) e il kebab **20 px** in `--ink`. Nessuna ombra,
  nessun bordo. Premuto: fondo `rgba(20,22,58,0.12)`. Bersaglio unico 81 × 50, `aria-label`
  `"Andrea: profilo e impostazioni"`, `aria-expanded` quando il pannello è aperto.
- **Misure della variante E nel foglio** (`Lista - menu alternative.html`): alta 44, tondo 32,
  iniziale mono 13, larga 70. Il file scelto la ingrandisce.
- **Contro il sistema:** §3 «Testata» prevede in alto a destra solo «ingranaggio **24 px** con
  `aria-label="Impostazioni"` (area 44×44)». Il componente non esiste nel sistema. Le taglie
  mono **16**, 15 e 13 usate nelle varianti **non sono tra i nove livelli** di §2.4 (mono a 12,
  10 e 8,5), e §2.4 vuole il mono «sempre maiuscolo»: l'iniziale è maiuscola, quindi su questo
  regge.

### 3.7 Pannello impostazioni

- **Cos'è:** `COMPONENTE NUOVO` in `Impostazioni a pannello chiaro.html`. Non una schermata: un
  pannello che esce dal tondo utente.
- **Misure:** ancorato `top: 76`, `left/right: 16`, `bottom: 22`, raggio **22**, fondo
  **`--fondo #F1F0EE` pieno** (non trasparente), bordo **1,5 px `--ink`**, ombra
  `0 8px 24px / 0 26px 64px`. Velo dietro: **`rgba(20,22,58,0.55)`**. Testata del pannello:
  titolo 32 / 800 e tondo 44 su `rgba(20,22,58,0.07)` con la X. Corpo scorrevole con gap 12.
  Piede con la riga di versione. Due viste nello stesso pannello, la seconda con la freccia al
  posto della X.
- **Blocco di gruppo:** bianco, raggio **18**, bordo 1 px `--bordo`, padding `12 / 12 / 10`.
- **Riga di impostazione** (`COMPONENTE NUOVO`, descritto in `Mappa delle schermate.html`):
  minimo **56**, raggio 14, senza fondo proprio; nome **15 / 700 / -0,024em**, nota **12,5** in
  `--testo-2`; a destra uno di tre finali — valore in mono 11 / 700 maiuscolo più chevron,
  coppia `Sì` / `No` da 44, campo numerico **78 × 44** con l'unità in mono 10. «Niente switch».
- **Matrice del default settimanale** (`COMPONENTE NUOVO`): 7 righe × 3 colonne, sigla del
  giorno mono 10 larga **45**, gap **7**, celle alte **44** `flex: 1` → **79,3 px** su 304,
  raggio 14. Accesa = fondo `--ink` pieno col pallino bianco e l'ombra della casetta; spenta =
  bianca con bordo 1 px e pallino grigio.
- **Contro il sistema:** §2.7 riserva il bordo **1,5 px** allo «stato selezionato»: qui
  delimita una superficie. §3 «Foglio dal basso» dà l'overlay a **`rgba(20,22,58,0.35)`**: il
  velo qui è a **0,55**. L'ombra è la quarta o quinta oltre le tre di §2.7. Il nome di voce a
  **15 / 700** non è tra i nove livelli di §2.4 (che a 15 assorbe tutto nel «Nome di voce»
  17 / 700). La riga `Esci` presuppone un logout che l'inventario dichiara inesistente.
  Il pannello **copre la tab bar**, mentre §3 la vuole sempre presente su Impostazioni, senza
  voce attiva.

### 3.8 Dock della dispensa

- **Cos'è:** `COMPONENTE NUOVO` in `Dispensa - tinta d'area e dock.html`. Sopra la barra, a
  **114 px** dal fondo, scende a **96** quando la barra si riduce, con transizione
  `bottom 200ms cubic-bezier(.2,.8,.25,1)`.
- **Misure:** `Fai una modifica` alto **56**, raggio 999, bianco, `--ombra-nav`, matita 18 px a
  tratto 2,1, etichetta mono **11 / 700 / 0,08em**. Microfono: tondo **56** pieno in `--ink`,
  icona 22 px, `aria-label="Registra un vocale"`.
- **Stato «Registro»** (`COMPONENTE NUOVO`): pillola `--ink` alta 56 con metro a **quattro
  barre** larghe 3 px, animate da **7 a 22 px** in **220 ms** `ease-in-out` `infinite
  alternate` con sfasature di **40, 70 e 140 ms**; riga mono `Registro…` in bianco; tempo
  `0:07` in mono 11 / 500 a `rgba(255,255,255,.62)` con `tabular-nums`; `stop` 44 bianco col
  quadrato 14 raggio 4 in `--ink`. `role="status"`. Con `prefers-reduced-motion: reduce` le
  barre restano ferme a 13 px.
- **Contro il sistema:** §2.9 vuole «Solo CSS, **150–250 ms**, easing standard, solo
  causa-effetto»: i 220 ms del singolo ciclo rientrano, ma l'animazione **è in loop e dura
  finché dura la registrazione**, cioè non ha una durata. `Mappa delle schermate.html` la
  registra come decisione aperta: «Animazione senza fine prevista». §2.8 elenca le icone del
  sistema e la **matita non c'è** (la nota del file lo dichiara). Il colore
  `rgba(255,255,255,.62)` sul tempo è un'alfa nuova su fondo `--ink`.

### 3.9 Tasto di scatto

- **Cos'è:** `COMPONENTE NUOVO` in `Fotografa il piano - scatto.html`.
- **Misure:** anello **76**, raggio 999, `border: 2px solid #fff`, fondo trasparente; dentro un
  disco bianco **62**. Alla pressione anello `scale(.96)` e disco `scale(.88)` in **180 ms**
  `cubic-bezier(.2,.8,.25,1)`; `:focus-visible` outline 2 px bianco con offset 4;
  `prefers-reduced-motion: reduce` annulla transizione e trasformazione. Nessuna icona, nessuna
  etichetta; `aria-label="Scatta la foto del foglio"`.
- **Nel foglio a 5 versioni**, lo stesso componente era 72 / 52 con bordo 2 px **`--ink`** e
  disco in `--ink` su fondo bianco. `CLAUDE.md` registra la versione bianca su anello bianco:
  «anello 76 con bordo 2 px bianco e fondo trasparente, disco bianco 62 dentro».
- **Contro il sistema:** §2.8 «Mai emoji» e «solo tratto» — qui non c'è icona affatto, quindi
  non si applica; ma il componente non esiste in §3, e i 180 ms rientrano in §2.9.

### 3.10 Banda dei comandi

- **Cos'è:** `COMPONENTE NUOVO` in `Fotografa il piano - scatto.html`.
- **Misure:** `left/right/bottom: 0`, raggio **`22px 22px 0 0`**, fondo
  **`rgba(20,22,58,0.72)`**, padding `20 / 16 / 26`, gap 12, `z-index: 2`. Riga dello scatto:
  due lati `flex: 1` e lo scatto al centro. `Ho finito`: pillola **bianca** alta 44, mono
  11 / 700 / 0,08em. `Seleziona dalla galleria`: alto almeno **50**, raggio 18, bordo **1,5 px
  bianco al 62%**. Testi in **`#FFFFFF`** pieno.
- **Contro il sistema:** due alfe fuori scala — **0,72** sul fondo e **0,62** sul bordo — che
  `CLAUDE.md` registra esplicitamente nel debito («alfa fuori scala: 0,72 sulla banda, 0,62 sul
  bordo bianco»). §2.7 conosce solo `--bordo rgba(20,22,58,0.07)`, `--spento
  rgba(20,22,58,0.035)`, `rgba(20,22,58,0.20)` del tratteggiato e `rgba(20,22,58,0.35)`
  dell'overlay. §2.1 non ha token di testo su fondo scuro. Il raggio `22px 22px 0 0` è invece
  esattamente quello che §2.6 assegna ai fogli dal basso.

### 3.11 Striscia dei fogli presi

- **Nella versione scelta:** ridotta a una miniatura **44** raggio 14 bianca con «righe finte»
  (`repeating-linear-gradient` a 2 px ogni 7 in `rgba(20,22,58,.14)`) e il contatore `2 fogli`
  in mono 10 / 700 / 0,11em.
- **Nel foglio a 5 versioni** (`Fotografa il piano - 5 versioni.html`, versione 4, dichiarata
  `COMPONENTE NUOVO`): tessere **62 × 80**, raggio 14, bianche, bordo 1 px
  `rgba(20,22,58,0.09)`, `--ombra-nav`; numero in mono 10; X con disegno 20 e **bersaglio 44**
  sporgente di 8 px. La nota di quella versione lascia aperto: «con più di quattro fogli va
  deciso se scorre o se si impila».
- **Contro il sistema:** `CLAUDE.md` la elenca fra i componenti nuovi del debito §8. Il
  bersaglio 44 su disegno 20 segue la regola di §4 («bersagli ≥ 44 px anche quando il disegno è
  più piccolo»).

### 3.12 Tessere widget

Tre tessere nuove, tutte in griglia 2 colonne gap 8, minimo **104**, raggio **14**:

| Componente | File | Misure e colori |
|---|---|---|
| **Tessera di dispensa** | `Dispensa - tinta d'area e dock.html` | Padding `12 / 14 / 13`. In casa: fondo **colore d'area al 26%**, nessuna ombra; pillola della quantità mono **10,5 / 700 / 0,07em** su **bianco** raggio 999 padding `5 / 10`; nome **17 / 700 / -0,032em** in basso; seconda pillola bianca raggio 999 padding `4 / 9` con riga mono 8,5 per `Scade il …` in **`--avviso #9A5C00`** o `Congelato` in **`--freddo #2F6FBF`**. Finita: nessun fondo, **bordo 2 px tratteggiato** `rgba(20,22,58,0.20)`, pillola `Finito` in `--testo-2`, nome barrato. Tutta la tessera è l'interruttore, `aria-pressed` |
| **Tessera piatto** | `Piatti - 5 versioni.html` v3 (scartata) | Bianca, bordo 1 px `rgba(20,22,58,0.09)`, `--ombra-pannello`, pillola porzioni mono 10,5, nome 17 / 700, misura mono 8,5. **Senza pallini d'area** |
| **Tessera di dispensa con barra di livello** | `Dispensa - 5 versioni.html` v3 (scartata) | Barra alta 6 raggio 999 su `rgba(20,22,58,0.08)`, riempimento in `--ink`. `CLAUDE.md` la esclude: «Presenza indicata da tinta e testo, **non** da barra né pallino» |

**Contro il sistema:** `DESIGN-SYSTEM.md` §2.2 chiude l'elenco degli usi del colore d'area a
**quattro**: «bordo della tessera accesa, quadratino 10 px accanto all'etichetta di sezione,
tinta al 26% dietro la riga di controllo, casella del marchio. Mai come colore di testo, mai
come fondo di un tasto». La tinta al 26% come **fondo della tessera** è un **quinto uso**, e le
note dei file lo dicono. La conseguenza è misurata nel file stesso: su quella tinta `--freddo`
scende da 5,1:1 a **4,2:1** e `--avviso` da 5,4:1 a **4,7:1**, cioè sotto o al limite dei
4,5:1 richiesti da §4 — per questo le due righe semantiche vivono su pillole bianche.
La tessera è anche **un tasto** col colore d'area come fondo, che §2.2 vieta esplicitamente:
la deroga c'è già per la Tessera della Lista in §3, ma lì il fondo pieno è riservato alla sola
protagonista, mentre qui lo porta ogni voce in casa.

### 3.13 Sinossi dei valori fuori scala

| Valore nel ridisegno | Regola di `DESIGN-SYSTEM.md` | Dove |
|---|---|---|
| Gradiente a 4 fermate | §1.5 e §5: nessun gradiente | tutti i file tranne la fotocamera |
| Da 3 a 6 ombre nuove, a due strati | §2.7: tre ombre, a uno strato, «nient'altro ha ombra» | tutti |
| Raggio **26** sulla cornice | §2.6: cinque raggi (999, 22, 18, 14, 4) | cornice del mockup, non prodotto |
| Raggio **2,52** sulle caselle del Marchio | §2.6: cinque raggi. Rispetta però la formula `lato × 0,28` | tab bar, tutti |
| Raggio **34** sulla barra a due piani | §2.6 | `Dispensa - tessere e inserimento 5 versioni.html` v3 |
| Raggio **0** sulla protagonista a filo | §2.6 | `Lista - sezioni widget 5 versioni.html` v5 (scartata) |
| Alfa **0,72** e **0,62** | §2.7: alfe note 0,035 · 0,07 · 0,20 · 0,35 | banda della fotocamera |
| Velo **0,55** | §3: overlay a 0,35 | pannello impostazioni |
| Voce attiva a **0,07** | §3 Tab bar: 0,06 | tab bar, menù utente |
| Bordo **1,5 px** come delimitatore | §2.7: 1,5 px = stato selezionato | pannello, scheda e banda della fotocamera |
| Icone **26 px** in barra | §3 Tab bar: 21 px | tutti |
| Icone **piene** | §2.8: «solo tratto» | tab bar, tutti |
| Matita | §2.8: sei icone, la matita non c'è | dock dispensa |
| Mono a **16 / 15 / 13 / 11 / 10,5 / 9 / 8,5** px | §2.4: mono a 12 · 10 · 8,5 | menù utente, pillole, sottorighe |
| Sans a **15 / 15,5 / 17,5 / 12** px | §2.4: nove livelli, sans a 52 · 32 · 21 · 17 · 14 · 12,5 | riga di impostazione, riga pasto, avviso |
| Titoli in sentence case (`Lista`, `Piano`, `Piatti`, `Dispensa`, `Impostazioni`) | §2.4: «una parola sola in maiuscolo (LISTA, SETTIMANA, PIATTI, DISPENSA, IMPOSTAZIONI)» | tutti |
| `SETTIMANA` → `PIANO` | §2.4, §3 Tab bar: quattro voci fisse fra cui SETTIMANA | tutti |
| Tinta d'area al 26% come fondo di tessera-tasto | §2.2: quattro usi, «mai come fondo di un tasto» | Dispensa |
| Animazione in loop senza durata | §2.9: 150–250 ms | stato «Registro» |

---

## 4. Mappa delle schermate

### 4.1 Riassunto fedele di `Mappa delle schermate.html`

Titolo della lavagna: «**Tre schermate montate, la Lista da assemblare, sette da fare**»,
datata **18/09/2026**. Tre pannelli affiancati: la lavagna, una proposta di Impostazioni a
schermata piena, e il dialogo di conferma reso per intero.

- **Direzione approvata — 4 sezioni, 3 montate, 1 da assemblare.** `Piano`, `Piatti` e
  `Dispensa` hanno un file ciascuna. La `Lista` no: «Le scelte ci sono tutte ma stanno su due
  file», e «Da fare: montarle in un file solo e aggiungere la barra a due stati con le
  etichette, che la Lista non ha ancora e le altre tre sì».
- **Da disegnare · dettagli — 4 schermate.** `Piatto` («Il vocabolario basta: nessun componente
  nuovo previsto»); `Ingrediente` («Decidere prima: schermata o foglio»); `Scegli un piatto`
  («Decidere prima: riuso di Piatti o schermata nuova»); `Ordine delle aree` («Componente nuovo
  inevitabile: riga riordinabile»).
- **Da disegnare · flussi — 2 schermate.** `Importa` («Serve sapere da quali fonti si
  importa»); `Revisione dell'import` («I componenti esistono: riga di revisione e avviso in
  linea»).
- **Da disegnare · stati trasversali — 4 stati.** `Stati vuoti` («Il tasto primario non ha più
  un posto»); `Dialogo di conferma` («Pronto per entrare in DESIGN.md»); `Caricamento e
  offline` («Nessuna decisione aperta»); `Fogli dal basso` («Servono gli elenchi delle voci»,
  «Il menù utente ne apre uno e oggi non sappiamo cosa ci sia dentro»).
- **Impostazioni — proposta.** Quattro gruppi, 10 voci: `Come calcolo la lista` (3),
  `Come la vedi in corsia` (2), `I tuoi dati` (3), `Account` (2). Dichiara cosa non c'è di
  proposito: tema e dark mode, notifiche, lingua, «qualunque voce su salute, calorie o budget.
  Nessuna cifra in euro da nessuna parte».
- **Undici decisioni aperte** elencate in coda, fra cui: gradiente, quarta e quinta ombra, tab
  bar in pillola, menù utente, il nome `Piano`, la tinta al 26% sulla tessera, l'animazione
  senza fine, le icone piene e la matita, **otto componenti nuovi** (Menù utente, Riga piatto,
  Riga di dispensa, Tessera di dispensa, Dock di inserimento, Stato «Registro», Riga di
  impostazione, Riga riordinabile), il tasto primario senza posto, la Lista da assemblare.
- **Dialogo di conferma reso:** overlay `rgba(20,22,58,0.35)`, foglio bianco raggio
  `22px 22px 0 0`, padding `16 / 16 / 26`, gap 12, titolo 21 / 800, testo 14 in `--testo-2`,
  due tasti `flex: 1` alti 54 raggio 18 mono 12 / 700 / 0,09em: `Annulla` secondario e
  `Cancella` primario pieno in `--errore #C4423E`. Copy:
  `Cancello le 13 voci in dispensa?` / `Al prossimo ricalcolo la Lista le chiederà tutte. I
  piatti e il piano del 14–20 settembre non cambiano. Non si torna indietro.` La nota dichiara:
  «nessuna [regola toccata]: §8 e §9 fissano già foglio, overlay, coppia di tasti e distruttivo
  pieno in --errore. Questa resa può entrare in DESIGN.md così com'è.»

### 4.2 Route o schermate nuove rispetto all'inventario

La mappa **non parla di route**: ragiona per schermate e destinazioni, senza mai scrivere un
percorso. Confronto con le 16 schermate dell'inventario:

**Nuove o rinominate rispetto all'inventario**
- `Piano` sostituisce `Settimana` (inventario n. 4, `/settimana`).
- `Ordine delle aree` sostituisce `Ordine reparti` (n. 14, `/impostazioni/reparti`).
- `Importa un piano` sostituisce `Importa la dieta` (n. 15, `/importa`).
- `Fotografa il piano` non è una schermata dell'inventario: è il **ramo FOTO del passo 8c** di
  `/importa`, reso come schermata a sé.
- La **sotto-schermata `Pasti a casa`** (dentro il pannello) non ha corrispondente: nel codice
  i pasti si configurano dentro `/impostazioni`.
- `Esci` presuppone un logout che l'inventario dichiara assente in tutto `src/`.

**Schermate dell'inventario che la mappa non nomina affatto**
`Hai preso tutto` (n. 2, `/lista/fatta`) · `Confezioni diverse` (n. 3, `/lista/confezioni`) ·
`Primo avvio` (n. 7, il cancello) · `Piatti veloce` (n. 9, `/piatti/veloce`) ·
`Ingredienti` (n. 13, `/impostazioni/ingredienti`) · `Entra` (n. 16, `/entra` e la home `/`).
Sono **sei schermate esistenti senza alcuna direzione di ridisegno**, e nessuna appare nei
conteggi della mappa. La mappa parla di «sette da fare» contando quattro dettagli, due flussi e
le Impostazioni — che nel frattempo sono state fatte.

### 4.3 Cosa dice la mappa delle schermate non ancora ridisegnate

Per ciascuna, la mappa distingue «Il sistema dà già» da «Da decidere», e chiude con una riga di
stato (`pronta` o `aperto`):

| Schermata | Stato secondo la mappa | Decisione aperta, con le parole del file |
|---|---|---|
| Piatto | pronta | «come si mostrano gli ingredienti con le loro quantità, se le porzioni si cambiano qui o solo nel Piano, dove vive "elimina il piatto"» |
| Ingrediente | aperto | «è una schermata o un foglio dal basso?» |
| Scegli un piatto | aperto | «è la schermata Piatti in modalità scelta, o una schermata sua?» |
| Ordine delle aree | aperto | «come si riordina senza swipe e senza long-press… Servono due frecce su ogni riga, oppure uno "sposta" che apre un elenco di posizioni» |
| Importa | aperto | «cosa si importa e da dove» |
| Revisione dell'import | pronta | «come si corregge una riga inferita, e cosa succede a quelle che restano non risolte quando confermi» |
| Stati vuoti | aperto | «§8 vuole il primario "in fondo", ma il fondo è occupato dalla barra flottante e, in Dispensa, dal dock» |
| Dialogo di conferma | pronta | nessuna |
| Caricamento e offline | pronta | nessuna |
| Fogli dal basso | aperto | «quali voci contiene ognuno» |

**La mappa è arretrata su due punti verificabili.** Dichiara «Le Impostazioni oggi non esistono
da nessuna parte» e ne propone una **a schermata piena** con testata in modalità indietro e tab
bar visibile — mentre `Impostazioni a pannello chiaro.html` le rende come **pannello sopra
l'app, che copre la tab bar**. E non nomina `Fotografa il piano - scatto.html`, pur elencando
`Importa` fra le cose da fare. Le voci e i testi della proposta della mappa sono però **gli
stessi** che poi finiscono nel pannello: le dieci righe, le note e la riga di versione
coincidono parola per parola.

---

## 5. Cosa serve per ricollegare al codice

Nessuna modifica a `src/` è stata fatta. Questa sezione elenca gli impatti, non li applica.

### 5.1 Impatti trasversali, prima delle singole schermate

| Componente in `src/components/` | Cosa cambia |
|---|---|
| `Testata.tsx` | Riscrittura. Perde il Marchio (che va in barra) e l'ingranaggio; guadagna il **Menù utente**. La modalità `indietro` cambia di significato: in `Mappa delle schermate.html` la freccia 20 px «sta sopra il titolo» invece di sostituire il marchio; in `Fotografa il piano - scatto.html` diventa un tondo 44 bianco flottante sopra un'anteprima. Il titolo resta 52/800 ma il testo passa da `Spesa` a `Lista` |
| `Marchio.tsx` | Cambia consumatore e taglia: da 16 px in testata a **9 px** dentro la voce Lista della tab bar. L'ordine fisso e la logica pieno / contornato restano. Il prop `aree` continua a servire, ma ora la Lista lo passa **a un elemento di navigazione**, non a un link di testata |
| `TabBar.tsx` | Riscrittura. Pillola flottante raggio 999 invece che barra nel flusso; due stati con transizione allo scorrimento; icone 26 invece di 21; voce attiva raggio 999 su `rgba(20,22,58,.07)`; icona della Lista = Marchio; **voce `SETTIMANA` rinominata `PIANO`** (e con essa la route, se il nome segue il percorso) |
| `Tessera.tsx` | Sopravvive quasi intatta nei tre stati, ma perde il proprio fondo bianco quando sta dentro il widget di sezione (`Lista - sezioni widget 5 versioni.html` v1: «la tessera accesa perde il fondo bianco previsto») |
| `RigaControllo.tsx` | Sopravvive; la sottoriga cambia testo (`controllo ogni 4 settimane`) e le pillole passano da `SÌ` / `NO` a `Sì` / `No`, perdendo l'`aria-label` |
| `RigaPasto.tsx` | Sopravvive con le tre zone 60 / corpo / 44. Cambia l'`aria-label` della zona destra (`Altre azioni su {piatto}`) e sparisce la variante chevron |
| `StrisciaGiorni.tsx` | Sopravvive; guadagna il quarto stato «oggi e selezionato» e un `aria-label` più ricco |
| `Segmento.tsx` | Perde due consumatori su sei: le pillole filtro di `/piatti` e il segmento `FOTO` / `PDF` dell'acquisizione non esistono più nel ridisegno |
| `FoglioAzioniPasto.tsx` | **Non ridisegnato.** Resta com'è, ma la mappa lo elenca fra gli aperti: «Servono gli elenchi delle voci» |
| `NotaDispensa.tsx` | **Non ridisegnato**, e la sua porta d'ingresso (la card compressa) è sostituita dal dock. Da decidere se il dock lo apre |
| `TesseraIngrediente.tsx`, `Scanner.tsx`, `PrimoAvvio.tsx` | Non toccati da nessun file del ridisegno |

**Token e scale da aggiornare in `src/app/globals.css`.** I cinque token decisi il 17/09
(`--testo-2`, `--avviso`, `--errore`, `--freddo`, `--icona-spenta`) che
`DESIGN-SYSTEM.md` §8 dichiara «non ancora nel codice» sono **usati da tutti i file del
ridisegno**: senza di essi nessuna schermata è implementabile come disegnata. Servono in più il
gradiente, le tre ombre di `CLAUDE.md` e le variabili di movimento `--moto-barra: 200ms` e
`--curva-barra: cubic-bezier(.2,.8,.25,1)`.

### 5.2 Per schermata

**Lista — `src/app/(app)/lista/page.tsx`**
- Componenti: `Testata`, `Marchio`, `TabBar`, `Tessera`, `RigaControllo`.
- **Prima di toccare il codice va assemblato il mockup**: nessun file contiene la Lista
  approvata (§1.3). Assemblare `variante E v2` + widget v1 + barra v2.
- Da costruire: involucro «widget di sezione» attorno alle sezioni; maschera di scorrimento sul
  contenitore; Menù utente.
- Da decidere prima di scrivere: dove vanno `SelettoreTab` (`BASE` / `TOP-UP`) e
  `HAI PRESO TUTTO`, che il ridisegno non colloca. L'ordinamento `ordinaPerCarrello` e la
  logica della protagonista non cambiano.
- Solo decorazione: il gradiente, le ombre, la maschera.

**Piano — `src/app/(app)/settimana/page.tsx`**
- Componenti: `Testata`, `StrisciaGiorni`, `RigaPasto`, `TabBar`.
- Da costruire: il quarto stato della cella; l'etichetta di sezione che titola il giorno con la
  parola temporale; la pillola settimana su questa schermata (oggi non la passa).
- Il contatore cambia **semantica**, non solo forma: da «pasti a casa in settimana» a «pasti a
  casa nel giorno scelto». È un calcolo diverso, non un'etichetta diversa.
- Da decidere: dove vanno il link di cambio vista, le frecce del giorno e il tasto di conferma
  — quest'ultimo è l'atto che **genera le liste**, quindi non è rinviabile.
- Solo decorazione: il gradiente, le ombre, la maschera.

**Piatti — `src/app/(app)/piatti/page.tsx`**
- Componenti: `Testata`, `TabBar`; `Segmento` non serve più.
- Da costruire: la **Riga piatto** (nuovo componente); la **ricerca dentro gli ingredienti**,
  che è logica nuova — oggi `page.tsx` filtra per nome con tolleranza agli accenti, e cercare
  negli ingredienti richiede di attraversare `leggiRepertorio` per ogni piatto; l'«aggiungi»
  tratteggiato in cima al posto del tasto primario in fondo.
- Da decidere: se perdere davvero la fonte `NUTRIZIONISTA` / `PROPRIO`, che il ridisegno non
  mostra più, e lo stato vuoto con le due porte, che è l'onboarding.

**Dispensa — `src/app/(app)/dispensa/page.tsx`**
- Componenti: `Testata` (nuovo consumatore: oggi la Dispensa non la usa), `TabBar`.
- Da costruire: **Tessera di dispensa**; **Dock di inserimento**; **Stato «Registro»** con il
  metro animato, il timer e `role="status"`.
- Comportamenti nuovi che il mockup mostra e il codice non ha: il dock che scende da 114 a 96
  px in sincrono con la barra; la registrazione vocale come modalità del dock (oggi la
  dettatura vive dentro `NotaDispensa` con `SpeechRecognition` e accoda al testo).
- Funzioni che il ridisegno **non colloca più** e che oggi esistono: il campo numerico del
  residuo (che salva al blur e si rimonta via `key`), il fiocco di neve, l'intera sezione
  `PRONTI` con i suoi lotti, la scheda AI con le proposte. Sono le funzioni portanti della
  schermata: senza una collocazione, la Dispensa ridisegnata **non fa** quello che la Dispensa
  fa oggi.
- Solo decorazione: la tinta al 26%, le pillole bianche, il gradiente.

**Impostazioni — `src/app/(app)/impostazioni/page.tsx`**
- Il cambiamento più grosso: **da route a overlay**. Oggi è una pagina in `(app)` raggiunta
  dall'ingranaggio; diventa un pannello montato sopra la schermata corrente, ancorato al Menù
  utente, che copre la tab bar. Questo tocca `src/app/(app)/layout.tsx` (dove vive la tab bar) e
  ogni schermata che deve poterlo aprire.
- Da costruire: **Pannello delle impostazioni** con due viste interne e la navigazione fra
  esse; **Riga di impostazione** nei suoi tre finali; **Matrice del default settimanale**;
  **Blocco di gruppo**; il velo a 0,55.
- Comportamenti nuovi: la **sotto-schermata dei pasti di default** dentro il pannello, con il
  riepilogo che si ricalcola a ogni tocco; la polarità **invertita** rispetto alle pastiglie
  attuali (acceso = a casa, contro `ABITUALMENTE FUORI CASA`); il valore `6 fuori casa` che
  torna nella riga del menù.
- Funzioni senza collocazione: rinomina, aggiunta, rimozione e riordino dei pasti; la rotazione
  del piano con `RIPARTI DALLA SETTIMANA 1`; la riga `Ingredienti`; **tutta la casa condivisa**
  (`SezioneCasa`, `statoCasa`, invito a 8 caratteri, `TOGLI`, `ESCI DALLA CASA`); lo stepper
  delle porzioni. Sono, nel codice, la maggior parte della schermata.
- Funzioni nuove senza backend: `Arrotonda alle confezioni`, `Cadenza dei controlli`,
  `Unità di misura`, `Esporta i tuoi dati`, `Cancella la dispensa`, e `Esci`, che richiede un
  logout che non esiste in tutto `src/`.
- Da risolvere anche a livello di scala: la matrice a tre colonne fisse contro i 3–6 pasti
  configurabili (§2.5).

**Fotografa il piano — `src/app/(app)/importa/Camera.tsx`**
- Da costruire: **Tasto di scatto**; **Banda dei comandi**; la pillola di titolo; la cornice
  guida; la miniatura unica con contatore.
- Comportamenti nuovi: `Rivedi i 2 fogli presi` apre qualcosa che **nessun file disegna**; la
  riga `Ultimo foglio alle 18:04` richiede un dato (l'ora dello scatto) che oggi il componente
  non conserva.
- Funzioni senza collocazione: il riordino e l'eliminazione delle singole pagine
  (`◀` `✕` `▶`), il tetto delle 12 pagine con i suoi tre avvisi, il fallback senza fotocamera
  (che l'inventario segnala come il caso non testato in jsdom), e l'intero ramo PDF.
- Solo decorazione: la cornice guida (`aria-hidden`), il segnaposto dell'anteprima, il
  `repeating-linear-gradient` delle righe finte sulla miniatura.

---

## 6. Domande per Andrea

Solo quelle che il materiale non risolve.

1. **La Lista va assemblata: chi la assembla e con quale barra?** `Mappa delle schermate.html`
   lo chiede e `CLAUDE.md` non lo assegna. Serve un file che monti variante E v2 + widget v1 +
   barra v2 prima di scrivere codice.
2. **`--fine` vale 140 o 128?** `CLAUDE.md` dice 140 a barra grande; tutti i file scrivono 128.
   E la maschera della Dispensa è fissa a 196 / 140 / 100, quindi non si adatta quando la barra
   si restringe: è voluto?
3. **Il Marchio in barra è 3 × 2, non 3 × 3.** `CLAUDE.md` scrive «griglia 3 × 3 di caselle
   contornate»; i file rendono 3 colonne × 2 righe con quattro caselle piene su sei, coerenti
   con `DESIGN-SYSTEM.md` §3. Confermo i file e correggo `CLAUDE.md`?
4. **Dove vanno i tasti primari che il ridisegno non colloca?** `HAI PRESO TUTTO`,
   `CONFERMA E CREA LA LISTA`, `ESTRAI LA DIETA` (ora `Ho finito`), e ogni primario degli stati
   vuoti. È l'aperto n. 10 della mappa e vale su cinque schermate.
5. **La Dispensa perde il campo del residuo, il fiocco del congelatore, i Pronti e la nota AI.**
   Tutto passa dal dock, o queste funzioni vanno da qualche altra parte? Dalla risposta dipende
   se la schermata è implementabile.
6. **Le Impostazioni perdono la casa condivisa, la rotazione del piano e la gestione dei
   pasti.** Sono rinviate a una seconda vista del pannello, tolte dal prodotto, o spostate
   altrove?
7. **La matrice dei pasti ha tre colonne fisse, il prodotto ne ammette da 3 a 6.** A sei pasti
   le celle scendono sotto i 44 px. Si accetta il limite di tre, o la matrice ruota (pasti in
   riga, giorni in colonna)?
8. **La riga `Esci` presuppone un logout che non esiste.** Si costruisce il logout adesso
   (è nel backlog dal 15/09), o la riga si toglie dal pannello?
9. **`Rivedi i 2 fogli presi` e il menù utente aprono due cose che nessun file disegna.**
   Servono gli elenchi delle voci, come già chiede la mappa per i fogli dal basso.
10. **I titoli restano in sentence case?** Il ridisegno scrive `Lista`, `Piano`, `Piatti`,
    `Dispensa`, `Impostazioni`; `DESIGN-SYSTEM.md` §2.4 li vuole in maiuscolo. È la divergenza
    n. 1 di «Non determinato dal codice», ancora aperta.
11. **Sei schermate esistenti non hanno direzione:** `Hai preso tutto`, `Confezioni diverse`,
    `Primo avvio`, `Piatti veloce`, `Ingredienti`, `Entra`. Vanno ridisegnate, o restano com'è
    finché non le si tocca?
12. **`thumbnail.html` punta a un `tokens.css` che non è nella cartella.** Va scaricato anche
    quello, o la copertina si ignora?
