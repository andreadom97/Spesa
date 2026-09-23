# Fase 2 del redesign: Lista e Piano — design

**Data:** 21/09/2026 · **Stato:** bozza per la review di Andrea · **Base:** `main` `69ca08b`,
`design/sistema/DESIGN.md` v3 (con le correzioni del 21/09 al Dock),
`design/sistema/schermate/lista.html`, `design/ridisegno/Piano - oggi e domani.html`,
`design/ridisegno/ANALISI.md` §2.1 e §2.2, `docs/2026-09-19-inventario-schermate.md` §1 e §4.

**Obiettivo.** Portare nel codice il corpo delle due schermate che si usano ogni giorno. La
Lista diventa **una lista sola** per reparto, con le sezioni come tessere-widget e il tasto
`HAI PRESO TUTTO` in un **Dock** flottante che compare solo a spesa finita. Il Piano guadagna
il quarto stato della cella, l'etichetta che titola il giorno scelto, la pillola della settimana
e il primario nel Dock. Successo: in corsia si spunta senza cambiare vista, e dal Piano si
conferma la settimana senza che il tasto finisca sotto la barra — con la suite verde e le prove
dal telefono passate.

**Decisioni di Andrea che questa spec applica** (20/09, registrate in `design/sistema/CLAUDE.md`
e in `DESIGN.md` §13):

- **Niente più Base e Top-up.** La lista è una, divisa per reparto nell'ordine scelto
  dall'utente. `deperibile` resta nel dominio per scadenze e decadimento, non in corsia.
- **Chiusura in due passi, opzione b.** Il Dock della Lista mostra `HAI PRESO TUTTO` **solo** a
  lista tutta spuntata e senza controlli in sospeso; porta al traguardo `/lista/fatta`, dove sta
  `CHIUDI LA SPESA`. A lista non finita il Dock non esiste.
- **I primari senza posto vanno nel Dock**, a una riga sola, sopra la tab bar, e si abbassa con
  lei.
- **Sezioni della Lista come widget** (variante 1 del foglio a cinque versioni).
- **Il Piano si chiama Piano** e la settimana la dice la pillola sotto il titolo.

**Fuori scope, esplicitamente:** Piatti e fotocamera (fase 3), Dispensa e il foglio del dock a
tre vie (fase 4), pannello Impostazioni e sotto-schermate (fase 5), il logout, `FoglioAzioniPasto`
(non ridisegnato: resta com'è), `/lista/fatta` e `/lista/confezioni` (il loro primario resta in
coda al contenuto con `.coda-barra` finché non tocca a loro), le sei schermate non ridisegnate.
**Il database non cambia:** `shopping_list` resta con le sue due righe per settimana (`tipo`
`base` e `topup`), `generaListe`, `allineaTopUp` e `chiudiSpesa` non si toccano. La fusione è
solo in lettura.

---

## A. Il Dock, componente condiviso

`src/components/Dock.tsx`, nuovo. È il primo pezzo, perché Lista e Piano lo usano entrambe.

**Forma** (`DESIGN.md` §8 Dock, misure da `schermate/lista.html`): contenitore bianco
`position: absolute`, `left/right 16`, `bottom` **114** a barra grande e **96** a barra ridotta,
raggio **999**, padding **8**, `--ombra-nav`, una riga sola con gap 8. Altezza **70** = 8 + 54 + 8.
Dentro, il primario: alto **54**, larghezza piena, raggio **999** (non 18: nel Dock il tasto
segue la pillola che lo contiene), fondo `--ink`, testo bianco mono 12/700/0,09em maiuscolo,
`--ombra-tasto`.

