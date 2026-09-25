# Fase 5: le Impostazioni — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare le Impostazioni nel ridisegno: diventano un pannello a due livelli che esce dal
Menù utente sopra la pagina corrente, con otto sotto-schermate e quattro funzioni nuove (Esci,
Cancella la dispensa, Esporta, Cadenza). Piatti esce dalla tab bar, che passa a tre voci; il
Piano regge sei pasti a 360 px; all'apertura il Marchio si compone e vola sulla tab bar.

**Architecture:** Il pannello è un componente client montato nel `Guscio`, con il suo stato in
un `PannelloProvider` (`src/components/pannello/`). Le sotto-schermate sono una pila di stato
interna, e il gesto indietro passa da `useIndietroFogli`, spostato in `src/components/`. Le pagine
piene (Piatti, Importa, editor dell'ingrediente) tornano al pannello con
`?impostazioni=<destinazione>`, e l'origine sta in `sessionStorage`. I dati cambiano con una
migrazione, `0015`: la colonna `settings.giorni_controllo` e la funzione `cancella_dispensa()`.
Il resto è interfaccia, più tre funzioni di dati: esporta, esci, leggi tutte le settimane. La
vecchia pagina `impostazioni/page.tsx` (1050 righe) si smonta nei componenti del pannello, e le
sue route diventano rimandi.

**Tech Stack:** Next.js 16 App Router (client component), Supabase JS, Vitest + Testing Library +
jsdom (`fireEvent`: `user-event` non è installato), stile inline con classi condivise in
`src/app/globals.css`.

**Spec:** `docs/superpowers/specs/2026-09-25-impostazioni-design.md`, approvata da Andrea il 25/09
con le decisioni 1–16, più le decisioni 17–20 di Andrea del 26/09 (D1 e D2 su Cancella la
dispensa, D3 su Esci, i testi del disegno e la cadenza nei due testi che dicevano «90 giorni»).
La spec cita i paragrafi come §A…§O, e ogni task qui li richiama.

I disegni stanno in `design/ridisegno/impostazioni/`:
- `Impostazioni - pannello completo.dc.html`, frame 00–27. Per leggerlo senza browser:
  `python3` con `re` sulle `data-screen-label`, oppure si apre il file;
- `LOG modifiche per Claude Code.md`, il delta del designer. Le misure citate come «log §n»
  vengono da lì.

## Global Constraints

- **Copy:** i testi sono quelli della spec, tabella §I e §B, §C, §D. Vanno riportati carattere
  per carattere: caporali `«»`, `…` come un carattere solo, apostrofi dritti `'` nei testi nuovi.
  I testi del disegno che Andrea ha confermato il 26/09 (note delle righe, riepilogo della
  matrice, `OGNI QUANTO TI CHIEDO`, `CODICE DELLA CASA`, `Apri {nome}`, `Togli {email} dalla
  casa`, l'aria del campo `PERS`) sono in §I. Un testo che non è nella spec non si inventa: si
  ferma il task e si chiede. Dove la spec dice «il testo di
  oggi», il testo si copia dal codice di oggi (`src/app/(app)/impostazioni/page.tsx` e le sue
  sotto-pagine), senza toccarlo.
- **Stile:** solo valori di `design/sistema/DESIGN.md`, come aggiornato dal Task 1: token, scala
  tipografica, raggi, alfa (§2.5).
  - Colori sempre da variabili CSS: `var(--ink)`, `var(--testo-2)` (testo che informa),
    `var(--sec)` / `var(--ter)` (decorativo), `var(--errore)`, `var(--bordo)`, `var(--fondo)`,
    `var(--superficie)`.
  - Ombre: `var(--ombra-pannello)`, `var(--ombra-nav)`, `var(--ombra-alta)`,
    `var(--ombra-tasto)`, `var(--ombra-casetta)`.
- **Bersagli ≥ 44 px.**
- **Ogni animazione** sta dentro `@media (prefers-reduced-motion: no-preference)` e ha la sua
  variante per `reduce`, come dice la spec.
- **Nessuna dipendenza nuova.**
- **Accessibilità:**
  - ogni controllo ha un nome;
  - `aria-pressed` su celle, segmenti e Sì/No;
  - `role="dialog"`, `aria-modal="true"` e `aria-labelledby` sul pannello;
  - `role="alertdialog"` sui dialoghi;
  - `role="status"` sugli stati in attesa (`CARICO…`, file pronto);
  - `role="alert"` sugli errori di salvataggio.
- **Il codice di test scritto in questo piano è una bozza.** Prima di scriverlo, leggi il codice
  vero che testa (firme, nomi dei mock, fixture esistenti, come i test di oggi montano le
  pagine) e correggi la bozza.
- **I test della vecchia pagina delle Impostazioni non si cancellano senza sostituto.** Ogni test
  di `src/app/(app)/impostazioni/__tests__/page.test.tsx` e di
  `impostazioni/reparti/__tests__/page.test.tsx` si riporta su una sotto-schermata. Chi lo
  migra scrive la coppia «test vecchio → test nuovo» nel registro (Task 1 lo crea). Un test che
  verificava un comportamento tolto dalla spec (`SICURO?`, lo stepper, l'anteprima dell'ordine)
  diventa il test del comportamento che lo sostituisce, e il registro lo dice.
- **Chi implementa committa**, in italiano, con la riga
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. I comandi git si danno uno alla
  volta, semplici: niente catene con `&&` che nominano git.
- **Next 16 non è quello che conosci.** Prima di usare un'API di Next, leggi la guida in
  `node_modules/next/dist/docs/`. In un worktree nuovo `npx tsc --noEmit` fallisce su
  `LayoutProps` finché non lanci `npx next typegen`.
- **Comandi di verifica** a fine di ogni task: `npx vitest run <file toccati>`, poi
  `npx tsc --noEmit`, poi `npm run lint`. I task che toccano token o `globals.css` lanciano anche
  `npm run design:token`. I Task 11 e 15 lanciano anche `npm test` intero e `npm run build`.
- **Registro:** `docs/2026-09-25-fase5-decisioni-esecuzione.md`, creato dal Task 1. Ogni scelta
  che la spec non copre va lì, con `[misurato]` o `[ipotesi]`. Le sue sezioni hanno nomi fissi,
  e i task li usano così: «Le decisioni, con il loro costo» (la tabella delle decisioni,
  numerata di seguito: ogni task continua dall'ultimo numero, e i numeri scritti nel piano sono
  indicativi), «Migrazione dei test», «Non eseguiti: restano per il gate dal telefono»,
  «Rimasto aperto, di proposito», «Domande per Andrea (in review)», «I gate di Andrea, in
  ordine», più una sezione «Task N» per le indagini dei Task 3, 4 e 5.
- **Migrazione dei test, una regola sola** (Task 1): nella tabella «Migrazione dei test» la
  colonna «Test vecchio» riporta il titolo **esatto** dell'`it(...)` di oggi, e «Test nuovo» il
  file, ` › `, e il titolo esatto dell'`it(...)` nuovo. «Va a» dice il task che migra, e i Task
  6–11 compilano solo le righe che la tabella gli assegna. Lo script dello Step 12 del Task 11
  controlla le 52 righe dei due file vecchi prima di cancellarli.
- **Produzione:** nessun task applica la migrazione a Supabase. La migrazione `0015` va in
  produzione solo prima del merge, con l'ok di Andrea (spec §O).

## Mappa dei file

**Creati**
- `supabase/migrations/0015_cadenza_e_dispensa.sql`: la colonna `settings.giorni_controllo`
  (Task 3) e la funzione `cancella_dispensa()` (Task 4).
- `src/components/useIndietroFogli.ts`, spostato dalla Dispensa, con `chiudiTuttoPoi` (Task 2).
- `src/components/controlli.tsx`, spostato da `src/app/(app)/dispensa/controlli.tsx` (Task 2).
- `src/components/DialogoConferma.tsx` (Task 2).
- `src/components/pannello/`:
  - `versione.ts` (Task 5: la cartella nasce qui);
  - `tipi.ts`, `indirizzi.ts`, `PannelloProvider.tsx`, `Pannello.tsx`, `DatiPannello.tsx`,
    `PiedePannello.tsx`, `schermate.tsx` (Task 6);
  - `pezzi.tsx`, `Cima.tsx`, `RigaImpostazione.tsx`, `TesserePannello.tsx`, `CampoPersone.tsx`,
    `NotaRisparmio.tsx` (Task 7);
  - `PastiACasa.tsx`, `GestionePasti.tsx`, `Rotazione.tsx` (Task 8);
  - `Ingredienti.tsx`, `OrdineAree.tsx`, `Cadenza.tsx` (Task 9);
  - `Casa.tsx`, `Esporta.tsx` (Task 10);
  - i test in `src/components/pannello/__tests__/`; l'aiuto di test comune, `finti.ts` e
    `aiuti.tsx`, lo crea il Task 7, e i Task 8–10 lo riusano.
- `src/domain/esporta.ts`, `src/data/esporta.ts`, `src/data/sessione.ts`,
  `src/components/salva-file.ts` (Task 5).
- `src/app/(app)/piatti/da.ts` (Task 11), `src/app/(app)/impostazioni/Rimando.tsx` (Task 11).
- `src/components/AvvioMarchio.tsx` (Task 14).
- `docs/2026-09-25-fase5-decisioni-esecuzione.md` (Task 1).

**Modificati**
- `design/sistema/DESIGN.md`, `design/sistema/tokens.css`, `src/app/globals.css` (tutto il CSS
  della fase: barra, pannello, avvio), `src/app/__tests__/token.test.ts` (Task 1);
  `docs/superpowers/specs/DESIGN-SYSTEM.md` e la spec, solo §L (Task 15).
- `src/components/FoglioDalBasso.tsx`: `livello` 3 (Task 2).
- La Dispensa: `page.tsx`, i componenti che importano `controlli`, `useIndietroFogli` e
  `DialogoElimina` (Task 2); `page.tsx` ascolta `spesa:dispensa-cambiata` (Task 4).
- `src/domain/types.ts`, `src/domain/pantry.ts`, `src/domain/list-builder.ts`,
  `src/data/impostazioni.ts`, `src/data/lista.ts` (`ListaSalvata.giorniControllo`),
  `src/components/RigaControllo.tsx`, `src/app/(app)/lista/page.tsx`,
  `src/app/(app)/lista/fatta/page.tsx` (la frase con la cadenza), e le fixture `Impostazioni`
  dei test (Task 3).
- `src/data/dispensa.ts` (Task 4).
- `src/data/settimana.ts`, `next.config.ts`, `src/data/casa.ts` (il commento sbagliato),
  `src/data/utente.ts` (una docstring) (Task 5).
- `src/components/Guscio.tsx`, `src/components/Testata.tsx`, `src/data/utente.ts` (Task 6).
- `src/components/pannello/schermate.tsx` (`CIMA`) e `DatiPannello.tsx` (`StatoDatiPannello`
  usa i pezzi) (Task 7); `schermate.tsx` (le voci) (Task 8, 9, 10).
- `src/components/TabBar.tsx`, `src/components/Testata.tsx`, `src/app/(app)/piatti/page.tsx`,
  `src/app/(app)/lista/page.tsx`, `src/app/(app)/piano/page.tsx`, `src/app/(app)/importa/page.tsx`,
  le tre route `src/app/(app)/impostazioni/**/page.tsx`, che diventano rimandi (Task 11). Il
  CSS della barra **non** si tocca: è del Task 1. L'editor del piatto
  `src/app/(app)/piatti/[id]/page.tsx` **non** si tocca: torna già a `/piatti`, e la pillola
  ritrova `da` da `sessionStorage`.
- `src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx` e il suo test,
  `src/components/Dock.tsx` e `src/components/__tests__/dock.test.tsx`, `src/app/globals.css`
  (una regola: `.dock-senza-barra`) (Task 12).
- `src/components/StrisciaGiorni.tsx` (Task 13).
- `src/components/Guscio.tsx` (monta l'avvio) e `src/components/TabBar.tsx`
  (`data-marchio-barra`) (Task 14).

**Cancellati**
- `src/app/(app)/dispensa/controlli.tsx` e `src/app/(app)/dispensa/useIndietroFogli.ts`,
  spostati (Task 2).
- Il contenuto di `src/app/(app)/impostazioni/page.tsx`, `ingredienti/page.tsx` e
  `reparti/page.tsx`, e i due file di test delle vecchie Impostazioni, dopo il controllo della
  copertura (Task 11).

## Ordine e review

I task vanno in sequenza, un implementatore alla volta:
1 → 2 → … → 15.

**Review di correttezza** (modello più capace) su:
- **Task 3:** la cadenza nel calcolo della lista;
- **Task 4:** `cancella_dispensa` e i Pronti (con D1 = A e D2 = A);
- **Task 5:** esporta ed esci;
- **Task 8:** Rimuovi pasto e la cascata, con la rilettura di `salvaPasti` del Task 6.

Review normale sugli altri, review finale sul ramo.

**Il Task 2 contiene una sonda nel browser** (`chiudiTuttoPoi` + `router.push`, spec §A.5, §M.3
punto 1). Il suo esito decide come il Task 6 naviga fuori dal pannello (ramo A o B) e come il
Task 12 apre l'editor di un altro ingrediente: i due task leggono il registro prima di
cominciare.

## Le interfacce fra i task (vincolanti)

Queste firme sono il contratto fra i task: un task che le produce le scrive così, un task che
le consuma le usa così. Se un task scopre che una firma non regge, si ferma, la corregge qui e
nel registro, e avvisa. Sono aggiornate al 26/09: comprendono le aggiunte del Task 6 e le
decisioni del controller.

```ts
// src/components/useIndietroFogli.ts (Task 2)
export function useIndietroFogli(
  profondita: number,
  chiudiUltimo: () => void,
): { chiudiTuttoPoi: (fn: () => void) => void };
// chiudiTuttoPoi(fn): registra fn. Il chiamante nello stesso tick porta il suo stato a
// profondità 0. Quando l'hook consuma le voci con go(-n), fn parte al popstate atteso; se
// non c'erano voci, parte nell'effetto; se il popstate non arriva entro ATTESA_POPSTATE_MS,
// parte comunque, una volta sola.
// Solo se la sonda del Task 2 dice «non regge» l'hook restituisce anche
// `lasciaVoci: () => void` (ramo B: il Task 6 e il Task 12 navigano con router.replace).

// src/components/controlli.tsx (Task 2): gli stessi export di oggi della Dispensa
export { STILE_PILLOLA, TastoPrimario, TastoSecondario, Blocco, Etichetta, MessaggioErrore, RigaSiNo, CampoConSalva };

// src/components/DialogoConferma.tsx (Task 2)
export interface PropsDialogo {
  titolo: string;
  testo: string;
  azione: string;                      // il testo del tasto, es. 'TOGLI'
  tono: 'distruttivo' | 'primario';    // --errore oppure --ink
  erroreTesto: string;                 // mostrato sotto i tasti se onConferma rifiuta
  onConferma: () => Promise<void>;     // chi la passa chiude il dialogo quando riesce
}
export function DialogoConferma(p: PropsDialogo & { onAnnulla: () => void }): JSX.Element;
// Tiene da sé lo stato «in volo» (0,5 e disabled su entrambi i tasti) come DialogoElimina oggi.
// NON si avvolge da sé: chi lo usa lo mette in un FoglioDalBasso con ruolo="alertdialog",
// altezza="contenuto", chiudiDalVelo={false} e livello 2 (sopra un foglio o una pagina) o 3
// (sopra il pannello). Il pannello lo fa per i suoi dialoghi (Task 6, `mostraDialogo`).

// src/components/FoglioDalBasso.tsx (Task 2): livello?: 1 | 2 | 3. Il 3 ha zIndex 80.

// src/domain/types.ts (Task 3)
export type GiorniControllo = 30 | 60 | 90;   // nasce qui; pantry.ts lo riesporta
// Impostazioni guadagna `giorniControllo: GiorniControllo` (obbligatorio). Le fixture dei test
// scrivono `giorniControllo: 90`.

// src/domain/pantry.ts (Task 3)
export type { GiorniControllo } from './types';
export const CADENZE: readonly GiorniControllo[];            // [30, 60, 90]
export const GIORNI_CONTROLLO_DEFAULT: GiorniControllo;      // 90; GIORNI_CONTROLLO_STAPLE sparisce
export function testoCadenza(g: GiorniControllo): 'OGNI MESE' | 'OGNI 2 MESI' | 'OGNI 3 MESI';
export function ogniCadenza(g: GiorniControllo): 'Ogni mese' | 'Ogni 2 mesi' | 'Ogni 3 mesi';   // nota «a stima», Task 12
export function fraCadenza(g: GiorniControllo): 'fra un mese' | 'fra 2 mesi' | 'fra 3 mesi';   // Lista fatta, Task 3
export function serveControllo(i: { ultimoAcquisto: string | null; ultimoCheck: string | null; oggi: string; giorniControllo: GiorniControllo }): boolean;
// RigaControllo guadagna la prop `giorniControllo: GiorniControllo`.
// src/data/lista.ts: ListaSalvata guadagna `giorniControllo?: GiorniControllo` (da leggiListe).

// src/data/dispensa.ts (Task 4)
export const EVENTO_DISPENSA_CAMBIATA = 'spesa:dispensa-cambiata';
export async function cancellaDispensa(): Promise<void>;   // rpc('cancella_dispensa'); lancia l'errore
// Chi chiama, se riesce: window.dispatchEvent(new Event(EVENTO_DISPENSA_CAMBIATA)) (la cima, Task 7).

// src/data/settimana.ts (Task 5)
export async function leggiTutteLeSettimane(): Promise<{ lunedi: string; stato: string; pasti: MealSlot[] }[]>;
// week in una query, meal_slot a pagine con range(): il tetto di righe di PostgREST non tronca il file.
// src/domain/esporta.ts (Task 5)
export interface Esportazione { formato: 1; app: 'dispesa'; versione: string; esportatoIl: string; impostazioni: Impostazioni; pasti: MealSlotDef[]; ingredienti: Ingredient[]; piatti: Dish[]; piano: { lunedi: string; stato: string; pasti: MealSlot[] }[]; dispensa: { stato: PantryState[]; pronti: unknown[] } }
export function componiEsportazione(i: Omit<Esportazione, 'formato' | 'app'>): Esportazione;
export function nomeFileEsportazione(oggi: string /* aaaa-mm-gg */): string; // 'dispesa-25-09-2026.json'
// src/data/esporta.ts (Task 5)
export async function preparaEsportazione(adesso?: Date): Promise<File>;
// src/components/salva-file.ts (Task 5)
export async function salvaFile(file: File): Promise<'condiviso' | 'scaricato' | 'annullato'>;
// D4: se la condivisione fallisce per un motivo diverso dall'annullo, scarica.
// src/data/sessione.ts (Task 5)
export async function esci(): Promise<void>;
// signOut({ scope: 'local' }) (D3 = A). Lancia SOLO se dopo l'errore la sessione c'è ancora
// (auth-js 2.112.4 cancella la sessione locale anche quando il server fallisce). Se esce: pulizia,
// poi window.location.replace('/entra'), e non torna.
// src/components/pannello/versione.ts (Task 5)
export const VERSIONE: string; // process.env.NEXT_PUBLIC_VERSIONE ?? '0.0.0'

// src/components/pannello/tipi.ts (Task 6)
export type SottoSchermata = 'pasti-a-casa' | 'gestione-pasti' | 'rotazione' | 'ingredienti' | 'aree' | 'cadenza' | 'casa' | 'esporta';
export const SOTTO_SCHERMATE: readonly SottoSchermata[];
export type DestinazionePannello = 'cima' | SottoSchermata;
export const ID_PANNELLO = 'pannello-impostazioni';          // aria-controls del Menù utente
export const ID_TITOLO_PANNELLO = 'pannello-impostazioni-titolo';
export const ID_MENU_UTENTE = 'menu-utente';                 // il pannello gli rende il fuoco

// src/components/pannello/indirizzi.ts (Task 6)
export function leggiDestinazione(search: string): DestinazionePannello | null; // null se il parametro manca; sconosciuto → 'cima'
export function indirizzoPannello(pathname: string, dest: DestinazionePannello): string; // `${pathname}?impostazioni=${dest}`
export interface OriginePannello { pathname: string; sotto: 'cima' | 'ingredienti' }
export function salvaOrigine(o: OriginePannello): void;   // sessionStorage 'spesa:origine-pannello'
export function leggiOrigine(): OriginePannello | null;
export function indirizzoRitorno(): string;               // dall'origine, o '/lista?impostazioni=cima'
export function salvaScrollPannello(dest: DestinazionePannello, px: number): void; // 'spesa:pannello-scroll:{dest}'
export function prendiScrollPannello(dest: DestinazionePannello): number | null;   // legge e cancella

// src/components/pannello/PannelloProvider.tsx (Task 6)
export interface ContestoPannello {
  aperto: boolean;
  sotto: SottoSchermata | null;
  apri(dest?: DestinazionePannello): void;                  // con animazione
  chiudi(): void;
  entra(s: SottoSchermata): void;
  torna(): void;
  mostraDialogo(d: PropsDialogo): void;                     // onConferma avvolta: riuscita → chiude il dialogo
  chiudiDialogo(): void;
  vaiA(href: string, origine: OriginePannello): void;       // salva l'origine, chiude tutto, poi naviga
}
export function PannelloProvider(p: { children: ReactNode }): JSX.Element;
export function usePannello(): ContestoPannello;            // fuori dal provider: un contesto inerte
export function usePannelloInterno(): { dialogo: PropsDialogo | null; istantaneo: boolean; scroll: number | null; scrollUsato(): void }; // solo Pannello e Guscio
// `?impostazioni=` si legge da window.location.search al montaggio e a ogni cambio di pathname,
// e si toglie con window.history.replaceState(null, '', pathname) PRIMA di aprire il pannello
// (non router.replace): le voci che l'hook mette dopo nascono sull'indirizzo pulito.

// src/components/pannello/DatiPannello.tsx (Task 6)
export interface DatiPannello {
  impostazioni: Impostazioni;
  slotDefs: MealSlotDef[];
  casa: StatoCasa | null;            // null se la lettura della casa fallisce (§C.7, 26)
  risparmio: RiassuntoEvitato | null;
  utente: { nome: string; email: string };
}
export type StatoDati = { stato: 'carico' } | { stato: 'errore' } | { stato: 'pronto'; dati: DatiPannello };
export function DatiPannelloProvider(p: { children: ReactNode }): JSX.Element;
// Uno per tutto il pannello: il Guscio lo monta attorno a <Pannello />, dentro PannelloProvider.
export function useDatiPannello(): {
  stato: StatoDati;
  ricarica(): void;
  salvaImpostazioni(parziale: Partial<Impostazioni>): Promise<boolean>;
  salvaPasti(defs: MealSlotDef[]): Promise<boolean>;
  // Tornano false SOLO quando la riga deve mostrare «Non siamo riusciti a salvare. Riprova.»:
  // una richiesta superata da una più recente e un rifiuto RLS tornano true. Ottimistici, in
  // fila (una coda per entrambi). Se salvaPasti fallisce, i pasti si rileggono dal server
  // (salvaSlotDefs non è atomico); la copia locale solo se anche la rilettura fallisce.
  casaCambiata: boolean;             // vero dopo un rifiuto RLS, fino al prossimo salvataggio; si spegne a ogni apertura
  ricaricaCasa(seFallisce?: StatoCasa): Promise<void>; // non rigetta: se la rilettura fallisce vale seFallisce, se c'è
  cancellataIl: Date | null;         // Cancella la dispensa riuscita (§D); null a ogni chiusura del pannello
  segnaCancellata(quando: Date): void;
};
export function StatoDatiPannello(p: { children: (dati: DatiPannello) => ReactNode }): JSX.Element;
// CARICO… (role status) o l'errore di caricamento con RIPROVA, e coi dati pronti i figli. Lo
// usano la cima e le sotto-schermate che vivono solo dei dati del pannello (Pasti a casa,
// Gestione dei pasti, Rotazione, Cadenza). Dal Task 7 disegna con Carico ed ErroreCaricamento di pezzi.tsx.

// src/components/pannello/PiedePannello.tsx (Task 6)
export function PiedePannello(p: { children: ReactNode }): JSX.Element | null; // portal nel piede fisso; null fuori dal pannello

// src/components/pannello/schermate.tsx (Task 6, riempito dai Task 7–10)
export const CIMA: ComponentType;    // il contenuto della cima: gli stati dei dati nel Task 6, `Cima` dal Task 7
export const SCHERMATE: Record<SottoSchermata, { titolo: string; Componente: ComponentType }>;

// src/components/pannello/Pannello.tsx (Task 6)
export function Pannello(): JSX.Element;
export const DURATA_USCITA_MS = 200;

// src/components/pannello/RigaImpostazione.tsx (Task 7)
export function RigaImpostazione(p: {
  nome: string;
  nota?: ReactNode;
  finale:
    | { tipo: 'valore'; valore: string; onApri: () => void }
    | { tipo: 'campo'; campo: ReactNode }
    | { tipo: 'azione'; onAzione: () => void; tono?: 'errore' }
    | { tipo: 'niente' };
  errore?: string | null;
}): JSX.Element;
// src/components/pannello/pezzi.tsx (Task 7): ERRORE_SALVATAGGIO, TESTO_ERRORE_IMPOSTAZIONI,
// STILE_BLOCCO, BloccoGruppo, Nota, Carico, AvvisoCasaCambiata, ErroreCaricamento, TondoIcona,
// IconaFreccia, IconaCroce. L'aiuto di test: __tests__/finti.ts e __tests__/aiuti.tsx (Task 7).

// src/data/utente.ts (Task 6)
export async function leggiUtente(): Promise<{ nome: string; email: string }>; // nome = user_metadata.nome o email prima della @; non lancia
export function useUtente(): { nome: string; email: string } | null;         // null finché getUser non risponde
export function inizialeDi(nome: string): string;                            // '·' senza nome
export function dimenticaIniziale(): void;                                   // azzera la cache di useUtente (la chiama esci())
// Escono useIniziale e leggiIniziale. Il Menù utente, prima che il nome sia letto, si chiama
// `Profilo e impostazioni`; poi `{Nome}: profilo e impostazioni`.

// src/components/Testata.tsx (Task 11)
indietro?: { etichetta: string; ariaLabel: string; onTorna: () => void };

// src/app/(app)/piatti/da.ts (Task 11)
export type DaPiatti = 'impostazioni' | 'lista' | 'piano';
export function leggiDaPiatti(search: string): DaPiatti; // URL, poi sessionStorage 'spesa:piatti-da', poi 'impostazioni'; scrive sessionStorage se lo trova nell'URL
```

---

### Task 1: `DESIGN.md`, token, CSS del pannello e dell'avvio, registro

Il design system cambia prima del codice (spec §K). Nessun codice di schermata in questo task:
solo `DESIGN.md`, i due file di token, le classi CSS che i Task 6, 11 e 14 usano, e il registro
dell'esecuzione.

**La scelta sulla tab bar.** `.barra` passa **qui** a larghezza propria, centrata (304 / 244),
mentre `TabBar.tsx` resta a quattro voci fino al Task 11. Regge perché le voci restano
`flex: 1 1 0` con un **tetto** `max-width: var(--barra-voce-larga)`:
- con le quattro voci di oggi ogni voce è larga (304 − 2 × 6 − 3 × 2) / 4 = **71,5** a barra
  grande e (244 − 18) / 4 = **56,5** a barra ridotta: sopra 44, e `DISPENSA` in mono 8,5 con
  0,12em sta in circa 49 px [calcolo: 8 caratteri × (8,5 × 0,6 + 1,02)];
- con le tre voci del Task 11 ogni voce è larga (304 − 12 − 4) / 3 = **96** e (244 − 16) / 3 =
  **76**, cioè esattamente le misure della spec §G.1: il tetto non morde, e il Task 11 non tocca
  il CSS.

La scelta va nel registro (Step 16).

**Files:**
- Modify: `design/sistema/DESIGN.md`
- Modify: `design/sistema/tokens.css`
- Modify: `src/app/globals.css`
- Modify: `src/app/__tests__/token.test.ts`
- Create: `docs/2026-09-25-fase5-decisioni-esecuzione.md`

**Interfaces:**
- Consumes: niente.
- Produces:
  - token (in `tokens.css` e `globals.css`, stessi valori): `--barra-larga: 304px`,
    `--barra-larga-giu: 244px`, `--barra-voce-larga: 96px`, `--barra-voce-larga-giu: 76px`,
    `--z-pannello: 70`; in `globals.css` entrano anche `--pannello-alto: 76px` e
    `--pannello-velo: rgba(20, 22, 58, 0.55)`, che `tokens.css` ha già. Escono `--barra-lato` e
    `--barra-lato-giu`.
  - classi del pannello (Task 6): `.pannello-velo`, `.pannello`, `.pannello-testata`,
    `.pannello-corpo`, `.pannello-piede`; stato con `data-stato="aperto" | "chiuso"` su velo e
    pannello; `data-istantaneo` (attributo presente = niente transizioni) su velo, pannello e
    `.guscio`; `.guscio[data-pannello="aperto"] .guscio-main` per la scala dell'app dietro;
    `.anim-sotto-entra`, `.anim-sotto-esce` per le sotto-schermate.
  - classi dell'avvio (Task 14), coi nomi che il Task 14 usa: `.anim-avvio-casella` (il pop;
    il ritardo va inline in `animationDelay`), `.anim-avvio-fondo-via`, `.anim-avvio-dissolto`,
    `.anim-avvio-volo`, `.anim-avvio-svanisce`, `.anim-avvio-nascosto`, `.anim-avvio-rivela`,
    `@keyframes pb`, e la cintura `[data-avvio] { display: none; }` con `reduce`. Il livello
    (`position: fixed`, z 100, `pointer-events: none`) e il volo (`transform`) li scrive il
    Task 14 inline nel componente.
  - il registro `docs/2026-09-25-fase5-decisioni-esecuzione.md`, con la tabella di migrazione
    dei test.

- [ ] **Step 1: `DESIGN.md`, testa e §2.** In `design/sistema/DESIGN.md`:

  1. Alla riga 3 sostituisci `**Versione 3, aggiornata il 23/09/2026.**` con
     `**Versione 3, aggiornata il 25/09/2026 (fase 5: Impostazioni).**`.
  2. In §2.2, nella tabella, sostituisci la riga di `--errore` con:

```markdown
| `--errore` | `#C4423E` | errori di validazione, caricamento, scrittura; fondo del tasto distruttivo; **nome della riga `Esci`** nel Pannello impostazioni (eccezione dichiarata il 25/09: l'azione non è distruttiva, e nel suo dialogo il tasto è in `--ink`, §8 Dialogo di conferma) | 5,0:1 |
```

  3. In §2.5 sostituisci la riga `0,04` con la prima qui sotto, la riga `0,07` con la seconda, e
     aggiungi la terza dopo la riga di `0,62` su bianco che dice `tempo di registrazione nello
     stato "Registro"`:

```markdown
| `0,04` su `--ink` | fondo delle voci del Foglio dal basso e dei tasti di «Rivedi i fogli presi», delle righe di scadenza e di proposta, delle tessere dei Pronti, dell'esito della scansione e dei tondi della testata dei fogli della Dispensa; dal 25/09 anche dei tondi di Gestione dei pasti e di Ordine delle aree, del riquadro del ciclo in Rotazione del piano e del riquadro del codice della casa |
| `0,07` su `--ink` | voce attiva della tab bar, fondo del Menù utente, tondi della testata del Pannello impostazioni (X e freccia), pillola della Testata in modo indietro |
| `0,62` su bianco | contorno del pallino vuoto della Striscia dei giorni sul giorno selezionato |
```

- [ ] **Step 2: `DESIGN.md` §3.** Dopo il paragrafo che comincia con `**Mono 16** è ammesso in un
  punto solo` aggiungi:

```markdown
**Mono 21 / 700 / 0,16em** è ammesso in un punto solo (dal 25/09): il codice della casa
condivisa, otto caratteri nel riquadro del codice. È un codice da leggere e dettare lettera per
lettera, non un testo.
```

- [ ] **Step 3: `DESIGN.md` §4.** Nella tabella sostituisci la riga della tab bar e aggiungi
  quella del pannello subito dopo la riga `| Foglio dal basso | 16 / 16 / 26 |`:

```markdown
| Tab bar flottante | larga 304 (244 ridotta), centrata, 22 dal fondo, padding 6, gap 2 |
```

```markdown
| Pannello impostazioni | testata `16 16 12`; corpo `0 12 26`, gap 12; piede fisso `12 16 26`; piede di versione `12 18 26` |
```

  Poi sostituisci **per intero** il paragrafo che comincia con `**La cornice: 375 × 812,
  riferimento e minimo supportato.**` (fino a `…non è reso in nessuno di quei file.`) con:

```markdown
**La cornice: 375 × 812, riferimento e minimo supportato; 360 per le schermate coi pasti.**
Ogni misura di questo documento si verifica in una cornice da **375 × 812**, che è anche la
**larghezza minima che Dispesa dichiara di supportare**: sotto i 375 px una schermata può
sbordare e non è un difetto da riparare. **Con un'eccezione, dal 25/09** (fase 5, decisione 7):
le schermate coi pasti reggono **360**. La Matrice dei pasti, la Striscia dei giorni e il
giorno del Piano, da tre a sei pasti, a 360 px non sbordano e non hanno celle sotto 44. La
cornice del dispositivo dei mockup resta **393 × 852** (§5, raggio 26): è il telaio in cui i
file di disegno sono resi, non la larghezza su cui si giudica se una schermata regge.

**Il gap 2 dei pallini non c'è più.** Fino al 25/09 i pallini della striscia stavano in fila, e
a 360 con sei pasti la striscia sbordava col gap 3 (di 0,36 px per lato, misurato il 21/09):
il codice scendeva a gap 2 solo a sei pasti. Dal 25/09 i pallini stanno in una griglia a tre
colonne (§8 Striscia dei giorni), larga 21 px (3 × 5 + 2 × 3) su un giorno largo 44,3 a 360
[misurato sul disegno, frame 27]: il gap torna 3 per tutti, e la deroga decade.
```

- [ ] **Step 4: `DESIGN.md` §5.**

  1. Sostituisci `**Cinque raggi, più due eccezioni dichiarate:**` con
     `**Cinque raggi, più tre eccezioni dichiarate:**`.
  2. Nella tabella dei raggi sostituisci le righe `22` e `18`, e aggiungi la riga `11,2` dopo
     quella di `2,52`:

```markdown
| 22 | schede grandi, Tessera widget di sezione, Pannello impostazioni (`22px 22px 0 0`, dal 25/09), fogli dal basso (`22px 22px 0 0`), Banda dei comandi (`22px 22px 0 0`), contenitore del Dock, stato vuoto |
| 18 | tasti da 54 px, schede medie, riga di controllo, riga pasto, Blocco di gruppo del pannello, tessere del pannello |
```

```markdown
| **11,2 — eccezione** | **le caselle del Marchio grande dell'animazione d'avvio** (lato 40, dal 25/09). È la formula `lato × 0,28` di 2,52 e di 4, applicata a un lato più grande. Nessun altro oggetto usa 11,2. |
```

  3. Nella tabella dei bordi sostituisci la riga `1,5 px` con:

```markdown
| 1,5 px `--ink` | stato selezionato, avviso sulla riga di revisione. Sopra l'anteprima fotocamera lo stesso spessore è bianco al 62%. Il Pannello impostazioni **non ha più bordo** dal 25/09: sta a tutta larghezza, e lo stacca `--ombra-alta` |
```

  4. Nella tabella delle ombre sostituisci le righe di `--ombra-casetta` e `--ombra-pannello`:

```markdown
| `--ombra-casetta` | `0 1px 3px rgba(20,22,58,0.28)` | casetta piena della riga pasto, cella a casa della Matrice dei pasti |
| `--ombra-pannello` | `0 1px 2px rgba(20,22,58,.05), 0 6px 16px rgba(20,22,58,.06)` | Tessera widget di sezione, Riga piatto, campi, celle della striscia, Blocco di gruppo, tessere del Pannello impostazioni |
```

- [ ] **Step 5: `DESIGN.md` §6, coerenza.** La barra perde una voce, e §6 conta le icone.
  Sostituisci la frase `e **le quattro icone della tab bar**, che dal 19/09 sono piene: a 26 px,
  appoggiate su bianco e in mezzo a quattro nomi, il tratto si perdeva.` con:

```markdown
e **le icone della tab bar**, che dal 19/09 sono piene: a 26 px, appoggiate su bianco e in
mezzo ai nomi, il tratto si perdeva. Dal 25/09 la barra ha tre voci: le icone piene sono Piano
e Dispensa, accanto al Marchio della Lista.
```

- [ ] **Step 6: `DESIGN.md` §7.**

  1. Sostituisci la voce `**`.anim-barra`**` (da `- **`.anim-barra`** — la tab bar che si
     restringe` a `scroll. **[aggiunto 19/09]**`) con:

```markdown
- **`.anim-barra`** — la tab bar che si restringe e il Dock che la segue, **200 ms**
  `cubic-bezier(.2,.8,.25,1)`, opacità delle etichette in 150 ms lineari. Si animano `width` e
  `height` della pillola (dal 25/09; prima `left` e `right`). Il gesto è lo **scorrimento**:
  soglia 8 px per cambiare stato, ritorno a barra grande sotto i 4 px di scroll. **[aggiunto
  19/09]**
```

  2. Dopo il paragrafo `Queste tre, con `.anim-registro`, sono le **uniche animazioni in loop**…`
     (quello che finisce con `…con `role="status"`.`) aggiungi:

```markdown
- **`.anim-pannello`** — il Pannello impostazioni (dal 25/09). **Apertura, 250 ms**
  `cubic-bezier(.2,.8,.25,1)`: il pannello da `translateY(100%)` a 0, il velo da opacità 0 a 1
  in 200 ms lineari, l'app dietro (`.guscio-main`) da `scale(1)` a `scale(.96)` con
  `transform-origin: 50% 0`. **Chiusura, 200 ms** `cubic-bezier(.4,0,1,1)`, al contrario, col
  velo in 180 ms; alla fine il pannello va a `visibility: hidden` e il fuoco torna al Menù
  utente. **Sotto-schermate:** entrano da destra, `translateX(24px)` e opacità in 200 ms, ed
  escono verso destra con la freccia. **Aperto da un indirizzo** (`?impostazioni=`, il ritorno
  da una pagina piena) il pannello compare già aperto, senza salita: il gesto di chi torna è la
  freccia della pagina che lascia. Con `prefers-reduced-motion: reduce`: solo opacità in 120 ms,
  e l'app dietro non si scala. **Eccezione dichiarata:** la curva di chiusura
  `cubic-bezier(.4,0,1,1)` è l'unica curva d'autore oltre a quella della barra.
- **`.anim-avvio`** — **eccezione dichiarata** (25/09): all'apertura dell'app, solo su `/lista`
  e una volta per sessione di navigazione, il Marchio si compone al centro e vola sull'icona
  della Lista in tab bar. Dura **2,1 s** e non segue un gesto: è ammessa perché accade una volta
  sola, all'apertura, ed è il marchio. Un livello fisso sopra tutto, che non prende tocchi, col
  fondo a gradiente (§2.4) e il Marchio grande al centro (§8 Marchio). I tempi:
  0–1045 ms ogni casella fa il pop `pb` (620 ms lineari, scala `0 → 1,32 (40%) → 0,93 (62%) →
  1,05 (80%) → 0,99 (92%) → 1`, opacità 0 → 1 entro il 40%, ritardi in ordine di griglia
  `0, 340, 170, 255, 85, 425` ms); 1045–1200 pausa; 1200–1820 il Marchio va al suo posto in
  620 ms `cubic-bezier(.2,.8,.25,1)`, e negli ultimi 120 ms si dissolve in quello della barra;
  1200–1620 il fondo del livello si dissolve e la Lista, già pronta sotto, si vede; a 2100 ms
  il livello si smonta. **Non ritarda niente:** la Lista carica sotto come sempre. Con
  `prefers-reduced-motion: reduce` non parte: il Marchio è già al suo posto.
```

  3. Sostituisci il paragrafo `Vietati: animazione d'ingresso della pagina, parallax, cascate,
     contatori animati, e qualunque animazione che ritardi un'azione dell'utente.` con:

```markdown
Vietati: animazione d'ingresso della pagina, parallax, cascate, contatori animati, e qualunque
animazione che ritardi un'azione dell'utente. L'avvio del Marchio non è un ingresso della Lista:
è un livello sopra di lei, che la Lista non aspetta, e la Lista non ha un'animazione propria.
```

  4. Sostituisci il paragrafo `**Direzione aperta (Andrea, 17/09, ancora aperta).**…` (fino a
     `…una delle quali non tocca il riempimento delle caselle.`) con:

```markdown
**Direzione del moto (Andrea, 17/09; chiusa per il Marchio il 25/09).** Il carattere del moto
può diventare più dinamico senza esagerare: durate sempre 150–250 ms, mai un'animazione senza
gesto. Il Marchio, che era il primo candidato, ha la sua animazione dal 25/09: l'avvio
(`.anim-avvio`), scelto fra cinque varianti (la 3a, «Pop elastico»), con l'arrivo sulla tab bar
deciso da Andrea.
```

- [ ] **Step 7: `DESIGN.md` §8, Testata, Menù utente, Tab bar, Marchio, Dock, Tasti.**

  1. **Testata.** Sostituisci l'ultima frase della voce, `Modalità `indietro`: freccia 20 px a
     sinistra, niente Menù utente.`, con:

```markdown
**Modalità indietro** (dal 25/09), per le pagine piene aperte dal Pannello impostazioni o dagli
stati vuoti: niente Menù utente; in cima una **pillola** alta 44 su `rgba(20,22,58,0.07)`,
raggio 999, padding `0 16 0 10`, gap 6, con la freccia 20 (tratto 1,8) e un'etichetta mono
11/700/0,08em che dice **dove porta**: `IMPOSTAZIONI`, `LISTA` o `PIANO`. L'`aria-label` lo dice
per intero: `Torna alle impostazioni`, `Torna alla lista`, `Torna al piano`. Sotto, il titolo
52, a 12 dalla pillola. La freccia sola con `aria-label="Indietro"` non c'è più.
```

  2. **Menù utente.** Sostituisci il punto `- **Misure e accesso:**…` con:

```markdown
- **Misure e accesso:** un solo bersaglio 81 × 50, un `button` con
  `aria-label="{Nome}: profilo e impostazioni"`, `aria-expanded` e `aria-controls` che punta al
  pannello. `{Nome}` è il nome del profilo se c'è, altrimenti la parte dell'email prima della
  `@`. Apre il **Pannello impostazioni**; un secondo tocco lo chiude.
```

  3. **Tab bar.** Sostituisci **per intero** la voce (dal titolo `### Tab bar` fino a `…Su
     Importa nessuna voce è attiva.`) con:

```markdown
### Tab bar
Pillola bianca **flottante e centrata** (`left: 0; right: 0; margin: 0 auto`), larga **304**,
`bottom 22`, altezza **84**, raggio 999, padding 6, gap 2, `--ombra-nav`. **Tre voci** da
**96 × 72**, in colonna, gap 4, raggio 999; attiva su `rgba(20,22,58,0.07)`. (Dal 25/09: prima
erano quattro voci `flex: 1` su una pillola a 16 dai lati.)

- **Ordine e nomi:** **Lista · Piano · Dispensa**. Piatti esce dalla barra il 25/09: è una
  pagina piena, aperta da una tessera del Pannello impostazioni e dagli stati vuoti di Lista e
  Piano. `SETTIMANA` non esiste più: la sezione si chiama **Piano** perché è la pianificazione
  dei pasti, e la settimana è il periodo, che lo dice la pillola sotto il titolo.
- **Icone 26 px, piene**; spente `#9A9AA6`, accesa `--ink`. Il segno sta in uno `.segno` ad
  **altezza fissa 26**, così le icone e il Marchio hanno la stessa linea di base e i tre nomi
  sono allineati fra loro.
- **Etichette** mono **8,5 / 0,12em**, spente `--off` a 500, accesa `--ink` a 700, rese
  maiuscole da `text-transform`.
- **Stato ridotto:** scorrendo giù la barra diventa larga **244** e alta **66**, voci **76 ×
  54**; le etichette vanno a `max-height: 0; opacity: 0` ma **restano cliccabili**. Si animano
  `width` e `height`, 200 ms, `cubic-bezier(.2,.8,.25,1)`; `--fine` passa da 128 a 110.
- **L'icona della Lista è il Marchio**, non un'icona di lista: deciso esplicitamente.
- **Nessuna voce attiva** su Piatti, Importa e nell'editor dell'ingrediente. Col Pannello
  impostazioni aperto la barra è **coperta**: la navigazione è sospesa finché il pannello è
  aperto. Nell'editor dell'ingrediente, come nella fotocamera, la barra non c'è.
```

  4. **Marchio.** Dopo il punto `- Nelle **rese grandi**…` aggiungi:

```markdown
- Nell'**animazione d'avvio** (§7 `.anim-avvio`, dal 25/09): lato **40**, gap **10**, raggio
  **11,2** (§5, eccezione), bordo 2, `box-sizing: border-box`, tutte e sei le caselle piene.
  Atterra sul Marchio della tab bar; il rapporto fra gap e lato non è quello della barra (10/40
  contro 4/9), e per questo negli ultimi 120 ms si dissolve in lui invece di coincidere.
```

  5. **Dock.** Dopo il punto `- **Posizione:**…` aggiungi:

```markdown
- **Senza tab bar** (dal 25/09: l'editor dell'ingrediente, che la nasconde come la fotocamera)
  il Dock scende a `bottom 22`, il distacco della barra dal fondo.
- **Dentro il Pannello impostazioni il Dock non c'è:** sta sotto il pannello, coperto. I tre
  primari del pannello vivono nel suo piede fisso (§8 Pannello impostazioni).
```

  6. **Tasti.** Nel punto `- **Aggiungi tratteggiato**…` sostituisci la frase `Sta **in cima**
     alla lista che popola (`Nuovo piatto`), non in fondo.` con:

```markdown
Sta **in cima** alla lista che popola (`Nuovo piatto`), non in fondo. Eccezione dichiarata
(25/09): `AGGIUNGI PASTO` in Gestione dei pasti sta **in fondo** al blocco, perché il pasto
nuovo nasce in fondo all'elenco, e l'elenco è nell'ordine in cui i pasti si fanno.
```

- [ ] **Step 8: `DESIGN.md` §8, Riga di controllo, Striscia, Pannello, Riga di impostazione,
  Matrice, Dialogo di conferma.**

  1. **Riga di controllo.** Sostituisci `(`controllo ogni 4 settimane` — la cadenza è
     configurabile, non più fissa a 90 giorni)` con:

```markdown
(`CONTROLLO OGNI MESE`, `CONTROLLO OGNI 2 MESI` o `CONTROLLO OGNI 3 MESI`: la cadenza si sceglie
nel Pannello impostazioni, Cadenza dei controlli, e di default è ogni 3 mesi)
```

  2. **Striscia dei giorni.** Sostituisci la frase `Dentro: sigla del giorno mono 8.5/700/0.08em
     in `--ter`, numero 15/800, e sotto un pallino da 5 px per pasto (pieno se quel pasto è a
     casa e ha un piatto).` con:

```markdown
Dentro: sigla del giorno mono 8.5/700/0.08em in `--ter`, numero 15/800, e sotto **un pallino da
5 px per pasto, in una griglia a tre colonne con gap 3** (dal 25/09): fino a tre pasti una riga,
da quattro a sei due righe, e la prima riga è sempre piena; da quattro pasti il riquadro cresce
di 8. Il pallino è **pieno** in `--ink` (bianco sul giorno selezionato) se quel pasto è a casa e
ha un piatto, **vuoto** a contorno 1 px `rgba(20,22,58,0.20)` (bianco a 0,62 sul selezionato)
se no. A 360 ogni giorno è largo 44,3 e la griglia occupa 21.
```

  3. **Pannello impostazioni.** Sostituisci **per intero** la voce (dal titolo `### Pannello
     impostazioni` fino a `…finché è aperto non si naviga.`) con:

```markdown
### Pannello impostazioni
**Nuovo il 19/09, ridisegnato il 25/09 (fase 5).** Le Impostazioni **non sono una schermata**:
sono un pannello che esce dal Menù utente, sopra la pagina in cui si è. È un componente del
guscio dell'app, non una pagina.

- **Anatomia:** **a tutta larghezza**, `top 76`, `left 0`, `right 0`, `bottom 0`, raggio
  `22 22 0 0`, **senza bordo**, fondo `--fondo` pieno, `--ombra-alta`, z-index 70
  (`--z-pannello`): sopra tab bar e Dock. Velo dietro `rgba(20,22,58,0.55)`, che chiude.
  `role="dialog"`, `aria-modal="true"`, `aria-labelledby` sul titolo.
- **Testata**, fissa: padding `16 16 12`, gap 10. In cima il titolo di dettaglio 32/800
  `Impostazioni` e, a destra, il tondo 44 su `rgba(20,22,58,0.07)` con la X 18
  (`aria-label="Chiudi le impostazioni"`). In una sotto-schermata il tondo 44 su 0,07 ha la
  freccia 20 e sta **a sinistra** del titolo (`aria-label="Torna alle impostazioni"`), il titolo
  è quello della sotto-schermata, e la X non c'è.
- **Corpo:** l'unico che scorre, padding `0 12 26`, gap 12. La maschera sfuma solo gli ultimi
  26 px, cioè il padding: la barra è coperta, e `--fine` qui non serve.
- **Due livelli.** In cima le funzioni che si usano ogni tanto: **quattro tessere** in griglia
  2 × 2 sul fondo del pannello, senza Blocco attorno (gap 8, minimo 104, raggio 18, bianche,
  `--bordo`, `--ombra-pannello`, padding `12 14 13`; nome 17/700, nota 12,5 in `--testo-2`;
  nessuna icona, nessun contatore): `Piatti`, `Importa un piano`, `Casa condivisa` (col valore
  in mono 11), `Esporta i tuoi dati`. Poi il separatore `SI CAMBIANO DI RADO`, etichetta mono 10
  in `--testo-2` col suo filetto `--bordo`, e sotto le impostazioni che si cambiano di rado:
  cinque **Blocchi di gruppo** (bianco, raggio 18, bordo 1 px `--bordo`, padding `12 / 12 / 10`,
  `--ombra-pannello`) di Righe di impostazione: `La settimana di base`, `Come calcolo la lista`,
  `Come la vedi in corsia`, `I tuoi dati`, `Account`.
- **Piede di versione**, in fondo al corpo: `Versione {x}` in mono, padding `12 18 26`.
  «Ultimo salvataggio» non c'è: non è un dato che esiste.
- **Sotto-schermate.** **[deciso 20/09, rese il 25/09]** Le funzioni con un contenuto proprio
  vivono in sotto-schermate dello stesso pannello, raggiunte da una riga o da una tessera e
  lasciate con la freccia: `Pasti a casa` · `Gestione dei pasti` · `Rotazione del piano` ·
  `Ingredienti` · `Ordine delle aree` · `Cadenza dei controlli` · `Casa condivisa` · `Esporta i
  tuoi dati`. Un livello solo: nessuna sotto-schermata ne apre un'altra. Piatti, Importa e
  l'editor dell'ingrediente sono **pagine piene**: si lascia il pannello, e la freccia della
  pagina lo riapre sopra la pagina da cui si era partiti.
- **Piede fisso col primario** — eccezione dichiarata alla regola del Dock: in tre
  sotto-schermate (`Ordine delle aree`, `Esporta i tuoi dati`, `Casa condivisa`) il primario
  (`SALVA ORDINE`, `PREPARA IL FILE`, `CREA UN CODICE`) sta in un piede del pannello, fuori dallo
  scorrimento, sopra un filetto `--bordo`, padding `12 16 26`. Il Dock sta sotto il pannello e
  non si vede.
- **La riga `Esci` è accesa** dal 25/09: il logout esiste. È una riga d'azione nel gruppo
  Account, col nome in `--errore` (§2.2), e passa dal Dialogo di conferma col tono primario.
- **Stati.** Caricamento: testata e tessere già disegnate e toccabili, al posto dei blocchi
  `CARICO…` in mono `--sec` con `role="status"`. Errore di caricamento: le tessere restano, al
  posto dei blocchi un Blocco con `Non riusciamo a caricare le impostazioni. Controlla la
  connessione e tocca RIPROVA.` e la pillola `RIPROVA`. Errore di salvataggio: §8 Riga di
  impostazione.
- **Il pannello copre la tab bar**, di proposito: finché è aperto non si naviga. Si chiude con
  la X, col velo, col Menù utente e col gesto indietro, che scende di un livello alla volta
  (dialogo → sotto-schermata → cima → chiuso). Movimento in §7, `.anim-pannello`.
```

  4. **Riga di impostazione.** Sostituisci **per intero** la voce (dal titolo `### Riga di
     impostazione` fino a `**Niente switch**, in nessuna forma.`) con:

```markdown
### Riga di impostazione
**Nuova il 19/09.** Minimo **56**, raggio 14, senza fondo proprio, dentro un Blocco di gruppo.
Nome 15/700/-0.024em, nota 12,5 in `--testo-2`. A destra **uno di quattro finali**:

1. **valore + chevron** — valore in mono 11/700 maiuscolo: la riga apre una sotto-schermata
   (`{N} FUORI CASA`, `{N} PASTI`, `NESSUNA` / `{N} SETT.`, `OGNI 3 MESI`, `PERSONALIZZATO` /
   `DI BASE`);
2. **coppia `Sì` / `No`** da 44, `aria-pressed`;
3. **campo numerico** 78 × 44 con l'unità in mono 10: dal 25/09 è `Per quante persone cucini`,
   unità `PERS`, da 1 a 4. Salva all'uscita dal campo e con Invio; fuori intervallo, o se non è
   un intero, torna al valore di prima e sotto la riga compare `Scrivi un numero da 1 a 4.`.
   Lo stepper `−` / `+` non c'è più;
4. **niente** — la riga è un'azione (`Cancella la dispensa`, `Esci`). Il nome di `Esci` è in
   `--errore` (§2.2).

Una riga informativa (nome ed email nel gruppo Account) non ha finale e non è un bersaglio.
**Errore di salvataggio** (dal 25/09): il valore torna a quello di prima e sotto la riga
compare `Non siamo riusciti a salvare. Riprova.` in 12,5 `--errore`, con `role="alert"`; non c'è
RIPROVA: si rifà il gesto, e l'errore sparisce al gesto successivo.

**Niente switch**, in nessuna forma.
```

  5. **Matrice dei pasti.** Sostituisci **per intero** la voce (dal titolo `### Matrice dei
     pasti` fino al punto che finisce con `…e il riepilogo che si ricalcola.`) con:

```markdown
### Matrice dei pasti
**Nuova il 19/09, riorientata il 20/09, ridisegnata il 25/09.** È la sotto-schermata `Pasti a
casa` del pannello: dice con quali pasti nasce ogni settimana nuova.

- **Orientamento [deciso 20/09]: i pasti in riga, i giorni in colonna.** Il prodotto ammette
  **da 3 a 6 pasti**: il numero di pasti fa crescere l'altezza, che scorre, e la larghezza resta
  quella dei sette giorni.
- **Misure [25/09]:** la fila delle sigle `L M M G V S D` sta **una volta sola in cima**, mono
  8.5/700/0.08em in `--ter`, in `position: sticky`; il nome del pasto è un'etichetta mono 10 su
  riga propria sopra le sue sette celle. La matrice occupa la larghezza piena del corpo del
  pannello, senza Blocco di gruppo. Sette celle `flex: 1`, gap 4, alte **44**, raggio 14. **A
  360** il corpo è largo 336 (360 − 2 × 12) e le celle `(336 − 6 × 4) / 7` = **44,6**; a 375
  sono 46,7, a 393 sono 49,3.
- **Stati:** **a casa** = fondo `--ink`, `--ombra-casetta`, la **casetta bianca 16** (la stessa
  della Riga pasto); **fuori** = bianca, bordo 1 px `--bordo`, vuota. `aria-pressed`;
  `aria-label="{Giorno} {pasto}: di base a casa, tocca per mettere fuori casa"`, e dalla cella
  fuori `…: di base fuori casa, tocca per mettere a casa`. Salva al tocco.
- **Nessuna cella sotto 44 px, in nessuna delle due dimensioni.** Se un giorno la larghezza non
  bastasse più, la matrice scorre in orizzontale: non si rimpiccioliscono le celle.
- Sotto, la nota `La casetta vuol dire che quel pasto lo fai a casa. Ogni settimana nuova nasce
  così: nel Piano puoi correggere il singolo giorno senza cambiare questo default.` e il
  riepilogo che si ricalcola.
```

  6. **Dialogo di conferma.** Sostituisci **per intero** la voce (dal titolo `### Dialogo di
     conferma` fino a `Il velo **non** chiude.`) con:

```markdown
### Dialogo di conferma
**Nuovo il 25/09 (fase 4), generalizzato il 25/09 (fase 5):** è il componente `DialogoConferma`.
Secondo velo 0,35 sopra il foglio o il pannello, e un foglio piccolo ancorato in basso a tutta
larghezza, raggio `22 22 0 0`, padding `20 / 16 / 26`, gap 12, `role="alertdialog"`. Titolo
21/800, testo 14/1,5 in `--testo-2`, due tasti 54 `flex: 1` affiancati gap 8: `ANNULLA`
secondario a sinistra, l'azione a destra.

- **Due toni.** `distruttivo`: pieno in `--errore` con `--ombra-tasto` (Riparti, Togli, Esci
  dalla casa, Cancella la dispensa, Togliere un pasto con piatti, Elimina il lotto).
  `primario`: pieno in `--ink` con `--ombra-tasto` (Esci da Dispesa, che è reversibile: §9).
- **In volo** i due tasti vanno a 0,5 e `disabled`. Se l'azione fallisce, l'errore compare in
  12,5 `--errore` **sotto i tasti**, con `role="alert"`, e i tasti si riaccendono. Il dialogo si
  chiude solo quando l'azione riesce.
- Il velo **non** chiude: si esce da ANNULLA. (Il log del designer lo voleva come ANNULLA; resta
  com'era, spec fase 5 §N.) Sopra il Pannello impostazioni il dialogo sta a z-index 80.
```

- [ ] **Step 9: `DESIGN.md` §9 e §11.**

  1. In §9 sostituisci **per intero** il paragrafo che comincia con `**Conferme.**` (fino a
     `…reggono i pasti in programma.`) con:

```markdown
**Conferme.** Ogni azione distruttiva o non reversibile passa dal Dialogo di conferma a due
tasti: il distruttivo pieno in `--errore`, ANNULLA secondario accanto. **La conferma a doppio
tocco (`SICURO?`) non esiste più** dal 25/09: Riparti, Togli ed Esci dalla casa passano dal
dialogo. Le azioni reversibili non chiedono niente e si annullano rifacendo il gesto. Eccezioni
dichiarate:
- (23/09) togliere un foglio in «Rivedi i fogli presi» non chiede conferma. Il foglio si rifà
  con uno scatto, niente di salvato va perso, e un dialogo per ogni foglio renderebbe il
  riordino un lavoro;
- (25/09) eliminare un lotto Pronto chiede il dialogo: è cibo già cucinato e le sue porzioni
  impegnate reggono i pasti in programma;
- (25/09, fase 5) **Esci chiede conferma pur essendo reversibile**: i dati restano, ma per
  rientrare serve il link che arriva via email. Il tono del dialogo è `primario`, in `--ink`;
- (25/09, fase 5) **togliere un pasto chiede il dialogo solo se il pasto ha piatti**: la
  rimozione cancella a cascata i suoi piatti e le sue righe nel piano. Senza piatti si toglie al
  tocco.
```

  2. In §11 sostituisci la riga `- `aria-pressed` su ogni toggle e ogni segmento; `aria-expanded`
     sul Menù utente;` e la sua continuazione (fino a `Registro.`) con:

```markdown
- `aria-pressed` su ogni toggle e ogni segmento; `aria-expanded` e `aria-controls` sul Menù
  utente; `role="dialog"` con nome su ogni foglio; sul Pannello impostazioni `role="dialog"`,
  `aria-modal="true"` e `aria-labelledby` sul titolo; `role="alertdialog"` sul Dialogo di
  conferma; `role="status"` sul Registro e sugli stati in attesa.
```

- [ ] **Step 10: `DESIGN.md` §13.** In fondo al file aggiungi:

```markdown
### Decisioni del 25/09/2026 (fase 5: Impostazioni)

Dalla spec `docs/superpowers/specs/2026-09-25-impostazioni-design.md`, approvata da Andrea il
25/09. Le decisioni 1–7 sono di Andrea prima del disegno, 8–10 del designer, 11–16 di Andrea
dopo il disegno.

1. **Piatti esce dalla tab bar.** La barra ha tre voci, Lista · Piano · Dispensa; Piatti resta
   una pagina piena, aperta da una tessera del pannello (§8 Tab bar).
2. **Il pannello ha due livelli:** in cima le funzioni che si usano ogni tanto, sotto quelle che
   si cambiano di rado (§8 Pannello impostazioni).
3. **Nessuna funzione di oggi si perde** (deciso il 20/09): quelle con contenuto proprio sono
   sotto-schermate.
4. **Quattro funzioni nuove, vere:** Esci, Cancella la dispensa, Esporta i tuoi dati, Cadenza
   dei controlli (ogni mese, ogni 2 mesi, ogni 3 mesi; di default ogni 3 mesi).
5. Si tolgono `Arrotonda alle confezioni` e `Unità di misura`.
6. «Da quando usi Dispesa» va nel gruppo I tuoi dati.
7. **Da 3 a 6 pasti, a 360 px** (§4, §8 Matrice dei pasti, §8 Striscia dei giorni).
8. Riparti, Togli ed Esci dalla casa passano dal Dialogo di conferma, e `SICURO?` sparisce (§9).
9. Esci chiede conferma, con `ESCI` primario in `--ink` (§8 Dialogo di conferma, §9).
10. Da Piatti si torna con una pillola che riapre il pannello (§8 Testata).
11. Il pannello è un componente del guscio dell'app, non una pagina.
12. Togliere un pasto che ha piatti chiede un dialogo; senza piatti si toglie al tocco (§9).
13. Nel perimetro entrano la scansione nell'editor dell'ingrediente, l'animazione d'avvio del
    Marchio e `COPIA` accanto al codice della casa. La ricerca in Ingredienti resta fuori.
14. Le quattro proposte di testo del designer sono accettate: `SETTIMANA {k} DI {n}`, «nel
    Piano», «l'ordine delle aree», «Controlla la connessione e tocca RIPROVA.».
15. Il «finito» della Dispensa resta a due tocchi.
16. Nell'animazione d'avvio il Marchio atterra sull'icona della Lista in tab bar, non in
    testata (§7 `.anim-avvio`).

Eccezioni dichiarate da questa fase: 360 per le schermate coi pasti (§4); `.anim-pannello` con
la sua curva di chiusura e `.anim-avvio` (§7); raggio 11,2 (§5); mono 21 (§3); `--errore` sul
nome di `Esci` (§2.2); il piede fisso col primario nel pannello (§8 Pannello impostazioni);
`AGGIUNGI PASTO` in fondo (§8 Tasti); Esci che chiede conferma (§9).
```

- [ ] **Step 11: I test dei token e del CSS, che falliscono.** In `src/app/__tests__/token.test.ts`:

  1. nella tabella di `it.each` sostituisci `['--barra-lato', '16px'],` e
     `['--barra-lato-giu', '46px'],` con:

```ts
    ['--barra-larga', '304px'], ['--barra-larga-giu', '244px'],
    ['--barra-voce-larga', '96px'], ['--barra-voce-larga-giu', '76px'],
    ['--z-pannello', '70'], ['--pannello-alto', '76px'],
```

  2. in fondo al file aggiungi:

```ts
/**
 * I blocchi `@media (…) { … }` di una query, per controllare che un'animazione stia solo
 * dove DESIGN.md §7 la ammette. Stessa conta delle graffe di `blocchiRoot` in
 * scripts/token-check.ts.
 */
function blocchiMedia(testo: string, query: string): string[] {
  const blocchi: string[] = [];
  let da = testo.indexOf(`@media ${query}`);
  while (da >= 0) {
    let i = testo.indexOf('{', da) + 1;
    const inizio = i;
    let profondita = 1;
    while (i < testo.length && profondita > 0) {
      if (testo[i] === '{') profondita++;
      else if (testo[i] === '}') profondita--;
      i++;
    }
    blocchi.push(testo.slice(inizio, i - 1));
    da = testo.indexOf(`@media ${query}`, i);
  }
  return blocchi;
}

const MOTO = blocchiMedia(css, '(prefers-reduced-motion: no-preference)').join('\n');
const FERMO = blocchiMedia(css, '(prefers-reduced-motion: reduce)').join('\n');

/** Il corpo della prima regola con quel selettore a inizio riga (anche indentata). */
function regola(selettore: string): string {
  const esc = selettore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = css.match(new RegExp(`^\\s*${esc}\\s*\\{([^}]*)\\}`, 'm'));
  return m ? m[1] : '';
}

function conta(testo: string, cosa: string): number {
  return testo.split(cosa).length - 1;
}

describe('CSS della fase 5 (spec 25/09 §G.1, §B.1, §B.2, §J)', () => {
  it('la tab bar è centrata a larghezza propria: --barra-lato non esiste più', () => {
    expect(css).not.toContain('--barra-lato');
    const barra = regola('.barra');
    expect(barra).toContain('width: var(--barra-larga)');
    expect(barra).toContain('margin: 0 auto');
    expect(regola('.guscio[data-barra="ridotta"] .barra')).toContain('width: var(--barra-larga-giu)');
  });

  it('le voci hanno il tetto di 96 e 76: con tre voci sono esattamente quelle', () => {
    expect(regola('.barra-voce')).toContain('max-width: var(--barra-voce-larga)');
    expect(regola('.guscio[data-barra="ridotta"] .barra-voce')).toContain('max-width: var(--barra-voce-larga-giu)');
  });

  it('.anim-barra anima width e height, non più left e right', () => {
    const r = regola('.anim-barra');
    expect(r).toContain('width var(--moto-barra)');
    expect(r).toContain('height var(--moto-barra)');
    expect(r).not.toContain('left');
  });

  it('il pannello sta a --z-pannello, a tutta larghezza da --pannello-alto, senza bordo', () => {
    const p = regola('.pannello');
    expect(p).toContain('z-index: var(--z-pannello)');
    expect(p).toContain('top: var(--pannello-alto)');
    expect(p).toContain('border-radius: 22px 22px 0 0');
    expect(p).not.toContain('border:');
    expect(regola('.pannello-velo')).toContain('background: var(--pannello-velo)');
  });

  it('la salita del pannello e la scala dell\'app stanno solo col movimento permesso', () => {
    expect(MOTO).toContain('translateY(100%)');
    expect(FERMO).not.toContain('translateY(100%)');
    expect(conta(MOTO, 'scale(.96)')).toBe(conta(css, 'scale(.96)'));
    expect(MOTO).toContain('.guscio[data-pannello="aperto"] .guscio-main');
    expect(MOTO).toContain('@keyframes sotto-entra');
  });

  it('con reduce il pannello ha solo opacità in 120 ms', () => {
    expect(FERMO).toContain('.pannello { opacity: 0;');
    expect(FERMO).toContain('opacity 120ms linear');
  });

  it('l\'avvio: @keyframes pb e il pop solo col movimento permesso, e con reduce il livello non c\'è', () => {
    expect(conta(MOTO, '@keyframes pb')).toBe(1);
    expect(conta(css, '@keyframes pb')).toBe(1);
    expect(MOTO).toContain('.anim-avvio-casella { animation: pb 620ms linear both; }');
    expect(FERMO).toContain('[data-avvio] { display: none; }');
  });

  it('aperto da un indirizzo il pannello non si anima', () => {
    expect(css).toContain('.pannello[data-istantaneo]');
    expect(css).toContain('.guscio[data-istantaneo] .guscio-main');
  });
});
```

- [ ] **Step 12: Verifica che falliscano.**

Run: `npx vitest run src/app/__tests__/token.test.ts`
Expected: FAIL — i nuovi token non ci sono, `--barra-lato` c'è ancora, le regole del pannello e
dell'avvio mancano.

- [ ] **Step 13: `design/sistema/tokens.css`.**

  1. Nel commento in cima sostituisci `aggiornato il 20/09/2026.` con
     `aggiornato il 20/09/2026 e il 25/09/2026 (fase 5: tab bar a tre voci, pannello).`.
  2. Nel blocco `/* ---------- Ridisegno 19-20/09: tab bar flottante ---------- */` sostituisci
     il titolo e le due righe di `--barra-lato` / `--barra-lato-giu` con:

```css
  /* ---------- Ridisegno 19-20/09, rivista il 25/09: tab bar flottante, tre voci ---------- */
  --barra-larga: 304px;               /* larghezza della pillola a barra grande, centrata: 3 voci da 96 + 2 gap da 2 + 2 × 6 di padding */
  --barra-larga-giu: 244px;           /* larghezza a barra ridotta: 3 × 76 + 2 × 2 + 2 × 6. Si anima width, non più left/right */
```

  3. Nello stesso blocco, dopo `--barra-voce-giu`, aggiungi:

```css
  --barra-voce-larga: 96px;           /* larghezza della voce a barra grande (bersaglio 96 × 72) */
  --barra-voce-larga-giu: 76px;       /* larghezza della voce a barra ridotta (76 × 54) */
```

     e nel commento di `--barra-gap` sostituisci `tra le quattro voci` con `tra le tre voci`.
  4. Nel blocco del Dock sostituisci il commento di `--dock-lato` con
     `/* distanza del dock dai lati: 16, anche dopo che la barra è diventata centrata (25/09) */`.
  5. Nel blocco `Ridisegno 19-20/09: componenti nuovi`, dopo `--pannello-velo`, aggiungi:

```css
  --z-pannello: 70;                   /* pannello impostazioni e suo velo: sopra tab bar (20), Dock (19) e fogli (50, 60); il suo dialogo sta a 80 */
```

- [ ] **Step 14: `src/app/globals.css`.**

  1. In `:root` sostituisci le due righe `--barra-lato: 16px;` e `--barra-lato-giu: 46px;` con:

```css
  --barra-larga: 304px;
  --barra-larga-giu: 244px;
```

     dopo `--barra-voce-giu: 54px;` aggiungi:

```css
  --barra-voce-larga: 96px;
  --barra-voce-larga-giu: 76px;
```

     e prima di `--area-ortofrutta` aggiungi:

```css
  /* Il Pannello impostazioni (spec fase 5 §B.1): copiati da design/sistema/tokens.css, stessi valori. */
  --pannello-alto: 76px;
  --pannello-velo: rgba(20, 22, 58, 0.55);
  --z-pannello: 70;
```

  2. Sostituisci la regola `.anim-barra` (dentro il blocco `@media` sopra la tab bar) con:

```css
  .anim-barra { transition: height var(--moto-barra) var(--curva-barra), width var(--moto-barra) var(--curva-barra); }
```

  3. Sostituisci le regole `.barra`, `.barra-voce`, `.guscio[data-barra="ridotta"] .barra` e
     `.guscio[data-barra="ridotta"] .barra-voce` con queste (le altre regole del blocco restano):

```css
/* Dal 25/09 (spec fase 5 §G.1) la pillola è centrata e ha una larghezza sua. Le voci restano
   flex con un tetto: con tre voci sono esattamente 96 e 76, e la barra a quattro voci resta in
   piedi finché TabBar.tsx non passa a tre (voci da 71,5 e 56,5). */
.barra { position: absolute; left: 0; right: 0; margin: 0 auto; width: var(--barra-larga); bottom: var(--barra-fondo); height: var(--barra-alta); border-radius: 999px; display: flex; align-items: center; gap: var(--barra-gap); padding: var(--barra-padding); background: var(--superficie); box-shadow: var(--ombra-nav); z-index: 20; }
.barra-voce { flex: 1 1 0; min-width: 0; max-width: var(--barra-voce-larga); height: var(--barra-voce); border-radius: 999px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; overflow: hidden; text-decoration: none; }
```

```css
.guscio[data-barra="ridotta"] .barra { height: var(--barra-bassa); width: var(--barra-larga-giu); }
.guscio[data-barra="ridotta"] .barra-voce { height: var(--barra-voce-giu); max-width: var(--barra-voce-larga-giu); gap: 0; }
```

  4. In fondo al file aggiungi:

```css
/* ---------- Pannello impostazioni (spec fase 5 §A.2, §B.1, §B.2) ---------- */
/* Sopra tab bar (20), slot del Dock (19) e fogli di livello 1 e 2 (50, 60). Il Dialogo di
   conferma del pannello sta sopra, a 80 (FoglioDalBasso livello 3). Il pannello è sempre nel
   DOM: chiuso è `visibility: hidden`, e la transizione di visibility aspetta la fine della
   discesa. */
.pannello-velo { position: fixed; inset: 0; z-index: var(--z-pannello); background: var(--pannello-velo); opacity: 0; visibility: hidden; }
.pannello-velo[data-stato="aperto"] { opacity: 1; visibility: visible; }
.pannello {
  position: fixed; top: var(--pannello-alto); left: 0; right: 0; bottom: 0; z-index: var(--z-pannello);
  display: flex; flex-direction: column; overflow: hidden; outline: none;
  background: var(--fondo); border-radius: 22px 22px 0 0; box-shadow: var(--ombra-alta);
  visibility: hidden;
}
.pannello[data-stato="aperto"] { visibility: visible; }
.pannello-testata { flex: none; display: flex; align-items: center; gap: 10px; padding: 16px 16px 12px; }
/* L'unico che scorre. La maschera sfuma solo gli ultimi 26 px, il padding in fondo: la barra è
   coperta e --fine non serve (spec §B.1); a fine scorrimento niente resta sfumato. */
.pannello-corpo {
  flex: 1; min-height: 0; overflow-y: auto; padding: 0 12px 26px;
  display: flex; flex-direction: column; gap: 12px;
  -webkit-mask-image: linear-gradient(180deg, #000 calc(100% - 26px), rgba(0, 0, 0, 0) 100%);
  mask-image: linear-gradient(180deg, #000 calc(100% - 26px), rgba(0, 0, 0, 0) 100%);
}
.pannello-corpo > * { flex-shrink: 0; }
/* Il piede fisso col primario (Ordine delle aree, Esporta, Casa): esiste solo se qualcuno ci
   monta dentro un portale (PiedePannello). */
.pannello-piede { flex: none; display: flex; flex-direction: column; gap: 8px; padding: 12px 16px 26px; border-top: 1px solid var(--bordo); }
.pannello-piede:empty { display: none; }

/* L'app dietro prende la scala solo a pannello aperto: un transform fisso su .guscio-main farebbe
   da contenitore ai position: fixed delle pagine (fogli, dialoghi, widget AI). */
@media (prefers-reduced-motion: no-preference) {
  .pannello { transform: translateY(100%); transition: transform 200ms cubic-bezier(.4, 0, 1, 1), visibility 0s linear 200ms; }
  .pannello[data-stato="aperto"] { transform: none; transition: transform 250ms var(--curva-barra), visibility 0s; }
  .pannello-velo { transition: opacity 180ms linear, visibility 0s linear 180ms; }
  .pannello-velo[data-stato="aperto"] { transition: opacity 200ms linear, visibility 0s; }
  .guscio-main { transform-origin: 50% 0; transition: transform 200ms cubic-bezier(.4, 0, 1, 1); }
  .guscio[data-pannello="aperto"] .guscio-main { transform: scale(.96); transition: transform 250ms var(--curva-barra); }
  .anim-sotto-entra { animation: sotto-entra 200ms var(--curva-barra); }
  .anim-sotto-esce { animation: sotto-esce 200ms var(--curva-barra) forwards; }
  @keyframes sotto-entra { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes sotto-esce { from { transform: none; opacity: 1; } to { transform: translateX(24px); opacity: 0; } }
}
/* Con reduce: solo opacità in 120 ms, e l'app dietro non si scala (spec §B.2). */
@media (prefers-reduced-motion: reduce) {
  .pannello { opacity: 0; transition: opacity 120ms linear, visibility 0s linear 120ms; }
  .pannello[data-stato="aperto"] { opacity: 1; transition: opacity 120ms linear, visibility 0s; }
  .pannello-velo { transition: opacity 120ms linear, visibility 0s linear 120ms; }
  .pannello-velo[data-stato="aperto"] { transition: opacity 120ms linear, visibility 0s; }
  .anim-sotto-entra { animation: sotto-appare 120ms linear; }
  .anim-sotto-esce { animation: sotto-sparisce 120ms linear forwards; }
  @keyframes sotto-appare { from { opacity: 0; } to { opacity: 1; } }
  @keyframes sotto-sparisce { from { opacity: 1; } to { opacity: 0; } }
}
/* Aperto da un indirizzo (?impostazioni=, spec §A.3): compare già aperto. L'attributo si toglie
   alla chiusura, nello stesso render, quindi la chiusura si anima. */
.pannello[data-istantaneo], .pannello-velo[data-istantaneo], .guscio[data-istantaneo] .guscio-main { transition: none !important; }

/* ---------- Avvio del Marchio (spec fase 5 §J, DESIGN.md §7 .anim-avvio) ---------- */
/* Il livello (position fixed, z 100, pointer-events none) e il volo (translate + scale) li
   scrive AvvioMarchio.tsx inline (Task 14): qui ci sono solo stati, durate e curve. Gli stati
   d'arrivo stanno fuori dal media: sono dove le cose finiscono, non movimenti. */
.anim-avvio-fondo-via, .anim-avvio-dissolto, .anim-avvio-svanisce, .anim-avvio-nascosto { opacity: 0; }
@media (prefers-reduced-motion: no-preference) {
  .anim-avvio-casella { animation: pb 620ms linear both; }
  .anim-avvio-fondo-via, .anim-avvio-dissolto { transition: opacity 420ms linear; }
  /* Una sola `transition` per il Marchio in volo: se `svanisce` ne dichiarasse un'altra,
     a 1700 cancellerebbe quella del transform ancora in corsa, che finisce a 1820. */
  .anim-avvio-volo { transition: transform 620ms var(--curva-barra), opacity 120ms linear; }
  .anim-avvio-rivela { transition: opacity 120ms linear; }
  @keyframes pb {
    0% { transform: scale(0); opacity: 0; }
    40% { transform: scale(1.32); opacity: 1; }
    62% { transform: scale(.93); }
    80% { transform: scale(1.05); }
    92% { transform: scale(.99); }
    100% { transform: scale(1); opacity: 1; }
  }
}
/* Con reduce l'avvio non parte (lo decide il componente): qui è la cintura. */
@media (prefers-reduced-motion: reduce) {
  [data-avvio] { display: none; }
}
```

  Nota per chi implementa: il blocco `@media (prefers-reduced-motion: reduce)` dell'avvio deve
  contenere la stringa esatta `[data-avvio] { display: none; }`, e quello `no-preference` la
  stringa esatta `.anim-avvio-casella { animation: pb 620ms linear both; }` (il test le cerca
  così). I nomi delle classi sono quelli che il Task 14 usa nel componente: non si cambiano.

- [ ] **Step 15: Verifica token e CSS.**

Run: `npx vitest run src/app/__tests__/token.test.ts scripts/__tests__/token-check.test.ts`
Expected: PASS. Il perimetro verificato cresce (escono 2 token comuni, ne entrano 7).

Run: `npm run design:token`
Expected: PASS, zero divergenti.

- [ ] **Step 16: Il registro.** Crea `docs/2026-09-25-fase5-decisioni-esecuzione.md` con questo
  contenuto (sostituisci `<ramo>` con l'output di `git branch --show-current`):

````markdown
# Fase 5 del ridisegno: le decisioni prese durante l'esecuzione

**Data:** 25/09/2026 · **Ramo:** `<ramo>` · **Piano:** il piano della fase 5 (Impostazioni) in
`docs/superpowers/plans/` · **Spec:** `docs/superpowers/specs/2026-09-25-impostazioni-design.md`

L'esecuzione subagent-driven tiene il suo registro in `.superpowers/`, una cartella che git
ignora e che a fine lavoro viene cancellata. Questo file la sostituisce: raccoglie le decisioni
prese al posto di Andrea durante l'esecuzione, ognuna con quanto costa se è sbagliata, così
Andrea può rifare quelle che non gli tornano. Ogni task che prende una decisione che la spec
non copre la scrive qui, con `[misurato]` o `[ipotesi]`. Le righe della tabella delle
decisioni si numerano di seguito: ogni task continua dall'ultimo numero che trova, e i numeri
scritti nel piano sono indicativi.

## Le decisioni, con il loro costo

| # | Decisione | Perché | Costo se è sbagliata |
|---|---|---|---|
| 1 | `.barra` passa a larghezza propria già nel Task 1; le voci restano `flex: 1 1 0` con un tetto `max-width` di 96 / 76, invece di una `width` fissa | con tre voci la larghezza è esattamente 96 e 76 [calcolo: (304 − 12 − 4) / 3, (244 − 12 − 4) / 3]; con le quattro voci di oggi le voci sono 71,5 e 56,5, sopra 44, e la barra regge fino al Task 11 senza che il Task 11 tocchi il CSS | se tornasse una quarta voce si stringerebbero invece di sbordare |
| 2 | `.guscio-main` prende `transform` solo a pannello aperto (Task 1) | un `transform` fisso farebbe da contenitore ai `position: fixed` delle pagine (fogli, dialoghi, widget AI) e li sposterebbe | nessuno: col pannello aperto quei fogli non sono aperti, perché il loro velo copre il Menù utente che apre il pannello |
| 3 | La maschera del corpo del pannello sfuma solo gli ultimi 26 px (Task 1) | la spec dice «maschera ferma in fondo, `--fine` non serve» senza un valore; 26 è il padding in fondo al corpo, quindi a fine scorrimento niente resta sfumato | da guardare sul telefono: se la sfumatura non si vede, si toglie |
| 4 | Lo z-index dell'avvio (100) sta inline in `AvvioMarchio.tsx` (Task 14), senza token; il CSS dell'avvio (Task 1) ha solo stati, durate e curve | la spec §K chiede solo `--z-pannello`; l'avvio è un livello unico, sopra pannello (70) e dialogo (80) | nessuno: un numero in un posto solo |
| 5 | In `DESIGN.md` §6 «le quattro icone della tab bar» diventa «le icone della tab bar», con la conta di oggi (Task 1) | la spec §K non lo elenca, ma la barra perde una voce e §6 deve dire una cosa sola (come la decisione 2 della fase 4) | nessuno |

## Misure nel browser

### Sonda del Task 2: `chiudiTuttoPoi` + `router.push` (spec §A.5, §M.3 punto 1)

La scrive il Task 2.

## Migrazione dei test (spec §M.2)

Nessun test delle vecchie Impostazioni si cancella senza un sostituto. **Una regola sola per le
colonne:**
- «Test vecchio» è il titolo **esatto** dell'`it(...)` di oggi, carattere per carattere:
  apostrofi tipografici `’` compresi, `−` e `+` compresi, senza backtick attorno. Lo script
  del Task 11 (Step 12) cerca la riga col titolo esatto;
- «Va a» è il task che lo migra, e non cambia durante l'esecuzione;
- «Test nuovo» lo scrive il task che migra: il file, poi ` › `, poi il titolo esatto
  dell'`it(...)` nuovo (per un `describe` annidato, i titoli separati da ` › `, l'`it` per
  ultimo). Un test nuovo per riga: gli altri che provano la stessa cosa vanno nella «Nota»;
- «Nota» dice cosa è cambiato: un comportamento tolto dalla spec diventa il test del
  comportamento che lo sostituisce, e la nota lo dice.

La tabella tiene i test delle vecchie Impostazioni e quelli della Testata e di `utente.ts` che
cambiano nome. I test di altre pagine che cambiano nome (Importa, editor dell'ingrediente,
striscia dei giorni) si scrivono come coppia «vecchio → nuovo» nella tabella delle decisioni,
dal task che li tocca.

`P` = `src/app/(app)/impostazioni/__tests__/page.test.tsx` (47 test), `R` =
`src/app/(app)/impostazioni/reparti/__tests__/page.test.tsx` (5 test) [misurato il 26/09:
`grep -c "^\s*it("`]. Le righe 53–57 sono i test della Testata e di `utente.ts` che cambiano
nome. I dodici test di `useIndietroFogli` si spostano senza cambiare (Task 2, decisione 7) e
non stanno qui.

| # | Test vecchio | File | Va a | Test nuovo | Nota |
|---|---|---|---|---|---|
| 1 | mostra i pasti reali letti da leggiSlotDefs, non i quattro cablati nel mock dell’artboard | P | Task 8, Gestione dei pasti | | |
| 2 | sta nella sezione CASA, dichiara l’assunzione e parte da 1 con il − spento | P | Task 7, campo `PERS` | | lo stepper è tolto (spec §C.10); la riga sta in «Come calcolo la lista» |
| 3 | + salva subito le impostazioni intere con 2, mostra 2 e dice per quanti compra la lista | P | Task 7, campo `PERS` | | si scrive 2 e si esce dal campo |
| 4 | a 4 il + è spento e non salva | P | Task 7, campo `PERS` | | diventa: 5 torna al valore di prima con `Scrivi un numero da 1 a 4.` |
| 5 | − scende di uno e salva | P | Task 7, campo `PERS` | | si scrive il valore nuovo e si dà Invio |
| 6 | due tap veloci: se la rilettura del primo arriva dopo quella del secondo, resta il valore del secondo | P | Task 9, Cadenza (la coda del provider) | | il campo `PERS` è spento in volo (frame 25), il segmento della Cadenza no |
| 7 | due tap veloci: se il primo salvataggio fallisce, il secondo si scrive lo stesso e resta il suo valore senza errore | P | Task 9, Cadenza (la coda del provider) | | idem |
| 8 | due tap veloci: se il primo riesce ma la sua rilettura non è l’ultima e il secondo fallisce, mostra il valore del server | P | Task 9, Cadenza (la coda del provider) | | idem |
| 9 | due tap veloci: se la seconda scrittura fallisce mentre la prima è in volo, alla fine schermo e server dicono 2 | P | Task 9, Cadenza (la coda del provider) | | idem |
| 10 | se il salvataggio fallisce e anche la rilettura fallisce, torna all’ultimo valore confermato e lo dice | P | Task 7, campo `PERS` | | |
| 11 | se il salvataggio fallisce torna al valore del server e lo dice | P | Task 7, campo `PERS` | | |
| 12 | se la RLS rifiuta il salvataggio (la casa è cambiata) scarta l’id della casa, ricarica tutto e lo dice | P | Task 7, campo `PERS` | | |
| 13 | un rifiuto RLS riconosciuto dal solo messaggio (senza codice) ricarica allo stesso modo | P | Task 7, campo `PERS` | | |
| 14 | porta all elenco degli ingredienti | P | Task 7, riga Ingredienti | | apre la sotto-schermata, non un link |
| 15 | sotto il minimo di 3 pasti il pulsante di rimozione è disattivato | P | Task 8, Gestione dei pasti | | |
| 16 | sopra il minimo la rimozione funziona e salva l’insieme aggiornato | P | Task 8, Gestione dei pasti | | senza piatti al tocco; con piatti il dialogo (spec §C.2) |
| 17 | al massimo di 6 pasti il pulsante di aggiunta è disattivato | P | Task 8, Gestione dei pasti | | diventa: a 6 `AGGIUNGI PASTO` non c'è e c'è `Sei pasti sono il massimo.` |
| 18 | aggiunge un pasto sotto il massimo e lo salva con un id generato | P | Task 8, Gestione dei pasti | | |
| 19 | la prima riga non può salire e l’ultima non può scendere; riordinare aggiorna le posizioni e salva | P | Task 8, Gestione dei pasti | | |
| 20 | la pastiglia del giorno abitualmente fuori casa ha 44px di area di tap sopra una pillola di 36px | P | Task 8, Pasti a casa | | diventa la cella 44 della matrice |
| 21 | accende una pastiglia del giorno e salva le assenze abituali aggiornate | P | Task 8, Pasti a casa | | |
| 22 | rinominare un pasto salva il nuovo nome al blur, non a ogni carattere digitato | P | Task 8, Gestione dei pasti | | |
| 23 | con leggiSlotDefs() vuoto semina i quattro pasti di default e li salva davvero sul server | P | Task 8, Gestione dei pasti | | la semina sta nel provider (Task 6) |
| 24 | il link ordine dei reparti mostra l’anteprima e il riepilogo nell’ordine reale, non un ordine fisso | P | Task 7, riga Ordine delle aree | | l'anteprima è tolta (spec §C.5): diventa `PERSONALIZZATO` / `DI BASE` |
| 25 | con il ciclo spento la rotazione si può accendere e dice cosa cambia | P | Task 8, Rotazione del piano | | |
| 26 | se il salvataggio del ciclo fallisce torna al valore di prima e lo dice | P | Task 8, Rotazione del piano | | |
| 27 | il copy del giro con origine futura dice "comincia" | P | Task 8, Rotazione del piano | | |
| 28 | il copy del giro con origine passata (o oggi) dice "è cominciato" | P | Task 8, Rotazione del piano | | |
| 29 | RIPARTI da lunedì richiede due tocchi: il primo arma senza salvare, il secondo salva davvero | P | Task 8, Rotazione del piano | | diventa il dialogo `riparti`: ANNULLA non salva, `RIPARTI DA LUNEDÌ` salva |
| 30 | RIPARTI armato: un tap fuori dal bottone annulla senza salvare | P | Task 8, Rotazione del piano | | diventa: il velo del dialogo non chiude e non salva |
| 31 | RIPARTI armato: un cambio di stato altrove (la rotazione) lo disarma | P | Task 8, Rotazione del piano | | diventa: `RIPARTI` spento quando l'origine è già il lunedì corrente |
| 32 | da solo: invita a fare la spesa con qualcuno, offre il codice e il campo per entrare | P | Task 10, Casa condivisa | | |
| 33 | CREA UN CODICE chiama creaInvito e mostra il codice grande con la sua durata | P | Task 10, Casa condivisa | | |
| 34 | se creaInvito fallisce lo dice senza rompere la scheda | P | Task 10, Casa condivisa | | |
| 35 | ENTRA maiuscola il codice, chiama entraInCasa e ricarica su /lista | P | Task 10, Casa condivisa | | |
| 36 | con un codice sbagliato mostra il messaggio della funzione SQL (P0001) così com’è | P | Task 10, Casa condivisa | | |
| 37 | un errore che non è un raise exception della funzione (es. 23505) non mostra il messaggio grezzo di Postgres | P | Task 10, Casa condivisa | | |
| 38 | da proprietario: elenca le email dei membri e offre un altro codice, senza ESCI | P | Task 10, Casa condivisa | | |
| 39 | da proprietario: TOGLI chiede conferma al primo tocco, al secondo toglie per id e rilegge la casa | P | Task 10, Casa condivisa | | diventa il dialogo `togli` |
| 40 | da proprietario: tolto l’ultimo membro la scheda torna allo stato da solo | P | Task 10, Casa condivisa | | |
| 41 | da proprietario: TOGLI armato, un tap fuori disarma senza togliere | P | Task 10, Casa condivisa | | diventa: ANNULLA del dialogo non toglie |
| 42 | se togliere fallisce lo dice e il membro resta in elenco | P | Task 10, Casa condivisa | | l'errore sta nel dialogo |
| 43 | se la rilettura dopo TOGLI fallisce la riga sparisce comunque, senza dire che non siamo riusciti | P | Task 10, Casa condivisa | | usa `ricaricaCasa(seFallisce)` del Task 6 |
| 44 | da membro: ESCI DALLA CASA chiede conferma al primo tocco ed esce al secondo | P | Task 10, Casa condivisa | | diventa il dialogo `esci-casa` |
| 45 | da membro: ESCI armato, un tap fuori disarma senza uscire | P | Task 10, Casa condivisa | | diventa: ANNULLA del dialogo non esce |
| 46 | se uscire fallisce lo dice e resta nella casa | P | Task 10, Casa condivisa | | l'errore sta nel dialogo |
| 47 | se statoCasa fallisce la sezione lo dice e il resto delle impostazioni resta usabile | P | Task 10, Casa condivisa | | `casa: null` nel provider (Task 6), il messaggio nella sotto-schermata |
| 48 | mostra le sei righe nell’ordine caricato, con le frecce ai limiti disattivate al 35% di opacità | R | Task 9, Ordine delle aree | | i limiti sono `--icona-spenta` + `disabled` |
| 49 | riordinare con le frecce non salva finché non si preme SALVA ORDINE | R | Task 9, Ordine delle aree | | |
| 50 | SALVA ORDINE persiste il nuovo ordine lasciando intatto tutto il resto, poi torna a Impostazioni | R | Task 9, Ordine delle aree | | diventa: resta sulla sotto-schermata (spec §C.5) |
| 51 | se il salvataggio fallisce, mostra un errore e resta sulla pagina | R | Task 9, Ordine delle aree | | |
| 52 | il link indietro torna alla pagina statica /impostazioni | R | Task 9, Ordine delle aree | | diventa: la freccia torna in cima al pannello |
| 53 | il menù utente porta alle impostazioni, si chiama Impostazioni e mostra l'iniziale | `src/components/__tests__/testata.test.tsx` | Task 6, Testata | | il Menù è un `button` che apre il pannello |
| 54 | con indietro c'è il link Indietro e non c'è Impostazioni | `src/components/__tests__/testata.test.tsx` | Task 11, Testata | | la pillola con le tre etichette |
| 55 | usa il nome se c'è | `src/data/__tests__/utente.test.ts` | Task 6, `leggiUtente` | | |
| 56 | altrimenti l'email | `src/data/__tests__/utente.test.ts` | Task 6, `leggiUtente` | | |
| 57 | senza utente o con errore torna il puntino | `src/data/__tests__/utente.test.ts` | Task 6, `leggiUtente` e `inizialeDi` | | |

Per task: Task 6 = 4 (53, 55–57); Task 7 = 10 (2–5, 10–14, 24); Task 8 = 17 (1, 15–23,
25–31); Task 9 = 9 (6–9, 48–52); Task 10 = 16 (32–47); Task 11 = 1 (54). Le righe 1–52 sono
i 52 test di `P` e `R`: 10 + 17 + 9 + 16 = 52.

## Non eseguiti: restano per il gate dal telefono

Ogni task aggiunge qui quello che non ha potuto provare fuori dal telefono.

## Rimasto aperto, di proposito

Ogni task aggiunge qui i minor che la review lascia aperti, col motivo.

## Domande per Andrea (in review)

Le domande che l'esecuzione trova e non decide: ognuna col punto del codice o della spec, e la
proposta. Andrea le vede in review.

## I gate di Andrea, in ordine

1. **L'ok alla migrazione `0015`** in produzione (`supabase/migrations/0015_cadenza_e_dispensa.sql`:
   `settings.giorni_controllo` e `cancella_dispensa()`), **prima del merge**: Vercel pubblica da
   solo al merge (spec §O).
2. **La migrazione applicata.**
3. **Il merge della PR**, che va in produzione da solo.
4. **Le prove dal telefono** della spec §M.4, più quelle della sezione «Non eseguiti».
````

- [ ] **Step 17: Verifica finale.**

Run: `npx vitest run src/app/__tests__/token.test.ts scripts/__tests__/token-check.test.ts src/components/__tests__/tabbar.test.tsx src/components/__tests__/guscio.test.tsx`
Expected: PASS (la tab bar ha ancora quattro voci: i suoi test non cambiano in questo task).

Run: `npx tsc --noEmit`
Expected: nessun errore (in un worktree nuovo, prima `npx next typegen`).

Run: `npm run lint`
Expected: nessun errore.

- [ ] **Step 18: Commit.**

```bash
git add design/sistema/DESIGN.md design/sistema/tokens.css src/app/globals.css src/app/__tests__/token.test.ts docs/2026-09-25-fase5-decisioni-esecuzione.md
```

```bash
git commit -m "docs: DESIGN.md e token della fase 5, CSS del pannello e dell'avvio, registro

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Componenti comuni: `useIndietroFogli` con `chiudiTuttoPoi`, `controlli`, `DialogoConferma`, e la sonda nel browser

Tre pezzi della Dispensa passano a uso comune (spec §A.4, §D), `FoglioDalBasso` guadagna un
terzo livello per il dialogo sopra il pannello, e una sonda nel browser misura se
`chiudiTuttoPoi` + `router.push` regge con Next 16 (spec §A.5, §M.3 punto 1). **L'esito della
sonda decide come il Task 6 naviga fuori dal pannello:** va nel registro, e il Task 6 lo legge.

La Dispensa non cambia comportamento: cambiano solo i suoi import, e l'errore del dialogo di
eliminazione del lotto passa sotto i tasti (spec §D).

**Files:**
- Move: `src/app/(app)/dispensa/useIndietroFogli.ts` → `src/components/useIndietroFogli.ts`
- Move: `src/app/(app)/dispensa/__tests__/indietro.test.ts` → `src/components/__tests__/useIndietroFogli.test.tsx`
- Move: `src/app/(app)/dispensa/controlli.tsx` → `src/components/controlli.tsx`
- Modify (solo import): `src/app/(app)/dispensa/page.tsx`, `DettaglioIngrediente.tsx`,
  `DettaglioLotto.tsx`, `LettoreCodice.tsx`, `NuovoIngrediente.tsx`, `RigaScadenza.tsx`,
  `ScansioneConfezione.tsx`, `WidgetAI.tsx` (tutti in `src/app/(app)/dispensa/`),
  `src/app/(app)/dispensa/__tests__/dettaglio.test.tsx`
- Create: `src/components/DialogoConferma.tsx`
- Modify: `src/app/(app)/dispensa/DialogoElimina.tsx` (diventa un uso di `DialogoConferma`)
- Modify: `src/components/FoglioDalBasso.tsx` (livello 3)
- Test: `src/components/__tests__/DialogoConferma.test.tsx`, `src/components/__tests__/FoglioDalBasso.test.tsx`,
  `src/components/__tests__/useIndietroFogli.test.tsx`; restano verdi senza modifiche
  `src/app/(app)/dispensa/__tests__/lotto.test.tsx` e `page.test.tsx`
- Temporanei, per la sonda, **non committati**: `src/app/auth/sonda-a/page.tsx`, `src/app/auth/sonda-b/page.tsx`
- Modify: `docs/2026-09-25-fase5-decisioni-esecuzione.md`

**Interfaces:**
- Consumes: niente dai task precedenti (il registro del Task 1).
- Produces (così come nell'ossatura):
  - `useIndietroFogli(profondita: number, chiudiUltimo: () => void): { chiudiTuttoPoi: (fn: () => void) => void }`
    da `src/components/useIndietroFogli.ts`. `chiudiTuttoPoi` è la stessa funzione a ogni
    render. Se la sonda dice «non regge», l'hook restituisce anche `lasciaVoci: () => void`
    (Step 11).
  - da `src/components/controlli.tsx`: `STILE_PILLOLA`, `TastoPrimario`, `TastoSecondario`,
    `Blocco`, `Etichetta`, `MessaggioErrore`, `RigaSiNo`, `CampoConSalva`, invariati.
  - da `src/components/DialogoConferma.tsx`: `interface PropsDialogo { titolo; testo; azione;
    tono: 'distruttivo' | 'primario'; erroreTesto; onConferma: () => Promise<void> }` e
    `DialogoConferma(p: PropsDialogo & { onAnnulla: () => void })`.
  - `FoglioDalBasso` accetta `livello?: 1 | 2 | 3`; il 3 ha `zIndex` 80.
  - nel registro, l'esito della sonda: «regge» o «non regge».

- [ ] **Step 1: Sposta i file con git.** Un comando alla volta:

```bash
git mv "src/app/(app)/dispensa/useIndietroFogli.ts" src/components/useIndietroFogli.ts
```

```bash
git mv "src/app/(app)/dispensa/__tests__/indietro.test.ts" src/components/__tests__/useIndietroFogli.test.tsx
```

```bash
git mv "src/app/(app)/dispensa/controlli.tsx" src/components/controlli.tsx
```

  Il test cambia estensione perché i test nuovi di `chiudiTuttoPoi` montano un componente.
  I test di oggi non cambiano (spec §M.1): l'import in cima resta `from '../useIndietroFogli'`,
  che dalla nuova cartella punta al file spostato.

- [ ] **Step 2: Aggiorna gli import.** Sostituisci, in ognuno di questi file:
  - `src/app/(app)/dispensa/page.tsx`: `from './useIndietroFogli'` → `from '@/components/useIndietroFogli'`, e `from './controlli'` → `from '@/components/controlli'`;
  - `DettaglioIngrediente.tsx`, `DettaglioLotto.tsx`, `DialogoElimina.tsx`, `LettoreCodice.tsx`,
    `NuovoIngrediente.tsx`, `RigaScadenza.tsx`, `ScansioneConfezione.tsx`, `WidgetAI.tsx` (in
    `src/app/(app)/dispensa/`): `from './controlli'` → `from '@/components/controlli'`;
  - `src/app/(app)/dispensa/__tests__/dettaglio.test.tsx`: `from '../controlli'` → `from '@/components/controlli'`.

  Poi controlla che non resti niente:

Run: `grep -rn -e "dispensa/controlli" -e "'./controlli'" -e "'../controlli'" -e "'./useIndietroFogli'" src`
Expected: nessuna riga (in `src/components/` gli import relativi a `./controlli` non esistono ancora).

Run: `npx vitest run "src/app/(app)/dispensa" src/components/__tests__/useIndietroFogli.test.tsx`
Expected: PASS, gli stessi test di prima dello spostamento.

- [ ] **Step 3: I test di `chiudiTuttoPoi`, che falliscono.** In
  `src/components/__tests__/useIndietroFogli.test.tsx`:
  1. sostituisci le due righe di import di Testing Library e di vitest in cima con:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, render, fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
```

  2. nell'`afterEach` esistente aggiungi `vi.useRealTimers();` dopo `vi.restoreAllMocks();`;
  3. in fondo al file aggiungi:

```tsx
/**
 * Il modo in cui il pannello userà l'hook (spec fase 5 §A.5): nello stesso gesto registra la
 * navigazione con `chiudiTuttoPoi` e porta il proprio stato a profondità 0.
 */
function Banco({ fn }: { fn: () => void }) {
  const [livelli, setLivelli] = useState(0);
  const { chiudiTuttoPoi } = useIndietroFogli(livelli, () => setLivelli((l) => Math.max(0, l - 1)));
  return (
    <div>
      <p>{`livelli ${livelli}`}</p>
      <button type="button" onClick={() => setLivelli(2)}>apri due</button>
      <button type="button" onClick={() => { chiudiTuttoPoi(fn); setLivelli(0); }}>vai</button>
    </div>
  );
}

const tocca = (nome: string) => fireEvent.click(screen.getByRole('button', { name: nome }));

describe('chiudiTuttoPoi (spec fase 5 §A.5)', () => {
  it('con due voci aperte: un solo go(-2), e fn parte al popstate atteso, non prima, una volta sola', () => {
    const fn = vi.fn();
    render(<Banco fn={fn} />);
    tocca('apri due');
    expect(window.history.pushState).toHaveBeenCalledTimes(2);

    tocca('vai');
    expect(window.history.go).toHaveBeenCalledTimes(1);
    expect(window.history.go).toHaveBeenLastCalledWith(-2);
    expect(fn).not.toHaveBeenCalled();

    indietro(); // il popstate del go(-2)
    expect(fn).toHaveBeenCalledTimes(1);
    indietro(); // un popstate dopo: non è più nostro, non la richiama
    expect(fn).toHaveBeenCalledTimes(1);
    expect(screen.getByText('livelli 0')).toBeInTheDocument();
  });

  it('senza voci aperte fn parte subito, nell\'effetto, senza go()', () => {
    const fn = vi.fn();
    render(<Banco fn={fn} />);
    tocca('vai');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(window.history.go).not.toHaveBeenCalled();
  });

  it('se il popstate atteso non arriva, fn parte dopo 1 s, e il popstate in ritardo non la richiama', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let avanti = 0;
    const vero = performance.now.bind(performance);
    vi.spyOn(performance, 'now').mockImplementation(() => vero() + avanti);
    const fn = vi.fn();
    render(<Banco fn={fn} />);
    tocca('apri due');
    tocca('vai');

    act(() => { vi.advanceTimersByTime(999); });
    expect(fn).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(fn).toHaveBeenCalledTimes(1);

    avanti = 1500;
    indietro(); // il popstate arrivato tardi: fuori tempo, e le voci sono già 0
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('dopo chiudiTuttoPoi il gesto indietro torna a chiudere un livello alla volta', () => {
    const fn = vi.fn();
    render(<Banco fn={fn} />);
    tocca('apri due');
    tocca('vai');
    indietro(); // atteso
    expect(fn).toHaveBeenCalledTimes(1);

    tocca('apri due');
    expect(window.history.pushState).toHaveBeenCalledTimes(4);
    indietro(); // il gesto dell'utente
    expect(screen.getByText('livelli 1')).toBeInTheDocument();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('allo smontaggio una fn in attesa non parte più', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const fn = vi.fn();
    const { unmount } = render(<Banco fn={fn} />);
    tocca('apri due');
    tocca('vai');
    unmount();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(fn).not.toHaveBeenCalled();
  });

  it('chiudiTuttoPoi è la stessa funzione a ogni render', () => {
    const { result, porta } = monta(0);
    const prima = result.current.chiudiTuttoPoi;
    porta(1);
    expect(result.current.chiudiTuttoPoi).toBe(prima);
  });
});
```

- [ ] **Step 4: Verifica che falliscano.**

Run: `npx vitest run src/components/__tests__/useIndietroFogli.test.tsx`
Expected: FAIL nei sei test nuovi (`chiudiTuttoPoi` non esiste: l'hook oggi non restituisce
niente); i dodici di prima PASS.

- [ ] **Step 5: Implementa `chiudiTuttoPoi`.** In `src/components/useIndietroFogli.ts`:
  1. l'import diventa `import { useCallback, useEffect, useRef, useState } from 'react';`;
  2. nella docstring dell'hook, sostituisci la frase `Il gesto indietro del telefono con fogli,
     dialogo o widget AI aperti: chiude l'ultimo livello invece di uscire dalla Dispensa.` con
     `Il gesto indietro del telefono con fogli, dialoghi, widget o pannelli aperti: chiude
     l'ultimo livello invece di uscire dalla pagina. Nato nella Dispensa (PR #7), di uso comune
     dalla fase 5 (spec §A.4).`, e in fondo alla docstring, prima di `` `chiudiUltimo` si legge
     da un ref``, aggiungi:

```ts
 * **`chiudiTuttoPoi(fn)`** (spec fase 5 §A.5) serve a lasciare la pagina con livelli aperti.
 * Se il chiamante chiudesse e navigasse subito, il `go(-n)` dell'hook e la navigazione
 * correrebbero insieme, e la traversata porterebbe indietro anche la pagina nuova. Il
 * chiamante registra `fn` e, nello stesso gesto, porta il suo stato a profondità 0: l'hook
 * consuma le voci con un `go(-n)` ed esegue `fn` al `popstate` che lo conclude. Senza voci
 * aperte `fn` parte subito, nell'effetto. Se il `popstate` non arriva entro
 * `ATTESA_POPSTATE_MS`, `fn` parte comunque. In ogni caso una volta sola; una seconda chiamata
 * prima che parta sostituisce la prima. Allo smontaggio una `fn` in attesa si butta.
```

  3. sostituisci il corpo della funzione, dalla firma alla fine del file, con:

```ts
export function useIndietroFogli(
  profondita: number,
  chiudiUltimo: () => void,
): { chiudiTuttoPoi: (fn: () => void) => void } {
  const voci = useRef(0);
  // I `popstate` dei nostri `go()` ancora da arrivare: il browser ne manda uno per traversata.
  const attesi = useRef(0);
  // Fin quando un atteso vale (`performance.now()`): dopo, il popstate è dell'utente.
  const attesiFino = useRef(0);
  const chiudi = useRef(chiudiUltimo);
  // chiudiTuttoPoi: cosa fare quando le voci sono consumate, e il timer di riserva.
  const dopo = useRef<(() => void) | null>(null);
  const riserva = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ogni chiudiTuttoPoi fa girare un effetto: serve quando non ci sono voci da consumare.
  const [richieste, setRichieste] = useState(0);

  useEffect(() => {
    chiudi.current = chiudiUltimo;
  });

  /** Esegue la funzione in attesa, una volta sola, e spegne il timer di riserva. */
  const esegui = useCallback(() => {
    const fn = dopo.current;
    dopo.current = null;
    if (riserva.current !== null) {
      clearTimeout(riserva.current);
      riserva.current = null;
    }
    fn?.();
  }, []);

  /** Il popstate atteso può non arrivare mai: fn parte comunque allo scadere dell'attesa. */
  const armaRiserva = useCallback(() => {
    if (dopo.current === null || riserva.current !== null) return;
    riserva.current = setTimeout(esegui, ATTESA_POPSTATE_MS);
  }, [esegui]);

  useEffect(() => {
    if (profondita > voci.current) {
      for (let i = voci.current; i < profondita; i++) window.history.pushState(null, '');
      voci.current = profondita;
    } else if (profondita < voci.current) {
      const passi = voci.current - profondita;
      voci.current = profondita;
      attesi.current += 1;
      attesiFino.current = performance.now() + ATTESA_POPSTATE_MS;
      window.history.go(-passi);
      armaRiserva();
    }
  }, [profondita, armaRiserva]);

  // Dopo l'effetto della profondità, di proposito: se nello stesso render il chiamante è sceso
  // a 0, il go() è già partito e fn aspetta il suo popstate.
  useEffect(() => {
    if (richieste === 0 || dopo.current === null) return;
    // Il chiamante non ha ancora chiuso: fn aspetta la discesa e il suo popstate.
    if (voci.current > 0) return;
    const inArrivo = attesi.current > 0 && performance.now() < attesiFino.current;
    if (inArrivo) armaRiserva();
    else esegui();
  }, [richieste, esegui, armaRiserva]);

  useEffect(() => {
    const suPopstate = () => {
      if (attesi.current > 0 && performance.now() < attesiFino.current) {
        attesi.current -= 1;
        if (attesi.current === 0 && voci.current === 0 && dopo.current !== null) esegui();
        return;
      }
      // Un atteso mai arrivato non si mangia il gesto dell'utente.
      attesi.current = 0;
      // Senza livelli aperti il popstate è la navigazione della pagina: non è nostro.
      if (voci.current === 0) return;
      voci.current -= 1;
      chiudi.current();
    };
    window.addEventListener('popstate', suPopstate);
    return () => {
      window.removeEventListener('popstate', suPopstate);
      if (riserva.current !== null) clearTimeout(riserva.current);
      riserva.current = null;
      dopo.current = null;
    };
  }, [esegui]);

  const chiudiTuttoPoi = useCallback((fn: () => void) => {
    dopo.current = fn;
    setRichieste((n) => n + 1);
  }, []);

  return { chiudiTuttoPoi };
}
```

  La costante `ATTESA_POPSTATE_MS` e la sua docstring restano dove sono, sopra la docstring
  dell'hook.

- [ ] **Step 6: Verifica.**

Run: `npx vitest run src/components/__tests__/useIndietroFogli.test.tsx "src/app/(app)/dispensa/__tests__/page.test.tsx"`
Expected: PASS, diciotto test dell'hook più quelli della pagina della Dispensa (che chiama
l'hook e ne ignora il risultato).

- [ ] **Step 7: `DialogoConferma` e `FoglioDalBasso` livello 3, i test che falliscono.**
  Crea `src/components/__tests__/DialogoConferma.test.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DialogoConferma, type PropsDialogo } from '../DialogoConferma';

function props(p: Partial<PropsDialogo> = {}) {
  return {
    titolo: 'Cancellare la dispensa?',
    testo: 'Tutto quello che risulta in casa torna a zero, anche le confezioni in congelatore e i pronti. Piatti e piano restano. Non si può annullare.',
    azione: 'CANCELLA',
    tono: 'distruttivo' as const,
    erroreTesto: 'Non siamo riusciti a cancellare la dispensa. Riprova.',
    onConferma: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    onAnnulla: vi.fn(),
    ...p,
  };
}

describe('DialogoConferma (spec fase 5 §D)', () => {
  it('titolo, testo, e i due tasti: ANNULLA a sinistra, l\'azione a destra', () => {
    render(<DialogoConferma {...props()} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Cancellare la dispensa?' })).toBeInTheDocument();
    expect(screen.getByText(/Tutto quello che risulta in casa torna a zero/)).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['ANNULLA', 'CANCELLA']);
  });

  it('il tono distruttivo è pieno in --errore, il primario in --ink', () => {
    const { rerender } = render(<DialogoConferma {...props()} />);
    expect(screen.getByRole('button', { name: 'CANCELLA' }).style.background).toBe('var(--errore)');
    rerender(<DialogoConferma {...props({ azione: 'ESCI', tono: 'primario' })} />);
    expect(screen.getByRole('button', { name: 'ESCI' }).style.background).toBe('var(--ink)');
  });

  it('ANNULLA chiama onAnnulla e non conferma', () => {
    const p = props();
    render(<DialogoConferma {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'ANNULLA' }));
    expect(p.onAnnulla).toHaveBeenCalledTimes(1);
    expect(p.onConferma).not.toHaveBeenCalled();
  });

  it('in volo i due tasti sono spenti a 0,5, e un secondo tocco non conferma di nuovo', () => {
    const p = props({ onConferma: vi.fn(() => new Promise<void>(() => {})) });
    render(<DialogoConferma {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'CANCELLA' }));
    const azione = screen.getByRole('button', { name: 'CANCELLA' });
    const annulla = screen.getByRole('button', { name: 'ANNULLA' });
    expect(azione).toBeDisabled();
    expect(annulla).toBeDisabled();
    expect(azione.style.opacity).toBe('0.5');
    expect(annulla.style.opacity).toBe('0.5');
    fireEvent.click(azione);
    expect(p.onConferma).toHaveBeenCalledTimes(1);
  });

  it('se l\'azione fallisce l\'errore compare sotto i tasti, con role alert, e i tasti si riaccendono', async () => {
    const p = props({ onConferma: vi.fn<() => Promise<void>>().mockRejectedValue(new Error('rete')) });
    render(<DialogoConferma {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'CANCELLA' }));
    const errore = await screen.findByRole('alert');
    expect(errore).toHaveTextContent('Non siamo riusciti a cancellare la dispensa. Riprova.');
    const tasti = screen.getByRole('button', { name: 'ANNULLA' }).parentElement!;
    expect(tasti.compareDocumentPosition(errore) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: 'CANCELLA' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'ANNULLA' })).not.toBeDisabled();
  });

  it('un nuovo tentativo toglie l\'errore di prima', async () => {
    const onConferma = vi.fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('rete'))
      .mockReturnValueOnce(new Promise<void>(() => {}));
    render(<DialogoConferma {...props({ onConferma })} />);
    fireEvent.click(screen.getByRole('button', { name: 'CANCELLA' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'CANCELLA' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('se l\'azione riesce il dialogo resta spento: lo chiude chi lo ha aperto', async () => {
    const p = props();
    render(<DialogoConferma {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'CANCELLA' }));
    await Promise.resolve();
    expect(p.onConferma).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'CANCELLA' })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

  In `src/components/__tests__/FoglioDalBasso.test.tsx`, dentro il `describe`, aggiungi:

```tsx
  it('i livelli stanno a 50, 60 e 80: il 3 è il dialogo sopra il pannello (70)', () => {
    const { rerender } = render(
      <FoglioDalBasso etichetta="Foglio" onChiudi={vi.fn()}><p>Contenuto</p></FoglioDalBasso>,
    );
    expect(screen.getByTestId('velo-foglio').style.zIndex).toBe('50');
    rerender(<FoglioDalBasso etichetta="Foglio" onChiudi={vi.fn()} livello={2}><p>Contenuto</p></FoglioDalBasso>);
    expect(screen.getByTestId('velo-foglio').style.zIndex).toBe('60');
    rerender(<FoglioDalBasso etichetta="Foglio" onChiudi={vi.fn()} livello={3}><p>Contenuto</p></FoglioDalBasso>);
    expect(screen.getByTestId('velo-foglio').style.zIndex).toBe('80');
  });
```

Run: `npx vitest run src/components/__tests__/DialogoConferma.test.tsx src/components/__tests__/FoglioDalBasso.test.tsx`
Expected: FAIL — `DialogoConferma` non esiste; `livello={3}` non è ammesso (tsc) e dà z 50.

- [ ] **Step 8: Implementa.** Crea `src/components/DialogoConferma.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { MessaggioErrore, TastoSecondario } from './controlli';

export interface PropsDialogo {
  titolo: string;
  testo: string;
  /** Il testo del tasto, es. 'TOGLI'. */
  azione: string;
  /** `distruttivo` pieno in --errore; `primario` pieno in --ink (Esci, che è reversibile). */
  tono: 'distruttivo' | 'primario';
  /** Mostrato sotto i tasti se `onConferma` rifiuta. */
  erroreTesto: string;
  /** Chi la passa chiude il dialogo quando riesce: il dialogo da sé non si chiude mai. */
  onConferma: () => Promise<void>;
}

/**
 * Il Dialogo di conferma (DESIGN.md §8, spec fase 5 §D): titolo, testo, ANNULLA secondario a
 * sinistra e l'azione a destra. Nato come dialogo di eliminazione del lotto nella fase 4, di
 * uso comune dalla fase 5. Va dentro un `FoglioDalBasso` con `ruolo="alertdialog"`,
 * `altezza="contenuto"`, `chiudiDalVelo={false}` e `livello` 2 (sopra un foglio) o 3 (sopra il
 * Pannello impostazioni).
 *
 * Tiene da sé lo stato in volo: entrambi i tasti a 0,5 e `disabled`. Se l'azione fallisce
 * l'errore compare sotto i tasti e i tasti si riaccendono; se riesce il dialogo resta spento
 * finché chi l'ha aperto non lo toglie.
 */
export function DialogoConferma({
  titolo, testo, azione, tono, erroreTesto, onConferma, onAnnulla,
}: PropsDialogo & { onAnnulla: () => void }) {
  const [volo, setVolo] = useState(false);
  const [errore, setErrore] = useState(false);

  async function conferma() {
    if (volo) return;
    setVolo(true);
    setErrore(false);
    try {
      await onConferma();
    } catch {
      setErrore(true);
      setVolo(false);
    }
  }

  return (
    <div style={{ padding: '20px 16px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.2, color: 'var(--ink)' }}>{titolo}</h2>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)' }}>{testo}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <TastoSecondario onClick={onAnnulla} disabled={volo} style={{ flex: 1 }}>ANNULLA</TastoSecondario>
        <button
          type="button"
          onClick={() => void conferma()}
          disabled={volo}
          style={{
            flex: 1, height: 54, borderRadius: 18, color: 'var(--superficie)', boxShadow: 'var(--ombra-tasto)',
            background: tono === 'distruttivo' ? 'var(--errore)' : 'var(--ink)',
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em',
            opacity: volo ? 0.5 : 1,
          }}
        >
          {azione}
        </button>
      </div>
      {errore && <MessaggioErrore ruolo="alert">{erroreTesto}</MessaggioErrore>}
    </div>
  );
}
```

  Sostituisci `src/app/(app)/dispensa/DialogoElimina.tsx` con (i testi sono quelli di oggi,
  invariati):

```tsx
'use client';

import { DialogoConferma } from '@/components/DialogoConferma';

interface Props {
  nome: string;
  porzioni: number;
  impegnate: number;
  onAnnulla: () => void;
  onElimina: () => Promise<void>;
}

/**
 * Il dialogo di eliminazione del lotto (spec fase 4 §G, v1 06b): un uso di `DialogoConferma`
 * (spec fase 5 §D). Il velo non chiude: si esce da ANNULLA. Va dentro un `FoglioDalBasso` con
 * `ruolo="alertdialog"`, `livello={2}`, `altezza="contenuto"` e `chiudiDalVelo={false}`.
 */
export function DialogoElimina({ nome, porzioni, impegnate, onAnnulla, onElimina }: Props) {
  const quante = porzioni === 1 ? '1 porzione' : `${porzioni} porzioni`;
  const impegno = impegnate === 0
    ? ''
    : impegnate === 1
      ? ' 1 è impegnata dai pasti in programma: dopo, quei pasti non la trovano più.'
      : ` ${impegnate} sono impegnate dai pasti in programma: dopo, quei pasti non le trovano più.`;

  return (
    <DialogoConferma
      titolo="Elimini il lotto?"
      testo={`${nome}, ${quante}.${impegno}`}
      azione="ELIMINA"
      tono="distruttivo"
      erroreTesto="Non siamo riusciti a salvare. Riprova."
      onConferma={onElimina}
      onAnnulla={onAnnulla}
    />
  );
}
```

  In `src/components/FoglioDalBasso.tsx`:
  1. il commento e il tipo di `livello` diventano:

```tsx
  /**
   * 2 = sopra un altro foglio (il dialogo di eliminazione sopra il lotto); 3 = il Dialogo di
   * conferma sopra il Pannello impostazioni, che sta a 70 (spec fase 5 §A.2).
   */
  livello?: 1 | 2 | 3;
```

  2. sopra la funzione `FoglioDalBasso` aggiungi `const Z_LIVELLO = { 1: 50, 2: 60, 3: 80 } as const;`;
  3. nello stile del velo sostituisci `zIndex: livello === 2 ? 60 : 50` con `zIndex: Z_LIVELLO[livello]`.

- [ ] **Step 9: Verifica.**

Run: `npx vitest run src/components/__tests__/DialogoConferma.test.tsx src/components/__tests__/FoglioDalBasso.test.tsx "src/app/(app)/dispensa/__tests__/lotto.test.tsx" "src/app/(app)/dispensa/__tests__/page.test.tsx"`
Expected: PASS. I cinque test di `DialogoElimina` in `lotto.test.tsx` passano senza modifiche:
cercano il testo dell'errore, non la sua posizione. Se uno fallisce perché cercava l'errore
sopra i tasti, aggiornalo e scrivilo nel registro (Step 13).

Run: `npx tsc --noEmit`, poi `npm run lint`
Expected: nessun errore.

- [ ] **Step 10: La sonda nel browser (obbligatoria).** Misura `chiudiTuttoPoi` + `router.push`
  di Next 16 con l'hook vero, e l'apertura da un indirizzo (`?impostazioni=`) come la farà il
  Task 6: il parametro si toglie con `window.history.replaceState` **prima** che l'hook metta le
  sue voci, così le voci nascono sull'indirizzo pulito (Next 16 accetta la History API nativa:
  `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`,
  «Native History API»).

  1. Crea `src/app/auth/sonda-a/page.tsx` (sotto `/auth` il proxy di sessione lascia passare
     senza utente):

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIndietroFogli } from '@/components/useIndietroFogli';

/** Sonda del Task 2 della fase 5: si cancella a fine misura, non va in git. */
export default function SondaA() {
  const router = useRouter();
  const [livelli, setLivelli] = useState(0);
  const { chiudiTuttoPoi } = useIndietroFogli(livelli, () => setLivelli((l) => Math.max(0, l - 1)));

  // Misura B: l'apertura da un indirizzo, come farà il PannelloProvider (spec §A.3).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('impostazioni');
    if (p === null) return;
    window.history.replaceState(null, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLivelli(2);
  }, []);

  return (
    <main style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p data-sonda="livelli">{`LIVELLI ${livelli}`}</p>
      <button type="button" style={{ height: 54 }} onClick={() => setLivelli(2)}>APRI DUE LIVELLI</button>
      <button
        type="button"
        style={{ height: 54 }}
        onClick={() => { chiudiTuttoPoi(() => router.push('/auth/sonda-b')); setLivelli(0); }}
      >
        VAI A B CON CHIUDITUTTOPOI
      </button>
      <button
        type="button"
        style={{ height: 54 }}
        onClick={() => { setLivelli(0); router.push('/auth/sonda-b'); }}
      >
        VAI A B SENZA ASPETTARE
      </button>
    </main>
  );
}
```

  2. Crea `src/app/auth/sonda-b/page.tsx`:

```tsx
/** Sonda del Task 2 della fase 5: si cancella a fine misura, non va in git. */
export default function SondaB() {
  return (
    <main style={{ padding: 24 }}>
      <p data-sonda="b">PAGINA B</p>
    </main>
  );
}
```

  3. Avvia il server di sviluppo in background con Bash (`run_in_background: true`):

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=finta npx next dev -p 3100
```

     e aspetta che `curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/auth/sonda-b`
     dia `200` (con lo strumento Monitor e un ciclo `until`, non con `sleep` in primo piano).

  4. **Misura A1** (la regola), con gli strumenti `mcp__Claude_Browser__*`:
     - `navigate` a `http://localhost:3100/auth/sonda-b?inizio=1`, poi `navigate` a
       `http://localhost:3100/auth/sonda-a`;
     - `javascript_tool`, per installare il registro dei `popstate` e leggere il punto di
       partenza (L0 è la `lunghezza` che torna):

```js
window.__sonda = { eventi: [], t0: performance.now() };
window.addEventListener('popstate', () => window.__sonda.eventi.push({
  t: Math.round(performance.now() - window.__sonda.t0),
  url: location.pathname + location.search,
  lunghezza: history.length,
}));
({ url: location.pathname + location.search, lunghezza: history.length,
   livelli: document.querySelector('[data-sonda="livelli"]').textContent })
```

     - `find` su `APRI DUE LIVELLI`, poi `computer` `left_click` col suo `ref` (un clic vero: il
       browser dà l'attivazione utente, come il dito). Poi `javascript_tool`:

```js
({ lunghezza: history.length, livelli: document.querySelector('[data-sonda="livelli"]').textContent })
```

       Atteso: `L0 + 2`, `LIVELLI 2`.
     - `find` su `VAI A B CON CHIUDITUTTOPOI`, `left_click`. Poi `javascript_tool`:

```js
await new Promise((r) => setTimeout(r, 1500));
({ url: location.pathname + location.search, lunghezza: history.length,
   paginaB: document.querySelector('[data-sonda="b"]') !== null, eventi: window.__sonda.eventi })
```

       Atteso: `/auth/sonda-b`, `L0 + 1`, `paginaB: true`, un solo evento, su `/auth/sonda-a`.
     - l'indietro dalla pagina B, con `javascript_tool`:

```js
window.__sonda.eventi.length = 0;
history.back();
await new Promise((r) => setTimeout(r, 800));
({ url: location.pathname + location.search,
   livelli: document.querySelector('[data-sonda="livelli"]')?.textContent ?? null,
   eventi: window.__sonda.eventi })
```

       Atteso: `/auth/sonda-a`, `LIVELLI 0`. Poi lo stesso script ancora una volta: atteso
       `/auth/sonda-b?inizio=1` (nessuna voce orfana di A).
     - `read_console_messages` con `onlyErrors: true`: atteso nessun errore.

  5. **Misura A1 bis:** ripeti A1 da capo (i due `navigate`), ma per l'indietro dalla pagina B
     usa `navigate` con `url: "back"` (l'indietro del browser) invece di `history.back()`, e
     leggi URL e livelli con `javascript_tool` dopo 800 ms.

  6. **Misura A2 (controllo):** ripeti A1 da capo con `VAI A B SENZA ASPETTARE` al posto di
     `VAI A B CON CHIUDITUTTOPOI`, e leggi URL, lunghezza ed eventi dopo 1,5 s. Qualunque cosa
     succeda va nel registro: dice perché serve la regola.

  7. **Misura B (apertura da indirizzo):** `navigate` a
     `http://localhost:3100/auth/sonda-b?inizio=1`, leggi `history.length` (L1) con
     `javascript_tool`, poi `navigate` a
     `http://localhost:3100/auth/sonda-a?impostazioni=ingredienti`. Con `javascript_tool`:

```js
await new Promise((r) => setTimeout(r, 500));
({ url: location.pathname + location.search, lunghezza: history.length,
   livelli: document.querySelector('[data-sonda="livelli"]').textContent })
```

     Atteso: `/auth/sonda-a` (senza parametro), `L1 + 3`, `LIVELLI 2`. Poi tre volte:

```js
history.back();
await new Promise((r) => setTimeout(r, 800));
({ url: location.pathname + location.search,
   livelli: document.querySelector('[data-sonda="livelli"]')?.textContent ?? null })
```

     Atteso: `/auth/sonda-a` con `LIVELLI 1`; `/auth/sonda-a` con `LIVELLI 0`;
     `/auth/sonda-b?inizio=1`. In nessun passo l'URL riprende `?impostazioni=`.

  8. **Pulizia:** ferma il server (`pkill -f "next dev -p 3100"`), poi un comando alla volta:

```bash
rm -rf src/app/auth/sonda-a src/app/auth/sonda-b
```

```bash
rm -rf .next/dev
```

```bash
git checkout next-env.d.ts
```

Run: `git status --short`
Expected: nessun file sotto `src/app/auth/sonda-*`, `next-env.d.ts` non modificato.

  **Regge** se A1 e A1 bis danno esattamente gli attesi. **Non regge** se in A1 o A1 bis la
  pagina B non arriva, la lunghezza non è `L0 + 1`, arriva più di un `popstate`, o l'indietro da
  B non porta ad A con `LIVELLI 0` e poi fuori da A. Se B non dà gli attesi, fermati e chiedi:
  il Task 6 si appoggia a quel modello per `?impostazioni=`.

- [ ] **Step 11: Solo se la sonda dice «non regge»: `lasciaVoci`.** È il ripiego della spec
  §A.5: il pannello non consuma le voci e naviga con `router.replace`; le voci orfane restano
  sotto la pagina nuova, come accettato in fase 3 (§K di quella spec). Se la sonda dice «regge»,
  salta questo step.
  1. Aggiungi il test in fondo al `describe('chiudiTuttoPoi …')`:

```tsx
  it('lasciaVoci (ripiego): la discesa dopo non chiama go(), e il popstate dopo non chiude niente', () => {
    const chiudi = vi.fn();
    const { result, porta } = monta(0, chiudi);
    porta(2);
    act(() => { result.current.lasciaVoci(); });
    porta(0);
    expect(window.history.go).not.toHaveBeenCalled();
    indietro();
    expect(chiudi).not.toHaveBeenCalled();
  });
```

  2. Nell'hook, prima del `return`, aggiungi:

```ts
  /**
   * Ripiego della spec fase 5 §A.5, scelto dalla sonda del Task 2: dimentica le voci senza
   * consumarle. La prossima discesa di profondità non chiama go(); chi chiama naviga con
   * router.replace, e le voci restano orfane sotto la pagina nuova.
   */
  const lasciaVoci = useCallback(() => {
    voci.current = 0;
    attesi.current = 0;
    dopo.current = null;
    if (riserva.current !== null) {
      clearTimeout(riserva.current);
      riserva.current = null;
    }
  }, []);
```

     e cambia il tipo di ritorno e il `return` in
     `{ chiudiTuttoPoi: (fn: () => void) => void; lasciaVoci: () => void }` e
     `return { chiudiTuttoPoi, lasciaVoci };`.
  3. Rimisura il ripiego: ricrea le due pagine della sonda con un quarto tasto in A,
     `VAI A B CON REPLACE`, che fa `lasciaVoci(); setLivelli(0); router.replace('/auth/sonda-b');`
     (prendi `lasciaVoci` dall'hook), rifai A1 con quel tasto, scrivi nel registro dove porta
     ogni indietro da B (atteso: ad A con `LIVELLI 0`, poi ad A ancora per ogni voce orfana,
     poi fuori), e ripeti la pulizia dello Step 10.
  4. Aggiorna la firma nella sezione «Le interfacce fra i task» del piano e dillo nel rapporto
     del task: il Task 6 usa il ramo B.

Run: `npx vitest run src/components/__tests__/useIndietroFogli.test.tsx`
Expected: PASS.

- [ ] **Step 12: Il registro, la sonda.** In `docs/2026-09-25-fase5-decisioni-esecuzione.md`
  sostituisci la riga `La scrive il Task 2.` con questo testo, e riempi la colonna «Misurato»
  coi numeri letti (una misura non fatta si scrive **NON ESEGUITA**, mai un valore atteso):

```markdown
**Come:** due pagine temporanee, `src/app/auth/sonda-a` e `sonda-b` (fuori dal proxy di
sessione), su `next dev` alla porta 3100 con Supabase finto; il browser del pannello di Claude,
con clic veri sui tasti (`computer left_click`) e l'indietro da `history.back()` o dal browser.
La pagina A usa `useIndietroFogli` vero, già spostato in `src/components/`. Le pagine, `.next/dev`
e `next-env.d.ts` sono stati ripuliti dopo la misura. L0 e L1 sono `history.length` prima di
aprire i livelli.

| Misura | Atteso se regge | Misurato |
|---|---|---|
| A1. `APRI DUE LIVELLI`: lunghezza e livelli | L0 + 2, `LIVELLI 2` | |
| A1. `VAI A B CON CHIUDITUTTOPOI`, dopo 1,5 s: URL | `/auth/sonda-b` | |
| A1. … lunghezza | L0 + 1 | |
| A1. … `popstate` registrati | uno, su `/auth/sonda-a` | |
| A1. indietro da B (`history.back()`) | `/auth/sonda-a`, `LIVELLI 0` | |
| A1. un altro indietro | `/auth/sonda-b?inizio=1` | |
| A1 bis. indietro da B col browser | `/auth/sonda-a`, `LIVELLI 0` | |
| A2 (controllo). `VAI A B SENZA ASPETTARE`, dopo 1,5 s: URL, lunghezza, `popstate` | nessun atteso: dice perché serve la regola | |
| B. `/auth/sonda-a?impostazioni=ingredienti`: URL, lunghezza, livelli | `/auth/sonda-a`, L1 + 3, `LIVELLI 2` | |
| B. primo indietro | `/auth/sonda-a`, `LIVELLI 1` | |
| B. secondo indietro | `/auth/sonda-a`, `LIVELLI 0` | |
| B. terzo indietro | `/auth/sonda-b?inizio=1` | |
| Errori in console | nessuno | |

**Esito:** scrivi qui «regge» oppure «non regge», con la misura che lo decide. Con «regge» il
Task 6 usa il ramo A (`chiudiTuttoPoi` + `router.push`); con «non regge» il ramo B
(`lasciaVoci` + `router.replace`, Step 11 del Task 2).
```

  Nella tabella «Le decisioni, con il loro costo» aggiungi, numerandole di seguito:

```markdown
| 6 | L'errore di `DialogoConferma` sta sotto i tasti, con `role="alert"`, anche nel dialogo di eliminazione del lotto (Task 2) | spec §D; `DialogoElimina` è ora un suo uso, coi testi di oggi | nessuno: i test di oggi del dialogo cercano il testo, non la posizione |
| 7 | Il test dell'hook passa da `indietro.test.ts` a `src/components/__tests__/useIndietroFogli.test.tsx` (Task 2) | i test di `chiudiTuttoPoi` montano un componente; i dodici test di oggi sono invariati | nessuno |
| 8 | Una seconda `chiudiTuttoPoi` prima che la prima parta la sostituisce (Task 2) | una navigazione sola alla volta: vale l'ultima intenzione | due tocchi su due tessere diverse in meno di un `popstate` portano alla seconda |
| 9 | Il timer di riserva di `chiudiTuttoPoi` è sempre `ATTESA_POPSTATE_MS` pieno, anche quando un `go()` precedente è già in volo (Task 2) | un'attesa sola, deterministica e testabile coi timer finti | nel caso raro fn parte fino a 1 s più tardi del necessario |
```

  Se allo Step 9 hai aggiornato un test di `lotto.test.tsx`, scrivi la coppia «vecchio → nuovo»
  nella tabella delle decisioni (regola del Task 1: la tabella «Migrazione dei test» tiene solo
  le vecchie Impostazioni, la Testata e `utente.ts`).

- [ ] **Step 13: Verifica finale.**

Run: `npx vitest run src/components "src/app/(app)/dispensa"`
Expected: PASS.

Run: `npx tsc --noEmit`, poi `npm run lint`
Expected: nessun errore.

- [ ] **Step 14: Commit.** Le pagine della sonda non ci sono più (Step 10, punto 8).

```bash
git add -A src/components "src/app/(app)/dispensa" docs/2026-09-25-fase5-decisioni-esecuzione.md
```

```bash
git status --short
```

  Controlla che nell'elenco non ci siano `src/app/auth/sonda-a`, `sonda-b` né `next-env.d.ts`.

```bash
git commit -m "refactor: useIndietroFogli, controlli e DialogoConferma a uso comune; chiudiTuttoPoi misurato nel browser

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: La cadenza dei controlli

Tocca il calcolo della lista (regola 7). **Review di correttezza.** La prova che regge è questa: a cadenza 90, il default, ogni numero della lista resta identico, e nessun valore atteso dei test di oggi cambia.

Spec: §E.1, §C.6, §I (riga «Riga di controllo»). Il segmento nel pannello è del Task 9; qui ci sono il dato, il dominio, la Riga di controllo e la Lista.

**Il codice di questo task è stato provato** [misurato 25/09]: tutti i blocchi degli Step 1–16 sono stati applicati a una copia di `main` `feb4551` nello scratchpad. `ogniCadenza`, `fraCadenza` e lo Step 17 (la frase di Lista fatta) sono stati aggiunti il 26/09, dopo la decisione di Andrea, e **non sono stati provati**: valgono le Global Constraints sulle bozze. La suite intera dà 1728 verdi e 1 saltato, `tsc` e `lint` sono puliti. Restano bozze secondo le Global Constraints: se i Task 1 e 2 hanno cambiato un file toccato qui, rileggilo prima.

**Tre scelte di piano, misurate il 25/09 leggendo il codice:**

1. **`GIORNI_CONTROLLO_STAPLE` sparisce**, rinominata `GIORNI_CONTROLLO_DEFAULT`. Oggi la usano quattro file e basta [misurato: `grep -rn GIORNI_CONTROLLO_STAPLE src`]: `src/domain/pantry.ts` (definizione e `serveControllo`), `src/components/RigaControllo.tsx`, `src/components/__tests__/riga-controllo.test.tsx` e `src/domain/__tests__/pantry.test.ts`. Tutti e quattro cambiano in questo task, quindi un alias deprecato non servirebbe a nessuno. Un nome che dice «staple fisso» accanto a una cadenza scelta dall'utente sarebbe solo un nome sbagliato.
2. **`GiorniControllo` nasce in `src/domain/types.ts`**, e `pantry.ts` lo riesporta. Oggi `types.ts` non importa niente e `pantry.ts` importa `AreaId` da lì. Definire il tipo in `pantry.ts` creerebbe un giro d'import fra i due file. Il contratto dell'ossatura (`import type { GiorniControllo } from '@/domain/pantry'`) resta valido.
3. **La Lista prende la cadenza senza una lettura in più.** `leggiListe` (`src/data/lista.ts`) chiama già `leggiImpostazioni()` per `ordineAree`, e lo mette nella `ListaSalvata` [misurato: `lista.ts`, `leggiListe`]. `giorniControllo` viaggia accanto a lui, **facoltativo** come `ordineAree`. Il motivo è lo stesso: un'istantanea offline salvata prima di questo task non ce l'ha (`src/offline/lista-cache.ts` salva la `ListaSalvata` intera). La pagina usa `lista.giorniControllo ?? GIORNI_CONTROLLO_DEFAULT`. Per questo il task tocca anche `src/data/lista.ts` (nella mappa dei file dell'ossatura), e la stessa `lista.giorniControllo` serve a Lista fatta (Step 17).

**Files:**
- Create: `supabase/migrations/0015_cadenza_e_dispensa.sql` (solo la colonna; la funzione arriva col Task 4)
- Modify: `src/domain/types.ts` (`GiorniControllo`, `Impostazioni.giorniControllo`)
- Modify: `src/domain/pantry.ts` (costanti, `testoCadenza`, `serveControllo`)
- Modify: `src/domain/list-builder.ts` (regola 7, docstring di `costruisciLista`)
- Modify: `src/data/impostazioni.ts` (lettura, scrittura, validazione)
- Modify: `src/data/lista.ts` (`ListaSalvata.giorniControllo`, `leggiListe`)
- Modify: `src/components/RigaControllo.tsx` (prop `giorniControllo`)
- Modify: `src/app/(app)/lista/page.tsx` (`CartaSezione` passa la cadenza)
- Modify: `src/app/(app)/lista/fatta/page.tsx` (la frase di `CHIUDENDO LA SPESA` dice la cadenza: decisione di Andrea del 26/09)
- Modify: le fixture `Impostazioni` dei test (Step 9, elenco misurato)
- Test: `src/domain/__tests__/pantry.test.ts`, `src/domain/__tests__/list-builder.test.ts`, `src/data/__tests__/impostazioni.test.ts`, `src/data/__tests__/lista.leggiListe.test.ts` (nuovo), `src/components/__tests__/riga-controllo.test.tsx`, `src/app/(app)/lista/__tests__/page.test.tsx`, `src/app/(app)/lista/fatta/__tests__/page.test.tsx`
- Modify: `docs/2026-09-25-fase5-decisioni-esecuzione.md` (il registro, creato dal Task 1)

**Interfaces:**
- Consumes: niente dai task precedenti.
- Produces (ossatura, invariate):
  - `type GiorniControllo = 30 | 60 | 90` (definito in `types.ts`, riesportato da `pantry.ts`)
  - `CADENZE: readonly GiorniControllo[]` = `[30, 60, 90]`
  - `GIORNI_CONTROLLO_DEFAULT: GiorniControllo` = `90`
  - `testoCadenza(g): 'OGNI MESE' | 'OGNI 2 MESI' | 'OGNI 3 MESI'`
  - `ogniCadenza(g): 'Ogni mese' | 'Ogni 2 mesi' | 'Ogni 3 mesi'` (la nota della classe «a stima» nell'editor, Task 12) e `fraCadenza(g): 'fra un mese' | 'fra 2 mesi' | 'fra 3 mesi'` (Lista fatta, Step 17): i due testi di oggi che dicevano «90 giorni» (decisione di Andrea del 26/09)
  - `serveControllo(i: { ultimoAcquisto; ultimoCheck; oggi; giorniControllo }): boolean`
  - `Impostazioni.giorniControllo: GiorniControllo`, **obbligatorio**: `tsc` trova ogni oggetto che lo dimentica
  - `RigaControllo` con la prop obbligatoria `giorniControllo: GiorniControllo`
- Produces (in più, dichiarato nel registro): `ListaSalvata.giorniControllo?: GiorniControllo`, valorizzato da `leggiListe`.

- [ ] **Step 1: La migrazione, prima parte.** Crea `supabase/migrations/0015_cadenza_e_dispensa.sql`:

```sql
-- Fase 5, le Impostazioni (spec 2026-09-25-impostazioni-design.md §E.1, §E.2).
--
-- 1. settings.giorni_controllo: ogni quanti giorni la Lista chiede di uno
--    staple a stima («Olio: ne hai ancora?»). Tre valori, come il segmento
--    delle Impostazioni: 30 (ogni mese), 60 (ogni 2 mesi), 90 (ogni 3 mesi).
--    Il default 90 è la cadenza fissa di prima (GIORNI_CONTROLLO_STAPLE fino
--    alla fase 4): chi non la tocca non vede nessuna differenza.
-- 2. cancella_dispensa(): più sotto.
--
-- Va applicata PRIMA del deploy del codice che la legge: leggiImpostazioni
-- chiede la colonna per nome, e senza la colonna ogni pagina che legge le
-- impostazioni fallisce. È additiva: il codice di prima continua a
-- funzionare con la migrazione applicata. Non è rieseguibile.

alter table settings
  add column giorni_controllo int not null default 90
    check (giorni_controllo in (30, 60, 90));

-- Nessuna policy nuova: settings ha già `user_id = (select casa_id())` dalla 0012.

comment on column settings.giorni_controllo is
  'Ogni quanti giorni la Lista chiede di uno staple a stima: 30, 60 o 90. Il conto parte dal più recente fra ultimo acquisto e ultimo «sì» (serveControllo).';
```

- [ ] **Step 2: Il tipo.** In `src/domain/types.ts`, subito prima di `export interface Impostazioni`:

```ts
/**
 * Ogni quanti giorni la Lista chiede di uno staple a stima (spec fase 5
 * §E.1). Tre valori soli, come il check della colonna `giorni_controllo`
 * (migrazione 0015) e il segmento delle Impostazioni.
 */
export type GiorniControllo = 30 | 60 | 90;
```

e dentro `Impostazioni`, dopo `cicloOrigine`:

```ts
  /**
   * La cadenza dei controlli staple. Obbligatoria: un oggetto Impostazioni
   * che la dimentica calcolerebbe i controlli con un valore a caso, e `tsc`
   * deve dirlo. Chi legge dal database ha il default 90 (leggiImpostazioni).
   */
  giorniControllo: GiorniControllo;
```

Subito, nella stessa mossa, `src/domain/__tests__/fixtures.ts`: in `IMPOSTAZIONI` aggiungi `giorniControllo: 90,` dopo `cicloOrigine: null,`. È la fixture dei test di `list-builder`, `planner` e `lista.generaListe`: senza, i test di oggi sui controlli staple fallirebbero allo Step 7 per una ragione che non c'entra. Le altre fixture sono allo Step 9.

- [ ] **Step 3: I test di `pantry.ts` che falliscono.** In `src/domain/__tests__/pantry.test.ts`:
  - l'import in cima diventa:

```ts
import {
  nuovoResiduo, serveControllo, GIORNI_CONTROLLO_DEFAULT, CADENZE, testoCadenza, ogniCadenza, fraCadenza,
  residuoUtilizzabile, effettoCorrezione, scadenzaResiduo, scadenzaStimata,
} from '../pantry';
```

  - nel `describe('serveControllo')` aggiungi `giorniControllo: 90` a **ognuna** delle sei chiamate esistenti, senza toccare gli attesi. Per esempio: `serveControllo({ ultimoAcquisto: '2026-05-28', ultimoCheck: null, oggi, giorniControllo: 90 })`;
  - il test `usa la costante dichiarata, non un numero magico` diventa:

```ts
  it('il default è 90, la cadenza fissa di prima: a parità di dati la lista non cambia', () => {
    expect(GIORNI_CONTROLLO_DEFAULT).toBe(90);
  });
```

  - in fondo al file aggiungi:

```ts
describe('serveControllo con la cadenza delle Impostazioni (spec fase 5 §E.1)', () => {
  const oggi = '2026-08-26';

  it('ogni mese: chiede dal trentesimo giorno', () => {
    expect(serveControllo({ ultimoAcquisto: '2026-07-28', ultimoCheck: null, oggi, giorniControllo: 30 })).toBe(false); // 29 giorni
    expect(serveControllo({ ultimoAcquisto: '2026-07-27', ultimoCheck: null, oggi, giorniControllo: 30 })).toBe(true); // 30 giorni
  });

  it('ogni 2 mesi: chiede dal sessantesimo giorno', () => {
    expect(serveControllo({ ultimoAcquisto: '2026-06-28', ultimoCheck: null, oggi, giorniControllo: 60 })).toBe(false); // 59
    expect(serveControllo({ ultimoAcquisto: '2026-06-27', ultimoCheck: null, oggi, giorniControllo: 60 })).toBe(true); // 60
  });

  it('ogni 3 mesi: il comportamento di prima', () => {
    expect(serveControllo({ ultimoAcquisto: '2026-05-29', ultimoCheck: null, oggi, giorniControllo: 90 })).toBe(false); // 89
    expect(serveControllo({ ultimoAcquisto: '2026-05-28', ultimoCheck: null, oggi, giorniControllo: 90 })).toBe(true); // 90
  });

  it('un «sì» recente zittisce il controllo con qualunque cadenza', () => {
    for (const g of CADENZE) {
      expect(serveControllo({ ultimoAcquisto: '2026-01-10', ultimoCheck: '2026-08-20', oggi, giorniControllo: g })).toBe(false);
    }
  });

  it('senza un acquisto a storico non chiede niente, con qualunque cadenza', () => {
    for (const g of CADENZE) {
      expect(serveControllo({ ultimoAcquisto: null, ultimoCheck: null, oggi, giorniControllo: g })).toBe(false);
    }
  });
});

describe('le cadenze e il loro testo (spec fase 5 §C.6, §I)', () => {
  it('tre cadenze, dalla più fitta', () => {
    expect(CADENZE).toEqual([30, 60, 90]);
  });

  it('il testo della riga e del segmento', () => {
    expect(testoCadenza(30)).toBe('OGNI MESE');
    expect(testoCadenza(60)).toBe('OGNI 2 MESI');
    expect(testoCadenza(90)).toBe('OGNI 3 MESI');
  });

  // Decisione di Andrea del 26/09: i due testi di oggi che dicevano «90 giorni» dicono la cadenza.
  it('a inizio frase: Ogni mese, Ogni 2 mesi, Ogni 3 mesi', () => {
    expect(CADENZE.map(ogniCadenza)).toEqual(['Ogni mese', 'Ogni 2 mesi', 'Ogni 3 mesi']);
  });

  it('in mezzo a una frase: fra un mese, fra 2 mesi, fra 3 mesi', () => {
    expect(CADENZE.map(fraCadenza)).toEqual(['fra un mese', 'fra 2 mesi', 'fra 3 mesi']);
  });
});
```

(I giorni sono contati con `giorniTra`, in UTC: dal 27/07 al 26/08 sono 30, dal 27/06 al 26/08 sono 60, dal 28/05 al 26/08 sono 90. È lo stesso conto del test di oggi `chiede esattamente al novantesimo giorno`.)

- [ ] **Step 4: Verifica che falliscano.**

Run: `npx vitest run src/domain/__tests__/pantry.test.ts`
Expected: FAIL. `GIORNI_CONTROLLO_DEFAULT`, `CADENZE`, `testoCadenza`, `ogniCadenza` e `fraCadenza` non sono esportate.

- [ ] **Step 5: Implementa in `src/domain/pantry.ts`.** L'import in cima diventa:

```ts
import type { AreaId, GiorniControllo } from './types';
import { giorniTra, sommaGiorni } from './date';

export type { GiorniControllo } from './types';
```

Sostituisci `GIORNI_CONTROLLO_STAPLE` (con la sua docstring), `ServeControlloInput` e `serveControllo` con:

```ts
/**
 * Le tre cadenze dei controlli staple (spec fase 5 §E.1, §C.6), dalla più
 * fitta: ogni mese, ogni 2 mesi, ogni 3 mesi. Sono i tre valori che il check
 * della colonna `settings.giorni_controllo` ammette.
 */
export const CADENZE: readonly GiorniControllo[] = [30, 60, 90];

/**
 * La cadenza di chi non l'ha mai scelta: 90 giorni, cioè l'intervallo fisso
 * che prima della fase 5 si chiamava GIORNI_CONTROLLO_STAPLE (decisione del
 * 2026-08-26, che sostituiva la soglia `giorni_stimati × 0.8` della regola 7).
 * Deve coincidere col default della colonna.
 */
export const GIORNI_CONTROLLO_DEFAULT: GiorniControllo = 90;

/**
 * Il testo della cadenza in mono maiuscolo: il valore della riga nel
 * pannello e la sottoriga della Riga di controllo (`CONTROLLO {testo}`).
 */
export function testoCadenza(g: GiorniControllo): 'OGNI MESE' | 'OGNI 2 MESI' | 'OGNI 3 MESI' {
  switch (g) {
    case 30: return 'OGNI MESE';
    case 60: return 'OGNI 2 MESI';
    case 90: return 'OGNI 3 MESI';
  }
}

/**
 * La cadenza a inizio frase: la nota della classe «a stima» nell'editor
 * dell'ingrediente («Ogni 3 mesi dall'ultimo acquisto…», Task 12). Prima della
 * fase 5 quella nota diceva «Ogni 90 giorni» (decisione di Andrea del 26/09).
 */
export function ogniCadenza(g: GiorniControllo): 'Ogni mese' | 'Ogni 2 mesi' | 'Ogni 3 mesi' {
  switch (g) {
    case 30: return 'Ogni mese';
    case 60: return 'Ogni 2 mesi';
    case 90: return 'Ogni 3 mesi';
  }
}

/**
 * La cadenza in mezzo a una frase: `CHIUDENDO LA SPESA` in Lista fatta
 * («Serve solo a ricordarti fra 3 mesi che l'olio…»). Prima diceva «fra 90
 * giorni» (decisione di Andrea del 26/09).
 */
export function fraCadenza(g: GiorniControllo): 'fra un mese' | 'fra 2 mesi' | 'fra 3 mesi' {
  switch (g) {
    case 30: return 'fra un mese';
    case 60: return 'fra 2 mesi';
    case 90: return 'fra 3 mesi';
  }
}

export interface ServeControlloInput {
  ultimoAcquisto: string | null;
  ultimoCheck: string | null;
  /** ISO yyyy-mm-dd */
  oggi: string;
  /**
   * La cadenza delle Impostazioni. Obbligatoria, non facoltativa: un
   * chiamante che la dimentica tornerebbe in silenzio ai 90 giorni fissi.
   */
  giorniControllo: GiorniControllo;
}

/**
 * Vale solo per la classe `stima`; chi chiama filtra la classe.
 * Il conto riparte dal più recente fra l'ultimo acquisto e l'ultimo "sì":
 * senza questo, rispondere "sì" non zittirebbe mai il controllo.
 */
export function serveControllo(i: ServeControlloInput): boolean {
  if (!i.ultimoAcquisto) return false;
  const riferimento =
    i.ultimoCheck && i.ultimoCheck > i.ultimoAcquisto ? i.ultimoCheck : i.ultimoAcquisto;
  return giorniTra(riferimento, i.oggi) >= i.giorniControllo;
}
```

Run: `npx vitest run src/domain/__tests__/pantry.test.ts`
Expected: PASS.

- [ ] **Step 6: La regola 7 di `costruisciLista`, test prima.** `costruisciLista` riceve già l'oggetto `Impostazioni` intero (`ListaInput.impostazioni: Impostazioni`, `src/domain/list-builder.ts:96-104` [misurato]): non serve un campo nuovo nell'input. In `src/domain/__tests__/list-builder.test.ts`, in fondo:

```ts
describe('costruisciLista — la cadenza dei controlli (spec fase 5 §E.1)', () => {
  // Olio comprato il 20/07: al 30/08 (OGGI) sono passati 41 giorni.
  const pantry = () => dispensaVuota().map((p) =>
    p.ingredientId === 'olio' ? { ...p, ultimoAcquisto: '2026-07-20' } : p);
  const controlli = (giorniControllo: 30 | 60 | 90) =>
    base({ pantry: pantry(), impostazioni: { ...IMPOSTAZIONI, giorniControllo } })
      .base.flatMap((s) => s.controlli)
      .map((c) => c.ingredientId);

  it('ogni mese: dopo 41 giorni chiede dell\'olio', () => {
    expect(controlli(30)).toEqual(['olio']);
  });

  it('ogni 2 mesi e ogni 3 mesi: dopo 41 giorni non ancora', () => {
    expect(controlli(60)).toEqual([]);
    expect(controlli(90)).toEqual([]);
  });

  it('la cadenza cambia solo i controlli: voci e non ricomprato restano identici', () => {
    const a = base({ pantry: pantry(), impostazioni: { ...IMPOSTAZIONI, giorniControllo: 30 } });
    const b = base({ pantry: pantry(), impostazioni: { ...IMPOSTAZIONI, giorniControllo: 90 } });
    const voci = (r: typeof a) => [...r.base, ...r.topup].flatMap((s) => s.voci);
    expect(voci(a)).toEqual(voci(b));
    expect(a.evitato).toEqual(b.evitato);
  });
});
```

Run: `npx vitest run src/domain/__tests__/list-builder.test.ts`
Expected: FAIL. `tsc` non gira qui, ma a runtime `serveControllo` riceve `giorniControllo: undefined`, e `giorniTra(...) >= undefined` è sempre falso: `controlli(30)` torna `[]`.

- [ ] **Step 7: Implementa la regola 7.** In `src/domain/list-builder.ts`, nel ciclo `// Regola 7` (righe ~189-199), la chiamata diventa:

```ts
    if (!serveControllo({
      ultimoAcquisto: p.ultimoAcquisto,
      ultimoCheck: p.ultimoCheck,
      oggi,
      giorniControllo: impostazioni.giorniControllo,
    })) {
      continue;
    }
```

e nella docstring di `costruisciLista` la riga `della spec, con la regola 7 sostituita dai 90 giorni fissi.` diventa `della spec, con la regola 7 sostituita dalla cadenza delle Impostazioni (30, 60 o 90 giorni; spec fase 5 §E.1).`. Nessun'altra regola cambia.

Nel commento di `allineaTopUp` in `src/data/lista.ts`, `i controlli staple nascono dal ciclo dei 90 giorni` diventa `i controlli staple nascono dalla cadenza dei controlli`.

Run: `npx vitest run src/domain/__tests__/list-builder.test.ts`
Expected: PASS, compresi i tre test di oggi in `costruisciLista — controlli staple`. Usano `IMPOSTAZIONI` delle fixture, che ha già `giorniControllo: 90` dallo Step 2. Se uno di quei tre fallisce, controlla prima la fixture: con `giorniControllo` assente il controllo non scatta mai.

- [ ] **Step 8: `src/data/impostazioni.ts`, test prima.** In `src/data/__tests__/impostazioni.test.ts`:
  - l'import diventa `import { MAX_PORZIONI, MIN_PORZIONI, leggiImpostazioni, salvaImpostazioni, salvaSlotDefs } from '../impostazioni';`;
  - `BASE` prende `giorniControllo: 90,` dopo `cicloOrigine: null,`;
  - in fondo al file aggiungi:

```ts
/**
 * Un client finto per la sola lettura di settings: `select → eq →
 * maybeSingle` risponde con la riga data, e registra la stringa della select.
 */
function clientConRiga(riga: Record<string, unknown> | null) {
  const colonne: string[] = [];
  const proxy: Record<string, unknown> = {
    select: (c: string) => { colonne.push(c); return proxy; },
    eq: () => proxy,
    maybeSingle: () => Promise.resolve({ data: riga, error: null }),
  };
  return { sb: { from: () => proxy }, colonne };
}

const RIGA = {
  moltiplicatore_porzioni: 2,
  ordine_aree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'],
  settimane_ciclo: 1,
  ciclo_origine: null,
};

describe('leggiImpostazioni — la cadenza dei controlli (spec fase 5 §E.1)', () => {
  beforeEach(() => vi.mocked(client).mockReset());

  it('chiede la colonna giorni_controllo', async () => {
    const { sb, colonne } = clientConRiga({ ...RIGA, giorni_controllo: 60 });
    vi.mocked(client).mockReturnValue(sb as never);
    await leggiImpostazioni();
    expect(colonne[0]).toContain('giorni_controllo');
  });

  it('legge la cadenza salvata', async () => {
    const { sb } = clientConRiga({ ...RIGA, giorni_controllo: 30 });
    vi.mocked(client).mockReturnValue(sb as never);
    expect((await leggiImpostazioni()).giorniControllo).toBe(30);
  });

  it('senza riga settings vale il default, 90', async () => {
    const { sb } = clientConRiga(null);
    vi.mocked(client).mockReturnValue(sb as never);
    expect((await leggiImpostazioni()).giorniControllo).toBe(90);
  });

  it.each([45, 0, null, undefined, '30'])('un valore fuori dalle tre cadenze (%s) vale il default', async (v) => {
    const { sb } = clientConRiga({ ...RIGA, giorni_controllo: v });
    vi.mocked(client).mockReturnValue(sb as never);
    expect((await leggiImpostazioni()).giorniControllo).toBe(90);
  });
});

describe('salvaImpostazioni — la cadenza dei controlli (spec fase 5 §E.1)', () => {
  beforeEach(() => vi.mocked(client).mockReset());

  it.each([30, 60, 90] as const)('scrive giorni_controllo = %i', async (g) => {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await salvaImpostazioni({ ...BASE, giorniControllo: g });
    expect((upsert['settings'][0] as Record<string, unknown>).giorni_controllo).toBe(g);
  });

  it.each([0, 45, 91, 30.5, NaN])('rifiuta %s senza scrivere niente', async (g) => {
    const { sb, upsert } = creaClientMock();
    vi.mocked(client).mockReturnValue(sb as never);
    await expect(salvaImpostazioni({ ...BASE, giorniControllo: g as never })).rejects.toThrow('cadenza non valida');
    expect(upsert['settings']).toBeUndefined();
    // Come per le persone: il controllo viene prima di qualunque accesso al server.
    expect(idCasa).not.toHaveBeenCalled();
  });
});
```

(Il caso `'30'` stringa fissa una scelta: il mapper accetta solo un numero vero, e una stringa vale il default. La colonna è `int`, e PostgREST restituisce gli `int` come numeri JSON [ipotesi, non testata su questa colonna: oggi `settimane_ciclo`, anch'essa `int`, si legge con `Number(...)` per prudenza]. Se preferisci la stessa prudenza, cioè `Number(data.giorni_controllo)` prima del controllo, togli `'30'` dall'`it.each` e scrivi la scelta nel registro.)

Run: `npx vitest run src/data/__tests__/impostazioni.test.ts`
Expected: FAIL sui casi nuovi.

- [ ] **Step 9: Le fixture `Impostazioni`.** Con il campo obbligatorio, `tsc` rifiuta ogni oggetto `Impostazioni` senza `giorniControllo`. L'elenco è **misurato il 25/09** applicando lo Step 2 a una copia del repo e lanciando `npx tsc --noEmit`. `tsc` segnala 47 righe in 19 file, queste. In ognuna aggiungi `giorniControllo: 90` accanto a `cicloOrigine`, senza cambiare nient'altro:
  - `src/data/impostazioni.ts:72` e `:79`: li riscrive lo Step 10, non qui;
  - `src/domain/__tests__/fixtures.ts:80` (`IMPOSTAZIONI`, già fatta allo Step 2);
  - `src/data/__tests__/impostazioni.test.ts:53` (`BASE`, già fatto allo Step 8);
  - `src/data/__tests__/importa.test.ts:49`;
  - `src/data/__tests__/lista.allineaTopUp.test.ts`: la costante `IMPOSTAZIONI` a riga ~84, **senza tipo**, quindi `giorniControllo: 90 as const`. Gli errori `tsc` sono alle righe 96 e 185, dove la si passa a `leggiImpostazioni`;
  - `src/data/__tests__/lista.generaListe.test.ts:103`;
  - `src/data/__tests__/settimana.aggiornaSlot.test.ts:163`;
  - `src/data/__tests__/settimana.completaAssegnazioni.test.ts:19`;
  - `src/data/__tests__/settimana.creaSettimana.test.ts:28` (la funzione che costruisce l'oggetto);
  - `src/app/(app)/dispensa/__tests__/page.test.tsx:100`;
  - `src/app/(app)/impostazioni/__tests__/page.test.tsx`: righe 63, 123, 162, 189, 224, 263, 310, 391, 626, 658, 671, 684, 709, 728, 739. Il file si migra col Task 11, ma fino ad allora deve compilare. Alla riga 189 l'errore viene dalla funzione `impostazioni` di riga ~184, che **non ha tipo**: lì serve `giorniControllo: 90 as const`, o `number` non entra in `GiorniControllo`;
  - `src/app/(app)/impostazioni/reparti/__tests__/page.test.tsx:21`.

  **Due attesi che `tsc` non vede e la suite sì** [misurato: suite intera nella copia con questo task applicato, 2 test rossi prima di questa correzione]. Sono oggetti letterali passati a `toEqual`/`toHaveBeenCalledWith` senza tipo. La pagina ora salva anche `giorniControllo: 90`, letto dal mock, e l'atteso non l'ha:
  - `src/app/(app)/impostazioni/__tests__/page.test.tsx`, test `+ salva subito le impostazioni intere con 2…`: il `toEqual` su `mock.calls[0][0]` (riga ~133);
  - `src/app/(app)/impostazioni/reparti/__tests__/page.test.tsx`, test `SALVA ORDINE persiste il nuovo ordine…`: il `toHaveBeenCalledWith` (riga ~75).

  In entrambi aggiungi `giorniControllo: 90` all'atteso. Non è un valore che cambia: è il campo nuovo che viaggia invariato, ed è proprio quello che quei test provano («lasciando intatto tutto il resto»).
  - `src/app/(app)/piano/__tests__/page.test.tsx`: 182, 243, 354, 603, 629, 810, 838, 862;
  - `src/app/(app)/piano/[data]/[slotDefId]/scegli/__tests__/page.test.tsx`: 190, 205, 218, 234, 249, 588;
  - `src/app/(app)/piatti/__tests__/page.test.tsx:59`, `ricerca.test.tsx:42`, `vista.test.tsx:94`;
  - `src/app/(app)/piatti/[id]/__tests__/page.test.tsx:91`;
  - `src/app/(app)/piatti/veloce/__tests__/page.test.tsx:76`.

Le righe sono quelle di `main` `feb4551`: i Task 1 e 2 possono averle spostate di poco. La lista che conta è quella che `npx tsc --noEmit` stampa dopo lo Step 10. Dev'essere vuota, e se compare un file non elencato qui, lo si aggiunge e lo si scrive nel registro.

- [ ] **Step 10: Implementa `src/data/impostazioni.ts`.** Import in cima:

```ts
import type { GiorniControllo, Impostazioni, MealSlotDef } from '@/domain/types';
import { CADENZE, GIORNI_CONTROLLO_DEFAULT } from '@/domain/pantry';
```

(l'import di `Impostazioni, MealSlotDef` esistente si fonde con questo). Sotto `personeValide`:

```ts
/**
 * Una delle tre cadenze (spec fase 5 §E.1). Solo un numero vero: la colonna
 * è `int` con un check sugli stessi tre valori, quindi qualunque altra cosa
 * è un dato che non viene dal database.
 */
function cadenzaValida(v: unknown): v is GiorniControllo {
  return typeof v === 'number' && (CADENZE as readonly number[]).includes(v);
}
```

In `leggiImpostazioni`:
- la select diventa `'moltiplicatore_porzioni, ordine_aree, settimane_ciclo, ciclo_origine, giorni_controllo'`;
- nel ramo `if (!data)` aggiungi `giorniControllo: GIORNI_CONTROLLO_DEFAULT,`;
- nel return finale aggiungi:

```ts
    // Il check della colonna ammette solo 30, 60 e 90: qui un valore diverso
    // vuol dire una riga non passata dal database (un mock, un dato a mano),
    // e vale il default invece di un conto sbagliato nella regola 7.
    giorniControllo: cadenzaValida(data.giorni_controllo) ? data.giorni_controllo : GIORNI_CONTROLLO_DEFAULT,
```

In `salvaImpostazioni`, subito dopo il controllo delle persone:

```ts
  if (!cadenzaValida(i.giorniControllo)) throw new Error('cadenza non valida');
```

e nell'`upsert`, dopo `settimane_ciclo`:

```ts
    giorni_controllo: i.giorniControllo,
```

Chi chiama `salvaImpostazioni` oggi passa sempre un oggetto nato da `leggiImpostazioni` con uno spread: `importa.ts:128-133`, `impostazioni/reparti/page.tsx:73` e `persistiImpostazioni` in `impostazioni/page.tsx:264` [misurato]. `giorniControllo` quindi viaggia già, e nessuno di loro lo azzera.

Run: `npx vitest run src/data/__tests__/impostazioni.test.ts src/domain/__tests__/pantry.test.ts src/domain/__tests__/list-builder.test.ts`
Expected: PASS.

- [ ] **Step 11: La Riga di controllo, test prima.** `src/components/__tests__/riga-controllo.test.tsx` diventa:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RigaControllo } from '../RigaControllo';

describe('RigaControllo', () => {
  it.each([
    [30, 'CONTROLLO OGNI MESE'],
    [60, 'CONTROLLO OGNI 2 MESI'],
    [90, 'CONTROLLO OGNI 3 MESI'],
  ] as const)('con la cadenza a %i giorni la sottoriga dice %s (spec fase 5 §I)', (g, testo) => {
    render(<RigaControllo nome="farina" area="cereali" giorniControllo={g} onSi={vi.fn()} onNo={vi.fn()} />);
    expect(screen.getByText(testo)).toBeInTheDocument();
    // Il testo di prima non torna, né il conto in giorni.
    expect(screen.queryByText(/GIORNI/)).not.toBeInTheDocument();
    expect(screen.queryByText(/SCADUTO/)).not.toBeInTheDocument();
  });

  it('le pillole restano SÌ e NO, coi loro nomi accessibili', () => {
    render(<RigaControllo nome="farina" area="cereali" giorniControllo={90} onSi={vi.fn()} onNo={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Sì, hai ancora farina' })).toHaveTextContent('SÌ');
    expect(screen.getByRole('button', { name: 'No, comprane una confezione di farina' })).toHaveTextContent('NO');
  });
});
```

Run: `npx vitest run src/components/__tests__/riga-controllo.test.tsx`
Expected: FAIL. Oggi la riga dice `CONTROLLO OGNI 90 GIORNI`.

- [ ] **Step 12: Implementa `RigaControllo`.** In `src/components/RigaControllo.tsx`:
  - l'import `GIORNI_CONTROLLO_STAPLE` diventa `import { testoCadenza, type GiorniControllo } from '@/domain/pantry';`;
  - in `Props`, dopo `area`:

```ts
  /** La cadenza delle Impostazioni: la sottoriga la dice a parole (spec fase 5 §E.1). */
  giorniControllo: GiorniControllo;
```

  - la firma diventa `export function RigaControllo({ nome, area, giorniControllo, onSi, onNo, disabilitato = false }: Props)`;
  - la sottoriga, con il suo commento, diventa:

```tsx
        {/* La riga esiste solo quando il controllo è scaduto: dirlo di nuovo era
            ridondante. La cadenza viene dalle Impostazioni e il testo dal
            dominio (testoCadenza), non riscritto qui. */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.11em', color: 'var(--testo-2)', marginTop: 4 }}>
          {`CONTROLLO ${testoCadenza(giorniControllo)}`}
        </div>
```

Run: `npx vitest run src/components/__tests__/riga-controllo.test.tsx`
Expected: PASS.

- [ ] **Step 13: `leggiListe` porta la cadenza, test prima.** Crea `src/data/__tests__/lista.leggiListe.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn() }));
vi.mock('../settimana', () => ({ leggiSlotSettimana: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiRepertorio: vi.fn(), leggiIngredienti: vi.fn() }));
vi.mock('../dispensa', () => ({ leggiDispensa: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiImpostazioni: vi.fn() }));

import { client } from '../supabase';
import { leggiImpostazioni } from '../impostazioni';
import { leggiListe } from '../lista';
import { IMPOSTAZIONI } from '@/domain/__tests__/fixtures';

/** `from → select → eq → returns`, poi `await`: risponde con le liste date. */
function clientConListe(liste: unknown[]) {
  const proxy: Record<string, unknown> = {
    select: () => proxy,
    eq: () => proxy,
    returns: () => proxy,
    then(ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) {
      return Promise.resolve({ data: liste, error: null }).then(ok, ko);
    },
  };
  return { from: () => proxy };
}

const LISTE = [
  { id: 'l-base', tipo: 'base', shopping_list_item: [] },
  { id: 'l-topup', tipo: 'topup', shopping_list_item: [] },
];

describe('leggiListe — la cadenza dei controlli (spec fase 5 §E.1)', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(leggiImpostazioni).mockReset();
  });

  it('porta la cadenza delle impostazioni che legge già per l\'ordine delle aree', async () => {
    vi.mocked(client).mockReturnValue(clientConListe(LISTE) as never);
    vi.mocked(leggiImpostazioni).mockResolvedValue({ ...IMPOSTAZIONI, giorniControllo: 30 });

    const lista = await leggiListe('week-1');

    expect(lista?.giorniControllo).toBe(30);
    expect(lista?.ordineAree).toEqual(IMPOSTAZIONI.ordineAree);
    // Nessuna lettura in più: la stessa chiamata dà ordine e cadenza.
    expect(leggiImpostazioni).toHaveBeenCalledTimes(1);
  });

  it('senza liste torna null e non legge le impostazioni', async () => {
    vi.mocked(client).mockReturnValue(clientConListe([]) as never);
    expect(await leggiListe('week-1')).toBeNull();
    expect(leggiImpostazioni).not.toHaveBeenCalled();
  });
});
```

Run: `npx vitest run src/data/__tests__/lista.leggiListe.test.ts`
Expected: FAIL sul primo test (`giorniControllo` è `undefined`). Il secondo passa già: è il comportamento di oggi, e resta.

- [ ] **Step 14: Implementa in `src/data/lista.ts`.** Import: `import type { AreaId, GiorniControllo, UnitaBase } from '@/domain/types';`. In `ListaSalvata`, dopo `ordineAree?`:

```ts
  /**
   * La cadenza dei controlli (spec fase 5 §E.1), letta da `leggiListe` con la
   * stessa `leggiImpostazioni` di `ordineAree`: la Riga di controllo la dice
   * a parole. **Facoltativa per lo stesso motivo di `ordineAree`**:
   * un'istantanea offline salvata prima della fase 5 non ce l'ha, e chi la
   * mostra usa GIORNI_CONTROLLO_DEFAULT.
   */
  giorniControllo?: GiorniControllo;
```

Nel `return` di `leggiListe`, dopo `ordineAree: impostazioni.ordineAree,`:

```ts
    giorniControllo: impostazioni.giorniControllo,
```

Run: `npx vitest run src/data/__tests__/lista.leggiListe.test.ts src/data/__tests__/lista.test.ts`
Expected: PASS.

- [ ] **Step 15: La Lista passa la cadenza, test prima.** In `src/app/(app)/lista/__tests__/page.test.tsx`, nel `describe('Lista')`:

```tsx
  it('la riga di controllo dice la cadenza delle Impostazioni (spec fase 5 §E.1)', async () => {
    vi.mocked(leggiListe).mockResolvedValue({ ...buildLista(), giorniControllo: 30 });
    rendi();
    expect(await screen.findByText('CONTROLLO OGNI MESE')).toBeInTheDocument();
  });

  it('una lista senza cadenza (istantanea offline di prima della fase 5) dice ogni 3 mesi', async () => {
    vi.mocked(leggiListe).mockResolvedValue(buildLista());
    rendi();
    expect(await screen.findByText('CONTROLLO OGNI 3 MESI')).toBeInTheDocument();
  });
```

Run: `npx vitest run "src/app/(app)/lista/__tests__/page.test.tsx"`
Expected: FAIL. `RigaControllo` non riceve la prop, e `testoCadenza(undefined)` torna `undefined`: la riga dice `CONTROLLO undefined`.

- [ ] **Step 16: Implementa in `src/app/(app)/lista/page.tsx`.**
  - Import: `import { GIORNI_CONTROLLO_DEFAULT, type GiorniControllo } from '@/domain/pantry';`.
  - Nel componente `Lista`, dove oggi c'è `const sezioni = fondiSezioni(lista);`, aggiungi sotto:

```tsx
  // La cadenza viaggia con la lista (leggiListe la legge insieme all'ordine
  // delle aree): nessuna lettura in più. Un'istantanea offline di prima della
  // fase 5 non ce l'ha, e vale il default.
  const giorniControllo = lista.giorniControllo ?? GIORNI_CONTROLLO_DEFAULT;
```

  - nel `sezioni.map(...)`, `<CartaSezione … />` prende `giorniControllo={giorniControllo}`;
  - `CartaSezione` prende la prop nella destrutturazione e nel tipo (`giorniControllo: GiorniControllo;`) e la passa: `<RigaControllo … giorniControllo={giorniControllo} … />`.

Run: `npx vitest run "src/app/(app)/lista/__tests__/page.test.tsx" src/components/__tests__/riga-controllo.test.tsx`
Expected: PASS.

- [ ] **Step 17: Lista fatta dice la cadenza (decisione di Andrea del 26/09).** In
  `src/app/(app)/lista/fatta/page.tsx:220` la scheda `CHIUDENDO LA SPESA` dice oggi «L’app
  registra cosa hai comprato e quando. Serve solo a ricordarti fra 90 giorni che l’olio sta per
  finire: non lo vedi da nessuna parte finché non serve.» [misurato: le due righe di JSX
  219–221, che React unisce con uno spazio]. Cambia solo «fra 90 giorni», che diventa
  `fraCadenza(giorniControllo)`; il resto, apostrofi tipografici compresi, resta com'è. La
  pagina legge già `leggiListe`, che dallo Step 14 porta `giorniControllo`: nessuna lettura in
  più.

  Prima i test, in `src/app/(app)/lista/fatta/__tests__/page.test.tsx`, in fondo:

```tsx
describe('Lista fatta — CHIUDENDO LA SPESA dice la cadenza (decisione di Andrea del 26/09)', () => {
  it.each([
    [30, 'fra un mese'],
    [60, 'fra 2 mesi'],
    [90, 'fra 3 mesi'],
  ] as const)('con la cadenza a %i giorni dice «%s»', async (g, pezzo) => {
    vi.mocked(leggiListe).mockResolvedValue({ ...listaFinita(), giorniControllo: g });
    render(<ListaFatta />);
    expect(await screen.findByText(
      `L’app registra cosa hai comprato e quando. Serve solo a ricordarti ${pezzo} che l’olio sta per finire: non lo vedi da nessuna parte finché non serve.`,
    )).toBeInTheDocument();
  });

  it('una lista senza cadenza (istantanea offline di prima della fase 5) dice fra 3 mesi', async () => {
    render(<ListaFatta />);
    expect(await screen.findByText(/ricordarti fra 3 mesi che l’olio/)).toBeInTheDocument();
    expect(screen.queryByText(/90 giorni/)).not.toBeInTheDocument();
  });
});
```

Run: `npx vitest run "src/app/(app)/lista/fatta/__tests__/page.test.tsx"`
Expected: FAIL. Oggi la frase dice «fra 90 giorni».

  Poi `src/app/(app)/lista/fatta/page.tsx`:
  - import: `import { GIORNI_CONTROLLO_DEFAULT, fraCadenza, type GiorniControllo } from '@/domain/pantry';`;
  - in `interface Stato`, dopo `evitato`:

```ts
  /** La cadenza dei controlli, per la frase di CHIUDENDO LA SPESA: viaggia con la lista (leggiListe). */
  giorniControllo: GiorniControllo;
```

  - in `carica()`, nel `setStato({ … })`, dopo `evitato,`:
    `giorniControllo: lista.giorniControllo ?? GIORNI_CONTROLLO_DEFAULT,` (un'istantanea di prima
    della fase 5 non ce l'ha, come nella Lista);
  - le due righe della frase diventano una sola espressione, così il testo resta un nodo solo:

```tsx
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink)' }}>
            {`L’app registra cosa hai comprato e quando. Serve solo a ricordarti ${fraCadenza(stato.giorniControllo)} che l’olio sta per finire: non lo vedi da nessuna parte finché non serve.`}
          </div>
```

Run: `npx vitest run "src/app/(app)/lista/fatta"`
Expected: PASS, compresi i test di oggi (cercano `CHIUDENDO LA SPESA`, non la frase).

- [ ] **Step 18: L'indagine sull'[ipotesi] di §E.1, con l'esito nel registro.** La spec dice: «[ipotesi] La lista si ricalcola a ogni lettura dal dominio, non si congela alla creazione». Rileggi tu questi punti del codice (le righe sono di `feb4551`) e conferma ciascuna riga prima di scriverla:
  1. `generaListe` (`src/data/lista.ts`) chiama `costruisciLista` una volta sola e scrive le righe in `shopping_list_item`, controlli compresi (`origine: 'controllo'`, `confezioni: 0`). Docstring: «Le quantità non si ricalcolano al volo a ogni apertura».
  2. `generaListe` ha un solo chiamante, `confermaEVaiLista` in `src/app/(app)/piano/page.tsx`, e solo su una settimana in `bozza` (`CONFERMA E CREA LA LISTA`). Verifica con `grep -rn "generaListe(" src --include="*.ts*" | grep -v __tests__`.
  3. `leggiListe` ricostruisce le sezioni dalle righe congelate e non chiama `costruisciLista` («la lista non deve cambiare sotto gli occhi di chi è in corsia»).
  4. `allineaTopUp`, chiamata dalla Lista a ogni apertura, chiama `costruisciLista` ma aggiunge solo voci del piano, **mai controlli** (`.flatMap((sezione) => sezione.voci)`).

  Esito atteso, da scrivere nel registro sotto il Task 3:

  > **Cadenza: la lista si congela, l'[ipotesi] di §E.1 è falsa [misurato 25/09, `src/data/lista.ts` e `piano/page.tsx`].** I controlli nascono solo in `generaListe`, che gira una volta per settimana, alla conferma del Piano. `leggiListe` rilegge le righe congelate, e `allineaTopUp` non aggiunge controlli. Quindi una cadenza cambiata vale dalla lista della prossima settimana confermata; quella già creata non cambia. Il testo della spec §C.6, «vale dalla prossima lista costruita», è vero alla lettera, e nessun testo dell'interfaccia promette altro. **Un effetto da sapere:** l'etichetta `CONTROLLO OGNI …` segue subito l'impostazione (arriva da `leggiListe`), mentre le righe di controllo già congelate sono state scelte con la cadenza di prima. Per esempio, si passa da 3 mesi a 1 mese a metà settimana: le righe di questa settimana restano quelle scelte a 90 giorni, ma dicono `CONTROLLO OGNI MESE`. Scelta accettata: l'etichetta dice la regola in vigore, e la differenza dura al più fino alla prossima conferma. Se la si volesse congelare, servirebbe una colonna in `shopping_list`: non vale una migrazione.

  Se una delle quattro letture non torna, per esempio un altro chiamante di `generaListe`, fermati: l'esito cambia e va riscritto.

- [ ] **Step 19: Il registro, le altre due voci.**
  - **`src/data/lista.ts`:** `ListaSalvata.giorniControllo?` e il campo in `leggiListe`, per non fare una lettura in più (scelta 3 in testa al task). La Lista e Lista fatta la leggono da lì.
  - **I due testi di oggi che dicevano «90 giorni»** [misurato: `grep -rn "90 giorni" src`]
    dicono la cadenza scelta (decisione di Andrea del 26/09): la frase di Lista fatta in questo
    task (Step 17, `fraCadenza`), la nota della classe «a stima» nell'editor dell'ingrediente
    nel Task 12 (`ogniCadenza`), che quella nota la rende già.

- [ ] **Step 20: Verifica.**

Run: `npx vitest run src/domain src/data src/components/__tests__/riga-controllo.test.tsx "src/app/(app)/lista"`
Expected: PASS. **Nessun valore atteso dei test di oggi è cambiato.** I test esistenti toccati sono quelli degli Step 3, 8, 9 e 11: fixture, firme, e i due attesi dello Step 9 che prendono il campo nuovo. Lo Step 17 aggiunge test a Lista fatta senza toccare quelli di oggi. Se un atteso di `list-builder`, `planner`, `lista.generaListe`, `lista.allineaTopUp` o `conflitto` cambia, fermati e riportalo: a cadenza 90 la lista dev'essere identica.

Run: `npx vitest run` (la suite intera: le fixture dello Step 9 toccano le pagine)
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore. In un worktree nuovo, prima `npx next typegen`.

Run: `npm run lint`
Expected: pulito.

Run: `grep -rn "GIORNI_CONTROLLO_STAPLE" src`
Expected: una riga sola, la docstring di `GIORNI_CONTROLLO_DEFAULT` che ricorda il nome di prima. Nessun uso nel codice.

Run: `grep -rn "fra 90 giorni" src`
Expected: nessuna riga. (`Ogni 90 giorni` resta nell'editor dell'ingrediente fino al Task 12.)

- [ ] **Step 21: Commit.**

```bash
git add supabase/migrations/0015_cadenza_e_dispensa.sql src/domain src/data src/components/RigaControllo.tsx src/components/__tests__/riga-controllo.test.tsx "src/app/(app)" docs/2026-09-25-fase5-decisioni-esecuzione.md
```

```bash
git commit -m "feat: la cadenza dei controlli si sceglie (30, 60, 90 giorni) e la Riga di controllo la dice (migrazione 0015, prima parte)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Cancella la dispensa

La funzione SQL `cancella_dispensa()`, il suo wrapper e la Dispensa che si rilegge. **Review di correttezza.** Il punto delicato è quello che la spec lascia **[ipotesi]**: cosa succede ai pasti del piano legati ai Pronti quando i lotti spariscono. Lo Step 1 lo chiude leggendo il codice. Gli Step 2 e 3 applicano le due scelte che Andrea ha fatto il 26/09 su quella lettura: D1 = A e D2 = A.

Spec: §E.2, §D (`cancella-dispensa`), §C.11, §L («Cancella la dispensa da un membro»). Il dialogo e la riga del pannello sono del Task 7 (la cima); qui ci sono il dato e la pagina che ascolta.

**Il codice TypeScript di questo task è stato provato** [misurato 25/09]: i blocchi sono stati applicati a una copia di `feb4551` con il Task 3 già applicato. I test di `src/data` e della Dispensa passano (463), `tsc` e `lint` sono puliti. Il test della Dispensa fallisce se si toglie l'`addEventListener`, quindi prova davvero l'ascolto. **La SQL non è stata eseguita**: vedi lo Step 9.

**Files:**
- Modify: `supabase/migrations/0015_cadenza_e_dispensa.sql` (in coda: la funzione)
- Modify: `src/data/dispensa.ts` (`EVENTO_DISPENSA_CAMBIATA`, `cancellaDispensa`)
- Modify: `src/app/(app)/dispensa/page.tsx` (ascolta l'evento e rilegge)
- Test: `src/data/__tests__/dispensa.cancella.test.ts` (nuovo), `src/app/(app)/dispensa/__tests__/page.test.tsx`
- Modify: `docs/2026-09-25-fase5-decisioni-esecuzione.md` (il registro)

**Interfaces:**
- Consumes: la migrazione `0015` del Task 3 (si aggiunge in coda).
- Produces (ossatura, invariate):
  - `EVENTO_DISPENSA_CAMBIATA = 'spesa:dispensa-cambiata'`
  - `cancellaDispensa(): Promise<void>`, cioè `rpc('cancella_dispensa')`, che lancia l'errore. **Non** pubblica l'evento: lo fa chi chiama, se riesce (`window.dispatchEvent(new Event(EVENTO_DISPENSA_CAMBIATA))`, Task 7).
  - SQL: `public.cancella_dispensa() returns void`, `security invoker`, `set search_path = public`, eseguibile solo da `authenticated`.

- [ ] **Step 1: L'indagine obbligatoria (i Pronti e il piano), prima di qualunque SQL.** Leggi, nell'ordine:
  - `supabase/migrations/0009_meal_prepping.sql`;
  - `src/domain/pronti.ts` (`fattoreConsumo`, `porzioniUtilizzabili`);
  - `src/data/settimana.ts`, `aggiornaSlot` (righe ~324-640, con la docstring sopra: i gate su `daPronti`, il blocco «I Pronti», lo scalare FIFO, la restituzione, il ledger);
  - `src/data/pronti.ts`;
  - `src/app/(app)/piano/page.tsx` (`preparaPorzioni`, `usaPronta`, `nonUsarePronta`, `cucinatoNonMangiato`, `tornaAlPiano`, le etichette `Porzione pronta` / `+N porzioni`);
  - `src/app/(app)/dispensa/page.tsx`, `leggiTutto` (gli `impegni`);
  - `src/data/lista.ts`: `generaListe`, `allineaTopUp`, `chiudiSpesa`;
  - `src/domain/chiusura.ts`;
  - `supabase/migrations/0012_casa.sql` (`casa_id()` e il ciclo che rigenera le policy).

  Controlla una per una queste righe, **misurate il 25/09 su `feb4551`**. Poi copiale nel registro sotto «Task 4, indagine», con `[misurato]` e il file. Se una non torna, fermati e riporta: le decisioni degli Step 2 e 3 poggiano su tutte.

  - **M1. Nessun pasto punta a un lotto.** Il legame va dal lotto al pasto: `porzione_pronta.meal_slot_id references meal_slot(id) on delete set null`, `unique (meal_slot_id)` (0009). `meal_slot` non ha colonne verso `porzione_pronta`. Cancellare i lotti non rompe nessun vincolo di `meal_slot`.
  - **M2. `da_pronti = true` vuol dire «la porzione è già stata presa».** Quando si accende, `aggiornaSlot` scala subito una porzione dal lotto utilizzabile più vecchio dello stesso piatto (gate FIFO, poi `porzioni - 1` o delete del lotto a 1). Il pasto non ricorda da quale lotto. Per `fattoreConsumo` quel pasto consuma 0 crudo (`stato === 'casa' && !daPronti ? 1 : 0`): la lista non compra niente per lui.
  - **M3. Spegnere `da_pronti` restituisce la porzione.** `aggiornaSlot` la aggiunge al lotto utilizzabile più recente del piatto, e se non ce n'è nessuno **crea un lotto nuovo da 1** datato al pasto.
  - **M4. `porzioni_preparate = N > 0` produce un lotto, non lo consuma.** `aggiornaSlot` crea o aggiorna il lotto legato (`meal_slot_id` = il pasto, `preparata_il` = la data del pasto, `porzioni = N`). Se N cambia e il lotto legato non c'è più, lo **ricrea con N intero** (`insert … porzioni: porzioniPreparateDopo`). `fattoreConsumo` conta N qualunque sia lo stato: la lista compra per le porzioni in più.
  - **M5. Un lotto con `preparata_il` futura è una cottura pianificata** (`porzioniUtilizzabili` lo conta intero), e la Dispensa lo mostra fra i Pronti (`lottiVivi`).
  - **M6. `week.stato = 'chiusa'` non vuol dire «settimana passata».** `chiudiSpesa` (da `HAI PRESO TUTTO`) chiude la settimana quando si fa la spesa, di solito il lunedì, e non guarda la data. La settimana corrente è spesso `chiusa` con i giorni da martedì a domenica ancora davanti. Il filtro giusto per «pasti che devono ancora succedere» è quindi la **data del pasto**, non lo stato della settimana.
  - **M7. Il ledger degli storni.** Da `confermata` in poi, ogni `aggiornaSlot` che cambia il consumo di un pasto scrive la differenza `consumoSlot(prima) → consumoSlot(dopo)` in `meal_slot_storno` e la applica al residuo. Un `update` SQL su `meal_slot` **non** passa da lì.
  - **M8. `chiudiSpesa` scrive il residuo in assoluto, dai numeri congelati.** Per ogni voce della lista, `residuo = nuovoResiduo(residuo congelato in shopping_list_item, comprato, fabbisogno) + storni` (`calcolaChiusura`, e l'upsert su `pantry_state` in `chiudiSpesa`). Il residuo congelato è quello di `pantry_state` al momento di `generaListe`.
  - **M9. Le policy di casa.** Il ciclo di 0012 rigenera, per **ogni** tabella con `user_id` esistente allora, una sola policy `<tabella>_casa for all to authenticated using (user_id = (select casa_id())) with check (…)`. Vale per `pantry_state`, `porzione_pronta` (la sua policy della 0009 cade col `drop` del ciclo), `meal_slot` e `shopping_list_item`. `casa_id()` dà il proprietario a un membro e sé stesso a chi è solo o proprietario. Un `delete`/`update` `security invoker` con `where user_id = casa_id()` tocca quindi le righe della casa, sia per il proprietario sia per il membro. Nessuna migrazione revoca `delete`/`update` su queste tabelle ad `authenticated`; solo `import_uso` ha privilegi ristretti (0010) [misurato: `grep -n "revoke\|grant" supabase/migrations/*.sql`].

  Le conseguenze per la spec, da scrivere nel registro sotto le misure:
  - **C1.** Con la sola SQL della spec (due `delete`), un pasto di oggi o dei giorni dopo con `da_pronti = true` resta «dai pronti» (M2): la lista non compra niente per lui, ma la porzione che doveva mangiare non c'è più. L'invariante della spec («nessun pasto del piano dipende da un lotto che non esiste») **non regge**. Se poi l'utente lo spegne dal Piano, M3 crea un lotto fantasma da 1. **Serve un `update` di `meal_slot`.**
  - **C2.** Un pasto **passato** con `da_pronti = true` è una porzione già mangiata. Riportarlo a normale falserebbe la storia del ledger (M7). Per esempio, segnarlo più tardi `fuori` calcolerebbe `prima` = 1 porzione cruda e accrediterebbe al residuo ingredienti mai consumati. **I pasti passati non si toccano.**
  - **C3.** `porzioni_preparate` non dipende dai lotti (M4): è il piano che dice «cucina N in più», e la spec vuole che il piano resti. **Non si tocca.** Due effetti restano, e vanno fra i limiti:
    - (a) una cottura pianificata per domani o dopo perde il suo lotto, quindi dopo la cottura le porzioni non compaiono in Dispensa finché N non si cambia dal Piano;
    - (b) cambiare N su un pasto che aveva il lotto prima della cancellazione lo ricrea **intero** (M4), non solo con la differenza.
  - **C4.** Le liste già create e non chiuse tengono il residuo di prima (M8). Alla chiusura della spesa, `chiudiSpesa` lo **riscrive** in `pantry_state` per ogni ingrediente della lista: la dispensa appena cancellata **risorge in parte**. Esempio: riso congelato con 500 g in casa, servono 820, si compra 1000. Dopo la chiusura il residuo vale 680, mentre dopo la cancellazione dovrebbe valere 180. La Lista intanto continua a dire «in casa 500 g». La spec non lo prevede: §E.2 dice «nessun'altra tabella tiene la dispensa», ma `shopping_list_item.residuo` ne tiene una copia congelata.

- [ ] **Step 2: Decisione D1 (i pasti «dai pronti»): A, decisa da Andrea il 26/09.** Le opzioni, per chi legge il perché:

  | Opzione | SQL | Conseguenza |
  |---|---|---|
  | **A (scelta da Andrea il 26/09)** | `update meal_slot set da_pronti = false where user_id = casa and da_pronti and data >= current_date` | Regge l'invariante (C1) senza toccare la storia (C2). I pasti di oggi e dei giorni dopo tornano normali: la lista li compra. Nelle settimane già `confermata`/`chiusa` l'update non scrive il ledger (M7). Il residuo, dopo la spesa, sovrastima di una porzione cruda per pasto ritoccato, e `allineaTopUp` aggiunge al top-up solo gli ingredienti che la lista non ha ancora. Si corregge dalla Dispensa |
  | B | nessun update | I pasti futuri «dai pronti» restano senza porzione (C1): la lista non li compra. Contraddice l'invariante della spec |
  | C | come A, più la ricostruzione dei lotti delle cotture di domani o dopo (`insert … select … from meal_slot where porzioni_preparate > 0 and data > current_date`) | Toglie il limite C3(a), ma dopo la cancellazione la Dispensa mostra ancora i Pronti pianificati, contro «la Dispensa mostra il suo stato vuoto» (§E.2). E sono tre statement in più senza un modo di provarli qui (Step 8) |

  **Perché la data e non lo stato della settimana:** M6. `data >= current_date`, e non `>`: un pasto di stasera «dai pronti» dipende dal lotto quanto uno di domani. Il costo è un pranzo di oggi già mangiato che torna «crudo», e compare in lista se la spesa non è chiusa. **[ipotesi]** `current_date` coincide con il «oggi» dell'app, che è UTC (`new Date().toISOString().slice(0, 10)` ovunque in `src/data`) solo se il database gira in UTC, il default di Supabase. Si verifica al gate con `show timezone;` (Step 9).

  La riga di registro, sotto «Task 4»:

  > **D1 = A (Andrea, 26/09).** `cancella_dispensa()` riporta a pasti normali quelli «dai pronti» di oggi e dei giorni dopo (`data >= current_date`); i pasti passati restano come sono. Conseguenza accettata: nelle settimane già confermate l'`update` non passa dal ledger degli storni, e dopo la spesa il residuo sovrastima di una porzione cruda per pasto ritoccato. Si corregge dalla Dispensa.

- [ ] **Step 3: Decisione D2 (il residuo congelato delle liste aperte): A, decisa da Andrea il 26/09.**

  | Opzione | SQL | Conseguenza |
  |---|---|---|
  | **A (scelta da Andrea il 26/09)** | `update shopping_list_item set residuo = 0 where user_id = casa and residuo <> 0 and shopping_list_id in (select sl.id from shopping_list sl join week w on w.id = sl.week_id where sl.user_id = casa and w.stato <> 'chiusa')` | La chiusura della spesa non fa risorgere il residuo (C4): scrive `max(0, comprato − fabbisogno) + storni`. La Lista mostra «in casa 0 g». Le confezioni restano quelle calcolate prima: dove il residuo copriva una parte, la lista può chiedere meno del necessario, e l'utente lo vede nei numeri («serve 820 · in casa 0», una confezione da 500). Gli ingredienti che il residuo copriva del tutto non erano in lista, e `allineaTopUp` li aggiunge alla prossima apertura. Le settimane `chiusa` non si toccano: la loro chiusura è già avvenuta |
  | B | nessun update | Come la spec: la cancellazione vale fino alla prossima chiusura, poi risorge per gli ingredienti della lista aperta (C4). Si scrive fra i limiti |

  Il risparmio (`risparmio_settimana`) non si tocca: lo dice la spec.

  La riga di registro, sotto «Task 4»:

  > **D2 = A (Andrea, 26/09).** `cancella_dispensa()` azzera `shopping_list_item.residuo` nelle liste delle settimane non chiuse: `shopping_list_item.residuo` tiene una copia congelata della dispensa, e senza l'azzeramento `chiudiSpesa` la riscriverebbe in `pantry_state`. Conseguenza accettata: le confezioni della lista aperta restano quelle calcolate sul residuo di prima; gli ingredienti che il residuo copriva del tutto li aggiunge `allineaTopUp` alla prossima apertura della Lista.

- [ ] **Step 4: La funzione.** In coda a `supabase/migrations/0015_cadenza_e_dispensa.sql` (sotto la colonna del Task 3), con D1 = A e D2 = A:

```sql
-- ── cancella_dispensa() (spec §E.2) ─────────────────────────────────────────
--
-- «Tutto quello che risulta in casa torna a zero, anche le confezioni in
-- congelatore e i pronti. Piatti e piano restano.» Cosa c'è in casa sta in
-- pantry_state (residuo, date, congelato, scadenza a mano) e in
-- porzione_pronta (i lotti dei Pronti). Si CANCELLANO le righe invece di
-- azzerarle: gli ingredienti tornano «mai comprati», come prima del primo
-- acquisto, e la Dispensa mostra il suo stato vuoto. purchase è lo storico e
-- resta; risparmio_settimana resta.
--
-- security invoker: valgono le policy di casa della 0012 (`user_id =
-- (select casa_id())`), quindi un membro cancella la dispensa della casa in
-- cui sta, come oggi può già cambiarla. Il filtro esplicito su casa_id() dice
-- la stessa cosa in chiaro. Tutto in una transazione: o tutto o niente.
--
-- Oltre alle due tabelle, due ritocchi perché il resto regga (piano fase 5,
-- Task 4, decisioni D1 e D2):
-- (D1) i pasti di oggi e dei giorni dopo «dai pronti» tornano pasti normali:
--      la porzione che avevano preso dal lotto non c'è più. I pasti passati
--      no: sono porzioni già mangiate, e il ledger degli storni ne tiene conto.
--      Il filtro è la data e non lo stato della settimana: una settimana
--      `chiusa` (spesa fatta) ha spesso giorni ancora davanti.
-- (D2) le liste delle settimane non ancora chiuse tengono il residuo di prima,
--      congelato in shopping_list_item: chiudiSpesa lo riscriverebbe in
--      pantry_state. Va a zero anche lì.
-- porzioni_preparate non si tocca: è il piano («cucina N in più»), e il piano
-- resta.
create function public.cancella_dispensa()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  casa uuid := public.casa_id();
begin
  if casa is null then
    raise exception 'non autenticato';
  end if;

  -- (D1)
  update meal_slot
     set da_pronti = false
   where user_id = casa
     and da_pronti
     and data >= current_date;

  -- (D2)
  update shopping_list_item
     set residuo = 0
   where user_id = casa
     and residuo <> 0
     and shopping_list_id in (
       select sl.id
         from shopping_list sl
         join week w on w.id = sl.week_id
        where sl.user_id = casa
          and w.stato <> 'chiusa'
     );

  delete from porzione_pronta where user_id = casa;
  delete from pantry_state   where user_id = casa;
end $$;

revoke execute on function public.cancella_dispensa() from public, anon;
grant execute on function public.cancella_dispensa() to authenticated;

comment on function public.cancella_dispensa() is
  'Cancella la dispensa della casa (pantry_state e porzione_pronta); i pasti di oggi e dopo dai pronti tornano normali, e le liste non chiuse perdono il residuo congelato. Piatti, piano e storico restano.';
```

Note per chi scrive:
- `casa_id()` si chiama una volta sola e si tiene in `casa`. È `security definer` e `stable` (0012), e `authenticated` la può eseguire [misurato: `grant execute on function public.casa_id() to authenticated`].
- L'ordine degli statement non cambia il risultato: nessuno legge quello che un altro scrive. I due `update` stanno prima dei `delete` perché, se uno fallisce, l'errore arriva prima di cancellare. In ogni caso la transazione annulla tutto.
- `grant`/`revoke` come le funzioni della 0012: `anon` non deve poterla chiamare, anche se senza sessione `casa_id()` tornerebbe null e la funzione si fermerebbe da sola.

- [ ] **Step 5: `cancellaDispensa`, test prima.** Crea `src/data/__tests__/dispensa.cancella.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn() }));

import { client } from '../supabase';
import { idCasa } from '../casa';
import { cancellaDispensa, EVENTO_DISPENSA_CAMBIATA } from '../dispensa';

/** Un client finto con la sola `rpc`, come in casa.test.ts. */
function creaClientMock() {
  const rpc = vi.fn();
  vi.mocked(client).mockReturnValue({ rpc } as never);
  return rpc;
}

describe('cancellaDispensa (spec fase 5 §E.2)', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(idCasa).mockReset();
  });

  it('chiama la funzione SQL, senza argomenti', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: null });

    await cancellaDispensa();

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('cancella_dispensa');
  });

  it('non passa dalla memoria di idCasa: la casa la trova casa_id() nel database', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: null });
    await cancellaDispensa();
    expect(idCasa).not.toHaveBeenCalled();
  });

  it('lancia l\'errore della RPC, così il dialogo resta aperto con il suo errore', async () => {
    const rpc = creaClientMock();
    const errore = { message: 'non autenticato', code: 'P0001', details: null, hint: null };
    rpc.mockResolvedValue({ data: null, error: errore });
    await expect(cancellaDispensa()).rejects.toBe(errore);
  });

  it('non pubblica l\'evento da sé: lo fa chi chiama, se riesce', async () => {
    const rpc = creaClientMock();
    rpc.mockResolvedValue({ data: null, error: null });
    const ascolta = vi.fn();
    window.addEventListener(EVENTO_DISPENSA_CAMBIATA, ascolta);
    await cancellaDispensa();
    window.removeEventListener(EVENTO_DISPENSA_CAMBIATA, ascolta);
    expect(ascolta).not.toHaveBeenCalled();
  });

  it('il nome dell\'evento è quello della spec', () => {
    expect(EVENTO_DISPENSA_CAMBIATA).toBe('spesa:dispensa-cambiata');
  });
});
```

Run: `npx vitest run src/data/__tests__/dispensa.cancella.test.ts`
Expected: FAIL. `cancellaDispensa` e `EVENTO_DISPENSA_CAMBIATA` non sono esportate.

- [ ] **Step 6: Implementa in `src/data/dispensa.ts`.** In fondo al file:

```ts
/**
 * L'evento che la pagina Dispensa ascolta per rileggersi quando la dispensa
 * cambia da fuori (spec fase 5 §E.2): il pannello delle Impostazioni lo
 * pubblica sul `window` dopo una `cancellaDispensa` riuscita. Una costante
 * sola per chi pubblica e chi ascolta.
 */
export const EVENTO_DISPENSA_CAMBIATA = 'spesa:dispensa-cambiata';

/**
 * «Cancella la dispensa» (spec fase 5 §E.2): la funzione SQL
 * `cancella_dispensa()` della migrazione 0015, una transazione sola. Nessun id
 * da passare: la casa la trova `casa_id()` nel database, quindi vale anche con
 * la memoria di `idCasa` vecchia di un minuto. Oltre a `pantry_state` e
 * `porzione_pronta`, riporta a normali i pasti di oggi e dopo «dai pronti», e
 * azzera il residuo congelato delle liste non chiuse (piano fase 5, Task 4,
 * D1 e D2).
 *
 * Lancia l'errore della RPC. Non pubblica EVENTO_DISPENSA_CAMBIATA: lo fa chi
 * chiama, se riesce, così un test o un altro chiamante decide da sé.
 */
export async function cancellaDispensa(): Promise<void> {
  const { error } = await client().rpc('cancella_dispensa');
  if (error) throw error;
}
```


Run: `npx vitest run src/data/__tests__/dispensa.cancella.test.ts src/data/__tests__/dispensa.test.ts src/data/__tests__/dispensa.correggiResiduo.test.ts`
Expected: PASS.

- [ ] **Step 7: La Dispensa si rilegge, test prima.** Oggi la pagina carica una volta al montaggio (`leggi`, nell'effetto) e rilegge in silenzio con `ricarica()` dopo la nota AI e la creazione [misurato: `src/app/(app)/dispensa/page.tsx`, `leggi`/`ricarica`]. L'evento usa `ricarica()`: niente `CARICO…` né errore a schermo, e i dati di prima restano finché arrivano i nuovi.

  In `src/app/(app)/dispensa/__tests__/page.test.tsx`:
  - nel `vi.mock('@/data/dispensa', () => ({ … }))` aggiungi `EVENTO_DISPENSA_CAMBIATA: 'spesa:dispensa-cambiata',`. Senza questa riga Vitest lancia all'accesso all'export mancante del mock;
  - aggiungi un `describe` (la pagina importata dal Task 2 può chiamarsi come oggi, `Dispensa`; `mockBase`, `montaCaricata`, `act`, `waitFor` ci sono già):

```tsx
describe('la cancellazione dal pannello (spec fase 5 §E.2)', () => {
  it('all\'evento spesa:dispensa-cambiata la pagina rilegge e mostra la dispensa vuota', async () => {
    mockBase();
    await montaCaricata();
    expect(screen.getByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' })).toBeInTheDocument();
    expect(leggiDispensa).toHaveBeenCalledTimes(1);

    // Il database dopo cancella_dispensa: nessuna riga di dispensa, nessun lotto.
    vi.mocked(leggiDispensa).mockResolvedValue([]);
    vi.mocked(leggiPronti).mockResolvedValue([]);
    act(() => {
      window.dispatchEvent(new Event('spesa:dispensa-cambiata'));
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Apri il lotto di Ragù di lenticchie' })).not.toBeInTheDocument();
    });
    expect(leggiDispensa).toHaveBeenCalledTimes(2);
    expect(leggiPronti).toHaveBeenCalledTimes(2);
  });

  it('smontata la pagina, l\'evento non rilegge più', async () => {
    mockBase();
    monta().unmount();
    await waitFor(() => expect(leggiDispensa).toHaveBeenCalledTimes(1));
    act(() => {
      window.dispatchEvent(new Event('spesa:dispensa-cambiata'));
    });
    expect(leggiDispensa).toHaveBeenCalledTimes(1);
  });
});
```

(Se `mockBase` o `montaCaricata` hanno cambiato nome col Task 2, usa quelli nuovi. Il senso dei due test non cambia.)

Run: `npx vitest run "src/app/(app)/dispensa/__tests__/page.test.tsx"`
Expected: FAIL sul primo test, con il lotto ancora in pagina e `leggiDispensa` chiamata una volta sola. Il secondo passa già.

- [ ] **Step 8: Implementa l'ascolto in `src/app/(app)/dispensa/page.tsx`.**
  - All'import da `@/data/dispensa` aggiungi `EVENTO_DISPENSA_CAMBIATA`.
  - `ricarica` diventa stabile, perché serve come dipendenza di un effetto. La `function ricarica()` di oggi, con la sua docstring invariata, diventa:

```tsx
  const ricarica = useCallback(() => {
    const mia = ++generazione.current;
    leggiTutto()
      .then((d) => { if (generazione.current === mia) setDati(d); })
      .catch((e) => console.error('dispensa: rilettura fallita.', e));
  }, []);
```

    (usa solo un ref, un setter e una funzione di modulo: `[]` è corretto). I chiamanti di oggi (`ricarica()` dopo la nota e la creazione) non cambiano.
  - Subito **sotto** `ricarica` (non sopra: l'array delle dipendenze la legge durante il render), aggiungi:

```tsx
  // Cancella la dispensa, dal pannello delle Impostazioni aperto sopra questa
  // pagina (spec fase 5 §E.2): si rilegge in silenzio, come dopo la nota AI.
  // I dati di prima restano a schermo finché arrivano i nuovi.
  useEffect(() => {
    window.addEventListener(EVENTO_DISPENSA_CAMBIATA, ricarica);
    return () => window.removeEventListener(EVENTO_DISPENSA_CAMBIATA, ricarica);
  }, [ricarica]);
```

Un foglio aperto su un lotto che sparisce: `lottoAperto` diventa `undefined`, e il foglio non ha più niente da mostrare. Il caso non si presenta, perché la cancellazione parte dal pannello, che copre la pagina e i suoi fogli (§A.2). Non serve codice in più.

Run: `npx vitest run "src/app/(app)/dispensa/__tests__/page.test.tsx"`
Expected: PASS, compresi tutti i test di oggi.

- [ ] **Step 9: Come si controlla la SQL, qui e al gate.** **[misurato 25/09]** Su questa macchina non ci sono `psql`, `postgres`, `supabase` CLI o `docker` (`which` non trova niente). In `node_modules` non c'è un Postgres in-process, e una dipendenza nuova non si aggiunge. La migrazione **non si applica** a Supabase in questo task (Global Constraints, spec §O). Quello che si può fare davvero:

  **(a) Controllo a mano, adesso.** Rileggi la SQL dello Step 4 e spunta ogni punto nel rapporto del task:
  - `security invoker` e `set search_path = public`, come chiede la spec;
  - ogni `update`/`delete` ha `user_id = casa`, e la sottoquery di D2 filtra anche `sl.user_id = casa`;
  - i nomi delle colonne esistono: `meal_slot.da_pronti` e `meal_slot.data` (0001, 0009), `shopping_list_item.residuo` e `.shopping_list_id` (0001), `shopping_list.week_id` (0001), `week.stato` con i valori `'bozza' | 'confermata' | 'chiusa'` (0001), `porzione_pronta.user_id` (0009), `pantry_state.user_id` (0001);
  - nessun vincolo si viola:
    - `shopping_list_item.residuo` è `numeric not null` senza check, quindi 0 va bene;
    - `meal_slot.da_pronti` è `boolean not null`;
    - un `delete` di `porzione_pronta` non ha figli, e la FK verso `meal_slot` è sul lotto;
    - un `delete` di `pantry_state` non ha figli [misurato: nessuna `references pantry_state` nelle migrazioni, verificalo con `grep -rn "references pantry_state\|references porzione_pronta" supabase/migrations`];
  - `revoke … from public, anon` e `grant … to authenticated` presenti, con la firma `()` identica alla `create`;
  - il file intero ha i `;` al loro posto, e il corpo `$$ … $$` si chiude con `end $$;`.

  **(b) Al gate di Andrea, prima del merge (NON in questo task).** Queste query vanno nel registro, sotto «Da fare all'applicazione della 0015», perché le lanci chi applica:

```sql
-- 1. Il fuso del database: current_date deve essere il giorno UTC dell'app (D1).
show timezone;  -- atteso: UTC

-- 2. Le policy di casa sulle quattro tabelle che la funzione tocca (M9).
select tablename, policyname, cmd, qual
  from pg_policies
 where schemaname = 'public'
   and tablename in ('pantry_state', 'porzione_pronta', 'meal_slot', 'shopping_list_item')
 order by tablename;
-- atteso: una riga per tabella, <tabella>_casa, cmd ALL, qual (user_id = ( SELECT casa_id() AS casa_id))

-- 3. La funzione, provata come un utente vero e annullata: nessun dato cambia.
--    <id> è l'id di un ACCOUNT DI PROVA (spec §M.4), non quello di Andrea.
begin;
  select set_config('request.jwt.claims', '{"sub":"<id>","role":"authenticated"}', true);
  set local role authenticated;
  select public.cancella_dispensa();
  select count(*) as dispensa from pantry_state;                         -- atteso: 0
  select count(*) as pronti from porzione_pronta;                        -- atteso: 0
  select count(*) as dai_pronti from meal_slot
   where da_pronti and data >= current_date;                             -- atteso: 0
rollback;
```

  La terza prova lavora sulle righe visibili a quell'utente, cioè la RLS in azione. Se Andrea preferisce, la stessa prova si fa dal telefono su un account di prova dopo il merge (spec §M.4). Il registro scrive quale delle due si è fatta, e il suo esito.

- [ ] **Step 10: Il registro.** Sotto «Task 4» scrivi:
  - le misure M1–M9 e le conseguenze C1–C4 dello Step 1;
  - le righe D1 e D2 degli Step 2 e 3;
  - i **limiti noti** che restano, da portare anche in spec §L alla fine della fase (Task 15):
    - C3(a) e C3(b);
    - con D1-A, la sovrastima di una porzione cruda per pasto ritoccato nelle settimane già confermate;
    - con D2-A, le confezioni della lista aperta calcolate sul residuo di prima;
  - **il Piano e la Lista aperti sotto il pannello non si rileggono.** Solo la Dispensa ascolta l'evento, come dice la spec. Con D1 il Piano mostra `Porzione pronta` su un pasto che non lo è più, e con D2 la Lista mostra ancora «in casa …», finché non si riaprono. Toccare dal Piano quel pasto è innocuo: `aggiornaSlot` rilegge la riga dal database (`attuale.daPronti` è già `false`). Se Andrea li vuole aggiornati subito, Piano e Lista ascoltano lo stesso evento con un contatore nelle dipendenze del loro caricamento: è un task a parte, non questo. La domanda va anche in «Domande per Andrea (in review)»;
  - le query di controllo dello Step 9(b).

- [ ] **Step 11: Verifica.**

Run: `npx vitest run src/data/__tests__/dispensa.cancella.test.ts src/data/__tests__/dispensa.test.ts "src/app/(app)/dispensa"`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npm run lint`
Expected: pulito, in particolare nessun avviso `react-hooks/exhaustive-deps` sul nuovo effetto.

Run: `grep -rn "vi.mock('@/data/dispensa'" src`
Expected: cinque file [misurato 25/09]. Solo quello della pagina Dispensa monta un modulo che legge `EVENTO_DISPENSA_CAMBIATA`, e ha la riga. Se un altro test fallisce con «No "EVENTO_DISPENSA_CAMBIATA" export is defined on the mock», aggiungila lì.

- [ ] **Step 12: Commit.**

```bash
git add supabase/migrations/0015_cadenza_e_dispensa.sql src/data/dispensa.ts src/data/__tests__/dispensa.cancella.test.ts "src/app/(app)/dispensa/page.tsx" "src/app/(app)/dispensa/__tests__/page.test.tsx" docs/2026-09-25-fase5-decisioni-esecuzione.md
```

```bash
git commit -m "feat: cancella_dispensa() e la Dispensa che si rilegge (migrazione 0015, seconda parte)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Esporta, Esci, la versione

Tre funzioni di dati e due piccoli file di supporto: il file dell'esportazione, il salvataggio sul telefono, il logout, la versione nel piede. **Review di correttezza.** Tre cose vanno guardate con attenzione. Il file deve contenere **tutto** il piano, non le prime mille righe (Step 1). Esci deve fare pulizia solo quando la sessione è chiusa davvero (Step 13). Il salvataggio non deve trattare come errore l'annullo dell'utente (Step 9).

Spec: §E.3, §E.4, §B.4 (piede), §C.7 (il commento di `casa.ts`), §L («Esporta con molti dati», «Esci con spunte in coda»). Le schermate (Esporta, il dialogo `esci`, il piede) sono dei Task 7 e 10; qui ci sono le funzioni.

**Il codice di questo task è stato provato** [misurato 25/09]: i blocchi sono stati applicati a una copia di `feb4551` con i Task 3 e 4 già applicati. La suite intera dà 1764 verdi e 1 saltato, `tsc` e `lint` sono puliti, e il test del nome del file passa sia con `TZ=Europe/Rome` sia con `TZ=UTC`. Una prima versione del test di `salvaFile` violava `@typescript-eslint/no-this-alias`: quella qui sotto è già corretta.

**Quattro misure fatte il 25/09 che cambiano il come, non il cosa:**

1. **Il tetto di righe di PostgREST.** Su Supabase ogni risposta è tagliata a un massimo di righe, 1000 di default **[ipotesi: il valore di questo progetto non è misurato]**. `meal_slot` cresce di 21-42 righe a settimana (da 3 a 6 pasti per 7 giorni): con 6 pasti, 1000 righe sono 24 settimane. Due query secche, come dice la spec, darebbero un file **troncato in silenzio** dopo sei mesi d'uso. Quindi `leggiTutteLeSettimane` legge `meal_slot` a pagine con `.range()` finché una pagina torna vuota. La firma dell'ossatura non cambia; le query diventano 2 + il numero di pagine. Va nel registro.
2. **`signOut` in `@supabase/auth-js` 2.112.4** (la versione installata) [misurato: `node_modules/@supabase/auth-js/dist/module/GoTrueClient.js`, `_signOut`, righe 3412-3443]:
   - lo `scope` di default è `'global'`: esce da **tutti** i dispositivi dell'account, non solo da questo telefono;
   - se la chiamata al server fallisce con un errore diverso da 401/403/404, **cancella comunque la sessione locale** e poi restituisce `{ error }`.

   La regola della spec del 25/09 «se `signOut` fallisce, niente pulizia e il dialogo resta aperto» lascerebbe quindi l'utente già uscito su questo telefono, con l'errore a schermo e la lista in cache. Lo Step 13 guarda la sessione dopo l'errore, e lo `scope` è la decisione D3 di Andrea (Step 10): `local`.
3. **I Pronti grezzi.** Una lettura c'è già: `leggiPronti()` in `src/data/pronti.ts` restituisce **tutti** i lotti, decaduti compresi, mappati in `LottoPronto` [misurato]. Non serve una funzione nuova. Nel file vanno come `LottoPronto[]`, nella stessa forma camelCase del resto del file (`PantryState`, `MealSlot`…). Il tipo dell'ossatura `pronti: unknown[]` li accetta così.
4. **La versione a build** [misurato: build di prova in una copia del repo il 25/09]. Con `import pacchetto from './package.json'` in `next.config.ts` ed `env: { NEXT_PUBLIC_VERSIONE: pacchetto.version }`, `next build` va a buon fine. Una pagina client che mostra `process.env.NEXT_PUBLIC_VERSIONE ?? '0.0.0'` esce nel bundle come `"Versione 0.1.0"`, col valore già scritto. La guida di Next 16 (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/env.md`) conferma che `env` sostituisce `process.env.X` a build, e che le variabili dichiarate lì finiscono **sempre** nel bundle: il prefisso `NEXT_PUBLIC_` qui non serve, si tiene perché è il nome della spec. Quella pagina è marcata `version: legacy`, ma è la stessa guida che la spec cita.

**Files:**
- Modify: `src/data/settimana.ts` (`leggiTutteLeSettimane`, e la mappatura delle scelte in un helper condiviso)
- Create: `src/domain/esporta.ts`
- Create: `src/data/esporta.ts`
- Create: `src/components/salva-file.ts`
- Create: `src/data/sessione.ts`
- Create: `src/components/pannello/versione.ts` (la cartella nasce qui; il Task 6 la riempie)
- Modify: `next.config.ts`
- Modify: `src/data/casa.ts` (il commento di `creaInvito`)
- Modify: `src/data/utente.ts` (solo la docstring di `dimenticaIniziale`, che da qui serve anche in produzione)
- Test: `src/data/__tests__/settimana.leggiTutteLeSettimane.test.ts`, `src/domain/__tests__/esporta.test.ts`, `src/data/__tests__/esporta.test.ts`, `src/components/__tests__/salva-file.test.ts`, `src/data/__tests__/sessione.test.ts`, `src/components/pannello/__tests__/versione.test.ts` (tutti nuovi)
- Modify: `docs/2026-09-25-fase5-decisioni-esecuzione.md` (il registro)

**Interfaces:**
- Consumes: `Impostazioni.giorniControllo` (Task 3: entra nel file così com'è).
- Produces (ossatura, invariate):
  - `leggiTutteLeSettimane(): Promise<{ lunedi: string; stato: string; pasti: MealSlot[] }[]>`
  - `interface Esportazione`, `componiEsportazione(i: Omit<Esportazione, 'formato' | 'app'>): Esportazione`, `nomeFileEsportazione(oggi: string): string`
  - `preparaEsportazione(adesso?: Date): Promise<File>`
  - `salvaFile(file: File): Promise<'condiviso' | 'scaricato' | 'annullato'>`
  - `esci(): Promise<void>`: `signOut({ scope: 'local' })` (D3 = A); lancia solo se dopo `signOut` la sessione c'è ancora. Se riesce, naviga con `window.location.replace('/entra')` e la pagina se ne va (Step 13)
  - `VERSIONE: string`

- [ ] **Step 1: `leggiTutteLeSettimane`, test prima.** Crea `src/data/__tests__/settimana.leggiTutteLeSettimane.test.ts`. La controfigura è quella di `settimana.leggiSettimana.test.ts`, con `range` in più:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ idCasa: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiImpostazioni: vi.fn(), leggiSlotDefs: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiRepertorio: vi.fn(), leggiIngredienti: vi.fn() }));
vi.mock('../dispensa', () => ({ leggiDispensa: vi.fn() }));

import { client } from '../supabase';
import { idCasa } from '../casa';
import { leggiTutteLeSettimane } from '../settimana';

beforeEach(() => {
  vi.mocked(client).mockReset();
  vi.mocked(idCasa).mockReset();
  vi.mocked(idCasa).mockResolvedValue('user-1');
});

interface Chiamata { metodo: string; args: unknown[] }

/** Stessa controfigura del query builder degli altri test data, con `range`. */
function creaClientMock(risolvi: (tabella: string, chiamate: Chiamata[]) => { data?: unknown; error?: unknown }) {
  const letture: Record<string, Chiamata[][]> = {};
  function from(tabella: string) {
    const chiamate: Chiamata[] = [];
    const registra = (metodo: string) => (...args: unknown[]) => {
      chiamate.push({ metodo, args });
      return proxy;
    };
    const proxy: Record<string, unknown> = {
      select: registra('select'), eq: registra('eq'), order: registra('order'), range: registra('range'),
      then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
        (letture[tabella] ??= []).push(chiamate);
        return Promise.resolve(risolvi(tabella, chiamate)).then(onFulfilled, onRejected);
      },
    };
    return proxy;
  }
  return { sb: { from }, letture };
}

function rigaSlot(i: number, weekId: string) {
  return {
    id: `s-${String(i).padStart(5, '0')}`, week_id: weekId, data: '2026-09-21', slot_def_id: 'sd-1',
    stato: 'casa', dish_id: null, fonte_stato: 'default', porzioni_preparate: 0, da_pronti: false,
    meal_slot_choice: [],
  };
}

/**
 * Un database finto: le settimane, e le righe di meal_slot servite a pagine
 * secondo il `range` chiesto, con al più `tetto` righe per risposta (il
 * max-rows di PostgREST).
 */
function database(settimane: unknown[], slot: unknown[], tetto = 1000) {
  return (tabella: string, chiamate: Chiamata[]) => {
    if (tabella === 'week') return { data: settimane, error: null };
    if (tabella === 'meal_slot') {
      const range = chiamate.find((c) => c.metodo === 'range');
      const [da, a] = (range?.args ?? [0, slot.length - 1]) as [number, number];
      return { data: slot.slice(da, Math.min(a + 1, da + tetto)), error: null };
    }
    return { data: null, error: null };
  };
}

const SETTIMANE = [
  { id: 'w-1', data_inizio: '2026-09-14', stato: 'chiusa' },
  { id: 'w-2', data_inizio: '2026-09-21', stato: 'confermata' },
  { id: 'w-3', data_inizio: '2026-09-28', stato: 'bozza' },
];

describe('leggiTutteLeSettimane (spec fase 5 §E.3)', () => {
  it('legge settimane e pasti della casa, e raggruppa i pasti per settimana', async () => {
    const slot = [
      { ...rigaSlot(1, 'w-1'), meal_slot_choice: [{ componente_id: 'c-1', option_id: 'o-2', fonte: 'manuale' }] },
      rigaSlot(2, 'w-2'),
      rigaSlot(3, 'w-2'),
    ];
    const { sb, letture } = creaClientMock(database(SETTIMANE, slot));
    vi.mocked(client).mockReturnValue(sb as never);

    const piano = await leggiTutteLeSettimane();

    expect(piano.map((s) => [s.lunedi, s.stato, s.pasti.length])).toEqual([
      ['2026-09-14', 'chiusa', 1],
      ['2026-09-21', 'confermata', 2],
      ['2026-09-28', 'bozza', 0],
    ]);
    expect(piano[0].pasti[0].scelte).toEqual({ 'c-1': { opzioneId: 'o-2', fonte: 'manuale' } });
    // Tutte e due le tabelle filtrate sull'id della casa, come leggiSettimana.
    expect(letture.week[0]).toContainEqual({ metodo: 'eq', args: ['user_id', 'user-1'] });
    expect(letture.meal_slot[0]).toContainEqual({ metodo: 'eq', args: ['user_id', 'user-1'] });
    // Le settimane in ordine di lunedì; i pasti in un ordine stabile, che serve alle pagine.
    expect(letture.week[0]).toContainEqual({ metodo: 'order', args: ['data_inizio'] });
    expect(letture.meal_slot[0]).toContainEqual({ metodo: 'order', args: ['data'] });
    expect(letture.meal_slot[0]).toContainEqual({ metodo: 'order', args: ['id'] });
  });

  it('oltre le mille righe legge a pagine, e il file non si tronca', async () => {
    const slot = Array.from({ length: 2345 }, (_, i) => rigaSlot(i, i < 1200 ? 'w-1' : 'w-2'));
    const { sb, letture } = creaClientMock(database(SETTIMANE, slot));
    vi.mocked(client).mockReturnValue(sb as never);

    const piano = await leggiTutteLeSettimane();

    expect(piano.reduce((n, s) => n + s.pasti.length, 0)).toBe(2345);
    expect(piano[0].pasti).toHaveLength(1200);
    expect(piano[1].pasti).toHaveLength(1145);
    // Tre pagine piene o parziali, più quella vuota che chiude.
    expect(letture.meal_slot).toHaveLength(4);
  });

  it('regge un tetto del server più basso della pagina: va avanti di quanto riceve', async () => {
    const slot = Array.from({ length: 1300 }, (_, i) => rigaSlot(i, 'w-1'));
    const { sb } = creaClientMock(database(SETTIMANE, slot, 500));
    vi.mocked(client).mockReturnValue(sb as never);

    const piano = await leggiTutteLeSettimane();

    expect(piano[0].pasti).toHaveLength(1300);
    expect(new Set(piano[0].pasti.map((p) => p.id)).size).toBe(1300); // nessun doppione
  });

  it('senza settimane torna un piano vuoto', async () => {
    const { sb } = creaClientMock(database([], []));
    vi.mocked(client).mockReturnValue(sb as never);
    expect(await leggiTutteLeSettimane()).toEqual([]);
  });

  it('un errore su una delle due tabelle passa a chi chiama', async () => {
    const errore = { message: 'rete' };
    const { sb } = creaClientMock((tabella) =>
      tabella === 'meal_slot' ? { data: null, error: errore } : { data: SETTIMANE, error: null });
    vi.mocked(client).mockReturnValue(sb as never);
    await expect(leggiTutteLeSettimane()).rejects.toBe(errore);
  });
});
```

Run: `npx vitest run src/data/__tests__/settimana.leggiTutteLeSettimane.test.ts`
Expected: FAIL. `leggiTutteLeSettimane` non esiste.

- [ ] **Step 2: Implementa in `src/data/settimana.ts`.** Sopra `leggiSlotSettimana`, un helper che ne prende la mappatura di oggi, identica:

```ts
/**
 * Una riga di meal_slot con le sue scelte (`meal_slot_choice` annidata) nella
 * forma del dominio. Una sola mappatura per leggiSlotSettimana e
 * leggiTutteLeSettimane: il file esportato e la settimana a schermo devono
 * dire le stesse cose.
 */
function aMealSlotConScelte(r: Record<string, unknown>): MealSlot {
  return {
    ...aMealSlot(r),
    scelte: Object.fromEntries(
      ((r.meal_slot_choice ?? []) as Record<string, unknown>[]).map((c) => [
        String(c.componente_id),
        { opzioneId: String(c.option_id), fonte: c.fonte as Scelta['fonte'] },
      ]),
    ),
  };
}
```

`leggiSlotSettimana` finisce con `return data.map(aMealSlotConScelte);` al posto della mappatura inline. Il comportamento non cambia, e i test di oggi (`settimana.leggiSettimana.test.ts`, `lista.*`) lo provano. Poi, in fondo al file:

```ts
/**
 * Quante righe di meal_slot chiedere per volta. PostgREST su Supabase taglia
 * ogni risposta a un massimo di righe (1000 di default; il valore di questo
 * progetto non è misurato), e un piano vero le supera in circa sei mesi: sei
 * pasti per sette giorni sono 42 righe a settimana.
 */
const PAGINA_SLOT = 1000;

/** Una cintura contro un ciclo senza fine: 200 pagine sono 200.000 pasti, novant'anni di piano. */
const MAX_PAGINE_SLOT = 200;

/**
 * Tutte le settimane della casa con i loro pasti, per l'esportazione (spec
 * fase 5 §E.3). Oggi le settimane si leggono solo una alla volta, per weekId.
 *
 * Due tabelle: `week` in una query, `meal_slot` a pagine (`range`), finché una
 * pagina torna vuota. Una query secca si fermerebbe al tetto di PostgREST e il
 * file uscirebbe troncato in silenzio. Si va avanti di quante righe arrivano,
 * non di quante se ne sono chieste, così regge anche un tetto più basso della
 * pagina. L'ordine (data, id) è totale: le pagine non si sovrappongono.
 *
 * Settimane per lunedì crescente; i pasti di una settimana per data. Una
 * settimana senza pasti c'è lo stesso, con `pasti: []`.
 */
export async function leggiTutteLeSettimane(): Promise<{ lunedi: string; stato: string; pasti: MealSlot[] }[]> {
  const sb = client();
  const userId = await idCasa();

  const { data: settimane, error } = await sb
    .from('week')
    .select('id, data_inizio, stato')
    .eq('user_id', userId)
    .order('data_inizio');
  if (error) throw error;

  const righe: Record<string, unknown>[] = [];
  let da = 0;
  for (let pagina = 0; ; pagina++) {
    if (pagina >= MAX_PAGINE_SLOT) throw new Error('Il piano è troppo lungo da esportare.');
    const { data, error: eSlot } = await sb
      .from('meal_slot')
      .select('*, meal_slot_choice(componente_id, option_id, fonte)')
      .eq('user_id', userId)
      .order('data')
      .order('id')
      .range(da, da + PAGINA_SLOT - 1);
    if (eSlot) throw eSlot;
    if (!data || data.length === 0) break;
    righe.push(...(data as Record<string, unknown>[]));
    da += data.length;
  }

  const perSettimana = new Map<string, MealSlot[]>();
  for (const r of righe) {
    const weekId = String(r.week_id);
    const pasti = perSettimana.get(weekId) ?? [];
    pasti.push(aMealSlotConScelte(r));
    perSettimana.set(weekId, pasti);
  }

  return (settimane ?? []).map((w) => ({
    lunedi: String(w.data_inizio).slice(0, 10),
    stato: String(w.stato),
    pasti: perSettimana.get(String(w.id)) ?? [],
  }));
}
```

Run: `npx vitest run src/data/__tests__/settimana.leggiTutteLeSettimane.test.ts src/data/__tests__/settimana.leggiSettimana.test.ts src/data/__tests__/lista.generaListe.test.ts`
Expected: PASS.

**Il messaggio `Il piano è troppo lungo da esportare.`** è interno e non arriva mai a schermo: Esporta mostra il suo errore della spec (`Non siamo riusciti a preparare il file. Riprova.`).

- [ ] **Step 3: Il dominio dell'esportazione, test prima.** Crea `src/domain/__tests__/esporta.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { componiEsportazione, nomeFileEsportazione } from '../esporta';
import { IMPOSTAZIONI, INGREDIENTI, PIATTI, cinqueColazioni, dispensaVuota } from './fixtures';

const INGRESSO = {
  versione: '0.1.0',
  esportatoIl: '2026-09-25T08:30:00.000Z',
  impostazioni: IMPOSTAZIONI,
  pasti: [{ id: 'col', nome: 'Colazione', posizione: 0, assenzeAbituali: Array(7).fill(false) }],
  ingredienti: INGREDIENTI,
  piatti: PIATTI,
  piano: [{ lunedi: '2026-08-31', stato: 'chiusa', pasti: cinqueColazioni() }],
  dispensa: {
    stato: dispensaVuota(),
    pronti: [{ id: 'lp-1', dishId: 'colazione-yogurt', porzioni: 2, congelato: false, preparataIl: '2026-09-24', mealSlotId: null }],
  },
};

describe('componiEsportazione (spec fase 5 §E.3)', () => {
  it('formato 1, app dispesa, e i dati così come arrivano', () => {
    const e = componiEsportazione(INGRESSO);
    expect(e.formato).toBe(1);
    expect(e.app).toBe('dispesa');
    expect(e).toEqual({ formato: 1, app: 'dispesa', ...INGRESSO });
  });

  it('le chiavi nell\'ordine della spec: il file si legge dall\'alto', () => {
    expect(Object.keys(componiEsportazione(INGRESSO))).toEqual([
      'formato', 'app', 'versione', 'esportatoIl', 'impostazioni', 'pasti',
      'ingredienti', 'piatti', 'piano', 'dispensa',
    ]);
  });

  it('le impostazioni portano anche la cadenza dei controlli', () => {
    expect(componiEsportazione(INGRESSO).impostazioni.giorniControllo).toBe(90);
  });

  it('un giro in JSON non perde niente', () => {
    const e = componiEsportazione(INGRESSO);
    expect(JSON.parse(JSON.stringify(e))).toEqual(e);
  });
});

describe('nomeFileEsportazione (spec fase 5 §C.8)', () => {
  it('dispesa-{gg-mm-aaaa}.json', () => {
    expect(nomeFileEsportazione('2026-09-25')).toBe('dispesa-25-09-2026.json');
    expect(nomeFileEsportazione('2027-01-03')).toBe('dispesa-03-01-2027.json');
  });

  it('una data che non è aaaa-mm-gg non fa un nome a caso', () => {
    expect(() => nomeFileEsportazione('25/09/2026')).toThrow();
    expect(() => nomeFileEsportazione('')).toThrow();
  });
});
```

(«Un giro in JSON non perde niente» vede un `Date`, un `Map` o un `NaN` finiti nei dati, perché dopo `JSON.stringify` non tornano uguali. Non vede un campo `undefined`, che `toEqual` ignora come il file lo perde: per i tipi di oggi va bene, perché i facoltativi, come `scadenzaManuale`, valgono null quando mancano. Se il test fallisce, leggi quale campo è e scrivilo nel registro invece di togliere il test.)

Run: `npx vitest run src/domain/__tests__/esporta.test.ts`
Expected: FAIL. Il modulo non esiste.

- [ ] **Step 4: Implementa `src/domain/esporta.ts`.**

```ts
import type { Dish, Impostazioni, Ingredient, MealSlot, MealSlotDef, PantryState } from './types';

/**
 * Il file di «Esporta i tuoi dati» (spec fase 5 §E.3). JSON leggibile, senza
 * librerie, e rileggibile un domani: `formato` cresce se la forma cambia, e
 * un import futuro (fuori da questa fase) lo leggerà per primo.
 *
 * I dati sono nella forma del dominio, come li legge l'app: camelCase, date
 * ISO aaaa-mm-gg. `pronti` sono i lotti dei Pronti (`LottoPronto`, decaduti
 * compresi): `unknown[]` qui perché il file non promette la forma interna
 * di un lotto a chi lo rilegge.
 */
export interface Esportazione {
  formato: 1;
  app: 'dispesa';
  versione: string;
  esportatoIl: string;
  impostazioni: Impostazioni;
  pasti: MealSlotDef[];
  ingredienti: Ingredient[];
  piatti: Dish[];
  piano: { lunedi: string; stato: string; pasti: MealSlot[] }[];
  dispensa: { stato: PantryState[]; pronti: unknown[] };
}

/**
 * Pura: niente rete, niente orologio. Le chiavi nell'ordine della spec, una
 * per una e non con uno spread: `JSON.stringify` le scrive in quest'ordine, e
 * il file si legge dall'alto.
 */
export function componiEsportazione(i: Omit<Esportazione, 'formato' | 'app'>): Esportazione {
  return {
    formato: 1,
    app: 'dispesa',
    versione: i.versione,
    esportatoIl: i.esportatoIl,
    impostazioni: i.impostazioni,
    pasti: i.pasti,
    ingredienti: i.ingredienti,
    piatti: i.piatti,
    piano: i.piano,
    dispensa: i.dispensa,
  };
}

/** `dispesa-{gg-mm-aaaa}.json` (spec §C.8) da una data aaaa-mm-gg. */
export function nomeFileEsportazione(oggi: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(oggi);
  if (!m) throw new Error(`Data non valida: ${oggi}`);
  const [, anno, mese, giorno] = m;
  return `dispesa-${giorno}-${mese}-${anno}.json`;
}
```

Run: `npx vitest run src/domain/__tests__/esporta.test.ts`
Expected: PASS.

- [ ] **Step 5: La versione, test prima.** Crea `src/components/pannello/__tests__/versione.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import pacchetto from '../../../../package.json';
import configurazione from '../../../../next.config';

describe('la versione del piede (spec fase 5 §B.4)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('next.config espone la version di package.json come NEXT_PUBLIC_VERSIONE', () => {
    expect(configurazione.env?.NEXT_PUBLIC_VERSIONE).toBe(pacchetto.version);
  });

  it('VERSIONE è la variabile, quando c\'è', async () => {
    vi.stubEnv('NEXT_PUBLIC_VERSIONE', '1.2.3');
    const { VERSIONE } = await import('../versione');
    expect(VERSIONE).toBe('1.2.3');
  });

  it('senza la variabile (test, script fuori da Next) vale 0.0.0', async () => {
    vi.stubEnv('NEXT_PUBLIC_VERSIONE', undefined);
    const { VERSIONE } = await import('../versione');
    expect(VERSIONE).toBe('0.0.0');
  });
});
```

(`vi.stubEnv(nome, undefined)` toglie la variabile. Se la versione di Vitest installata non lo accetta nel tipo, usa `delete process.env.NEXT_PUBLIC_VERSIONE` nel test e ripristina il valore in `afterEach`.)

Run: `npx vitest run src/components/pannello/__tests__/versione.test.ts`
Expected: FAIL. Mancano `versione.ts` ed `env` in `next.config`.

- [ ] **Step 6: Implementa la versione.** `next.config.ts` diventa (i `redirects` restano identici):

```ts
import type { NextConfig } from "next";
// La versione del piede del pannello (spec fase 5 §B.4): una fonte sola,
// package.json. `env` la scrive nel bundle a build; il nome è quello della spec.
import pacchetto from './package.json';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERSIONE: pacchetto.version,
  },
  // Settimana è diventata Piano il 20/09: i link salvati e la PWA installata continuano a funzionare.
  async redirects() {
    return [
      { source: '/settimana', destination: '/piano', permanent: true },
      { source: '/settimana/:path*', destination: '/piano/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
```

Crea `src/components/pannello/versione.ts`:

```ts
/**
 * La versione dell'app, per il piede del pannello (`Versione {x}`, spec fase 5
 * §B.4) e per il file di Esporta. Viene da `package.json` attraverso `env` in
 * next.config.ts, che la scrive nel bundle a build (misurato il 25/09: nel
 * bundle client c'è il valore, non la variabile). Fuori da Next (test, script)
 * la variabile non c'è e vale 0.0.0.
 *
 * `process.env.NEXT_PUBLIC_VERSIONE` scritto per intero: Next sostituisce solo
 * l'accesso letterale, non uno destrutturato o dinamico.
 */
export const VERSIONE: string = process.env.NEXT_PUBLIC_VERSIONE ?? '0.0.0';
```

Run: `npx vitest run src/components/pannello/__tests__/versione.test.ts`
Expected: PASS.

- [ ] **Step 7: `preparaEsportazione`, test prima.** Crea `src/data/__tests__/esporta.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LottoPronto, MealSlotDef } from '@/domain/types';
import { IMPOSTAZIONI, INGREDIENTI, PIATTI, cinqueColazioni, dispensaVuota } from '@/domain/__tests__/fixtures';

vi.mock('../impostazioni', () => ({ leggiImpostazioni: vi.fn(), leggiSlotDefs: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiIngredienti: vi.fn(), leggiRepertorio: vi.fn() }));
vi.mock('../settimana', () => ({ leggiTutteLeSettimane: vi.fn() }));
vi.mock('../dispensa', () => ({ leggiDispensa: vi.fn() }));
vi.mock('../pronti', () => ({ leggiPronti: vi.fn() }));
vi.mock('@/components/pannello/versione', () => ({ VERSIONE: '9.9.9' }));

import { leggiImpostazioni, leggiSlotDefs } from '../impostazioni';
import { leggiIngredienti, leggiRepertorio } from '../repertorio';
import { leggiTutteLeSettimane } from '../settimana';
import { leggiDispensa } from '../dispensa';
import { leggiPronti } from '../pronti';
import { preparaEsportazione } from '../esporta';

const PASTI: MealSlotDef[] = [{ id: 'col', nome: 'Colazione', posizione: 0, assenzeAbituali: Array(7).fill(false) }];
const PIANO = [{ lunedi: '2026-08-31', stato: 'chiusa', pasti: cinqueColazioni() }];
const STATO = dispensaVuota();
const PRONTI: LottoPronto[] = [
  { id: 'lp-1', dishId: 'colazione-yogurt', porzioni: 2, congelato: true, preparataIl: '2026-09-20', mealSlotId: null },
];

beforeEach(() => {
  vi.mocked(leggiImpostazioni).mockReset().mockResolvedValue(IMPOSTAZIONI);
  vi.mocked(leggiSlotDefs).mockReset().mockResolvedValue(PASTI);
  vi.mocked(leggiIngredienti).mockReset().mockResolvedValue(INGREDIENTI);
  vi.mocked(leggiRepertorio).mockReset().mockResolvedValue(PIATTI);
  vi.mocked(leggiTutteLeSettimane).mockReset().mockResolvedValue(PIANO);
  vi.mocked(leggiDispensa).mockReset().mockResolvedValue(STATO);
  vi.mocked(leggiPronti).mockReset().mockResolvedValue(PRONTI);
});

describe('preparaEsportazione (spec fase 5 §E.3)', () => {
  it('un file JSON col nome del giorno e tutte le letture dentro', async () => {
    const adesso = new Date(2026, 8, 25, 10, 30); // 25/09/2026, ora locale
    const file = await preparaEsportazione(adesso);

    expect(file.name).toBe('dispesa-25-09-2026.json');
    expect(file.type).toBe('application/json');
    expect(JSON.parse(await file.text())).toEqual({
      formato: 1,
      app: 'dispesa',
      versione: '9.9.9',
      esportatoIl: adesso.toISOString(),
      impostazioni: IMPOSTAZIONI,
      pasti: PASTI,
      ingredienti: INGREDIENTI,
      piatti: PIATTI,
      piano: PIANO,
      dispensa: { stato: STATO, pronti: PRONTI },
    });
  });

  it('il nome usa il giorno di chi esporta, non quello UTC', async () => {
    // Mezzanotte e mezza del 26 in Italia sono le 22:30 UTC del 25: il file è del 26.
    const file = await preparaEsportazione(new Date(2026, 8, 26, 0, 30));
    expect(file.name).toBe('dispesa-26-09-2026.json');
  });

  it('leggibile a occhio: il JSON è indentato', async () => {
    const testo = await (await preparaEsportazione(new Date(2026, 8, 25))).text();
    expect(testo.startsWith('{\n  "formato": 1,')).toBe(true);
  });

  it('se una lettura fallisce non c\'è nessun file: l\'errore passa', async () => {
    const errore = new Error('rete');
    vi.mocked(leggiTutteLeSettimane).mockRejectedValue(errore);
    await expect(preparaEsportazione(new Date(2026, 8, 25))).rejects.toBe(errore);
  });

  it('senza data usa adesso', async () => {
    const file = await preparaEsportazione();
    expect(file.name).toMatch(/^dispesa-\d{2}-\d{2}-\d{4}\.json$/);
  });
});
```

(Il secondo test distingue il giorno locale da quello UTC solo se il processo gira in un fuso diverso da UTC. In CI, che è in UTC, passa senza provare niente. Per la prova vera: `TZ=Europe/Rome npx vitest run src/data/__tests__/esporta.test.ts`, da scrivere nel rapporto del task. `File.prototype.text` in jsdom c'è [misurato 25/09 con una sonda in una copia del repo].)

Run: `npx vitest run src/data/__tests__/esporta.test.ts`
Expected: FAIL. `src/data/esporta.ts` non esiste.

- [ ] **Step 8: Implementa `src/data/esporta.ts`.**

```ts
import { componiEsportazione, nomeFileEsportazione } from '@/domain/esporta';
import { VERSIONE } from '@/components/pannello/versione';
import { leggiImpostazioni, leggiSlotDefs } from './impostazioni';
import { leggiIngredienti, leggiRepertorio } from './repertorio';
import { leggiTutteLeSettimane } from './settimana';
import { leggiDispensa } from './dispensa';
import { leggiPronti } from './pronti';

/**
 * Il giorno di chi esporta, aaaa-mm-gg, dall'ora locale del telefono. Non il
 * giorno UTC del resto dei dati: il nome del file lo legge una persona, e a
 * mezzanotte e mezza in Italia il file è già del giorno dopo.
 */
function giornoLocale(d: Date): string {
  const due = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}

/**
 * «Esporta i tuoi dati» (spec fase 5 §E.3, §C.8): legge tutto in parallelo,
 * lo compone con la funzione pura e restituisce un File JSON indentato,
 * `dispesa-{gg-mm-aaaa}.json`. Tutto in memoria sul telefono: con i volumi di
 * un utente vero resta sotto il megabyte [ipotesi, spec §L].
 *
 * Le letture sono quelle dell'app: i piatti sono quelli attivi
 * (`leggiRepertorio`); i Pronti sono tutti i lotti, decaduti compresi
 * (`leggiPronti`). Se una lettura fallisce l'errore passa, e non esce un file
 * a metà.
 */
export async function preparaEsportazione(adesso: Date = new Date()): Promise<File> {
  const [impostazioni, pasti, ingredienti, piatti, piano, stato, pronti] = await Promise.all([
    leggiImpostazioni(),
    leggiSlotDefs(),
    leggiIngredienti(),
    leggiRepertorio(),
    leggiTutteLeSettimane(),
    leggiDispensa(),
    leggiPronti(),
  ]);
  const esportazione = componiEsportazione({
    versione: VERSIONE,
    esportatoIl: adesso.toISOString(),
    impostazioni,
    pasti,
    ingredienti,
    piatti,
    piano,
    dispensa: { stato, pronti },
  });
  return new File(
    [JSON.stringify(esportazione, null, 2)],
    nomeFileEsportazione(giornoLocale(adesso)),
    { type: 'application/json' },
  );
}
```

Run: `npx vitest run src/data/__tests__/esporta.test.ts src/domain/__tests__/esporta.test.ts`
Expected: PASS.

- [ ] **Step 9: `salvaFile`, test prima.** Crea `src/components/__tests__/salva-file.test.ts`. In jsdom `navigator.canShare` e `navigator.share` non esistono, `URL.createObjectURL` sì ma va finto, e `HTMLAnchorElement.prototype.click` si può spiare [misurato 25/09 con una sonda]:

```ts
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { salvaFile } from '../salva-file';

const file = new File(['{"formato":1}'], 'dispesa-25-09-2026.json', { type: 'application/json' });

/** Il foglio di condivisione del sistema, finto: `share` e `canShare` come le dà il browser. */
function condivisione(share: () => Promise<void>, canShare: () => boolean = () => true) {
  Object.defineProperty(navigator, 'canShare', { value: vi.fn(canShare), configurable: true });
  Object.defineProperty(navigator, 'share', { value: vi.fn(share), configurable: true });
}

let clic: MockInstance<HTMLAnchorElement['click']>;
let creaUrl: MockInstance<typeof URL.createObjectURL>;
let revoca: MockInstance<typeof URL.revokeObjectURL>;

/** L'<a> su cui è partito il click: Vitest tiene il `this` di ogni chiamata in `mock.contexts`. */
function ancora(): HTMLAnchorElement {
  return clic.mock.contexts[0] as HTMLAnchorElement;
}

beforeEach(() => {
  creaUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:finto');
  revoca = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  delete (navigator as unknown as Record<string, unknown>).canShare;
  delete (navigator as unknown as Record<string, unknown>).share;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('salvaFile (spec fase 5 §E.3)', () => {
  it('con la condivisione dei file apre il foglio del sistema, e non scarica', async () => {
    condivisione(() => Promise.resolve());
    expect(await salvaFile(file)).toBe('condiviso');
    expect(navigator.canShare).toHaveBeenCalledWith({ files: [file] });
    expect(navigator.share).toHaveBeenCalledWith({ files: [file] });
    expect(creaUrl).not.toHaveBeenCalled();
  });

  it('se l\'utente chiude il foglio (AbortError) non è un errore, e non scarica', async () => {
    condivisione(() => Promise.reject(new DOMException('Share canceled', 'AbortError')));
    expect(await salvaFile(file)).toBe('annullato');
    expect(creaUrl).not.toHaveBeenCalled();
  });

  it('senza condivisione scarica: un <a download> col nome del file, cliccato da codice e tolto', async () => {
    vi.useFakeTimers();
    expect(await salvaFile(file)).toBe('scaricato');
    expect(creaUrl).toHaveBeenCalledWith(file);
    expect(clic).toHaveBeenCalledTimes(1);
    expect(ancora().download).toBe('dispesa-25-09-2026.json');
    expect(ancora().href).toBe('blob:finto');
    expect(document.body.contains(ancora())).toBe(false);
    // L'URL resta vivo il tempo che il download parta, poi si libera.
    expect(revoca).not.toHaveBeenCalled();
    vi.advanceTimersByTime(40_000);
    expect(revoca).toHaveBeenCalledWith('blob:finto');
  });

  it('se il browser non condivide file (canShare falso) scarica', async () => {
    condivisione(() => Promise.resolve(), () => false);
    expect(await salvaFile(file)).toBe('scaricato');
    expect(navigator.share).not.toHaveBeenCalled();
  });

  it('se la condivisione fallisce per un altro motivo, ripiega sul download (D4)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    condivisione(() => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')));
    expect(await salvaFile(file)).toBe('scaricato');
    expect(ancora().download).toBe('dispesa-25-09-2026.json');
  });
});
```

Run: `npx vitest run src/components/__tests__/salva-file.test.ts`
Expected: FAIL. Il modulo non esiste.

- [ ] **Step 10: Decisioni D3 e D4.** D3 = A l'ha decisa Andrea il 26/09; D4 è di piano, confermata da Andrea lo stesso giorno. Valgono per gli Step 11 e 13.

  **D3: da dove esce `Esci`.** La spec del 25/09 diceva `client().auth.signOut()` senza argomenti, cioè `scope: 'global'` (misura 2 in testa al task).

  | Opzione | Conseguenza |
  |---|---|
  | **A (scelta da Andrea il 26/09): `signOut({ scope: 'local' })`** | Esce da questo telefono e basta. Il PC o il tablet dello stesso account restano dentro. È quello che il dialogo lascia intendere («Per rientrare ti mandiamo un link a {email}»): un logout del telefono |
  | B: `signOut()`, cioè `global` | Esce da tutti i dispositivi dell'account. Chi ha l'app aperta sul PC la ritrova su `/entra` al prossimo rinnovo del token |

  **D4: `salvaFile` quando la condivisione fallisce per un motivo diverso dall'annullo** (per esempio `NotAllowedError` o `DataError`). La spec copre solo `AbortError`. Il piano **ripiega sul download**: il file c'è, è già pronto, e un errore a schermo chiederebbe un testo che la spec non ha. Confermato da Andrea il 26/09.

  Le righe di registro, sotto «Task 5»:

  > **D3 = A (Andrea, 26/09).** `esci()` chiama `signOut({ scope: 'local' })`: esce da questo telefono, non dagli altri dispositivi dell'account. Lancia solo se dopo l'errore la sessione c'è ancora: `signOut` di auth-js 2.112.4 cancella la sessione locale anche quando il server fallisce [misurato in `GoTrueClient._signOut`].
  >
  > **D4 (confermata da Andrea, 26/09).** Se la condivisione del file fallisce per un motivo diverso dall'annullo, `salvaFile` scarica il file.

- [ ] **Step 11: Implementa `src/components/salva-file.ts`.**

```ts
/**
 * Quanto resta vivo l'URL del file dopo il click. Revocarlo subito può
 * interrompere il download in alcuni browser; 40 secondi è il margine largo
 * che usano le librerie di download (FileSaver.js) [ipotesi: il valore non è
 * misurato qui]. Il file pesa meno di un megabyte: tenerlo 40 s non costa.
 */
const REVOCA_DOPO_MS = 40_000;

function eAnnullo(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError';
}

/** Il download classico: un <a download> cliccato da codice, poi tolto. */
function scarica(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOCA_DOPO_MS);
}

/**
 * `SALVA IL FILE` di Esporta (spec fase 5 §E.3):
 * - se il browser sa condividere file (`navigator.canShare({ files })`), apre
 *   il foglio di condivisione del sistema: su iPhone e Android è da lì che
 *   si salva in File, Drive o si manda a sé stessi;
 * - se no, scarica il file;
 * - se l'utente chiude il foglio (`AbortError`), non è un errore: torna
 *   `'annullato'` e il tasto resta `SALVA IL FILE`;
 * - se la condivisione fallisce per un altro motivo, ripiega sul download
 *   (piano fase 5, D4): il file è pronto, e non c'è un testo d'errore per
 *   questo caso.
 *
 * Va chiamata dentro il tocco dell'utente: `share` vuole un gesto recente.
 */
export async function salvaFile(file: File): Promise<'condiviso' | 'scaricato' | 'annullato'> {
  const puoCondividere = typeof navigator !== 'undefined'
    && typeof navigator.share === 'function'
    && navigator.canShare?.({ files: [file] }) === true;
  if (puoCondividere) {
    try {
      await navigator.share({ files: [file] });
      return 'condiviso';
    } catch (e) {
      if (eAnnullo(e)) return 'annullato';
      console.error('salvaFile: condivisione fallita, scarico il file.', e);
    }
  }
  scarica(file);
  return 'scaricato';
}
```

Run: `npx vitest run src/components/__tests__/salva-file.test.ts`
Expected: PASS.

- [ ] **Step 12: `esci`, test prima.** Crea `src/data/__tests__/sessione.test.ts`. Il pattern per sostituire `window.location` è quello di oggi in `src/app/(app)/impostazioni/__tests__/page.test.tsx` (`describe('Casa')`): in jsdom `location.replace` non si può spiare direttamente.

```ts
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../casa', () => ({ dimenticaIdCasa: vi.fn() }));
vi.mock('../utente', () => ({ dimenticaIniziale: vi.fn() }));
vi.mock('@/offline/lista-cache', () => ({ cancellaIstantaneaLista: vi.fn() }));
vi.mock('@/offline/coda', () => ({ svuotaCoda: vi.fn() }));

import { client } from '../supabase';
import { dimenticaIdCasa } from '../casa';
import { dimenticaIniziale } from '../utente';
import { cancellaIstantaneaLista } from '@/offline/lista-cache';
import { svuotaCoda } from '@/offline/coda';
import { esci } from '../sessione';

const locationOriginale = window.location;
let ordine: string[];
let signOut: Mock;
let getSession: Mock;

beforeEach(() => {
  ordine = [];
  signOut = vi.fn(async () => { ordine.push('signOut'); return { error: null }; });
  getSession = vi.fn(async () => ({ data: { session: null }, error: null }));
  vi.mocked(client).mockReset().mockReturnValue({ auth: { signOut, getSession } } as never);
  vi.mocked(cancellaIstantaneaLista).mockReset().mockImplementation(() => { ordine.push('istantanea'); });
  vi.mocked(svuotaCoda).mockReset().mockImplementation(() => { ordine.push('coda'); });
  vi.mocked(dimenticaIdCasa).mockReset().mockImplementation(() => { ordine.push('idCasa'); });
  vi.mocked(dimenticaIniziale).mockReset().mockImplementation(() => { ordine.push('iniziale'); });
  const replace = vi.fn((url: string) => { ordine.push(`replace ${url}`); });
  Object.defineProperty(window, 'location', {
    value: { ...locationOriginale, replace },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { value: locationOriginale, writable: true, configurable: true });
});

describe('esci (spec fase 5 §E.4)', () => {
  it('nell\'ordine: signOut, poi la pulizia, poi /entra con una navigazione piena', async () => {
    await esci();
    expect(ordine).toEqual(['signOut', 'istantanea', 'coda', 'idCasa', 'iniziale', 'replace /entra']);
  });

  it('esce da questo telefono, non da tutti i dispositivi (D3)', async () => {
    await esci();
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('se signOut fallisce e la sessione è ancora qui: lancia, niente pulizia, niente navigazione', async () => {
    const errore = { message: 'rete', status: 500 };
    signOut.mockImplementation(async () => { ordine.push('signOut'); return { error: errore }; });
    getSession.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });

    await expect(esci()).rejects.toBe(errore);
    expect(ordine).toEqual(['signOut']);
  });

  it('se signOut rigetta (eccezione) e la sessione è ancora qui: lancia uguale', async () => {
    const errore = new Error('offline');
    signOut.mockImplementation(async () => { ordine.push('signOut'); throw errore; });
    getSession.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });

    await expect(esci()).rejects.toBe(errore);
    expect(ordine).toEqual(['signOut']);
  });

  it('se il server non risponde ma la sessione locale è già chiusa (auth-js la toglie lo stesso): pulisce ed esce', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    signOut.mockImplementation(async () => { ordine.push('signOut'); return { error: { message: 'rete', status: 500 } }; });
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    await esci();
    expect(ordine).toEqual(['signOut', 'istantanea', 'coda', 'idCasa', 'iniziale', 'replace /entra']);
  });
});
```

Run: `npx vitest run src/data/__tests__/sessione.test.ts`
Expected: FAIL. `src/data/sessione.ts` non esiste.

- [ ] **Step 13: Implementa `src/data/sessione.ts`** (D3 = A):

```ts
import { client } from './supabase';
import { dimenticaIdCasa } from './casa';
import { dimenticaIniziale } from './utente';
import { cancellaIstantaneaLista } from '@/offline/lista-cache';
import { svuotaCoda } from '@/offline/coda';

/**
 * Esci (spec fase 5 §E.4). Prima del 25/09 il logout non esisteva.
 *
 * 1. `signOut({ scope: 'local' })`: esce da questo telefono, non dagli altri
 *    dispositivi dell'account (piano fase 5, D3).
 * 2. La pulizia, come `entraInCasa`/`esciDallaCasa`: l'istantanea offline
 *    della lista e la coda delle spunte non restano su un telefono da cui
 *    l'account è uscito. Una spunta ancora in coda si perde: limite
 *    dichiarato (spec §L), come uscendo da una casa.
 * 3. Le memorie di modulo (`idCasa`, l'iniziale del Menù utente).
 * 4. `window.location.replace('/entra')`: una navigazione piena, che svuota
 *    ogni altra cache di modulo e non passa dalla Lista.
 *
 * **Quando lancia.** `signOut` di auth-js (2.112.4) toglie la sessione
 * locale anche quando la chiamata al server fallisce, e poi restituisce
 * l'errore (misurato il 25/09 in `GoTrueClient._signOut`). Un errore quindi
 * non vuol dire «sei ancora dentro»: si guarda la sessione. Se c'è ancora,
 * si lancia e il dialogo resta aperto col suo errore, senza pulizia né
 * navigazione. Se non c'è più, l'uscita su questo telefono è avvenuta: si
 * pulisce e si va a `/entra` come se fosse andata liscia. Resta valido sul
 * server solo il refresh token, che non ha più nessuno.
 */
export async function esci(): Promise<void> {
  const auth = client().auth;
  let errore: unknown = null;
  try {
    const { error } = await auth.signOut({ scope: 'local' });
    errore = error;
  } catch (e) {
    errore = e;
  }
  if (errore) {
    const { data } = await auth.getSession();
    if (data.session) throw errore;
    console.error('esci: il server non ha confermato, ma la sessione locale è chiusa.', errore);
  }
  cancellaIstantaneaLista();
  svuotaCoda();
  dimenticaIdCasa();
  dimenticaIniziale();
  window.location.replace('/entra');
}
```

In `src/data/utente.ts`, la docstring di `dimenticaIniziale` diventa `/** Azzera la promessa condivisa, così il prossimo \`useIniziale\` rilegge: nei test, e in \`esci()\` (sessione.ts). */`. Il codice non cambia. Il Task 6 riscrive il file: `useIniziale` e `leggiIniziale` escono, e `dimenticaIniziale` resta col suo nome e azzera la cache di `useUtente`, quindi `esci()` non cambia.

Run: `npx vitest run src/data/__tests__/sessione.test.ts`
Expected: PASS.

- [ ] **Step 14: Il commento sbagliato di `casa.ts` (spec §C.7).** In `src/data/casa.ts` il commento di `creaInvito` (riga 158 su `feb4551`; la spec dice 143, ma il file è cresciuto) dice:

```ts
/** Un codice di sei caratteri valido 24 ore; sostituisce l'invito precedente del proprietario. */
```

e diventa:

```ts
/** Un codice di otto caratteri valido un'ora; sostituisce l'invito precedente del proprietario. */
```

Misurato in `supabase/migrations/0012_casa.sql`, `crea_invito()`: `for i in 1..8 loop` e `now() + interval '1 hour'`. Solo il commento: il codice non cambia.

- [ ] **Step 15: Il registro.** Sotto «Task 5» scrivi:
  - **Il tetto di PostgREST e le pagine** (misura 1): `leggiTutteLeSettimane` fa 2 + N query invece di 2, e il perché. Da verificare al gate: il `max_rows` del progetto (Dashboard → Settings → API, o `select current_setting('pgrst.db_max_rows', true)` se configurato lì) **[ipotesi]**. La funzione regge qualunque valore.
  - **Esci** (misura 2): le righe D3 e D4 dello Step 10. La spec §E.4 le riporta già (aggiornata il 26/09).
  - **I Pronti nel file** sono `LottoPronto[]` da `leggiPronti()`, decaduti compresi (misura 3). **I piatti** sono solo quelli attivi (`leggiRepertorio`): un pasto del piano può citare un `dishId` di un piatto disattivato che nel file non c'è. Scelta accettata: il file dice quello che l'app mostra.
  - **Il nome del file usa il giorno locale**, non quello UTC del resto dei dati.
  - **La revoca dell'URL dopo 40 s** [ipotesi sul valore].
  - **La versione** (misura 4): come è stata misurata.

- [ ] **Step 16: Verifica.**

Run: `npx vitest run src/data/__tests__/settimana.leggiTutteLeSettimane.test.ts src/data/__tests__/settimana.leggiSettimana.test.ts src/domain/__tests__/esporta.test.ts src/data/__tests__/esporta.test.ts src/components/__tests__/salva-file.test.ts src/data/__tests__/sessione.test.ts src/components/pannello/__tests__/versione.test.ts src/data/__tests__/casa.test.ts`
Expected: PASS.

Run: `TZ=Europe/Rome npx vitest run src/data/__tests__/esporta.test.ts`
Expected: PASS (la prova vera del nome col giorno locale).

Run: `npx vitest run src/data src/domain`
Expected: PASS: il refactor di `leggiSlotSettimana` non cambia niente altrove.

Run: `npx tsc --noEmit`
Expected: nessun errore (compresi `next.config.ts` e il test che lo importa).

Run: `npm run lint`
Expected: pulito.

**Non** si lancia `npm run build` in questo task (Global Constraints: lo fanno i Task 11 e 15). La misura 4 dice che con questo `next.config.ts` la build passa. Il Task 11 lo riconferma, e deve trovare `Versione 0.1.0` nel bundle: `grep -rho 'Versione [0-9.]*' .next/static | head -1`, dopo che il Task 7 ha montato il piede.

- [ ] **Step 17: Commit.**

```bash
git add src/data/settimana.ts src/domain/esporta.ts src/data/esporta.ts src/components/salva-file.ts src/data/sessione.ts src/components/pannello/versione.ts next.config.ts src/data/casa.ts src/data/utente.ts src/data/__tests__ src/domain/__tests__/esporta.test.ts src/components/__tests__/salva-file.test.ts src/components/pannello/__tests__/versione.test.ts docs/2026-09-25-fase5-decisioni-esecuzione.md
```

```bash
git commit -m "feat: esporta i dati in JSON, esci da Dispesa, la versione da package.json

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Il pannello: provider, contenitore, dati, Menù utente

Il guscio del pannello, senza il suo contenuto: il provider con lo stato e il gesto indietro,
il contenitore con velo, testata, corpo, piede fisso e dialogo, il provider dei dati con la coda
delle scritture portata dalla vecchia pagina, e il Menù utente che lo apre (spec §A.1–§A.5,
§B.1, §B.2, §B.5). La cima mostra solo gli stati dei dati (`CARICO…`, errore con `RIPROVA`); le
tessere e le righe sono del Task 7, le sotto-schermate dei Task 8–10.

**Prima di cominciare:** leggi nel registro (`docs/2026-09-25-fase5-decisioni-esecuzione.md`,
«Sonda del Task 2») l'esito della sonda. Con **«regge»** `vaiA` usa il ramo A
(`chiudiTuttoPoi` + `router.push`); con **«non regge»** il ramo B (`lasciaVoci` +
`router.replace`, Step 11 del Task 2). Il codice qui sotto è scritto col ramo A; lo Step 7 dà le
righe da sostituire per il ramo B. Leggi anche la misura B della sonda: il parametro
`?impostazioni=` si toglie con `window.history.replaceState` come nella sonda; se la misura B
non ha dato gli attesi, fermati e chiedi.

**Il ruolo della vecchia pagina.** `src/app/(app)/impostazioni/page.tsx` resta com'è fino al
Task 11 (diventerà un rimando). Da lei questo task **porta**, non riscrive: la coda serializzata
delle scritture (`codaScrittureRef`), il contatore dell'ultima richiesta
(`richiestaImpostazioniRef`), l'ottimistico con rollback riletto dal server, il rifiuto RLS
(`eRifiutoRls` → `dimenticaIdCasa` → ricarica tutto → «La casa è cambiata…»), la semina dei
pasti di default, i messaggi di `console.error`. Leggila per intero (righe 100–300) prima dello
Step 8.

**Files:**
- Create: `src/components/pannello/tipi.ts`, `indirizzi.ts`, `PannelloProvider.tsx`,
  `DatiPannello.tsx`, `PiedePannello.tsx`, `schermate.tsx`, `Pannello.tsx`
- Modify: `src/components/Guscio.tsx`, `src/components/Testata.tsx`, `src/data/utente.ts`
- Test: `src/components/pannello/__tests__/indirizzi.test.ts`,
  `src/components/pannello/__tests__/dati-pannello.test.tsx`,
  `src/components/pannello/__tests__/pannello.test.tsx`,
  `src/components/__tests__/testata.test.tsx`, `src/components/__tests__/guscio.test.tsx`,
  `src/data/__tests__/utente.test.ts`
- Modify: `docs/2026-09-25-fase5-decisioni-esecuzione.md`

**Interfaces:**
- Consumes:
  - `useIndietroFogli(profondita, chiudiUltimo)` con `chiudiTuttoPoi` (Task 2; col ramo B anche
    `lasciaVoci`), `DialogoConferma` e `PropsDialogo`, `FoglioDalBasso` con `livello={3}`,
    `MessaggioErrore` e `STILE_PILLOLA` da `src/components/controlli.tsx` (Task 2);
  - `Impostazioni` con `giorniControllo` (Task 3): le fixture qui la portano;
  - le classi `.pannello*`, `.anim-sotto-*`, `data-stato`, `data-istantaneo`,
    `.guscio[data-pannello="aperto"]` (Task 1).
- Produces (come nell'ossatura):
  - `tipi.ts`: `SottoSchermata`, `SOTTO_SCHERMATE`, `DestinazionePannello`;
  - `indirizzi.ts`: `leggiDestinazione`, `indirizzoPannello`, `OriginePannello`, `salvaOrigine`,
    `leggiOrigine`, `indirizzoRitorno`, `salvaScrollPannello`, `prendiScrollPannello`;
  - `PannelloProvider.tsx`: `ContestoPannello`, `PannelloProvider`, `usePannello`;
  - `DatiPannello.tsx`: `DatiPannello`, `StatoDati`, `useDatiPannello`;
  - `PiedePannello.tsx`: `PiedePannello`;
  - `schermate.tsx`: `SCHERMATE`;
  - `src/data/utente.ts`: `leggiUtente(): Promise<{ nome: string; email: string }>`.
- Produces, **in aggiunta all'ossatura** (additive; vanno scritte nella sezione delle
  interfacce del piano):
  - `tipi.ts`: `ID_PANNELLO = 'pannello-impostazioni'`, `ID_TITOLO_PANNELLO`, `ID_MENU_UTENTE =
    'menu-utente'` (il Menù punta al pannello con `aria-controls`, il pannello gli rende il
    fuoco);
  - `PannelloProvider.tsx`: `usePannelloInterno(): { dialogo: PropsDialogo | null; istantaneo:
    boolean; scroll: number | null; scrollUsato(): void }`, solo per `Pannello` e `Guscio`;
  - `DatiPannello.tsx`: `DatiPannelloProvider` (il contesto dei dati: `useDatiPannello` ne
    legge uno solo per tutto il pannello) e `StatoDatiPannello({ children: (dati) => ReactNode })`,
    che mostra `CARICO…` o l'errore con `RIPROVA` e, pronto, i figli; lo usano la cima (Task 7)
    e le sotto-schermate che leggono i dati del pannello (Task 8, 9);
  - `ricaricaCasa(seFallisce?: StatoCasa)`: il parametro facoltativo è lo stato da mettere se
    la rilettura fallisce (serve al test vecchio 43, Task 10). Non rigetta mai;
  - `cancellataIl: Date | null` e `segnaCancellata(quando: Date)`: quando è riuscita Cancella la
    dispensa. La nota della riga (`Cancellata il {gg/mm} alle {hh:mm}.`, spec §D) la legge da
    qui, e il provider la azzera alla chiusura del pannello: così regge anche se la cima si
    smonta (decisione del controller, 26/09);
  - `schermate.tsx`: `CIMA: ComponentType`, il contenuto della cima (qui solo gli stati; il
    Task 7 lo sostituisce con `Cima`);
  - `Pannello.tsx`: `Pannello`, `DURATA_USCITA_MS`;
  - `src/data/utente.ts`: `useUtente(): { nome: string; email: string } | null` e
    `inizialeDi(nome: string): string`; escono `useIniziale` e `leggiIniziale`, resta
    `dimenticaIniziale` (azzera la cache di `useUtente`; la chiama `esci()`, spec §E.4).

**Semantica di `salvaImpostazioni` / `salvaPasti`.** Tornano `false` solo quando **la riga deve
mostrare** `Non siamo riusciti a salvare. Riprova.` (l'ultima richiesta è fallita e il valore è
tornato a quello di prima). Una richiesta superata da una più recente torna `true`: dirà
l'ultima parola la più recente, come oggi. Un rifiuto RLS torna `true`: il messaggio è
`casaCambiata`, non l'errore della riga, come oggi. Con `true` il valore a schermo è comunque
quello giusto. `casaCambiata` vale fino al prossimo salvataggio (e si spegne a ogni apertura):
passare da una sotto-schermata all'altra non la spegne.

**Se `salvaPasti` fallisce, rilegge i pasti dal server** (decisione del controller, 26/09).
`salvaSlotDefs` non è atomico: prima cancella i pasti tolti (e a cascata i loro piatti), poi
scrive gli altri. Se la cancellazione è già avvenuta e la scrittura fallisce, tornare alla copia
locale rimetterebbe a schermo un pasto che sul server non c'è più. Quindi il ritorno a prima è
`leggiSlotDefs()`; solo se anche la rilettura fallisce si torna all'ultimo insieme confermato. In
entrambi i casi la riga mostra l'errore (`false`).

- [ ] **Step 1: `src/data/utente.ts`, i test.** Sostituisci `src/data/__tests__/utente.test.ts`
  con:

```ts
import { describe, it, expect, vi } from 'vitest';

const getUser = vi.hoisted(() => vi.fn());
vi.mock('@/data/supabase', () => ({ client: () => ({ auth: { getUser } }) }));

import { inizialeDi, leggiUtente } from '../utente';

describe('leggiUtente (spec fase 5 §A.2)', () => {
  it('il nome del profilo se c\'è, ripulito', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'x@y.it', user_metadata: { nome: ' andrea ' } } } });
    expect(await leggiUtente()).toEqual({ nome: 'andrea', email: 'x@y.it' });
  });

  it('altrimenti la parte dell\'email prima della @', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'dom@y.it', user_metadata: {} } } });
    expect(await leggiUtente()).toEqual({ nome: 'dom', email: 'dom@y.it' });
  });

  it('senza utente o con errore, nome ed email vuoti: non lancia', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await leggiUtente()).toEqual({ nome: '', email: '' });
    getUser.mockRejectedValue(new Error('rete'));
    expect(await leggiUtente()).toEqual({ nome: '', email: '' });
  });
});

// Erano i test di leggiIniziale (spec §D del 19/09): l'iniziale ora viene dal nome.
describe('inizialeDi', () => {
  it('la prima lettera del nome, maiuscola', () => {
    expect(inizialeDi('andrea')).toBe('A');
    expect(inizialeDi('dom')).toBe('D');
  });
  it('senza nome il puntino', () => {
    expect(inizialeDi('')).toBe('·');
    expect(inizialeDi('   ')).toBe('·');
  });
});
```

Run: `npx vitest run src/data/__tests__/utente.test.ts`
Expected: FAIL — `leggiUtente` e `inizialeDi` non esistono.

- [ ] **Step 2: `src/data/utente.ts`, l'implementazione.** Sostituisci il file con:

```ts
'use client';

import { useEffect, useState } from 'react';
import { client } from '@/data/supabase';

export interface Utente {
  /** `user_metadata.nome` se c'è, altrimenti la parte dell'email prima della @; '' senza utente. */
  nome: string;
  email: string;
}

const NESSUNO: Utente = { nome: '', email: '' };

/**
 * Chi è loggato: il nome per il Menù utente (`{Nome}: profilo e impostazioni`, spec fase 5
 * §A.2) e nome ed email per il gruppo Account del pannello. Solo lettura; non lancia.
 */
export async function leggiUtente(): Promise<Utente> {
  try {
    const { data } = await client().auth.getUser();
    const u = data.user;
    if (!u) return NESSUNO;
    const email = u.email ?? '';
    const dalProfilo = typeof u.user_metadata?.nome === 'string' ? u.user_metadata.nome.trim() : '';
    return { nome: dalProfilo || email.split('@')[0], email };
  } catch {
    return NESSUNO;
  }
}

/** L'iniziale del Menù utente: la prima lettera del nome, maiuscola; '·' se il nome non c'è. */
export function inizialeDi(nome: string): string {
  const pulito = nome.trim();
  return pulito ? pulito[0].toLocaleUpperCase('it') : '·';
}

// La Testata monta a ogni pagina: senza cache, ogni montaggio richiamerebbe `getUser` da capo
// per la stessa sessione. Una sola promessa condivisa a livello di modulo.
let promessa: Promise<Utente> | null = null;

/** null finché `getUser` non risponde. */
export function useUtente(): Utente | null {
  const [utente, setUtente] = useState<Utente | null>(null);
  useEffect(() => {
    let vivo = true;
    (promessa ??= leggiUtente()).then((u) => { if (vivo) setUtente(u); });
    return () => { vivo = false; };
  }, []);
  return utente;
}

/**
 * Azzera la promessa condivisa: il prossimo `useUtente` rilegge. Il nome è quello di prima
 * della fase 5 (lo chiamano `esci()` e i test).
 */
export function dimenticaIniziale(): void {
  promessa = null;
}
```

Run: `npx vitest run src/data/__tests__/utente.test.ts`
Expected: PASS.

- [ ] **Step 3: `tipi.ts` e `indirizzi.ts`, i test.** Crea
  `src/components/pannello/__tests__/indirizzi.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  indirizzoPannello, indirizzoRitorno, leggiDestinazione, leggiOrigine,
  prendiScrollPannello, salvaOrigine, salvaScrollPannello,
} from '../indirizzi';
import { SOTTO_SCHERMATE } from '../tipi';

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('leggiDestinazione (spec §A.3)', () => {
  it('senza il parametro è null', () => {
    expect(leggiDestinazione('')).toBeNull();
    expect(leggiDestinazione('?da=lista')).toBeNull();
  });

  it('cima e le otto sotto-schermate si leggono come sono', () => {
    expect(SOTTO_SCHERMATE).toHaveLength(8);
    expect(leggiDestinazione('?impostazioni=cima')).toBe('cima');
    for (const s of SOTTO_SCHERMATE) expect(leggiDestinazione(`?impostazioni=${s}`)).toBe(s);
  });

  it('un valore sconosciuto, o vuoto, vale cima', () => {
    expect(leggiDestinazione('?impostazioni=boh')).toBe('cima');
    expect(leggiDestinazione('?impostazioni=')).toBe('cima');
  });
});

describe('indirizzoPannello', () => {
  it('il percorso più il parametro', () => {
    expect(indirizzoPannello('/dispensa', 'ingredienti')).toBe('/dispensa?impostazioni=ingredienti');
    expect(indirizzoPannello('/lista', 'cima')).toBe('/lista?impostazioni=cima');
  });
});

describe('origine (spec §A.5)', () => {
  it('senza origine il ritorno va in cima sopra la Lista', () => {
    expect(leggiOrigine()).toBeNull();
    expect(indirizzoRitorno()).toBe('/lista?impostazioni=cima');
  });

  it('con l\'origine il ritorno è il pannello sopra la pagina di partenza', () => {
    salvaOrigine({ pathname: '/dispensa', sotto: 'ingredienti' });
    expect(leggiOrigine()).toEqual({ pathname: '/dispensa', sotto: 'ingredienti' });
    expect(indirizzoRitorno()).toBe('/dispensa?impostazioni=ingredienti');
  });

  it('un\'origine malformata non vale: JSON rotto, un percorso non interno, un sotto sconosciuto', () => {
    window.sessionStorage.setItem('spesa:origine-pannello', '{rotto');
    expect(leggiOrigine()).toBeNull();
    window.sessionStorage.setItem('spesa:origine-pannello', JSON.stringify({ pathname: '//altro.sito', sotto: 'cima' }));
    expect(leggiOrigine()).toBeNull();
    window.sessionStorage.setItem('spesa:origine-pannello', JSON.stringify({ pathname: 'lista', sotto: 'cima' }));
    expect(leggiOrigine()).toBeNull();
    window.sessionStorage.setItem('spesa:origine-pannello', JSON.stringify({ pathname: '/lista', sotto: 'casa' }));
    expect(leggiOrigine()).toBeNull();
  });

  it('con sessionStorage che lancia non lancia niente, e il ritorno è quello di riserva', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloccato'); });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloccato'); });
    expect(() => salvaOrigine({ pathname: '/lista', sotto: 'cima' })).not.toThrow();
    expect(indirizzoRitorno()).toBe('/lista?impostazioni=cima');
    expect(() => salvaScrollPannello('ingredienti', 300)).not.toThrow();
    expect(prendiScrollPannello('ingredienti')).toBeNull();
  });
});

describe('scorrimento (spec §A.3)', () => {
  it('si salva intero, e prenderlo lo legge e lo cancella', () => {
    salvaScrollPannello('ingredienti', 420.6);
    expect(window.sessionStorage.getItem('spesa:pannello-scroll:ingredienti')).toBe('421');
    expect(prendiScrollPannello('ingredienti')).toBe(421);
    expect(prendiScrollPannello('ingredienti')).toBeNull();
  });

  it('un valore che non è un numero non vale, e si cancella lo stesso', () => {
    window.sessionStorage.setItem('spesa:pannello-scroll:cima', 'tanto');
    expect(prendiScrollPannello('cima')).toBeNull();
    expect(window.sessionStorage.getItem('spesa:pannello-scroll:cima')).toBeNull();
  });
});
```

Run: `npx vitest run src/components/pannello/__tests__/indirizzi.test.ts`
Expected: FAIL — i moduli non esistono.

- [ ] **Step 4: `tipi.ts` e `indirizzi.ts`, l'implementazione.** Crea
  `src/components/pannello/tipi.ts`:

```ts
/** Le otto sotto-schermate del pannello (spec §A.1). Porzioni sta nella riga, Cancella ed Esci sono dialoghi, Piatti e Importa sono pagine. */
export type SottoSchermata =
  | 'pasti-a-casa' | 'gestione-pasti' | 'rotazione'
  | 'ingredienti' | 'aree' | 'cadenza'
  | 'casa' | 'esporta';

export const SOTTO_SCHERMATE: readonly SottoSchermata[] = [
  'pasti-a-casa', 'gestione-pasti', 'rotazione',
  'ingredienti', 'aree', 'cadenza',
  'casa', 'esporta',
];

/** Dove apre il pannello: in cima o su una sotto-schermata. */
export type DestinazionePannello = 'cima' | SottoSchermata;

/** Il pannello, per `aria-controls` del Menù utente. */
export const ID_PANNELLO = 'pannello-impostazioni';
/** Il titolo del pannello, per `aria-labelledby`. */
export const ID_TITOLO_PANNELLO = 'pannello-impostazioni-titolo';
/** Il Menù utente: alla chiusura il pannello gli rende il fuoco (spec §A.2). */
export const ID_MENU_UTENTE = 'menu-utente';
```

  Crea `src/components/pannello/indirizzi.ts`:

```ts
import { SOTTO_SCHERMATE, type DestinazionePannello, type SottoSchermata } from './tipi';

const CHIAVE_ORIGINE = 'spesa:origine-pannello';
const PREFISSO_SCROLL = 'spesa:pannello-scroll:';

/**
 * `?impostazioni=` (spec §A.3): null se il parametro manca; `cima` o una delle otto
 * sotto-schermate; un valore sconosciuto vale `cima`.
 */
export function leggiDestinazione(search: string): DestinazionePannello | null {
  const valore = new URLSearchParams(search).get('impostazioni');
  if (valore === null) return null;
  return (SOTTO_SCHERMATE as readonly string[]).includes(valore) ? (valore as SottoSchermata) : 'cima';
}

/** L'unica funzione che costruisce gli indirizzi del pannello: la usano tutte le pagine piene per tornare. */
export function indirizzoPannello(pathname: string, dest: DestinazionePannello): string {
  return `${pathname}?impostazioni=${dest}`;
}

/** Da dove si è lasciato il pannello per una pagina piena (spec §A.5). */
export interface OriginePannello {
  /** La pagina sotto il pannello, es. `/dispensa`. */
  pathname: string;
  sotto: 'cima' | 'ingredienti';
}

/**
 * sessionStorage può mancare o lanciare (Safari in navigazione privata, dati del sito
 * bloccati): ogni accesso sta dentro un try, e senza memoria il pannello torna in cima sopra
 * la Lista.
 */
function memoria(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function salvaOrigine(o: OriginePannello): void {
  try {
    memoria()?.setItem(CHIAVE_ORIGINE, JSON.stringify(o));
  } catch {
    // Senza memoria il ritorno va in cima sopra la Lista.
  }
}

/** Un percorso interno: comincia con una sola barra. `//altro.sito` sarebbe un altro sito. */
function percorsoInterno(p: unknown): p is string {
  return typeof p === 'string' && p.startsWith('/') && !p.startsWith('//');
}

export function leggiOrigine(): OriginePannello | null {
  try {
    const testo = memoria()?.getItem(CHIAVE_ORIGINE);
    if (!testo) return null;
    const o = JSON.parse(testo) as { pathname?: unknown; sotto?: unknown };
    if (!percorsoInterno(o.pathname)) return null;
    if (o.sotto !== 'cima' && o.sotto !== 'ingredienti') return null;
    return { pathname: o.pathname, sotto: o.sotto };
  } catch {
    return null;
  }
}

/** Dove porta la freccia di una pagina piena aperta dal pannello: il pannello sopra l'origine. */
export function indirizzoRitorno(): string {
  const o = leggiOrigine();
  return o ? indirizzoPannello(o.pathname, o.sotto) : indirizzoPannello('/lista', 'cima');
}

export function salvaScrollPannello(dest: DestinazionePannello, px: number): void {
  try {
    memoria()?.setItem(PREFISSO_SCROLL + dest, String(Math.round(px)));
  } catch {
    // Senza memoria il pannello riapre dall'alto.
  }
}

/** Legge e cancella: lo scorrimento salvato vale per un ritorno solo. */
export function prendiScrollPannello(dest: DestinazionePannello): number | null {
  try {
    const m = memoria();
    const testo = m?.getItem(PREFISSO_SCROLL + dest);
    if (testo == null) return null;
    m?.removeItem(PREFISSO_SCROLL + dest);
    const px = Number(testo);
    return Number.isFinite(px) && px >= 0 ? px : null;
  } catch {
    return null;
  }
}
```

Run: `npx vitest run src/components/pannello/__tests__/indirizzi.test.ts`
Expected: PASS.

- [ ] **Step 5: I test dei dati, che falliscono.** Crea
  `src/components/pannello/__tests__/dati-pannello.test.tsx`. Sono i test della coda, del
  rollback e del rifiuto RLS di `impostazioni/__tests__/page.test.tsx` (righe 175–435), portati
  su un consumatore minimo: la riga delle porzioni vera arriva col Task 7.

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import type { Impostazioni, MealSlotDef } from '@/domain/types';
import type { VoceEvitata } from '@/domain/list-builder';
import { ORDINE_AREE_DEFAULT } from '@/domain/aree';

vi.mock('@/data/impostazioni', () => ({
  leggiImpostazioni: vi.fn(),
  salvaImpostazioni: vi.fn(),
  leggiSlotDefs: vi.fn(),
  salvaSlotDefs: vi.fn(),
  pastiDiDefault: vi.fn(() => [
    { id: 'default-colazione', nome: 'Colazione', posizione: 0, assenzeAbituali: [false, false, false, false, false, false, false] },
    { id: 'default-spuntino', nome: 'Spuntino', posizione: 1, assenzeAbituali: [false, false, false, false, false, true, true] },
    { id: 'default-pranzo', nome: 'Pranzo', posizione: 2, assenzeAbituali: [true, true, true, true, true, false, false] },
    { id: 'default-cena', nome: 'Cena', posizione: 3, assenzeAbituali: [false, false, false, false, false, false, false] },
  ]),
}));

// `eRifiutoRls` è quella vera: è pura, e i dati si ramificano su di lei.
vi.mock('@/data/casa', async () => {
  const reale = await vi.importActual<typeof import('@/data/casa')>('@/data/casa');
  return { statoCasa: vi.fn(), dimenticaIdCasa: vi.fn(), eRifiutoRls: reale.eRifiutoRls };
});
vi.mock('@/data/risparmio', () => ({ leggiRisparmioTotale: vi.fn() }));
vi.mock('@/data/utente', () => ({ leggiUtente: vi.fn() }));

// Il pannello aperto, senza montare il provider vero: qui si provano i dati.
const pannello = vi.hoisted(() => ({ aperto: true, chiudiDialogo: vi.fn() }));
vi.mock('../PannelloProvider', () => ({ usePannello: () => pannello }));

import { leggiImpostazioni, salvaImpostazioni, leggiSlotDefs, salvaSlotDefs } from '@/data/impostazioni';
import { statoCasa, dimenticaIdCasa } from '@/data/casa';
import { leggiRisparmioTotale } from '@/data/risparmio';
import { leggiUtente } from '@/data/utente';
import { DatiPannelloProvider, useDatiPannello } from '../DatiPannello';

const ASSENZE = [false, false, false, false, false, false, false];
const SLOT_COLAZIONE: MealSlotDef = { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE };
const SLOT_PRANZO: MealSlotDef = { id: 'sd-2', nome: 'Pranzo', posizione: 1, assenzeAbituali: [true, false, false, false, false, false, false] };
const SLOT_CENA: MealSlotDef = { id: 'sd-3', nome: 'Cena', posizione: 2, assenzeAbituali: ASSENZE };

function impostazioni(porzioni: number): Impostazioni {
  return {
    moltiplicatorePorzioni: porzioni, ordineAree: [...ORDINE_AREE_DEFAULT],
    settimaneCiclo: 1, cicloOrigine: null, giorniControllo: 90,
  };
}

const OLIO: VoceEvitata = {
  ingredientId: 'i-1', nome: 'Olio', unita: 'ml', fabbisogno: 500,
  confezioniIngenue: 3, confezioniReali: 1, confezioniEvitate: 2, quantitaEvitata: 1000, prezzoConfezione: null,
};

function mockDati(o: { porzioni?: number; pasti?: MealSlotDef[] } = {}) {
  vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(o.porzioni ?? 1));
  vi.mocked(leggiSlotDefs).mockResolvedValue(o.pasti ?? [SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA]);
  vi.mocked(salvaImpostazioni).mockResolvedValue(undefined);
  vi.mocked(salvaSlotDefs).mockResolvedValue(undefined);
  vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'solo', email: [], id: [] });
  vi.mocked(leggiRisparmioTotale).mockResolvedValue([OLIO]);
  vi.mocked(leggiUtente).mockResolvedValue({ nome: 'Andrea', email: 'andrea@example.it' });
}

/** Quello che una riga mostrerebbe, e i gesti che farebbe. */
function Consumatore() {
  const { stato, salvaImpostazioni: salva, salvaPasti, casaCambiata, ricaricaCasa, cancellataIl, segnaCancellata } = useDatiPannello();
  const [errore, setErrore] = useState(false);
  if (stato.stato !== 'pronto') return <p>{`stato ${stato.stato}`}</p>;
  const { impostazioni: i, slotDefs, casa, risparmio, utente } = stato.dati;
  const p = i.moltiplicatorePorzioni;
  return (
    <div>
      <p>{`Porzioni: ${p}`}</p>
      <p>{`Pasti: ${slotDefs.map((s) => s.nome).join(', ')}`}</p>
      <p>{`Casa: ${casa?.ruolo ?? 'non letta'}`}</p>
      <p>{`Confezioni: ${risparmio?.confezioni ?? 'nessun dato'}`}</p>
      <p>{`Utente: ${utente.nome}`}</p>
      <button type="button" onClick={async () => setErrore(!(await salva({ moltiplicatorePorzioni: p + 1 })))}>più</button>
      <button
        type="button"
        onClick={async () => setErrore(!(await salvaPasti(slotDefs.map((s, k) => (k === 0 ? { ...s, nome: 'Merenda' } : s)))))}
      >
        rinomina
      </button>
      <button type="button" onClick={() => void ricaricaCasa({ ruolo: 'solo', email: [], id: [] })}>rileggi la casa</button>
      <button type="button" onClick={() => segnaCancellata(new Date(2026, 8, 25, 10, 14))}>segna la cancellazione</button>
      <p>{`Cancellata: ${cancellataIl ? 'sì' : 'no'}`}</p>
      {errore && <p>Non siamo riusciti a salvare. Riprova.</p>}
      {casaCambiata && <p>La casa è cambiata: dati ricaricati. Riprova.</p>}
    </div>
  );
}

const albero = () => <DatiPannelloProvider><Consumatore /></DatiPannelloProvider>;
const piu = () => fireEvent.click(screen.getByRole('button', { name: 'più' }));

beforeEach(() => {
  vi.clearAllMocks();
  pannello.aperto = true;
});

describe('DatiPannello: lettura (spec §B.5, §C.11)', () => {
  it('all\'apertura legge impostazioni, pasti, casa, risparmio e utente', async () => {
    mockDati();
    render(albero());
    expect(screen.getByText('stato carico')).toBeInTheDocument();
    expect(await screen.findByText('Porzioni: 1')).toBeInTheDocument();
    expect(screen.getByText('Pasti: Colazione, Pranzo, Cena')).toBeInTheDocument();
    expect(screen.getByText('Casa: solo')).toBeInTheDocument();
    expect(screen.getByText('Confezioni: 2')).toBeInTheDocument();
    expect(screen.getByText('Utente: Andrea')).toBeInTheDocument();
  });

  it('a pannello chiuso non legge niente', () => {
    mockDati();
    pannello.aperto = false;
    render(albero());
    expect(screen.getByText('stato carico')).toBeInTheDocument();
    expect(leggiImpostazioni).not.toHaveBeenCalled();
  });

  it('riaperto rilegge in silenzio, sopra i dati che ci sono', async () => {
    mockDati();
    const { rerender } = render(albero());
    await screen.findByText('Porzioni: 1');
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(2));
    pannello.aperto = false;
    rerender(albero());
    pannello.aperto = true;
    rerender(albero());
    expect(screen.getByText('Porzioni: 1')).toBeInTheDocument();
    expect(await screen.findByText('Porzioni: 2')).toBeInTheDocument();
    expect(leggiImpostazioni).toHaveBeenCalledTimes(2);
  });

  it('con leggiSlotDefs() vuoto semina i quattro pasti di default e li salva davvero sul server', async () => {
    mockDati({ pasti: [] });
    render(albero());
    expect(await screen.findByText('Pasti: Colazione, Spuntino, Pranzo, Cena')).toBeInTheDocument();
    expect(salvaSlotDefs).toHaveBeenCalledTimes(1);
    expect(vi.mocked(salvaSlotDefs).mock.calls[0][0].map((p) => p.id)).toEqual([
      'default-colazione', 'default-spuntino', 'default-pranzo', 'default-cena',
    ]);
  });

  it('se statoCasa fallisce la casa è null e il resto è pronto', async () => {
    mockDati();
    vi.mocked(statoCasa).mockRejectedValue(new Error('rete'));
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(albero());
    expect(await screen.findByText('Casa: non letta')).toBeInTheDocument();
    expect(screen.getByText('Porzioni: 1')).toBeInTheDocument();
    errore.mockRestore();
  });

  it('se il risparmio non si legge non ci sono dati per la nota, e il resto è pronto', async () => {
    mockDati();
    vi.mocked(leggiRisparmioTotale).mockRejectedValue(new Error('rete'));
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(albero());
    expect(await screen.findByText('Confezioni: nessun dato')).toBeInTheDocument();
    errore.mockRestore();
  });

  it('se impostazioni o pasti non si leggono lo stato è errore', async () => {
    mockDati();
    vi.mocked(leggiSlotDefs).mockRejectedValue(new Error('rete'));
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(albero());
    expect(await screen.findByText('stato errore')).toBeInTheDocument();
    errore.mockRestore();
  });
});

describe('DatiPannello: salvataggio delle impostazioni (spec §B.5, §L)', () => {
  // F4 della review: la rilettura del primo gesto può arrivare dopo quella del secondo.
  it('due gesti veloci: se la rilettura del primo arriva dopo quella del secondo, resta il valore del secondo', async () => {
    mockDati({ porzioni: 1 });
    render(albero());
    await screen.findByText('Porzioni: 1');
    const riletture: Array<(i: Impostazioni) => void> = [];
    vi.mocked(leggiImpostazioni).mockImplementation(() => new Promise((resolve) => { riletture.push(resolve); }));

    piu();
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    piu();
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(2));
    expect(vi.mocked(salvaImpostazioni).mock.calls[1][0].moltiplicatorePorzioni).toBe(3);
    await waitFor(() => expect(riletture).toHaveLength(2));

    riletture[1](impostazioni(3));
    expect(await screen.findByText('Porzioni: 3')).toBeInTheDocument();
    riletture[0](impostazioni(2));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText('Porzioni: 3')).toBeInTheDocument();
  });

  // Le scritture partono in fila (review dell'11/09): la seconda aspetta la prima anche se fallisce.
  it('due gesti veloci: se il primo salvataggio fallisce, il secondo si scrive lo stesso e resta il suo valore senza errore', async () => {
    mockDati({ porzioni: 1 });
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    const salvataggi: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
    vi.mocked(salvaImpostazioni).mockImplementation(
      () => new Promise<void>((resolve, reject) => { salvataggi.push({ resolve, reject }); }),
    );
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(3));

    piu();
    await waitFor(() => expect(salvataggi).toHaveLength(1));
    piu();
    await new Promise((r) => setTimeout(r, 0));
    expect(salvataggi).toHaveLength(1);

    salvataggi[0].reject(new Error('rete'));
    await waitFor(() => expect(salvataggi).toHaveLength(2));
    expect(vi.mocked(salvaImpostazioni).mock.calls[1][0].moltiplicatorePorzioni).toBe(3);
    salvataggi[1].resolve();

    expect(await screen.findByText('Porzioni: 3')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText('Non siamo riusciti a salvare. Riprova.')).not.toBeInTheDocument();
    errore.mockRestore();
  });

  // B1 della review di correttezza: il rollback rilegge dal server, non torna al ref.
  it('due gesti veloci: se il primo riesce ma la sua rilettura non è l\'ultima e il secondo fallisce, mostra il valore del server', async () => {
    mockDati({ porzioni: 1 });
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    const salvataggi: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
    vi.mocked(salvaImpostazioni).mockImplementation(
      () => new Promise<void>((resolve, reject) => { salvataggi.push({ resolve, reject }); }),
    );
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(2));

    piu();
    await waitFor(() => expect(salvataggi).toHaveLength(1));
    piu();
    expect(screen.getByText('Porzioni: 3')).toBeInTheDocument();

    salvataggi[0].resolve();
    await waitFor(() => expect(leggiImpostazioni).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(salvataggi).toHaveLength(2));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText('Porzioni: 3')).toBeInTheDocument();

    salvataggi[1].reject(new Error('rete'));
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(await screen.findByText('Porzioni: 2')).toBeInTheDocument();
    expect(leggiImpostazioni).toHaveBeenCalledTimes(3);
    errore.mockRestore();
  });

  // Review dell'11/09 (bassa): con la coda il rollback rilegge dopo tutte le scritture precedenti.
  it('due gesti veloci: se la seconda scrittura fallisce mentre la prima è in volo, alla fine schermo e server dicono 2', async () => {
    mockDati({ porzioni: 1 });
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    let sulServer = 1;
    let confermaPrima: () => void = () => {};
    vi.mocked(salvaImpostazioni)
      .mockImplementationOnce((i) => new Promise<void>((resolve) => {
        confermaPrima = () => { sulServer = i.moltiplicatorePorzioni; resolve(); };
      }))
      .mockRejectedValueOnce(new Error('rete'));
    vi.mocked(leggiImpostazioni).mockImplementation(async () => impostazioni(sulServer));

    piu();
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    piu();
    expect(screen.getByText('Porzioni: 3')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 0));
    expect(salvaImpostazioni).toHaveBeenCalledTimes(1);

    confermaPrima();
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(await screen.findByText('Porzioni: 2')).toBeInTheDocument();
    errore.mockRestore();
  });

  it('se il salvataggio fallisce e anche la rilettura fallisce, torna all\'ultimo valore confermato e lo dice', async () => {
    mockDati({ porzioni: 1 });
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    vi.mocked(leggiImpostazioni).mockRejectedValue(new Error('rete'));

    piu();
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(screen.getByText('Porzioni: 1')).toBeInTheDocument();
    expect(errore).toHaveBeenCalledWith('impostazioni: rilettura dopo il salvataggio fallito non riuscita.', expect.any(Error));
    errore.mockRestore();
  });

  it('se il salvataggio fallisce torna al valore del server e lo dice; un errore qualsiasi non è un cambio di casa', async () => {
    mockDati({ porzioni: 1 });
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(albero());
    await screen.findByText('Porzioni: 1');

    piu();
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(screen.getByText('Porzioni: 1')).toBeInTheDocument();
    expect(leggiImpostazioni).toHaveBeenCalledTimes(2);
    expect(dimenticaIdCasa).not.toHaveBeenCalled();
    expect(leggiSlotDefs).toHaveBeenCalledTimes(1);
    expect(statoCasa).toHaveBeenCalledTimes(1);
    errore.mockRestore();
  });

  // Prova del 15/09: la casa è cambiata da un altro telefono, e la RLS rifiuta (42501).
  it('se la RLS rifiuta il salvataggio scarta l\'id della casa, chiude il dialogo, ricarica tutto e lo dice', async () => {
    mockDati({ porzioni: 1 });
    vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'membro', email: ['a@b.it'], id: ['id-p'] });
    render(albero());
    expect(await screen.findByText('Casa: membro')).toBeInTheDocument();
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(salvaImpostazioni).mockRejectedValue({
      code: '42501',
      message: 'new row violates row-level security policy for table "settings"',
    });
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(3));
    vi.mocked(leggiSlotDefs).mockResolvedValue([
      SLOT_COLAZIONE,
      { id: 'sd-4', nome: 'Merenda', posizione: 1, assenzeAbituali: ASSENZE },
      { ...SLOT_PRANZO, posizione: 2 },
      { ...SLOT_CENA, posizione: 3 },
    ]);
    vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'solo', email: [], id: [] });

    piu();
    expect(await screen.findByText('La casa è cambiata: dati ricaricati. Riprova.')).toBeInTheDocument();
    expect(dimenticaIdCasa).toHaveBeenCalledTimes(1);
    expect(pannello.chiudiDialogo).toHaveBeenCalledTimes(1);
    expect(leggiImpostazioni).toHaveBeenCalledTimes(2);
    expect(leggiSlotDefs).toHaveBeenCalledTimes(2);
    expect(statoCasa).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Porzioni: 3')).toBeInTheDocument();
    expect(screen.getByText('Pasti: Colazione, Merenda, Pranzo, Cena')).toBeInTheDocument();
    expect(screen.getByText('Casa: solo')).toBeInTheDocument();
    expect(screen.queryByText('Non siamo riusciti a salvare. Riprova.')).not.toBeInTheDocument();
    expect(salvaImpostazioni).toHaveBeenCalledTimes(1);
    errore.mockRestore();
  });

  it('un rifiuto RLS riconosciuto dal solo messaggio (senza codice) ricarica allo stesso modo', async () => {
    mockDati({ porzioni: 1 });
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('new row violates row-level security policy'));

    piu();
    expect(await screen.findByText('La casa è cambiata: dati ricaricati. Riprova.')).toBeInTheDocument();
    expect(dimenticaIdCasa).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Porzioni: 1')).toBeInTheDocument();
    errore.mockRestore();
  });

  it('«La casa è cambiata…» sparisce al prossimo salvataggio', async () => {
    mockDati({ porzioni: 1 });
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(salvaImpostazioni).mockRejectedValueOnce({ code: '42501', message: 'rls' });
    piu();
    await screen.findByText('La casa è cambiata: dati ricaricati. Riprova.');
    piu();
    expect(screen.queryByText('La casa è cambiata: dati ricaricati. Riprova.')).not.toBeInTheDocument();
    errore.mockRestore();
  });
});

describe('DatiPannello: pasti e casa (spec §C.1, §C.2, §L)', () => {
  it('salvaPasti è ottimistico; se fallisce rilegge i pasti dal server, li mostra e dà false', async () => {
    mockDati();
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    let rifiuta: (e: Error) => void = () => {};
    vi.mocked(salvaSlotDefs).mockReturnValueOnce(new Promise<void>((_, r) => { rifiuta = r; }));

    fireEvent.click(screen.getByRole('button', { name: 'rinomina' }));
    expect(screen.getByText('Pasti: Merenda, Pranzo, Cena')).toBeInTheDocument();
    // La scrittura parte dalla coda, un giro dopo: si rifiuta solo quando è partita.
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledTimes(1));
    rifiuta(new Error('rete'));
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(screen.getByText('Pasti: Colazione, Pranzo, Cena')).toBeInTheDocument();
    expect(leggiSlotDefs).toHaveBeenCalledTimes(2);
    errore.mockRestore();
  });

  // salvaSlotDefs non è atomico: la cancellazione può essere già avvenuta quando la scrittura fallisce.
  it('se il salvataggio dei pasti fallisce dopo la cancellazione, mostra i pasti del server, non la copia locale', async () => {
    mockDati({ pasti: [SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA, { id: 'sd-4', nome: 'Merenda', posizione: 3, assenzeAbituali: ASSENZE }] });
    render(albero());
    await screen.findByText('Pasti: Colazione, Pranzo, Cena, Merenda');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(salvaSlotDefs).mockRejectedValueOnce(new Error('upsert fallito'));
    // Sul server Merenda non c'è più: il delete è passato, l'upsert no.
    vi.mocked(leggiSlotDefs).mockResolvedValue([SLOT_COLAZIONE, SLOT_PRANZO, SLOT_CENA]);

    fireEvent.click(screen.getByRole('button', { name: 'rinomina' }));
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(await screen.findByText('Pasti: Colazione, Pranzo, Cena')).toBeInTheDocument();
    errore.mockRestore();
  });

  it('se falliscono il salvataggio dei pasti e la rilettura, torna all\'ultimo insieme confermato', async () => {
    mockDati();
    render(albero());
    await screen.findByText('Porzioni: 1');
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(salvaSlotDefs).mockRejectedValueOnce(new Error('rete'));
    vi.mocked(leggiSlotDefs).mockRejectedValue(new Error('rete'));

    fireEvent.click(screen.getByRole('button', { name: 'rinomina' }));
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(screen.getByText('Pasti: Colazione, Pranzo, Cena')).toBeInTheDocument();
    expect(errore).toHaveBeenCalledWith('impostazioni: rilettura dei pasti dopo il salvataggio fallito non riuscita.', expect.any(Error));
    errore.mockRestore();
  });

  it('pasti e impostazioni stanno nella stessa coda: la scrittura dei pasti aspetta quella in volo', async () => {
    mockDati();
    render(albero());
    await screen.findByText('Porzioni: 1');
    let confermaImpostazioni: () => void = () => {};
    vi.mocked(salvaImpostazioni).mockReturnValueOnce(new Promise<void>((r) => { confermaImpostazioni = r; }));

    piu();
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'rinomina' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(salvaSlotDefs).not.toHaveBeenCalled();
    confermaImpostazioni();
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledTimes(1));
  });

  it('cancellataIl vale fino alla chiusura del pannello (spec §D)', async () => {
    mockDati();
    const { rerender } = render(albero());
    await screen.findByText('Porzioni: 1');
    expect(screen.getByText('Cancellata: no')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'segna la cancellazione' }));
    expect(screen.getByText('Cancellata: sì')).toBeInTheDocument();
    pannello.aperto = false;
    rerender(albero());
    pannello.aperto = true;
    rerender(albero());
    expect(screen.getByText('Cancellata: no')).toBeInTheDocument();
  });

  it('ricaricaCasa: se la rilettura fallisce vale lo stato di riserva passato', async () => {
    mockDati();
    vi.mocked(statoCasa).mockResolvedValueOnce({ ruolo: 'proprietario', email: ['b@c.it'], id: ['id-b'] });
    render(albero());
    expect(await screen.findByText('Casa: proprietario')).toBeInTheDocument();
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(statoCasa).mockRejectedValueOnce(new Error('rete'));
    fireEvent.click(screen.getByRole('button', { name: 'rileggi la casa' }));
    expect(await screen.findByText('Casa: solo')).toBeInTheDocument();
    errore.mockRestore();
  });
});
```

Run: `npx vitest run src/components/pannello/__tests__/dati-pannello.test.tsx`
Expected: FAIL — `DatiPannello` non esiste.

- [ ] **Step 6: I test del pannello, che falliscono.** Crea
  `src/components/pannello/__tests__/pannello.test.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import type { Impostazioni, MealSlotDef } from '@/domain/types';
import { ORDINE_AREE_DEFAULT } from '@/domain/aree';

const percorso = vi.hoisted(() => ({ valore: '/lista' }));
const push = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  usePathname: () => percorso.valore,
  useRouter: () => ({ push, replace }),
}));

vi.mock('@/data/utente', () => ({
  useUtente: () => ({ nome: 'Andrea', email: 'andrea@example.it' }),
  inizialeDi: (nome: string) => (nome.trim() ? nome.trim()[0].toUpperCase() : '·'),
  leggiUtente: vi.fn(async () => ({ nome: 'Andrea', email: 'andrea@example.it' })),
}));
// MIN_PORZIONI e MAX_PORZIONI: dal Task 7 la cima vera li legge al caricamento del modulo
// (CampoPersone), e un mock senza di loro farebbe lanciare Vitest all'import.
vi.mock('@/data/impostazioni', () => ({
  leggiImpostazioni: vi.fn(), leggiSlotDefs: vi.fn(), salvaImpostazioni: vi.fn(), salvaSlotDefs: vi.fn(),
  pastiDiDefault: vi.fn(() => []), MIN_PORZIONI: 1, MAX_PORZIONI: 4,
}));
vi.mock('@/data/casa', async () => {
  const reale = await vi.importActual<typeof import('@/data/casa')>('@/data/casa');
  return { statoCasa: vi.fn(), dimenticaIdCasa: vi.fn(), eRifiutoRls: reale.eRifiutoRls };
});
vi.mock('@/data/risparmio', () => ({ leggiRisparmioTotale: vi.fn() }));

// Una sotto-schermata col piede fisso, per provare PiedePannello: le vere arrivano coi Task 8–10.
vi.mock('../schermate', async () => {
  const vero = await vi.importActual<typeof import('../schermate')>('../schermate');
  const { PiedePannello } = await vi.importActual<typeof import('../PiedePannello')>('../PiedePannello');
  return {
    ...vero,
    SCHERMATE: {
      ...vero.SCHERMATE,
      aree: {
        titolo: 'Ordine delle aree',
        Componente: () => <PiedePannello><button type="button">SALVA ORDINE</button></PiedePannello>,
      },
    },
  };
});

import { leggiImpostazioni, leggiSlotDefs } from '@/data/impostazioni';
import { statoCasa } from '@/data/casa';
import { leggiRisparmioTotale } from '@/data/risparmio';
import { Testata } from '../../Testata';
import { PannelloProvider, usePannello } from '../PannelloProvider';
import { DatiPannelloProvider } from '../DatiPannello';
import { Pannello } from '../Pannello';

const ASSENZE = [false, false, false, false, false, false, false];
const PASTI: MealSlotDef[] = [
  { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE },
  { id: 'sd-2', nome: 'Pranzo', posizione: 1, assenzeAbituali: ASSENZE },
  { id: 'sd-3', nome: 'Cena', posizione: 2, assenzeAbituali: ASSENZE },
];
const IMPOSTAZIONI: Impostazioni = {
  moltiplicatorePorzioni: 1, ordineAree: [...ORDINE_AREE_DEFAULT], settimaneCiclo: 1, cicloOrigine: null, giorniControllo: 90,
};

const conferma = vi.hoisted(() => vi.fn<() => Promise<void>>());

/** I gesti che nel pannello vero fanno le tessere e le righe (Task 7–10). */
function Comandi() {
  const p = usePannello();
  return (
    <div>
      <button type="button" onClick={() => p.entra('cadenza')}>entra in cadenza</button>
      <button type="button" onClick={() => p.entra('aree')}>entra in aree</button>
      <button
        type="button"
        onClick={() => p.mostraDialogo({
          titolo: 'Uscire da Dispesa?',
          testo: 'I tuoi dati restano. Per rientrare ti mandiamo un link a andrea@example.it.',
          azione: 'ESCI',
          tono: 'primario',
          erroreTesto: 'Non siamo riusciti a farti uscire. Riprova.',
          onConferma: conferma,
        })}
      >
        mostra il dialogo
      </button>
      <button type="button" onClick={() => p.vaiA('/piatti?da=impostazioni', { pathname: '/lista', sotto: 'cima' })}>vai a piatti</button>
    </div>
  );
}

const albero = () => (
  <PannelloProvider>
    <Testata titolo="Lista" />
    <Comandi />
    <DatiPannelloProvider><Pannello /></DatiPannelloProvider>
  </PannelloProvider>
);
const monta = () => render(albero());
const menu = () => screen.getByRole('button', { name: 'Andrea: profilo e impostazioni' });
const pannello = () => document.getElementById('pannello-impostazioni')!;
const tocca = (nome: string) => fireEvent.click(screen.getByRole('button', { name: nome }));
const titolo = () => screen.getByRole('heading', { level: 2 }).textContent;

/** Il gesto indietro del telefono, o il popstate che segue un go(). */
function indietro() {
  act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(leggiImpostazioni).mockResolvedValue({ ...IMPOSTAZIONI });
  vi.mocked(leggiSlotDefs).mockResolvedValue(PASTI);
  vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'solo', email: [], id: [] });
  vi.mocked(leggiRisparmioTotale).mockResolvedValue([]);
  percorso.valore = '/lista';
  window.history.replaceState(null, '', '/lista');
  window.sessionStorage.clear();
  vi.spyOn(window.history, 'pushState');
  vi.spyOn(window.history, 'go').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Pannello: aprire e chiudere (spec §A.2, §B.1)', () => {
  it('è chiuso finché il Menù utente non lo apre; aperto: aria-expanded, --ombra-nav, fuoco al pannello, una voce, e i dati si leggono', () => {
    monta();
    expect(menu()).toHaveAttribute('aria-expanded', 'false');
    expect(menu()).toHaveAttribute('aria-controls', 'pannello-impostazioni');
    expect(screen.queryByRole('dialog', { name: 'Impostazioni' })).not.toBeInTheDocument();
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    expect(leggiImpostazioni).not.toHaveBeenCalled();

    fireEvent.click(menu());
    const dialogo = screen.getByRole('dialog', { name: 'Impostazioni' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAttribute('data-stato', 'aperto');
    expect(dialogo).not.toHaveAttribute('data-istantaneo');
    expect(menu()).toHaveAttribute('aria-expanded', 'true');
    expect(menu().style.boxShadow).toBe('var(--ombra-nav)');
    expect(dialogo).toHaveFocus();
    expect(window.history.pushState).toHaveBeenCalledTimes(1);
    expect(leggiImpostazioni).toHaveBeenCalledTimes(1);
  });

  it('si chiude con la X: un go(-1), e il fuoco torna al Menù utente', () => {
    monta();
    fireEvent.click(menu());
    tocca('Chiudi le impostazioni');
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    expect(screen.queryByRole('dialog', { name: 'Impostazioni' })).not.toBeInTheDocument();
    expect(window.history.go).toHaveBeenCalledWith(-1);
    expect(menu()).toHaveAttribute('aria-expanded', 'false');
    expect(menu()).toHaveFocus();
  });

  it('si chiude col velo e col Menù utente', () => {
    monta();
    fireEvent.click(menu());
    fireEvent.click(document.querySelector('.pannello-velo')!);
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    indietro(); // il popstate del go(-1)

    fireEvent.click(menu());
    expect(pannello()).toHaveAttribute('data-stato', 'aperto');
    fireEvent.click(menu());
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    expect(menu()).toHaveFocus();
  });
});

describe('Pannello: sotto-schermate e dialogo (spec §A.4, §B.1, §B.2, §D)', () => {
  it('entra e torna: la freccia a sinistra al posto della X, e il titolo della sotto-schermata', () => {
    monta();
    fireEvent.click(menu());
    tocca('entra in cadenza');
    expect(titolo()).toBe('Cadenza dei controlli');
    expect(screen.getByRole('dialog', { name: 'Cadenza dei controlli' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chiudi le impostazioni' })).not.toBeInTheDocument();
    expect(window.history.pushState).toHaveBeenCalledTimes(2);

    tocca('Torna alle impostazioni');
    expect(titolo()).toBe('Impostazioni');
    expect(screen.getByRole('button', { name: 'Chiudi le impostazioni' })).toBeInTheDocument();
    expect(window.history.go).toHaveBeenCalledWith(-1);
  });

  it('la sotto-schermata entra da destra, ed esce restando a schermo per la durata dell\'uscita', async () => {
    monta();
    fireEvent.click(menu());
    const corpo = () => pannello().querySelector('.pannello-corpo')!;
    tocca('entra in aree');
    expect(corpo()).toHaveClass('anim-sotto-entra');
    expect(screen.getByRole('button', { name: 'SALVA ORDINE' })).toBeInTheDocument();

    tocca('Torna alle impostazioni');
    expect(corpo()).toHaveClass('anim-sotto-esce');
    expect(screen.getByRole('button', { name: 'SALVA ORDINE' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'SALVA ORDINE' })).not.toBeInTheDocument());
    expect(corpo()).not.toHaveClass('anim-sotto-esce');
  });

  it('PiedePannello porta il primario nel piede fisso, fuori dallo scorrimento; in cima il piede è vuoto', () => {
    monta();
    fireEvent.click(menu());
    expect(pannello().querySelector('.pannello-piede')!.childElementCount).toBe(0);
    tocca('entra in aree');
    const salva = screen.getByRole('button', { name: 'SALVA ORDINE' });
    expect(salva.closest('.pannello-piede')).not.toBeNull();
    expect(salva.closest('.pannello-corpo')).toBeNull();
  });

  it('il gesto indietro scende di un livello: dialogo → sotto-schermata → cima → chiuso, senza go()', () => {
    monta();
    fireEvent.click(menu());
    tocca('entra in cadenza');
    tocca('mostra il dialogo');
    expect(screen.getByRole('alertdialog', { name: 'Uscire da Dispesa?' })).toBeInTheDocument();
    expect(window.history.pushState).toHaveBeenCalledTimes(3);

    indietro();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(titolo()).toBe('Cadenza dei controlli');
    indietro();
    expect(titolo()).toBe('Impostazioni');
    expect(pannello()).toHaveAttribute('data-stato', 'aperto');
    indietro();
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    expect(window.history.go).not.toHaveBeenCalled();
  });

  it('il dialogo: ANNULLA lo chiude; una conferma fallita mostra l\'errore e resta; una riuscita lo chiude', async () => {
    monta();
    fireEvent.click(menu());
    tocca('mostra il dialogo');
    tocca('ANNULLA');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(window.history.go).toHaveBeenLastCalledWith(-1);
    indietro(); // il popstate di quel go(-1)

    conferma.mockRejectedValueOnce(new Error('rete'));
    tocca('mostra il dialogo');
    tocca('ESCI');
    expect(await screen.findByText('Non siamo riusciti a farti uscire. Riprova.')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog', { name: 'Uscire da Dispesa?' })).toBeInTheDocument();

    conferma.mockResolvedValueOnce(undefined);
    tocca('ESCI');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(pannello()).toHaveAttribute('data-stato', 'aperto');
  });
});

describe('Pannello: aprire da un indirizzo (spec §A.3, §A.4)', () => {
  it('?impostazioni=ingredienti apre sulla sotto-schermata senza animazione, toglie il parametro e ripristina lo scorrimento', () => {
    // jsdom non fa layout: qui scrollTop si ricorda e basta, come in un corpo abbastanza lungo.
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      get(this: HTMLElement & { _scroll?: number }) { return this._scroll ?? 0; },
      set(this: HTMLElement & { _scroll?: number }, v: number) { this._scroll = v; },
    });
    try {
      window.history.replaceState(null, '', '/lista?impostazioni=ingredienti');
      window.sessionStorage.setItem('spesa:pannello-scroll:ingredienti', '420');
      monta();
      expect(pannello()).toHaveAttribute('data-stato', 'aperto');
      expect(pannello()).toHaveAttribute('data-istantaneo');
      expect(titolo()).toBe('Ingredienti');
      expect(window.location.pathname + window.location.search).toBe('/lista');
      expect(window.history.pushState).toHaveBeenCalledTimes(2);
      const corpo = pannello().querySelector('.pannello-corpo') as HTMLElement;
      expect(corpo).not.toHaveClass('anim-sotto-entra');
      expect(corpo.scrollTop).toBe(420);
      expect(window.sessionStorage.getItem('spesa:pannello-scroll:ingredienti')).toBeNull();

      // Il limite noto della spec §A.4: il primo indietro porta in cima, il secondo chiude.
      indietro();
      expect(titolo()).toBe('Impostazioni');
      indietro();
      expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    } finally {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollTop;
    }
  });

  it('un valore sconosciuto apre in cima; senza parametro non apre niente', () => {
    const { unmount } = monta();
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    unmount();
    window.history.replaceState(null, '', '/lista?impostazioni=boh');
    monta();
    expect(pannello()).toHaveAttribute('data-stato', 'aperto');
    expect(titolo()).toBe('Impostazioni');
  });

  it('il parametro si rilegge a ogni cambio di pathname', () => {
    percorso.valore = '/piatti';
    window.history.replaceState(null, '', '/piatti');
    const { rerender } = monta();
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');

    window.history.replaceState(null, '', '/dispensa?impostazioni=cima');
    percorso.valore = '/dispensa';
    rerender(albero());
    expect(pannello()).toHaveAttribute('data-stato', 'aperto');
    expect(window.location.pathname + window.location.search).toBe('/dispensa');
  });
});

describe('Pannello: lasciarlo per una pagina piena (spec §A.5)', () => {
  // Ramo A: la sonda del Task 2 dice «regge». Col ramo B tieni l'altro test e cancella questo.
  it('vaiA salva l\'origine, chiude, e naviga solo al popstate che consuma le voci', () => {
    monta();
    fireEvent.click(menu());
    tocca('vai a piatti');
    expect(JSON.parse(window.sessionStorage.getItem('spesa:origine-pannello')!)).toEqual({ pathname: '/lista', sotto: 'cima' });
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    expect(window.history.go).toHaveBeenCalledWith(-1);
    expect(push).not.toHaveBeenCalled();

    indietro(); // il popstate del go(-1)
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/piatti?da=impostazioni');
  });

  // Ramo B: la sonda del Task 2 dice «non regge». Col ramo A cancella questo test.
  it('vaiA (ripiego) salva l\'origine, chiude senza go(), e naviga con replace', () => {
    monta();
    fireEvent.click(menu());
    tocca('vai a piatti');
    expect(JSON.parse(window.sessionStorage.getItem('spesa:origine-pannello')!)).toEqual({ pathname: '/lista', sotto: 'cima' });
    expect(pannello()).toHaveAttribute('data-stato', 'chiuso');
    expect(window.history.go).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/piatti?da=impostazioni');
    expect(push).not.toHaveBeenCalled();
  });
});

describe('Pannello: stati dei dati (spec §B.5)', () => {
  it('CARICO… con role status finché i dati non arrivano', () => {
    vi.mocked(leggiImpostazioni).mockReturnValue(new Promise(() => {}));
    monta();
    fireEvent.click(menu());
    expect(screen.getByRole('status')).toHaveTextContent('CARICO…');
  });

  it('se il caricamento fallisce: l\'errore con RIPROVA, che rilegge', async () => {
    vi.mocked(leggiImpostazioni).mockRejectedValueOnce(new Error('rete'));
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    monta();
    fireEvent.click(menu());
    expect(await screen.findByText('Non riusciamo a caricare le impostazioni. Controlla la connessione e tocca RIPROVA.')).toBeInTheDocument();

    tocca('RIPROVA');
    expect(screen.getByRole('status')).toHaveTextContent('CARICO…');
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.queryByText(/Non riusciamo a caricare le impostazioni/)).not.toBeInTheDocument();
    expect(leggiImpostazioni).toHaveBeenCalledTimes(2);
    errore.mockRestore();
  });
});
```

Run: `npx vitest run src/components/pannello/__tests__/pannello.test.tsx`
Expected: FAIL — i moduli del pannello non esistono.

- [ ] **Step 7: `PannelloProvider.tsx`.** Crea `src/components/pannello/PannelloProvider.tsx`:

```tsx
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useIndietroFogli } from '@/components/useIndietroFogli';
import type { PropsDialogo } from '@/components/DialogoConferma';
import type { DestinazionePannello, SottoSchermata } from './tipi';
import { leggiDestinazione, prendiScrollPannello, salvaOrigine, type OriginePannello } from './indirizzi';

export interface ContestoPannello {
  aperto: boolean;
  sotto: SottoSchermata | null;
  /** Con l'animazione di §B.2. Senza argomento, in cima. */
  apri(dest?: DestinazionePannello): void;
  chiudi(): void;
  entra(s: SottoSchermata): void;
  torna(): void;
  /** `onConferma` avvolta: se riesce, il dialogo si chiude. */
  mostraDialogo(d: PropsDialogo): void;
  chiudiDialogo(): void;
  /** Salva l'origine, chiude tutto, poi naviga (spec §A.5). */
  vaiA(href: string, origine: OriginePannello): void;
}

/** Quello che serve solo al contenitore (`Pannello`) e al `Guscio`. */
export interface ContestoPannelloInterno {
  dialogo: PropsDialogo | null;
  /** L'apertura viene da `?impostazioni=`: niente animazione (spec §A.3). */
  istantaneo: boolean;
  /** L'altezza del corpo da rimettere, letta da sessionStorage all'apertura da indirizzo. */
  scroll: number | null;
  scrollUsato(): void;
}

interface Stato {
  aperto: boolean;
  sotto: SottoSchermata | null;
  dialogo: PropsDialogo | null;
  istantaneo: boolean;
  scroll: number | null;
}

const CHIUSO: Stato = { aperto: false, sotto: null, dialogo: null, istantaneo: false, scroll: null };

/**
 * Fuori dal provider (i test di una pagina montano la Testata senza Guscio) il pannello è
 * inerte: il Menù utente c'è e non apre niente.
 */
const INERTE: ContestoPannello = {
  aperto: false, sotto: null,
  apri() {}, chiudi() {}, entra() {}, torna() {}, mostraDialogo() {}, chiudiDialogo() {}, vaiA() {},
};
const INERTE_INTERNO: ContestoPannelloInterno = { dialogo: null, istantaneo: false, scroll: null, scrollUsato() {} };

const Contesto = createContext<ContestoPannello>(INERTE);
const ContestoInterno = createContext<ContestoPannelloInterno>(INERTE_INTERNO);

/** Pannello chiuso 0; in cima 1; in una sotto-schermata 2; un dialogo sopra aggiunge 1 (spec §A.4). */
function profondita(s: Stato): number {
  if (!s.aperto) return 0;
  return (s.sotto ? 2 : 1) + (s.dialogo ? 1 : 0);
}

/**
 * Lo stato del Pannello impostazioni (spec §A.1): aperto, la sotto-schermata, il dialogo. Vive
 * nel Guscio, così il pannello si apre sopra qualunque pagina e ci resta durante le sue
 * transizioni.
 *
 * Il gesto indietro passa da `useIndietroFogli`: una voce di cronologia per livello, e un
 * `popstate` non atteso scende di un livello (dialogo → sotto-schermata → cima → chiuso). I
 * tasti (X, velo, freccia, ANNULLA, conferme) cambiano solo lo stato: è l'hook a consumare le
 * voci.
 *
 * `?impostazioni=` (spec §A.3) si legge al montaggio e a ogni cambio di pathname, da
 * `window.location.search` (niente `useSearchParams`, niente `Suspense`: come `?torna=`
 * nell'editor). Il parametro si toglie con `history.replaceState` **prima** di aprire, così le
 * voci che l'hook mette dopo nascono sull'indirizzo pulito e un indietro non lo ritrova
 * (misura B della sonda del Task 2).
 */
export function PannelloProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [stato, setStato] = useState<Stato>(CHIUSO);

  const chiudiUltimo = useCallback(() => {
    setStato((s) => {
      if (!s.aperto) return s;
      if (s.dialogo) return { ...s, dialogo: null };
      if (s.sotto) return { ...s, sotto: null, istantaneo: false, scroll: null };
      return CHIUSO;
    });
  }, []);

  const { chiudiTuttoPoi } = useIndietroFogli(profondita(stato), chiudiUltimo);

  useEffect(() => {
    const dest = leggiDestinazione(window.location.search);
    if (dest === null) return;
    window.history.replaceState(null, '', pathname);
    const scroll = prendiScrollPannello(dest);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStato({ aperto: true, sotto: dest === 'cima' ? null : dest, dialogo: null, istantaneo: true, scroll });
  }, [pathname]);

  const apri = useCallback((dest: DestinazionePannello = 'cima') => {
    setStato({ aperto: true, sotto: dest === 'cima' ? null : dest, dialogo: null, istantaneo: false, scroll: null });
  }, []);

  const chiudi = useCallback(() => setStato(CHIUSO), []);

  const entra = useCallback((s: SottoSchermata) => {
    setStato((p) => (p.aperto ? { ...p, sotto: s, dialogo: null, istantaneo: false, scroll: null } : p));
  }, []);

  const torna = useCallback(() => {
    setStato((p) => ({ ...p, sotto: null, dialogo: null, istantaneo: false, scroll: null }));
  }, []);

  const chiudiDialogo = useCallback(() => {
    setStato((p) => (p.dialogo ? { ...p, dialogo: null } : p));
  }, []);

  const mostraDialogo = useCallback((d: PropsDialogo) => {
    const avvolto: PropsDialogo = {
      ...d,
      onConferma: async () => {
        await d.onConferma();
        chiudiDialogo();
      },
    };
    setStato((p) => (p.aperto ? { ...p, dialogo: avvolto } : p));
  }, [chiudiDialogo]);

  // Ramo A (la sonda del Task 2 regge): prima si chiude, poi si naviga, al popstate che
  // conclude il go(-n) dell'hook. Navigare subito farebbe correre insieme go e push.
  const vaiA = useCallback((href: string, origine: OriginePannello) => {
    salvaOrigine(origine);
    chiudiTuttoPoi(() => router.push(href));
    setStato(CHIUSO);
  }, [chiudiTuttoPoi, router]);

  const scrollUsato = useCallback(() => {
    setStato((p) => (p.scroll === null ? p : { ...p, scroll: null }));
  }, []);

  const valore = useMemo<ContestoPannello>(() => ({
    aperto: stato.aperto, sotto: stato.sotto, apri, chiudi, entra, torna, mostraDialogo, chiudiDialogo, vaiA,
  }), [stato.aperto, stato.sotto, apri, chiudi, entra, torna, mostraDialogo, chiudiDialogo, vaiA]);

  const interno = useMemo<ContestoPannelloInterno>(() => ({
    dialogo: stato.dialogo, istantaneo: stato.istantaneo, scroll: stato.scroll, scrollUsato,
  }), [stato.dialogo, stato.istantaneo, stato.scroll, scrollUsato]);

  return (
    <Contesto.Provider value={valore}>
      <ContestoInterno.Provider value={interno}>{children}</ContestoInterno.Provider>
    </Contesto.Provider>
  );
}

export function usePannello(): ContestoPannello {
  return useContext(Contesto);
}

export function usePannelloInterno(): ContestoPannelloInterno {
  return useContext(ContestoInterno);
}
```

  **Ramo B** (la sonda dice «non regge»): sostituisci la riga
  `const { chiudiTuttoPoi } = useIndietroFogli(profondita(stato), chiudiUltimo);` con
  `const { lasciaVoci } = useIndietroFogli(profondita(stato), chiudiUltimo);`, e la funzione
  `vaiA` col suo commento con:

```tsx
  // Ramo B (la sonda del Task 2 non regge, spec §A.5 ripiego): le voci del pannello restano
  // orfane sotto la pagina nuova, come accettato in fase 3, e la pagina nuova prende il posto
  // della voce in cima con replace.
  const vaiA = useCallback((href: string, origine: OriginePannello) => {
    salvaOrigine(origine);
    lasciaVoci();
    setStato(CHIUSO);
    router.replace(href);
  }, [lasciaVoci, router]);
```

  e nel test tieni `vaiA (ripiego)…`, cancellando l'altro dei due.

- [ ] **Step 8: `DatiPannello.tsx`.** Crea `src/components/pannello/DatiPannello.tsx` (i
  commenti sulla coda e sul rollback sono quelli di `impostazioni/page.tsx`, accorciati; la
  logica è la stessa):

```tsx
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Impostazioni, MealSlotDef } from '@/domain/types';
import {
  leggiImpostazioni, leggiSlotDefs, pastiDiDefault,
  salvaImpostazioni as scriviImpostazioni, salvaSlotDefs,
} from '@/data/impostazioni';
import { dimenticaIdCasa, eRifiutoRls, statoCasa, type StatoCasa } from '@/data/casa';
import { leggiRisparmioTotale } from '@/data/risparmio';
import { riassumiEvitato, type RiassuntoEvitato } from '@/domain/risparmio';
import { leggiUtente } from '@/data/utente';
import { MessaggioErrore, STILE_PILLOLA } from '@/components/controlli';
import { usePannello } from './PannelloProvider';

export interface DatiPannello {
  /**
   * Le impostazioni per intero: `salvaImpostazioni` riscrive la riga tutta, quindi quello che
   * non si tiene qui si perde al primo salvataggio.
   */
  impostazioni: Impostazioni;
  slotDefs: MealSlotDef[];
  /** null se la lettura della casa fallisce (spec §C.7, frame 26): la tessera non mostra il valore. */
  casa: StatoCasa | null;
  /** null se il risparmio non si legge: la nota di §C.11 non c'è. */
  risparmio: RiassuntoEvitato | null;
  utente: { nome: string; email: string };
}

export type StatoDati = { stato: 'carico' } | { stato: 'errore' } | { stato: 'pronto'; dati: DatiPannello };

interface ValoreDati {
  stato: StatoDati;
  ricarica(): void;
  salvaImpostazioni(parziale: Partial<Impostazioni>): Promise<boolean>;
  salvaPasti(defs: MealSlotDef[]): Promise<boolean>;
  /** Vero dopo un rifiuto RLS, fino al prossimo salvataggio; si spegne anche a ogni apertura. */
  casaCambiata: boolean;
  /** Rilegge la casa. Non rigetta: se la rilettura fallisce e c'è `seFallisce`, vale quello. */
  ricaricaCasa(seFallisce?: StatoCasa): Promise<void>;
  /** Quando è riuscita Cancella la dispensa (spec §D): null a ogni chiusura del pannello. */
  cancellataIl: Date | null;
  segnaCancellata(quando: Date): void;
}

const Contesto = createContext<ValoreDati | null>(null);

/**
 * Impostazioni e pasti sono il nucleo: se non arrivano, il pannello mostra l'errore. Un utente
 * mai passato da seed.sql non ha pasti: si seminano i quattro di default e si salvano davvero,
 * altrimenti il primo AGGIUNGI PASTO produrrebbe una riga sola, sotto il minimo di 3.
 */
async function leggiNucleo(): Promise<Pick<DatiPannello, 'impostazioni' | 'slotDefs'>> {
  const [impostazioni, letti] = await Promise.all([leggiImpostazioni(), leggiSlotDefs()]);
  const slotDefs = letti.length > 0 ? letti : pastiDiDefault();
  if (letti.length === 0) await salvaSlotDefs(slotDefs);
  return { impostazioni, slotDefs };
}

/** La casa e il risparmio a parte: se falliscono, il resto del pannello resta usabile. */
async function leggiTutto(): Promise<DatiPannello> {
  const [nucleo, casa, risparmio, utente] = await Promise.all([
    leggiNucleo(),
    statoCasa().catch((errore: unknown) => {
      console.error('impostazioni: lettura della casa fallita.', errore);
      return null;
    }),
    leggiRisparmioTotale().then(riassumiEvitato).catch((errore: unknown) => {
      console.error('impostazioni: lettura del risparmio fallita.', errore);
      return null;
    }),
    leggiUtente(),
  ]);
  return { ...nucleo, casa, risparmio, utente };
}

/**
 * I dati del pannello (spec §B.5), uno per tutto il pannello. Si leggono all'apertura: la
 * prima volta con `CARICO…`, le volte dopo in silenzio sopra i dati che ci sono.
 *
 * Le scritture sono quelle della pagina delle Impostazioni di prima della fase 5, spostate qui:
 * - **ottimistiche con rollback.** Il valore nuovo va a schermo subito; se la scrittura
 *   fallisce, il valore a cui tornare si rilegge dal server; l'ultimo valore confermato vale
 *   solo se anche la rilettura fallisce;
 * - **in fila** (`coda`, review dell'11/09): ogni scrittura aspetta la precedente, così il
 *   rollback rilegge dopo tutte le scritture già partite, e l'ordine di arrivo al server è
 *   quello dei gesti. Dalla fase 5 la fila vale anche per i pasti (spec §L);
 * - **solo l'ultima richiesta tocca lo schermo**: una rilettura o un errore di una richiesta
 *   superata si ignorano, la più recente dirà l'ultima parola;
 * - **il rifiuto RLS** (la casa è cambiata sotto i piedi, prova del 15/09): si scarta l'id
 *   della casa, si chiude l'eventuale dialogo, si ricarica tutto e `casaCambiata` lo dice. La
 *   scrittura non si riprova da sola: era un gesto su dati che l'utente deve prima rivedere.
 *
 * `salvaImpostazioni` e `salvaPasti` tornano `false` solo quando la riga deve mostrare
 * `Non siamo riusciti a salvare. Riprova.`; una richiesta superata o un rifiuto RLS tornano
 * `true`. `casaCambiata` vale fino al prossimo salvataggio e si spegne a ogni apertura.
 *
 * `salvaSlotDefs` non è atomico (prima cancella i pasti tolti, poi scrive gli altri): se una
 * scrittura dei pasti fallisce, i pasti a cui tornare si rileggono dal server, non dalla copia
 * locale, che potrebbe avere un pasto già cancellato.
 *
 * `cancellataIl` (spec §D) vive qui e non nella cima: la nota della riga deve durare fino alla
 * chiusura del pannello anche se la cima si smonta.
 */
export function DatiPannelloProvider({ children }: { children: ReactNode }) {
  const { aperto, chiudiDialogo } = usePannello();
  const [stato, setStato] = useState<StatoDati>({ stato: 'carico' });
  const [casaCambiata, setCasaCambiata] = useState(false);
  const [cancellataIl, setCancellataIl] = useState<Date | null>(null);
  // «Fino alla chiusura del pannello» (spec §D): aggiustato durante il render, non in un effetto.
  const [apertoVisto, setApertoVisto] = useState(aperto);
  if (aperto !== apertoVisto) {
    setApertoVisto(aperto);
    if (!aperto) setCancellataIl(null);
  }
  // Lo specchio dello stato pronto: i gesti partono da qui, non da una chiusura vecchia.
  const dati = useRef<DatiPannello | null>(null);
  // L'ultimo stato confermato dal server: il valore a cui tornare se una scrittura fallisce.
  const impostazioniSalvate = useRef<Impostazioni | null>(null);
  const pastiSalvati = useRef<MealSlotDef[]>([]);
  const richiestaImpostazioni = useRef(0);
  const richiestaPasti = useRef(0);
  // La fila delle scritture. Non si rompe mai: un errore si ferma nel catch di chi l'ha fatto.
  const coda = useRef<Promise<void>>(Promise.resolve());
  // Ogni lettura ha un numero: una lettura superata non tocca lo schermo.
  const lettura = useRef(0);

  const metti = useCallback((d: DatiPannello) => {
    dati.current = d;
    setStato({ stato: 'pronto', dati: d });
  }, []);

  const aggiorna = useCallback((f: (d: DatiPannello) => DatiPannello) => {
    if (dati.current) metti(f(dati.current));
  }, [metti]);

  const carica = useCallback(async (silenziosa: boolean) => {
    const n = ++lettura.current;
    if (!silenziosa) setStato({ stato: 'carico' });
    try {
      const letti = await leggiTutto();
      if (n !== lettura.current) return;
      impostazioniSalvate.current = letti.impostazioni;
      pastiSalvati.current = letti.slotDefs;
      metti(letti);
    } catch (errore) {
      console.error('impostazioni: caricamento fallito.', errore);
      if (n !== lettura.current) return;
      if (silenziosa && dati.current) return;
      dati.current = null;
      setStato({ stato: 'errore' });
    }
  }, [metti]);

  useEffect(() => {
    if (!aperto) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCasaCambiata(false);
    void carica(dati.current !== null);
  }, [aperto, carica]);

  /** La casa è cambiata: memoria dell'id scartata, dialogo chiuso, tutto riletto. */
  const dopoRifiutoRls = useCallback(async () => {
    dimenticaIdCasa();
    chiudiDialogo();
    await carica(true);
  }, [carica, chiudiDialogo]);

  const salvaImpostazioni = useCallback(async (parziale: Partial<Impostazioni>): Promise<boolean> => {
    const attuali = dati.current;
    if (!attuali) return false;
    setCasaCambiata(false);
    const n = ++richiestaImpostazioni.current;
    const eUltima = () => n === richiestaImpostazioni.current;
    const nuove = { ...attuali.impostazioni, ...parziale };
    aggiorna((d) => ({ ...d, impostazioni: nuove }));
    const scrittura = coda.current.then(() => scriviImpostazioni(nuove));
    coda.current = scrittura.then(() => undefined, () => undefined);
    try {
      await scrittura;
      // salvaImpostazioni àncora da sé l'origine del ciclo: si rilegge sempre.
      const rilette = await leggiImpostazioni();
      if (!eUltima()) return true;
      impostazioniSalvate.current = rilette;
      aggiorna((d) => ({ ...d, impostazioni: rilette }));
      return true;
    } catch (errore) {
      console.error('impostazioni: salvataggio delle impostazioni fallito.', errore);
      if (!eUltima()) return true;
      if (eRifiutoRls(errore)) {
        await dopoRifiutoRls();
        if (eUltima()) setCasaCambiata(true);
        return true;
      }
      // Il valore a cui tornare si rilegge dal server: con due gesti veloci la prima scrittura
      // può essere atterrata senza che la sua rilettura (superata) l'abbia registrata.
      let salvate = impostazioniSalvate.current;
      try {
        salvate = await leggiImpostazioni();
        if (!eUltima()) return true;
        impostazioniSalvate.current = salvate;
      } catch (erroreRilettura) {
        console.error('impostazioni: rilettura dopo il salvataggio fallito non riuscita.', erroreRilettura);
        if (!eUltima()) return true;
      }
      if (salvate) {
        const tornate = salvate;
        aggiorna((d) => ({ ...d, impostazioni: tornate }));
      }
      return false;
    }
  }, [aggiorna, dopoRifiutoRls]);

  const salvaPasti = useCallback(async (nuovi: MealSlotDef[]): Promise<boolean> => {
    if (!dati.current) return false;
    setCasaCambiata(false);
    const n = ++richiestaPasti.current;
    const eUltima = () => n === richiestaPasti.current;
    aggiorna((d) => ({ ...d, slotDefs: nuovi }));
    const scrittura = coda.current.then(() => salvaSlotDefs(nuovi));
    coda.current = scrittura.then(() => undefined, () => undefined);
    try {
      await scrittura;
      pastiSalvati.current = nuovi;
      return true;
    } catch (errore) {
      console.error('impostazioni: salvataggio dei pasti fallito.', errore);
      if (!eUltima()) return true;
      if (eRifiutoRls(errore)) {
        await dopoRifiutoRls();
        if (eUltima()) setCasaCambiata(true);
        return true;
      }
      // salvaSlotDefs non è atomico: la cancellazione dei pasti tolti può essere già avvenuta.
      // Il valore a cui tornare si rilegge dal server; la copia locale solo se anche la
      // rilettura fallisce (decisione del 26/09).
      let salvati = pastiSalvati.current;
      try {
        salvati = await leggiSlotDefs();
        if (!eUltima()) return true;
        pastiSalvati.current = salvati;
      } catch (erroreRilettura) {
        console.error('impostazioni: rilettura dei pasti dopo il salvataggio fallito non riuscita.', erroreRilettura);
        if (!eUltima()) return true;
      }
      const tornati = salvati;
      aggiorna((d) => ({ ...d, slotDefs: tornati }));
      return false;
    }
  }, [aggiorna, dopoRifiutoRls]);

  const ricarica = useCallback(() => {
    setCasaCambiata(false);
    void carica(false);
  }, [carica]);

  const ricaricaCasa = useCallback(async (seFallisce?: StatoCasa) => {
    try {
      const casa = await statoCasa();
      aggiorna((d) => ({ ...d, casa }));
    } catch (errore) {
      console.error('impostazioni: rilettura della casa fallita.', errore);
      if (seFallisce) aggiorna((d) => ({ ...d, casa: seFallisce }));
    }
  }, [aggiorna]);

  const segnaCancellata = useCallback((quando: Date) => setCancellataIl(quando), []);

  const valore = useMemo<ValoreDati>(() => ({
    stato, ricarica, salvaImpostazioni, salvaPasti, casaCambiata, ricaricaCasa, cancellataIl, segnaCancellata,
  }), [stato, ricarica, salvaImpostazioni, salvaPasti, casaCambiata, ricaricaCasa, cancellataIl, segnaCancellata]);

  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

export function useDatiPannello(): ValoreDati {
  const valore = useContext(Contesto);
  if (valore === null) throw new Error('useDatiPannello va usato dentro DatiPannelloProvider');
  return valore;
}

/**
 * Gli stati dei dati al posto dei blocchi (spec §B.5, frame 23 e 24): `CARICO…` in mono `--sec`
 * con `role="status"`, oppure un Blocco con l'errore e la pillola `RIPROVA`, che rilegge.
 * Pronti, i figli. Lo usano la cima (Task 7) e le sotto-schermate che vivono dei dati del
 * pannello.
 */
export function StatoDatiPannello({ children }: { children: (dati: DatiPannello) => ReactNode }) {
  const { stato, ricarica } = useDatiPannello();
  if (stato.stato === 'carico') {
    return (
      <p
        role="status"
        style={{ margin: 0, padding: '8px 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--sec)' }}
      >
        CARICO…
      </p>
    );
  }
  if (stato.stato === 'errore') {
    return (
      <section
        style={{
          background: 'var(--superficie)', border: '1px solid var(--bordo)', borderRadius: 18,
          padding: '16px 12px 12px', display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <MessaggioErrore ruolo="alert">
          Non riusciamo a caricare le impostazioni. Controlla la connessione e tocca RIPROVA.
        </MessaggioErrore>
        <button
          type="button"
          onClick={ricarica}
          style={{ ...STILE_PILLOLA, alignSelf: 'flex-start', background: 'var(--superficie)', color: 'var(--ink)', border: '1px solid rgba(20,22,58,0.09)' }}
        >
          RIPROVA
        </button>
      </section>
    );
  }
  return <>{children(stato.dati)}</>;
}
```

  Se il lint segnala `react-hooks/set-state-in-effect` anche sulla riga `void carica(…)`
  (`carica` imposta lo stato in modo sincrono quando non è silenziosa), sposta il commento
  `eslint-disable-next-line` su quella riga e mettine un secondo sopra `setCasaCambiata`: è lo
  stesso caso delle tre righe già disabilitate nel repo.

- [ ] **Step 9: `PiedePannello.tsx`, `schermate.tsx`, `Pannello.tsx`.** Crea
  `src/components/pannello/PiedePannello.tsx`:

```tsx
'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const SlotPiede = createContext<HTMLElement | null>(null);

/** Il Pannello pubblica il nodo del suo piede fisso; fuori dal pannello il nodo non c'è. */
export function SlotPiedeProvider({ slot, children }: { slot: HTMLElement | null; children: ReactNode }) {
  return <SlotPiede.Provider value={slot}>{children}</SlotPiede.Provider>;
}

/**
 * Il piede fisso del pannello (spec §B.1, §C.9): il primario di Ordine delle aree, Esporta e
 * Casa, fuori dallo scorrimento, sopra un filetto. Un portale nel nodo del Pannello, come il
 * Dock nello slot del Guscio: la sotto-schermata lo scrive dove le serve, e lui va in fondo. Il
 * piede si vede solo finché qualcuno ci monta dentro (`.pannello-piede:empty`).
 */
export function PiedePannello({ children }: { children: ReactNode }) {
  const slot = useContext(SlotPiede);
  if (slot === null) return null;
  return createPortal(children, slot);
}
```

  Crea `src/components/pannello/schermate.tsx`:

```tsx
'use client';

import type { ComponentType } from 'react';
import type { SottoSchermata } from './tipi';
import { StatoDatiPannello } from './DatiPannello';

/** Il contenuto di una sotto-schermata prima del suo task: niente. I Task 8–10 lo sostituiscono. */
function SottoSchermataVuota() {
  return null;
}

/** La cima prima del Task 7: solo gli stati dei dati, e un contenitore vuoto per i blocchi. */
function CimaStati() {
  return <StatoDatiPannello>{() => <div className="pannello-cima" />}</StatoDatiPannello>;
}

/** Il contenuto della cima. Il Task 7 mette qui `Cima`. */
export const CIMA: ComponentType = CimaStati;

/** Titolo (spec §C, §I) e contenuto di ogni sotto-schermata. */
export const SCHERMATE: Record<SottoSchermata, { titolo: string; Componente: ComponentType }> = {
  'pasti-a-casa': { titolo: 'Pasti a casa', Componente: SottoSchermataVuota },
  'gestione-pasti': { titolo: 'Gestione dei pasti', Componente: SottoSchermataVuota },
  rotazione: { titolo: 'Rotazione del piano', Componente: SottoSchermataVuota },
  ingredienti: { titolo: 'Ingredienti', Componente: SottoSchermataVuota },
  aree: { titolo: 'Ordine delle aree', Componente: SottoSchermataVuota },
  cadenza: { titolo: 'Cadenza dei controlli', Componente: SottoSchermataVuota },
  casa: { titolo: 'Casa condivisa', Componente: SottoSchermataVuota },
  esporta: { titolo: 'Esporta i tuoi dati', Componente: SottoSchermataVuota },
};
```

  Crea `src/components/pannello/Pannello.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FoglioDalBasso } from '@/components/FoglioDalBasso';
import { DialogoConferma } from '@/components/DialogoConferma';
import { usePannello, usePannelloInterno } from './PannelloProvider';
import { SlotPiedeProvider } from './PiedePannello';
import { CIMA, SCHERMATE } from './schermate';
import { ID_MENU_UTENTE, ID_PANNELLO, ID_TITOLO_PANNELLO, type SottoSchermata } from './tipi';

/** Quanto resta a schermo una sotto-schermata che esce: la durata di `.anim-sotto-esce` (spec §B.2). */
export const DURATA_USCITA_MS = 200;

/** Per quanto si prova a rimettere lo scorrimento salvato mentre il contenuto arriva (spec §A.3). */
const ATTESA_SCROLL_MS = 3000;

const FRECCIA = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CROCE = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" />
  </svg>
);

/** Il tondo 44 su 0,07 della testata del pannello: la X in cima, la freccia in una sotto-schermata. */
function TondoTestata({ etichetta, onClick, children }: { etichetta: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={etichetta}
      onClick={onClick}
      style={{
        width: 44, height: 44, flex: 'none', borderRadius: 999, background: 'var(--barra-attiva)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

/**
 * Il Pannello impostazioni (spec §B.1, §B.2): velo, contenitore a tutta larghezza da `top 76`,
 * testata fissa, corpo che scorre, piede fisso per i tre primari, e il Dialogo di conferma
 * sopra, a z 80. È sempre nel DOM: chiuso sta a `visibility: hidden`, `inert` e `aria-hidden`,
 * così la chiusura può scendere animata. Il movimento è tutto nel CSS (`data-stato`,
 * `data-istantaneo`, `.anim-sotto-*` in globals.css).
 *
 * Il contenuto della cima si monta alla prima apertura e resta; quello di una sotto-schermata
 * si smonta quando si esce, dopo i 200 ms dell'uscita verso destra. Il titolo e i tondi
 * seguono subito la sotto-schermata di stato; il corpo segue quella «mostrata», che all'uscita
 * resta a schermo per la durata dell'animazione.
 */
export function Pannello() {
  const { aperto, sotto, chiudi, torna, chiudiDialogo } = usePannello();
  const { dialogo, istantaneo, scroll, scrollUsato } = usePannelloInterno();

  // Aggiustati durante il render, come la barra nel Guscio: niente effetti per stato derivato.
  const [mostrata, setMostrata] = useState<SottoSchermata | null>(sotto);
  if (sotto !== null && sotto !== mostrata) setMostrata(sotto);
  const uscente = sotto === null && mostrata !== null;
  const [giaAperto, setGiaAperto] = useState(aperto);
  if (aperto && !giaAperto) setGiaAperto(true);

  const [piede, setPiede] = useState<HTMLDivElement | null>(null);
  const pannelloRef = useRef<HTMLDivElement>(null);
  const corpoRef = useRef<HTMLDivElement>(null);
  const eraAperto = useRef(false);
  const eraDialogo = useRef(false);

  useEffect(() => {
    if (!uscente) return;
    const t = setTimeout(() => setMostrata(null), DURATA_USCITA_MS);
    return () => clearTimeout(t);
  }, [uscente]);

  // Il fuoco: al pannello quando si apre, al Menù utente quando si chiude (spec §A.2).
  useEffect(() => {
    if (aperto) {
      eraAperto.current = true;
      pannelloRef.current?.focus({ preventScroll: true });
      return;
    }
    if (!eraAperto.current) return;
    eraAperto.current = false;
    document.getElementById(ID_MENU_UTENTE)?.focus({ preventScroll: true });
  }, [aperto]);

  // Chiuso il dialogo, il fuoco torna al pannello: FoglioDalBasso l'aveva preso per sé.
  const conDialogo = dialogo !== null;
  useEffect(() => {
    if (conDialogo) {
      eraDialogo.current = true;
      return;
    }
    if (!eraDialogo.current) return;
    eraDialogo.current = false;
    if (aperto) pannelloRef.current?.focus({ preventScroll: true });
  }, [conDialogo, aperto]);

  // Lo scorrimento salvato (spec §A.3: gli Ingredienti al ritorno dall'editor). Il contenuto
  // può arrivare dopo l'apertura (una sotto-schermata che legge i suoi dati): si riprova a ogni
  // cambio del corpo finché il valore tiene, per ATTESA_SCROLL_MS al più.
  useEffect(() => {
    if (scroll === null) return;
    const corpo = corpoRef.current;
    if (!corpo) return;
    let finito = false;
    const osservatore = new MutationObserver(() => prova());
    const timer = setTimeout(() => smetti(), ATTESA_SCROLL_MS);
    function smetti() {
      if (finito) return;
      finito = true;
      osservatore.disconnect();
      clearTimeout(timer);
      scrollUsato();
    }
    function prova() {
      if (finito || corpo === null) return;
      corpo.scrollTop = scroll ?? 0;
      if (Math.abs(corpo.scrollTop - (scroll ?? 0)) <= 1) smetti();
    }
    osservatore.observe(corpo, { childList: true, subtree: true });
    prova();
    return () => {
      finito = true;
      osservatore.disconnect();
      clearTimeout(timer);
    };
  }, [scroll, mostrata, scrollUsato]);

  const titolo = sotto !== null ? SCHERMATE[sotto].titolo : 'Impostazioni';
  const Contenuto = mostrata !== null ? SCHERMATE[mostrata].Componente : CIMA;
  let classeCorpo = '';
  if (uscente) classeCorpo = aperto ? ' anim-sotto-esce' : '';
  else if (mostrata !== null && !istantaneo) classeCorpo = ' anim-sotto-entra';
  const statoAttr = aperto ? 'aperto' : 'chiuso';
  const istantaneoAttr = istantaneo ? '' : undefined;

  return (
    <SlotPiedeProvider slot={piede}>
      <div
        className="pannello-velo"
        data-stato={statoAttr}
        data-istantaneo={istantaneoAttr}
        aria-hidden="true"
        onClick={chiudi}
      />
      <div
        ref={pannelloRef}
        id={ID_PANNELLO}
        className="pannello"
        role="dialog"
        aria-modal="true"
        aria-labelledby={ID_TITOLO_PANNELLO}
        aria-hidden={aperto ? undefined : true}
        inert={!aperto}
        tabIndex={-1}
        data-stato={statoAttr}
        data-istantaneo={istantaneoAttr}
      >
        <div className="pannello-testata">
          {sotto !== null && <TondoTestata etichetta="Torna alle impostazioni" onClick={torna}>{FRECCIA}</TondoTestata>}
          <h2
            id={ID_TITOLO_PANNELLO}
            style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 32, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.05, color: 'var(--ink)' }}
          >
            {titolo}
          </h2>
          {sotto === null && <TondoTestata etichetta="Chiudi le impostazioni" onClick={chiudi}>{CROCE}</TondoTestata>}
        </div>
        <div key={mostrata ?? 'cima'} ref={corpoRef} className={`pannello-corpo sc${classeCorpo}`}>
          {giaAperto && <Contenuto />}
        </div>
        <div className="pannello-piede" ref={setPiede} />
      </div>
      {dialogo !== null && (
        <FoglioDalBasso
          etichetta={dialogo.titolo}
          onChiudi={chiudiDialogo}
          altezza="contenuto"
          ruolo="alertdialog"
          chiudiDalVelo={false}
          livello={3}
        >
          <DialogoConferma {...dialogo} onAnnulla={chiudiDialogo} />
        </FoglioDalBasso>
      )}
    </SlotPiedeProvider>
  );
}
```

- [ ] **Step 10: Verifica i test del pannello.**

Run: `npx vitest run src/components/pannello`
Expected: PASS (col test di `vaiA` del ramo scelto; l'altro è cancellato). Se il test
«entra… esce restando a schermo» è instabile col `waitFor` di 1 s, alza il suo `timeout` a
2000: l'uscita dura 200 ms.

- [ ] **Step 11: Guscio, Testata e i loro test.**
  1. In `src/components/__tests__/testata.test.tsx` sostituisci le righe da
     `vi.mock('@/data/utente'…` fino all'import di `Testata` con:

```tsx
const utente = vi.hoisted(() => ({ valore: { nome: 'Andrea', email: 'andrea@example.it' } as { nome: string; email: string } | null }));
vi.mock('@/data/utente', () => ({
  useUtente: () => utente.valore,
  inizialeDi: (nome: string) => (nome.trim() ? nome.trim()[0].toLocaleUpperCase('it') : '·'),
}));
const pannello = vi.hoisted(() => ({ aperto: false, apri: vi.fn(), chiudi: vi.fn() }));
vi.mock('../pannello/PannelloProvider', () => ({ usePannello: () => pannello }));

import { Testata } from '../Testata';

beforeEach(() => {
  vi.clearAllMocks();
  pannello.aperto = false;
  utente.valore = { nome: 'Andrea', email: 'andrea@example.it' };
});
```

     (aggiungi `beforeEach` e `fireEvent` agli import di vitest e di Testing Library), poi
     sostituisci il primo test e l'ultimo con questi, e aggiungi i due nuovi:

```tsx
  it('il Menù utente è un bottone col nome, che apre il pannello e mostra l\'iniziale (spec fase 5 §A.2)', () => {
    render(<Testata titolo="Lista" />);
    const menu = screen.getByRole('button', { name: 'Andrea: profilo e impostazioni' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveAttribute('aria-controls', 'pannello-impostazioni');
    expect(menu).toHaveTextContent('A');
    expect(menu.style.boxShadow).toBe('none');
    fireEvent.click(menu);
    expect(pannello.apri).toHaveBeenCalledTimes(1);
    expect(pannello.apri).toHaveBeenCalledWith();
    expect(screen.queryByRole('link', { name: 'Impostazioni' })).not.toBeInTheDocument();
  });

  it('a pannello aperto il Menù dice aria-expanded, prende --ombra-nav, e un tocco lo chiude', () => {
    pannello.aperto = true;
    render(<Testata titolo="Lista" />);
    const menu = screen.getByRole('button', { name: 'Andrea: profilo e impostazioni' });
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(menu.style.boxShadow).toBe('var(--ombra-nav)');
    fireEvent.click(menu);
    expect(pannello.chiudi).toHaveBeenCalledTimes(1);
    expect(pannello.apri).not.toHaveBeenCalled();
  });

  it('finché l\'utente non è letto: il puntino, e il nome accessibile senza nome', () => {
    utente.valore = null;
    render(<Testata titolo="Lista" />);
    expect(screen.getByRole('button', { name: 'Profilo e impostazioni' })).toHaveTextContent('·');
  });
```

```tsx
  it('con indietro c\'è il link Indietro e non c\'è il Menù utente', () => {
    render(<Testata titolo="Importa la dieta" indietro />);
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/impostazioni');
    expect(screen.queryByRole('button', { name: /profilo e impostazioni/ })).not.toBeInTheDocument();
  });
```

     (Il modo indietro a pillola è del Task 11; qui resta il link di oggi.)

  2. In `src/components/Testata.tsx`:
     - gli import diventano:

```tsx
import Link from 'next/link';
import { inizialeDi, useUtente } from '@/data/utente';
import { usePannello } from './pannello/PannelloProvider';
import { ID_MENU_UTENTE, ID_PANNELLO } from './pannello/tipi';
```

     - la docstring del componente diventa:

```tsx
/**
 * Testata condivisa (redesign 19/09): titolo in sentence case a sinistra e, a destra, il Menù
 * utente — pillola con il tondo dell'iniziale e il kebab — che apre e chiude il Pannello
 * impostazioni (spec fase 5 §A.2). Il Marchio non vive più qui: sta nella tab bar, come icona
 * della Lista. Fuori dal Guscio (i test di una pagina) il pannello è inerte: il Menù c'è e non
 * apre niente.
 */
```

     - all'inizio della funzione sostituisci `const iniziale = useIniziale();` con:

```tsx
  const utente = useUtente();
  const { aperto, apri, chiudi } = usePannello();
  const nome = utente?.nome ?? '';
  // Prima che getUser risponda il nome non c'è: il nome accessibile dice solo cosa apre.
  const etichettaMenu = nome ? `${nome}: profilo e impostazioni` : 'Profilo e impostazioni';
```

     - sostituisci il blocco `{!indietro && ( <Link href="/impostazioni" aria-label="Impostazioni" …> … </Link> )}`
       con:

```tsx
        {!indietro && (
          <button
            type="button"
            id={ID_MENU_UTENTE}
            aria-label={etichettaMenu}
            aria-expanded={aperto}
            aria-controls={ID_PANNELLO}
            onClick={() => (aperto ? chiudi() : apri())}
            style={{
              height: 50, display: 'flex', alignItems: 'center', gap: 5, margin: '0 -2px -3px 0', flex: 'none',
              background: 'var(--barra-attiva)', borderRadius: 999, padding: '0 12px 0 6px',
              boxShadow: aperto ? 'var(--ombra-nav)' : 'none',
            }}
          >
            <span style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1, color: 'var(--superficie)' }}>
                {inizialeDi(nome)}
              </span>
            </span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="4" r="1.8" fill="var(--ink)" /><circle cx="10" cy="10" r="1.8" fill="var(--ink)" /><circle cx="10" cy="16" r="1.8" fill="var(--ink)" />
            </svg>
          </button>
        )}
```

     Il `Link` di `indietro` resta com'è (lo cambia il Task 11).

  3. `src/components/Guscio.tsx`: il componente di oggi diventa `GuscioInterno`, dentro il
     provider del pannello. Sostituisci gli import e le funzioni `Guscio` con:

```tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { TabBar } from './TabBar';
import { MarchioProvider } from './marchio-context';
import { BarraProvider, useBarraNascosta } from './barra-context';
import { SlotDockProvider } from './dock-slot';
import { PannelloProvider, usePannello, usePannelloInterno } from './pannello/PannelloProvider';
import { DatiPannelloProvider } from './pannello/DatiPannello';
import { Pannello } from './pannello/Pannello';
```

```tsx
/**
 * Il guscio dell'app: fondo a gradiente, contenuto, tab bar flottante sopra, e il Pannello
 * impostazioni sopra tutto (spec fase 5 §A.1). Il provider del pannello sta fuori dal `div`
 * del guscio perché il guscio legge lo stato del pannello (`data-pannello`, per la scala
 * dell'app dietro).
 */
export function Guscio({ children }: { children: ReactNode }) {
  return (
    <MarchioProvider>
      <BarraProvider>
        <PannelloProvider>
          <GuscioInterno>{children}</GuscioInterno>
        </PannelloProvider>
      </BarraProvider>
    </MarchioProvider>
  );
}

/**
 * Gli eventi `scroll` non risalgono ma si catturano: un solo ascoltatore sul documento vede
 * tutti gli scroller delle pagine, senza che le pagine sappiano nulla. Lo stato è esposto come
 * `data-barra`: il CSS decide --fine e misure. `data-pannello` e `data-istantaneo` dicono al CSS
 * se scalare l'app dietro il pannello, e se farlo senza animazione.
 */
function GuscioInterno({ children }: { children: ReactNode }) {
```

     Il corpo di `GuscioInterno` è quello della funzione `Guscio` di oggi, dalla riga
     `const pathname = usePathname();` fino all'effetto dello scroll compreso. Il suo `return`
     diventa:

```tsx
  const { aperto } = usePannello();
  const { istantaneo } = usePannelloInterno();

  return (
    <div
      className="guscio"
      data-barra={barra}
      data-pannello={aperto ? 'aperto' : undefined}
      data-istantaneo={istantaneo ? '' : undefined}
    >
      <SlotDockProvider slot={slotDock}>
        <main className="guscio-main">{children}</main>
      </SlotDockProvider>
      {/* Lo slot copre la cornice ma non intercetta niente: `pointer-events: none`
          sul contenitore, `auto` su quello che il Dock ci mette dentro. Senza,
          un velo invisibile mangerebbe lo scorrimento di tutta l'app. */}
      <div className="dock-slot" ref={setSlotDock} />
      <TabBarSeVisibile />
      <DatiPannelloProvider>
        <Pannello />
      </DatiPannelloProvider>
    </div>
  );
}
```

     (le due righe con `usePannello` e `usePannelloInterno` vanno con gli altri hook in cima
     alla funzione, prima del primo `if`: le regole degli hook). `TabBarSeVisibile` e
     `calcolaStatoBarra` restano come sono.

  4. In `src/components/__tests__/guscio.test.tsx`:
     - il mock di `next/navigation` diventa
       `vi.mock('next/navigation', () => ({ usePathname: () => percorso.valore, useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));`
     - sotto il mock della `TabBar` aggiungi:

```tsx
vi.mock('@/data/utente', () => ({ useUtente: () => ({ nome: 'Andrea', email: 'andrea@example.it' }), inizialeDi: () => 'A' }));
vi.mock('../pannello/Pannello', () => ({ Pannello: () => <div data-testid="pannello" /> }));
vi.mock('../pannello/DatiPannello', () => ({
  DatiPannelloProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
```

     - aggiungi `screen` all'import di Testing Library e `import { Testata } from '../Testata';`;
     - in fondo al `describe('Guscio', …)` aggiungi:

```tsx
  it('monta il pannello, e il Menù utente della pagina lo apre: data-pannello sul guscio (spec fase 5 §A.1, §B.2)', () => {
    const { container } = render(<Guscio><Testata titolo="Lista" /></Guscio>);
    const guscio = container.firstElementChild as HTMLElement;
    expect(screen.getByTestId('pannello')).toBeInTheDocument();
    expect(guscio).not.toHaveAttribute('data-pannello');
    fireEvent.click(screen.getByRole('button', { name: 'Andrea: profilo e impostazioni' }));
    expect(guscio).toHaveAttribute('data-pannello', 'aperto');
    expect(guscio).not.toHaveAttribute('data-istantaneo');
  });
```

Run: `npx vitest run src/components src/data/__tests__/utente.test.ts`
Expected: PASS. Il test `renderizza lo slot del dock accanto alla tab bar` resta verde: il
pannello sta dopo la barra.

- [ ] **Step 12: Le pagine che montano la Testata.** La Testata ora chiama `usePannello` (inerte
  fuori dal Guscio) e `useUtente` (come prima `useIniziale`, stessa lettura). Verifica che le
  pagine non si accorgano di niente:

Run: `npx vitest run "src/app/(app)"`
Expected: PASS. Se un test di pagina cercava il link `Impostazioni` del Menù utente, portalo al
bottone `{Nome}: profilo e impostazioni` e scrivi la coppia «vecchio → nuovo» nella tabella
delle decisioni del registro.

- [ ] **Step 13: Il registro.** In `docs/2026-09-25-fase5-decisioni-esecuzione.md`:
  1. nella tabella «Migrazione dei test» compila «Test nuovo» delle righe del Task 6, con la
     regola del Task 1 (file › titolo esatto):
     - riga 53 → `testata.test.tsx` › il Menù utente è un bottone col nome, che apre il pannello e mostra l'iniziale (spec fase 5 §A.2);
     - riga 55 → `utente.test.ts` › leggiUtente (spec fase 5 §A.2) › il nome del profilo se c'è, ripulito;
     - riga 56 → `utente.test.ts` › leggiUtente (spec fase 5 §A.2) › altrimenti la parte dell'email prima della @;
     - riga 57 → `utente.test.ts` › inizialeDi › senza nome il puntino; nella «Nota»: «e `leggiUtente` › senza utente o con errore, nome ed email vuoti: non lancia».

     Le righe 6–13, 23 e 47 le migrano i Task 7–10 («Va a»): qui aggiungi solo, nella loro
     «Nota», «provato anche nel provider: `dati-pannello.test.tsx`». La riga 54 la compila il
     Task 11; nella sua «Nota» scrivi che fino al Task 11 il test si chiama «con indietro c'è il
     link Indietro e non c'è il Menù utente».
  2. nella tabella delle decisioni aggiungi, numerandole di seguito (qui partono da 10, dopo
     quelle dei Task 1 e 2: se i Task 3–5 ne hanno aggiunte, rinumera):

```markdown
| 10 | `?impostazioni=` si toglie con `window.history.replaceState(null, '', pathname)`, prima di aprire, e non con `router.replace` come diceva la spec §A.3 del 25/09 (aggiornata il 26/09) (Task 6) | l'hook mette le sue voci nello stesso giro di effetti: con `router.replace`, che è una transizione, le voci nascerebbero sull'indirizzo col parametro e un indietro lo ritroverebbe. Next 16 accetta la History API nativa; misura B della sonda del Task 2 | se Next non riallineasse il suo stato, `useSearchParams` vedrebbe il parametro vecchio: nessuno lo legge per `impostazioni` |
| 11 | Il contesto del pannello ha un valore inerte fuori dal provider (Task 6) | la Testata sta in ogni pagina, e i test delle pagine la montano senza Guscio | nessuno |
| 12 | Il pannello è sempre nel DOM: chiuso è `visibility: hidden`, `inert` e `aria-hidden` (Task 6) | la spec vuole la chiusura animata e il pannello montato dopo la prima apertura; montarlo sempre toglie il caso della prima apertura senza animazione | un nodo in più in ogni pagina |
| 13 | Il contenuto della cima si monta alla prima apertura e resta; quello di una sotto-schermata si smonta 200 ms dopo la freccia (Task 6) | la chiusura scende col contenuto dentro; l'uscita verso destra ha bisogno della sotto-schermata a schermo | nessuno |
| 14 | I dati del pannello si leggono all'apertura: la prima volta col `CARICO…`, poi in silenzio sopra quelli che ci sono (Task 6) | nessuna lettura per chi non apre il pannello, e nessun lampo di `CARICO…` alla seconda apertura | un dato cambiato da un altro telefono si vede con qualche istante di ritardo |
| 15 | La coda serializzata e «solo l'ultima richiesta tocca lo schermo» valgono anche per i pasti, che riconoscono anche il rifiuto RLS (Task 6) | spec §L: due tocchi veloci su celle diverse non si pestano; la pagina di prima metteva in fila solo le impostazioni | nessuno: le scritture sono le stesse, in fila |
| 16 | `salvaImpostazioni` e `salvaPasti` tornano `false` solo quando la riga deve mostrare l'errore; una richiesta superata e un rifiuto RLS tornano `true` (Task 6) | è il comportamento della pagina di prima: nessun errore per una richiesta superata, solo «La casa è cambiata…» sul rifiuto RLS | chi chiama deve sapere che `true` non vuol dire «scritto»; il valore a schermo è comunque quello giusto |
| 17 | `ricaricaCasa(seFallisce?)`: se la rilettura fallisce, vale lo stato di riserva passato (Task 6) | il test vecchio 43 (dopo `TOGLI` la riga sparisce anche se la rilettura fallisce) ha bisogno di mettere uno stato locale | un parametro facoltativo in più rispetto all'ossatura |
| 18 | Prima che l'utente sia letto, il nome accessibile del Menù è `Profilo e impostazioni` (Task 6) | la spec dà `{Nome}: profilo e impostazioni`, che senza nome comincerebbe con i due punti; deciso dal controller il 26/09, ed è in spec §I | nessuno: dura il tempo di `getUser` |
| 19 | `useIniziale` e `leggiIniziale` escono; restano `leggiUtente`, `useUtente`, `inizialeDi` e `dimenticaIniziale` (Task 6) | l'iniziale è la prima lettera del nome, che il Menù legge comunque; una lettura sola | nessuno |
| 20 | Lo scorrimento salvato si rimette con un `MutationObserver` sul corpo, per 3 s al più (Task 6) | Ingredienti legge i suoi dati dopo l'apertura: l'altezza giusta esiste solo quando la lista è a schermo | se la lista arriva dopo 3 s, il ritorno riparte dall'alto |
| 21 | Se `salvaPasti` fallisce, i pasti si rileggono dal server; la copia locale solo se anche la rilettura fallisce (Task 6, decisione del controller del 26/09) | `salvaSlotDefs` non è atomico: prima il delete dei pasti tolti (a cascata i piatti), poi l'upsert. Tornare alla copia locale rimetterebbe a schermo un pasto già cancellato, che il salvataggio dopo riscriverebbe senza piatti | una lettura in più quando un salvataggio dei pasti fallisce |
| 22 | `cancellataIl` sta nel provider dei dati, e si azzera alla chiusura del pannello (Task 6, decisione del controller del 26/09) | la nota `Cancellata il …` deve durare fino alla chiusura (spec §D) anche se la cima si smonta | nessuno |
```

  3. in «Non eseguiti: restano per il gate dal telefono» aggiungi:

```markdown
- **Il pannello nel browser vero** (Task 6): salita, velo e scala dell'app dietro, la chiusura
  con `visibility: hidden` alla fine, la variante `reduce`, l'apertura da `?impostazioni=` senza
  animazione, il fuoco al Menù utente alla chiusura, lo scorrimento rimesso negli Ingredienti.
  I test in jsdom controllano attributi e classi, non il movimento: restano alla sonda della
  spec §M.3 punto 2 e al telefono.
```

- [ ] **Step 14: Verifica finale.**

Run: `npx vitest run src/components src/data "src/app/(app)"`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npm run lint`
Expected: nessun errore.

- [ ] **Step 15: Commit.**

```bash
git add src/components/pannello src/components/Guscio.tsx src/components/Testata.tsx src/components/__tests__/testata.test.tsx src/components/__tests__/guscio.test.tsx src/data/utente.ts src/data/__tests__/utente.test.ts docs/2026-09-25-fase5-decisioni-esecuzione.md
```

```bash
git commit -m "feat: il pannello delle impostazioni nel guscio: stato, gesto indietro, dati con la coda delle scritture, Menù utente che lo apre

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: La cima del pannello

La cima è quello che si vede aprendo il pannello: le quattro tessere, il separatore, i cinque Blocchi di gruppo, il piede con la versione. Qui nascono anche i pezzi comuni alle sotto-schermate (`pezzi.tsx`) e l'aiuto di test che i Task 8–10 riusano.

**Obiettivo del task:** chi apre il pannello trova ogni funzione della cima coi valori veri, cambia le persone dal campo `PERS`, cancella la dispensa ed esce, con i testi della spec §B.3, §B.4, §C.10, §C.11, §D.

**Files:**
- Create: `src/components/pannello/pezzi.tsx` (Blocco di gruppo, Nota, `CARICO…`, errori, tondi 44: i pezzi che cima e sotto-schermate hanno in comune)
- Create: `src/components/pannello/RigaImpostazione.tsx`
- Create: `src/components/pannello/TesserePannello.tsx`
- Create: `src/components/pannello/NotaRisparmio.tsx`
- Create: `src/components/pannello/CampoPersone.tsx`
- Create: `src/components/pannello/Cima.tsx`
- Modify: `src/components/pannello/schermate.tsx` (`CIMA` diventa `Cima`, Step 9)
- Modify: `src/components/pannello/DatiPannello.tsx` (solo `StatoDatiPannello`: usa `Carico` ed `ErroreCaricamento` di `pezzi.tsx`, Step 3)
- Test (aiuto comune): `src/components/pannello/__tests__/finti.ts`, `src/components/pannello/__tests__/aiuti.tsx`
- Test: `src/components/pannello/__tests__/nota-risparmio.test.ts`, `src/components/pannello/__tests__/cima.test.tsx`, `src/components/pannello/__tests__/persone.test.tsx`
- Modify: `docs/2026-09-25-fase5-decisioni-esecuzione.md` (registro: test migrati, scelte)

`pezzi.tsx` sta nella mappa dei file dell'ossatura: sono i pezzi comuni alla cima e alle sotto-schermate, e `StatoDatiPannello` del Task 6 passa a usarli.

**Interfaces:**
- Consumes:
  - `usePannello()` → `entra`, `mostraDialogo`, `vaiA`; `PannelloProvider` (Task 6, `PannelloProvider.tsx`);
  - `useDatiPannello()` → `stato`, `salvaImpostazioni`, `casaCambiata`, `cancellataIl`, `segnaCancellata`; `DatiPannelloProvider` e `StatoDatiPannello` (Task 6, `DatiPannello.tsx`);
  - `CIMA` in `schermate.tsx` (Task 6): il Task 7 ci mette `Cima`;
  - `PropsDialogo` (Task 2, `@/components/DialogoConferma`); `MessaggioErrore`, `STILE_PILLOLA`, `Etichetta` (Task 2, `@/components/controlli`);
  - `testoCadenza`, `GiorniControllo` (Task 3, `@/domain/pantry`);
  - `cancellaDispensa`, `EVENTO_DISPENSA_CAMBIATA` (Task 4, `@/data/dispensa`);
  - `esci` (Task 5, `@/data/sessione`); `VERSIONE` (Task 5, `./versione`);
  - `RiassuntoEvitato`, `formattaQuantita`, `formattaEuro` (`@/domain/risparmio`, di oggi); `ORDINE_AREE_DEFAULT` (`@/domain/aree`); `MIN_PORZIONI`, `MAX_PORZIONI` (`@/data/impostazioni`); `StatoCasa` (`@/data/casa`).
- Produces:
  - `RigaImpostazione(p)` con la firma vincolante dell'ossatura.
  - Da `pezzi.tsx`: `ERRORE_SALVATAGGIO`, `TESTO_ERRORE_IMPOSTAZIONI`, `STILE_BLOCCO`, `BloccoGruppo({ titolo?, children })`, `Nota({ children, ruolo? })`, `Carico()`, `AvvisoCasaCambiata()`, `ErroreCaricamento({ testo, onRiprova? })`, `TondoIcona({ etichetta, spento?, onClick, children })`, `IconaFreccia({ verso, spenta })`, `IconaCroce({ spenta })`.
  - `TesserePannello()`, `valoreCasa(casa: StatoCasa): string`.
  - `NotaRisparmio({ riassunto })`, `testoRisparmio(r: RiassuntoEvitato | null): string | null`.
  - `CampoPersone()`.
  - `Cima()`, e le funzioni pure `fuoriCasa(defs)`, `valorePastiACasa(n)`, `valoreRotazione(settimane)`, `ordinePersonalizzato(ordine)`, `notaCancellata(quando: Date)`.
  - L'aiuto di test è **l'unico** del pannello: i Task 8–10 lo riusano e, se serve, lo estendono qui. I test del Task 6 (`dati-pannello.test.tsx`, `pannello.test.tsx`) restano coi loro mock in linea: provano il provider e il contenitore da soli.
  - L'aiuto di test: da `finti.ts` i moduli finti per `vi.mock` e `router`, `percorso`, `auth`, `UTENTE`; da `aiuti.tsx` `montaPannello`, `preparaDati`, `azzera`, `impostazioni`, `piatto`, `ingrediente`, `voce`, `COLAZIONE`, `PRANZO`, `CENA`, `ASSENZE_VUOTE`, `ORDINE_TEST`.

**Prima di cominciare**, leggi il codice del Task 6: `PannelloProvider.tsx`, `DatiPannello.tsx`, `Pannello.tsx`, `PiedePannello.tsx`, `schermate.tsx` e i loro test. Tre fatti decidono come si scrive questo task:
1. **Il provider dei dati è `DatiPannelloProvider`**, un componente a parte che il Guscio monta attorno a `Pannello`, dentro `PannelloProvider` (legge `aperto` e `chiudiDialogo` da `usePannello`). `montaPannello` lo monta allo stesso modo.
2. **`Pannello` non usa i contesti del Guscio** (barra, Dock): basta `PannelloProvider`.
3. **La cima si registra in `schermate.tsx`**: `CIMA` è il componente che `Pannello` monta in cima; il Task 6 ci ha messo gli stati dei dati, il Task 7 ci mette `Cima`. La cima si monta alla prima apertura e resta, ma la nota «Cancellata il …» non dipende da questo: vive nel provider (`cancellataIl`), che la azzera alla chiusura del pannello.

**Testi dal disegno, confermati da Andrea il 26/09.** La spec §B.4 non li dava; il disegno sì (frame 03, 04, 25), e la spec §I li riporta dal 26/09:

| Costante | Testo | Frame |
|---|---|---|
| `NOTA_PASTI_A_CASA` | `Il default con cui nasce ogni settimana nuova.` | 03 |
| `NOTA_CADENZA` | `Ogni quanto ti chiedo se hai ancora olio, sale, farina.` | 04 |
| `NOTA_ORDINE` | `L'ordine in cui compaiono in Lista: mettilo come gira il tuo supermercato.` | 04 |
| `NOTA_CANCELLA` | `Svuota quello che hai in casa. I piatti e il piano restano.` | 04 |
| aria del campo | `Per quante persone cucini, da 1 a 4` | 04, 25 |

**Apostrofi.** I testi nuovi della spec hanno l'apostrofo dritto `'`. I testi «di oggi» si copiano dal codice senza toccarli, e lì l'apostrofo è tipografico `’` (per esempio la nota delle porzioni non ne ha, quella dei pasti sì). Scrivi la regola nel registro.

- [ ] **Step 1: L'aiuto di test, `finti.ts`.**

Le fabbriche di `vi.mock` sono sollevate in cima al file di test e non possono usare le sue importazioni: si fanno prestare i moduli finti con `await import('./finti')`. Per questo `finti.ts` non importa codice dell'app, se non con `vi.importActual` dentro le fabbriche. Ogni modulo finto parte dal modulo vero e sostituisce solo le letture e le scritture: così un export che il Task 6 aggiunge dopo non manca nel finto.

```ts
import { vi } from 'vitest';

/**
 * I moduli finti del pannello, per `vi.mock` nei test di src/components/pannello.
 * Sta a parte da `aiuti.tsx` perché le fabbriche di `vi.mock` lo importano da
 * dentro (`await import('./finti')`): se importasse il codice dell'app, la
 * fabbrica di un modulo finto caricherebbe il modulo che sta fingendo.
 */

export const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() };
/** La pagina sotto il pannello: `usePathname()` la legge da qui. */
export const percorso = { valore: '/lista' };
export const UTENTE = { id: 'u-1', email: 'andrea@esempio.it', user_metadata: { nome: 'Andrea' } };
export const auth = {
  getUser: vi.fn(async () => ({ data: { user: UTENTE }, error: null })),
  getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
  signOut: vi.fn(async () => ({ error: null })),
};

export function modNavigazione() {
  return {
    useRouter: () => router,
    usePathname: () => percorso.valore,
    useSearchParams: () => new URLSearchParams(),
  };
}

export function modSupabase() {
  return { client: () => ({ auth, rpc: vi.fn(), from: vi.fn() }) };
}

export async function modImpostazioni() {
  const vero = await vi.importActual<typeof import('@/data/impostazioni')>('@/data/impostazioni');
  return { ...vero, leggiImpostazioni: vi.fn(), salvaImpostazioni: vi.fn(), leggiSlotDefs: vi.fn(), salvaSlotDefs: vi.fn() };
}

/** `eRifiutoRls` resta quella vera: è pura, e il provider si ramifica su di lei. */
export async function modCasa() {
  const vero = await vi.importActual<typeof import('@/data/casa')>('@/data/casa');
  return {
    ...vero,
    idCasa: vi.fn(async () => 'casa-1'),
    statoCasa: vi.fn(),
    creaInvito: vi.fn(),
    entraInCasa: vi.fn(),
    esciDallaCasa: vi.fn(),
    rimuoviMembro: vi.fn(),
    dimenticaIdCasa: vi.fn(),
  };
}

export async function modRisparmio() {
  const vero = await vi.importActual<typeof import('@/data/risparmio')>('@/data/risparmio');
  return { ...vero, leggiRisparmioTotale: vi.fn(async () => []), leggiRisparmioSettimana: vi.fn(async () => []) };
}

export async function modRepertorio() {
  const vero = await vi.importActual<typeof import('@/data/repertorio')>('@/data/repertorio');
  return { ...vero, leggiRepertorio: vi.fn(async () => []), leggiIngredienti: vi.fn(async () => []) };
}

export async function modDispensa() {
  const vero = await vi.importActual<typeof import('@/data/dispensa')>('@/data/dispensa');
  return { ...vero, cancellaDispensa: vi.fn(async () => undefined) };
}

export async function modSessione() {
  const vero = await vi.importActual<typeof import('@/data/sessione')>('@/data/sessione');
  return { ...vero, esci: vi.fn() };
}

export async function modEsporta() {
  const vero = await vi.importActual<typeof import('@/data/esporta')>('@/data/esporta');
  return { ...vero, preparaEsportazione: vi.fn() };
}

export async function modSalvaFile() {
  const vero = await vi.importActual<typeof import('@/components/salva-file')>('@/components/salva-file');
  return { ...vero, salvaFile: vi.fn() };
}
```

Ogni file di test del pannello (questo task e i Task 8–10) apre con **lo stesso blocco**, prima delle importazioni dell'app:

```ts
vi.mock('next/navigation', async () => (await import('./finti')).modNavigazione());
vi.mock('@/data/supabase', async () => (await import('./finti')).modSupabase());
vi.mock('@/data/impostazioni', async () => (await import('./finti')).modImpostazioni());
vi.mock('@/data/casa', async () => (await import('./finti')).modCasa());
vi.mock('@/data/risparmio', async () => (await import('./finti')).modRisparmio());
vi.mock('@/data/repertorio', async () => (await import('./finti')).modRepertorio());
vi.mock('@/data/dispensa', async () => (await import('./finti')).modDispensa());
vi.mock('@/data/sessione', async () => (await import('./finti')).modSessione());
vi.mock('@/data/esporta', async () => (await import('./finti')).modEsporta());
vi.mock('@/components/salva-file', async () => (await import('./finti')).modSalvaFile());
```

`@/data/utente` non si finge: con `@/data/supabase` finto, il `leggiUtente` vero del Task 6 legge `UTENTE` da `client().auth.getUser()`, e il pannello dice `Andrea` e `andrea@esempio.it`.

- [ ] **Step 2: L'aiuto di test, `aiuti.tsx`.**

```tsx
import { render, type RenderResult } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { vi } from 'vitest';
import type { AreaId, Dish, Impostazioni, Ingredient, MealSlotDef } from '@/domain/types';
import type { VoceEvitata } from '@/domain/list-builder';
import type { StatoCasa } from '@/data/casa';
import { leggiImpostazioni, leggiSlotDefs, salvaImpostazioni, salvaSlotDefs } from '@/data/impostazioni';
import { statoCasa } from '@/data/casa';
import { leggiRisparmioTotale } from '@/data/risparmio';
import { leggiIngredienti, leggiRepertorio } from '@/data/repertorio';
import { PannelloProvider, usePannello } from '../PannelloProvider';
import { DatiPannelloProvider } from '../DatiPannello';
import { Pannello } from '../Pannello';
import type { DestinazionePannello } from '../tipi';
import { percorso } from './finti';

// jsdom non ha matchMedia: il pannello può chiederlo per prefers-reduced-motion.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

export const ASSENZE_VUOTE = [false, false, false, false, false, false, false];
/** Non l'ordine di base: la riga Ordine delle aree dice PERSONALIZZATO. */
export const ORDINE_TEST: AreaId[] = ['dispensa', 'latticini', 'ortofrutta', 'surgelati', 'cereali', 'macelleria'];

// Tre pasti, come nei test di oggi: il pannello legge davvero leggiSlotDefs().
export const COLAZIONE: MealSlotDef = { id: 'sd-1', nome: 'Colazione', posizione: 0, assenzeAbituali: ASSENZE_VUOTE };
export const PRANZO: MealSlotDef = { id: 'sd-2', nome: 'Pranzo', posizione: 1, assenzeAbituali: [true, false, false, false, false, false, false] };
export const CENA: MealSlotDef = { id: 'sd-3', nome: 'Cena', posizione: 2, assenzeAbituali: ASSENZE_VUOTE };

export function impostazioni(p: Partial<Impostazioni> = {}): Impostazioni {
  return { moltiplicatorePorzioni: 1, ordineAree: [...ORDINE_TEST], settimaneCiclo: 1, cicloOrigine: null, giorniControllo: 90, ...p };
}

export function piatto(p: Partial<Dish> & Pick<Dish, 'id' | 'slotDefId'>): Dish {
  return {
    nome: p.id, fonte: 'proprio', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
    ingredienti: [], componenti: [], ...p,
  };
}

export function ingrediente(p: Partial<Ingredient> & Pick<Ingredient, 'id' | 'nome' | 'area'>): Ingredient {
  return {
    unitaBase: 'g', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null,
    ...p,
  };
}

export function voce(p: Partial<VoceEvitata> = {}): VoceEvitata {
  return {
    ingredientId: 'i-1', nome: 'Pasta', unita: 'g', fabbisogno: 0, confezioniIngenue: 0, confezioniReali: 0,
    confezioniEvitate: 1, quantitaEvitata: 500, prezzoConfezione: null, ...p,
  };
}

export interface DatiFinti {
  impostazioni?: Partial<Impostazioni>;
  pasti?: MealSlotDef[];
  /** Un Error fa fallire statoCasa (frame 26). */
  casa?: StatoCasa | Error;
  risparmio?: VoceEvitata[];
  piatti?: Dish[];
  ingredienti?: Ingredient[];
}

/**
 * I valori di default delle letture e delle scritture. Usa `mockResolvedValue`,
 * non `…Once`: un `mockReturnValueOnce` messo dal test prima di `montaPannello`
 * resta in coda e vince sulla prima chiamata.
 */
export function preparaDati(d: DatiFinti = {}): void {
  vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni(d.impostazioni));
  vi.mocked(salvaImpostazioni).mockResolvedValue(undefined);
  vi.mocked(leggiSlotDefs).mockResolvedValue(d.pasti ?? [COLAZIONE, PRANZO, CENA]);
  vi.mocked(salvaSlotDefs).mockResolvedValue(undefined);
  if (d.casa instanceof Error) vi.mocked(statoCasa).mockRejectedValue(d.casa);
  else vi.mocked(statoCasa).mockResolvedValue(d.casa ?? { ruolo: 'solo', email: [], id: [] });
  vi.mocked(leggiRisparmioTotale).mockResolvedValue(d.risparmio ?? []);
  vi.mocked(leggiRepertorio).mockResolvedValue(d.piatti ?? []);
  vi.mocked(leggiIngredienti).mockResolvedValue(d.ingredienti ?? []);
}

function Apri({ dest }: { dest: DestinazionePannello }) {
  const { apri } = usePannello();
  // Una volta sola, al montaggio: come il tocco sul Menù utente.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { apri(dest); }, []);
  return null;
}

/**
 * Monta il pannello come fa il Guscio (`DatiPannelloProvider` attorno a
 * `Pannello`, tutti e due dentro `PannelloProvider`) e lo apre su `dest`. Con
 * `?impostazioni=` non passa: quel percorso è del test del Task 6. `extra` sta
 * dentro `PannelloProvider` (per una sonda che legge `usePannello`).
 */
export function montaPannello(dest: DestinazionePannello = 'cima', d?: DatiFinti, extra?: ReactNode): RenderResult {
  preparaDati(d);
  return render(
    <PannelloProvider>
      <DatiPannelloProvider>
        <Pannello />
      </DatiPannelloProvider>
      <Apri dest={dest} />
      {extra}
    </PannelloProvider>,
  );
}

/** In `beforeEach`. `clearAllMocks` tiene le implementazioni di `finti.ts`. */
export function azzera(): void {
  vi.clearAllMocks();
  percorso.valore = '/lista';
  sessionStorage.clear();
  window.history.replaceState(null, '', '/lista');
}
```

Se `Ingredient` o `Dish` hanno campi diversi da questi (leggi `src/domain/types.ts` dopo il Task 3), correggi le fabbriche.

- [ ] **Step 3: `pezzi.tsx`.**

```tsx
'use client';

import { Children, type ReactNode } from 'react';
import { MessaggioErrore, STILE_PILLOLA } from '@/components/controlli';

/** L'errore di ogni controllo che salva al tocco o all'uscita dal campo (§B.5). */
export const ERRORE_SALVATAGGIO = 'Non siamo riusciti a salvare. Riprova.';
/** L'errore di caricamento del pannello (§I, frame 24). */
export const TESTO_ERRORE_IMPOSTAZIONI = 'Non riusciamo a caricare le impostazioni. Controlla la connessione e tocca RIPROVA.';
const TESTO_CASA_CAMBIATA = 'La casa è cambiata: dati ricaricati. Riprova.';

/** Blocco di gruppo (DESIGN.md §8): bianco, raggio 18, --bordo, --ombra-pannello. */
export const STILE_BLOCCO = {
  background: 'var(--superficie)', border: '1px solid var(--bordo)', borderRadius: 18, boxShadow: 'var(--ombra-pannello)',
} as const;

const STILE_TITOLO_BLOCCO = {
  margin: 0, padding: '0 4px 6px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'var(--ink)',
};

/**
 * Un Blocco di gruppo con le sue righe. Fra un figlio e l'altro un filetto
 * --bordo, il primo senza: `Children.toArray` salta `null` e `false`, così una
 * riga che non c'è non lascia un filetto. Un figlio che rende `null` da sé
 * (non da un `&&`) il filetto lo lascia: chi lo passa decide prima.
 */
export function BloccoGruppo({ titolo, children }: { titolo?: ReactNode; children: ReactNode }) {
  const figli = Children.toArray(children);
  return (
    <section style={{ ...STILE_BLOCCO, padding: '12px 12px 10px', display: 'flex', flexDirection: 'column' }}>
      {titolo && <h3 style={STILE_TITOLO_BLOCCO}>{titolo}</h3>}
      {figli.map((figlio, i) => (
        <div key={i} style={{ borderTop: i > 0 ? '1px solid var(--bordo)' : 'none' }}>{figlio}</div>
      ))}
    </section>
  );
}

/** Nota 12,5 in --testo-2 (DESIGN.md §8 Nota). */
export function Nota({ children, ruolo }: { children: ReactNode; ruolo?: 'status' }) {
  return (
    <p role={ruolo} style={{ margin: 0, padding: '0 4px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--testo-2)' }}>
      {children}
    </p>
  );
}

/** Lo stato di caricamento (§B.5, frame 23): mono in --sec, niente scheletro. */
export function Carico() {
  return (
    <p role="status" style={{ margin: 0, padding: '8px 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--sec)' }}>
      CARICO…
    </p>
  );
}

/** Frame 26B: sopra il blocco ricaricato, dopo un rifiuto RLS. */
export function AvvisoCasaCambiata() {
  return <MessaggioErrore ruolo="alert">{TESTO_CASA_CAMBIATA}</MessaggioErrore>;
}

/** Frame 24 (con RIPROVA) e 26 (senza): un blocco con l'errore 12,5 in --errore. */
export function ErroreCaricamento({ testo, onRiprova }: { testo: string; onRiprova?: () => void }) {
  return (
    <section style={{ ...STILE_BLOCCO, boxShadow: 'none', padding: '16px 12px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <MessaggioErrore ruolo="alert">{testo}</MessaggioErrore>
      {onRiprova && (
        <button
          type="button"
          onClick={onRiprova}
          style={{ ...STILE_PILLOLA, alignSelf: 'flex-start', background: 'var(--superficie)', color: 'var(--ink)', border: '1px solid rgba(20,22,58,0.09)' }}
        >
          RIPROVA
        </button>
      )}
    </section>
  );
}

/** Il tondo 44 su 0,04 delle frecce e della ✕ (frame 06, 13). Spento: `disabled` e icona in --icona-spenta. */
export function TondoIcona({ etichetta, spento = false, onClick, children }: {
  etichetta: string; spento?: boolean; onClick: () => void; children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={etichetta}
      disabled={spento}
      onClick={onClick}
      style={{
        width: 44, height: 44, flex: 'none', border: 0, borderRadius: 999, padding: 0,
        background: 'rgba(20,22,58,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

export function IconaFreccia({ verso, spenta }: { verso: 'su' | 'giu'; spenta: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={verso === 'su' ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
        stroke={spenta ? 'var(--icona-spenta)' : 'var(--ink)'}
        strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconaCroce({ spenta }: { spenta: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 7l10 10M17 7 7 17" stroke={spenta ? 'var(--icona-spenta)' : 'var(--ink)'} strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}
```

  Poi `StatoDatiPannello` (Task 6, `DatiPannello.tsx`) passa a questi pezzi, così `CARICO…` e
  l'errore di caricamento hanno un disegno solo. I suoi due rami diventano:

```tsx
  if (stato.stato === 'carico') return <Carico />;
  if (stato.stato === 'errore') return <ErroreCaricamento testo={TESTO_ERRORE_IMPOSTAZIONI} onRiprova={ricarica} />;
```

  con `import { Carico, ErroreCaricamento, TESTO_ERRORE_IMPOSTAZIONI } from './pezzi';`. Se
  `MessaggioErrore` e `STILE_PILLOLA` non hanno più usi in `DatiPannello.tsx`, il loro import
  esce (il lint lo dice). I test del Task 6 restano verdi: cercano `role="status"`, il testo
  dell'errore e `RIPROVA`.

  Run: `npx vitest run src/components/pannello`
  Expected: PASS.

- [ ] **Step 4: `RigaImpostazione.tsx`.**

La firma è quella dell'ossatura. Il finale `valore` con `valore: ''` mostra solo il chevron: è la riga Ingredienti (§B.4, frame 04).

```tsx
'use client';

import type { ReactNode } from 'react';
import { MessaggioErrore } from '@/components/controlli';

type Finale =
  | { tipo: 'valore'; valore: string; onApri: () => void }
  | { tipo: 'campo'; campo: ReactNode }
  | { tipo: 'azione'; onAzione: () => void; tono?: 'errore' }
  | { tipo: 'niente' };

interface Props {
  nome: string;
  nota?: ReactNode;
  finale: Finale;
  errore?: string | null;
}

const STILE_RIGA = {
  display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, width: '100%', boxSizing: 'border-box' as const,
  padding: '8px 4px', border: 0, background: 'none', textAlign: 'left' as const, font: 'inherit', color: 'var(--ink)',
};

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M9 5l7 7-7 7" stroke="var(--icona-spenta)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Riga di impostazione (DESIGN.md §8): minimo 56, nome 15/700, nota 12,5 in
 * --testo-2, e uno di quattro finali. `valore` e `azione` fanno della riga
 * intera un `button`; `campo` e `niente` la lasciano un contenitore. L'errore
 * di salvataggio sta sotto la riga, dentro il blocco, con `role="alert"` (§B.5).
 */
export function RigaImpostazione({ nome, nota, finale, errore }: Props) {
  const nomeInErrore = finale.tipo === 'azione' && finale.tono === 'errore';
  const testi = (
    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: nomeInErrore ? 'var(--errore)' : 'var(--ink)', overflowWrap: 'anywhere' }}>
        {nome}
      </span>
      {nota && (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12.5, lineHeight: 1.35, color: 'var(--testo-2)', overflowWrap: 'anywhere' }}>
          {nota}
        </span>
      )}
    </span>
  );

  let riga: ReactNode;
  switch (finale.tipo) {
    case 'valore':
      riga = (
        <button type="button" onClick={finale.onApri} style={STILE_RIGA}>
          {testi}
          {finale.valore && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
              {finale.valore}
            </span>
          )}
          <Chevron />
        </button>
      );
      break;
    case 'azione':
      riga = <button type="button" onClick={finale.onAzione} style={STILE_RIGA}>{testi}</button>;
      break;
    case 'campo':
      riga = <div style={STILE_RIGA}>{testi}{finale.campo}</div>;
      break;
    default:
      riga = <div style={STILE_RIGA}>{testi}</div>;
  }

  return (
    <div>
      {riga}
      {errore && (
        <div style={{ paddingBottom: 8 }}>
          <MessaggioErrore ruolo="alert">{errore}</MessaggioErrore>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: `NotaRisparmio.tsx`.**

La formattazione è quella della Dispensa prima della fase 4 (`git show 753e805:"src/app/(app)/dispensa/page.tsx"`, `rigaTotaleNonRicomprato`, righe 80–93) [misurato]. Lì la funzione riassumeva le voci; qui il riassunto arriva già fatto da `DatiPannello.risparmio`.

```tsx
'use client';

import { formattaEuro, formattaQuantita, type RiassuntoEvitato } from '@/domain/risparmio';

/**
 * "Da quando usi Dispesa: 9 confezioni non ricomprate · 4,1 kg · circa 32 €"
 * (§C.11). Null con zero confezioni: la nota non c'è. Quantità ed euro solo se
 * c'è qualcosa da dire. È la formattazione della Dispensa prima della fase 4.
 */
export function testoRisparmio(r: RiassuntoEvitato | null): string | null {
  if (!r || r.confezioni === 0) return null;
  const segmenti = [r.confezioni === 1 ? '1 confezione non ricomprata' : `${r.confezioni} confezioni non ricomprate`];
  const quantita = formattaQuantita(r.quantita);
  if (quantita) segmenti.push(quantita);
  if (r.euro !== null) segmenti.push(formattaEuro(r.euro));
  return `Da quando usi Dispesa: ${segmenti.join(' · ')}`;
}

/** Nota in testa al blocco I tuoi dati (frame 04): non è una riga toccabile. */
export function NotaRisparmio({ riassunto }: { riassunto: RiassuntoEvitato | null }) {
  const testo = testoRisparmio(riassunto);
  if (!testo) return null;
  return (
    <p style={{ margin: 0, padding: '4px 4px 12px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--testo-2)' }}>{testo}</p>
  );
}
```

- [ ] **Step 6: `TesserePannello.tsx`.**

Le tessere non dipendono dai dati: si disegnano e si toccano anche durante il caricamento e dopo un errore (frame 23, 24). Solo il valore di Casa aspetta `stato.stato === 'pronto'` e `dati.casa !== null` (frame 26: con la lettura fallita la tessera resta senza valore).

```tsx
'use client';

import { usePathname } from 'next/navigation';
import type { StatoCasa } from '@/data/casa';
import { usePannello } from './PannelloProvider';
import { useDatiPannello } from './DatiPannello';

/**
 * Il valore della tessera Casa condivisa (§B.3). {N} conta te più i membri;
 * {NOME} è la parte dell'email del proprietario prima della @, in maiuscolo.
 */
export function valoreCasa(casa: StatoCasa): string {
  if (casa.ruolo === 'solo') return 'SOLO TU';
  if (casa.ruolo === 'proprietario') return `CON ${casa.email.length + 1} PERSONE`;
  const nome = (casa.email[0] ?? '').split('@')[0];
  return `NELLA CASA DI ${nome.toLocaleUpperCase('it')}`;
}

function Tessera({ nome, nota, valore, onClick }: { nome: string; nota: string; valore?: string | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 104, boxSizing: 'border-box', textAlign: 'left', font: 'inherit', color: 'var(--ink)',
        background: 'var(--superficie)', border: '1px solid var(--bordo)', borderRadius: 18, boxShadow: 'var(--ombra-pannello)',
        padding: '12px 14px 13px', display: 'flex', flexDirection: 'column', gap: 4,
      }}
    >
      <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{nome}</span>
      <span style={{ fontSize: 12.5, lineHeight: 1.35, color: 'var(--testo-2)' }}>{nota}</span>
      {valore && (
        <span style={{ marginTop: 'auto', paddingTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em' }}>
          {valore}
        </span>
      )}
    </button>
  );
}

/** Il livello delle funzioni (§B.3, frame 03): quattro tessere 2 × 2, senza Blocco attorno. */
export function TesserePannello() {
  const { entra, vaiA } = usePannello();
  const { stato } = useDatiPannello();
  const pathname = usePathname();
  const casa = stato.stato === 'pronto' ? stato.dati.casa : null;
  const origine = { pathname, sotto: 'cima' as const };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <Tessera nome="Piatti" nota="Scrivi e correggi i tuoi piatti." onClick={() => vaiA('/piatti?da=impostazioni', origine)} />
      <Tessera nome="Importa un piano" nota="Da PDF o foto. Sostituisce il piano attuale." onClick={() => vaiA('/importa', origine)} />
      <Tessera nome="Casa condivisa" nota="La spesa con chi vive con te." valore={casa ? valoreCasa(casa) : null} onClick={() => entra('casa')} />
      <Tessera nome="Esporta i tuoi dati" nota="Piatti, piano e dispensa in un file." onClick={() => entra('esporta')} />
    </div>
  );
}
```

- [ ] **Step 7: `CampoPersone.tsx`.**

Il campo sostituisce lo stepper (§C.10, log §4.4). Si salva all'uscita dal campo e con Invio. Il valore mostrato è quello del provider finché non si scrive: il testo scritto vive in `testo` solo durante la modifica, e alla fine del tentativo (riuscito, fallito o fuori range) si torna a leggere il provider. Così il ritorno a prima del provider (rollback) si vede senza sincronizzazioni a mano.

Mentre salva il campo va a 0,5 e `disabled` (frame 25). Per questo due scritture veloci dallo stesso campo non si possono fare: i test della coda serializzata migrano sulla Cadenza (Task 9), dove il segmento resta toccabile.

```tsx
'use client';

import { useState, type KeyboardEvent } from 'react';
import { MAX_PORZIONI, MIN_PORZIONI } from '@/data/impostazioni';
import { useDatiPannello } from './DatiPannello';
import { RigaImpostazione } from './RigaImpostazione';
import { ERRORE_SALVATAGGIO } from './pezzi';

const NOTA_PERSONE = 'Moltiplica ogni porzione del piano. Vale se a tavola mangiate tutti la stessa porzione: se no, lascia 1 e scrivi le quantità giuste nei piatti.';
const ERRORE_RANGE = `Scrivi un numero da ${MIN_PORZIONI} a ${MAX_PORZIONI}.`;
// L'aria dal disegno (frame 04, 25), confermata da Andrea il 26/09.
const ARIA_CAMPO = `Per quante persone cucini, da ${MIN_PORZIONI} a ${MAX_PORZIONI}`;

/**
 * Per quante persone cucini (§C.10): campo numerico 78 × 44 con l'unità PERS.
 * Fuori da 1–4, o non intero, torna al valore di prima e sotto la riga compare
 * `Scrivi un numero da 1 a 4.`. L'errore sparisce al gesto successivo.
 */
export function CampoPersone() {
  const { stato, salvaImpostazioni, casaCambiata } = useDatiPannello();
  const [testo, setTesto] = useState<string | null>(null);
  const [volo, setVolo] = useState(false);
  const [errore, setErrore] = useState<'range' | 'salva' | null>(null);
  if (stato.stato !== 'pronto') return null;
  const valore = stato.dati.impostazioni.moltiplicatorePorzioni;

  async function conferma() {
    if (volo || testo === null) return;
    const scritto = testo.trim();
    if (scritto === String(valore)) {
      setTesto(null);
      return;
    }
    const n = Number(scritto);
    if (!/^\d+$/.test(scritto) || n < MIN_PORZIONI || n > MAX_PORZIONI) {
      setTesto(null);
      setErrore('range');
      return;
    }
    setErrore(null);
    setVolo(true);
    const ok = await salvaImpostazioni({ moltiplicatorePorzioni: n });
    setVolo(false);
    setTesto(null);
    if (!ok) setErrore('salva');
  }

  function tasto(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void conferma();
    }
  }

  const campo = (
    <label
      style={{
        height: 44, width: 78, flex: 'none', boxSizing: 'border-box', borderRadius: 14,
        background: 'var(--superficie)', border: '1px solid var(--bordo)', boxShadow: 'var(--ombra-pannello)',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, padding: '0 12px',
        opacity: volo ? 0.5 : 1,
      }}
    >
      <input
        type="text"
        inputMode="numeric"
        aria-label={ARIA_CAMPO}
        value={testo ?? String(valore)}
        disabled={volo}
        onChange={(e) => {
          setErrore(null);
          setTesto(e.target.value);
        }}
        onBlur={() => void conferma()}
        onKeyDown={tasto}
        style={{
          width: '100%', minWidth: 0, border: 0, outline: 'none', background: 'transparent', padding: 0, textAlign: 'right',
          fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)',
        }}
      />
      <span aria-hidden="true" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: 'var(--ter)' }}>
        PERS
      </span>
    </label>
  );

  // Dopo un rifiuto RLS l'errore della riga non c'è: parla l'avviso sopra i blocchi (§B.5).
  const testoErrore = errore === 'range' ? ERRORE_RANGE : errore === 'salva' && !casaCambiata ? ERRORE_SALVATAGGIO : null;

  return (
    <RigaImpostazione
      nome="Per quante persone cucini"
      nota={
        <>
          <span>{NOTA_PERSONE}</span>
          {valore > 1 && <span>{`La lista compra per ${valore}. Le porzioni nel piatto restano quelle scritte.`}</span>}
        </>
      }
      finale={{ tipo: 'campo', campo }}
      errore={testoErrore}
    />
  );
}
```

`useState` è chiamato prima del `return null`: gli hook stanno sopra ogni uscita. Con la regola `react-hooks/rules-of-hooks` il lint lo controlla.

- [ ] **Step 8: `Cima.tsx`.**

```tsx
'use client';

import type { MealSlotDef, AreaId } from '@/domain/types';
import { ORDINE_AREE_DEFAULT } from '@/domain/aree';
import { testoCadenza } from '@/domain/pantry';
import { cancellaDispensa, EVENTO_DISPENSA_CAMBIATA } from '@/data/dispensa';
import { esci } from '@/data/sessione';
import { usePannello } from './PannelloProvider';
import { StatoDatiPannello, useDatiPannello, type DatiPannello } from './DatiPannello';
import { TesserePannello } from './TesserePannello';
import { RigaImpostazione } from './RigaImpostazione';
import { CampoPersone } from './CampoPersone';
import { NotaRisparmio, testoRisparmio } from './NotaRisparmio';
import { AvvisoCasaCambiata, BloccoGruppo } from './pezzi';
import { VERSIONE } from './versione';

// Testi dal disegno (frame 03, 04), confermati da Andrea il 26/09 (spec §I).
const NOTA_PASTI_A_CASA = 'Il default con cui nasce ogni settimana nuova.';
const NOTA_CADENZA = 'Ogni quanto ti chiedo se hai ancora olio, sale, farina.';
const NOTA_ORDINE = "L'ordine in cui compaiono in Lista: mettilo come gira il tuo supermercato.";
const NOTA_CANCELLA = 'Svuota quello che hai in casa. I piatti e il piano restano.';

/** Le celle fuori casa della matrice: `assenzeAbituali` vale true = fuori. */
export function fuoriCasa(defs: MealSlotDef[]): number {
  return defs.reduce((n, d) => n + d.assenzeAbituali.filter(Boolean).length, 0);
}

export function valorePastiACasa(n: number): string {
  return n === 0 ? 'NESSUNO FUORI CASA' : `${n} FUORI CASA`;
}

export function valoreRotazione(settimane: number): string {
  return settimane <= 1 ? 'NESSUNA' : `${settimane} SETT.`;
}

/** DI BASE quando l'ordine è ORDINE_AREE_DEFAULT (§B.4). */
export function ordinePersonalizzato(ordine: AreaId[]): boolean {
  return ordine.length !== ORDINE_AREE_DEFAULT.length || ordine.some((a, i) => a !== ORDINE_AREE_DEFAULT[i]);
}

function dueCifre(n: number): string {
  return String(n).padStart(2, '0');
}

/** `Cancellata il {gg/mm} alle {hh:mm}.` (§D), nell'ora del telefono. */
export function notaCancellata(quando: Date): string {
  return `Cancellata il ${dueCifre(quando.getDate())}/${dueCifre(quando.getMonth() + 1)} alle ${dueCifre(quando.getHours())}:${dueCifre(quando.getMinutes())}.`;
}

/**
 * La cima del pannello (§B.3, §B.4, frame 03–04, 23–25). Le tessere e il
 * separatore ci sono sempre; i blocchi aspettano i dati (`StatoDatiPannello`:
 * `CARICO…`, o l'errore con RIPROVA). Cancella la dispensa ed Esci passano dal
 * Dialogo di conferma del provider (§D): la conferma riuscita lo chiude.
 */
export function Cima() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <TesserePannello />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px 0' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--testo-2)' }}>
          SI CAMBIANO DI RADO
        </span>
        <span aria-hidden="true" style={{ flex: 1, height: 1, background: 'var(--bordo)' }} />
      </div>
      <StatoDatiPannello>{(dati) => <BlocchiCima dati={dati} />}</StatoDatiPannello>
    </div>
  );
}

/** I cinque Blocchi di gruppo e il piede di versione, coi dati pronti. */
function BlocchiCima({ dati }: { dati: DatiPannello }) {
  const { entra, mostraDialogo } = usePannello();
  const { casaCambiata, cancellataIl, segnaCancellata } = useDatiPannello();
  const { impostazioni: imp, slotDefs, risparmio, utente } = dati;

  function apriCancella() {
    mostraDialogo({
      titolo: 'Cancellare la dispensa?',
      testo: 'Tutto quello che risulta in casa torna a zero, anche le confezioni in congelatore e i pronti. Piatti e piano restano. Non si può annullare.',
      azione: 'CANCELLA',
      tono: 'distruttivo',
      erroreTesto: 'Non siamo riusciti a cancellare la dispensa. Riprova.',
      onConferma: async () => {
        await cancellaDispensa();
        window.dispatchEvent(new Event(EVENTO_DISPENSA_CAMBIATA));
        // Nel provider, non qui: la nota dura fino alla chiusura del pannello (§D).
        segnaCancellata(new Date());
      },
    });
  }

  function apriEsci(email: string) {
    mostraDialogo({
      titolo: 'Uscire da Dispesa?',
      testo: `I tuoi dati restano. Per rientrare ti mandiamo un link a ${email}.`,
      azione: 'ESCI',
      tono: 'primario',
      erroreTesto: 'Non siamo riusciti a farti uscire. Riprova.',
      onConferma: () => esci(),
    });
  }

  return (
    <>
      {casaCambiata && <AvvisoCasaCambiata />}
      <BloccoGruppo titolo="La settimana di base">
        <RigaImpostazione
          nome="Pasti a casa"
          nota={NOTA_PASTI_A_CASA}
          finale={{ tipo: 'valore', valore: valorePastiACasa(fuoriCasa(slotDefs)), onApri: () => entra('pasti-a-casa') }}
        />
        <RigaImpostazione
          nome="Gestione dei pasti"
          nota="Quanti pasti fai al giorno e come si chiamano."
          finale={{ tipo: 'valore', valore: `${slotDefs.length} PASTI`, onApri: () => entra('gestione-pasti') }}
        />
        <RigaImpostazione
          nome="Rotazione del piano"
          nota="Se il tuo piano si ripete a blocchi di settimane."
          finale={{ tipo: 'valore', valore: valoreRotazione(imp.settimaneCiclo), onApri: () => entra('rotazione') }}
        />
      </BloccoGruppo>
      <BloccoGruppo titolo="Come calcolo la lista">
        <CampoPersone />
        <RigaImpostazione
          nome="Cadenza dei controlli"
          nota={NOTA_CADENZA}
          finale={{ tipo: 'valore', valore: testoCadenza(imp.giorniControllo), onApri: () => entra('cadenza') }}
        />
        <RigaImpostazione
          nome="Ingredienti"
          nota="Area, confezione e come si consuma."
          finale={{ tipo: 'valore', valore: '', onApri: () => entra('ingredienti') }}
        />
      </BloccoGruppo>
      <BloccoGruppo titolo="Come la vedi in corsia">
        <RigaImpostazione
          nome="Ordine delle aree"
          nota={NOTA_ORDINE}
          finale={{ tipo: 'valore', valore: ordinePersonalizzato(imp.ordineAree) ? 'PERSONALIZZATO' : 'DI BASE', onApri: () => entra('aree') }}
        />
      </BloccoGruppo>
      <BloccoGruppo titolo="I tuoi dati">
        {testoRisparmio(risparmio) && <NotaRisparmio riassunto={risparmio} />}
        <RigaImpostazione
          nome="Cancella la dispensa"
          nota={cancellataIl ? notaCancellata(cancellataIl) : NOTA_CANCELLA}
          finale={{ tipo: 'azione', onAzione: apriCancella }}
        />
      </BloccoGruppo>
      <BloccoGruppo titolo="Account">
        <RigaImpostazione nome={utente.nome} nota={utente.email} finale={{ tipo: 'niente' }} />
        <RigaImpostazione
          nome="Esci"
          nota="Per rientrare ti serve il link che ti mandiamo via email."
          finale={{ tipo: 'azione', tono: 'errore', onAzione: () => apriEsci(utente.email) }}
        />
      </BloccoGruppo>
      <p style={{ margin: 0, padding: '12px 6px 0', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--testo-2)' }}>
        {`Versione ${VERSIONE}`}
      </p>
    </>
  );
}
```

Note per chi implementa:
- Il piede di versione sta in fondo al corpo, che ha già `0 12 26` di padding (§B.1): `12px 6px 0` lo porta a 18 dal bordo e lascia il 26 del corpo sotto.
- `notaCancellata` usa l'ora locale del telefono, non UTC: è un'ora che si legge.
- `onConferma: () => esci()`: se `esci` riesce la pagina se ne va (`window.location.replace`), se rifiuta il dialogo mostra l'errore e resta aperto (§E.4: `esci` lancia solo se la sessione resta).
- `BlocchiCima` è un componente a parte perché i suoi hook stanno sotto `StatoDatiPannello`: si montano solo coi dati pronti.

- [ ] **Step 9: Monta la cima nel pannello.** In `schermate.tsx` (Task 6) `CIMA` diventa `Cima`:

```tsx
import { Cima } from './Cima';

/** Il contenuto della cima (spec §B.3, §B.4). */
export const CIMA: ComponentType = Cima;
```

  `CimaStati` e l'import di `StatoDatiPannello` escono da `schermate.tsx`. `Pannello.tsx` non si
  tocca: monta già `CIMA`.

  Il test del Task 6 `pannello.test.tsx` ora monta la cima vera. `CampoPersone` legge
  `MIN_PORZIONI` e `MAX_PORZIONI` al caricamento del modulo: il mock di `@/data/impostazioni`
  di quel test li ha già (Task 6). Gli altri moduli che la cima importa (`@/data/dispensa`,
  `@/data/sessione`) restano veri: il client di Supabase si crea solo alla prima chiamata
  [misurato: `src/data/supabase.ts`].

  Run: `npx vitest run src/components/pannello/__tests__/pannello.test.tsx`
  Expected: PASS. `CARICO…` e l'errore con `RIPROVA` vengono da `StatoDatiPannello` come
  prima.

- [ ] **Step 10: Il test della nota, `nota-risparmio.test.ts`.**

```ts
import { describe, it, expect } from 'vitest';
import { riassumiEvitato } from '@/domain/risparmio';
import { testoRisparmio } from '../NotaRisparmio';
import { voce } from './aiuti';

describe('testoRisparmio', () => {
  it('con quantità ed euro dice le tre cose, separate da ·', () => {
    const r = riassumiEvitato([
      voce({ confezioniEvitate: 5, quantitaEvitata: 2500, prezzoConfezione: 2 }),
      voce({ ingredientId: 'i-2', confezioniEvitate: 4, quantitaEvitata: 1600, prezzoConfezione: 5.5 }),
    ]);
    expect(testoRisparmio(r)).toBe('Da quando usi Dispesa: 9 confezioni non ricomprate · 4,1 kg · circa 32 €');
  });

  it('a una confezione usa il singolare', () => {
    expect(testoRisparmio(riassumiEvitato([voce({ confezioniEvitate: 1, quantitaEvitata: 500 })])))
      .toBe('Da quando usi Dispesa: 1 confezione non ricomprata · 500 g');
  });

  it('senza prezzi non dice gli euro', () => {
    expect(testoRisparmio(riassumiEvitato([voce({ confezioniEvitate: 2, quantitaEvitata: 1000 })])))
      .toBe('Da quando usi Dispesa: 2 confezioni non ricomprate · 1,0 kg');
  });

  it('con zero confezioni, o senza riassunto, la nota non c’è', () => {
    expect(testoRisparmio(riassumiEvitato([]))).toBeNull();
    expect(testoRisparmio(null)).toBeNull();
  });
});
```

Controlla i valori attesi contro `formattaQuantita` e `formattaEuro` veri prima di fissarli (es. `1,0 kg` per 1000 g).

- [ ] **Step 11: Il test della cima, `cima.test.tsx`.**

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';

// Il blocco dei finti (Step 1), identico in ogni test del pannello.
vi.mock('next/navigation', async () => (await import('./finti')).modNavigazione());
vi.mock('@/data/supabase', async () => (await import('./finti')).modSupabase());
vi.mock('@/data/impostazioni', async () => (await import('./finti')).modImpostazioni());
vi.mock('@/data/casa', async () => (await import('./finti')).modCasa());
vi.mock('@/data/risparmio', async () => (await import('./finti')).modRisparmio());
vi.mock('@/data/repertorio', async () => (await import('./finti')).modRepertorio());
vi.mock('@/data/dispensa', async () => (await import('./finti')).modDispensa());
vi.mock('@/data/sessione', async () => (await import('./finti')).modSessione());
vi.mock('@/data/esporta', async () => (await import('./finti')).modEsporta());
vi.mock('@/components/salva-file', async () => (await import('./finti')).modSalvaFile());

import { leggiImpostazioni } from '@/data/impostazioni';
import { cancellaDispensa, EVENTO_DISPENSA_CAMBIATA } from '@/data/dispensa';
import { esci } from '@/data/sessione';
import { ORDINE_AREE_DEFAULT } from '@/domain/aree';
import { usePannello } from '../PannelloProvider';
import { azzera, montaPannello, impostazioni, voce, COLAZIONE, CENA } from './aiuti';
import { percorso, router } from './finti';

/** L'indirizzo verso cui il pannello ha navigato: push o replace, come ha deciso il Task 6 dopo la sonda. */
function navigatoA(): string[] {
  return [...router.push.mock.calls, ...router.replace.mock.calls].map((c) => String(c[0]));
}

describe('La cima del pannello', () => {
  beforeEach(() => azzera());
  afterEach(() => vi.useRealTimers());

  it('durante il caricamento le tessere ci sono e si toccano; al posto dei blocchi CARICO…', async () => {
    vi.mocked(leggiImpostazioni).mockReturnValueOnce(new Promise(() => {}));
    montaPannello('cima');
    expect(await screen.findByRole('status')).toHaveTextContent('CARICO…');
    for (const nome of ['Piatti', 'Importa un piano', 'Casa condivisa', 'Esporta i tuoi dati']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${nome}`) })).toBeInTheDocument();
    }
    expect(screen.getByText('SI CAMBIANO DI RADO')).toBeInTheDocument();
    expect(screen.queryByText('La settimana di base')).not.toBeInTheDocument();
  });

  it('se il caricamento fallisce le tessere restano, e RIPROVA rilegge', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiImpostazioni).mockRejectedValueOnce(new Error('rete'));
    montaPannello('cima');
    expect(await screen.findByText('Non riusciamo a caricare le impostazioni. Controlla la connessione e tocca RIPROVA.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Piatti/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RIPROVA' }));
    expect(await screen.findByText('La settimana di base')).toBeInTheDocument();
    errore.mockRestore();
  });

  it('i cinque blocchi, coi valori veri nelle righe, e la versione in fondo', async () => {
    montaPannello('cima');
    expect(await screen.findByText('La settimana di base')).toBeInTheDocument();
    for (const t of ['Come calcolo la lista', 'Come la vedi in corsia', 'I tuoi dati', 'Account']) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
    // PRANZO è fuori il lunedì: una cella fuori casa.
    expect(screen.getByRole('button', { name: /Pasti a casa.*1 FUORI CASA/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gestione dei pasti.*3 PASTI/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rotazione del piano.*NESSUNA/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cadenza dei controlli.*OGNI 3 MESI/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ordine delle aree.*PERSONALIZZATO/ })).toBeInTheDocument();
    expect(screen.getByText('Andrea')).toBeInTheDocument();
    expect(screen.getByText('andrea@esempio.it')).toBeInTheDocument();
    expect(screen.getByText(/^Versione /)).toBeInTheDocument();
  });

  it('nessuna cella fuori casa, due settimane e l’ordine di base', async () => {
    montaPannello('cima', {
      pasti: [COLAZIONE, CENA, { ...COLAZIONE, id: 'sd-9', nome: 'Merenda', posizione: 2 }],
      impostazioni: { settimaneCiclo: 2, cicloOrigine: '2026-09-21', ordineAree: [...ORDINE_AREE_DEFAULT], giorniControllo: 30 },
    });
    expect(await screen.findByRole('button', { name: /Pasti a casa.*NESSUNO FUORI CASA/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rotazione del piano.*2 SETT\./ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ordine delle aree.*DI BASE/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cadenza dei controlli.*OGNI MESE/ })).toBeInTheDocument();
  });

  it('la tessera Casa dice lo stato della casa, e niente se la lettura fallisce', async () => {
    const { unmount } = montaPannello('cima', { casa: { ruolo: 'proprietario', email: ['a@b.it', 'c@d.it'], id: ['1', '2'] } });
    expect(await screen.findByRole('button', { name: /Casa condivisa.*CON 3 PERSONE/ })).toBeInTheDocument();
    unmount();

    const secondo = montaPannello('cima', { casa: { ruolo: 'membro', email: ['luca@esempio.it'], id: ['p'] } });
    expect(await screen.findByRole('button', { name: /Casa condivisa.*NELLA CASA DI LUCA/ })).toBeInTheDocument();
    secondo.unmount();

    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('cima', { casa: new Error('rete') });
    await screen.findByText('La settimana di base');
    expect(screen.getByRole('button', { name: /^Casa condivisa/ })).not.toHaveTextContent(/SOLO TU|PERSONE|NELLA CASA/);
    errore.mockRestore();
  });

  it('Piatti e Importa lasciano il pannello e salvano l’origine: la pagina sotto e la cima', async () => {
    percorso.valore = '/dispensa';
    montaPannello('cima');
    fireEvent.click(screen.getByRole('button', { name: /^Piatti/ }));
    await waitFor(() => expect(navigatoA()).toContain('/piatti?da=impostazioni'));
    expect(JSON.parse(sessionStorage.getItem('spesa:origine-pannello') ?? 'null')).toEqual({ pathname: '/dispensa', sotto: 'cima' });
  });

  it('Importa un piano porta a /importa', async () => {
    montaPannello('cima');
    fireEvent.click(screen.getByRole('button', { name: /^Importa un piano/ }));
    await waitFor(() => expect(navigatoA()).toContain('/importa'));
  });

  it('Casa ed Esporta aprono la loro sotto-schermata', async () => {
    montaPannello('cima');
    fireEvent.click(screen.getByRole('button', { name: /^Casa condivisa/ }));
    expect(await screen.findByRole('heading', { name: 'Casa condivisa' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Torna alle impostazioni' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Esporta i tuoi dati/ }));
    expect(await screen.findByRole('heading', { name: 'Esporta i tuoi dati' })).toBeInTheDocument();
  });

  // Migra «porta all elenco degli ingredienti»: l'elenco resta raggiungibile, ora dalla riga.
  it('la riga Ingredienti apre la sotto-schermata degli ingredienti', async () => {
    montaPannello('cima');
    fireEvent.click(await screen.findByRole('button', { name: /^Ingredienti/ }));
    expect(await screen.findByRole('heading', { name: 'Ingredienti' })).toBeInTheDocument();
  });

  // Migra «il link ordine dei reparti mostra l'anteprima e il riepilogo nell'ordine reale»:
  // l'anteprima è tolta (log §4.4); la riga dice PERSONALIZZATO / DI BASE e apre le aree.
  it('la riga Ordine delle aree dice se l’ordine è di base e apre la sotto-schermata', async () => {
    montaPannello('cima');
    fireEvent.click(await screen.findByRole('button', { name: /Ordine delle aree.*PERSONALIZZATO/ }));
    expect(await screen.findByRole('heading', { name: 'Ordine delle aree' })).toBeInTheDocument();
  });

  it('la nota del non ricomprato c’è solo con qualcosa da dire', async () => {
    const { unmount } = montaPannello('cima', { risparmio: [] });
    await screen.findByText('I tuoi dati');
    expect(screen.queryByText(/^Da quando usi Dispesa/)).not.toBeInTheDocument();
    unmount();
    montaPannello('cima', { risparmio: [voce({ confezioniEvitate: 1, quantitaEvitata: 500 })] });
    expect(await screen.findByText('Da quando usi Dispesa: 1 confezione non ricomprata · 500 g')).toBeInTheDocument();
  });

  it('Cancella la dispensa chiede conferma; ANNULLA non cancella niente', async () => {
    montaPannello('cima');
    fireEvent.click(await screen.findByRole('button', { name: /^Cancella la dispensa/ }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Cancellare la dispensa?')).toBeInTheDocument();
    expect(within(dialogo).getByText('Tutto quello che risulta in casa torna a zero, anche le confezioni in congelatore e i pronti. Piatti e piano restano. Non si può annullare.')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ANNULLA' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(cancellaDispensa).not.toHaveBeenCalled();
  });

  it('CANCELLA cancella, avvisa la Dispensa e scrive quando nella nota della riga', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 25, 10, 14));
    const ascolta = vi.fn();
    window.addEventListener(EVENTO_DISPENSA_CAMBIATA, ascolta);
    montaPannello('cima');
    fireEvent.click(await screen.findByRole('button', { name: /^Cancella la dispensa/ }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'CANCELLA' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(cancellaDispensa).toHaveBeenCalledTimes(1);
    expect(ascolta).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Cancellata il 25/09 alle 10:14.')).toBeInTheDocument();
    window.removeEventListener(EVENTO_DISPENSA_CAMBIATA, ascolta);
  });

  it('se la cancellazione fallisce il dialogo resta aperto con l’errore', async () => {
    vi.mocked(cancellaDispensa).mockRejectedValueOnce(new Error('rete'));
    montaPannello('cima');
    fireEvent.click(await screen.findByRole('button', { name: /^Cancella la dispensa/ }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'CANCELLA' }));
    expect(await within(dialogo).findByText('Non siamo riusciti a cancellare la dispensa. Riprova.')).toBeInTheDocument();
    expect(screen.queryByText(/^Cancellata il/)).not.toBeInTheDocument();
  });

  it('Esci chiede conferma con l’email, col tasto primario; ESCI chiama esci()', async () => {
    montaPannello('cima');
    fireEvent.click(await screen.findByRole('button', { name: /^Esci/ }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Uscire da Dispesa?')).toBeInTheDocument();
    expect(within(dialogo).getByText('I tuoi dati restano. Per rientrare ti mandiamo un link a andrea@esempio.it.')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ESCI' }));
    await waitFor(() => expect(esci).toHaveBeenCalledTimes(1));
  });

  it('se esci() fallisce il dialogo lo dice e resta aperto', async () => {
    vi.mocked(esci).mockRejectedValueOnce(new Error('rete'));
    montaPannello('cima');
    fireEvent.click(await screen.findByRole('button', { name: /^Esci/ }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ESCI' }));
    expect(await within(dialogo).findByText('Non siamo riusciti a farti uscire. Riprova.')).toBeInTheDocument();
  });

  it('la nota Cancellata dura fino alla chiusura del pannello, anche passando da una sotto-schermata (§D)', async () => {
    function Riapri() {
      const { apri } = usePannello();
      return <button type="button" onClick={() => apri()}>riapri</button>;
    }
    montaPannello('cima', undefined, <Riapri />);
    fireEvent.click(await screen.findByRole('button', { name: /^Cancella la dispensa/ }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'CANCELLA' }));
    expect(await screen.findByText(/^Cancellata il /)).toBeInTheDocument();
    // La cima si smonta entrando in una sotto-schermata: la nota vive nel provider.
    fireEvent.click(screen.getByRole('button', { name: /^Esporta i tuoi dati/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Torna alle impostazioni' }));
    expect(await screen.findByText(/^Cancellata il /)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi le impostazioni' }));
    fireEvent.click(screen.getByRole('button', { name: 'riapri' }));
    expect(await screen.findByText('Svuota quello che hai in casa. I piatti e il piano restano.')).toBeInTheDocument();
    expect(screen.queryByText(/^Cancellata il /)).not.toBeInTheDocument();
  });

  it('la riga Esci ha il nome in --errore (§B.4)', async () => {
    montaPannello('cima', { impostazioni: impostazioni() });
    const esciRiga = await screen.findByRole('button', { name: /^Esci/ });
    expect(within(esciRiga).getByText('Esci')).toHaveStyle({ color: 'var(--errore)' });
  });
});
```

`vi.useFakeTimers({ toFake: ['Date'] })` finge solo `Date`: `findBy` e `waitFor` continuano a usare i timer veri.

Il test «la nota Cancellata dura fino alla chiusura del pannello» passa per `cancellataIl` del provider (Task 6): se fallisce al ritorno dalla sotto-schermata, la nota è finita nello stato locale della cima.

- [ ] **Step 12: Il test delle persone, `persone.test.tsx`.**

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';

// Il blocco dei finti (Step 1).
vi.mock('next/navigation', async () => (await import('./finti')).modNavigazione());
vi.mock('@/data/supabase', async () => (await import('./finti')).modSupabase());
vi.mock('@/data/impostazioni', async () => (await import('./finti')).modImpostazioni());
vi.mock('@/data/casa', async () => (await import('./finti')).modCasa());
vi.mock('@/data/risparmio', async () => (await import('./finti')).modRisparmio());
vi.mock('@/data/repertorio', async () => (await import('./finti')).modRepertorio());
vi.mock('@/data/dispensa', async () => (await import('./finti')).modDispensa());
vi.mock('@/data/sessione', async () => (await import('./finti')).modSessione());
vi.mock('@/data/esporta', async () => (await import('./finti')).modEsporta());
vi.mock('@/components/salva-file', async () => (await import('./finti')).modSalvaFile());

import { leggiImpostazioni, leggiSlotDefs, salvaImpostazioni } from '@/data/impostazioni';
import { dimenticaIdCasa, statoCasa } from '@/data/casa';
import { azzera, montaPannello, impostazioni, ASSENZE_VUOTE, COLAZIONE, PRANZO, CENA } from './aiuti';

const NOTA = 'Moltiplica ogni porzione del piano. Vale se a tavola mangiate tutti la stessa porzione: se no, lascia 1 e scrivi le quantità giuste nei piatti.';
const campo = () => screen.getByLabelText('Per quante persone cucini, da 1 a 4');

async function scrivi(valore: string, come: 'blur' | 'invio' = 'blur') {
  fireEvent.change(campo(), { target: { value: valore } });
  if (come === 'invio') fireEvent.keyDown(campo(), { key: 'Enter' });
  else fireEvent.blur(campo());
}

describe('Per quante persone cucini', () => {
  beforeEach(() => azzera());

  it('sta in Come calcolo la lista, dichiara l’assunzione e parte da 1 senza la seconda nota', async () => {
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 1 } });
    expect(await screen.findByText('Per quante persone cucini')).toBeInTheDocument();
    expect(screen.getByText(NOTA)).toBeInTheDocument();
    expect(campo()).toHaveValue('1');
    expect(campo()).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByText('PERS')).toBeInTheDocument();
    expect(screen.queryByText(/La lista compra per/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /porzioni/ })).not.toBeInTheDocument();
    expect(salvaImpostazioni).not.toHaveBeenCalled();
  });

  it('scritto 2 e uscito dal campo salva le impostazioni intere, mostra 2 e dice per quanti compra la lista', async () => {
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 1 } });
    await screen.findByText('Per quante persone cucini');
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ moltiplicatorePorzioni: 2 }));
    await scrivi('2');
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    expect(vi.mocked(salvaImpostazioni).mock.calls[0][0]).toEqual(impostazioni({ moltiplicatorePorzioni: 2 }));
    await waitFor(() => expect(campo()).toHaveValue('2'));
    expect(screen.getByText('La lista compra per 2. Le porzioni nel piatto restano quelle scritte.')).toBeInTheDocument();
  });

  it('con Invio salva senza uscire dal campo: da 3 a 2', async () => {
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 3 } });
    await screen.findByText('Per quante persone cucini');
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ moltiplicatorePorzioni: 2 }));
    await scrivi('2', 'invio');
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    expect(vi.mocked(salvaImpostazioni).mock.calls[0][0].moltiplicatorePorzioni).toBe(2);
    await waitFor(() => expect(campo()).toHaveValue('2'));
  });

  it('5, 0, 2,5 e abc non si salvano: torna al valore di prima e chiede un numero da 1 a 4', async () => {
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 4 } });
    await screen.findByText('Per quante persone cucini');
    for (const sbagliato of ['5', '0', '2,5', 'abc']) {
      await scrivi(sbagliato);
      expect(campo()).toHaveValue('4');
      expect(screen.getByRole('alert')).toHaveTextContent('Scrivi un numero da 1 a 4.');
    }
    expect(salvaImpostazioni).not.toHaveBeenCalled();
    expect(screen.getByText('La lista compra per 4. Le porzioni nel piatto restano quelle scritte.')).toBeInTheDocument();
  });

  it('l’errore sparisce al gesto successivo', async () => {
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 1 } });
    await screen.findByText('Per quante persone cucini');
    await scrivi('9');
    expect(screen.getByText('Scrivi un numero da 1 a 4.')).toBeInTheDocument();
    fireEvent.change(campo(), { target: { value: '2' } });
    expect(screen.queryByText('Scrivi un numero da 1 a 4.')).not.toBeInTheDocument();
  });

  it('lo stesso valore non si salva', async () => {
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 2 } });
    await screen.findByText('Per quante persone cucini');
    await scrivi(' 2 ');
    expect(salvaImpostazioni).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mentre salva il campo è spento a 0,5', async () => {
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 1 } });
    await screen.findByText('Per quante persone cucini');
    vi.mocked(salvaImpostazioni).mockReturnValueOnce(new Promise(() => {}));
    await scrivi('2');
    await waitFor(() => expect(campo()).toBeDisabled());
    expect(campo().closest('label')).toHaveStyle({ opacity: '0.5' });
  });

  it('se il salvataggio fallisce torna al valore del server e lo dice sotto la riga', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 1 } });
    await screen.findByText('Per quante persone cucini');
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    await scrivi('2');
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare. Riprova.');
    expect(campo()).toHaveValue('1');
    // Una lettura al caricamento, una per il ritorno a prima.
    expect(leggiImpostazioni).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/La lista compra per/)).not.toBeInTheDocument();
    // Un errore qualsiasi non è un cambio di casa: la memoria dell'id resta.
    expect(dimenticaIdCasa).not.toHaveBeenCalled();
    expect(leggiSlotDefs).toHaveBeenCalledTimes(1);
    expect(statoCasa).toHaveBeenCalledTimes(1);
    errore.mockRestore();
  });

  it('se falliscono salvataggio e rilettura, torna all’ultimo valore confermato e lo dice', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 1 } });
    await screen.findByText('Per quante persone cucini');
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    vi.mocked(leggiImpostazioni).mockRejectedValue(new Error('rete'));
    await scrivi('2');
    expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(campo()).toHaveValue('1');
    errore.mockRestore();
  });

  // Prova del 15/09, ora nel pannello: il membro tolto dal proprietario scrive
  // con l'id vecchio e la RLS rifiuta. Si scarta l'id, si ricarica tutto, e lo
  // dice l'avviso sopra i blocchi, non l'errore della riga.
  it('se la RLS rifiuta (la casa è cambiata) scarta l’id, ricarica tutto e lo dice sopra i blocchi', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('cima', {
      impostazioni: { moltiplicatorePorzioni: 1 },
      casa: { ruolo: 'membro', email: ['a@b.it'], id: ['id-p'] },
    });
    expect(await screen.findByRole('button', { name: /Casa condivisa.*NELLA CASA DI A/ })).toBeInTheDocument();
    vi.mocked(salvaImpostazioni).mockRejectedValue({ code: '42501', message: 'new row violates row-level security policy for table "settings"' });
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ moltiplicatorePorzioni: 3 }));
    vi.mocked(leggiSlotDefs).mockResolvedValue([
      COLAZIONE,
      { id: 'sd-4', nome: 'Merenda', posizione: 1, assenzeAbituali: ASSENZE_VUOTE },
      { ...PRANZO, posizione: 2 },
      { ...CENA, posizione: 3 },
    ]);
    vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'solo', email: [], id: [] });

    await scrivi('2');

    expect(await screen.findByText('La casa è cambiata: dati ricaricati. Riprova.')).toBeInTheDocument();
    expect(dimenticaIdCasa).toHaveBeenCalledTimes(1);
    expect(leggiImpostazioni).toHaveBeenCalledTimes(2);
    expect(leggiSlotDefs).toHaveBeenCalledTimes(2);
    expect(statoCasa).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(campo()).toHaveValue('3'));
    expect(screen.getByRole('button', { name: /Gestione dei pasti.*4 PASTI/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Casa condivisa.*SOLO TU/ })).toBeInTheDocument();
    expect(screen.queryByText('Non siamo riusciti a salvare. Riprova.')).not.toBeInTheDocument();
    expect(salvaImpostazioni).toHaveBeenCalledTimes(1);
    errore.mockRestore();
  });

  it('un rifiuto RLS riconosciuto dal solo messaggio ricarica allo stesso modo', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('cima', { impostazioni: { moltiplicatorePorzioni: 1 } });
    await screen.findByText('Per quante persone cucini');
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('new row violates row-level security policy'));
    await scrivi('2');
    expect(await screen.findByText('La casa è cambiata: dati ricaricati. Riprova.')).toBeInTheDocument();
    expect(dimenticaIdCasa).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(campo()).toHaveValue('1'));
    errore.mockRestore();
  });
});
```

I conteggi delle letture (`toHaveBeenCalledTimes`) vengono dai test di oggi. Se il provider del Task 6 legge in un altro ordine o numero (per esempio rilegge anche utente e risparmio), adegua il numero e scrivi nel registro perché.

- [ ] **Step 13: Il registro.** In `docs/2026-09-25-fase5-decisioni-esecuzione.md`, tabella
  «Migrazione dei test», compila «Test nuovo» (regola del Task 1: file › titolo esatto) e
  «Nota» delle righe del Task 7:

| # | Test nuovo | Nota |
|---|---|---|
| 2 | `persone.test.tsx` › Per quante persone cucini › sta in Come calcolo la lista, dichiara l’assunzione e parte da 1 senza la seconda nota | lo stepper è tolto (§C.10): il − spento diventa «nessun tasto porzioni» |
| 3 | `persone.test.tsx` › Per quante persone cucini › scritto 2 e uscito dal campo salva le impostazioni intere, mostra 2 e dice per quanti compra la lista | il + diventa il campo |
| 4 | `persone.test.tsx` › Per quante persone cucini › 5, 0, 2,5 e abc non si salvano: torna al valore di prima e chiede un numero da 1 a 4 | il tetto è la validazione del campo |
| 5 | `persone.test.tsx` › Per quante persone cucini › con Invio salva senza uscire dal campo: da 3 a 2 | |
| 10 | `persone.test.tsx` › Per quante persone cucini › se falliscono salvataggio e rilettura, torna all’ultimo valore confermato e lo dice | |
| 11 | `persone.test.tsx` › Per quante persone cucini › se il salvataggio fallisce torna al valore del server e lo dice sotto la riga | |
| 12 | `persone.test.tsx` › Per quante persone cucini › se la RLS rifiuta (la casa è cambiata) scarta l’id, ricarica tutto e lo dice sopra i blocchi | «Fai la spesa con qualcuno?» diventa la tessera `SOLO TU`; `4 DI 6` diventa `4 PASTI` |
| 13 | `persone.test.tsx` › Per quante persone cucini › un rifiuto RLS riconosciuto dal solo messaggio ricarica allo stesso modo | |
| 14 | `cima.test.tsx` › La cima del pannello › la riga Ingredienti apre la sotto-schermata degli ingredienti | il link diventa una riga; l'elenco è del Task 9 |
| 24 | `cima.test.tsx` › La cima del pannello › la riga Ordine delle aree dice se l’ordine è di base e apre la sotto-schermata | anteprima e riepilogo tolti (log §4.4, §I): li sostituisce il valore `PERSONALIZZATO` / `DI BASE` |

  Nella tabella delle decisioni aggiungi, numerando di seguito:
  - i testi dal disegno usati (tabella in testa al task), confermati da Andrea il 26/09;
  - la regola degli apostrofi;
  - il campo spento in volo (frame 25) e la conseguenza sui test della coda (migrati sulla Cadenza, Task 9);
  - `StatoDatiPannello` che usa `Carico` ed `ErroreCaricamento` di `pezzi.tsx` (un disegno solo);
  - la nota «Cancellata il …» letta da `cancellataIl` del provider.

- [ ] **Step 14: Verifica.**

Run: `npx vitest run src/components/pannello/__tests__/nota-risparmio.test.ts src/components/pannello/__tests__/cima.test.tsx src/components/pannello/__tests__/persone.test.tsx`
Expected: tutti verdi. Poi i test del Task 6, che montano lo stesso pannello: `npx vitest run src/components/pannello` verde.

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npm run lint`
Expected: nessun errore.

I test della vecchia pagina (`src/app/(app)/impostazioni/__tests__/page.test.tsx`) restano e restano verdi: la pagina si cancella solo nel Task 11.

- [ ] **Step 15: Commit.**

```bash
git add src/components/pannello/pezzi.tsx src/components/pannello/RigaImpostazione.tsx src/components/pannello/TesserePannello.tsx src/components/pannello/NotaRisparmio.tsx src/components/pannello/CampoPersone.tsx src/components/pannello/Cima.tsx src/components/pannello/schermate.tsx src/components/pannello/DatiPannello.tsx src/components/pannello/__tests__/finti.ts src/components/pannello/__tests__/aiuti.tsx src/components/pannello/__tests__/nota-risparmio.test.ts src/components/pannello/__tests__/cima.test.tsx src/components/pannello/__tests__/persone.test.tsx docs/2026-09-25-fase5-decisioni-esecuzione.md
```

```bash
git commit -m "feat: la cima del pannello, con le tessere, le righe coi valori, il campo delle persone, Cancella la dispensa ed Esci

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: La settimana di base

Le tre sotto-schermate del primo Blocco: Pasti a casa (la matrice), Gestione dei pasti, Rotazione del piano. Tutto si salva al gesto, dal provider dei dati (`salvaPasti`, `salvaImpostazioni`). Due gesti passano dal Dialogo di conferma: Rimuovi un pasto che ha piatti, e Riparti dalla settimana 1.

**Obiettivo del task:** chi vuole cambiare i pasti di base, il loro numero e nome, o la rotazione, lo fa nel pannello con gli stessi effetti di oggi; togliere un pasto con piatti non succede più per un tocco sbagliato. Si misura coi test migrati qui sotto, più quelli nuovi su matrice, limiti e dialoghi.

**Questo task ha una review di correttezza su Rimuovi pasto** (ossatura, «Ordine e review»). La sezione «Per la review di correttezza» in fondo dice cosa va verificato.

**Files:**
- Create: `src/components/pannello/PastiACasa.tsx`
- Create: `src/components/pannello/GestionePasti.tsx`
- Create: `src/components/pannello/Rotazione.tsx`
- Modify: `src/components/pannello/schermate.tsx` (le tre voci)
- Test: `src/components/pannello/__tests__/pasti-a-casa.test.tsx`, `src/components/pannello/__tests__/gestione-pasti.test.tsx`, `src/components/pannello/__tests__/rotazione.test.tsx`
- Modify: `docs/2026-09-25-fase5-decisioni-esecuzione.md` (registro)

**Interfaces:**
- Consumes:
  - `StatoDatiPannello` (Task 6): le tre sotto-schermate vivono dei dati del pannello, e `CARICO…` e l'errore con RIPROVA sono i suoi;
  - `useDatiPannello()` → `salvaPasti`, `salvaImpostazioni`, `casaCambiata` (Task 6);
  - `usePannello()` → `mostraDialogo` (Task 6);
  - da `./pezzi` (Task 7): `STILE_BLOCCO`, `Nota`, `AvvisoCasaCambiata`, `TondoIcona`, `IconaFreccia`, `IconaCroce`, `ERRORE_SALVATAGGIO`; da `./Cima` (Task 7): `fuoriCasa`;
  - `MessaggioErrore`, `TastoSecondario` (Task 2, `@/components/controlli`); `Segmento` (di oggi, `variante="blocco"`);
  - `leggiRepertorio` (`@/data/repertorio`, di oggi); `MIN_PASTI`, `MAX_PASTI` (`@/domain/pasti`); `MAX_SETTIMANE_CICLO`, `settimanaDelCiclo` (`@/domain/ciclo`); `lunediDi` (`@/domain/date`);
  - l'aiuto di test del Task 7 (`finti.ts`, `aiuti.tsx`).
- Produces:
  - `PastiACasa()`, `riepilogoMatrice(defs: MealSlotDef[]): string`, `GIORNI_LUNGHI`;
  - `GestionePasti()`, `contaPerPasto(piatti: Dish[]): Map<string, number>`, `testoRimuoviPasto(n: number): string`;
  - `Rotazione()`, `dataInParole(iso: string): string`, `notaGiro(origine: string, oggi: string, settimane: number): string`;
  - le voci `pasti-a-casa`, `gestione-pasti`, `rotazione` di `SCHERMATE`.

**Le scelte di questo task** (vanno nel registro):
- **Le tre sotto-schermate passano da `StatoDatiPannello`** (Task 6): il componente esportato avvolge un componente interno che riceve i dati pronti, e i suoi hook stanno lì.
- **✕ con il repertorio non ancora letto, o con la lettura fallita** (confermato dal controller il 26/09). Il conteggio dei piatti si legge al montaggio della sotto-schermata con `leggiRepertorio()`. Se al tocco su ✕ il conteggio non c'è (lettura in corso o fallita), la ✕ **rilegge il repertorio in quel momento**, con la riga a 0,5. Poi decide: zero piatti, si toglie; uno o più, il dialogo. Se anche questa lettura fallisce, **non si toglie niente** e sotto il blocco compare `Non siamo riusciti a salvare. Riprova.`.
  Perché non il dialogo «alla cieca»: il suo testo ha bisogno di `{n}` (§D), e un testo senza numero non è nella spec. E senza rete il salvataggio fallirebbe comunque, quindi l'errore dice il vero.
- **Se il salvataggio fallisce dopo che la cancellazione è avvenuta** (`salvaSlotDefs` non è atomico), il provider rilegge i pasti dal server e la riga mostra l'errore (Task 6, decisione del controller del 26/09): un pasto già cancellato non torna a schermo.
- **Togliere un pasto con piatti cancella a cascata anche i lotti Pronti di quei piatti** (`porzione_pronta.dish_id … on delete cascade`, 0009). Il dialogo **non** cambia testo (§D): è un limite noto, e va nel registro (decisione del controller del 26/09).
- **Il campo del nome** tiene il testo scritto in una bozza locale e salva all'uscita dal campo, come oggi. Vuoto vale `Pasto`.
- **Il pasto nuovo va a fuoco** appena la sua riga compare, con un ref a callback: niente effetto che rincorre il fuoco a ogni cambio di dati.
- **Il segmento della rotazione resta toccabile mentre salva**, come oggi: la coda serializzata del provider regge i tocchi veloci.
- **Il tocco sul segmento già premuto non salva** (oggi salvava lo stesso valore).
- **`aria-label` delle celle:** `{Giorno}` è il nome lungo (`Lunedì`), `{pasto}` il nome del pasto com'è scritto. Esempio: `Lunedì Colazione: di base a casa, tocca per mettere fuori casa`.

**Testi dal disegno o proposti, confermati da Andrea il 26/09** (la spec §I li riporta):

| Dove | Testo | Fonte |
|---|---|---|
| Riepilogo della matrice | `Di base sei a casa per {a} pasti su {t}. La Lista conta solo quelli: i {f} fuori casa non entrano nella spesa.` | frame 05 |
| … con zero fuori casa | `Di base sei a casa per tutti i {t} pasti.` | variante del piano |
| … con un solo fuori casa | `… La Lista conta solo quelli: l'unico fuori casa non entra nella spesa.` | variante del piano |
| … con un solo pasto a casa | `Di base sei a casa per 1 pasto su {t}. …` | variante del piano |

**La nota di Gestione dei pasti** è quella di oggi con «nel Piano» (§I). Dice ancora `I giorni segnati qui vengono già spenti…`, ma i giorni ora stanno in Pasti a casa: la frase è diventata imprecisa. **Non si riscrive:** resta come dice §I, e la domanda va nel registro, in «Domande per Andrea (in review)» (Step 8).

- [ ] **Step 1: `PastiACasa.tsx`.**

La casetta è quella della Riga pasto (`src/components/RigaPasto.tsx:96-98`, `viewBox="0 0 20 20"`) [misurato], qui bianca a 16.

```tsx
'use client';

import { useState } from 'react';
import type { MealSlotDef } from '@/domain/types';
import { MessaggioErrore } from '@/components/controlli';
import { StatoDatiPannello, useDatiPannello } from './DatiPannello';
import { fuoriCasa } from './Cima';
import { AvvisoCasaCambiata, ERRORE_SALVATAGGIO, Nota, STILE_BLOCCO } from './pezzi';

const SIGLE = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
export const GIORNI_LUNGHI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const NOTA_MATRICE = 'La casetta vuol dire che quel pasto lo fai a casa. Ogni settimana nuova nasce così: nel Piano puoi correggere il singolo giorno senza cambiare questo default.';

/**
 * Il riepilogo sotto la matrice (§C.1, frame 05), ricalcolato a ogni tocco.
 * Testo dal disegno e varianti del piano, confermati da Andrea il 26/09 (§I).
 */
export function riepilogoMatrice(defs: MealSlotDef[]): string {
  const totale = defs.length * 7;
  const fuori = fuoriCasa(defs);
  const aCasa = totale - fuori;
  if (fuori === 0) return `Di base sei a casa per tutti i ${totale} pasti.`;
  const prima = aCasa === 1 ? `Di base sei a casa per 1 pasto su ${totale}.` : `Di base sei a casa per ${aCasa} pasti su ${totale}.`;
  const seconda = fuori === 1
    ? "La Lista conta solo quelli: l'unico fuori casa non entra nella spesa."
    : `La Lista conta solo quelli: i ${fuori} fuori casa non entrano nella spesa.`;
  return `${prima} ${seconda}`;
}

/** La casetta della Riga pasto, bianca a 16 (§C.1). */
function Casetta() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2.8 17.4 9.1v7.5a1 1 0 0 1-1 1h-3.6v-4.2H7.2v4.2H3.6a1 1 0 0 1-1-1V9.1Z" fill="var(--superficie)" />
    </svg>
  );
}

/**
 * Pasti a casa (§C.1, frame 05): i pasti in riga, i giorni in colonna, sulla
 * larghezza piena del corpo. Le sigle dei giorni stanno una volta sola in cima,
 * ferme mentre il corpo scorre. Ogni tocco salva `assenze_abituali` del pasto;
 * se il salvataggio fallisce la cella torna com'era (il provider) e sotto la
 * matrice compare l'errore.
 */
export function PastiACasa() {
  return <StatoDatiPannello>{(dati) => <Matrice defs={dati.slotDefs} />}</StatoDatiPannello>;
}

function Matrice({ defs }: { defs: MealSlotDef[] }) {
  const { salvaPasti, casaCambiata } = useDatiPannello();
  const [errore, setErrore] = useState(false);

  async function tocca(id: string, giorno: number) {
    setErrore(false);
    const nuovi = defs.map((d) => {
      if (d.id !== id) return d;
      const assenze = [...d.assenzeAbituali];
      assenze[giorno] = !assenze[giorno];
      return { ...d, assenzeAbituali: assenze };
    });
    if (!(await salvaPasti(nuovi))) setErrore(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {casaCambiata && <AvvisoCasaCambiata />}
      <div
        aria-hidden="true"
        data-testid="sigle-giorni"
        style={{
          position: 'sticky', top: 0, zIndex: 1, background: 'var(--fondo)', padding: '4px 0',
          display: 'flex', gap: 4, textAlign: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ter)',
        }}
      >
        {SIGLE.map((s, i) => <span key={i} style={{ flex: 1 }}>{s}</span>)}
      </div>
      {defs.map((d) => (
        <div key={d.id} role="group" aria-label={d.nome} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ padding: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink)' }}>
            {d.nome}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {d.assenzeAbituali.map((fuori, g) => {
              const aCasa = !fuori;
              return (
                <button
                  key={g}
                  type="button"
                  className="anim-stato"
                  aria-pressed={aCasa}
                  aria-label={`${GIORNI_LUNGHI[g]} ${d.nome}: ${aCasa ? 'di base a casa, tocca per mettere fuori casa' : 'di base fuori casa, tocca per mettere a casa'}`}
                  onClick={() => void tocca(d.id, g)}
                  style={{
                    flex: 1, minWidth: 0, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: aCasa ? 'var(--ink)' : 'var(--superficie)',
                    border: aCasa ? '1px solid var(--ink)' : '1px solid var(--bordo)',
                    boxShadow: aCasa ? 'var(--ombra-casetta)' : 'none',
                  }}
                >
                  {aCasa && <Casetta />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {errore && !casaCambiata && <MessaggioErrore ruolo="alert">{ERRORE_SALVATAGGIO}</MessaggioErrore>}
      <section style={{ ...STILE_BLOCCO, marginTop: 4, padding: '12px 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Nota>{NOTA_MATRICE}</Nota>
        <Nota ruolo="status">{riepilogoMatrice(defs)}</Nota>
      </section>
    </div>
  );
}
```

A 360 il corpo è largo 336: celle da (336 − 24) / 7 = 44,6 (§C.1). In jsdom non si misura: la prova a 360 × 800 con sei pasti è della sonda nel browser (§M.3 punto 2). Qui i test controllano `flex: 1`, `height: 44px` e il gap.

- [ ] **Step 2: `GestionePasti.tsx`.**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { Dish, MealSlotDef } from '@/domain/types';
import { MAX_PASTI, MIN_PASTI } from '@/domain/pasti';
import { leggiRepertorio } from '@/data/repertorio';
import { MessaggioErrore } from '@/components/controlli';
import { usePannello } from './PannelloProvider';
import { StatoDatiPannello, useDatiPannello } from './DatiPannello';
import {
  AvvisoCasaCambiata, ERRORE_SALVATAGGIO, IconaCroce, IconaFreccia, Nota, STILE_BLOCCO, TondoIcona,
} from './pezzi';

const ASSENZE_VUOTE = [false, false, false, false, false, false, false];
// La nota di oggi, con «nel Piano» al posto di «nella Settimana» (§I).
const NOTA_GESTIONE = 'Da tre a sei pasti, nell’ordine in cui li fai. I giorni segnati qui vengono già spenti quando si apre una settimana nuova: nel Piano correggi solo le eccezioni — le settimane già create non cambiano.';

/** Reindicizza `posizione` sull'ordine dell'array: a ogni aggiunta, rimozione o riordino. */
function conPosizioni(lista: MealSlotDef[]): MealSlotDef[] {
  return lista.map((p, i) => ({ ...p, posizione: i }));
}

/**
 * Quanti piatti attivi ha ogni pasto. `leggiRepertorio` restituisce solo i
 * piatti attivi: quelli disattivati se ne vanno a cascata anche loro, ma
 * l'utente non li vede e non si contano (§C.2).
 */
export function contaPerPasto(piatti: Dish[]): Map<string, number> {
  const conta = new Map<string, number>();
  for (const p of piatti) conta.set(p.slotDefId, (conta.get(p.slotDefId) ?? 0) + 1);
  return conta;
}

/** Il testo del dialogo `rimuovi-pasto` (§D). */
export function testoRimuoviPasto(n: number): string {
  return n === 1
    ? 'Se ne va anche il suo piatto, e il pasto sparisce dal piano. Non si può annullare.'
    : `Se ne vanno anche i suoi ${n} piatti, e il pasto sparisce dal piano. Non si può annullare.`;
}

/**
 * Gestione dei pasti (§C.2, frame 06–07): nome, ordine, aggiunta e rimozione,
 * da MIN_PASTI a MAX_PASTI. Ogni gesto salva l'insieme intero con `salvaPasti`
 * (che riscrive con `salvaSlotDefs`). Togliere un pasto cancella a cascata i
 * suoi piatti e le sue righe del piano (0001_schema.sql): con piatti chiede il
 * dialogo, senza si toglie al tocco (decisione 12).
 */
export function GestionePasti() {
  return <StatoDatiPannello>{(dati) => <ElencoPasti defs={dati.slotDefs} />}</StatoDatiPannello>;
}

function ElencoPasti({ defs }: { defs: MealSlotDef[] }) {
  const { mostraDialogo } = usePannello();
  const { salvaPasti, casaCambiata } = useDatiPannello();
  const [bozze, setBozze] = useState<Record<string, string>>({});
  const [inVolo, setInVolo] = useState<string | null>(null);
  const [errore, setErrore] = useState(false);
  // null = il repertorio non è (ancora) letto: la ✕ lo rilegge al tocco.
  const [piatti, setPiatti] = useState<Map<string, number> | null>(null);
  const daMettereAFuoco = useRef<string | null>(null);

  useEffect(() => {
    let vivo = true;
    leggiRepertorio()
      .then((r) => {
        if (vivo) setPiatti(contaPerPasto(r));
      })
      .catch((e) => console.error('gestione pasti: lettura del repertorio fallita.', e));
    return () => {
      vivo = false;
    };
  }, []);

  const alMinimo = defs.length <= MIN_PASTI;
  const alMassimo = defs.length >= MAX_PASTI;

  async function salva(nuovi: MealSlotDef[], riga: string): Promise<boolean> {
    setErrore(false);
    setInVolo(riga);
    const ok = await salvaPasti(nuovi);
    setInVolo(null);
    if (!ok) setErrore(true);
    return ok;
  }

  function sposta(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= defs.length) return;
    const copia = [...defs];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    void salva(conPosizioni(copia), defs[i].id);
  }

  function aggiungi() {
    if (alMassimo) return;
    const nuovo: MealSlotDef = { id: crypto.randomUUID(), nome: 'Nuovo pasto', posizione: defs.length, assenzeAbituali: [...ASSENZE_VUOTE] };
    daMettereAFuoco.current = nuovo.id;
    void salva(conPosizioni([...defs, nuovo]), nuovo.id);
  }

  function confermaNome(d: MealSlotDef) {
    const bozza = bozze[d.id];
    if (bozza === undefined) return;
    const nome = bozza.trim() || 'Pasto';
    setBozze((b) => {
      const copia = { ...b };
      delete copia[d.id];
      return copia;
    });
    if (nome !== d.nome) void salva(defs.map((p) => (p.id === d.id ? { ...p, nome } : p)), d.id);
  }

  async function rimuovi(d: MealSlotDef) {
    if (alMinimo) return;
    setErrore(false);
    let conta = piatti;
    if (conta === null) {
      // Senza sapere se il pasto ha piatti non si toglie niente: si rilegge ora.
      setInVolo(d.id);
      try {
        conta = contaPerPasto(await leggiRepertorio());
        setPiatti(conta);
      } catch (e) {
        console.error('gestione pasti: lettura del repertorio fallita.', e);
        setInVolo(null);
        setErrore(true);
        return;
      }
      setInVolo(null);
    }
    const n = conta.get(d.id) ?? 0;
    const nuovi = conPosizioni(defs.filter((p) => p.id !== d.id));
    if (n === 0) {
      await salva(nuovi, d.id);
      return;
    }
    mostraDialogo({
      titolo: `Togliere ${d.nome}?`,
      testo: testoRimuoviPasto(n),
      azione: 'TOGLI',
      tono: 'distruttivo',
      erroreTesto: ERRORE_SALVATAGGIO,
      onConferma: async () => {
        if (!(await salvaPasti(nuovi))) throw new Error('rimuovi pasto: salvataggio fallito');
        setPiatti((m) => {
          if (!m) return m;
          const copia = new Map(m);
          copia.delete(d.id);
          return copia;
        });
      },
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {casaCambiata && <AvvisoCasaCambiata />}
      <section style={{ ...STILE_BLOCCO, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px 2px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em' }}>
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>I TUOI PASTI</span>
          <span style={{ fontWeight: 500, letterSpacing: '0.1em', color: 'var(--sec)' }}>{`${defs.length} DI ${MAX_PASTI}`}</span>
        </div>
        {defs.map((d, i) => {
          const primo = i === 0;
          const ultimo = i === defs.length - 1;
          return (
            <div key={d.id} data-testid={`riga-pasto-${d.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: inVolo === d.id ? 0.5 : 1 }}>
              <input
                type="text"
                aria-label="Nome del pasto"
                value={bozze[d.id] ?? d.nome}
                onChange={(e) => setBozze((b) => ({ ...b, [d.id]: e.target.value }))}
                onBlur={() => confermaNome(d)}
                ref={(el) => {
                  if (el && daMettereAFuoco.current === d.id) {
                    daMettereAFuoco.current = null;
                    el.focus();
                    el.select();
                  }
                }}
                style={{
                  flex: 1, minWidth: 0, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 14px',
                  background: 'var(--superficie)', border: '1px solid var(--bordo)', boxShadow: 'var(--ombra-pannello)',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: 'var(--ink)', outline: 'none',
                }}
              />
              <span style={{ display: 'flex', gap: 4, flex: 'none' }}>
                <TondoIcona etichetta={`Sposta ${d.nome} in alto`} spento={primo} onClick={() => sposta(i, -1)}>
                  <IconaFreccia verso="su" spenta={primo} />
                </TondoIcona>
                <TondoIcona etichetta={`Sposta ${d.nome} in basso`} spento={ultimo} onClick={() => sposta(i, 1)}>
                  <IconaFreccia verso="giu" spenta={ultimo} />
                </TondoIcona>
                <TondoIcona etichetta={`Rimuovi ${d.nome}`} spento={alMinimo} onClick={() => void rimuovi(d)}>
                  <IconaCroce spenta={alMinimo} />
                </TondoIcona>
              </span>
            </div>
          );
        })}
        {alMinimo && <Nota>Tre pasti sono il minimo.</Nota>}
        {alMassimo ? (
          <Nota>Sei pasti sono il massimo.</Nota>
        ) : (
          <button
            type="button"
            onClick={aggiungi}
            style={{
              height: 56, marginTop: 4, boxSizing: 'border-box', borderRadius: 14, border: '2px dashed var(--bordo-tratteggio)',
              background: 'none', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" />
            </svg>
            AGGIUNGI PASTO
          </button>
        )}
      </section>
      {errore && !casaCambiata && <MessaggioErrore ruolo="alert">{ERRORE_SALVATAGGIO}</MessaggioErrore>}
      <p style={{ margin: 0, padding: '0 8px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--testo-2)' }}>{NOTA_GESTIONE}</p>
    </div>
  );
}
```

Note per chi implementa:
- Gli hook stanno in `ElencoPasti`, che si monta solo coi dati pronti: il repertorio si legge da lì, e non ci sono `return` anticipati.
- A 3 pasti le ✕ sono spente **e** c'è la nota; a 6 `AGGIUNGI PASTO` **non c'è** (frame 07): è la regola del Dock, «un'azione che non si può fare non si mostra spenta» (log §8, frame 07 «Regole»).
- `nuovi` si calcola al tocco, prima del dialogo: mentre il dialogo è aperto il pannello sotto non si tocca.

- [ ] **Step 3: `Rotazione.tsx`.**

`dataInParole` e i testi delle note si spostano dalla pagina di oggi (`impostazioni/page.tsx:19-28` e `472-479`) senza cambiarli. Il contatore diventa `SETTIMANA {k} DI {n}` (decisione 14).

```tsx
'use client';

import { useState } from 'react';
import type { Impostazioni } from '@/domain/types';
import { Segmento } from '@/components/Segmento';
import { MessaggioErrore, TastoSecondario } from '@/components/controlli';
import { MAX_SETTIMANE_CICLO, settimanaDelCiclo } from '@/domain/ciclo';
import { lunediDi } from '@/domain/date';
import { usePannello } from './PannelloProvider';
import { StatoDatiPannello, useDatiPannello } from './DatiPannello';
import { AvvisoCasaCambiata, ERRORE_SALVATAGGIO, Nota, STILE_BLOCCO } from './pezzi';

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

/** "24 agosto": una data ISO in mezzo a una frase si legge come un codice, non come un giorno. */
export function dataInParole(iso: string): string {
  const [, mese, giorno] = iso.split('-');
  return `${Number(giorno)} ${MESI[Number(mese) - 1]}`;
}

const OPZIONI_CICLO = Array.from({ length: MAX_SETTIMANE_CICLO }, (_, i) => ({
  id: String(i + 1),
  label: i === 0 ? 'NESSUNA' : `${i + 1} SETT.`,
}));

const NOTA_SENZA_GIRO = 'I piatti ruotano uno dopo l’altro, senza giro fisso. Scegli due o più settimane se il tuo piano si ripete a blocchi: ogni piatto potrà dire a quale settimana appartiene.';

/** La nota col giro, di oggi: «è cominciato» se il lunedì è passato (o è oggi), «comincia» se è futuro. */
export function notaGiro(origine: string, oggi: string, settimane: number): string {
  const verbo = origine > oggi ? 'comincia' : 'è cominciato';
  return `Il giro ${verbo} lunedì ${dataInParole(origine)}. Ogni piatto può dire a quale delle ${settimane} settimane appartiene, e in che giorno: chi non lo dice resta buono per tutte.`;
}

/**
 * Rotazione del piano (§C.3, frame 08–10). Il segmento salva al tocco
 * `settimane_ciclo`; `salvaImpostazioni` del data layer àncora da sé l'origine
 * al lunedì corrente quando il ciclo passa sopra 1. RIPARTI apre il dialogo
 * `riparti` (§D), ed è spento se l'origine è già il lunedì corrente.
 */
export function Rotazione() {
  return <StatoDatiPannello>{(dati) => <Ciclo imp={dati.impostazioni} />}</StatoDatiPannello>;
}

function Ciclo({ imp }: { imp: Impostazioni }) {
  const { mostraDialogo } = usePannello();
  const { salvaImpostazioni, casaCambiata } = useDatiPannello();
  const [errore, setErrore] = useState(false);
  // La stessa «oggi» della pagina di oggi (UTC), perché la stessa di salvaImpostazioni.
  const oggi = new Date().toISOString().slice(0, 10);
  const lunediCorrente = lunediDi(oggi);
  const n = imp.settimaneCiclo;
  const k = settimanaDelCiclo({ lunedi: lunediCorrente, origine: imp.cicloOrigine, settimaneCiclo: n });
  const giaDaQuestoLunedi = imp.cicloOrigine === lunediCorrente;

  async function cambia(id: string) {
    const scelto = Number(id);
    if (scelto === n) return;
    setErrore(false);
    if (!(await salvaImpostazioni({ settimaneCiclo: scelto }))) setErrore(true);
  }

  function apriRiparti() {
    mostraDialogo({
      titolo: 'Ripartire dalla settimana 1?',
      testo: `Da lunedì ${dataInParole(lunediCorrente)} il piano riparte dalla settimana 1 di ${n}. Le settimane già create non cambiano.`,
      azione: 'RIPARTI DA LUNEDÌ',
      tono: 'distruttivo',
      erroreTesto: 'Non siamo riusciti a ripartire. Riprova.',
      onConferma: async () => {
        if (!(await salvaImpostazioni({ cicloOrigine: lunediCorrente }))) throw new Error('riparti: salvataggio fallito');
      },
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {casaCambiata && <AvvisoCasaCambiata />}
      <section style={{ ...STILE_BLOCCO, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: 0, padding: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
          OGNI QUANTE SETTIMANE SI RIPETE
        </h3>
        <Segmento variante="blocco" opzioni={OPZIONI_CICLO} valore={String(n)} onCambia={(id) => void cambia(id)} />
        {errore && !casaCambiata && <MessaggioErrore ruolo="alert">{ERRORE_SALVATAGGIO}</MessaggioErrore>}
        {n > 1 && (
          <div style={{ borderRadius: 14, background: 'rgba(20,22,58,0.04)', padding: 14, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.09em', color: 'var(--ink)' }}>
            {`SETTIMANA ${k} DI ${n}`}
          </div>
        )}
        <Nota>{n > 1 ? notaGiro(imp.cicloOrigine ?? lunediCorrente, oggi, n) : NOTA_SENZA_GIRO}</Nota>
        {n > 1 && (
          <TastoSecondario onClick={apriRiparti} disabled={giaDaQuestoLunedi} style={{ marginTop: 2 }}>
            RIPARTI DALLA SETTIMANA 1
          </TastoSecondario>
        )}
      </section>
    </div>
  );
}
```

`{data}` del dialogo è il lunedì corrente in forma lunga, come dice §D. Il disegno (frame 10) mostra il lunedì successivo («28 settembre» il 25/09): vale il codice di oggi, che la conferma scrive (`cicloOrigine = lunedì corrente`). Deciso dal controller il 26/09; la spec lo scrive in §N. Scrivilo nel registro.

- [ ] **Step 4: Registra le tre sotto-schermate.** In `schermate.tsx` (Task 6) sostituisci i segnaposto delle tre voci:

```tsx
import { PastiACasa } from './PastiACasa';
import { GestionePasti } from './GestionePasti';
import { Rotazione } from './Rotazione';

// dentro SCHERMATE:
'pasti-a-casa': { titolo: 'Pasti a casa', Componente: PastiACasa },
'gestione-pasti': { titolo: 'Gestione dei pasti', Componente: GestionePasti },
rotazione: { titolo: 'Rotazione del piano', Componente: Rotazione },
```

I titoli li ha scritti il Task 6: cambia solo `Componente`.

- [ ] **Step 5: Il test della matrice, `pasti-a-casa.test.tsx`.**

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';

// Il blocco dei finti (Task 7, Step 1).
vi.mock('next/navigation', async () => (await import('./finti')).modNavigazione());
vi.mock('@/data/supabase', async () => (await import('./finti')).modSupabase());
vi.mock('@/data/impostazioni', async () => (await import('./finti')).modImpostazioni());
vi.mock('@/data/casa', async () => (await import('./finti')).modCasa());
vi.mock('@/data/risparmio', async () => (await import('./finti')).modRisparmio());
vi.mock('@/data/repertorio', async () => (await import('./finti')).modRepertorio());
vi.mock('@/data/dispensa', async () => (await import('./finti')).modDispensa());
vi.mock('@/data/sessione', async () => (await import('./finti')).modSessione());
vi.mock('@/data/esporta', async () => (await import('./finti')).modEsporta());
vi.mock('@/components/salva-file', async () => (await import('./finti')).modSalvaFile());

import { salvaSlotDefs } from '@/data/impostazioni';
import { riepilogoMatrice } from '../PastiACasa';
import { azzera, montaPannello, ASSENZE_VUOTE, COLAZIONE, PRANZO, CENA } from './aiuti';

describe('Pasti a casa', () => {
  beforeEach(() => azzera());

  it('una riga per pasto col nome, sette celle, le sigle dei giorni una volta sola e ferme', async () => {
    montaPannello('pasti-a-casa');
    const colazione = await screen.findByRole('group', { name: 'Colazione' });
    expect(within(colazione).getAllByRole('button')).toHaveLength(7);
    expect(screen.getByRole('group', { name: 'Pranzo' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cena' })).toBeInTheDocument();
    expect(screen.getAllByTestId('sigle-giorni')).toHaveLength(1);
    expect(screen.getByTestId('sigle-giorni')).toHaveStyle({ position: 'sticky' });
  });

  // Migra «la pastiglia del giorno abitualmente fuori casa ha 44px di area di tap sopra una pillola di 36px».
  it('ogni cella è alta 44 e divide la larghezza con le altre (flex: 1)', async () => {
    montaPannello('pasti-a-casa');
    const cella = await screen.findByLabelText('Lunedì Colazione: di base a casa, tocca per mettere fuori casa');
    expect(cella).toHaveStyle({ height: '44px', flex: '1' });
  });

  it('a casa: premuta, con la casetta; fuori: non premuta, vuota; l’aria-label dice cosa fa il tocco', async () => {
    montaPannello('pasti-a-casa');
    const aCasa = await screen.findByLabelText('Lunedì Colazione: di base a casa, tocca per mettere fuori casa');
    expect(aCasa).toHaveAttribute('aria-pressed', 'true');
    expect(aCasa.querySelector('svg')).not.toBeNull();
    const fuori = screen.getByLabelText('Lunedì Pranzo: di base fuori casa, tocca per mettere a casa');
    expect(fuori).toHaveAttribute('aria-pressed', 'false');
    expect(fuori.querySelector('svg')).toBeNull();
  });

  // Migra «accende una pastiglia del giorno e salva le assenze abituali aggiornate».
  it('un tocco mette Colazione fuori casa il lunedì e salva le assenze aggiornate', async () => {
    montaPannello('pasti-a-casa');
    fireEvent.click(await screen.findByLabelText('Lunedì Colazione: di base a casa, tocca per mettere fuori casa'));
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledWith([
      { ...COLAZIONE, assenzeAbituali: [true, false, false, false, false, false, false] },
      PRANZO,
      CENA,
    ]));
    expect(await screen.findByLabelText('Lunedì Colazione: di base fuori casa, tocca per mettere a casa')).toHaveAttribute('aria-pressed', 'false');
  });

  it('se il salvataggio fallisce la cella torna com’era e sotto la matrice c’è l’errore', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('pasti-a-casa');
    vi.mocked(salvaSlotDefs).mockRejectedValueOnce(new Error('rete'));
    fireEvent.click(await screen.findByLabelText('Lunedì Colazione: di base a casa, tocca per mettere fuori casa'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare. Riprova.');
    expect(screen.getByLabelText('Lunedì Colazione: di base a casa, tocca per mettere fuori casa')).toHaveAttribute('aria-pressed', 'true');
    errore.mockRestore();
  });

  it('la nota e il riepilogo, che si ricalcola al tocco', async () => {
    montaPannello('pasti-a-casa');
    expect(await screen.findByText('La casetta vuol dire che quel pasto lo fai a casa. Ogni settimana nuova nasce così: nel Piano puoi correggere il singolo giorno senza cambiare questo default.')).toBeInTheDocument();
    const riepilogo = screen.getByRole('status');
    expect(riepilogo).toHaveTextContent("Di base sei a casa per 20 pasti su 21. La Lista conta solo quelli: l'unico fuori casa non entra nella spesa.");
    fireEvent.click(screen.getByLabelText('Martedì Cena: di base a casa, tocca per mettere fuori casa'));
    await waitFor(() => expect(riepilogo).toHaveTextContent('Di base sei a casa per 19 pasti su 21. La Lista conta solo quelli: i 2 fuori casa non entrano nella spesa.'));
  });

  it('sei pasti: sei righe di sette celle', async () => {
    const sei = Array.from({ length: 6 }, (_, i) => ({ id: `sd-${i}`, nome: `Pasto ${i}`, posizione: i, assenzeAbituali: ASSENZE_VUOTE }));
    montaPannello('pasti-a-casa', { pasti: sei });
    expect(await screen.findAllByRole('group')).toHaveLength(6);
  });
});

describe('riepilogoMatrice', () => {
  it('nessun pasto fuori casa', () => {
    expect(riepilogoMatrice([COLAZIONE, CENA, { ...CENA, id: 'x' }])).toBe('Di base sei a casa per tutti i 21 pasti.');
  });
});
```

`findAllByRole('group')` conta i `group` di tutto il pannello: il contenitore del Task 6 non ne ha, quindi sono le righe della matrice.

- [ ] **Step 6: Il test della gestione, `gestione-pasti.test.tsx`.**

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';

// Il blocco dei finti (Task 7, Step 1).
vi.mock('next/navigation', async () => (await import('./finti')).modNavigazione());
vi.mock('@/data/supabase', async () => (await import('./finti')).modSupabase());
vi.mock('@/data/impostazioni', async () => (await import('./finti')).modImpostazioni());
vi.mock('@/data/casa', async () => (await import('./finti')).modCasa());
vi.mock('@/data/risparmio', async () => (await import('./finti')).modRisparmio());
vi.mock('@/data/repertorio', async () => (await import('./finti')).modRepertorio());
vi.mock('@/data/dispensa', async () => (await import('./finti')).modDispensa());
vi.mock('@/data/sessione', async () => (await import('./finti')).modSessione());
vi.mock('@/data/esporta', async () => (await import('./finti')).modEsporta());
vi.mock('@/components/salva-file', async () => (await import('./finti')).modSalvaFile());

import type { MealSlotDef } from '@/domain/types';
import { leggiSlotDefs, salvaSlotDefs } from '@/data/impostazioni';
import { leggiRepertorio } from '@/data/repertorio';
import { azzera, montaPannello, piatto, ASSENZE_VUOTE, COLAZIONE, PRANZO, CENA } from './aiuti';

const SPUNTINO: MealSlotDef = { id: 'sd-4', nome: 'Spuntino', posizione: 3, assenzeAbituali: ASSENZE_VUOTE };
const QUATTRO = [COLAZIONE, PRANZO, CENA, SPUNTINO];

describe('Gestione dei pasti', () => {
  beforeEach(() => azzera());

  // Migra «mostra i pasti reali letti da leggiSlotDefs, non i quattro cablati nel mock dell’artboard».
  it('mostra i pasti letti da leggiSlotDefs e il contatore', async () => {
    montaPannello('gestione-pasti');
    expect(await screen.findByDisplayValue('Colazione')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pranzo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cena')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Spuntino')).not.toBeInTheDocument();
    expect(screen.getByText('I TUOI PASTI')).toBeInTheDocument();
    expect(screen.getByText('3 DI 6')).toBeInTheDocument();
  });

  // Migra «sotto il minimo di 3 pasti il pulsante di rimozione è disattivato».
  it('a tre pasti le ✕ sono spente e la nota dice il minimo', async () => {
    montaPannello('gestione-pasti');
    await screen.findByDisplayValue('Colazione');
    for (const nome of ['Colazione', 'Pranzo', 'Cena']) expect(screen.getByLabelText(`Rimuovi ${nome}`)).toBeDisabled();
    expect(screen.getByText('Tre pasti sono il minimo.')).toBeInTheDocument();
  });

  // Migra «sopra il minimo la rimozione funziona e salva l’insieme aggiornato».
  it('un pasto senza piatti si toglie al tocco e salva l’insieme aggiornato', async () => {
    montaPannello('gestione-pasti', { pasti: QUATTRO, piatti: [piatto({ id: 'd-1', slotDefId: 'sd-1' })] });
    await screen.findByDisplayValue('Spuntino');
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    await waitFor(() => expect(screen.queryByDisplayValue('Spuntino')).not.toBeInTheDocument());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(salvaSlotDefs).toHaveBeenCalledWith([
      { ...COLAZIONE, posizione: 0 },
      { ...PRANZO, posizione: 1 },
      { ...CENA, posizione: 2 },
    ]);
  });

  it('un pasto con piatti chiede il dialogo; ANNULLA non tocca niente', async () => {
    montaPannello('gestione-pasti', {
      pasti: QUATTRO,
      piatti: [piatto({ id: 'd-1', slotDefId: 'sd-4' }), piatto({ id: 'd-2', slotDefId: 'sd-4' }), piatto({ id: 'd-3', slotDefId: 'sd-1' })],
    });
    await screen.findByDisplayValue('Spuntino');
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Togliere Spuntino?')).toBeInTheDocument();
    expect(within(dialogo).getByText('Se ne vanno anche i suoi 2 piatti, e il pasto sparisce dal piano. Non si può annullare.')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ANNULLA' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(salvaSlotDefs).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Spuntino')).toBeInTheDocument();
  });

  it('TOGLI nel dialogo toglie il pasto e chiude il dialogo', async () => {
    montaPannello('gestione-pasti', { pasti: QUATTRO, piatti: [piatto({ id: 'd-1', slotDefId: 'sd-4' })] });
    await screen.findByDisplayValue('Spuntino');
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Se ne va anche il suo piatto, e il pasto sparisce dal piano. Non si può annullare.')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'TOGLI' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(salvaSlotDefs).toHaveBeenCalledTimes(1);
    expect(vi.mocked(salvaSlotDefs).mock.calls[0][0].map((p) => p.id)).toEqual(['sd-1', 'sd-2', 'sd-3']);
    expect(screen.queryByDisplayValue('Spuntino')).not.toBeInTheDocument();
  });

  it('se TOGLI non riesce il dialogo resta aperto con l’errore e il pasto resta', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('gestione-pasti', { pasti: QUATTRO, piatti: [piatto({ id: 'd-1', slotDefId: 'sd-4' })] });
    await screen.findByDisplayValue('Spuntino');
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(1));
    vi.mocked(salvaSlotDefs).mockRejectedValueOnce(new Error('rete'));
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'TOGLI' }));
    expect(await within(dialogo).findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Spuntino')).toBeInTheDocument();
    errore.mockRestore();
  });

  // salvaSlotDefs non è atomico: il delete può essere passato quando l'upsert fallisce (Task 6, decisione del 26/09).
  it('se il salvataggio fallisce dopo che il pasto è stato cancellato, lo schermo segue il server e lo dice', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('gestione-pasti', { pasti: QUATTRO, piatti: [] });
    await screen.findByDisplayValue('Spuntino');
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(1));
    vi.mocked(salvaSlotDefs).mockRejectedValueOnce(new Error('upsert fallito'));
    vi.mocked(leggiSlotDefs).mockResolvedValue([COLAZIONE, PRANZO, CENA]);
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare. Riprova.');
    expect(screen.queryByDisplayValue('Spuntino')).not.toBeInTheDocument();
    errore.mockRestore();
  });

  it('con il repertorio non ancora letto, la ✕ lo rilegge e poi decide', async () => {
    vi.mocked(leggiRepertorio).mockReturnValueOnce(new Promise(() => {})); // la lettura al montaggio non arriva
    montaPannello('gestione-pasti', { pasti: QUATTRO, piatti: [] });
    await screen.findByDisplayValue('Spuntino');
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    await waitFor(() => expect(leggiRepertorio).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('se anche la rilettura del repertorio fallisce non toglie niente e lo dice', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiRepertorio).mockRejectedValueOnce(new Error('rete')).mockRejectedValueOnce(new Error('rete'));
    montaPannello('gestione-pasti', { pasti: QUATTRO });
    await screen.findByDisplayValue('Spuntino');
    fireEvent.click(screen.getByLabelText('Rimuovi Spuntino'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare. Riprova.');
    expect(salvaSlotDefs).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Spuntino')).toBeInTheDocument();
    errore.mockRestore();
  });

  // Migra «al massimo di 6 pasti il pulsante di aggiunta è disattivato»: ora non c'è proprio (frame 07).
  it('a sei pasti AGGIUNGI PASTO non c’è e la nota dice il massimo', async () => {
    const sei: MealSlotDef[] = [
      COLAZIONE, PRANZO, CENA,
      { id: 'sd-4', nome: 'Spuntino mattina', posizione: 3, assenzeAbituali: ASSENZE_VUOTE },
      { id: 'sd-5', nome: 'Spuntino pomeriggio', posizione: 4, assenzeAbituali: ASSENZE_VUOTE },
      { id: 'sd-6', nome: 'Dopocena', posizione: 5, assenzeAbituali: ASSENZE_VUOTE },
    ];
    montaPannello('gestione-pasti', { pasti: sei });
    await screen.findByText('6 DI 6');
    expect(screen.queryByText('AGGIUNGI PASTO')).not.toBeInTheDocument();
    expect(screen.getByText('Sei pasti sono il massimo.')).toBeInTheDocument();
    for (const d of sei) expect(screen.getByLabelText(`Rimuovi ${d.nome}`)).toBeEnabled();
  });

  // Migra «aggiunge un pasto sotto il massimo e lo salva con un id generato».
  it('AGGIUNGI PASTO crea Nuovo pasto in fondo, a casa tutti i giorni, col campo a fuoco', async () => {
    montaPannello('gestione-pasti');
    await screen.findByText('3 DI 6');
    fireEvent.click(screen.getByRole('button', { name: 'AGGIUNGI PASTO' }));
    await waitFor(() => expect(screen.getByText('4 DI 6')).toBeInTheDocument());
    expect(salvaSlotDefs).toHaveBeenCalledTimes(1);
    const salvato = vi.mocked(salvaSlotDefs).mock.calls[0][0];
    expect(salvato).toHaveLength(4);
    expect(salvato[3]).toMatchObject({ nome: 'Nuovo pasto', posizione: 3, assenzeAbituali: ASSENZE_VUOTE });
    expect(typeof salvato[3].id).toBe('string');
    expect(salvato[3].id.length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Nuovo pasto')).toHaveFocus();
  });

  // Migra «la prima riga non può salire e l’ultima non può scendere; riordinare aggiorna le posizioni e salva».
  it('su spento sul primo, giù spento sull’ultimo; riordinare aggiorna le posizioni e salva', async () => {
    montaPannello('gestione-pasti');
    await screen.findByDisplayValue('Colazione');
    expect(screen.getByLabelText('Sposta Colazione in alto')).toBeDisabled();
    expect(screen.getByLabelText('Sposta Cena in basso')).toBeDisabled();
    expect(screen.getByLabelText('Sposta Colazione in basso')).toBeEnabled();
    expect(screen.getByLabelText('Sposta Cena in alto')).toBeEnabled();
    fireEvent.click(screen.getByLabelText('Sposta Pranzo in alto'));
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledWith([
      { ...PRANZO, posizione: 0 },
      { ...COLAZIONE, posizione: 1 },
      { ...CENA, posizione: 2 },
    ]));
  });

  // Migra «rinominare un pasto salva il nuovo nome al blur, non a ogni carattere digitato».
  it('il nome si salva all’uscita dal campo, non a ogni carattere', async () => {
    montaPannello('gestione-pasti');
    const campo = await screen.findByDisplayValue('Colazione');
    fireEvent.change(campo, { target: { value: 'Brunch' } });
    expect(salvaSlotDefs).not.toHaveBeenCalled();
    fireEvent.blur(campo);
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledWith([{ ...COLAZIONE, nome: 'Brunch' }, PRANZO, CENA]));
  });

  it('un nome vuoto diventa Pasto', async () => {
    montaPannello('gestione-pasti');
    const campo = await screen.findByDisplayValue('Colazione');
    fireEvent.change(campo, { target: { value: '   ' } });
    fireEvent.blur(campo);
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledWith([{ ...COLAZIONE, nome: 'Pasto' }, PRANZO, CENA]));
  });

  it('mentre salva la riga è a 0,5', async () => {
    montaPannello('gestione-pasti');
    await screen.findByDisplayValue('Colazione');
    vi.mocked(salvaSlotDefs).mockReturnValueOnce(new Promise(() => {}));
    fireEvent.click(screen.getByLabelText('Sposta Pranzo in alto'));
    await waitFor(() => expect(screen.getByTestId('riga-pasto-sd-2')).toHaveStyle({ opacity: '0.5' }));
  });

  // Migra «con leggiSlotDefs() vuoto semina i quattro pasti di default e li salva davvero sul server» (C3).
  // La semina sta nel provider (Task 6): qui si guarda che arrivi fino alla sotto-schermata.
  it('con leggiSlotDefs() vuoto semina i quattro pasti di default e li salva sul server', async () => {
    montaPannello('gestione-pasti', { pasti: [] });
    expect(await screen.findByDisplayValue('Colazione')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Spuntino')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pranzo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cena')).toBeInTheDocument();
    expect(screen.getByText('4 DI 6')).toBeInTheDocument();
    await waitFor(() => expect(salvaSlotDefs).toHaveBeenCalledTimes(1));
    const salvato = vi.mocked(salvaSlotDefs).mock.calls[0][0];
    expect(salvato.map((p) => p.nome)).toEqual(['Colazione', 'Spuntino', 'Pranzo', 'Cena']);
    expect(salvato[1].assenzeAbituali).toEqual([false, false, false, false, false, true, true]);
    expect(salvato[2].assenzeAbituali).toEqual([true, true, true, true, true, false, false]);
  });

  it('la nota di oggi dice «nel Piano»', async () => {
    montaPannello('gestione-pasti');
    expect(await screen.findByText(/nel Piano correggi solo le eccezioni/)).toBeInTheDocument();
    expect(screen.queryByText(/nella Settimana/)).not.toBeInTheDocument();
  });
});
```

Il Task 6 prova la semina anche nel provider (`dati-pannello.test.tsx`); qui resta come test di attraversamento, ed è quello a cui punta la riga 23 del registro.

- [ ] **Step 7: Il test della rotazione, `rotazione.test.tsx`.**

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';

// Il blocco dei finti (Task 7, Step 1).
vi.mock('next/navigation', async () => (await import('./finti')).modNavigazione());
vi.mock('@/data/supabase', async () => (await import('./finti')).modSupabase());
vi.mock('@/data/impostazioni', async () => (await import('./finti')).modImpostazioni());
vi.mock('@/data/casa', async () => (await import('./finti')).modCasa());
vi.mock('@/data/risparmio', async () => (await import('./finti')).modRisparmio());
vi.mock('@/data/repertorio', async () => (await import('./finti')).modRepertorio());
vi.mock('@/data/dispensa', async () => (await import('./finti')).modDispensa());
vi.mock('@/data/sessione', async () => (await import('./finti')).modSessione());
vi.mock('@/data/esporta', async () => (await import('./finti')).modEsporta());
vi.mock('@/components/salva-file', async () => (await import('./finti')).modSalvaFile());

import { leggiImpostazioni, salvaImpostazioni } from '@/data/impostazioni';
import { azzera, montaPannello, impostazioni, ORDINE_TEST } from './aiuti';

// Venerdì 25/09/2026: il lunedì corrente è il 21 settembre.
function fissaOggi() {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-25T10:00:00Z'));
}

describe('Rotazione del piano', () => {
  beforeEach(() => azzera());
  afterEach(() => vi.useRealTimers());

  // Migra «con il ciclo spento la rotazione si può accendere e dice cosa cambia».
  it('con NESSUNA dice la nota di oggi; 2 SETT. salva le impostazioni intere e compare il contatore', async () => {
    montaPannello('rotazione');
    expect(await screen.findByText('OGNI QUANTE SETTIMANE SI RIPETE')).toBeInTheDocument();
    expect(screen.getByText(/^I piatti ruotano uno dopo l’altro, senza giro fisso\./)).toBeInTheDocument();
    expect(screen.queryByText(/^SETTIMANA /)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'RIPARTI DALLA SETTIMANA 1' })).not.toBeInTheDocument();

    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ settimaneCiclo: 2, cicloOrigine: '2026-08-31' }));
    fireEvent.click(screen.getByRole('button', { name: '2 SETT.' }));
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    expect(vi.mocked(salvaImpostazioni).mock.calls[0][0].settimaneCiclo).toBe(2);
    // L'ordine delle aree viaggia invariato: salvaImpostazioni riscrive la riga intera.
    expect(vi.mocked(salvaImpostazioni).mock.calls[0][0].ordineAree).toEqual(ORDINE_TEST);
    expect(await screen.findByText(/^SETTIMANA \d DI 2$/)).toBeInTheDocument();
  });

  // Migra «se il salvataggio del ciclo fallisce torna al valore di prima e lo dice».
  it('se il salvataggio fallisce il segmento torna a NESSUNA e sotto c’è l’errore', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('rotazione');
    await screen.findByText('OGNI QUANTE SETTIMANE SI RIPETE');
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    fireEvent.click(screen.getByRole('button', { name: '3 SETT.' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare. Riprova.');
    expect(screen.getByRole('button', { name: 'NESSUNA' })).toHaveAttribute('aria-pressed', 'true');
    errore.mockRestore();
  });

  // Migra «il copy del giro con origine futura dice "comincia"».
  it('con l’origine futura la nota dice «comincia»', async () => {
    montaPannello('rotazione', { impostazioni: { settimaneCiclo: 2, cicloOrigine: '2099-03-09' } });
    expect(await screen.findByText(/^Il giro comincia lunedì 9 marzo\b/)).toBeInTheDocument();
  });

  // Migra «il copy del giro con origine passata (o oggi) dice "è cominciato"».
  it('con l’origine passata la nota dice «è cominciato»', async () => {
    montaPannello('rotazione', { impostazioni: { settimaneCiclo: 2, cicloOrigine: '2000-01-03' } });
    expect(await screen.findByText(/^Il giro è cominciato lunedì 3 gennaio\b/)).toBeInTheDocument();
  });

  it('il contatore dice SETTIMANA {k} DI {n}', async () => {
    fissaOggi();
    montaPannello('rotazione', { impostazioni: { settimaneCiclo: 3, cicloOrigine: '2026-09-14' } });
    expect(await screen.findByText('SETTIMANA 2 DI 3')).toBeInTheDocument();
    expect(screen.queryByText(/ORA SEI ALLA/)).not.toBeInTheDocument();
  });

  // Migra «RIPARTI da lunedì richiede due tocchi: il primo arma senza salvare, il secondo salva davvero».
  it('RIPARTI apre il dialogo, e RIPARTI DA LUNEDÌ salva l’origine al lunedì corrente', async () => {
    fissaOggi();
    montaPannello('rotazione', { impostazioni: { settimaneCiclo: 3, cicloOrigine: '2026-09-14' } });
    fireEvent.click(await screen.findByRole('button', { name: 'RIPARTI DALLA SETTIMANA 1' }));
    expect(salvaImpostazioni).not.toHaveBeenCalled();
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Ripartire dalla settimana 1?')).toBeInTheDocument();
    expect(within(dialogo).getByText('Da lunedì 21 settembre il piano riparte dalla settimana 1 di 3. Le settimane già create non cambiano.')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'RIPARTI DA LUNEDÌ' }));
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
    expect(vi.mocked(salvaImpostazioni).mock.calls[0][0].cicloOrigine).toBe('2026-09-21');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  // Migra «RIPARTI armato: un tap fuori dal bottone annulla senza salvare»:
  // SICURO? è tolto (decisione 8); si esce da ANNULLA, e il velo del dialogo non chiude (§D, §N).
  it('ANNULLA chiude il dialogo senza salvare; il velo non chiude', async () => {
    montaPannello('rotazione', { impostazioni: { settimaneCiclo: 2, cicloOrigine: '2000-01-03' } });
    fireEvent.click(await screen.findByRole('button', { name: 'RIPARTI DALLA SETTIMANA 1' }));
    const dialogo = await screen.findByRole('alertdialog');
    const velo = screen.getAllByTestId('velo-foglio').at(-1)!;
    fireEvent.click(velo);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ANNULLA' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(salvaImpostazioni).not.toHaveBeenCalled();
  });

  it('se ripartire fallisce il dialogo resta aperto con il suo errore', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('rotazione', { impostazioni: { settimaneCiclo: 2, cicloOrigine: '2000-01-03' } });
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    fireEvent.click(await screen.findByRole('button', { name: 'RIPARTI DALLA SETTIMANA 1' }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'RIPARTI DA LUNEDÌ' }));
    expect(await within(dialogo).findByText('Non siamo riusciti a ripartire. Riprova.')).toBeInTheDocument();
    errore.mockRestore();
  });

  // Migra «RIPARTI armato: un cambio di stato altrove (la rotazione) lo disarma»:
  // senza armamento non c'è niente da disarmare. Il comportamento che resta da
  // proteggere è la regola di oggi che il disegno non mostra (§C.3, §N).
  it('RIPARTI è spento se l’origine è già il lunedì corrente', async () => {
    fissaOggi();
    montaPannello('rotazione', { impostazioni: { settimaneCiclo: 2, cicloOrigine: '2026-09-21' } });
    expect(await screen.findByRole('button', { name: 'RIPARTI DALLA SETTIMANA 1' })).toBeDisabled();
  });

  it('il tocco sul segmento già premuto non salva', async () => {
    montaPannello('rotazione');
    fireEvent.click(await screen.findByRole('button', { name: 'NESSUNA' }));
    expect(salvaImpostazioni).not.toHaveBeenCalled();
  });
});
```

Il test del velo prende l'ultimo `velo-foglio`: `DialogoConferma` non si avvolge da sé, e il `FoglioDalBasso` di livello 3 che lo contiene (Task 6, `Pannello.tsx`) è l'ultimo foglio aperto.

- [ ] **Step 8: Il registro.** In `docs/2026-09-25-fase5-decisioni-esecuzione.md`, tabella
  «Migrazione dei test», compila «Test nuovo» (regola del Task 1: file › titolo esatto) e
  «Nota» delle righe del Task 8:

| # | Test nuovo | Nota |
|---|---|---|
| 1 | `gestione-pasti.test.tsx` › Gestione dei pasti › mostra i pasti letti da leggiSlotDefs e il contatore | |
| 15 | `gestione-pasti.test.tsx` › Gestione dei pasti › a tre pasti le ✕ sono spente e la nota dice il minimo | più la nota nuova |
| 16 | `gestione-pasti.test.tsx` › Gestione dei pasti › un pasto senza piatti si toglie al tocco e salva l’insieme aggiornato | decisione 12: al tocco solo senza piatti; con piatti i test del dialogo |
| 17 | `gestione-pasti.test.tsx` › Gestione dei pasti › a sei pasti AGGIUNGI PASTO non c’è e la nota dice il massimo | spento → assente (frame 07) |
| 18 | `gestione-pasti.test.tsx` › Gestione dei pasti › AGGIUNGI PASTO crea Nuovo pasto in fondo, a casa tutti i giorni, col campo a fuoco | |
| 19 | `gestione-pasti.test.tsx` › Gestione dei pasti › su spento sul primo, giù spento sull’ultimo; riordinare aggiorna le posizioni e salva | l'opacità 0,35 diventa `disabled` con l'icona in `--icona-spenta` |
| 20 | `pasti-a-casa.test.tsx` › Pasti a casa › ogni cella è alta 44 e divide la larghezza con le altre (flex: 1) | la pillola da 36 sparisce: la cella è 44 piena |
| 21 | `pasti-a-casa.test.tsx` › Pasti a casa › un tocco mette Colazione fuori casa il lunedì e salva le assenze aggiornate | |
| 22 | `gestione-pasti.test.tsx` › Gestione dei pasti › il nome si salva all’uscita dal campo, non a ogni carattere | |
| 23 | `gestione-pasti.test.tsx` › Gestione dei pasti › con leggiSlotDefs() vuoto semina i quattro pasti di default e li salva sul server | la semina è del provider (Task 6) |
| 25 | `rotazione.test.tsx` › Rotazione del piano › con NESSUNA dice la nota di oggi; 2 SETT. salva le impostazioni intere e compare il contatore | `ORA SEI ALLA` → `SETTIMANA` |
| 26 | `rotazione.test.tsx` › Rotazione del piano › se il salvataggio fallisce il segmento torna a NESSUNA e sotto c’è l’errore | |
| 27 | `rotazione.test.tsx` › Rotazione del piano › con l’origine futura la nota dice «comincia» | |
| 28 | `rotazione.test.tsx` › Rotazione del piano › con l’origine passata la nota dice «è cominciato» | |
| 29 | `rotazione.test.tsx` › Rotazione del piano › RIPARTI apre il dialogo, e RIPARTI DA LUNEDÌ salva l’origine al lunedì corrente | `SICURO?` tolto (decisione 8) |
| 30 | `rotazione.test.tsx` › Rotazione del piano › ANNULLA chiude il dialogo senza salvare; il velo non chiude | il tocco fuori diventa ANNULLA; il velo non chiude (§N) |
| 31 | `rotazione.test.tsx` › Rotazione del piano › RIPARTI è spento se l’origine è già il lunedì corrente | senza armamento il caso non esiste; protegge la regola di oggi non disegnata |

  Nella tabella delle decisioni aggiungi, numerando di seguito: le voci di «Le scelte di questo
  task»; la data del dialogo `riparti` (lunedì corrente, non il successivo del frame 10); i testi
  confermati da Andrea il 26/09. In «Rimasto aperto, di proposito», il limite noto: **togliere un
  pasto con piatti cancella a cascata anche i lotti Pronti di quei piatti** (`porzione_pronta.dish_id
  … on delete cascade`), e il dialogo non lo dice (decisione del controller del 26/09). In
  «Domande per Andrea (in review)»: **la nota di Gestione dei pasti** dice ancora «I giorni
  segnati qui vengono già spenti quando si apre una settimana nuova», ma i giorni ora si segnano
  in Pasti a casa; resta com'è in §I finché Andrea non dà il testo.

- [ ] **Step 9: Verifica.**

Run: `npx vitest run src/components/pannello/__tests__/pasti-a-casa.test.tsx src/components/pannello/__tests__/gestione-pasti.test.tsx src/components/pannello/__tests__/rotazione.test.tsx`
Expected: tutti verdi. Poi `npx vitest run src/components/pannello`: verde.

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npm run lint`
Expected: nessun errore.

- [ ] **Step 10: Commit.**

```bash
git add src/components/pannello/PastiACasa.tsx src/components/pannello/GestionePasti.tsx src/components/pannello/Rotazione.tsx src/components/pannello/schermate.tsx src/components/pannello/__tests__/pasti-a-casa.test.tsx src/components/pannello/__tests__/gestione-pasti.test.tsx src/components/pannello/__tests__/rotazione.test.tsx docs/2026-09-25-fase5-decisioni-esecuzione.md
```

```bash
git commit -m "feat: la settimana di base nel pannello: la matrice con la casetta, la gestione dei pasti col dialogo di rimozione, la rotazione col dialogo riparti

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### Per la review di correttezza (Rimuovi pasto)

Chi fa la review legge `salvaSlotDefs` (`src/data/impostazioni.ts:117-160`), le cascate in `supabase/migrations/0001_schema.sql`, `0006_alternative.sql`, `0008_spunta_pasti.sql`, `0009_meal_prepping.sql`, e `salvaPasti` del provider (Task 6). Deve rispondere a queste domande, con `[misurato]` o `[ipotesi]`:

1. **Cosa se ne va davvero.** Il delete di un `meal_slot_def` porta via [misurato sulle migrazioni]:
   - `dish` (`slot_def_id … on delete cascade`), e con loro `dish_ingredient`, `dish_option` e **`porzione_pronta`** (`dish_id … on delete cascade`, 0009): **i lotti dei Pronti di quei piatti spariscono dalla Dispensa**. Il dialogo (§D) **non** cambia testo: è un limite noto, nel registro (decisione del controller del 26/09);
   - `meal_slot` di quel pasto **in tutte le settimane, anche quelle chiuse**, e con loro `meal_slot_choice` (0006) e `meal_slot_storno` (0008). I lotti legati a quegli slot perdono `meal_slot_id` (`on delete set null`).
   Domanda: il residuo della dispensa o il non ricomprato si ricalcolano mai da `meal_slot` o da `meal_slot_storno` delle settimane chiuse, così che la loro sparizione cambi un numero?
2. **Il salvataggio non è atomico.** `salvaSlotDefs` fa prima il delete, poi l'upsert. Se il delete riesce e l'upsert fallisce, il pasto e i suoi piatti sono già persi sul server. Deciso (controller, 26/09): `salvaPasti` del Task 6 rilegge `leggiSlotDefs()` invece di tornare alla copia locale, e mostra l'errore. Verifica che lo faccia, col test «se il salvataggio fallisce dopo che il pasto è stato cancellato…» di questo task e i due del provider.
3. **Il conteggio.** `leggiRepertorio` conta solo i piatti attivi (`.eq('attivo', true)`) [misurato]. Un piatto aggiunto da un altro telefono dopo il montaggio non si conta: è il caso accettato da §L. Controlla che un pasto appena creato in questa sessione (id nuovo, non nella mappa) valga 0 e si tolga al tocco.
4. **Il piano aperto sotto il pannello.** Il Piano (o la Lista) sotto il pannello tiene in memoria le righe del pasto tolto finché non si rilegge. Oggi la pagina Impostazioni era a pagina piena e il problema non c'era. Serve un evento come `spesa:dispensa-cambiata` per il Piano, o basta la rilettura al ritorno? La spec non lo dice: se serve, è una domanda per Andrea.
5. **`import_draft`.** Controlla in `0007_import_draft.sql` e in `src/app/(app)/importa/` se una bozza di import tiene gli id dei pasti: togliere un pasto con un import in corso lascia una bozza che punta a un id che non c'è?

---

### Task 9: Ingredienti, Ordine delle aree, Cadenza

Le tre sotto-schermate del secondo e terzo Blocco. Ingredienti è un elenco che porta a una pagina piena (l'editor); Ordine delle aree è l'unica sotto-schermata che salva col suo tasto, nel piede fisso; Cadenza è la funzione nuova, un segmento a tre che salva al tocco.

**Obiettivo del task:** chi apre Ingredienti trova il repertorio per area e arriva all'editor salvando dove stava; chi riordina le aree salva col tasto e resta lì; chi cambia la cadenza la vede subito nella riga. Si misura coi test migrati dalla pagina dei reparti e con i quattro test della coda serializzata, che qui passano sulla Cadenza.

**Files:**
- Create: `src/components/pannello/Ingredienti.tsx`
- Create: `src/components/pannello/OrdineAree.tsx`
- Create: `src/components/pannello/Cadenza.tsx`
- Modify: `src/components/pannello/schermate.tsx` (le tre voci)
- Test: `src/components/pannello/__tests__/ingredienti.test.tsx`, `src/components/pannello/__tests__/aree.test.tsx`, `src/components/pannello/__tests__/cadenza.test.tsx`
- Modify: `docs/2026-09-25-fase5-decisioni-esecuzione.md` (registro)

**Interfaces:**
- Consumes:
  - `useDatiPannello()` → `stato`, `salvaImpostazioni`, `casaCambiata` (Task 6); `StatoDatiPannello` (Task 6, per la Cadenza); `usePannello()` → `vaiA` (Task 6);
  - `salvaScrollPannello` (Task 6, `./indirizzi`); `PiedePannello` (Task 6: fuori dal pannello restituisce `null`);
  - da `./pezzi` (Task 7): `STILE_BLOCCO`, `BloccoGruppo`, `Nota`, `Carico`, `ErroreCaricamento`, `AvvisoCasaCambiata`, `TondoIcona`, `IconaFreccia`, `ERRORE_SALVATAGGIO`;
  - `TastoPrimario`, `MessaggioErrore` (Task 2); `Segmento` (di oggi);
  - `CADENZE`, `testoCadenza`, `GiorniControllo` (Task 3, `@/domain/pantry`);
  - `leggiIngredienti` (`@/data/repertorio`); `coloreArea`, `nomeArea` (`@/domain/aree`);
  - l'aiuto di test del Task 7.
- Produces:
  - `Ingredienti()`, `dettaglioIngrediente(i: Ingredient): string`;
  - `OrdineAree()`, `nomeAreaInFrase(a: AreaId): string`;
  - `Cadenza()`;
  - le voci `ingredienti`, `aree`, `cadenza` di `SCHERMATE`.

**Le scelte di questo task** (vanno nel registro):
- **L'altezza di scorrimento** che Ingredienti salva prima di aprire l'editor è quella del primo antenato che scorre (`overflow-y: auto | scroll`) della riga toccata, cioè il corpo del pannello. L'ossatura non espone il corpo: così la sotto-schermata non ha bisogno di un ref in più.
- **Ingredienti legge l'ordine delle aree dal provider** (`DatiPannello.impostazioni.ordineAree`) e gli ingredienti da sé. Mostra `CARICO…` finché mancano l'uno o gli altri.
- **Ordine delle aree non legge niente da sé:** l'ordine salvato è quello del provider. «Se il caricamento fallisce» (§C.5) vuol dire `stato.stato === 'errore'`. Non passa da `StatoDatiPannello` perché il suo errore di caricamento ha un testo proprio (`Non riusciamo a caricare l'ordine delle aree. Riprova più tardi.`, §C.5), senza RIPROVA; lo stesso vale per Ingredienti, che legge anche i suoi dati. La Cadenza, che vive solo dei dati del pannello, passa da `StatoDatiPannello`.
- **Il nome dell'area nella riga è in sentence case** (`Latticini, uova e salumi`, frame 13), derivato da `nomeArea` (che è maiuscolo); l'`aria-label` dei tondi resta col nome maiuscolo di oggi (`Sposta ORTOFRUTTA in alto`), come nel disegno.
- **Il segmento della Cadenza resta toccabile mentre salva**, e i quattro test della coda serializzata della vecchia pagina (due tocchi veloci) si riportano qui. Nel pannello il campo delle persone è spento in volo (frame 25) e non può più fare due scritture di fila.
- **L'apostrofo è dritto** nei due testi nuovi di §C.5 (`l'ordine`), come li scrive la spec; la nota in testa è quella di oggi e resta com'è (`nell’ordine`, `quest’ordine`).

**Testi dal disegno, confermati da Andrea il 26/09** (la spec §I li riporta):

| Dove | Testo | Fonte |
|---|---|---|
| Etichetta del blocco della Cadenza | `OGNI QUANTO TI CHIEDO` | frame 13D |
| `aria-label` della riga ingrediente | `Apri {nome}` | frame 11 (lo stesso schema di «Apri {piatto}» in DESIGN.md §8 Riga piatto) |

- [ ] **Step 1: `Ingredienti.tsx`.**

La nota in testa e il vuoto sono i testi di oggi (`impostazioni/ingredienti/page.tsx:66-72` e `157-160`) [misurato]. Il vuoto prende la forma dello Stato vuoto della Dispensa (`dispensa/page.tsx:571-583`), senza Dock (frame 11).

```tsx
'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import type { Ingredient } from '@/domain/types';
import { coloreArea, nomeArea } from '@/domain/aree';
import { leggiIngredienti } from '@/data/repertorio';
import { usePannello } from './PannelloProvider';
import { useDatiPannello } from './DatiPannello';
import { salvaScrollPannello } from './indirizzi';
import { Carico, ErroreCaricamento, Nota, STILE_BLOCCO } from './pezzi';

const CLASSE: Record<Ingredient['classeResiduo'], string> = {
  porzionabile: 'PORZIONABILE',
  intero: 'INTERO',
  stima: 'A STIMA',
};

const NOTA_INGREDIENTI = 'Area, formato della confezione e classe decidono cosa finisce in lista e quanto: cambiarli qui cambia le liste da qui in avanti, non quelle già create.';
const ERRORE_INGREDIENTI = 'Non riusciamo a caricare gli ingredienti. Riprova più tardi.';

/** `{formato} {UNITÀ} · {PORZIONABILE|INTERO|A STIMA}[ · FRESCO]` (§C.4). */
export function dettaglioIngrediente(i: Ingredient): string {
  return `${i.formatoConfezione} ${i.unitaBase.toUpperCase()} · ${CLASSE[i.classeResiduo]}${i.deperibile ? ' · FRESCO' : ''}`;
}

/** Lo scorrimento del corpo del pannello: il primo antenato della riga che scorre. */
function scorrimentoDi(el: HTMLElement): number {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const y = getComputedStyle(p).overflowY;
    if (y === 'auto' || y === 'scroll') return p.scrollTop;
  }
  return 0;
}

/**
 * Ingredienti (§C.4, frame 11): un Blocco per area, nell'ordine dell'utente,
 * e le aree vuote non si mostrano. Il tocco su una riga salva l'origine e lo
 * scorrimento (§A.5) e apre l'editor, che è una pagina piena (§F): al ritorno
 * il pannello riapre qui, alla stessa altezza.
 */
export function Ingredienti() {
  const { vaiA } = usePannello();
  const { stato } = useDatiPannello();
  const pathname = usePathname();
  const [ingredienti, setIngredienti] = useState<Ingredient[] | null>(null);
  const [errore, setErrore] = useState(false);

  useEffect(() => {
    let vivo = true;
    leggiIngredienti()
      .then((lista) => {
        if (vivo) setIngredienti(lista);
      })
      .catch((e) => {
        console.error('pannello/ingredienti: caricamento fallito.', e);
        if (vivo) setErrore(true);
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (errore || stato.stato === 'errore') return <ErroreCaricamento testo={ERRORE_INGREDIENTI} />;
  if (!ingredienti || stato.stato === 'carico') return <Carico />;

  if (ingredienti.length === 0) {
    return (
      <section style={{ ...STILE_BLOCCO, borderRadius: 22, padding: '26px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
        <span aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 14, border: '2px dashed var(--bordo-tratteggio)' }} />
        <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', color: 'var(--ink)' }}>Nessun ingrediente</h3>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)', maxWidth: '30ch' }}>
          Nascono dai piatti: il primo che aggiungi a un piatto compare qui.
        </p>
      </section>
    );
  }

  function apri(ing: Ingredient, e: MouseEvent<HTMLButtonElement>) {
    salvaScrollPannello('ingredienti', scorrimentoDi(e.currentTarget));
    vaiA(`/piatti/nuovo/ingredienti/${ing.id}?torna=impostazioni`, { pathname, sotto: 'ingredienti' });
  }

  const perArea = stato.dati.impostazioni.ordineAree
    .map((area) => ({
      area,
      voci: ingredienti.filter((i) => i.area === area).sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
    }))
    .filter((g) => g.voci.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Nota>{NOTA_INGREDIENTI}</Nota>
      {perArea.map(({ area, voci }) => (
        <section key={area} aria-label={nomeArea(area)} style={{ ...STILE_BLOCCO, padding: '12px 12px 6px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: 0, padding: '0 4px 6px', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 4, background: coloreArea(area) }} />
            {nomeArea(area)}
          </h3>
          {voci.map((ing, i) => (
            <button
              key={ing.id}
              type="button"
              aria-label={`Apri ${ing.nome}`}
              onClick={(e) => apri(ing, e)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, width: '100%', boxSizing: 'border-box',
                border: 0, borderTop: i > 0 ? '1px solid var(--bordo)' : 0, background: 'none', padding: '8px 4px',
                textAlign: 'left', font: 'inherit', color: 'var(--ink)',
              }}
            >
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ing.nome}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', color: 'var(--testo-2)' }}>
                  {dettaglioIngrediente(ing)}
                </span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: 'none' }}>
                <path d="M9 5l7 7-7 7" stroke="var(--icona-spenta)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}
```

Il chevron: il frame 11 non lo disegna, le sue Misure sì («chevron», «finale 1 senza valore»). Il piano lo mette, coerente con la Riga di impostazione: scrivilo nel registro.

- [ ] **Step 2: `OrdineAree.tsx`.**

```tsx
'use client';

import { useState } from 'react';
import type { AreaId } from '@/domain/types';
import { coloreArea, nomeArea } from '@/domain/aree';
import { MessaggioErrore, TastoPrimario } from '@/components/controlli';
import { useDatiPannello } from './DatiPannello';
import { PiedePannello } from './PiedePannello';
import { AvvisoCasaCambiata, BloccoGruppo, Carico, ErroreCaricamento, IconaFreccia, Nota, TondoIcona } from './pezzi';

// La nota di oggi (impostazioni/reparti/page.tsx:103-107), invariata.
const NOTA_ORDINE = 'Mettili nell’ordine in cui li incontri camminando nel tuo supermercato. La lista della spesa comparirà in quest’ordine, così non torni indietro fra le corsie. Le sei aree sono fisse: si cambia solo la sequenza.';

/** «LATTICINI, UOVA E SALUMI» → «Latticini, uova e salumi» (frame 13). */
export function nomeAreaInFrase(a: AreaId): string {
  const n = nomeArea(a);
  return n.charAt(0) + n.slice(1).toLocaleLowerCase('it');
}

function stessoOrdine(a: AreaId[], b: AreaId[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/**
 * Ordine delle aree (§C.5, frame 13–13C). Le frecce cambiano solo l'ordine
 * locale; `SALVA ORDINE`, nel piede fisso, lo scrive. Dopo il salvataggio il
 * pannello resta qui: è l'unica sotto-schermata che non torna in cima da sola.
 * Uscire senza salvare perde l'ordine, senza chiedere.
 */
export function OrdineAree() {
  const { stato, salvaImpostazioni, casaCambiata } = useDatiPannello();
  // null = l'ordine salvato, quello del provider.
  const [ordine, setOrdine] = useState<AreaId[] | null>(null);
  const [volo, setVolo] = useState(false);
  const [errore, setErrore] = useState(false);
  if (stato.stato === 'carico') return <Carico />;
  if (stato.stato === 'errore') return <ErroreCaricamento testo="Non riusciamo a caricare l'ordine delle aree. Riprova più tardi." />;
  const salvato = stato.dati.impostazioni.ordineAree;
  const corrente = ordine ?? salvato;
  const invariato = stessoOrdine(corrente, salvato);

  function sposta(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= corrente.length) return;
    const copia = [...corrente];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setErrore(false);
    setOrdine(copia);
  }

  async function salva() {
    if (invariato || volo) return;
    setErrore(false);
    setVolo(true);
    const ok = await salvaImpostazioni({ ordineAree: corrente });
    setVolo(false);
    if (ok) setOrdine(null);
    else setErrore(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {casaCambiata && <AvvisoCasaCambiata />}
      <Nota>{NOTA_ORDINE}</Nota>
      <BloccoGruppo>
        {corrente.map((area, i) => {
          const primo = i === 0;
          const ultimo = i === corrente.length - 1;
          return (
            <div key={area} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, padding: '6px 0 6px 4px' }}>
              <span aria-hidden="true" style={{ width: 10, height: 10, flex: 'none', borderRadius: 4, background: coloreArea(area) }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: 'var(--ink)' }}>
                {nomeAreaInFrase(area)}
              </span>
              <TondoIcona etichetta={`Sposta ${nomeArea(area)} in alto`} spento={primo} onClick={() => sposta(i, -1)}>
                <IconaFreccia verso="su" spenta={primo} />
              </TondoIcona>
              <TondoIcona etichetta={`Sposta ${nomeArea(area)} in basso`} spento={ultimo} onClick={() => sposta(i, 1)}>
                <IconaFreccia verso="giu" spenta={ultimo} />
              </TondoIcona>
            </div>
          );
        })}
      </BloccoGruppo>
      <PiedePannello>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {errore && !casaCambiata && <MessaggioErrore ruolo="alert">Non siamo riusciti a salvare l&apos;ordine. Riprova.</MessaggioErrore>}
          <TastoPrimario
            onClick={() => void salva()}
            disabled={invariato || volo}
            // In volo: primario pieno a 0,5 (frame 13C), non lo spento grigio.
            style={volo ? { background: 'var(--ink)', color: 'var(--superficie)', boxShadow: 'none', opacity: 0.5 } : undefined}
          >
            {volo ? 'SALVATAGGIO…' : 'SALVA ORDINE'}
          </TastoPrimario>
        </div>
      </PiedePannello>
    </div>
  );
}
```

Note per chi implementa:
- `salvaImpostazioni({ ordineAree })` del provider riscrive la riga intera con i campi che ha: il test controlla che moltiplicatore, ciclo e cadenza viaggino invariati.
- Il provider è ottimistico: durante il volo l'ordine salvato è già quello nuovo, quindi `invariato` è vero e il tasto è `disabled`. Lo stile di volo lo distingue dallo spento. Se il salvataggio fallisce, il provider torna all'ordine di prima e l'ordine locale resta quello nuovo: il tasto si riaccende, e sopra c'è l'errore (frame 13B).
- `&apos;` nel JSX: la regola `react/no-unescaped-entities` del lint non vuole l'apostrofo nudo nel testo. Il testo reso è `l'ordine`.

- [ ] **Step 3: `Cadenza.tsx`.**

```tsx
'use client';

import { useState } from 'react';
import { Segmento } from '@/components/Segmento';
import { MessaggioErrore } from '@/components/controlli';
import { CADENZE, testoCadenza, type GiorniControllo } from '@/domain/pantry';
import { StatoDatiPannello, useDatiPannello } from './DatiPannello';
import { AvvisoCasaCambiata, ERRORE_SALVATAGGIO, Nota, STILE_BLOCCO } from './pezzi';

const OPZIONI = CADENZE.map((g) => ({ id: String(g), label: testoCadenza(g) }));
const NOTA_CADENZA = "Ogni quanto ti chiedo se hai ancora olio, sale, farina. La domanda compare in Lista, nell'area del prodotto.";

/**
 * Cadenza dei controlli (§C.6, frame 13D): OGNI MESE, OGNI 2 MESI, OGNI 3 MESI
 * = 30, 60, 90 giorni. Salva al tocco; vale dalla prossima lista costruita
 * (§E.1). Il segmento resta toccabile mentre salva: la coda serializzata del
 * provider tiene l'ordine dei tocchi.
 */
export function Cadenza() {
  return <StatoDatiPannello>{(dati) => <SceltaCadenza attuale={dati.impostazioni.giorniControllo} />}</StatoDatiPannello>;
}

function SceltaCadenza({ attuale }: { attuale: GiorniControllo }) {
  const { salvaImpostazioni, casaCambiata } = useDatiPannello();
  const [errore, setErrore] = useState(false);

  async function cambia(id: string) {
    const scelta = Number(id) as GiorniControllo;
    if (scelta === attuale) return;
    setErrore(false);
    if (!(await salvaImpostazioni({ giorniControllo: scelta }))) setErrore(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {casaCambiata && <AvvisoCasaCambiata />}
      <section style={{ ...STILE_BLOCCO, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Etichetta dal disegno (frame 13D), confermata da Andrea il 26/09. */}
        <h3 style={{ margin: 0, padding: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
          OGNI QUANTO TI CHIEDO
        </h3>
        <Segmento variante="blocco" opzioni={OPZIONI} valore={String(attuale)} onCambia={(id) => void cambia(id)} />
        {errore && !casaCambiata && <MessaggioErrore ruolo="alert">{ERRORE_SALVATAGGIO}</MessaggioErrore>}
        <Nota>{NOTA_CADENZA}</Nota>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Registra le tre sotto-schermate.** In `schermate.tsx`:

```tsx
import { Ingredienti } from './Ingredienti';
import { OrdineAree } from './OrdineAree';
import { Cadenza } from './Cadenza';

// dentro SCHERMATE:
ingredienti: { titolo: 'Ingredienti', Componente: Ingredienti },
aree: { titolo: 'Ordine delle aree', Componente: OrdineAree },
cadenza: { titolo: 'Cadenza dei controlli', Componente: Cadenza },
```

- [ ] **Step 5: Il test degli ingredienti, `ingredienti.test.tsx`.**

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';

// Il blocco dei finti (Task 7, Step 1).
vi.mock('next/navigation', async () => (await import('./finti')).modNavigazione());
vi.mock('@/data/supabase', async () => (await import('./finti')).modSupabase());
vi.mock('@/data/impostazioni', async () => (await import('./finti')).modImpostazioni());
vi.mock('@/data/casa', async () => (await import('./finti')).modCasa());
vi.mock('@/data/risparmio', async () => (await import('./finti')).modRisparmio());
vi.mock('@/data/repertorio', async () => (await import('./finti')).modRepertorio());
vi.mock('@/data/dispensa', async () => (await import('./finti')).modDispensa());
vi.mock('@/data/sessione', async () => (await import('./finti')).modSessione());
vi.mock('@/data/esporta', async () => (await import('./finti')).modEsporta());
vi.mock('@/components/salva-file', async () => (await import('./finti')).modSalvaFile());

import { leggiIngredienti } from '@/data/repertorio';
import { azzera, montaPannello, ingrediente } from './aiuti';
import { percorso, router } from './finti';

const CAROTE = ingrediente({ id: 'i-1', nome: 'Carote', area: 'ortofrutta', formatoConfezione: 1000, deperibile: true });
const LIMONI = ingrediente({ id: 'i-2', nome: 'Limoni', area: 'ortofrutta', unitaBase: 'pz', formatoConfezione: 4, classeResiduo: 'intero', deperibile: true });
const OLIO = ingrediente({ id: 'i-3', nome: 'Olio extravergine', area: 'dispensa', unitaBase: 'ml', formatoConfezione: 1000, classeResiduo: 'stima' });

function navigatoA(): string[] {
  return [...router.push.mock.calls, ...router.replace.mock.calls].map((c) => String(c[0]));
}

describe('Ingredienti', () => {
  beforeEach(() => azzera());

  it('un blocco per area nell’ordine dell’utente, per nome, senza le aree vuote', async () => {
    // ORDINE_TEST: dispensa prima di ortofrutta.
    montaPannello('ingredienti', { ingredienti: [LIMONI, OLIO, CAROTE] });
    const blocchi = await screen.findAllByRole('region');
    expect(blocchi.map((b) => b.getAttribute('aria-label'))).toEqual(['DISPENSA E CONSERVE', 'ORTOFRUTTA']);
    const ortofrutta = within(blocchi[1]).getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(ortofrutta).toEqual(['Apri Carote', 'Apri Limoni']);
  });

  it('ogni riga dice formato, unità, classe e fresco', async () => {
    montaPannello('ingredienti', { ingredienti: [CAROTE, LIMONI, OLIO] });
    expect(await screen.findByText('1000 G · PORZIONABILE · FRESCO')).toBeInTheDocument();
    expect(screen.getByText('4 PZ · INTERO · FRESCO')).toBeInTheDocument();
    expect(screen.getByText('1000 ML · A STIMA')).toBeInTheDocument();
  });

  it('in testa la nota di oggi', async () => {
    montaPannello('ingredienti', { ingredienti: [CAROTE] });
    expect(await screen.findByText('Area, formato della confezione e classe decidono cosa finisce in lista e quanto: cambiarli qui cambia le liste da qui in avanti, non quelle già create.')).toBeInTheDocument();
  });

  it('senza ingredienti lo stato vuoto con la nota di oggi', async () => {
    montaPannello('ingredienti', { ingredienti: [] });
    expect(await screen.findByText('Nessun ingrediente')).toBeInTheDocument();
    expect(screen.getByText('Nascono dai piatti: il primo che aggiungi a un piatto compare qui.')).toBeInTheDocument();
  });

  it('mentre legge CARICO…, e se la lettura fallisce lo dice', async () => {
    vi.mocked(leggiIngredienti).mockReturnValueOnce(new Promise(() => {}));
    const { unmount } = montaPannello('ingredienti');
    expect(await screen.findByRole('status')).toHaveTextContent('CARICO…');
    unmount();

    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiIngredienti).mockRejectedValueOnce(new Error('rete'));
    montaPannello('ingredienti');
    expect(await screen.findByText('Non riusciamo a caricare gli ingredienti. Riprova più tardi.')).toBeInTheDocument();
    errore.mockRestore();
  });

  it('il tocco su una riga salva origine e scorrimento e apre l’editor col ritorno al pannello', async () => {
    percorso.valore = '/dispensa';
    montaPannello('ingredienti', { ingredienti: [CAROTE] });
    fireEvent.click(await screen.findByRole('button', { name: 'Apri Carote' }));
    expect(JSON.parse(sessionStorage.getItem('spesa:origine-pannello') ?? 'null')).toEqual({ pathname: '/dispensa', sotto: 'ingredienti' });
    expect(sessionStorage.getItem('spesa:pannello-scroll:ingredienti')).not.toBeNull();
    await waitFor(() => expect(navigatoA()).toContain('/piatti/nuovo/ingredienti/i-1?torna=impostazioni'));
  });
});
```

`findAllByRole('region')`: un `<section>` con `aria-label` ha ruolo `region`. Il contenitore del Task 6 non ne ha altre, quindi sono i blocchi delle aree.

- [ ] **Step 6: Il test dell'ordine delle aree, `aree.test.tsx`.**

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';

// Il blocco dei finti (Task 7, Step 1).
vi.mock('next/navigation', async () => (await import('./finti')).modNavigazione());
vi.mock('@/data/supabase', async () => (await import('./finti')).modSupabase());
vi.mock('@/data/impostazioni', async () => (await import('./finti')).modImpostazioni());
vi.mock('@/data/casa', async () => (await import('./finti')).modCasa());
vi.mock('@/data/risparmio', async () => (await import('./finti')).modRisparmio());
vi.mock('@/data/repertorio', async () => (await import('./finti')).modRepertorio());
vi.mock('@/data/dispensa', async () => (await import('./finti')).modDispensa());
vi.mock('@/data/sessione', async () => (await import('./finti')).modSessione());
vi.mock('@/data/esporta', async () => (await import('./finti')).modEsporta());
vi.mock('@/components/salva-file', async () => (await import('./finti')).modSalvaFile());

import type { AreaId } from '@/domain/types';
import { leggiImpostazioni, salvaImpostazioni } from '@/data/impostazioni';
import { azzera, montaPannello, impostazioni } from './aiuti';

// L'ordine di base (ORDINE_AREE_DEFAULT): la riga del pannello dice DI BASE.
const DI_BASE: AreaId[] = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'];

/** L'ordine a schermo, letto dagli aria-label dei tondi «in alto». */
function ordineAschermo(): string[] {
  return screen.getAllByLabelText(/^Sposta .+ in alto$/).map((b) => b.getAttribute('aria-label')!.replace(/^Sposta | in alto$/g, ''));
}

describe('Ordine delle aree', () => {
  beforeEach(() => azzera());

  // Migra «mostra le sei righe nell’ordine caricato, con le frecce ai limiti disattivate al 35% di opacità».
  it('sei righe nell’ordine salvato; su spento sulla prima, giù spento sull’ultima', async () => {
    montaPannello('aree', { impostazioni: { moltiplicatorePorzioni: 2, ordineAree: DI_BASE } });
    expect(await screen.findByText('Ortofrutta')).toBeInTheDocument();
    expect(screen.getByText('Latticini, uova e salumi')).toBeInTheDocument();
    expect(ordineAschermo()).toEqual(['ORTOFRUTTA', 'MACELLERIA E PESCHERIA', 'LATTICINI, UOVA E SALUMI', 'PASTA, RISO E CEREALI', 'DISPENSA E CONSERVE', 'SURGELATI']);
    expect(screen.getByLabelText('Sposta ORTOFRUTTA in alto')).toBeDisabled();
    expect(screen.getByLabelText('Sposta SURGELATI in basso')).toBeDisabled();
    expect(screen.getByLabelText('Sposta ORTOFRUTTA in basso')).toBeEnabled();
  });

  it('in testa la nota di oggi; l’anteprima della lista non c’è più', async () => {
    montaPannello('aree', { impostazioni: { ordineAree: DI_BASE } });
    expect(await screen.findByText(/^Mettili nell’ordine in cui li incontri camminando nel tuo supermercato\./)).toBeInTheDocument();
    expect(screen.queryByText('ANTEPRIMA DELLA LISTA')).not.toBeInTheDocument();
  });

  // Migra «riordinare con le frecce non salva finché non si preme SALVA ORDINE».
  it('le frecce riordinano senza salvare; SALVA ORDINE è spento finché l’ordine è quello salvato', async () => {
    montaPannello('aree', { impostazioni: { ordineAree: DI_BASE } });
    await screen.findByText('Ortofrutta');
    const salva = screen.getByRole('button', { name: 'SALVA ORDINE' });
    expect(salva).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Sposta MACELLERIA E PESCHERIA in alto'));
    expect(salvaImpostazioni).not.toHaveBeenCalled();
    expect(ordineAschermo().slice(0, 2)).toEqual(['MACELLERIA E PESCHERIA', 'ORTOFRUTTA']);
    expect(salva).toBeEnabled();
    // Rimesso com'era, torna spento.
    fireEvent.click(screen.getByLabelText('Sposta ORTOFRUTTA in alto'));
    expect(salva).toBeDisabled();
  });

  // Migra «SALVA ORDINE persiste il nuovo ordine lasciando intatto tutto il resto, poi torna a Impostazioni»:
  // ora resta sulla sotto-schermata (§C.5), e la riga del pannello dice PERSONALIZZATO al ritorno.
  it('SALVA ORDINE scrive il nuovo ordine con tutto il resto intatto e resta qui', async () => {
    montaPannello('aree', { impostazioni: { moltiplicatorePorzioni: 3, ordineAree: DI_BASE } });
    await screen.findByText('Ortofrutta');
    fireEvent.click(screen.getByLabelText('Sposta SURGELATI in alto'));
    fireEvent.click(screen.getByLabelText('Sposta SURGELATI in alto'));
    const nuovo: AreaId[] = ['ortofrutta', 'macelleria', 'latticini', 'surgelati', 'cereali', 'dispensa'];
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ moltiplicatorePorzioni: 3, ordineAree: nuovo }));
    fireEvent.click(screen.getByRole('button', { name: 'SALVA ORDINE' }));
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledWith(impostazioni({ moltiplicatorePorzioni: 3, ordineAree: nuovo })));
    await waitFor(() => expect(screen.getByRole('button', { name: 'SALVA ORDINE' })).toBeDisabled());
    expect(screen.getByRole('heading', { name: 'Ordine delle aree' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Torna alle impostazioni' }));
    expect(await screen.findByRole('button', { name: /Ordine delle aree.*PERSONALIZZATO/ })).toBeInTheDocument();
  });

  it('mentre salva il tasto dice SALVATAGGIO… a 0,5', async () => {
    montaPannello('aree', { impostazioni: { ordineAree: DI_BASE } });
    await screen.findByText('Ortofrutta');
    vi.mocked(salvaImpostazioni).mockReturnValueOnce(new Promise(() => {}));
    fireEvent.click(screen.getByLabelText('Sposta SURGELATI in alto'));
    fireEvent.click(screen.getByRole('button', { name: 'SALVA ORDINE' }));
    const inVolo = await screen.findByRole('button', { name: 'SALVATAGGIO…' });
    expect(inVolo).toBeDisabled();
    expect(inVolo).toHaveStyle({ opacity: '0.5' });
  });

  // Migra «se il salvataggio fallisce, mostra un errore e resta sulla pagina».
  it('se il salvataggio fallisce l’errore sta sopra il tasto, che si riaccende, e si resta qui', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('aree', { impostazioni: { ordineAree: DI_BASE } });
    await screen.findByText('Ortofrutta');
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    fireEvent.click(screen.getByLabelText('Sposta SURGELATI in alto'));
    fireEvent.click(screen.getByRole('button', { name: 'SALVA ORDINE' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Non siamo riusciti a salvare l'ordine. Riprova.");
    await waitFor(() => expect(screen.getByRole('button', { name: 'SALVA ORDINE' })).toBeEnabled());
    expect(ordineAschermo()[4]).toBe('SURGELATI');
    errore.mockRestore();
  });

  // Migra «il link indietro torna alla pagina statica /impostazioni»: la freccia è
  // del pannello (Task 6) e torna in cima; uscire senza salvare perde l'ordine (§C.5).
  it('la freccia torna in cima senza salvare, e l’ordine non salvato si perde', async () => {
    montaPannello('aree', { impostazioni: { ordineAree: DI_BASE } });
    await screen.findByText('Ortofrutta');
    fireEvent.click(screen.getByLabelText('Sposta SURGELATI in alto'));
    fireEvent.click(screen.getByRole('button', { name: 'Torna alle impostazioni' }));
    fireEvent.click(await screen.findByRole('button', { name: /Ordine delle aree.*DI BASE/ }));
    await screen.findByText('Ortofrutta');
    expect(ordineAschermo()[5]).toBe('SURGELATI');
    expect(salvaImpostazioni).not.toHaveBeenCalled();
  });

  it('se il caricamento fallisce lo dice col testo delle aree', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiImpostazioni).mockRejectedValueOnce(new Error('rete'));
    montaPannello('aree');
    expect(await screen.findByText("Non riusciamo a caricare l'ordine delle aree. Riprova più tardi.")).toBeInTheDocument();
    errore.mockRestore();
  });
});
```

- [ ] **Step 7: Il test della cadenza, `cadenza.test.tsx`.**

I quattro test «due tap veloci» della vecchia pagina provano la coda serializzata di `persistiImpostazioni`, che il Task 6 ha spostato nel provider. Qui girano sul segmento della Cadenza: 90 → 60 → 30 al posto di 1 → 2 → 3.

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';

// Il blocco dei finti (Task 7, Step 1).
vi.mock('next/navigation', async () => (await import('./finti')).modNavigazione());
vi.mock('@/data/supabase', async () => (await import('./finti')).modSupabase());
vi.mock('@/data/impostazioni', async () => (await import('./finti')).modImpostazioni());
vi.mock('@/data/casa', async () => (await import('./finti')).modCasa());
vi.mock('@/data/risparmio', async () => (await import('./finti')).modRisparmio());
vi.mock('@/data/repertorio', async () => (await import('./finti')).modRepertorio());
vi.mock('@/data/dispensa', async () => (await import('./finti')).modDispensa());
vi.mock('@/data/sessione', async () => (await import('./finti')).modSessione());
vi.mock('@/data/esporta', async () => (await import('./finti')).modEsporta());
vi.mock('@/components/salva-file', async () => (await import('./finti')).modSalvaFile());

import type { Impostazioni } from '@/domain/types';
import { leggiImpostazioni, salvaImpostazioni } from '@/data/impostazioni';
import { azzera, montaPannello, impostazioni } from './aiuti';

const tasto = (nome: 'OGNI MESE' | 'OGNI 2 MESI' | 'OGNI 3 MESI') => screen.getByRole('button', { name: nome });
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('Cadenza dei controlli', () => {
  beforeEach(() => azzera());

  it('tre segmenti, OGNI 3 MESI di default, e la nota', async () => {
    montaPannello('cadenza');
    expect(await screen.findByRole('button', { name: 'OGNI 3 MESI' })).toHaveAttribute('aria-pressed', 'true');
    expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'false');
    expect(tasto('OGNI 2 MESI')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText("Ogni quanto ti chiedo se hai ancora olio, sale, farina. La domanda compare in Lista, nell'area del prodotto.")).toBeInTheDocument();
  });

  it('il tocco salva la riga intera con i nuovi giorni, e la riga del pannello lo dice', async () => {
    montaPannello('cadenza');
    await screen.findByRole('button', { name: 'OGNI 3 MESI' });
    vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ giorniControllo: 30 }));
    fireEvent.click(tasto('OGNI MESE'));
    await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledWith(impostazioni({ giorniControllo: 30 })));
    await waitFor(() => expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'true'));
    fireEvent.click(screen.getByRole('button', { name: 'Torna alle impostazioni' }));
    expect(await screen.findByRole('button', { name: /Cadenza dei controlli.*OGNI MESE/ })).toBeInTheDocument();
  });

  it('se il salvataggio fallisce torna al valore di prima e lo dice sotto il segmento', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('cadenza');
    await screen.findByRole('button', { name: 'OGNI 3 MESI' });
    vi.mocked(salvaImpostazioni).mockRejectedValue(new Error('rete'));
    fireEvent.click(tasto('OGNI 2 MESI'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare. Riprova.');
    await waitFor(() => expect(tasto('OGNI 3 MESI')).toHaveAttribute('aria-pressed', 'true'));
    errore.mockRestore();
  });

  describe('due tocchi veloci (la coda serializzata del provider)', () => {
    // Migra «due tap veloci: se la rilettura del primo arriva dopo quella del secondo, resta il valore del secondo».
    it('se la rilettura del primo arriva dopo quella del secondo, resta il valore del secondo', async () => {
      montaPannello('cadenza');
      await screen.findByRole('button', { name: 'OGNI 3 MESI' });
      const riletture: Array<(i: Impostazioni) => void> = [];
      vi.mocked(leggiImpostazioni).mockImplementation(() => new Promise((resolve) => { riletture.push(resolve); }));

      fireEvent.click(tasto('OGNI 2 MESI'));
      await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
      fireEvent.click(tasto('OGNI MESE'));
      await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(2));
      expect(vi.mocked(salvaImpostazioni).mock.calls[1][0].giorniControllo).toBe(30);
      await waitFor(() => expect(riletture).toHaveLength(2));

      riletture[1](impostazioni({ giorniControllo: 30 }));
      await waitFor(() => expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'true'));
      riletture[0](impostazioni({ giorniControllo: 60 }));
      await tick();
      expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'true');
    });

    // Migra «due tap veloci: se il primo salvataggio fallisce, il secondo si scrive lo stesso e resta il suo valore senza errore».
    it('se il primo salvataggio fallisce, il secondo si scrive lo stesso e resta il suo valore senza errore', async () => {
      const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
      montaPannello('cadenza');
      await screen.findByRole('button', { name: 'OGNI 3 MESI' });
      const salvataggi: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
      vi.mocked(salvaImpostazioni).mockImplementation(() => new Promise<void>((resolve, reject) => { salvataggi.push({ resolve, reject }); }));
      vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ giorniControllo: 30 }));

      fireEvent.click(tasto('OGNI 2 MESI'));
      await waitFor(() => expect(salvataggi).toHaveLength(1));
      fireEvent.click(tasto('OGNI MESE'));
      await tick();
      expect(salvataggi).toHaveLength(1); // la seconda scrittura aspetta la prima

      salvataggi[0].reject(new Error('rete'));
      await waitFor(() => expect(salvataggi).toHaveLength(2));
      expect(vi.mocked(salvaImpostazioni).mock.calls[1][0].giorniControllo).toBe(30);
      salvataggi[1].resolve();

      await waitFor(() => expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'true'));
      await tick();
      expect(screen.queryByText('Non siamo riusciti a salvare. Riprova.')).not.toBeInTheDocument();
      errore.mockRestore();
    });

    // Migra «due tap veloci: se il primo riesce ma la sua rilettura non è l’ultima e il secondo fallisce, mostra il valore del server».
    it('se il primo riesce ma la sua rilettura è superata e il secondo fallisce, mostra il valore del server', async () => {
      const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
      montaPannello('cadenza');
      await screen.findByRole('button', { name: 'OGNI 3 MESI' });
      const salvataggi: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
      vi.mocked(salvaImpostazioni).mockImplementation(() => new Promise<void>((resolve, reject) => { salvataggi.push({ resolve, reject }); }));
      // Il server ha il valore del primo tocco (60), da qui in poi.
      vi.mocked(leggiImpostazioni).mockResolvedValue(impostazioni({ giorniControllo: 60 }));

      fireEvent.click(tasto('OGNI 2 MESI'));
      await waitFor(() => expect(salvataggi).toHaveLength(1));
      fireEvent.click(tasto('OGNI MESE'));
      expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'true');

      salvataggi[0].resolve();
      await waitFor(() => expect(leggiImpostazioni).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(salvataggi).toHaveLength(2));
      await tick();
      expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'true');

      salvataggi[1].reject(new Error('rete'));
      expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
      await waitFor(() => expect(tasto('OGNI 2 MESI')).toHaveAttribute('aria-pressed', 'true'));
      expect(leggiImpostazioni).toHaveBeenCalledTimes(3);
      errore.mockRestore();
    });

    // Migra «due tap veloci: se la seconda scrittura fallisce mentre la prima è in volo, alla fine schermo e server dicono 2».
    it('se la seconda scrittura fallisce mentre la prima è in volo, alla fine schermo e server dicono OGNI 2 MESI', async () => {
      const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
      montaPannello('cadenza');
      await screen.findByRole('button', { name: 'OGNI 3 MESI' });
      let sulServer: Impostazioni['giorniControllo'] = 90;
      let confermaPrima: () => void = () => {};
      vi.mocked(salvaImpostazioni)
        .mockImplementationOnce((i) => new Promise<void>((resolve) => {
          confermaPrima = () => { sulServer = i.giorniControllo; resolve(); };
        }))
        .mockRejectedValueOnce(new Error('rete'));
      vi.mocked(leggiImpostazioni).mockImplementation(async () => impostazioni({ giorniControllo: sulServer }));

      fireEvent.click(tasto('OGNI 2 MESI'));
      await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(1));
      fireEvent.click(tasto('OGNI MESE'));
      expect(tasto('OGNI MESE')).toHaveAttribute('aria-pressed', 'true');
      await tick();
      expect(salvaImpostazioni).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Non siamo riusciti a salvare. Riprova.')).not.toBeInTheDocument();

      confermaPrima();
      await waitFor(() => expect(salvaImpostazioni).toHaveBeenCalledTimes(2));
      expect(vi.mocked(salvaImpostazioni).mock.calls[1][0].giorniControllo).toBe(30);
      expect(await screen.findByText('Non siamo riusciti a salvare. Riprova.')).toBeInTheDocument();
      await waitFor(() => expect(tasto('OGNI 2 MESI')).toHaveAttribute('aria-pressed', 'true'));
      errore.mockRestore();
    });
  });
});
```

Se questi quattro test falliscono, il difetto è quasi sempre nel provider (Task 6), non nella Cadenza: confronta `salvaImpostazioni` del provider con `persistiImpostazioni` di oggi (`impostazioni/page.tsx:259-302`), che è il comportamento da tenere. Il Task 6 prova gli stessi scenari nel provider (`dati-pannello.test.tsx`); qui restano perché provano che la sotto-schermata non aggira la coda, e sono loro i sostituti delle righe 6–9 del registro.

- [ ] **Step 8: Il registro.** In `docs/2026-09-25-fase5-decisioni-esecuzione.md`, tabella
  «Migrazione dei test», compila «Test nuovo» (regola del Task 1: file › titolo esatto) e
  «Nota» delle righe del Task 9:

| # | Test nuovo | Nota |
|---|---|---|
| 6 | `cadenza.test.tsx` › Cadenza dei controlli › due tocchi veloci (la coda serializzata del provider) › se la rilettura del primo arriva dopo quella del secondo, resta il valore del secondo | la coda sta nel provider; il campo `PERS` è spento in volo (frame 25), il segmento no |
| 7 | `cadenza.test.tsx` › Cadenza dei controlli › due tocchi veloci (la coda serializzata del provider) › se il primo salvataggio fallisce, il secondo si scrive lo stesso e resta il suo valore senza errore | idem |
| 8 | `cadenza.test.tsx` › Cadenza dei controlli › due tocchi veloci (la coda serializzata del provider) › se il primo riesce ma la sua rilettura è superata e il secondo fallisce, mostra il valore del server | idem |
| 9 | `cadenza.test.tsx` › Cadenza dei controlli › due tocchi veloci (la coda serializzata del provider) › se la seconda scrittura fallisce mentre la prima è in volo, alla fine schermo e server dicono OGNI 2 MESI | idem |
| 48 | `aree.test.tsx` › Ordine delle aree › sei righe nell’ordine salvato; su spento sulla prima, giù spento sull’ultima | lo 0,35 diventa `disabled` con l'icona in `--icona-spenta` |
| 49 | `aree.test.tsx` › Ordine delle aree › le frecce riordinano senza salvare; SALVA ORDINE è spento finché l’ordine è quello salvato | la numerazione delle righe è tolta (frame 13): l'ordine si legge dagli `aria-label` |
| 50 | `aree.test.tsx` › Ordine delle aree › SALVA ORDINE scrive il nuovo ordine con tutto il resto intatto e resta qui | ora resta sulla sotto-schermata (§C.5) |
| 51 | `aree.test.tsx` › Ordine delle aree › se il salvataggio fallisce l’errore sta sopra il tasto, che si riaccende, e si resta qui | apostrofo dritto, testo di §C.5 |
| 52 | `aree.test.tsx` › Ordine delle aree › la freccia torna in cima senza salvare, e l’ordine non salvato si perde | la freccia è del pannello (Task 6) |

  Nella tabella delle decisioni aggiungi, numerando di seguito, le voci di «Le scelte di questo
  task», il chevron di Ingredienti e i testi confermati da Andrea il 26/09.

- [ ] **Step 9: Verifica.**

Run: `npx vitest run src/components/pannello/__tests__/ingredienti.test.tsx src/components/pannello/__tests__/aree.test.tsx src/components/pannello/__tests__/cadenza.test.tsx`
Expected: tutti verdi. Poi `npx vitest run src/components/pannello`: verde.

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npm run lint`
Expected: nessun errore.

- [ ] **Step 10: Commit.**

```bash
git add src/components/pannello/Ingredienti.tsx src/components/pannello/OrdineAree.tsx src/components/pannello/Cadenza.tsx src/components/pannello/schermate.tsx src/components/pannello/__tests__/ingredienti.test.tsx src/components/pannello/__tests__/aree.test.tsx src/components/pannello/__tests__/cadenza.test.tsx docs/2026-09-25-fase5-decisioni-esecuzione.md
```

```bash
git commit -m "feat: ingredienti, ordine delle aree col piede fisso e cadenza dei controlli nel pannello

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Casa condivisa ed Esporta

Le due sotto-schermate che partono dalle tessere. Casa condivisa porta nel pannello la scheda CASA di oggi, nei tre ruoli, con tre cambi: `SICURO?` diventa il Dialogo di conferma, il codice si copia, e il codice scade anche sullo schermo. Esporta è nuova: un tasto nel piede fisso con quattro stati.

**Obiettivo del task:** chi apre Casa condivisa fa tutto quello che fa oggi (creare un codice, entrare, togliere, uscire) con gli stessi errori, e in più copia il codice e non vede un codice scaduto; chi apre Esporta prepara e salva il file con un tocco per passo. Si misura coi sedici test migrati della scheda CASA e coi test nuovi di COPIA, scadenza ed Esporta.

**Files:**
- Create: `src/components/pannello/Casa.tsx`
- Create: `src/components/pannello/Esporta.tsx`
- Modify: `src/components/pannello/schermate.tsx` (le due voci)
- Test: `src/components/pannello/__tests__/casa.test.tsx`, `src/components/pannello/__tests__/esporta.test.tsx`
- Modify: `docs/2026-09-25-fase5-decisioni-esecuzione.md` (registro, e la tabella di copertura completa)

**Interfaces:**
- Consumes:
  - `useDatiPannello()` → `stato` (con `dati.casa`, `dati.utente`), `ricaricaCasa`, `casaCambiata` (Task 6); `usePannello()` → `mostraDialogo` (Task 6);
  - `PiedePannello` (Task 6); `indirizzoPannello` (Task 6, `./indirizzi`);
  - da `./pezzi` (Task 7): `STILE_BLOCCO`, `Nota`, `Carico`, `ErroreCaricamento`, `AvvisoCasaCambiata`;
  - `TastoPrimario`, `TastoSecondario`, `MessaggioErrore`, `Etichetta`, `STILE_PILLOLA` (Task 2);
  - `creaInvito`, `entraInCasa`, `esciDallaCasa`, `rimuoviMembro`, `StatoCasa` (`@/data/casa`, invariati);
  - `preparaEsportazione` (Task 5, `@/data/esporta`); `salvaFile` (Task 5, `@/components/salva-file`);
  - l'aiuto di test del Task 7.
- Produces:
  - `Casa()`, `messaggioEntrata(errore: unknown): string`, `codiceCompitato(codice: string): string`, `DURATA_CODICE_MS`;
  - `Esporta()`;
  - le voci `casa`, `esporta` di `SCHERMATE`.

**Due fatti del provider del Task 6** su cui questo task si appoggia [leggili in `DatiPannello.tsx` prima di cominciare]:
1. **`ricaricaCasa(seFallisce?)` non rigetta mai.** Se `statoCasa()` fallisce, mette `seFallisce` quando c'è, e altrimenti lascia `casa` com'era. Dopo TOGLI si passa come riserva la casa senza il membro tolto: è il caso di oggi «tolto il membro, la rilettura fallisce», la riga sparisce senza errore, e la tessera segue.
2. **`casaCambiata` vale fino al prossimo salvataggio** (e si spegne a ogni apertura): passare da una sotto-schermata all'altra non la spegne. Il test del frame 26B qui sotto lo usa.

**Le scelte di questo task** (vanno nel registro):
- **La scadenza del codice si calcola sul telefono.** `crea_invito()` scrive `scade_il = now() + interval '1 hour'` (`0012_casa.sql:170`) ma restituisce solo il codice (`returns text`), e `creaInvito()` restituisce `String(data)` [misurato]. Il pannello tiene `scadeAlle = Date.now() + 60 min` dal momento in cui la risposta arriva: può essere indietro di qualche secondo rispetto al server, mai avanti. Si controlla ogni minuto e al ritorno in primo piano (`visibilitychange`).
- **Il codice sta nello stato della sotto-schermata.** Uscendo da Casa il riquadro si perde, il codice sul server resta valido: come oggi, che lo perdeva lasciando la pagina.
- **Dopo ESCI DALLA CASA** la pagina si ricarica su `indirizzoPannello(pathname, 'casa')`: una navigazione piena, come oggi (ogni stato in memoria è dell'altra casa), che riapre il pannello su Casa nello stato «da solo». È il modo di tenere insieme il reload di oggi e «il pannello resta su casa» di §C.7.
- **Dopo ENTRA** si ricarica su `/lista`, come oggi: la spec non dice altro.
- **Dopo TOGLI** la casa si rilegge con `ricaricaCasa(senza)`, dove `senza` è la casa di prima senza il membro tolto (e `solo` se non ne restano): se la rilettura fallisce vale `senza`, la riga sparisce senza errore, e la tessera si aggiorna lo stesso.
- **Gli errori delle azioni della casa** (TOGLI, ESCI DALLA CASA, ENTRA) mostrano i loro testi di oggi, nel dialogo o sotto il campo: non passano da `salvaImpostazioni`, e l'avviso «La casa è cambiata…» non li sostituisce (decisione del controller del 26/09). L'avviso resta in testa alla sotto-schermata solo se un salvataggio altrove l'ha acceso (frame 26B).
- **COPIATO dura 2 s.** Se `navigator.clipboard` non c'è (contesto non sicuro, browser vecchio) vale come un fallimento: `Non siamo riusciti a copiarlo. Dettalo a voce.`.
- **Esporta, se `salvaFile` rigetta** (non per un annullamento, che torna `'annullato'`), va allo stato d'errore: `Non siamo riusciti a preparare il file. Riprova.` e `RIPROVA`, che riprepara. La spec non ha un testo per il salvataggio fallito; questo è il più vicino fra quelli che ha.

**Testi dal disegno, confermati da Andrea il 26/09** (la spec §I li riporta):

| Dove | Testo | Fonte |
|---|---|---|
| Etichetta sopra il riquadro del codice | `CODICE DELLA CASA` | frame 15 |
| `aria-label` di TOGLI | `Togli {email} dalla casa` | frame 16 |

Il segnaposto del campo resta quello di oggi, `Ho un codice`; il disegno propone `8 CARATTERI`, che la spec non riporta.

**Apostrofi.** I testi di oggi della scheda CASA restano col loro `’` (`Vale un’ora.`, `l’altra persona`).

- [ ] **Step 1: `Casa.tsx`.**

`messaggioEntrata` si sposta dalla pagina di oggi (`impostazioni/page.tsx:51-66`) senza cambiarla. I testi di oggi: `impostazioni/page.tsx:744`, `763`, `792`, `804`.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { creaInvito, entraInCasa, esciDallaCasa, rimuoviMembro } from '@/data/casa';
import { Etichetta, MessaggioErrore, STILE_PILLOLA, TastoPrimario, TastoSecondario } from '@/components/controlli';
import { usePannello } from './PannelloProvider';
import { useDatiPannello } from './DatiPannello';
import { PiedePannello } from './PiedePannello';
import { indirizzoPannello } from './indirizzi';
import { AvvisoCasaCambiata, Carico, ErroreCaricamento, Nota, STILE_BLOCCO } from './pezzi';

/** Otto caratteri, come li genera `crea_invito` (migrazione 0012). */
const LUNGHEZZA_CODICE = 8;
/** `crea_invito()`: `scade_il = now() + interval '1 hour'`. La RPC non la restituisce. */
export const DURATA_CODICE_MS = 60 * 60_000;
const CONTROLLO_SCADENZA_MS = 60_000;
const DURATA_COPIATO_MS = 2000;

const TESTO_DA_SOLO = 'Chi entra nella tua casa usa i tuoi dati come fossero suoi: vede e cambia lista, piano, dispensa e piatti, e può anche cancellarli. Il suo piano resta da parte finché non esce. Dai il codice solo a chi vive con te.';
const TESTO_MEMBRO = 'Vedi e cambi la sua lista, il suo piano e la sua dispensa, come fossero tuoi. I tuoi restano da parte.';
const NOTA_PROPRIETARIO = 'Ognuno spunta dal suo telefono. La lista si aggiorna quando la riapri.';
const NOTA_CODICE = 'Vale un’ora. Dalle sue Impostazioni, l’altra persona lo inserisce qui sotto.';

/**
 * Il messaggio da mostrare se `entraInCasa` fallisce. Solo un `raise
 * exception` della funzione SQL (SQLSTATE P0001) porta un messaggio scritto
 * per l'utente, in italiano: quello si mostra così com'è. Ogni altro errore
 * (vincolo, rete, permessi) è un messaggio grezzo che non va mostrato.
 */
export function messaggioEntrata(errore: unknown): string {
  if (typeof errore === 'object' && errore !== null) {
    const { code, message } = errore as { code?: unknown; message?: unknown };
    if (code === 'P0001' && typeof message === 'string' && message) return message;
  }
  return 'Non siamo riusciti a entrare. Riprova.';
}

/** «K7P3QX2M» → «K 7 P 3 Q X 2 M»: lo screen reader lo compita (§C.7). */
export function codiceCompitato(codice: string): string {
  return codice.split('').join(' ');
}

/**
 * Ricarica l'app da capo: dopo entra/esci l'id della casa cambia e ogni stato
 * in memoria è di un'altra casa. Incapsulato perché `window.location.assign`
 * non si spia in jsdom.
 */
function ricaricaSu(percorso: string) {
  window.location.assign(percorso);
}

interface Membro { id: string; email: string }

const STILE_TITOLO_SCHEDA = { margin: 0, padding: '0 4px', fontSize: 17, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink)', overflowWrap: 'anywhere' as const };
const STILE_CORPO = { margin: 0, padding: '0 4px', fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)' };
const STILE_ETICHETTA_BLOCCO = { margin: 0, padding: '0 4px 6px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' };

/**
 * Casa condivisa (§C.7, frame 14–18, 26), nei tre ruoli: da solo invita a
 * creare un codice o a inserirne uno; da proprietario elenca chi c'è, lascia
 * togliere ognuno e offre un altro codice; da membro dice di chi è la casa e
 * lascia uscire. TOGLI ed ESCI DALLA CASA passano dal Dialogo di conferma.
 * I primari stanno nel piede fisso del pannello (§B.1, §C.9).
 */
export function Casa() {
  const { mostraDialogo } = usePannello();
  const { stato, ricaricaCasa, casaCambiata } = useDatiPannello();
  const pathname = usePathname();
  const [codice, setCodice] = useState<{ testo: string; scadeAlle: number } | null>(null);
  const [creando, setCreando] = useState(false);
  const [erroreCodice, setErroreCodice] = useState(false);
  const [copia, setCopia] = useState<'ferma' | 'copiato' | 'errore'>('ferma');
  const [scritto, setScritto] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erroreEntrata, setErroreEntrata] = useState<string | null>(null);

  // La scadenza del codice: ogni minuto e al ritorno in primo piano (§C.7, §L).
  useEffect(() => {
    if (!codice) return;
    const controlla = () => {
      if (Date.now() >= codice.scadeAlle) {
        setCodice(null);
        setCopia('ferma');
      }
    };
    const timer = window.setInterval(controlla, CONTROLLO_SCADENZA_MS);
    const suVisibilita = () => {
      if (document.visibilityState === 'visible') controlla();
    };
    document.addEventListener('visibilitychange', suVisibilita);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', suVisibilita);
    };
  }, [codice]);

  // COPIATO per 2 s, poi di nuovo COPIA.
  useEffect(() => {
    if (copia !== 'copiato') return;
    const t = window.setTimeout(() => setCopia('ferma'), DURATA_COPIATO_MS);
    return () => window.clearTimeout(t);
  }, [copia]);

  if (stato.stato === 'carico') return <Carico />;
  if (stato.stato === 'errore' || stato.dati.casa === null) {
    // Frame 26: senza la casa non si sa il ruolo; niente RIPROVA, come dice il testo.
    return <ErroreCaricamento testo="Non riusciamo a leggere la casa. Riprova più tardi." />;
  }
  const casa = stato.dati.casa;
  const io = stato.dati.utente.email;
  const membri: Membro[] = casa.id.map((id, i) => ({ id, email: casa.email[i] }));
  const ruolo = casa.ruolo === 'proprietario' && membri.length === 0 ? 'solo' : casa.ruolo;

  async function crea() {
    if (creando) return;
    setCreando(true);
    setErroreCodice(false);
    try {
      const testo = await creaInvito();
      setCodice({ testo, scadeAlle: Date.now() + DURATA_CODICE_MS });
      setCopia('ferma');
    } catch (e) {
      console.error('pannello/casa: creazione del codice fallita.', e);
      setErroreCodice(true);
    } finally {
      setCreando(false);
    }
  }

  async function copiaCodice(testo: string) {
    try {
      await navigator.clipboard.writeText(testo);
      setCopia('copiato');
    } catch (e) {
      console.error('pannello/casa: copia del codice fallita.', e);
      setCopia('errore');
    }
  }

  async function entra() {
    if (scritto.length < LUNGHEZZA_CODICE || entrando) return;
    setEntrando(true);
    setErroreEntrata(null);
    try {
      await entraInCasa(scritto);
      ricaricaSu('/lista');
    } catch (e) {
      console.error('pannello/casa: entrata nella casa fallita.', e);
      setErroreEntrata(messaggioEntrata(e));
      setEntrando(false);
    }
  }

  function apriTogli(m: Membro) {
    mostraDialogo({
      titolo: `Togliere ${m.email} dalla casa?`,
      testo: 'Non vedrà più la tua lista, il piano e la dispensa, e torna ai suoi dati. Per rientrare le serve un codice nuovo.',
      azione: 'TOGLI',
      tono: 'distruttivo',
      erroreTesto: 'Non siamo riusciti a togliere. Riprova.',
      onConferma: async () => {
        await rimuoviMembro(m.id);
        // Tolto davvero: la casa si riallinea al server. Se la rilettura
        // fallisce non si dice «non siamo riusciti» (sarebbe falso): vale la
        // casa di prima senza di lui, e senza membri si torna allo stato da solo.
        const restano = membri.filter((x) => x.id !== m.id);
        await ricaricaCasa({
          ruolo: restano.length > 0 ? 'proprietario' : 'solo',
          email: restano.map((x) => x.email),
          id: restano.map((x) => x.id),
        });
      },
    });
  }

  function apriEsciCasa(email: string) {
    mostraDialogo({
      titolo: `Uscire dalla casa di ${email}?`,
      testo: 'Torni alla tua lista, al tuo piano e alla tua dispensa, come li avevi lasciati. Per rientrare ti serve un codice nuovo.',
      azione: 'ESCI DALLA CASA',
      tono: 'distruttivo',
      erroreTesto: 'Non siamo riusciti a uscire. Riprova.',
      onConferma: async () => {
        await esciDallaCasa();
        // Il pannello riapre su Casa, da solo, sopra la stessa pagina (§C.7).
        ricaricaSu(indirizzoPannello(pathname, 'casa'));
      },
    });
  }

  const riquadroCodice = codice && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Etichetta dal disegno (frame 15), confermata da Andrea il 26/09. */}
      <div style={{ padding: '6px 4px 0' }}><Etichetta>Codice della casa</Etichetta></div>
      <div style={{ height: 64, borderRadius: 14, background: 'rgba(20,22,58,0.04)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px 0 16px' }}>
        <div
          aria-label={`Codice della casa: ${codiceCompitato(codice.testo)}`}
          style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 21, fontWeight: 700, letterSpacing: '0.16em', fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}
        >
          {codice.testo}
        </div>
        <button
          type="button"
          onClick={() => void copiaCodice(codice.testo)}
          style={{ ...STILE_PILLOLA, flex: 'none', background: 'var(--superficie)', color: 'var(--ink)', border: '1px solid var(--bordo)' }}
        >
          {copia === 'copiato' ? 'COPIATO' : 'COPIA'}
        </button>
      </div>
      {copia === 'errore' && <MessaggioErrore ruolo="alert">Non siamo riusciti a copiarlo. Dettalo a voce.</MessaggioErrore>}
      <Nota>{NOTA_CODICE}</Nota>
    </div>
  );

  const piedeCrea = !codice && (
    <PiedePannello>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {erroreCodice && <MessaggioErrore ruolo="alert">Non siamo riusciti a creare il codice. Riprova.</MessaggioErrore>}
        {ruolo === 'solo' ? (
          <TastoPrimario onClick={() => void crea()} disabled={creando}>CREA UN CODICE</TastoPrimario>
        ) : (
          <TastoSecondario onClick={() => void crea()} disabled={creando}>CREA UN CODICE</TastoSecondario>
        )}
      </div>
    </PiedePannello>
  );

  if (ruolo === 'membro') {
    const proprietario = casa.email[0];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {casaCambiata && <AvvisoCasaCambiata />}
        <section style={{ ...STILE_BLOCCO, padding: '16px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={STILE_TITOLO_SCHEDA}>{`Sei nella casa di ${proprietario}`}</h3>
          <p style={STILE_CORPO}>{TESTO_MEMBRO}</p>
        </section>
        <PiedePannello>
          <TastoSecondario onClick={() => apriEsciCasa(proprietario)}>ESCI DALLA CASA</TastoSecondario>
        </PiedePannello>
      </div>
    );
  }

  if (ruolo === 'proprietario') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {casaCambiata && <AvvisoCasaCambiata />}
        <section style={{ ...STILE_BLOCCO, padding: 12, display: 'flex', flexDirection: 'column' }}>
          <h3 style={STILE_ETICHETTA_BLOCCO}>LA TUA CASA</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, padding: '6px 4px' }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', overflowWrap: 'anywhere', color: 'var(--ink)' }}>{io}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--testo-2)' }}>TU</span>
          </div>
          {membri.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, padding: '6px 0 6px 4px', borderTop: '1px solid var(--bordo)' }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', overflowWrap: 'anywhere', color: 'var(--ink)' }}>{m.email}</span>
              <button
                type="button"
                aria-label={`Togli ${m.email} dalla casa`}
                onClick={() => apriTogli(m)}
                style={{ ...STILE_PILLOLA, flex: 'none', background: 'var(--superficie)', color: 'var(--ink)', border: '1px solid rgba(20,22,58,0.09)' }}
              >
                TOGLI
              </button>
            </div>
          ))}
          <p style={{ margin: 0, padding: '8px 4px 12px', fontSize: 12.5, lineHeight: 1.4, color: 'var(--testo-2)' }}>{NOTA_PROPRIETARIO}</p>
          {riquadroCodice}
        </section>
        {piedeCrea}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {casaCambiata && <AvvisoCasaCambiata />}
      <section style={{ ...STILE_BLOCCO, padding: '16px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={STILE_TITOLO_SCHEDA}>Fai la spesa con qualcuno?</h3>
        <p style={STILE_CORPO}>{TESTO_DA_SOLO}</p>
        {riquadroCodice}
      </section>
      <section style={{ ...STILE_BLOCCO, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{ ...STILE_ETICHETTA_BLOCCO, paddingBottom: 0 }}>HO UN CODICE</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={scritto}
            onChange={(e) => setScritto(e.target.value.toUpperCase())}
            aria-label="Ho un codice"
            placeholder="Ho un codice"
            maxLength={LUNGHEZZA_CODICE}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: 1, minWidth: 0, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 14px',
              background: 'var(--superficie)', border: '1px solid var(--bordo)', boxShadow: 'var(--ombra-pannello)', outline: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)',
            }}
          />
          <button
            type="button"
            onClick={() => void entra()}
            disabled={scritto.length < LUNGHEZZA_CODICE || entrando}
            style={{
              ...STILE_PILLOLA, flex: 'none', border: '1px solid transparent',
              background: scritto.length < LUNGHEZZA_CODICE ? 'rgba(20,22,58,0.10)' : 'var(--ink)',
              color: scritto.length < LUNGHEZZA_CODICE ? 'var(--ter)' : 'var(--superficie)',
              opacity: entrando ? 0.5 : 1,
            }}
          >
            ENTRA
          </button>
        </div>
        {erroreEntrata && <MessaggioErrore ruolo="alert">{erroreEntrata}</MessaggioErrore>}
      </section>
      {piedeCrea}
    </div>
  );
}
```

Note per chi implementa:
- Gli hook (`useState`, i due `useEffect`) stanno tutti sopra il primo `return`.
- `setState` dentro le funzioni di `setInterval`, `setTimeout` e dell'ascoltatore non è «stato impostato nell'effetto»: la regola `react-hooks/set-state-in-effect` non scatta.
- Il proprietario che crea un codice lo vede sotto la nota, dentro il blocco (frame 16, «Decisioni»); il piede perde `CREA UN CODICE` finché il codice vale, come da solo.

- [ ] **Step 2: `Esporta.tsx`.**

```tsx
'use client';

import { useState } from 'react';
import { MessaggioErrore, TastoPrimario } from '@/components/controlli';
import { preparaEsportazione } from '@/data/esporta';
import { salvaFile } from '@/components/salva-file';
import { PiedePannello } from './PiedePannello';
import { STILE_BLOCCO } from './pezzi';

type Fase = { tipo: 'ferma' } | { tipo: 'prepara' } | { tipo: 'pronta'; file: File } | { tipo: 'errore' };

const TESTO = 'Un file con i tuoi piatti, il piano e la dispensa, da tenere: serve se cambi telefono o vuoi una copia.';

/**
 * Esporta i tuoi dati (§C.8, frame 19, 19A–C). Non parte da sola: serve il
 * tocco. Un primario con quattro stati nel piede fisso: PREPARA IL FILE →
 * PREPARO IL FILE… → SALVA IL FILE, oppure l'errore con RIPROVA. Il file
 * preparato vive nello stato della sotto-schermata: uscendo si perde.
 */
export function Esporta() {
  const [fase, setFase] = useState<Fase>({ tipo: 'ferma' });
  const [salvando, setSalvando] = useState(false);

  async function prepara() {
    setFase({ tipo: 'prepara' });
    try {
      setFase({ tipo: 'pronta', file: await preparaEsportazione() });
    } catch (e) {
      console.error('pannello/esporta: preparazione del file fallita.', e);
      setFase({ tipo: 'errore' });
    }
  }

  async function salva(file: File) {
    if (salvando) return;
    setSalvando(true);
    try {
      // 'annullato' non è un errore: il tasto resta SALVA IL FILE (§E.3).
      await salvaFile(file);
    } catch (e) {
      console.error('pannello/esporta: salvataggio del file fallito.', e);
      setFase({ tipo: 'errore' });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <section style={{ ...STILE_BLOCCO, padding: '16px 12px 12px' }}>
        <p style={{ margin: 0, padding: '0 4px', fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)' }}>{TESTO}</p>
      </section>
      <PiedePannello>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fase.tipo === 'pronta' && (
            <p role="status" style={{ margin: '0 4px', fontSize: 12.5, lineHeight: 1.4, color: 'var(--testo-2)', overflowWrap: 'anywhere' }}>
              {`Il file è pronto: ${fase.file.name}.`}
            </p>
          )}
          {fase.tipo === 'errore' && <MessaggioErrore ruolo="alert">Non siamo riusciti a preparare il file. Riprova.</MessaggioErrore>}
          {fase.tipo === 'ferma' && <TastoPrimario onClick={() => void prepara()}>PREPARA IL FILE</TastoPrimario>}
          {fase.tipo === 'prepara' && (
            <TastoPrimario disabled aria-busy="true" style={{ background: 'var(--ink)', color: 'var(--superficie)', boxShadow: 'none', opacity: 0.5 }}>
              PREPARO IL FILE…
            </TastoPrimario>
          )}
          {fase.tipo === 'pronta' && (
            <TastoPrimario onClick={() => void salva(fase.file)} disabled={salvando}>SALVA IL FILE</TastoPrimario>
          )}
          {fase.tipo === 'errore' && <TastoPrimario onClick={() => void prepara()}>RIPROVA</TastoPrimario>}
        </div>
      </PiedePannello>
    </div>
  );
}
```

Il nome del file lo decide `preparaEsportazione` (Task 5, con `nomeFileEsportazione`): la riga di stato mostra `file.name`, così nome mostrato e nome salvato non possono divergere.

- [ ] **Step 3: Registra le due sotto-schermate.** In `schermate.tsx`:

```tsx
import { Casa } from './Casa';
import { Esporta } from './Esporta';

// dentro SCHERMATE:
casa: { titolo: 'Casa condivisa', Componente: Casa },
esporta: { titolo: 'Esporta i tuoi dati', Componente: Esporta },
```

Dopo questo step nessuna voce di `SCHERMATE` è più un segnaposto: controlla che il Task 6 non ne abbia lasciati.

- [ ] **Step 4: Il test della casa, `casa.test.tsx`.**

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within, act } from '@testing-library/react';

// Il blocco dei finti (Task 7, Step 1).
vi.mock('next/navigation', async () => (await import('./finti')).modNavigazione());
vi.mock('@/data/supabase', async () => (await import('./finti')).modSupabase());
vi.mock('@/data/impostazioni', async () => (await import('./finti')).modImpostazioni());
vi.mock('@/data/casa', async () => (await import('./finti')).modCasa());
vi.mock('@/data/risparmio', async () => (await import('./finti')).modRisparmio());
vi.mock('@/data/repertorio', async () => (await import('./finti')).modRepertorio());
vi.mock('@/data/dispensa', async () => (await import('./finti')).modDispensa());
vi.mock('@/data/sessione', async () => (await import('./finti')).modSessione());
vi.mock('@/data/esporta', async () => (await import('./finti')).modEsporta());
vi.mock('@/components/salva-file', async () => (await import('./finti')).modSalvaFile());

import { salvaImpostazioni } from '@/data/impostazioni';
import { creaInvito, entraInCasa, esciDallaCasa, rimuoviMembro, statoCasa } from '@/data/casa';
import { azzera, montaPannello } from './aiuti';

const PROPRIETARIO_DUE = { ruolo: 'proprietario' as const, email: ['a@b.it', 'c@d.it'], id: ['id-1', 'id-2'] };
const MEMBRO = { ruolo: 'membro' as const, email: ['a@b.it'], id: ['id-p'] };

describe('Casa condivisa', () => {
  // `window.location.assign` in jsdom non si spia: si sostituisce `location`
  // con una copia che ha un assign finto, e si ripristina alla fine.
  const locationOriginale = window.location;
  let assign: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    azzera();
    assign = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...locationOriginale, assign }, writable: true, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: locationOriginale, writable: true, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    vi.useRealTimers();
  });

  // Migra «da solo: invita a fare la spesa con qualcuno, offre il codice e il campo per entrare».
  it('da solo: invita, spiega cosa vuol dire, offre il codice e il campo per entrare', async () => {
    montaPannello('casa');
    expect(await screen.findByText('Fai la spesa con qualcuno?')).toBeInTheDocument();
    expect(screen.getByText('Chi entra nella tua casa usa i tuoi dati come fossero suoi: vede e cambia lista, piano, dispensa e piatti, e può anche cancellarli. Il suo piano resta da parte finché non esce. Dai il codice solo a chi vive con te.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CREA UN CODICE' })).toBeInTheDocument();
    expect(screen.getByText('HO UN CODICE')).toBeInTheDocument();
    expect(screen.getByLabelText('Ho un codice')).toHaveAttribute('placeholder', 'Ho un codice');
    expect(screen.getByRole('button', { name: 'ENTRA' })).toBeDisabled();
    expect(screen.queryByText('ESCI DALLA CASA')).not.toBeInTheDocument();
  });

  // Migra «CREA UN CODICE chiama creaInvito e mostra il codice grande con la sua durata».
  it('CREA UN CODICE mostra il codice, compitato per lo screen reader, con la sua durata', async () => {
    vi.mocked(creaInvito).mockResolvedValue('K7P3QX2M');
    montaPannello('casa');
    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));
    expect(await screen.findByLabelText('Codice della casa: K 7 P 3 Q X 2 M')).toHaveTextContent('K7P3QX2M');
    expect(creaInvito).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Vale un’ora. Dalle sue Impostazioni, l’altra persona lo inserisce qui sotto.')).toBeInTheDocument();
    // Il codice prende il posto di CREA UN CODICE.
    expect(screen.queryByRole('button', { name: 'CREA UN CODICE' })).not.toBeInTheDocument();
  });

  // Migra «se creaInvito fallisce lo dice senza rompere la scheda».
  it('se creaInvito fallisce lo dice e CREA UN CODICE resta', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(creaInvito).mockRejectedValue(new Error('rete'));
    montaPannello('casa');
    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));
    expect(await screen.findByText('Non siamo riusciti a creare il codice. Riprova.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Codice della casa/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CREA UN CODICE' })).toBeInTheDocument();
    errore.mockRestore();
  });

  it('COPIA copia il codice e dice COPIATO per 2 secondi', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    vi.mocked(creaInvito).mockResolvedValue('K7P3QX2M');
    montaPannello('casa');
    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));
    fireEvent.click(await screen.findByRole('button', { name: 'COPIA' }));
    expect(await screen.findByRole('button', { name: 'COPIATO' })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('K7P3QX2M');
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(screen.getByRole('button', { name: 'COPIA' })).toBeInTheDocument();
  });

  it('se la copia fallisce, o la clipboard non c’è, dice di dettarlo a voce', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('negato')) }, configurable: true });
    vi.mocked(creaInvito).mockResolvedValue('K7P3QX2M');
    montaPannello('casa');
    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));
    fireEvent.click(await screen.findByRole('button', { name: 'COPIA' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a copiarlo. Dettalo a voce.');
    errore.mockRestore();
  });

  it('dopo un’ora il codice sparisce e torna CREA UN CODICE (controllo al minuto)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(creaInvito).mockResolvedValue('K7P3QX2M');
    montaPannello('casa');
    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));
    await screen.findByLabelText(/^Codice della casa/);
    await act(async () => { vi.advanceTimersByTime(59 * 60_000); });
    expect(screen.getByLabelText(/^Codice della casa/)).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(2 * 60_000); });
    expect(screen.queryByLabelText(/^Codice della casa/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CREA UN CODICE' })).toBeInTheDocument();
  });

  it('al ritorno in primo piano, se l’ora è passata, il codice sparisce subito', async () => {
    vi.mocked(creaInvito).mockResolvedValue('K7P3QX2M');
    montaPannello('casa');
    fireEvent.click(await screen.findByRole('button', { name: 'CREA UN CODICE' }));
    await screen.findByLabelText(/^Codice della casa/);
    const adesso = Date.now();
    const ora = vi.spyOn(Date, 'now').mockReturnValue(adesso + 61 * 60_000);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.queryByLabelText(/^Codice della casa/)).not.toBeInTheDocument();
    ora.mockRestore();
    delete (document as unknown as Record<string, unknown>).visibilityState;
  });

  // Migra «ENTRA maiuscola il codice, chiama entraInCasa e ricarica su /lista».
  it('ENTRA maiuscola il codice, si accende a 8 caratteri, chiama entraInCasa e ricarica su /lista', async () => {
    vi.mocked(entraInCasa).mockResolvedValue(undefined);
    montaPannello('casa');
    const campo = await screen.findByLabelText('Ho un codice');
    fireEvent.change(campo, { target: { value: 'k7p3' } });
    expect(campo).toHaveValue('K7P3');
    expect(screen.getByRole('button', { name: 'ENTRA' })).toBeDisabled();
    // Sei caratteri erano il formato vecchio: non bastano più.
    fireEvent.change(campo, { target: { value: 'k7p3qx' } });
    expect(screen.getByRole('button', { name: 'ENTRA' })).toBeDisabled();
    fireEvent.change(campo, { target: { value: 'k7p3qx2m' } });
    expect(campo).toHaveValue('K7P3QX2M');
    expect(campo).toHaveAttribute('maxlength', '8');
    fireEvent.click(screen.getByRole('button', { name: 'ENTRA' }));
    await waitFor(() => expect(entraInCasa).toHaveBeenCalledWith('K7P3QX2M'));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/lista'));
  });

  // Migra «con un codice sbagliato mostra il messaggio della funzione SQL (P0001) così com’è».
  it('con un codice sbagliato mostra il messaggio della funzione SQL così com’è', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(entraInCasa).mockRejectedValue(Object.assign(new Error('codice non valido o scaduto'), { code: 'P0001' }));
    montaPannello('casa');
    fireEvent.change(await screen.findByLabelText('Ho un codice'), { target: { value: 'AAAAAAAA' } });
    fireEvent.click(screen.getByRole('button', { name: 'ENTRA' }));
    expect(await screen.findByText('codice non valido o scaduto')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    errore.mockRestore();
  });

  // Migra «un errore che non è un raise exception della funzione (es. 23505) non mostra il messaggio grezzo di Postgres».
  it('un errore che non è della funzione non mostra il messaggio grezzo, e si può riprovare', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(entraInCasa).mockRejectedValue(Object.assign(new Error('duplicate key value violates unique constraint "casa_membro_pkey"'), { code: '23505' }));
    montaPannello('casa');
    fireEvent.change(await screen.findByLabelText('Ho un codice'), { target: { value: 'AAAAAAAA' } });
    fireEvent.click(screen.getByRole('button', { name: 'ENTRA' }));
    expect(await screen.findByText('Non siamo riusciti a entrare. Riprova.')).toBeInTheDocument();
    expect(screen.queryByText(/duplicate key/)).not.toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Ho un codice')).toHaveValue('AAAAAAAA');
    expect(screen.getByRole('button', { name: 'ENTRA' })).toBeEnabled();
    errore.mockRestore();
  });

  // Migra «da proprietario: elenca le email dei membri e offre un altro codice, senza ESCI».
  it('da proprietario: tu per primo con TU, poi i membri con TOGLI, la nota e un altro codice; niente ESCI né HO UN CODICE', async () => {
    montaPannello('casa', { casa: PROPRIETARIO_DUE });
    expect(await screen.findByText('LA TUA CASA')).toBeInTheDocument();
    expect(screen.getByText('andrea@esempio.it')).toBeInTheDocument();
    expect(screen.getByText('TU')).toBeInTheDocument();
    expect(screen.getByText('a@b.it')).toBeInTheDocument();
    expect(screen.getByText('c@d.it')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Togli a@b.it dalla casa' })).toBeInTheDocument();
    expect(screen.getByText('Ognuno spunta dal suo telefono. La lista si aggiorna quando la riapri.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CREA UN CODICE' })).toBeInTheDocument();
    expect(screen.queryByText('ESCI DALLA CASA')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ho un codice')).not.toBeInTheDocument();
  });

  // Migra «da proprietario: TOGLI chiede conferma al primo tocco, al secondo toglie per id e rilegge la casa».
  it('da proprietario: TOGLI apre il dialogo; TOGLI nel dialogo toglie per id e rilegge la casa', async () => {
    vi.mocked(statoCasa)
      .mockResolvedValueOnce(PROPRIETARIO_DUE)
      .mockResolvedValueOnce({ ruolo: 'proprietario', email: ['c@d.it'], id: ['id-2'] });
    vi.mocked(rimuoviMembro).mockResolvedValue(undefined);
    montaPannello('casa', { casa: PROPRIETARIO_DUE });
    fireEvent.click(await screen.findByRole('button', { name: 'Togli a@b.it dalla casa' }));
    expect(rimuoviMembro).not.toHaveBeenCalled();
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Togliere a@b.it dalla casa?')).toBeInTheDocument();
    expect(within(dialogo).getByText('Non vedrà più la tua lista, il piano e la dispensa, e torna ai suoi dati. Per rientrare le serve un codice nuovo.')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'TOGLI' }));
    // L'id, non l'email: accoppiati per indice da stato_casa.
    await waitFor(() => expect(rimuoviMembro).toHaveBeenCalledWith('id-1'));
    await waitFor(() => expect(screen.queryByText('a@b.it')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(statoCasa).toHaveBeenCalledTimes(2);
    expect(screen.getByText('c@d.it')).toBeInTheDocument();
    expect(screen.getByText('LA TUA CASA')).toBeInTheDocument();
    // Nessun reload: l'id di chi chiama non è cambiato.
    expect(assign).not.toHaveBeenCalled();
  });

  // Migra «da proprietario: tolto l’ultimo membro la scheda torna allo stato da solo».
  it('da proprietario: tolto l’ultimo membro si torna allo stato da solo', async () => {
    const uno = { ruolo: 'proprietario' as const, email: ['a@b.it'], id: ['id-1'] };
    vi.mocked(statoCasa).mockResolvedValueOnce(uno).mockResolvedValueOnce({ ruolo: 'solo', email: [], id: [] });
    vi.mocked(rimuoviMembro).mockResolvedValue(undefined);
    montaPannello('casa', { casa: uno });
    fireEvent.click(await screen.findByRole('button', { name: 'Togli a@b.it dalla casa' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'TOGLI' }));
    expect(await screen.findByText('Fai la spesa con qualcuno?')).toBeInTheDocument();
    expect(screen.queryByText('LA TUA CASA')).not.toBeInTheDocument();
    expect(screen.queryByText('a@b.it')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Ho un codice')).toBeInTheDocument();
  });

  // Migra «da proprietario: TOGLI armato, un tap fuori disarma senza togliere»: SICURO? è tolto (decisione 8).
  it('da proprietario: ANNULLA chiude il dialogo senza togliere', async () => {
    montaPannello('casa', { casa: { ruolo: 'proprietario', email: ['a@b.it'], id: ['id-1'] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Togli a@b.it dalla casa' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'ANNULLA' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(rimuoviMembro).not.toHaveBeenCalled();
    expect(screen.getByText('a@b.it')).toBeInTheDocument();
  });

  // Migra «se togliere fallisce lo dice e il membro resta in elenco».
  it('se togliere fallisce il dialogo lo dice e il membro resta', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(rimuoviMembro).mockRejectedValue(new Error('nessun membro con questo id nella tua casa'));
    montaPannello('casa', { casa: PROPRIETARIO_DUE });
    fireEvent.click(await screen.findByRole('button', { name: 'Togli a@b.it dalla casa' }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'TOGLI' }));
    expect(await within(dialogo).findByText('Non siamo riusciti a togliere. Riprova.')).toBeInTheDocument();
    expect(screen.getByText('a@b.it')).toBeInTheDocument();
    expect(screen.getByText('c@d.it')).toBeInTheDocument();
    // Nessuna rilettura: la casa non è cambiata.
    expect(statoCasa).toHaveBeenCalledTimes(1);
    errore.mockRestore();
  });

  // Migra «se la rilettura dopo TOGLI fallisce la riga sparisce comunque, senza dire che non siamo riusciti».
  it('se la rilettura dopo TOGLI fallisce la riga sparisce comunque, senza errore', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(statoCasa).mockResolvedValueOnce(PROPRIETARIO_DUE).mockRejectedValueOnce(new Error('rete'));
    vi.mocked(rimuoviMembro).mockResolvedValue(undefined);
    montaPannello('casa', { casa: PROPRIETARIO_DUE });
    fireEvent.click(await screen.findByRole('button', { name: 'Togli a@b.it dalla casa' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'TOGLI' }));
    await waitFor(() => expect(screen.queryByText('a@b.it')).not.toBeInTheDocument());
    expect(screen.getByText('c@d.it')).toBeInTheDocument();
    expect(screen.queryByText('Non siamo riusciti a togliere. Riprova.')).not.toBeInTheDocument();
    expect(screen.queryByText('Non riusciamo a leggere la casa. Riprova più tardi.')).not.toBeInTheDocument();
    errore.mockRestore();
  });

  // Migra «da membro: ESCI DALLA CASA chiede conferma al primo tocco ed esce al secondo».
  it('da membro: dice di chi è la casa; ESCI DALLA CASA apre il dialogo e l’uscita riapre il pannello su Casa', async () => {
    vi.mocked(esciDallaCasa).mockResolvedValue(undefined);
    montaPannello('casa', { casa: MEMBRO });
    expect(await screen.findByText('Sei nella casa di a@b.it')).toBeInTheDocument();
    expect(screen.getByText('Vedi e cambi la sua lista, il suo piano e la sua dispensa, come fossero tuoi. I tuoi restano da parte.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'CREA UN CODICE' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ho un codice')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ESCI DALLA CASA' }));
    expect(esciDallaCasa).not.toHaveBeenCalled();
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText('Uscire dalla casa di a@b.it?')).toBeInTheDocument();
    expect(within(dialogo).getByText('Torni alla tua lista, al tuo piano e alla tua dispensa, come li avevi lasciati. Per rientrare ti serve un codice nuovo.')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ESCI DALLA CASA' }));
    await waitFor(() => expect(esciDallaCasa).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/lista?impostazioni=casa'));
  });

  // Migra «da membro: ESCI armato, un tap fuori disarma senza uscire».
  it('da membro: ANNULLA chiude il dialogo senza uscire', async () => {
    montaPannello('casa', { casa: MEMBRO });
    fireEvent.click(await screen.findByRole('button', { name: 'ESCI DALLA CASA' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'ANNULLA' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(esciDallaCasa).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'ESCI DALLA CASA' })).toBeInTheDocument();
  });

  // Migra «se uscire fallisce lo dice e resta nella casa».
  it('se uscire fallisce il dialogo lo dice e si resta nella casa', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(esciDallaCasa).mockRejectedValue(new Error('rete'));
    montaPannello('casa', { casa: MEMBRO });
    fireEvent.click(await screen.findByRole('button', { name: 'ESCI DALLA CASA' }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ESCI DALLA CASA' }));
    expect(await within(dialogo).findByText('Non siamo riusciti a uscire. Riprova.')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    errore.mockRestore();
  });

  // Migra «se statoCasa fallisce la sezione lo dice e il resto delle impostazioni resta usabile».
  it('se statoCasa fallisce: la sotto-schermata ha solo l’errore, la tessera nessun valore, la cima resta usabile', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('casa', { casa: new Error('rete') });
    expect(await screen.findByText('Non riusciamo a leggere la casa. Riprova più tardi.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'RIPROVA' })).not.toBeInTheDocument();
    expect(screen.queryByText('Fai la spesa con qualcuno?')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'CREA UN CODICE' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Torna alle impostazioni' }));
    expect(await screen.findByRole('button', { name: /Gestione dei pasti.*3 PASTI/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Casa condivisa/ })).not.toHaveTextContent(/SOLO TU|PERSONE|NELLA CASA/);
    errore.mockRestore();
  });

  it('frame 26B: dopo un rifiuto RLS altrove, Casa mostra l’avviso sopra la casa ricaricata', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    montaPannello('cima', { casa: MEMBRO });
    await screen.findByText('Per quante persone cucini');
    vi.mocked(salvaImpostazioni).mockRejectedValue({ code: '42501', message: 'new row violates row-level security policy' });
    vi.mocked(statoCasa).mockResolvedValue({ ruolo: 'solo', email: [], id: [] });
    const campo = screen.getByLabelText('Per quante persone cucini, da 1 a 4');
    fireEvent.change(campo, { target: { value: '2' } });
    fireEvent.blur(campo);
    await screen.findByText('La casa è cambiata: dati ricaricati. Riprova.');
    fireEvent.click(screen.getByRole('button', { name: /^Casa condivisa/ }));
    expect(await screen.findByText('Fai la spesa con qualcuno?')).toBeInTheDocument();
    expect(screen.getByText('La casa è cambiata: dati ricaricati. Riprova.')).toBeInTheDocument();
    errore.mockRestore();
  });
});
```

Il test 26B si appoggia al secondo fatto del provider: `casaCambiata` vale fino al prossimo salvataggio. Se fallisce perché la sotto-schermata la spegne, il difetto è nel provider: non cambiare il test per farlo passare, segnalalo.

- [ ] **Step 5: Il test di Esporta, `esporta.test.tsx`.**

`share` disponibile, non disponibile e `AbortError` sono i test di `salvaFile` del Task 5. Qui si prova come la sotto-schermata usa i suoi tre esiti.

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';

// Il blocco dei finti (Task 7, Step 1).
vi.mock('next/navigation', async () => (await import('./finti')).modNavigazione());
vi.mock('@/data/supabase', async () => (await import('./finti')).modSupabase());
vi.mock('@/data/impostazioni', async () => (await import('./finti')).modImpostazioni());
vi.mock('@/data/casa', async () => (await import('./finti')).modCasa());
vi.mock('@/data/risparmio', async () => (await import('./finti')).modRisparmio());
vi.mock('@/data/repertorio', async () => (await import('./finti')).modRepertorio());
vi.mock('@/data/dispensa', async () => (await import('./finti')).modDispensa());
vi.mock('@/data/sessione', async () => (await import('./finti')).modSessione());
vi.mock('@/data/esporta', async () => (await import('./finti')).modEsporta());
vi.mock('@/components/salva-file', async () => (await import('./finti')).modSalvaFile());

import { preparaEsportazione } from '@/data/esporta';
import { salvaFile } from '@/components/salva-file';
import { azzera, montaPannello } from './aiuti';

const FILE = new File(['{"formato":1}'], 'dispesa-25-09-2026.json', { type: 'application/json' });
const TESTO = 'Un file con i tuoi piatti, il piano e la dispensa, da tenere: serve se cambi telefono o vuoi una copia.';

describe('Esporta i tuoi dati', () => {
  beforeEach(() => azzera());

  it('all’apertura il testo e PREPARA IL FILE; non parte da solo', async () => {
    montaPannello('esporta');
    expect(await screen.findByText(TESTO)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PREPARA IL FILE' })).toBeEnabled();
    expect(preparaEsportazione).not.toHaveBeenCalled();
  });

  it('mentre prepara: PREPARO IL FILE…, spento, a 0,5, aria-busy', async () => {
    vi.mocked(preparaEsportazione).mockReturnValueOnce(new Promise(() => {}));
    montaPannello('esporta');
    fireEvent.click(await screen.findByRole('button', { name: 'PREPARA IL FILE' }));
    const tasto = await screen.findByRole('button', { name: 'PREPARO IL FILE…' });
    expect(tasto).toBeDisabled();
    expect(tasto).toHaveAttribute('aria-busy', 'true');
    expect(tasto).toHaveStyle({ opacity: '0.5' });
  });

  it('pronto: dice il nome del file e SALVA IL FILE lo passa a salvaFile', async () => {
    vi.mocked(preparaEsportazione).mockResolvedValue(FILE);
    vi.mocked(salvaFile).mockResolvedValue('condiviso');
    montaPannello('esporta');
    fireEvent.click(await screen.findByRole('button', { name: 'PREPARA IL FILE' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Il file è pronto: dispesa-25-09-2026.json.');
    fireEvent.click(screen.getByRole('button', { name: 'SALVA IL FILE' }));
    await waitFor(() => expect(salvaFile).toHaveBeenCalledWith(FILE));
    expect(screen.getByRole('button', { name: 'SALVA IL FILE' })).toBeInTheDocument();
  });

  it('se si annulla la condivisione non è un errore: il tasto resta SALVA IL FILE', async () => {
    vi.mocked(preparaEsportazione).mockResolvedValue(FILE);
    vi.mocked(salvaFile).mockResolvedValue('annullato');
    montaPannello('esporta');
    fireEvent.click(await screen.findByRole('button', { name: 'PREPARA IL FILE' }));
    fireEvent.click(await screen.findByRole('button', { name: 'SALVA IL FILE' }));
    await waitFor(() => expect(salvaFile).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'SALVA IL FILE' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('se la preparazione fallisce lo dice, e RIPROVA riprepara', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(preparaEsportazione).mockRejectedValueOnce(new Error('rete')).mockResolvedValueOnce(FILE);
    montaPannello('esporta');
    fireEvent.click(await screen.findByRole('button', { name: 'PREPARA IL FILE' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Non siamo riusciti a preparare il file. Riprova.');
    fireEvent.click(screen.getByRole('button', { name: 'RIPROVA' }));
    expect(await screen.findByRole('button', { name: 'SALVA IL FILE' })).toBeInTheDocument();
    expect(preparaEsportazione).toHaveBeenCalledTimes(2);
    errore.mockRestore();
  });

  it('uscendo dalla sotto-schermata il file preparato si perde', async () => {
    vi.mocked(preparaEsportazione).mockResolvedValue(FILE);
    montaPannello('esporta');
    fireEvent.click(await screen.findByRole('button', { name: 'PREPARA IL FILE' }));
    await screen.findByRole('button', { name: 'SALVA IL FILE' });
    fireEvent.click(screen.getByRole('button', { name: 'Torna alle impostazioni' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Esporta i tuoi dati/ }));
    expect(await screen.findByRole('button', { name: 'PREPARA IL FILE' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Il registro, e il controllo della copertura.** In
  `docs/2026-09-25-fase5-decisioni-esecuzione.md`, tabella «Migrazione dei test», compila «Test
  nuovo» (regola del Task 1: file › titolo esatto) e «Nota» delle righe del Task 10:

| # | Test nuovo | Nota |
|---|---|---|
| 32 | `casa.test.tsx` › Casa condivisa › da solo: invita, spiega cosa vuol dire, offre il codice e il campo per entrare | `CASA` non è più un'etichetta: è il titolo della sotto-schermata |
| 33 | `casa.test.tsx` › Casa condivisa › CREA UN CODICE mostra il codice, compitato per lo screen reader, con la sua durata | `aria-label` lettera per lettera (§C.7) |
| 34 | `casa.test.tsx` › Casa condivisa › se creaInvito fallisce lo dice e CREA UN CODICE resta |  |
| 35 | `casa.test.tsx` › Casa condivisa › ENTRA maiuscola il codice, si accende a 8 caratteri, chiama entraInCasa e ricarica su /lista |  |
| 36 | `casa.test.tsx` › Casa condivisa › con un codice sbagliato mostra il messaggio della funzione SQL così com’è |  |
| 37 | `casa.test.tsx` › Casa condivisa › un errore che non è della funzione non mostra il messaggio grezzo, e si può riprovare |  |
| 38 | `casa.test.tsx` › Casa condivisa › da proprietario: tu per primo con TU, poi i membri con TOGLI, la nota e un altro codice; niente ESCI né HO UN CODICE | `La tua casa` diventa `LA TUA CASA`; tu per primo |
| 39 | `casa.test.tsx` › Casa condivisa › da proprietario: TOGLI apre il dialogo; TOGLI nel dialogo toglie per id e rilegge la casa | `SICURO?` → dialogo `togli` (decisione 8) |
| 40 | `casa.test.tsx` › Casa condivisa › da proprietario: tolto l’ultimo membro si torna allo stato da solo |  |
| 41 | `casa.test.tsx` › Casa condivisa › da proprietario: ANNULLA chiude il dialogo senza togliere | il tocco fuori diventa ANNULLA (il velo non chiude) |
| 42 | `casa.test.tsx` › Casa condivisa › se togliere fallisce il dialogo lo dice e il membro resta | l'errore sta nel dialogo (§D) |
| 43 | `casa.test.tsx` › Casa condivisa › se la rilettura dopo TOGLI fallisce la riga sparisce comunque, senza errore | `ricaricaCasa(seFallisce)` del Task 6 |
| 44 | `casa.test.tsx` › Casa condivisa › da membro: dice di chi è la casa; ESCI DALLA CASA apre il dialogo e l’uscita riapre il pannello su Casa | il reload va a `/lista?impostazioni=casa` (§C.7) |
| 45 | `casa.test.tsx` › Casa condivisa › da membro: ANNULLA chiude il dialogo senza uscire |  |
| 46 | `casa.test.tsx` › Casa condivisa › se uscire fallisce il dialogo lo dice e si resta nella casa |  |
| 47 | `casa.test.tsx` › Casa condivisa › se statoCasa fallisce: la sotto-schermata ha solo l’errore, la tessera nessun valore, la cima resta usabile | frame 26; `casa: null` nel provider (Task 6) |

  Con questo task le righe 1–52 sono tutte migrate. **Non si scrive una seconda tabella di
  copertura nel registro:** la tabella «Migrazione dei test» del Task 1 è quella, e la sezione
  «Copertura dei test vecchi» qui sotto è il suo riassunto nel piano. Controlla adesso che ogni
  riga 1–52 abbia «Test nuovo» e che il test esista: lancia lo script dello Step 12 del Task 11
  (legge il registro e i file di test, non cancella niente). Expected: `test vecchi: 52; senza
  coppia valida nel registro: 0`. Se una riga manca, la scrive il task che la migra («Va a»).

  Nella tabella delle decisioni aggiungi, numerando di seguito: le voci di «Le scelte di questo
  task», i due fatti del provider su cui si appoggia, e i testi confermati da Andrea il 26/09.

- [ ] **Step 7: Verifica.**

Run: `npx vitest run src/components/pannello/__tests__/casa.test.tsx src/components/pannello/__tests__/esporta.test.tsx`
Expected: tutti verdi. Poi `npx vitest run src/components/pannello`: verde.

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npm run lint`
Expected: nessun errore.

- [ ] **Step 8: Commit.**

```bash
git add src/components/pannello/Casa.tsx src/components/pannello/Esporta.tsx src/components/pannello/schermate.tsx src/components/pannello/__tests__/casa.test.tsx src/components/pannello/__tests__/esporta.test.tsx docs/2026-09-25-fase5-decisioni-esecuzione.md
```

```bash
git commit -m "feat: casa condivisa nel pannello coi dialoghi, COPIA e la scadenza del codice; esporta i tuoi dati

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### Copertura dei test vecchi

Tutti i 52 test dei due file vecchi hanno un sostituto: 47 in `src/app/(app)/impostazioni/__tests__/page.test.tsx`, 5 in `src/app/(app)/impostazioni/reparti/__tests__/page.test.tsx` [misurato il 26/09, `grep -c "^\s*it("`]. Il file `impostazioni/ingredienti/` non ha test [misurato]. Le colonne dicono il `describe` e l'`it` di oggi, il task che li migra (lo stesso della colonna «Va a» del registro, Task 1) e il test nuovo in `src/components/pannello/__tests__/`, abbreviato: il titolo esatto sta nel registro.

| # | `describe` di oggi | `it` di oggi | Task | Test nuovo |
|---|---|---|---|---|
| 1 | Impostazioni | mostra i pasti reali letti da leggiSlotDefs, non i quattro cablati nel mock dell’artboard | 8 | `gestione-pasti` › mostra i pasti letti da leggiSlotDefs e il contatore |
| 2 | Impostazioni › Per quante persone cucini | sta nella sezione CASA, dichiara l’assunzione e parte da 1 con il − spento | 7 | `persone` › sta in Come calcolo la lista, dichiara l’assunzione e parte da 1 senza la seconda nota |
| 3 | idem | + salva subito le impostazioni intere con 2, mostra 2 e dice per quanti compra la lista | 7 | `persone` › scritto 2 e uscito dal campo salva le impostazioni intere, … |
| 4 | idem | a 4 il + è spento e non salva | 7 | `persone` › 5, 0, 2,5 e abc non si salvano: … |
| 5 | idem | − scende di uno e salva | 7 | `persone` › con Invio salva senza uscire dal campo: da 3 a 2 |
| 6 | idem | due tap veloci: se la rilettura del primo arriva dopo quella del secondo, resta il valore del secondo | 9 | `cadenza` › due tocchi veloci › se la rilettura del primo arriva dopo quella del secondo, … |
| 7 | idem | due tap veloci: se il primo salvataggio fallisce, il secondo si scrive lo stesso e resta il suo valore senza errore | 9 | `cadenza` › due tocchi veloci › se il primo salvataggio fallisce, … |
| 8 | idem | due tap veloci: se il primo riesce ma la sua rilettura non è l’ultima e il secondo fallisce, mostra il valore del server | 9 | `cadenza` › due tocchi veloci › se il primo riesce ma la sua rilettura è superata e il secondo fallisce, … |
| 9 | idem | due tap veloci: se la seconda scrittura fallisce mentre la prima è in volo, alla fine schermo e server dicono 2 | 9 | `cadenza` › due tocchi veloci › … alla fine schermo e server dicono OGNI 2 MESI |
| 10 | idem | se il salvataggio fallisce e anche la rilettura fallisce, torna all’ultimo valore confermato e lo dice | 7 | `persone` › se falliscono salvataggio e rilettura, … |
| 11 | idem | se il salvataggio fallisce torna al valore del server e lo dice | 7 | `persone` › se il salvataggio fallisce torna al valore del server e lo dice sotto la riga |
| 12 | idem | se la RLS rifiuta il salvataggio (la casa è cambiata) scarta l’id della casa, ricarica tutto e lo dice | 7 | `persone` › se la RLS rifiuta (la casa è cambiata) … sopra i blocchi |
| 13 | idem | un rifiuto RLS riconosciuto dal solo messaggio (senza codice) ricarica allo stesso modo | 7 | `persone` › un rifiuto RLS riconosciuto dal solo messaggio … |
| 14 | Impostazioni | porta all elenco degli ingredienti | 7 | `cima` › la riga Ingredienti apre la sotto-schermata degli ingredienti |
| 15 | Impostazioni | sotto il minimo di 3 pasti il pulsante di rimozione è disattivato | 8 | `gestione-pasti` › a tre pasti le ✕ sono spente e la nota dice il minimo |
| 16 | Impostazioni | sopra il minimo la rimozione funziona e salva l’insieme aggiornato | 8 | `gestione-pasti` › un pasto senza piatti si toglie al tocco … |
| 17 | Impostazioni | al massimo di 6 pasti il pulsante di aggiunta è disattivato | 8 | `gestione-pasti` › a sei pasti AGGIUNGI PASTO non c’è … |
| 18 | Impostazioni | aggiunge un pasto sotto il massimo e lo salva con un id generato | 8 | `gestione-pasti` › AGGIUNGI PASTO crea Nuovo pasto in fondo, … |
| 19 | Impostazioni | la prima riga non può salire e l’ultima non può scendere; riordinare aggiorna le posizioni e salva | 8 | `gestione-pasti` › su spento sul primo, giù spento sull’ultimo; … |
| 20 | Impostazioni | la pastiglia del giorno abitualmente fuori casa ha 44px di area di tap sopra una pillola di 36px | 8 | `pasti-a-casa` › ogni cella è alta 44 e divide la larghezza … |
| 21 | Impostazioni | accende una pastiglia del giorno e salva le assenze abituali aggiornate | 8 | `pasti-a-casa` › un tocco mette Colazione fuori casa il lunedì … |
| 22 | Impostazioni | rinominare un pasto salva il nuovo nome al blur, non a ogni carattere digitato | 8 | `gestione-pasti` › il nome si salva all’uscita dal campo, … |
| 23 | Impostazioni | con leggiSlotDefs() vuoto semina i quattro pasti di default e li salva davvero sul server | 8 | `gestione-pasti` › con leggiSlotDefs() vuoto semina i quattro pasti di default … |
| 24 | Impostazioni | il link ordine dei reparti mostra l’anteprima e il riepilogo nell’ordine reale, non un ordine fisso | 7 | `cima` › la riga Ordine delle aree dice se l’ordine è di base e apre la sotto-schermata |
| 25 | Impostazioni | con il ciclo spento la rotazione si può accendere e dice cosa cambia | 8 | `rotazione` › con NESSUNA dice la nota di oggi; 2 SETT. salva … |
| 26 | Impostazioni | se il salvataggio del ciclo fallisce torna al valore di prima e lo dice | 8 | `rotazione` › se il salvataggio fallisce il segmento torna a NESSUNA … |
| 27 | Impostazioni | il copy del giro con origine futura dice "comincia" | 8 | `rotazione` › con l’origine futura la nota dice «comincia» |
| 28 | Impostazioni | il copy del giro con origine passata (o oggi) dice "è cominciato" | 8 | `rotazione` › con l’origine passata la nota dice «è cominciato» |
| 29 | Impostazioni | RIPARTI da lunedì richiede due tocchi: il primo arma senza salvare, il secondo salva davvero | 8 | `rotazione` › RIPARTI apre il dialogo, e RIPARTI DA LUNEDÌ salva … |
| 30 | Impostazioni | RIPARTI armato: un tap fuori dal bottone annulla senza salvare | 8 | `rotazione` › ANNULLA chiude il dialogo senza salvare; il velo non chiude |
| 31 | Impostazioni | RIPARTI armato: un cambio di stato altrove (la rotazione) lo disarma | 8 | `rotazione` › RIPARTI è spento se l’origine è già il lunedì corrente |
| 32 | Casa | da solo: invita a fare la spesa con qualcuno, offre il codice e il campo per entrare | 10 | `casa` › da solo: invita, spiega cosa vuol dire, … |
| 33 | Casa | CREA UN CODICE chiama creaInvito e mostra il codice grande con la sua durata | 10 | `casa` › CREA UN CODICE mostra il codice, compitato … |
| 34 | Casa | se creaInvito fallisce lo dice senza rompere la scheda | 10 | `casa` › se creaInvito fallisce lo dice e CREA UN CODICE resta |
| 35 | Casa | ENTRA maiuscola il codice, chiama entraInCasa e ricarica su /lista | 10 | `casa` › ENTRA maiuscola il codice, si accende a 8 caratteri, … |
| 36 | Casa | con un codice sbagliato mostra il messaggio della funzione SQL (P0001) così com’è | 10 | `casa` › con un codice sbagliato mostra il messaggio della funzione SQL così com’è |
| 37 | Casa | un errore che non è un raise exception della funzione (es. 23505) non mostra il messaggio grezzo di Postgres | 10 | `casa` › un errore che non è della funzione non mostra il messaggio grezzo, … |
| 38 | Casa | da proprietario: elenca le email dei membri e offre un altro codice, senza ESCI | 10 | `casa` › da proprietario: tu per primo con TU, … |
| 39 | Casa | da proprietario: TOGLI chiede conferma al primo tocco, al secondo toglie per id e rilegge la casa | 10 | `casa` › da proprietario: TOGLI apre il dialogo; … |
| 40 | Casa | da proprietario: tolto l’ultimo membro la scheda torna allo stato da solo | 10 | `casa` › da proprietario: tolto l’ultimo membro si torna allo stato da solo |
| 41 | Casa | da proprietario: TOGLI armato, un tap fuori disarma senza togliere | 10 | `casa` › da proprietario: ANNULLA chiude il dialogo senza togliere |
| 42 | Casa | se togliere fallisce lo dice e il membro resta in elenco | 10 | `casa` › se togliere fallisce il dialogo lo dice e il membro resta |
| 43 | Casa | se la rilettura dopo TOGLI fallisce la riga sparisce comunque, senza dire che non siamo riusciti | 10 | `casa` › se la rilettura dopo TOGLI fallisce la riga sparisce comunque, senza errore |
| 44 | Casa | da membro: ESCI DALLA CASA chiede conferma al primo tocco ed esce al secondo | 10 | `casa` › da membro: dice di chi è la casa; ESCI DALLA CASA apre il dialogo … |
| 45 | Casa | da membro: ESCI armato, un tap fuori disarma senza uscire | 10 | `casa` › da membro: ANNULLA chiude il dialogo senza uscire |
| 46 | Casa | se uscire fallisce lo dice e resta nella casa | 10 | `casa` › se uscire fallisce il dialogo lo dice e si resta nella casa |
| 47 | Casa | se statoCasa fallisce la sezione lo dice e il resto delle impostazioni resta usabile | 10 | `casa` › se statoCasa fallisce: la sotto-schermata ha solo l’errore, … |
| 48 | Ordine dei reparti | mostra le sei righe nell’ordine caricato, con le frecce ai limiti disattivate al 35% di opacità | 9 | `aree` › sei righe nell’ordine salvato; su spento sulla prima, giù spento sull’ultima |
| 49 | Ordine dei reparti | riordinare con le frecce non salva finché non si preme SALVA ORDINE | 9 | `aree` › le frecce riordinano senza salvare; SALVA ORDINE è spento … |
| 50 | Ordine dei reparti | SALVA ORDINE persiste il nuovo ordine lasciando intatto tutto il resto, poi torna a Impostazioni | 9 | `aree` › SALVA ORDINE scrive il nuovo ordine con tutto il resto intatto e resta qui |
| 51 | Ordine dei reparti | se il salvataggio fallisce, mostra un errore e resta sulla pagina | 9 | `aree` › se il salvataggio fallisce l’errore sta sopra il tasto, … |
| 52 | Ordine dei reparti | il link indietro torna alla pagina statica /impostazioni | 9 | `aree` › la freccia torna in cima senza salvare, e l’ordine non salvato si perde |

Per task: Task 7 = 10 (righe 2–5, 10–14, 24); Task 8 = 17 (1, 15–23, 25–31); Task 9 = 9 (6–9, 48–52); Task 10 = 16 (32–47). 10 + 17 + 9 + 16 = 52: nessun test resta senza sostituto.

Tredici test vecchi verificavano un comportamento tolto dalla spec e diventano il test di quello che lo sostituisce: `SICURO?` (29, 30, 31, 39, 41, 44, 45 → dialogo, ANNULLA, RIPARTI spento), lo stepper (2–5 → campo `PERS`), l'anteprima dell'ordine (24 → valore della riga), il ritorno a `/impostazioni` dopo SALVA ORDINE (50 → si resta sulla sotto-schermata). Il registro lo dice riga per riga.

---

### Task 11: Tab bar a tre voci, Testata indietro a pillola, Piatti fuori dalla barra, rimandi

Piatti esce dalla tab bar, che passa a tre voci larghe 96 in una pillola centrata da 304. La
Testata perde la freccia verso `/impostazioni` e prende la pillola che dice dove porta. Piatti e
Importa la usano per tornare al pannello sopra la pagina d'origine. Le tre vecchie route delle
Impostazioni diventano rimandi al pannello. Il loro contenuto e i loro test si cancellano **solo
dopo** aver verificato nel registro che ogni test vecchio ha la sua coppia. Spec §G, §A.1
(rimandi), §L.

**Files:**
- Modify: `src/components/TabBar.tsx`, `src/components/__tests__/tabbar.test.tsx`
- Verify, senza toccarle (scritte dal Task 1): le regole `.barra*` e `.anim-barra*` in `src/app/globals.css`
- Modify: `src/components/Testata.tsx`, `src/components/__tests__/testata.test.tsx`
- Create: `src/app/(app)/piatti/da.ts`, `src/app/(app)/piatti/__tests__/da.test.ts`
- Modify: `src/app/(app)/piatti/page.tsx`, `src/app/(app)/piatti/__tests__/page.test.tsx`
- Modify: `src/app/(app)/lista/page.tsx` (riga 518), `src/app/(app)/lista/__tests__/page.test.tsx`
- Modify: `src/app/(app)/piano/page.tsx` (riga 562), `src/app/(app)/piano/__tests__/page.test.tsx`
- Modify: `src/app/(app)/importa/page.tsx` (`Cornice`, `SchermataRifiuto`, il commento di riga 39),
  `src/app/(app)/importa/__tests__/page.test.tsx`
- Create: `src/app/(app)/impostazioni/Rimando.tsx`, `src/app/(app)/impostazioni/__tests__/rimando.test.tsx`
- Rewrite: `src/app/(app)/impostazioni/page.tsx`, `src/app/(app)/impostazioni/ingredienti/page.tsx`,
  `src/app/(app)/impostazioni/reparti/page.tsx`
- Delete: `src/app/(app)/impostazioni/__tests__/page.test.tsx`,
  `src/app/(app)/impostazioni/reparti/__tests__/page.test.tsx`
- Modify: `docs/2026-09-25-fase5-decisioni-esecuzione.md` (il registro)
- **Non si tocca**, anche se la mappa dei file dell'ossatura lo elenca: l'editor del piatto
  `src/app/(app)/piatti/[id]/page.tsx`. Torna già a `/piatti` [misurato: `router.push('/piatti')`
  alle righe 396, 422, 434 e 483, `href="/piatti"` a riga 1364], e la pillola ritrova `da` da
  `sessionStorage`. Lo Step 12 lo scrive nel registro.

**Interfaces:**
- Consumes: `indirizzoRitorno()`, `indirizzoPannello(pathname, dest)`, `salvaOrigine(o)`
  (`src/components/pannello/indirizzi.ts`, Task 6); `DestinazionePannello`
  (`src/components/pannello/tipi.ts`, Task 6); i token `--barra-larga`, `--barra-larga-giu`,
  `--barra-voce-larga`, `--barra-voce-larga-giu` (Task 1); la tabella «test vecchio → test nuovo»
  del registro (Task 1 la crea, i Task 7–10 la riempiono).
- Produces (vincolanti, ossatura):
  - `Testata` con `indietro?: { etichetta: string; ariaLabel: string; onTorna: () => void }`;
  - `src/app/(app)/piatti/da.ts`: `export type DaPiatti = 'impostazioni' | 'lista' | 'piano'` e
    `export function leggiDaPiatti(search: string): DaPiatti`.
  - In più, non vincolanti: `PILLOLA_DA` e `destinazioneDa(da)` in `da.ts`; `Rimando` in
    `src/app/(app)/impostazioni/Rimando.tsx`.

- [ ] **Step 1: Leggi prima di scrivere.**
  - `src/components/Testata.tsx` com'è **dopo il Task 6**: il Menù utente è un `button` che apre il
    pannello. Qui si tocca solo il ramo `indietro`. Leggi anche i mock che il Task 6 ha messo in
    cima a `src/components/__tests__/testata.test.tsx`.
  - `src/app/globals.css`, le regole `.barra`, `.barra-voce`, `.anim-barra`, `.anim-barra-voce`
    e le loro varianti `.guscio[data-barra="ridotta"]`, come le ha lasciate il Task 1.
  - `src/components/pannello/indirizzi.ts` (Task 6), per `indirizzoRitorno` e `salvaOrigine`.
  - La guida di Next su `useRouter`:
    `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`.
  - Nel registro, la tabella «test vecchio → test nuovo»: il formato l'ha deciso il Task 1.

- [ ] **Step 2: Le regole della barra in `globals.css` (solo verifica).** Le ha scritte il
  Task 1 insieme ai token (spec §G.1, §K), ed è una scelta fissata: la pillola `.barra` è già
  centrata e larga 304 / 244, e le voci restano `flex: 1 1 0` con un tetto `max-width` di 96 / 76.
  Con tre voci il tetto non morde e le voci sono esattamente 96 e 76 [calcolo del Task 1:
  (304 − 12 − 4) / 3, (244 − 12 − 4) / 3]. **Questo task non tocca il CSS della barra.**
  Controlla:

```bash
grep -n "barra-lato\|barra-larga\|barra-voce-larga" src/app/globals.css design/sistema/tokens.css
```

```bash
npx vitest run src/app/__tests__/token.test.ts
```

  Expected: i quattro token nuovi in entrambi i file, nessun `--barra-lato`, e i test «CSS della
  fase 5» del Task 1 verdi (`.barra` centrata a `--barra-larga`, voci col tetto, `.anim-barra`
  su `width` e `height`). Se non lo sono, **fermati**: il difetto è del Task 1, e riscrivere qui
  le regole (per esempio con voci a `width` fissa) romperebbe quei test.

- [ ] **Step 3: I test della tab bar (rossi).** Riscrivi il primo test di
  `src/components/__tests__/tabbar.test.tsx` e aggiungi quello delle voci spente. Gli altri tre
  restano come sono.

```tsx
  it('ha tre voci nell\'ordine Lista, Piano, Dispensa con gli href giusti: Piatti non c\'è più (spec fase 5 §G.1)', () => {
    monta();
    const voci = screen.getAllByRole('link');
    expect(voci.map((v) => v.textContent)).toEqual(['Lista', 'Piano', 'Dispensa']);
    expect(voci.map((v) => v.getAttribute('href'))).toEqual(['/lista', '/piano', '/dispensa']);
    expect(screen.queryByRole('link', { name: 'Piatti' })).toBeNull();
  });

  it.each(['/piatti', '/piatti/d-1', '/importa', '/piatti/nuovo/ingredienti/i-1'])(
    'su %s nessuna voce è attiva (spec fase 5 §G.1)',
    (p) => {
      percorso.valore = p;
      monta();
      for (const voce of screen.getAllByRole('link')) {
        expect(voce).not.toHaveAttribute('aria-current');
        expect(voce).not.toHaveClass('attiva');
      }
      percorso.valore = '/lista';
    },
  );

  it('le voci hanno la classe barra-voce e la barra le classi barra e anim-barra (le misure stanno in globals.css)', () => {
    monta();
    for (const voce of screen.getAllByRole('link')) expect(voce).toHaveClass('barra-voce');
    expect(screen.getByRole('navigation', { name: 'Sezioni' })).toHaveClass('barra', 'anim-barra');
  });
```

  Run: `npx vitest run src/components/__tests__/tabbar.test.tsx`
  Expected: FAIL sul primo test (le voci sono quattro). Il secondo e il terzo passano già:
  `startsWith` non dà attiva nessuna delle tre voci su quei percorsi. Restano come guardia.

- [ ] **Step 4: `TabBar.tsx` a tre voci.** Sostituisci `ICONE`, `VOCI` e la docstring.
  `TabBar()` resta com'è.

```tsx
/** Icone piene a 26 (DESIGN.md v3 §6): copiate da design/sistema/schermate/lista.html. */
const ICONE: Record<'piano' | 'dispensa', (c: string) => React.ReactNode> = {
  piano: (c) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="15.5" rx="4.4" fill={c} />
      <rect x="6.2" y="8.4" width="11.6" height="2.2" rx="1.1" fill="#fff" opacity=".9" />
      <rect x="6.2" y="12.6" width="7" height="2.2" rx="1.1" fill="#fff" opacity=".9" />
    </svg>
  ),
  dispensa: (c) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="3.4" width="14" height="3.6" rx="1.8" fill={c} />
      <path d="M6 9.4h12a1 1 0 0 1 1 1V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8.6a1 1 0 0 1 1-1Z" fill={c} />
      <rect x="8.6" y="12.6" width="6.8" height="2.2" rx="1.1" fill="#fff" opacity=".9" />
    </svg>
  ),
};

/** Tre voci dalla fase 5 (spec §G.1): Piatti si apre dal pannello delle Impostazioni. */
const VOCI = [
  { href: '/lista', etichetta: 'Lista' },
  { href: '/piano', etichetta: 'Piano', icona: 'piano' as const },
  { href: '/dispensa', etichetta: 'Dispensa', icona: 'dispensa' as const },
];

/**
 * Tab bar flottante: pillola bianca larga 304, centrata, alta 84, con tre voci
 * 96 × 72 (flex, con un tetto di 96: con tre voci è esattamente quello). Quando
 * il Guscio segna data-barra="ridotta" scende a 244 × 66 con voci 76 × 54: le
 * etichette si nascondono, la voce resta cliccabile. Si anima la larghezza, non
 * più `left/right` (spec fase 5 §G.1).
 * La voce Lista porta il Marchio, che riflette le aree in cui manca ancora
 * qualcosa. Su Piatti, su Importa e nell'editor dell'ingrediente nessuna voce
 * è attiva: nessun href è prefisso di quei percorsi. Misure e movimento in
 * globals.css.
 */
```

  Run: `npx vitest run src/components/__tests__/tabbar.test.tsx`
  Expected: PASS, 9 casi: i quattro di prima (il primo riscritto), i quattro di `it.each` e
  quello delle classi.

- [ ] **Step 5: I test della Testata (rossi).** In `src/components/__tests__/testata.test.tsx`
  sostituisci l'ultimo test (`con indietro c'è il link Indietro e non c'è il Menù utente`, il
  nome che gli ha dato il Task 6; prima della fase era `con indietro c'è il link Indietro e non
  c'è Impostazioni`) con questi. Tieni i mock del Task 6. Il vecchio test verificava la freccia
  verso `/impostazioni`, che la spec toglie (§G.2). Nel registro compila la riga 54: «Test
  nuovo» = `testata.test.tsx` › Testata (spec §D) › modo indietro: la pillola (spec fase 5 §G.2) ›
  nessun link a /impostazioni resta nella Testata; «Nota» = «più i tre casi di `la pillola dice
  %s e si chiama «%s»` e il titolo a 52 sotto la pillola».

```tsx
  describe('modo indietro: la pillola (spec fase 5 §G.2)', () => {
    it.each([
      ['IMPOSTAZIONI', 'Torna alle impostazioni'],
      ['LISTA', 'Torna alla lista'],
      ['PIANO', 'Torna al piano'],
    ])('la pillola dice %s e si chiama «%s»', (etichetta, ariaLabel) => {
      const onTorna = vi.fn();
      render(<Testata titolo="Piatti" indietro={{ etichetta, ariaLabel, onTorna }} />);
      const pillola = screen.getByRole('button', { name: ariaLabel });
      expect(pillola).toHaveTextContent(etichetta);
      expect(pillola.style.height).toBe('44px');
      fireEvent.click(pillola);
      expect(onTorna).toHaveBeenCalledTimes(1);
    });

    it('con la pillola non c\'è il Menù utente, e il titolo resta a 52 sotto la pillola', () => {
      render(<Testata titolo="Piatti" indietro={{ etichetta: 'IMPOSTAZIONI', ariaLabel: 'Torna alle impostazioni', onTorna: () => {} }} />);
      expect(screen.queryByRole('button', { name: /profilo e impostazioni/ })).toBeNull();
      const titolo = screen.getByRole('heading', { level: 1, name: 'Piatti' });
      expect(titolo.style.fontSize).toBe('52px');
      const pillola = screen.getByRole('button', { name: 'Torna alle impostazioni' });
      // La pillola viene prima del titolo nell'ordine del documento, come nel frame 22.
      expect(pillola.compareDocumentPosition(titolo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('nessun link a /impostazioni resta nella Testata', () => {
      const { container } = render(<Testata titolo="Importa la dieta" indietro={{ etichetta: 'IMPOSTAZIONI', ariaLabel: 'Torna alle impostazioni', onTorna: () => {} }} />);
      expect(container.querySelector('a[href="/impostazioni"]')).toBeNull();
    });
  });
```

  Importa `fireEvent` da `@testing-library/react`, se il file non lo fa già.

  Run: `npx vitest run src/components/__tests__/testata.test.tsx`
  Expected: FAIL, perché oggi `indietro` è un booleano.

- [ ] **Step 6: `Testata.tsx`, il modo indietro.** Cambia la prop e aggiungi il ramo. **Il ramo
  senza `indietro` resta quello del Task 6, parola per parola.** Gli hook della Testata (quelli
  del Task 6: iniziale, pannello, utente) restano in cima e si chiamano sempre, prima del
  `return` anticipato: una chiamata condizionale romperebbe la regola degli hook.

```tsx
interface Props {
  titolo: string;
  /** Etichetta della pillola settimana, in sentence case ("Settimana del 21 settembre"): la
   *  pillola la rende maiuscola da sé (DESIGN.md §3). Assente = niente pillola. */
  settimana?: string;
  /**
   * Modo indietro (spec fase 5 §G.2): una pillola sopra il titolo, al posto del
   * Menù utente. L'etichetta dice dove porta (`IMPOSTAZIONI`, `LISTA`, `PIANO`),
   * `ariaLabel` lo dice per intero, e `onTorna` ci va: la Testata non sa
   * niente di pannello e cronologia, lo sa chi la monta.
   */
  indietro?: { etichetta: string; ariaLabel: string; onTorna: () => void };
}

const STILE_TITOLO = { margin: 0, fontSize: 52, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: 'var(--ink)' } as const;
```

  Nel corpo di `Testata`, subito dopo gli hook:

```tsx
  if (indietro) {
    return (
      <div style={{ padding: '20px 18px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PillolaIndietro {...indietro} />
        <h1 style={STILE_TITOLO}>{titolo}</h1>
      </div>
    );
  }
```

  e in fondo al file:

```tsx
/**
 * La pillola del modo indietro (frame 22): alta 44 su 0,07, freccia 20 e
 * l'etichetta mono 11. È un bottone e non un link: la destinazione può
 * dipendere da `sessionStorage` (l'origine del pannello), che non esiste
 * al momento del render sul server.
 */
function PillolaIndietro({ etichetta, ariaLabel, onTorna }: { etichetta: string; ariaLabel: string; onTorna: () => void }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onTorna}
      style={{
        alignSelf: 'flex-start', height: 44, display: 'flex', alignItems: 'center', gap: 6,
        borderRadius: 999, background: 'var(--barra-attiva)', padding: '0 16px 0 10px', color: 'var(--ink)',
        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {etichetta}
    </button>
  );
}
```

  Il ramo del Menù utente usa `STILE_TITOLO` per il suo `h1`: è lo stesso stile di oggi. Togli
  la vecchia freccia `<Link href="/impostazioni" aria-label="Indietro">` e le condizioni
  `indietro &&` e `!indietro &&`. Se `Link` non ha più usi, togli anche il suo import. La
  docstring della Testata dice ora «a destra il Menù utente; in modo indietro, la pillola sopra
  il titolo».

  Run: `npx vitest run src/components/__tests__/testata.test.tsx`
  Expected: PASS.

- [ ] **Step 7: `da.ts` e i suoi test.** Prima il test, `src/app/(app)/piatti/__tests__/da.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { leggiDaPiatti, destinazioneDa, PILLOLA_DA } from '../da';
import { salvaOrigine } from '@/components/pannello/indirizzi';

const CHIAVE = 'spesa:piatti-da';

describe('leggiDaPiatti (spec fase 5 §G.2)', () => {
  beforeEach(() => sessionStorage.clear());

  it('dall\'URL vince e si salva in sessionStorage', () => {
    expect(leggiDaPiatti('?da=lista')).toBe('lista');
    expect(sessionStorage.getItem(CHIAVE)).toBe('lista');
  });

  it('senza parametro usa quello salvato: è il ritorno dall\'editor del piatto', () => {
    sessionStorage.setItem(CHIAVE, 'piano');
    expect(leggiDaPiatti('')).toBe('piano');
  });

  it('senza parametro né salvato vale impostazioni', () => {
    expect(leggiDaPiatti('')).toBe('impostazioni');
  });

  it('un valore sconosciuto, nell\'URL o salvato, non vale: si scende al passo dopo', () => {
    sessionStorage.setItem(CHIAVE, 'piano');
    expect(leggiDaPiatti('?da=dispensa')).toBe('piano');
    sessionStorage.setItem(CHIAVE, 'boh');
    expect(leggiDaPiatti('')).toBe('impostazioni');
  });

  it('se sessionStorage lancia, l\'URL vale lo stesso e il resto vale impostazioni', () => {
    const originale = Storage.prototype.getItem;
    const originaleSet = Storage.prototype.setItem;
    Storage.prototype.getItem = () => { throw new Error('negato'); };
    Storage.prototype.setItem = () => { throw new Error('negato'); };
    try {
      expect(leggiDaPiatti('?da=lista')).toBe('lista');
      expect(leggiDaPiatti('')).toBe('impostazioni');
    } finally {
      Storage.prototype.getItem = originale;
      Storage.prototype.setItem = originaleSet;
    }
  });
});

describe('PILLOLA_DA e destinazioneDa', () => {
  beforeEach(() => sessionStorage.clear());

  it('le tre etichette e i tre nomi della spec', () => {
    expect(PILLOLA_DA).toEqual({
      impostazioni: { etichetta: 'IMPOSTAZIONI', ariaLabel: 'Torna alle impostazioni' },
      lista: { etichetta: 'LISTA', ariaLabel: 'Torna alla lista' },
      piano: { etichetta: 'PIANO', ariaLabel: 'Torna al piano' },
    });
  });

  it('lista e piano tornano alla pagina, impostazioni al pannello sopra l\'origine', () => {
    expect(destinazioneDa('lista')).toBe('/lista');
    expect(destinazioneDa('piano')).toBe('/piano');
    expect(destinazioneDa('impostazioni')).toBe('/lista?impostazioni=cima');
    salvaOrigine({ pathname: '/dispensa', sotto: 'cima' });
    expect(destinazioneDa('impostazioni')).toBe('/dispensa?impostazioni=cima');
  });
});
```

  Run: `npx vitest run "src/app/(app)/piatti/__tests__/da.test.ts"`
  Expected: FAIL, il modulo non esiste.

  Poi `src/app/(app)/piatti/da.ts`:

```ts
import { indirizzoRitorno } from '@/components/pannello/indirizzi';

/** Da dove si è aperto Piatti, e quindi dove porta la pillola della Testata (spec fase 5 §G.2). */
export type DaPiatti = 'impostazioni' | 'lista' | 'piano';

const CHIAVE = 'spesa:piatti-da';
const VALORI: readonly DaPiatti[] = ['impostazioni', 'lista', 'piano'];

function eDa(v: unknown): v is DaPiatti {
  return typeof v === 'string' && (VALORI as readonly string[]).includes(v);
}

/**
 * Prima l'URL (`?da=`), poi `sessionStorage`, poi `impostazioni`. Quando lo
 * trova nell'URL lo salva: l'editor del piatto torna a `/piatti` senza
 * parametro [misurato: `router.push('/piatti')`], e così ritrova la stessa
 * pillola. `sessionStorage` può lanciare (navigazione privata, spazio
 * esaurito): in quel caso vale solo l'URL.
 */
export function leggiDaPiatti(search: string): DaPiatti {
  const dalUrl = new URLSearchParams(search).get('da');
  if (eDa(dalUrl)) {
    try {
      window.sessionStorage.setItem(CHIAVE, dalUrl);
    } catch {
      // Senza memoria la pillola vale finché si resta su Piatti.
    }
    return dalUrl;
  }
  try {
    const salvato = window.sessionStorage.getItem(CHIAVE);
    if (eDa(salvato)) return salvato;
  } catch {
    // Come sopra: si scende al valore di base.
  }
  return 'impostazioni';
}

/** L'etichetta e il nome accessibile della pillola, dalla tabella di §G.2. */
export const PILLOLA_DA: Record<DaPiatti, { etichetta: string; ariaLabel: string }> = {
  impostazioni: { etichetta: 'IMPOSTAZIONI', ariaLabel: 'Torna alle impostazioni' },
  lista: { etichetta: 'LISTA', ariaLabel: 'Torna alla lista' },
  piano: { etichetta: 'PIANO', ariaLabel: 'Torna al piano' },
};

/**
 * Dove porta la pillola. Per `impostazioni` è il pannello sopra la pagina
 * da cui si era partiti (spec §A.5): si legge al tocco, non al render, perché
 * l'origine sta in `sessionStorage`.
 */
export function destinazioneDa(da: DaPiatti): string {
  if (da === 'lista') return '/lista';
  if (da === 'piano') return '/piano';
  return indirizzoRitorno();
}
```

  Run: `npx vitest run "src/app/(app)/piatti/__tests__/da.test.ts"`
  Expected: PASS. Se il test di `destinazioneDa` fallisce sull'indirizzo, confronta con
  l'implementazione di `indirizzoPannello` del Task 6: l'ossatura dice
  `` `${pathname}?impostazioni=${dest}` ``.

- [ ] **Step 8: Piatti con la pillola (test rossi).** In
  `src/app/(app)/piatti/__tests__/page.test.tsx` aggiungi il mock del router: oggi il file non ce
  l'ha, e `useRouter` fuori da un App Router lancia `invariant expected app router to be mounted`
  [misurato: `node_modules/next/dist/client/components/navigation.js:145`].

```tsx
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }) }));
```

  Nel `beforeEach` del file aggiungi `sessionStorage.clear()`,
  `window.history.replaceState(null, '', '/piatti')` e `push.mockClear()`. Poi i casi:

```tsx
describe('la pillola indietro (spec fase 5 §G.2)', () => {
  it('da impostazioni: IMPOSTAZIONI riapre il pannello sopra l\'origine', async () => {
    mockRepertorio([PIATTO_PRANZO]);
    window.history.replaceState(null, '', '/piatti?da=impostazioni');
    salvaOrigine({ pathname: '/dispensa', sotto: 'cima' });
    render(<Piatti />);
    const pillola = await screen.findByRole('button', { name: 'Torna alle impostazioni' });
    expect(pillola).toHaveTextContent('IMPOSTAZIONI');
    fireEvent.click(pillola);
    expect(push).toHaveBeenCalledWith('/dispensa?impostazioni=cima');
  });

  it('senza origine salvata IMPOSTAZIONI apre il pannello sopra la Lista', async () => {
    mockRepertorio([PIATTO_PRANZO]);
    render(<Piatti />);
    fireEvent.click(await screen.findByRole('button', { name: 'Torna alle impostazioni' }));
    expect(push).toHaveBeenCalledWith('/lista?impostazioni=cima');
  });

  it('da lista: LISTA torna a /lista, e il valore resta per il ritorno dall\'editor', async () => {
    mockRepertorio([]);
    window.history.replaceState(null, '', '/piatti?da=lista');
    render(<Piatti />);
    const pillola = await screen.findByRole('button', { name: 'Torna alla lista' });
    expect(pillola).toHaveTextContent('LISTA');
    fireEvent.click(pillola);
    expect(push).toHaveBeenCalledWith('/lista');
    expect(sessionStorage.getItem('spesa:piatti-da')).toBe('lista');
  });

  it('dall\'editor del piatto (nessun parametro) la pillola è quella salvata: PIANO', async () => {
    mockRepertorio([PIATTO_PRANZO]);
    sessionStorage.setItem('spesa:piatti-da', 'piano');
    render(<Piatti />);
    fireEvent.click(await screen.findByRole('button', { name: 'Torna al piano' }));
    expect(push).toHaveBeenCalledWith('/piano');
  });

  it('niente Menù utente su Piatti', async () => {
    mockRepertorio([PIATTO_PRANZO]);
    render(<Piatti />);
    await screen.findByRole('button', { name: 'Torna alle impostazioni' });
    expect(screen.queryByRole('button', { name: /profilo e impostazioni/ })).toBeNull();
  });
});
```

  Importa `fireEvent` da `@testing-library/react` e `salvaOrigine` da
  `@/components/pannello/indirizzi`. `mockRepertorio([])` vale per lo stato vuoto, che ha la
  stessa `Cornice`: controlla nel file come si chiama la funzione che prepara i mock e adatta.

  Run: `npx vitest run "src/app/(app)/piatti/__tests__/page.test.tsx"`
  Expected: FAIL sui cinque casi nuovi. Gli altri passano.

- [ ] **Step 9: `piatti/page.tsx`.** `da` si legge con `useSyncExternalStore`. Sul server e durante
  l'idratazione vale `impostazioni`, sul client il valore vero. React rifà il render dopo
  l'idratazione, senza errori di mancata corrispondenza. È la via di React per leggere un valore
  che esiste solo nel browser, e non chiede né un `Suspense` né un `setState` in un effetto.
  Leggi la guida di `useSyncExternalStore` di React se non ti torna.

```tsx
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { PILLOLA_DA, destinazioneDa, leggiDaPiatti, type DaPiatti } from './da';

type Indietro = { etichetta: string; ariaLabel: string; onTorna: () => void };

/** Nessun evento da ascoltare: `da` cambia solo con una navigazione, che rimonta la pagina. */
const nessunaIscrizione = () => () => {};

function useDaPiatti(): DaPiatti {
  return useSyncExternalStore(
    nessunaIscrizione,
    () => leggiDaPiatti(window.location.search),
    (): DaPiatti => 'impostazioni',
  );
}
```

  Dentro `Piatti()`, prima degli altri hook:

```tsx
  const router = useRouter();
  const da = useDaPiatti();
  const indietro: Indietro = { ...PILLOLA_DA[da], onTorna: () => router.push(destinazioneDa(da)) };
```

  Passa `indietro` a ogni `Cornice` e a `VuotoPiatti`:
  - `<Cornice indietro={indietro}>` nei tre rami;
  - `<VuotoPiatti indietro={indietro} />`, che lo gira alla sua `Cornice`.

  E la `Cornice`:

```tsx
/** Colonna a tutta altezza con la testata fissa in cima: solo il corpo passato come children scorre.
 *  Piatti non è più una voce della tab bar (spec fase 5 §G): la Testata è sempre in modo indietro. */
function Cornice({ children, indietro }: { children?: ReactNode; indietro: Indietro }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Piatti" indietro={indietro} />
      {children}
    </div>
  );
}
```

  Il resto di Piatti non cambia (§G.2): ricerca, `Nuovo piatto`, righe, stato vuoto. Aggiungi
  alla docstring della pagina una riga: «Si apre dal pannello (§G.2) o dagli stati vuoti di Lista
  e Piano; la pillola della Testata dice dove torna (`da.ts`)».

  Run: `npx vitest run "src/app/(app)/piatti"`
  Expected: PASS, compresi `ricerca.test.tsx` e `vista.test.tsx`. Se uno dei due monta la
  pagina senza mock del router, aggiungi lo stesso mock dello Step 8.

- [ ] **Step 10: Gli stati vuoti di Lista e Piano.**
  - `src/app/(app)/lista/page.tsx:518`: `href: '/piatti'` → `href: '/piatti?da=lista'`. Il Dock
    usa `vuoto.href` alla riga 545, quindi cambia anche lui.
  - `src/app/(app)/piano/page.tsx:562`: `href="/piatti"` → `href="/piatti?da=piano"`.

  Nei test cambia le tre attese:
  - `src/app/(app)/lista/__tests__/page.test.tsx:454` e `:465`:
    `toHaveAttribute('href', '/piatti?da=lista')`;
  - `src/app/(app)/piano/__tests__/page.test.tsx:219`:
    `toHaveAttribute('href', '/piatti?da=piano')`.

  Run: `npx vitest run "src/app/(app)/lista/__tests__/page.test.tsx" "src/app/(app)/piano/__tests__/page.test.tsx"`
  Expected: PASS. Se `lista/__tests__/page.test.tsx` fallisce a intermittenza su un test che non
  c'entra, è il flake noto della fase 3 (ordine dei file, `localStorage`): rilancialo da solo, e
  se passa scrivilo nel rapporto senza toccarlo.

- [ ] **Step 11: Importa (spec §G.3).** Prima i test, in
  `src/app/(app)/importa/__tests__/page.test.tsx`:
  - aggiungi in cima il mock del router, perché la `Cornice` ora lo usa:

```tsx
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }) }));
```

    e nel `beforeEach` `push.mockClear()` e `sessionStorage.clear()`;
  - riscrivi `il secondo tocco di un doppio tocco sul tondo non esce dalla freccia della testata`.
    La freccia ora è la pillola, un `button`: l'ascoltatore in cattura su `window` fa
    `preventDefault` e `stopPropagation`, quindi il click non arriva a React e `push` non parte.

```tsx
  it('il secondo tocco di un doppio tocco sul tondo non esce dalla pillola della testata', async () => {
    rendi();
    await apriEPrendiUnFoglio();
    // `back` emette il `popstate` dentro la chiamata: la fotocamera si chiude e le
    // porte, con la testata, sono già a schermo al tocco successivo.
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }));
    const pillola = screen.getByRole('button', { name: 'Torna alle impostazioni' });
    // `fireEvent.click` restituisce false quando il click è stato annullato.
    expect(fireEvent.click(pillola)).toBe(false);
    expect(push).not.toHaveBeenCalled();
    // Passata la finestra, lo stesso click non è più annullato ed esce.
    passaUnAttimo();
    expect(fireEvent.click(pillola)).toBe(true);
    expect(push).toHaveBeenCalledWith('/lista?impostazioni=cima');
  });
```

  - e aggiungi:

```tsx
  it('la pillola IMPOSTAZIONI riapre il pannello sopra la pagina d\'origine (spec fase 5 §G.3)', async () => {
    salvaOrigine({ pathname: '/piano', sotto: 'cima' });
    rendi();
    const pillola = await screen.findByRole('button', { name: 'Torna alle impostazioni' });
    expect(pillola).toHaveTextContent('IMPOSTAZIONI');
    fireEvent.click(pillola);
    expect(push).toHaveBeenCalledWith('/piano?impostazioni=cima');
  });

  it('rifiuto macro: TORNA A IMPOSTAZIONI fa lo stesso della pillola', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_RIFIUTO_MACRO });
    salvaOrigine({ pathname: '/lista', sotto: 'cima' });
    rendi();
    await inviaUnaFoto();
    passaUnAttimo();
    fireEvent.click(await screen.findByRole('button', { name: 'TORNA A IMPOSTAZIONI' }));
    expect(push).toHaveBeenCalledWith('/lista?impostazioni=cima');
  });
```

  Importa `salvaOrigine` da `@/components/pannello/indirizzi`. La coppia «il secondo tocco … non
  esce dalla freccia della testata» → «… non esce dalla pillola della testata» va nella tabella
  delle decisioni (Step 15).

  Run: `npx vitest run "src/app/(app)/importa/__tests__/page.test.tsx"`
  Expected: FAIL: la pillola non c'è, e `TORNA A IMPOSTAZIONI` è un link.

  Poi `src/app/(app)/importa/page.tsx`:

```tsx
import { indirizzoRitorno } from '@/components/pannello/indirizzi';

/** Colonna a tutta altezza con la testata fissa in cima. La pillola riapre il pannello sopra la
 *  pagina da cui si era partiti (spec fase 5 §G.3, §A.5). */
function Cornice({ children }: { children?: ReactNode }) {
  const router = useRouter();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata
        titolo="Importa la dieta"
        indietro={{ etichetta: 'IMPOSTAZIONI', ariaLabel: 'Torna alle impostazioni', onTorna: () => router.push(indirizzoRitorno()) }}
      />
      {children}
    </div>
  );
}
```

  In `SchermataRifiuto` il `Link` diventa un `button` con lo stesso stile e lo stesso testo:

```tsx
function SchermataRifiuto({ motivazione }: { motivazione: string }) {
  const router = useRouter();
  return (
    <div style={{ margin: '20px 16px', padding: '18px 16px', borderRadius: 18, background: 'var(--superficie)', border: '1px solid var(--bordo)' }}>
      {/* titolo, motivazione e SPIEGAZIONE_RIFIUTO invariati */}
      <button
        type="button"
        onClick={() => router.push(indirizzoRitorno())}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 48, borderRadius: 14,
          fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em',
          border: '1px solid var(--bordo)', color: 'var(--ink)', background: 'none',
        }}
      >
        TORNA A IMPOSTAZIONI
      </button>
    </div>
  );
}
```

  (le tre righe di testo sopra il tasto restano quelle di oggi, righe 456–463). Nel commento di
  `TOCCHI_IGNORATI_DOPO_CHIUSURA_MS` (riga 39) cambia «la freccia indietro della testata (un link
  a /impostazioni)» in «la pillola indietro della testata». Se `Link` non ha più usi nel file,
  togli l'import: `npm run lint` lo segnala.

  Il successo dell'import va ancora a `/piano` (riga 595): non si tocca.

  Run: `npx vitest run "src/app/(app)/importa"`
  Expected: PASS, compresi `riepilogo.test.tsx`, `camera.test.tsx` e gli altri.

- [ ] **Step 12: Il controllo della copertura dei test vecchi (bloccante).** Prima di
  cancellare qualunque file, verifica che ogni test di
  `src/app/(app)/impostazioni/__tests__/page.test.tsx` (47 `it(` [misurato il 26/09]) e di
  `src/app/(app)/impostazioni/reparti/__tests__/page.test.tsx` (5 `it(`) abbia, nella tabella
  «Migrazione dei test» del registro, la riga col suo titolo **esatto** (colonna «Test
  vecchio», regola del Task 1), una colonna «Test nuovo» compilata, e che il titolo nuovo esista
  davvero in un file di test:

```bash
python3 - <<'EOF'
import re, pathlib, sys
registro = pathlib.Path('docs/2026-09-25-fase5-decisioni-esecuzione.md').read_text(encoding='utf-8')
vecchi = [
    'src/app/(app)/impostazioni/__tests__/page.test.tsx',
    'src/app/(app)/impostazioni/reparti/__tests__/page.test.tsx',
]
# Le righe della tabella «Migrazione dei test»: | # | Test vecchio | File | Va a | Test nuovo | Nota |
righe = {}
for riga in registro.splitlines():
    celle = [c.strip() for c in riga.strip().strip('|').split('|')]
    if len(celle) == 6 and celle[0].isdigit():
        righe[celle[1]] = celle[4]
titolo_re = re.compile(r"""\bit\(\s*(['"`])((?:\\.|(?!\1).)*)\1""", re.S)
def pulisci(t):
    return t.replace("\\'", "'").replace('\\"', '"')
# I test nuovi: ogni file di test sotto src, tranne i due vecchi.
nuovi = ''.join(
    pulisci(p.read_text(encoding='utf-8'))
    for p in pathlib.Path('src').rglob('*.test.ts*')
    if str(p) not in vecchi
)
totale, mancano = 0, []
for f in vecchi:
    for m in titolo_re.finditer(pathlib.Path(f).read_text(encoding='utf-8')):
        titolo = pulisci(m.group(2))
        totale += 1
        nuovo = righe.get(titolo)
        if nuovo is None:
            mancano.append((f, titolo, 'nessuna riga col titolo esatto'))
        elif not nuovo:
            mancano.append((f, titolo, '«Test nuovo» vuoto'))
        else:
            # «Test nuovo» è `file` › describe › it: conta l'ultimo pezzo, il titolo dell'it.
            it_nuovo = nuovo.split('›')[-1].strip()
            if it_nuovo not in nuovi:
                mancano.append((f, titolo, f'test nuovo non trovato: {it_nuovo}'))
print(f'test vecchi: {totale}; senza coppia valida nel registro: {len(mancano)}')
for f, t, perche in mancano:
    print(f'- {f}: {t} ({perche})')
sys.exit(1 if mancano else 0)
EOF
```

  Expected: `test vecchi: 52; senza coppia valida nel registro: 0`, uscita 0.

  **Se ne manca anche uno solo: fermati.** Non cancellare niente e non andare avanti con gli
  Step 13–15. Riporta l'elenco dei titoli mancanti col motivo: la coppia la scrive il task che
  ha migrato quella sotto-schermata (colonna «Va a»: Task 7–10), o chi coordina. Se il totale
  non è 52, il file è cambiato dopo il 26/09: rileggi `grep -c "^\s*it(" <file>` e annota la
  differenza nel registro.

  Poi fai girare i test nuovi, così le coppie non puntano a test rotti:

```bash
npx vitest run src/components/pannello
```

  Expected: PASS.

- [ ] **Step 13: I rimandi (test rossi).** Crea `src/app/(app)/impostazioni/__tests__/rimando.test.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }) }));

import Impostazioni from '../page';
import Ingredienti from '../ingredienti/page';
import Reparti from '../reparti/page';

describe('le vecchie route delle Impostazioni fanno da rimando al pannello (spec fase 5 §A.1)', () => {
  beforeEach(() => replace.mockClear());

  it.each([
    ['/impostazioni', '/lista?impostazioni=cima', Impostazioni],
    ['/impostazioni/ingredienti', '/lista?impostazioni=ingredienti', Ingredienti],
    ['/impostazioni/reparti', '/lista?impostazioni=aree', Reparti],
  ])('%s manda a %s', (_percorso, verso, Pagina) => {
    const { container } = render(<Pagina />);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(verso);
    expect(container).toBeEmptyDOMElement();
  });
});
```

  Run: `npx vitest run "src/app/(app)/impostazioni/__tests__/rimando.test.tsx"`
  Expected: FAIL: le pagine di oggi non chiamano `replace`.

- [ ] **Step 14: I rimandi, il codice.** Crea `src/app/(app)/impostazioni/Rimando.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { indirizzoPannello } from '@/components/pannello/indirizzi';
import type { DestinazionePannello } from '@/components/pannello/tipi';

/**
 * Le Impostazioni non sono più una pagina ma un pannello montato nel Guscio
 * (spec fase 5 §A.1). Le tre route di prima restano per segnalibri,
 * cronologia e link salvati, e mandano alla Lista col pannello aperto sulla
 * destinazione giusta. `replace` e non `push`: il rimando non deve restare
 * nella cronologia, altrimenti l'indietro ci ricadrebbe dentro. Non disegna
 * niente: per un istante si vedono il Guscio e la tab bar.
 */
export function Rimando({ verso }: { verso: DestinazionePannello }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(indirizzoPannello('/lista', verso));
  }, [router, verso]);
  return null;
}
```

  Poi **riscrivi** le tre pagine. Il contenuto di oggi è migrato nei componenti del pannello
  (Task 7–10), e lo Step 12 l'ha verificato.
  - `src/app/(app)/impostazioni/page.tsx`:

```tsx
import { Rimando } from './Rimando';

/** Rimando al pannello in cima (spec fase 5 §A.1). Il contenuto di prima vive in src/components/pannello/. */
export default function Impostazioni() {
  return <Rimando verso="cima" />;
}
```

  - `src/app/(app)/impostazioni/ingredienti/page.tsx`:

```tsx
import { Rimando } from '../Rimando';

/** Rimando al pannello sugli Ingredienti (spec fase 5 §A.1). */
export default function Ingredienti() {
  return <Rimando verso="ingredienti" />;
}
```

  - `src/app/(app)/impostazioni/reparti/page.tsx`:

```tsx
import { Rimando } from '../Rimando';

/** Rimando al pannello sull'Ordine delle aree (spec fase 5 §A.1). */
export default function Reparti() {
  return <Rimando verso="aree" />;
}
```

  Le pagine restano componenti server che montano un componente client: non serve
  `'use client'` sul file della pagina. Poi cancella i vecchi test:

```bash
git rm "src/app/(app)/impostazioni/__tests__/page.test.tsx"
```

```bash
git rm "src/app/(app)/impostazioni/reparti/__tests__/page.test.tsx"
```

  E cerca quello che restava legato alla pagina di prima:

```bash
grep -rn "/impostazioni\b\|impostazioni/ingredienti\|impostazioni/reparti" src --include="*.ts" --include="*.tsx"
```

  Expected: solo i tre file di pagina riscritti, `Rimando.tsx`, `rimando.test.tsx` e la
  destinazione di ritorno dell'editor dell'ingrediente
  (`src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx:114`, `'/impostazioni/ingredienti'`).
  Quella cambia nel Task 12, e fino ad allora passa dal rimando e funziona. Qualunque altra riga
  è un link rimasto indietro: correggilo con `indirizzoRitorno()` o `indirizzoPannello`, e
  scrivilo nel registro.

  Run: `npx vitest run "src/app/(app)/impostazioni"`
  Expected: PASS, un file, tre casi.

- [ ] **Step 15: Il registro.** In `docs/2026-09-25-fase5-decisioni-esecuzione.md`, nella tabella
  delle decisioni, aggiungi:
  1. l'editor del piatto non cambia: la pillola ritrova `da` da `sessionStorage` [misurato:
     i ritorni a `/piatti` alle righe 396, 422, 434, 483 e 1364]. L'ossatura lo elencava fra i
     file modificati;
  2. `da` si legge con `useSyncExternalStore`, server `impostazioni`: niente `setState` in un
     effetto, niente mancata corrispondenza all'idratazione. Costo se sbagliato: su un
     ricaricamento pieno di `/piatti?da=lista` la pillola dice `IMPOSTAZIONI` per un render;
  3. **il limite dichiarato** [ipotesi, non provato nel browser]: chi apre un piatto dal Piano
     (`router.push('/piatti/{id}')`) e torna con la freccia dell'editor arriva su Piatti, non sul
     Piano. È così dalla fase 3. Con Piatti fuori dalla barra, la pillola dice l'ultimo `da`
     salvato, o `IMPOSTAZIONI` se non ce n'è. Non si corregge qui: va anche in «Domande per
     Andrea (in review)»;
  4. la coppia del test di Importa (Step 11: «il secondo tocco … non esce dalla freccia della
     testata» → «… non esce dalla pillola della testata»), e l'esito dello script dello Step 12
     con i numeri. La coppia della Testata sta nella riga 54 della «Migrazione dei test» (Step 5).

- [ ] **Step 16: La suite intera e la build.**

  Run, un comando alla volta:
  - `npx vitest run src/components/__tests__/tabbar.test.tsx src/components/__tests__/testata.test.tsx "src/app/(app)/piatti" "src/app/(app)/importa" "src/app/(app)/impostazioni" "src/app/(app)/lista/__tests__/page.test.tsx" "src/app/(app)/piano/__tests__/page.test.tsx"`
  - `npm test`
  - `npx tsc --noEmit` (in un worktree nuovo, prima `npx next typegen`)
  - `npm run lint`
  - `npm run design:token`
  - `npm run build`

  Expected: tutto verde. La build è il controllo che le tre pagine rimando non esportino altro
  che il `default`. Next rifiuta gli export sconosciuti di una `page.tsx`.

- [ ] **Step 17: Commit.**

```bash
git add src/components/TabBar.tsx src/components/Testata.tsx src/components/__tests__/tabbar.test.tsx src/components/__tests__/testata.test.tsx "src/app/(app)/piatti" "src/app/(app)/lista" "src/app/(app)/piano" "src/app/(app)/importa" "src/app/(app)/impostazioni" docs/2026-09-25-fase5-decisioni-esecuzione.md
```

  (aggiungi `src/app/globals.css` solo se lo Step 2 l'ha toccato), poi:

```bash
git commit -m "feat: la tab bar a tre voci, la pillola indietro, Piatti e Importa che tornano al pannello, i rimandi delle vecchie Impostazioni

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: L'editor dell'ingrediente

L'editor passa al frame 12. In testata c'è la freccia che segue `torna` e corregge il difetto di
oggi. I campi diventano Area, Confezione con la scansione, Come si consuma e Fresco. Prezzo ed
Elimina restano. SALVA va nel Dock, che senza tab bar scende a 22 dal fondo. La scansione legge
il codice in un foglio e lega l'EAN al SALVA. La route e i due ingressi, dal piatto e dal
pannello, restano gli stessi: le modifiche valgono per entrambi. Spec §F, §F.1.

**Files:**
- Rewrite: `src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx`
- Modify: `src/app/(app)/piatti/[id]/ingredienti/[ingId]/__tests__/page.test.tsx`
- Modify: `src/components/Dock.tsx`, `src/components/__tests__/dock.test.tsx`
- Modify: `src/app/globals.css` (una regola: il Dock senza barra)
- Modify: `docs/2026-09-25-fase5-decisioni-esecuzione.md`

L'ossatura elenca per questo task solo la pagina. Dock, test del Dock e `globals.css` servono per
§F «Con la barra nascosta il Dock va a `bottom 22`» (Step 2). Nessun token nuovo:
`--barra-fondo` vale già 22.

**Interfaces:**
- Consumes: `indirizzoRitorno()`, `salvaOrigine()` (Task 6, `src/components/pannello/indirizzi.ts`);
  `useIndietroFogli(profondita, chiudiUltimo): { chiudiTuttoPoi }` (Task 2,
  `src/components/useIndietroFogli.ts`); `DialogoConferma` (Task 2); `Etichetta`,
  `MessaggioErrore`, `STILE_PILLOLA`, `TastoPrimario`, `TastoSecondario` (Task 2,
  `src/components/controlli.tsx`); `FoglioDalBasso`, `TestataFoglio`; `useNascondiBarra`,
  `useBarraNascosta`; `Dock`; `LettoreCodice` e `cercaProdotto`
  (`src/app/(app)/dispensa/LettoreCodice.tsx`), `IconaScansione`
  (`src/app/(app)/dispensa/icone.tsx`); `proprietario` e `MSG_CATALOGO`
  (`src/domain/scansione-dispensa.ts`); `salvaIngrediente` (accetta già `ean?`, vedi
  `src/data/repertorio.ts:163-193`); `leggiImpostazioni` (`src/data/impostazioni.ts`, con
  `giorniControllo` dal Task 3); `ogniCadenza`, `GIORNI_CONTROLLO_DEFAULT`, `GiorniControllo`
  (Task 3, `src/domain/pantry.ts`).
- Produces: la pagina; la classe `.dock-senza-barra`, che `Dock` mette da sé quando la barra è
  nascosta.

**La vista di lettura è `LettoreCodice`** (decisione del controller del 26/09; la spec §F.1 lo
dice dal 26/09). La spec del 25/09 nominava `Scanner` (`src/components/Scanner.tsx`) e la
chiamava «la vista di lettura della fase 4», ma sono due cose diverse [misurato]:
- la vista di lettura della fase 4 è `LettoreCodice` (Dispensa: anteprima con la cornice guida,
  `DIGITA IL CODICE`, campo `Codice a barre`);
- `Scanner` è il componente di `/lista/confezioni` della fase 2, col tasto `ANNULLA` alto 40,
  sotto i 44 dei Global Constraints.

`LettoreCodice` sta dentro un `FoglioDalBasso` con `TestataFoglio`: la X del foglio fa da
annulla. È lo stesso schema di `NuovoIngrediente.tsx`, e il frame 12 dice «come nella Dispensa
v2». Va nel registro.

**La nota della classe «a stima» dice la cadenza scelta** (decisione di Andrea del 26/09).
Oggi dice «Ogni 90 giorni dall’ultimo acquisto…» [misurato: `page.tsx:23`, test a
`…/__tests__/page.test.tsx:148`]; diventa «Ogni mese / Ogni 2 mesi / Ogni 3 mesi dall’ultimo
acquisto la lista ti chiede se ne hai ancora.», con `ogniCadenza` del Task 3. Il resto della
frase, apostrofo tipografico compreso, resta quello di oggi. Per saperla l'editor legge
`leggiImpostazioni()`; se la lettura fallisce vale `GIORNI_CONTROLLO_DEFAULT` (ogni 3 mesi) e
l'editor funziona lo stesso.

- [ ] **Step 1: Leggi prima di scrivere.**
  - La pagina di oggi, tutta, e il suo test (380 righe, 20 test).
  - `src/components/DialogoConferma.tsx` (Task 2): **non si avvolge da sé** (ossatura). Chi lo
    usa lo mette in un `FoglioDalBasso` con `ruolo="alertdialog"`, `altezza="contenuto"`,
    `chiudiDalVelo={false}` e `livello` 2 (qui: sopra la pagina, lo stesso z del dialogo della
    Dispensa) o 3 (sopra il pannello). Lo Step 4 fa così.
  - `src/components/useIndietroFogli.ts` (Task 2), per `chiudiTuttoPoi`. Nel registro, l'esito
    della sonda del Task 2: con «regge» `apriAltro` usa `chiudiTuttoPoi` + `router.push` (il
    codice dello Step 4); con «non regge» (ramo B, come il Task 6) prendi anche `lasciaVoci`
    dall'hook e `apriAltro` diventa `lasciaVoci(); chiudiScansione(); router.replace(dest);`.
  - `src/app/(app)/dispensa/NuovoIngrediente.tsx` e il suo test `dispensa/__tests__/nuovo.test.tsx`:
    il modello della scansione (§F.3 della spec fase 4) e il modo di finta di `useLettoreCodici`.
  - Il testo della nota degli Ingredienti come l'ha lasciato il Task 9 (`Ingredienti.tsx`). È «la
    nota di oggi» di §F punto 6: `Area, formato della confezione e classe decidono cosa finisce in
    lista e quanto: cambiarli qui cambia le liste da qui in avanti, non quelle già create.`

- [ ] **Step 2: Il Dock senza barra.** Prima il test, in `src/components/__tests__/dock.test.tsx`:

```tsx
import { BarraProvider, useNascondiBarra } from '../barra-context';

function NascondeLaBarra() {
  useNascondiBarra(true);
  return null;
}

it('con la tab bar nascosta il Dock prende dock-senza-barra (spec fase 5 §F)', () => {
  const slot = document.createElement('div');
  document.body.appendChild(slot);
  render(
    <BarraProvider>
      <SlotDockProvider slot={slot}>
        <NascondeLaBarra />
        <Dock><button type="button">SALVA</button></Dock>
      </SlotDockProvider>
    </BarraProvider>,
  );
  expect(slot.querySelector('.dock')).toHaveClass('dock', 'anim-dock', 'dock-senza-barra');
  slot.remove();
});

it('con la tab bar al suo posto il Dock non ha dock-senza-barra', () => {
  const slot = document.createElement('div');
  document.body.appendChild(slot);
  render(
    <BarraProvider>
      <SlotDockProvider slot={slot}>
        <Dock><button type="button">SALVA</button></Dock>
      </SlotDockProvider>
    </BarraProvider>,
  );
  expect(slot.querySelector('.dock')).not.toHaveClass('dock-senza-barra');
  slot.remove();
});
```

  (Leggi come il file importa `SlotDockProvider`, `Dock` e `render`, e usa gli stessi import.)

  Run: `npx vitest run src/components/__tests__/dock.test.tsx`
  Expected: FAIL sul primo.

  Poi `src/components/Dock.tsx`. L'hook va prima del `return null`:

```tsx
import { useBarraNascosta } from './barra-context';

export function Dock({ children, sciolto = false }: { children: ReactNode; sciolto?: boolean }) {
  const slot = useSlotDock();
  // Senza tab bar (l'editor dell'ingrediente, spec fase 5 §F) il Dock scende dove
  // starebbe lei: lo decide il CSS con `.dock-senza-barra`. Lo chiede chi nasconde la
  // barra con `useNascondiBarra`, il Dock lo legge e basta.
  const senzaBarra = useBarraNascosta();
  if (slot === null) return null;
  const classi = `dock anim-dock${sciolto ? ' dock-sciolto' : ''}${senzaBarra ? ' dock-senza-barra' : ''}`;
  return createPortal(
    <div className={classi} role="region" aria-label="Azione principale">{children}</div>,
    slot,
  );
}
```

  Tieni i commenti di oggi, e aggiungi alla docstring: «Senza tab bar sta a 22 dal fondo
  (`.dock-senza-barra`)». In `src/app/globals.css`, subito dopo
  `.guscio[data-barra="ridotta"] .dock { … }`:

```css
/* Senza tab bar (l'editor dell'ingrediente, spec fase 5 §F): il Dock scende dove
   starebbe la barra, a 22 dal fondo. Il selettore batte anche la regola ridotta:
   `data-barra` continua a cambiare con lo scorrimento anche quando la barra non c'è. */
.guscio[data-barra] .dock.dock-senza-barra { bottom: var(--barra-fondo); }
```

  La specificità è 0,4,0 contro lo 0,3,0 della regola ridotta. La transizione di `bottom`
  (`.anim-dock`) resta quella di oggi.

  Run: `npx vitest run src/components/__tests__/dock.test.tsx`, poi `npm run design:token`
  Expected: PASS entrambi. Nessun token toccato.

- [ ] **Step 3: I test dell'editor (rossi).** Riscrivi
  `src/app/(app)/piatti/[id]/ingredienti/[ingId]/__tests__/page.test.tsx`. Il Dock si monta nello
  slot del Guscio, e il test lo dà con `rendi()`, come Importa. Prima il **censimento dei 20 test
  di oggi**, una riga per ognuno nel registro:

  | Test di oggi | Dopo |
  |---|---|
  | creazione: il salvataggio è bloccato finché mancano nome, area e formato | uguale, col tasto `SALVA` |
  | scegliendo INTERO l'unità passa a PZ e il formato si blocca a 1 | uguale |
  | con INTERO il segmento unità è disabilitato… | uguale |
  | il segmento unità torna cliccabile… | uguale |
  | il guardiano in salva() corregge unità e formato… | riscritto: prima una modifica al nome, perché SALVA pulito è spento |
  | le tre spiegazioni della classe di residuo… | riscritto: «a stima» dice la cadenza delle impostazioni (decisione di Andrea del 26/09), più i casi a 30 e 60 giorni e la lettura fallita |
  | l'etichetta sotto l'interruttore deperibile segue lo stato… | riscritto sul `NO` del gruppo `Fresco` |
  | salva chiama salvaIngrediente con i valori scelti… e torna al piatto | uguale, col tasto `SALVA`, e senza la chiave `ean` |
  | modifica: carica le proprietà dell'ingrediente esistente | riscritto: `SALVA` spento finché niente cambia |
  | un ingId sconosciuto mostra un messaggio… | uguale, più: niente Dock |
  | il cestino su un ingrediente nuovo torna al piatto… | sostituito: su un nuovo `ELIMINA` non c'è, la freccia fa quel lavoro (§F) |
  | il cestino su un ingrediente esistente chiede conferma… | riscritto su `ELIMINA` in coda e sull'`alertdialog` |
  | un ingrediente con acquisti registrati avvisa… | uguale, aperto da `ELIMINA` |
  | se non si riesce a sapere se ci sono acquisti… | uguale, aperto da `ELIMINA` |
  | ANNULLA nella conferma chiude il dialogo senza eliminare | uguale, dentro l'`alertdialog` |
  | un ingrediente ancora in uso mostra il motivo del blocco… | uguale |
  | i quattro test del prezzo | uguali, col tasto `SALVA` |

  Il file nuovo:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Ingredient } from '@/domain/types';

vi.mock('@/data/repertorio', () => {
  class IngredienteInUsoError extends Error {}
  return {
    salvaIngrediente: vi.fn(),
    leggiIngredienti: vi.fn(),
    eliminaIngrediente: vi.fn(),
    haAcquistiRegistrati: vi.fn(),
    IngredienteInUsoError,
  };
});

// La cadenza della nota «a stima» (decisione di Andrea del 26/09): l'editor la legge dalle impostazioni.
vi.mock('@/data/impostazioni', () => ({ leggiImpostazioni: vi.fn() }));

const push = vi.fn();
const replace = vi.fn();
let paramsId = 'd-1';
let paramsIngId = 'nuovo';
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: paramsId, ingId: paramsIngId }),
  useRouter: () => ({ push, back: vi.fn(), replace }),
}));

// Come in dispensa/__tests__/nuovo.test.tsx: il finto hook risponde 'fallback' e
// tiene l'`onCodice` che `LettoreCodice` gli passa, per simulare una lettura.
let onCodiceCapturato: ((ean: string) => void) | null = null;
vi.mock('@/components/useLettoreCodici', () => ({
  useLettoreCodici: (onCodice: (ean: string) => void) => {
    onCodiceCapturato = onCodice;
    return { modo: 'fallback', videoRef: { current: null } };
  },
}));

import { salvaIngrediente, leggiIngredienti, eliminaIngrediente, haAcquistiRegistrati, IngredienteInUsoError } from '@/data/repertorio';
import { leggiImpostazioni } from '@/data/impostazioni';
import { ORDINE_AREE_DEFAULT } from '@/domain/aree';
import { salvaOrigine } from '@/components/pannello/indirizzi';
import { SlotDockProvider } from '@/components/dock-slot';
import { BarraProvider } from '@/components/barra-context';
import IngredienteEditor from '../page';

const ING_YOGURT: Ingredient = {
  id: 'i-1', nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini',
  classeResiduo: 'stima', deperibile: true, formatoConfezione: 500, prezzoConfezione: 2.5, ean: null,
};
const ING_INTERO_INCONSISTENTE: Ingredient = {
  id: 'i-2', nome: 'Uova', unitaBase: 'g', area: 'macelleria',
  classeResiduo: 'intero', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null,
};
const EAN_TONNO = '8000000000017';
const EAN_NUOVO = '8000000000062';
const TONNO: Ingredient = {
  id: 'i-tonno', nome: 'Tonno', unitaBase: 'g', area: 'dispensa', classeResiduo: 'porzionabile',
  deperibile: false, formatoConfezione: 240, prezzoConfezione: null, ean: EAN_TONNO,
};

function rispostaJson(corpo: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, redirected: false, json: async () => corpo } as unknown as Response;
}
const fetchMock = vi.fn<typeof fetch>();

// Il Dock si monta nello slot che il Guscio renderizza: qui lo dà `rendi()`, come
// nei test di Importa. Con `render` nudo SALVA non esisterebbe.
let slotDock: HTMLElement;
function rendi(ui: ReactNode = <IngredienteEditor />) {
  return render(<BarraProvider><SlotDockProvider slot={slotDock}>{ui}</SlotDockProvider></BarraProvider>);
}
const salva = () => screen.getByRole('button', { name: 'SALVA' });

beforeEach(() => {
  vi.clearAllMocks();
  paramsId = 'd-1';
  paramsIngId = 'nuovo';
  onCodiceCapturato = null;
  sessionStorage.clear();
  window.history.replaceState(null, '', '/piatti/d-1/ingredienti/nuovo');
  slotDock = document.createElement('div');
  document.body.appendChild(slotDock);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_YOGURT, ING_INTERO_INCONSISTENTE, TONNO]);
  vi.mocked(haAcquistiRegistrati).mockResolvedValue(false);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1, ordineAree: [...ORDINE_AREE_DEFAULT], settimaneCiclo: 1, cicloOrigine: null, giorniControllo: 90,
  });
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  // useIndietroFogli consuma le voci con history.go: qui il popstate arriva dentro la
  // chiamata, come fanno i test di Importa con back.
  vi.spyOn(window.history, 'go').mockImplementation(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
});

afterEach(() => {
  slotDock.remove();
  vi.mocked(window.history.go).mockRestore();
  vi.unstubAllGlobals();
});

async function scansiona(ean: string) {
  fireEvent.click(screen.getByRole('button', { name: /SCANSIONA LA CONFEZIONE/ }));
  await waitFor(() => expect(onCodiceCapturato).not.toBeNull());
  onCodiceCapturato!(ean);
}

describe('Ingrediente (editor): i campi', () => {
  it('creazione: il salvataggio è bloccato finché mancano nome, area e formato', async () => {
    rendi();
    expect(await screen.findByPlaceholderText("Dai un nome all'ingrediente")).toBeInTheDocument();
    expect(salva()).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Dai un nome all'ingrediente"), { target: { value: 'Uova' } });
    expect(salva()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'MACELLERIA E PESCHERIA' }));
    expect(salva()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '6' } });
    expect(salva()).toBeEnabled();
  });

  // I tre test di INTERO si copiano da oggi senza cambiare una riga, con `rendi()` al
  // posto di `render(<IngredienteEditor />)`. Quello delle tre spiegazioni si copia con
  // `rendi()`, e l'atteso della classe «a stima» diventa quello del test qui sotto.

  it('la spiegazione «a stima» dice la cadenza delle impostazioni, di default ogni 3 mesi', async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    fireEvent.click(screen.getByRole('button', { name: 'A STIMA' }));
    expect(await screen.findByText(
      'Non vale la pena contarlo a grammi. Ogni 3 mesi dall’ultimo acquisto la lista ti chiede se ne hai ancora.',
    )).toBeInTheDocument();
    expect(screen.queryByText(/90 giorni/)).toBeNull();
  });

  it.each([
    [30, 'Ogni mese'],
    [60, 'Ogni 2 mesi'],
  ] as const)('con la cadenza a %i giorni la nota «a stima» dice «%s» (decisione di Andrea del 26/09)', async (g, inizio) => {
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1, ordineAree: [...ORDINE_AREE_DEFAULT], settimaneCiclo: 1, cicloOrigine: null, giorniControllo: g,
    });
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    fireEvent.click(screen.getByRole('button', { name: 'A STIMA' }));
    expect(await screen.findByText(
      `Non vale la pena contarlo a grammi. ${inizio} dall’ultimo acquisto la lista ti chiede se ne hai ancora.`,
    )).toBeInTheDocument();
  });

  it('se le impostazioni non si leggono la nota dice ogni 3 mesi, e l\'editor funziona', async () => {
    vi.mocked(leggiImpostazioni).mockRejectedValue(new Error('rete'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    fireEvent.click(screen.getByRole('button', { name: 'A STIMA' }));
    expect(await screen.findByText(/^Non vale la pena contarlo a grammi\. Ogni 3 mesi dall’ultimo acquisto/)).toBeInTheDocument();
  });

  it('il guardiano in salva() corregge unità e formato anche per un ingrediente caricato già con la classe INTERO e un\'unità diversa da PZ', async () => {
    paramsIngId = 'i-2';
    vi.mocked(salvaIngrediente).mockResolvedValue('i-2');
    rendi();
    await screen.findByDisplayValue('Uova');
    // SALVA pulito è spento (§F): una modifica qualunque lo accende, e il guardiano
    // deve ricalcolare sui dati sporchi caricati, non fidarsi di quelli.
    fireEvent.change(screen.getByDisplayValue('Uova'), { target: { value: 'Uova fresche' } });
    fireEvent.click(salva());
    await waitFor(() => expect(salvaIngrediente).toHaveBeenCalledWith(
      expect.objectContaining({ unitaBase: 'pz', formatoConfezione: 1 }),
    ));
  });

  it('Fresco al posto di Deperibile: SÌ / NO, e la sottoriga segue lo stato', async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    expect(screen.queryByText('Deperibile')).toBeNull();
    const fresco = screen.getByRole('group', { name: 'Fresco' });
    expect(within(fresco).getByRole('button', { name: 'SÌ' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('QUANTO DURA IL RESIDUO DIPENDE DAL REPARTO')).toBeInTheDocument();
    fireEvent.click(within(fresco).getByRole('button', { name: 'NO' }));
    expect(within(fresco).getByRole('button', { name: 'NO' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('IL RESIDUO NON SCADE')).toBeInTheDocument();
  });

  it('le etichette del frame 12 e la nota di oggi in fondo; ANNULLA non c\'è più', async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    for (const e of ['AREA', 'CONFEZIONE', 'COME SI CONSUMA', 'PREZZO DI UNA CONFEZIONE']) expect(screen.getByText(e)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Area' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Unità' })).toBeInTheDocument();
    expect(screen.getByText('Area, formato della confezione e classe decidono cosa finisce in lista e quanto: cambiarli qui cambia le liste da qui in avanti, non quelle già create.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ANNULLA' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'ANNULLA' })).toBeNull();
  });

  it('salva chiama salvaIngrediente con i valori scelti (fresco di default) e torna al piatto', async () => {
    vi.mocked(salvaIngrediente).mockResolvedValue('i-nuovo');
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    fireEvent.change(screen.getByPlaceholderText("Dai un nome all'ingrediente"), { target: { value: 'Uova' } });
    fireEvent.click(screen.getByRole('button', { name: 'MACELLERIA E PESCHERIA' }));
    fireEvent.click(screen.getByRole('button', { name: 'INTERO' }));
    fireEvent.click(salva());
    // Senza scansione la chiave `ean` non c'è: l'ultimo codice resta com'è (repertorio.ts).
    await waitFor(() => expect(salvaIngrediente).toHaveBeenCalledWith({
      id: undefined, nome: 'Uova', unitaBase: 'pz', area: 'macelleria', classeResiduo: 'intero',
      deperibile: true, formatoConfezione: 1, prezzoConfezione: null,
    }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti/d-1'));
  });

  it('modifica: carica le proprietà, e SALVA resta spento finché niente cambia (§F)', async () => {
    paramsIngId = 'i-1';
    rendi();
    expect(await screen.findByDisplayValue('Yogurt greco')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'LATTICINI, UOVA E SALUMI' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'A STIMA' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('QUANTO DURA IL RESIDUO DIPENDE DAL REPARTO')).toBeInTheDocument();
    expect(salva()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '400' } });
    expect(salva()).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '500' } });
    expect(salva()).toBeDisabled();
  });

  it('in volo SALVA dice SALVATAGGIO… a 0,5; se fallisce l\'errore sta sopra il Dock e SALVA torna', async () => {
    paramsIngId = 'i-1';
    let rifiuta!: (e: unknown) => void;
    vi.mocked(salvaIngrediente).mockReturnValue(new Promise((_, r) => { rifiuta = r; }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.change(screen.getByLabelText('Prezzo di una confezione'), { target: { value: '3' } });
    fireEvent.click(salva());
    const inVolo = await screen.findByRole('button', { name: 'SALVATAGGIO…' });
    expect(inVolo).toBeDisabled();
    expect(inVolo.style.opacity).toBe('0.5');
    rifiuta(new Error('rete'));
    const dock = screen.getByRole('region', { name: 'Azione principale' });
    expect(await within(dock).findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare l’ingrediente. Riprova.');
    expect(within(dock).getByRole('button', { name: 'SALVA' })).toBeEnabled();
  });

  it('la tab bar è nascosta: il Dock ha dock-senza-barra', async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    expect(screen.getByRole('region', { name: 'Azione principale' })).toHaveClass('dock-senza-barra');
  });

  it('un ingId sconosciuto mostra un messaggio invece di un modulo vuoto, e niente Dock', async () => {
    paramsIngId = 'i-inesistente';
    rendi();
    expect(await screen.findByText('Ingrediente non trovato.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).toBeNull();
  });
});

describe('Ingrediente (editor): il ritorno (spec fase 5 §F)', () => {
  it('con torna=impostazioni la freccia torna al pannello sugli Ingredienti, non a /piatti/nuovo (il difetto di oggi)', async () => {
    paramsId = 'nuovo';
    paramsIngId = 'i-1';
    window.history.replaceState(null, '', '/piatti/nuovo/ingredienti/i-1?torna=impostazioni');
    salvaOrigine({ pathname: '/dispensa', sotto: 'ingredienti' });
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.click(screen.getByRole('button', { name: 'Torna agli ingredienti' }));
    expect(push).toHaveBeenCalledWith('/dispensa?impostazioni=ingredienti');
    expect(push).not.toHaveBeenCalledWith('/piatti/nuovo');
  });

  it('con torna=impostazioni anche SALVA torna al pannello, e non segnala un ingrediente al piatto', async () => {
    paramsId = 'nuovo';
    paramsIngId = 'i-1';
    window.history.replaceState(null, '', '/piatti/nuovo/ingredienti/i-1?torna=impostazioni');
    salvaOrigine({ pathname: '/piano', sotto: 'ingredienti' });
    vi.mocked(salvaIngrediente).mockResolvedValue('i-1');
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '450' } });
    fireEvent.click(salva());
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piano?impostazioni=ingredienti'));
  });

  it('senza torna la freccia si chiama Torna al piatto e porta al piatto', async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    fireEvent.click(screen.getByRole('button', { name: 'Torna al piatto' }));
    expect(push).toHaveBeenCalledWith('/piatti/d-1');
  });

  it('la freccia perde le modifiche senza chiedere', async () => {
    paramsIngId = 'i-1';
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.change(screen.getByLabelText('Formato della confezione'), { target: { value: '400' } });
    fireEvent.click(screen.getByRole('button', { name: 'Torna al piatto' }));
    expect(push).toHaveBeenCalledWith('/piatti/d-1');
    expect(salvaIngrediente).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

describe('Ingrediente (editor): la scansione (spec fase 5 §F.1)', () => {
  it('il catalogo dà la confezione: formato e unità si riempiono, il foglio si chiude, SALVA manda l\'ean', async () => {
    paramsIngId = 'i-1';
    vi.mocked(salvaIngrediente).mockResolvedValue('i-1');
    fetchMock.mockResolvedValueOnce(rispostaJson({ trovato: true, nome: 'Yogurt', marca: '', quantita: { valore: 400, unita: 'g' } }));
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    await scansiona(EAN_NUOVO);
    await waitFor(() => expect(screen.getByLabelText('Formato della confezione')).toHaveValue('400'));
    expect(screen.queryByRole('dialog', { name: 'Scansiona la confezione' })).toBeNull();
    expect(within(screen.getByRole('group', { name: 'Unità' })).getByRole('button', { name: 'G' })).toHaveAttribute('aria-pressed', 'true');
    expect(fetchMock).toHaveBeenCalledWith(`/api/prodotto/${EAN_NUOVO}`);
    expect(salvaIngrediente).not.toHaveBeenCalled(); // niente si scrive fino a SALVA
    fireEvent.click(salva());
    await waitFor(() => expect(salvaIngrediente).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'i-1', formatoConfezione: 400, unitaBase: 'g', ean: EAN_NUOVO }),
    ));
  });

  it('prodotto sconosciuto: il messaggio sotto il tasto, e l\'ean resta legato al SALVA', async () => {
    paramsIngId = 'i-1';
    vi.mocked(salvaIngrediente).mockResolvedValue('i-1');
    fetchMock.mockResolvedValueOnce(rispostaJson({ trovato: false }));
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    await scansiona(EAN_NUOVO);
    expect(await screen.findByText('Non conosciamo questo prodotto: scrivi tu la confezione.')).toBeInTheDocument();
    expect(screen.getByLabelText('Formato della confezione')).toHaveValue('500');
    fireEvent.click(salva()); // l'ean è una modifica: SALVA è acceso
    await waitFor(() => expect(salvaIngrediente).toHaveBeenCalledWith(expect.objectContaining({ ean: EAN_NUOVO, formatoConfezione: 500 })));
  });

  it('un codice che ha già Tonno: «Questo codice è di Tonno.», APRI TONNO apre il suo editor', async () => {
    paramsIngId = 'i-1';
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    await scansiona(EAN_TONNO);
    expect(await screen.findByText('Questo codice è di Tonno.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'APRI TONNO' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti/d-1/ingredienti/i-tonno'));
  });

  it('NON È QUESTA toglie l\'esito e riprende la lettura', async () => {
    paramsIngId = 'i-1';
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    await scansiona(EAN_TONNO);
    fireEvent.click(await screen.findByRole('button', { name: 'NON È QUESTA' }));
    expect(screen.queryByText('Questo codice è di Tonno.')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Scansiona la confezione' })).toBeInTheDocument();
  });

  it('la sessione scaduta porta a /entra', async () => {
    paramsIngId = 'i-1';
    fetchMock.mockResolvedValueOnce(rispostaJson({}, 401));
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    await scansiona(EAN_NUOVO);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/entra'));
  });
});

describe('Ingrediente (editor): ELIMINA (spec fase 5 §F)', () => {
  it('su un ingrediente nuovo ELIMINA non c\'è: la freccia fa quel lavoro', async () => {
    rendi();
    await screen.findByPlaceholderText("Dai un nome all'ingrediente");
    expect(screen.queryByRole('button', { name: 'Elimina ingrediente' })).toBeNull();
    expect(eliminaIngrediente).not.toHaveBeenCalled();
  });

  it('ELIMINA in coda chiede conferma nel dialogo, poi elimina e torna al piatto', async () => {
    paramsIngId = 'i-1';
    vi.mocked(eliminaIngrediente).mockResolvedValue(undefined);
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));
    const dialogo = screen.getByRole('alertdialog');
    expect(within(dialogo).getByText('Eliminare questo ingrediente?')).toBeInTheDocument();
    expect(within(dialogo).getByText(
      'Verrà cancellato per sempre, insieme al residuo di dispensa che gli è legato. Se è ancora usato in un ' +
      'piatto o in una lista della spesa, l’eliminazione viene bloccata: toglilo prima da lì.',
    )).toBeInTheDocument();
    // Il velo del dialogo non chiude (DESIGN.md §8, spec §N).
    fireEvent.click(screen.getAllByTestId('velo-foglio').at(-1)!);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ELIMINA' }));
    await waitFor(() => expect(eliminaIngrediente).toHaveBeenCalledWith('i-1'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti/d-1'));
  });

  // «con acquisti registrati» e «il fail-safe assume di sì» si copiano da oggi: il
  // dialogo si apre con `Elimina ingrediente`, il testo si cerca dentro l'alertdialog.

  it('ANNULLA nella conferma chiude il dialogo senza eliminare', async () => {
    paramsIngId = 'i-1';
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ANNULLA' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(eliminaIngrediente).not.toHaveBeenCalled();
  });

  it('un ingrediente ancora in uso: il dialogo si chiude e il motivo resta sotto ELIMINA', async () => {
    paramsIngId = 'i-1';
    vi.mocked(eliminaIngrediente).mockRejectedValue(
      new IngredienteInUsoError('Questo ingrediente è usato in almeno un piatto o in una lista della spesa: toglilo prima da lì, poi riprova a eliminarlo.'),
    );
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ELIMINA' }));
    expect(await screen.findByText(
      'Questo ingrediente è usato in almeno un piatto o in una lista della spesa: toglilo prima da lì, poi riprova a eliminarlo.',
    )).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it('un errore qualunque resta nel dialogo, che non si chiude', async () => {
    paramsIngId = 'i-1';
    vi.mocked(eliminaIngrediente).mockRejectedValue(new Error('rete'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rendi();
    await screen.findByDisplayValue('Yogurt greco');
    fireEvent.click(screen.getByRole('button', { name: 'Elimina ingrediente' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ELIMINA' }));
    expect(await within(screen.getByRole('alertdialog')).findByText('Non siamo riusciti a eliminare l’ingrediente. Riprova.')).toBeInTheDocument();
  });
});

// I quattro test del prezzo si copiano da oggi con `rendi()` e `salva()` al posto di
// `render` e di `SALVA INGREDIENTE`. In «un prezzo compilato ma non positivo…» SALVA è
// acceso all'inizio solo dopo una modifica: la prima attesa diventa `toBeDisabled()`.
```

  Run: `npx vitest run "src/app/(app)/piatti/[id]/ingredienti"`
  Expected: FAIL in molti punti (il tasto si chiama `SALVA INGREDIENTE`, niente Dock, niente
  scansione). In particolare fallisce `con torna=impostazioni la freccia torna al pannello…`:
  oggi la freccia è un `<Link href="/piatti/nuovo">` senza nome [misurato: riga 694–701]. È il
  test del difetto di oggi (spec §M.2).

- [ ] **Step 4: La pagina.** Riscrivi `src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx`.
  `testoElimina`, `analizzaPrezzo`, `prezzoInTesto`, `OPZIONI_CLASSE` e la docstring della
  pagina restano quelli di oggi, e si copiano dal file com'è. `SPIEGA_CLASSE` si copia con le
  spiegazioni di `porzionabile` e `intero`; quella di `stima` passa a `spiegaClasse`, qui sotto. `rgba()` sparisce:
  la pillola d'area scelta ora è piena in `--ink`, come nel frame 12.

```tsx
'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { AreaId, ClasseResiduo, Ingredient, UnitaBase } from '@/domain/types';
import { salvaIngrediente, leggiIngredienti, eliminaIngrediente, IngredienteInUsoError, haAcquistiRegistrati } from '@/data/repertorio';
import { leggiImpostazioni } from '@/data/impostazioni';
import { AREE, coloreArea, nomeArea } from '@/domain/aree';
import { GIORNI_CONTROLLO_DEFAULT, ogniCadenza, type GiorniControllo } from '@/domain/pantry';
import { MSG_CATALOGO, proprietario } from '@/domain/scansione-dispensa';
import { Segmento } from '@/components/Segmento';
import { Dock } from '@/components/Dock';
import { FoglioDalBasso, TestataFoglio } from '@/components/FoglioDalBasso';
import { DialogoConferma } from '@/components/DialogoConferma';
import { Etichetta, MessaggioErrore, STILE_PILLOLA, TastoPrimario, TastoSecondario } from '@/components/controlli';
import { useNascondiBarra } from '@/components/barra-context';
import { useIndietroFogli } from '@/components/useIndietroFogli';
import { indirizzoRitorno } from '@/components/pannello/indirizzi';
import { LettoreCodice, cercaProdotto } from '@/app/(app)/dispensa/LettoreCodice';
import { IconaScansione } from '@/app/(app)/dispensa/icone';
import { segnalaIngredienteCreato } from '../../bozza';

// testoElimina, analizzaPrezzo, prezzoInTesto, OPZIONI_CLASSE: come oggi. SPIEGA_CLASSE come
// oggi, ma senza la voce `stima` (tipo `Record<Exclude<ClasseResiduo, 'stima'>, string>`).

/**
 * La spiegazione della classe di residuo (Ingrediente.dc.html, testi di oggi). Quella della
 * classe «a stima» dice la cadenza scelta nelle impostazioni: prima della fase 5 diceva
 * «Ogni 90 giorni» (decisione di Andrea del 26/09). Apostrofo tipografico, come oggi.
 */
function spiegaClasse(classe: ClasseResiduo, giorni: GiorniControllo): string {
  if (classe === 'stima') {
    return `Non vale la pena contarlo a grammi. ${ogniCadenza(giorni)} dall’ultimo acquisto la lista ti chiede se ne hai ancora.`;
  }
  return SPIEGA_CLASSE[classe];
}

const OPZIONI_UNITA: { id: UnitaBase; label: string }[] = [
  { id: 'g', label: 'G' },
  { id: 'ml', label: 'ML' },
  { id: 'pz', label: 'PZ' },
];

/** Spec fase 5 §F.1, testo nuovo. */
const MSG_SCONOSCIUTO = 'Non conosciamo questo prodotto: scrivi tu la confezione.';
/** La nota di oggi degli Ingredienti (spec §F punto 6, frame 12). */
const NOTA_INGREDIENTI =
  'Area, formato della confezione e classe decidono cosa finisce in lista e quanto: cambiarli qui cambia le liste da qui in avanti, non quelle già create.';

const STILE_NOTA: CSSProperties = { margin: '0 4px', fontSize: 12.5, lineHeight: 1.45, color: 'var(--testo-2)' };
const STILE_CAMPO_96: CSSProperties = {
  width: 96, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 12px', textAlign: 'right',
  border: '1px solid var(--bordo)', background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)',
  fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)',
};

/** Pillola d'azione con stato (DESIGN.md §8): piena in --ink quando è la scelta. */
function pillola(attiva: boolean): CSSProperties {
  return {
    ...STILE_PILLOLA,
    background: attiva ? 'var(--ink)' : 'var(--superficie)',
    color: attiva ? 'var(--superficie)' : 'var(--sec)',
    border: attiva ? '1px solid var(--ink)' : '1px solid rgba(20,22,58,0.09)',
  };
}

interface Modulo {
  nome: string;
  area: AreaId | null;
  unitaBase: UnitaBase;
  classeResiduo: ClasseResiduo;
  deperibile: boolean;
  formatoTesto: string;
  prezzoTesto: string;
  ean: string | null;
}

/** Il confronto «è cambiato qualcosa?» (§F: SALVA spento finché niente cambia). */
function firma(m: Modulo): string {
  return JSON.stringify(m);
}

/** Un ingrediente nuovo parte da qui: deperibile true come in Ingrediente.dc.html (vedi sotto). */
const FIRMA_NUOVO = firma({
  nome: '', area: null, unitaBase: 'g', classeResiduo: 'porzionabile', deperibile: true, formatoTesto: '', prezzoTesto: '', ean: null,
});

export default function IngredienteEditor() {
  const { id, ingId } = useParams<{ id: string; ingId: string }>();
  const router = useRouter();
  const nuovo = ingId === 'nuovo';
  // Pagina piena, senza tab bar (spec §F): il Dock scende a 22 da sé.
  useNascondiBarra(true);

  const [caricamento, setCaricamento] = useState(true);
  const [erroreCarica, setErroreCarica] = useState<string | null>(null);
  const [erroreSalva, setErroreSalva] = useState<string | null>(null);
  const [erroreElimina, setErroreElimina] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [nonTrovato, setNonTrovato] = useState(false);
  const [confermaEliminazione, setConfermaEliminazione] = useState(false);
  const [haAcquisti, setHaAcquisti] = useState(false);
  const [firmaIniziale, setFirmaIniziale] = useState<string | null>(null);
  // La cadenza serve solo alla spiegazione «a stima»: se non si legge vale il default, e
  // l'editor funziona lo stesso.
  const [giorniControllo, setGiorniControllo] = useState<GiorniControllo>(GIORNI_CONTROLLO_DEFAULT);
  useEffect(() => {
    let vivo = true;
    leggiImpostazioni()
      .then((i) => { if (vivo) setGiorniControllo(i.giorniControllo); })
      .catch((e) => console.error('ingrediente: lettura della cadenza fallita.', e));
    return () => {
      vivo = false;
    };
  }, []);

  // Da dove si è arrivati, e quindi dove tornare: letto da window.location e non da
  // useSearchParams per non imporre un confine <Suspense> a tutta la pagina.
  const [tornaAImpostazioni, setTornaAImpostazioni] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('torna');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (p === 'impostazioni') setTornaAImpostazioni(true);
  }, []);
  /**
   * Freccia e SALVA vanno nello stesso posto (spec §F). Con `torna=impostazioni` è il
   * pannello sugli Ingredienti sopra la pagina d'origine: `indirizzoRitorno()` legge
   * l'origine che il pannello ha salvato, e il pannello rimette lo scorrimento. Si
   * legge al tocco, non al render. Oggi la freccia andava sempre a `/piatti/{id}`, e
   * con `id = nuovo` finiva nell'editor di un piatto nuovo [misurato]: corretto qui.
   */
  const ritorno = () => (tornaAImpostazioni ? indirizzoRitorno() : `/piatti/${id}`);

  const [nome, setNome] = useState('');
  const [area, setArea] = useState<AreaId | null>(null);
  const [unitaBase, setUnitaBase] = useState<UnitaBase>('g');
  const [classeResiduo, setClasseResiduo] = useState<ClasseResiduo>('porzionabile');
  // Default true come in Ingrediente.dc.html (this.state.deper = true, riga 86): un
  // default sbagliato qui si nota subito, perché finisce nel top-up.
  const [deperibile, setDeperibile] = useState(true);
  const [formatoTesto, setFormatoTesto] = useState('');
  // Testo e non numero: "2," resta "2," mentre si digita. Caricato dall'ingrediente
  // perché salvaIngrediente scrive sempre la colonna, anche null.
  const [prezzoTesto, setPrezzoTesto] = useState('');
  // Il codice letto in questa visita. null = nessuna scansione: SALVA non manda la
  // chiave, e l'ultimo codice salvato resta com'è (repertorio.ts, docstring di salvaIngrediente).
  const [ean, setEan] = useState<string | null>(null);
  const [messaggioScan, setMessaggioScan] = useState<string | null>(null);
  const [scansione, setScansione] = useState(false);
  const [altro, setAltro] = useState<Ingredient | null>(null);

  function chiudiScansione() {
    setScansione(false);
    setAltro(null);
  }

  // Il gesto indietro chiude prima il dialogo o il foglio, poi esce (spec §A.4, §F.1).
  const { chiudiTuttoPoi } = useIndietroFogli(
    (scansione ? 1 : 0) + (confermaEliminazione ? 1 : 0),
    () => (confermaEliminazione ? setConfermaEliminazione(false) : chiudiScansione()),
  );

  useEffect(() => {
    let vivo = true;
    async function carica() {
      if (nuovo) {
        setCaricamento(false);
        return;
      }
      try {
        const catalogo = await leggiIngredienti();
        if (!vivo) return;
        const trovato = catalogo.find((i) => i.id === ingId);
        if (!trovato) {
          setNonTrovato(true);
        } else {
          const iniziale: Modulo = {
            nome: trovato.nome, area: trovato.area, unitaBase: trovato.unitaBase, classeResiduo: trovato.classeResiduo,
            deperibile: trovato.deperibile, formatoTesto: String(trovato.formatoConfezione),
            prezzoTesto: prezzoInTesto(trovato.prezzoConfezione), ean: null,
          };
          setNome(iniziale.nome);
          setArea(iniziale.area);
          setUnitaBase(iniziale.unitaBase);
          setClasseResiduo(iniziale.classeResiduo);
          setDeperibile(iniziale.deperibile);
          setFormatoTesto(iniziale.formatoTesto);
          setPrezzoTesto(iniziale.prezzoTesto);
          // APRI {altro} arriva qui con la pagina forse non rimontata: niente scansione vecchia.
          setEan(null);
          setMessaggioScan(null);
          setFirmaIniziale(firma(iniziale));
          // Fail-safe invertito di proposito (mantieni il commento di oggi per intero):
          // se non sappiamo se ci sono acquisti, assumiamo di sì.
          try {
            const conAcquisti = await haAcquistiRegistrati(ingId);
            if (vivo) setHaAcquisti(conAcquisti);
          } catch {
            if (vivo) setHaAcquisti(true);
          }
        }
      } catch (errore) {
        console.error('ingrediente: caricamento fallito.', errore);
        if (vivo) setErroreCarica('Non riusciamo a caricare l’ingrediente. Riprova più tardi.');
      } finally {
        if (vivo) setCaricamento(false);
      }
    }
    carica();
    return () => {
      vivo = false;
    };
  }, [ingId, nuovo]);

  /** Come oggi: INTERO forza PZ e formato 1, come fa list-builder (mantieni la docstring di oggi). */
  function scegliClasse(valore: string) {
    const classe = valore as ClasseResiduo;
    setClasseResiduo(classe);
    if (classe === 'intero') {
      setUnitaBase('pz');
      setFormatoTesto('1');
    }
  }

  const intero = classeResiduo === 'intero';
  const formatoConfezione = Number(formatoTesto.trim().replace(',', '.'));
  const prezzoConfezione = analizzaPrezzo(prezzoTesto);
  const prezzoNonValido = prezzoConfezione !== null && (!Number.isFinite(prezzoConfezione) || prezzoConfezione <= 0);
  const nonValido =
    !nome.trim() || area === null || !formatoTesto.trim() || !Number.isFinite(formatoConfezione) || formatoConfezione <= 0 || prezzoNonValido;
  const modulo: Modulo = { nome, area, unitaBase, classeResiduo, deperibile, formatoTesto, prezzoTesto, ean };
  const cambiato = firma(modulo) !== (nuovo ? FIRMA_NUOVO : firmaIniziale);
  const spento = nonValido || !cambiato;

  async function salva() {
    if (spento || salvando || area === null) return;
    setSalvando(true);
    setErroreSalva(null);
    try {
      // Il guardiano di oggi (mantieni il suo commento): per INTERO si ricalcola, non si ricontrolla.
      const unitaEffettiva = intero ? 'pz' : unitaBase;
      const formatoEffettivo = intero ? 1 : formatoConfezione;
      const idSalvato = await salvaIngrediente({
        id: nuovo ? undefined : ingId,
        nome: nome.trim(),
        unitaBase: unitaEffettiva,
        area,
        classeResiduo,
        deperibile,
        formatoConfezione: formatoEffettivo,
        prezzoConfezione,
        // Solo se questa visita ha letto un codice (§F.1): «niente si scrive fino a SALVA».
        ...(ean !== null ? { ean } : {}),
      });
      if (nuovo && !tornaAImpostazioni) segnalaIngredienteCreato(id, idSalvato);
      router.push(ritorno());
    } catch (errore) {
      console.error('ingrediente: salvataggio fallito.', errore);
      setErroreSalva('Non siamo riusciti a salvare l’ingrediente. Riprova.');
      setSalvando(false);
    }
  }

  /**
   * La lettura (spec §F.1, e §F.3 della fase 4 per il codice di un altro): prima si
   * guarda se il codice è già di un altro ingrediente, senza rete; poi il catalogo.
   * Niente si scrive: formato, unità ed EAN restano nel modulo fino a SALVA. Qui non
   * si usa `aggiornaFormatoDaScansione`, che tocca le righe della lista.
   */
  async function letto(codice: string) {
    let catalogo: Ingredient[] = [];
    try {
      catalogo = await leggiIngredienti();
    } catch {
      // Senza elenco non si riconosce il proprietario: si passa al catalogo.
    }
    const suo = proprietario(codice, catalogo, nuovo ? undefined : ingId);
    if (suo) {
      setAltro(suo);
      return;
    }
    const risposta = await cercaProdotto(codice);
    if (risposta === 'sessione') {
      router.replace('/entra');
      return;
    }
    setEan(codice);
    if (risposta === 'errore') {
      setMessaggioScan(MSG_CATALOGO);
    } else if (!risposta.trovato || !risposta.quantita) {
      setMessaggioScan(MSG_SCONOSCIUTO);
    } else {
      setMessaggioScan(null);
      // Un INTERO si conta a pezzi con formato 1 (list-builder): il peso del catalogo non vale.
      if (!intero) {
        setFormatoTesto(String(risposta.quantita.valore));
        setUnitaBase(risposta.quantita.unita);
      }
    }
    chiudiScansione();
  }

  /** APRI {altro}: il codice resta suo (fase 4 §F.2). Le modifiche di qui si perdono, come con la freccia. */
  function apriAltro(a: Ingredient) {
    const dest = `/piatti/${id}/ingredienti/${a.id}${tornaAImpostazioni ? '?torna=impostazioni' : ''}`;
    chiudiTuttoPoi(() => router.push(dest));
    chiudiScansione();
  }

  async function confermaElimina(): Promise<void> {
    try {
      await eliminaIngrediente(ingId);
    } catch (e) {
      if (e instanceof IngredienteInUsoError) {
        // Il motivo del blocco è una frase da leggere con calma: resta sotto ELIMINA, a dialogo chiuso.
        setConfermaEliminazione(false);
        setErroreElimina(e.message);
        return;
      }
      console.error('ingrediente: eliminazione fallita.', e);
      throw e; // DialogoConferma mostra il suo errore e resta aperto
    }
    router.push(ritorno());
  }

  const freccia = { etichetta: tornaAImpostazioni ? 'Torna agli ingredienti' : 'Torna al piatto', onTorna: () => router.push(ritorno()) };

  if (nonTrovato) {
    return (
      <Cornice freccia={freccia}>
        <p style={{ margin: '20px 18px', color: 'var(--testo-2)' }}>Ingrediente non trovato.</p>
      </Cornice>
    );
  }
  if (erroreCarica) {
    return (
      <Cornice freccia={freccia}>
        <p style={{ margin: '20px 18px', color: 'var(--testo-2)', fontSize: 13 }}>{erroreCarica}</p>
      </Cornice>
    );
  }
  if (caricamento) return <Cornice freccia={freccia} />;

  return (
    <Cornice
      freccia={freccia}
      area={area}
      nome={
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Dai un nome all'ingrediente"
          className="nome-ingrediente"
          style={{
            display: 'block', width: '100%', fontFamily: 'inherit', fontSize: 32, fontWeight: 800, letterSpacing: '-0.045em',
            lineHeight: 1.05, color: 'var(--ink)', padding: '0 2px 8px', border: 'none',
            borderBottom: '1.5px solid rgba(20,22,58,0.14)', background: 'transparent', outline: 'none',
          }}
        />
      }
    >
      <style jsx>{`
        .nome-ingrediente::placeholder { color: var(--icona-spenta); }
      `}</style>
      <div className="sc scroll-app con-dock" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Etichetta>AREA</Etichetta>
          <div role="group" aria-label="Area" style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {AREE.map((a) => {
              const scelta = area === a.id;
              return (
                <button key={a.id} type="button" aria-pressed={scelta} onClick={() => setArea(a.id)} style={{ ...pillola(scelta), color: scelta ? 'var(--superficie)' : 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px' }}>
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 4, flex: 'none', background: coloreArea(a.id) }} />
                  {a.nome}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Etichetta>CONFEZIONE</Etichetta>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              inputMode="decimal"
              aria-label="Formato della confezione"
              value={formatoTesto}
              disabled={intero}
              onChange={(e) => setFormatoTesto(e.target.value)}
              style={{ ...STILE_CAMPO_96, opacity: intero ? 0.5 : 1 }}
            />
            <div role="group" aria-label="Unità" style={{ display: 'flex', alignItems: 'center', gap: 4, height: 44, padding: '0 3px', borderRadius: 999, background: 'var(--barra-attiva)', opacity: intero ? 0.5 : 1 }}>
              {OPZIONI_UNITA.map((o) => {
                const scelta = unitaBase === o.id;
                return (
                  // Il bottone è l'area di tocco da 44, la pillola visibile è 38 (frame 12), come in Segmento.
                  <button key={o.id} type="button" aria-pressed={scelta} disabled={intero} onClick={() => setUnitaBase(o.id)} style={{ height: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{
                      height: 38, minWidth: 44, padding: '0 10px', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: scelta ? 'var(--superficie)' : 'none', boxShadow: scelta ? 'var(--ombra-tessera)' : 'none',
                      color: scelta ? 'var(--ink)' : 'var(--testo-2)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    }}>
                      {o.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <TastoSecondario onClick={() => setScansione(true)} style={{ marginTop: 4 }}>
            <IconaScansione />
            SCANSIONA LA CONFEZIONE
          </TastoSecondario>
          {messaggioScan && <p role="status" style={STILE_NOTA}>{messaggioScan}</p>}
          {/* La nota di oggi sul formato: resta (decisione 3), il frame 12 non la mostra. Registro. */}
          <p style={STILE_NOTA}>
            Quanto ne vendono in una confezione. Serve a sapere quante confezioni comprare, non quanti grammi.
            Dove il peso varia — carne, pesce, formaggio al banco — basta un valore indicativo: lo scarto lo
            correggi dalla Dispensa quando il conto non torna.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Etichetta>COME SI CONSUMA</Etichetta>
          <Segmento opzioni={OPZIONI_CLASSE} valore={classeResiduo} onCambia={scegliClasse} variante="blocco" />
          <p style={STILE_NOTA}>{spiegaClasse(classeResiduo, giorniControllo)}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 14, borderTop: '1px solid var(--bordo)' }}>
          <div role="group" aria-label="Fresco" style={{ display: 'flex', alignItems: 'center', gap: 7, minHeight: 44, padding: '0 4px' }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, letterSpacing: '-0.024em', color: 'var(--ink)' }}>Fresco</span>
            <button type="button" aria-pressed={deperibile} onClick={() => setDeperibile(true)} style={{ ...pillola(deperibile), minWidth: 52 }}>SÌ</button>
            <button type="button" aria-pressed={!deperibile} onClick={() => setDeperibile(false)} style={{ ...pillola(!deperibile), minWidth: 52 }}>NO</button>
          </div>
          {/* La sottoriga di oggi (mantieni il commento lungo di oggi su residuoUtilizzabile):
              dice dove la scelta ha effetto, non quanto dura. */}
          <p style={{ margin: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--testo-2)' }}>
            {deperibile ? 'QUANTO DURA IL RESIDUO DIPENDE DAL REPARTO' : 'IL RESIDUO NON SCADE'}
          </p>
        </div>

        {/* Il prezzo dopo Fresco (spec §F): serve solo al contatore del non ricomprato. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Etichetta>PREZZO DI UNA CONFEZIONE</Etichetta>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="text" inputMode="decimal" aria-label="Prezzo di una confezione" value={prezzoTesto} onChange={(e) => setPrezzoTesto(e.target.value)} style={STILE_CAMPO_96} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ter)' }}>€</span>
          </div>
          <p style={STILE_NOTA}>Facoltativo, in euro: serve solo a contare quanto non ricompri</p>
        </div>

        <p style={STILE_NOTA}>{NOTA_INGREDIENTI}</p>

        {!nuovo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <TastoSecondario aria-label="Elimina ingrediente" onClick={() => setConfermaEliminazione(true)} style={{ color: 'var(--errore)' }}>
              ELIMINA
            </TastoSecondario>
            {erroreElimina && <MessaggioErrore ruolo="alert">{erroreElimina}</MessaggioErrore>}
          </div>
        )}
      </div>

      <Dock>
        {erroreSalva && (
          // Sopra il Dock (§F): fuori dalla pillola, su fondo bianco, perché sotto scorre la pagina.
          <p role="alert" style={{
            position: 'absolute', left: 0, right: 0, bottom: 'calc(100% + 8px)', margin: 0, padding: '10px 14px',
            borderRadius: 14, background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)',
            fontSize: 12.5, lineHeight: 1.45, color: 'var(--errore)',
          }}>
            {erroreSalva}
          </p>
        )}
        <button
          type="button"
          className="dock-primario"
          onClick={() => void salva()}
          disabled={spento || salvando}
          aria-busy={salvando || undefined}
          // In volo è il primario a 0,5, non lo spento grigio di `.dock-primario:disabled`.
          style={salvando ? { background: 'var(--ink)', color: 'var(--superficie)', opacity: 0.5 } : undefined}
        >
          {salvando ? 'SALVATAGGIO…' : 'SALVA'}
        </button>
      </Dock>

      {scansione && (
        <FoglioDalBasso etichetta="Scansiona la confezione" onChiudi={chiudiScansione}>
          <TestataFoglio onChiudi={chiudiScansione} />
          <div className="sc corpo-foglio" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {altro ? (
              <>
                <p style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>{`Questo codice è di ${altro.nome}.`}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <TastoSecondario onClick={() => setAltro(null)} style={{ flex: 1 }}>NON È QUESTA</TastoSecondario>
                  <TastoPrimario onClick={() => apriAltro(altro)} style={{ flex: 1 }}>{`APRI ${altro.nome.toUpperCase()}`}</TastoPrimario>
                </div>
              </>
            ) : (
              <LettoreCodice onCodice={(c) => void letto(c)} />
            )}
          </div>
        </FoglioDalBasso>
      )}

      {confermaEliminazione && (
        <FoglioDalBasso
          etichetta="Eliminare questo ingrediente?"
          onChiudi={() => setConfermaEliminazione(false)}
          altezza="contenuto"
          ruolo="alertdialog"
          chiudiDalVelo={false}
          livello={2}
        >
          <DialogoConferma
            titolo="Eliminare questo ingrediente?"
            testo={testoElimina(haAcquisti)}
            azione="ELIMINA"
            tono="distruttivo"
            erroreTesto="Non siamo riusciti a eliminare l’ingrediente. Riprova."
            onConferma={confermaElimina}
            onAnnulla={() => setConfermaEliminazione(false)}
          />
        </FoglioDalBasso>
      )}
    </Cornice>
  );
}

/**
 * La testata del frame 12: il tondo 44 con la freccia, sotto l'area in etichetta
 * mono col quadratino, poi il nome a 32/800 (è il campo di oggi). Non è Testata:
 * questa è una pagina di modifica, senza titolo di schermata.
 */
function Cornice({ children, freccia, area = null, nome }: {
  children?: ReactNode;
  freccia: { etichetta: string; onTorna: () => void };
  area?: AreaId | null;
  nome?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '20px 18px 12px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <button
          type="button"
          aria-label={freccia.etichetta}
          onClick={freccia.onTorna}
          style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--barra-attiva)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {area && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink)' }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 4, background: coloreArea(area) }} />
            {nomeArea(area)}
          </span>
        )}
        {nome && <div style={{ alignSelf: 'stretch' }}>{nome}</div>}
      </div>
      {children}
    </div>
  );
}
```

  Punti da verificare mentre la scrivi, e da riportare:
  1. **`DialogoConferma`** non si avvolge da sé (ossatura): sta dentro il `FoglioDalBasso` dello
     Step 4. Le sue prop sono quelle dell'ossatura: `erroreTesto` compare quando `onConferma`
     rigetta.
  2. **`livello={2}`** sul dialogo: sta sopra la pagina, non sopra un altro foglio, ma il `2`
     tiene lo stesso z (60) e lo stesso velo del dialogo della Dispensa.
  3. **`chiudiTuttoPoi`** in `apriAltro`: il foglio ha una voce di cronologia aperta. Se
     chiudessi e facessi subito `push`, il `go(-1)` e la `push` correrebbero insieme (spec §A.5).
     Col ramo B della sonda del Task 2, `apriAltro` è quello dello Step 1.
  4. **`style jsx`** con `var(--icona-spenta)`: il placeholder era `#c4c4ce`, che vale
     `--icona-spenta` [misurato: `globals.css`]. Se `styled-jsx` non accetta `var()` nel
     selettore `::placeholder`, torna al letterale e scrivilo nel registro.
  5. **Le due spiegazioni che il frame 12 non mostra** (la nota del formato e `SPIEGA_CLASSE`)
     restano: nessuna funzione di oggi si perde (decisione 3). Il registro lo dice, come domanda
     aperta per Andrea.
  6. **La spiegazione «a stima»** dice la cadenza delle impostazioni (`spiegaClasse`, decisione
     di Andrea del 26/09, spec §I). La lettura delle impostazioni non blocca il modulo: se
     fallisce, vale ogni 3 mesi.
  7. **Il `Prezzo`** passa dal campo a tutta larghezza da 56 al campo 96 × 44 della
     `CONFEZIONE`, con `€` come unità. Etichetta e nota restano uguali.
  8. **La coda dello scroller** è `con-dock` (194). Senza barra il Dock finisce a 22 + 70 = 92
     dal fondo: sotto l'ultima voce restano circa 100 px d'aria in più. Si accetta per non
     aggiungere un'altra coda; il registro lo dice.

- [ ] **Step 5: Completa e fai girare i test.** Copia da oggi i test che lo Step 3 dice «uguali»
  (INTERO ×3, spiegazioni, acquisti registrati, fail-safe, prezzo ×4), con `rendi()` e `salva()`.

  Run: `npx vitest run "src/app/(app)/piatti/[id]/ingredienti"`
  Expected: PASS. Conta i casi e scrivi nel registro il numero, con le righe del censimento
  dello Step 3.

- [ ] **Step 6: Le altre suite toccate.**

  Run, un comando alla volta:
  - `npx vitest run src/components/__tests__/dock.test.tsx "src/app/(app)/dispensa" "src/app/(app)/piatti"`
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run design:token`

  Expected: tutto verde. Il Dock della Dispensa (`<Dock sciolto>`) non cambia: la Dispensa non
  nasconde la barra, quindi `dock-senza-barra` non c'è. Se lint segnala
  `react-hooks/set-state-in-effect` sulle `set…` dentro `carica()`, è lo stesso schema di oggi:
  lascialo com'è.

- [ ] **Step 7: Il registro.** Aggiungi nella tabella delle decisioni:
  1. `LettoreCodice` al posto di `Scanner` (inizio del task), con il costo;
  2. il Dock senza barra: `.dock-senza-barra` messo da `Dock` con `useBarraNascosta`, regola in
     `globals.css`, nessun token nuovo;
  3. l'errore di salvataggio sopra il Dock, in un riquadro bianco agganciato alla pillola;
  4. ELIMINA in coda come tasto secondario col nome in `--errore`, `aria-label="Elimina
     ingrediente"`; su un ingrediente nuovo non c'è;
  5. l'errore generico di eliminazione resta nel dialogo (prima chiudeva il dialogo e andava in
     pagina); `IngredienteInUsoError` chiude il dialogo e resta sotto ELIMINA, come oggi;
  6. la scansione: il codice di un altro apre il suo editor con `APRI {NOME}`; un INTERO tiene
     formato 1 anche se il catalogo dà un peso; «trovato ma senza quantità» usa lo stesso
     messaggio dello sconosciuto; l'errore del catalogo usa `MSG_CATALOGO` della fase 4;
  7. i punti 5–8 dello Step 4 (il punto 5 va anche in «Domande per Andrea (in review)»);
  8. la spiegazione «a stima» con la cadenza (`spiegaClasse`, `leggiImpostazioni` nell'editor, default se la lettura fallisce);
  9. il censimento dei 20 test (Step 3), con le coppie dei titoli che cambiano.

- [ ] **Step 8: Commit.**

```bash
git add "src/app/(app)/piatti/[id]/ingredienti" src/components/Dock.tsx src/components/__tests__/dock.test.tsx src/app/globals.css docs/2026-09-25-fase5-decisioni-esecuzione.md
```

```bash
git commit -m "feat: l'editor dell'ingrediente del frame 12: freccia che segue torna, SALVA nel Dock senza barra, scansione del codice

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: La striscia dei giorni a sei pasti

I pallini della striscia passano da una fila a una griglia di tre colonne con gap 3, su una riga
fino a tre pasti e su due da quattro a sei. Il gap 2 a sei pasti decade. I pallini vuoti
diventano un contorno e quelli pieni prendono i token. A 360 ogni giorno è largo 44,3 e la
griglia 21 = 3 × 5 + 2 × 3 [misurato sul disegno, frame 27]. Spec §H.

**Files:**
- Modify: `src/components/StrisciaGiorni.tsx`
- Modify: `src/components/__tests__/striscia-giorni.test.tsx`
- Modify: `docs/2026-09-25-fase5-decisioni-esecuzione.md`

**Interfaces:**
- Consumes: nessuna interfaccia di altri task. I token `--ink`, `--superficie`,
  `--bordo-tratteggio` (`rgba(20,22,58,0.20)`) e `--banda-bordo` (`rgba(255,255,255,0.62)`)
  esistono già in `globals.css` [misurato].
- Produces: `StrisciaGiorni` con le stesse prop di oggi. In più, due funzioni pure esportate
  dallo stesso file: `posizionePallino(indice): { riga: number; colonna: number }` e
  `righePallini(n): number`. Le usa il componente e le provano i test. Nessun altro task le
  consuma.

**Cosa non cambia:** le prop, l'`aria-label` del giorno (col numero di pasti a casa), i quattro
stati negli `inset`, il padding `9px 0 10px`, il gap 5 dentro il riquadro, le sigle e i numeri.
Il riquadro cresce di 8 da quattro pasti perché la seconda riga aggiunge 3 + 5: nessuna altezza
si impone a mano. Le Righe pasto del giorno (68, gap 8, fino a sei) e la coda sotto il Dock
vivono in `piano/page.tsx` e non sono di questo task. Il gap fra le Righe pasto resta il 9 di
oggi [misurato: `piano/page.tsx:573`, `className="anim-giorno"`]: il disegno diceva 8, e il
controller ha deciso il 26/09 di tenere il codice (la spec §H lo dice dal 26/09). **Nessun task
tocca `piano/page.tsx` per questo.**

- [ ] **Step 1: I test (rossi).** In `src/components/__tests__/striscia-giorni.test.tsx`:
  - togli i due test del gap (`a cinque pasti il gap dei pallini resta il 3…` e `a sei pasti il
    gap dei pallini scende a 2…`). Il primo diventa `con %i pasti la griglia è a tre colonne da 5
    col gap 3`, il secondo `a sei pasti due righe da tre`. Scrivi le due coppie nella tabella
    delle decisioni del registro;
  - aggiungi le funzioni pure, la griglia e i colori.

```tsx
import { StrisciaGiorni, posizionePallino, righePallini } from '../StrisciaGiorni';
import type { MealSlot, MealSlotDef } from '@/domain/types';

function pasti(n: number): MealSlotDef[] {
  return Array.from({ length: n }, (_, i) => ({ id: `def-${i}`, nome: `Pasto ${i}`, posizione: i, assenzeAbituali: Array(7).fill(false) }));
}

/** Un pasto a casa con un piatto, il giorno `data`: il suo pallino è pieno. */
function pieno(data: string, slotDefId: string): MealSlot {
  return { id: `${data}-${slotDefId}`, data, slotDefId, stato: 'casa', dishId: 'd-1', fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: false };
}

const pallini = (cella: HTMLElement) => [...cella.querySelectorAll<HTMLElement>('[data-pallino]')];
const griglia = (cella: HTMLElement) => cella.querySelector<HTMLElement>('[data-pallino]')!.parentElement!;

describe('la griglia dei pallini (spec fase 5 §H)', () => {
  it('posizionePallino: tre colonne, riga e colonna da 1, la prima riga sempre piena', () => {
    expect([0, 1, 2, 3, 4, 5].map(posizionePallino)).toEqual([
      { riga: 1, colonna: 1 }, { riga: 1, colonna: 2 }, { riga: 1, colonna: 3 },
      { riga: 2, colonna: 1 }, { riga: 2, colonna: 2 }, { riga: 2, colonna: 3 },
    ]);
  });

  it('righePallini: una riga fino a tre pasti, due da quattro a sei', () => {
    expect([1, 2, 3, 4, 5, 6].map(righePallini)).toEqual([1, 1, 1, 2, 2, 2]);
  });

  it.each([3, 4, 6])('con %i pasti la griglia è a tre colonne da 5 col gap 3', (n) => {
    render(<StrisciaGiorni {...props} slotDefs={pasti(n)} />);
    const g = griglia(screen.getAllByRole('button')[0]);
    expect(g.style.display).toBe('grid');
    expect(g.style.gridTemplateColumns).toBe('repeat(3, 5px)');
    expect(g.style.gap).toBe('3px');
    expect(g).toHaveAttribute('aria-hidden', 'true');
  });

  it('con tre pasti una riga sola', () => {
    render(<StrisciaGiorni {...props} slotDefs={pasti(3)} />);
    expect(pallini(screen.getAllByRole('button')[0]).map((p) => p.style.gridRow)).toEqual(['1', '1', '1']);
  });

  it('con quattro pasti la prima riga è piena e il quarto va a capo, in prima colonna', () => {
    render(<StrisciaGiorni {...props} slotDefs={pasti(4)} />);
    const p = pallini(screen.getAllByRole('button')[0]);
    expect(p.map((x) => x.style.gridRow)).toEqual(['1', '1', '1', '2']);
    expect(p[3].style.gridColumn).toBe('1');
  });

  it('a sei pasti due righe da tre', () => {
    render(<StrisciaGiorni {...props} slotDefs={pasti(6)} />);
    const p = pallini(screen.getAllByRole('button')[0]);
    expect(p).toHaveLength(6);
    expect(p.map((x) => x.style.gridRow)).toEqual(['1', '1', '1', '2', '2', '2']);
  });

  it('i colori: pieno in --ink, vuoto a contorno 0,20; sul giorno selezionato bianco e contorno bianco 0,62', () => {
    const lun = props.giorni[0];
    // Selezionato il lunedì (indice 0), di confronto il martedì (indice 1): lo stesso pasto pieno in entrambi.
    const slots = [pieno(lun, 'def-0'), pieno(props.giorni[1], 'def-0')];
    render(<StrisciaGiorni {...props} slotDefs={pasti(3)} slots={slots} selezionato={0} />);
    const [sel, altro] = screen.getAllByRole('button');

    const [pienoAltro, vuotoAltro] = pallini(altro);
    expect(pienoAltro.style.backgroundColor).toBe('var(--ink)');
    expect(['0', '0px']).toContain(pienoAltro.style.borderWidth);
    expect(vuotoAltro.style.backgroundColor).toBe('transparent');
    expect(vuotoAltro.style.borderWidth).toBe('1px');
    expect(vuotoAltro.style.borderColor).toBe('var(--bordo-tratteggio)');

    const [pienoSel, vuotoSel] = pallini(sel);
    expect(pienoSel.style.backgroundColor).toBe('var(--superficie)');
    expect(vuotoSel.style.backgroundColor).toBe('transparent');
    expect(vuotoSel.style.borderColor).toBe('var(--banda-bordo)');
  });

  it('i pallini sono tutti da 5 con box-sizing border-box: il contorno non li ingrandisce', () => {
    render(<StrisciaGiorni {...props} slotDefs={pasti(6)} />);
    for (const p of pallini(screen.getAllByRole('button')[0])) {
      expect(p.style.width).toBe('5px');
      expect(p.style.height).toBe('5px');
      expect(p.style.boxSizing).toBe('border-box');
    }
  });

  it('l\'aria-label del giorno conta ancora i pasti a casa, a sei pasti', () => {
    const lun = props.giorni[0];
    render(<StrisciaGiorni {...props} slotDefs={pasti(6)} slots={[pieno(lun, 'def-0'), pieno(lun, 'def-4')]} selezionato={6} />);
    expect(screen.getByRole('button', { name: 'Lunedì 24, 2 pasti a casa' })).toBeInTheDocument();
  });
});
```

  Il test di oggi `con sei pasti disegna sei pallini per cella` resta com'è. Gli altri sei test di
  oggi non cambiano.

  Run: `npx vitest run src/components/__tests__/striscia-giorni.test.tsx`
  Expected: FAIL: `posizionePallino` e `righePallini` non esistono, la fila è flex.

  Nota per chi li scrive: `style.backgroundColor` con `var(--ink)` dipende dal parser CSS di
  jsdom. Il repo ha già attese su `style.color` con `var()` [misurato:
  `piano/__tests__/page.test.tsx:308`]. Se `backgroundColor` o `borderColor` tornano vuoti, passa
  a `getAttribute('style')` con `toContain('background-color: var(--ink)')` e scrivilo nel
  registro.

- [ ] **Step 2: Il componente.** In `src/components/StrisciaGiorni.tsx`, sopra il componente:

```tsx
/** Le colonne della griglia dei pallini (spec fase 5 §H, frame 27). */
const COLONNE_PALLINI = 3;

/**
 * Dove sta il pallino `indice` (da 0) nella griglia: riga e colonna da 1, come
 * `gridRow` e `gridColumn`. Si riempie per righe, quindi la prima riga è sempre
 * piena e da quattro pasti la seconda comincia dalla prima colonna.
 */
export function posizionePallino(indice: number): { riga: number; colonna: number } {
  return { riga: Math.floor(indice / COLONNE_PALLINI) + 1, colonna: (indice % COLONNE_PALLINI) + 1 };
}

/** Le righe che occupano `n` pallini: una fino a tre, due da quattro a sei. */
export function righePallini(n: number): number {
  return Math.max(1, Math.ceil(n / COLONNE_PALLINI));
}
```

  Nel componente togli `const gapPallini = …` e il commento lungo che lo spiega. Al suo posto:

```tsx
  // Dalla fase 5 (spec §H, frame 27) i pallini stanno in una griglia di tre
  // colonne da 5 con gap 3: 21 px di larghezza a qualunque numero di pasti,
  // dentro un giorno che a 360 è largo 44,3 [misurato sul disegno]. Il gap 2 a sei
  // pasti (fase 2, deciso da una misura a 375) non serve più: la fila da 45 px non
  // c'è. Da quattro pasti la seconda riga alza il riquadro di 8 (3 + 5), da sé.
```

  E sostituisci il blocco `<div style={{ display: 'flex', gap: gapPallini }}>…</div>`:

```tsx
            <span
              aria-hidden="true"
              style={{ display: 'grid', gridTemplateColumns: `repeat(${COLONNE_PALLINI}, 5px)`, gap: 3 }}
            >
              {slotDefs.map((def, i) => {
                const slot = slots.find((s) => s.data === data && s.slotDefId === def.id);
                const pieno = !!slot && slot.stato === 'casa' && slot.dishId !== null;
                const { riga, colonna } = posizionePallino(i);
                return (
                  <span
                    key={def.id}
                    data-pallino
                    style={{
                      gridRow: riga, gridColumn: colonna,
                      width: 5, height: 5, boxSizing: 'border-box', borderRadius: 999, display: 'block',
                      borderStyle: 'solid',
                      borderWidth: pieno ? 0 : 1,
                      // Vuoto: il contorno 0,20 del tratteggio (--bordo-tratteggio); sul giorno
                      // selezionato bianco 0,62, lo stesso valore di --banda-bordo (spec §H).
                      borderColor: sel ? 'var(--banda-bordo)' : 'var(--bordo-tratteggio)',
                      backgroundColor: pieno ? (sel ? 'var(--superficie)' : 'var(--ink)') : 'transparent',
                    }}
                  />
                );
              })}
            </span>
```

  `righePallini` non serve al render: la griglia va a capo da sé. Resta perché dice la regola
  in una riga che si prova, e la sonda del Task 15 la confronta con l'altezza misurata. La
  docstring del componente dice ora: «un pallino per pasto in una griglia di tre colonne (pieno
  se quel pasto è a casa e ha un piatto assegnato)». Nel commento sui quattro stati, il
  paragrafo «Limite noto dell'inset da 4,5 px…» parla dei pallini a 3,21 px dal bordo con la
  fila di sei. Con la griglia da 21 px in un giorno da 44,3 i pallini partono a 11,6 px
  dal bordo, e l'anello non li tocca più. Riscrivi il paragrafo così:

```tsx
        // Con la griglia a tre colonne (fase 5) i pallini partono a (44,3 − 21) / 2 =
        // 11,6 px dal bordo del giorno a 360 [calcolo]: l'inset da 4,5 px della cella
        // "oggi e selezionata" non li copre più. Il limite della fase 2 era della fila
        // da sei, che non c'è più.
```

  Run: `npx vitest run src/components/__tests__/striscia-giorni.test.tsx`
  Expected: PASS.

- [ ] **Step 3: Chi usa la striscia.**

  Run: `npx vitest run "src/app/(app)/piano"`
  Expected: PASS. Il Piano monta `StrisciaGiorni` e i suoi test contano i pulsanti dei giorni,
  non i pallini. Se un test cerca il vecchio `display: flex` della fila, aggiornalo e scrivilo
  nel registro.

- [ ] **Step 4: Verifica.**

  Run, un comando alla volta:
  - `npx tsc --noEmit`
  - `npm run lint`

  Expected: verde.

- [ ] **Step 5: Il registro.** Scrivi:
  1. le due coppie dei test del gap (Step 1);
  2. i due token presi in prestito, `--bordo-tratteggio` e `--banda-bordo`, per i loro valori e
     non per i nomi. Costo se sbagliato: chi cambia il tratteggio cambia anche i pallini;
  3. il gap 9 delle Righe pasto del Piano: resta quello di oggi (decisione del controller del
     26/09, spec §H); il disegno diceva 8;
  4. la misura nel browser resta al Task 15, punto 4.

- [ ] **Step 6: Commit.**

```bash
git add src/components/StrisciaGiorni.tsx src/components/__tests__/striscia-giorni.test.tsx docs/2026-09-25-fase5-decisioni-esecuzione.md
```

```bash
git commit -m "feat: la striscia dei giorni coi pallini in griglia a tre colonne, sei pasti a 360

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: L'animazione d'avvio del Marchio

All'apertura dell'app su `/lista`, una volta per sessione e mai con `reduce`, il Marchio si
compone al centro con il pop elastico. Poi vola sull'icona della voce Lista nella tab bar e si
dissolve in lei. Il livello sta sopra tutto e non prende tocchi. La Lista carica sotto come oggi,
e a 2100 ms il livello si smonta. Spec §J, decisione 16; tempi e valori dal log §1.

**Files:**
- Create: `src/components/AvvioMarchio.tsx`, `src/components/__tests__/avvio-marchio.test.tsx`
- Modify: `src/components/Guscio.tsx` (monta `<AvvioMarchio />`), `src/components/__tests__/guscio.test.tsx`
- Modify: `src/components/TabBar.tsx` (il `data-marchio-barra` sul segno della Lista),
  `src/components/__tests__/tabbar.test.tsx`
- Verify, senza toccarlo: `src/app/globals.css` (le classi `.anim-avvio-*`, `@keyframes pb` e la cintura `[data-avvio] { display: none; }` con `reduce` le ha scritte il Task 1, coi nomi di questo task)
- Modify: `docs/2026-09-25-fase5-decisioni-esecuzione.md`

**Interfaces:**
- Consumes: `ORDINE_MARCHIO`, `coloreArea` (`src/domain/aree.ts`); il `data-barra` del `.guscio`
  (`grande` | `ridotta`, `Guscio.tsx`); le classi `.anim-avvio-casella`, `.anim-avvio-fondo-via`,
  `.anim-avvio-dissolto`, `.anim-avvio-volo`, `.anim-avvio-svanisce`, `.anim-avvio-nascosto`,
  `.anim-avvio-rivela`, `@keyframes pb` e la voce `.anim-avvio` di DESIGN.md §7 (Task 1);
  `--sfondo-schermata`, `--curva-barra` (`globals.css`).
- Produces (non vincolanti: solo il Task 15 li usa, nella sonda):
  - `AvvioMarchio()`, montato nel Guscio;
  - `LivelloAvvio({ onFine })`, l'animazione senza condizioni, che la sonda monta a comando;
  - `calcolaVolo(da, a): { dx, dy, scala }`, `devePartire(pathname): boolean`, `CHIAVE_AVVIO`,
    `TEMPI_AVVIO`, `RITARDI_POP`;
  - gli attributi `data-avvio` (il livello), `data-avvio-marchio` (il Marchio in volo) e
    `data-marchio-barra` (il segno della voce Lista in tab bar).

**Le misure** (log §1, spec §J):

| | Valore |
|---|---|
| Marchio grande | caselle 40, gap 10, raggio 11,2, bordo 2, `box-sizing: border-box`: 140 × 90 |
| Marchio in barra | caselle 9, gap 4 (`TabBar.tsx`): 35 × 22 |
| Pop `pb` | 620 ms `linear`, ritardi `0, 340, 170, 255, 85, 425` in ordine di griglia |
| Volo | da 1200 a 1820 ms, `cubic-bezier(.2,.8,.25,1)` (`--curva-barra`), `translate` + `scale` |
| Fondo | si dissolve da 1200 a 1620 ms |
| Arrivo | da 1700 a 1820 ms il Marchio in volo va a 0, quello della barra torna a 1 |
| Fine | a 2100 ms il livello si smonta |

La scala si calcola sulla larghezza: 35 / 140 = 0,25. In altezza fa 22,5 contro 22, mezzo pixel
di scarto. È la ragione della dissolvenza incrociata finale (§J: il rapporto fra gap e lato non
è identico).

- [ ] **Step 1: Leggi prima di scrivere.** `src/components/Marchio.tsx`, `TabBar.tsx`,
  `PrimoAvvio.tsx`, `Guscio.tsx` (dopo il Task 6: pannello e velo ci sono già), e in
  `src/app/globals.css` il blocco dell'avvio che ha scritto il Task 1:

```bash
grep -n "keyframes pb\|anim-avvio\|data-avvio" src/app/globals.css design/sistema/DESIGN.md
```

  Expected: `@keyframes pb`, le sette classi `.anim-avvio-*` e `[data-avvio] { display: none; }`
  in `globals.css`, e la voce `.anim-avvio` in DESIGN.md §7, tutte del Task 1. Se manca qualcosa,
  **fermati**: il difetto è del Task 1, e il suo test (`token.test.ts`, «l'avvio: @keyframes pb…»)
  deve essere rosso.

- [ ] **Step 2: Il test (rosso).** Crea `src/components/__tests__/avvio-marchio.test.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

const percorso = vi.hoisted(() => ({ valore: '/lista' }));
vi.mock('next/navigation', () => ({ usePathname: () => percorso.valore }));

import { AvvioMarchio, LivelloAvvio, calcolaVolo, devePartire, CHIAVE_AVVIO, RITARDI_POP } from '../AvvioMarchio';
import { ORDINE_MARCHIO, coloreArea } from '@/domain/aree';

let riduci = false;
function stubMatchMedia() {
  vi.stubGlobal('matchMedia', vi.fn((q: string) => ({
    matches: riduci && q.includes('reduce'), media: q, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  })));
}

type Rett = { left: number; top: number; width: number; height: number };
const RETT_GRANDE: Rett = { left: 110, top: 355, width: 140, height: 90 }; // centro 180, 400
const RETT_BARRA: Rett = { left: 162.5, top: 758, width: 35, height: 22 }; // centro 180, 769
const rettangolo = (r: Rett) => ({ ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height, toJSON: () => r }) as DOMRect;

/** La barra finta: un `.guscio` col suo data-barra e il segno della Lista col Marchio dentro. */
function montaBarra(stato: 'grande' | 'ridotta') {
  const guscio = document.createElement('div');
  guscio.className = 'guscio';
  guscio.dataset.barra = stato;
  const segno = document.createElement('span');
  segno.setAttribute('data-marchio-barra', '');
  segno.appendChild(document.createElement('div'));
  guscio.appendChild(segno);
  document.body.appendChild(guscio);
  return { segno, togli: () => guscio.remove() };
}

const livello = () => document.querySelector<HTMLElement>('[data-avvio]');
const marchio = () => document.querySelector<HTMLElement>('[data-avvio-marchio]')!;
const avanza = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  riduci = false;
  stubMatchMedia();
  sessionStorage.clear();
  percorso.valore = '/lista';
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute('data-avvio-marchio')) return rettangolo(RETT_GRANDE);
    if (this.parentElement?.hasAttribute('data-marchio-barra')) return rettangolo(RETT_BARRA);
    return rettangolo({ left: 0, top: 0, width: 0, height: 0 });
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('calcolaVolo', () => {
  it('porta il centro sul centro e scala sulla larghezza', () => {
    expect(calcolaVolo(RETT_GRANDE, RETT_BARRA)).toEqual({ dx: 0, dy: 369, scala: 0.25 });
    expect(calcolaVolo({ left: 0, top: 0, width: 140, height: 90 }, { left: 100, top: 200, width: 70, height: 45 }))
      .toEqual({ dx: 65, dy: 177.5, scala: 0.5 });
  });
});

describe('devePartire (spec §J: solo su /lista, una volta per sessione, mai con reduce)', () => {
  it('la prima volta su /lista sì, e segna la sessione', () => {
    expect(devePartire('/lista')).toBe(true);
    expect(sessionStorage.getItem(CHIAVE_AVVIO)).not.toBeNull();
    expect(devePartire('/lista')).toBe(false);
  });

  it.each(['/piano', '/dispensa', '/lista/fatta', '/piatti', null])('su %s no', (p) => {
    expect(devePartire(p)).toBe(false);
    expect(sessionStorage.getItem(CHIAVE_AVVIO)).toBeNull();
  });

  it('con prefers-reduced-motion: reduce no', () => {
    riduci = true;
    expect(devePartire('/lista')).toBe(false);
  });

  it('senza matchMedia no: non si sa se il moto è permesso', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(devePartire('/lista')).toBe(false);
  });

  it('se sessionStorage lancia no: non si potrebbe garantire «una volta sola»', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('negato'); });
    expect(devePartire('/lista')).toBe(false);
  });
});

describe('AvvioMarchio', () => {
  it('su /lista monta il livello: fixed, sopra tutto, senza tocchi, nascosto allo screen reader', () => {
    render(<AvvioMarchio />);
    const l = livello()!;
    expect(l).not.toBeNull();
    expect(l).toHaveAttribute('aria-hidden', 'true');
    expect(l.style.position).toBe('fixed');
    expect(l.style.pointerEvents).toBe('none');
    expect(Number(l.style.zIndex)).toBeGreaterThanOrEqual(100);
  });

  it('sei caselle da 40 nei colori pieni e nell\'ordine del Marchio, coi ritardi del pop', () => {
    render(<AvvioMarchio />);
    const caselle = [...marchio().querySelectorAll<HTMLElement>('[data-avvio-casella]')];
    expect(caselle).toHaveLength(6);
    expect(caselle.map((c) => c.style.animationDelay)).toEqual(RITARDI_POP.map((r) => `${r}ms`));
    expect(caselle.map((c) => c.dataset.area)).toEqual(ORDINE_MARCHIO);
    for (const c of caselle) {
      expect(c).toHaveClass('anim-avvio-casella');
      expect(c.style.width).toBe('40px');
      expect(c.style.boxSizing).toBe('border-box');
      expect(c.style.borderRadius).toBe('11.2px');
    }
    // Il colore viene da coloreArea(data-area): basta l'ordine delle aree, sopra. jsdom
    // normalizza gli esadecimali in rgb(), e un confronto sul testo sarebbe fragile.
    expect(coloreArea(ORDINE_MARCHIO[0])).toBe('#F2A465');
  });

  it('una volta per sessione: rimontato, non riparte', () => {
    const { unmount } = render(<AvvioMarchio />);
    unmount();
    render(<AvvioMarchio />);
    expect(livello()).toBeNull();
  });

  it('non parte su /piano né con reduce', () => {
    percorso.valore = '/piano';
    const a = render(<AvvioMarchio />);
    expect(livello()).toBeNull();
    a.unmount();
    percorso.valore = '/lista';
    riduci = true;
    render(<AvvioMarchio />);
    expect(livello()).toBeNull();
  });

  it('con la barra grande: pop, volo sul Marchio della barra a 1200, dissolvenza a 1700, smontaggio a 2100', () => {
    const { segno, togli } = montaBarra('grande');
    render(<AvvioMarchio />);
    // Il Marchio della barra è nascosto finché quello in volo non arriva.
    expect(segno).toHaveClass('anim-avvio-nascosto', 'anim-avvio-rivela');

    avanza(1199);
    expect(marchio()).not.toHaveClass('anim-avvio-volo');
    expect(marchio().style.transform).toBe('');

    avanza(1);
    expect(marchio()).toHaveClass('anim-avvio-volo');
    expect(marchio().style.transform).toBe('translate(0px, 369px) scale(0.25)');
    expect(livello()!.querySelector('[data-avvio-fondo]')).toHaveClass('anim-avvio-fondo-via');

    avanza(500); // 1700
    expect(marchio()).toHaveClass('anim-avvio-svanisce');
    expect(segno).not.toHaveClass('anim-avvio-nascosto');

    avanza(399); // 2099
    expect(livello()).not.toBeNull();
    avanza(1); // 2100
    expect(livello()).toBeNull();
    expect(segno).not.toHaveClass('anim-avvio-rivela');
    togli();
  });

  it.each(['ridotta', null] as const)('con la barra %s il volo non parte: il livello si dissolve e si smonta', (stato) => {
    const barra = stato ? montaBarra(stato) : null;
    render(<AvvioMarchio />);
    avanza(1200);
    expect(marchio().style.transform).toBe('');
    expect(livello()).toHaveClass('anim-avvio-dissolto');
    if (barra) expect(barra.segno).not.toHaveClass('anim-avvio-nascosto');
    avanza(900);
    expect(livello()).toBeNull();
    barra?.togli();
  });

  it('smontato prima della fine (cambio di pagina, strict mode) ripulisce la barra e i timer', () => {
    const { segno, togli } = montaBarra('grande');
    const onFine = vi.fn();
    const { unmount } = render(<LivelloAvvio onFine={onFine} />);
    avanza(500);
    unmount();
    expect(segno).not.toHaveClass('anim-avvio-nascosto');
    expect(segno).not.toHaveClass('anim-avvio-rivela');
    avanza(3000);
    expect(onFine).not.toHaveBeenCalled();
    togli();
  });
});
```

  Run: `npx vitest run src/components/__tests__/avvio-marchio.test.tsx`
  Expected: FAIL, il modulo non esiste.

- [ ] **Step 3: `AvvioMarchio.tsx`.**

```tsx
'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ORDINE_MARCHIO, coloreArea } from '@/domain/aree';

/** Il segno che l'avvio l'ha già visto questa sessione di navigazione (spec §J). */
export const CHIAVE_AVVIO = 'spesa:avvio-visto';

/** I tempi della spec §J, in ms dal montaggio. */
export const TEMPI_AVVIO = { volo: 1200, arrivo: 1700, smontaggio: 2100 } as const;

/** I ritardi del pop in ordine di griglia (log §1): l'ordine è quello di ORDINE_MARCHIO. */
export const RITARDI_POP = [0, 340, 170, 255, 85, 425] as const;

/** Il Marchio grande del log §1: caselle 40, gap 10, raggio 11,2 (40 × 0,28), bordo 2. */
const LATO = 40;
const GAP = 10;
const RAGGIO = 11.2;
/** Sopra tutto: il pannello, i fogli (fino a 80) e il dialogo stanno sotto. */
const Z_AVVIO = 100;

type Rett = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
export interface Volo { dx: number; dy: number; scala: number }

/**
 * Da dove sta il Marchio grande a dove sta quello della barra: si sposta il
 * centro sul centro, e si scala sulla larghezza (35 / 140 = 0,25). In altezza
 * resta mezzo pixel di scarto, che la dissolvenza finale copre (spec §J).
 */
export function calcolaVolo(da: Rett, a: Rett): Volo {
  return {
    dx: a.left + a.width / 2 - (da.left + da.width / 2),
    dy: a.top + a.height / 2 - (da.top + da.height / 2),
    scala: a.width / da.width,
  };
}

/**
 * Parte solo su `/lista` (lo start_url della PWA), una volta per sessione di
 * navigazione, e mai con `prefers-reduced-motion: reduce`. Senza `matchMedia`
 * non si sa se il moto è permesso, e senza `sessionStorage` non si può
 * promettere «una volta sola»: in entrambi i casi non parte. È un ornamento, e
 * nel dubbio si salta. Se parte, lo segna subito.
 */
export function devePartire(pathname: string | null): boolean {
  if (pathname !== '/lista') return false;
  if (typeof window.matchMedia !== 'function') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    if (window.sessionStorage.getItem(CHIAVE_AVVIO) !== null) return false;
    window.sessionStorage.setItem(CHIAVE_AVVIO, '1');
    return true;
  } catch {
    return false;
  }
}

/** Il segno della voce Lista in tab bar, se c'è. */
function segnoDellaBarra(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-marchio-barra]');
}

/** Il bersaglio del volo: il Marchio della barra, solo a barra grande (§J: ridotta o assente, niente volo). */
function bersaglioDelVolo(): HTMLElement | null {
  const segno = segnoDellaBarra();
  if (!segno || segno.closest('.guscio')?.getAttribute('data-barra') !== 'grande') return null;
  return (segno.firstElementChild as HTMLElement | null) ?? segno;
}

type Fase = 'pop' | 'volo' | 'arrivo' | 'dissolto';

/**
 * L'animazione, senza condizioni: la monta `AvvioMarchio` quando deve partire,
 * e la sonda del Task 15 a comando. Non ritarda niente: il livello non prende
 * tocchi, e sotto la Lista carica come sempre. Le classi `.anim-avvio-*`
 * stanno in globals.css; i movimenti solo dentro `no-preference`.
 *
 * Il Marchio della barra si nasconde dal montaggio e torna a 1700 mentre
 * quello in volo si dissolve: i due segni non si vedono mai insieme. Si
 * tocca con `classList`, e React non lo sovrascrive: il `className` del segno
 * non cambia fra un render e l'altro della barra.
 */
export function LivelloAvvio({ onFine }: { onFine: () => void }) {
  const marchioRef = useRef<HTMLDivElement>(null);
  const [fase, setFase] = useState<Fase>('pop');
  const [volo, setVolo] = useState<Volo | null>(null);
  const fine = useRef(onFine);
  useEffect(() => {
    fine.current = onFine;
  });

  useEffect(() => {
    const segno = segnoDellaBarra();
    segno?.classList.add('anim-avvio-rivela', 'anim-avvio-nascosto');
    const timer = [
      setTimeout(() => {
        // Si misura adesso, non al montaggio: a 1200 la barra è quella che l'utente vede.
        const bersaglio = bersaglioDelVolo();
        const el = marchioRef.current;
        if (el && bersaglio) {
          setVolo(calcolaVolo(el.getBoundingClientRect(), bersaglio.getBoundingClientRect()));
          setFase('volo');
        } else {
          segno?.classList.remove('anim-avvio-nascosto');
          setFase('dissolto');
        }
      }, TEMPI_AVVIO.volo),
      setTimeout(() => {
        setFase((f) => (f === 'volo' ? 'arrivo' : f));
        segno?.classList.remove('anim-avvio-nascosto');
      }, TEMPI_AVVIO.arrivo),
      setTimeout(() => fine.current(), TEMPI_AVVIO.smontaggio),
    ];
    return () => {
      timer.forEach(clearTimeout);
      segno?.classList.remove('anim-avvio-rivela', 'anim-avvio-nascosto');
    };
  }, []);

  const classeMarchio = fase === 'volo' ? 'anim-avvio-volo' : fase === 'arrivo' ? 'anim-avvio-volo anim-avvio-svanisce' : undefined;
  return (
    <div
      data-avvio
      aria-hidden="true"
      className={fase === 'dissolto' ? 'anim-avvio-dissolto' : undefined}
      style={{ position: 'fixed', inset: 0, zIndex: Z_AVVIO, pointerEvents: 'none' }}
    >
      <div
        data-avvio-fondo
        className={fase === 'pop' ? undefined : 'anim-avvio-fondo-via'}
        style={{ position: 'absolute', inset: 0, background: 'var(--sfondo-schermata)' }}
      />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          ref={marchioRef}
          data-avvio-marchio
          className={classeMarchio}
          style={{
            display: 'grid', gridTemplateColumns: `repeat(3, ${LATO}px)`, gap: GAP, transformOrigin: '50% 50%',
            transform: volo ? `translate(${volo.dx}px, ${volo.dy}px) scale(${volo.scala})` : undefined,
          }}
        >
          {ORDINE_MARCHIO.map((area, i) => (
            <span
              key={area}
              data-avvio-casella
              data-area={area}
              className="anim-avvio-casella"
              style={{
                display: 'block', width: LATO, height: LATO, boxSizing: 'border-box', borderRadius: RAGGIO,
                border: `2px solid ${coloreArea(area)}`, background: coloreArea(area),
                animationDelay: `${RITARDI_POP[i]}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * L'avvio del Marchio (spec fase 5 §J, decisione 16): all'apertura dell'app il
 * Marchio si compone al centro e vola sull'icona della Lista in tab bar. È
 * un'eccezione dichiarata a DESIGN.md §7 (`.anim-avvio`): dura oltre 250 ms e
 * non segue un gesto, perché accade una volta sola ed è il marchio.
 *
 * Si decide una volta, al primo montaggio del Guscio: chi arriva su /piano e poi
 * va sulla Lista non la vede. In un effetto di layout, così il livello c'è
 * prima del primo disegno dopo l'idratazione. Il ref tiene la decisione anche
 * col doppio effetto di Strict Mode.
 */
export function AvvioMarchio() {
  const pathname = usePathname();
  const [parte, setParte] = useState(false);
  const deciso = useRef(false);
  useLayoutEffect(() => {
    if (deciso.current) return;
    deciso.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- una decisione sola, prima del primo disegno
    if (devePartire(pathname)) setParte(true);
  }, [pathname]);
  if (!parte) return null;
  return <LivelloAvvio onFine={() => setParte(false)} />;
}
```

  Run: `npx vitest run src/components/__tests__/avvio-marchio.test.tsx`
  Expected: PASS. Nel `it.each` di `devePartire` il titolo stampa `null` per l'ultimo caso, va
  bene.

- [ ] **Step 4: Le classi in `globals.css` (solo verifica).** Le ha scritte il Task 1 (Step 14):
  gli stati d'arrivo fuori dal media, il pop, la dissolvenza del fondo (420 ms `linear`, da 1200
  a 1620: la spec non dice la curva, `linear` come il velo del pannello, §B.2), una sola
  `transition` per il Marchio in volo (transform 620 ms e opacità 120 ms: se `svanisce` ne
  dichiarasse un'altra, a 1700 cancellerebbe quella del transform ancora in corsa, che finisce a
  1820). Controlla che i nomi coincidano con quelli del componente dello Step 3.

  Run: `npx vitest run src/app/__tests__/token.test.ts`, poi `npm run design:token`
  Expected: PASS entrambi: nessun token nuovo.

- [ ] **Step 5: Il bersaglio in tab bar.** In `src/components/TabBar.tsx`, sul segno della voce
  Lista:

```tsx
            <span className="barra-segno" data-marchio-barra={voce.icona ? undefined : ''}>
```

  E in `src/components/__tests__/tabbar.test.tsx`:

```tsx
  it('il segno della Lista porta data-marchio-barra, ed è l\'unico: è dove atterra l\'avvio (spec fase 5 §J)', () => {
    monta();
    const segni = document.querySelectorAll('[data-marchio-barra]');
    expect(segni).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Lista' })).toContainElement(segni[0] as HTMLElement);
    expect(segni[0].querySelectorAll('[data-area]')).toHaveLength(6);
  });
```

  Run: `npx vitest run src/components/__tests__/tabbar.test.tsx`
  Expected: PASS.

- [ ] **Step 6: Nel Guscio.** In `src/components/Guscio.tsx`, dentro `<div className="guscio" …>`,
  come ultimo figlio, dopo la tab bar e dopo quello che il Task 6 ha aggiunto:

```tsx
          {/* L'avvio del Marchio (spec fase 5 §J): sopra tutto, non prende tocchi, si
              smonta da sé. Fuori da <main>, così la scala dell'app sotto il pannello non lo tocca. */}
          <AvvioMarchio />
```

  con `import { AvvioMarchio } from './AvvioMarchio';`. In
  `src/components/__tests__/guscio.test.tsx`:

```tsx
  it('monta l\'avvio del Marchio su /lista, una volta per sessione (spec fase 5 §J)', () => {
    percorso.valore = '/lista';
    sessionStorage.clear();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    try {
      const { container, unmount } = render(<Guscio><p>x</p></Guscio>);
      expect(container.querySelector('[data-avvio]')).not.toBeNull();
      unmount();
      const secondo = render(<Guscio><p>x</p></Guscio>);
      expect(secondo.container.querySelector('[data-avvio]')).toBeNull();
    } finally {
      vi.unstubAllGlobals();
      sessionStorage.clear();
    }
  });
```

  Gli altri test del Guscio non cambiano: in jsdom `matchMedia` non c'è, quindi l'avvio non
  parte [misurato: nessun test del repo lo definisce globalmente]. Il Task 6 non ne aggiunge uno;
  `aiuti.tsx` del Task 7 lo definisce, ma solo nei file di test che lo importano (Vitest isola i
  file), e nessuno di quelli monta il Guscio.

  Run: `npx vitest run src/components/__tests__/guscio.test.tsx`
  Expected: PASS.

- [ ] **Step 7: Le suite che montano il Guscio o la tab bar.**

  Run, un comando alla volta:
  - `npx vitest run src/components`
  - `npm test`
  - `npx tsc --noEmit`
  - `npm run lint`

  Expected: verde. Se una pagina di test stubba `matchMedia` e monta il Guscio su `/lista`,
  vedrà il livello per 2100 ms finti: è innocuo (niente tocchi, `aria-hidden`), ma se un
  `getByRole` si confonde, metti il segno `spesa:avvio-visto` in quel `beforeEach`.

- [ ] **Step 8: Il registro.** Scrivi:
  1. il livello si decide in `useLayoutEffect`, al primo montaggio del Guscio. Prima
     dell'idratazione, per un attimo si vedono il Guscio vuoto e la tab bar (l'HTML del
     server) [ipotesi, da vedere sul telefono al gate §M.4];
  2. senza `matchMedia` o senza `sessionStorage` non parte;
  3. la dissolvenza del fondo è `linear` (nel CSS del Task 1);
  4. il Marchio della barra si nasconde con una classe dal montaggio all'arrivo, e torna
     incrociato con quello in volo;
  5. la misura del punto d'arrivo nel browser resta al Task 15, punto 5.

- [ ] **Step 9: Commit.**

```bash
git add src/components/AvvioMarchio.tsx src/components/__tests__/avvio-marchio.test.tsx src/components/Guscio.tsx src/components/__tests__/guscio.test.tsx src/components/TabBar.tsx src/components/__tests__/tabbar.test.tsx docs/2026-09-25-fase5-decisioni-esecuzione.md
```

```bash
git commit -m "feat: l'avvio del Marchio, dal centro all'icona della Lista in tab bar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Verifica nel browser, ponte, chiusura

jsdom non vede larghezze, sbordi, transizioni e posizioni vere. La sonda nel browser misura con
dati finti i punti 2–5 di §M.3: il pannello a tre larghezze, la tab bar a 360, la striscia a sei
pasti, l'arrivo dell'avvio. Il punto 1 (`chiudiTuttoPoi` + `router.push`) l'ha misurato il
Task 2. Poi il ponte `DESIGN-SYSTEM.md`, la chiusura del registro con i gate di Andrea, e la
suite intera. Il telefono resta al gate di Andrea (§M.4).

**Files:**
- Create (temporaneo, **da cancellare prima del commit**): `src/app/auth/sonda-fase5/page.tsx`
- Modify: `docs/superpowers/specs/DESIGN-SYSTEM.md` (il ponte)
- Modify: `docs/superpowers/specs/2026-09-25-impostazioni-design.md` (solo §L: i limiti noti trovati durante l'esecuzione, Step 9)
- Modify: `docs/2026-09-25-fase5-decisioni-esecuzione.md` (la chiusura del registro)
- Modify, solo se una misura fallisce: il file del componente che la fa fallire, col suo test

**Interfaces:**
- Consumes: `Guscio` col pannello (Task 6), le sotto-schermate (Task 7–10), `Testata`
  (Task 6 e 11), `TabBar` (Task 11 e 14), `StrisciaGiorni` (Task 13), `LivelloAvvio` e gli
  attributi `data-avvio`, `data-avvio-marchio`, `data-marchio-barra` (Task 14). Nomi accessibili
  fissati dalla spec: le celle della matrice
  (`{Giorno} {pasto}: di base a casa, tocca per mettere fuori casa` e la variante fuori casa),
  `nav[aria-label="Sezioni"]`, i primari del piede `SALVA ORDINE`, `PREPARA IL FILE`,
  `CREA UN CODICE`.
- Produces: niente di nuovo nel codice. Misure, ponte e registro.

**Le soglie di accettazione** (ogni numero va nel registro come [misurato], con la larghezza):

| Punto | Misura | Passa se |
|---|---|---|
| 2a | matrice a sei pasti, 42 celle | ognuna larga e alta ≥ 44; il bordo destro dell'ultima ≤ larghezza − 12; il corpo non scorre di lato (`scrollWidth − clientWidth` = 0). A 360 si attende 44,6 di larghezza [calcolo, §C.1] |
| 2b | piede fisso in Ordine delle aree, Esporta, Casa | col corpo scorso in fondo, il fondo del contenuto ≤ la cima del piede (+0,5); il piede dentro la finestra; il primario alto 54 |
| 2c | tastiera sul campo `PERS` | **non eseguibile qui**: il browser della sessione non apre una tastiera virtuale. Resta al telefono (§M.4) e il registro lo scrive NON ESEGUITO |
| 3 | tab bar a 360 | grande 304 × 84, voci 96 × 72, lati liberi (360 − 304) / 2 = 28 ± 0,5; ridotta 244 × 66, voci 76 × 54, lati 58 ± 0,5; `bottom` 22; `transition-property` contiene `width` e `height` e non `left` né `right` |
| 4 | striscia a sei pasti a 360 | ogni giorno ≥ 44 (atteso 44,29); somma delle larghezze + 6 gap = 328 ± 0,5; ultimo giorno a destra ≤ 344,5; griglia larga 21 e dentro ogni giorno; riquadro più alto di 8 ± 0,5 rispetto a tre pasti; nessuno scorrimento di lato |
| 5 | arrivo dell'avvio, a 360 e a 393 | centro del Marchio in volo, a fine volo, entro 1 px dal centro del Marchio della barra, in x e in y; larghezze entro 1 px; `elementFromPoint` al centro **non** dà il livello (niente tocchi intercettati) |

**Se una misura fallisce:** si corregge il componente con un test che fissa la correzione, se
jsdom la può vedere. Poi si rimisura alla stessa larghezza e alle altre due, e il registro scrive
prima e dopo. Se la correzione chiede di cambiare un valore della spec o di DESIGN.md (una
misura, un gap, una larghezza), **non si corregge**: ci si ferma, e la misura va ad Andrea col
numero e la proposta.

- [ ] **Step 1: La sonda.** Crea `src/app/auth/sonda-fase5/page.tsx`. Sotto `/auth` il proxy non
  chiede la sessione [misurato: `src/proxy.ts:39`, `paginaAuth`]. È lo stesso trucco delle fasi
  3 e 4 (registro fase 4, «Tre note operative»). La sonda monta il `Guscio` vero, con la tab bar
  e il pannello del Task 6, una `Testata` per il Menù utente, due strisce e l'avvio a comando.
  Supabase è finto:
  - `auth.getUser` e `auth.getSession` si sostituiscono sul client, che nel browser è un
    singleton;
  - `window.fetch` risponde alle richieste verso la porta finta.

  **I finti si installano al caricamento del modulo, non in un effetto**: gli effetti dei figli
  girano prima di quelli del genitore (registro fase 4).

```tsx
'use client';

import { useState, type ReactNode } from 'react';
import { Guscio } from '@/components/Guscio';
import { Testata } from '@/components/Testata';
import { StrisciaGiorni } from '@/components/StrisciaGiorni';
import { LivelloAvvio } from '@/components/AvvioMarchio';
import { client } from '@/data/supabase';
import { ORDINE_AREE_DEFAULT } from '@/domain/aree';
import type { MealSlot, MealSlotDef } from '@/domain/types';

const UTENTE = { id: 'u-sonda', email: 'andrea@example.com', user_metadata: { nome: 'Andrea' } };
const NOMI = ['Colazione', 'Spuntino', 'Pranzo', 'Merenda', 'Cena', 'Dopocena'];
const PASTI: MealSlotDef[] = NOMI.map((nome, i) => ({ id: `sd-${i}`, nome, posizione: i, assenzeAbituali: [false, false, false, false, false, i === 2, i === 2] }));
const GIORNI = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27'];
const SLOTS: MealSlot[] = GIORNI.flatMap((data, g) => PASTI.map((p, i) => ({
  id: `${data}-${p.id}`, data, slotDefId: p.id, stato: (i + g) % 4 === 0 ? 'fuori' : 'casa', dishId: (i + g) % 3 === 0 ? null : 'd-1',
  fonteStato: 'default', scelte: {}, porzioniPreparate: 0, daPronti: false,
}) satisfies MealSlot));

/** Le righe come le restituirebbe PostgREST, per tabella. Le colonne: leggi i `select` e i mapper in src/data/. */
const TABELLE: Record<string, unknown[]> = {
  settings: [{ user_id: 'casa-sonda', moltiplicatore_porzioni: 2, ordine_aree: ORDINE_AREE_DEFAULT, settimane_ciclo: 1, ciclo_origine: null, giorni_controllo: 90 }],
  meal_slot_def: PASTI.map((p) => ({ id: p.id, user_id: 'casa-sonda', nome: p.nome, posizione: p.posizione, assenze_abituali: p.assenzeAbituali })),
  ingredient: Array.from({ length: 24 }, (_, i) => ({
    id: `i-${i}`, user_id: 'casa-sonda', nome: `Ingrediente di prova ${i + 1}`, unita_base: i % 3 === 0 ? 'pz' : 'g',
    area: ORDINE_AREE_DEFAULT[i % 6], classe_residuo: ['porzionabile', 'intero', 'stima'][i % 3], deperibile: i % 2 === 0,
    formato_confezione: i % 3 === 0 ? 1 : 500, prezzo_confezione: null, ean: null,
  })),
  risparmio_settimana: [],
};
const RPC: Record<string, unknown> = {
  casa_id: 'casa-sonda',
  stato_casa: { ruolo: 'solo', email: [], id: [] },
  crea_invito: 'K7M2QX9P',
};

function risposta(corpo: unknown, status = 200): Response {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
}

function installaFinti() {
  if (typeof window === 'undefined') return;
  const sb = client();
  sb.auth.getUser = (async () => ({ data: { user: UTENTE }, error: null })) as unknown as typeof sb.auth.getUser;
  sb.auth.getSession = (async () => ({ data: { session: { access_token: 'finto', user: UTENTE } }, error: null })) as unknown as typeof sb.auth.getSession;
  const vero = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.href);
    if (url.port !== '54321') return vero(input, init);
    const metodo = (init?.method ?? 'GET').toUpperCase();
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/);
    if (rpc) return risposta(RPC[rpc[1]] ?? null);
    if (metodo !== 'GET') return new Response(null, { status: 204 });
    const tabella = url.pathname.replace(/^\/rest\/v1\//, '');
    const righe = TABELLE[tabella] ?? [];
    // `.single()` chiede un oggetto; `.maybeSingle()` e le liste ricevono l'array.
    const oggetto = new Headers(init?.headers).get('Accept')?.includes('vnd.pgrst.object');
    return risposta(oggetto ? righe[0] ?? null : righe);
  };
}

installaFinti();

/** La sonda della fase 5 (piano, Task 15). Da cancellare prima del commit. */
export default function SondaFase5() {
  const [avvio, setAvvio] = useState(0);
  return (
    <Guscio>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <Testata titolo="Sonda" />
        <div className="sc scroll-app" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <Riga>
            <button type="button" data-sonda="avvio" onClick={() => setAvvio((n) => n + 1)} style={{ minHeight: 44, padding: '0 14px', borderRadius: 999, background: 'var(--superficie)' }}>
              AVVIO
            </button>
          </Riga>
          <div data-striscia="sei" style={{ padding: '2px 16px 14px' }}>
            <StrisciaGiorni giorni={GIORNI} slotDefs={PASTI} slots={SLOTS} oggi={GIORNI[4]} selezionato={4} onSeleziona={() => {}} />
          </div>
          <div data-striscia="tre" style={{ padding: '2px 16px 14px' }}>
            <StrisciaGiorni giorni={GIORNI} slotDefs={PASTI.slice(0, 3)} slots={SLOTS} oggi={GIORNI[4]} selezionato={4} onSeleziona={() => {}} />
          </div>
          <div style={{ height: 1600 }} />
        </div>
      </div>
      {avvio > 0 && <LivelloAvvio key={avvio} onFine={() => {}} />}
    </Guscio>
  );
}

function Riga({ children }: { children: ReactNode }) {
  return <div style={{ padding: '8px 16px' }}>{children}</div>;
}
```

  Prima di avviarla, leggi i `select` e i mapper delle funzioni che il pannello chiama
  (`useDatiPannello` del Task 6: `src/data/impostazioni.ts`, `casa.ts`, `risparmio.ts`,
  `repertorio.ts`, `utente.ts`). Correggi le colonne di `TABELLE` se una lettura le chiama
  diversamente. Una tabella non elencata risponde `[]`, e le scritture `204`. La padding del
  contenitore delle strisce, `2px 16px 14px`, è quella del Piano [misurato:
  `piano/page.tsx:507`].

  Avvia il server con le variabili finte da riga di comando, in background:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=finta npx next dev -p 3100
```

  In un worktree nuovo prima `npx next typegen`. Apri `http://localhost:3100/auth/sonda-fase5`
  nel browser della sessione (`mcp__Claude_Browser__navigate`). Se il pannello del browser è
  nascosto, le transizioni avanzano a scatti (registro fase 4): prima di ogni misura di una
  posizione aspetta che `getAnimations()` sia vuoto, o fai uno screenshot, che forza il disegno.

- [ ] **Step 2: Punto 2, il pannello a tre larghezze.** Per ognuna di 360 × 800, 375 × 812 e
  393 × 852 (`mcp__Claude_Browser__resize_window` con `width` e `height`, poi ricarica):
  1. **La matrice.** Apri `http://localhost:3100/auth/sonda-fase5?impostazioni=pasti-a-casa` e
     lancia con `mcp__Claude_Browser__javascript_tool`:

```js
(() => {
  const celle = [...document.querySelectorAll('button[aria-label]')]
    .filter((b) => /: di base (a casa|fuori casa), tocca per mettere/.test(b.getAttribute('aria-label')));
  const r = celle.map((c) => c.getBoundingClientRect());
  const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
  const scorre = [...dialog.querySelectorAll('*')].find((e) => ['auto', 'scroll'].includes(getComputedStyle(e).overflowY));
  return {
    finestra: [innerWidth, innerHeight],
    celle: celle.length,
    minLarghezza: Math.min(...r.map((x) => x.width)),
    minAltezza: Math.min(...r.map((x) => x.height)),
    destraMassima: Math.max(...r.map((x) => x.right)),
    limiteDestro: innerWidth - 12,
    sinistraMinima: Math.min(...r.map((x) => x.left)),
    scorreDiLato: scorre ? scorre.scrollWidth - scorre.clientWidth : 'nessuno scroller',
  };
})()
```

     Passa se `celle` = 42, `minLarghezza` ≥ 44, `minAltezza` ≥ 44, `destraMassima` ≤
     `limiteDestro`, `sinistraMinima` ≥ 12, `scorreDiLato` = 0. Tieni lo screenshot a 360.

  2. **Il piede fisso.** Per `aree`, `esporta` e `casa`
     (`?impostazioni=aree` e così via), col testo del suo primario (`SALVA ORDINE`,
     `PREPARA IL FILE`, `CREA UN CODICE`):

```js
(async (testo) => {
  const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
  const tasto = [...dialog.querySelectorAll('button')].find((b) => b.textContent.trim() === testo);
  if (!tasto) return { errore: `nessun tasto ${testo}` };
  const scorre = [...dialog.querySelectorAll('*')]
    .find((e) => ['auto', 'scroll'].includes(getComputedStyle(e).overflowY) && !e.contains(tasto));
  scorre.scrollTop = scorre.scrollHeight;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  // Il piede: l'antenato del tasto che è fratello dello scroller (o di un suo antenato).
  let piede = tasto;
  while (piede.parentElement && !piede.parentElement.contains(scorre)) piede = piede.parentElement;
  const figli = [...scorre.querySelectorAll('*')].map((e) => e.getBoundingClientRect()).filter((x) => x.height > 0);
  const fondoContenuto = Math.max(...figli.map((x) => x.bottom));
  const p = piede.getBoundingClientRect();
  return {
    piedeCima: p.top, piedeFondo: p.bottom, finestra: innerHeight,
    fondoContenuto, coperto: fondoContenuto > p.top + 0.5,
    tastoAlto: tasto.getBoundingClientRect().height,
  };
})('SALVA ORDINE')
```

     Passa se `coperto` è `false`, `piedeFondo` ≤ `finestra` + 0,5, `tastoAlto` = 54. Tieni lo
     screenshot di Ordine delle aree a 360.

  3. **La tastiera sul campo `PERS`:** NON ESEGUITO, vedi la tabella delle soglie.

- [ ] **Step 3: Punto 3, la tab bar a 360.** A 360 × 800, sulla sonda senza parametro:

```js
(async () => {
  const nav = document.querySelector('nav[aria-label="Sezioni"]');
  const guscio = nav.closest('.guscio');
  const aspetta = async () => {
    await new Promise((r) => setTimeout(r, 50));
    await Promise.all(nav.getAnimations({ subtree: true }).map((a) => a.finished));
  };
  const misura = () => {
    const r = nav.getBoundingClientRect();
    return {
      stato: guscio.dataset.barra, larga: r.width, alta: r.height,
      latoSinistro: r.left, latoDestro: innerWidth - r.right, dalFondo: innerHeight - r.bottom,
      voci: [...nav.querySelectorAll('a')].map((a) => { const v = a.getBoundingClientRect(); return [v.width, v.height]; }),
    };
  };
  const s = document.querySelector('.scroll-app');
  s.scrollTop = 0;
  await aspetta();
  const grande = misura();
  s.scrollTop = 300;
  await aspetta();
  const ridotta = misura();
  s.scrollTop = 0;
  await aspetta();
  return { grande, ridotta, transizione: getComputedStyle(nav).transitionProperty };
})()
```

  Passa se valgono le soglie del punto 3. Se `ridotta.stato` è ancora `grande`, lo scroll non è
  arrivato al Guscio: rilancia dopo uno screenshot.

- [ ] **Step 4: Punto 4, la striscia a sei pasti a 360.**

```js
(() => {
  const misura = (quale) => [...document.querySelectorAll(`[data-striscia="${quale}"] button[data-giorno]`)].map((c) => {
    const r = c.getBoundingClientRect();
    const g = c.querySelector('[data-pallino]').parentElement.getBoundingClientRect();
    return { sinistra: r.left, destra: r.right, larga: r.width, alta: r.height, griglia: g.width, dentro: g.left >= r.left - 0.01 && g.right <= r.right + 0.01 };
  });
  const sei = misura('sei');
  const tre = misura('tre');
  const contenitore = document.querySelector('[data-striscia="sei"]');
  return {
    finestra: innerWidth,
    minLarghezza: Math.min(...sei.map((c) => c.larga)),
    somma: sei.reduce((s, c) => s + c.larga, 0) + 6 * 3,
    ultimaDestra: sei[6].destra,
    griglia: sei[0].griglia,
    grigliaSempreDentro: sei.every((c) => c.dentro),
    crescita: sei[0].alta - tre[0].alta,
    scorreDiLato: contenitore.scrollWidth - contenitore.clientWidth,
  };
})()
```

  Passa se valgono le soglie del punto 4. Rifallo a 375 e 393 senza soglia sui 44,29: scrivi i
  numeri.

- [ ] **Step 5: Punto 5, l'arrivo dell'avvio.** A 360 × 800 e poi a 393 × 852, con la barra
  grande (sonda scorsa in cima):

```js
(async () => {
  document.querySelector('[data-sonda="avvio"]').click();
  await new Promise((r) => setTimeout(r, 1250));
  const volo = document.querySelector('[data-avvio-marchio]');
  await Promise.all(volo.getAnimations().filter((a) => a.transitionProperty === 'transform').map((a) => a.finished));
  const a = volo.getBoundingClientRect();
  const b = document.querySelector('[data-marchio-barra] > div').getBoundingClientRect();
  const centro = (r) => [r.left + r.width / 2, r.top + r.height / 2];
  const [ax, ay] = centro(a);
  const [bx, by] = centro(b);
  const sotto = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  return {
    dx: Math.abs(ax - bx), dy: Math.abs(ay - by),
    dLarghezza: Math.abs(a.width - b.width), dAltezza: Math.abs(a.height - b.height),
    tempo: performance.now(),
    sottoIlCentro: sotto?.closest('[data-avvio]') ? 'IL LIVELLO' : sotto?.tagName,
  };
})()
```

  Passa se `dx` ≤ 1, `dy` ≤ 1, `dLarghezza` ≤ 1, e `sottoIlCentro` non è `IL LIVELLO`.
  `dAltezza` attesa ≈ 0,5 (22,5 contro 22, §J): si scrive e non si giudica. Se la promessa
  di `finished` non si risolve (pannello del browser nascosto), fai uno screenshot e rilancia.
  Tieni uno screenshot a metà volo, con un secondo script che aspetta 1500 ms dopo il click e
  poi chiama `mcp__Claude_Browser__computer` con `screenshot`.

  La variante `reduce` non si emula in questo browser (registro fase 4): NON ESEGUITO nel
  browser, coperto dal test `non parte … con reduce` del Task 14.

- [ ] **Step 6: Pulisci.** Ferma il server. Poi, un comando alla volta:

```bash
rm -r src/app/auth/sonda-fase5
```

```bash
rm -rf .next/dev
```

```bash
git checkout -- next-env.d.ts
```

```bash
git status --short
```

  Expected: nessun file della sonda, niente `next-env.d.ts`. Restano solo i file toccati dalle
  correzioni dello Step 7, se ce ne sono state.

- [ ] **Step 7: Le correzioni, se servono.** Per ogni misura fallita: il test che fissa la
  correzione (se jsdom la vede), la correzione, la misura rifatta alle tre larghezze, e la riga
  nel registro con prima e dopo. Una correzione che tocca un valore della spec o di DESIGN.md
  non si fa: si ferma il task (vedi sopra). Se non è fallito niente, scrivi nel registro
  «nessuna correzione dopo la sonda».

- [ ] **Step 8: Il ponte.** In `docs/superpowers/specs/DESIGN-SYSTEM.md`, §3 «Ogni componente, e
  dove vive». Prima verifica che ogni file esista (`ls src/components/pannello/`,
  `ls src/components/*.tsx`): i nomi qui sotto sono quelli dell'ossatura, il codice vince.
  - Righe che cambiano:

| Componente (`DESIGN.md` §8) | Dove vive nel codice | Stato |
|---|---|---|
| Testata | `src/components/Testata.tsx` | fase 5: modo indietro a pillola (`indietro: { etichetta, ariaLabel, onTorna }`) in Piatti e Importa |
| Menù utente | dentro `Testata.tsx` | fase 5: un `button` che apre il pannello, `aria-expanded`, nome `{Nome}: profilo e impostazioni` |
| Tab bar | `src/components/TabBar.tsx`, dentro `Guscio.tsx` | fase 5: tre voci (Lista · Piano · Dispensa), pillola 304 / 244 centrata, voci `flex` con un tetto di 96 / 76 (con tre voci sono esattamente quelle), anima `width`; `data-marchio-barra` sul segno della Lista |
| Marchio | `src/components/Marchio.tsx` (+ `marchio-context.tsx`); l'avvio in `src/components/AvvioMarchio.tsx`, montato nel `Guscio` | 3 × 2, sei aree; dalla fase 5 l'avvio `.anim-avvio-*` con `@keyframes pb`, una volta per sessione su `/lista` |
| Dock | (la riga di oggi) | aggiungi in coda: «Dalla fase 5 `.dock-senza-barra` a `bottom 22` quando una schermata nasconde la barra (l'editor dell'ingrediente)» |
| Riga di controllo | `src/components/RigaControllo.tsx` | fase 5: la cadenza viene dalle impostazioni (`giorniControllo`, `testoCadenza`) |
| Striscia dei giorni | `src/components/StrisciaGiorni.tsx` | fase 5: pallini in griglia di tre colonne gap 3 (`posizionePallino`), sei pasti a 360 senza deroga |
| Pannello impostazioni · Riga di impostazione | `src/components/pannello/`: `PannelloProvider.tsx`, `Pannello.tsx`, `Cima.tsx`, `TesserePannello.tsx`, `RigaImpostazione.tsx`, `CampoPersone.tsx`, `NotaRisparmio.tsx`, `PiedePannello.tsx`, `schermate.tsx`, i dati in `DatiPannello.tsx` | fatto nella fase 5: pannello a due livelli montato nel `Guscio`, otto sotto-schermate, `?impostazioni=` e gesto indietro con `src/components/useIndietroFogli.ts` |
| Matrice dei pasti | `src/components/pannello/PastiACasa.tsx` | fatta nella fase 5: casetta al posto del pallino, 360 nel mandato |
| Aggiungi tratteggiato (in Gestione dei pasti) | `src/components/pannello/GestionePasti.tsx` | fase 5: in fondo al blocco |
| Dialogo di conferma | `src/components/DialogoConferma.tsx`, dentro un `FoglioDalBasso` con `ruolo="alertdialog"`; `DialogoElimina.tsx` della Dispensa ne è un uso | generalizzato nella fase 5: tono `distruttivo` in `--errore` e `primario` in `--ink` (Esci) |
| Dettaglio di ingrediente | `DettaglioIngrediente.tsx` + `src/components/controlli.tsx` (spostato dalla Dispensa nella fase 5) | (lo stato di oggi) |

  - Riga nuova, fuori da DESIGN.md §8 come `Nuovo ingrediente`: «Editor dell'ingrediente |
    `src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx` | frame 12 della fase 5: SALVA nel
    Dock senza barra, scansione con `LettoreCodice`; non è una voce di `DESIGN.md` §8».
  - La riga «Stato vuoto · Campo di testo …» e le altre restano.
  - Il paragrafo sopra la tabella: ricontali e sostituisci i numeri.

```bash
awk '/^## 8\./,/^## 9\./' design/sistema/DESIGN.md | grep -c '^### '
```

```bash
ls src/components/*.tsx src/components/pannello/*.tsx | wc -l
```

  Scrivi «{n} voci `###` in `DESIGN.md` §8, {m} file `.tsx` in `src/components/` e
  `src/components/pannello/` [contati di nuovo il {data}, a fase 5 finita]».
  - §9 «Cosa il codice non ha ancora»:
    - aggiungi «**La fase 5 (Impostazioni) è chiusa con la PR del ramo**» e il nome del ramo,
      con il puntatore a `docs/2026-09-25-fase5-decisioni-esecuzione.md`;
    - togli «La schermata non ancora ridisegnata: Impostazioni a pannello (fase 5)»;
    - ricalcola i token:

```bash
python3 - <<'EOF'
import re, pathlib
def token(percorso):
    css = re.sub(r'/\*.*?\*/', '', pathlib.Path(percorso).read_text(encoding='utf-8'), flags=re.S)
    t = set()
    for blocco in re.findall(r':root\s*\{(.*?)\}', css, flags=re.S):
        t.update(re.findall(r'(--[\w-]+)\s*:', blocco))
    return t
d, c = token('design/sistema/tokens.css'), token('src/app/globals.css')
print(f'tokens.css {len(d)}, globals.css {len(c)}, in comune {len(d & c)}, solo nel design {len(d - c)}, solo nel codice {len(c - d)}')
EOF
```

      Scrivi i numeri al posto di quelli del 25/09, con la data. I divergenti li dice
      `npm run design:token`: 0.
  - §7 «Come si applica», punto 9: «Chi monta un Dock (fasi 3, 4 e 5)…» resta, e aggiungi:
    «una schermata che nasconde la barra non fa niente per il Dock: lo sposta `.dock-senza-barra`».

- [ ] **Step 9: Chiudi il registro.** In `docs/2026-09-25-fase5-decisioni-esecuzione.md`, sul
  modello di quello della fase 4:
  1. **Le misure nel browser** [misurato, Task 15], per larghezza: i numeri degli Step 2–5, con
     l'esito rispetto alle soglie. Aggiungi quelli del Task 2 (punto 1) se il registro non li ha
     già;
  2. **NON ESEGUITO nel browser**: la tastiera sul campo `PERS`; la variante `reduce`
     dell'avvio e del pannello; la fotocamera che legge un codice nell'editor; un tocco vero sul
     Menù utente. Ognuno col punto di §M.4 che lo copre;
  3. **La tabella di copertura dei test vecchi** chiusa: il numero finale (52 → quanti test
     nuovi) e l'esito dello script del Task 11 Step 12;
  4. **Cosa resta aperto di proposito:**
     - la ricerca in Ingredienti (decisione 13);
     - l'import del file esportato (§E.3);
     - la metà «ultimo salvataggio» del piede (§N);
     - le domande della sezione «Domande per Andrea (in review)», riportate una per una: almeno
       la nota di Gestione dei pasti (Task 8), il Piano e la Lista che non si rileggono dopo
       Cancella la dispensa (Task 4), il ritorno da un piatto aperto dal Piano (Task 11), le due
       spiegazioni dell'editor che il frame 12 non mostra (Task 12);
  5. **La spec §L**, in `docs/superpowers/specs/2026-09-25-impostazioni-design.md`: aggiungi i
     limiti noti che il registro ha raccolto, uno per punto, con la loro etichetta
     ([misurato] o [ipotesi]) e il task: C3(a) e C3(b) del Task 4 (le cotture pianificate dopo
     Cancella la dispensa); con D1 = A, la sovrastima di una porzione cruda per pasto ritoccato
     nelle settimane già confermate; con D2 = A, le confezioni della lista aperta calcolate sul
     residuo di prima; togliere un pasto con piatti cancella a cascata anche i loro lotti Pronti
     (Task 8); il Piano e la Lista aperti sotto il pannello non si rileggono dopo Cancella la
     dispensa (Task 4). Solo §L: il resto della spec non si tocca;
  6. **Tre note operative** per chi viene dopo, se la sonda ne ha trovate di nuove (per
     esempio le colonne da correggere nei finti);
  7. **I gate di Andrea, in ordine:**
     1. l'ok alla migrazione `supabase/migrations/0015_cadenza_e_dispensa.sql` (la colonna
        `settings.giorni_controllo` e la funzione `cancella_dispensa()`);
     2. la migrazione applicata in produzione **prima del merge**: Vercel pubblica da solo al
        merge su `main`, e il codice nuovo legge `giorni_controllo`. È additiva, quindi il
        codice di oggi continua a funzionare con la migrazione applicata (§O);
     3. il merge della PR: va in produzione senza altri comandi;
     4. le prove dal telefono di §M.4, una per una, con **Cancella la dispensa solo su un
        account di prova o dopo un Esporta**;
  8. **Per la PR:** il corpo pronto, con il riassunto della fase, la lista delle prove di
     §M.4 e la riga
     `🤖 Generated with [Claude Code](https://claude.com/claude-code)` in fondo. La PR la apre
     chi coordina, dopo la review finale. Non è compito di questo task.

- [ ] **Step 10: Verifica finale.**

  Run, un comando alla volta:
  - `npm test`
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build`
  - `npm run design:token`
  - `git status --short`

  Expected: tutto verde, e nello stato solo `DESIGN-SYSTEM.md`, la spec (§L), il registro e le
  eventuali correzioni dello Step 7. Nessun file della sonda, niente `next-env.d.ts`, niente `.next/`.

- [ ] **Step 11: Commit.** Se lo Step 7 ha corretto del codice, prima un commit per la
  correzione, coi suoi file e il suo test:

```bash
git add <i file della correzione>
```

```bash
git commit -m "fix: <cosa ha trovato la sonda, in una riga>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

  Poi il ponte e il registro:

```bash
git add docs/superpowers/specs/DESIGN-SYSTEM.md docs/superpowers/specs/2026-09-25-impostazioni-design.md docs/2026-09-25-fase5-decisioni-esecuzione.md
```

```bash
git commit -m "docs: il ponte della fase 5, le misure della sonda, i limiti noti in spec §L e i gate di Andrea

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
