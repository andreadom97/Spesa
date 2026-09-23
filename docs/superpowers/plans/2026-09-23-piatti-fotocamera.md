# Fase 3 del ridisegno: Piatti e fotocamera — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Piatti diventa una lista unica di righe, con l'aggiungi in cima e la ricerca anche
negli ingredienti. L'acquisizione della dieta si apre con due porte, foto e PDF. La foto diventa
una fotocamera a tutto schermo, con la banda dei comandi e il foglio «Rivedi i fogli presi».

**Architecture:**
- **Nessun dato nuovo.** La ricerca è una funzione pura sopra quello che la pagina già carica.
- **La fotocamera resta nello stato della pagina Importa**, e non diventa una rotta. Per il
  tutto schermo servono due pezzi di infrastruttura piccoli: un contesto che dice al `Guscio`
  di non montare la tab bar, e una voce nella cronologia del browser, così il gesto indietro
  chiude la fotocamera invece di uscire dall'import.
- **Lo schermo si separa dai dati.** Il corpo di Piatti e quello della scelta di Importa
  escono in componenti di presentazione nella cartella della rotta, come `Camera.tsx` oggi.
  Così la sonda del browser li misura veri, senza una sessione Supabase.

**Tech Stack:**
- Next.js 16 App Router, React client components, TypeScript;
- Vitest e Testing Library su jsdom;
- stile inline, con le classi condivise in `src/app/globals.css`.

**Spec:** `docs/superpowers/specs/2026-09-23-piatti-fotocamera-design.md`, approvata da Andrea
il 23/09.

## Global Constraints

- **Il database non cambia**, e non cambiano la route `/api/import/estrai` e la ricompressione
  delle immagini: `ricomprimi`, `ricomprimiFile`, `LATO_MAX`, jpeg allo 0,75.
- **Nessun testo inventato.** Ogni stringa nuova è quella della spec §I, e la tabella §I è la
  sola fonte. Se un task ha bisogno di un testo che lì non c'è, si ferma e lo chiede: non lo
  scrive. Tutti gli altri testi restano identici a oggi, maiuscole comprese.
- **`design/sistema/DESIGN.md` è la fonte di verità del disegno.** Se il piano e `DESIGN.md`
  dicono due valori diversi, vale `DESIGN.md`, e la differenza va scritta nel rapporto.
- **Colori dei testi:**
  - gli errori a schermo in `--errore`;
  - i testi che portano informazione in `--testo-2`;
  - sulla banda della fotocamera, tutti i testi in bianco pieno `#FFFFFF`.
- **Bersagli tappabili ≥ 44 px**, sempre.
- **Animazioni solo dentro** `@media (prefers-reduced-motion: no-preference)`.
- **Alfa solo da `DESIGN.md` §2.5.** Il Task 1 registra le tre che servono e mancano.
- **Niente misure dedotte.** Le geometrie si verificano nel browser nel Task 8 e si riportano
  misurate, con la posizione accanto a ogni misura. Un numero non misurato si scrive
  `[ipotesi]`.
- **Mai `scrollHeight − clientHeight` come fondo di uno scroller**: sono interi arrotondati.
- **Stile inline** come nel resto del progetto, tranne le classi condivise in `globals.css`.
- **Chi implementa committa**, con il messaggio già scritto in coda al proprio task, e non tocca
  la storia oltre il proprio commit. La review di ogni task legge l'intervallo `BASE..HEAD`.
- **Il codice di test in questo piano è una bozza.** Nella fase 2, tredici difetti su tredici
  stavano nel codice di test scritto nel piano e zero in quello di produzione. Se un test
  scritto qui è sbagliato, cioè asserisce il falso o non compila, si corregge il test e non il
  codice. La correzione va scritta nel rapporto, con la ragione.
- **Un task che introduce o cambia testo** aggiorna la tabella §I della spec nello stesso
  commit, se il testo non c'è già.
- **Le pagine-sonda** stanno sotto `src/app/auth/`, non si committano mai, e dopo averle
  cancellate si cancella anche `.next/dev/`: altrimenti `tsc` fallisce con `TS2307`.
- **Nel worktree, i comandi bash che nominano git vanno spezzati in comandi semplici**, uno per
  chiamata: la sessione isolata rifiuta le catene.
- Commenti, test e messaggi di commit in italiano. Ogni commit finisce con
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Struttura dei file

| File | Responsabilità | Task |
|---|---|---|
| `design/sistema/DESIGN.md` (modifica) | le voci di §J della spec, prima del codice | 1 |
| `src/app/globals.css` (modifica) | i token nuovi (1), `.porta-azione` (3), `.scatto` e `.guida-angolo` (6) | 1, 3, 6 |
| `src/domain/ricerca-piatti.ts` (nuovo) | `ingredientiDelPiatto`, `cercaPiatti`: pure | 2 |
| `src/components/Porta.tsx` (nuovo) | la scheda-porta, condivisa da Piatti e Importa | 3 |
| `src/components/Dock.tsx` (modifica) | il contenitore diventa una regione con nome | 3 |
| `src/components/barra-context.tsx` (nuovo) | una schermata chiede al `Guscio` di non montare la tab bar | 3 |
| `src/components/Guscio.tsx` (modifica) | il provider, e la tab bar montata solo se non è nascosta | 3 |
| `src/app/(app)/piatti/ElencoPiatti.tsx` (nuovo) | ricerca, aggiungi, righe, vuoto di ricerca: presentazione pura | 4 |
| `src/app/(app)/piatti/page.tsx` (modifica) | carica i dati, sceglie fra errore, vuoto ed elenco | 3, 4 |
| `src/app/(app)/importa/Camera.tsx` (riscrittura della forma) | fotocamera a tutto schermo, banda, stato di «Rivedi» | 6 |
| `src/app/(app)/importa/FogliPresi.tsx` (nuovo) | il foglio «Rivedi i fogli presi» | 6 |
| `src/app/(app)/importa/Acquisizione.tsx` (nuovo) | le due porte e il Dock del PDF: presentazione pura | 7 |
| `src/app/(app)/importa/page.tsx` (modifica) | `estrai(sorgente)`, fotocamera aperta o chiusa, cronologia | 7 |
| `docs/superpowers/specs/DESIGN-SYSTEM.md` (modifica) | il ponte registra la fase 3 | 8 |

**Modelli suggeriti al dispatch:**
- Task 1 e 2 hanno il testo e il codice completi → modello economico.
- Task 3 e 4 sono integrazione su più file col codice dato → modello medio.
- Task 5 e 8 sono misura nel browser e giudizio → modello capace.
- Task 6 e 7 riscrivono componenti con logica delicata: cronologia, fuoco, i bug del 30/08 → modello capace.

---

### Task 1: `DESIGN.md` e i token

**Files:**
- Modify: `design/sistema/DESIGN.md`
- Modify: `src/app/globals.css` (blocco `:root`)
- Test: `scripts/__tests__/token-check.test.ts` (esiste, non si tocca: deve restare verde)

**Interfaces:**
- Produce i token `--bordo-tratteggio`, `--overlay-foglio`, `--riga-piatto`,
  `--scatto-anello`, `--scatto-disco`, `--moto-scatto`, `--banda-fondo`, `--banda-bordo` in
  `:root`, usati dai Task 4, 6 e 7.

- [ ] **Step 1: la data in testa**

In `design/sistema/DESIGN.md`, riga 3: sostituisci `**Versione 3, aggiornata il 20/09/2026.**`
con `**Versione 3, aggiornata il 23/09/2026.**`.

- [ ] **Step 2: §2.5, tre alfa da registrare**

Nella tabella di §2.5, in testa, cioè subito prima della riga `| \`0,045\` su \`--ink\` | …`,
aggiungi:

```
| `0,04` su `--ink` | fondo delle voci del Foglio dal basso e dei tasti di «Rivedi i fogli presi» |
```

Dopo la riga `| \`0,09\` su \`--ink\` | …`:

```
| `0,14` su `--ink` | righe finte della miniatura nella Striscia dei fogli presi |
```

Dopo l'ultima riga `| \`0,62\` su bianco | tempo di registrazione nello stato "Registro" |`:

```
| `0,92` su bianco | angoli della cornice guida sopra l'anteprima fotocamera |
```

`0,04` e `0,14` sono già in uso (Foglio dal basso §8, Striscia §8) e la tabella non le elencava.
`0,92` è nuova.

- [ ] **Step 3: §8 Dock**

Sostituisci questo blocco, identico nel file:

```
- **Cosa ci vive:** `HAI PRESO TUTTO` (Lista), `CONFERMA E CREA LA LISTA` (Piano), `HO FINITO`
  (Importa, sopra l'anteprima è la Banda dei comandi a farlo), il primario di ogni stato vuoto,
  `Fai una modifica` e il vocale (Dispensa).
- **Accesso:** il Dock non è una barra di navigazione, non prende `role` propri; i suoi
  controlli sono tasti normali con nome accessibile. Bersagli ≥ 44 sempre.
```

con:

```
- **Cosa ci vive:** `HAI PRESO TUTTO` (Lista), `CONFERMA E CREA LA LISTA` (Piano), `ESTRAI LA
  DIETA` (Importa, solo con un PDF scelto), il primario di ogni stato vuoto, `Fai una modifica`
  e il vocale (Dispensa). `HO FINITO` della fotocamera non sta qui: sopra l'anteprima lo porta
  la Banda dei comandi.
- **Accesso:** il contenitore è una regione, `role="region"` con `aria-label="Azione
  principale"`, lo stesso nome per ogni Dock: chi naviga per regioni con lo screen reader trova
  l'azione principale senza scorrere la pagina. Il nome dice il posto, non l'azione, che ha già
  il suo nome sul tasto. Non è una barra di navigazione: i controlli dentro sono tasti normali
  con nome accessibile. Bersagli ≥ 44 sempre. (Deciso il 23/09; prima il Dock non prendeva
  `role` propri.)
```

- [ ] **Step 4: §8 Riga piatto**

Sostituisci:

```
  ellissi su riga singola, sottoriga mono 9/500/0.08em in `--ter` (`2 porzioni · 7
  ingredienti`), pallini d'area 8 px raggio 2,6. Zona destra **44** col chevron in
  `--icona-spenta`.
```

con:

```
  ellissi su riga singola, sottoriga mono 9/500/0.08em in `--ter` (`7 ingredienti · dalla
  dieta`), pallini d'area 8 px raggio 2,6. Zona destra **44** col chevron in `--icona-spenta`.
  Il numero conta gli ingredienti distinti che possono entrare nel piatto: i fissi e quelli di
  ogni alternativa. Le porzioni non ci sono: il piatto non ha quel dato.
```

e sostituisci:

```
- **Non porta** la fonte del piatto né il pasto: un piatto non appartiene a un pasto.
```

con:

```
- **Non porta il pasto**: un piatto non appartiene a un pasto. Della fonte dice solo `dalla
  dieta`, sui piatti che vengono dall'import; sui piatti propri non dice niente.
```

- [ ] **Step 5: §8 Banda dei comandi**

Subito dopo la riga che finisce con `bordo 1,5 px bianco al 62%. Tutti i testi in bianco pieno.`
e prima della riga vuota che precede `Ogni flusso che passa da qui`, aggiungi:

```

- **Sopra, in alto** a `top 22`, `left/right 16`, gap 8: il tondo indietro 44 e la pillola di
  titolo alta 44 (mono 11/700/0.08em, padding `0 16px`), entrambi bianchi con `--ombra-nav`. La
  pillola è l'`h1` della schermata.
- **La cornice guida** sull'anteprima: quattro angoli 30 × 30 a tratto 3 px bianco al 92%,
  raggio 14 sul lato esterno, a `inset 88 / 40 / 268`. Aiuta a inquadrare, non ritaglia lo
  scatto.
- **A zero fogli** la Striscia dei fogli presi, `Ho finito` e la riga dell'ultimo scatto non ci
  sono: la riga porta solo lo scatto. È la regola del Dock — un primario che non deve esistere
  non si mostra spento — e su questo fondo lo stato spento del sistema non si vedrebbe.
- **L'avviso in linea** (il tetto dei fogli, le foto scartate) sta sulla banda in **bianco**
  12,5, sopra la riga dell'ultimo scatto, con `role="status"`: `--avviso` su 0,72 non regge il
  contrasto.
```

- [ ] **Step 6: §8 Striscia dei fogli presi**

Sostituisci:

```
`rgba(20,22,58,.14)`) e il contatore `2 fogli` in mono 10/700/0.11em. Tocco = apre la vista
**Rivedi i fogli presi**, dove ogni foglio è una tessera **62 × 80** raggio 14 bianca, bordo 1
px `rgba(20,22,58,0.09)`, `--ombra-nav`, numero in mono 10, X con disegno 20 e **bersaglio 44**
sporgente. Oltre quattro fogli la fila **scorre in orizzontale**, non si impila.
```

con:

```
`rgba(20,22,58,.14)`) e il contatore `2 fogli` in mono 10/700/0.11em. Tocco = apre **Rivedi i
fogli presi**, un **Foglio dal basso** (`aria-label="Rivedi i fogli presi"`) con le pagine **in
colonna**, nell'ordine in cui l'estrazione le legge:

- intestazione in mono 10/700/0.13em in `--testo-2`: `3 fogli · l'app li legge in
  quest'ordine`, oppure `1 foglio`;
- una riga per foglio, gap 12: la **foto vera** 62 × 80 raggio 14, `object-fit: cover`, bordo
  1 px `rgba(20,22,58,0.09)`; `Foglio 2` in 15.5/700; tre tasti tondi **44** su
  `rgba(20,22,58,0.04)` con icona 20 in `--ink`: sposta su, sposta giù, togli. Spenti (su sul
  primo, giù sull'ultimo) l'icona va in `--icona-spenta`;
- l'elenco scorre dentro il foglio, che è alto al massimo lo schermo meno 88; in fondo la voce
  `Chiudi`. Togliere l'ultimo foglio chiude il foglio.

(Cambiato il 23/09: prima era una fila orizzontale di tessere con la sola X. Il riordino c'è
perché l'ordine dei fogli è l'ordine di lettura.)
```

- [ ] **Step 7: §9 Conferme**

Sostituisci:

```
distruttivo pieno in `--errore`, ANNULLA secondario accanto. Le azioni reversibili non chiedono
niente e si annullano rifacendo il gesto.
```

con:

```
distruttivo pieno in `--errore`, ANNULLA secondario accanto. Le azioni reversibili non chiedono
niente e si annullano rifacendo il gesto. Eccezione dichiarata (23/09): togliere un foglio in
«Rivedi i fogli presi» non chiede conferma. Il foglio si rifà con uno scatto, niente di salvato
va perso, e un dialogo per ogni foglio renderebbe il riordino un lavoro.
```

- [ ] **Step 8: §12**

Subito dopo il paragrafo che finisce con `8,5 px, checkbox, switch.`, aggiungi:

```

**Le foto dell'utente sono un'eccezione dichiarata** (23/09): l'anteprima della fotocamera e le
miniature di «Rivedi i fogli presi» mostrano il contenuto del dispositivo, non un'illustrazione.
Altrove le foto restano fuori.
```

- [ ] **Step 9: §13, le decisioni del 23/09**

In fondo a §13, dopo l'ultima voce di `### Decisioni del 20/09, secondo giro`, aggiungi:

```

### Decisioni del 23/09/2026 (fase 3: Piatti e fotocamera)

- **Il PDF si sceglie prima della fotocamera.** L'acquisizione della dieta si apre con due
  porte, `Fotografa i fogli` e `Carica il PDF`; la fotocamera non porta il ramo PDF.
- **«Rivedi i fogli presi» è un foglio dal basso** con le pagine in colonna e il riordino (§8
  Striscia dei fogli presi), costruito dalle regole del sistema senza un giro in Claude Design.
- **La Riga piatto dice `N ingredienti`**, più `dalla dieta` sui piatti dell'import (§8 Riga
  piatto).
- **Il Dock è una regione** di nome `Azione principale` (§8 Dock).
- **Le foto dell'utente** sono un'eccezione dichiarata a §12.
- **«Togli il foglio» non chiede conferma** (§9 Conferme).
```

- [ ] **Step 10: i token in `globals.css`**

In `src/app/globals.css`, dentro `:root`, subito dopo la riga `--coda-scroll-dock: 194px;` e il
suo commento se ne ha uno, aggiungi:

```css
  /* Fase 3 (spec 23/09 §J): copiati da design/sistema/tokens.css, stessi valori. */
  --bordo-tratteggio: rgba(20, 22, 58, 0.20);
  --overlay-foglio: rgba(20, 22, 58, 0.35);
  --riga-piatto: 68px;
  --scatto-anello: 76px;
  --scatto-disco: 62px;
  --moto-scatto: 180ms;
  --banda-fondo: rgba(20, 22, 58, 0.72);
  --banda-bordo: rgba(255, 255, 255, 0.62);
```

Prima di scrivere, confronta ogni valore con `design/sistema/tokens.css` (righe 73, 97, 107,
149–152, 155), carattere per carattere. È il guardiano a fallire se non coincidono.

- [ ] **Step 11: il guardiano**

Run: `npm run design:token`
Expected: PASS, e nel resoconto del test i token in comune salgono da 52 a **60**. Scrivi nel
rapporto il numero vero.

- [ ] **Step 12: la suite**

Run: `npm test`
Expected: tutto verde, perché nessun codice di schermata è cambiato.

- [ ] **Step 13: Commit**

```bash
git add design/sistema/DESIGN.md src/app/globals.css
git commit -m "docs: DESIGN.md registra la fase 3 e il codice prende i suoi token

Dock come regione, Riga piatto senza porzioni, banda e cornice guida, «Rivedi i fogli presi»
in colonna col riordino, foto dell'utente come eccezione a §12, tre alfa registrate.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: la ricerca, pura

**Files:**
- Create: `src/domain/ricerca-piatti.ts`
- Create: `src/domain/__tests__/ricerca-piatti.test.ts`

**Interfaces:**
- Consuma: `normalizza(s: string): string` da `@/domain/import/mapping`; i tipi `Dish` e
  `Ingredient` da `@/domain/types`.
- Produce:
  - `ingredientiDelPiatto(piatto: Dish): string[]`
  - `cercaPiatti(piatti: Dish[], ingredienti: Ingredient[], testo: string): Dish[]`

  Le usa il Task 4.

- [ ] **Step 1: il test che fallisce**

`src/domain/__tests__/ricerca-piatti.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Dish, Ingredient } from '@/domain/types';
import { cercaPiatti, ingredientiDelPiatto } from '../ricerca-piatti';