**Dove sta nel DOM.** Non dentro lo scroller della pagina: il Dock viene montato con
`createPortal` in uno **slot** che `Guscio` renderizza subito prima di `<TabBar>`. `Guscio`
guadagna un `<div className="dock-slot" ref={…}>` e lo espone con un contesto
(`src/components/dock-slot.tsx`, sullo stesso modello di `marchio-context.tsx`); `Dock` legge lo
slot e non renderizza nulla finché non c'è. Il portale non è ornamento: le pagine stanno dentro
`<main className="guscio-main">`, che ha `overflow-y: auto`, e un figlio assoluto dentro un
contenitore che scorre è la situazione in cui iOS taglia o trascina il contenuto. Con il portale
il Dock è fratello della barra e la domanda non si pone. Il primo paint non ha Dock: nessuna
delle due schermate lo mostra prima che i dati arrivino, quindi non si vede.

**CSS** in `src/app/globals.css`:

```css
.dock { position: absolute; left: var(--dock-lato); right: var(--dock-lato);
  bottom: var(--dock-fondo); z-index: 19;
  background: var(--superficie); border-radius: 999px; box-shadow: var(--ombra-nav);
  padding: var(--dock-padding); display: flex; gap: var(--dock-respiro); }
.guscio[data-barra="ridotta"] .dock { bottom: var(--dock-fondo-giu); }
@media (prefers-reduced-motion: no-preference) {
  .anim-dock { transition: bottom var(--moto-barra) var(--curva-barra); }
}
/* Lo scroller di una pagina che ha il Dock: il contenuto gli passa dietro e la coda
   tiene l'ultima voce sopra di lui. */
.scroll-app.con-dock { --coda: var(--coda-dock); }
.guscio[data-barra="ridotta"] .scroll-app.con-dock { --coda: var(--coda-dock-giu); }
```

Token nuovi in `:root`, copiati da `design/sistema/tokens.css`: `--dock-lato: 16px`,
`--dock-fondo: 114px`, `--dock-fondo-giu: 96px`, `--dock-respiro: 8px`, `--dock-padding: 8px`,
`--dock-primario: 54px`, `--dock-altezza: 70px`, `--coda-dock: 194px` (70 + 114 + 10),
`--coda-dock-giu: 176px` (70 + 96 + 10).

`z-index: 19`, uno sotto la barra: i due non si sovrappongono per costruzione (il Dock finisce a
114 + 70 = 184 dal fondo, la barra a 22 + 84 = 106), ma se un arrotondamento li facesse toccare
è la barra a dover stare sopra — è lei la navigazione.

**Perché non `.coda-barra`.** La classe della fase 1 serve alle righe d'azione **in flusso**,
in coda alla colonna della pagina. Il Dock non è in flusso: galleggia. Le due cose convivono —
le undici schermate che non sono ancora state ridisegnate tengono `.coda-barra`, Lista e Piano
passano a `.con-dock` — e `.coda-barra` sparirà quando l'ultima schermata avrà il suo Dock.

**Accesso.** Nessun `role` proprio, nessun landmark: dentro c'è un tasto normale col suo nome.
Bersaglio 54 ≥ 44. Tasto spento mentre un'azione è in volo: `disabled` nativo con lo stile del
sistema (`DESIGN.md` §8 Tasti, stato spento: fondo `rgba(20,22,58,0.10)`, testo `--ter`, bordo
trasparente) — non l'`opacity: 0.7` di oggi, che abbassa anche il contrasto del testo bianco
sotto soglia.

## B. Lista: una lista sola

**Il dato non cambia, la lettura sì.** `ListaSalvata` resta com'è (`base`, `topup`,
`baseListaId`, `topupListaId`) e guadagna un campo: `ordineAree: AreaId[]`, che `leggiListe` ha
già in mano — chiama `leggiImpostazioni()` per raggruppare. Serve perché la fusione deve
ordinare le aree, e `base` e `topup` presi in fila non danno l'ordine giusto: con ordine
`[A, B, C]`, `base = [A, C]` e `topup = [B]`, concatenare darebbe `A C B`.

Nuova funzione pura in `src/data/lista.ts`:

