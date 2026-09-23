# Fase 3 del redesign: Piatti e fotocamera — design

**Data:** 23/09/2026 · **Stato:** bozza per la review di Andrea · **Base:** `main` `995211c`,
`design/sistema/DESIGN.md` v3, `design/ridisegno/Piatti - versione 5.html`,
`design/ridisegno/Fotografa il piano - scatto.html`, `design/ridisegno/ANALISI.md` §2.3 e §2.6,
`docs/2026-09-19-inventario-schermate.md`.

**Obiettivo.** Portare nel codice le altre due schermate ridisegnate. Piatti diventa una lista
unica di righe con la ricerca anche negli ingredienti e l'aggiungi in cima. L'acquisizione della
dieta si apre con una scelta fra foto e PDF, e la foto diventa una fotocamera a tutto schermo con
la banda dei comandi. Successo: dal telefono si trova un piatto scrivendo un ingrediente, e si
fotografano, riordinano e mandano all'estrazione i fogli di una dieta senza uscire per sbaglio
dal flusso. La suite deve restare verde e le prove dal telefono devono passare.

**Le decisioni di Andrea che questa spec applica** (23/09):

- **Il PDF si sceglie prima della fotocamera.** L'acquisizione si apre con due porte.
- **«Rivedi i fogli presi» la costruisco dal sistema**: un foglio dal basso, senza un giro in
  Claude Design.
- **La sottoriga del piatto dice `N INGREDIENTI`**, più `· DALLA DIETA` solo sui piatti che
  vengono dall'import.
- Disegno approvato in chat il 23/09, parti 1–4. Tre punti se ne discostano e sono raccolti
  in §M.

**Fuori scope, esplicitamente:**
- gli altri passi di Importa: ripresa, estrazione in corso, rifiuto, errore, revisione,
  formati, riepilogo; restano col loro aspetto;
- l'editor del piatto (`/piatti/[id]`, `/piatti/nuovo`);
- Piatti veloce;
- la Dispensa, fase 4;
- le Impostazioni, fase 5.

**Il database non cambia**, e non cambiano la route `/api/import/estrai` e la ricompressione
delle immagini.

---

## A. Piatti: la lista

`src/app/(app)/piatti/page.tsx`.

**Cosa sparisce:**
- il `Segmento` dei pasti e lo stato `filtro`, con la costante `TUTTI`;
- la pillola del pasto sulla scheda e `FONTE_LABEL`;
- la chiamata a `leggiSlotDefs()`, che serviva solo a filtro e pillola;
- la riga `.coda-barra` con `+ NUOVO PIATTO`.

Un piatto non appartiene a un pasto: ci finisce quando lo metti nel piano. `DESIGN.md` §8,
alla voce Riga piatto, lo dice già.

**L'ordine dall'alto:**

1. **Il campo di ricerca, fuori dallo scroller.** Resta fermo mentre la lista scorre, come
   oggi, perché con la tastiera aperta si deve vedere cosa si sta scrivendo. Segue il Campo di
   testo di §8 in modalità ricerca:
   - alto 44, raggio 14, fondo bianco, bordo 1 px `--bordo`, `--ombra-pannello`;
   - padding `0 14px`, testo 14;
   - la lente 18 px dentro a sinistra, a tratto 2,1, `aria-hidden`;
   - segnaposto e `aria-label` sono lo stesso testo, `Cerca un piatto o un ingrediente`;
   - contenitore con padding `8px 16px 10px`.
2. **Lo scroller**, `className="sc scroll-app"`. Niente `con-piede` e niente `con-dock`: la
   coda torna ai 140 della fase 1. Padding `2px 16px 14px`, colonna, gap **8**. Dentro:
   - per primo, l'**aggiungi tratteggiato** `Nuovo piatto`, un `<Link href="/piatti/nuovo">`
     che segue §8 Tasti:
     - alto **56**, larghezza piena, raggio 14, bordo 2 px tratteggiato in
       `--bordo-tratteggio`, nessun fondo;
     - mono 11/700/0,08em in `--ink`, reso maiuscolo da `text-transform`;
     - un più da 16 px `aria-hidden`, gap 9;
     - resta visibile anche mentre si cerca;
   - le **righe piatto** (§B), nell'ordine in cui le restituisce `leggiRepertorio()`, cioè
     quello di oggi;
   - se la ricerca non trova niente, il vuoto di ricerca (§C).

**Riga piatto** (`DESIGN.md` §8). Resta un componente locale, `RigaPiatto`, al posto di
`SchedaPiatto`.

- `<Link href="/piatti/{id}" aria-label="Apri {nome}">`: un solo bersaglio.
- Min-height **68** (`--riga-piatto`), raggio 14, fondo bianco, bordo 1 px
  `rgba(20,22,58,0.09)`, `--ombra-pannello`, `display: flex`, `align-items: center`.
- Corpo: `flex: 1`, `min-width: 0`, padding `12px 8px 12px 14px`, colonna, gap 3.
  - Nome 17/700/-0,03em in `--ink`, su una riga sola: `white-space: nowrap`,
    `overflow: hidden`, `text-overflow: ellipsis`. Oggi va a capo su due righe.
  - Sottoriga mono 9/500/0,08em in `--ter`, maiuscola: `{n} INGREDIENTI`, oppure
    `1 INGREDIENTE` al singolare, e `· DALLA DIETA` in coda quando `fonte === 'nutrizionista'`.
    Sui piatti `proprio` non si aggiunge niente. `n` si spiega in §B.
  - Pallini d'area 8 × 8, raggio 2,6, gap 4, `margin-top: 2`, uno per area distinta,
    nell'ordine dell'utente. Oggi la regola è la stessa; cambia da dove vengono gli
    ingredienti (§B).
- Zona destra larga **44**, `flex: none`, col chevron 14 in `--icona-spenta`, `aria-hidden`.
  Oggi il chevron è in `--ter`.

