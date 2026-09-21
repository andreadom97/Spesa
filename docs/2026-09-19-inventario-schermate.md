# Inventario delle schermate di Spesa — 19/09/2026

**Obiettivo:** dare a chi ridisegna in Claude Design l'elenco esatto di ogni schermata,
zona, pulsante, stato e testo dell'app com'è oggi su `main` (commit `6e4837c`), così che
ogni schermata ridisegnata torni qui con gli stessi nomi e si possa ricollegare al codice
senza ambiguità. Letto dal codice il 19/09/2026, non dall'app: ogni etichetta è copiata
dal file indicato, maiuscole comprese. Dove il codice non determina qualcosa, è scritto
in coda in "Non determinato", non inventato.

**Come usarlo con Claude Design.** Caricalo nel progetto design system "Spesa" accanto a
`DESIGN.md`. Quando chiedi una schermata, nomina il numero e il titolo di questo file
("ridisegna la 6, Dispensa") e chiedi che il risultato conservi **i nomi degli elementi
interattivi della tabella** (colonna "Elemento") come `data-elemento` o come didascalia:
sono la chiave con cui il codice ricollega ogni pulsante. Un elemento nuovo va dichiarato
con `ELEMENTO NUOVO:`; uno tolto con `ELEMENTO TOLTO:`.

## Le 16 schermate

| # | Schermata | Route | Tab attiva | Chi la usa e quando |
|---|---|---|---|---|
| 1 | Lista | `/lista` | LISTA | in corsia, il sabato |
| 2 | Hai preso tutto | `/lista/fatta` | LISTA | a fine spesa |
| 3 | Confezioni diverse | `/lista/confezioni` | LISTA | a fine spesa, se una confezione è diversa |
| 4 | Piano (ex Settimana) | `/piano` | PIANO | la domenica per pianificare, la sera per la spunta |
| 5 | Scegli | `/piano/{data}/{slotDefId}/scegli` | PIANO | cambiare il piatto di un pasto |
| 6 | Dispensa | `/dispensa` | DISPENSA | controllo del residuo, Pronti, correzione con nota |
| 7 | Primo avvio | nessuna route (cancello) | — | prima apertura dell'app |
| 8 | Piatti | `/piatti` | PIATTI | repertorio, due porte quando è vuoto |
| 9 | Piatti veloce | `/piatti/veloce` | PIATTI | primo inserimento rapido dei piatti |
| 10 | Piatto | `/piatti/{id}`, `/piatti/nuovo` | PIATTI | vista e modifica di un piatto |
| 11 | Ingrediente | `/piatti/{id}/ingredienti/{ingId}` | PIATTI | editor di un ingrediente |
| 12 | Impostazioni | `/impostazioni` | nessuna | configurazione, casa condivisa |
| 13 | Ingredienti | `/impostazioni/ingredienti` | nessuna | elenco degli ingredienti |
| 14 | Ordine reparti | `/impostazioni/reparti` | nessuna | l'ordine delle aree in Lista |
| 15 | Importa la dieta | `/importa` | nessuna | wizard in sei passi |
| 16 | Entra | `/entra`, home `/` | — | accesso |

## Mappa di navigazione

```
/entra ──(sessione)──▶ / ──redirect──▶ /lista
                                          │
   tab bar (sempre in fondo nel gruppo app): LISTA · SETTIMANA · PIATTI · DISPENSA
   ingranaggio in Testata (Lista, Settimana, Piatti, Dispensa) ──▶ /impostazioni

/lista ── HAI PRESO TUTTO ──▶ /lista/fatta ── CONFEZIONI DIVERSE? SCANSIONA ──▶ /lista/confezioni
  │  ◀── TORNA ALLA LISTA ──┘                ◀── TORNA A HAI PRESO TUTTO ──────────┘
  └── stato vuoto: VAI ALLA SETTIMANA ──▶ /settimana
/lista/fatta ── CHIUDI LA SPESA ──▶ /settimana

/settimana ── chevron riga pasto (bozza) ──▶ …/scegli ── ANNULLA / SOSTITUISCI ──▶ /settimana
           ── kebab riga pasto (confermata/chiusa) ──▶ Foglio dal basso
                 ├── Cambia piatto / Ho mangiato un altro piatto ──▶ …/scegli
                 └── corpo della riga ──▶ /piatti/{id}
           ── CONFERMA E CREA LA LISTA / VAI ALLA LISTA ──▶ /lista

/piatti ── scheda ──▶ /piatti/{id} ── matita su tessera ──▶ /piatti/{id}/ingredienti/{ingId}
        ── + NUOVO PIATTO ──▶ /piatti/nuovo
        ── stato vuoto: SCRIVI I MIEI PIATTI ──▶ /piatti/veloce · IMPORTA LA DIETA ──▶ /importa

/impostazioni ── Ingredienti ──▶ /impostazioni/ingredienti ── riga ──▶ /piatti/nuovo/ingredienti/{id}?torna=impostazioni
              ── Ordine dei reparti ──▶ /impostazioni/reparti
              ── Importa la dieta ──▶ /importa (Testata in modalità indietro ──▶ /impostazioni)
/dispensa: header con freccia ──▶ /impostazioni (vedi "Non determinato" n. 3)
```

Regole del gruppo `(app)`: tab bar sempre visibile; la voce attiva è quella il cui percorso
è prefisso della route (quindi LISTA resta attiva su `/lista/fatta`, PIATTI su
`/piatti/…`, nessuna su `/impostazioni` e `/importa`); il cancello del primo avvio
avvolge tutto e non disegna nulla finché la semina non finisce o non passano 4 s.

## Convenzioni di lettura

- Token: `--ink #14163A`, `--sec #8A8A96`, `--ter #A6A6B2`, `--off #9A9AA6`, `--bordo
  rgba(20,22,58,0.07)`, `--spento rgba(20,22,58,0.035)`, `--superficie #FFFFFF`,
  `--fondo #F1F0EE`. I cinque token decisi il 17/09 (`--testo-2`, `--avviso`, `--errore`,
  `--freddo`, `--icona-spenta`) **non sono ancora nel codice**: dove l'inventario dice
  `--sec` per un errore o `#4A90D9` per il congelato, il design system dice altro, e vince
  il design system.
- Le sei aree, nome reso a schermo e colore: `ORTOFRUTTA #A8D96A`, `MACELLERIA E
  PESCHERIA #F29B9B`, `LATTICINI, UOVA E SALUMI #9CC7F2`, `PASTA, RISO E CEREALI #F5CE5B`,
  `DISPENSA E CONSERVE #F2A465`, `SURGELATI #B9AEF5`.
- Vocabolario: *residuo* = quanto risulta in casa, derivato da `residuo precedente +
  comprato − consumato`, mai inserito a mano; *base* = la spesa grossa sui non deperibili,
  *top-up* = il fresco; *ciclo* = le settimane del repertorio che ruotano; *Pronti* = i
  lotti del meal prepping (frigo 3 giorni, freezer 90); *casa* = il gruppo di account che
  condivide piano, lista e dispensa.
- I nomi dei pasti sono dati dell'utente; qui si usano i quattro seminati al primo avvio:
  `Colazione`, `Spuntino`, `Pranzo`, `Cena` (resi in maiuscolo dai segmenti).
- Tabella "Elementi interattivi": la colonna **Elemento** è il nome stabile da conservare
  nel redesign.

---

## 1. Lista — `/lista`

**File:** `src/app/(app)/lista/page.tsx`; `src/components/Testata.tsx`,
`src/components/Marchio.tsx`, `src/components/Tessera.tsx`,
`src/components/RigaControllo.tsx`, `src/components/TabBar.tsx`.
(`src/components/Segmento.tsx` **non** è usato qui: il selettore base/top-up è il
componente locale `SelettoreTab` dentro `page.tsx`.)

**Scopo:** in corsia, spuntare quello che si prende, area per area, e rispondere ai
controlli degli staple. Si usa dopo la conferma della settimana e fino alla chiusura
della spesa.

**Come ci si arriva:** tab bar (`LISTA`); dal marchio di ogni Testata (`aria-label="Vai
alla lista"`); dal tasto finale della Settimana (`CONFERMA E CREA LA LISTA` / `VAI ALLA
LISTA`); da `TORNA ALLA LISTA` in Hai preso tutto; per redirect da `/lista/fatta` e
`/lista/confezioni` quando la lista non è tutta spuntata.

**Testata:** `Testata` completa. Titolo esatto **`Spesa`** (sans 52/800, così com'è: il
componente non lo trasforma in maiuscolo). Pillola settimana **sì**, formato
`31 AGO — 6 SET` (lunedì e domenica, mesi `GEN FEB MAR APR MAG GIU LUG AGO SET OTT NOV DIC`,
separatore em-dash con spazi); assente nello stato d'errore di caricamento. Marchio **sì**
(è l'unica schermata che gli passa `aree`: casella contornata 2 px = in quell'area manca
ancora qualcosa, piena = a posto o non in questa spesa). Ingranaggio **sì**.

**Struttura dall'alto in basso:**
1. Testata (marchio + `Spesa` + ingranaggio; sotto, pillola settimana).
2. Riga di stato offline, solo se la lista mostrata è l'istantanea salvata.
3. Riga d'errore d'azione, solo dopo un fallimento di risposta a un controllo.
4. Riga di spiegazione della vista attiva (cambia con la tab).
5. Elenco delle **schede di sezione**, una per area con almeno una voce o un controllo.
   Ogni scheda: intestazione con quadratino 10 px del colore area + nome area in mono
   maiuscolo, contatore a destra; griglia di tessere a 2 colonne (la prima non spuntata
   è "protagonista": occupa 2 colonne, fondo pieno nel colore area, nome 25 px); sotto le
   tessere, le eventuali righe di controllo dell'area.
6. `SelettoreTab`: due blocchi `BASE` e `TOP-UP` (quello attivo è largo `flex:1`, fondo
   ink, etichetta sans 17/800 bianca + contatore; quello spento è largo 96 px, fondo
   `rgba(20,22,58,0.05)`, etichetta mono 10 `--sec` + solo il numero).
7. Tasto primario `HAI PRESO TUTTO`, solo a lista davvero finita.
8. Tab bar.

**Ordinamento interno:** dentro ogni area le voci non spuntate vanno prima delle
spuntate (`ordinaPerCarrello`), conservando l'ordine di generazione dentro i due gruppi.

**Elementi interattivi:**

| Elemento | Etichetta esatta / aria-label | Cosa fa al tap | Dove porta o cosa cambia | Conferma? | Stato disabilitato |
|---|---|---|---|---|---|
| Marchio in testata | `aria-label="Vai alla lista"` | naviga | `/lista` | no | mai |
| Ingranaggio | `aria-label="Impostazioni"` | naviga | `/impostazioni` | no | mai |
| Tessera (tutta) | `aria-label="{nome}: da prendere, tocca per segnare presa"` / `"{nome}: presa, tocca per rimetterla da prendere"`, `aria-pressed={spuntato}` | inverte la spunta | stato locale subito + coda offline, poi scrittura server; la voce si riordina in fondo al gruppo dell'area | no (reversibile col gesto inverso) | mai |
| Pillola `SÌ` (riga di controllo) | `SÌ`, `aria-label="Sì, hai ancora {nome}"` | registra "ce l'ho" | la riga di controllo sparisce dalla schermata | no | mentre una risposta su **quella** riga è in volo (`disabled`, opacità 0,5) |
| Pillola `NO` (riga di controllo) | `NO`, `aria-label="No, comprane una confezione di {nome}"` | trasforma il controllo in voce d'acquisto | ricarica la lista dal server per avere formato e confezioni veri | no | come sopra |
| Blocco `BASE` | `BASE`, `aria-label="Base, {n} da prendere"` | cambia vista | mostra le sezioni della lista base + cambia la riga di spiegazione | no | mai |
| Blocco `TOP-UP` | `TOP-UP`, `aria-label="Top-up, {n} da prendere"` | cambia vista | idem sul top-up | no | mai |
| Tasto primario finale | `HAI PRESO TUTTO` | naviga | `/lista/fatta` | no | **non esiste** finché non è tutto fatto: compare solo se c'è almeno una voce, ogni voce è spuntata e non resta nessun controllo in sospeso (base e top-up insieme) |
| Tasto dello stato vuoto (senza piatti) | `COMINCIA DAI PIATTI` | naviga | `/piatti` | no | mai |
| Tasto dello stato vuoto (con piatti) | `VAI ALLA SETTIMANA` | naviga | `/settimana` | no | mai |
| Tab bar | `LISTA` `SETTIMANA` `PIATTI` `DISPENSA` | naviga | `/lista` `/settimana` `/piatti` `/dispensa` | no | mai |

ELEMENTO TOLTO (20/09, guscio comune): Marchio in testata con il link "Vai alla lista" — il Marchio vive nella tab bar come icona della Lista.
ELEMENTO NUOVO (20/09, guscio comune): Menù utente — tondo con l'iniziale, aria-label="Impostazioni", porta a /impostazioni; sostituisce l'ingranaggio.