function ingrediente(id: string, nome: string): Ingredient {
  return {
    id, nome, unitaBase: 'g', area: 'dispensa',
    classeResiduo: 'intero', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null,
  };
}

function piatto(id: string, nome: string, fissi: string[], opzioni: string[][] = []): Dish {
  return {
    id, nome, slotDefId: 'sd-1', fonte: 'proprio', attivo: true, descrizione: null,
    settimanaCiclo: null, giornoCiclo: null,
    ingredienti: fissi.map((ingredientId) => ({ ingredientId, quantita: 10, unita: 'g' })),
    componenti: opzioni.length === 0 ? [] : [{
      id: `c-${id}`, nome: 'a scelta',
      opzioni: opzioni.map((righe, i) => ({
        id: `o-${id}-${i}`,
        righe: righe.map((ingredientId) => ({ ingredientId, quantita: 10, unita: 'g' as const })),
      })),
    }],
  };
}

const RICOTTA = ingrediente('i-ricotta', 'Ricotta');
const PASTA = ingrediente('i-pasta', 'Pasta di semola');
const TONNO = ingrediente('i-tonno', 'Tonno');
const PANE = ingrediente('i-pane', 'Pane integrale');
const FETTE = ingrediente('i-fette', 'Fette biscottate');
const CAFFE = ingrediente('i-caffe', 'Caffè');

const LASAGNE = piatto('d-1', 'Lasagne al forno', ['i-pasta', 'i-ricotta']);
const PASTA_POMODORO = piatto('d-2', 'Pasta al pomodoro', ['i-pasta']);
const COLAZIONE = piatto('d-3', 'Colazione', ['i-caffe'], [['i-pane'], ['i-fette', 'i-ricotta']]);
const INSALATA = piatto('d-4', 'Insalata di tonno', ['i-tonno']);

const PIATTI = [LASAGNE, PASTA_POMODORO, COLAZIONE, INSALATA];
const INGREDIENTI = [RICOTTA, PASTA, TONNO, PANE, FETTE, CAFFE];

describe('ingredientiDelPiatto', () => {
  it('unisce i fissi e le righe di ogni opzione, senza doppioni', () => {
    const ricottaDoppia = piatto('d-9', 'X', ['i-ricotta'], [['i-ricotta', 'i-pane']]);
    expect(ingredientiDelPiatto(ricottaDoppia)).toEqual(['i-ricotta', 'i-pane']);
    expect(ingredientiDelPiatto(COLAZIONE)).toEqual(['i-caffe', 'i-pane', 'i-fette', 'i-ricotta']);
  });

  it('senza componenti dà i soli fissi', () => {
    expect(ingredientiDelPiatto(LASAGNE)).toEqual(['i-pasta', 'i-ricotta']);
  });

  it('con soli componenti dà quelli delle opzioni', () => {
    const soloOpzioni = piatto('d-8', 'Merenda', [], [['i-pane'], ['i-fette']]);
    expect(ingredientiDelPiatto(soloOpzioni)).toEqual(['i-pane', 'i-fette']);
  });
});

describe('cercaPiatti', () => {
  it('regola 1: un testo vuoto o di soli spazi dà tutti i piatti, nello stesso ordine', () => {
    expect(cercaPiatti(PIATTI, INGREDIENTI, '')).toEqual(PIATTI);
    expect(cercaPiatti(PIATTI, INGREDIENTI, '   ')).toEqual(PIATTI);
  });

  it('regola 2: accenti, maiuscole e spazi doppi non contano', () => {
    expect(cercaPiatti(PIATTI, INGREDIENTI, 'LASAGNE  AL')).toEqual([LASAGNE]);
    expect(cercaPiatti(PIATTI, INGREDIENTI, 'caffe')).toEqual([COLAZIONE]);
  });

  it('regola 3: trova un piatto per un ingrediente che non è nel nome', () => {
    expect(cercaPiatti(PIATTI, INGREDIENTI, 'ricotta')).toEqual([LASAGNE, COLAZIONE]);
  });

  it('regola 3: vale anche per un ingrediente che sta solo in un\'opzione', () => {
    expect(cercaPiatti(PIATTI, INGREDIENTI, 'biscottate')).toEqual([COLAZIONE]);
  });

  it('regola 4: il testo si cerca intero, non parola per parola', () => {
    // "pasta" è nel nome e "tonno" in un altro piatto: nessuno contiene "pasta tonno".
    expect(cercaPiatti(PIATTI, INGREDIENTI, 'pasta tonno')).toEqual([]);
  });

  it('regola 5: un ingrediente sconosciuto si ignora', () => {
    const orfano = piatto('d-7', 'Piatto orfano', ['i-sparito']);
    expect(cercaPiatti([orfano], INGREDIENTI, 'orfano')).toEqual([orfano]);
    expect(cercaPiatti([orfano], INGREDIENTI, 'ricotta')).toEqual([]);
  });

  it('regola 6: l\'ordine di uscita è quello di entrata', () => {
    expect(cercaPiatti([INSALATA, LASAGNE, PASTA_POMODORO], INGREDIENTI, 'pasta')).toEqual([LASAGNE, PASTA_POMODORO]);
  });
});
```

- [ ] **Step 2: il test fallisce**

Run: `npx vitest run src/domain/__tests__/ricerca-piatti.test.ts`
Expected: FAIL, `Failed to resolve import "../ricerca-piatti"`.

- [ ] **Step 3: il codice**

`src/domain/ricerca-piatti.ts`:

```ts
import type { Dish, Ingredient } from './types';
import { normalizza } from './import/mapping';

/**
 * Gli ingredienti del piatto, come li intende la schermata Piatti: i fissi e
 * quelli di ogni opzione di ogni componente, senza doppioni, nell'ordine in
 * cui compaiono. Una definizione sola per tre usi — ricerca, conteggio della
 * sottoriga, pallini d'area — così non possono dire tre cose diverse
 * (spec 23/09 §B). Prima i pallini leggevano solo i fissi, e un piatto fatto
 * di sole alternative mostrava "0 INGR.".
 */
export function ingredientiDelPiatto(piatto: Dish): string[] {
  const visti = new Set<string>();
  for (const riga of piatto.ingredienti) visti.add(riga.ingredientId);
  for (const componente of piatto.componenti) {
    for (const opzione of componente.opzioni) {
      for (const riga of opzione.righe) visti.add(riga.ingredientId);
    }
  }
  return [...visti];
}

/**
 * I piatti il cui nome, o il nome di uno dei loro ingredienti, contiene il
 * testo cercato (spec 23/09 §B, sei regole). Il confronto ignora accenti,
 * maiuscole e spazi doppi: sul telefono l'accento costa un tocco in più e
 * nessuno lo mette per cercare. Il testo si cerca intero, come sottostringa;
 * l'ordine resta quello di entrata.
 */
export function cercaPiatti(piatti: Dish[], ingredienti: Ingredient[], testo: string): Dish[] {
  const cercato = normalizza(testo);
  if (cercato === '') return piatti;
  const nomi = new Map(ingredienti.map((i) => [i.id, normalizza(i.nome)]));
  return piatti.filter(
    (p) =>
      normalizza(p.nome).includes(cercato) ||
      ingredientiDelPiatto(p).some((id) => nomi.get(id)?.includes(cercato) ?? false),
  );
}
```

- [ ] **Step 4: il test passa**

Run: `npx vitest run src/domain/__tests__/ricerca-piatti.test.ts`
Expected: PASS, 10 test.

- [ ] **Step 5: tipi e lint**

Run: `npx tsc --noEmit && npx eslint src/domain/ricerca-piatti.ts src/domain/__tests__/ricerca-piatti.test.ts`
Expected: nessun errore.

- [ ] **Step 6: Commit**

```bash
git add src/domain/ricerca-piatti.ts src/domain/__tests__/ricerca-piatti.test.ts
git commit -m "feat: la ricerca dei piatti guarda anche negli ingredienti

Una funzione pura, ingredientiDelPiatto, dice quali sono gli ingredienti di un piatto (fissi e
di ogni alternativa); cercaPiatti la usa per trovare «ricotta» dentro le lasagne.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: i pezzi condivisi — `Porta`, il Dock come regione, la tab bar su richiesta

**Files:**
- Create: `src/components/Porta.tsx`
- Create: `src/components/barra-context.tsx`
- Create: `src/components/__tests__/porta.test.tsx`
- Modify: `src/components/Dock.tsx`
- Modify: `src/components/Guscio.tsx`
- Modify: `src/app/globals.css`, con la classe `.porta-azione`
- Modify: `src/app/(app)/piatti/page.tsx`, dove solo `VuotoPiatti` e la `Porta` locale passano
  al componente condiviso
- Test: `src/components/__tests__/dock.test.tsx`, `src/components/__tests__/guscio.test.tsx`
  (esistono; si aggiunge un caso ciascuno), `src/app/(app)/piatti/__tests__/page.test.tsx`
  (esiste; il `describe('Le due porte')` deve restare verde senza modifiche)

**Interfaces:**
- Produce:
  - `Porta({ titolo: string; testo: ReactNode; children: ReactNode })`, che usano il Task 4
    (tramite `VuotoPiatti`) e il Task 7;
  - `.porta-azione`, la classe del tasto dentro la porta;
  - `useNascondiBarra(nascosta: boolean): void`, che usa il Task 6;
  - `BarraProvider` e `useBarraNascosta(): boolean`, che usa `Guscio`.

- [ ] **Step 1: i test che falliscono**

`src/components/__tests__/porta.test.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Porta } from '../Porta';

describe('Porta', () => {
  it('mostra titolo, testo e l\'azione che riceve', () => {
    render(
      <Porta titolo="Carica il PDF" testo="Se la dieta ti è arrivata in PDF, caricalo così com'è.">
        <button type="button" className="porta-azione">SCEGLI IL PDF</button>
      </Porta>,
    );
    expect(screen.getByText('Carica il PDF')).toBeInTheDocument();
    expect(screen.getByText("Se la dieta ti è arrivata in PDF, caricalo così com'è.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SCEGLI IL PDF' })).toHaveClass('porta-azione');
  });

  it('il testo può essere un nodo, non solo una stringa', () => {
    render(
      <Porta titolo="Carica il PDF" testo={<span data-testid="nome-file">dieta.pdf</span>}>
        <span>Cambia file</span>
      </Porta>,
    );
    expect(screen.getByTestId('nome-file')).toHaveTextContent('dieta.pdf');
  });
});
```

In `src/components/__tests__/dock.test.tsx`, dentro il `describe('Dock')`, aggiungi:

```tsx
  it('il contenitore è una regione di nome «Azione principale» (spec fase 3 §H)', () => {
    const slot = document.createElement('div');
    document.body.appendChild(slot);
    render(
      <SlotDockProvider slot={slot}>
        <Dock><button type="button">HAI PRESO TUTTO</button></Dock>
      </SlotDockProvider>,
    );
    const regione = screen.getByRole('region', { name: 'Azione principale' });
    expect(regione).toHaveClass('dock');
    expect(regione).toContainElement(screen.getByRole('button', { name: 'HAI PRESO TUTTO' }));
    slot.remove();
  });
```

In `src/components/__tests__/guscio.test.tsx`, aggiungi in cima agli import
`import { useNascondiBarra } from '../barra-context';` e poi, dentro `describe('Guscio')`:

```tsx
  it('una schermata che chiede di nascondere la barra la toglie dal DOM, e smontandosi la rimette', () => {
    function Nasconde() {
      useNascondiBarra(true);
      return <p>fotocamera</p>;
    }
    const { container, rerender } = render(<Guscio><Nasconde /></Guscio>);
    expect(container.querySelector('nav[aria-label="Sezioni"]')).not.toBeInTheDocument();
    rerender(<Guscio><p>porte</p></Guscio>);
    expect(container.querySelector('nav[aria-label="Sezioni"]')).toBeInTheDocument();
  });
```

- [ ] **Step 2: i test falliscono**

Run: `npx vitest run src/components/__tests__/porta.test.tsx src/components/__tests__/dock.test.tsx src/components/__tests__/guscio.test.tsx`
Expected: FAIL. `porta.test` fallisce perché il modulo non esiste; `dock.test` non trova la
`region`; `guscio.test` fallisce perché `barra-context` non esiste.

- [ ] **Step 3: `Porta.tsx`**

```tsx
import type { ReactNode } from 'react';

interface Props {
  titolo: string;
  /** Una frase, o un nodo (in Importa, il nome del PDF scelto). */
  testo: ReactNode;
  /** L'azione della porta: un <Link>, un <button> o un <label> col suo input, con classe `porta-azione`. */
  children: ReactNode;
}

/**
 * Una porta: scheda bianca con titolo, spiegazione e la propria azione. Nata
 * nello stato vuoto di Piatti (spec due porte 06/09 §2.1), condivisa dal 23/09
 * con la scelta di Importa (spec fase 3 §C, §D). Una scelta fra due strade, non
 * il primario della schermata: per questo sta nel contenuto e non nel Dock.
 */
export function Porta({ titolo, testo, children }: Props) {
  return (
    <div
      style={{
        flexShrink: 0, padding: '20px 18px 18px', borderRadius: 22,
        background: 'var(--superficie)', border: '1px solid var(--bordo)',
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--ink)' }}>
        {titolo}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--sec)', margin: '6px 0 16px' }}>{testo}</div>
      {children}
    </div>
  );
}
```

`flexShrink: 0` è nuovo. Serve in Importa, dove le porte stanno in uno scroller a colonna flex:
senza, la scheda si comprime come la tessera della fase 2. In Piatti le porte stanno in un
`div` a colonna che non si comprime, quindi lì non cambia niente.

- [ ] **Step 4: `.porta-azione` in `globals.css`**

Subito dopo il blocco `.dock-primario:disabled { … }`, aggiungi:

```css
/* Il tasto dentro una Porta (spec fase 3 §C): una classe perché i chiamanti sono
   un <Link> in Piatti, un <button> e un <label> col suo input nascosto in Importa.
   Valori identici allo stile inline che aveva in Piatti; `position: relative`
   tiene dentro il tasto l'input file assoluto e nascosto. */
.porta-azione {
  position: relative; display: flex; align-items: center; justify-content: center;
  width: 100%; height: 54px; border-radius: 18px; border: none; box-sizing: border-box;
  font-family: var(--font-mono); font-size: 12px; font-weight: 700; letter-spacing: 0.09em;
  background: var(--ink); color: var(--superficie); box-shadow: var(--ombra-tasto);
  text-decoration: none; cursor: pointer;
}
```

- [ ] **Step 5: Piatti usa la `Porta` condivisa**

In `src/app/(app)/piatti/page.tsx`:
- cancella `interface PropsPorta` e la `function Porta` locale, con il suo commento;
- aggiungi `import { Porta } from '@/components/Porta';`;
- in `VuotoPiatti` sostituisci le due `<Porta … azione="…" href="…" />` con:

```tsx
          <Porta
            titolo="Ho una dieta"
            testo="Fotografa le pagine del piano che ti hanno dato: piatti e grammature li legge l'app, tu controlli e confermi."
          >
            <Link href="/importa" className="porta-azione">IMPORTA LA DIETA</Link>
          </Porta>
          <Porta
            titolo="Cucino sempre le stesse cose"
            testo="Scrivi otto o dieci piatti che fai davvero, con gli ingredienti e quanto ne usi. Da lì la settimana gira da sola."
          >
            <Link href="/piatti/veloce" className="porta-azione">SCRIVI I MIEI PIATTI</Link>
          </Porta>
```