**Il `--ter` sulla sottoriga è un'eccezione accettata.** `--ter` è il colore dei metadati
(`tokens.css`: «SOLO decorazione»), e il numero degli ingredienti è un metadato. Il mockup e
§8 lo vogliono così: non lo alzo a `--testo-2`.

## B. Piatti: la ricerca, una funzione pura

Nuovo file `src/domain/ricerca-piatti.ts`, senza React e senza I/O:

```ts
/** Gli id distinti degli ingredienti del piatto: i fissi e quelli di ogni opzione di ogni componente. */
export function ingredientiDelPiatto(piatto: Dish): string[];

/** I piatti il cui nome, o il nome di uno dei loro ingredienti, contiene il testo cercato. */
export function cercaPiatti(piatti: Dish[], ingredienti: Ingredient[], testo: string): Dish[];
```

**Le regole di `cercaPiatti`** (ognuna ha il suo test):

1. Un testo vuoto, o fatto solo di spazi, restituisce tutti i piatti nello stesso ordine.
2. Il confronto passa per `normalizza` di `src/domain/import/mapping.ts`, applicata a entrambe
   le parti. Ignora accenti e maiuscole, come oggi, e in più comprime gli spazi multipli. La
   `normalizza` locale di `piatti/page.tsx` si cancella: due funzioni con lo stesso nome e
   comportamenti diversi sono un errore che aspetta di succedere.
3. Un piatto passa se il suo nome contiene il testo, **oppure** se lo contiene il nome di
   almeno un ingrediente in `ingredientiDelPiatto(piatto)`. `ricotta` trova anche le Lasagne
   al forno, se la ricotta sta fra gli ingredienti.
4. Il testo si cerca intero, come sottostringa. `pasta tonno` non trova un piatto che ha
   `pasta` nel nome e `tonno` fra gli ingredienti. È il comportamento di oggi, esteso agli
   ingredienti, e resta così.
5. Un `ingredientId` senza corrispondenza fra gli `ingredienti` si ignora e non fa fallire la
   ricerca.
6. L'ordine di uscita è quello di entrata, senza ranking.

**`ingredientiDelPiatto` è la definizione unica di "gli ingredienti del piatto"** in questa
schermata. La usano la ricerca, il conteggio della sottoriga e i pallini d'area. Oggi conteggio
e pallini leggono solo `piatto.ingredienti`, i fissi, e ignorano `piatto.componenti`. Un piatto
fatto solo di componenti a scelta mostra quindi `0 INGR.` e nessun pallino. Con la definizione
unica, il numero conta ogni ingrediente distinto che può entrare nel piatto. È un cambio di
significato, e lo raccolgo in §M.

Nessuna chiamata in più: la pagina carica già `leggiIngredienti()`. [misurato:
`piatti/page.tsx`, il `Promise.all` al mount]

## C. Piatti: il vuoto di ricerca e lo stato vuoto

**Vuoto di ricerca.** Il blocco centrato di oggi resta, padding `44px 20px`. Cambia la seconda
riga, perché il filtro non c'è più:

- titolo `Nessun piatto qui`, 17/700 in `--ink`, invariato;
- `Prova un'altra parola, oppure aggiungine uno.`, 14 in **`--testo-2`**. Oggi il colore è
  `--sec`, ma la riga porta informazione (decisione 1 del 17/09).

**Stato vuoto, a repertorio vuoto.** Resta com'è: il titolo `Da dove partiamo?`, il sottotitolo,
le due porte `Ho una dieta` → `/importa` e `Cucino sempre le stesse cose` → `/piatti/veloce`, e
il link `Crea un piatto dall'editor completo`. È l'onboarding e l'ingresso dell'import, che
diventerà a pagamento. Il ridisegno non lo rende ma non lo toglie. Le due porte sono una scelta
fra due strade, non il primario della schermata, e perciò restano schede e non vanno nel Dock.

**`Porta` diventa un componente condiviso**, `src/components/Porta.tsx`, perché serve anche a
Importa (§D):

```tsx
export function Porta({ titolo, testo, children }: { titolo: string; testo: ReactNode; children: ReactNode }): JSX.Element;
```