```ts
/** Una voce con l'id della lista da cui viene: rispondiControllo scrive su quella. */
export type VoceFusa = VoceSalvata & { listaId: string };
export interface SezioneFusa { area: AreaId; voci: VoceFusa[]; controlli: VoceFusa[] }

export function fondiSezioni(lista: ListaSalvata): SezioneFusa[];
```

Regole della fusione, tutte verificabili con un test puro:

1. Per ogni area, le voci di `base` e di `topup` finiscono nella stessa `SezioneFusa`, ognuna
   marcata col proprio `listaId` (`baseListaId` o `topupListaId`).
2. L'ordine delle aree è quello di `lista.ordineAree`; un'istantanea offline salvata prima di
   questa fase non ha il campo, e allora si usa `ORDINE_AREE_DEFAULT` (`src/domain/aree.ts`).
   Senza questo innesto una lista aperta offline subito dopo l'aggiornamento crasherebbe.
3. Dentro l'area, le voci si riordinano con lo stesso criterio di `raggruppaInSezioni`:
   `b.confezioni - a.confezioni`, a pari confezioni `a.nome.localeCompare(b.nome, 'it')`. I
   controlli per nome. Non si concatenano due liste già ordinate: si riordina l'unione.
4. Un'area senza né voci né controlli non compare.
5. Una voce con `listaId` nullo (non dovrebbe esistere: `generaListe` crea sempre le due righe)
   viene **scartata**, non mostrata senza id: una voce che non sa dove scrivere è una voce che
   fallirebbe al primo tap.

`tally`, `SelettoreTab` e `SPIEGA_TAB` si cancellano da `lista/page.tsx`. `tuttoFatto` e
`areeMancanti` restano identici: già considerano `base` e `topup` insieme. `allineaTopUp`
mantiene nome e comportamento — è il meccanismo che tiene la lista al passo col piano, non il
selettore; un commento in testa dice che il nome sopravvive al concetto.

**Cosa si perde, dichiarato.** Sparisce il contatore globale `N DA PRENDERE`: nessun file del
ridisegno lo colloca, e il contatore di sezione resta quello di oggi (`N VOCI`, cioè il totale
dell'area, non il residuo). Il segnale a colpo d'occhio di "quanto manca" resta il **Marchio in
tab bar**, che tiene contornate le aree con qualcosa da prendere o un controllo aperto — è già in
produzione dalla fase 1 e fa esattamente questo lavoro.

## C. Lista: le sezioni come widget

`CartaSezione` (locale a `lista/page.tsx`) diventa il widget di `DESIGN.md` §8 e di
`schermate/lista.html`:

- Involucro: `margin: 0 12px 12px`, fondo bianco, raggio **22**, bordo 1 px `--bordo`,
  **`--ombra-pannello`** (oggi non ha ombra), padding `14 / 12 / 12`, gap interno **12**,
  `flexShrink: 0` (resta: senza, la carta si comprime e la tessera si taglia a metà).
  Il margine laterale 12 sostituisce il padding 16 dello scroller, che passa a `6px 4px 14px`
  così i 12 del widget danno i 16 finali dal bordo.
- Dentro, nell'ordine: etichetta di sezione (quadratino 10 raggio 4 + nome mono 10/700/0,16em,
  contatore mono 10/500/0,10em `--sec`), griglia delle tessere, righe di controllo. È lo stesso
  ordine di oggi; cambia che stanno dentro una superficie con gap 12 invece che con tre padding
  diversi.
- Griglia: due colonne `minmax(0, 1fr)`, gap **8**, senza padding proprio (lo dà il widget).
- La `RigaControllo` perde il suo `margin: 0 12px 12px` e lo eredita dal gap del widget.

**`Tessera.tsx`** — un solo stato cambia, quello **acceso non protagonista**: perde il fondo
bianco e l'ombra e resta tenuta dal filo. Da `background: '#FFFFFF'` +
`boxShadow: '0 1px 2px …'` a `background: 'none'`, `boxShadow: undefined`, bordo
`1px solid rgba(colore, 0.45)` (invariato), raggio da 15 a **14**. Protagonista e spenta non
cambiano di una virgola. È la regola della variante 1: dentro un widget la tessera non ha
bisogno di un secondo fondo bianco sul bianco.

