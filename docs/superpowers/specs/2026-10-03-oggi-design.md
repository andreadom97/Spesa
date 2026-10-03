# Oggi: la home di Dispesa

**Obiettivo:** quando apri l'app in un giorno qualunque, la prima schermata risponde a «cosa faccio
adesso?» senza tocchi: il prossimo pasto, cosa puoi mangiare al suo posto con quello che hai, e
cosa chiede un'azione in dispensa. Oggi l'app si apre sulla Lista (`start_url` `/lista`), che
serve il giorno della spesa.

Ha funzionato se:
- l'app installata si apre su `/oggi` e il poster mostra il pasto giusto per l'ora, senza
  tocchi;
- con la dispensa non aggiornata la home non mostra **nessun** numero che venga dalla dispensa
  (né proposte, né scadenze, né Pronti, né «manca»);
- «Scambia» passa da `aggiornaSlot` come Scegli, e la dispensa si corregge da sola (storno);
- nessuna migrazione, e le schermate esistenti si comportano come prima.

**Le decisioni di Andrea (03/10), dal brainstorming con i mockup:**
1. **Home operativa, niente statistiche.** Né calorie (escluse da DESIGN.md §1 e dal backlog), né
   aderenza al piano: il modello registra «mangiato salvo eccezione», e in produzione 233 pasti
   passati hanno 0 saltati e 3 spunte in tutto [misurato il 03/10], quindi un'aderenza uscirebbe
   ~100% per costruzione.
2. **Tab nuova «Oggi», prima voce della barra**, e l'app parte da lì. Barra a 4 voci: Oggi ·
   Lista · Piano · Dispensa.
3. **Il prossimo pasto si ricava dall'ora con fasce stimate dal nome**, senza impostazioni né
   migrazione (§B.2).
4. **Dal prossimo pasto:** cambiare piatto (Scegli), segnare com'è andata (foglio azioni del
   pasto), e **proposte spontanee «con quello che hai»**, utili soprattutto a chi non ha
   caricato una dieta.
5. **Fattibile = tutto in casa, poi «manca solo una cosa»**, al massimo 2 proposte.
6. **In home, della dispensa:** cosa scade presto, cosa scongelare, i Pronti. Ogni blocco
   sparisce quando è vuoto.
7. **Forma: C2b «Bento»** con le alternative **B1 «Carte chiare»** in un carosello dentro il
   poster (mockup in `.superpowers/brainstorm/6553-1791039403/content/`: `oggi-c2-sviluppi.html`
   variante C2b, `oggi-caroselli-v2.html` variante B1).
8. **Regola C2-vero:** quando la dispensa non è aggiornata, la home nasconde tutto ciò che ne
   deriva e si riempie col piano, più una tessera che spiega perché.
9. **Aggiornata = ultima spesa chiusa nell'app entro 9 giorni** (§E).
10. **Il poster salta i buchi:** mostra sempre il prossimo pasto a casa con un piatto; i pasti
    fuori o senza piatto restano solo nelle caselle della giornata.
11. **Dal mockup al codice, diretto:** niente giro in Claude Design; i pezzi nuovi si scrivono
    in DESIGN.md durante l'esecuzione (§G).

**Due correzioni rispetto ai mockup, con la ragione:**
- **Via la riga «Hai tutto in casa» dal poster.** Dopo una spesa chiusa il residuo è già al
  netto del piano della settimana (`chiudiSpesa`: residuo + acquistato − fabbisogno della
  settimana), quindi per il pasto del piano «hai tutto» è vero per costruzione e «ti manca»
  non si distingue da «comprato esatto». Il poster dice solo cose vere: le persone, le porzioni
  da preparare, la porzione pronta (§B.4).
- **Nessun avviso a tempo dopo «Scambia».** DESIGN.md §12 esclude toast e snackbar. L'annullo
  sta **dentro il poster**, finché il pasto non passa (§C.6).

**Fuori perimetro, esplicitamente:**
- **Sotto-progetto 2, spesa flessibile:** scegli il giorno della spesa e la lista copre fino
  alla spesa successiva (anticipare la spesa grossa o fare una spesa ponte). Tocca residuo,
  chiusura e non ricomprato, oggi legati alla settimana. Brainstorming suo.
- **Sotto-progetto 3, scansione libera:** inquadri un prodotto e l'app trova o lega
  l'ingrediente, poi AGGIUNGI. Oggi lo scanner vive solo nel dettaglio di un ingrediente, in
  Nuovo ingrediente e in Lista › Confezioni, e solo 1 ingrediente su 173 ha un codice
  [misurato il 03/10]. Quando c'è, il tondo dello scan entra nella testata di Oggi.
- Statistiche, calorie, aderenza (decisione 1).
- Le alternative a scelta dentro un piatto (pane integrale o di segale): restano in Scegli.

**Il database non cambia. Nessuna migrazione.**