- `children` è l'azione: un `<Link>` in Piatti, un `<button>` e un `<label>` in Importa.
- Lo stile del tasto va in una classe, `.porta-azione` in `globals.css`, con i valori inline di
  oggi: alto 54, raggio 18, mono 12/700/0,09em, fondo `--ink`, testo bianco, `--ombra-tasto`
  (che vale esattamente l'ombra scritta a mano oggi).
- Il resto della scheda è identico a oggi, e in Piatti non cambia un pixel.

## D. Importa: la scelta

`src/app/(app)/importa/page.tsx`, vista `acquisizione`.

**Lo stato cambia forma.**
- Via `tab: 'foto' | 'pdf'` e il `Segmento FOTO / PDF`.
- Nuovo `fotocameraAperta: boolean`.
- `foto: Blob[]` e `pdf: File | null` restano, indipendenti come oggi.
- `estrai` prende la sorgente come argomento, `estrai(sorgente: 'foto' | 'pdf')`, e non la
  legge più da uno stato. L'invariante di oggi vale uguale: nel `FormData` finisce solo il
  payload della sorgente scelta. Cambia che adesso lo decide il tasto premuto e non una tab.

**A fotocamera chiusa**, la schermata è `Cornice` con Testata `Importa la dieta` e freccia
indietro, invariata. Sotto c'è uno scroller `sc scroll-app`, che diventa `sc scroll-app con-dock`
quando c'è il Dock, con padding `6px 16px 16px` e le due porte in colonna, gap 12:

1. **`Fotografa i fogli`**
   - testo: `Inquadra un foglio alla volta, fino a 12. Se li hai già in galleria, li scegli
     da lì.`
   - azione: `<button className="porta-azione">APRI LA FOTOCAMERA</button>`, che chiama
     `apriFotocamera()` (§G).
2. **`Carica il PDF`**
   - senza file scelto:
     - testo: `Se la dieta ti è arrivata in PDF, caricalo così com'è.`
     - azione: un `<label className="porta-azione">SCEGLI IL PDF` con dentro
       `<input type="file" accept="application/pdf">` visivamente nascosto (stessa tecnica del
       tasto galleria di oggi) e con l'`aria-label` di oggi, `scegli il PDF della dieta`.
       Toccarla apre direttamente il selettore di sistema.
   - con un file scelto, cambiano testo e azione:
     - il **nome del file** va al posto del testo: 14/600 in `--ink`, su una riga, con ellissi;
     - l'azione diventa un link testuale `Cambia file`, un `<label>` con lo stesso input
       nascosto, 12,5/600 in `--ink` e sottolineato come `Crea un piatto dall'editor
       completo`, con un'area di tap di almeno 44;
     - nel **Dock** compare `<button className="dock-primario">ESTRAI LA DIETA</button>`, che
       chiama `estrai('pdf')`.

**Il Dock c'è solo con un PDF scelto.** Senza file non c'è niente da estrarre, e si applica la
regola di `DESIGN.md` §8: niente primario spento, niente contenitore vuoto. I fogli presi con la
fotocamera **non** accendono questo Dock: la foto ha il suo primario, `Ho finito`, dentro la
fotocamera. Il tasto `ESTRAI LA DIETA` di oggi, in `.coda-barra` e spento finché la tab attiva
non ha un payload, si cancella.

**Foto e PDF insieme.** Si può avere un PDF scelto e dei fogli già presi, se si è aperta la
fotocamera, scattato e tornati indietro. `ESTRAI LA DIETA` manda il PDF e `Ho finito` manda i
fogli: i due payload restano separati, e ognuno parte dal proprio tasto.

## E. La fotocamera a tutto schermo

`src/app/(app)/importa/Camera.tsx`, riscritto nella forma. **La logica resta com'è**:
- il ciclo `rilevamento` → `camera` / `fallback`, deciso solo dentro l'effect;
- `ricomprimi` e `ricomprimiFile`;
- `MAX_PAGINE = 12` e i suoi avvisi, col loro testo;
- `iniziali` seminato senza chiamare `onFoto`;
- `applicaPagine` come unico punto di mutazione, e `onFoto` chiamato dagli handler, mai durante
  il render;
- la revoca degli object URL e l'arresto delle tracce allo smontaggio.

I commenti che spiegano i bug del 30/08 restano, parola per parola.

**Le props:**

```ts
interface Props {
  onFoto: (foto: Blob[]) => void;
  iniziali?: Blob[];
  /** Tondo indietro: torna alla scelta. */
  onIndietro: () => void;
  /** `Ho finito`: avvia l'estrazione dei fogli presi. */
  onFinito: () => void;
}
```

**Il posto.** A fotocamera aperta, `Importa` renderizza `<Camera>` **senza** `Cornice`, cioè
senza Testata, e la tab bar sparisce (§G). La radice di `Camera` sta in flusso, non in un
portale:
- `position: relative`, `flex: 1`, `min-height: 0`, `overflow: hidden`, fondo `#000`;
- riempie `main.guscio-main`, che è già una colonna flex a tutta altezza, e i figli si
  posizionano assoluti dentro di lei;
- non è `.scroll-app`, quindi niente maschera e niente coda.

Che la radice occupi davvero tutto il guscio va misurato nel browser, non dedotto (§L).

**I livelli, dal fondo:**

1. **L'anteprima.** `<video autoPlay playsInline muted>`, assoluto `inset: 0`, 100% × 100%,
   `object-fit: cover`. In `fallback` il video non c'è: al suo posto, centrato, il testo di oggi
   `La fotocamera non è disponibile: scegli le foto dei fogli dalla galleria`, 14/lh 1,5 in
   bianco, largo al massimo 30ch. In `rilevamento` c'è solo il fondo nero, identico fra server e
   client.
2. **La cornice guida**, `aria-hidden`, `pointer-events: none`, `z-index: 1`:
   - assoluta a `inset: 88px 40px 268px`;
   - quattro angoli 30 × 30, tratto 3 px `rgba(255,255,255,0.92)`, raggio 14 sull'angolo
     esterno;
   - solo in modo `camera`.

   È un aiuto a inquadrare, **non un ritaglio**: lo scatto prende il fotogramma intero del video,
   come oggi (`scattaDaVideo` usa `videoWidth` × `videoHeight`).
3. **Il chrome in alto**, `position: absolute`, `top: 22`, `left/right: 16`, flex, gap 8,
   `z-index: 3`:
   - il **tondo indietro**: `<button aria-label="Indietro">` 44 × 44, raggio 999, fondo bianco,
     `--ombra-nav`, freccia 20 px a tratto 1,8 in `--ink`. Chiama `onIndietro`;
   - la **pillola di titolo**: un `<h1>` alto 44, padding `0 16px`, raggio 999, fondo bianco,
     `--ombra-nav`, mono 11/700/0,08em maiuscolo, testo `Fotografa il piano`. È il titolo della
     schermata, e perciò è un'intestazione.
4. **La banda dei comandi** (`DESIGN.md` §8), `z-index: 2`:
   - assoluta a `left/right/bottom: 0`, raggio `22px 22px 0 0`, fondo `--banda-fondo`;
   - padding `20px 16px 26px`, colonna, gap 12.

   Dentro, dall'alto:
   - **La riga dello scatto**: flex, `align-items: center`, gap 12, con due lati `flex: 1`,
     `min-width: 0` e lo scatto al centro.
     - *Lato sinistro*, solo con almeno un foglio:
       - la **miniatura** è un `<button>` 44 × 44, raggio 14, bianco, `--ombra-nav`, con le
         righe finte (`repeating-linear-gradient(180deg, rgba(20,22,58,.16) 0 2px, transparent
         2px 7px)`, `inset: 7px`);
       - `aria-label`: `Rivedi il foglio preso` con un foglio, `Rivedi i {n} fogli presi` con
         più fogli;
       - accanto, gap 8, il **contatore** `{n} fogli` o `1 foglio`, mono 10/700/0,11em
         maiuscolo, bianco, `aria-hidden` perché il numero è già nel nome della miniatura;
       - la miniatura apre «Rivedi i fogli presi» (§F).
     - *Centro*, solo in modo `camera`: il **tasto di scatto**:
       - anello `--scatto-anello` (76), bordo 2 px bianco, fondo trasparente, con dentro il
         disco bianco `--scatto-disco` (62);
       - `aria-label="Scatta la foto del foglio"`;
       - premuto, l'anello va a `scale(.96)` e il disco a `scale(.88)` in `--moto-scatto`
         con `--curva-barra`;
       - `:focus-visible`: outline 2 px bianco, offset 4;
       - con `prefers-reduced-motion: reduce` niente transizione e niente trasformazione;
       - `disabled` finché lo stream non c'è, come oggi.
     - *Lato destro*, solo con almeno un foglio: **`Ho finito`**, pillola bianca alta 44,
       padding `0 16px`, raggio 999, `--ombra-nav`, mono 11/700/0,08em maiuscolo in `--ink`.
       Chiama `onFinito`.
   - **L'avviso**, se c'è: `<p role="status">` 12,5 in **bianco**, margine 0. Il testo è quello
     di oggi (`al massimo 12 fogli`, i conteggi degli scartati). È bianco e non `--avviso`
     perché sulla banda a 0,72 `--avviso` non regge il contrasto: l'eccezione è dichiarata in
     §J.
   - **L'ultimo foglio**, se è noto: `Ultimo foglio alle {HH:MM}`, mono 10/500/0,1em maiuscolo,
     bianco, padding `0 2px`. L'ora è quella locale dell'ultima pagina **aggiunta**, da scatto o
     da galleria, con ore e minuti a due cifre. Le pagine seminate da `iniziali` non hanno
     un'ora: se l'ultima pagina non ce l'ha, la riga non compare. Non si inventa un'ora.
   - **La galleria**:
     - un `<label>` alto almeno 50, larghezza piena, raggio 18, bordo 1,5 px `--banda-bordo`,
       fondo trasparente;
     - mono 11/700/0,08em maiuscolo, bianco, testo `Seleziona dalla galleria`;
     - dentro, l'input nascosto di oggi: `accept="image/*"`, `multiple`, senza `capture`, con
       l'`aria-label` di oggi `scegli le foto dalla galleria`;
     - c'è in tutti e tre i modi.

**Con zero fogli** la riga dello scatto porta solo lo scatto, e mancano anche la riga «ultimo
foglio», la miniatura e `Ho finito`. È una delle deviazioni di §M. In `fallback` a zero fogli la
riga dello scatto resta vuota e la banda porta solo la galleria.

**Altezza della banda.** La somma dei pezzi fa 20 + 76 + 12 + 13 + 12 + 50 + 26 ≈ **209** px con almeno un foglio
e senza avviso, ≈ **236** con l'avviso [ipotesi, dalle misure del mockup]. Resta sotto i 268 px della
cornice guida, quindi la banda non copre gli angoli bassi. Va misurato (§L).

## F. «Rivedi i fogli presi»

Un foglio dal basso (`DESIGN.md` §8), nuovo componente `src/app/(app)/importa/FogliPresi.tsx`,
montato da `Camera` quando la miniatura è premuta.

**Le props:**

```ts
interface Props {
  pagine: { url: string }[];
  onSposta: (indice: number, delta: -1 | 1) => void;
  onTogli: (indice: number) => void;
  onChiudi: () => void;
}
```

`Camera` gli passa le proprie `sposta` ed `elimina`, che esistono già e restano l'unico posto
che cambia le pagine.

**La forma:**
- **Velo**: assoluto `inset: 0` dentro la radice di `Camera`, `z-index: 4`, fondo
  `--overlay-foglio`. Un tap sul velo chiude.
- **Foglio**:
  - `role="dialog"`, `aria-modal="true"`, `aria-label="Rivedi i fogli presi"`, classe
    `.anim-foglio`;
  - ancorato in basso, fondo bianco, raggio `22px 22px 0 0`, padding `16px 16px 26px`;
  - colonna, gap 9, `max-height: calc(100% - 88px)`.
- **Intestazione**: un separatore mono 10/700/0,13em maiuscolo in `--testo-2`, col testo
  `{n} fogli · l'app li legge in quest'ordine`, oppure `1 foglio` da solo. L'ordine non è un
  dettaglio: l'estrazione legge le pagine in sequenza, ed è per questo che si possono spostare.
- **L'elenco**: `flex: 1`, `min-height: 0`, `overflow-y: auto`, colonna, gap 8. Ogni pagina è
  una riga flex, `align-items: center`, gap 12:
  - la **miniatura vera**: `<img>` 62 × 80, raggio 14, `object-fit: cover`, bordo 1 px
    `rgba(20,22,58,0.09)`, `alt="Foglio {i}"`. Qui ci vuole la foto: senza, spostare i fogli
    sarebbe spostare delle etichette. È un'eccezione a §12 «nessuna foto», dichiarata in §J;
  - il nome `Foglio {i}`, 15,5/700 in `--ink`, `flex: 1`, `aria-hidden` perché è già nell'`alt`
    e nei nomi dei tasti;
  - **tre tasti** 44 × 44, raggio 999, fondo `rgba(20,22,58,0.04)`, gap 4, icone 20 px a tratto
    1,8 in `--ink`:
    - freccia su, `aria-label="Sposta il foglio {i} più su"`, `disabled` sul primo;
    - freccia giù, `aria-label="Sposta il foglio {i} più giù"`, `disabled` sull'ultimo;
    - X, `aria-label="Togli il foglio {i}"`;
    - da spenti, l'icona passa a `--icona-spenta` e il fondo resta.
- **In fondo**, fuori dall'elenco, la voce **`Chiudi`**: un `<button>` alto 50, raggio 14, fondo
  `rgba(20,22,58,0.04)`, 15,5/700 centrato in `--ink`.

**Larghezza a 375 px.** La riga fa 62 + 12 + testo + 12 + (3 × 44 + 2 × 4) = testo + 226 px, su
343 disponibili (375 − 2 × 16). A `Foglio 12` restano più di 100 px [calcolo, non misura].

**Il comportamento:**
- **Fuoco.** All'apertura va sul foglio; alla chiusura torna sulla miniatura. `Esc` chiude.
- **Togliere l'ultimo foglio** chiude il foglio da solo, perché non c'è più niente da rivedere,
  e il fuoco va al tasto di scatto, o alla galleria se lo scatto non c'è.
- **Nessuna conferma su «togli»**, come oggi. Il foglio si rifà con uno scatto: l'azione costa
  un gesto e non perde dati salvati. §9, «ogni azione distruttiva passa da un dialogo», qui non
  si applica, e lo dico in §J invece di lasciarlo implicito.
- **Lo stream resta acceso.** Mentre il foglio è aperto lo stream resta acceso: chiudere il
  foglio deve riportare subito all'anteprima.

## G. Infrastruttura: tab bar nascosta e gesto indietro

**La tab bar su richiesta.** Nuovo `src/components/barra-context.tsx`, sullo stesso modello di
`marchio-context.tsx`:

```ts
export function BarraProvider({ children }: { children: ReactNode }): JSX.Element;
/** true finché il componente che la chiama è montato: al suo smontaggio la barra torna. */
export function useNascondiBarra(nascosta: boolean): void;
export function useBarraNascosta(): boolean;
```

`Guscio` avvolge il suo contenuto con `BarraProvider` e, quando `useBarraNascosta()` è vero,
**non renderizza `<TabBar />`**. Non basterebbe nasconderla col CSS: una barra invisibile
resterebbe raggiungibile da tastiera e da screen reader. `Camera` chiama
`useNascondiBarra(true)`. Senza provider, per esempio nei test di `Camera`, il default del
contesto è una funzione vuota, come in `marchio-context`.

Scartata, e lo ripeto perché è la domanda ovvia: la rotta `/importa/foto`. Sarebbe un indirizzo
più pulito, ma foto, PDF e bozza vivono nello stato della pagina `Importa` e andrebbero spostati
in un deposito condiviso fra due rotte. È troppo per quello che compra.

**Il gesto indietro.** A tutto schermo e senza tab bar, lo swipe indietro del telefono è il gesto
naturale per uscire dalla fotocamera. Senza una voce nella cronologia, uscirebbe da `/importa`
e perderebbe i fogli presi. In `Importa`:

- `apriFotocamera()`: `window.history.pushState(null, '')` sullo stesso URL, poi
  `setFotocameraAperta(true)`. Next 16 integra `pushState` nativo col suo router
  [fonte: `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`,
  «`window.history.pushState`»].
- Un ascoltatore `popstate`, montato una volta, fa `setFotocameraAperta(false)`.
- **Ogni uscita dalla fotocamera consuma quella voce**, così la cronologia non resta sporca:
  - tondo indietro (`onIndietro`) → `history.back()`, e il resto lo fa `popstate`;
  - gesto indietro del telefono → `popstate` direttamente;
  - `Ho finito` (`onFinito`) → `estrai('foto')`, che porta subito la vista a `estrazione`, poi
    `history.back()`. Quando `popstate` arriva, chiude una fotocamera che la vista non mostra
    già più.
- Dopo un errore di estrazione, `RIPROVA` torna ad `acquisizione` con la fotocamera chiusa,
  quindi sulle due porte. I fogli presi restano in `foto`, e riaprendo la fotocamera
  ricompaiono (`iniziali`), come oggi.

**Il rischio**, dichiarato: che il `popstate` sullo stesso URL faccia rimontare la pagina a Next,
facendo perdere i fogli. La documentazione dice di no [fonte: sopra], ma nessuno l'ha visto
succedere su questa app. Il piano lo verifica nel browser prima di costruirci sopra (§L). Se
rimonta, si ripiega su un parametro di ricerca `?fotocamera` e si torna qui a decidere.

## H. Il Dock diventa un landmark

`src/components/Dock.tsx`: il contenitore passa da `<div className="dock anim-dock">` a
`<div className="dock anim-dock" role="region" aria-label="Azione principale">`.

Vale per **tutti** i Dock, anche quelli della fase 2, Lista e Piano. Chi naviga per regioni con
lo screen reader trova l'azione principale senza scorrere la pagina. Il nome è uno per tutti,
perché descrive il posto e non l'azione, che ha già il suo nome sul tasto.

Cambia `DESIGN.md` §8 Dock, «Accesso», che oggi dice «non prende `role` propri» (§J).

## I. Copy che cambia

Le righe segnate **nuovo** sono testo scritto per questa fase: vanno approvate con la spec.

| Dove | Oggi | Diventa |
|---|---|---|
| Ricerca in Piatti (segnaposto e `aria-label`) | `Cerca un piatto` | `Cerca un piatto o un ingrediente` |
| Aggiungi in Piatti | `+ NUOVO PIATTO`, primario in fondo | `Nuovo piatto` (reso `NUOVO PIATTO`), tratteggiato in cima |
| Sottoriga del piatto | `7 INGR. · NUTRIZIONISTA` / `· PROPRIO` | `7 INGREDIENTI · DALLA DIETA` / `7 INGREDIENTI`; singolare `1 INGREDIENTE` |
| Pillola del pasto sulla riga | `PRANZO`, `CENA`… | via |
| Filtro dei pasti | `TUTTI` + un segmento per pasto | via |
| Vuoto di ricerca, seconda riga | `Cambia filtro, oppure aggiungine uno.` | `Prova un'altra parola, oppure aggiungine uno.` |
| Riga piatto, nome accessibile | il testo della scheda | `Apri {nome}` |
| Importa, selettore | `FOTO` / `PDF` | via |
| Importa, porta foto: titolo | — | **nuovo** `Fotografa i fogli` |
| Importa, porta foto: testo | — | **nuovo** `Inquadra un foglio alla volta, fino a 12. Se li hai già in galleria, li scegli da lì.` |
| Importa, porta foto: azione | — | **nuovo** `APRI LA FOTOCAMERA` |
| Importa, porta PDF: titolo | — | **nuovo** `Carica il PDF` |
| Importa, porta PDF: testo | — | **nuovo** `Se la dieta ti è arrivata in PDF, caricalo così com'è.` |
| Importa, porta PDF: azione | `Scegli il PDF della dieta` + input di sistema | **nuovo** `SCEGLI IL PDF` |
| Importa, PDF scelto | il nome del file dentro la scheda | il nome del file + **nuovo** `Cambia file` |
| `ESTRAI LA DIETA` | riga in coda, anche spenta | nel Dock, solo con un PDF scelto |
| Fotocamera, titolo | — | `Fotografa il piano` (mockup) |
| Fotocamera, indietro | — | `aria-label` `Indietro` (mockup) |
| Scatto | `Scatta` | nessun testo, `aria-label` `Scatta la foto del foglio` (§8) |
| Galleria | `DALLA GALLERIA` | `Seleziona dalla galleria` (reso maiuscolo) |
| Contatore dei fogli | le etichette `pag. N` sotto le miniature | `1 foglio` / `{n} fogli` |
| Miniatura | — | `aria-label` `Rivedi il foglio preso` / `Rivedi i {n} fogli presi` (mockup) |
| Chiusura | — | `Ho finito` (mockup, reso maiuscolo) |
| Ultimo scatto | — | `Ultimo foglio alle {HH:MM}` (mockup) |
| Rivedi, intestazione | — | **nuovo** `{n} fogli · l'app li legge in quest'ordine` / `1 foglio` |
| Rivedi, pagina | `pag. N` | `Foglio {i}` |
| Rivedi, tasti | `sposta pag. N a sinistra` / `a destra`, `elimina pag. N`, segni ◀ ✕ ▶ | `Sposta il foglio {i} più su`, `Sposta il foglio {i} più giù`, `Togli il foglio {i}` |
| Rivedi, chiusura | — | **nuovo** `Chiudi` |
| Dock, nome della regione | nessuno | **nuovo** `Azione principale` |

**Invariati:**
- `Nessun piatto qui`;
- tutto lo stato vuoto di Piatti;
- `Importa la dieta`;
- `ESTRAI LA DIETA`;
- `La fotocamera non è disponibile: scegli le foto dei fogli dalla galleria`;
- gli avvisi del tetto e degli scartati;
- le `aria-label` dei due input file;
- tutti i testi delle viste di Importa fuori scope.

## J. `DESIGN.md`, token e ponte

Il design system cambia **prima** del codice (Regola d'ingresso): il primo task del piano
aggiorna `design/sistema/DESIGN.md` con queste voci, poi il codice le segue.

1. **§8 Dock, «Accesso»**: `role="region"` e `aria-label="Azione principale"` sul contenitore.
   I controlli restano tasti normali. In «Cosa ci vive» si aggiunge `ESTRAI LA DIETA` (Importa,
   col PDF scelto).
2. **§8 Riga piatto**:
   - la sottoriga d'esempio diventa `7 ingredienti · dalla dieta`;
   - «Non porta la fonte del piatto né il pasto» diventa «Non porta il pasto. Della fonte dice
     solo `dalla dieta`, sui piatti che vengono dall'import»;
   - le porzioni escono dall'esempio, perché il dato non esiste [misurato: `Dish` in
     `src/domain/types.ts` non ha un campo porzioni].
3. **§8 Banda dei comandi**:
   - con zero fogli, miniatura, contatore, `Ho finito` e riga «ultimo foglio» non ci sono;
   - l'avviso in linea sulla banda è bianco, non `--avviso`;
   - in alto il chrome: tondo indietro 44 e pillola di titolo alta 44, bianchi, `--ombra-nav`;
   - la cornice guida a `inset 88 / 40 / 268`, che il mockup ha e §8 no.
4. **§8 Striscia dei fogli presi**, «Rivedi i fogli presi»: da fila orizzontale di tessere
   62 × 80 con la sola X, a **foglio dal basso con le pagine in colonna**. Ogni riga porta la
   miniatura 62 × 80, `Foglio {i}` e i tre tasti 44 (su, giù, togli), e in fondo `Chiudi`. Il
   riordino c'è perché l'ordine è l'ordine di lettura.
5. **§12 «nessuna foto»**: eccezione dichiarata per le foto dell'utente, cioè l'anteprima della
   fotocamera e le miniature di «Rivedi i fogli presi». Sono contenuto del dispositivo, non
   illustrazione.
6. **§9 Conferme**: una riga per dire che «togli il foglio» non chiede conferma, e perché (§F).

**Token nuovi in `globals.css`**, copiati da `design/sistema/tokens.css` con gli stessi valori.
Il guardiano `scripts/token-check.ts` li confronta:
- `--bordo-tratteggio`, `--overlay-foglio`, `--riga-piatto`;
- `--scatto-anello`, `--scatto-disco`, `--moto-scatto`;
- `--banda-fondo`, `--banda-bordo`.

**Classi nuove in `globals.css`**: `.porta-azione` (§C), `.scatto` con `.scatto-disco` e la
variante `prefers-reduced-motion` (§E).

**Il ponte** `docs/superpowers/specs/DESIGN-SYSTEM.md`:
- §3: Riga piatto, Porta, Tasto di scatto, Banda dei comandi, Striscia dei fogli presi, Foglio
  «Rivedi», Campo in modalità ricerca e Aggiungi tratteggiato, ciascuno col suo file e il suo
  stato;
- §9: i token rimisurati.

**Claude Design.** Le voci 1–6 sono un delta del design system: vanno portate nel pacchetto del
progetto «Spesa» come le altre volte. Lo fa Andrea a mano, come per il `CLAUDE.md` di lì.

## K. Errori e casi limite

- **Repertorio con un piatto senza ingredienti**, né fissi né di componente: sottoriga
  `0 INGREDIENTI`, nessun pallino. Non si nasconde la riga.
- **Ricerca con solo spazi**: tutti i piatti (§B.1).
- **Fotocamera rifiutata o assente**: modo `fallback`. Niente scatto e niente cornice guida,
  c'è il testo al centro e la galleria nella banda. Il tondo indietro c'è sempre, quindi dalla
  schermata si esce sempre.
- **Tetto dei 12 fogli**: lo scatto al tredicesimo non aggiunge niente e l'avviso lo dice. Le
  foto dalla galleria oltre il tetto si scartano con l'avviso di oggi. Tutto invariato, cambia
  solo dove si legge.
- **Ricarica della pagina a fotocamera aperta**: lo stato riparte e la fotocamera è chiusa. La
  voce di cronologia orfana, tornandoci sopra, esegue un `setFotocameraAperta(false)` su una
  fotocamera già chiusa, cioè niente. I fogli presi erano solo in memoria e si perdono, come
  oggi.
- **`Ho finito` con un'estrazione che fallisce**: vista `errore`, poi `RIPROVA` → le due porte, e
  i fogli sono ancora lì (§G).
- **Tastiera**: la ricerca di Piatti apre la tastiera, e in Piatti non c'è Dock da coprire. In
  Importa il Dock compare solo dopo la scelta del file, senza campi di testo.
- **Safe area in alto**: il `viewport` non dichiara `viewport-fit=cover` [misurato:
  `src/app/layout.tsx`], quindi il browser tiene il contenuto fuori dalla notch e i 22 px del
  chrome partono dal bordo sicuro [ipotesi, da vedere sul telefono al gate].
- **`prefers-reduced-motion`**: niente transizione sullo scatto e niente `.anim-foglio`.

## L. Test

**Puri**, prima di tutto: `src/domain/__tests__/ricerca-piatti.test.ts`.
- `ingredientiDelPiatto`:
  - fissi più opzioni di componente, senza duplicati;
  - un piatto senza componenti dà i soli fissi;
  - un piatto con soli componenti dà quelli delle opzioni.
- `cercaPiatti`, le sei regole di §B, un'asserzione ciascuna:
  - vuoto e spazi → tutti;
  - accenti, maiuscole e spazi doppi ignorati;
  - un match sul solo ingrediente, con l'esempio della ricotta dentro le lasagne;
  - un match su un ingrediente di un'opzione;
  - la sottostringa intera (`pasta tonno` non trova il caso misto);
  - un id sconosciuto ignorato;
  - l'ordine conservato.

**Componenti:**
- `Dock`: il contenitore è una `region` di nome `Azione principale`
  (`getByRole('region', { name: 'Azione principale' })`), e i test esistenti restano.
- `Porta`: titolo, testo e azione renderizzati; l'azione è quella passata.
- `barra-context` con `Guscio`: con un figlio che chiama `useNascondiBarra(true)` la
  `navigation` `Sezioni` non c'è; smontato il figlio, torna.
- `FogliPresi`:
  - `dialog` di nome `Rivedi i fogli presi`;
  - una riga per pagina con `alt` `Foglio {i}`;
  - su spento sul primo e giù spento sull'ultimo;
  - i callback ricevono indice e verso giusti;
  - `Chiudi`, il velo ed `Esc` chiamano `onChiudi`;
  - l'intestazione al singolare e al plurale.
- `Camera`, il file di oggi adattato:
  - i test di logica restano con le asserzioni di oggi: ricompressione, tetto, scartati, niente
    setState durante il render, revoca degli URL, `iniziali`, tracce fermate;
  - cambiano i nomi cercati, per esempio `Seleziona dalla galleria`, `Scatta la foto del
    foglio`, e riordino ed eliminazione passano dal foglio;
  - nuovi: a zero fogli non ci sono miniatura, `Ho finito` né «ultimo foglio»; con un foglio
    ci sono, `Ho finito` chiama `onFinito` e il tondo chiama `onIndietro`;
  - l'ora dell'ultimo foglio è quella dello scatto, con l'orologio finto di Vitest, e non
    compare dopo un rimontaggio con sole `iniziali`;
  - togliere l'ultimo foglio chiude «Rivedi».

**Pagine:**
- **Piatti**, `page.test.tsx` e `ricerca.test.tsx`:
  - nessun filtro;
  - l'aggiungi tratteggiato porta a `/piatti/nuovo` e sta prima della prima riga nel DOM;
  - ogni riga è un link di nome `Apri {nome}` verso `/piatti/{id}`;
  - le sottorighe `N INGREDIENTI · DALLA DIETA` e `N INGREDIENTI`, e il singolare;
  - i pallini contano anche gli ingredienti dei componenti;
  - la ricerca per ingrediente;
  - il vuoto di ricerca col testo nuovo;
  - lo stato vuoto e le due porte invariati;
  - `leggiSlotDefs` non viene più chiamata.
- **Importa**, `page.test.tsx`:
  - senza bozza: le due porte, nessun Dock, nessun selettore;
  - `APRI LA FOTOCAMERA` monta la fotocamera, senza Testata e senza tab bar, e chiama
    `history.pushState`;
  - un `popstate` la chiude e torna alle porte, con i fogli conservati;
  - `Ho finito` manda **solo** le immagini, con il PDF ignorato anche se scelto;
  - scelto un PDF, il nome del file, `Cambia file` e `ESTRAI LA DIETA` nel Dock;
  - `ESTRAI LA DIETA` manda **solo** il documento, anche con fogli presi;
  - i test di oggi sugli esiti (413, 429, 400, 422, 401, 503, senza sessione, rifiuto, bozza,
    ripresa) restano, cambiando solo il modo di arrivare al tasto;
  - «riprova conserva le foto» passa dalle porte.
- **Censimento prima di toccarli**: il piano elenca i test esistenti che cercano `Cerca un
  piatto`, `TUTTI`, `+ NUOVO PIATTO`, `INGR.`, `NUTRIZIONISTA`, `PROPRIO`, `Cambia filtro`,
  `FOTO`, `PDF`, `DALLA GALLERIA`, `Scatta`, `pag. N`, `sposta pag.`, `elimina pag.`, e la
  riga `.coda-barra` di Importa.

**Nel browser**, a 375 × 812 dalla sonda usa-e-getta sotto `src/app/auth/`, come nelle fasi 1 e
2. Dopo la sonda si cancellano anche `.next/dev/`. Le misure vanno nel rapporto, non dedotte:

1. **Piatti**:
   - l'ultima riga non finisce dietro la tab bar, a barra grande e ridotta;
   - l'aggiungi sta in cima;
   - il nome lungo va in ellissi su una riga;
   - con la ricerca attiva il campo resta fermo.
2. **Importa**, le due porte:
   - scelto un PDF, il Dock compare e non copre la porta PDF (coda `--coda-scroll-dock`).
3. **Fotocamera**, nel `fallback` del browser della sonda [ipotesi: lì la fotocamera non c'è]:
   - l'altezza della radice è uguale a quella del guscio, ±1 px;
   - la tab bar è assente dal DOM;
   - l'altezza della banda, a zero fogli e con l'avviso;
   - la banda non supera i 268 px che la cornice guida lascia liberi;
   - il chrome in alto non si sovrappone alla banda.
4. **«Rivedi»** con 12 fogli: l'elenco scorre e `Chiudi` resta visibile.
5. **Gesto indietro**: `history.back()` dalla fotocamera torna alle porte **senza ricaricare né
   rimontare** la pagina, con i fogli presi ancora lì. È il rischio di §G, e si verifica prima
   di scrivere il resto di Importa.

**Gate finale (Andrea), dal telefono:**
- **Piatti**: cercare un piatto per un ingrediente che non è nel nome.
- **Importa**, fino alla revisione:
  - aprire la fotocamera, fotografare i fogli della dieta, riordinarne due in «Rivedi», toglierne
    uno e rifarlo;
  - provare lo swipe indietro;
  - `Ho finito`, poi la revisione si apre.
- Il gate si ferma alla revisione, **senza `SOSTITUISCI IL PIANO`**: nessun dato vero cambia.
- Ogni estrazione consuma un tentativo del tetto di import della casa [fonte:
  `src/app/api/import/estrai/route.ts`, commento sul tetto], quindi va fatta una volta sola.
- La prova col PDF si fa nella stessa sessione solo se il tetto lo consente.

## M. Dove la spec si discosta dal disegno approvato in chat

Tre punti, tutti decisi scrivendo la spec, da confermare con la review:

1. **`Ho finito` a zero fogli non c'è, invece di essere spento.** In chat avevo detto «spento».
   Ma `DESIGN.md` §8 Dock scrive «quando il primario non deve esistere, non c'è: non si mostra
   un primario spento», e la banda è il Dock di questa schermata. Su un fondo scuro, poi, lo
   stato spento del sistema (`rgba(20,22,58,0.10)` con `--ter`) non si vede, e servirebbe un
   alfa nuovo. Col primo foglio compaiono insieme miniatura, contatore e `Ho finito`.
2. **Il numero degli ingredienti conta anche le opzioni dei componenti** (§B). Il testo
   approvato è lo stesso, `N INGREDIENTI`; cambia cosa conta. Oggi i piatti fatti solo di
   componenti a scelta mostrano `0 INGR.` e nessun pallino. Quanti piatti in produzione hanno
   componenti non l'ho misurato: [ipotesi] sono quelli dell'import, dove le alternative («pane
   o fette biscottate») sono frequenti.
3. **Il campo di ricerca sta fuori dallo scroller.** Nel mockup, a leggerlo, scorre con la
   lista. Lo tengo fermo per non perderlo con la tastiera aperta, ed è il comportamento di oggi.

## N. Esecuzione

Un piano in `docs/superpowers/plans/2026-09-23-piatti-fotocamera.md`, subagent-driven, in un
worktree, con un task per riga:

1. **`DESIGN.md`**: le sei voci di §J, i token copiati in `globals.css`, il guardiano verde.
   Nessun codice di schermata.
2. **`ricerca-piatti.ts`** con i suoi test puri.
3. **Componenti condivisi**:
   - `Porta` estratta, con `.porta-azione`;
   - il landmark del `Dock`;
   - `barra-context` in `Guscio`;
   - i loro test, più i test di Piatti che toccano le porte, perché lì non cambia niente.
4. **Piatti**: lista, riga, aggiungi, ricerca, vuoto di ricerca, censimento e aggiornamento dei
   test di pagina.
5. **La prova del gesto indietro nel browser** (§L.5), prima di Importa. È un task piccolo e
   separato, così se fallisce si decide prima di aver riscritto la fotocamera.
6. **`Camera` e `FogliPresi`**: la forma nuova sulla logica di oggi, coi test.
7. **Importa**: le due porte, `estrai(sorgente)`, fotocamera aperta e chiusa, cronologia, Dock
   del PDF, censimento e aggiornamento dei test di pagina.
8. **Verifica nel browser** con la sonda (§L), le misure, e il ponte `DESIGN-SYSTEM.md`.

**L'ordine dei task:**
- il 3 va prima del 4 e del 7;
- il 6 va prima del 7;
- il 4 e il 6 toccano file diversi.

**Le review:**
- review di correttezza sul task 2, l'unico con logica di dato;
- review sul task 7, l'unico che tocca la cronologia del browser;
- review finale su tutto il ramo prima della PR.