**`RigaControllo.tsx`** — due modifiche, entrambe di testo e colore:

- La sottoriga `CONTROLLO OGNI 90 GIORNI · SCADUTO` diventa `CONTROLLO OGNI 90 GIORNI`, e il 90
  arriva da `GIORNI_CONTROLLO_STAPLE` (`src/domain/pantry.ts`) invece di essere scritto a mano.
  `· SCADUTO` va via: la riga esiste **solo** quando il controllo è scaduto, quindi dirlo è
  ridondante. Il colore passa da `rgba(20,22,58,0.5)` a **`--testo-2`** (decisione 1 del 17/09:
  i testi che portano informazione stanno a 5,5:1, non a un alfa).
- **Il mockup dice "controllo ogni 4 settimane": non si adotta.** La cadenza vera del codice è
  90 giorni, cioè quasi tredici settimane. Scriverne quattro sarebbe un numero inventato su una
  schermata che l'utente usa per decidere se comprare l'olio. [misurato: `GIORNI_CONTROLLO_STAPLE = 90`]
- Le pillole restano `SÌ` / `NO` nel DOM. Il mockup scrive `Sì` / `No` con
  `text-transform: uppercase`, che **rende esattamente le stesse due parole**: cambiare il testo
  del DOM non cambia un pixel e fa solo rimbalzare i test che lo cercano. Gli `aria-label`
  (`Sì, hai ancora {nome}` / `No, comprane una confezione di {nome}`) sono già quelli del
  ridisegno. Stessa logica per il contatore di sezione, che resta `N VOCE` / `N VOCI`.

## D. Lista: il Dock, gli stati vuoti, cosa sparisce

- Lo scroller passa da `className="sc scroll-app con-piede"` a **`"sc scroll-app con-dock"`**
  quando il Dock c'è, e a `"sc scroll-app"` quando non c'è: a lista non finita il contenuto
  passa dietro la barra e la coda torna ai 140 della fase 1. La classe si decide con lo stesso
  `finito` che decide il Dock — un solo booleano per le due cose, così non possono divergere.
- `finito` → `<Dock><Link href="/lista/fatta">HAI PRESO TUTTO</Link></Dock>`. Testo e
  destinazione invariati; cambia solo dove sta il tasto.
- **Stati vuoti A e B** (nessuna lista): la scheda resta nello scroller, il primario va nel Dock
  (decisione 3 del 20/09: «i primari degli stati vuoti stanno nel Dock»). `COMINCIA DAI PIATTI`
  → `/piatti` invariato; `VAI ALLA SETTIMANA` → **`VAI AL PIANO`**: la destinazione è già
  `/piano` dalla fase 1, l'etichetta era rimasta indietro. [misurato: `lista/page.tsx:549`]