I testi sono quelli di oggi, carattere per carattere: confrontali col file prima di cancellare.

- [ ] **Step 6: il Dock diventa una regione**

In `src/components/Dock.tsx` sostituisci:

```tsx
  return createPortal(<div className="dock anim-dock">{children}</div>, slot);
```

con:

```tsx
  // Una regione con nome (spec fase 3 §H, DESIGN.md §8 Dock): chi naviga per
  // regioni con lo screen reader trova l'azione principale senza scorrere. Il
  // nome dice il posto, uguale per ogni Dock; l'azione ha il suo sul tasto.
  return createPortal(
    <div className="dock anim-dock" role="region" aria-label="Azione principale">{children}</div>,
    slot,
  );
```

Nel commento JSDoc sopra `Dock` non c'è niente sui `role`, quindi non va toccato.

- [ ] **Step 7: `barra-context.tsx`**

```tsx
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const Nascosta = createContext(false);
const Imposta = createContext<(nascosta: boolean) => void>(() => {});

/**
 * Chi può chiedere al Guscio di non montare la tab bar: oggi solo la
 * fotocamera di Importa, che è a tutto schermo (spec fase 3 §G). Stesso
 * modello di `marchio-context.tsx`. Senza provider (nei test di un componente
 * da solo) la richiesta cade nel vuoto, di proposito.
 */
export function BarraProvider({ children }: { children: ReactNode }) {
  const [nascosta, setNascosta] = useState(false);
  return (
    <Imposta.Provider value={setNascosta}>
      <Nascosta.Provider value={nascosta}>{children}</Nascosta.Provider>
    </Imposta.Provider>
  );
}

/** Finché il componente che la chiama è montato, la barra resta fuori; allo smontaggio torna. */
export function useNascondiBarra(nascosta: boolean): void {
  const imposta = useContext(Imposta);
  useEffect(() => {
    imposta(nascosta);
    return () => imposta(false);
  }, [imposta, nascosta]);
}

export function useBarraNascosta(): boolean {
  return useContext(Nascosta);
}
```

- [ ] **Step 8: `Guscio` monta la barra solo se non è nascosta**

In `src/components/Guscio.tsx`:
- aggiungi `import { BarraProvider, useBarraNascosta } from './barra-context';`;
- nel `return`, avvolgi il `<div className="guscio" …>` in `<BarraProvider>`, dentro
  `<MarchioProvider>`, e sostituisci `<TabBar />` con `<TabBarSeVisibile />`;
- in fondo al file aggiungi:

```tsx
/**
 * La tab bar, a meno che una schermata a tutto schermo non l'abbia chiesta via
 * (`useNascondiBarra`, spec fase 3 §G). Tolta dal DOM, non nascosta col CSS:
 * una barra invisibile resterebbe raggiungibile da tastiera e da screen reader.
 * Un componente a sé perché il Guscio rende il provider e non può leggerlo.
 */
function TabBarSeVisibile() {
  return useBarraNascosta() ? null : <TabBar />;
}
```

Il `return` risultante:

```tsx
  return (
    <MarchioProvider>
      <BarraProvider>
        <div className="guscio" data-barra={barra}>
          <SlotDockProvider slot={slotDock}>
            <main className="guscio-main">{children}</main>
          </SlotDockProvider>
          {/* Lo slot copre la cornice ma non intercetta niente: `pointer-events: none`
              sul contenitore, `auto` su quello che il Dock ci mette dentro. Senza,
              un velo invisibile mangerebbe lo scorrimento di tutta l'app. */}
          <div className="dock-slot" ref={setSlotDock} />
          <TabBarSeVisibile />
        </div>
      </BarraProvider>
    </MarchioProvider>
  );
```

Il test esistente `renderizza lo slot del dock accanto alla tab bar` controlla che dopo lo slot
venga un `NAV`: `TabBarSeVisibile` non aggiunge nodi, quindi resta verde.

- [ ] **Step 9: i test passano**

Run: `npx vitest run src/components src/app/\(app\)/piatti`
Expected: PASS. I test della Lista e del Piano che cercano il tasto del Dock per nome restano
verdi: il nome del tasto non cambia.

- [ ] **Step 10: suite, tipi, lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: tutto verde.

- [ ] **Step 11: Commit**

```bash
git add src/components/Porta.tsx src/components/barra-context.tsx src/components/__tests__/porta.test.tsx src/components/Dock.tsx src/components/Guscio.tsx src/components/__tests__/dock.test.tsx src/components/__tests__/guscio.test.tsx src/app/globals.css "src/app/(app)/piatti/page.tsx"
git commit -m "feat: Porta condivisa, il Dock come regione, la tab bar su richiesta

La Porta dello stato vuoto di Piatti diventa un componente, perché Importa la usa per la
scelta fra foto e PDF. Il Dock è una regione di nome «Azione principale», per tutti i Dock.
Una schermata a tutto schermo può chiedere al Guscio di non montare la tab bar.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Piatti

**Files:**
- Create: `src/app/(app)/piatti/ElencoPiatti.tsx`
- Modify: `src/app/(app)/piatti/page.tsx`, che dopo questo task è quello dello Step 4, intero
- Test: `src/app/(app)/piatti/__tests__/page.test.tsx` e `ricerca.test.tsx`, riscritti come
  agli Step 1 e 2

**Interfaces:**
- Consuma dal Task 2 `cercaPiatti` e `ingredientiDelPiatto`; dal Task 3 `Porta` e
  `.porta-azione`; dal Task 1 i token `--bordo-tratteggio` e `--riga-piatto`.
- Produce `ElencoPiatti({ piatti: Dish[]; ingredienti: Ingredient[]; ordineAree: AreaId[] })`,
  che usa la sonda del Task 8.

- [ ] **Step 1: il censimento**

Prima di toccare i test, cerca in tutto `src/` le stringhe che questo task cambia e scrivi nel
rapporto dove stanno:

```bash
grep -rn "Cerca un piatto\|NUOVO PIATTO\|INGR\.\|NUTRIZIONISTA\|PROPRIO\|Cambia filtro\|'TUTTI'" src
```

Quelle fuori da `src/app/(app)/piatti/` non si toccano. Oggi sono:
- l'etichetta `DIETA DEL NUTRIZIONISTA` delle Impostazioni;
- `{p.ingredienti.length} INGR.` nella schermata Scegli del Piano.

Nessuna delle due è Piatti. Se ne trovi altre, scrivile nel rapporto e fermati prima di
toccarle.

- [ ] **Step 2: i test che falliscono**

Sostituisci **per intero** `src/app/(app)/piatti/__tests__/page.test.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Dish, Ingredient } from '@/domain/types';

vi.mock('@/data/repertorio', () => ({
  leggiRepertorio: vi.fn(),
  leggiIngredienti: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({
  leggiSlotDefs: vi.fn(),
  leggiImpostazioni: vi.fn(),
}));

import { leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiSlotDefs, leggiImpostazioni } from '@/data/impostazioni';
import Piatti from '../page';

const ING_LATTE: Ingredient = {
  id: 'i-1', nome: 'Latte', unitaBase: 'ml', area: 'latticini',
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 1000, prezzoConfezione: null, ean: null,
};
const ING_PANE: Ingredient = {
  id: 'i-2', nome: 'Pane', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'intero', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null,
};

const PIATTO_COLAZIONE: Dish = {
  id: 'd-1', nome: 'Latte e pane', slotDefId: 'sd-1', fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [
    { ingredientId: 'i-1', quantita: 200, unita: 'ml' },
    { ingredientId: 'i-2', quantita: 50, unita: 'g' },
  ],
  componenti: [],
};
const PIATTO_PRANZO: Dish = {
  id: 'd-2', nome: 'Pasta al pomodoro', slotDefId: 'sd-2', fonte: 'nutrizionista', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-2', quantita: 80, unita: 'g' }],
  componenti: [],
};
/** Solo alternative, nessun ingrediente fisso: prima mostrava "0 INGR." e nessun pallino. */
const PIATTO_ALTERNATIVE: Dish = {
  id: 'd-3', nome: 'Merenda', slotDefId: 'sd-1', fonte: 'nutrizionista', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [],
  componenti: [{
    id: 'c-1', nome: 'a scelta',
    opzioni: [
      { id: 'o-1', righe: [{ ingredientId: 'i-2', quantita: 30, unita: 'g' }] },
      { id: 'o-2', righe: [{ ingredientId: 'i-1', quantita: 150, unita: 'ml' }] },
    ],
  }],
};

const ORDINE_AREE_TEST = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'] as const;

function mockRepertorio(piatti: Dish[]) {
  vi.mocked(leggiRepertorio).mockResolvedValue(piatti);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_LATTE, ING_PANE]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: [...ORDINE_AREE_TEST],
    settimaneCiclo: 1,
    cicloOrigine: null,
  });
}

describe('Piatti (repertorio)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra l'onboarding (le due porte) quando leggiRepertorio torna vuoto", async () => {
    mockRepertorio([]);
    render(<Piatti />);
    expect(await screen.findByText('Da dove partiamo?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'IMPORTA LA DIETA' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'SCRIVI I MIEI PIATTI' })).toBeInTheDocument();
  });

  it('non c\'è più il filtro dei pasti, né la pillola del pasto, e i pasti non si leggono', async () => {
    mockRepertorio([PIATTO_COLAZIONE, PIATTO_PRANZO]);
    render(<Piatti />);
    await screen.findByRole('link', { name: 'Apri Latte e pane' });
    expect(screen.queryByRole('button', { name: 'TUTTI' })).not.toBeInTheDocument();
    expect(screen.queryByText('Colazione')).not.toBeInTheDocument();
    expect(screen.queryByText('Pranzo')).not.toBeInTheDocument();
    expect(leggiSlotDefs).not.toHaveBeenCalled();
  });

  it('l\'aggiungi tratteggiato porta all\'editor completo e sta prima della prima riga', async () => {
    mockRepertorio([PIATTO_COLAZIONE, PIATTO_PRANZO]);
    render(<Piatti />);
    const prima = await screen.findByRole('link', { name: 'Apri Latte e pane' });
    const aggiungi = screen.getByRole('link', { name: 'Nuovo piatto' });
    expect(aggiungi).toHaveAttribute('href', '/piatti/nuovo');
    expect(aggiungi.compareDocumentPosition(prima) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('+ NUOVO PIATTO')).not.toBeInTheDocument();
  });

  it('ogni riga è un solo link che apre il piatto', async () => {
    mockRepertorio([PIATTO_COLAZIONE, PIATTO_PRANZO]);
    render(<Piatti />);
    expect(await screen.findByRole('link', { name: 'Apri Latte e pane' })).toHaveAttribute('href', '/piatti/d-1');
    expect(screen.getByRole('link', { name: 'Apri Pasta al pomodoro' })).toHaveAttribute('href', '/piatti/d-2');
  });

  it('la sottoriga conta gli ingredienti e dice «dalla dieta» solo sui piatti dell\'import', async () => {
    mockRepertorio([PIATTO_COLAZIONE, PIATTO_PRANZO]);
    render(<Piatti />);
    expect(await screen.findByText('2 INGREDIENTI')).toBeInTheDocument();
    expect(screen.getByText('1 INGREDIENTE · DALLA DIETA')).toBeInTheDocument();
    expect(screen.queryByText(/NUTRIZIONISTA|PROPRIO|INGR\./)).not.toBeInTheDocument();
  });

  it('un pallino per area distinta, nell\'ordine dell\'utente', async () => {
    mockRepertorio([PIATTO_COLAZIONE, PIATTO_PRANZO]);
    render(<Piatti />);
    const riga = await screen.findByRole('link', { name: 'Apri Latte e pane' });
    expect(Array.from(riga.querySelectorAll('[data-area]')).map((el) => el.getAttribute('data-area'))).toEqual(['latticini', 'cereali']);
    const altra = screen.getByRole('link', { name: 'Apri Pasta al pomodoro' });
    expect(Array.from(altra.querySelectorAll('[data-area]')).map((el) => el.getAttribute('data-area'))).toEqual(['cereali']);
  });

  it('un piatto di sole alternative conta e colora gli ingredienti delle opzioni', async () => {
    mockRepertorio([PIATTO_ALTERNATIVE]);
    render(<Piatti />);
    const riga = await screen.findByRole('link', { name: 'Apri Merenda' });
    expect(screen.getByText('2 INGREDIENTI · DALLA DIETA')).toBeInTheDocument();
    expect(Array.from(riga.querySelectorAll('[data-area]')).map((el) => el.getAttribute('data-area'))).toEqual(['latticini', 'cereali']);
  });
});

describe('Le due porte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('titolo e sottotitolo della schermata', async () => {
    mockRepertorio([]);
    render(<Piatti />);
    expect(await screen.findByText('Da dove partiamo?')).toBeInTheDocument();
    expect(
      screen.getByText('Dispesa costruisce la lista dai piatti che mangi. Ce li dici una volta sola, in uno di questi due modi.'),
    ).toBeInTheDocument();
  });

  it('la porta della dieta porta a /importa', async () => {
    mockRepertorio([]);
    render(<Piatti />);
    await screen.findByText('Da dove partiamo?');
    expect(screen.getByText('Ho una dieta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'IMPORTA LA DIETA' })).toHaveAttribute('href', '/importa');
  });

  it('la porta di chi cucina sempre le stesse cose porta a /piatti/veloce', async () => {
    mockRepertorio([]);
    render(<Piatti />);
    await screen.findByText('Da dove partiamo?');
    expect(screen.getByText('Cucino sempre le stesse cose')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'SCRIVI I MIEI PIATTI' })).toHaveAttribute('href', '/piatti/veloce');
  });

  it("il link all'editor completo porta a /piatti/nuovo", async () => {
    mockRepertorio([]);
    render(<Piatti />);
    await screen.findByText('Da dove partiamo?');
    expect(screen.getByRole('link', { name: "Crea un piatto dall'editor completo" })).toHaveAttribute('href', '/piatti/nuovo');
  });

  it('il vecchio bottone unico non c\'è più', async () => {
    mockRepertorio([]);
    render(<Piatti />);
    await screen.findByText('Da dove partiamo?');
    expect(screen.queryByText('CREA IL PRIMO PIATTO')).not.toBeInTheDocument();
  });

  it('con il repertorio pieno le porte non compaiono', async () => {
    mockRepertorio([PIATTO_COLAZIONE, PIATTO_PRANZO]);
    render(<Piatti />);
    await screen.findByRole('link', { name: 'Apri Latte e pane' });
    expect(screen.queryByText('Da dove partiamo?')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'IMPORTA LA DIETA' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'SCRIVI I MIEI PIATTI' })).not.toBeInTheDocument();
  });
});
```

Sostituisci **per intero** `src/app/(app)/piatti/__tests__/ricerca.test.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Dish, Ingredient } from '@/domain/types';

vi.mock('@/data/repertorio', () => ({
  leggiRepertorio: vi.fn(),
  leggiIngredienti: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({
  leggiSlotDefs: vi.fn(),
  leggiImpostazioni: vi.fn(),
}));

import { leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiImpostazioni } from '@/data/impostazioni';
import Piatti from '../page';

const ING_UOVA: Ingredient = {
  id: 'i-uova', nome: 'Uova', unitaBase: 'pz', area: 'latticini',
  classeResiduo: 'intero', deperibile: true, formatoConfezione: 6, prezzoConfezione: null, ean: null,
};

const PIATTO_RISO: Dish = {
  id: 'd-1', nome: 'Riso con frittata', slotDefId: 'sd-1', fonte: 'proprio', attivo: true,
  descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-uova', quantita: 2, unita: 'pz' }],
  componenti: [],
};
const PIATTO_PESCE: Dish = {
  id: 'd-2', nome: 'Pesce al forno', slotDefId: 'sd-1', fonte: 'proprio', attivo: true,
  descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [],
  componenti: [],
};

const ORDINE_AREE_TEST = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'] as const;

function mockRepertorio() {
  vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_RISO, PIATTO_PESCE]);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_UOVA]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: [...ORDINE_AREE_TEST],
    settimaneCiclo: 1,
    cicloOrigine: null,
  });
}

function campo() {
  return screen.getByRole('searchbox', { name: 'Cerca un piatto o un ingrediente' });
}