**Stati della schermata:**
- **Caricamento:** solo la Testata con titolo `Spesa`, marchio pieno, nessuna pillola,
  nessun corpo (commento nel codice: «Nessuno stato di caricamento nell'artboard»).
- **Errore di caricamento** (e nessuna istantanea offline utilizzabile): Testata + un
  solo paragrafo, `Non riusciamo a caricare la lista. Riprova più tardi.`
- **Vuoto A — settimana o lista assente, repertorio vuoto:** scheda centrata
  verticalmente, quadrato 46 px raggio 14 bordo 2 px tratteggiato con icona "lista"
  dentro, titolo `Prima servono i piatti`, testo `La lista nasce dai piatti che mangi:
  dicci quali sono e da lì la settimana e la spesa si costruiscono da sole.`, tasto
  primario `COMINCIA DAI PIATTI`.
- **Vuoto B — settimana o lista assente, repertorio non vuoto:** stessa scheda, titolo
  `La lista non c'è ancora`, testo `Nasce dalla settimana: appena confermi quali pasti
  farai a casa, qui trovi cosa comprare e quante confezioni.`, tasto primario
  `VAI ALLA SETTIMANA`. Nel caso "lista assente ma settimana presente" la pillola
  settimana c'è; nel caso "settimana assente" no.
- **Vista senza righe** (es. la lista base della seconda settimana del ciclo, quando il
  residuo copre tutto): la schermata resta com'è e al posto delle schede compare, centrato,
  `Niente da comprare qui.`
- **Offline:** la lista mostrata è l'istantanea dell'ultima apertura con rete, con sopra
  la riga `Sei offline: questa è la lista di {31 AGO — 6 SET} salvata l'ultima volta che
  l'hai aperta. Le spunte si sincronizzano appena torna la rete.` La riga sparisce alla
  prima rilettura riuscita. Le spunte restano possibili (vanno in coda).
- **Errore d'azione (risposta al controllo):** `Non siamo riusciti a salvare la risposta.
  Riprova.` — oppure, se la risposta è stata salvata ma la ricarica no: `Risposta salvata,
  ma non siamo riusciti a ricaricare la lista. Ricarica la pagina.`
- **Varianti di tab:** `BASE` e `TOP-UP` sono due liste distinte con sezioni proprie; la
  tab attiva mostra `{n} DA PRENDERE`, quella spenta solo il numero.

**Testi fissi:**
- Spiegazione tab BASE: `La spesa grossa, una volta a settimana: quello che si conserva.`
- Spiegazione tab TOP-UP: `Il fresco, e quello che si aggiunge strada facendo se il piano cambia.`
- Contatore di sezione: `{n} VOCI`, e `{n} VOCE` al singolare — conta **solo** le voci,
  non i controlli.
- Contatore sulla tab attiva: `{n} DA PRENDERE`; sulla tab spenta: `{n}`.
- Dentro la tessera: pillola confezioni `{n} conf` (o `{n} pz` se l'unità è `pz`),
  quantità `{quantitaTotale} {unità}`, e solo sulle voci porzionabili **accese** il
  sottotitolo `serve {X} {unità} · in casa {Y} {unità}` (valori arrotondati all'intero).
- Riga di controllo: titolo `{nome}: ne hai ancora?` e sotto, fisso,
  `CONTROLLO OGNI 90 GIORNI · SCADUTO`.

**Componenti del design system usati:** Testata (con pillola settimana), Marchio, Tab bar,
Tessera, Riga di controllo, Pillole d'azione (SÌ/NO), Etichetta di sezione (+ quadratino
d'area + contatore), Scheda, Stato vuoto, Tasti (primario), Messaggi (riga di stato
offline, errore). **Non** usa il Segmento a blocco: `SelettoreTab` è una forma propria
(due blocchi asimmetrici, uno largo e uno da 96 px), non un segmento a `flex:1`.

**Dati mostrati e provenienza:** tutto da `shopping_list_item` sul server, **congelato**
alla generazione (`generaListe` alla conferma della settimana): nome, area, unità,
fabbisogno, residuo, confezioni, quantità totale, spuntato, origine
(`piano` / `controllo` / `manuale`), `mostraDettaglio`. La pillola settimana viene dalla
settimana corrente. Le spunte sono dell'utente (coda locale + server). L'istantanea
offline è in local storage, legata a id casa e id account. A ogni apertura la pagina
chiama `allineaTopUp`: se il piano è cambiato dopo la generazione, i mancanti entrano
nel **top-up** (non si rigenera nulla).

**Note per il redesign (fatti dal codice):**
- **La tessera intera è l'interruttore**: nessuna checkbox, nessuno switch. Accesa =
  da prendere (bianca, bordo colore area, ombra minima); protagonista = fondo pieno nel
  colore area; spenta = fondo `rgba(20,22,58,0.035)`, bordo trasparente, nome barrato.
- **La lista nasce alla conferma della settimana e non si rigenera**: questa schermata
  legge e spunta, non calcola. L'unica cosa che può aggiungere righe è `allineaTopUp`.
- La prima tessera di ogni area diventa "protagonista" **solo se non è spuntata**: appena
  la spunti, il posto d'onore passa alla successiva da prendere.
- Un controllo **non si spunta, si risponde**: finché un controllo è aperto la spesa non
  è finita e `HAI PRESO TUTTO` non compare; nel marchio quell'area resta contornata.
- `HAI PRESO TUTTO` guarda base **e** top-up insieme, non solo la tab visibile.
- L'altezza minima della tessera è 104 px; la griglia è sempre a 2 colonne.

---

## 2. Hai preso tutto — `/lista/fatta`

**File:** `src/app/(app)/lista/fatta/page.tsx` (usa `src/components/Testata.tsx`).

**Scopo:** il traguardo della spesa e l'unico punto in cui la spesa si chiude — il tap
che trasforma il residuo previsto in residuo reale. Si usa una volta, appena finita la
spesa in negozio.

**Come ci si arriva:** solo dal tasto `HAI PRESO TUTTO` in `/lista` (o da un link
diretto, che però viene verificato di nuovo). Redirect: se non c'è settimana corrente →
`/lista`; se la settimana è già `chiusa` → `/settimana`; se la lista non esiste o non è
tutta spuntata → `/lista`. Ci si torna anche da `TORNA A HAI PRESO TUTTO` in Confezioni.

**Testata:** `Testata` completa. Titolo **`Spesa`**. Pillola settimana **sì** (stesso
formato `31 AGO — 6 SET`), assente durante caricamento ed errore. Marchio **sì**, ma
sempre **tutto pieno** (`aree={[]}`). Ingranaggio **sì**.

**Struttura dall'alto in basso:**
1. Testata + pillola settimana.
2. Corpo centrato verticalmente:
   1. **Scheda del traguardo**: griglia 3×2 di sei quadrati 22 px pieni nei colori delle
      aree (ordine marchio), titolo `Hai preso tutto`, testo con i conteggi.
   2. **Scheda `NON RICOMPRATO QUESTA SETTIMANA`** (fondo `rgba(20,22,58,0.045)`),
      presente solo se ci sono righe di risparmio per la settimana.
   3. **Scheda `CHIUDENDO LA SPESA`** (stesso fondo), sempre presente.
3. Eventuale riga d'errore di chiusura.
4. In fondo, in colonna: link testuale sottolineato, tasto primario, tasto secondario.
5. Tab bar (voce `LISTA` attiva).

**Elementi interattivi:**

| Elemento | Etichetta esatta / aria-label | Cosa fa al tap | Dove porta o cosa cambia | Conferma? | Stato disabilitato |
|---|---|---|---|---|---|
| Marchio in testata | `aria-label="Vai alla lista"` | naviga | `/lista` | no | mai |
| Ingranaggio | `aria-label="Impostazioni"` | naviga | `/impostazioni` | no | mai |
| Link mono sottolineato | `CONFEZIONI DIVERSE? SCANSIONA` | naviga | `/lista/confezioni` | no | mai |
| Tasto primario | `CHIUDI LA SPESA` | chiude la spesa sul server (registra acquisti e accredita il residuo) | poi naviga a `/settimana` | **no dialogo**: un solo tap | mentre la chiusura è in volo (`disabled`, opacità 0,7) |
| Tasto secondario | `TORNA ALLA LISTA` | naviga | `/lista` | no | mai |
| Tab bar | `LISTA` `SETTIMANA` `PIATTI` `DISPENSA` | naviga | — | no | mai |

ELEMENTO TOLTO (20/09, guscio comune): Marchio in testata con il link "Vai alla lista" — il Marchio vive nella tab bar come icona della Lista.
ELEMENTO NUOVO (20/09, guscio comune): Menù utente — tondo con l'iniziale, aria-label="Impostazioni", porta a /impostazioni; sostituisce l'ingranaggio.

**Stati della schermata:**
- **Caricamento:** solo Testata (titolo `Spesa`, nessuna pillola), corpo vuoto.
- **Errore di caricamento:** Testata + `Non riusciamo a caricare la spesa. Riprova più tardi.`
- **Errore di chiusura:** riga sopra i tasti, `Non siamo riusciti a chiudere la spesa. Riprova.`
  (il tasto torna attivo e si può ritentare).
- **Variante "senza risparmio":** la scheda `NON RICOMPRATO QUESTA SETTIMANA` non c'è
  affatto (settimana senza piano, o lettura fallita — il contatore è un di più e non
  blocca la chiusura).
- **Variante "risparmio a zero confezioni":** la scheda c'è con la riga principale
  `Niente, questa settimana: il residuo si costruisce spesa dopo spesa` e nessuna riga
  secondaria.
- Non esistono stato vuoto né stato offline: la schermata è raggiungibile solo a lista
  completa e verificata contro il server.

**Testi fissi:**
- Titolo scheda: `Hai preso tutto`.
- Testo scheda (con i numeri reali): `{N} voci su {N}, 6 aree finite. Il marchio in alto
  è tutto pieno: ogni area è a posto, non ti manca niente.` (il "6" è
  `ORDINE_MARCHIO.length`, cioè sempre 6).
- Etichetta scheda: `NON RICOMPRATO QUESTA SETTIMANA`. Riga principale = segmenti uniti
  da ` · ` nell'ordine: confezioni (`1 confezione` / `{n} confezioni`), quantità
  (`{n} g` / `{n} ml` / `{n} pz`, e da 1000 in su `{n,n} kg` / `{n,n} l` con virgola
  decimale, ordine fisso g · ml · pz), euro (`circa {n} €`, oppure `meno di 1 €` sotto
  l'unità). Riga secondaria, alternativa: `metti un prezzo agli ingredienti per vederlo
  in euro` (nessun ingrediente evitato ha prezzo) oppure `su {n} ingredienti con prezzo`
  (solo alcuni ce l'hanno). Con zero confezioni: la riga principale è
  `Niente, questa settimana: il residuo si costruisce spesa dopo spesa`.
- Etichetta scheda: `CHIUDENDO LA SPESA`; testo: `L'app registra cosa hai comprato e
  quando. Serve solo a ricordarti fra 90 giorni che l'olio sta per finire: non lo vedi da
  nessuna parte finché non serve.`

**Componenti del design system usati:** Testata (con pillola settimana), Marchio, Scheda
(traguardo, `padding 26px 20px`), due schede-nota a fondo `rgba(20,22,58,0.045)` raggio 20,
Etichetta di sezione (le due mono 9/700/0.12em), Tasti (primario `CHIUDI LA SPESA`;
secondario `TORNA ALLA LISTA`, qui reso con bordo 1,5 px e altezza 52, non 54),
Messaggi (errore), Tab bar.

**Dati mostrati e provenienza:** conteggio voci dalla lista congelata sul server
(ricontato qui, non fidandosi della Lista); il "non ricomprato" da `risparmio_settimana`,
fissato **alla generazione** della lista (non si aggiorna se il piano cambia dopo); i
prezzi sono quelli messi a mano dall'utente sugli ingredienti, e senza prezzo l'euro non
compare mai.

**Note per il redesign:**
- Il marchio in testata qui è **sempre tutto pieno** per costruzione, ed è parte del
  messaggio (il testo della scheda lo cita esplicitamente): la griglia 3×2 di
  quadrati nella scheda è una seconda rappresentazione dello stesso marchio, in grande.
- `CHIUDI LA SPESA` è irreversibile e **non** ha dialogo di conferma: il codice ne
  protegge l'idempotenza con i redirect (spesa già chiusa → `/settimana`), non con un
  "sei sicuro?".
- Lo scan delle confezioni vere va **prima** della chiusura: dopo, la correzione non
  avrebbe più effetto. Per questo il link sta sopra il tasto primario.

---

## 3. Confezioni diverse — `/lista/confezioni`

**File:** `src/app/(app)/lista/confezioni/page.tsx`; `src/components/Scanner.tsx`.

**Scopo:** prima di chiudere la spesa, scansionare il codice a barre di quello che si è
comprato davvero, per sostituire il formato che l'app assumeva e correggere il numero di
confezioni. Si usa una volta per spesa, subito dopo il negozio.

**Come ci si arriva:** solo dal link `CONFEZIONI DIVERSE? SCANSIONA` in `/lista/fatta`.
Redirect: nessuna settimana → `/lista`; settimana `chiusa` → `/settimana`; lista assente
o non tutta spuntata → `/lista`. Anche un errore "spesa già chiusa" durante la scrittura
manda a `/settimana`; una sessione scaduta manda a `/entra`.

**Testata:** **non** usa `Testata`: header ridotto (`padding 18px 16px 6px`) con freccia
indietro 23 px a sinistra (`aria-label="Torna a Hai preso tutto"` → `/lista/fatta`),
etichetta centrale mono 10/700/0.16em `--sec` **`CONFEZIONI`**, e uno spaziatore 44×44 a
destra per tenerla centrata. Nessun marchio, nessuna pillola settimana, nessun ingranaggio.

**Struttura dall'alto in basso:**
1. Header ridotto (freccia · `CONFEZIONI` · spaziatore).
2. Titolo `Le confezioni vere` (21/800) + sottotitolo esplicativo.
3. Eventuale scheda "niente da scansionare".
4. Una **scheda per voce comprata** porzionabile: riga alta con nome + `{confezioni} × {formato} {unità}`
   (e ` · AGGIORNATO` dopo una scrittura che ha cambiato qualcosa) e a destra la pillola
   `SCANSIONA`; sotto, quando la voce è aperta, lo Scanner o il **riquadro d'esito**
   (fondo `rgba(20,22,58,0.045)`, raggio 16).
5. In fondo, tasto secondario a piena larghezza `TORNA A HAI PRESO TUTTO`.
6. Tab bar (voce `LISTA` attiva).

**Lo Scanner** (dentro la scheda, non è un foglio): video della fotocamera posteriore a
piena larghezza raggio 14 su fondo nero (solo se il browser ha `BarcodeDetector` e
concede la camera); sempre, sotto, un form con campo `Scrivi il codice` (mono, solo
cifre, max 14) + tasto `CERCA`; sotto ancora, pillola `ANNULLA`. Legge un frame ogni
250 ms e al primo codice valido (8–14 cifre) ferma tutto e lo restituisce alla pagina.
Lo Scanner **non parla con la rete**: è la pagina a chiamare `/api/prodotto/{ean}`.

**Elementi interattivi:**

| Elemento | Etichetta esatta / aria-label | Cosa fa al tap | Dove porta o cosa cambia | Conferma? | Stato disabilitato |
|---|---|---|---|---|---|
| Freccia indietro | `aria-label="Torna a Hai preso tutto"` | naviga | `/lista/fatta` | no | mai |
| Pillola sulla scheda voce | `SCANSIONA` | apre lo Scanner dentro quella scheda | la pillola scompare finché la voce è aperta; azzera campo manuale, campo confezioni ed errore | no | non renderizzata mentre la voce è aperta |
| Campo codice (Scanner) | `aria-label="Scrivi il codice"`, placeholder `Scrivi il codice` | digitazione | filtra i non-numerici, max 14 cifre | no | mai |
| Tasto del form (Scanner) | `CERCA` | invia il codice alla pagina | interroga il catalogo | no | se il codice non è valido (`disabled`, opacità 0,45) |
| Pillola (Scanner) | `ANNULLA` | chiude lo Scanner | la scheda torna alla riga con `SCANSIONA` | no | mai |
| Campo formato a mano | `aria-label="Formato a mano"`, placeholder = il formato attuale | digitazione | ricalcola le confezioni proposte e **azzera** il campo confezioni | no | mai |
| Campo confezioni | `aria-label="Confezioni comprate"` | digitazione | valore da scrivere (0…1000) | no | mai |
| Tasto scuro nel riquadro | `AGGIORNA` | scrive formato + confezioni comprate | aggiorna l'ingrediente (settimane future) e le righe congelate di questa settimana; la scheda si chiude e segna ` · AGGIORNATO` | no | se la scrittura di quella voce è in volo, o se formato/confezioni non sono validi (opacità 0,45) |
| Tasto chiaro nel riquadro | `LASCIA` | chiude il riquadro senza scrivere | nulla cambia | no | mai |
| Tasto scuro nel riquadro | `RIPROVA` | ritenta la memorizzazione del codice | — | no | mentre la scrittura di quella voce è in volo |
| Tasto chiaro nel riquadro | `CHIUDI` | chiude il riquadro | nulla cambia | no | mai |
| Tasto secondario finale | `TORNA A HAI PRESO TUTTO` | naviga | `/lista/fatta` | no | mai |
| Tab bar | `LISTA` `SETTIMANA` `PIATTI` `DISPENSA` | naviga | — | no | mai |

**Stati della schermata:**
- **Caricamento:** solo l'header ridotto (freccia + `CONFEZIONI`), corpo vuoto.
- **Errore di caricamento:** header + `Non riusciamo a caricare le confezioni. Riprova più tardi.`
- **Vuoto:** titolo e sottotitolo restano, e al posto delle schede una nota a fondo
  grigio: `Niente da scansionare: le voci comprate sono tutte a pezzo o a stima.`
- **Esiti del riquadro, uno per volta, con la condizione esatta:**
  - `cerco` → `Cerco nel catalogo…` (nessun tasto).
  - `unita-diversa` (il catalogo dà un'unità diversa da quella dell'ingrediente) →
    `Unità diversa ({unitàCatalogo} contro {unitàVoce}): non aggiorno. Correggi il
    formato a mano se serve.` + `CHIUDI`.
  - `confermo` (il formato del catalogo è identico a quello in lista) →
    `Formato {n} {unità}, come in lista. Memorizzo il codice…` + `CHIUDI`; se la
    scrittura fallisce, al posto del testo compare l'errore e appare `RIPROVA` accanto a
    `CHIUDI`.
  - `confermato` (codice memorizzato) → `Formato confermato: {n} {unità}.` + `CHIUDI`.
  - `proposta` (formato diverso) → riga in grassetto `{marca} · {nome} · {n} {unità}`
    (i segmenti vuoti si omettono), poi `La confezione è {nuovo} {unità}, nel formato
    avevi {vecchio} {unità}. Aggiorno per questa settimana e per le prossime?`, poi la
    domanda sulle confezioni, poi `AGGIORNA` + `LASCIA`.
  - `manuale`, due messaggi possibili: `Prodotto non trovato: puoi scrivere il formato a
    mano.` (catalogo raggiunto, prodotto assente o senza quantità) oppure `Non riusciamo
    a interrogare il catalogo. Riprova, o scrivi il formato a mano.` (catalogo non
    raggiungibile); se il catalogo conosce marca/nome, la riga in grassetto `{marca} · {nome}`;
    poi campo formato + unità, e — solo con un formato valido — la domanda sulle
    confezioni; poi `AGGIORNA` + `LASCIA`.
- **Errore di scrittura** (in ogni esito che scrive): `Non siamo riusciti ad aggiornare.
  Riprova.`
- **Scanner senza fotocamera** (nessun `BarcodeDetector`, o camera negata/assente):
  niente video, e al suo posto `La fotocamera non è disponibile: scrivi il codice sotto
  il codice a barre.` Il campo codice c'è **sempre**, anche sotto il video.
- Nessuno stato offline previsto: la schermata dipende dal catalogo in rete.

**Testi fissi:**
- Titolo: `Le confezioni vere`.
- Sottotitolo: `Scansiona quello che hai comprato: se la confezione è diversa dal formato
  che l'app assume, il residuo si corregge da solo.`
- Riga metadati della voce: `{confezioni} × {formato} {unità}` (mono, quantità esatta —
  `1250 g`, mai `1,3 kg`), con suffisso ` · AGGIORNATO` dopo una scrittura che ha
  cambiato formato o confezioni.
- Domanda sulle confezioni: `Con confezioni da {n} {unità} ne bastano {m} (la lista ne
  chiedeva {k}). Quante ne hai comprate?`; accanto al campo, l'etichetta `confezioni`.
- Accanto al campo formato a mano, l'unità dell'ingrediente (`g` / `ml` / `pz`).

**Componenti del design system usati:** header "indietro" ridotto (variante locale, non
`Testata` in modalità `indietro`), Etichetta di sezione (`CONFEZIONI`), Titolo di scheda o
stato vuoto (`Le confezioni vere`), Scheda (una per voce, raggio 20), Riquadro-nota
(fondo `rgba(20,22,58,0.045)` raggio 16), Campo di testo (numerico 96 px e a piena
larghezza), Pillole d'azione (`SCANSIONA`, `AGGIORNA`, `LASCIA`, `RIPROVA`, `CHIUDI`,
`ANNULLA` — tutte alte 40 e raggio 999, non i tasti da 54), Tasti (secondario finale,
altezza 52), Messaggi (errore), Tab bar.

**Dati mostrati e provenienza:** le voci sono le righe comprate della settimana
(`leggiVociComprate`), filtrate a `classeResiduo === 'porzionabile'`; fabbisogno, residuo,
confezioni, formato e `quantitaTotale` sono **congelati nella riga di lista**. Marca, nome
e quantità della confezione arrivano dal catalogo via `GET /api/prodotto/{ean}`. Il numero
proposto di confezioni è ricalcolato in locale con la stessa aritmetica della lista
(`ceil(daComprare / formato)`).

**Note per il redesign:**
- Una voce alla volta: aprire lo Scanner su un'altra voce chiude quella aperta, e una
  risposta in ritardo del catalogo viene scartata se la voce non è più quella aperta.
- Le voci `intero` (si contano) e `stima` (non hanno formato) **non compaiono affatto**.
- La correzione tocca **tutte** le righe dello stesso ingrediente (una voce può stare in
  base e in top-up): le confezioni vanno sulla prima, 0 sulle altre.
- `AGGIORNA` è un'azione che scrive e non ha dialogo: il feedback è l'etichetta
  ` · AGGIORNATO` sulla riga, e `Formato confermato` compare solo **dopo** la scrittura
  riuscita.

---

## 4. Settimana — `/settimana`

> Dal 20/09 la route è `/piano` e la schermata si chiama Piano (fase 1 del redesign); il corpo descritto qui è ancora quello attuale.

**File:** `src/app/(app)/settimana/page.tsx`; `src/components/RigaPasto.tsx`,
`src/components/StrisciaGiorni.tsx`, `src/components/FoglioAzioniPasto.tsx`,
`src/components/Testata.tsx`.

**Scopo:** dire se si è a casa pasto per pasto, vedere cosa si mangia, correggere le
eccezioni già avvenute, dichiarare il meal prep — e, a fine giro, confermare la settimana
per far nascere la lista. Si usa il lunedì (o il giorno della spesa) e poi a spizzichi
tutti i giorni.

**Come ci si arriva:** tab bar (`SETTIMANA`); da `VAI ALLA SETTIMANA` nello stato vuoto
della Lista; dopo `CHIUDI LA SPESA`; per redirect da `/lista/fatta` e `/lista/confezioni`
quando la settimana è già chiusa; da `ANNULLA` e dopo `SOSTITUISCI` in Scegli.

**Testata:** `Testata` completa. Titolo **`Settimana`**. Pillola settimana **no** (questa
schermata non la passa). Marchio **sì**, sempre **tutto pieno** (`aree={[]}`).
Ingranaggio **sì**.

**Struttura dall'alto in basso:**
1. Testata (marchio + `Settimana` + ingranaggio).
2. Link mono centrato di cambio vista: `‹ SETTIMANA SCORSA` oppure `SETTIMANA CORRENTE ›`.
3. **Striscia dei giorni**: sette riquadri `flex:1`, raggio 14, gap 3. Dentro ognuno:
   sigla mono (`LUN MAR MER GIO VEN SAB DOM`), numero del giorno 15/800, e una fila di
   pallini 5 px — **uno per pasto configurato** (da 3 a 5, non quattro fissi), pieno se
   quel pasto è a casa e ha un piatto. Il giorno selezionato ha fondo ink; **oggi** ha il
   bordo 3 px ink dentro il riquadro, indipendentemente dalla selezione.
4. Riga di navigazione del giorno: freccia tonda 36 px a sinistra, nome giorno + numero
   (21/800, es. `Venerdì 28`), freccia tonda a destra.
5. Eventuale riga d'errore di check-in.
6. Eventuale scheda "nessun piatto ancora" (solo vista corrente, repertorio vuoto).
7. **Righe pasto** del giorno selezionato, in colonna gap 9, nell'ordine `posizione`
   degli `slotDefs`.
8. Solo nella vista corrente: contatore `{n} PASTI A CASA IN SETTIMANA`, eventuale errore
   di conferma, e il tasto primario `CONFERMA E CREA LA LISTA` / `VAI ALLA LISTA`.
9. Tab bar (voce `SETTIMANA` attiva).
10. Sovrapposto, quando aperto: il **Foglio dal basso** delle azioni del pasto.

**Anatomia della riga pasto** (tre zone, larghezze non negoziabili):
casetta **60 px** a sinistra (icona casa 23 px: piena `#14163A` a casa, bianca con
contorno `#BFBFC9` 1,3 px fuori) = toggle casa/fuori con `aria-pressed`; **corpo**
centrale = apre il piatto, con etichetta pasto mono 9 maiuscola, nome piatto 17,5/700
(barrato a riga spenta), eventuale sottotitolo mono 9, eventuali righe d'avviso scadenza
(sans 12/600 `--ink-2`, solo a riga accesa, vanno a capo), e i pallini 8 px delle aree del
piatto; **destra 44 px** = kebab (tre punti `#C4C4CE`) **oppure** chevron `#C4C4CE`.

**Elementi interattivi:**

| Elemento | Etichetta esatta / aria-label | Cosa fa al tap | Dove porta o cosa cambia | Conferma? | Stato disabilitato |
|---|---|---|---|---|---|
| Marchio in testata | `aria-label="Vai alla lista"` | naviga | `/lista` | no | mai |
| Ingranaggio | `aria-label="Impostazioni"` | naviga | `/impostazioni` | no | mai |
| Link cambio vista | `‹ SETTIMANA SCORSA` (in corrente) / `SETTIMANA CORRENTE ›` (in precedente) | cambia vista | ricarica tutto; in precedente seleziona la domenica, in corrente il giorno di oggi | no | mai |
| Riquadro del giorno | `aria-label="Venerdì 28"`, o `"Venerdì 28, selezionato"`; `aria-pressed` | seleziona il giorno | cambia le righe pasto sotto (con `.anim-giorno`) | no | mai |
| Freccia tonda sinistra | `aria-label="Giorno precedente"` | giorno −1 ciclico | idem | no | mai |
| Freccia tonda destra | `aria-label="Giorno successivo"` | giorno +1 ciclico | idem | no | mai |
| Casetta (60 px) | `aria-label="{Pasto}: a casa, tocca per segnare fuori"` / `"{Pasto}: fuori casa, tocca per segnare a casa"`; `aria-pressed` | alterna `casa` ⇄ `fuori` | scrittura ottimistica sullo slot; in caso d'errore torna indietro e compare l'errore di check-in | no (reversibile) | mai |
| Corpo della riga | `aria-label="Apri {piatto}"` | apre il dettaglio del piatto | `/piatti/{id}` | no | `disabled` quando lo slot non ha piatto (nessun `aria-label`) |
| Zona destra — chevron | `aria-label="Scegli il piatto per {Pasto}"` | naviga | `/settimana/{data}/{slotDefId}/scegli` | no | — (compare solo a settimana **bozza**) |
| Zona destra — kebab | `aria-label="Azioni per {Pasto}"` | apre il foglio dal basso | — | no | — (compare solo a settimana **confermata o chiusa**) |
| Link nella scheda vuota | `COMINCIA DAI PIATTI ›` | naviga | `/piatti` | no | mai |
| Tasto primario | `CONFERMA E CREA LA LISTA` (settimana bozza) / `VAI ALLA LISTA` (già confermata o chiusa) | in bozza: conferma la settimana **e genera le liste**, poi naviga; altrimenti naviga e basta | `/lista` | **no dialogo** | mentre la conferma è in volo (`disabled`, opacità 0,7). Assente del tutto nella vista "settimana scorsa" |
| Tab bar | `LISTA` `SETTIMANA` `PIATTI` `DISPENSA` | naviga | — | no | mai |
| Overlay del foglio | — (il `div role="dialog"`) | chiude il foglio | — | no | mai |
| Foglio · `Saltato` | `Saltato` | segna lo slot `saltato` | gli ingredienti rientrano subito nel residuo; il foglio si chiude | no | — |
| Foglio · `Ho mangiato fuori piano` | `Ho mangiato fuori piano` | segna lo slot `sostituito` | idem | no | — |
| Foglio · `Ho mangiato un altro piatto` | `Ho mangiato un altro piatto` | naviga | `/settimana/{data}/{slotDefId}/scegli` | no | — |
| Foglio · `Cucinato ma non mangiato` | `Cucinato ma non mangiato` | segna `saltato` **e** aggiunge +1 porzione preparata | la porzione finisce nei Pronti | no | — |
| Foglio · `Torna al piano` | `Torna al piano` | riporta lo slot a `casa` e `daPronti = false` | — | no | — |
| Foglio · `Cambia piatto` | `Cambia piatto` | naviga | `/settimana/{data}/{slotDefId}/scegli` | no | — |
| Foglio · `Non uso la porzione pronta` | `Non uso la porzione pronta` | `daPronti = false` | il lotto torna disponibile | no | — |
| Foglio · usa pronta | `Uso una porzione pronta ({n} pronta)` / `… ({n} pronte)` | `daPronti = true` e stato `casa` | il pasto non consuma ingredienti crudi | no | — |
| Foglio · `Ne preparo di più` | `Ne preparo di più` | apre/chiude lo stepper **dentro** il foglio | — | no | mai |
| Stepper · meno | `aria-label="Togli una porzione"`, etichetta `−` | n − 1, minimo 0 | solo stato locale del foglio | no | mai (si ferma a 0) |
| Stepper · più | `aria-label="Aggiungi una porzione"`, etichetta `+` | n + 1, massimo 6 | idem | no | mai (si ferma a 6) |
| Stepper · frigo | `Frigo`, `aria-pressed={!congelato}` | sceglie frigo | opacità 0,45 su quello non scelto | no | mai |
| Stepper · freezer | `Freezer`, `aria-pressed={congelato}` | sceglie freezer | idem | no | mai |
| Stepper · salva | `Salva`, `aria-label="Salva porzioni"` | scrive porzioni preparate + destinazione | chiude il foglio, ricarica i Pronti | no | mai |

