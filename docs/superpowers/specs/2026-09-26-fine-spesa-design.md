# Fase 6 — Fine della spesa ed Entra

**Obiettivo:** portare nel sistema di `design/sistema/DESIGN.md` v3 le tre schermate che nessuna
fase ha toccato e che non chiedono componenti nuovi: il traguardo (`/lista/fatta`), Confezioni
diverse (`/lista/confezioni`) ed Entra (`/entra`). Si misura così: nei tre file non resta un
colore scritto a mano, un bersaglio sotto 44, una classe Tailwind o un'intestazione fatta a mano;
`CHIUDI LA SPESA` sta nel Dock; la scansione di Confezioni è la stessa della Dispensa; il
comportamento sui dati è identico a oggi (stessi test di dato verdi, nessuna migrazione).

**Perché queste tre, e prima delle altre** (brainstorming del 26/09). Con la fase 5 tutte le
schermate di `DESIGN.md` v3 sono ridisegnate (`DESIGN-SYSTEM.md` §9). Restano fuori sette fronti
[misurato, audit del 26/09]: queste tre, l'editor del Piatto, Piatti veloce, Scegli e i passi di
Importa diversi dalla fotocamera. Andrea li ha divisi in tre fasi:

| Fase | Schermate | Perché in quest'ordine |
|---|---|---|
| **6 — questa** | traguardo, Confezioni, Entra | nessun componente nuovo; è il gesto di ogni sabato; `CHIUDI LA SPESA` è l'unica azione irreversibile del gruppo |
| 7 | Piatto, Piatti veloce, Scegli | aspetta la decisione «Scegli riusa Piatti o no», aperta dal 18/09 |
| 8 | Importa, passi oltre la fotocamera | chiede probabilmente un selettore nuovo, quindi un giro in Claude Design |

**Le decisioni di Andrea che questa spec applica** (26/09):

1. **`CHIUDI LA SPESA` non chiede conferma.** Restano due passi, come deciso il 20/09: `HAI PRESO
   TUTTO` porta al traguardo, e il traguardo *è* la conferma. È un'eccezione a §9 Conferme e va
   scritta lì, col suo perché.
2. **Il traguardo usa il Dock e la pillola indietro.** `CHIUDI LA SPESA` va nel Dock, nello stesso
   posto di `HAI PRESO TUTTO`; `TORNA ALLA LISTA` diventa la pillola della Testata in modo indietro.
3. **In Confezioni si scansiona in un foglio dal basso**, con `LettoreCodice`, come nella Dispensa.
   `Scanner.tsx` si cancella.
4. **Entra mostra Marchio e nome, senza la frase di posizionamento.** La frase resta alla landing.

**Fuori scope, esplicitamente:**
- la logica di `chiudiSpesa`, `aggiornaFormatoDaScansione`, `/api/prodotto/[ean]`, `leggiListe`,
  `leggiVociComprate`, `leggiRisparmioSettimana`: si chiamano come oggi, con gli stessi argomenti;
- `/auth/callback`, il proxy e il flusso del magic link: cambia solo la pagina che lo chiede;
- la Lista (`/lista`): il suo Dock `HAI PRESO TUTTO` resta com'è; cambia solo da dove importa la
  regola «lista finita» (§D.1);
- le famiglie di token diverse dai colori (`--testo-*`, `--spazio-*`, `--raggio-*`, moto): §9 di
  `DESIGN-SYSTEM.md` le vuole portate dentro una famiglia per volta, e questa fase non ne apre una;
- `LettoreCodice.tsx` resta dov'è (`src/app/(app)/dispensa/`): lo importano già l'editor
  dell'ingrediente e la Dispensa, Confezioni diventa il terzo.

**Il database non cambia. Nessuna migrazione.**

---

## A. Il traguardo — `/lista/fatta`

`src/app/(app)/lista/fatta/page.tsx`.

### A.1 Cosa non cambia