describe('ricerca piatti', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('il campo si chiama come il suo segnaposto', async () => {
    mockRepertorio();
    render(<Piatti />);
    await screen.findByText('Riso con frittata');
    expect(campo()).toHaveAttribute('placeholder', 'Cerca un piatto o un ingrediente');
  });

  it('filtra per nome, accenti e maiuscole ignorati', async () => {
    mockRepertorio();
    render(<Piatti />);
    await screen.findByText('Riso con frittata');
    fireEvent.change(campo(), { target: { value: 'PÉSCE' } });
    await waitFor(() => expect(screen.queryByText('Riso con frittata')).not.toBeInTheDocument());
    expect(screen.getByText('Pesce al forno')).toBeInTheDocument();
  });

  it('trova un piatto per un ingrediente che non è nel nome', async () => {
    mockRepertorio();
    render(<Piatti />);
    await screen.findByText('Riso con frittata');
    fireEvent.change(campo(), { target: { value: 'uova' } });
    await waitFor(() => expect(screen.queryByText('Pesce al forno')).not.toBeInTheDocument());
    expect(screen.getByText('Riso con frittata')).toBeInTheDocument();
  });

  it('senza risultati: il vuoto di ricerca col testo nuovo, e l\'aggiungi resta', async () => {
    mockRepertorio();
    render(<Piatti />);
    await screen.findByText('Riso con frittata');
    fireEvent.change(campo(), { target: { value: 'zzz' } });
    expect(await screen.findByText('Nessun piatto qui')).toBeInTheDocument();
    expect(screen.getByText("Prova un'altra parola, oppure aggiungine uno.")).toBeInTheDocument();
    expect(screen.queryByText(/Cambia filtro/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nuovo piatto' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: i test falliscono**

Run: `npx vitest run "src/app/(app)/piatti/__tests__/page.test.tsx" "src/app/(app)/piatti/__tests__/ricerca.test.tsx"`
Expected: FAIL. `Apri Latte e pane`, `Nuovo piatto`, `2 INGREDIENTI` e il campo
`Cerca un piatto o un ingrediente` non esistono ancora. I test delle porte passano già.

- [ ] **Step 4: il codice**

Crea `src/app/(app)/piatti/ElencoPiatti.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AreaId, Dish, Ingredient } from '@/domain/types';
import { coloreArea } from '@/domain/aree';
import { cercaPiatti, ingredientiDelPiatto } from '@/domain/ricerca-piatti';

interface Props {
  piatti: Dish[];
  ingredienti: Ingredient[];
  ordineAree: AreaId[];
}

/**
 * Il corpo di Piatti a repertorio pieno (spec fase 3 §A–§C): il campo di
 * ricerca fermo in alto, e sotto lo scroller con l'aggiungi tratteggiato in
 * cima, le righe piatto e, se la ricerca non trova niente, il vuoto di
 * ricerca. Niente dati: li carica la pagina. Un file a sé, e non dentro
 * `page.tsx`, perché la sonda del browser lo possa montare con dati finti.
 */
export function ElencoPiatti({ piatti, ingredienti, ordineAree }: Props) {
  const [ricerca, setRicerca] = useState('');
  const areaPerIngrediente = new Map(ingredienti.map((i) => [i.id, i.area]));
  const mostrati = cercaPiatti(piatti, ingredienti, ricerca);

  return (
    <>
      {/* Fuori dallo scroller: resta fermo mentre la lista scorre, e con la
          tastiera aperta si vede cosa si sta scrivendo (spec §A, §M.3). */}
      <div style={{ padding: '8px 16px 10px' }}>
        <div style={{ position: 'relative' }}>
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
            style={{ position: 'absolute', left: 14, top: 13, pointerEvents: 'none' }}
          >
            <circle cx="10.5" cy="10.5" r="6.5" stroke="var(--sec)" strokeWidth="2.1" />
            <path d="m15.5 15.5 5 5" stroke="var(--sec)" strokeWidth="2.1" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca un piatto o un ingrediente"
            aria-label="Cerca un piatto o un ingrediente"
            style={{
              width: '100%', height: 44, padding: '0 14px 0 41px', boxSizing: 'border-box',
              borderRadius: 14, border: '1px solid var(--bordo)', background: 'var(--superficie)',
              boxShadow: 'var(--ombra-pannello)', color: 'var(--ink)', fontSize: 14, outline: 'none',
            }}
          />
        </div>
      </div>

      <div
        className="sc scroll-app"
        style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          padding: '2px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        <Link
          href="/piatti/nuovo"
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            width: '100%', height: 56, boxSizing: 'border-box', borderRadius: 14,
            border: '2px dashed var(--bordo-tratteggio)', background: 'none', textDecoration: 'none',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--ink)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Nuovo piatto
        </Link>

        {mostrati.map((piatto) => (
          <RigaPiatto
            key={piatto.id}
            piatto={piatto}
            aree={areeDelPiatto(piatto, areaPerIngrediente, ordineAree)}
          />
        ))}

        {mostrati.length === 0 && (
          <div style={{ flexShrink: 0, padding: '44px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              Nessun piatto qui
            </div>
            <div style={{ fontSize: 14, color: 'var(--testo-2)' }}>Prova un&apos;altra parola, oppure aggiungine uno.</div>
          </div>
        )}
      </div>
    </>
  );
}

/** Le aree distinte fra gli ingredienti del piatto (fissi e alternative), nell'ordine dell'utente. */
function areeDelPiatto(
  piatto: Dish,
  areaPerIngrediente: Map<string, AreaId>,
  ordineAree: AreaId[],
): AreaId[] {
  const presenti = new Set(
    ingredientiDelPiatto(piatto)
      .map((id) => areaPerIngrediente.get(id))
      .filter((a): a is AreaId => a !== undefined),
  );
  return ordineAree.filter((a) => presenti.has(a));
}

/**
 * La Riga piatto (DESIGN.md §8): un solo bersaglio che apre il piatto, nome su
 * una riga, sottoriga col numero degli ingredienti e `dalla dieta` sui piatti
 * dell'import, pallini d'area, chevron decorativo in una zona da 44.
 */
function RigaPiatto({ piatto, aree }: { piatto: Dish; aree: AreaId[] }) {
  const n = ingredientiDelPiatto(piatto).length;
  const sottoriga = `${n} ${n === 1 ? 'INGREDIENTE' : 'INGREDIENTI'}${piatto.fonte === 'nutrizionista' ? ' · DALLA DIETA' : ''}`;
  return (
    <Link
      href={`/piatti/${piatto.id}`}
      aria-label={`Apri ${piatto.nome}`}
      style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', minHeight: 'var(--riga-piatto)', boxSizing: 'border-box',
        borderRadius: 14, background: 'var(--superficie)', border: '1px solid rgba(20,22,58,0.09)',
        boxShadow: 'var(--ombra-pannello)', textDecoration: 'none', color: 'inherit',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, padding: '12px 8px 12px 14px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span
          style={{
            fontSize: 17, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, color: 'var(--ink)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {piatto.nome}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', color: 'var(--ter)' }}>
          {sottoriga}
        </span>
        {aree.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            {aree.map((a) => (
              <span
                key={a}
                data-area={a}
                style={{ width: 8, height: 8, borderRadius: 2.6, display: 'inline-block', background: coloreArea(a) }}
              />
            ))}
          </div>
        )}
      </div>
      <span aria-hidden="true" style={{ width: 44, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 3.2 10.4 8 6 12.8" stroke="var(--icona-spenta)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}
```

Poi sostituisci **per intero** `src/app/(app)/piatti/page.tsx`:

```tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { AreaId, Dish, Ingredient } from '@/domain/types';
import { leggiIngredienti, leggiRepertorio } from '@/data/repertorio';
import { leggiImpostazioni } from '@/data/impostazioni';
import { Testata } from '@/components/Testata';
import { Porta } from '@/components/Porta';
import { ElencoPiatti } from './ElencoPiatti';

interface Repertorio {
  piatti: Dish[];
  ingredienti: Ingredient[];
  ordineAree: AreaId[];
}

/**
 * Il repertorio: i piatti reali dell'utente in una lista sola (spec fase 3
 * §A). Niente filtro per pasto: un piatto non appartiene a un pasto, ci va a
 * finire quando lo metti nel piano. Questa pagina carica i dati e sceglie fra
 * errore, stato vuoto ed elenco; l'elenco sta in `ElencoPiatti.tsx`.
 */
export default function Piatti() {
  const [repertorio, setRepertorio] = useState<Repertorio | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([leggiRepertorio(), leggiIngredienti(), leggiImpostazioni()])
      .then(([piatti, ingredienti, impostazioni]) => {
        if (vivo) setRepertorio({ piatti, ingredienti, ordineAree: impostazioni.ordineAree });
      })
      .catch((errore) => {
        console.error('piatti: caricamento del repertorio fallito.', errore);
        if (vivo) setErrore('Non riusciamo a caricare i piatti. Riprova più tardi.');
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (errore) {
    return (
      <Cornice>
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>{errore}</p>
      </Cornice>
    );
  }

  if (!repertorio) {
    // Nessuno stato di caricamento è nell'artboard: la testata basta finché i dati non arrivano.
    return <Cornice />;
  }

  if (repertorio.piatti.length === 0) {
    return <VuotoPiatti />;
  }

  return (
    <Cornice>
      <ElencoPiatti piatti={repertorio.piatti} ingredienti={repertorio.ingredienti} ordineAree={repertorio.ordineAree} />
    </Cornice>
  );
}
```

…e sotto, **senza cambiarli**, la `function Cornice` di oggi e la `function VuotoPiatti` con il
suo commento, così come le ha lasciate il Task 3. Il colore dell'errore di caricamento resta
`--sec`, come oggi: non è in §I né in §A, e questo task non lo tocca.

Via da `page.tsx`, perché non servono più:
- `normalizza` locale e `FONTE_LABEL`;
- la costante `TUTTI`;
- `SchedaPiatto`, `PropsScheda` e `areeDelPiatto`;
- gli import di `Segmento`, `coloreArea`, `leggiSlotDefs` e `MealSlotDef`.

- [ ] **Step 5: i test passano**

Run: `npx vitest run "src/app/(app)/piatti"`
Expected: PASS, compresi `vista.test.tsx`, che riguarda il dettaglio e non cambia, e i due file
riscritti.

- [ ] **Step 6: suite, tipi, lint**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: tutto verde.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/piatti/ElencoPiatti.tsx" "src/app/(app)/piatti/page.tsx" "src/app/(app)/piatti/__tests__/page.test.tsx" "src/app/(app)/piatti/__tests__/ricerca.test.tsx"
git commit -m "feat: Piatti diventa una lista unica di righe

Via il filtro per pasto e la pillola del pasto. L'aggiungi tratteggiato sta in cima, ogni
piatto è una Riga piatto con un solo bersaglio, la sottoriga conta gli ingredienti e dice
«dalla dieta» sui piatti dell'import, la ricerca guarda anche negli ingredienti.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: la prova del gesto indietro

**Il rischio di spec §G, verificato prima di costruirci sopra.** Nessun codice di produzione.

**Files:**
- Create, temporaneo, **da cancellare e non committare**: `src/app/auth/prova-indietro/page.tsx`

- [ ] **Step 1: la sonda**

```tsx
'use client';

import { useEffect, useState } from 'react';

// Contatore di modulo: sopravvive ai rimontaggi del componente, non a un ricaricamento.
let montaggi = 0;

/** Sonda usa-e-getta (piano fase 3, Task 5): pushState sullo stesso URL, poi indietro. */
export default function ProvaIndietro() {
  const [aperta, setAperta] = useState(false);
  const [fogli, setFogli] = useState(0);

  useEffect(() => {
    montaggi += 1;
    (window as unknown as { __montaggi: number }).__montaggi = montaggi;
    const chiudi = () => setAperta(false);
    window.addEventListener('popstate', chiudi);
    return () => window.removeEventListener('popstate', chiudi);
  }, []);

  return (
    <main style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p data-testid="stato">{aperta ? 'APERTA' : 'CHIUSA'} · fogli {fogli}</p>
      <button type="button" onClick={() => { window.history.pushState(null, ''); setAperta(true); }}>apri</button>
      <button type="button" onClick={() => setFogli((n) => n + 1)}>scatta</button>
      <button type="button" onClick={() => window.history.back()}>indietro</button>
    </main>
  );
}
```

- [ ] **Step 2: il server**

Run, dal worktree e in background: `npm run dev -- -p 3002`. Non usare `sleep` in primo piano:
aspetta che risponda con un ciclo `until curl -s localhost:3002 > /dev/null; do …`, oppure con
un'esecuzione in background.

- [ ] **Step 3: le prove**

Apri `http://localhost:3002/auth/prova-indietro` e, dalla console o con lo strumento di
esecuzione JavaScript del browser:

1. `window.__marcatore = 'vivo'`; annota `window.__montaggi` (M0), `history.length` (L0) e
   `location.href`.
2. Premi `apri` e poi due volte `scatta`. Atteso: `APERTA · fogli 2`, `history.length === L0 + 1`,
   URL invariato.
3. Premi `indietro`, cioè `history.back()`. Atteso:
   - `CHIUSA · fogli 2`;
   - `window.__marcatore === 'vivo'`, quindi nessun ricaricamento;
   - `window.__montaggi === M0`, quindi nessun rimontaggio;
   - URL invariato.
4. Premi di nuovo `apri`, e poi usa il **tasto indietro del browser**, `navigate back` dello
   strumento, al posto del bottone. Atteso: lo stesso del punto 3.
5. Premi `apri`, poi `indietro`, poi ancora il tasto indietro del browser. Atteso: si esce dalla
   pagina, verso quella da cui eri arrivato o verso `about:blank`. Serve a verificare che la
   voce sia stata consumata e che non ne resti una orfana.

In sviluppo React monta due volte gli effect (Strict Mode), quindi M0 può valere 2: conta che
**non cresca**, non il suo valore.

- [ ] **Step 4: cancella la sonda**

Run: `rm -r src/app/auth/prova-indietro` e poi `rm -rf .next/dev`. Con `git status` verifica che
non resti niente. Ferma il server.

- [ ] **Step 5: il rapporto e la decisione**

Scrivi i valori veri dei cinque punti, etichettati `[misurato]`.

- **Se i punti 3 e 4 passano**, il Task 7 procede come scritto.
- **Se uno dei due fallisce**, cioè la pagina si ricarica, si rimonta o cambia URL, **fermati**:
  il Task 7 non parte. La spec §G prevede di ripiegare su un parametro `?fotocamera`, ma quella
  scelta la prende Andrea.

Questo task non ha commit.

---

### Task 6: la fotocamera a tutto schermo e «Rivedi i fogli presi»

**Files:**
- Create: `src/app/(app)/importa/FogliPresi.tsx`
- Create: `src/app/(app)/importa/__tests__/fogli-presi.test.tsx`
- Modify: `src/app/(app)/importa/Camera.tsx`, che resta com'è nella logica e cambia forma e props
- Modify: `src/app/globals.css`, con le classi `.scatto`, `.scatto-disco` e `.guida-angolo`
- Test: `src/app/(app)/importa/__tests__/camera.test.tsx`, riscritto come allo Step 2

**Interfaces:**
- Consuma dal Task 3 `useNascondiBarra`; dal Task 1 i token `--scatto-anello`,
  `--scatto-disco`, `--moto-scatto`, `--banda-fondo`, `--banda-bordo` e `--overlay-foglio`.
- Produce:
  - `Camera({ onFoto: (foto: Blob[]) => void; iniziali?: Blob[]; onIndietro: () => void; onFinito: () => void })`,
    che usano il Task 7 e la sonda del Task 8;
  - `FogliPresi({ pagine: { url: string }[]; onSposta: (indice: number, delta: -1 | 1) => void; onTogli: (indice: number) => void; onChiudi: () => void })`.

**Da conservare parola per parola in `Camera.tsx`:**
- `ricomprimi`, `scattaDaVideo`, `ricomprimiFile`, `LATO_MAX`, `MAX_PAGINE`;
- `scegliFile`, con i testi degli avvisi;
- `applicaPagine`, `pagineRef` e il suo effetto;
- l'effect di `getUserMedia` con il microtask del ramo `fallback`;
- gli effect che fermano le tracce e revocano gli URL;
- tutti i commenti che spiegano i bug del 30/08 e l'hydration.

La review di questo task confronta queste parti col file di oggi riga per riga.

- [ ] **Step 1: i test di `FogliPresi`, che falliscono**

`src/app/(app)/importa/__tests__/fogli-presi.test.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FogliPresi } from '../FogliPresi';

const TRE = [{ url: 'blob:1' }, { url: 'blob:2' }, { url: 'blob:3' }];

function monta(pagine = TRE) {
  const onSposta = vi.fn();
  const onTogli = vi.fn();
  const onChiudi = vi.fn();
  render(<FogliPresi pagine={pagine} onSposta={onSposta} onTogli={onTogli} onChiudi={onChiudi} />);
  return { onSposta, onTogli, onChiudi };
}

describe('FogliPresi', () => {
  it('è un dialogo col suo nome, e il fuoco ci va dentro all\'apertura', () => {
    monta();
    const dialogo = screen.getByRole('dialog', { name: 'Rivedi i fogli presi' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveFocus();
  });

  it('una riga per foglio, con la foto e il numero, nell\'ordine dato', () => {
    monta();
    const foto = screen.getAllByRole('img');
    expect(foto.map((f) => f.getAttribute('alt'))).toEqual(['Foglio 1', 'Foglio 2', 'Foglio 3']);
    expect(foto.map((f) => f.getAttribute('src'))).toEqual(['blob:1', 'blob:2', 'blob:3']);
  });

  it('l\'intestazione dice quanti sono e che l\'ordine conta; al singolare solo il numero', () => {
    monta();
    expect(screen.getByText("3 fogli · l'app li legge in quest'ordine")).toBeInTheDocument();
  });

  it('con un foglio l\'intestazione è al singolare', () => {
    monta([{ url: 'blob:1' }]);
    expect(screen.getByText('1 foglio')).toBeInTheDocument();
  });

  it('su è spento sul primo, giù è spento sull\'ultimo', () => {
    monta();
    expect(screen.getByRole('button', { name: 'Sposta il foglio 1 più su' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sposta il foglio 1 più giù' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Sposta il foglio 3 più giù' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sposta il foglio 3 più su' })).toBeEnabled();
  });

  it('i tasti chiamano i callback con indice e verso giusti', () => {
    const { onSposta, onTogli } = monta();
    fireEvent.click(screen.getByRole('button', { name: 'Sposta il foglio 2 più su' }));
    expect(onSposta).toHaveBeenLastCalledWith(1, -1);
    fireEvent.click(screen.getByRole('button', { name: 'Sposta il foglio 2 più giù' }));
    expect(onSposta).toHaveBeenLastCalledWith(1, 1);
    fireEvent.click(screen.getByRole('button', { name: 'Togli il foglio 3' }));
    expect(onTogli).toHaveBeenLastCalledWith(2);
  });

  it('Chiudi, il velo ed Esc chiudono; un tocco dentro il foglio no', () => {
    const { onChiudi } = monta();
    const dialogo = screen.getByRole('dialog', { name: 'Rivedi i fogli presi' });
    fireEvent.click(within(dialogo).getByText("3 fogli · l'app li legge in quest'ordine"));
    expect(onChiudi).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(onChiudi).toHaveBeenCalledTimes(1);
    fireEvent.click(dialogo.parentElement!);
    expect(onChiudi).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(dialogo, { key: 'Escape' });
    expect(onChiudi).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: i test di `Camera`, riscritti, che falliscono**

Sostituisci **per intero** `src/app/(app)/importa/__tests__/camera.test.tsx`. I test di logica
di oggi restano, con le stesse asserzioni: ricompressione, 1568, illeggibili, tetto, niente
setState durante il render, revoca, `iniziali`, tracce. Cambiano solo i nomi con cui si trovano
le cose.

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Camera } from '../Camera';

/**
 * jsdom non decodifica immagini né produce blob da canvas: si mockano
 * `createImageBitmap` (decodifica), `getContext` (disegno) e `toBlob`
 * (ricompressione jpeg). Ogni file scelto — o scatto — diventa così un blob
 * jpeg finto, distinto dal File originale: è il percorso che nel browser vero
 * ridimensiona e ricomprime anche le foto di galleria (3–5 MB, HEIC su iPhone).
 */
function mockaDecodifica() {
  const contesto = { drawImage: vi.fn() };
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 3000, height: 4000, close: vi.fn() })));
  // Il ripiego `<img>` (browser senza `createImageBitmap`, o formato che la
  // bitmap non decodifica) in jsdom non emetterebbe mai `load` né `error`:
  // qui fallisce subito, come fa un browser vero con un file illeggibile.
  vi.stubGlobal(
    'Image',
    class {
      onerror: (() => void) | null = null;
      set src(_v: string) {
        queueMicrotask(() => this.onerror?.());
      }
    },
  );
  HTMLCanvasElement.prototype.getContext = vi.fn(() => contesto) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toBlob = vi.fn(function (this: HTMLCanvasElement, cb: BlobCallback) {
    cb(new Blob(['jpeg'], { type: 'image/jpeg' }));
  });
  return contesto;
}

function fileFinti(n: number): File[] {
  return Array.from({ length: n }, (_, i) => new File([String(i)], `p${i + 1}.jpg`, { type: 'image/jpeg' }));
}

function abilitaFotocamera() {
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    configurable: true,
  });
  return { stop };
}

/** Le props obbligatorie che i test di sola logica non guardano. */
const NIENTE = { onIndietro: () => {}, onFinito: () => {} };

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // jsdom non ha mediaDevices: di default siamo nel ramo fallback.
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  // jsdom non implementa gli object URL. Uno diverso per chiamata: le righe di
  // «Rivedi» usano l'URL come chiave, e con URL uguali lo spostamento non si
  // vedrebbe nel DOM.
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:finto-${++n}`);
  URL.revokeObjectURL = vi.fn();
  mockaDecodifica();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Camera: la galleria e il ripiego', () => {
  it('senza getUserMedia: il testo del ripiego, niente scatto, la galleria c\'è', async () => {
    render(<Camera onFoto={() => {}} {...NIENTE} />);
    expect(await screen.findByText('La fotocamera non è disponibile: scegli le foto dei fogli dalla galleria')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scatta la foto del foglio' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/scegli le foto/i)).toBeInTheDocument();
  });

  it('la galleria è il tasto «Seleziona dalla galleria», con l\'input nascosto dentro', async () => {
    render(<Camera onFoto={() => {}} {...NIENTE} />);
    expect(await screen.findByText('Seleziona dalla galleria')).toBeInTheDocument();
    expect(screen.getByLabelText(/scegli le foto/i)).toHaveStyle({ opacity: '0' });
  });

  it('la galleria apre la galleria: nessun attributo capture (riaprirebbe la fotocamera di sistema)', async () => {
    render(<Camera onFoto={() => {}} {...NIENTE} />);
    const input = await screen.findByLabelText(/scegli le foto dalla galleria/i);
    expect(input).not.toHaveAttribute('capture');
    expect(input).toHaveAttribute('multiple');
    expect(input).toHaveAttribute('accept', 'image/*');
  });

  it('le foto scelte vengono ricompresse, arrivano a onFoto e il contatore le conta', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} {...NIENTE} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    const [f1, f2] = fileFinti(2);
    fireEvent.change(input, { target: { files: [f1, f2] } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    const blob = onFoto.mock.lastCall![0] as Blob[];
    expect(blob).toHaveLength(2);
    // Non i File originali: i blob jpeg usciti dal canvas.
    expect(blob[0]).not.toBe(f1);
    expect(blob[1]).not.toBe(f2);
    expect(blob.every((b) => b.type === 'image/jpeg')).toBe(true);
    expect(screen.getByText('2 fogli')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rivedi i 2 fogli presi' })).toBeInTheDocument();
  });

  it('la ricompressione ridimensiona al lato lungo di 1568px, come lo scatto', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} {...NIENTE} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(1) } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    const toBlob = vi.mocked(HTMLCanvasElement.prototype.toBlob);
    const canvas = toBlob.mock.contexts[0] as HTMLCanvasElement;
    // 3000×4000 → lato lungo 1568 → 1176×1568.
    expect(canvas.width).toBe(1176);
    expect(canvas.height).toBe(1568);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.75);
  });

  it('un file che non si decodifica è scartato con un messaggio, gli altri passano', async () => {
    const onFoto = vi.fn();
    vi.mocked(globalThis.createImageBitmap)
      .mockRejectedValueOnce(new Error('formato sconosciuto'))
      .mockResolvedValueOnce({ width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap);
    render(<Camera onFoto={onFoto} {...NIENTE} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    const rotto = new File(['x'], 'p1.heic', { type: 'image/heic' });
    const [buono] = fileFinti(1);
    fireEvent.change(input, { target: { files: [rotto, buono] } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    expect(onFoto.mock.lastCall![0]).toHaveLength(1);
    expect(screen.getByText('1 foglio')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/1 foto non leggibile/i);
  });

  it('oltre le 12 pagine le foto in più sono scartate con un messaggio', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} {...NIENTE} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(14) } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    expect(onFoto.mock.lastCall![0]).toHaveLength(12);
    expect(screen.getByText('12 fogli')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/al massimo 12 fogli/i);
  });

  it('il tetto conta anche le pagine già presenti', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} iniziali={fileFinti(11)} {...NIENTE} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(3) } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    expect(onFoto.mock.lastCall![0]).toHaveLength(12);
    expect(screen.getByRole('status')).toHaveTextContent(/al massimo 12 fogli/i);
  });

  it('la scelta dei file non aggiorna il genitore durante il render (E2E 30/08: miniature visibili ma ESTRAI spento)', async () => {
    // Regressione: onFoto chiamato dentro l'updater di setPagine è un
    // setState-during-render del genitore — React lo segnala con "Cannot
    // update a component" e l'aggiornamento del genitore può andare perso.
    // NOTA: in jsdom il warning del codice pre-fix non si riproduce (visto
    // solo nel browser vero, E2E 30/08); questo test è una guardia, la
    // prova del fix è la verifica manuale nel browser.
    const errori: string[] = [];
    const spia = vi.spyOn(console, 'error').mockImplementation((...args) => {
      errori.push(args.map(String).join(' '));
    });
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} {...NIENTE} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(1) } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    expect(onFoto.mock.lastCall![0]).toHaveLength(1);
    spia.mockRestore();
    expect(errori.filter((m) => m.includes('Cannot update a component'))).toEqual([]);
  });

  it('smontare con pagine ancora in lista revoca tutti gli object URL residui', async () => {
    const onFoto = vi.fn();
    const { unmount } = render(<Camera onFoto={onFoto} {...NIENTE} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(2) } });
    await screen.findByText('2 fogli');
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('con iniziali conta i fogli già presenti senza richiamare onFoto, e non inventa un\'ora', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} iniziali={fileFinti(2)} {...NIENTE} />);
    expect(await screen.findByRole('button', { name: 'Rivedi i 2 fogli presi' })).toBeInTheDocument();
    expect(onFoto).not.toHaveBeenCalled();
    expect(screen.queryByText(/Ultimo foglio alle/)).not.toBeInTheDocument();
  });
});