ELEMENTO TOLTO (20/09, guscio comune): Marchio in testata con il link "Vai alla lista" — il Marchio vive nella tab bar come icona della Lista.
ELEMENTO NUOVO (20/09, guscio comune): Menù utente — tondo con l'iniziale, aria-label="Impostazioni", porta a /impostazioni; sostituisce l'ingranaggio.

**Il foglio dal basso — TUTTE le voci e la condizione esatta in cui compaiono**
(`FoglioAzioniPasto.tsx`; `role="dialog"`, `aria-label="Com'è andata: {Pasto}"` per i
giorni ≤ oggi, `"Prossimamente: {Pasto}"` per i futuri; overlay `rgba(20,22,58,0.35)`,
foglio bianco `22px 22px 0 0`, `padding 16px 16px 26px`, voci alte min 50, raggio 15,
fondo `rgba(20,22,58,0.04)`, sans 15,5/700):

| Voce (testo esatto) | Condizione |
|---|---|
| Separatore `COM'È ANDATA — {PASTO}` | giorno del pasto ≤ oggi |
| Separatore `PROSSIMAMENTE — {PASTO}` | giorno del pasto > oggi |
| `Saltato` | solo pasto passato (≤ oggi) |
| `Ho mangiato fuori piano` | solo pasto passato |
| `Ho mangiato un altro piatto` | solo pasto passato — è un link a Scegli |
| `Cucinato ma non mangiato` | pasto passato **e** slot a `casa` **e** slot con un piatto assegnato |
| `Torna al piano` | pasto passato **e** slot già `saltato` o `sostituito` |
| `Cambia piatto` | solo pasto futuro (> oggi) — è un link a Scegli |
| Separatore `MEAL PREP` | sempre, passato o futuro |
| `Non uso la porzione pronta` | lo slot è già coperto da una porzione pronta (`daPronti`) |
| `Uso una porzione pronta ({n} pronta)` / `({n} pronte)` | `daPronti` falso **e** porzioni utilizzabili di quel piatto > 0 (il numero è il conteggio reale; singolare `pronta` con 1) |
| `Ne preparo di più` | sempre |
| Stepper (`−` `{n}` `+` `Frigo` `Freezer` `Salva`) | solo dopo il tap su `Ne preparo di più` (parte dal valore già salvato sullo slot e dalla destinazione del lotto esistente) |

Non esiste una voce "Fatto": il default è "mangiato come da piano" e qui si registrano
solo le eccezioni.

**Stati della schermata:**
- **Caricamento:** solo Testata (`Settimana`), corpo vuoto.
- **Errore di caricamento:** Testata + `Non riusciamo a caricare la settimana. Riprova
  più tardi.`; nella vista "precedente" sotto compare anche il link `SETTIMANA CORRENTE ›`
  come via d'uscita (nella vista corrente no, e il selettore di vista non è renderizzato).
- **Vista "settimana scorsa" mai creata:** `Questa settimana non è mai stata creata: non
  c'è nulla da correggere.` + link `SETTIMANA CORRENTE ›`.
- **Repertorio vuoto (solo vista corrente):** scheda bianca con titolo `Nessun piatto
  ancora`, testo `Le righe si riempiono da sole appena ce n'è qualcuno.` e link
  `COMINCIA DAI PIATTI ›`. Le righe pasto restano, ma dicono `Nessun piatto assegnato`.
- **Errore di check-in:** `Non siamo riusciti a salvare il cambiamento. Riprova.` —
  riga in linea sopra le righe pasto, la schermata **non** viene sostituita (lo stato dello
  slot torna al valore precedente). Vale per tutte le azioni di slot: toggle, spunte,
  porzioni, uso/rientro della porzione pronta, cucinato-non-mangiato, torna al piano.
- **Errore di conferma:** `Non siamo riusciti a confermare la settimana. Riprova.`
- **Variante bozza:** zona destra della riga = chevron verso Scegli, foglio azioni **non
  disponibile**, tasto finale `CONFERMA E CREA LA LISTA`.
- **Variante confermata / chiusa:** zona destra = kebab che apre il foglio azioni, tasto
  finale `VAI ALLA LISTA` (non tocca il server).
- **Variante "settimana scorsa":** nessun contatore, nessun tasto finale, nessun avviso
  di scadenza (il passato non si avvisa), giorno preselezionato = domenica.
- Nessuno stato offline previsto (a differenza della Lista).

**Testi fissi:**
- Sigle dei giorni nella striscia: `LUN` `MAR` `MER` `GIO` `VEN` `SAB` `DOM`; titolo del
  giorno: `Lunedì`…`Domenica` + numero.
- Contatore: `{n} PASTI A CASA IN SETTIMANA` (mono 10/700/0.11em; conta gli slot `casa`
  **con** un piatto assegnato, su tutta la settimana, non sul giorno).
- Etichette della riga spenta, al posto del nome piatto: `Fuori casa`, `Saltato`,
  `Ho mangiato fuori piano`.
- Riga accesa senza piatto: `Nessun piatto assegnato`.
- Sottotitolo della riga (segmenti uniti da ` · `, in quest'ordine, solo a riga accesa):
  `Porzione pronta` se lo slot usa un pronto; la descrizione delle scelte dei componenti
  (nomi ingredienti uniti da ` + `, componenti uniti da ` · `); `+{n} porzione` /
  `+{n} porzioni`. A riga **spenta** resta solo `+{n} porzione/porzioni`.
- Avviso di scadenza sulla riga: `{Nome} in casa: scade {oggi|domani|venerdì|il 4 set},
  prima di questo pasto`.

**Componenti del design system usati:** Testata (senza pillola), Marchio, Striscia dei
giorni, Riga pasto, Foglio dal basso (+ stepper interno), Scheda (il vuoto "Nessun piatto
ancora"), Etichetta di sezione (contatore e separatori del foglio), Tasti (primario
finale), Messaggi (errori in linea), Tab bar.

**Dati mostrati e provenienza:** settimana e slot dal server (`meal_slot`: stato, piatto,
scelte, porzioni preparate, `daPronti`); nomi dei pasti dagli `slotDefs` dell'utente (da 3
a 5, ordinati per `posizione`); piatti e ingredienti dal repertorio; l'ordine dei pallini
d'area dall'ordine aree scelto dall'utente in Impostazioni; i Pronti dai lotti; gli avvisi
di scadenza sono calcolati in locale incrociando slot, piatti, ingredienti e **dispensa**
(lettura tollerante: se fallisce, nessun avviso e la schermata resta usabile). Al primo
accesso della settimana la settimana viene **creata dal sistema** già compilata (ogni pasto
a casa tranne le assenze abituali, piatti assegnati dal planner).

**Note per il redesign:**
- **Il tap sul corpo apre il piatto, la casetta è il toggle, la zona destra è la terza
  cosa**: tre bersagli in una riga, e la zona destra cambia funzione con lo stato della
  settimana (chevron in bozza → Scegli; kebab a settimana confermata/chiusa → foglio).
- `oggi` e `selezionato` sono **due stati indipendenti** nella striscia: il bordo 3 px di
  oggi resta anche quando il giorno selezionato è un altro.
- I pallini sotto ogni giorno sono tanti quanti i pasti configurati dall'utente, non
  quattro fissi.
- Confermare la settimana è l'atto che **genera** le liste: rifarlo cancellerebbe le
  spunte, e per questo a settimana non-bozza il tasto diventa una semplice navigazione.
- Le porzioni preparate restano visibili anche su una riga spenta (consumano comunque);
  le scelte e `Porzione pronta` no.
- Il foglio è `position: fixed; inset: 0; z-index: 50`: copre anche la tab bar.

---

## 5. Scegli — `/settimana/{data}/{slotDefId}/scegli`

**File:** `src/app/(app)/settimana/[data]/[slotDefId]/scegli/page.tsx`.

**Scopo:** sostituire il piatto di **un solo pasto di un solo giorno** (e ciclare le
opzioni dei suoi componenti), senza toccare il repertorio. Si usa quando il piano non
regge: un imprevisto, una voglia diversa, o la registrazione di "ho mangiato un altro
piatto" a pasto già passato.

**Come ci si arriva:** dal chevron della riga pasto (settimana bozza); dalle voci
`Cambia piatto` (futuro) e `Ho mangiato un altro piatto` (passato) del foglio azioni.
Torna sempre a `/settimana`.

**Testata:** **non** usa `Testata`. Header ridotto (`padding 18px 16px 6px`): freccia
indietro 23 px (`aria-label="Torna alla Settimana"` → `/settimana`), etichetta centrale
mono 10/700/0.16em `--sec` `GIOVEDÌ 4 · CENA` (giorno maiuscolo + numero · nome pasto
maiuscolo; solo il nome pasto se la data dell'URL non è interpretabile), spaziatore 44×44
a destra. Nessun marchio, nessuna pillola, nessun ingranaggio.

**Struttura dall'alto in basso:**
1. Header ridotto.
2. Titolo di dettaglio `Cosa mangi` (32/800).
3. Etichetta di sezione `DAL TUO REPERTORIO`.
4. Elenco delle **schede piatto** (una per piatto attivo di quello slot), gap 8, raggio 20:
   badge pillola `ORA IN PROGRAMMA` se è il piatto attualmente assegnato, nome 17/700,
   pallini 8 px delle aree + contatore `{n} INGR.`, e a destra il cerchio 24 px di
   selezione (pieno ink con spunta bianca se selezionato, altrimenti contorno 1,5 px).
5. Solo se il piatto selezionato ha componenti: una **scheda per componente** (nome
   componente in mono maiuscolo, opzione corrente in sans 14/600 `--sec`, eventuale
   badge `IN CASA`).
6. Eventuali righe di conflitto sul residuo.
7. Tasto tratteggiato a piena larghezza `CREA UN PIATTO NUOVO` (con icona +).
8. Nota esplicativa (cambia se qualcosa è stato modificato).
9. Eventuale errore di salvataggio.
10. In fondo, coppia di tasti: `ANNULLA` (104 px fissi) + `SOSTITUISCI` (`flex:1`).
11. Tab bar (voce `SETTIMANA` attiva).

**Elementi interattivi:**

| Elemento | Etichetta esatta / aria-label | Cosa fa al tap | Dove porta o cosa cambia | Conferma? | Stato disabilitato |
|---|---|---|---|---|---|
| Freccia indietro | `aria-label="Torna alla Settimana"` | naviga | `/settimana` | no | mai |
| Scheda piatto | `aria-pressed={selezionato}` (nessun aria-label: il nome è il contenuto) | seleziona il piatto | bordo a 1,5 px ink, cerchio pieno con spunta; ricalcola conflitti e nota; abilita `SOSTITUISCI` | no | mai |
| Scheda componente | `aria-label="Cambia {Componente}: ora {ingrediente + ingrediente}"` | **cicla** alla prossima opzione (con wrap-around) | scelta marcata `manuale` sullo slot al salvataggio; ricalcola `IN CASA` e conflitti | no | mai |
| Tasto tratteggiato | `CREA UN PIATTO NUOVO` | naviga | `/piatti/nuovo` | no | mai |
| Tasto sinistro in fondo | `ANNULLA` | naviga senza salvare | `/settimana` | no | mai (è un link) |
| Tasto destro in fondo | `SOSTITUISCI` | scrive `dishId` (+ scelte manuali) su quel solo slot | poi naviga a `/settimana` | **no dialogo** | quando nulla è cambiato rispetto al caricamento — reso nella variante "spento": fondo `rgba(20,22,58,0.10)`, testo `--ter`, nessuna ombra — e mentre il salvataggio è in volo (opacità 0,7) |
| Tab bar | `LISTA` `SETTIMANA` `PIATTI` `DISPENSA` | naviga | — | no | mai |

**Stati della schermata:**
- **Caricamento:** solo l'header ridotto con l'etichetta del giorno, corpo vuoto.
- **Errore "pasto inesistente"** (data/slot non trovati): header + `Non troviamo questo
  pasto.`
- **Errore di caricamento:** header + `Non riusciamo a caricare i piatti. Riprova più tardi.`
- **Errore di salvataggio:** `Non siamo riusciti a salvare la scelta. Riprova.` (sopra i
  tasti; `SOSTITUISCI` torna attivo).
- **Variante "niente toccato"**: nota `Tocca un piatto per sostituire {Pasto} di
  {giorno}. Vale solo per quel giorno, non cambia il piatto nel repertorio.`,
  `SOSTITUISCI` spento, nessuna riga di conflitto.
- **Variante "qualcosa cambiato"**: nota `Cambia solo {Pasto} di {giorno}. Gli altri
  giorni restano come sono. Se la lista è già fatta, quello che manca entra nel top-up
  quando la riapri.`, `SOSTITUISCI` acceso, eventuali righe di conflitto.
- **Vuoto (nessun piatto per quello slot):** l'elenco è semplicemente vuoto; restano
  titolo, etichetta `DAL TUO REPERTORIO`, il tratteggiato `CREA UN PIATTO NUOVO` e la
  nota. Non c'è una scheda di stato vuoto dedicata.
- Nessuno stato offline previsto.

**Testi fissi:**
- `Cosa mangi` · `DAL TUO REPERTORIO` · `ORA IN PROGRAMMA` · `{n} INGR.` · `IN CASA` ·
  `CREA UN PIATTO NUOVO` · `ANNULLA` · `SOSTITUISCI`.
- Riga di conflitto: `Con questo piatto {Nome} non basta: ne mancano {quantità}` più, solo
  se altri pasti resteranno senza, la coda `, e serve anche {giorno} ({Pasto})` — al massimo
  due pasti per esteso, poi `altri {N}`; virgole fra i primi e ` e ` prima dell'ultimo
  (`domani (Pranzo) e giovedì (Cena)`, `domani (Pranzo), giovedì (Cena) e altri 2`).
  Il giorno è `oggi` / `domani` / il nome del giorno entro sei giorni / `il 4 set`.

**Componenti del design system usati:** header "indietro" ridotto, Titolo di dettaglio
(32/800), Etichetta di sezione, Scheda (piatto e componente, raggio 20; selezionata =
bordo 1,5 px ink), Pillole (i badge `ORA IN PROGRAMMA` e `IN CASA` sono pillole mono 8 su
fondo ink), tratteggiato 1,5 px dello "aggiungi", Tasti (coppia in fondo: primario
`SOSTITUISCI` + un secondario/spento `ANNULLA` a fondo `rgba(20,22,58,0.05)`),
Messaggi (nota, conflitto, errore), Tab bar.

**Dati mostrati e provenienza:** i piatti sono quelli **attivi del solo `slotDefId`**
(il repertorio esclude già gli eliminati); le aree del piatto sono nell'ordine scelto
dall'utente; il badge `IN CASA` è calcolato in locale su **dispensa + residuo utilizzabile
+ formato confezione** (nessuna confezione nuova costerebbe quell'opzione; la classe
`stima` è esclusa per contratto); le righe di conflitto incrociano gli slot della
settimana, i piatti, la dispensa e — a settimana confermata — **le righe congelate della
lista**, non la dispensa di oggi (lettura della lista tollerante: se fallisce, nessuna riga
di conflitto).

**Note per il redesign:**
- La scheda componente **cicla**, non apre un selettore: un tap = opzione successiva in
  ordine d'autore, con wrap-around. Non c'è modo di vedere tutte le opzioni insieme.
- `SOSTITUISCI` nasce spento e si accende solo se il piatto o una scelta è diversa dal
  momento del caricamento; tornare ciclando all'opzione originale lo rispegne.
- Su uno slot `saltato`/`sostituito` questa schermata è il flusso "ho mangiato un altro
  piatto": il salvataggio riporta lo slot a `casa`.
- La sostituzione **non** rigenera la lista: quello che manca entra nel top-up alla
  prossima apertura della Lista. È esattamente quello che dice la nota.

---

## 6. Dispensa — `/dispensa`

**File:** `src/app/(app)/dispensa/page.tsx`; `src/components/NotaDispensa.tsx`.

**Scopo:** vedere cosa risulta in casa (residuo derivato dal piano, non un inventario) e
rimetterlo in pari quando non torna; gestire i lotti Pronti del meal prep. Si usa quando
la lista chiede qualcosa che c'è già, o il contrario.

**Come ci si arriva:** tab bar (`DISPENSA`).

**Testata:** **non** usa `Testata` (il commento nel codice dice «Stesso header delle altre
sottopagine di /impostazioni»). Header ridotto: freccia indietro 23 px
(`aria-label="Torna alle impostazioni"` → **`/impostazioni`**), etichetta centrale mono
10/700/0.16em `--sec` **`DISPENSA`**, spaziatore 44×44. Nessun marchio, nessuna pillola
settimana, nessun ingranaggio.

**Struttura dall'alto in basso:**
1. Header ridotto (freccia · `DISPENSA` · spaziatore).
2. Eventuale riga del totale non ricomprato.
3. Eventuale riga d'errore di salvataggio.
4. Gruppo **`IN CASA`** (residuo > 0), con sottotitolo esplicativo — aperto.
5. Gruppo **`FINITI`** (residuo ≤ 0 ma con un ultimo acquisto) — aperto, nessun sottotitolo.
6. Sezione **`PRONTI`** (lotti con porzioni ancora utilizzabili) — presente solo se ce n'è
   almeno uno.
7. Gruppo **`MAI COMPRATI`** (residuo ≤ 0 e mai acquistato) — **chiuso di partenza**, con
   chevron che ruota di 90°.
8. La correzione via nota: **card compressa** a una riga, oppure la scheda `NotaDispensa`
   aperta con una X in alto a destra.
9. Tab bar (voce `DISPENSA` attiva).

**Anatomia della riga ingrediente** (min-height 62, raggio 16, bianca, bordo 1 px
`--bordo`): quadratino 9 px del colore area · nome 16/700 troncato · riga metadati mono
8,5 · eventuali righe di stato sans 12 · fiocco di neve 44×44 (solo sui deperibili) ·
campo numerico 62×38 allineato a destra + unità.
**Anatomia della tessera Pronto:** nome del piatto 16/700 · riga mono `PREPARATO IL {12 SET}`
(+ ` · IN CONGELATORE`) · eventuale riga `{n} impegnate` · fiocco 44×44 · campo numerico
46×38 · cestino 44×44.

**Elementi interattivi:**

| Elemento | Etichetta esatta / aria-label | Cosa fa al tap | Dove porta o cosa cambia | Conferma? | Stato disabilitato |
|---|---|---|---|---|---|
| Freccia indietro | `aria-label="Torna alle impostazioni"` | naviga | `/impostazioni` | no | mai |
| Intestazione `MAI COMPRATI` | `MAI COMPRATI` + chevron, `aria-expanded` | apre/chiude il gruppo | mostra o nasconde le righe (area di tap min 44) | no | mai. Le intestazioni `IN CASA`, `FINITI`, `PRONTI` **non** sono cliccabili |
| Fiocco di neve (riga ingrediente) | `aria-label="{Nome}: metti in congelatore"` / `"…: togli dal congelatore"`; `aria-pressed` | alterna congelato | scrittura ottimistica; sposta la soglia di scadenza da giorni a mesi; fondo `rgba(156,199,242,0.30)` e tratto `#4A90D9` quando attivo | no | presente **solo** sugli ingredienti deperibili |
| Campo residuo | `aria-label="Residuo di {Nome}"` | digitazione | salva **al blur**, non a ogni tasto; valore non numerico o negativo → torna al valore di prima | no | mai |
| Fiocco (tessera Pronto) | `aria-label="{Piatto}: metti in congelatore"` / `"…: togli dal congelatore"`; `aria-pressed` | alterna congelato sul lotto | idem | no | mai |
| Campo porzioni (Pronto) | `aria-label="Porzioni di {Piatto}"` | digitazione | salva al blur | no | mai |
| Cestino (Pronto) | `aria-label="Elimina il lotto di {Piatto}"` | elimina il lotto | la tessera sparisce subito; se la scrittura fallisce torna | **no dialogo** | mai |
| Card compressa | `Il conto non torna? Correggi con una nota` | monta `NotaDispensa` | la scheda AI compare con `.anim-foglio` | no | mai |
| X sulla scheda nota | `aria-label="Chiudi correzione con una nota"` | smonta la scheda | torna la card compressa | no | mai |
| Textarea della nota | placeholder `Es. ho finito il riso, l'olio è a metà…` (2 righe, `resize: none`) | digitazione | — | no | mentre l'invio è in volo |
| Microfono | `aria-label="Detta la nota"` | avvia la dettatura (`it-IT`) | il trascritto si **accoda** al testo esistente | no | mentre l'invio è in volo. **Assente** se il browser non ha `SpeechRecognition` |
| Tasto della nota | `Correggi` (pillola bianca, mono 11, min 44) | manda nota + contesto a `/api/dispensa/correggi` | applica subito le proposte sopra soglia, in sequenza; mostra il recap; svuota il campo solo se tutto è andato | no | mentre l'invio è in volo o se la nota è vuota/solo spazi (opacità **0,35**) |
| Pillola su riga proposta | `Annulla` | riscrive il valore precedente | la riga resta nel gruppo `APPLICATE` con sotto la parola `annullata` e senza più pillola | no | mentre quella riga è in volo (opacità 0,5) |
| Pillola su riga proposta | `Conferma` | applica la proposta | la riga passa a "applicata" | no | come sopra |
| Tab bar | `LISTA` `SETTIMANA` `PIATTI` `DISPENSA` | naviga | — | no | mai |

ELEMENTO TOLTO (20/09, guscio comune): freccia "Torna alle impostazioni" — la Dispensa usa la Testata con il menù utente.
ELEMENTO NUOVO (20/09, guscio comune): Menù utente — tondo con l'iniziale, aria-label="Impostazioni", porta a /impostazioni; sostituisce l'ingranaggio.

**La scheda AI della Dispensa — TUTTE le voci e la condizione esatta**
(`NotaDispensa.tsx`; etichetta di sezione `CORREGGI CON UNA NOTA`, poi una scheda bianca
raggio 18 bordo 1 px `--bordo`):

| Voce (testo esatto) | Condizione |
|---|---|
| Etichetta `CORREGGI CON UNA NOTA` | sempre (quando la scheda è aperta) |
| Textarea, placeholder `Es. ho finito il riso, l'olio è a metà…` | sempre |
| Tasto microfono (`aria-label="Detta la nota"`) | solo se `window.SpeechRecognition` o `webkitSpeechRecognition` esiste (verificato dopo il mount: al primo render non c'è mai) |
| Tasto `Correggi` | sempre; spento (opacità 0,35) con nota vuota o invio in volo |
| `La correzione non è disponibile.` | risposta HTTP 503 (chiave AI assente) |
| `Non ho capito la nota, riprova.` | risposta HTTP 422 |
| `Non siamo riusciti a correggere. Riprova.` | ogni altro errore: altro HTTP non-ok, fetch fallita/offline, corpo non JSON, sessione senza token, fallimento di un'applicazione automatica, di un `Annulla` o di un `Conferma` |
| Gruppo `APPLICATE` | almeno una proposta con `confidence ≥ soglia` già scritta (o poi annullata) |
| Gruppo `DA CONFERMARE` | almeno una proposta sotto soglia |
| Gruppo `NON RICONOSCIUTI` (lista puntata) | il modello ha restituito nomi che non ha saputo agganciare (`nonRiconosciuti` non vuoto) |
| Riga proposta: `{Nome} {valoreAttuale} → {valoreNuovo} {unità}` | proposta sul campo `residuo` |
| Riga proposta: `{Nome} frigo → freezer` | proposta che accende il congelatore |
| Riga proposta: `{Nome} freezer → frigo` | proposta che lo spegne |
| Riga proposta: la `motivazione` del modello (sans 11,5 `--ter`) | sempre, sotto i valori |
| Parola `annullata` sotto la riga | la riga è stata annullata |
| Pillola `Annulla` | riga nel gruppo `APPLICATE` e non ancora annullata |
| Pillola `Conferma` | riga nel gruppo `DA CONFERMARE` |

Se l'applicazione automatica fallisce a metà, il giro **si ferma**: le proposte successive
non compaiono in nessuno dei due gruppi (non sono state scritte) e appare l'errore.

**Stati della schermata:**
- **Caricamento:** solo l'header ridotto, corpo vuoto.
- **Errore di caricamento:** header + `Non riusciamo a caricare la dispensa. Riprova più tardi.`
- **Vuoto (nessun ingrediente):** blocco centrato, titolo `Ancora niente in dispensa`,
  testo `Si riempie da sé: appena chiudi la prima spesa, qui trovi quello che è rimasto.`
  (nessun tasto).
- **Errore di salvataggio:** `Non siamo riusciti a salvare la correzione. Riprova.`
  (correzione del residuo o del lotto) oppure `Non siamo riusciti a salvare. Riprova.`
  (congelatore, eliminazione del lotto). Il valore torna a quello di prima.
- **Gruppi vuoti:** un gruppo senza righe **non viene renderizzato affatto** (nessun
  titolo vuoto); la sezione `PRONTI` non compare finché non esiste un lotto utilizzabile.
- **Senza risparmio accumulato:** la riga del totale non compare.
- Nessuno stato offline previsto.

**Testi fissi:**
- Titoli di gruppo: `IN CASA`, `FINITI`, `PRONTI`, `MAI COMPRATI`; a destra di ognuno il
  conteggio nudo (`{n}`, mono 9 `--ter`).
- Sottotitolo del solo gruppo `IN CASA`: `Calcolato da spesa e piano: correggi solo se non
  torna con la realtà.`
- Riga del totale: `Da quando usi Spesa: {9 confezioni non ricomprate} · {4,1 kg} · {circa 32 €}`
  — singolare `1 confezione non ricomprata`; quantità ed euro solo se ci sono; niente riga
  con zero confezioni.
- Riga metadati dell'ingrediente (mono maiuscolo, segmenti uniti da ` · `):
  `{NOME AREA}` + (` · PRESO IL 12 SET` **oppure** ` · MAI COMPRATO`) + (` · IN CONGELATORE`
  se congelato) + (` · SCADE OGGI` oppure ` · SCADE IL 12 SET`, e **mai** su un residuo già
  decaduto).
- Riga di stato "decaduto": `Troppo tempo per essere ancora buono: la lista lo richiede.`
  e, solo se non è congelato, il seguito ` Se l'hai congelato, dillo qui accanto.`
- Riga di stato "dimenticato": `Nessun pasto in programma lo usa prima che scada.`
- Tessera Pronto: `PREPARATO IL {12 SET}` (+ ` · IN CONGELATORE`), e `1 impegnata` /
  `{n} impegnate`; nome di ripiego per un piatto cancellato: `Piatto eliminato`.
- Card compressa: `Il conto non torna? Correggi con una nota`.

**Dati mostrati e provenienza:** l'elenco è **tutti** gli ingredienti dell'utente
(`leggiIngredienti`) incrociati con lo stato di dispensa (residuo, ultimo acquisto,
congelato); l'ordine dentro ogni gruppo è quello dei reparti scelto dall'utente, poi per
nome (locale `it`); la scadenza è calcolata in locale dai valori **correnti** della riga
(e non da quelli letti al caricamento, perché il congelatore li sposta); il "dimenticato"
incrocia la settimana corrente (nessuna settimana → nessuna riga); il totale non ricomprato
somma le settimane chiuse (`risparmio_totale`, lettura tollerante); i lotti Pronti dal
server, con le porzioni utilizzabili filtrate per data (3 giorni in frigo, 90 congelate);
le "impegnate" contano gli slot futuri che useranno un pronto di quel piatto. Le proposte
della nota vengono dal modello via `/api/dispensa/correggi`, ma **le scritture passano dai
soliti data layer** (`correggiResiduo`, `impostaCongelato`) e la pagina si ricarica dopo
ogni applicazione.

**Note per il redesign:**
- Questa schermata è **lo specchio di un calcolo**, non un inventario: il numero nel campo
  è quello che l'app ha derivato, e il campo serve a correggerlo quando non torna.
- I campi numerici salvano **al blur**, non a ogni tasto; la riga si rimonta quando il
  residuo cambia (la `key` include residuo e flag congelato), così il campo riparte sempre
  dal valore vero.
- `FINITI` e `MAI COMPRATI` sono separati apposta: il secondo è il catalogo (decine di
  righe dopo il seed) e nasce **chiuso**, altrimenti seppellirebbe il primo.
- La scheda AI è un ripiego, non la prima cosa: nasce compressa in una card a una riga e
  si monta solo al tap.
- Il fiocco di neve esiste **solo** sui deperibili; sui lotti Pronti esiste sempre.
- L'eliminazione di un lotto non ha dialogo di conferma.
- Attenzione per il redesign: la freccia dell'header porta a `/impostazioni`, anche se a
  questa schermata si arriva dalla tab bar.

---

## 7. Primo avvio (cancello) — nessuna route propria

**File:** `src/components/PrimoAvvio.tsx`, `src/app/(app)/layout.tsx`.

**Scopo:** garantire che, alla prima apertura dell'app, i dati iniziali (la riga
impostazioni e i 71 ingredienti di base) esistano **prima** che qualunque schermata legga
il database. Non è una schermata che l'utente "usa": è un cancello che dura l'attimo del
primo caricamento.

**Come ci si arriva:** avvolge i figli del layout del gruppo `(app)`, quindi vale per
tutte le schermate di questo inventario. Gira **una volta per apertura dell'app**, non a
ogni navigazione (il layout non si rimonta).

**Testata:** nessuna. **Nessun elemento di UI di alcun tipo.**

**Struttura dall'alto in basso:**
1. Finché non è pronto: `return null` — **schermo vuoto** (resta solo il fondo pagina e la
   tab bar del layout, che è fuori dal cancello).
2. Quando è pronto: i figli, cioè la schermata richiesta.

**Elementi interattivi:** nessuno (0 righe).

**Stati della schermata:**
- **In attesa:** niente a schermo (nessuno spinner, nessun testo, nessun logo).
- **Pronto:** compare la schermata richiesta.
- **Timeout:** dopo **4000 ms** il cancello si apre comunque e la semina, se ancora in
  corso, finisce in sottofondo (è idempotente).
- **Errore:** la semina fallita finisce in `console.error` e i figli compaiono comunque.
  Nessun messaggio all'utente.

**Testi fissi:** nessuno.

**Componenti del design system usati:** nessuno.

**Dati mostrati e provenienza:** nessun dato mostrato; scrive (se serve) la riga
`settings` e i 71 ingredienti di base dell'utente.

**Note per il redesign:**
- **Oggi il primo avvio non ha uno stato visivo**: fra l'apertura dell'app e la prima
  schermata c'è, per un tempo variabile fino a 4 secondi, una pagina vuota con la sola tab
  bar. Se il redesign vuole mettere qualcosa lì (logo, marchio, riga di stato), è materiale
  nuovo, non un ridisegno di qualcosa che esiste.
- Il cancello è volutamente tollerante: non blocca mai l'utente fuori dall'app per un
  errore di semina.

---

---

## 8. Piatti (elenco) — `/piatti`

**File:** `src/app/(app)/piatti/page.tsx`; usa `src/components/Testata.tsx`,
`src/components/Segmento.tsx`, TabBar dal layout.

**Scopo:** l'utente consulta il proprio repertorio di piatti, lo filtra per pasto o lo
cerca per nome, e da qui apre un piatto o ne crea uno nuovo. Quando il repertorio è vuoto
questa schermata è l'onboarding: la scelta fra le due porte (importare la dieta o scrivere
i piatti a mano).