L'ingresso e le uscite restano quelli di oggi [letto nel codice]:
- senza settimana corrente → `router.replace('/lista')`;
- settimana `chiusa` → `router.replace('/piano')`;
- lista assente o non finita → `router.replace('/lista')`;
- la lettura del non ricomprato che fallisce non blocca: la scheda non compare e si chiude lo
  stesso;
- `CHIUDI LA SPESA` → `chiudiSpesa(weekId)` → `router.push('/piano')`; se fallisce, messaggio e
  si riprova dallo stesso tasto.

I testi delle schede restano parola per parola (`testoNonRicomprato`, «L'app registra cosa hai
comprato e quando…» con `fraCadenza`).

### A.2 Testata

`Testata` in modo indietro:

```tsx
<Testata
  titolo="Fine spesa"
  settimana={stato?.settimanaLabel}
  indietro={{ etichetta: 'LISTA', ariaLabel: 'Torna alla lista', onTorna: () => router.push('/lista') }}
/>
```

- **Il titolo diventa `Fine spesa`.** In modo indietro la pillola `LISTA` sta sopra il titolo:
  con il titolo `Lista` di oggi la schermata direbbe due volte la stessa parola, e la pillola non
  direbbe più «dove porta» ma «dove sei». `Fine spesa` è la causa per cui si è qui. **[Da
  confermare con Andrea in revisione: è l'unico testo nuovo di questa spec che lui non ha visto.]**
- **La pillola settimana resta**, sotto il titolo. Oggi il modo indietro di `Testata` non la rende
  (`Testata.tsx`, ramo `if (indietro)`): la fase la aggiunge, con le stesse misure del modo
  normale (§D.2). Qui serve: `CHIUDI LA SPESA` chiude *quella* settimana.
- `TORNA ALLA LISTA` in fondo sparisce. La tab bar resta visibile, con Lista attiva, come oggi.

### A.3 Il corpo, dall'alto

Contenitore che scorre come oggi (`sc scroll-app`), padding `6px 16px`, colonna gap 12,
contenuto centrato in verticale. La coda di scorrimento è quella di una schermata con il Dock
(la stessa della Lista a lista finita).

1. **Scheda del traguardo** — Scheda di §8: fondo `var(--superficie)`, raggio 22, bordo 1 px
   `var(--bordo)`, padding `26px 20px`, testo centrato.
   - `<Marchio />` pieno (senza `aree`), **lato 20**, gap 4, raggio `20 × 0,28`: la resa grande di
     §8 Marchio. Centrato, 20 sotto. Sostituisce la griglia scritta a mano (22 px, raggio 6), che
     non è una taglia ammessa.
   - `Hai preso tutto`: 21/800/-0,035em, lh 1,2, `--ink`, 8 sotto.
   - il testo di oggi, 14/1,5, in **`--testo-2`** (oggi `#8A8A96` = `--sec`, sotto AA per un testo
     che informa, §2.1 e §11).
2. **`NON RICOMPRATO QUESTA SETTIMANA`**, solo se ci sono righe (come oggi). Fondo
   `rgba(20,22,58,0.035)` (una delle quattro alfe di §2.5; lo `0,045` di oggi è riservato alla
   riga pasto fuori casa), raggio 20, padding `16px 18px`. Etichetta mono 9/700/0,12em in
   `--testo-2`; riga principale 13,5/1,5 `--ink`; secondaria 12/1,45 `--testo-2`.
3. **`CHIUDENDO LA SPESA`**, stessa forma della 2.
4. **`CONFEZIONI DIVERSE? SCANSIONA`**: link in linea, centrato, sotto la scheda 3. Mono
   10,5/700/0,12em, `--ink`, sottolineato (offset 3). Bersaglio **alto almeno 44** (oggi il
   padding lo lascia a circa 21) [ipotesi sulla misura di oggi, da misurare nella sonda]. Porta a
   `/lista/confezioni` come oggi: resta **prima** del Dock, nell'ordine di lettura, perché dopo la
   chiusura non serve più (il test `il link alle confezioni sta prima di CHIUDI LA SPESA` resta).
5. **Errore di chiusura**, se c'è: `MessaggioErrore` (`--errore`, 12,5) con `role="alert"`, in coda
   al corpo. Testo di oggi: `Non siamo riusciti a chiudere la spesa. Riprova.`

### A.4 Il Dock

```tsx
<Dock>
  <button type="button" className="dock-primario" onClick={onChiudi} disabled={chiudendo}
    style={{ opacity: chiudendo ? 0.5 : 1 }}>
    CHIUDI LA SPESA
  </button>
</Dock>
```

- Il Dock **esiste solo quando i dati ci sono** (`stato !== null`): in caricamento, in errore di
  caricamento e durante i `router.replace` non c'è (§8 Dock: «quando il primario non deve esistere,
  il Dock non c'è»).
- In volo: `disabled` e opacità 0,5 (§9 Feedback di scrittura; oggi 0,7).
- **Il doppio tocco.** `HAI PRESO TUTTO` e `CHIUDI LA SPESA` occupano lo stesso punto dello
  schermo. Un secondo tocco rapido su `HAI PRESO TUTTO` non deve chiudere la spesa. Lo impedisce
  il fatto che il Dock del traguardo compare solo dopo tre letture di rete
  (`leggiSettimanaCorrente`, `leggiListe`, `leggiRisparmioSettimana`) [ipotesi: che siano più
  lente di un doppio tocco va misurato]. **Guardia esplicita, comunque:** il tasto ignora i tocchi
  per **400 ms** dal momento in cui compare. Costa poco, e la decisione 1 toglie il dialogo: la
  guardia è quello che resta fra un tocco sbagliato e un'azione irreversibile. La sonda (§F.2)
  misura il caso senza guardia e con.

### A.5 Caricamento ed errore

- **Caricamento**: la Testata e sotto la riga mono `CARICO…` in `--sec` (§8 Messaggi,
  Caricamento). Oggi la pagina mostra solo la Testata.
- **Errore di caricamento**: `MessaggioErrore` al posto del corpo (oggi un `<p>` in `--sec`).
  Testo di oggi.

---

## B. Confezioni diverse — `/lista/confezioni`

`src/app/(app)/lista/confezioni/page.tsx`.

### B.1 Cosa non cambia

[letto nel codice]
- Ingresso: stesse tre guardie del traguardo (§A.1), e solo le voci `porzionabile`.
- La scrittura: `scrivi(voce, formato, ean, confezioni, poi)` resta com'è: allinea tutte le voci
  dello stesso ingrediente, mette le confezioni sulla prima e 0 sulle altre, segna `AGGIORNATO`
  solo se formato o confezioni cambiano, `spesa già chiusa` → `/piano`, errore → messaggio e
  `RIPROVA`.
- La decisione dopo la lettura del codice: non trovato o senza quantità → a mano; unità diversa →
  non aggiorna; formato uguale → memorizza il codice e dice «confermato»; formato diverso →
  proposta con «Quante ne hai comprate?» precompilato con `necessarieCon`.
- La validazione dei campi: `numeroDaCampo` (intero 1..`FORMATO_MAX`, solo cifre) e
  `interoDaCampo` (0..`CONFEZIONI_MAX`).
- Tutti i testi degli esiti, parola per parola.

### B.2 Testata e intestazione

- `Cornice` con l'intestazione a tre zone scritta a mano (freccia 44, `CONFEZIONI` mono al
  centro) **sparisce**. Al suo posto:

  ```tsx
  <Testata
    titolo="Confezioni"
    indietro={{ etichetta: 'FINE SPESA', ariaLabel: 'Torna a fine spesa', onTorna: () => router.push('/lista/fatta') }}
  />
  ```

  La pillola dice dove porta, col titolo che il traguardo prende in §A.2. Se Andrea cambia quel
  titolo, cambia anche questa etichetta.