describe('Camera: la banda', () => {
  it('a zero fogli niente miniatura, niente «Ho finito», niente ultimo foglio', async () => {
    render(<Camera onFoto={() => {}} {...NIENTE} />);
    await screen.findByText('Seleziona dalla galleria');
    expect(screen.queryByRole('button', { name: /Rivedi/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ho finito' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Ultimo foglio alle/)).not.toBeInTheDocument();
  });

  it('con un foglio: la miniatura al singolare, «Ho finito» chiama onFinito', async () => {
    const onFinito = vi.fn();
    render(<Camera onFoto={() => {}} iniziali={fileFinti(1)} onIndietro={() => {}} onFinito={onFinito} />);
    expect(await screen.findByRole('button', { name: 'Rivedi il foglio preso' })).toBeInTheDocument();
    expect(screen.getByText('1 foglio')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ho finito' }));
    expect(onFinito).toHaveBeenCalledTimes(1);
  });

  it('il tondo indietro chiama onIndietro, e il titolo è l\'intestazione della schermata', async () => {
    const onIndietro = vi.fn();
    render(<Camera onFoto={() => {}} onIndietro={onIndietro} onFinito={() => {}} />);
    expect(await screen.findByRole('heading', { name: 'Fotografa il piano' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));
    expect(onIndietro).toHaveBeenCalledTimes(1);
  });

  it('con getUserMedia: lo scatto c\'è, e smontando le tracce si fermano', async () => {
    const { stop } = abilitaFotocamera();
    const { unmount } = render(<Camera onFoto={() => {}} {...NIENTE} />);
    expect(await screen.findByRole('button', { name: 'Scatta la foto del foglio' })).toBeInTheDocument();
    unmount();
    expect(stop).toHaveBeenCalled();
  });

  it('lo scatto aggiunge un foglio e scrive l\'ora dello scatto', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 23, 18, 4));
    abilitaFotocamera();
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} {...NIENTE} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Scatta la foto del foglio' }));
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    expect(onFoto.mock.lastCall![0]).toHaveLength(1);
    expect(screen.getByText('Ultimo foglio alle 18:04')).toBeInTheDocument();
  });

  it('anche con la fotocamera aperta c\'è la galleria, senza capture, sullo stesso percorso', async () => {
    abilitaFotocamera();
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} {...NIENTE} />);
    await screen.findByRole('button', { name: 'Scatta la foto del foglio' });
    const input = screen.getByLabelText(/scegli le foto dalla galleria/i);
    expect(input).not.toHaveAttribute('capture');
    expect(input).toHaveAttribute('multiple');
    fireEvent.change(input, { target: { files: fileFinti(2) } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    const blob = onFoto.mock.lastCall![0] as Blob[];
    expect(blob).toHaveLength(2);
    expect(blob.every((b) => b.type === 'image/jpeg')).toBe(true);
  });
});

describe('Camera: «Rivedi i fogli presi»', () => {
  async function apriRivedi(onFoto = vi.fn()) {
    render(<Camera onFoto={onFoto} {...NIENTE} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: fileFinti(2) } });
    await waitFor(() => expect(onFoto).toHaveBeenCalled());
    const [prima, seconda] = onFoto.mock.lastCall![0] as Blob[];
    fireEvent.click(screen.getByRole('button', { name: 'Rivedi i 2 fogli presi' }));
    screen.getByRole('dialog', { name: 'Rivedi i fogli presi' });
    return { onFoto, prima, seconda };
  }

  it('togliere un foglio aggiorna il genitore e la numerazione', async () => {
    const { onFoto, seconda } = await apriRivedi();
    fireEvent.click(screen.getByRole('button', { name: 'Togli il foglio 1' }));
    await waitFor(() => expect(onFoto).toHaveBeenLastCalledWith([seconda]));
    expect(screen.getAllByRole('img').map((f) => f.getAttribute('alt'))).toEqual(['Foglio 1']);
  });

  it('spostare un foglio cambia l\'ordine che arriva al genitore', async () => {
    const { onFoto, prima, seconda } = await apriRivedi();
    fireEvent.click(screen.getByRole('button', { name: 'Sposta il foglio 1 più giù' }));
    await waitFor(() => expect(onFoto).toHaveBeenLastCalledWith([seconda, prima]));
  });

  it('togliere l\'ultimo foglio chiude «Rivedi» e toglie la miniatura', async () => {
    await apriRivedi();
    fireEvent.click(screen.getByRole('button', { name: 'Togli il foglio 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Togli il foglio 1' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Rivedi/ })).not.toBeInTheDocument();
  });

  it('Chiudi riporta il fuoco sulla miniatura', async () => {
    await apriRivedi();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rivedi i 2 fogli presi' })).toHaveFocus();
  });
});
```

Sul test `lo scatto aggiunge un foglio`: in jsdom il `<video>` ha `videoWidth` 0, quindi il
canvas esce 0 × 0 e `toBlob`, che è finto, produce comunque il blob. Se `scatta` esce prima
perché `videoRef.current` è `null`, il test è sbagliato e non il codice: verifica che il
`<video>` sia montato in modo `camera`, e scrivi nel rapporto cosa hai trovato.

- [ ] **Step 3: i test falliscono**

Run: `npx vitest run "src/app/(app)/importa/__tests__/camera.test.tsx" "src/app/(app)/importa/__tests__/fogli-presi.test.tsx"`
Expected: FAIL. `FogliPresi` non esiste; `Seleziona dalla galleria`, `2 fogli` e
`Scatta la foto del foglio` non esistono ancora.

- [ ] **Step 4: `FogliPresi.tsx`**

```tsx
'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

interface Props {
  pagine: { url: string }[];
  onSposta: (indice: number, delta: -1 | 1) => void;
  onTogli: (indice: number) => void;
  onChiudi: () => void;
}