**Come ci si arriva:** voce PIATTI della tab bar; anche dai rimandi degli stati vuoti di
Lista e Settimana (dichiarati nel design system §3 "Stato vuoto"), e come ritorno da
`/piatti/veloce`, `/piatti/[id]`.

**Testata:** titolo esatto **`Piatti`**; **niente pillola settimana**; **marchio** (con
`aree={[]}`, quindi tutte le sei caselle piene) che è link a `/lista`; **ingranaggio sì**
→ `/impostazioni`.

**Struttura dall'alto in basso (con almeno un piatto):**
1. Testata `Piatti`.
2. Campo di ricerca (44 px, raggio 14, fondo `--fondo`): placeholder e `aria-label`
   **`Cerca un piatto`**. Ricerca tollerante agli accenti ("caffe" trova "Caffè").
3. Fila scorrevole di pillole filtro: **`TUTTI`** + una pillola per ogni pasto, con il nome
   del pasto dall'utente (default: `Colazione`, `Spuntino`, `Pranzo`, `Cena`), rese in
   maiuscolo dal Segmento.
4. Elenco scorrevole di schede piatto (raggio 20, bordo 1 px, padding `15px 16px`, gap 10).
   Ogni scheda: nome 19/700 su **massimo 2 righe** (`WebkitLineClamp: 2`); sotto, pillola
   contornata con il nome del pasto (mono 8.5), fino a 6 quadratini 8×8 nei colori delle
   aree degli ingredienti (nell'ordine dei reparti scelto dall'utente), e la riga mono
   **`{N} INGR. · NUTRIZIONISTA`** oppure **`{N} INGR. · PROPRIO`**; a destra un chevron.
5. Tasto primario a piena larghezza (54 px, raggio 18, mono 12/700): **`+ NUOVO PIATTO`**.
6. TabBar (PIATTI attiva).

**Struttura dello stato vuoto (zero piatti) — "le due porte":**
1. Testata `Piatti`.
2. Titolo 21/800: **`Da dove partiamo?`**
3. Testo 14: **`Spesa costruisce la lista dai piatti che mangi. Ce li dici una volta sola, in uno di questi due modi.`**
4. Porta 1 (scheda bianca raggio 22): titolo **`Ho una dieta`**, testo **`Fotografa le pagine del piano che ti hanno dato: piatti e grammature li legge l'app, tu controlli e confermi.`**, tasto primario **`IMPORTA LA DIETA`** → `/importa`.
5. Porta 2: titolo **`Cucino sempre le stesse cose`**, testo **`Scrivi otto o dieci piatti che fai davvero, con gli ingredienti e quanto ne usi. Da lì la settimana gira da sola.`**, tasto primario **`SCRIVI I MIEI PIATTI`** → `/piatti/veloce`.
6. Riga 12.5: **`Preferisci fare a modo tuo? `** + link sottolineato **`Crea un piatto dall'editor completo`** → `/piatti/nuovo`.
7. TabBar. (In questo stato **non** ci sono ricerca, filtri né `+ NUOVO PIATTO`.)

**Elementi interattivi**

| Elemento | Etichetta esatta / aria-label | Cosa fa al tap | Dove porta o cosa cambia | Conferma? | Stato disabilitato |
|---|---|---|---|---|---|
| Marchio in testata | `Vai alla lista` (aria-label) | naviga | `/lista` | no | mai |
| Ingranaggio in testata | `Impostazioni` (aria-label) | naviga | `/impostazioni` | no | mai |
| Campo ricerca | `Cerca un piatto` (placeholder + aria-label) | filtra per nome | filtra l'elenco in pagina | no | mai |
| Pillola filtro pasto | `TUTTI` / nome del pasto | seleziona il filtro | filtra l'elenco; `aria-pressed` | no | mai (prop `disabilitato` non usata qui) |
| Scheda piatto | nome del piatto (testo) | naviga | `/piatti/{id}` (apre in sola lettura) | no | mai |
| Tasto nuovo piatto | `+ NUOVO PIATTO` | naviga | `/piatti/nuovo` (editor vuoto) | no | mai |
| Porta 1 (stato vuoto) | `IMPORTA LA DIETA` | naviga | `/importa` | no | mai |
| Porta 2 (stato vuoto) | `SCRIVI I MIEI PIATTI` | naviga | `/piatti/veloce` | no | mai |
| Link editor completo | `Crea un piatto dall'editor completo` | naviga | `/piatti/nuovo` | no | mai |
| Voci TabBar (4) | `LISTA` `SETTIMANA` `PIATTI` `DISPENSA` | naviga | `/lista` `/settimana` `/piatti` `/dispensa` | no | mai |

ELEMENTO TOLTO (20/09, guscio comune): Marchio in testata con il link "Vai alla lista" — il Marchio vive nella tab bar come icona della Lista.
ELEMENTO NUOVO (20/09, guscio comune): Menù utente — tondo con l'iniziale, aria-label="Impostazioni", porta a /impostazioni; sostituisce l'ingranaggio.

**Stati della schermata:**
- **Vuoto (zero piatti):** le due porte, come sopra. Non è una scheda centrata con icona
  tratteggiata: è una pagina scorrevole con due schede (il codice dichiara la divergenza
  dall'artboard `design/VuotoPiatti.dc.html`).
- **Caricamento:** solo la Testata, nessun testo, nessuno spinner (commento nel codice:
  "Nessuno stato di caricamento è nell'artboard").
- **Errore di caricamento:** solo Testata + `<p>` in `--sec` con
  **`Non riusciamo a caricare i piatti. Riprova più tardi.`** (niente ricerca, filtri,
  elenco né tasto).
- **Filtro/ricerca senza risultati** (ma con piatti a repertorio): al posto dell'elenco,
  centrato, **`Nessun piatto qui`** (17/700) e **`Cambia filtro, oppure aggiungine uno.`**
  (14, `--sec`); il tasto `+ NUOVO PIATTO` resta.

**Testi fissi non ancora citati:** il contatore sulla scheda è nel formato
`{numero} INGR. · {FONTE}` con fonte `NUTRIZIONISTA` o `PROPRIO` (mono 9, `--ter`).

**Componenti del design system usati:** Testata, Marchio, Tab bar, Pillole d'azione
(Segmento variante pillola), Scheda, Campo di testo, Tasti (Primario), Stato vuoto
(variante propria, non quella canonica), Messaggi (errore di caricamento).

**Dati mostrati e provenienza:** piatti e loro ingredienti dal repertorio dell'utente
(`leggiRepertorio`); aree degli ingredienti dal catalogo (`leggiIngredienti`); nomi dei
pasti da `leggiSlotDefs`; ordine dei quadratini d'area da `impostazioni.ordineAree`.
Niente dal modello, niente dalla dispensa.

**Note per il redesign:**
- Il marchio qui è **sempre tutto pieno**: solo la Lista calcola le aree mancanti.
- Il nome del piatto è troncato a due righe, non a un'ellissi su riga singola.
- La pillola del pasto sulla scheda è **contornata** (bordo `rgba(20,22,58,0.18)`), non
  piena: non è un filtro attivo, è un'etichetta.
- Il bottom padding della fila di filtri è ridotto a 6 px perché il bottone del Segmento
  è alto 44 px mentre la pillola disegnata è 38: l'area di tap eccede il disegno.

---

## 9. Piatti veloce — `/piatti/veloce`

**File:** `src/app/(app)/piatti/veloce/page.tsx` + `src/app/(app)/piatti/veloce/contatore.ts`;
usa `src/components/Segmento.tsx`.

**Scopo:** scrivere in fila i piatti che si cucinano davvero — uno alla volta, la schermata
resta aperta e il contatore dice quando la settimana può girare. Si usa subito dopo la porta
"Cucino sempre le stesse cose".

**Come ci si arriva:** tasto `SCRIVI I MIEI PIATTI` dallo stato vuoto di `/piatti`.

**Testata:** **non usa `Testata`**. Header ridotto proprio: freccia indietro 23 px a
sinistra (`aria-label="Torna ai piatti"` → `/piatti`), al centro etichetta mono 10/700/0.16em
in `--sec` **`PIATTO {n+1}`** (es. `PIATTO 1`, dove `n` = piatti già a repertorio più quelli
salvati in questa sessione), a destra un riquadro vuoto 44×44 per tenere l'etichetta
centrata. Niente marchio, niente pillola settimana, niente ingranaggio.

**Struttura dall'alto in basso:**
1. Header ridotto (sopra).
2. Riga contatore 12.5 in `--sec`, uno di questi testi esatti (`contatore.ts`):
   - `Nessun piatto ancora · ne bastano 8 per far girare la settimana`
   - `1 piatto salvato · ne bastano 8 per far girare la settimana · o esci con HO FINITO`
   - `{n} piatti salvati · ne bastano 8 per far girare la settimana · o esci con HO FINITO`
   - `{n} piatti salvati · manca 1 piatto per {Pasto} (o esci con HO FINITO)` /
     `... mancano {k} piatti per {Pasto} (o esci con HO FINITO)`
   - `Ne hai {n}: la settimana può girare. Aggiungine quanti vuoi.`
3. Corpo scorrevole:
   a. dopo un salvataggio: riga 12.5/600 in `--ink-2` **`Salvato: {nome del piatto}`** (resta
      finché non si ricomincia a scrivere).
   b. Campo nome grande (26/800, bordo solo inferiore): placeholder **`Dai un nome al piatto`**,
      `aria-label="Nome del piatto"`, max 80 caratteri.
   c. Etichetta **`PASTO`** + Segmento a pillole con i pasti dell'utente.
   d. Etichetta **`INGREDIENTI`** + campo di ricerca: placeholder e aria-label
      **`Cerca un ingrediente`**, max 80 caratteri.
   e. Riquadro dei risultati (solo se si è scritto qualcosa): fino a **8** righe 46 px con
      quadratino colore d'area + nome; in fondo, se nessun ingrediente ha esattamente quel
      nome, la riga **`Crea «{testo scritto}»`** con un `+` decorativo.
   f. Righe del piatto: nome, campo quantità 68×40 (mono 16/700, allineato a destra,
      placeholder `0`), unità in mono (`g` / `ml` / `pz`), `✕` 40×40.
   g. Se non c'è nessuna riga: nota 12.5 **`Un piatto senza ingredienti non entra nella lista della spesa`**.
   h. Se il piatto non è salvabile: la **prima** ragione, 12.5 `--sec`: `Manca il nome` /
      `Aggiungi almeno un ingrediente` / `Manca la quantità di {ingrediente}` /
      `Quantità troppo alta per {ingrediente}` (soglia 100000).
   i. Eventuale errore di salvataggio.
4. Barra in fondo (padding `8px 16px 22px`, gap 9): **`HO FINITO`** (larghezza fissa 104,
   mono 11.5) e **`SALVA E AVANTI`** (`flex:1`, mono 12).
5. TabBar (PIATTI attiva, perché il percorso inizia con `/piatti`).

**Sotto-riquadro "mini-creazione ingrediente"** (sostituisce il riquadro dei risultati
quando si tocca `Crea «…»`):
1. Etichetta **`NUOVO INGREDIENTE`**.
2. Campo nome: placeholder **`Dai un nome all'ingrediente`**, `aria-label="Nome dell'ingrediente"`.
3. **`AREA DEL SUPERMERCATO`** + Segmento a pillole con i nomi veri delle aree
   (`ORTOFRUTTA`, `MACELLERIA E PESCHERIA`, `LATTICINI, UOVA E SALUMI`,
   `PASTA, RISO E CEREALI`, `DISPENSA E CONSERVE`, `SURGELATI`), nell'ordine dei reparti
   dell'utente. Area iniziale: `dispensa`.
4. **`UNITÀ DI MISURA`** + Segmento a blocco **`G`** / **`ML`** / **`PZ`** (iniziale `g`).
5. **`DEPERIBILE`** + riga-interruttore (`aria-label="Va comprato fresco"`, `aria-pressed`)
   con testo **`Sì, va comprato fresco`** oppure **`No, si conserva a lungo`** e un
   toggle 46×28.
6. **`FORMATO DELLA CONFEZIONE`** + campo mono 18/700 (48 px) con l'unità accanto;
   con unità `PZ` il campo mostra `1` ed è **disabilitato** (opacità 0,5).
7. Nota 12.5: **`Formato e reparto li puoi correggere dopo in Impostazioni → Ingredienti.`**
8. Eventuale errore.
9. **`ANNULLA`** (104 px) + **`CREA E AGGIUNGI`** (`flex:1`).

**Elementi interattivi**

| Elemento | Etichetta esatta / aria-label | Cosa fa al tap | Dove porta o cosa cambia | Conferma? | Stato disabilitato |
|---|---|---|---|---|---|
| Freccia indietro | `Torna ai piatti` (aria-label) | naviga | `/piatti` | no | mai |
| Campo nome piatto | `Nome del piatto` (aria-label), placeholder `Dai un nome al piatto` | scrive | nome in memoria; azzera la riga `Salvato:` | no | mai |
| Pillola pasto | nome del pasto | seleziona il pasto | `slotDefId` del piatto in corso | no | mai |
| Campo ricerca ingrediente | `Cerca un ingrediente` | cerca nel catalogo | mostra max 8 risultati | no | mai |
| Riga risultato | `Aggiungi {nome}` (aria-label) | aggiunge la riga | riga con quantità vuota; svuota la ricerca | no | mai |
| Riga "crea" | `Crea «{testo}»` (aria-label identico al testo) | apre la mini-creazione | riquadro NUOVO INGREDIENTE | no | compare solo se nessun nome coincide esattamente |
| Campo quantità di riga | `Quantità di {nome}` (aria-label), placeholder `0` | scrive | quantità (accetta virgola o punto) | no | mai |
| `✕` di riga | `Togli {nome}` (aria-label) | rimuove la riga | riga via dal piatto | **no** | mai |
| `HO FINITO` | `HO FINITO` | naviga | `/settimana` | no | mai (cambia solo aspetto: primario quando la settimana può girare, secondario prima) |
| `SALVA E AVANTI` | `SALVA E AVANTI` | salva il piatto e svuota il modulo | scrive il piatto, incrementa il contatore, mostra `Salvato: …` | no | quando c'è una ragione di non validità, o mentre salva (opacità 0,7) |
| Mini-creazione: campo nome | `Nome dell'ingrediente` (aria-label) | scrive | nome dell'ingrediente | no | mai |
| Mini-creazione: pillola area | nome dell'area | sceglie l'area | riapplica i default ai campi non toccati | no | mai |
| Mini-creazione: segmento unità | `G` `ML` `PZ` | sceglie l'unità | con `PZ` forza formato 1; uscendo da `PZ` ricalcola il default | no | mai |
| Mini-creazione: interruttore | `Va comprato fresco` (aria-label), `aria-pressed` | inverte deperibile | testo `Sì, va comprato fresco` / `No, si conserva a lungo` | no | mai |
| Mini-creazione: campo formato | `Formato della confezione` (aria-label) | scrive | formato confezione | no | quando l'unità è `PZ` |
| Mini-creazione: `ANNULLA` | `ANNULLA` | chiude il riquadro | torna ai risultati | no | mentre crea |
| Mini-creazione: `CREA E AGGIUNGI` | `CREA E AGGIUNGI` | crea l'ingrediente e lo aggiunge al piatto | scrive l'ingrediente, aggiunge la riga | no | nome vuoto, o formato non numerico / ≤ 0 / > 100000; mentre crea |

**Stati della schermata:**
- **Caricamento:** solo l'header ridotto con `PIATTO`, nessun contenuto.
- **Errore di caricamento:** header `PIATTO` + **`Non riusciamo a caricare. Riprova più tardi.`**
- **Errore di salvataggio piatto:** `<p>` 12.5 `--sec` **`Non siamo riusciti a salvare il piatto. Riprova.`**
- **Errore di creazione ingrediente:** **`Non siamo riusciti a creare l'ingrediente. Riprova.`**
- **Variante "la settimana può girare"** (≥ 8 piatti e ogni pasto con ≥ 2): `HO FINITO`
  diventa il tasto pieno e `SALVA E AVANTI` passa a secondario (`data-primario` nel DOM
  dice il ruolo).
- **Variante "piatto non valido":** `SALVA E AVANTI` è il tasto spento
  (`rgba(20,22,58,0.10)`, testo `--ter`) e sotto compare la ragione.

**Testi fissi non ancora citati:** l'etichetta centrale dell'header è `PIATTO {n+1}` e
cambia ad ogni salvataggio.

**Componenti del design system usati:** Tasti (Primario / Secondario / Spento), Pillole
d'azione (Segmento pillola), Segmento a blocco, Scheda, Campo di testo (con variante
numerica 68 px), Etichetta di sezione, Messaggi (riga di stato e errore).