- Il sottotitolo `Le confezioni vere` (21/800) **sparisce**: ripeterebbe il titolo. Resta la frase
  sotto, come Nota: 13/1,5 in `--testo-2` (oggi `#8A8A96`).
- Il link `TORNA A HAI PRESO TUTTO` in fondo **sparisce**: lo fa la pillola.

### B.3 L'elenco

Una Scheda per voce (§8 Scheda: bianco, raggio 22, bordo 1 px `--bordo`, padding 16), gap 12
fra le schede. Dentro, una riga:
- a sinistra il nome, 15/700 `--ink`, ellissi su una riga; sotto, in mono 11/0,06em
  **`--testo-2`** (oggi `--sec`), `{confezioni} × {formato}` più ` · AGGIORNATO` se la voce è stata
  aggiornata in questa visita;
- a destra la pillola **`SCANSIONA`**: `STILE_PILLOLA` (alta 44, oggi 40), fondo `--ink`, testo
  `--superficie`. Nome accessibile `Scansiona {nome}` (oggi è solo `SCANSIONA`, uguale su ogni
  riga).

Nessun riquadro si apre più dentro la scheda: tutto quello che oggi si espande sotto la riga va
nel foglio.

**Nessuna voce da scansionare**: la Scheda di oggi con `Niente da scansionare: le voci comprate
sono tutte a pezzo o a stima.`, fondo `rgba(20,22,58,0.035)` (oggi `0,045`), testo 13,5 `--ink`.