- **Errore di caricamento** e **`Niente da comprare qui.`**: restano dove sono, col colore
  corretto (`--errore` per l'errore, `--sec` per il vuoto di sezione).
- La **riga d'errore d'azione** passa a `--errore`; la **riga offline** resta `--sec` col testo di
  oggi, che nomina la settimana e spiega la coda delle spunte — il mockup l'accorcia, ma il testo
  lungo dice una cosa vera che quello corto non dice.
- Spariscono: il selettore `BASE` / `TOP-UP` con i suoi due contatori, le due righe di
  spiegazione della vista, e la riga in flusso che portava `HAI PRESO TUTTO`.

## E. Piano: la striscia dei giorni

`src/components/StrisciaGiorni.tsx`. Oggi `oggi` è un **bordo 3 px** e `selezionato` un fondo
pieno: il bordo cambia l'ingombro del riquadro, quindi la cella di oggi è più piccola dentro, e i
due stati insieme non hanno una forma. Si passa ai quattro stati del mockup, tutti con
`box-shadow`, così le sette celle restano identiche:

| Stato | `background` | `box-shadow` |
|---|---|---|
| normale | `--superficie` | `--ombra-pannello` |
| oggi | `--superficie` | `--ombra-pannello, inset 0 0 0 3px var(--ink)` |
| selezionato | `--ink` | `0 2px 6px rgba(20,22,58,0.20)` |
| oggi e selezionato | `--ink` | `0 2px 6px rgba(20,22,58,0.20), inset 0 0 0 3px #FFF, inset 0 0 0 4.5px var(--ink)` |

Il bordo 1 px di oggi va via (nel mockup non c'è: la cella è tenuta dall'ombra). Resto invariato:
`flex: 1` con `min-width: 0`, gap 3, raggio 14, padding `9 / 0 / 10`, sigla mono 8,5/700/0,08em
in `--ter` (bianca al 62% se selezionata), numero 15/800, pallini 5 px **gap 3** (oggi 2), un
pallino per pasto, pieno se quel pasto è a casa e ha un piatto.

`aria-label` più ricca, come nel ridisegno: `{Nome} {numero}, {parola temporale}, {n} pasti a
casa{, selezionato}` — per esempio `Venerdì 18, domani, 3 pasti a casa, selezionato`. La parola
temporale c'è solo per ieri, oggi e domani; per gli altri giorni la virgola non compare. Il
conteggio è quello del giorno (vedi F).

Il commento del prop `slotDefs` dice «da 3 a 5»: diventa **da 3 a 6** (decisione 4 del 20/09).
Sei pallini da 5 con gap 3 fanno 45 px in una cella larga circa 50: ci stanno, ma va misurato
nel browser con sei pasti, non dedotto. [da verificare in fase di piano]

## F. Piano: l'etichetta del giorno e il contatore

Le due frecce tonde `Giorno precedente` / `Giorno successivo` e il nome del giorno a 21 px
centrato fra loro spariscono. Al loro posto, sopra le righe pasto, **un'etichetta di sezione**
come tutte le altre del sistema:

- A sinistra, mono 10/700/0,16em maiuscolo: `{Nome} {numero}`, e per ieri, oggi e domani
  ` · {Parola}` con la parola in **`--testo-2`** — `VENERDÌ 18 · DOMANI`.
- A destra, mono 10/500/0,10em in `--sec`: `{n} PASTI A CASA`, dove `n` è il conteggio **del
  giorno scelto** (pasti con `stato === 'casa'` e `dishId !== null`), non della settimana.
- Padding `0 16px 10px`, allineamento `baseline`.

Le frecce se ne vanno perché la striscia sopra fa già la stessa cosa con sette bersagli invece di
due, e perché il nome del giorno non è più un titolo grande al centro ma l'etichetta di questa
sezione. Nessuna via di navigazione si perde: tutti e sette i giorni restano un tap.

Il contatore settimanale `{n} PASTI A CASA IN SETTIMANA`, che oggi sta sopra il primario, **si
cancella**: il Dock è a una riga sola e porta solo il tasto. Deciso il 21/09, con la conseguenza
scritta in §L.1.

## G. Piano: il Dock, la pillola, gli errori

- `<Testata titolo="Piano" settimana={…} />`: la pillola arriva anche qui (oggi il Piano non la
  passa), con lo stesso testo della Lista.
- Il primario va nel Dock: `CONFERMA E CREA LA LISTA` a settimana in bozza, `VAI ALLA LISTA`
  dopo. Testi invariati. Mentre la conferma è in volo, `disabled` con lo stile spento del
  sistema (§A).
- Lo scroller passa a `"sc scroll-app con-dock"` nella vista corrente, dove il Dock c'è.
- `erroreConferma` non può più stare accanto al tasto: si sposta **dentro lo scroller**, subito
  sotto l'etichetta del giorno, dove già vive `erroreCheckin`. Entrambi passano a `--errore`.
- `FoglioAzioniPasto`, `RigaPasto`, la scheda «Nessun piatto ancora» e la logica di check-in
  **non cambiano**. `RigaPasto` è già a tre zone 60 / corpo / 44 e l'unica differenza del mockup
  è l'`aria-label` del kebab (`Altre azioni su {piatto}` invece di `Azioni per {pasto}`): non si
  adotta in questa fase, perché nomina un piatto che può non esserci — su un pasto senza piatto
  l'etichetta resterebbe muta.

## H. La pillola della settimana

Da `31 AGO — 6 SET` a **`Settimana del 21 settembre`**, in Lista e in Piano. Il testo si scrive
in sentence case e lo rende maiuscolo la pillola: `Testata.tsx` guadagna
`textTransform: 'uppercase'` sul testo della pillola, che oggi non l'ha e perciò renderebbe la
frase in minuscolo contro `DESIGN.md` §3.

Un formatter unico, in `src/domain/settimana-label.ts` (nuovo, funzione pura):
`etichettaSettimana('2026-09-21') === 'Settimana del 21 settembre'`. Prende il lunedì in ISO,
usa i nomi lunghi dei mesi in italiano, non tocca il fuso (le date della settimana sono già
stringhe `YYYY-MM-DD` costruite in UTC, come `formattaPillola` fa oggi). `formattaPillola` in
`lista/page.tsx` si cancella; la Lista e il Piano chiamano il formatter nuovo, così l'etichetta
non può divergere fra le due schermate.

## I. Copy che cambia

| Dove | Oggi | Diventa |
|---|---|---|
| Pillola settimana (Lista, anche stato vuoto) | `31 AGO — 6 SET` | `SETTIMANA DEL 21 SETTEMBRE` |
| Pillola settimana (Piano) | assente | idem |
| Stato vuoto B della Lista | `VAI ALLA SETTIMANA` | `VAI AL PIANO` |
| Sottoriga della riga di controllo | `CONTROLLO OGNI 90 GIORNI · SCADUTO` | `CONTROLLO OGNI 90 GIORNI` |
| Etichetta del giorno (Piano) | `Venerdì 18`, sans 21, centrata | `VENERDÌ 18 · DOMANI`, etichetta di sezione |
| Contatore (Piano) | `{n} PASTI A CASA IN SETTIMANA` | `{n} PASTI A CASA` del giorno scelto |
| Spiegazione della vista (Lista) | due testi `SPIEGA_TAB` | via |
| Selettore (Lista) | `BASE` / `TOP-UP` · `N DA PRENDERE` | via |
| Sottoriga di «va comprato fresco?», deperibile (Ingrediente) | `FINISCE NELLA LISTA TOP-UP` | `QUANTO DURA IL RESIDUO DIPENDE DAL REPARTO` |
| Sottoriga di «va comprato fresco?», non deperibile (Ingrediente) | `FINISCE NELLA LISTA BASE` | `IL RESIDUO NON SCADE` |
| Nota della schermata «cambia un pasto» (Piano) | `… quello che manca entra nel top-up quando la riapri.` | `… quello che manca entra nella lista quando la riapri.` |

**[aggiunto il 22/09, correzioni della review finale]** Le ultime tre righe non erano in questa
tabella durante l'esecuzione: il piano aveva deciso da sé un copy che il suo vincolo globale
(«ogni stringa nuova è quella della spec §I») gli vietava di decidere, e nessuno dei sette
cancelli di task l'ha visto perché ognuno guardava il proprio task. Le due sottorighe
dell'Ingrediente sono passate in esecuzione per `IL RESIDUO NON ARRIVA ALLA SETTIMANA DOPO` /
`IL RESIDUO RESTA IN DISPENSA`; la prima delle due affermava il falso — `residuoUtilizzabile`
non azzera nulla per i surgelati (`GIORNI_FRESCO.surgelati` è `null`), usa 90 giorni quando il
residuo è dichiarato congelato, e confronta con `>` stretto, quindi il settimo giorno il residuo
sopravvive. La riga del Piano è l'ultimo posto dell'interfaccia dove compariva «top-up».

`HAI PRESO TUTTO`, `CONFERMA E CREA LA LISTA`, `VAI ALLA LISTA`, `COMINCIA DAI PIATTI`,
`Niente da comprare qui.`, i testi delle due schede vuote, `SÌ` / `NO` e `N VOCI`: **invariati**.

## J. Errori e casi limite

- **Istantanea offline salvata prima di questa fase**: non ha `ordineAree`. `fondiSezioni` usa
  `ORDINE_AREE_DEFAULT`. Un test lo copre con un oggetto senza il campo.
- **Voce con `listaId` nullo**: scartata dalla fusione (§B.5). Se ne scarta almeno una, un
  `console.error` lo dice — è un dato rotto, non un caso normale.
- **Controllo risposto**: `rispondi` riceve il `listaId` dalla voce, non più dalla tab attiva.
  Sparisce la possibilità di scrivere sulla lista sbagliata, che oggi esiste in teoria (il
  controllo di una voce top-up risposto mentre la tab è su base non è raggiungibile, ma lo era
  solo perché le due viste erano separate).
- **Lista con voci solo in `topup`**: prima si vedeva solo cambiando tab; ora è la lista.
- **Dock e tastiera**: nessuna delle due schermate ha campi di testo, quindi il Dock non finisce
  sotto una tastiera aperta. La Dispensa, che ne ha, lo affronterà in fase 4.
- **`mask-image` non supportata**: come in fase 1, il contenuto passa dietro senza sfumatura; la
  coda `--coda-dock` tiene l'ultima tessera sopra il Dock.
- **`prefers-reduced-motion`**: il Dock cambia `bottom` senza transizione, la cella del giorno
  cambia stato senza `.anim-giorno`.
- **Sei pasti nella striscia**: da misurare nel browser (§E).
- **Settimana a cavallo di due mesi**: `Settimana del 29 settembre` resta corretta — l'etichetta
  nomina il lunedì, non l'intervallo. È il motivo per cui il formato nuovo è più robusto del
  vecchio, che doveva scrivere due mesi.

## K. Test

Pura, prima di tutto:

- `fondiSezioni`: le cinque regole di §B, una asserzione ciascuna. Unione per area; `listaId`
  giusto su ogni voce; ordine delle aree da `ordineAree` con il caso `[A, C] + [B]`; fallback a
  `ORDINE_AREE_DEFAULT` senza il campo; riordino dentro l'area (non concatenazione); area vuota
  assente; voce senza `listaId` scartata.
- `etichettaSettimana`: un lunedì qualsiasi, un lunedì a inizio mese, uno a cavallo di due mesi.

Componenti:

- `dock.test.tsx` (nuovo): senza slot non renderizza; con lo slot renderizza dentro di esso; il
  tasto è raggiungibile per nome; `disabled` mette lo stile spento e non l'opacità.
- `striscia-giorni.test.tsx`: i quattro stati distinguibili (nessun bordo che cambi ingombro:
  si asserisce che tutte e sette le celle abbiano lo stesso `border`), `aria-label` completa con
  parola temporale e conteggio, la parola assente sui giorni lontani, sei pallini con sei
  `slotDefs`.
- `riga-controllo.test.tsx`: la sottoriga non dice più `SCADUTO` e riporta il valore di
  `GIORNI_CONTROLLO_STAPLE`; le pillole restano `SÌ` / `NO` con i loro `aria-label`.
- `tessera.test.tsx`: l'accesa non protagonista non ha fondo bianco né ombra; protagonista e
  spenta invariate.

Pagine:

- Lista: una sola vista senza selettore; voci di `base` e `topup` della stessa area nella stessa
  sezione; il Dock assente a lista non finita e presente a lista finita; il Dock assente se
  resta un controllo in sospeso anche con tutte le voci spuntate; lo scroller ha `con-dock` solo
  quando il Dock c'è; gli stati vuoti hanno il primario nel Dock con `VAI AL PIANO`; risposta a
  un controllo che vive in `topup` mentre la pagina non ha più tab.
- Piano: la pillola settimana c'è; l'etichetta del giorno col nome, la parola e il conteggio del
  giorno; le frecce non esistono più; il primario è nel Dock con i due testi; `erroreConferma`
  compare nello scroller.
- I test esistenti che cercano `BASE`, `TOP-UP`, `N DA PRENDERE`, i testi di `SPIEGA_TAB`,
  `VAI ALLA SETTIMANA`, `31 AGO — 6 SET`, `Giorno precedente` / `Giorno successivo` e
  `PASTI A CASA IN SETTIMANA`: aggiornati. Il piano ne fa il censimento esatto prima di toccarli.

Verifica nel browser a 375 × 812, dalla sonda usa-e-getta sotto `/auth` come in fase 1: Dock che
non copre l'ultima tessera né l'ultima riga pasto, a barra grande e ridotta; il Dock che scende a
96 con la barra; il widget che non taglia le tessere; i quattro stati della cella; sei pasti nella
striscia. Misure riportate nel rapporto, non dedotte.

**Gate finale (Andrea):** una spesa vera dal telefono — spuntare in corsia, arrivare a
`HAI PRESO TUTTO`, chiudere da `/lista/fatta` — e una conferma di settimana dal Piano.

## L. Le due decisioni di Andrea (21/09)

1. **Il contatore settimanale non sopravvive.** Vale solo il conteggio del giorno scelto,
   nell'etichetta di sezione, come nel ridisegno. `{n} PASTI A CASA IN SETTIMANA` si cancella con
   la riga che lo conteneva, e `nCasaSettimana` con lui. Conseguenza accettata, dichiarata qui:
   al momento di confermare non si legge più su quanti pasti si sta chiudendo la settimana. La
   striscia dei giorni resta l'unico riassunto — sette celle coi pallini pieni.
2. **La vista «settimana scorsa» resta dov'è.** Il link `‹ SETTIMANA SCORSA` non si tocca:
   centrato sopra la striscia, mono 10/700/0,11em in `--ter`, come oggi. È l'unico elemento di
   queste due schermate che resta fuori dal disegno nuovo, e lo si sa: la domanda torna quando le
   Impostazioni avranno le sotto-schermate (fase 5) e ci sarà un posto dove metterlo. I due rami
   di stato del passato in `piano/page.tsx` non cambiano, e nella vista precedente il Dock non
   c'è — quindi `con-dock` vale solo nella vista corrente.

## M. Esecuzione

Un piano in `docs/superpowers/plans/2026-09-21-lista-piano.md`, subagent-driven, task disgiunti:

1. `fondiSezioni` + `ordineAree` in `leggiListe` + `etichettaSettimana`, con i loro test puri.
   Nessuna UI: si può sbagliare solo in un posto.
2. `Dock.tsx` + slot in `Guscio` + CSS e token + `dock.test.tsx`.
3. `Tessera`, `RigaControllo`, `StrisciaGiorni`: le tre modifiche di componente, coi test.
4. Lista: fusione, widget, Dock, stati vuoti, colori degli errori, censimento e aggiornamento dei
   test di pagina.
5. Piano: striscia, etichetta del giorno, pillola, Dock, errori nello scroller, test di pagina.
6. Verifica nel browser con la sonda, misure, e le due voci di `DESIGN-SYSTEM.md` che registrano
   le derive rimaste.

I task 4 e 5 toccano file diversi e possono essere rivisti separatamente; il 2 va prima di
entrambi. Prima della PR: review di correttezza sul task 1 (è l'unico con logica di dato) e
review finale su tutto il ramo.