**Dati mostrati e provenienza:** pasti da `leggiSlotDefs` (ordinati per `posizione`);
catalogo ingredienti da `leggiIngredienti` più quelli creati qui, tenuti in memoria locale;
conteggio dei piatti dal repertorio letto all'apertura + quelli salvati nella sessione;
i default di area/unità/deperibilità/formato da `predefinitiIngrediente`
(`src/domain/ingredienti-base.ts`).

**Note per il redesign:**
- Non c'è la `Testata` dell'app: l'header è quello ridotto a tre zone, con il **riquadro
  vuoto 44×44** a destra che serve solo a centrare l'etichetta.
- `HO FINITO` ha larghezza fissa 104 px e corpo 11.5 (gli altri tasti 12): è una coppia
  asimmetrica, non due tasti uguali.
- La conferma del salvataggio **non è un toast**: è la riga `Salvato: …` che resta.
- La riga risultato mostra solo quadratino d'area + nome: nessun formato, nessuna unità.
- Il campo nome del piatto non ha bordo intorno, solo una linea sotto di 1,5 px.

---

## 10. Piatto (vista + modifica) — `/piatti/[id]`, incluso `/piatti/nuovo`

**File:** `src/app/(app)/piatti/[id]/page.tsx`, `src/components/TesseraIngrediente.tsx`,
`src/app/(app)/piatti/[id]/bozza.ts` (bozza in memoria/`sessionStorage`), `Segmento.tsx`.

**Scopo:** leggere un piatto del piano (modalità **vista**) e, quando serve, correggerlo
(modalità **modifica**): nome, pasto, posizione nel piano, ingredienti con grammature,
componenti a scelta, procedimento. `/piatti/nuovo` è la stessa pagina che apre già in
modifica su un piatto vuoto.

**Come ci si arriva:** tap su una scheda in `/piatti`; `+ NUOVO PIATTO` e il link
"editor completo" (→ `/piatti/nuovo`); dalla Settimana (apertura di un pasto assegnato);
ritorno da `/piatti/{id}/ingredienti/{ingId}`.

**Testata (modalità vista):** header proprio di `VistaPiatto`: a sinistra freccia 20 px
(`aria-label="Indietro"`, esegue `router.back()`), a destra la **pillola `MODIFICA`**
(40 px, raggio 999, fondo ink, mono 10.5/700). Niente marchio, niente cestino, niente
ingranaggio.

**Testata (modalità modifica):** header `Cornice`: freccia 23 px → `/piatti` (link senza
aria-label: il nome accessibile è assente, vedi note), etichetta centrale mono
**`PIATTO`** in `--sec`, a destra **cestino** 21 px (`aria-label="Elimina piatto"`).

**Struttura dall'alto in basso — modalità vista:**
1. Header: freccia indietro + pillola `MODIFICA`.
2. `h1` con il nome del piatto (34/800).
3. Riga meta mono 10.5 `--sec`, tutta in maiuscolo, pezzi uniti da ` · `: nome del pasto,
   `Settimana {n} del giro` (solo se il ciclo ha più di una settimana e il piatto ne dichiara
   una), giorno lungo (`Lunedì`…`Domenica`) se il piatto ha un giorno fisso.
4. Riga mono 10 `--sec`: **`PER 1 PORZIONE`**.
5. Elenco (li bianchi, raggio 14, 15.5/600) con una riga per ingrediente nel formato
   **`{quantità} {unità} · {nome} · {NOME AREA}`**; per i componenti, una riga per opzione:
   la prima nel formato **`{nome componente}: {ing1} + {ing2}`**, le successive precedute da
   una riga con la sola parola **`oppure`**.
6. TabBar.

**Struttura dall'alto in basso — modalità modifica:**
1. Header `PIATTO` con cestino.
2. Textarea del nome (34/800, si autoingrandisce, `Enter` bloccato): placeholder
   **`Dai un nome al piatto`** (colore placeholder `#c4c4ce`).
3. Segmento a pillole dei pasti.
4. Etichetta **`NEL PIANO`** + scheda bianca:
   - **`SETTIMANA DEL GIRO`** (solo se il ciclo ha più di 1 settimana): pillole
     **`TUTTE`**, `1`, `2`, … (fino a 4), su una riga scorrevole.
   - **`GIORNO FISSO`**: pillole **`LIBERO`**, **`LUN`**, **`MAR`**, **`MER`**, **`GIO`**,
     **`VEN`**, **`SAB`**, **`DOM`**, che vanno a capo (nessuno scroll orizzontale).
5. Riga con etichetta **`INGREDIENTI`** a sinistra e contatore mono **`PER 1 PORZIONE`** a destra.
6. Griglia a 2 colonne di **tessere ingrediente** (`TesseraIngrediente`, min 108 px) +
   riquadro tratteggiato **`AGGIUNGI`** / **`INGREDIENTE`** (su due righe, `<br>`);
   quando non c'è nessun ingrediente, accanto al riquadro compare un secondo riquadro
   tratteggiato **vuoto** che serve solo a pareggiare la griglia.
7. Messaggi di blocco (12.5 `--sec`), uno o più:
   - senza ingredienti: **`Un piatto senza ingredienti non entra nella lista della spesa: è la grammatura di ogni ingrediente a dire quanto comprare. Aggiungine almeno uno.`**
   - grammature mancanti: **`Manca la grammatura di`** / **`Mancano le grammature di`** +
     i nomi in grassetto + **`: tocca il numero sulla tessera e scrivi quanto ne usi per una porzione.`**
8. Etichetta **`COMPONENTI A SCELTA`**; per ogni componente una scheda con: campo
   **`Nome del componente`** (aria-label `Nome del componente {i}`), `✕`
   (`Elimina componente {i}`); per ogni opzione, riga **`OPZIONE {k}`** + tasto testuale
   **`ELIMINA`**, griglia di tessere + riquadro **`AGGIUNGI INGREDIENTE`**; in fondo
   **`AGGIUNGI OPZIONE`** (40 px, fondo `rgba(20,22,58,0.05)`). Sotto tutti i componenti,
   il riquadro tratteggiato **`AGGIUNGI COMPONENTE`** (54 px).
9. Messaggi di blocco dei componenti:
   - **`Dai un nome a ogni componente: senza, non si distinguerebbe in Scegli.`**
   - **`Ogni opzione deve avere almeno un ingrediente: aggiungine uno o elimina l'opzione.`**
   - **`Manca la grammatura di uno o più ingredienti nelle opzioni: tocca il numero sulla tessera e scrivi quanto ne usi.`**
10. Etichetta **`COME SI FA`** + textarea 4 righe, raggio 18: placeholder
    **`Il procedimento, se serve ricordarlo`**, `aria-label="Procedimento del piatto"`.
11. Blocco settimana, in due varianti:
    - **non in programma** (0 giorni a casa e 0 fuori): etichetta **`IN QUESTA SETTIMANA`**
      in `#C4C4CE` + riquadro muto `rgba(20,22,58,0.035)` con
      **`Non ancora in programma. Comparirà qui appena lo assegni a un pasto dalla Settimana.`**
    - **in programma**: etichetta `IN QUESTA SETTIMANA` in `--ink` + sette riquadri
      **`LUN MAR MER GIO VEN SAB DOM`** (non interattivi: acceso = fondo ink, testo bianco;
      spento = `rgba(20,22,58,0.045)`, testo `--ter`), poi la frase di riepilogo con i
      numeri **in lettere**: `In casa {una volta|due volte|…} questa settimana[, fuori {…}]. Il piatto entra {…} nella lista.`
      oppure `Fuori casa {…} questa settimana: non entra nella lista.`
12. Eventuale errore.
13. Barra in fondo: **`ANNULLA`** (104 px, mono 11.5, fondo `rgba(20,22,58,0.05)`,
    `aria-label="Annulla modifiche"`) + **`SALVA PIATTO`** (`flex:1`).
14. TabBar.

**Sovrapposizioni (overlay):**
- **Foglio dal basso "aggiungi ingrediente"** (overlay `rgba(20,22,58,0.35)`, foglio bianco
  `22px 22px 0 0`, max 70vh): etichetta **`AGGIUNGI INGREDIENTE`**; campo di ricerca
  (placeholder **`Cerca`**, `aria-label="Cerca un ingrediente"`) **solo se ci sono più di 8
  ingredienti disponibili**; righe con quadratino d'area + nome; in fondo la voce
  **`NUOVO INGREDIENTE`** → `/piatti/{id}/ingredienti/nuovo`. Se non c'è nulla da mostrare:
  **`Nessun ingrediente per "{ricerca}". Puoi crearlo qui sotto.`** oppure
  **`Hai già aggiunto tutti gli ingredienti del repertorio.`**
- **Dialogo di conferma eliminazione** (overlay, scheda bianca max 320 px, raggio 22):
  titolo **`Eliminare questo piatto?`**, testo
  **`Non comparirà più nel repertorio né nelle prossime settimane. Le settimane già passate restano invariate.`**,
  due tasti 48 px: **`ANNULLA`** (grigio) e **`ELIMINA`** (fondo ink, testo bianco — non rosso).

**Tessera ingrediente (`TesseraIngrediente.tsx`)** — anatomia: min 108 px, raggio 15,
bianco, bordo 1 px nel colore dell'area al 45 % (o **1,5 px `#D9534F`** se la quantità è
≤ 0), ombra `0 1px 2px`. Dentro: pillola della grammatura (fondo colore area al 32 %,
raggio 999) con **campo numerico larghezza 32** + unità; nome 17/700; nome dell'area in
mono 8 `--ter` in fondo. Tre controlli sovrapposti agli angoli, 44×44 ciascuno: `✕` in alto
a destra (`Rimuovi {nome}`), matita in basso a destra (`Modifica {nome}`, **solo** quando è
passato `hrefModifica`, cioè **solo per gli ingredienti della lista fissa, non per quelli
dentro le opzioni**), e il `<label>` da 44 px che porta il focus sul campo quantità.

**Elementi interattivi**

| Elemento | Etichetta esatta / aria-label | Cosa fa al tap | Dove porta o cosa cambia | Conferma? | Stato disabilitato |
|---|---|---|---|---|---|
| Vista: freccia indietro | `Indietro` (aria-label) | `router.back()` | schermata precedente | no | mai |
| Vista: pillola modifica | `MODIFICA` | passa in modalità modifica | stessa pagina, editor; azzera l'errore | no | mai |
| Modifica: freccia header | — (nessun aria-label; link con sola icona) | naviga | `/piatti` (abbandona le modifiche non salvate) | **no** | mai |
| Modifica: cestino | `Elimina piatto` (aria-label) | su piatto esistente apre il dialogo; su `/piatti/nuovo` esce | dialogo di conferma, oppure `/piatti` | **sì** (solo su piatto esistente) | in caricamento e su piatto non trovato (opacità 0,35, `disabled`) |
| Textarea nome | placeholder `Dai un nome al piatto` | scrive | nome in memoria; `Enter` è ignorato | no | mai |
| Pillola pasto | nome del pasto | scegli il pasto | `slotDefId` | no | mai |
| Pillole settimana del giro | `TUTTE`, `1`…`4`; aria-label `Settimana del giro: Va bene in ogni settimana del giro` / `Settimana del giro: Settimana {n} del giro` | sceglie | `settimanaCiclo` | no | la sezione non esiste se il ciclo ha 1 settimana |
| Pillole giorno fisso | `LIBERO`, `LUN`…`DOM`; aria-label `Giorno fisso: Lo sceglie l'app, ruotando` / `Giorno fisso: {Lunedì…}` | sceglie | `giornoCiclo` | no | mai |
| Campo quantità sulla tessera | `Grammatura di {nome}` (aria-label) | scrive | quantità dell'ingrediente nel piatto | no | mai |
| `✕` sulla tessera | `Rimuovi {nome}` (aria-label) | rimuove l'ingrediente | riga via dal piatto | **no** | mai |
| Matita sulla tessera | `Modifica {nome}` (aria-label) | salva la bozza e naviga | `/piatti/{id}/ingredienti/{ingredientId}` | no | assente sulle tessere dentro le opzioni |
| Riquadro aggiungi ingrediente | `AGGIUNGI INGREDIENTE` (testo su due righe) | apre il foglio dal basso | selettore ingredienti (target: lista fissa) | no | mai |
| Foglio: campo ricerca | `Cerca un ingrediente` (aria-label), placeholder `Cerca` | filtra | elenco nel foglio | no | compare solo con più di 8 disponibili |
| Foglio: riga ingrediente | nome dell'ingrediente | aggiunge con quantità 0 | riga nel piatto o nell'opzione; chiude il foglio | no | mai |
| Foglio: `NUOVO INGREDIENTE` | `NUOVO INGREDIENTE` | salva la bozza e naviga | `/piatti/{id}/ingredienti/nuovo` | no | mai |
| Foglio: overlay | — | chiude il foglio | azzera anche la ricerca | no | mai |
| Campo nome componente | `Nome del componente {i}` (aria-label), placeholder `Nome del componente` | scrive | nome del componente | no | mai |
| `✕` componente | `Elimina componente {i}` (aria-label) | elimina il componente | via il componente con tutte le opzioni | **no** | mai |
| `ELIMINA` opzione | `ELIMINA`; aria-label `Elimina opzione {k} del componente {i}` | elimina l'opzione; se era l'unica, elimina il componente | struttura dei componenti | **no** | mai |
| Riquadro aggiungi ingrediente (opzione) | `AGGIUNGI INGREDIENTE`; aria-label `Aggiungi ingrediente all'opzione {k} del componente {i}` | apre il foglio | selettore con target l'opzione | no | mai |
| `AGGIUNGI OPZIONE` | `AGGIUNGI OPZIONE` | aggiunge un'opzione vuota | nuova `OPZIONE {k+1}` | no | mai |
| `AGGIUNGI COMPONENTE` | `AGGIUNGI COMPONENTE` | aggiunge un componente | componente senza nome con una opzione vuota | no | mai |
| Textarea procedimento | `Procedimento del piatto` (aria-label) | scrive | descrizione | no | mai |
| `ANNULLA` | `ANNULLA`; aria-label `Annulla modifiche` | su piatto nuovo esce, su esistente ripristina e torna in vista | `/piatti` oppure modalità vista; scarta la bozza | no | mai |
| `SALVA PIATTO` | `SALVA PIATTO` | salva | su nuovo: `/piatti`; su esistente: resta e torna in vista | no | senza ingredienti, con una grammatura ≤ 0, con componenti non validi, o mentre salva |
| Dialogo: `ANNULLA` | `ANNULLA` | chiude il dialogo | nessun cambiamento | — | mentre elimina |
| Dialogo: `ELIMINA` | `ELIMINA` | elimina il piatto | `/piatti` | è già la conferma | mentre elimina |

**Stati della schermata:**
- **Vista vs modifica:** un piatto esistente apre sempre in **vista** (sola lettura); un
  piatto nuovo, o un piatto con una **bozza pendente** non salvata, apre in **modifica**.
- **Caricamento:** solo l'header `PIATTO` con il cestino disabilitato.
- **Piatto non trovato:** header con cestino disabilitato + **`Piatto non trovato.`**
- **Errore di caricamento:** **`Non riusciamo a caricare il piatto. Riprova più tardi.`**
- **Errore di salvataggio:** **`Non siamo riusciti a salvare il piatto. Riprova.`**
- **Errore di eliminazione:** **`Non siamo riusciti a eliminare il piatto. Riprova.`**
  (il dialogo si chiude e il messaggio resta in pagina).