const stileTasto: CSSProperties = {
  width: 44, height: 44, flex: 'none', borderRadius: 999, border: 0, padding: 0,
  background: 'rgba(20,22,58,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const SU = 'M10 15V5M5 10l5-5 5 5';
const GIU = 'M10 5v10M5 10l5 5 5-5';
const VIA = 'M5 5l10 10M15 5 5 15';

function Icona({ d, spenta }: { d: string; spenta: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={d} stroke={spenta ? 'var(--icona-spenta)' : 'var(--ink)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * «Rivedi i fogli presi» (DESIGN.md §8 Striscia dei fogli presi, spec fase 3
 * §F): un foglio dal basso con le pagine in colonna, nell'ordine in cui
 * l'estrazione le legge. Per ogni pagina la foto vera — senza, spostare i
 * fogli sarebbe spostare delle etichette — e tre tasti: su, giù, togli.
 * Togliere non chiede conferma (DESIGN.md §9): il foglio si rifà con uno scatto.
 *
 * Sta dentro la radice della fotocamera, non in un portale: il velo copre
 * anteprima e banda, e lo stream resta acceso per tornare subito a scattare.
 */
export function FogliPresi({ pagine, onSposta, onTogli, onChiudi }: Props) {
  const foglio = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    foglio.current?.focus();
  }, []);

  const n = pagine.length;
  return (
    <div
      onClick={onChiudi}
      style={{
        position: 'absolute', inset: 0, zIndex: 4, background: 'var(--overlay-foglio)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <div
        ref={foglio}
        role="dialog"
        aria-modal="true"
        aria-label="Rivedi i fogli presi"
        tabIndex={-1}
        className="anim-foglio"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onChiudi();
        }}
        style={{
          background: 'var(--superficie)', borderRadius: '22px 22px 0 0', padding: '16px 16px 26px',
          display: 'flex', flexDirection: 'column', gap: 9, maxHeight: 'calc(100% - 88px)',
          boxSizing: 'border-box', outline: 'none',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.13em',
            textTransform: 'uppercase', color: 'var(--testo-2)', padding: '2px 4px 4px',
          }}
        >
          {n === 1 ? '1 foglio' : `${n} fogli · l'app li legge in quest'ordine`}
        </div>

        <ol
          style={{
            listStyle: 'none', margin: 0, padding: 0, flex: 1, minHeight: 0, overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          {pagine.map((p, i) => {
            const numero = i + 1;
            const primo = i === 0;
            const ultimo = i === n - 1;
            return (
              <li key={p.url} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- foto da object URL locale, non da fonte remota ottimizzabile */}
                <img
                  src={p.url}
                  alt={`Foglio ${numero}`}
                  style={{
                    width: 62, height: 80, flex: 'none', objectFit: 'cover', borderRadius: 14,
                    border: '1px solid rgba(20,22,58,0.09)', boxSizing: 'border-box',
                  }}
                />
                <span aria-hidden="true" style={{ flex: 1, minWidth: 0, fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>
                  {`Foglio ${numero}`}
                </span>
                <span style={{ display: 'flex', gap: 4 }}>
                  <button type="button" aria-label={`Sposta il foglio ${numero} più su`} disabled={primo} onClick={() => onSposta(i, -1)} style={stileTasto}>
                    <Icona d={SU} spenta={primo} />
                  </button>
                  <button type="button" aria-label={`Sposta il foglio ${numero} più giù`} disabled={ultimo} onClick={() => onSposta(i, 1)} style={stileTasto}>
                    <Icona d={GIU} spenta={ultimo} />
                  </button>
                  <button type="button" aria-label={`Togli il foglio ${numero}`} onClick={() => onTogli(i)} style={stileTasto}>
                    <Icona d={VIA} spenta={false} />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          onClick={onChiudi}
          style={{
            width: '100%', minHeight: 50, borderRadius: 14, border: 0, background: 'rgba(20,22,58,0.04)',
            fontSize: 15.5, fontWeight: 700, color: 'var(--ink)',
          }}
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: le classi in `globals.css`**

Dopo il blocco `.porta-azione { … }` del Task 3, aggiungi:

```css
/* ---------- fotocamera (spec fase 3 §E, DESIGN.md §8 Tasto di scatto) ---------- */
.scatto {
  width: var(--scatto-anello); height: var(--scatto-anello); flex: none;
  border: 2px solid #FFFFFF; border-radius: 999px; background: none; padding: 0;
  display: flex; align-items: center; justify-content: center;
}
.scatto-disco { width: var(--scatto-disco); height: var(--scatto-disco); border-radius: 999px; background: #FFFFFF; }
.scatto:focus-visible { outline: 2px solid #FFFFFF; outline-offset: 4px; }
/* La pressione esiste solo con il movimento permesso: con reduced-motion lo
   scatto resta fermo, niente transizione e niente scala (DESIGN.md §8). */
@media (prefers-reduced-motion: no-preference) {
  .scatto, .scatto-disco { transition: transform var(--moto-scatto) var(--curva-barra); }
  .scatto:active { transform: scale(.96); }
  .scatto:active .scatto-disco { transform: scale(.88); }
}

/* La cornice guida: quattro angoli a tratto 3 bianco al 92% (DESIGN.md §2.5, §8 Banda). */
.guida-angolo { position: absolute; width: 30px; height: 30px; border: 3px solid rgba(255, 255, 255, 0.92); }
.guida-angolo.alto-sx { top: 0; left: 0; border-right: 0; border-bottom: 0; border-radius: 14px 0 0 0; }
.guida-angolo.alto-dx { top: 0; right: 0; border-left: 0; border-bottom: 0; border-radius: 0 14px 0 0; }
.guida-angolo.basso-sx { bottom: 0; left: 0; border-right: 0; border-top: 0; border-radius: 0 0 0 14px; }
.guida-angolo.basso-dx { bottom: 0; right: 0; border-left: 0; border-top: 0; border-radius: 0 0 14px 0; }
```

- [ ] **Step 6: `Camera.tsx`**

Le modifiche, nell'ordine del file.

**6a. Import e props.** In cima:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useNascondiBarra } from '@/components/barra-context';
import { FogliPresi } from './FogliPresi';

interface Props {
  onFoto: (foto: Blob[]) => void;
  /** (il commento di oggi su `iniziali`, invariato) */
  iniziali?: Blob[];
  /** Il tondo indietro: torna alla scelta fra foto e PDF. */
  onIndietro: () => void;
  /** `Ho finito`: avvia l'estrazione dei fogli presi. */
  onFinito: () => void;
}

interface Pagina {
  blob: Blob;
  url: string;
  /**
   * Quando è entrata, per «Ultimo foglio alle HH:MM». `null` per le pagine
   * seminate da `iniziali`: di quelle l'ora non si sa, e non si inventa.
   */
  alle: Date | null;
}
```

**6b.** Sotto `LATO_MAX` e `MAX_PAGINE`, lasciati invariati, aggiungi:

```tsx
/** `18:04`: ora locale a due cifre, come la legge chi ha appena scattato. */
function oraMinuti(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const ANGOLI = ['alto-sx', 'alto-dx', 'basso-sx', 'basso-dx'] as const;
```

**6c.** Il commento JSDoc di `Camera`. Sostituisci il primo paragrafo, quello che descrive
il componente, con questo; il paragrafo su `onFoto` e il 30/08 resta com'è:

```
 * La fotocamera dell'import, a tutto schermo (spec fase 3 §E): anteprima
 * piena, cornice guida, in alto il tondo indietro e il titolo, in basso la
 * Banda dei comandi con lo scatto, i fogli presi, `Ho finito` e la galleria.
 * Chiede al Guscio di togliere la tab bar finché è montata. Se
 * `getUserMedia` non esiste o viene rifiutato, ripiega: niente anteprima né
 * scatto, un testo al centro e la galleria nella banda. Scatti e foto scelte
 * passano dallo stesso percorso (`ricomprimi`: lato lungo 1568px, jpeg 0.75)
 * e dallo stesso tetto di 12 pagine (`MAX_PAGINE`); un file che non si
 * decodifica è scartato con un avviso. L'input della galleria non ha
 * `capture`: sul telefono riaprirebbe la fotocamera di sistema.
```

**6d.** Dentro `Camera`:
- la firma diventa `export function Camera({ onFoto, iniziali = [], onIndietro, onFinito }: Props)`;
- subito dopo, come prima riga del corpo:

```tsx
  // A tutto schermo: la tab bar esce dal DOM finché la fotocamera è montata (spec §G).
  useNascondiBarra(true);
```

- il lazy initializer diventa `iniziali.map((blob) => ({ blob, url: URL.createObjectURL(blob), alle: null }))`;
- nuovi stato e ref, dopo `videoRef`:

```tsx
  const [rivedi, setRivedi] = useState(false);
  const miniaturaRef = useRef<HTMLButtonElement | null>(null);
  const scattoRef = useRef<HTMLButtonElement | null>(null);
  const galleriaRef = useRef<HTMLInputElement | null>(null);
```

- `aggiungiBlob` diventa:

```tsx
  function aggiungiBlob(blob: Blob) {
    applicaPagine([...pagineRef.current, { blob, url: URL.createObjectURL(blob), alle: new Date() }]);
  }
```

- in `scegliFile`, l'ultima `applicaPagine` diventa:

```tsx
    const alle = new Date();
    applicaPagine([
      ...pagineRef.current,
      ...blob.map((b) => ({ blob: b, url: URL.createObjectURL(b), alle })),
    ]);
```

- dopo `sposta`, aggiungi:

```tsx
  /**
   * «Togli» da «Rivedi»: se era l'ultimo foglio non resta niente da rivedere,
   * il foglio si chiude e il fuoco va allo scatto (alla galleria, nel ripiego).
   */
  function togli(indice: number) {
    elimina(indice);
    if (pagineRef.current.length === 0) {
      setRivedi(false);
      (scattoRef.current ?? galleriaRef.current)?.focus();
    }
  }

  function chiudiRivedi() {
    setRivedi(false);
    miniaturaRef.current?.focus();
  }
```

- **via** il ramo `if (modo === 'rilevamento') return <div style={{ minHeight: 160 }} />;`, con
  il suo commento. Adesso il guscio della fotocamera è identico fra server e client in ogni
  modo: in `rilevamento` mancano solo anteprima, cornice e scatto, e nessun ramo legge
  `navigator` durante il render. Scrivi questo al posto del commento cancellato, nel punto
  dove si decide cosa rendere.
- **via** `tastoGalleria` e tutto il `return` di oggi. Il nuovo `return`:

```tsx
  const n = pagine.length;
  const ultima = n > 0 ? pagine[n - 1] : null;

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', background: '#000' }}>
      {modo === 'camera' && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {modo === 'fallback' && (
        <div
          style={{
            position: 'absolute', inset: '88px 24px 268px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, maxWidth: '30ch', fontSize: 14, lineHeight: 1.5, color: '#FFFFFF' }}>
            La fotocamera non è disponibile: scegli le foto dei fogli dalla galleria
          </p>
        </div>
      )}

      {/* La cornice guida aiuta a inquadrare, non ritaglia: lo scatto prende il
          fotogramma intero del video (spec §E). */}
      {modo === 'camera' && (
        <div aria-hidden="true" style={{ position: 'absolute', inset: '88px 40px 268px', pointerEvents: 'none', zIndex: 1 }}>
          {ANGOLI.map((a) => <span key={a} className={`guida-angolo ${a}`} />)}
        </div>
      )}

      <div style={{ position: 'absolute', top: 22, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 8, zIndex: 3 }}>
        <button
          type="button"
          aria-label="Indietro"
          onClick={onIndietro}
          style={{
            width: 44, height: 44, flex: 'none', border: 0, borderRadius: 999, padding: 0,
            background: '#FFFFFF', boxShadow: 'var(--ombra-nav)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <h1
          style={{
            margin: 0, height: 44, display: 'flex', alignItems: 'center', padding: '0 16px',
            borderRadius: 999, background: '#FFFFFF', boxShadow: 'var(--ombra-nav)',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--ink)', whiteSpace: 'nowrap',
          }}
        >
          Fotografa il piano
        </h1>
      </div>

      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2,
          background: 'var(--banda-fondo)', borderRadius: '22px 22px 0 0',
          padding: '20px 16px 26px', display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
            {n > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  ref={miniaturaRef}
                  type="button"
                  aria-label={n === 1 ? 'Rivedi il foglio preso' : `Rivedi i ${n} fogli presi`}
                  onClick={() => setRivedi(true)}
                  style={{
                    position: 'relative', width: 44, height: 44, flex: 'none', border: 0, padding: 0,
                    borderRadius: 14, background: '#FFFFFF', boxShadow: 'var(--ombra-nav)', overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute', inset: 7,
                      backgroundImage: 'repeating-linear-gradient(180deg, rgba(20,22,58,0.14) 0 2px, rgba(20,22,58,0) 2px 7px)',
                    }}
                  />
                </button>
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.11em',
                    textTransform: 'uppercase', color: '#FFFFFF', whiteSpace: 'nowrap',
                  }}
                >
                  {n === 1 ? '1 foglio' : `${n} fogli`}
                </span>
              </span>
            )}
          </span>

          {modo === 'camera' && (
            <button
              ref={scattoRef}
              type="button"
              className="scatto"
              aria-label="Scatta la foto del foglio"
              onClick={scatta}
              disabled={!stream}
            >
              <span className="scatto-disco" />
            </button>
          )}

          <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            {n > 0 && (
              <button
                type="button"
                onClick={onFinito}
                style={{
                  height: 44, border: 0, borderRadius: 999, padding: '0 16px',
                  background: '#FFFFFF', color: 'var(--ink)', boxShadow: 'var(--ombra-nav)',
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}
              >
                Ho finito
              </button>
            )}
          </span>
        </div>

        {avviso && (
          <p role="status" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.4, color: '#FFFFFF' }}>
            {avviso}
          </p>
        )}

        {ultima?.alle && (
          <span
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#FFFFFF', padding: '0 2px',
            }}
          >
            {`Ultimo foglio alle ${oraMinuti(ultima.alle)}`}
          </span>
        )}

        {/* L'input reale resta accessibile (aria-label) ma visivamente nascosto:
            il tap va sul tasto. Nessun `capture`: sul telefono riaprirebbe la
            fotocamera di sistema invece della galleria. */}
        <label
          style={{
            position: 'relative', minHeight: 50, width: '100%', boxSizing: 'border-box',
            border: '1.5px solid var(--banda-bordo)', borderRadius: 18, background: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: '#FFFFFF',
          }}
        >
          Seleziona dalla galleria
          <input
            ref={galleriaRef}
            type="file"
            accept="image/*"
            multiple
            aria-label="scegli le foto dalla galleria"
            onChange={scegliFile}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden', clipPath: 'inset(50%)' }}
          />
        </label>
      </div>

      {rivedi && n > 0 && (
        <FogliPresi pagine={pagine} onSposta={sposta} onTogli={togli} onChiudi={chiudiRivedi} />
      )}
    </div>
  );
```

`sposta(indice, delta: number)` accetta già il `-1 | 1` di `FogliPresi`. `elimina` e `sposta`
restano come sono.

- [ ] **Step 7: i test passano**

Run: `npx vitest run "src/app/(app)/importa/__tests__/camera.test.tsx" "src/app/(app)/importa/__tests__/fogli-presi.test.tsx"`
Expected: PASS.

`page.test.tsx` di Importa adesso **fallisce**: la pagina non passa ancora `onIndietro` e
`onFinito` e non ha le porte. È atteso, e lo sistema il Task 7. Verificalo con:

Run: `npx tsc --noEmit`
Expected: gli errori stanno **solo** in `src/app/(app)/importa/page.tsx` e riguardano le props
di `Camera`. Scrivi nel rapporto quanti sono e dove.

- [ ] **Step 8: lint**

Run: `npx eslint "src/app/(app)/importa/Camera.tsx" "src/app/(app)/importa/FogliPresi.tsx" "src/app/(app)/importa/__tests__"`
Expected: nessun errore.

- [ ] **Step 9: Commit**

Il ramo resta con `page.tsx` di Importa rosso fino al Task 7. È dichiarato qui, e la review del
task lo sa.

```bash
git add "src/app/(app)/importa/Camera.tsx" "src/app/(app)/importa/FogliPresi.tsx" "src/app/(app)/importa/__tests__/camera.test.tsx" "src/app/(app)/importa/__tests__/fogli-presi.test.tsx" src/app/globals.css
git commit -m "feat: la fotocamera dell'import a tutto schermo, con «Rivedi i fogli presi»

Anteprima piena, cornice guida, banda dei comandi con lo scatto bianco, i fogli presi, «Ho
finito» e la galleria; la tab bar esce finché la fotocamera è aperta. «Rivedi» è un foglio dal
basso con le foto vere in colonna, per spostarle e toglierle. La logica di oggi — ricompressione,
tetto di 12, avvisi, iniziali, i bug del 30/08 — non cambia. Importa si adegua nel task dopo.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Importa — le due porte, la fotocamera, la cronologia

**Precondizione:** il Task 5 è passato. Se è fallito, questo task non parte.

**Files:**
- Create: `src/app/(app)/importa/Acquisizione.tsx`
- Modify: `src/app/(app)/importa/page.tsx`
- Test: `src/app/(app)/importa/__tests__/page.test.tsx`, riscritto come allo Step 2

**Interfaces:**
- Consuma dal Task 3 `Porta`, `.porta-azione` e `Dock` come regione; dal Task 6 `Camera` con
  `onIndietro` e `onFinito`; da fase 2 `.dock-primario` e `.con-dock`.
- Produce `Acquisizione({ pdf: File | null; onPdf: (f: File) => void; onApriFotocamera: () => void; onEstraiPdf: () => void })`,
  che usa la sonda del Task 8.

- [ ] **Step 1: il censimento**

Run: `grep -rn "FOTO\|'PDF'\|DALLA GALLERIA\|pag\. \|estrai la dieta\|Scegli il PDF\|coda-barra" "src/app/(app)/importa"`

Scrivi nel rapporto cosa resta dopo il Task 6. Le `.coda-barra` di `Riepilogo` sono fuori scope
e restano.

- [ ] **Step 2: i test che falliscono**

Sostituisci **per intero** `src/app/(app)/importa/__tests__/page.test.tsx`. I test degli esiti
di oggi restano con le stesse asserzioni; cambia solo il modo di arrivare all'invio, che passa
dall'helper `inviaUnaFoto`.

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
vi.mock('@/data/importa', () => ({
  leggiBozzaImport: vi.fn(),
  salvaBozzaImport: vi.fn(),
  cancellaBozzaImport: vi.fn(),
  eseguiScritture: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({ leggiSlotDefs: vi.fn() }));
vi.mock('@/data/repertorio', () => ({ leggiIngredienti: vi.fn(), leggiRepertorio: vi.fn() }));
// `getSessionMock` reconfigurabile per test (pattern copiato da NotaDispensa.test.tsx):
// di default risolve una sessione con token 'tok' (vedi beforeEach sotto), e il solo test
// "senza sessione" la sovrascrive per restituire `session: null`.
const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock('@/data/supabase', () => ({
  client: () => ({ auth: { getSession: getSessionMock } }),
}));
import { leggiBozzaImport, salvaBozzaImport, cancellaBozzaImport } from '@/data/importa';
import { leggiSlotDefs } from '@/data/impostazioni';
import { leggiIngredienti } from '@/data/repertorio';
import { FIXTURE_MENU_SETTIMANALE, FIXTURE_RIFIUTO_MACRO } from '@/domain/import/fixtures';
import type { PianoEstratto } from '@/domain/import/types';
import { SlotDockProvider } from '@/components/dock-slot';
import Importa from '../page';

// `FIXTURE_MENU_SETTIMANALE.piano` esiste solo sul ramo `tipo: 'piano'` del tipo unione
// `EsitoEstrazione`: qui si sa (è il fixture giusto) che quel ramo è quello vero, quindi si
// estrae con un cast esplicito invece di un `!` che non basterebbe a zittire TS (la proprietà
// non esiste affatto sull'altro ramo dell'unione, non è solo possibilmente null).
const PIANO = (FIXTURE_MENU_SETTIMANALE as { piano: PianoEstratto }).piano;

const SLOTS = [
  { id: 's-col', nome: 'Colazione', posizione: 0, assenzeAbituali: Array(7).fill(false) },
  { id: 's-cena', nome: 'Cena', posizione: 5, assenzeAbituali: Array(7).fill(false) },
];

// Il Dock si monta con un portale nello slot che il `Guscio` renderizza: qui la
// pagina è montata da sola, e lo slot glielo dà `rendi()` (stesso schema dei test
// di Lista e Piano). Con `render` nudo `ESTRAI LA DIETA` non esisterebbe.
let slotDock: HTMLElement;
function rendi(ui: ReactNode = <Importa />) {
  return render(<SlotDockProvider slot={slotDock}>{ui}</SlotDockProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  slotDock = document.createElement('div');
  document.body.appendChild(slotDock);
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:finto-${++n}`);
  URL.revokeObjectURL = vi.fn();
  // Camera ricomprime ogni foto scelta (createImageBitmap → canvas → jpeg):
  // jsdom non sa fare nessuno dei tre passaggi, senza questi mock i file
  // sarebbero scartati come illeggibili e nessuna foto arriverebbe alla pagina.
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() })));
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toBlob = vi.fn(function (cb: BlobCallback) {
    cb(new Blob(['jpeg'], { type: 'image/jpeg' }));
  });
  // La cronologia (spec §G): `pushState` resta quello di jsdom, osservato; `back`
  // emette subito il `popstate` che il browser emetterebbe tornando indietro,
  // così i test non dipendono dai tempi della navigazione di jsdom.
  vi.spyOn(window.history, 'pushState');
  vi.spyOn(window.history, 'back').mockImplementation(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  vi.mocked(leggiBozzaImport).mockResolvedValue(null);
  vi.mocked(leggiSlotDefs).mockResolvedValue(SLOTS);
  vi.mocked(leggiIngredienti).mockResolvedValue([]);
  getSessionMock.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
});

afterEach(() => {
  vi.mocked(window.history.back).mockRestore();
  vi.mocked(window.history.pushState).mockRestore();
  slotDock.remove();
});

/** Apre la fotocamera dalle porte e prende un foglio dalla galleria. */
async function apriEPrendiUnFoglio(nome = 'p1.jpg') {
  fireEvent.click(await screen.findByRole('button', { name: 'APRI LA FOTOCAMERA' }));
  const input = await screen.findByLabelText(/scegli le foto/i);
  fireEvent.change(input, { target: { files: [new File(['a'], nome, { type: 'image/jpeg' })] } });
  await screen.findByRole('button', { name: 'Ho finito' });
}

/** Un foglio e `Ho finito`: il percorso di invio delle foto. */
async function inviaUnaFoto() {
  await apriEPrendiUnFoglio();
  fireEvent.click(screen.getByRole('button', { name: 'Ho finito' }));
}

function sceglieUnPdf() {
  const input = screen.getByLabelText('scegli il PDF della dieta');
  const file = new File(['%PDF'], 'dieta-settembre.pdf', { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

describe('Importa: la scelta', () => {
  it('senza bozza parte dalle due porte: niente selettore, niente Dock', async () => {
    rendi();
    expect(await screen.findByText('Fotografa i fogli')).toBeInTheDocument();
    expect(screen.getByText('Carica il PDF')).toBeInTheDocument();
    expect(screen.getByText('Inquadra un foglio alla volta, fino a 12. Se li hai già in galleria, li scegli da lì.')).toBeInTheDocument();
    expect(screen.getByText("Se la dieta ti è arrivata in PDF, caricalo così com'è.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'FOTO' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /estrai la dieta/i })).not.toBeInTheDocument();
  });

  it('APRI LA FOTOCAMERA aggiunge una voce alla cronologia e apre la fotocamera senza testata', async () => {
    rendi();
    fireEvent.click(await screen.findByRole('button', { name: 'APRI LA FOTOCAMERA' }));
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Fotografa il piano' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Importa la dieta' })).not.toBeInTheDocument();
  });

  it('il tondo indietro torna alle porte passando dalla cronologia, e i fogli restano', async () => {
    rendi();
    await apriEPrendiUnFoglio();
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));
    expect(window.history.back).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'APRI LA FOTOCAMERA' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'APRI LA FOTOCAMERA' }));
    expect(await screen.findByRole('button', { name: 'Rivedi il foglio preso' })).toBeInTheDocument();
  });

  it('il gesto indietro del telefono (un popstate) chiude la fotocamera', async () => {
    rendi();
    await apriEPrendiUnFoglio();
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(await screen.findByRole('button', { name: 'APRI LA FOTOCAMERA' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Fotografa il piano' })).not.toBeInTheDocument();
  });

  it('scelto un PDF: il nome del file, Cambia file, e ESTRAI LA DIETA nel Dock', async () => {
    rendi();
    await screen.findByText('Carica il PDF');
    sceglieUnPdf();
    expect(await screen.findByText('dieta-settembre.pdf')).toBeInTheDocument();
    expect(screen.getByText('Cambia file')).toBeInTheDocument();
    const dock = screen.getByRole('region', { name: 'Azione principale' });
    expect(dock).toContainElement(screen.getByRole('button', { name: 'ESTRAI LA DIETA' }));
  });
});

describe('Importa: l\'invio', () => {
  it('Ho finito: estrae, salva la bozza con la mappatura proposta e consuma la voce di cronologia', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_MENU_SETTIMANALE });
    rendi();
    await inviaUnaFoto();
    await waitFor(() => expect(salvaBozzaImport).toHaveBeenCalled());
    expect(window.history.back).toHaveBeenCalledTimes(1);
    const bozza = vi.mocked(salvaBozzaImport).mock.calls[0][0];
    expect(bozza.statoRevisione.passo).toBe('revisione');
    expect(bozza.statoRevisione.mappaturaPasti).toMatchObject({ colazione: 's-col', cena: 's-cena' });
    expect(bozza.statoRevisione.mappaturaPasti.condimenti).toBeUndefined();
  });

  it('Ho finito manda solo le immagini, anche con un PDF già scelto', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_MENU_SETTIMANALE });
    global.fetch = fetchMock;
    rendi();
    await screen.findByText('Carica il PDF');
    sceglieUnPdf();
    await inviaUnaFoto();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(body.getAll('immagini')).toHaveLength(1);
    expect(body.get('documento')).toBeNull();
  });

  it('ESTRAI LA DIETA manda solo il PDF, anche con dei fogli già presi', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_MENU_SETTIMANALE });
    global.fetch = fetchMock;
    rendi();
    await apriEPrendiUnFoglio();
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));
    await screen.findByText('Carica il PDF');
    sceglieUnPdf();
    fireEvent.click(await screen.findByRole('button', { name: 'ESTRAI LA DIETA' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = fetchMock.mock.calls[0][1]?.body as FormData;
    // Il nome e non l'identità: il FormData di jsdom può restituire un File nuovo.
    expect((body.get('documento') as File | null)?.name).toBe('dieta-settembre.pdf');
    expect(body.getAll('immagini')).toHaveLength(0);
  });

  it('rifiuto macro: schermata onesta, nessuna bozza', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_RIFIUTO_MACRO });
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText(/questa dieta non ha un menu/i)).toBeInTheDocument();
    expect(salvaBozzaImport).not.toHaveBeenCalled();
  });

  it('503: estrazione non disponibile', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ errore: 'estrazione non disponibile' }) });
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText(/non è disponibile/i)).toBeInTheDocument();
  });

  it('errore di estrazione: riprova torna alle porte, e i fogli già presi restano e se ne aggiungono', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    rendi();
    await inviaUnaFoto();

    fireEvent.click(await screen.findByRole('button', { name: /riprova/i }));

    // RIPROVA torna alle porte, con la fotocamera chiusa. Riaprendola, Camera
    // si rimonta da capo: senza `iniziali` la galleria sarebbe vuota e il
    // prossimo foglio sovrascriverebbe in silenzio, via onFoto, quello già preso.
    fireEvent.click(await screen.findByRole('button', { name: 'APRI LA FOTOCAMERA' }));
    expect(await screen.findByRole('button', { name: 'Rivedi il foglio preso' })).toBeInTheDocument();

    const input = screen.getByLabelText(/scegli le foto/i);
    fireEvent.change(input, { target: { files: [new File(['b'], 'p2.jpg', { type: 'image/jpeg' })] } });
    await screen.findByRole('button', { name: 'Rivedi i 2 fogli presi' });

    fireEvent.click(screen.getByRole('button', { name: 'Ho finito' }));
    await waitFor(() => expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(2));
    const secondoBody = vi.mocked(global.fetch).mock.calls[1][1]?.body as FormData;
    expect(secondoBody.getAll('immagini')).toHaveLength(2);
  });

  it('l’estrazione manda il Bearer della sessione', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_MENU_SETTIMANALE });
    global.fetch = fetchMock;
    rendi();
    await inviaUnaFoto();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('413 mostra il messaggio della route e non perde le foto', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      json: async () => ({ errore: 'troppe pagine: la v1 accetta fino a 12 foto' }),
    });
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText('troppe pagine: la v1 accetta fino a 12 foto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /riprova/i })).toBeEnabled();
  });

  it('429 (tetto di import) mostra il messaggio della route verbatim', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ errore: 'hai già fatto 3 import negli ultimi 30 giorni: il prossimo dal 12/09/2026' }),
    });
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText('hai già fatto 3 import negli ultimi 30 giorni: il prossimo dal 12/09/2026')).toBeInTheDocument();
  });

  it('400 col messaggio della route (PDF illeggibile) lo mostra verbatim', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ errore: 'il PDF non si apre: prova con le foto' }),
    });
    rendi();
    await screen.findByText('Carica il PDF');
    sceglieUnPdf();
    fireEvent.click(await screen.findByRole('button', { name: 'ESTRAI LA DIETA' }));
    expect(await screen.findByText('il PDF non si apre: prova con le foto')).toBeInTheDocument();
  });

  it('400 senza corpo leggibile: messaggio generico', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => { throw new Error('non JSON'); } });
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText('Non siamo riusciti a leggere la dieta. Riprova.')).toBeInTheDocument();
  });

  it('422 mostra il messaggio dedicato', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ errore: 'non ho capito la dieta, riprova' }),
    });
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText('Non ho capito la dieta: riprova, magari con foto più nitide.')).toBeInTheDocument();
  });

  it('401 dalla route (token scaduto tra getSession e il controllo server): messaggio di sessione', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ errore: 'non autorizzato' }),
    });
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText('Serve l’accesso: riapri l’app ed entra di nuovo.')).toBeInTheDocument();
  });

  it('senza sessione: errore onesto senza fetch', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    rendi();
    await inviaUnaFoto();
    expect(await screen.findByText('Serve l’accesso: riapri l’app ed entra di nuovo.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bozza esistente: riprendi/ricomincia; ricominciare la cancella', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({
      piano: PIANO,
      statoRevisione: { passo: 'revisione', mappaturaPasti: {}, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] },
    });
    rendi();
    expect(await screen.findByText(/import in corso/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ricomincia/i }));
    fireEvent.click(await screen.findByRole('button', { name: /sì, ricomincia/i }));
    await waitFor(() => expect(cancellaBozzaImport).toHaveBeenCalled());
  });
});
```

Il test `400 col messaggio della route (PDF illeggibile)` oggi passa dalle foto, perché la
route è finta. Qui passa dal PDF, perché è il caso che il messaggio descrive. Il resto delle
asserzioni non cambia.

- [ ] **Step 3: i test falliscono**

Run: `npx vitest run "src/app/(app)/importa/__tests__/page.test.tsx"`
Expected: FAIL. Mancano le porte e `APRI LA FOTOCAMERA`, e `tsc` segnala già le props di
`Camera` dal Task 6.

- [ ] **Step 4: `Acquisizione.tsx`**

```tsx
'use client';

import type { CSSProperties } from 'react';
import { Porta } from '@/components/Porta';
import { Dock } from '@/components/Dock';

interface Props {
  pdf: File | null;
  onPdf: (pdf: File) => void;
  onApriFotocamera: () => void;
  onEstraiPdf: () => void;
}

/** L'input file vero resta accessibile per nome ma invisibile: il tocco va sul tasto che lo contiene. */
const INPUT_NASCOSTO: CSSProperties = {
  position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden', clipPath: 'inset(50%)',
};

/**
 * La scelta con cui si apre l'import (spec fase 3 §D): due porte, foto e PDF.
 * La foto apre la fotocamera a tutto schermo, che ha il suo primario (`Ho
 * finito`). Il PDF apre il selettore di sistema; scelto il file, la porta ne
 * mostra il nome con `Cambia file`, e il primario `ESTRAI LA DIETA` va nel
 * Dock. Senza file il Dock non c'è: niente primario spento (DESIGN.md §8).
 * Niente dati né cronologia qui: le decide la pagina.
 */
export function Acquisizione({ pdf, onPdf, onApriFotocamera, onEstraiPdf }: Props) {
  const inputPdf = (
    <input
      type="file"
      accept="application/pdf"
      aria-label="scegli il PDF della dieta"
      // Un annullamento nel selettore non deve cancellare il file già scelto.
      onChange={(e) => {
        const scelto = e.target.files?.[0];
        if (scelto) onPdf(scelto);
      }}
      style={INPUT_NASCOSTO}
    />
  );

  return (
    <div
      className={`sc scroll-app${pdf ? ' con-dock' : ''}`}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <Porta
        titolo="Fotografa i fogli"
        testo="Inquadra un foglio alla volta, fino a 12. Se li hai già in galleria, li scegli da lì."
      >
        <button type="button" className="porta-azione" onClick={onApriFotocamera}>
          APRI LA FOTOCAMERA
        </button>
      </Porta>

      {pdf ? (
        <Porta
          titolo="Carica il PDF"
          testo={
            <span
              style={{
                display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--ink)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {pdf.name}
            </span>
          }
        >
          <label
            style={{
              position: 'relative', display: 'inline-flex', alignItems: 'center', minHeight: 44,
              fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textDecoration: 'underline', cursor: 'pointer',
            }}
          >
            Cambia file
            {inputPdf}
          </label>
        </Porta>
      ) : (
        <Porta titolo="Carica il PDF" testo="Se la dieta ti è arrivata in PDF, caricalo così com'è.">
          <label className="porta-azione">
            SCEGLI IL PDF
            {inputPdf}
          </label>
        </Porta>
      )}

      {pdf && (
        <Dock>
          <button type="button" className="dock-primario" onClick={onEstraiPdf}>
            ESTRAI LA DIETA
          </button>
        </Dock>
      )}
    </div>
  );
}
```

- [ ] **Step 5: `page.tsx`**

Le modifiche, nell'ordine del file.

**5a. Import.** Via `import { Segmento } from '@/components/Segmento';`. Aggiungi
`import { Acquisizione } from './Acquisizione';`.

**5b. Lo stato.** Sostituisci:

```tsx
  // Acquisizione: stato indipendente dalla vista corrente, così un errore o
  // un giro di estrazione non fanno perdere le foto già scelte.
  const [tab, setTab] = useState<'foto' | 'pdf'>('foto');
  const [foto, setFoto] = useState<Blob[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);
```

con:

```tsx
  // Acquisizione: stato indipendente dalla vista corrente, così un errore o
  // un giro di estrazione non fanno perdere le foto già scelte. Foto e PDF
  // convivono: ognuno parte dal proprio tasto (spec fase 3 §D).
  const [fotocameraAperta, setFotocameraAperta] = useState(false);
  const [foto, setFoto] = useState<Blob[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);
```

**5c. La cronologia.** Subito dopo lo `useEffect` di mount, aggiungi:

```tsx
  /**
   * Il gesto indietro del telefono dentro la fotocamera (spec fase 3 §G). A
   * tutto schermo e senza tab bar è il modo naturale di uscirne: senza una voce
   * nella cronologia uscirebbe da /importa e perderebbe i fogli presi. Aprire la
   * fotocamera aggiunge una voce sullo stesso URL (Next 16 integra `pushState`
   * nativo col router); ogni uscita la consuma con `history.back()`, e chi
   * chiude davvero è sempre questo ascoltatore.
   */
  useEffect(() => {
    const chiudi = () => setFotocameraAperta(false);
    window.addEventListener('popstate', chiudi);
    return () => window.removeEventListener('popstate', chiudi);
  }, []);

  function apriFotocamera() {
    window.history.pushState(null, '');
    setFotocameraAperta(true);
  }

  /** Il tondo indietro: consuma la voce, e il `popstate` chiude. */
  function chiudiFotocamera() {
    window.history.back();
  }

  /**
   * `Ho finito`: l'estrazione porta subito la vista a `estrazione` (il primo
   * setState di `estrai` è sincrono); poi la voce si consuma, e quando il
   * `popstate` arriva chiude una fotocamera che la vista non mostra già più.
   */
  function finito() {
    void estrai('foto');
    window.history.back();
  }
```

**5d. `estrai`.** La firma diventa `async function estrai(sorgente: 'foto' | 'pdf')`. Nel corpo,
sostituisci il blocco del `FormData` e il suo commento:

```tsx
      // Solo la sorgente scelta finisce nel FormData: le due modalità non si
      // mescolano mai. Lo decide il tasto premuto — `Ho finito` nella fotocamera,
      // `ESTRAI LA DIETA` nel Dock col PDF — e non più una tab (spec fase 3 §D).
      // L'altra resta in memoria, semplicemente non parte con questa richiesta.
      const body = new FormData();
      if (sorgente === 'foto') {
        foto.forEach((f) => body.append('immagini', f));
      } else if (pdf) {
        body.append('documento', pdf);
      }
```

**5e. La vista `acquisizione`.** Sostituisci il commento `// vista === 'acquisizione': …` e il
`return` finale del componente con:

```tsx
  // vista === 'acquisizione'. La Camera si monta solo a fotocamera aperta: in un
  // browser vero `getUserMedia` parte al mount, quindi deve accendersi solo quando
  // serve, mai in sottofondo mentre si mostrano le porte o il banner di ripresa. Il
  // cleanup di Camera ferma le tracce a ogni uscita. A tutto schermo, senza Cornice:
  // niente testata, e la tab bar la toglie Camera stessa (spec §E, §G).
  if (fotocameraAperta) {
    // `iniziali={foto}`: Camera si smonta e rimonta a ogni chiusura e riapertura
    // (per esempio dopo un errore di estrazione, RIPROVA torna alle porte) —
    // senza seminare lo stato, la galleria ripartirebbe vuota e il primo foglio
    // successivo sovrascriverebbe in silenzio, via onFoto, quelli già presi.
    return <Camera onFoto={setFoto} iniziali={foto} onIndietro={chiudiFotocamera} onFinito={finito} />;
  }

  return (
    <Cornice>
      <Acquisizione pdf={pdf} onPdf={setPdf} onApriFotocamera={apriFotocamera} onEstraiPdf={() => void estrai('pdf')} />
    </Cornice>
  );
```

**5f.** Cancella `interface PropsAcquisizione` e `function SchermataAcquisizione`, per intero.

- [ ] **Step 6: i test passano**

Run: `npx vitest run "src/app/(app)/importa"`
Expected: PASS in tutti i file: `page`, `camera`, `fogli-presi`, `revisione`, `formati`,
`riepilogo`.

- [ ] **Step 7: suite, tipi, lint, build**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: tutto verde. Il ramo torna verde qui.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/importa/Acquisizione.tsx" "src/app/(app)/importa/page.tsx" "src/app/(app)/importa/__tests__/page.test.tsx"
git commit -m "feat: l'import si apre con due porte, foto e PDF

Via il selettore FOTO / PDF. La foto apre la fotocamera a tutto schermo, e il gesto indietro
del telefono la richiude tornando alle porte invece di uscire dall'import. Il PDF apre il
selettore di sistema; scelto il file, ESTRAI LA DIETA va nel Dock. Ogni sorgente parte dal
proprio tasto e manda solo il proprio payload.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: la verifica nel browser e il ponte

**Files:**
- Create, temporaneo, **da cancellare e non committare**: `src/app/auth/prova-fase3/page.tsx`
- Modify: `docs/superpowers/specs/DESIGN-SYSTEM.md`
- Modify: qualunque file in cui la verifica trovi un difetto, con il suo commit

- [ ] **Step 1: la sonda**

Il proxy di autenticazione lascia passare `/auth/*`, quindi una pagina sotto `src/app/auth/` si
apre senza sessione, come nelle fasi 1 e 2. La sonda monta il `Guscio` vero e dentro, a scelta
con quattro tasti in alto, i componenti veri su dati inventati, senza chiamate a Supabase:

1. **Piatti**: `Cornice` rifatta come in `piatti/page.tsx`, cioè colonna a tutta altezza con
   `<Testata titolo="Piatti" />`, e dentro `ElencoPiatti` con 14 piatti. Uno ha il nome lungo
   `Pasta integrale con zucchine, menta e ricotta salata al forno`; uno è `nutrizionista` con
   soli componenti; gli ingredienti coprono quattro aree.
2. **Porte**: colonna con `<Testata titolo="Importa la dieta" indietro />` e `Acquisizione` con
   `pdf={null}`.
3. **PDF scelto**: come il 2, con `pdf={new File(['x'], 'dieta-di-settembre-2026-versione-definitiva.pdf')}`.
4. **Fotocamera**: `Camera` con `iniziali` di **12** blob. I blob li genera la sonda al mount,
   disegnando su un canvas un rettangolo chiaro col numero e chiamando `toBlob`. Callback
   vuoti.

Il `Guscio` vuole `usePathname` e funziona fuori dal gruppo `(app)`: lo ha già fatto la sonda
della fase 2. Se `Testata` fallisce senza sessione, sostituiscila nella sonda con un `<h1>` alto
uguale e scrivilo nel rapporto.

- [ ] **Step 2: il server**

Run dal worktree, in background: `npm run dev -- -p 3002`. Mai `sleep` in primo piano.

- [ ] **Step 3: le misure, a 375 × 812**

Apri `http://localhost:3002/auth/prova-fase3`. Misura con `getBoundingClientRect` e
`getComputedStyle`, e riporta i numeri veri **con la posizione di scorrimento accanto**.

1. **Piatti.**
   - Scorri fino in fondo con `scrollTop = 1e6`, poi leggi `scrollTop`. Il fondo dell'ultima
     riga deve stare sopra il cielo della tab bar, a barra grande e ridotta.
   - Il nome lungo va in ellissi su una riga: altezza del nome uguale a quella di un nome corto.
   - Altezza delle righe ≥ 68.
   - L'aggiungi è il primo figlio dello scroller, alto 56.
   - Il campo di ricerca non si muove quando lo scroller scorre: stessa `top` prima e dopo.
2. **Porte.** Nessuna porta compressa: altezza uguale al contenuto. Niente Dock.
3. **PDF scelto.**
   - Il Dock c'è ed è una `region` di nome `Azione principale`.
   - Scorrendo fino in fondo, la porta PDF finisce sopra il cielo del Dock.
   - Il nome lungo del file va in ellissi.
4. **Fotocamera** [ipotesi: nel browser della sonda la fotocamera non c'è, quindi si vede il
   ripiego; se invece c'è, misura quello che c'è e scrivilo]:
   - la radice di `Camera` è alta quanto `.guscio`, ±1 px;
   - `nav[aria-label="Sezioni"]` non esiste nel DOM;
   - l'altezza della banda con 12 fogli, e con un avviso: per farlo comparire, scegli un file
     dalla galleria col tetto già pieno. Deve restare ≤ 268 dal fondo;
   - il chrome in alto e la banda non si sovrappongono;
   - il testo del ripiego sta dentro lo schermo e non sotto la banda.
5. **«Rivedi» con 12 fogli.**
   - Apri la miniatura. Il foglio è alto al massimo lo schermo meno 88.
   - L'elenco scorre, e `Chiudi` resta visibile senza scorrere il foglio.
   - `Sposta il foglio 1 più giù` cambia l'ordine delle foto.
   - Togliendo tutto, il foglio si chiude.
6. **Il ritorno della barra.** Dalla fotocamera torna a una delle altre viste con i tasti della
   sonda: `nav[aria-label="Sezioni"]` ricompare.

- [ ] **Step 4: cancella la sonda**

Run: `rm -r src/app/auth/prova-fase3` e poi `rm -rf .next/dev`. Con `git status` verifica che non
resti niente. Ferma il server.

- [ ] **Step 5: i difetti**

Un difetto trovato qui si corregge in questo task: nel file giusto, con un test se jsdom lo può
vedere, e con il suo commit. Poi si rimisura con la sonda ricreata e ricancellata. Il messaggio
del commit:

```
fix: <cosa>, verificato nel browser

<la misura prima e dopo, con la posizione>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

- [ ] **Step 6: il ponte `DESIGN-SYSTEM.md`**

In `docs/superpowers/specs/DESIGN-SYSTEM.md`, §3:
- **Dock**: lo stato diventa `fatto nella fase 2; dalla fase 3 è una regione di nome «Azione
  principale» (tutti i Dock), e porta anche ESTRAI LA DIETA in Importa col PDF scelto`. Via la
  frase «Da decidere prima della fase 3: …».
- **Riga piatto**: `src/app/(app)/piatti/ElencoPiatti.tsx` (`RigaPiatto`), `fatta nella fase 3`.
- **Tasto di scatto · Banda dei comandi · Striscia dei fogli presi**:
  `src/app/(app)/importa/Camera.tsx` (+ `.scatto`, `.guida-angolo` in `globals.css`), «Rivedi
  i fogli presi» in `src/app/(app)/importa/FogliPresi.tsx`, `fatti nella fase 3`.
- **Foglio dal basso**: aggiungi `FogliPresi.tsx` accanto a `FoglioAzioniPasto.tsx`.
- **Campo di testo**: la modalità ricerca vive in `ElencoPiatti.tsx`.
- Aggiungi la riga **Porta**, `src/components/Porta.tsx`, `nata nello stato vuoto di Piatti,
  condivisa dalla fase 3 con Importa`. Porta non è una voce di `DESIGN.md` §8: scrivilo nella
  cella dello stato.
- In «Fuori dal sistema» aggiungi `barra-context.tsx`.
- Aggiorna il conteggio `29 voci … 18 file` contando di nuovo: le voci `###` di `DESIGN.md` §8
  e i file `.tsx` in `src/components/`. Scrivi i numeri veri con la data.

§9:
- sostituisci la riga delle schermate non ridisegnate con `Dispensa, Impostazioni a pannello`;
- rimisura i token con `npm run design:token` e aggiorna la riga `63 token dichiarati …` con i
  numeri nuovi e la data;
- aggiungi una voce: `La fase 3 (Piatti e fotocamera) è chiusa il <data>`. La data la mette il
  coordinatore dopo il merge.

- [ ] **Step 7: Commit del ponte**

```bash
git add docs/superpowers/specs/DESIGN-SYSTEM.md
git commit -m "docs: il ponte col codice registra la fase 3

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: il rapporto**

- Le misure dello Step 3, ciascuna con il valore vero, la posizione ed `[misurato]`.
- I difetti trovati, con i commit che li correggono.
- Quello che non si è potuto misurare, scritto come tale: la fotocamera vera se il browser non
  l'ha, lo swipe di iOS. Va al gate di Andrea.

---

## Dopo gli otto task

1. **La review finale su tutto il ramo**, con un modello capace. Attenzione a:
   - la cronologia: ogni uscita dalla fotocamera consuma la sua voce, e nessuna ne lascia una
     orfana;
   - `estrai(sorgente)`: nessun invio mescola foto e PDF;
   - le parti di `Camera.tsx` da conservare, confrontate col `main` riga per riga;
   - il fuoco di «Rivedi»;
   - i test cancellati o riscritti, uno per uno, con la ragione.
2. **`superpowers:finishing-a-development-branch`**: PR verso `main` e CI. Il merge lo fa
   Andrea.
3. **Deploy in produzione, lo fa Andrea.** Prima `git pull` del `main` locale, perché
   `--prod` carica i file locali. Poi `npx vercel login`, se il token è scaduto, e
   `npx vercel --prod`.
4. **Il gate finale di Andrea, dal telefono** (spec §L):
   - Piatti: cercare un piatto per un ingrediente che non è nel nome.
   - Importa: aprire la fotocamera, fotografare i fogli, riordinarne due in «Rivedi»,
     toglierne uno e rifarlo, provare lo swipe indietro, `Ho finito`, fino alla revisione.
   - **Senza `SOSTITUISCI IL PIANO`.** Una sola estrazione, perché ognuna consuma un tentativo
     del tetto.
5. **Aggiornare la memoria di progetto con l'esito**, e le decisioni prese in esecuzione in
   `docs/2026-09-<gg>-fase3-decisioni-esecuzione.md`, come per la fase 2.

## Auto-review del piano

**Copertura della spec.**

| Spec | Task |
|---|---|
| §A | 4 |
| §B | 2 (funzione), 4 (uso) |
| §C | 3 (`Porta`), 4 (vuoto di ricerca) |
| §D | 7 |
| §E | 6 |
| §F | 6 |
| §G | 3 (barra), 5 (prova), 7 (cronologia) |
| §H | 3 |
| §I | i testi sono dentro i Task 4, 6 e 7, copiati dalla tabella; nessuno è nuovo rispetto a §I |
| §J | 1 (`DESIGN.md` e token), 3 e 6 (classi), 8 (ponte) |
| §K | i casi limite sono nei test dei Task 2, 4, 6 e 7, più le misure del Task 8 |
| §L | test nei Task 2, 3, 4, 6 e 7; il browser nei Task 5 e 8; il gate in «Dopo» |
| §M | 1 e 6 (`Ho finito` assente a zero fogli), 2 e 4 (conteggio con le alternative), 4 (ricerca ferma) |
| §N | questi otto task. Rispetto a §N, il Task 1 porta anche i token, e i Task 4 e 7 estraggono `ElencoPiatti` e `Acquisizione` perché la sonda misuri codice vero |

**Tre scostamenti dalla spec, scelti qui:**
- **`ElencoPiatti` e `Acquisizione` sono file a sé.** La spec voleva `RigaPiatto` locale a
  `page.tsx`. Ma una pagina Next non può esportare altro che il default, e la sonda del Task 8
  deve montare i componenti veri. `RigaPiatto` resta locale, dentro `ElencoPiatti.tsx`.
- **L'alfa delle righe finte è 0,14, non 0,16.** Vince `DESIGN.md` §8 sul mockup, e la spec è
  già corretta.
- **Il foglio «Rivedi» sta dentro la radice della fotocamera, non in un portale.** Così il velo
  copre anteprima e banda e lo stream resta acceso.

**Segnaposto.** Non c'è nessun TBD. Due punti chiedono di verificare un fatto e scriverlo nel
rapporto, e non sono decisioni rimandate:
- il `<video>` di jsdom nel test dello scatto;
- `Testata` senza sessione nella sonda.

`'pz'` è un'unità valida sia per `UnitaBase` sia per `UnitaMisura` [misurato:
`src/domain/types.ts:1-2`].

**Coerenza dei tipi:**
- `Camera` ha props `onFoto`, `iniziali?`, `onIndietro` e `onFinito`: il Task 6 le produce, il
  Task 7 le consuma, e la sonda del Task 8 le passa.
- `FogliPresi.onSposta` vuole `(indice, delta: -1 | 1)`, e `Camera.sposta(indice, delta: number)`
  lo accetta.
- `Acquisizione.onPdf` vuole `(f: File)`, non `File | null`: annullare non cancella il file.
  Nella pagina lo riceve `setPdf`, che accetta `File`.
- `useNascondiBarra(boolean)`: il Task 3 la produce, il Task 6 la chiama.