### B.4 Il foglio di scansione

`SCANSIONA` apre un `FoglioDalBasso`:

```tsx
<FoglioDalBasso etichetta={`Confezione di ${voce.nome}`} onChiudi={chiudi} altezza="alto">
  <TestataFoglio onChiudi={chiudi} etichettaChiudi="Chiudi la scansione">
    <span /* 15,5/700 --ink */>{voce.nome}</span>
  </TestataFoglio>
  <div className="sc corpo-foglio" /* padding 12px 16px 26px, colonna gap 12, scorre */>
    …
  </div>
</FoglioDalBasso>
```

La stessa forma di `ScansioneConfezione.tsx` della Dispensa. Un foglio alla volta: l'unica voce
aperta è quella del foglio. Il contenuto per fase:

| Fase (l'`Esito` di oggi) | Nel foglio |
|---|---|
| `null` (leggo) | `<LettoreCodice onCodice={…} />` |
| `cerco` | riquadro esito (sotto) con `CODICE {ean}` e `Cerco nel catalogo…` 12,5 `--testo-2` |
| `unita-diversa` | riquadro con il testo di oggi; `TastoSecondario` `CHIUDI` a tutta larghezza |
| `confermo` | riquadro con `Formato …, come in lista. Memorizzo il codice…`; se la scrittura fallisce, `MessaggioErrore` e `RIPROVA` (`TastoPrimario`) accanto a `CHIUDI` |
| `confermato` | riquadro con `Formato confermato: …`; `CHIUDI` a tutta larghezza |
| `proposta` | riquadro con la riga prodotto (15,5/700) e il testo; poi «Quante ne hai comprate?»; `LASCIA` (secondario) e `AGGIORNA` (primario) affiancati, `flex: 1` |
| `manuale` | riquadro con il messaggio e, se c'è, la riga prodotto; il campo del formato; poi «Quante ne hai comprate?»; `LASCIA` e `AGGIORNA` |

- **Il riquadro esito** è quello dell'Anteprima di scansione di §8: fondo `rgba(20,22,58,0.04)`,
  raggio 14, padding 14, colonna gap 8, con in cima `CODICE {ean}` in mono 10/700/0,13em
  `--testo-2` quando il codice c'è.
- **I tasti** sono `TastoPrimario` e `TastoSecondario` di `controlli.tsx` (54, raggio 18): oggi
  sono pillole da 40 scritte nella pagina (`Primario`, `Secondario`), che spariscono.
- **I campi** («Formato a mano» e «Confezioni comprate») seguono il Campo numerico di §8: largo
  96, alto 44, raggio 14, bordo 1 px `--bordo`, fondo `--superficie`, mono 14/700 allineato a
  destra, l'unità accanto in mono 10 maiuscolo `--ter`. Stessi `aria-label` di oggi, stessa
  `inputMode="numeric"`.
- **`LASCIA` e il ✕ chiudono senza scrivere**, come `LASCIA` e `CHIUDI` oggi. Il velo chiude (è il
  default di `FoglioDalBasso`).
- **`AGGIORNA`** chiama `scrivi(…, 'chiudi')`: a scrittura riuscita il foglio si chiude e la riga
  mostra `· AGGIORNATO`. In volo: `disabled`, opacità 0,5.
- **La lettura del catalogo** passa da `cercaProdotto(ean)` di `LettoreCodice.tsx` al posto della
  `fetch` scritta nella pagina: `'sessione'` → `router.replace('/entra')`, `'errore'` → esito
  `manuale` col messaggio di oggi sul catalogo. Il tipo `RispostaProdotto` locale sparisce: si
  usa quello di `src/domain/scansione-dispensa.ts` [da verificare nel piano che le due forme
  coincidano; se no, si tiene il locale].
- **Chiudere il foglio con una scrittura in volo** si comporta come chiudere il riquadro oggi: la
  scrittura continua, al ritorno allinea le voci e segna `AGGIORNATO`; un errore arrivato a foglio
  chiuso non si mostra (oggi uguale: `attivaRef` diverso). Le guardie `attivaRef` e `scrivendo`
  per voce restano: dopo aver chiuso si può aprire un'altra voce mentre la prima scrive.

### B.5 Caricamento ed errore

Come il traguardo (§A.5): `CARICO…` sotto la Testata; errore in `MessaggioErrore`.

### B.6 Cosa si cancella

- `src/components/Scanner.tsx` (e il suo test, se ne ha uno): Confezioni era l'unico uso
  [da verificare nel piano con una ricerca di `Scanner` in `src/`]. `useLettoreCodici` resta: lo
  usa `LettoreCodice`.
- In `confezioni/page.tsx`: `Cornice`, `Riquadro`, `Testo`, `Errore`, `Azioni`, `Primario`,
  `Secondario`, il tipo `RispostaProdotto` locale e la `fetch` diretta.

---

## C. Entra — `/entra`

`src/app/entra/page.tsx`. `src/app/page.tsx` resta un `redirect('/lista')`.

### C.1 Cosa non cambia

[letto nel codice] `signInWithOtp` con `emailRedirectTo` su `/auth/callback`; i due messaggi di
`?errore=` (`link-non-valido`, `accesso-fallito`) e il ripiego; la lettura di `window.location`
in un effetto.

### C.2 La pagina

Fuori dal Guscio: niente Testata, niente tab bar, niente Menù utente.
**Via Tailwind: stile inline** come nel resto dell'app.

- `main` a tutta altezza, fondo `var(--sfondo-schermata)` (il gradiente di §2.4; oggi
  `--fondo` a tinta piena), colonna centrata in verticale e in orizzontale, padding `48px 16px`,
  contenuto largo al massimo 360.
- In alto `<Marchio />` pieno, **lato 20**, centrato; 16 sotto.
- `Dispesa`, `h1` 52/800/-0,05em, lh 1, `--ink`, centrato (oggi `Spesa`: il nome del prodotto è
  Dispesa, `DESIGN.md` e il manifest). 40 sotto.
- **Il modulo** (colonna, gap 12):
  - Campo di testo di §8 con etichetta: `<label>` visibile `EMAIL` in mono 10/700/0,16em `--ink`,
    7 sopra il campo (oggi solo `sr-only`); il campo alto 44, raggio 14, padding `0 14px`, fondo
    `--superficie`, bordo 1 px `--bordo`, `--ombra-pannello`, testo 14. `type="email"`,
    `required`, `autoComplete="email"`, segnaposto `La tua email`.
  - `TastoPrimario` `type="submit"`: **`ENTRA CON UN LINK`** (oggi `Entra con un link`, minuscolo
    e alto 52). In volo `disabled` a opacità 0,5, stesso testo (oggi `Invio in corso…`: §9 vuole
    lo stato sul controllo, non un'altra etichetta).
  - Errore, se c'è: `MessaggioErrore` con `role="alert"` sotto il tasto (oggi `--ink-2`). Testi di
    oggi.
- **Dopo l'invio**, al posto del modulo:
  - `Ti ho mandato un link a {email}: aprilo per entrare.` 15/1,5 `--ink`, centrato, l'indirizzo
    in 700 (oggi `Controlla la posta.`, che non dice a quale indirizzo);
  - `TastoSecondario` **`USA UN'ALTRA EMAIL`**, 20 sopra: torna al modulo con il campo vuoto e
    l'errore azzerato.

---

## D. Trasversale

### D.1 La regola «lista finita», una volta sola

Oggi è scritta tre volte [letto nel codice]: `tuttoFatto` in `lista/page.tsx`, `tuttoFatto` +
`contaEControlli` in `lista/fatta/page.tsx`, `tuttoFatto` in `lista/confezioni/page.tsx` (con il
commento «copiata, non importata da una pagina»). La regola: almeno una voce, ogni voce spuntata,
nessun controllo in sospeso, su base e top-up insieme.

Va in `src/domain/lista-finita.ts`:

```ts
/** Almeno una voce, tutte spuntate, nessun controllo in sospeso (base e top-up insieme). */
export function listaFinita(lista: ListaSalvata): boolean;
/** Le voci contate da listaFinita: il «N voci su N» del traguardo. */
export function contaVoci(lista: ListaSalvata): number;
```

Le tre pagine la importano. Il test di dominio copre i casi che oggi i test delle pagine coprono
indirettamente: lista vuota, una voce non spuntata, tutto spuntato con un controllo in sospeso,
tutto spuntato senza controlli, voci divise fra base e top-up. `areeMancanti` della Lista resta
nella Lista: è un'altra domanda.

### D.2 Testata: la pillola settimana anche in modo indietro

In `src/components/Testata.tsx`, il ramo `if (indietro)` rende anche `settimana`, se c'è, sotto
il titolo, con le stesse misure del modo normale (alta 34, raggio 999, fondo `--ink`, mono
10,5/700/0,13em bianco, maiuscolo). Chi oggi usa il modo indietro (Piatti, Importa, editor
dell'ingrediente) non passa `settimana` e non cambia.

### D.3 Colori

Nei tre file ogni colore scritto a mano diventa un token: `#FFFFFF` → `var(--superficie)`,
`#14163A` → `var(--ink)`, `#8A8A96` su testo che informa → `var(--testo-2)`,
`rgba(20,22,58,0.16)` e `0.07` nei bordi → `var(--bordo)`. Il bordo `1.5px rgba(20,22,58,0.16)`
dei secondari sparisce con i secondari stessi (§B.6, §A.2).

---

## E. Documenti

- **`DESIGN.md`**:
  - §9 Conferme, fra le eccezioni dichiarate: *(26/09, fase 6) **`CHIUDI LA SPESA` non chiede il
    dialogo** pur essendo irreversibile: ci si arriva solo da `HAI PRESO TUTTO`, e il traguardo è il
    secondo passo. Il tasto ignora i tocchi per 400 ms da quando compare, perché sta nel punto
    dello schermo dove era `HAI PRESO TUTTO`.*
  - §8 Dock, «Cosa ci vive»: `CHIUDI LA SPESA` (traguardo).
  - §8 Testata, modo indietro: la pillola settimana sotto il titolo, se la pagina ne ha una; le
    etichette ammesse diventano `IMPOSTAZIONI`, `LISTA`, `PIANO`, `FINE SPESA`.
  - una riga su Entra: schermata fuori dal Guscio, senza Testata né tab bar; Marchio 20 e titolo
    52 centrati; Campo di testo e Tasto primario di §8.
  - §13, «Decisioni del 26/09/2026 (fase 6: Fine della spesa ed Entra)»: le quattro decisioni in
    testa a questa spec, e i titoli `Fine spesa` e `Confezioni`.
- **`docs/superpowers/specs/DESIGN-SYSTEM.md`**: le righe del ponte (Dock, Testata, Anteprima di
  scansione con Confezioni come terzo uso, Scanner cancellato) e §9 aggiornato (fase 6 chiusa,
  fasi 7 e 8 aperte).
- **Registro delle decisioni di esecuzione**: `docs/2026-09-26-fase6-decisioni-esecuzione.md`,
  come nelle fasi 4 e 5.

---

## F. Verifica

### F.1 Test

- **Si aggiornano** i test esistenti: `lista/fatta/__tests__/page.test.tsx` (218 righe),
  `lista/confezioni/__tests__/page.test.tsx` (631 righe). I casi di dato (guardie d'ingresso,
  testi del non ricomprato, singolare/plurale, cadenza, lettura del risparmio che fallisce,
  scrittura, proposta, manuale, unità diversa, `spesa già chiusa`, scansioni su due voci) restano
  tutti, cambiano solo i selettori dove cambia la struttura.
- **Nuovi**, almeno:
  - traguardo: `CHIUDI LA SPESA` sta dentro la regione `Azione principale`; il Dock non c'è in
    caricamento e in errore; il tasto ignora un tocco entro 400 ms dalla comparsa e accetta quello
    dopo; in volo è `disabled`; la pillola `Torna alla lista` porta a `/lista`; la pillola
    settimana c'è;
  - Confezioni: `SCANSIONA` apre un dialogo `Confezione di {nome}`; il ✕ e `LASCIA` chiudono senza
    scrivere; `AGGIORNA` scrive e chiude, e la riga dice `AGGIORNATO`; `'sessione'` da
    `cercaProdotto` porta a `/entra`; il nome accessibile `Scansiona {nome}`;
  - Entra (oggi senza test): invio con `signInWithOtp` e l'`emailRedirectTo` giusto; stato inviato
    con l'indirizzo; `USA UN'ALTRA EMAIL` torna al modulo vuoto; i due `?errore=` e il ripiego;
    errore di invio;
  - `listaFinita` e `contaVoci` (§D.1);
  - `Testata` in modo indietro con `settimana`.
- `tsc`, `lint`, `npm run design:token` puliti; suite intera verde.

### F.2 Sonda nel browser

Come nelle fasi 3–5 (dev server da Bash con chiavi Supabase finte, pagina sonda sotto
`src/app/auth/`, cancellata alla fine):
1. **Doppio tocco**: il tempo fra il tocco su `HAI PRESO TUTTO` e la comparsa del Dock del
   traguardo, con le letture simulate a latenza zero e a 100 ms; un doppio tocco sintetico a 80 ms
   non deve chiudere, con la guardia accesa.
2. **Il foglio di Confezioni** a 360 × 640: il foglio alto con `LettoreCodice`, poi l'esito
   `proposta` con la tastiera numerica aperta (i due tasti restano visibili?).
3. **Bersagli**: il link `CONFEZIONI DIVERSE? SCANSIONA` e le pillole `SCANSIONA` misurano almeno
   44 di altezza.
4. **Entra** a 360 × 640: niente scorrimento orizzontale, modulo e tasto dentro lo schermo con la
   tastiera aperta [ipotesi: la tastiera in un browser desktop non si simula; si misura solo la
   larghezza].

---

## G. Rischi e limiti

- **Il titolo `Fine spesa`** è l'unico testo che Andrea non ha scelto: va confermato prima del
  piano (§A.2).
- **La guardia di 400 ms** è un numero scelto, non misurato: la sonda misura quanto dura il volo
  fra i due Dock; se il Dock del traguardo compare sempre dopo più di 400 ms anche con letture a
  latenza zero, la guardia si tiene lo stesso (costa zero) ma il registro lo scrive.
- **Il foglio alto con la tastiera aperta**, a 360 × 640: `AGGIORNA` potrebbe finire sotto la
  tastiera. La Dispensa ha la stessa forma e nessuno l'ha segnalato [ipotesi], ma lì il campo è
  uno solo, qui due.
- **Entra non si prova in produzione senza uscire.** La prova dal telefono di Entra richiede Esci
  (dal pannello) e un nuovo link: va messo nella lista delle prove, non dato per fatto dai test.
- **Chi ha il traguardo aperto durante il deploy** vede la pagina nuova al primo caricamento: non
  c'è stato da migrare.