- **Variante "non in programma"** vs **"in programma"**: vedi punto 11.
- **Tessera con quantità non valida:** bordo 1,5 px `#D9534F` (unico rosso dell'app) e
  `data-quantita-valida="false"` nel DOM.

**Testi fissi non ancora citati:** `PER 1 PORZIONE` compare due volte (in vista sotto la
riga meta, in modifica come contatore a destra di `INGREDIENTI`); la parola **`oppure`** è
il separatore fra opzioni in vista; i numeri delle volte sono scritti in lettere
(`una volta`, `due volte`, … fino a `sette volte`).

**Componenti del design system usati:** Tasti (Primario, Spento, variante grigia
`rgba(20,22,58,0.05)` per ANNULLA, dialogo a due tasti), Pillole d'azione, Segmento
(pillola), Tessera ingrediente (non è la Tessera della Lista: è un componente suo),
Foglio dal basso, Scheda, Campo di testo, Etichetta di sezione, Striscia dei giorni
(qui **non interattiva** e senza il bordo 3 px "oggi"), Messaggi.

**Dati mostrati e provenienza:** piatto dal repertorio (`leggiRepertorio`); catalogo
ingredienti (`leggiIngredienti`) per nome, area e unità base; pasti da `leggiSlotDefs`;
numero di settimane del ciclo da `leggiImpostazioni`; giorni "in casa"/"fuori" dalla
settimana corrente (`leggiSettimanaCorrente`, stato degli slot); bozza non salvata dalla
memoria del browser (`bozza.ts`). Nessun dato dal modello.

**Note per il redesign:**
- **Il cestino vive solo nell'editor** (mai in vista) e su un piatto esistente **chiede
  conferma**; su `/piatti/nuovo` equivale ad annullare, senza conferma.
- I chip giorno hanno **tre lettere** (`LUN`…`DOM`) e nell'editor **non sono toggle**:
  sono la fotografia della settimana, si cambiano dalla Settimana.
- Le pillole di `GIORNO FISSO` vanno **a capo** (due righe se serve), quelle di
  `SETTIMANA DEL GIRO` restano su una riga scorrevole.
- La matita per aprire l'ingrediente esiste **solo** sulle tessere della lista fissa.
- La freccia indietro dell'header in modifica **non chiede nulla**: le modifiche non
  salvate si perdono (a differenza della navigazione verso l'editor ingrediente, che salva
  una bozza).
- Il tasto distruttivo del dialogo è **ink pieno**, non rosso: il design system chiede
  `--errore`, il codice non lo fa ancora.
- Il rosso `#D9534F` della tessera è l'unico colore d'errore presente nel codice.

---

## 11. Ingrediente — `/piatti/[id]/ingredienti/[ingId]`

**File:** `src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx`; usa `Segmento.tsx`,
`src/domain/aree.ts`, `src/app/(app)/piatti/[id]/bozza.ts`.

**Scopo:** definire le proprietà da cui dipende l'aritmetica del residuo di un ingrediente
— area del supermercato, deperibilità, unità, formato della confezione, prezzo facoltativo,
classe di consumo — creando (`ingId === 'nuovo'`) o correggendo.

**Come ci si arriva:** matita su una tessera in `/piatti/{id}`; voce `NUOVO INGREDIENTE`
nel foglio del selettore; riga dell'elenco in `/impostazioni/ingredienti`, che apre
`/piatti/nuovo/ingredienti/{id}?torna=impostazioni`.

**Testata:** header ridotto: freccia 23 px → `/piatti/{dishId}` (link senza aria-label),
etichetta centrale mono **`INGREDIENTE`** in `--sec`, cestino 21 px a destra
(`aria-label="Elimina ingrediente"`). Niente marchio, niente ingranaggio, niente pillola.

**Struttura dall'alto in basso:**
1. Header `INGREDIENTE` con cestino.
2. Campo nome grande (32/800, solo linea inferiore 1,5 px): placeholder
   **`Dai un nome all'ingrediente`** (placeholder `#c4c4ce`).
3. Etichetta **`AREA DEL SUPERMERCATO`** + griglia 2×3 di celle 52 px (raggio 15) con
   quadratino 11 px + nome dell'area in mono 8.5: **`ORTOFRUTTA`**,
   **`MACELLERIA E PESCHERIA`**, **`LATTICINI, UOVA E SALUMI`**,
   **`PASTA, RISO E CEREALI`**, **`DISPENSA E CONSERVE`**, **`SURGELATI`** (ordine fisso di
   `AREE`, non quello dei reparti dell'utente). Selezionata: fondo colore d'area al 22 %,
   bordo 1,5 px nel colore.
4. Etichetta **`DEPERIBILE`** + riga-interruttore (`aria-pressed`, nessun aria-label) con
   titolo **`Sì, va comprato fresco`** / **`No, si conserva a lungo`** e sottotitolo mono
   **`FINISCE NELLA LISTA TOP-UP`** / **`FINISCE NELLA LISTA BASE`**; toggle 52×31.
5. Etichetta **`UNITÀ DI MISURA`** + Segmento a blocco **`G`** / **`ML`** / **`PZ`**.
6. Etichetta **`FORMATO DELLA CONFEZIONE`** + riquadro 56 px con campo mono 22/700 e unità
   accanto (`g`/`ml`/`pz`), poi nota 12.5:
   **`Quanto ne vendono in una confezione. Serve a sapere quante confezioni comprare, non quanti grammi. Dove il peso varia — carne, pesce, formaggio al banco — basta un valore indicativo: lo scarto lo correggi dalla Dispensa quando il conto non torna.`**
7. Etichetta **`PREZZO DI UNA CONFEZIONE`** + riquadro 56 px con campo mono 22/700 e
   simbolo **`€`** accanto, poi nota:
   **`Facoltativo, in euro: serve solo a contare quanto non ricompri`**
8. Etichetta **`COME SI CONSUMA`** + Segmento a blocco **`PORZIONABILE`** / **`INTERO`** /
   **`A STIMA`**, poi la spiegazione della classe scelta (12.5 `--sec`), uno di questi tre
   testi esatti:
   - porzionabile: **`La confezione copre più pasti. L'app calcola quanto ne resta dopo ogni porzione e lo riporta alla settimana dopo.`**
   - intero: **`Si conta a pezzi e non lascia resti frazionari: sei uova sono sei uova.`**
   - stima: **`Non vale la pena contarlo a grammi. Ogni 90 giorni dall'ultimo acquisto la lista ti chiede se ne hai ancora.`**
9. Eventuale errore (13, `--sec`).
10. Barra in fondo: **`ANNULLA`** (link 104 px, mono 11.5, fondo `rgba(20,22,58,0.05)`) +
    **`SALVA INGREDIENTE`** (`flex:1`, primario con ombra).
11. TabBar (PIATTI attiva, il percorso inizia con `/piatti`).

**Dialogo di conferma eliminazione:** titolo **`Eliminare questo ingrediente?`**; testo
composto: **`Verrà cancellato per sempre, insieme al residuo di dispensa che gli è legato.`**
+ (solo se ha acquisti registrati) **` Sparisce anche lo storico degli acquisti registrati: non si recupera.`**
+ **` Se è ancora usato in un piatto o in una lista della spesa, l'eliminazione viene bloccata: toglilo prima da lì.`**
Due tasti 48 px: **`ANNULLA`** e **`ELIMINA`** (ink pieno).

**Elementi interattivi**

| Elemento | Etichetta esatta / aria-label | Cosa fa al tap | Dove porta o cosa cambia | Conferma? | Stato disabilitato |
|---|---|---|---|---|---|
| Freccia header | — (nessun aria-label) | naviga | `/piatti/{dishId}` | no | mai |
| Cestino | `Elimina ingrediente` (aria-label) | su ingrediente esistente apre il dialogo; su `nuovo` esce | dialogo, oppure la destinazione di ritorno | **sì** su esistente | in caricamento e su ingrediente non trovato (opacità 0,35) |
| Campo nome | placeholder `Dai un nome all'ingrediente` (nessun aria-label) | scrive | nome | no | mai |
| Cella d'area (×6) | nome dell'area, `aria-pressed` | sceglie l'area | `area` dell'ingrediente | no | mai |
| Interruttore deperibile | `aria-pressed`; testo `Sì, va comprato fresco` / `No, si conserva a lungo` | inverte | deperibilità; cambia anche il sottotitolo TOP-UP/BASE | no | mai |
| Segmento unità | `G` `ML` `PZ` | sceglie l'unità base | `unitaBase` | no | **tutta la fila** quando la classe è `INTERO` (`disabled` + opacità 0,5) |
| Campo formato | `Formato della confezione` (aria-label) | scrive | formato confezione | no | quando la classe è `INTERO` |
| Campo prezzo | `Prezzo di una confezione` (aria-label) | scrive | prezzo (virgola o punto; vuoto = nessun prezzo) | no | mai |
| Segmento classe | `PORZIONABILE` `INTERO` `A STIMA` | sceglie la classe | con `INTERO` forza unità `pz` e formato `1` | no | mai |
| `ANNULLA` | `ANNULLA` | naviga | `/piatti/{id}` oppure `/impostazioni/ingredienti` se si è arrivati con `?torna=impostazioni` | no | mai |
| `SALVA INGREDIENTE` | `SALVA INGREDIENTE` | salva | stessa destinazione di ritorno di ANNULLA | no | nome vuoto, area non scelta, formato vuoto/non numerico/≤ 0, prezzo presente ma ≤ 0 o non numerico; mentre salva |
| Dialogo: `ANNULLA` | `ANNULLA` | chiude | nessun cambiamento | — | mentre elimina |
| Dialogo: `ELIMINA` | `ELIMINA` | elimina (hard delete) | destinazione di ritorno | è la conferma | mentre elimina |

**Stati della schermata:**
- **Nuovo vs esistente:** con `ingId === 'nuovo'` i campi partono dai default (unità `g`,
  classe `porzionabile`, **deperibile = sì**, formato vuoto, area **non scelta**) e il
  cestino equivale ad annullare; su un esistente tutto è precaricato.
- **Caricamento:** solo l'header con cestino disabilitato.
- **Non trovato:** **`Ingrediente non trovato.`**
- **Errore di caricamento:** **`Non riusciamo a caricare l'ingrediente. Riprova più tardi.`**
- **Errore di salvataggio:** **`Non siamo riusciti a salvare l'ingrediente. Riprova.`**
- **Errore di eliminazione:** **`Non siamo riusciti a eliminare l'ingrediente. Riprova.`**
  oppure, se l'ingrediente è ancora in uso, il messaggio di `IngredienteInUsoError` così
  com'è (testo definito in `src/data/repertorio.ts`, non letto per questo inventario).
- **Classe `INTERO`:** unità forzata a `PZ` con la fila disabilitata, formato forzato a `1`
  e campo disabilitato.
- **Ritorno diverso:** con `?torna=impostazioni` sia ANNULLA sia SALVA tornano a
  `/impostazioni/ingredienti`; senza, al piatto.

**Testi fissi non ancora citati:** i sottotitoli mono dell'interruttore
(`FINISCE NELLA LISTA TOP-UP` / `FINISCE NELLA LISTA BASE`) e l'unità ripetuta accanto al
campo formato (`g`/`ml`/`pz`, mono 16/700 in `--sec`).

**Componenti del design system usati:** Tasti (Primario con ombra, tasto grigio per
ANNULLA, dialogo a due tasti), Segmento a blocco, Scheda, Campo di testo (variante numerica
56 px), Etichetta di sezione, Messaggi.

**Dati mostrati e provenienza:** l'ingrediente dal catalogo dell'utente
(`leggiIngredienti`); la presenza di acquisti registrati da `haAcquistiRegistrati` (se la
lettura fallisce si assume **sì**, per non nascondere l'avviso); aree dal dominio (fisse).

**Note per il redesign:**
- L'ordine dei blocchi **diverge dall'artboard di proposito**: DEPERIBILE sta subito sotto
  l'area perché in fondo restava sotto la piega mentre SALVA era già visibile.
- Le sei celle d'area sono in **ordine fisso di dominio**, non nell'ordine dei reparti
  scelto dall'utente (che invece vale in `/piatti/veloce`).
- Il campo prezzo è un `type="text"` con `inputMode="decimal"`: accetta la virgola.
- L'eliminazione qui è **definitiva** (hard delete), non un soft delete come per il piatto:
  il copy del dialogo lo dice.

---

## 12. Impostazioni — `/impostazioni`

**File:** `src/app/(app)/impostazioni/page.tsx`; usa `Segmento.tsx`, `src/data/casa.ts`,
`src/data/impostazioni.ts`, `src/domain/ciclo.ts`, `src/domain/aree.ts`.

**Scopo:** configurare tutto ciò che non è un piatto: i pasti della giornata con le assenze
abituali, la rotazione del piano su più settimane, il repertorio ingredienti, la casa
condivisa e le porzioni, l'ordine dei reparti, l'import della dieta.

**Come ci si arriva:** ingranaggio nella Testata di Lista / Settimana / Piatti / Dispensa.

**Testata:** **non usa `Testata`**. Header ridotto: freccia 23 px a sinistra
(`aria-label="Indietro"`, esegue `router.back()`), **nessuna etichetta centrale** (scelta
dichiarata: il titolo grande sotto basta), riquadro vuoto 44×44 a destra. Niente marchio,
niente pillola settimana, niente ingranaggio. Il titolo **`Impostazioni`** è un testo
32/800 dentro il corpo scorrevole.

**Struttura dall'alto in basso:**
1. Header ridotto (solo freccia).
2. Titolo **`Impostazioni`** (32/800).
3. **`I TUOI PASTI`** + contatore a destra **`{n} DI 6`**.
4. Una riga-scheda per pasto (`RigaPastoEditor`): icona "maniglia" 17 px (decorativa, non
   trascinabile), campo nome (16/700, `aria-label="Nome del pasto"`), tasto `✕` 34 px
   (`Rimuovi {nome}`), freccia su 34 px (`Sposta {nome} in alto`), freccia giù 34 px
   (`Sposta {nome} in basso`); sotto, etichetta mono **`ABITUALMENTE FUORI CASA`** e sette
   pastiglie **`L M M G V S D`** (area di tap 44, disegno 36, `aria-pressed`,
   `aria-label="{Lunedì…}, abitualmente fuori casa"`).
5. Riquadro tratteggiato 52 px: **`AGGIUNGI PASTO`**.
6. Nota 12.5: **`Da tre a sei pasti, nell'ordine in cui li fai. I giorni segnati qui vengono già spenti quando si apre una settimana nuova: nella Settimana correggi solo le eccezioni — le settimane già create non cambiano.`**
7. Eventuale errore di salvataggio.
8. **`ROTAZIONE DEL PIANO`** + (solo con ciclo > 1) contatore a destra
   **`ORA SEI ALLA {k} DI {n}`**.
9. Scheda: etichetta mono **`OGNI QUANTE SETTIMANE SI RIPETE`** + Segmento a blocco
   **`NESSUNA`** / **`2 SETT.`** / **`3 SETT.`** / **`4 SETT.`**; poi la nota, in due varianti:
   - con `NESSUNA`: **`I piatti ruotano uno dopo l'altro, senza giro fisso. Scegli due o più settimane se il tuo piano si ripete a blocchi: ogni piatto potrà dire a quale settimana appartiene.`**
   - con ciclo > 1: **`Il giro {è cominciato|comincia} lunedì {24 agosto}. Ogni piatto può dire a quale delle {n} settimane appartiene, e in che giorno: chi non lo dice resta buono per tutte.`**
     (data scritta in parole: giorno + mese in minuscolo).
   - e, con ciclo > 1, il tasto leggero 44 px **`RIPARTI DALLA SETTIMANA 1`**, che al primo
     tap diventa **`SICURO? RIPARTI DA LUNEDÌ`**.
10. **`REPERTORIO`** + riga-scheda: titolo **`Ingredienti`**, sottotitolo mono
    **`AREA, CONFEZIONE, COME SI CONSUMA`**, chevron → `/impostazioni/ingredienti`.
11. **`CASA`** + la scheda casa (tre varianti, sotto) + la scheda porzioni:
    titolo **`Per quante persone cucini`**, testo
    **`Moltiplica ogni porzione del piano. Vale se a tavola mangiate tutti la stessa porzione: se no, lascia 1 e scrivi le quantità giuste nei piatti.`**,
    stepper centrato **`−`** / numero (mono 20/700, `aria-label="Porzioni"`) / **`+`**, e
    con più di 1 porzione la nota **`La lista compra per {n}. Le porzioni nel piatto restano quelle scritte.`**
12. **`SUPERMERCATO`** + riga-scheda: griglia 3 colonne di sei quadratini 9 px nei colori
    delle aree **nell'ordine scelto**, titolo **`Ordine dei reparti`**, sottotitolo mono con
    i nomi veri uniti da ` · ` e troncati con ellissi su una riga, chevron →
    `/impostazioni/reparti`.
13. **`DIETA DEL NUTRIZIONISTA`** + riga-scheda: titolo **`Importa la dieta`**, sottotitolo
    mono **`DA FOTO O PDF, SOSTITUISCE IL PIANO ATTUALE`**, chevron → `/importa`.
14. TabBar (**nessuna voce attiva**).

**Scheda CASA, tre varianti** (`SezioneCasa`):
- **Da solo** (`ruolo: 'solo'`): titolo **`Fai la spesa con qualcuno?`**, testo
  **`Chi entra nella tua casa usa i tuoi dati come fossero suoi: vede e cambia lista, piano, dispensa e piatti, e può anche cancellarli. Il suo piano resta da parte finché non esce. Dai il codice solo a chi vive con te.`**,
  tasto pieno 48 px **`CREA UN CODICE`**; dopo la creazione al suo posto il codice a 8
  caratteri (mono 28/700, spaziatura 0.2em, `aria-label="Codice della casa"`) e la nota
  **`Vale un'ora. Dalle sue Impostazioni, l'altra persona lo inserisce qui sotto.`**.
  Sotto la scheda, una riga con campo **`Ho un codice`** (placeholder + aria-label, mono,
  8 caratteri, forzato in maiuscolo) e tasto **`ENTRA`** (96 px).
- **Proprietario:** titolo **`La tua casa`**; una riga per membro con l'email e il tasto
  **`TOGLI`** (due tocchi: diventa **`SICURO?`**); nota
  **`Ognuno spunta dal suo telefono. La lista si aggiorna quando la riapri.`**; e lo stesso
  blocco **`CREA UN CODICE`** / codice generato.
- **Membro** (casa altrui): titolo **`Sei nella casa di {email del proprietario}`**, testo
  **`Vedi e cambi la sua lista, il suo piano e la sua dispensa, come fossero tuoi. I tuoi restano da parte.`**,
  tasto leggero **`ESCI DALLA CASA`** (due tocchi: **`SICURO?`**). **Nessun campo "Ho un
  codice" e nessun `CREA UN CODICE` in questa variante.**

**Elementi interattivi**

| Elemento | Etichetta esatta / aria-label | Cosa fa al tap | Dove porta o cosa cambia | Conferma? | Stato disabilitato |
|---|---|---|---|---|---|
| Freccia header | `Indietro` (aria-label) | `router.back()` | schermata precedente | no | mai |
| Campo nome pasto | `Nome del pasto` (aria-label) | scrive; salva al blur | rinomina il pasto (vuoto → `Pasto`) | no | mai |
| `✕` pasto | `Rimuovi {nome}` (aria-label) | rimuove il pasto | salva subito il nuovo insieme | **no** | con 3 pasti (il minimo): opacità 0,35 |
| Freccia su pasto | `Sposta {nome} in alto` (aria-label) | sposta | riordina e salva | no | sul primo pasto |
| Freccia giù pasto | `Sposta {nome} in basso` (aria-label) | sposta | riordina e salva | no | sull'ultimo pasto |
| Pastiglia giorno | `L M M G V S D`; aria-label `{Lunedì…}, abitualmente fuori casa`; `aria-pressed` | accende/spegne l'assenza abituale | salva subito | no | mai |
| `AGGIUNGI PASTO` | `AGGIUNGI PASTO` | aggiunge un pasto chiamato `Nuovo pasto` | salva subito | no | con 6 pasti (il massimo): opacità 0,35 |
| Segmento rotazione | `NESSUNA` `2 SETT.` `3 SETT.` `4 SETT.` | cambia il ciclo | salva subito e rilegge dal server; disarma RIPARTI | no | mai |
| `RIPARTI DALLA SETTIMANA 1` | `RIPARTI DALLA SETTIMANA 1` → `SICURO? RIPARTI DA LUNEDÌ` | primo tap arma, secondo esegue | riporta l'origine del ciclo al lunedì corrente | **sì, due tocchi** (un tap fuori disarma) | quando l'origine è già il lunedì corrente (opacità 0,35) |
| Riga `Ingredienti` | `Ingredienti` | naviga | `/impostazioni/ingredienti` | no | mai |
| `CREA UN CODICE` | `CREA UN CODICE` | crea un invito a 8 caratteri | mostra il codice al posto del tasto | no | mentre crea |
| Campo codice | `Ho un codice` (placeholder + aria-label) | scrive (forzato in maiuscolo, max 8) | abilita ENTRA | no | mai |
| `ENTRA` | `ENTRA` | entra nella casa | **ricarica l'app** su `/lista` | no | con meno di 8 caratteri (opacità 0,35) o mentre entra |
| `TOGLI` (per membro) | `TOGLI` → `SICURO?` | toglie il membro | rilegge lo stato della casa; senza più membri torna a "da solo" | **sì, due tocchi** | mentre un'altra rimozione è in corso |
| `ESCI DALLA CASA` | `ESCI DALLA CASA` → `SICURO?` | esce dalla casa | **ricarica l'app** su `/lista` | **sì, due tocchi** | mai |
| Stepper `−` | `Diminuisci porzioni` (aria-label) | −1 porzione | salva subito | no | a 1 porzione (minimo) |
| Stepper `+` | `Aumenta porzioni` (aria-label) | +1 porzione | salva subito | no | a 4 porzioni (massimo) |
| Riga `Ordine dei reparti` | `Ordine dei reparti` | naviga | `/impostazioni/reparti` | no | mai |
| Riga `Importa la dieta` | `Importa la dieta` | naviga | `/importa` | no | mai |

**Stati della schermata:**
- **Caricamento:** solo l'header (freccia), nessun contenuto.
- **Errore di caricamento:** **`Non riusciamo a caricare le impostazioni. Riprova più tardi.`**
- **Errore di salvataggio** (pasti, ciclo, porzioni): **`Non siamo riusciti a salvare. Riprova.`**
- **Casa cambiata sotto i piedi** (rifiuto RLS durante una scrittura):
  **`La casa è cambiata: dati ricaricati. Riprova.`** e ricaricamento di tutti i dati.
- **Errore di lettura della casa** (solo se la scheda non è arrivata):
  **`Non riusciamo a leggere la casa. Riprova più tardi.`** — il resto della pagina resta
  usabile.
- **Errori della casa:** **`Non siamo riusciti a creare il codice. Riprova.`** /
  **`Non siamo riusciti a uscire. Riprova.`** / **`Non siamo riusciti a togliere. Riprova.`** /
  per l'entrata, il messaggio del server così com'è quando è scritto per l'utente
  (es. "codice non valido o scaduto", "sei già in una casa: esci prima"), altrimenti
  **`Non siamo riusciti a entrare. Riprova.`**
- **Casa propria vs casa altrui:** vedi le tre varianti sopra. Per un **membro** tutto il
  resto della schermata (pasti, rotazione, porzioni, reparti, import) agisce **sui dati del
  proprietario**, non sui suoi: nessuna etichetta lo dichiara oltre al titolo della scheda.
- **Ciclo = 1 settimana:** sparisce il contatore `ORA SEI ALLA … DI …` e sparisce il tasto
  RIPARTI.
- **Porzioni = 1:** sparisce la nota `La lista compra per …`.

**Testi fissi non ancora citati:** i contatori `{n} DI 6` (pasti) e
`ORA SEI ALLA {k} DI {n}` (rotazione); l'etichetta `OGNI QUANTE SETTIMANE SI RIPETE`;
i nomi dei pasti di default (`Colazione`, `Spuntino`, `Pranzo`, `Cena`) e il nome del pasto
appena creato (`Nuovo pasto`).

**Logout: non esiste.** Una ricerca su tutto `src/` (`signOut`, `logout`) non trova nulla:
non c'è nessun controllo di uscita dall'account in questa schermata né altrove nell'app.
L'unica "uscita" è `ESCI DALLA CASA`, che è un'altra cosa.

**Componenti del design system usati:** Tasti (tasto pieno 48 px `BOTTONE_PIENO`, tasto
leggero 44 px `BOTTONE_LEGGERO`), Segmento a blocco, Scheda, Campo di testo,
Etichetta di sezione (con contatore a destra), Messaggi, riquadro tratteggiato "aggiungi",
Tab bar (senza voce attiva). Lo stepper e le righe-scheda con chevron **non hanno un nome
nel design system §3**.

**Dati mostrati e provenienza:** pasti da `leggiSlotDefs` (se l'utente non ne ha, la pagina
**semina e salva** i quattro di default); impostazioni (ordine aree, settimane del ciclo,
origine del ciclo, moltiplicatore porzioni) da `leggiImpostazioni`; stato della casa (ruolo,
email dei membri) dalla RPC `statoCasa`; la settimana corrente del ciclo è **calcolata**
(`settimanaDelCiclo` su lunedì di oggi e origine); il codice invito viene dal server
(8 caratteri, valido un'ora).

**Note per il redesign:**
- **Niente tasto SALVA in questa schermata:** pasti, ciclo e porzioni si salvano ad ogni
  interazione, in modo ottimistico, con rollback se la scrittura fallisce. L'ordine dei
  reparti è l'eccezione e vive in una sottopagina con il proprio SALVA.
- Le conferme distruttive qui sono **a due tocchi sullo stesso tasto** (`SICURO?`), non
  dialoghi: vale per RIPARTI, TOGLI, ESCI DALLA CASA. Un tap fuori dal tasto disarma.
- La maniglia a tre righe sulle righe pasto è **decorativa**: il riordino è a frecce, non a
  trascinamento.
- Le pastiglie dei giorni hanno **una sola lettera** (`L M M G V S D`, due "M" ripetute) —
  diverse dai chip a tre lettere del Piatto.
- Entrare o uscire da una casa fa un **reload completo** dell'app (`window.location.assign`),
  non una navigazione client.
- Il titolo della schermata non è nell'header ma nel corpo, quindi **scorre via**.

---

## 13. Ingredienti (impostazioni) — `/impostazioni/ingredienti`

**File:** `src/app/(app)/impostazioni/ingredienti/page.tsx`.

**Scopo:** l'unico posto da cui si raggiungono **tutti** gli ingredienti del catalogo,
anche quelli non usati in nessun piatto, per aprirne la scheda e correggerli.

**Come ci si arriva:** riga `Ingredienti` nella sezione `REPERTORIO` di `/impostazioni`.

**Testata:** header ridotto: freccia 23 px → `/impostazioni`
(`aria-label="Torna alle impostazioni"`), etichetta centrale mono **`INGREDIENTI`** in
`--sec`, riquadro vuoto 44×44 a destra. Niente marchio, niente ingranaggio, niente pillola.

**Struttura dall'alto in basso:**
1. Header `INGREDIENTI`.
2. Corpo scorrevole, un gruppo per area (solo le aree non vuote), **nell'ordine dei reparti
   scelto dall'utente**:
   - intestazione di gruppo: quadratino 9 px nel colore dell'area + nome dell'area in mono
     10/700/0.14em + a destra il **conteggio nudo** (solo il numero, mono 9, `--ter`);
   - righe 62 px (raggio 16, bianche): nome 16/700 troncato con ellissi su una riga, e sotto
     la riga mono 8.5 **`{formato} {unità} · {CLASSE}`** con classe fra `PORZIONABILE`,
     `INTERO`, `A STIMA`, più **` · FRESCO`** se l'ingrediente è deperibile; a destra un
     chevron. Gli ingredienti dentro il gruppo sono in ordine alfabetico italiano.
3. Nota finale 12.5: **`Area, formato della confezione e classe decidono cosa finisce in lista e quanto: cambiarli qui cambia le liste da qui in avanti, non quelle già create.`**
4. TabBar (nessuna voce attiva).

**Elementi interattivi**

| Elemento | Etichetta esatta / aria-label | Cosa fa al tap | Dove porta o cosa cambia | Conferma? | Stato disabilitato |
|---|---|---|---|---|---|
| Freccia header | `Torna alle impostazioni` (aria-label) | naviga | `/impostazioni` | no | mai |
| Riga ingrediente | nome dell'ingrediente (testo) | naviga | `/piatti/nuovo/ingredienti/{id}?torna=impostazioni` (editor dell'ingrediente, che tornerà qui) | no | mai |
| Voci TabBar (4) | `LISTA` `SETTIMANA` `PIATTI` `DISPENSA` | naviga | le quattro schermate | no | mai |

**Stati della schermata:**
- **Vuoto (nessun ingrediente):** centrato, **`Nessun ingrediente`** (17/700) e
  **`Nascono dai piatti: il primo che aggiungi a un piatto compare qui.`** (13.5, `--sec`).
  **Nessun tasto** in questo stato.
- **Caricamento:** solo l'header.
- **Errore:** **`Non riusciamo a caricare gli ingredienti. Riprova più tardi.`** (13, `--sec`).
- Non esiste ricerca, non esiste un tasto "nuovo ingrediente": si creano solo dai piatti.

**Testi fissi non ancora citati:** il sottotitolo di riga ha esattamente il formato
`{numero} {g|ml|pz} · {PORZIONABILE|INTERO|A STIMA}[ · FRESCO]`.

**Componenti del design system usati:** Scheda (riga 62 px), Etichetta di sezione (con
quadratino d'area e contatore), Messaggi, Tab bar. Lo stato vuoto qui **non** segue il
pattern canonico (niente scheda centrata, niente icona tratteggiata, niente tasto primario).

**Dati mostrati e provenienza:** catalogo da `leggiIngredienti` (formato confezione, unità
base, classe di residuo, deperibilità, area); ordine dei gruppi da
`impostazioni.ordineAree`.

**Note per il redesign:**
- Il conteggio a destra dell'intestazione di gruppo è **un numero nudo**, senza la parola
  "VOCI" usata altrove.
- La rotta di destinazione è quella dell'editor dentro un piatto, con `dishId` fisso a
  `nuovo` e il parametro `?torna=impostazioni`: è quel parametro a far tornare indietro
  qui. Se il designer sposta l'ingresso, questo aggancio va preservato.
- Lo stato vuoto non offre nessuna azione: è dichiaratamente un vicolo cieco informativo.

---

## 14. Ordine reparti — `/impostazioni/reparti`

**File:** `src/app/(app)/impostazioni/reparti/page.tsx`.

**Scopo:** mettere le sei aree nell'ordine in cui si incontrano camminando nel proprio
supermercato, così la lista della spesa esce in quell'ordine.

**Come ci si arriva:** riga `Ordine dei reparti` nella sezione `SUPERMERCATO` di
`/impostazioni`.

**Testata:** header ridotto: freccia 23 px → `/impostazioni` (link **senza** aria-label),
etichetta centrale mono **`IMPOSTAZIONI`** in `--sec` (non "REPARTI"), riquadro vuoto 44×44
a destra.

**Struttura dall'alto in basso:**
1. Header `IMPOSTAZIONI`.
2. Titolo 32/800 su due righe forzate con `<br>`: **`Ordine`** / **`dei reparti`**.
3. Nota 12.5: **`Mettili nell'ordine in cui li incontri camminando nel tuo supermercato. La lista della spesa comparirà in quest'ordine, così non torni indietro fra le corsie. Le sei aree sono fisse: si cambia solo la sequenza.`**
4. Sei righe-scheda (raggio 16, gap 8), ognuna: numero d'ordine mono (`1`…`6`, in `--ter`),
   icona maniglia 17 px (decorativa), quadratino 12 px nel colore dell'area, nome dell'area
   (15.5/700, nome vero: `ORTOFRUTTA`, `MACELLERIA E PESCHERIA`, …), freccia su 34 px,
   freccia giù 34 px.
5. Etichetta **`ANTEPRIMA DELLA LISTA`** + scheda con sei barrette 26×11 nei colori,
   nell'ordine corrente, e a destra la didascalia mono **`DALL'ALTO IN BASSO`**.
6. Eventuale errore di salvataggio.
7. Tasto primario a piena larghezza (54 px, con ombra): **`SALVA ORDINE`**, che durante la
   scrittura diventa **`SALVATAGGIO…`**.
8. TabBar (nessuna voce attiva).

**Elementi interattivi**

| Elemento | Etichetta esatta / aria-label | Cosa fa al tap | Dove porta o cosa cambia | Conferma? | Stato disabilitato |
|---|---|---|---|---|---|
| Freccia header | — (nessun aria-label) | naviga | `/impostazioni` (**abbandona un riordino non salvato**) | no | mai |
| Freccia su | `Sposta {NOME AREA} in alto` (aria-label) | scambia con la riga sopra | solo stato locale; fondo più chiaro quando non si può | no | sulla prima riga (opacità 0,35, fondo `rgba(20,22,58,0.02)`) |
| Freccia giù | `Sposta {NOME AREA} in basso` (aria-label) | scambia con la riga sotto | solo stato locale | no | sull'ultima riga |
| `SALVA ORDINE` | `SALVA ORDINE` / `SALVATAGGIO…` | salva l'ordine | scrive le impostazioni e naviga a `/impostazioni` | no | mentre salva |
| Voci TabBar (4) | `LISTA` `SETTIMANA` `PIATTI` `DISPENSA` | naviga | le quattro schermate | no | mai |

**Stati della schermata:**
- **Caricamento:** solo l'header.
- **Errore di caricamento:** **`Non riusciamo a caricare l'ordine dei reparti. Riprova più tardi.`**
- **Errore di salvataggio:** **`Non siamo riusciti a salvare l'ordine. Riprova.`** (13, `--sec`),
  e il tasto torna attivo.
- **Salvataggio in corso:** il tasto mostra `SALVATAGGIO…` ed è disabilitato.
- Non esiste stato vuoto: le sei aree sono fisse, l'elenco è sempre lungo sei.

**Testi fissi non ancora citati:** i numeri d'ordine `1`–`6` a sinistra delle righe;
la didascalia `DALL'ALTO IN BASSO` nell'anteprima.

**Componenti del design system usati:** Tasti (Primario con ombra), Scheda, Etichetta di
sezione, Messaggi, Tab bar.

**Dati mostrati e provenienza:** `impostazioni.ordineAree` dal server; nomi e colori delle
aree dal dominio (fissi, non personalizzabili).

**Note per il redesign:**
- Qui **il riordino non si salva da solo**: resta locale finché non si preme `SALVA ORDINE`
  (è l'opposto della pagina Impostazioni, dove ogni tocco scrive). La freccia indietro
  butta via il riordino senza avvisare.
- Il marchio dell'app **non segue** quest'ordine: usa un ordine proprio fisso
  (`ORDINE_MARCHIO`).
- Il titolo è spezzato su due righe a mano (`<br>`), non per larghezza disponibile.

---

## 15. Importa la dieta (wizard) — `/importa`

**File:** `src/app/(app)/importa/page.tsx`, `Camera.tsx`, `Formati.tsx`, `Revisione.tsx`;
testi di errore del server in `src/app/api/import/estrai/route.ts`.

**Scopo:** trasformare le pagine della dieta del nutrizionista (foto o PDF) in piatti,
grammature e ingredienti del repertorio: si acquisisce, il modello estrae, l'utente rivede
pasto per pasto, completa i formati di confezione, e al riepilogo **sostituisce il piano
attuale**.

**Come ci si arriva:** riga `Importa la dieta` nella sezione `DIETA DEL NUTRIZIONISTA` di
`/impostazioni`; porta `IMPORTA LA DIETA` dallo stato vuoto di `/piatti`.

**Testata:** `Testata` in **modalità `indietro`**: titolo **`Importa la dieta`** (52/800, va
a capo su più righe), freccia di ritorno a `/impostazioni` (`aria-label="Indietro"`) al
posto del marchio, **niente ingranaggio**, **niente pillola settimana**. La testata è la
stessa in **tutti** i passi del wizard.

**Struttura dall'alto in basso, passo per passo:**

**8a. Caricamento iniziale**
1. Solo la Testata. Nessun testo.

**8b. Ripresa di una bozza** (se esiste un import già estratto in attesa)
1. Scheda: titolo **`Hai un import in corso`**, testo
   **`C'è una dieta già estratta in attesa di revisione: puoi riprenderla da dove l'hai lasciata, oppure ricominciare da capo.`**,
   due tasti 48 px: **`RICOMINCIA`** (contornato) e **`RIPRENDI`** (ink pieno).
2. Toccando RICOMINCIA la scheda si sostituisce con la conferma: titolo
   **`Ricominciare da capo?`**, testo
   **`La bozza salvata andrà persa: la revisione fatta finora non si recupera più.`**,
   tasti **`ANNULLA`** e **`Sì, ricomincia`** (testo in minuscolo, unico caso insieme a
   `Sì, sostituisci`).

**8c. Acquisizione**
1. Segmento a **blocco**: **`FOTO`** / **`PDF`**.
2. Ramo **FOTO** → componente `Camera`:
   - se la fotocamera è disponibile: `<video>` a piena larghezza (raggio 14, fondo nero),
     tasto tondo 48 px **`Scatta`** (reso in maiuscolo: `SCATTA`), poi il tasto pillola
     **`DALLA GALLERIA`** (40 px; centrato e contornato in questo ramo);
   - se non è disponibile: riquadro con il testo
     **`La fotocamera non è disponibile: scegli le foto dei fogli dalla galleria`** e dentro
     il tasto **`DALLA GALLERIA`** (qui in versione piena ink, allineato a sinistra);
   - eventuale avviso (`role="status"`), uno o più uniti da ` · `:
     **`al massimo 12 fogli`**, **`al massimo 12 fogli: {k} foto in più scartata|scartate`**,
     **`{k} foto non leggibile|leggibili, scartata|scartate`**;
   - striscia orizzontale di miniature 84×84: sotto ognuna la didascalia **`pag. {i}`**
     (e `alt="pag. {i}"`), e tre tasti testuali **`◀`** **`✕`** **`▶`**.
   - Stato iniziale del componente (prima che l'effetto decida fra camera e fallback): un
     riquadro vuoto alto 160 px.
3. Ramo **PDF**: un `<label>` (raggio 14, bianco) che mostra **`Scegli il PDF della dieta`**
   oppure il nome del file scelto, con dentro un **input file nativo visibile**
   (`aria-label="scegli il PDF della dieta"`).
4. Tasto primario 54 px: **`ESTRAI LA DIETA`**.

**8d. Estrazione in corso**
1. Solo la Testata + un paragrafo centrato 14 in `--sec`: **`Sto leggendo la dieta…`**
   Nessuna barra di avanzamento, nessuno spinner, nessun modo di annullare.

**8e. Rifiuto (dieta di soli macro)**
1. Scheda: titolo 19/700 **`Questa dieta non ha un menu`**; poi la **motivazione del
   modello** (14, `--ink`); poi la spiegazione fissa
   **`Prescrive obiettivi nutrizionali, non alimenti: Spesa costruisce la lista dai piatti, e qui non ci sono piatti da cui partire.`**;
   poi il tasto contornato 48 px **`TORNA A IMPOSTAZIONI`** → `/impostazioni`.

**8f. Errore**
1. Scheda: il messaggio (14, `--ink`) + tasto ink 48 px **`RIPROVA`** (riporta
   all'acquisizione, con le foto già scelte ancora in memoria). Messaggi possibili:
   - **`L'estrazione non è disponibile su questo ambiente.`** (503)
   - **`Non ho capito la dieta: riprova, magari con foto più nitide.`** (422)
   - **`Serve l'accesso: riapri l'app ed entra di nuovo.`** (401 o sessione assente)
   - **`Non siamo riusciti a leggere la dieta. Riprova.`** (generico, e fallback quando il
     corpo della risposta non si legge)
   - testo del server mostrato così com'è per 400 / 413 / 429:
     **`richiesta non valida`**, **`il PDF non si apre: prova con le foto`** (400),
     **`file troppo grandi, riprova con foto più leggere`**,
     **`troppe pagine: la v1 accetta fino a 12 foto`** (413),
     **`hai già fatto {limite} import negli ultimi 30 giorni: il prossimo dal {gg/mm/aaaa}`** (429).

**8g. Revisione pasto per pasto** (`Revisione.tsx`)
1. Barra di navigazione: tasto tondo 36 px `◀` (`aria-label="Giorno precedente"`), al centro
   l'etichetta 14.5/700 in una di due forme:
   - **`{Lunedì…} — giorno {i} di {n} · settimana {s} di {m}`**
   - **`{titolo dello scenario} — scenario {i} di {n}`** (archetipo "giorni tipo")
   e tasto tondo 36 px `▶` (`aria-label="Giorno successivo"`).
2. Una `section` per ogni pasto del giorno:
   - **non confermato** (scheda bianca raggio 18): nome del pasto capitalizzato (15/700),
     `select` 40 px (`aria-label="Slot per {nomeOriginale}"`) con la voce
     **`— scegli —`** finché nulla è assegnato e poi i nomi dei pasti dell'utente; per ogni
     piatto: campo nome (16/700, `aria-label="Nome del piatto {i}"`) e `✕`
     (`Elimina piatto {i}`); per ogni riga, l'editor di riga (sotto); i componenti con il
     nome in mono (o **`Componente senza nome`**) più l'eventuale **nota** in corsivo dopo
     un ` · `, e fra le opzioni la parola **`oppure`** in corsivo; in fondo il tasto 44 px
     **`CONFERMA PASTO`**.
   - **confermato** (collassato in un tasto bianco): **`✓ {Nome pasto} — {piatto1} / {piatto2}`**
     oppure **`✓ {Nome pasto} — pasto rimosso`**; toccarlo riapre il pasto.
   - **pasto svuotato**: testo **`Pasto rimosso: nessun piatto da creare per questo giorno.`**
3. Editor di riga (`RigaEditor`): campo alimento (`aria-label="Alimento: {alimento}"`),
   campo numerico quantità (`Quantità di {alimento}`, larghezza 60), `select` unità
   (`Unità di {alimento}`) con le voci **`—`**, **`g`**, **`ml`**, **`pz`**, e `✕`
   (`Elimina riga: {alimento}`); sotto, il **testo originale** estratto (11.5, `--ter`); e,
   quando serve, l'avviso `aria-live="polite"` in `#C77700`:
   **`quantità da indicare`** (riga non risolta) o **`quantità proposta: controllala`**
   (quantità inferita). La riga in avviso ha bordo 1,5 px `#C77700` e fondo
   `rgba(199,119,0,0.06)`.
4. Conferma dell'ultimo piatto di un pasto (in linea, non un dialogo): testo
   **`È l'ultimo piatto del pasto: eliminarlo rimuove il pasto intero da questo giorno.`**
   con i due tasti testuali **`ELIMINA IL PASTO`** e **`ANNULLA`**.
5. In fondo, **solo quando tutto il piano è pronto**, il tasto primario 54 px
   **`VAI AI FORMATI`**.

**8h. Formati** (`Formati.tsx`)
1. Una `section` per ogni ingrediente non abbinato: etichetta mono
   **`DALLA DIETA: {alimento}`**; campo nome 42 px (15/700,
   `aria-label="Nome dell'ingrediente: {alimento}"`); griglia a due colonne di campi con
   etichetta mono in maiuscolo: **`UNITÀ BASE`** (`g`/`ml`/`pz`), **`AREA`** (i sei nomi
   veri), **`CLASSE RESIDUO`** a tutta larghezza (opzioni **`Porzionabile`**, **`Intero`**,
   **`A stima`** — qui in minuscolo, non in maiuscolo come nell'editor ingrediente),
   **`FORMATO CONFEZIONE`** (numero + unità), **`PREZZO`** con il suffisso in minuscolo
   **`facoltativo`** (campo testo + **`€`**); poi la riga-interruttore 40 px
   **`Deperibile`** (`aria-pressed`, `aria-label="Deperibile: {alimento}"`); e, se esistono
   ingredienti con la stessa unità base, l'etichetta **`È LO STESSO DI…`** con un `select`
   la cui prima voce è **`Usa l'ingrediente esistente`**.
2. Tasto primario 54 px: **`VAI AL RIEPILOGO`**.
3. Se non c'è nulla da rivedere: **`Tutti gli ingredienti del piano abbinano già qualcosa che hai in repertorio: niente da rivedere qui.`**

**8i. Riepilogo**
1. Scheda (14.5, `--ink`) con il conto esatto:
   **`{n} piatti su {m} settimane · {k} ingredienti nuovi · {x} piatti del piano attuale verranno disattivati`**.
2. Tasto primario 54 px **`SOSTITUISCI IL PIANO`**.
3. Toccandolo compare, sopra al tasto (che scompare), la scheda di conferma: titolo
   **`Sostituire il piano attuale?`**, testo
   **`I piatti del nutrizionista non più presenti nella nuova dieta verranno disattivati; questa azione non si annulla.`**,
   tasti **`ANNULLA`** e **`Sì, sostituisci`**.
4. Esiti: al successo si naviga a **`/settimana`**. In errore:
   **`Qualcosa si è fermato: riprova, l'import riprende da dove era.`** (e i due tasti
   restano disabilitati finché le scritture non sono ricalcolate).
5. Bozza incompleta: scheda con titolo **`C'è ancora qualcosa da sistemare`**, il messaggio
   esatto dell'errore di dominio, e il tasto **`TORNA ALLA REVISIONE`**.
6. Errore di preparazione: **`Non siamo riusciti a preparare il riepilogo. Riprova più tardi.`**

**Elementi interattivi**

| Elemento | Etichetta esatta / aria-label | Cosa fa al tap | Dove porta o cosa cambia | Conferma? | Stato disabilitato |
|---|---|---|---|---|---|
| Freccia in testata | `Indietro` (aria-label) | naviga | `/impostazioni` (esce dal wizard; la bozza resta salvata) | no | mai |
| Ripresa: `RICOMINCIA` | `RICOMINCIA` | apre la conferma | scheda `Ricominciare da capo?` | **sì** | mai |
| Ripresa: `RIPRENDI` | `RIPRENDI` | riprende la bozza | passo salvato nella bozza | no | mai |
| Conferma ripresa: `ANNULLA` | `ANNULLA` | torna alla scheda precedente | nessun cambiamento | — | mai |
| Conferma ripresa: `Sì, ricomincia` | `Sì, ricomincia` | cancella la bozza | passo acquisizione | è la conferma | mai |
| Segmento modalità | `FOTO` / `PDF` | cambia modalità | solo il payload della tab attiva viene inviato | no | mai |
| `Scatta` | `Scatta` (reso `SCATTA`) | scatta e accoda una pagina | nuova miniatura | no | finché lo stream non c'è (`disabled`) |
| `DALLA GALLERIA` | `DALLA GALLERIA`; input nascosto con `aria-label="scegli le foto dalla galleria"` | apre il selettore file | accoda fino a 12 pagine totali | no | mai |
| `◀` miniatura | `sposta pag. {i} a sinistra` (aria-label) | sposta la pagina | ordine delle pagine | no | sulla prima pagina |
| `✕` miniatura | `elimina pag. {i}` (aria-label) | elimina la pagina | pagina via | **no** | mai |
| `▶` miniatura | `sposta pag. {i} a destra` (aria-label) | sposta la pagina | ordine delle pagine | no | sull'ultima pagina |
| Input file PDF | `scegli il PDF della dieta` (aria-label) | scegli il file | il nome sostituisce `Scegli il PDF della dieta` | no | mai |
| `ESTRAI LA DIETA` | `ESTRAI LA DIETA` | invia al server ed estrae | passo estrazione, poi bozza/rifiuto/errore | no | con 0 foto (tab FOTO) o nessun PDF (tab PDF): fondo `--bordo`, testo `--sec` |
| Rifiuto: `TORNA A IMPOSTAZIONI` | `TORNA A IMPOSTAZIONI` | naviga | `/impostazioni` | no | mai |
| Errore: `RIPROVA` | `RIPROVA` | torna all'acquisizione | passo acquisizione (foto conservate) | no | mai |
| Revisione: `◀` | `Giorno precedente` (aria-label) | va al giorno precedente | salva le modifiche pendenti come correzioni | no | sul primo giorno |
| Revisione: `▶` | `Giorno successivo` (aria-label) | va al giorno successivo | idem | no | sull'ultimo giorno |
| Revisione: select pasto | `Slot per {nomeOriginale}` (aria-label) | assegna il pasto dell'app | salva la mappatura nella bozza | no | mai |
| Revisione: campo nome piatto | `Nome del piatto {i}` (aria-label) | scrive | correzione locale, salvata alla conferma/cambio giorno | no | mai |
| Revisione: `✕` piatto | `Elimina piatto {i}` (aria-label) | elimina; se è l'ultimo del pasto chiede conferma in linea | piatto via, o pasto svuotato | **sì solo per l'ultimo piatto** | mai |
| Revisione: `ELIMINA IL PASTO` | `ELIMINA IL PASTO` | svuota il pasto | nessuna scrittura per quel pasto | è la conferma | mai |
| Revisione: `ANNULLA` (in linea) | `ANNULLA` | chiude la conferma | nessun cambiamento | — | mai |
| Revisione: campo alimento | `Alimento: {alimento}` (aria-label) | scrive | nome dell'alimento nella riga | no | mai |
| Revisione: campo quantità | `Quantità di {alimento}` (aria-label) | scrive | quantità; vuoto azzera anche l'unità | no | mai |
| Revisione: select unità | `Unità di {alimento}` (aria-label) | sceglie | `g`/`ml`/`pz` o nessuna (`—`) | no | mai |
| Revisione: `✕` riga | `Elimina riga: {alimento}` (aria-label) | elimina la riga | riga via dal piatto | **no** | mai |
| Revisione: `CONFERMA PASTO` | `CONFERMA PASTO` | conferma il pasto | il pasto collassa; salva nella bozza | no | quando una riga del pasto ha quantità o unità non risolta |
| Revisione: pasto confermato | `✓ {nome} — {piatti}` | riapre il pasto | lo toglie dai confermati | no | mai |
| Revisione: `VAI AI FORMATI` | `VAI AI FORMATI` | passa al passo formati | `passo: 'formati'` | no | il tasto **non esiste** finché tutto il piano non è confermato e mappato |
| Formati: campo nome | `Nome dell'ingrediente: {alimento}` (aria-label) | scrive | nome dell'ingrediente da creare | no | mai |
| Formati: select unità base | `Unità base di {alimento}` (aria-label) | sceglie | unità base | no | mai |
| Formati: select area | `Area di {alimento}` (aria-label) | sceglie | area | no | mai |
| Formati: select classe | `Classe residuo di {alimento}` (aria-label) | sceglie | classe di residuo | no | mai |
| Formati: campo formato | `Formato confezione di {alimento}` (aria-label) | scrive | formato confezione | no | mai |
| Formati: campo prezzo | `Prezzo di una confezione di {alimento}` (aria-label) | scrive | prezzo (facoltativo) | no | mai |
| Formati: interruttore | `Deperibile: {alimento}` (aria-label), `aria-pressed` | inverte | deperibilità | no | mai |
| Formati: select "è lo stesso di" | `Usa l'ingrediente esistente per {alimento}` (aria-label) | rinomina la proposta col nome esatto dell'esistente | l'ingrediente non verrà creato, si aggancia a quello | no | la sezione compare solo se esistono ingredienti con la stessa unità base |
| Formati: `VAI AL RIEPILOGO` | `VAI AL RIEPILOGO` | passa al riepilogo | `passo: 'riepilogo'` | no | se un nome è vuoto, un formato non è positivo, o un prezzo è presente e non positivo |
| Riepilogo: `SOSTITUISCI IL PIANO` | `SOSTITUISCI IL PIANO` | apre la conferma | scheda `Sostituire il piano attuale?` | **sì** | finché le scritture non sono calcolate |
| Riepilogo: `ANNULLA` | `ANNULLA` | chiude la conferma | torna al riepilogo | — | mentre esegue |
| Riepilogo: `Sì, sostituisci` | `Sì, sostituisci` | esegue l'import | scrive tutto e naviga a `/settimana` | è la conferma | mentre esegue, o finché le scritture non sono ricalcolate dopo un errore |
| Riepilogo: `TORNA ALLA REVISIONE` | `TORNA ALLA REVISIONE` | torna al passo revisione | `passo: 'revisione'` | no | mai |

**Stati della schermata:** caricamento (sola Testata); ripresa; acquisizione;
estrazione in corso; rifiuto; errore (con i testi elencati in 8f, compresi 400/413/429 del
server mostrati letteralmente); bozza nei tre passi (revisione, formati, riepilogo);
riepilogo con bozza incompleta; riepilogo con errore di esecuzione. Non c'è uno stato vuoto:
la schermata parte sempre dall'acquisizione.

**Testi fissi non ancora citati:** le didascalie `pag. {i}` sulle miniature; l'etichetta
`DALLA DIETA: {alimento}`; la nota `facoltativo` accanto a `PREZZO`; la parola `oppure`
fra le opzioni in revisione; `Componente senza nome`.

**Componenti del design system usati:** Testata (modalità `indietro`), Segmento a blocco,
Scheda, Tasti (Primario 54 px, tasto 48 px pieno e contornato nelle conferme, tasto spento
con fondo `--bordo` per ESTRAI LA DIETA disabilitato), Campo di testo, Etichetta di sezione,
Avviso in linea (`#C77700`, `aria-live="polite"`), Messaggi, Tab bar (nessuna voce attiva).
I `select` nativi, il `<video>`, le miniature e i tasti `◀ ✕ ▶` **non hanno un componente
nel design system §3**.

**Dati mostrati e provenienza:**
- dall'utente: foto scattate o scelte, PDF, tutte le correzioni di nomi, quantità, unità,
  mappature pasto, formati, prezzi, deperibilità;
- **dal modello** (via `/api/import/estrai`): la struttura del piano (settimane, giorni,
  pasti, piatti, righe con alimento/quantità/unità), il `testoOriginale` di ogni riga, il
  flag `quantitaInferita`, e la `motivazione` in caso di rifiuto;
- dal server: i messaggi di errore 400/413/429 (compresa la data del prossimo import
  disponibile) e l'esito delle scritture;
- dai dati dell'utente: i nomi dei pasti (`leggiSlotDefs`), il catalogo ingredienti
  (`leggiIngredienti`) per l'abbinamento e per "è lo stesso di…", il repertorio
  (`leggiRepertorio`) per contare i piatti da disattivare;
- dal dominio: le proposte di formato tipico (`src/domain/import/formati-tipici.ts`).

**Note per il redesign:**
- **Il tetto è 12 pagine** e vale sia per le foto sia per le pagine del PDF; le eccedenti si
  scartano con un avviso, non con un errore.
- Il tasto `DALLA GALLERIA` **cambia aspetto fra i due rami**: contornato e centrato con la
  fotocamera attiva, pieno ink e allineato a sinistra nel fallback. L'input file vero è
  nascosto dietro la label (1×1 px, opacità 0, `clipPath`), mentre nel ramo PDF **l'input
  nativo è visibile**: sono due trattamenti diversi dello stesso controllo.
- `VAI AI FORMATI` **non è un tasto disabilitato: non esiste** finché il piano non è tutto
  confermato. `VAI AL RIEPILOGO` invece esiste sempre e si spegne.
- Nel riepilogo il tasto primario **sparisce** quando si apre la conferma: i due tasti della
  conferma lo sostituiscono.
- Le due conferme del wizard usano un testo in minuscolo (`Sì, ricomincia`, `Sì, sostituisci`)
  invece del maiuscolo mono di tutti gli altri tasti.
- La revisione è l'unica parte dell'app che usa `<select>` nativi e l'unica che usa il
  colore d'avviso `#C77700`.
- Un errore di estrazione **non perde le foto**: `RIPROVA` torna all'acquisizione con la
  galleria già popolata.

---

## 16. Entra (login) — `/entra`, e la home `/`

**File:** `src/app/entra/page.tsx`; redirect in `src/app/page.tsx`; guardia in
`src/proxy.ts`; scambio del codice in `src/app/auth/callback/route.ts`.

**Scopo:** entrare nell'app con un link via email (magic link, senza password). È la sola
schermata raggiungibile senza sessione.

**Come ci si arriva:** **redirect automatico** del proxy: qualunque rotta diversa da
`/entra` e `/auth/*` chiesta senza sessione rimanda qui. La home `/` non ha contenuto: fa
`redirect('/lista')`, e da lì il proxy rimanda a `/entra` se manca la sessione. Da
`/auth/callback` si arriva qui con `?errore=link-non-valido` o `?errore=accesso-fallito`
quando lo scambio del magic link fallisce.

**Testata:** **nessuna**. Non c'è `Testata`, non c'è marchio, non c'è pillola settimana,
non c'è ingranaggio, **non c'è TabBar** (la pagina sta fuori dal gruppo `(app)`). Al posto
della testata, il titolo centrato **`Spesa`** (52/800, spaziatura -0.05em).

**Struttura dall'alto in basso:**
1. Contenuto centrato verticalmente sul fondo `--fondo`, padding `px-6 py-12`, gap 10.
2. Titolo **`Spesa`**.
3. Modulo (max 24rem, gap 4):
   - `<label class="sr-only">` **`Email`** (solo per lo screen reader);
   - campo email 52 px (raggio 18, bordo `--bordo`, fondo `--superficie`): placeholder
     **`La tua email`**, `type="email"`, `required`, `autoComplete="email"`;
   - tasto 52 px (raggio 18, ink pieno, testo `--superficie`, ombra
     `0 3px 10px rgba(20,22,58,0.24)`): **`Entra con un link`**, che durante l'invio diventa
     **`Invio in corso…`**;
   - eventuale messaggio di errore (14, `--ink-2`).
4. Dopo l'invio riuscito, il modulo **scompare** e resta solo il paragrafo centrato 18:
   **`Controlla la posta.`**

**Elementi interattivi**

| Elemento | Etichetta esatta / aria-label | Cosa fa al tap | Dove porta o cosa cambia | Conferma? | Stato disabilitato |
|---|---|---|---|---|---|
| Campo email | label `Email` (sr-only), placeholder `La tua email` | scrive l'indirizzo | valore del modulo | no | mai |
| `Entra con un link` | `Entra con un link` / `Invio in corso…` | invia il magic link all'email | il modulo si sostituisce con `Controlla la posta.` | no | mentre invia (`disabled`, opacità 0,6) |

**Stati della schermata:**
- **Iniziale:** titolo + modulo.
- **Invio in corso:** tasto disabilitato con testo `Invio in corso…`.
- **Inviata:** solo **`Controlla la posta.`** (non si torna al modulo senza ricaricare).
- **Errore di invio:** **`Non siamo riusciti a inviare il link. Riprova.`**
- **Arrivo da un link non valido** (`?errore=link-non-valido`):
  **`Questo link non è valido. Richiedine uno nuovo qui sotto.`**
- **Arrivo da uno scambio fallito** (`?errore=accesso-fallito`):
  **`Non siamo riusciti a completare l'accesso. Richiedi un nuovo link.`**
- **Codice di errore sconosciuto:** **`Non siamo riusciti a completare l'accesso. Riprova.`**

**Testi fissi non ancora citati:** nessuno; questa schermata ha solo i testi sopra.

**Componenti del design system usati:** Tasti (Primario, qui 52 px invece di 54 — misura
propria di questa schermata), Campo di testo (52 px, raggio 18 invece di 44/14), Messaggi.
È l'unica schermata scritta con classi Tailwind invece che con stili inline.

**Dati mostrati e provenienza:** solo l'email digitata dall'utente; lo stato di invio e
l'errore arrivano dal client Supabase (`signInWithOtp`), il codice d'errore in query string
da `/auth/callback`.

**Note per il redesign:**
- Il titolo `Spesa` qui è **il marchio testuale**, non la griglia di quadrati: il logo
  6-caselle non compare mai in questa schermata.
- Misure fuori scala rispetto al resto dell'app: campi e tasti **52 px** con raggio **18**
  (altrove 44/14 per i campi, 54/18 per i tasti).
- Il testo dell'errore è in `--ink-2`, non in `--sec` come negli errori delle altre pagine.
- La home `/` non è una schermata: è solo un redirect a `/lista`.

---

---

## Dove il codice non rispetta ancora il design system

Fatti letti nel codice il 19/09, da tenere presenti perché Claude Design partirà dal
design system, non dal codice: qui il redesign è già deciso, va solo applicato.

| Fatto nel codice | Regola del design system | Schermate |
|---|---|---|
| Titoli passati a `Testata`: `Spesa`, `Settimana`, `Piatti`, `Importa la dieta` in sentence case | §2.4: una parola sola in maiuscolo (`LISTA`, `SETTIMANA`, `PIATTI`) | 1, 2, 4, 8, 15 — **chiusa il 20/09 dal guscio comune** |
| Nessuna azione irreversibile della parte spesa ha un dialogo: `CHIUDI LA SPESA`, `SOSTITUISCI`, `AGGIORNA`, eliminazione di un lotto Pronti sono un tap | §4 Conferme: dialogo a due tasti | 2, 3, 5, 6 |
| Conferme in Impostazioni a due tocchi sullo stesso tasto (`SICURO?`) | §4: dialogo a due tasti | 12 |
| `ELIMINA` nei dialoghi di Piatto e Ingrediente è in ink pieno | §3 Tasti: distruttivo pieno in `--errore` | 10, 11 |
| Dispensa, Piatti veloce, Impostazioni, Ingredienti, Ordine reparti **non usano `Testata`**: header ridotto proprio, con freccia | §3 Testata: marchio + titolo 52 sulle radice, freccia sulle figlie | 6, 9, 12, 13, 14 |
| Dispensa è una voce di tab bar ma ha la freccia verso `/impostazioni` | una pagina radice non ha freccia | 6 — **chiusa il 20/09 dal guscio comune** |
| Quattro controlli senza nome accessibile: frecce di Piatto in modifica, Ingrediente, Ordine reparti; interruttore DEPERIBILE | §4 Accessibilità: ogni controllo ha un nome | 10, 11, 14 |
| Errori e note tutti in `--sec`; congelato `#4A90D9`; grigi decorativi letterali | §2.1 e §2.3: `--testo-2`, `--errore`, `--freddo`, `--icona-spenta` | tutte — **i cinque token sono in globals.css dal 20/09; i letterali nei file restano** |
| Nessun logout in tutta l'app | non è una regola del design system: è una feature mancante (nel backlog dal 15/09) | 12 |
| `/entra` è l'unica schermata in Tailwind, misure 52/18 fuori scala | §2.4–2.6 | 16 |
| Input file nativo visibile nel ramo PDF dell'import | §3 Campo: input nascosto dietro label-bottone | 15 |
| `BASE`/`TOP-UP` in Lista è un selettore locale, non il Segmento a blocco | §3 Segmento | 1 |

## Non determinato dal codice (dichiarato, non inventato)

Dalla prima metà (schermate 1–7):
1. **Titoli di schermata in maiuscolo.** Il design system (§2.4) dice che i titoli di
   schermata sono una parola sola in maiuscolo (`LISTA`, `SETTIMANA`, `DISPENSA`). Il
   codice passa a `Testata` le stringhe **`Spesa`** e **`Settimana`** (sentence case) e il
   componente non le trasforma. A schermo si legge `Spesa` su `/lista` e `/lista/fatta`, e
   `Settimana` su `/settimana`. Non so quale delle due sia la volontà attuale di Andrea:
   va deciso, non assunto.
2. **`Segmento.tsx` in Lista.** La consegna lo elencava fra i componenti della Lista: nel
   codice la Lista **non lo importa**. `Segmento` è usato da Impostazioni, Importa, Piatti,
   Piatto, Piatto veloce e Ingrediente. Il selettore `BASE`/`TOP-UP` è il componente locale
   `SelettoreTab` in `lista/page.tsx`, con una forma diversa da entrambe le varianti del
   Segmento (blocco attivo `flex:1` + blocco spento da 96 px).
3. **Header della Dispensa.** La Dispensa è una voce della tab bar ma ha l'header delle
   sottopagine di Impostazioni, con la freccia verso `/impostazioni`. Non so se è una
   scelta o un residuo: nel codice c'è solo il commento «Stesso header delle altre
   sottopagine di /impostazioni».
4. **Ramo fotocamera dello Scanner.** Il codice dichiara esplicitamente che il ramo camera
   non è testato in jsdom (`BarcodeDetector` e `getUserMedia` non esistono lì) e che la
   piattaforma di riferimento è Chrome Android. Come si veda il video su iOS o desktop non
   è determinabile dal codice: lì resta il campo per scrivere il codice.
5. **Token nuovi decisi il 17/09** (`--testo-2`, `--avviso`, `--errore`, `--freddo`,
   `--icona-spenta`): il documento li dichiara approvati ma «da aggiungere a `globals.css`
   alla prima modifica utile». Nelle schermate di questo inventario i colori sono ancora i
   letterali vecchi (errori e note in `--sec`, congelato `#4A90D9`, grigi decorativi
   `#C4C4CE`/`#BFBFC9`/`#B6B6C0`). Non ho verificato `globals.css`: qui riporto quello che
   fanno i file delle schermate.
6. **Numero di pasti configurati.** Striscia dei giorni e righe pasto sono generate dagli
   `slotDefs` dell'utente («da 3 a 5» nel commento di `StrisciaGiorni`, «i pasti
   configurabili salgono da cinque a sei» nel README). Il numero esatto per l'utente reale
   non è nel codice: il redesign deve reggere da 3 a 6 righe.
7. **Tutto il resto è determinato.** La soglia della nota AI, che nella prima stesura
   avevo lasciato aperta, è verificata: `CONFIDENCE_SOGLIA = 0.9` in
   `src/domain/dispensa-ai.ts` — `confidence ≥ 0,9` si applica subito con `Annulla`,
   sotto finisce in `DA CONFERMARE`.

Dalla seconda metà (schermate 8–16):
1. ~~Il testo di `IngredienteInUsoError`~~ verificato: la classe in `src/data/repertorio.ts:218`
   non porta un messaggio proprio; il testo mostrato è quello composto dalla schermata
   Ingrediente (vedi §11).
2. ~~I messaggi SQL della casa condivisa~~ verificati in `supabase/migrations/0012_*.sql`,
   mostrati così come arrivano: `sei già in una casa: esci prima di invitare` · `hai già
   una casa con altre persone: toglile prima di entrare altrove` · `sei già in una casa:
   esci prima` · `codice non valido o scaduto` · `non puoi entrare nella tua stessa casa` ·
   `questa casa non può ospitare: chi ti ha invitato è a sua volta in un'altra casa` ·
   `nessun membro con questo id nella tua casa` · `non autenticato`.
3. **Il limite di import mostrato nel messaggio 429**: il testo è
   `hai già fatto {limite} import negli ultimi 30 giorni: il prossimo dal {data}` dove
   `limite` viene da `IMPORT_LIMITE_30GG` (il README dice default 3). Il numero visto da
   Andrea in produzione dipende dalla variabile d'ambiente: non è determinabile dal codice.
4. **Il colore/aspetto reale dello stato "premuto" e degli hover**: nel codice non ci sono
   stili `:active`/`:hover` per questi controlli (solo `--ink-2` come colore hover dei link,
   dichiarato nei token). Non so dire come rispondono al tocco oltre al cambio di stato del
   dato.
5. **`aria-label` mancanti che ho segnato come "—"**: la freccia indietro dell'header di
   `/piatti/[id]` in modifica, quella di `/piatti/[id]/ingredienti/[ingId]`, quella di
   `/impostazioni/reparti` e l'interruttore DEPERIBILE dell'editor ingrediente **non hanno
   un nome accessibile** nel codice (sono link/bottoni con sola icona). L'ho riportato come
   fatto, non come scelta di design.
6. **Nomi dei pasti diversi dai default**: tutte le etichette che dicono "nome del pasto"
   sono dati dell'utente. Nell'inventario uso i quattro default seminati
   (`Colazione`, `Spuntino`, `Pranzo`, `Cena`), che è ciò che il codice scrive al primo
   avvio — non una scelta di copy.
7. **Il testo della `motivazione` del rifiuto import** e i `testoOriginale` delle righe in
   revisione vengono dal modello: non esistono nel codice e cambiano ad ogni dieta.

## Conteggi

- 16 schermate (7 + 9), 6 passi del wizard Importa descritti come viste separate.
- 218 righe nelle tabelle "Elementi interattivi" (80 + 138), la tab bar contata una volta
  per schermata.
- Foglio dal basso: 13 voci con condizione; scheda AI della Dispensa: 18 voci con
  condizione.