**Quando si parte.** L'esecuzione parte da `main` **dopo il merge della fase 8c**
(`fase8c-importa-motore`): porta `DishIngredient.quantita: number | null` (righe «quanto
basta») e la migrazione 0016, che va in produzione prima del suo merge. La spec e il piano si
scrivono prima. Accordi presi il 03/10 con la sessione della 8c: in DESIGN.md e DESIGN-SYSTEM.md
si **aggiungono sezioni nuove** e la tab bar di §8 si ritocca dopo il suo merge; la home non tocca
Scegli oltre al parametro `da` (§B.6), né planner, storno, list-builder, FoglioDalBasso,
DialogoConferma, `piano/page.tsx`. La sessione delle icone (worktree `icone-famiglie`) ha confermato
il 03/10 che l'API di `IconaIngrediente` non cambia (chiave, area, tono, taglia 60 | 96) e che il
suo ramo aggiunge solo chiavi al catalogo, senza toccare DESIGN.md, TabBar, `globals.css` o il
manifest: nessuna sovrapposizione.

---

## A. Dove sta

### A.1 La route

`src/app/(app)/oggi/page.tsx`, componente client come le altre schermate del gruppo `(app)`,
dentro il `Guscio` (tab bar, Dock, maschera di scorrimento). Testata: titolo **Oggi** e Menù
utente, **senza pillola** sotto il titolo (il giorno lo dice il poster).

### A.2 La tab bar a quattro voci

`src/components/TabBar.tsx`: `VOCI` diventa **Oggi · Lista · Piano · Dispensa**. L'icona di Oggi
è il **piatto visto dall'alto**: cerchio pieno r 9 e cerchio interno bianco r 4,1 all'opacità
.92 (quella dei mockup approvati; non è usata altrove in `src/`, verificato il 03/10).

Le misure di oggi (304 di pillola, voci 96 × 72) non reggono quattro voci su 393: 4 × 96 + 3 × 2
+ 12 = 402. Valori nuovi:

| | A riposo | Ridotta |
|---|---|---|
| Pillola | **338** × 84 | **274** × 66 |
| Voce | **80** × 72 | **64** × 54 |
| Conto | 4 × 80 + 3 × 2 + 2 × 6 | 4 × 64 + 3 × 2 + 2 × 6 |

Si cambiano i token `--barra-larga`, `--barra-larga-giu`, `--barra-voce-larga`,
`--barra-voce-larga-giu` in `globals.css` **e** in `design/sistema/tokens.css` insieme
(`npm run design:token` fallisce se divergono). `DISPENSA` in mono 8,5 / 0,12em sta in 80 px
(circa 49 px di testo [stima, da verificare nel browser]).

### A.3 L'app parte da Oggi

Ogni ingresso che oggi porta a `/lista` come pagina iniziale passa a `/oggi`:

| File | Oggi | Dopo |
|---|---|---|
| `public/manifest.json` | `start_url: /lista` | `/oggi` |
| `src/app/page.tsx` | `redirect('/lista')` | `redirect('/oggi')` |
| `src/app/auth/callback/route.ts` | redirect a `/lista` | `/oggi` |
| `src/components/AvvioMarchio.tsx` | l'avvio del Marchio gira solo su `/lista` | gira sulla pagina d'ingresso, `/oggi` |
| `src/components/pannello/indirizzi.ts` | pannello senza origine → `/lista` | `/oggi` |
| `src/app/(app)/impostazioni/Rimando.tsx` | rimanda a `/lista` | `/oggi` |
| `src/components/pannello/Casa.tsx` | dopo l'ingresso in una casa `ricaricaSu('/lista')` | `/oggi` |
| `public/sw.js` | `GUSCIO = ['/lista', '/piano', '/piatti', …]`, cache `dispesa-v1` | aggiunge `/oggi`, cache **`dispesa-v2`** (l'`activate` cancella la vecchia da sé) |

**Restano su `/lista`:** il ripiego offline di `sw.js` (la Lista è la schermata che deve reggere
senza rete) e i ritorni dentro la spesa (`/lista/fatta`, `/lista/confezioni`, `piatti/da.ts`).

---

## B. Il poster del prossimo pasto

### B.1 Quale pasto

Si guarda l'ora **locale del telefono** (`new Date()`, ore e minuti locali) e la **data locale**.
Attenzione: il resto dell'app calcola «oggi» con `toISOString().slice(0, 10)`, cioè in UTC, e fra
mezzanotte e le 2 (ora legale) quella data è ancora ieri. Oggi usa la data locale in un helper
suo (`oggiLocale()` in `src/domain/oggi.ts`); il disallineamento del resto dell'app è un difetto a
parte, fuori da questa spec.

Il poster mostra **il primo pasto, in ordine di posizione, che sia a casa, con un piatto, e la cui
fascia non è ancora finita** (decisione 10). Se oggi non ce n'è più, mostra il primo pasto a casa
con un piatto di **domani**. Domani può cadere nella settimana dopo, che il Piano crea solo quando
lo apri (`creaSettimana`): se quella settimana non esiste ancora, il poster dice
`Il piano di domani non c'è ancora.` con il tasto `APRI IL PIANO`.

Un pasto **dai Pronti** (`daPronti`) è un pasto con un piatto: il poster lo mostra.

### B.2 Le fasce

Dal nome del pasto (`meal_slot_def.nome`), in minuscolo e senza accenti; si controlla
`dopocena` **prima** di `cena`.

| Il nome contiene | Fascia (fine esclusa) |
|---|---|
| `colazione` | 00:00–10:30 |
| `spuntino` o `merenda` con `mattin` | 10:30–12:00 |
| `pranzo` | 12:00–15:00 |
| `spuntino` o `merenda` con `pomerig` | 15:00–18:00 |
| `spuntino` o `merenda` da solo | prima del pranzo → 10:30–12:00; dopo → 15:00–18:00 (per posizione); senza un pranzo fra i pasti → 10:30–12:00 |
| `dopocena` | 21:30–24:00 |
| `cena` | 18:00–21:30 |
| altro | per posizione: inizia dove finisce il pasto riconosciuto prima (00:00 se non c'è) e finisce dove inizia il pasto riconosciuto dopo (24:00 se non c'è) |

I nomi reali in produzione sono Colazione, Spuntino, Spuntino mattina, Pranzo, Spuntino
pomeriggio, Cena, Dopocena [misurato il 03/10]: tutti coperti dalle righe sopra.

### B.3 La giornata in caselle

In alto a destra nel poster, una casella per ogni pasto della casa (i `meal_slot_def`, in ordine),
del giorno che il poster mostra:

| Stato | Casella 11 × 11, raggio 3 |
|---|---|
| Fascia finita | piena, bianco al 45% |
| Il pasto del poster | piena, bianca |
| Futuro, a casa | solo bordo 2 px bianco al 45% |
| Fuori casa, saltato, sostituito | bordo 2 px **tratteggiato** bianco al 45% |
| Senza piatto | come futuro (precisato in esecuzione, 03/10: non ha un aspetto suo, vale la precedenza qui sotto, quindi con la fascia finita è «finita») |

Precedenza, dall'alto: il pasto del poster, poi fuori/saltato/sostituito, poi fascia finita, poi
futuro. Per domani nessuna casella è «finita». Decorativa (`aria-hidden`): l'informazione è nel
testo del poster.

### B.4 Anatomia

Tessera piena in `--ink`, due colonne del bento, raggio 18, padding `13 16 16`. Dall'alto:

1. **Riga alta:** etichetta mono 10 / 700 / 0,14em bianco 72%: `{GIORNO} · {PASTO}`, col nome
   del giorno se è oggi (`SABATO · CENA`) e `DOMANI` se è domani (`DOMANI · COLAZIONE`); a destra
   le caselle (§B.3).
2. **Nome del piatto** a 32 / 800 / −0,045em, bianco, margine alto 26, largo al massimo l'84%
   (lascia posto all'icona).
3. **Sottotitolo** mono 8,5 / 0,06em bianco 66%, le voci che valgono separate da ` · `:
   `Per {n}` se le persone (`moltiplicatorePorzioni`) sono più di 1; `Cucina {n} in più` se
   `porzioniPreparate > 0`; `Da una porzione pronta` se `daPronti`. Nessuna voce → nessuna riga.
4. **Azioni:** `CAMBIA` e `COM'È ANDATA`, pillole 38 (area di tap 44) su bianco 12% con bordo
   bianco 22%.
5. **Banda delle alternative** (§C), solo quando c'è.
6. **Icona ingrediente** dell'ingrediente principale (§C.4), 96, tono `hero`, tagliata in basso
   a destra come nelle tessere. **Quando c'è la banda delle alternative (punto 5) il poster non
   mostra la sua icona** (precisato in esecuzione, 03/10): è il poster con banda del mockup B1
   approvato (`oggi-caroselli-v2.html`), senza icona hero, e l'icona starebbe sotto le carte.
   La pagina passa `icona = null` quando ci sono proposte.

### B.5 Com'è andata

`COM'È ANDATA` apre `FoglioAzioniPasto` sopra la home, con gli stessi props e callback di
`piano/page.tsx` per quello slot (`passato` = il giorno del poster ≤ oggi). Le scritture sono le
stesse (`aggiornaSlot(…, 'checkin')`). Come nel Piano, il foglio si apre solo se la settimana del
pasto non è in `bozza`: in bozza `COM'È ANDATA` non c'è. Dopo una scrittura la home si ricarica: se il pasto è
diventato `saltato`, `sostituito` o `fuori`, il poster passa al pasto dopo (decisione 10).

### B.6 Cambia

`CAMBIA` apre Scegli: `/piano/{data}/{slotDefId}/scegli?da=oggi`. Scegli oggi torna sempre al
Piano (`tornaA(router, '/piano')`): impara il parametro `da=oggi` e in quel caso torna a `/oggi`,
come l'editor del Piatto con `?da=piano` (fase 7), e la pillola della testata dice `OGGI`
(`aria-label` `Torna a oggi`) invece di `PIANO`. È l'unico ritocco a Scegli, una riga nel
ritorno di `confermaScelta` e nell'indietro: da fare dopo il merge della 8c, che tocca lo stesso
file.

---

## C. Le alternative «con quello che hai»

### C.1 Quando ci sono

Tutte e quattro:
- la dispensa è aggiornata (§E);
- il pasto del poster non è `daPronti` (una porzione pronta è già il miglior uso di quello che
  hai);
- c'è almeno un candidato fattibile (§C.2, §C.3);
- il pasto del poster è di oggi (per domani si cambia dal Piano).

Altrimenti la banda non c'è e il poster finisce con le azioni.

### C.2 I candidati

I piatti del repertorio **attivi**, dello **stesso tipo di pasto** (`dish.slotDefId` = quello dello
slot), diversi dal piatto in programma, e **non già in programma** in un pasto a casa da oggi alla
fine della settimana (niente proposta del piatto di domani). Mai piatti generati: solo il
repertorio (vincolo Cass. 20281/2017, backlog).

### C.3 Fattibile

Per ogni candidato si prendono le **righe effettive** con le scelte di default
(`righeEffettive(dish, {})`) e, per ogni ingrediente, la **disponibilità**:

```
disponibile(i) = residuoUtilizzabile(i, oggi)
               + (settimana dello slot `chiusa` ? consumoSlot(slot attuale)(i) : 0)
```

Perché il secondo termine: dopo la chiusura il residuo è già al netto del piano, compreso il
pasto di stasera; scambiando, quegli ingredienti tornano liberi (lo storno di `aggiornaSlot` li
riaccredita). Prima della chiusura il piatto di stasera non è ancora stato comprato e non libera
niente. Conseguenza voluta: una proposta **non ruba mai** quello che serve ai pasti dopo, perché il
residuo è ciò che avanza al piano.

Una riga è **coperta** se:
- l'ingrediente è di classe `stima` (olio, sale…): sempre;
- è «quanto basta» (`quantita === null`, dalla 8c): se `disponibile > 0` (accordo con la 8c, come
  fa la lista);
- altrimenti: se `disponibile ≥ quantità convertita in unità base × persone × fattoreConsumo(slot)`
  (precisato in esecuzione, 03/10). `fattoreConsumo` è `1 + porzioniPreparate` dello slot di
  stasera, perché lo scambio fa ereditare al piatto nuovo le porzioni da preparare, e lo storno di
  `aggiornaSlot` le conta così (la stessa funzione, `fattoreConsumo` in `src/domain/pronti.ts`,
  che usano `consumoSlot` e `costruisciLista`). Senza porzioni da preparare vale 1: «× persone».

**Tutto in casa** = ogni riga coperta. **Manca una cosa** = esattamente un ingrediente scoperto.
Due o più → non è un candidato.

### C.4 L'ingrediente principale

Serve all'icona della carta, del poster e della tessera dei Pronti. È l'ingrediente della riga
con la quantità più grande **in g o ml**, fra quelle che hanno un'icona; a pari quantità, la prima
in ordine di piatto; se nessuna riga è in g o ml, la prima con un'icona; se nessuna ha un'icona,
niente icona. Le classi `stima` e le righe q.b. non concorrono.

### C.5 Ordine, tetto, carosello

Ordine: prima i «tutto in casa», poi i «manca una cosa»; dentro ogni gruppo prima chi usa un
ingrediente che scade entro due giorni (§D.1), poi per nome. **Al massimo 2.**

**Anatomia della banda** (variante B1): filo 1 px bianco 14% sopra, padding alto 14, poi
l'etichetta `OPPURE, CON QUELLO CHE HAI` (mono 10 / 700 / 0,14em, bianco **66%**: precisato in
esecuzione, 03/10; fra i nove alfa del poster non c'è un 60%, e sei punti su un'etichetta mono non
giustificano un decimo token), poi il carosello:

- **Carta** bianca, larga 252, alta almeno 150, raggio 18, padding `13 14 14`, gap 8. Dentro: la
  pillola di stato (`TUTTO IN CASA` su `rgba(20,22,58,.06)`; `MANCA: {NOME}` su
  `rgba(154,92,0,.10)` in `--avviso`), il nome a 18 / 800 / −0,035em largo al massimo il 76%,
  `SCAMBIA` (pillola 36 in `--ink`, icona delle due frecce 15, area di tap 44) in fondo, l'icona
  ingrediente 96 tono `area` tagliata in basso a destra.
- **Scorrimento orizzontale visibile:** `overflow-x: auto`, `scroll-snap-type: x mandatory`, la
  seconda carta **spunta dal bordo** (margine destro −16). Non è uno «swipe nascosto» (§12): la
  carta si vede. Puntini sotto, `aria-hidden`.
- Con **una** proposta sola la carta prende tutta la larghezza e non ci sono puntini.
- Accessibilità: il carosello è una `role="list"`; ogni carta un `listitem`; il tasto ha
  `aria-label` `Scambia con {piatto}`.

### C.6 Scambia, e l'annullo dentro il poster

`SCAMBIA` chiama `aggiornaSlot(slotId, { dishId: candidato }, 'correzione')`, la stessa scrittura
di Scegli (`scelte` vuote: valgono i default del piatto nuovo; lo `stato` resta `casa`). Lo storno
lo genera `aggiornaSlot`. Poi la home si ricarica e il poster mostra il piatto nuovo.

**L'annullo** (niente toast, §12): finché il poster mostra quello slot, sotto le azioni compare la
pillola `RIMETTI QUELLO DEL PIANO`, che scrive `aggiornaSlot(slotId, { dishId: vecchio, scelte:
scelteVecchie }, 'correzione')`. «Quello del piano» è il piatto che lo slot aveva prima del primo
scambio fatto da Oggi, tenuto in `sessionStorage` per slot; si cancella quando si rimette o
quando il poster passa a un altro slot. Con lo scambio fatto, la banda delle alternative sparisce
(non si scambia lo scambio da qui: per altro c'è `CAMBIA`).

Errore di scrittura: messaggio d'errore in `--errore` **subito sotto il poster**, sul fondo chiaro
(`--errore` sull'inchiostro non arriva a 4,5:1),
`Non siamo riusciti a scambiare il piatto. Riprova.`, e il poster resta com'era.

---

## D. La griglia

Sotto il poster, griglia a due colonne gap 8, margini laterali 14, tessere con
`--ombra-pannello`. Ordine: Scade presto, Da scongelare, Pronti, Poi. Una tessera dispari in coda
prende due colonne in forma compatta (alta 64).

### D.1 Scade presto (solo con la dispensa aggiornata)

Da `avvisiScadenza` (la stessa funzione del Piano e della Dispensa): gli ingredienti con
`scadenza ≤ oggi + 2`. **Al massimo 2**, i più vicini.

Tessera **piena nel colore dell'area**, alta almeno 140: pillola bianca
`SCADE {etichettaScadenza}` (`SCADE OGGI`, `SCADE DOMANI`, `SCADE LUNEDÌ`), nome a 25 / 800,
sottotitolo mono: il primo pasto che lo usa in tempo, `{Pasto} di {oggi|domani|giorno}`
(`Pranzo di domani`), oppure `Nessun pasto lo usa`. Icona 96 tono `hero`. Il tocco apre la
Dispensa sull'ingrediente (`/dispensa?ingrediente={id}`, parametro nuovo che apre il foglio del
dettaglio).

### D.2 Da scongelare (solo con la dispensa aggiornata)

Due fonti, al massimo 2 tessere in tutto:
- un **lotto dei Pronti in congelatore** legato a un pasto `daPronti` di domani;
- un **ingrediente segnato in congelatore** (`pantry_state.congelato`) che un pasto a casa di
  domani usa.

Tessera bianca: pillola `SCONGELA` in `--freddo` su `rgba(47,111,191,.12)`, nome a 17, sottotitolo
`Per {pasto} di domani`, icona 60 tono `area`. Il tocco apre il dettaglio in Dispensa (ingrediente
o lotto).

Limite noto: in produzione oggi non c'è niente in congelatore [misurato il 03/10], quindi questa
tessera non è stata vista coi dati veri. La regola sul flag `congelato` va verificata nel piano
(come si comporta il flag dopo una chiusura che ricompra lo stesso ingrediente) [ipotesi, non
testata].

**Verificato nel piano (precisato in esecuzione, 03/10) [misurato, leggendo il codice]:**
`chiudiSpesa` (`src/data/lista.ts`, righe 547–557), per un ingrediente ricomprato, scrive
`residuo` e `ultimo_acquisto` e azzera `scadenza_manuale`, ma **non tocca `congelato`**: il flag
resta vero dopo un riacquisto fresco. Quindi la tessera `SCONGELA` può comparire per un
ingrediente comprato fresco dopo essere stato congelato. La tessera segue il flag così com'è:
dice quello che dice la Dispensa, che mostra lo stesso ingrediente «in congelatore» e ne stima la
durata a 90 giorni. Azzerare il flag alla chiusura cambia la semantica della spesa ed è una scelta
di prodotto, fuori da questo piano: **domanda aperta per Andrea**. Oggi, in produzione, non c'è
niente in congelatore [misurato il 03/10], quindi nessuna tessera sbagliata si vede.

### D.3 Pronti (solo con la dispensa aggiornata)

**Una tessera per piatto**, non per lotto: le porzioni libere del piatto sono la somma di
`porzioniUtilizzabili(lotto, oggi)` dei suoi lotti meno gli **impegni** (i pasti `daPronti` di
quel piatto da oggi in poi, la stessa regola della Dispensa). Tessera solo se le libere sono più
di 0. Al massimo 2 piatti, prima quello col lotto vivo più vecchio.

Tessera **piena nel colore dell'area dell'ingrediente principale** del piatto (§C.4; bianca se non
ce l'ha): pillola bianca `{n} PRONTI` / `1 PRONTO`, nome del piatto a 25 / 800, sottotitolo
`In congelatore` se tutti i lotti vivi del piatto sono in congelatore, altrimenti `In frigo`,
icona 96 tono `hero`. Il tocco apre in Dispensa il lotto vivo più vecchio del piatto.

### D.4 Poi (sempre)

Il pasto che viene dopo quello del poster con la stessa regola di §B.1 (a casa, con un piatto).
Tessera bianca: etichetta mono `POI · {PASTO}` se è oggi, `DOMANI · {PASTO}` se è domani; nome
del piatto a 17. Il tocco apre il Piano (che si apre su oggi; domani è a un tocco). Precisato in
esecuzione, 03/10: la tessera porta anche l'icona dell'ingrediente principale del piatto (60, tono
`area`, §C.4), come la tessera `SCONGELA` di un lotto. La spec non la nominava, il piano sì: **da
confermare con Andrea** (vedi §G.2). L'etichetta è in `--testo-2`, non in `--sec`: porta
un'informazione.

### D.5 Con la dispensa non aggiornata

Spariscono la banda delle alternative e le tessere D.1–D.3. Al loro posto, prima di «Poi», una
tessera **tratteggiata** a due colonne (bordo 2 px `--bordo-tratteggio`, raggio 18, padding
`14 16`) con il testo a 14 / 1,45 in `--testo-2`:

- con almeno una spesa chiusa: **`La dispensa è ferma al {d mese}`**`, l'ultima spesa chiusa
  nell'app. Chiudi la prossima, e qui compaiono le proposte con quello che hai e le cose che
  scadono.`
- senza nessuna spesa chiusa: `Chiudi la prima spesa nell'app, e qui compaiono le proposte con
  quello che hai e le cose che scadono.`

e la pillola `APRI LA LISTA`. Dopo «Poi» si aggiunge la tessera `DOMANI · {PASTO}` del primo
pasto di domani, se è diverso da «Poi».

Coi dati di produzione del 03/10 la home di Andrea è in questo stato: ultima spesa chiusa il
28/08 [misurato il 03/10].

---

## E. Quando la dispensa è aggiornata

**Aggiornata = l'ultima spesa chiusa nell'app è di 9 giorni fa al massimo** (`oggi −
ultimaChiusura ≤ 9`). L'ultima chiusura è il massimo di `purchase.data` della casa, che
`chiudiSpesa` scrive alla chiusura. Le modifiche a mano in Dispensa **non contano**: aggiornano
un ingrediente, non la dispensa intera. Il caso che lo decide: in produzione tre ingredienti hanno
`ultimo_acquisto` al 25/09 da modifiche a mano, mentre l'ultima chiusura è del 28/08; contando le
modifiche, il 03/10 la dispensa risulterebbe aggiornata (8 giorni) e la home proporrebbe su una
dispensa vuota [misurato il 03/10].

Lettura nuova in `src/data/dispensa.ts`: `leggiUltimaChiusura(): Promise<string | null>` (una
`select data from purchase order by data desc limit 1`, filtrata sulla casa come le altre).

---

## F. Stati

- **Caricamento:** la riga mono `CARICO…` come le altre schermate.
- **Errore di caricamento:** il messaggio d'errore delle altre schermate,
  `Non riusciamo a caricare la giornata.`, col tasto `RIPROVA`.
- **Offline:** la home non ha una copia locale. Con la rete giù il caricamento fallisce: sotto
  l'errore la pillola `APRI LA LISTA`, che regge offline.
- **Settimana corrente non ancora creata:** Oggi la crea come fa il Piano (`creaSettimana` con la
  stessa guardia sul doppione `unique (user_id, data_inizio)`). La logica si estrae in un helper
  `apriSettimanaCorrente(oggi)` in `src/data/apertura.ts` (precisato in esecuzione, 03/10: prende
  la data locale come argomento, sta in un file suo, e due aperture insieme, Strict Mode o due
  schede, fanno una creazione sola), usato da Oggi; il Piano resta com'è (lo tocca la 8c) e passa
  all'helper in un secondo momento.
- **Nessun pasto a casa con un piatto, oggi né domani:** il poster resta un poster scuro senza
  piatto, con `Nessun pasto in programma.` e il tasto `APRI IL PIANO` (come «domani senza piano»). Copre anche
  il repertorio vuoto di un utente nuovo: il Piano, aperto da qui, ha il suo stato vuoto con
  `COMINCIA DAI PIATTI`.

---

## G. Design system

### G.1 Pezzi nuovi, da scrivere in DESIGN.md

Sezioni **nuove** in §8 (accordo con la 8c: non si riscrivono le sezioni esistenti finché il suo
merge non è su main; dopo, si ritocca anche «Tab bar»):

- **Poster del pasto** (§B.4, §B.3);
- **Carta alternativa** e **Carosello nel poster** (§C.5);
- **Tessera di Oggi**: le quattro forme di §D (piena d'area, bianca, tratteggiata informativa,
  compatta a due colonne);
- **Tab bar**, dopo il merge della 8c: quattro voci e le misure di §A.2.

In §13 una sezione «Decisioni del 03/10/2026 (Oggi)» con le decisioni in testa a questa spec.

### G.2 Eccezioni da dichiarare in §12

- **Le icone ingrediente fuori dalle tessere ingrediente:** sul poster, sulla carta alternativa e
  sulla tessera dei Pronti, come icona dell'**ingrediente principale** di un piatto (§C.4). Stessa
  grammatica (due toni, tagliata in basso a destra), nessun uso diverso. Precisato in esecuzione,
  03/10: il codice la mette anche sulla tessera di un lotto da scongelare (§D.2 prevede un'icona
  su quella tessera, ma qui non è elencata) e sulle tessere `Poi` e `Domani` (§D.4), che la spec
  non nomina: da confermare con Andrea.
- **Il carosello nel poster** non è uno swipe nascosto: la seconda carta si vede.

### G.3 Componenti e file

| Pezzo | File |
|---|---|
| Pagina | `src/app/(app)/oggi/page.tsx` |
| Poster | `src/app/(app)/oggi/Poster.tsx` |
| Carosello e carta | `src/app/(app)/oggi/Alternative.tsx` |
| Tessere della griglia | `src/app/(app)/oggi/TesseraOggi.tsx` |
| Dominio puro | `src/domain/oggi.ts` + `src/domain/__tests__/oggi.tempo.test.ts`, `oggi.dispensa.test.ts`, `oggi.fare.test.ts` (precisato in esecuzione, 03/10: tre file di test, non `oggi.test.ts`) |
| Testi composti | `src/domain/oggi-testi.ts` + `src/domain/__tests__/oggi-testi.test.ts` (precisato in esecuzione, 03/10) |
| Annullo dello scambio | `src/app/(app)/oggi/piano-prima.ts` + `__tests__/piano-prima.test.ts`: il piatto del piano in `sessionStorage` (precisato in esecuzione, 03/10) |
| Ultima chiusura | `src/data/dispensa.ts` → `leggiUltimaChiusura` |
| Apertura della settimana | `src/data/apertura.ts` → `apriSettimanaCorrente(oggi)` (precisato in esecuzione, 03/10: non `src/data/settimana.ts`) |
| Tab bar | `src/components/TabBar.tsx`, `globals.css`, `design/sistema/tokens.css` |
| Ingressi | i file di §A.3 |
| Scegli | `?da=oggi` nel ritorno (§B.6) |
| Dispensa | `?ingrediente={id}` e `?lotto={id}` aprono il foglio (§D.1–D.3) |

### G.4 Il dominio, `src/domain/oggi.ts`

Funzioni pure, senza rete né DB, tutte testate. **Le firme sono quelle del codice** (precisato in
esecuzione, 03/10: lo schizzo della spec e le firme del piano differivano):

- `oggiLocale(adesso: Date): { data: string; minuti: number }`
- `fasceDi(defs: MealSlotDef[]): Map<slotDefId, { inizio: number; fine: number }>` (§B.2; nella
  spec era `fasciaDi`)
- `prossimoPasto({ slotsOggi, slotsDomani, defs, minuti }): Prossimo` (§B.1), con `Prossimo` =
  `{ tipo: 'pasto', slot, giorno: 'oggi' | 'domani' } | { tipo: 'domaniNonCreato' } | { tipo:
  'nessuno' }`; `slotsDomani` null = la settimana di domani non esiste ancora. La stessa per
  «Poi»: `pastoDopo({ dopo, slotsOggi, slotsDomani, defs }): PastoScelto | null`, con
  `PastoScelto` = `{ slot, giorno }`
- `caselleGiornata({ slots, defs, minuti, slotPosterId })` (§B.3), con `minuti` null quando il
  giorno è domani (nessuna casella «finita»); non prende `data` né `adesso`
- `dispensaAggiornata(ultimaChiusura: string | null, oggi: string): boolean` (§E)
- `ingredientePrincipale(dish, ingredients, scelte = {}): { ingrediente: Ingredient; icona:
  ChiaveIcona } | null` (§C.4): non lancia mai, un piatto che non si legge dà `null`
- `alternative(i: AlternativeInput): Alternativa[]` con `AlternativeInput` = `{ slot,
  statoSettimana, slotsSettimana, dishes, ingredients, pantry, persone, oggi, inScadenza }`
  (`persone` = `moltiplicatorePorzioni`; `inScadenza` = il `Set` degli ingredienti che scadono
  entro due giorni, da `inScadenzaEntro(avvisi, oggi)`) →
  al massimo 2 `{ dish, stato: { tipo: 'tutto' } | { tipo: 'manca', ingrediente } }` (§C.2–C.5)
- `daFare({ avvisi, slots, defs, dishes, ingredients, pantry, lotti, oggi, minuti })` → `{ scade,
  scongela, pronti }`, le tessere di §D.1–D.3

---

## H. Testi

Tutti nuovi, tranne dove scritto.

| Dove | Testo |
|---|---|
| Titolo | `Oggi` |
| Tab bar | `OGGI` (`aria-label` `Oggi`) |
| Poster, etichetta | `{GIORNO} · {PASTO}`, `DOMANI · {PASTO}` |
| Poster, sottotitolo | `Per {n}` · `Cucina {n} in più` · `Da una porzione pronta` |
| Poster, azioni | `CAMBIA` · `COM'È ANDATA` · `RIMETTI QUELLO DEL PIANO` |
| Poster, domani senza piano | `Il piano di domani non c'è ancora.` · `APRI IL PIANO` |
| Poster senza pasto, etichetta | `DOMANI` (domani non pianificato) · `OGGI` (`Nessun pasto in programma.`) |
| Poster, nome accessibile della sezione | `Prossimo pasto` |
| Errore di un'azione del foglio | `Non siamo riusciti a salvare il cambiamento. Riprova.` (esistente, quello del Piano) |
| Banda | `OPPURE, CON QUELLO CHE HAI` · `TUTTO IN CASA` · `MANCA: {NOME}` · `SCAMBIA` (`aria-label` `Scambia con {piatto}`) |
| Errore di scambio | `Non siamo riusciti a scambiare il piatto. Riprova.` |
| Scade | `SCADE {OGGI\|DOMANI\|GIORNO\|IL 9 SET}` · `{Pasto} di {oggi\|domani\|giorno}` · `Nessun pasto lo usa` |
| Scongela | `SCONGELA` · `Per {pasto} di domani` |
| Pronti | `{n} PRONTI` · `1 PRONTO` · `In frigo` · `In congelatore` |
| Poi | `POI · {PASTO}` · `DOMANI · {PASTO}` |
| Scegli aperto da Oggi | pillola `OGGI`, `aria-label` `Torna a oggi` |
| Dispensa non aggiornata | `La dispensa è ferma al {d mese}, l'ultima spesa chiusa nell'app. Chiudi la prossima, e qui compaiono le proposte con quello che hai e le cose che scadono.` · `Chiudi la prima spesa nell'app, e qui compaiono le proposte con quello che hai e le cose che scadono.` · `APRI LA LISTA` |
| Stati | `CARICO…` (esistente) · `Non riusciamo a caricare la giornata.` · `RIPROVA` (esistente) · `Nessun pasto in programma.` · `APRI IL PIANO` |

---

## I. Rischi, limiti, punti aperti

- **Il residuo è un avanzo, non un inventario.** A metà settimana `pantry_state.residuo` è ciò che
  resta **dopo** il piano della settimana. Per questo le proposte non rubano ai pasti dopo (§C.3),
  ma anche per questo il poster non dice «hai tutto» (correzione in testa).
- **Le fasce sbagliano a cavallo** (una cena alle 21:45 risulta già passata). Si corregge solo se
  succede davvero; l'orario per pasto è la strada già scartata il 03/10 come troppo cara per ora.
- **Data UTC nel resto dell'app.** Fra mezzanotte e le 2 Oggi e il Piano possono dire due giorni
  diversi. Difetto preesistente, fuori da questa spec.
- **Da scongelare non provato coi dati veri** (§D.2).
- **Android:** il carosello scorre in orizzontale dentro il poster, lontano dai bordi dello
  schermo (padding 16 e margine 14), per non pestare il gesto Indietro dal bordo.
- **La spesa ponte e la scansione libera** sono i sotto-progetti 2 e 3: finché non ci sono, la
  home non ha né il tasto per rigenerare la lista né il tondo dello scan.

---

## J. Verifica

1. **Test di dominio** (`oggi.test.ts`): fasce coi sette nomi reali e con un nome sconosciuto; il
   prossimo pasto a 08:00, 10:45 (spuntino senza piatto → salta), 12:30 con pranzo fuori (salta),
   18:10, 22:00 (dopocena), 23:59 (domani); domani in una settimana non creata; le caselle nei
   cinque stati; `dispensaAggiornata` a 0, 9, 10 giorni e senza chiusure; `alternative` con:
   tutto in casa, manca uno, mancano due (escluso), q.b. con residuo 0 (scoperto) e > 0
   (coperto), classe stima, piatto già in programma (escluso), settimana chiusa contro
   confermata (il consumo di stasera conta solo da chiusa), ordine e tetto a 2;
   `ingredientePrincipale` coi quattro casi di §C.4.
2. **Test di componente:** il poster coi tre sottotitoli; la banda assente con la dispensa non
   aggiornata; `SCAMBIA` chiama `aggiornaSlot` col patch giusto; `RIMETTI QUELLO DEL PIANO`
   rimette piatto e scelte; la tessera tratteggiata nei due testi.
3. **Nel browser** (preview, utente di prova): `/` porta a `/oggi`; la barra a 4 voci a riposo e
   ridotta senza tagli di testo; il carosello scorre e si ferma sulle carte; nessun elemento
   finisce sotto la barra; `npm run design:token`, `tsc`, lint e la suite verdi.
4. **Prove dal telefono (Andrea):** l'app installata si apre su Oggi (dopo l'aggiornamento del
   service worker); il poster giusto in tre momenti della giornata; `COM'È ANDATA` → saltato fa
   passare al pasto dopo; `CAMBIA` → Scegli → torna a Oggi; indietro di sistema da Scegli torna
   a Oggi; con la dispensa non aggiornata (il suo caso al 03/10) la tessera tratteggiata dice
   «28 agosto»; dopo una spesa chiusa compaiono proposte e scadenze; `SCAMBIA` e `RIMETTI QUELLO
   DEL PIANO`.
