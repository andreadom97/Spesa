# Fase 7 — Scegli e l'editor del Piatto: piano di esecuzione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** portare Scegli (`/piano/[data]/[slotDefId]/scegli`) e l'editor del Piatto (`/piatti/[id]`, `/piatti/nuovo`) nel sistema di `DESIGN.md` v3, senza cambiare i dati.

**Architecture:** prima si estraggono i pezzi condivisi — la Riga piatto, la ricerca e l'Aggiungi tratteggiato da Piatti (la riga con un modo «scegli»), la testata del frame 12 dall'editor dell'ingrediente — senza cambiare l'aspetto di chi li usa già. Poi Scegli si rimonta con quei pezzi. Poi l'editor del Piatto si spezza in tre file (selettore degli ingredienti in un `FoglioDalBasso`, componenti a scelta, pagina) e passa a un modo solo con `SALVA` nel Dock. Alla fine i documenti.

**Tech Stack:** Next.js 16 App Router (client components), React, Vitest + Testing Library (`fireEvent`: `user-event` non è installato), stile inline con classi condivise in `src/app/globals.css`.

**Spec:** `docs/superpowers/specs/2026-09-26-scegli-piatto-design.md` (approvata da Andrea il 26/09, compresi i tre punti confermati in revisione: la testata del frame 12, la riga scelta piena, SALVA che torna a `/piatti`).

**Quando si esegue:** dopo il merge del ramo `icone-ingredienti` su main (tocca `TesseraIngrediente`, `Tessera`, `aree.ts`). Prima di eseguire: rebase di questo ramo su `origin/main`, `npm install`, `npx next typegen`, e un controllo che le firme usate qui (`TesseraIngrediente`, `coloreArea`) non siano cambiate; se sono cambiate, il controllore lo scrive nel ledger come ruling prima del Task 1.

## Global Constraints

- **Worktree:** `/Users/andreadominici/Documents/Claude/Projects/Spesa/.claude/worktrees/fase7-scegli-piatto`, ramo `fase7-scegli-piatto`. Ogni comando parte da lì. Comandi git semplici, uno alla volta; mai `git add -A` o `git add .`: si aggiungono i file per nome. **Mai `git stash`** (lo stack è condiviso con altre sessioni), mai amend.
- **I file si modificano con Edit o Write, mai con sed o perl**: contengono UTF-8 e apostrofi tipografici ’ che vanno conservati. Prima di ogni commit `grep -rn $'\xc3\x83' <file toccati>` deve essere vuoto (è la A con tilde maiuscola dei byte rotti, scritta come byte perché il piano stesso resti pulito a quel grep).
- **Il database non cambia.** `aggiornaSlot`, `salvaPiatto`, `eliminaPiatto`, `leggi*` e le funzioni di `bozza.ts` si chiamano con gli stessi argomenti di oggi. Nessun file in `src/data/` o `supabase/` cambia.
- **La logica di dominio di Scegli non cambia:** `conflittiSostituzione`, `opzioneCorrente`, `opzioneSuccessiva`, `opzioneInCasa`, `ilPiattoOLeScelteSonoCambiate`, `scelteManualiDaMandare`, `testoNota`, `testoConflitto`. Si spostano, se serve, ma restano identiche.
- **I testi «di oggi» restano parola per parola**, apostrofi tipografici compresi (`TESTO_ELIMINA`, `TESTO_COMPONENTE_SENZA_NOME`, `TESTO_SENZA_INGREDIENTI`, `TESTO_OPZIONE_*`, `TESTO_NON_IN_PROGRAMMA`, `testoRiepilogo`, `testoNota`, `testoConflitto`, i messaggi di errore).
- **Colori solo come token** `var(--…)`: nei file toccati non restano `#FFFFFF`, `#14163A`, `#8A8A96`, `#C4C4CE`, l'alfa `0.05`, né `rgba(20,22,58,0.12)` / `0.16` nei bordi. Alfe ammesse su `--ink` qui: `0.035`, `0.04`, `0.07` (tondi), `0.09` (il bordo della Riga piatto, com'è oggi in Piatti, e quello delle pillole spente di `NEL PIANO`), `0.14` (il filetto sotto il nome del piatto, come sotto quello dell'ingrediente), tutte nella tabella di `DESIGN.md` §2.5; e `rgba(255,255,255,0.62)` per la sottoriga della riga scelta.
- **Niente Tailwind** nei file toccati (`className` solo per le classi di `globals.css`).
- **Bersagli toccabili alti almeno 44.**
- **In volo** i primari pieni sono `disabled` con lo stato spento del sistema (`.dock-primario:disabled`, `TastoPrimario` con `disabled`), non un'opacità (`DESIGN.md` §13, 26/09, punto 6).
- **`page.tsx` di Next esporta solo il default:** ogni funzione o componente che un test deve importare sta in un modulo accanto.
- **`TesseraIngrediente` non si tocca** (è del ramo `icone-ingredienti`): si usa com'è.
- **Test:** un file con `npx vitest run <percorso>`; la suite con `npm test`; poi `npx tsc --noEmit` e `npm run lint`. Tutti verdi prima di ogni commit.
- **Commit in italiano**, messaggio che finisce con una riga vuota e `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Commenti nel codice in italiano**, con la densità dei file intorno: un blocco `/** … */` che dice il perché.

## Mappa dei file

| File | Task | Responsabilità |
|---|---|---|
| `src/domain/ricerca-piatti.ts` | 1 | + `areeDelPiatto` (oggi copiata in `ElencoPiatti.tsx` e in Scegli) |
| `src/components/RigaPiatto.tsx` (nuovo) | 1 | la Riga piatto di §8, modi `apri` e `scegli` |
| `src/components/CampoRicercaPiatti.tsx` (nuovo) | 1 | il campo in modalità ricerca di Piatti |
| `src/components/AggiungiTratteggiato.tsx` (nuovo) | 1 | l'Aggiungi tratteggiato di §8 (il «Nuovo piatto» di oggi), link o bottone; lo usano i Task 1, 3, 5 e 6 |
| `src/app/(app)/piatti/ElencoPiatti.tsx` | 1 | usa i tre componenti; aspetto e comportamento invariati |
| `src/components/TestataModifica.tsx` (nuovo) | 2 | la testata del frame 12 (tondo 44 con freccia, area, nome), con il corpo come `children` |
| `src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx` | 2 | usa `TestataModifica` al posto della sua `Cornice`; aspetto invariato |
| `src/components/pannello/RigaImpostazione.tsx` | 3 | + prop `etichetta` (l'`aria-label` della riga); il valore al massimo metà riga, poi ellissi, e maiuscolo via CSS |
| `src/app/(app)/piano/[data]/[slotDefId]/scegli/page.tsx` | 3 | Scegli ridisegnata |
| `src/app/(app)/piatti/[id]/SelettoreIngrediente.tsx` (nuovo) | 4 | il selettore degli ingredienti in un `FoglioDalBasso` |
| `src/app/(app)/piatti/[id]/ComponentiPiatto.tsx` (nuovo) | 5 | il blocco dei componenti a scelta |
| `src/app/(app)/piatti/[id]/page.tsx` | 4, 5, 6 | l'editor: 4 e 5 ne estraggono pezzi, 6 lo porta a un modo solo |
| `design/sistema/DESIGN.md`, `docs/superpowers/specs/DESIGN-SYSTEM.md` | 7 | i documenti |

## Interfacce vincolanti

Ogni task che le produce le rispetta alla lettera; ogni task che le consuma le usa così.

```ts
// src/domain/ricerca-piatti.ts (Task 1) — spostata da ElencoPiatti.tsx, identica
export function areeDelPiatto(piatto: Dish, areaPerIngrediente: Map<string, AreaId>, ordineAree: AreaId[]): AreaId[];

// src/components/RigaPiatto.tsx (Task 1)
export type ModoRigaPiatto =
  | { modo: 'apri'; href: string }
  | { modo: 'scegli'; scelto: boolean; corrente: boolean; onScegli: () => void };
export function RigaPiatto(props: { piatto: Dish; aree: AreaId[] } & ModoRigaPiatto): JSX.Element;
//   'apri':   <Link href aria-label="Apri {nome}"> … chevron — identica a oggi.
//   'scegli': <button type="button" aria-pressed={scelto} aria-label="Scegli {nome}" onClick={onScegli}>;
//             sottoriga con «ORA IN PROGRAMMA · » in testa se corrente;
//             scelto = fondo var(--ink), nome var(--superficie), sottoriga rgba(255,255,255,0.62),
//             al posto del chevron un tondo 24 var(--superficie) con la spunta var(--ink): la
//             geometria della spunta di oggi di Scegli (svg 13 in viewBox 0 0 20 20,
//             path "M4.5 10.5 8.2 14 15.5 6.4", strokeWidth 3.2, estremi e giunti tondi).

// src/components/CampoRicercaPiatti.tsx (Task 1)
export function CampoRicercaPiatti(props: { valore: string; onCambia: (testo: string) => void }): JSX.Element;
//   il contenitore con padding '8px 16px 10px' e il campo di oggi (lente 18, 44, aria-label e
//   segnaposto «Cerca un piatto o un ingrediente»).

// src/components/AggiungiTratteggiato.tsx (Task 1)
export function AggiungiTratteggiato(
  props: { etichetta: string; ariaLabel?: string } & ({ href: string } | { onClick: () => void }),
): JSX.Element;
//   il markup di oggi del «Nuovo piatto» di ElencoPiatti.tsx: alto 56, raggio 14, bordo
//   2px dashed var(--bordo-tratteggio), fondo trasparente, mono 11/700/0,08em maiuscolo --ink,
//   il «+» 16 a tratto 2. Con `href` un Link, con `onClick` un button; `etichetta` è il testo,
//   `ariaLabel` (facoltativo) il nome accessibile quando il testo da solo è ambiguo.
//   Lo usano: Piatti (Task 1, «Nuovo piatto»), Scegli (Task 3, «CREA UN PIATTO NUOVO»),
//   ComponentiPiatto (Task 5, «AGGIUNGI INGREDIENTE» delle opzioni e «AGGIUNGI COMPONENTE»),
//   l'editor del Piatto (Task 6, «AGGIUNGI INGREDIENTE»). GestionePasti.tsx non si tocca.

// src/components/TestataModifica.tsx (Task 2)
export function TestataModifica(props: {
  freccia: { etichetta: string; onTorna: () => void };   // etichetta = aria-label del tondo
  area?: AreaId | null;                                   // l'etichetta mono col quadratino (la usa l'ingrediente)
  nome?: ReactNode;                                       // il campo del nome a 32/800, passato da chi la usa
  children?: ReactNode;                                   // il corpo della pagina, sotto la testata
}): JSX.Element;
//   stessa colonna a tutta altezza e stesso markup della `Cornice` di oggi dell'editor dell'ingrediente.
```

Le interfacce di `SelettoreIngrediente` e `ComponentiPiatto` le fissano i Task 4 e 5 nei loro blocchi **Produces**; il Task 6 le consuma da lì. La prop `etichetta` di `RigaImpostazione` la fissa il Task 3, che è anche l'unico a usarla.

---

### Task 1: La Riga piatto, la ricerca e l'Aggiungi tratteggiato, condivisi

**Files:**
- Create: `src/components/RigaPiatto.tsx`
- Create: `src/components/__tests__/RigaPiatto.test.tsx`
- Create: `src/components/CampoRicercaPiatti.tsx`
- Create: `src/components/__tests__/CampoRicercaPiatti.test.tsx`
- Create: `src/components/AggiungiTratteggiato.tsx` (il markup di oggi del «Nuovo piatto» di `ElencoPiatti.tsx`, righe 62-76)
- Create: `src/components/__tests__/AggiungiTratteggiato.test.tsx`
- Modify: `src/domain/ricerca-piatti.ts` (+ `areeDelPiatto`, spostata da `ElencoPiatti.tsx`, righe 99-111 di oggi)
- Modify: `src/domain/__tests__/ricerca-piatti.test.ts` (helper `ingrediente` con area facoltativa, + un `describe('areeDelPiatto', …)`)
- Modify (riscrittura): `src/app/(app)/piatti/ElencoPiatti.tsx` (usa i tre pezzi condivisi; aspetto e comportamento invariati)

**Interfaces:**
- Consumes: niente (primo task del piano).
- Produces (dalle Interfacce vincolanti del piano, alla lettera):
  ```ts
  // src/domain/ricerca-piatti.ts
  export function areeDelPiatto(piatto: Dish, areaPerIngrediente: Map<string, AreaId>, ordineAree: AreaId[]): AreaId[];

  // src/components/RigaPiatto.tsx
  export type ModoRigaPiatto =
    | { modo: 'apri'; href: string }
    | { modo: 'scegli'; scelto: boolean; corrente: boolean; onScegli: () => void };
  export function RigaPiatto(props: { piatto: Dish; aree: AreaId[] } & ModoRigaPiatto): JSX.Element;

  // src/components/CampoRicercaPiatti.tsx
  export function CampoRicercaPiatti(props: { valore: string; onCambia: (testo: string) => void }): JSX.Element;

  // src/components/AggiungiTratteggiato.tsx
  export function AggiungiTratteggiato(
    props: { etichetta: string; ariaLabel?: string } & ({ href: string } | { onClick: () => void }),
  ): JSX.Element;
  ```
  `areeDelPiatto`, `RigaPiatto` e `CampoRicercaPiatti` li usa il Task 3 (Scegli). `AggiungiTratteggiato` lo usano il Task 3 (`CREA UN PIATTO NUOVO`, con `href`), il Task 5 (`AGGIUNGI INGREDIENTE` delle opzioni e `AGGIUNGI COMPONENTE`, con `onClick`) e il Task 6 (`AGGIUNGI INGREDIENTE` del piatto, con `onClick`). `GestionePasti.tsx` ha una sua copia e in questa fase non si tocca.

---

- [ ] **Step 1: i test che falliscono**

**1a. `src/domain/__tests__/ricerca-piatti.test.ts`** — due modifiche meccaniche e un blocco nuovo.

Oggi → diventa (righe 1-10):

| Oggi | Diventa |
|---|---|
| `import type { Dish, Ingredient } from '@/domain/types';` | `import type { AreaId, Dish, Ingredient } from '@/domain/types';` |
| `import { cercaPiatti, ingredientiDelPiatto } from '../ricerca-piatti';` | `import { areeDelPiatto, cercaPiatti, ingredientiDelPiatto } from '../ricerca-piatti';` |
| `function ingrediente(id: string, nome: string): Ingredient {`<br>`  return {`<br>`    id, nome, unitaBase: 'g', area: 'dispensa',` | `function ingrediente(id: string, nome: string, area: AreaId = 'dispensa'): Ingredient {`<br>`  return {`<br>`    id, nome, unitaBase: 'g', area,` |

Tutte le chiamate esistenti a `ingrediente(id, nome)` restano invariate (l'area di default resta `'dispensa'`): nessun altro test cambia.

In fondo al file, dopo il `describe('cercaPiatti', …)`, aggiungi:

```ts
describe('areeDelPiatto', () => {
  const FARINA = ingrediente('i-farina', 'Farina', 'cereali');
  const LATTE = ingrediente('i-latte', 'Latte', 'latticini');
  const OLIO = ingrediente('i-olio', 'Olio', 'dispensa');
  const AREA_PER_INGREDIENTE = new Map([RICOTTA, FARINA, LATTE, OLIO].map((i) => [i.id, i.area]));
  const ORDINE: AreaId[] = ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'];

  it('le aree distinte del piatto (fissi e opzioni), nell\'ordine dell\'utente e non di inserimento', () => {
    // Inserimento: cereali, latticini, dispensa. L'ordine dell'utente le vuole latticini, cereali, dispensa.
    const misto = piatto('d-10', 'Misto', ['i-farina'], [['i-latte'], ['i-olio']]);
    expect(areeDelPiatto(misto, AREA_PER_INGREDIENTE, ORDINE)).toEqual(['latticini', 'cereali', 'dispensa']);
  });

  it('un ingrediente sconosciuto alla mappa non aggiunge nessuna area', () => {
    const orfano = piatto('d-11', 'Orfano', ['i-sparito']);
    expect(areeDelPiatto(orfano, AREA_PER_INGREDIENTE, ORDINE)).toEqual([]);
  });

  it('senza ingredienti dà nessuna area', () => {
    const vuoto = piatto('d-12', 'Vuoto', []);
    expect(areeDelPiatto(vuoto, AREA_PER_INGREDIENTE, ORDINE)).toEqual([]);
  });
});
```

**1b. `src/components/__tests__/RigaPiatto.test.tsx`** (nuovo):

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Dish } from '@/domain/types';
import { coloreArea } from '@/domain/aree';
import { RigaPiatto } from '../RigaPiatto';

// jsdom riscrive un colore esadecimale inline in `rgb(…)`: `coloreArea` torna l'esadecimale,
// quindi il confronto passa da qui (lo stesso helper di `avvio-marchio.test.tsx`).
const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

const PIATTO: Dish = {
  id: 'd-1', nome: 'Riso e pane', slotDefId: 'sd-1', fonte: 'proprio', attivo: true,
  descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-1', quantita: 80, unita: 'g' }],
  componenti: [],
};
const PIATTO_DIETA: Dish = {
  id: 'd-2', nome: 'Merenda', slotDefId: 'sd-1', fonte: 'nutrizionista', attivo: true,
  descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [],
  componenti: [{
    id: 'c-1', nome: 'a scelta',
    opzioni: [
      { id: 'o-1', righe: [{ ingredientId: 'i-2', quantita: 30, unita: 'g' }] },
      { id: 'o-2', righe: [{ ingredientId: 'i-3', quantita: 150, unita: 'ml' }] },
    ],
  }],
};

describe('RigaPiatto — modo apri (identico a oggi)', () => {
  it('è un link che apre il piatto, con aria-label, sottoriga e pallini d\'area', () => {
    render(<RigaPiatto piatto={PIATTO} aree={['cereali']} modo="apri" href="/piatti/d-1" />);
    const link = screen.getByRole('link', { name: 'Apri Riso e pane' });
    expect(link).toHaveAttribute('href', '/piatti/d-1');
    expect(screen.getByText('1 INGREDIENTE')).toBeInTheDocument();
    expect(link.style.background).toBe('var(--superficie)');
    expect(Array.from(link.querySelectorAll('[data-area]')).map((el) => el.getAttribute('data-area'))).toEqual(['cereali']);
  });

  it('dice «dalla dieta» solo sui piatti dell\'import, e conta gli ingredienti delle opzioni', () => {
    render(<RigaPiatto piatto={PIATTO_DIETA} aree={[]} modo="apri" href="/piatti/d-2" />);
    expect(screen.getByText('2 INGREDIENTI · DALLA DIETA')).toBeInTheDocument();
  });

  it('il bersaglio a destra è il chevron, non la spunta', () => {
    const { container } = render(<RigaPiatto piatto={PIATTO} aree={[]} modo="apri" href="/piatti/d-1" />);
    expect(container.querySelector('svg path[d^="M6 3.2"]')).toBeInTheDocument();
  });
});

describe('RigaPiatto — modo scegli (spec fase 7 §A.3)', () => {
  it('è un bottone con aria-pressed e aria-label «Scegli {nome}», che chiama onScegli', () => {
    const onScegli = vi.fn();
    render(<RigaPiatto piatto={PIATTO} aree={[]} modo="scegli" scelto={false} corrente={false} onScegli={onScegli} />);
    const bottone = screen.getByRole('button', { name: 'Scegli Riso e pane' });
    expect(bottone).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(bottone);
    expect(onScegli).toHaveBeenCalledTimes(1);
  });

  it('il piatto in programma dice ORA IN PROGRAMMA in testa alla sottoriga', () => {
    render(<RigaPiatto piatto={PIATTO} aree={[]} modo="scegli" scelto corrente onScegli={() => {}} />);
    expect(screen.getByText('ORA IN PROGRAMMA · 1 INGREDIENTE')).toBeInTheDocument();
  });

  it('senza essere quello in programma la sottoriga non ha il prefisso', () => {
    render(<RigaPiatto piatto={PIATTO} aree={[]} modo="scegli" scelto={false} corrente={false} onScegli={() => {}} />);
    expect(screen.getByText('1 INGREDIENTE')).toBeInTheDocument();
    expect(screen.queryByText(/ORA IN PROGRAMMA/)).not.toBeInTheDocument();
  });

  it('la riga scelta è piena: fondo --ink, nome in --superficie, sottoriga a rgba(255,255,255,0.62), pallini invariati', () => {
    render(<RigaPiatto piatto={PIATTO} aree={['cereali']} modo="scegli" scelto corrente={false} onScegli={() => {}} />);
    const bottone = screen.getByRole('button', { name: 'Scegli Riso e pane' });
    expect(bottone).toHaveAttribute('aria-pressed', 'true');
    expect(bottone.style.background).toBe('var(--ink)');
    expect(screen.getByText('Riso e pane').style.color).toBe('var(--superficie)');
    expect(screen.getByText('1 INGREDIENTE').style.color).toBe('rgba(255, 255, 255, 0.62)');
    const pallino = bottone.querySelector('[data-area]') as HTMLElement;
    expect(pallino.style.background).toBe(rgb(coloreArea('cereali')));
  });

  it('non scelta, la riga resta come oggi: fondo --superficie e il chevron', () => {
    const { container } = render(<RigaPiatto piatto={PIATTO} aree={[]} modo="scegli" scelto={false} corrente={false} onScegli={() => {}} />);
    const bottone = screen.getByRole('button', { name: 'Scegli Riso e pane' });
    expect(bottone.style.background).toBe('var(--superficie)');
    expect(container.querySelector('svg path[d^="M6 3.2"]')).toBeInTheDocument();
  });

  it('scelta, al posto del chevron c\'è un tondo 24 in --superficie con la spunta --ink di oggi di Scegli', () => {
    const { container } = render(<RigaPiatto piatto={PIATTO} aree={[]} modo="scegli" scelto corrente={false} onScegli={() => {}} />);
    expect(container.querySelector('svg path[d^="M6 3.2"]')).not.toBeInTheDocument();
    // La geometria è quella della spunta di oggi di Scegli (viewBox 20, tratto 3,2): cambia solo il colore.
    const spunta = container.querySelector('svg[viewBox="0 0 20 20"] path[d="M4.5 10.5 8.2 14 15.5 6.4"]');
    expect(spunta).toBeInTheDocument();
    expect(spunta).toHaveAttribute('stroke', 'var(--ink)');
    expect(spunta).toHaveAttribute('stroke-width', '3.2');
    const tondo = spunta!.closest('span') as HTMLElement;
    expect(tondo.style.width).toBe('24px');
    expect(tondo.style.background).toBe('var(--superficie)');
  });
});
```

**1c. `src/components/__tests__/CampoRicercaPiatti.test.tsx`** (nuovo):

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CampoRicercaPiatti } from '../CampoRicercaPiatti';

describe('CampoRicercaPiatti (spec fase 3 §A, condiviso dalla fase 7 §A.3)', () => {
  it('il campo si trova per aria-label e segnaposto, e chiama onCambia col testo digitato', () => {
    const onCambia = vi.fn();
    render(<CampoRicercaPiatti valore="" onCambia={onCambia} />);
    const campo = screen.getByRole('searchbox', { name: 'Cerca un piatto o un ingrediente' });
    expect(campo).toHaveAttribute('placeholder', 'Cerca un piatto o un ingrediente');
    fireEvent.change(campo, { target: { value: 'pasta' } });
    expect(onCambia).toHaveBeenCalledWith('pasta');
  });

  it('è controllato: mostra il valore ricevuto, non tiene stato proprio', () => {
    render(<CampoRicercaPiatti valore="riso" onCambia={() => {}} />);
    expect(screen.getByRole('searchbox')).toHaveValue('riso');
  });
});
```

**1d. `src/components/__tests__/AggiungiTratteggiato.test.tsx`** (nuovo):

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AggiungiTratteggiato } from '../AggiungiTratteggiato';

describe('AggiungiTratteggiato (DESIGN.md §8 Tasti, condiviso dalla fase 7)', () => {
  it('con href è un link: il nome è l\'etichetta, alto 56, raggio 14, bordo 2 tratteggiato, mono maiuscolo in --ink', () => {
    render(<AggiungiTratteggiato etichetta="Nuovo piatto" href="/piatti/nuovo" />);
    const link = screen.getByRole('link', { name: 'Nuovo piatto' });
    expect(link).toHaveAttribute('href', '/piatti/nuovo');
    expect(link.style.height).toBe('56px');
    expect(link.style.borderRadius).toBe('14px');
    expect(link.style.border).toBe('2px dashed var(--bordo-tratteggio)');
    expect(link.style.textTransform).toBe('uppercase');
    expect(link.style.color).toBe('var(--ink)');
  });

  it('con onClick è un bottone che la chiama, con lo stesso disegno', () => {
    const onClick = vi.fn();
    render(<AggiungiTratteggiato etichetta="AGGIUNGI COMPONENTE" onClick={onClick} />);
    const bottone = screen.getByRole('button', { name: 'AGGIUNGI COMPONENTE' });
    expect(bottone).toHaveAttribute('type', 'button');
    expect(bottone.style.height).toBe('56px');
    expect(bottone.style.border).toBe('2px dashed var(--bordo-tratteggio)');
    fireEvent.click(bottone);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('ariaLabel, se c\'è, diventa il nome accessibile; il testo visibile resta l\'etichetta', () => {
    render(
      <AggiungiTratteggiato
        etichetta="AGGIUNGI INGREDIENTE"
        ariaLabel="Aggiungi ingrediente all'opzione 2 del componente 1"
        onClick={() => {}}
      />,
    );
    const bottone = screen.getByRole('button', { name: "Aggiungi ingrediente all'opzione 2 del componente 1" });
    expect(bottone).toHaveTextContent('AGGIUNGI INGREDIENTE');
  });

  it('senza ariaLabel non scrive l\'attributo: il nome è il testo', () => {
    render(<AggiungiTratteggiato etichetta="Nuovo piatto" href="/piatti/nuovo" />);
    expect(screen.getByRole('link')).not.toHaveAttribute('aria-label');
  });
});
```

- [ ] **Step 2: verifica che falliscano**

Run: `npx vitest run src/domain/__tests__/ricerca-piatti.test.ts`
Expected: FAIL — `areeDelPiatto` non è esportata da `../ricerca-piatti`.

Run: `npx vitest run src/components/__tests__/RigaPiatto.test.tsx src/components/__tests__/CampoRicercaPiatti.test.tsx src/components/__tests__/AggiungiTratteggiato.test.tsx`
Expected: FAIL — `Failed to resolve import "../RigaPiatto"` / `"../CampoRicercaPiatti"` / `"../AggiungiTratteggiato"` (i file non esistono ancora).

- [ ] **Step 3: l'implementazione**

**`src/domain/ricerca-piatti.ts`** — cambia solo l'import in testa e si aggiunge la funzione in fondo; `ingredientiDelPiatto` e `cercaPiatti` restano identiche a oggi (righe 1-39 di oggi, invariate):

```ts
import type { AreaId, Dish, Ingredient } from './types';
import { normalizza } from './import/mapping';
```

In fondo al file:

```ts
/**
 * Le aree distinte fra gli ingredienti del piatto (fissi e delle opzioni),
 * nell'ordine impostato dall'utente — non quello di inserimento. Spostata da
 * `ElencoPiatti.tsx` (spec fase 7 §A.3): la usano Piatti e, dal Task 3,
 * Scegli — la stessa informazione (quali reparti tocca un piatto) deve
 * comparire nello stesso ordine in entrambe le schermate.
 */
export function areeDelPiatto(
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
```

**`src/components/RigaPiatto.tsx`** (nuovo):

```tsx
'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { AreaId, Dish } from '@/domain/types';
import { coloreArea } from '@/domain/aree';
import { ingredientiDelPiatto } from '@/domain/ricerca-piatti';

/**
 * I due modi della Riga piatto (DESIGN.md §8, fase 7 §A.3): 'apri' è quello
 * di sempre, un `Link` che porta al piatto; 'scegli' è quello nuovo di
 * Scegli, un bottone che sceglie il piatto per il pasto. Un tipo solo,
 * discriminato su `modo`: i due usi non condividono le prop extra.
 */
export type ModoRigaPiatto =
  | { modo: 'apri'; href: string }
  | { modo: 'scegli'; scelto: boolean; corrente: boolean; onScegli: () => void };

type Props = { piatto: Dish; aree: AreaId[] } & ModoRigaPiatto;

/**
 * La Riga piatto, condivisa fra Piatti e Scegli (spec fase 7 §A.3): un solo
 * bersaglio, nome su una riga, sottoriga col numero degli ingredienti e
 * «dalla dieta» sui piatti dell'import, pallini d'area. A destra, secondo il
 * modo: il chevron che apre il piatto (oggi, invariato), o — in Scegli — la
 * spunta che dice «è questo». La riga scelta è piena (fondo --ink): «pieno =
 * scelto», la stessa regola della Striscia dei giorni (DESIGN.md §8).
 */
export function RigaPiatto(props: Props) {
  const { piatto, aree } = props;
  const scelto = props.modo === 'scegli' && props.scelto;
  const inProgramma = props.modo === 'scegli' && props.corrente;

  const n = ingredientiDelPiatto(piatto).length;
  const sottoriga =
    `${inProgramma ? 'ORA IN PROGRAMMA · ' : ''}${n} ${n === 1 ? 'INGREDIENTE' : 'INGREDIENTI'}` +
    `${piatto.fonte === 'nutrizionista' ? ' · DALLA DIETA' : ''}`;

  // Bordo e ombra invariati fra i due stati: solo fondo e colore del testo
  // cambiano quando la riga è scelta (spec: «pieno = scelto»).
  const stileRiga: CSSProperties = {
    flexShrink: 0, display: 'flex', alignItems: 'center', minHeight: 'var(--riga-piatto)', boxSizing: 'border-box',
    borderRadius: 14, background: scelto ? 'var(--ink)' : 'var(--superficie)', border: '1px solid rgba(20,22,58,0.09)',
    boxShadow: 'var(--ombra-pannello)', textDecoration: 'none', color: 'inherit',
  };

  const corpo = (
    <>
      <div style={{ flex: 1, minWidth: 0, padding: '12px 8px 12px 14px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span
          style={{
            fontSize: 17, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2,
            color: scelto ? 'var(--superficie)' : 'var(--ink)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {piatto.nome}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, letterSpacing: '0.08em',
            color: scelto ? 'rgba(255,255,255,0.62)' : 'var(--ter)',
          }}
        >
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
        {scelto ? (
          // La spunta di oggi di Scegli (stessa geometria, stesso 13 in viewBox 20), in --ink
          // dentro il tondo 24 in --superficie: prima era bianca dentro un tondo pieno.
          <span style={{ width: 24, height: 24, borderRadius: 999, background: 'var(--superficie)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
              <path d="M4.5 10.5 8.2 14 15.5 6.4" stroke="var(--ink)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 3.2 10.4 8 6 12.8" stroke="var(--icona-spenta)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </>
  );

  if (props.modo === 'apri') {
    return (
      <Link href={props.href} aria-label={`Apri ${piatto.nome}`} style={stileRiga}>
        {corpo}
      </Link>
    );
  }

  return (
    <button type="button" aria-pressed={scelto} aria-label={`Scegli ${piatto.nome}`} onClick={props.onScegli} style={stileRiga}>
      {corpo}
    </button>
  );
}
```

**`src/components/CampoRicercaPiatti.tsx`** (nuovo):

```tsx
'use client';

interface Props {
  valore: string;
  onCambia: (testo: string) => void;
}

/**
 * Il campo di ricerca di Piatti (spec fase 3 §A), condiviso con Scegli dalla
 * fase 7 (§A.3): fuori dallo scroller, resta fermo mentre la lista scorre —
 * con la tastiera aperta si vede cosa si sta scrivendo.
 */
export function CampoRicercaPiatti({ valore, onCambia }: Props) {
  return (
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
          value={valore}
          onChange={(e) => onCambia(e.target.value)}
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
  );
}
```

**`src/components/AggiungiTratteggiato.tsx`** (nuovo — lo stile e il «+» sono quelli del `Link` «Nuovo piatto» di oggi di `ElencoPiatti.tsx`, righe 62-76, pari pari):

```tsx
'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';

type Props = { etichetta: string; ariaLabel?: string } & ({ href: string } | { onClick: () => void });

const STILE: CSSProperties = {
  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
  width: '100%', height: 56, boxSizing: 'border-box', borderRadius: 14,
  border: '2px dashed var(--bordo-tratteggio)', background: 'none', textDecoration: 'none',
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--ink)',
};

/**
 * L'Aggiungi tratteggiato (DESIGN.md §8 Tasti): alto 56, raggio 14, bordo 2
 * tratteggiato, niente fondo, mono 11/700/0,08em maiuscolo in --ink, il «+» 16.
 * Estratto dalla fase 7 dal «Nuovo piatto» di Piatti, perché lo usano anche
 * Scegli (`CREA UN PIATTO NUOVO`) e l'editor del Piatto (`AGGIUNGI INGREDIENTE`,
 * `AGGIUNGI COMPONENTE`): un disegno solo, non tre copie. Con `href` è un
 * link, con `onClick` un bottone. `ariaLabel` serve dove il testo da solo è
 * ambiguo: gli AGGIUNGI INGREDIENTE delle opzioni dicono a quale opzione
 * aggiungono.
 */
export function AggiungiTratteggiato(props: Props) {
  const corpo = (
    <>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {props.etichetta}
    </>
  );
  if ('href' in props) {
    return (
      <Link href={props.href} aria-label={props.ariaLabel} style={STILE}>
        {corpo}
      </Link>
    );
  }
  return (
    <button type="button" onClick={props.onClick} aria-label={props.ariaLabel} style={STILE}>
      {corpo}
    </button>
  );
}
```

**`src/app/(app)/piatti/ElencoPiatti.tsx`** — riscrittura completa:

```tsx
'use client';

import { useState } from 'react';
import type { AreaId, Dish, Ingredient } from '@/domain/types';
import { areeDelPiatto, cercaPiatti } from '@/domain/ricerca-piatti';
import { AggiungiTratteggiato } from '@/components/AggiungiTratteggiato';
import { CampoRicercaPiatti } from '@/components/CampoRicercaPiatti';
import { RigaPiatto } from '@/components/RigaPiatto';

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
 *
 * Dalla fase 7 (§A.3) il campo, la riga e l'aggiungi sono pezzi condivisi con
 * Scegli (`CampoRicercaPiatti`, `RigaPiatto`, `AggiungiTratteggiato`): qui
 * `RigaPiatto` è in modo 'apri', e tutto è identico a prima della condivisione.
 */
export function ElencoPiatti({ piatti, ingredienti, ordineAree }: Props) {
  const [ricerca, setRicerca] = useState('');
  const areaPerIngrediente = new Map(ingredienti.map((i) => [i.id, i.area]));
  const mostrati = cercaPiatti(piatti, ingredienti, ricerca);

  return (
    <>
      {/* Fuori dallo scroller: resta fermo mentre la lista scorre, e con la
          tastiera aperta si vede cosa si sta scrivendo (spec §A, §M.3). */}
      <CampoRicercaPiatti valore={ricerca} onCambia={setRicerca} />

      <div
        className="sc scroll-app"
        style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          padding: '2px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        <AggiungiTratteggiato etichetta="Nuovo piatto" href="/piatti/nuovo" />

        {mostrati.map((piatto) => (
          <RigaPiatto
            key={piatto.id}
            modo="apri"
            href={`/piatti/${piatto.id}`}
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
```

Parti identiche a oggi, copiate pari pari nel file sopra: il blocco del vuoto di ricerca `{mostrati.length === 0 && (…)}` (righe 86-93 di oggi). Il `Link` «Nuovo piatto» (righe 62-76 di oggi) diventa `<AggiungiTratteggiato etichetta="Nuovo piatto" href="/piatti/nuovo" />`: stesso stile, stesso «+», stesso nome accessibile (`Nuovo piatto`), quindi i test di Piatti che lo cercano per `getByRole('link', { name: 'Nuovo piatto' })` non cambiano. Spariscono la funzione locale `areeDelPiatto` (righe 99-111 di oggi) e la funzione locale `RigaPiatto` (righe 113-162 di oggi): il loro codice è, rispettivamente, in `ricerca-piatti.ts` e in `RigaPiatto.tsx` sopra. Spariscono anche gli import di `Link` (lo usa ora `AggiungiTratteggiato`), di `coloreArea` (usato solo dalla vecchia `RigaPiatto` locale) e di `ingredientiDelPiatto` (usato solo dalle due funzioni locali sparite).

- [ ] **Step 4: verifica che passino**

Run: `npx vitest run src/domain/__tests__/ricerca-piatti.test.ts src/components/__tests__/RigaPiatto.test.tsx src/components/__tests__/CampoRicercaPiatti.test.tsx src/components/__tests__/AggiungiTratteggiato.test.tsx`
Expected: PASS, tutti.

Run: `npx vitest run "src/app/(app)/piatti/__tests__"`
Expected: PASS, tutti (`page.test.tsx`, `ricerca.test.tsx`, `vista.test.tsx`, `da.test.ts`), senza nessuna modifica a quei file: l'aspetto e il comportamento di Piatti non sono cambiati.

- [ ] **Step 5: controlli**

```bash
grep -nE "#[0-9A-Fa-f]{6}|rgba\(20,22,58,0\.(05|12|16)\)" src/domain/ricerca-piatti.ts src/components/RigaPiatto.tsx src/components/CampoRicercaPiatti.tsx src/components/AggiungiTratteggiato.tsx "src/app/(app)/piatti/ElencoPiatti.tsx"
```
Expected: nessuna riga (il `rgba(20,22,58,0.09)` del bordo della Riga piatto è il valore di Piatti di oggi ed è nella tabella delle alfe di §2.5; lo `0.62` della sottoriga scelta è ammesso dai Global Constraints).

```bash
grep -rn $'\xc3\x83' src/domain/ricerca-piatti.ts src/domain/__tests__/ricerca-piatti.test.ts src/components/RigaPiatto.tsx src/components/CampoRicercaPiatti.tsx src/components/AggiungiTratteggiato.tsx src/components/__tests__/RigaPiatto.test.tsx src/components/__tests__/CampoRicercaPiatti.test.tsx src/components/__tests__/AggiungiTratteggiato.test.tsx "src/app/(app)/piatti/ElencoPiatti.tsx"
```
Expected: vuoto.

Poi: `npm test`, `npx tsc --noEmit`, `npm run lint`. Tutti verdi.

- [ ] **Step 6: commit**

```bash
git add src/domain/ricerca-piatti.ts src/domain/__tests__/ricerca-piatti.test.ts src/components/RigaPiatto.tsx src/components/__tests__/RigaPiatto.test.tsx src/components/CampoRicercaPiatti.tsx src/components/__tests__/CampoRicercaPiatti.test.tsx src/components/AggiungiTratteggiato.tsx src/components/__tests__/AggiungiTratteggiato.test.tsx "src/app/(app)/piatti/ElencoPiatti.tsx"
git commit -m "refactor: la Riga piatto, la ricerca e l'Aggiungi tratteggiato condivisi fra Piatti e Scegli, coi due modi apri/scegli

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Test esistenti toccati (Task 1)**

- `src/domain/__tests__/ricerca-piatti.test.ts`: l'helper `ingrediente(id, nome)` guadagna un terzo parametro opzionale `area` (default `'dispensa'`); tutte le chiamate esistenti restano invariate. Nessun `it()` esistente cambia; si aggiunge solo il `describe('areeDelPiatto', …)`.
- Non cambia nessun altro file di test: `src/app/(app)/piatti/__tests__/{page,ricerca,vista}.test.tsx` e `da.test.ts` restano verdi senza modifiche, perché l'aspetto e il comportamento di `ElencoPiatti` non cambiano (il `Link` «Nuovo piatto» diventa `AggiungiTratteggiato` con lo stesso nome accessibile).

---

### Task 2: La testata di modifica condivisa

**Files:**
- Create: `src/components/TestataModifica.tsx`
- Create: `src/components/__tests__/TestataModifica.test.tsx`
- Modify: `src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx` (usa `TestataModifica` al posto della sua `Cornice`; aspetto e comportamento invariati)

**Interfaces:**
- Consumes: niente (indipendente dal Task 1).
- Produces (dalle Interfacce vincolanti del piano, alla lettera):
  ```ts
  // src/components/TestataModifica.tsx
  export function TestataModifica(props: {
    freccia: { etichetta: string; onTorna: () => void };
    area?: AreaId | null;
    nome?: ReactNode;
    children?: ReactNode;
  }): JSX.Element;
  ```
  La userà anche l'editor del Piatto (Task 6).

---

- [ ] **Step 1: i test che falliscono**

**`src/components/__tests__/TestataModifica.test.tsx`** (nuovo):

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { coloreArea } from '@/domain/aree';
import { TestataModifica } from '../TestataModifica';

// jsdom riscrive l'esadecimale inline in `rgb(…)`: stesso helper di `avvio-marchio.test.tsx`.
const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

describe('TestataModifica (DESIGN.md §8, frame 12 — spec fase 7 §B.2)', () => {
  it('il tondo ha l\'aria-label della freccia e chiama onTorna al tocco', () => {
    const onTorna = vi.fn();
    render(<TestataModifica freccia={{ etichetta: 'Torna al piatto', onTorna }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Torna al piatto' }));
    expect(onTorna).toHaveBeenCalledTimes(1);
  });

  it('senza area passata non c\'è nessuna etichetta d\'area', () => {
    render(<TestataModifica freccia={{ etichetta: 'Torna', onTorna: () => {} }} />);
    expect(screen.queryByText(/PASTA, RISO E CEREALI|MACELLERIA|LATTICINI/)).not.toBeInTheDocument();
  });

  it('con area passata mostra il quadratino colorato e il nome dell\'area', () => {
    render(<TestataModifica freccia={{ etichetta: 'Torna', onTorna: () => {} }} area="cereali" />);
    const etichetta = screen.getByText('PASTA, RISO E CEREALI');
    const quadratino = etichetta.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(quadratino).toBeInTheDocument();
    expect(quadratino.style.background).toBe(rgb(coloreArea('cereali')));
  });

  it('rende il nome e i children passati', () => {
    render(
      <TestataModifica freccia={{ etichetta: 'Torna', onTorna: () => {} }} nome={<span>Riso e pane</span>}>
        <p>Corpo della pagina</p>
      </TestataModifica>,
    );
    expect(screen.getByText('Riso e pane')).toBeInTheDocument();
    expect(screen.getByText('Corpo della pagina')).toBeInTheDocument();
  });
});
```

*I test esistenti dell'editor dell'ingrediente (`src/app/(app)/piatti/[id]/ingredienti/[ingId]/__tests__/page.test.tsx`) non cambiano: la rifattorizzazione non tocca né il markup né gli `aria-label` (`Torna agli ingredienti`, `Torna al piatto`, `Dai un nome all'ingrediente`, i nomi delle aree).*

- [ ] **Step 2: verifica che falliscano**

Run: `npx vitest run src/components/__tests__/TestataModifica.test.tsx`
Expected: FAIL — `Failed to resolve import "../TestataModifica"` (il file non esiste ancora).

- [ ] **Step 3: l'implementazione**

**`src/components/TestataModifica.tsx`** (nuovo — stesso markup della `Cornice` di oggi dell'editor dell'ingrediente, righe 694-729):

```tsx
'use client';

import type { ReactNode } from 'react';
import type { AreaId } from '@/domain/types';
import { coloreArea, nomeArea } from '@/domain/aree';

/**
 * La testata di modifica (DESIGN.md §8, frame 12): il tondo 44 su
 * --barra-attiva con la freccia; sotto, facoltativa, l'etichetta mono col
 * quadratino d'area; poi il nome come campo a 32/800, passato da chi la usa.
 * Non è la `Testata` (niente titolo di schermata, niente tab bar): la usa
 * l'editor dell'ingrediente (dalla fase 5, qui estratta) e la userà l'editor
 * del Piatto (fase 7, Task 6) — ciascuno resta padrone del proprio stato e
 * passa il proprio campo del nome come prop `nome`.
 */
export function TestataModifica({ children, freccia, area = null, nome }: {
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

**`src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx`** — modifiche mirate, il resto del file (tutto il corpo di `IngredienteEditor`, righe 154-692 di oggi) resta identico:

1. Import in testa (righe 3 e 8 di oggi):

| Oggi | Diventa |
|---|---|
| `import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';` | `import { useEffect, useRef, useState, type CSSProperties } from 'react';` |
| `import { AREE, coloreArea, nomeArea } from '@/domain/aree';` | `import { AREE, coloreArea } from '@/domain/aree';` |

(`ReactNode` e `nomeArea` restano usati solo dalla vecchia `Cornice`, che sparisce: senza toglierli, `tsc`/lint segnalano import inutilizzati.)

2. Aggiungi, fra gli import di componenti (accanto a `Dock`/`FoglioDalBasso`):

```ts
import { TestataModifica } from '@/components/TestataModifica';
```

3. Sostituisci ogni tag `Cornice` con `TestataModifica` (le prop passate — `freccia`, `area`, `nome` — restano le stesse, nomi compresi): quattro punti, righe 474, 481, 486 e 489-505 di oggi (`<Cornice freccia={freccia}>…</Cornice>` diventa `<TestataModifica freccia={freccia}>…</TestataModifica>`, e così per il ramo `caricamento` self-closing e per il return principale con `area`/`nome`).

4. Cancella in fondo al file la funzione locale `Cornice` e il suo commento (righe 694-729 di oggi, dal blocco `/** * La testata del frame 12: …` fino alla chiusura della funzione): il suo codice è quello di `TestataModifica.tsx` sopra.

- [ ] **Step 4: verifica che passino**

Run: `npx vitest run src/components/__tests__/TestataModifica.test.tsx`
Expected: PASS, tutti (4 test).

Run: `npx vitest run "src/app/(app)/piatti/[id]/ingredienti/[ingId]/__tests__/page.test.tsx"`
Expected: PASS, tutti, senza nessuna modifica a quel file di test.

- [ ] **Step 5: controlli**

```bash
grep -nE "#[0-9A-Fa-f]{6}|rgba\(20,22,58,0\.(05|12|16)\)" src/components/TestataModifica.tsx "src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx"
```
Expected: nessuna riga.

```bash
grep -rn $'\xc3\x83' src/components/TestataModifica.tsx src/components/__tests__/TestataModifica.test.tsx "src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx"
```
Expected: vuoto.

Poi: `npm test`, `npx tsc --noEmit`, `npm run lint`. Tutti verdi.

- [ ] **Step 6: commit**

```bash
git add src/components/TestataModifica.tsx src/components/__tests__/TestataModifica.test.tsx "src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx"
git commit -m "refactor: la testata di modifica (frame 12) in un componente condiviso, usata dall'editor dell'ingrediente

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Test esistenti toccati (Task 2)**

- Nessuno cambia: `src/app/(app)/piatti/[id]/ingredienti/[ingId]/__tests__/page.test.tsx` resta verde senza modifiche, perché il markup e gli `aria-label` della testata dell'editor dell'ingrediente non cambiano. Se `tsc` o il lint segnalano import inutilizzati dopo aver tolto la `Cornice`, li toglie l'implementatore (alla lettura di oggi `ReactNode` e `nomeArea` sono usati solo dentro la `Cornice`).

---

### Task 3: Scegli ridisegnata

**Files:**
- Modify (riscrittura del render): `src/app/(app)/piano/[data]/[slotDefId]/scegli/page.tsx` (757 righe oggi; restano identiche le righe 23–174 meno `areeDelPiatto` e le righe 192–446, cambiano gli import 1–19, spariscono le righe 176–190 e 448–757, che diventano il render nuovo)
- Modify: `src/components/pannello/RigaImpostazione.tsx` (prop `etichetta`, righe 12–17, 56–70; il valore non sfonda ed è maiuscolo via CSS, riga 60)
- Test (modifica): `src/app/(app)/piano/[data]/[slotDefId]/scegli/__tests__/page.test.tsx`
- Test (nuovo): `src/components/pannello/__tests__/riga-impostazione.test.tsx`

**Interfaces:**
- Consumes (Task 1, alla lettera):
  - `areeDelPiatto(piatto: Dish, areaPerIngrediente: Map<string, AreaId>, ordineAree: AreaId[]): AreaId[]` e `cercaPiatti(piatti: Dish[], ingredienti: Ingredient[], testo: string): Dish[]` da `@/domain/ricerca-piatti`;
  - `RigaPiatto(props: { piatto: Dish; aree: AreaId[] } & ModoRigaPiatto)` da `@/components/RigaPiatto`, nel modo `{ modo: 'scegli'; scelto: boolean; corrente: boolean; onScegli: () => void }` (`button`, `aria-pressed={scelto}`, `aria-label="Scegli {nome}"`, sottoriga con `ORA IN PROGRAMMA · ` in testa se `corrente`, pallini con `data-area`);
  - `CampoRicercaPiatti(props: { valore: string; onCambia: (testo: string) => void })` da `@/components/CampoRicercaPiatti` (`input type="search"`, `aria-label="Cerca un piatto o un ingrediente"`);
  - `AggiungiTratteggiato(props: { etichetta: string; ariaLabel?: string } & ({ href: string } | { onClick: () => void }))` da `@/components/AggiungiTratteggiato`, qui con `href` (un `Link` alto 56, raggio 14, il cui nome accessibile è l'etichetta).
- Consumes (esistenti): `Testata` (`@/components/Testata`, `{ titolo, settimana?, indietro?: { etichetta, ariaLabel, onTorna } }`); `Dock` (`@/components/Dock`); `SlotDockProvider` (`@/components/dock-slot`, solo nei test); `RigaImpostazione` (`@/components/pannello/RigaImpostazione`); `Carico`, `Nota` (`@/components/pannello/pezzi`); `MessaggioErrore` (`@/components/controlli`).
- Produces: `RigaImpostazione` accetta `etichetta?: string`, l'`aria-label` della riga quando è un `button` (finali `valore` e `azione`); senza, il nome accessibile resta il testo della riga. Il valore è al massimo metà riga, poi ellissi, ed è maiuscolo via CSS (DESIGN.md §8: mono 11/700 maiuscolo); i valori del Pannello di oggi sono già maiuscoli e corti, quindi non cambiano. Nessun altro task la usa.

**Le funzioni pure di Scegli non si spostano.** Nessun test nuovo le importa: i test nuovi sono tutti di resa e passano dalla pagina. Restano in `page.tsx`, identiche, e `page.tsx` continua a esportare solo il default. `areeDelPiatto` è l'unica che sparisce dal file: arriva da `@/domain/ricerca-piatti` (Task 1).

**Scegli si allinea a Piatti sui pallini e sul conteggio.** L'`areeDelPiatto` locale di oggi leggeva solo gli ingredienti fissi; quella condivisa (Task 1, la stessa di Piatti) conta anche le righe delle opzioni dei componenti, e così fa la sottoriga di `RigaPiatto` (`N INGREDIENTI`, oggi `N INGR.` sui soli fissi). Cambia la resa dei piatti con componenti (esempio: la Torta salata dei test passa da nessun pallino a latticini + dispensa), non le scritture.

- [ ] **Step 1: i test che falliscono**

**1a. `src/components/pannello/__tests__/riga-impostazione.test.tsx` (nuovo):**

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RigaImpostazione } from '../RigaImpostazione';

describe('RigaImpostazione — etichetta', () => {
  it('senza etichetta il nome accessibile resta il testo della riga, come oggi', () => {
    render(
      <RigaImpostazione
        nome="Gestione dei pasti"
        nota="Quanti pasti fai al giorno e come si chiamano."
        finale={{ tipo: 'valore', valore: '3 PASTI', onApri: () => {} }}
      />,
    );
    const riga = screen.getByRole('button');
    expect(riga).not.toHaveAttribute('aria-label');
    expect(riga).toHaveAccessibleName(/Gestione dei pasti/);
  });

  it('con etichetta, la riga a valore la usa come nome accessibile e il tocco chiama onApri', () => {
    const onApri = vi.fn();
    render(
      <RigaImpostazione
        nome="Farcitura"
        etichetta="Cambia Farcitura: ora Ricotta"
        finale={{ tipo: 'valore', valore: 'Ricotta', onApri }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cambia Farcitura: ora Ricotta' }));
    expect(onApri).toHaveBeenCalledTimes(1);
    // Il testo visibile non cambia: nome e valore restano quelli passati.
    expect(screen.getByText('Farcitura')).toBeInTheDocument();
    expect(screen.getByText('Ricotta')).toBeInTheDocument();
  });

  it('anche la riga ad azione prende l\'etichetta', () => {
    render(<RigaImpostazione nome="Esci" etichetta="Esci dall'account" finale={{ tipo: 'azione', onAzione: () => {} }} />);
    expect(screen.getByRole('button', { name: "Esci dall'account" })).toBeInTheDocument();
  });

  it('un valore lungo non sfonda la riga: al massimo metà, poi ellissi', () => {
    render(
      <RigaImpostazione
        nome="Farcitura"
        finale={{ tipo: 'valore', valore: 'Ricotta + Noci + Prezzemolo', onApri: () => {} }}
      />,
    );
    const valore = screen.getByText('Ricotta + Noci + Prezzemolo');
    expect(valore.style.maxWidth).toBe('50%');
    expect(valore.style.overflow).toBe('hidden');
    expect(valore.style.textOverflow).toBe('ellipsis');
  });

  it('il valore è maiuscolo a schermo (CSS), ma nel DOM resta il testo passato', () => {
    render(<RigaImpostazione nome="Farcitura" finale={{ tipo: 'valore', valore: 'Ricotta', onApri: () => {} }} />);
    const valore = screen.getByText('Ricotta');
    expect(valore.style.textTransform).toBe('uppercase');
    expect(valore.textContent).toBe('Ricotta');
  });

  // Il valore più lungo del Pannello di oggi è «NESSUNO FUORI CASA» (Cima, Pasti a casa).
  // jsdom non fa layout: qui si fissa che il valore corto arriva intero, su una riga, e che il
  // limite è relativo alla riga (50 %), non un taglio a caratteri. Che a 360 non si tagli lo
  // misura la sonda nel browser (Dopo i task, punto 1).
  it('un valore corto del Pannello resta com\'era: intero, su una riga, col limite a metà riga e non a caratteri', () => {
    render(<RigaImpostazione nome="Pasti a casa" finale={{ tipo: 'valore', valore: 'NESSUNO FUORI CASA', onApri: () => {} }} />);
    const valore = screen.getByText('NESSUNO FUORI CASA');
    expect(valore.textContent).toBe('NESSUNO FUORI CASA');
    expect(valore.style.whiteSpace).toBe('nowrap');
    expect(valore.style.maxWidth).toBe('50%');
    expect(screen.getByRole('button')).toHaveAccessibleName(/NESSUNO FUORI CASA/);
  });
});
```

**1b. `src/app/(app)/piano/[data]/[slotDefId]/scegli/__tests__/page.test.tsx` (modifica).**

Import in testa:
- `import { render, screen, fireEvent, waitFor } from '@testing-library/react';` diventa `import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';`
- dopo `import { leggiListe } from '@/data/lista';` aggiungi `import { SlotDockProvider } from '@/components/dock-slot';`

Subito prima di `describe('Scegli il piatto', …)` aggiungi il montaggio con lo slot del Dock (lo stesso di Fine spesa: senza slot il `Dock` non rende niente, e `SOSTITUISCI` ora vive lì):

```tsx
/**
 * La pagina con uno slot vero per il Dock, come nel Guscio. Lo slot si attacca al body
 * dopo il render: così nel documento viene dopo il corpo della pagina, come nell'app.
 */
function monta() {
  const slot = document.createElement('div');
  const esito = render(<SlotDockProvider slot={slot}><ScegliPiatto /></SlotDockProvider>);
  document.body.appendChild(slot);
  return esito;
}
```

Sostituzioni meccaniche nei test esistenti:

| Test | Oggi | Diventa |
|---|---|---|
| tutti i 23 test dei due `describe` | `render(<ScegliPiatto />);` | `monta();` |
| *header ed etichetta usano il giorno e il pasto reali* | `expect(screen.getByText('GIOVEDÌ 27 · CENA')).toBeInTheDocument();` | `expect(screen.getByRole('heading', { level: 1, name: 'Cosa mangi' })).toBeInTheDocument();` e `expect(screen.getByText('Giovedì 27 · Cena')).toBeInTheDocument();` (la pillola lo rende maiuscolo col CSS) |
| *il piatto assegnato allo slot mostra il badge "ORA IN PROGRAMMA" ed è selezionato* | nome del test; `expect(screen.getByText('ORA IN PROGRAMMA')).toBeInTheDocument();` prima di `const rigaPollo` | nome: *il piatto assegnato allo slot dice "ORA IN PROGRAMMA" ed è selezionato*; la riga si sposta dopo `const rigaPollo = …` e diventa `expect(rigaPollo).toHaveTextContent('ORA IN PROGRAMMA');` |
| *un piatto con componente a due opzioni mostra la riga del componente col nome dell'opzione di default* | `expect(screen.getByText('FARCITURA')).toBeInTheDocument();` | `expect(screen.getByText('Farcitura')).toBeInTheDocument();` (il nome della Riga di impostazione, non più un'etichetta mono) |
| *il link "torna" e il bottone "annulla" puntano a /piano senza chiamare aggiornaSlot* | tutto il corpo dopo `await screen.findByText('Pollo e riso');` | vedi sotto: la pillola `PIANO` e niente `ANNULLA` |

Il test *il link "torna" e il bottone "annulla"…* diventa (stesso posto nel file):

```tsx
  it('la pillola PIANO della Testata porta a /piano senza chiamare aggiornaSlot; ANNULLA non c\'è più', async () => {
    mockCarico();
    monta();
    await screen.findByText('Pollo e riso');

    fireEvent.click(screen.getByRole('button', { name: 'Torna al piano' }));
    expect(push).toHaveBeenCalledWith('/piano');
    expect(aggiornaSlot).not.toHaveBeenCalled();
    expect(screen.queryByText('ANNULLA')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Torna al Piano' })).not.toBeInTheDocument();
  });
```

Gli altri selettori (`getByText('Pollo e riso')`, `closest('button')`, `getByText('SOSTITUISCI')`, `getByText('Ricotta')`, `getByText('IN CASA')`, `getByLabelText('Cambia Farcitura: ora Ricotta')`, i testi di nota, conflitto ed errore) restano: i testi sono gli stessi e `SOSTITUISCI` si trova nel body anche dentro il portale.

In fondo a `describe('Conflitto di residuo', …)`, dopo l'ultimo `it`, aggiungi:

```tsx
  it('il conflitto è un Avviso in linea: 11,5 in --avviso, dentro una regione aria-live polite che c\'era già prima del tocco', async () => {
    mockCaricoConflitto('confermata');
    monta();
    await screen.findByText('Merluzzo al vapore');
    // La regione esiste prima che il conflitto compaia: così lo screen reader lo annuncia.
    const regioniPrima = Array.from(document.querySelectorAll('[aria-live="polite"]'));
    expect(regioniPrima.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('Pollo allo yogurt'));

    const avviso = screen.getByText(/^Con questo piatto Yogurt greco non basta/);
    expect(avviso.style.color).toBe('var(--avviso)');
    expect(avviso.style.fontSize).toBe('11.5px');
    const regione = avviso.closest('[aria-live="polite"]');
    expect(regione).not.toBeNull();
    expect(regioniPrima).toContain(regione);
  });
```

In fondo al file, il blocco nuovo:

```tsx
// ── Fase 7: Testata, ricerca, righe, componenti, Dock (spec 2026-09-26 §A) ──

describe('Scegli — il ridisegno della fase 7', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsMock = { data: DATA, slotDefId: 'sd-3' };
    vi.mocked(leggiListe).mockResolvedValue(null);
  });

  it('in caricamento: la Testata con la pillola PIANO, CARICO… e niente Dock', async () => {
    mockCarico();
    vi.mocked(leggiRepertorio).mockReturnValue(new Promise(() => {}));
    monta();

    expect(await screen.findByText('CARICO…')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Cosa mangi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Torna al piano' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).not.toBeInTheDocument();
  });

  it('errore di caricamento: il messaggio in --errore, sotto la Testata, e niente Dock', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      mockCarico();
      vi.mocked(leggiRepertorio).mockRejectedValue(new Error('rete assente'));
      monta();

      const msg = await screen.findByText('Non riusciamo a caricare i piatti. Riprova più tardi.');
      expect(msg.style.color).toBe('var(--errore)');
      expect(screen.getByRole('heading', { level: 1, name: 'Cosa mangi' })).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Azione principale' })).not.toBeInTheDocument();
    } finally {
      errore.mockRestore();
    }
  });

  it('la ricerca filtra per nome del piatto o di un ingrediente, mostra il vuoto di Piatti e non cambia la scelta', async () => {
    mockCarico();
    monta();
    await screen.findByText('Pollo e riso');
    const campo = screen.getByRole('searchbox', { name: 'Cerca un piatto o un ingrediente' });

    fireEvent.change(campo, { target: { value: 'merluzzo' } });
    expect(screen.queryByText('Pollo e riso')).not.toBeInTheDocument();
    expect(screen.getByText('Merluzzo e piselli')).toBeInTheDocument();

    // Per ingrediente: il Riso sta in tutti e due, nel Merluzzo solo come ingrediente.
    fireEvent.change(campo, { target: { value: 'RISO' } });
    expect(screen.getByText('Pollo e riso')).toBeInTheDocument();
    expect(screen.getByText('Merluzzo e piselli')).toBeInTheDocument();

    fireEvent.change(campo, { target: { value: 'zucca' } });
    expect(screen.getByText('Nessun piatto qui')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Scegli / })).not.toBeInTheDocument();
    // Filtrare non è scegliere: il piatto in programma resta scelto e SOSTITUISCI spento.
    expect(screen.getByRole('button', { name: 'SOSTITUISCI' })).toBeDisabled();

    fireEvent.change(campo, { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Scegli Pollo e riso' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Nessun piatto qui')).not.toBeInTheDocument();
  });

  it('la riga scelta: aria-pressed sul piatto in programma prima di un tocco, poi su quello toccato', async () => {
    mockCarico();
    monta();
    const pollo = await screen.findByRole('button', { name: 'Scegli Pollo e riso' });
    const merluzzo = screen.getByRole('button', { name: 'Scegli Merluzzo e piselli' });
    expect(pollo).toHaveAttribute('aria-pressed', 'true');
    expect(merluzzo).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(merluzzo);

    expect(merluzzo).toHaveAttribute('aria-pressed', 'true');
    expect(pollo).toHaveAttribute('aria-pressed', 'false');
  });

  it('ORA IN PROGRAMMA sta in testa alla sottoriga del piatto in programma, e non segue la scelta', async () => {
    mockCarico();
    monta();
    const pollo = await screen.findByRole('button', { name: 'Scegli Pollo e riso' });
    const merluzzo = screen.getByRole('button', { name: 'Scegli Merluzzo e piselli' });

    expect(pollo).toHaveTextContent('ORA IN PROGRAMMA · 2 INGREDIENTI');
    expect(merluzzo).toHaveTextContent('1 INGREDIENTE');
    expect(merluzzo).not.toHaveTextContent('ORA IN PROGRAMMA');

    fireEvent.click(merluzzo);
    expect(pollo).toHaveTextContent('ORA IN PROGRAMMA');
    expect(merluzzo).not.toHaveTextContent('ORA IN PROGRAMMA');
  });

  it('i componenti sono Righe di impostazione sotto COMPONENTI: nome, opzione come valore, IN CASA nella nota', async () => {
    mockCaricoConComponenti();
    monta();
    await screen.findByText('Torta salata');

    expect(screen.getByRole('heading', { level: 2, name: 'COMPONENTI' })).toBeInTheDocument();
    const riga = screen.getByRole('button', { name: 'Cambia Farcitura: ora Ricotta' });
    expect(within(riga).getByText('Farcitura')).toBeInTheDocument();
    expect(within(riga).getByText('Ricotta')).toBeInTheDocument();
    const inCasa = within(riga).getByText('IN CASA');
    expect(inCasa.style.fontFamily).toBe('var(--font-mono)');
    expect(inCasa.style.fontSize).toBe('10px');
    // Fra i token non c'è un verde: IN CASA è in --ink (spec fase 7 §A.4).
    expect(inCasa.style.color).toBe('var(--ink)');

    fireEvent.click(riga);

    const dopo = screen.getByRole('button', { name: 'Cambia Farcitura: ora Noci' });
    expect(within(dopo).getByText('Noci')).toBeInTheDocument();
    expect(within(dopo).queryByText('IN CASA')).not.toBeInTheDocument();
  });

  it('un piatto senza componenti non mostra la sezione COMPONENTI', async () => {
    mockCarico();
    monta();
    await screen.findByText('Pollo e riso');

    expect(screen.queryByRole('heading', { level: 2, name: 'COMPONENTI' })).not.toBeInTheDocument();
  });

  it('SOSTITUISCI sta nel Dock: spento senza cambiamenti, spento in volo col grigio del sistema, riacceso dopo un errore scritto sopra il Dock', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      mockCarico();
      let rifiuta: (e: Error) => void = () => {};
      vi.mocked(aggiornaSlot).mockReturnValueOnce(new Promise<void>((_, r) => { rifiuta = r; }));
      monta();

      const regione = await screen.findByRole('region', { name: 'Azione principale' });
      const tasto = within(regione).getByRole('button', { name: 'SOSTITUISCI' });
      expect(tasto).toHaveClass('dock-primario');
      expect(tasto).toBeDisabled();

      fireEvent.click(screen.getByRole('button', { name: 'Scegli Merluzzo e piselli' }));
      expect(tasto).not.toBeDisabled();

      fireEvent.click(tasto);
      await waitFor(() => expect(tasto).toBeDisabled());
      // In volo è lo spento di `.dock-primario:disabled`, non un'opacità scritta sul tasto.
      expect(tasto).not.toHaveAttribute('style');

      rifiuta(new Error('rete assente'));
      const msg = await within(regione).findByRole('alert');
      expect(msg).toHaveTextContent('Non siamo riusciti a salvare la scelta. Riprova.');
      expect(msg.style.color).toBe('var(--errore)');
      expect(tasto).not.toBeDisabled();
      expect(push).not.toHaveBeenCalled();
    } finally {
      errore.mockRestore();
    }
  });

  it('CREA UN PIATTO NUOVO è l\'Aggiungi tratteggiato in fondo, dopo la nota, e porta a /piatti/nuovo', async () => {
    mockCarico();
    monta();
    await screen.findByText('Pollo e riso');

    const crea = screen.getByRole('link', { name: 'CREA UN PIATTO NUOVO' });
    expect(crea).toHaveAttribute('href', '/piatti/nuovo');
    expect(crea.style.height).toBe('56px');
    expect(crea.style.borderRadius).toBe('14px');
    const nota = screen.getByText(/^Tocca un piatto per sostituire/);
    expect(nota.compareDocumentPosition(crea) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const ultimaRiga = screen.getByRole('button', { name: 'Scegli Merluzzo e piselli' });
    expect(ultimaRiga.compareDocumentPosition(crea) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
```

- [ ] **Step 2: verifica che falliscano**

Run: `npx vitest run "src/app/(app)/piano/[data]/[slotDefId]/scegli/__tests__/page.test.tsx" src/components/pannello/__tests__/riga-impostazione.test.tsx`

Expected: FAIL. In `riga-impostazione`: il test con etichetta, quello ad azione, quello del valore lungo, quello del maiuscolo e quello del valore corto (la prop non esiste, il valore non ha né `maxWidth` né `textTransform`); passa solo il primo. In Scegli: *header ed etichetta* (oggi `GIOVEDÌ 27 · CENA` è testo, niente `h1`), *un piatto con componente…* (oggi `FARCITURA` è scritto maiuscolo), *la pillola PIANO…* (oggi c'è una freccia `Torna al Piano`), il test nuovo del conflitto e tutti quelli del blocco nuovo tranne *un piatto senza componenti* (niente ricerca, niente `Scegli {nome}`, niente Dock, `CARICO…` assente, errore in `--sec`, Aggiungi alto 52). Gli altri test esistenti passano già con `monta()`.

- [ ] **Step 3: l'implementazione**

**3a. `src/components/pannello/RigaImpostazione.tsx`.** L'interfaccia `Props` diventa:

```tsx
interface Props {
  nome: string;
  nota?: ReactNode;
  finale: Finale;
  errore?: string | null;
  /**
   * Il nome accessibile della riga, quando il testo visibile non basta a dire cosa fa il
   * tocco (Scegli: `Cambia {componente}: ora {opzione}`, spec fase 7 §A.4). Vale solo dove
   * la riga è un `button` (`valore`, `azione`); senza, il nome è il testo della riga.
   */
  etichetta?: string;
}
```

La firma diventa `export function RigaImpostazione({ nome, nota, finale, errore, etichetta }: Props) {`. Nei due `case` che fanno un `button`:

```tsx
    case 'valore':
      riga = (
        <button type="button" aria-label={etichetta} onClick={finale.onApri} style={STILE_RIGA}>
          {testi}
          {finale.valore && (
            // Al massimo metà riga, poi ellissi: un valore lungo (le opzioni di Scegli,
            // «Ricotta + Noci + …») non deve schiacciare il nome a zero. Il testo intero
            // resta nell'etichetta, se chi monta la riga la passa. I valori corti del
            // Pannello («2 PASTI», «OGNI 3 MESI», «NESSUNO FUORI CASA») stanno sotto la
            // metà e non cambiano. Maiuscolo via CSS (DESIGN.md §8): chi passa «Ricotta»
            // la vede RICOTTA, e nel DOM resta il testo.
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap', maxWidth: '50%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {finale.valore}
            </span>
          )}
          <Chevron />
        </button>
      );
      break;
    case 'azione':
      riga = <button type="button" aria-label={etichetta} onClick={finale.onAzione} style={STILE_RIGA}>{testi}</button>;
      break;
```

Il resto del file resta identico. `aria-label={undefined}` non scrive l'attributo: le righe del Pannello non cambiano nome accessibile. Il `maxWidth: '50%'` non cambia l'aspetto delle righe del Pannello di oggi: il valore più lungo è «NESSUNO FUORI CASA», 18 caratteri mono 11 [ipotesi, non misurata: circa 133 px contro circa 148 di metà riga a 360]; la misura vera la fa la sonda (Dopo i task, punto 1). Se la sonda lo trova tagliato, si alza il limite, non si tolgono i test.

**3b. `src/app/(app)/piano/[data]/[slotDefId]/scegli/page.tsx`.** Il file nuovo, dall'alto in basso. Dove c'è scritto «identiche a oggi», copia le righe indicate dal file attuale, commenti compresi, senza toccarle.

```tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { AreaId, ClasseResiduo, Componente, Dish, Ingredient, MealSlot, MealSlotDef, OpzioneComponente, PantryState, Scelta, StatoSlot } from '@/domain/types';
import { leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiSettimana, aggiornaSlot, type SettimanaCorrente } from '@/data/settimana';
import { leggiSlotDefs, leggiImpostazioni } from '@/data/impostazioni';
import { leggiDispensa } from '@/data/dispensa';
import { leggiListe } from '@/data/lista';
import { giorniTra, lunediDi } from '@/domain/date';
import { residuoUtilizzabile } from '@/domain/pantry';
import { confezioniNecessarie } from '@/domain/confezioni';
import { convertiInUnitaBase } from '@/domain/unita';
import { conflittiSostituzione, type ConflittiSostituzioneInput, type ConflittoResiduo, type VoceListaConflitto } from '@/domain/conflitto';
import { etichettaScadenza } from '@/domain/scadenza';
import { formattaQuantita } from '@/domain/risparmio';
import { areeDelPiatto, cercaPiatti } from '@/domain/ricerca-piatti';
import { Testata } from '@/components/Testata';
import { Dock } from '@/components/Dock';
import { RigaPiatto } from '@/components/RigaPiatto';
import { CampoRicercaPiatti } from '@/components/CampoRicercaPiatti';
import { AggiungiTratteggiato } from '@/components/AggiungiTratteggiato';
import { MessaggioErrore } from '@/components/controlli';
import { RigaImpostazione } from '@/components/pannello/RigaImpostazione';
import { Carico, Nota } from '@/components/pannello/pezzi';

const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

// ⟨identica a oggi: `interface DatiScegli`, righe 23–61, con un solo cambio nel commento di
//   `dishIdOriginale` (riga 25), che diventa:
//   /** Piatto assegnato allo slot al caricamento: dice "ORA IN PROGRAMMA" nella sua sottoriga e serve da riferimento per capire se qualcosa è cambiato. */ ⟩

// ⟨identiche a oggi, righe 63–174, commenti compresi: `etichettaGiorno`, `testoNota`,
//   `testoConflitto`, `leggiListaSenzaBloccare`, `conflittiSenzaEsplodere`⟩

// ⟨le righe 176–190 (`areeDelPiatto` locale e il suo commento) spariscono: la funzione arriva
//   da `@/domain/ricerca-piatti` con la stessa firma (Task 1)⟩

// ⟨identiche a oggi, righe 192–313, commenti compresi: `opzioneCorrente`, `opzioneSuccessiva`,
//   `nomeOpzione`, `opzioneInCasa`, `ilPiattoOLeScelteSonoCambiate`, `scelteManualiDaMandare`⟩

/** Il ritorno al Piano: la pillola della Testata in modo indietro (spec fase 7 §A.2). */
type Indietro = { etichetta: string; ariaLabel: string; onTorna: () => void };

/**
 * `IN CASA` nella nota della Riga di impostazione del componente (spec §A.4): mono 10
 * in --ink. Fra i token non c'è un verde, e §C non vuole famiglie nuove.
 */
const STILE_IN_CASA = {
  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ink)',
} as const;

/**
 * Scegli il piatto: sostituzione per-pasto, non per-piatto. Nasce dal pasto
 * (data + slotDefId dalla rotta), mostra solo i piatti attivi di quello slot
 * e scrive solo `meal_slot.dish_id` di quel singolo slot — non tocca mai il
 * repertorio.
 *
 * Dalla fase 7 è una schermata del sistema (spec 2026-09-26 §A): la Testata in
 * modo indietro con la pillola del giorno e del pasto, la ricerca e le righe di
 * Piatti (la riga in modo «scegli»), i componenti come Righe di impostazione e
 * `SOSTITUISCI` nel Dock. I dati non cambiano: stesso caricamento, stessa
 * scelta, stesso patch di `aggiornaSlot`.
 */
export default function ScegliPiatto() {
  const { data: dataParam, slotDefId } = useParams<{ data: string; slotDefId: string }>();
  const router = useRouter();

  const [dati, setDati] = useState<DatiScegli | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [scelto, setScelto] = useState<string | null>(null);
  const [scelteCorrenti, setScelteCorrenti] = useState<Record<string, Scelta>>({});
  const [salvando, setSalvando] = useState(false);
  const [erroreSalva, setErroreSalva] = useState<string | null>(null);
  /** Il testo della ricerca: filtra le righe, non tocca la scelta (spec §A.3). */
  const [ricerca, setRicerca] = useState('');

  // ⟨identico a oggi: l'`useEffect` del caricamento, righe 333–406. La chiamata
  //   `areeDelPiatto(p, areaPerIngrediente, impostazioni.ordineAree)` (riga 373) resta
  //   scritta così: ora risolve all'import da `@/domain/ricerca-piatti`.⟩

  // ⟨identiche a oggi: `toccaComponente` e `confermaScelta`, righe 408–446, commenti compresi⟩

  const { minuscolo, numero } = etichettaGiorno(dataParam);
  const indietro: Indietro = { etichetta: 'PIANO', ariaLabel: 'Torna al piano', onTorna: () => router.push('/piano') };

  if (errore) {
    return (
      <Cornice indietro={indietro}>
        <div style={{ padding: '6px 16px' }}>
          <MessaggioErrore>{errore}</MessaggioErrore>
        </div>
      </Cornice>
    );
  }

  if (!dati) {
    // Come in Fine spesa (spec §A.6): la Testata è già disegnata, sotto una riga sola.
    return (
      <Cornice indietro={indietro}>
        <div style={{ padding: '6px 16px' }}>
          <Carico />
        </div>
      </Cornice>
    );
  }

  const cambiato = ilPiattoOLeScelteSonoCambiate(dati, scelto, scelteCorrenti);
  // La pillola sotto il titolo (spec §A.2): «Giovedì 27 · Cena» in sentence case, la
  // maiuscola la mette la Testata. Con una data illeggibile resta il solo pasto, come oggi.
  const giorno = minuscolo ? `${minuscolo.charAt(0).toUpperCase()}${minuscolo.slice(1)} ${numero}` : '';
  const pillola = giorno ? `${giorno} · ${dati.nomePasto}` : dati.nomePasto;
  const dishSelezionato = dati.piatti.find((p) => p.id === scelto) ?? null;
  const dispensaPerId = new Map(dati.dispensa.map((d) => [d.ingredientId, d]));
  const oggi = new Date().toISOString().slice(0, 10);
  const ingredienti = [...dati.ingredientiPerId.values()];
  const conflitti = cambiato && dishSelezionato
    ? conflittiSenzaEsplodere({
      slot: dati.slot,
      candidato: dishSelezionato,
      scelte: scelteCorrenti,
      slots: dati.slots,
      dishes: dati.tuttiIPiatti,
      ingredients: ingredienti,
      pantry: dati.dispensa,
      impostazioni: { moltiplicatorePorzioni: dati.moltiplicatorePorzioni },
      statoSettimana: dati.statoSettimana,
      vociLista: dati.vociLista,
      oggi,
    })
    : [];
  // L'ordine e il filtro di Piatti (spec §A.3). Il piatto scelto può uscire dal filtro:
  // resta scelto, e i suoi componenti restano sotto.
  const mostrati = cercaPiatti(dati.piatti, ingredienti, ricerca);

  return (
    <Cornice indietro={indietro} settimana={pillola}>
      {/* Fuori dallo scroller: resta ferma mentre l'elenco scorre, come in Piatti. */}
      <CampoRicercaPiatti valore={ricerca} onCambia={setRicerca} />

      <div
        className="sc scroll-app con-dock"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '2px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {mostrati.map((p) => (
          <RigaPiatto
            key={p.id}
            piatto={p}
            aree={dati.areePerPiatto.get(p.id) ?? []}
            modo="scegli"
            scelto={scelto === p.id}
            corrente={dati.dishIdOriginale === p.id}
            onScegli={() => setScelto(p.id)}
          />
        ))}

        {/* Il vuoto di ricerca di Piatti. Solo se il pasto ha dei piatti: senza, il vuoto
            non è della ricerca, e sotto c'è già CREA UN PIATTO NUOVO, come oggi. */}
        {mostrati.length === 0 && dati.piatti.length > 0 && (
          <div style={{ flexShrink: 0, padding: '44px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              Nessun piatto qui
            </div>
            <div style={{ fontSize: 14, color: 'var(--testo-2)' }}>Prova un&apos;altra parola, oppure aggiungine uno.</div>
          </div>
        )}

        {/* Sotto l'elenco (spec §A.4): componenti, conflitti e nota. Distacchi a margine e
            non a gap, perché la regione dei conflitti c'è anche vuota. */}
        <div style={{ flexShrink: 0, marginTop: 8, display: 'flex', flexDirection: 'column' }}>
          {dishSelezionato && dishSelezionato.componenti.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
              <h2 style={{ margin: 0, padding: '0 4px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
                COMPONENTI
              </h2>
              {/* Il widget bianco, raggio 22: una Riga di impostazione per componente, col
                  filetto fra l'una e l'altra come nel Blocco di gruppo. Il tocco passa
                  all'opzione dopo, senza foglio, come oggi. */}
              <div style={{ background: 'var(--superficie)', border: '1px solid var(--bordo)', borderRadius: 22, boxShadow: 'var(--ombra-pannello)', padding: '4px 12px' }}>
                {dishSelezionato.componenti.map((componente, i) => {
                  const opzione = opzioneCorrente(componente, scelteCorrenti);
                  const nomeOpz = nomeOpzione(opzione, dati.nomePerIngrediente);
                  const inCasa = opzioneInCasa(opzione, dati.ingredientiPerId, dispensaPerId, dati.moltiplicatorePorzioni, oggi);
                  return (
                    <div key={componente.id} style={{ borderTop: i > 0 ? '1px solid var(--bordo)' : 'none' }}>
                      <RigaImpostazione
                        nome={componente.nome}
                        etichetta={`Cambia ${componente.nome}: ora ${nomeOpz}`}
                        nota={inCasa ? <span style={STILE_IN_CASA}>IN CASA</span> : undefined}
                        finale={{ tipo: 'valore', valore: nomeOpz, onApri: () => toccaComponente(componente) }}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* L'Avviso in linea (DESIGN.md §8 Messaggi): la regione aria-live c'è sempre,
              così il primo conflitto che compare dopo un tocco viene annunciato. */}
          <div aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px', marginBottom: conflitti.length > 0 ? 12 : 0 }}>
            {conflitti.map((c) => (
              <p key={c.ingredientId} style={{ margin: 0, fontSize: 11.5, lineHeight: 1.45, color: 'var(--avviso)' }}>
                {testoConflitto(c, dati.slotDefs, oggi)}
              </p>
            ))}
          </div>

          <Nota>{testoNota(cambiato, dati.nomePasto, minuscolo)}</Nota>
        </div>

        {/* L'Aggiungi tratteggiato condiviso con Piatti (DESIGN.md §8 Tasti). In fondo e
            non in cima come in Piatti: qui si sceglie, creare è l'eccezione (spec §A.3).
            Il contenitore dà gli 8 in più di distacco dalla nota. */}
        <div style={{ flexShrink: 0, marginTop: 8 }}>
          <AggiungiTratteggiato etichetta="CREA UN PIATTO NUOVO" href="/piatti/nuovo" />
        </div>
      </div>

      <Dock>
        {erroreSalva && (
          // Sopra il Dock, come nell'editor dell'ingrediente: fuori dalla pillola, su fondo
          // bianco, perché sotto scorre la pagina.
          <p role="alert" style={{
            position: 'absolute', left: 0, right: 0, bottom: 'calc(100% + 8px)', margin: 0, padding: '10px 14px',
            borderRadius: 14, background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)',
            fontSize: 12.5, lineHeight: 1.45, color: 'var(--errore)',
          }}>
            {erroreSalva}
          </p>
        )}
        {/* Spento finché niente cambia e in volo: lo spento di `.dock-primario:disabled`
            (DESIGN.md §13, 26/09, punto 6), nessuna opacità. */}
        <button type="button" className="dock-primario" onClick={() => void confermaScelta()} disabled={!cambiato || salvando}>
          SOSTITUISCI
        </button>
      </Dock>
    </Cornice>
  );
}

/**
 * Colonna a tutta altezza con la Testata fissa in cima (titolo `Cosa mangi`, pillola
 * `PIANO`, sotto la pillola del giorno e del pasto): solo il corpo passato come children
 * scorre. Sostituisce l'intestazione minimale e il tasto secondario del piede di prima:
 * portavano tutti e due a `/piano`, come la pillola.
 */
function Cornice({ settimana, indietro, children }: { settimana?: string; indietro: Indietro; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Cosa mangi" settimana={settimana} indietro={indietro} />
      {children}
    </div>
  );
}
```

Cosa sparisce dal file, per esteso: gli import di `coloreArea` e di `Link` (il link a `/piatti/nuovo` lo fa ora `AggiungiTratteggiato`); `areeDelPiatto` locale (176–190); l'etichetta `DAL TUO REPERTORIO`; il `button` di riga scritto a mano con il badge e il tondo di selezione (497–586); i `button` dei componenti con il chip pieno (589–640); il riquadro dei conflitti in `--ink-2` (642–650); il link tratteggiato a 52 (652–673); l'errore di salvataggio in `--sec` (679); il piede `coda-barra` con `ANNULLA` e `SOSTITUISCI` (682–726); la `Cornice` con la freccia `Torna al Piano` (731–757); la classe `con-piede`.

Deviazioni di resa da oggi, volute: sparisce l'etichetta `DAL TUO REPERTORIO` (la spec non la nomina e Piatti non ce l'ha); la nota passa **prima** dell'Aggiungi (spec §A.4); l'errore di caricamento passa da `--sec` a `--errore` (`MessaggioErrore`); l'`aria-label` della pillola è «Torna al piano» (spec §A.2; la freccia di oggi diceva «Torna al Piano»); il vuoto di ricerca, copia del markup di `ElencoPiatti`, compare solo se il pasto ha dei piatti; la regione `aria-live` dei conflitti c'è sempre, anche vuota, così il primo conflitto che compare viene annunciato.

- [ ] **Step 4: verifica che passino**

Run: `npx vitest run "src/app/(app)/piano/[data]/[slotDefId]/scegli/__tests__/page.test.tsx" src/components/pannello/__tests__/riga-impostazione.test.tsx`
Expected: PASS, tutti (23 esistenti + 1 nuovo nel conflitto + 9 nel blocco nuovo; 6 in `riga-impostazione`).

Poi i test di chi usa già `RigaImpostazione`, che non devono cambiare:
Run: `npx vitest run src/components/pannello/__tests__/`
Expected: PASS.

- [ ] **Step 5: controlli**

```bash
grep -nE "#[0-9A-Fa-f]{3,8}\b|rgba\(" "src/app/(app)/piano/[data]/[slotDefId]/scegli/page.tsx"
```
Expected: nessuna riga (nessun colore scritto a mano, nessuna alfa).

```bash
grep -nE "#[0-9A-Fa-f]{3,8}\b|rgba\(" src/components/pannello/RigaImpostazione.tsx
grep -n $'\xc3\x83' "src/app/(app)/piano/[data]/[slotDefId]/scegli/page.tsx" "src/app/(app)/piano/[data]/[slotDefId]/scegli/__tests__/page.test.tsx" src/components/pannello/RigaImpostazione.tsx src/components/pannello/__tests__/riga-impostazione.test.tsx
grep -nE "ANNULLA|con-piede|coda-barra|Torna al Piano|coloreArea|DAL TUO REPERTORIO|next/link" "src/app/(app)/piano/[data]/[slotDefId]/scegli/page.tsx"
```
Expected: tutte e tre vuote.

Poi `npm test`, `npx tsc --noEmit`, `npm run lint`: tutti verdi.

- [ ] **Step 6: commit**

```bash
git add "src/app/(app)/piano/[data]/[slotDefId]/scegli/page.tsx"
git add "src/app/(app)/piano/[data]/[slotDefId]/scegli/__tests__/page.test.tsx"
git add src/components/pannello/RigaImpostazione.tsx
git add src/components/pannello/__tests__/riga-impostazione.test.tsx
git commit -m "feat(scegli): la schermata nel sistema, con la ricerca e le righe di Piatti e SOSTITUISCI nel Dock

La Testata in modo indietro con la pillola del giorno e del pasto; la Riga piatto
in modo scegli; i componenti come Righe di impostazione (RigaImpostazione prende
un'etichetta); i conflitti come Avviso in linea. Caricamento, scelta e patch di
aggiornaSlot invariati.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Test esistenti toccati (Task 3)**

- Tutti i 23 test di `scegli/__tests__/page.test.tsx`: `render(<ScegliPiatto />)` diventa `monta()`.
- *header ed etichetta usano il giorno e il pasto reali*: `GIOVEDÌ 27 · CENA` diventa `h1 Cosa mangi` più `Giovedì 27 · Cena`.
- *il piatto assegnato allo slot mostra il badge "ORA IN PROGRAMMA" ed è selezionato*: il nome del test cambia, e `getByText('ORA IN PROGRAMMA')` diventa `expect(rigaPollo).toHaveTextContent('ORA IN PROGRAMMA')`.
- *un piatto con componente a due opzioni mostra la riga del componente…*: `FARCITURA` diventa `Farcitura`.
- *il link "torna" e il bottone "annulla" puntano a /piano…*: riscritto come *la pillola PIANO della Testata porta a /piano…*, con il clic sulla pillola, `push('/piano')`, nessun `aggiornaSlot` e `ANNULLA` assente.
- Nessun test esistente di `src/components/pannello/__tests__/` cambia; `riga-impostazione.test.tsx` è nuovo.
- I test esistenti che leggono i valori dei componenti (`getByText('Ricotta')`, `'Noci'`, `'Prezzemolo'`, `'Basilico'`) non cambiano: il maiuscolo del valore è solo CSS, nel DOM resta il testo.

---

### Task 4: Il selettore degli ingredienti in un Foglio dal basso

**Files:**
- Create: `src/app/(app)/piatti/[id]/SelettoreIngrediente.tsx`
- Modify: `src/app/(app)/piatti/[id]/page.tsx` (l'import di `coloreArea` a riga 11; `normalizza` righe 87–98; lo stato `ricerca` a riga 145; `aggiungiIngrediente` righe 254–271; `disponibili` righe 585–589; il foglio scritto a mano righe 1079–1164)
- Test (nuovo): `src/app/(app)/piatti/[id]/__tests__/selettore.test.tsx`
- Test (modifica): `src/app/(app)/piatti/[id]/__tests__/page.test.tsx` (un test in più, un import in più)

**Interfaces:**
- Consumes: `FoglioDalBasso`, `TestataFoglio` da `@/components/FoglioDalBasso` (firme di oggi: `FoglioDalBasso({ etichetta, onChiudi, altezza?, ruolo?, chiudiDalVelo?, livello?, children })`, `TestataFoglio({ onChiudi, etichettaChiudi? = 'Chiudi il foglio', indietro?, children? })`); `Etichetta` da `@/components/controlli`; `coloreArea` da `@/domain/aree`.
- Produces (il Task 6 la usa così):

```ts
// src/app/(app)/piatti/[id]/SelettoreIngrediente.tsx
export interface PropsSelettoreIngrediente {
  ingredienti: Ingredient[];                       // quelli che si possono ancora aggiungere (li filtra la pagina)
  onScegli: (ingrediente: Ingredient) => void;     // il tocco su una voce; la pagina aggiunge e chiude
  onChiudi: () => void;                            // la X e il velo: chiude senza aggiungere
  hrefNuovo: string;                               // `/piatti/${id}/ingredienti/nuovo`
  onPrimaDiCreare: () => void;                     // mette al riparo la bozza prima di seguire hrefNuovo
}
export function SelettoreIngrediente(props: PropsSelettoreIngrediente): JSX.Element;
//   FoglioDalBasso etichetta="Aggiungi ingrediente" (altezza 'alto'), TestataFoglio con
//   <Etichetta>AGGIUNGI INGREDIENTE</Etichetta> e la X «Chiudi il foglio». La ricerca vive dentro
//   il componente: la pagina lo monta solo quando è aperto, quindi chiuderlo la azzera.
```

**Il comportamento non cambia.** Restano identici: la ricerca solo con più di 8 ingredienti (`nonAncoraNelPiatto.length > 8`), niente `autoFocus`, il filtro dentro il nome senza accenti né maiuscole (`normalizza`, spostata identica), i due testi del vuoto (`Nessun ingrediente per "…". Puoi crearlo qui sotto.` / `Hai già aggiunto tutti gli ingredienti del repertorio.`), il link `NUOVO INGREDIENTE` a `/piatti/{id}/ingredienti/nuovo` con `riparaBozzaPrimaDiUscire` sul click, il tocco che aggiunge e chiude, la chiusura dal velo. In questo task la pagina resta a due modi (vista e modifica).

- [ ] **Step 1: i test, prima**

1. Crea `src/app/(app)/piatti/[id]/__tests__/selettore.test.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { AreaId, Ingredient } from '@/domain/types';
import { SelettoreIngrediente } from '../SelettoreIngrediente';

function ingrediente(id: string, nome: string, area: AreaId = 'dispensa'): Ingredient {
  return {
    id, nome, unitaBase: 'g', area, classeResiduo: 'porzionabile', deperibile: false,
    formatoConfezione: 100, prezzoConfezione: null, ean: null,
  };
}

const YOGURT = ingrediente('i-1', 'Yogurt greco', 'latticini');
const AVENA = ingrediente('i-2', "Fiocchi d'avena", 'cereali');
const MOLTI = Array.from({ length: 12 }, (_, i) => ingrediente(`r-${i}`, `Riempitivo ${i}`));
const CAFFE = ingrediente('i-caffe', 'Caffè');

function apri(ingredienti: Ingredient[] = [YOGURT, AVENA]) {
  const onScegli = vi.fn();
  const onChiudi = vi.fn();
  const onPrimaDiCreare = vi.fn();
  render(
    <SelettoreIngrediente
      ingredienti={ingredienti}
      onScegli={onScegli}
      onChiudi={onChiudi}
      hrefNuovo="/piatti/d-1/ingredienti/nuovo"
      onPrimaDiCreare={onPrimaDiCreare}
    />,
  );
  return { onScegli, onChiudi, onPrimaDiCreare };
}

describe('SelettoreIngrediente (spec fase 7 §B.4)', () => {
  it('è un Foglio dal basso: un dialogo «Aggiungi ingrediente», AGGIUNGI INGREDIENTE in testata e la X', () => {
    apri();
    const foglio = screen.getByRole('dialog', { name: 'Aggiungi ingrediente' });
    expect(within(foglio).getByText('AGGIUNGI INGREDIENTE')).toBeInTheDocument();
    expect(within(foglio).getByRole('button', { name: 'Chiudi il foglio' })).toBeInTheDocument();
    expect(within(foglio).getByRole('button', { name: 'Yogurt greco' })).toBeInTheDocument();
    expect(within(foglio).getByRole('button', { name: "Fiocchi d'avena" })).toBeInTheDocument();
  });

  it('il tocco su una voce la passa a onScegli, e basta: chiudere è della pagina', () => {
    const { onScegli, onChiudi } = apri();
    fireEvent.click(screen.getByRole('button', { name: 'Yogurt greco' }));
    expect(onScegli).toHaveBeenCalledWith(YOGURT);
    expect(onChiudi).not.toHaveBeenCalled();
  });

  it('la X e il velo chiudono senza scegliere', () => {
    const { onScegli, onChiudi } = apri();
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi il foglio' }));
    expect(onChiudi).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('velo-foglio'));
    expect(onChiudi).toHaveBeenCalledTimes(2);
    expect(onScegli).not.toHaveBeenCalled();
  });

  it('la ricerca compare solo con più di otto ingredienti', () => {
    apri(MOLTI.slice(0, 8));
    expect(screen.queryByLabelText('Cerca un ingrediente')).toBeNull();
  });

  it('con nove ingredienti la ricerca c’è, senza fuoco automatico', () => {
    apri(MOLTI.slice(0, 9));
    const campo = screen.getByLabelText('Cerca un ingrediente');
    expect(campo).toHaveAttribute('placeholder', 'Cerca');
    expect(campo).not.toHaveFocus();
  });

  it('la ricerca filtra dentro il nome, senza accenti e senza maiuscole', () => {
    apri([...MOLTI, CAFFE]);
    fireEvent.change(screen.getByLabelText('Cerca un ingrediente'), { target: { value: 'CAFFE' } });
    expect(screen.getByRole('button', { name: 'Caffè' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Riempitivo 0' })).toBeNull();

    fireEvent.change(screen.getByLabelText('Cerca un ingrediente'), { target: { value: 'pitivo 1' } });
    expect(screen.getByRole('button', { name: 'Riempitivo 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Riempitivo 11' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Riempitivo 2' })).toBeNull();
  });

  it('senza risultati propone di crearlo, e il link resta', () => {
    apri(MOLTI);
    fireEvent.change(screen.getByLabelText('Cerca un ingrediente'), { target: { value: ' zafferano ' } });
    expect(screen.getByText('Nessun ingrediente per "zafferano". Puoi crearlo qui sotto.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /NUOVO\s*INGREDIENTE/ })).toBeInTheDocument();
  });

  it('con tutti gli ingredienti già nel piatto lo dice', () => {
    apri([]);
    expect(screen.getByText('Hai già aggiunto tutti gli ingredienti del repertorio.')).toBeInTheDocument();
  });

  it('NUOVO INGREDIENTE porta alla creazione e mette al riparo la bozza prima di uscire', () => {
    const { onPrimaDiCreare } = apri();
    const link = screen.getByRole('link', { name: /NUOVO\s*INGREDIENTE/ });
    expect(link).toHaveAttribute('href', '/piatti/d-1/ingredienti/nuovo');
    fireEvent.click(link);
    expect(onPrimaDiCreare).toHaveBeenCalledTimes(1);
  });

  it('le voci e il link sono alti almeno 44', () => {
    apri();
    expect(screen.getByRole('button', { name: 'Yogurt greco' }).style.minHeight).toBe('44px');
    expect(screen.getByRole('link', { name: /NUOVO\s*INGREDIENTE/ }).style.minHeight).toBe('44px');
  });
});
```

2. In `src/app/(app)/piatti/[id]/__tests__/page.test.tsx`:
   - l'import di Testing Library diventa `import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';`
   - aggiungi, subito dopo il test *'senza risultati suggerisce di crearlo invece di lasciare il vuoto'*:

```tsx
  it('il selettore degli ingredienti è un Foglio dal basso: la X lo chiude senza aggiungere niente', async () => {
    render(<Piatto />);
    await screen.findByPlaceholderText('Dai un nome al piatto');
    fireEvent.click(screen.getByRole('button', { name: /AGGIUNGI\s*INGREDIENTE/ }));

    const foglio = screen.getByRole('dialog', { name: 'Aggiungi ingrediente' });
    expect(within(foglio).getByRole('button', { name: 'Yogurt greco' })).toBeInTheDocument();
    fireEvent.click(within(foglio).getByRole('button', { name: 'Chiudi il foglio' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByLabelText('Grammatura di Yogurt greco')).toBeNull();
  });
```

   Nessun altro test del file cambia: i selettori che usano (`/AGGIUNGI\s*INGREDIENTE/`, il testo dell'ingrediente, `Cerca un ingrediente`, `/Nessun ingrediente per "zafferano"/`, il link `/NUOVO\s*INGREDIENTE/`) restano validi dentro il foglio.

- [ ] **Step 2: verifica che falliscano**

Run: `npx vitest run "src/app/(app)/piatti/[id]/__tests__/selettore.test.tsx" "src/app/(app)/piatti/[id]/__tests__/page.test.tsx"`
Expected: FAIL. `selettore.test.tsx` non trova il modulo `../SelettoreIngrediente`; in `page.test.tsx` fallisce solo il test nuovo (`Unable to find role="dialog" and name "Aggiungi ingrediente"`: il foglio di oggi è un `div` senza ruolo).

- [ ] **Step 3: l'implementazione**

1. Crea `src/app/(app)/piatti/[id]/SelettoreIngrediente.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Ingredient } from '@/domain/types';
import { coloreArea } from '@/domain/aree';
import { FoglioDalBasso, TestataFoglio } from '@/components/FoglioDalBasso';
import { Etichetta } from '@/components/controlli';

/**
 * Sopra questa soglia compare la ricerca. Niente autoFocus: su un telefono
 * aprirebbe la tastiera addosso alla lista, e chi vuole solo scorrere si
 * troverebbe metà schermo occupato senza averlo chiesto. Compare solo quando
 * la lista è abbastanza lunga da rendere lo scorrimento peggiore della
 * digitazione.
 */
const SOGLIA_RICERCA = 8;

/**
 * Confronto tollerante agli accenti: chi cerca "caffe" deve trovare "Caffè",
 * perché sulla tastiera del telefono l'accento costa un tocco in più e
 * nessuno lo mette per cercare.
 */
function normalizza(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export interface PropsSelettoreIngrediente {
  /**
   * Gli ingredienti che si possono ancora aggiungere: il catalogo meno quelli
   * già nella lista di destinazione. Li filtra la pagina, che sa se il
   * selettore è aperto sugli ingredienti del piatto o su un'opzione.
   */
  ingredienti: Ingredient[];
  /** Il tocco su una voce: la pagina aggiunge la riga e chiude il selettore. */
  onScegli: (ingrediente: Ingredient) => void;
  /** La X e il velo: chiude senza aggiungere. */
  onChiudi: () => void;
  /** Dove si crea un ingrediente nuovo: `/piatti/{id}/ingredienti/nuovo`. */
  hrefNuovo: string;
  /** Chiamata prima di seguire `hrefNuovo`: mette al riparo la bozza del piatto, che vive solo in memoria. */
  onPrimaDiCreare: () => void;
}

/**
 * Il selettore degli ingredienti dell'editor del Piatto, in un Foglio dal
 * basso (spec fase 7 §B.4, DESIGN.md §8). Prima era un foglio scritto a mano
 * dentro la pagina; il comportamento è lo stesso: la ricerca solo con la
 * lista lunga, il filtro senza accenti dentro il nome, il vuoto che propone di
 * creare, il link alla creazione con la bozza messa al riparo.
 *
 * La ricerca vive qui e non nella pagina: la pagina monta il selettore solo
 * quando è aperto, quindi chiuderlo (o aggiungere un ingrediente) la azzera, e
 * riaprendolo si riparte dall'elenco intero, come prima.
 */
export function SelettoreIngrediente({ ingredienti, onScegli, onChiudi, hrefNuovo, onPrimaDiCreare }: PropsSelettoreIngrediente) {
  const [ricerca, setRicerca] = useState('');
  // La ricerca cerca dentro il nome, non solo all'inizio: "pomo" trova sia
  // "Pomodori" sia "Passata di pomodoro".
  const disponibili = ricerca.trim()
    ? ingredienti.filter((i) => normalizza(i.nome).includes(normalizza(ricerca)))
    : ingredienti;

  return (
    <FoglioDalBasso etichetta="Aggiungi ingrediente" onChiudi={onChiudi}>
      <TestataFoglio onChiudi={onChiudi}>
        <Etichetta>AGGIUNGI INGREDIENTE</Etichetta>
      </TestataFoglio>

      {/* Fuori dallo scroller: resta ferma mentre la lista scorre. */}
      {ingredienti.length > SOGLIA_RICERCA && (
        <div style={{ padding: '12px 16px 0' }}>
          <input
            type="search"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca"
            aria-label="Cerca un ingrediente"
            style={{
              display: 'block', width: '100%', height: 44, boxSizing: 'border-box', padding: '0 14px',
              borderRadius: 14, border: '1px solid var(--bordo)', background: 'var(--superficie)',
              boxShadow: 'var(--ombra-pannello)', fontFamily: 'inherit', fontSize: 15, color: 'var(--ink)', outline: 'none',
            }}
          />
        </div>
      )}

      <div
        className="sc corpo-foglio"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 26px', display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        {disponibili.length === 0 && (
          <p style={{ margin: 0, padding: '8px 6px', fontSize: 13, lineHeight: 1.45, color: 'var(--testo-2)' }}>
            {ricerca.trim()
              ? `Nessun ingrediente per "${ricerca.trim()}". Puoi crearlo qui sotto.`
              : 'Hai già aggiunto tutti gli ingredienti del repertorio.'}
          </p>
        )}
        {disponibili.map((ing) => (
          <button
            key={ing.id}
            type="button"
            onClick={() => onScegli(ing)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 6px', minHeight: 44, borderRadius: 14 }}
          >
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2.6, flex: 'none', background: coloreArea(ing.area) }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{ing.nome}</span>
          </button>
        ))}
        {/* Disponibile anche aprendo il selettore da un'opzione: `onPrimaDiCreare`
            mette al riparo anche `componenti` (vedi BozzaPiatto in bozza.ts), quindi
            il viaggio verso la creazione dell'ingrediente e ritorno non perde le
            modifiche fatte ai componenti fino a quel momento. */}
        <Link
          href={hrefNuovo}
          onClick={onPrimaDiCreare}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 6px', minHeight: 44, textDecoration: 'none' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ink)' }}>
            NUOVO INGREDIENTE
          </span>
        </Link>
      </div>
    </FoglioDalBasso>
  );
}
```

2. In `src/app/(app)/piatti/[id]/page.tsx` (con Edit, una modifica alla volta):
   - riga 11: `import { coloreArea, nomeArea } from '@/domain/aree';` → `import { nomeArea } from '@/domain/aree';`
   - dopo `import { raccogliIngredienteCreato, riprendiBozza, salvaBozza, scartaBozza } from './bozza';` aggiungi `import { SelettoreIngrediente } from './SelettoreIngrediente';`
   - togli `normalizza` e il suo commento (righe 87–98): si è spostata identica nel selettore.
   - togli `const [ricerca, setRicerca] = useState('');` (riga 145).
   - `aggiungiIngrediente` (righe 254–271) diventa:

```tsx
  /**
   * Unico punto in cui il selettore aggiunge davvero un ingrediente,
   * qualunque sia il target aperto: alla lista fissa `ingredienti` o alle
   * righe di un'opzione. Stesso selettore, stesso comportamento di sempre,
   * solo con una destinazione in più. Chiuderlo smonta `SelettoreIngrediente`
   * e con lui la ricerca: riaprendolo si riparte dall'elenco intero, perché la
   * ricerca di prima non ha niente a che vedere con l'ingrediente successivo.
   */
  function aggiungiIngrediente(ing: Ingredient) {
    if (!selettore) return;
    if (selettore.tipo === 'principale') {
      setIngredienti((prev) => [...prev, { ingredientId: ing.id, quantita: 0, unita: ing.unitaBase }]);
    } else {
      aggiungiRigaOpzione(selettore.componenteId, selettore.opzioneId, ing);
    }
    setSelettore(null);
  }
```

   - togli il calcolo di `disponibili` col suo commento (righe 585–589, da `// La ricerca cerca dentro il nome` a `: nonAncoraNelPiatto;`). `righeTargetSelettore` e `nonAncoraNelPiatto` restano identici.
   - il blocco `{selettore && ( <div onClick=… > … </div> )}` (righe 1079–1164, il foglio scritto a mano con il raggio `22px 22px 0 0`) diventa:

```tsx
      {selettore && (
        <SelettoreIngrediente
          ingredienti={nonAncoraNelPiatto}
          onScegli={aggiungiIngrediente}
          onChiudi={() => setSelettore(null)}
          hrefNuovo={`/piatti/${id}/ingredienti/nuovo`}
          onPrimaDiCreare={riparaBozzaPrimaDiUscire}
        />
      )}
```

   `Link` resta importato: lo usa ancora la `Cornice` (via al Task 6).

- [ ] **Step 4: verifica che passino**

Run: `npx vitest run "src/app/(app)/piatti/[id]" "src/app/(app)/piatti/__tests__/vista.test.tsx"`
Expected: PASS, tutti (selettore, page, bozza, vista).

- [ ] **Step 5: controlli**

- `grep -nE "#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}\b|rgba\(" "src/app/(app)/piatti/[id]/SelettoreIngrediente.tsx"` → nessuna riga.
- `grep -n "22px 22px 0 0\|setRicerca\|normalizza" "src/app/(app)/piatti/[id]/page.tsx"` → nessuna riga.
- `grep -n $'\xc3\x83' "src/app/(app)/piatti/[id]/SelettoreIngrediente.tsx" "src/app/(app)/piatti/[id]/page.tsx" "src/app/(app)/piatti/[id]/__tests__/selettore.test.tsx" "src/app/(app)/piatti/[id]/__tests__/page.test.tsx"` → vuoto.
- `npm test`, `npx tsc --noEmit`, `npm run lint`: verdi.

- [ ] **Step 6: commit**

```bash
git add "src/app/(app)/piatti/[id]/SelettoreIngrediente.tsx" "src/app/(app)/piatti/[id]/page.tsx" "src/app/(app)/piatti/[id]/__tests__/selettore.test.tsx" "src/app/(app)/piatti/[id]/__tests__/page.test.tsx"
git commit -m "feat(piatto): il selettore degli ingredienti in un Foglio dal basso, in un file a sé

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Test esistenti toccati (Task 4)**

- `src/app/(app)/piatti/[id]/__tests__/page.test.tsx`: solo l'import di `within` e un test nuovo (*il selettore degli ingredienti è un Foglio dal basso…*). Gli altri test del selettore (*il selettore ha un campo di ricerca solo quando la lista e lunga*, *la ricerca filtra per nome…*, *senza risultati suggerisce di crearlo…*, *mette al riparo la bozza quando si esce a creare un ingrediente*) restano come sono.
- Non toccati: `vista.test.tsx`, `bozza.test.ts`.

---

### Task 5: I componenti a scelta

**Files:**
- Create: `src/app/(app)/piatti/[id]/ComponentiPiatto.tsx`
- Modify: `src/app/(app)/piatti/[id]/page.tsx` (le tre costanti `TESTO_COMPONENTE_SENZA_NOME`, `TESTO_OPZIONE_SENZA_RIGHE`, `TESTO_OPZIONE_QUANTITA`, righe 29–36 di oggi; i tre calcoli `componentiSenzaNome`, `opzioniSenzaRighe`, `quantitaNonValideOpzioni`, righe 606–613 di oggi; il blocco da `COMPONENTI A SCELTA` al terzo messaggio, righe 794–955 di oggi. Dopo il Task 4 i numeri scendono di circa 20: cerca per contenuto)
- Test (nuovo): `src/app/(app)/piatti/[id]/__tests__/componenti.test.tsx`

**Interfaces:**
- Consumes: `AggiungiTratteggiato({ etichetta, ariaLabel?, onClick })` da `@/components/AggiungiTratteggiato` (Task 1, qui nel modo con `onClick`: un `button`); `TesseraIngrediente` (firma di oggi, invariata dopo `icone-ingredienti`: `nome, area, quantita, unita, onCambiaQuantita, onRimuovi, quantitaValida?, hrefModifica?, onPrimaDiModificare?`); `TondoIcona({ etichetta, spento?, onClick, children })` e `IconaCroce({ spenta })` da `@/components/pannello/pezzi`; `Etichetta`, `MessaggioErrore`, `TastoSecondario` da `@/components/controlli`.
- Produces (il Task 6 la usa così):

```ts
// src/app/(app)/piatti/[id]/ComponentiPiatto.tsx
export interface PropsComponentiPiatto {
  componenti: Componente[];
  catalogoPerId: Map<string, Ingredient>;
  onAggiungiComponente: () => void;
  onRimuoviComponente: (componenteId: string) => void;
  onCambiaNomeComponente: (componenteId: string, nome: string) => void;
  onAggiungiOpzione: (componenteId: string) => void;
  onRimuoviOpzione: (componenteId: string, opzioneId: string) => void;
  onAggiungiIngrediente: (componenteId: string, opzioneId: string) => void;   // apre il selettore su quell'opzione
  onCambiaQuantita: (componenteId: string, opzioneId: string, ingredientId: string, quantita: number) => void;
  onRimuoviRiga: (componenteId: string, opzioneId: string, ingredientId: string) => void;
}
export function ComponentiPiatto(props: PropsComponentiPiatto): JSX.Element;
//   Rende un frammento: <Etichetta>COMPONENTI A SCELTA</Etichetta>, un widget per componente
//   (<section aria-label="Componente N">), AGGIUNGI COMPONENTE, i tre messaggi di validità.
//   Chi lo usa lo mette in una colonna con gap (il Task 6 in un <Blocco>).
```

**La struttura dati e le callback non cambiano:** le funzioni di oggi della pagina (`aggiungiComponente`, `rimuoviComponente`, `cambiaNomeComponente`, `aggiungiOpzione`, `rimuoviOpzione`, `cambiaQuantitaOpzione`, `rimuoviRigaOpzione`, `setSelettore({ tipo: 'opzione', … })`) restano nella pagina, identiche, e si passano al componente. Restano identici gli `aria-label` di oggi: `Nome del componente N`, `Elimina componente N`, `Elimina opzione J del componente N`, `Aggiungi ingrediente all'opzione J del componente N`; e i tre testi, apostrofo dritto di `l'opzione` compreso. Cambia la resa (spec §B.3 punto 4): widget bianco raggio 22; ✕ come tondi 44 (`TondoIcona` + `IconaCroce`); `AGGIUNGI INGREDIENTE` per opzione e `AGGIUNGI COMPONENTE` come `AggiungiTratteggiato` condiviso (Task 1); `AGGIUNGI OPZIONE` come `TastoSecondario` (via il fondo 0,05); i tre messaggi in `--errore` (oggi `--sec`): nascono da un dato scritto male dall'utente (componente senza nome, opzione senza righe, grammatura mancante).

- [ ] **Step 1: i test, prima** — crea `src/app/(app)/piatti/[id]/__tests__/componenti.test.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { AreaId, Componente, Ingredient } from '@/domain/types';
import { ComponentiPiatto } from '../ComponentiPiatto';

function ingrediente(id: string, nome: string, area: AreaId = 'dispensa'): Ingredient {
  return {
    id, nome, unitaBase: 'g', area, classeResiduo: 'porzionabile', deperibile: false,
    formatoConfezione: 100, prezzoConfezione: null, ean: null,
  };
}

const FARINA = ingrediente('i-2', 'Farina');
const PANE_INTEGRALE = ingrediente('i-3', 'Pane integrale', 'cereali');
const CATALOGO = new Map([[FARINA.id, FARINA], [PANE_INTEGRALE.id, PANE_INTEGRALE]]);

const PANE: Componente = {
  id: 'c-1',
  nome: 'Pane',
  opzioni: [
    { id: 'o-1', righe: [{ ingredientId: 'i-2', quantita: 50, unita: 'g' }] },
    { id: 'o-2', righe: [{ ingredientId: 'i-3', quantita: 40, unita: 'g' }] },
  ],
};

const TESTO_COMPONENTE_SENZA_NOME = 'Dai un nome a ogni componente: senza, non si distinguerebbe in Scegli.';
const TESTO_OPZIONE_SENZA_RIGHE = "Ogni opzione deve avere almeno un ingrediente: aggiungine uno o elimina l'opzione.";
const TESTO_OPZIONE_QUANTITA =
  'Manca la grammatura di uno o più ingredienti nelle opzioni: tocca il numero sulla tessera e scrivi quanto ne usi.';

function rendi(componenti: Componente[] = [PANE]) {
  const cb = {
    onAggiungiComponente: vi.fn(),
    onRimuoviComponente: vi.fn(),
    onCambiaNomeComponente: vi.fn(),
    onAggiungiOpzione: vi.fn(),
    onRimuoviOpzione: vi.fn(),
    onAggiungiIngrediente: vi.fn(),
    onCambiaQuantita: vi.fn(),
    onRimuoviRiga: vi.fn(),
  };
  render(<ComponentiPiatto componenti={componenti} catalogoPerId={CATALOGO} {...cb} />);
  return cb;
}

describe('ComponentiPiatto (spec fase 7 §B.3 punto 4)', () => {
  it('ogni componente è un widget bianco a raggio 22, col nome, le opzioni e le loro tessere', () => {
    rendi();
    expect(screen.getByText('COMPONENTI A SCELTA')).toBeInTheDocument();
    const widget = screen.getByRole('region', { name: 'Componente 1' });
    expect(widget.style.borderRadius).toBe('22px');
    expect(widget.style.background).toBe('var(--superficie)');
    expect(within(widget).getByDisplayValue('Pane')).toBeInTheDocument();
    expect(within(widget).getByText('OPZIONE 1')).toBeInTheDocument();
    expect(within(widget).getByText('OPZIONE 2')).toBeInTheDocument();
    expect(within(widget).getByText('Farina')).toBeInTheDocument();
    expect(within(widget).getByText('Pane integrale')).toBeInTheDocument();
  });

  it('il campo del nome è alto 44 e chiama onCambiaNomeComponente', () => {
    const cb = rendi();
    const campo = screen.getByLabelText('Nome del componente 1');
    expect(campo.style.height).toBe('44px');
    fireEvent.change(campo, { target: { value: 'Pane nero' } });
    expect(cb.onCambiaNomeComponente).toHaveBeenCalledWith('c-1', 'Pane nero');
  });

  it('le ✕ di componente e di opzione sono tondi 44 con gli aria-label di oggi', () => {
    const cb = rendi();
    const viaComponente = screen.getByRole('button', { name: 'Elimina componente 1' });
    expect(viaComponente.style.width).toBe('44px');
    expect(viaComponente.style.height).toBe('44px');
    expect(viaComponente.style.borderRadius).toBe('999px');
    fireEvent.click(viaComponente);
    expect(cb.onRimuoviComponente).toHaveBeenCalledWith('c-1');

    const viaOpzione = screen.getByRole('button', { name: 'Elimina opzione 2 del componente 1' });
    expect(viaOpzione.style.width).toBe('44px');
    fireEvent.click(viaOpzione);
    expect(cb.onRimuoviOpzione).toHaveBeenCalledWith('c-1', 'o-2');
  });

  it('AGGIUNGI INGREDIENTE di un’opzione è un Aggiungi tratteggiato e apre il selettore su quell’opzione', () => {
    const cb = rendi();
    const aggiungi = screen.getByRole('button', { name: "Aggiungi ingrediente all'opzione 2 del componente 1" });
    expect(aggiungi).toHaveTextContent('AGGIUNGI INGREDIENTE');
    expect(aggiungi.style.height).toBe('56px');
    expect(aggiungi.style.border).toBe('2px dashed var(--bordo-tratteggio)');
    fireEvent.click(aggiungi);
    expect(cb.onAggiungiIngrediente).toHaveBeenCalledWith('c-1', 'o-2');
  });

  it('AGGIUNGI OPZIONE è un tasto secondario, senza il fondo 0,05', () => {
    const cb = rendi();
    const opzione = screen.getByRole('button', { name: 'AGGIUNGI OPZIONE' });
    expect(opzione.style.background).toBe('var(--superficie)');
    expect(opzione.style.height).toBe('54px');
    fireEvent.click(opzione);
    expect(cb.onAggiungiOpzione).toHaveBeenCalledWith('c-1');
  });

  it('AGGIUNGI COMPONENTE è l’Aggiungi tratteggiato sotto i widget', () => {
    const cb = rendi();
    const aggiungi = screen.getByRole('button', { name: 'AGGIUNGI COMPONENTE' });
    expect(aggiungi.style.height).toBe('56px');
    expect(aggiungi.style.border).toBe('2px dashed var(--bordo-tratteggio)');
    fireEvent.click(aggiungi);
    expect(cb.onAggiungiComponente).toHaveBeenCalledTimes(1);
  });

  it('grammatura e rimozione di una riga passano componente, opzione e ingrediente', () => {
    const cb = rendi();
    fireEvent.change(screen.getByLabelText('Grammatura di Farina'), { target: { value: '60' } });
    expect(cb.onCambiaQuantita).toHaveBeenCalledWith('c-1', 'o-1', 'i-2', 60);
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Pane integrale' }));
    expect(cb.onRimuoviRiga).toHaveBeenCalledWith('c-1', 'o-2', 'i-3');
  });

  it('un componente senza nome e un’opzione senza righe: i due messaggi, in --errore', () => {
    rendi([{ id: 'c-9', nome: '  ', opzioni: [{ id: 'o-9', righe: [] }] }]);
    expect(screen.getByText(TESTO_COMPONENTE_SENZA_NOME).style.color).toBe('var(--errore)');
    expect(screen.getByText(TESTO_OPZIONE_SENZA_RIGHE).style.color).toBe('var(--errore)');
    // Con un'opzione vuota la grammatura non si nomina: prima va aggiunto un ingrediente.
    expect(screen.queryByText(TESTO_OPZIONE_QUANTITA)).toBeNull();
  });

  it('una riga a grammatura 0 chiede la grammatura, in --errore, e la tessera la segnala', () => {
    rendi([{ ...PANE, opzioni: [{ id: 'o-1', righe: [{ ingredientId: 'i-2', quantita: 0, unita: 'g' }] }] }]);
    expect(screen.getByText(TESTO_OPZIONE_QUANTITA).style.color).toBe('var(--errore)');
    expect(screen.getByText('Farina').closest('[data-quantita-valida]')).toHaveAttribute('data-quantita-valida', 'false');
  });

  it('senza componenti: l’etichetta e AGGIUNGI COMPONENTE, nessun messaggio', () => {
    rendi([]);
    expect(screen.getByText('COMPONENTI A SCELTA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AGGIUNGI COMPONENTE' })).toBeInTheDocument();
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.queryByText(TESTO_COMPONENTE_SENZA_NOME)).toBeNull();
    expect(screen.queryByText(TESTO_OPZIONE_SENZA_RIGHE)).toBeNull();
  });
});
```

- [ ] **Step 2: verifica che falliscano**

Run: `npx vitest run "src/app/(app)/piatti/[id]/__tests__/componenti.test.tsx"`
Expected: FAIL, il modulo `../ComponentiPiatto` non esiste.

- [ ] **Step 3: l'implementazione**

1. Crea `src/app/(app)/piatti/[id]/ComponentiPiatto.tsx`:

```tsx
'use client';

import type { Componente, Ingredient } from '@/domain/types';
import { AggiungiTratteggiato } from '@/components/AggiungiTratteggiato';
import { TesseraIngrediente } from '@/components/TesseraIngrediente';
import { Etichetta, MessaggioErrore, TastoSecondario } from '@/components/controlli';
import { IconaCroce, TondoIcona } from '@/components/pannello/pezzi';

const TESTO_COMPONENTE_SENZA_NOME =
  'Dai un nome a ogni componente: senza, non si distinguerebbe in Scegli.';

const TESTO_OPZIONE_SENZA_RIGHE =
  "Ogni opzione deve avere almeno un ingrediente: aggiungine uno o elimina l'opzione.";

const TESTO_OPZIONE_QUANTITA =
  'Manca la grammatura di uno o più ingredienti nelle opzioni: tocca il numero sulla tessera e scrivi quanto ne usi.';

export interface PropsComponentiPiatto {
  componenti: Componente[];
  catalogoPerId: Map<string, Ingredient>;
  onAggiungiComponente: () => void;
  onRimuoviComponente: (componenteId: string) => void;
  onCambiaNomeComponente: (componenteId: string, nome: string) => void;
  onAggiungiOpzione: (componenteId: string) => void;
  onRimuoviOpzione: (componenteId: string, opzioneId: string) => void;
  /** Apre il selettore degli ingredienti su quell'opzione (lo stesso selettore degli ingredienti del piatto). */
  onAggiungiIngrediente: (componenteId: string, opzioneId: string) => void;
  onCambiaQuantita: (componenteId: string, opzioneId: string, ingredientId: string, quantita: number) => void;
  onRimuoviRiga: (componenteId: string, opzioneId: string, ingredientId: string) => void;
}

/**
 * I componenti a scelta dell'editor del Piatto (spec fase 7 §B.3 punto 4): la
 * struttura di oggi con i pezzi del sistema. Ogni componente è un widget
 * bianco a raggio 22 col nome, le opzioni con le loro tessere e i due modi di
 * aggiungere; le ✕ sono tondi 44. Lo stato resta tutto nella pagina: qui si
 * disegna e si chiamano le callback.
 *
 * I tre messaggi dicono *cosa* manca, con le stesse tre condizioni di
 * `componentiNonValidi` nella pagina, separate: come fa la pagina con le
 * grammature degli ingredienti fissi.
 */
export function ComponentiPiatto({
  componenti, catalogoPerId, onAggiungiComponente, onRimuoviComponente, onCambiaNomeComponente,
  onAggiungiOpzione, onRimuoviOpzione, onAggiungiIngrediente, onCambiaQuantita, onRimuoviRiga,
}: PropsComponentiPiatto) {
  const componentiSenzaNome = componenti.filter((c) => c.nome.trim() === '');
  const opzioniSenzaRighe = componenti.flatMap((c) => c.opzioni.filter((o) => o.righe.length === 0));
  const quantitaNonValideOpzioni = new Set(
    componenti.flatMap((c) => c.opzioni).flatMap((o) => o.righe.filter((r) => r.quantita <= 0).map((r) => `${o.id}|${r.ingredientId}`)),
  );

  return (
    <>
      <Etichetta>COMPONENTI A SCELTA</Etichetta>

      {componenti.map((componente, indiceComponente) => (
        <section
          key={componente.id}
          aria-label={`Componente ${indiceComponente + 1}`}
          style={{
            background: 'var(--superficie)', borderRadius: 22, border: '1px solid var(--bordo)', boxShadow: 'var(--ombra-pannello)',
            padding: '14px 12px 12px', display: 'flex', flexDirection: 'column', gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              value={componente.nome}
              onChange={(e) => onCambiaNomeComponente(componente.id, e.target.value)}
              placeholder="Nome del componente"
              aria-label={`Nome del componente ${indiceComponente + 1}`}
              style={{
                flex: 1, minWidth: 0, height: 44, boxSizing: 'border-box', padding: '0 14px', borderRadius: 14,
                border: '1px solid var(--bordo)', background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 600, color: 'var(--ink)', outline: 'none',
              }}
            />
            <TondoIcona etichetta={`Elimina componente ${indiceComponente + 1}`} onClick={() => onRimuoviComponente(componente.id)}>
              <IconaCroce spenta={false} />
            </TondoIcona>
          </div>

          {componente.opzioni.map((opzione, indiceOpzione) => {
            const righeNonValideOpzione = new Set(
              opzione.righe.filter((r) => r.quantita <= 0).map((r) => r.ingredientId),
            );
            return (
              <div key={opzione.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingLeft: 4 }}>
                  <Etichetta>{`OPZIONE ${indiceOpzione + 1}`}</Etichetta>
                  <TondoIcona
                    etichetta={`Elimina opzione ${indiceOpzione + 1} del componente ${indiceComponente + 1}`}
                    onClick={() => onRimuoviOpzione(componente.id, opzione.id)}
                  >
                    <IconaCroce spenta={false} />
                  </TondoIcona>
                </div>

                {opzione.righe.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                    {opzione.righe.map((riga) => {
                      const ing = catalogoPerId.get(riga.ingredientId);
                      if (!ing) return null;
                      return (
                        <TesseraIngrediente
                          key={riga.ingredientId}
                          nome={ing.nome}
                          area={ing.area}
                          quantita={riga.quantita}
                          unita={riga.unita}
                          onCambiaQuantita={(q) => onCambiaQuantita(componente.id, opzione.id, riga.ingredientId, q)}
                          onRimuovi={() => onRimuoviRiga(componente.id, opzione.id, riga.ingredientId)}
                          quantitaValida={!righeNonValideOpzione.has(riga.ingredientId)}
                        />
                      );
                    })}
                  </div>
                )}

                <AggiungiTratteggiato
                  etichetta="AGGIUNGI INGREDIENTE"
                  ariaLabel={`Aggiungi ingrediente all'opzione ${indiceOpzione + 1} del componente ${indiceComponente + 1}`}
                  onClick={() => onAggiungiIngrediente(componente.id, opzione.id)}
                />
              </div>
            );
          })}

          <TastoSecondario onClick={() => onAggiungiOpzione(componente.id)}>AGGIUNGI OPZIONE</TastoSecondario>
        </section>
      ))}

      <AggiungiTratteggiato etichetta="AGGIUNGI COMPONENTE" onClick={onAggiungiComponente} />

      {componentiSenzaNome.length > 0 && <MessaggioErrore>{TESTO_COMPONENTE_SENZA_NOME}</MessaggioErrore>}
      {opzioniSenzaRighe.length > 0 && <MessaggioErrore>{TESTO_OPZIONE_SENZA_RIGHE}</MessaggioErrore>}
      {opzioniSenzaRighe.length === 0 && quantitaNonValideOpzioni.size > 0 && (
        <MessaggioErrore>{TESTO_OPZIONE_QUANTITA}</MessaggioErrore>
      )}
    </>
  );
}
```

2. In `src/app/(app)/piatti/[id]/page.tsx`:
   - dopo `import { SelettoreIngrediente } from './SelettoreIngrediente';` aggiungi `import { ComponentiPiatto } from './ComponentiPiatto';`
   - togli le tre costanti `TESTO_COMPONENTE_SENZA_NOME`, `TESTO_OPZIONE_SENZA_RIGHE`, `TESTO_OPZIONE_QUANTITA` (si sono spostate identiche). `componentiNonValidi` resta nella pagina, identica.
   - togli i tre calcoli e il loro commento (da `// Le stesse tre condizioni di componentiNonValidi` a `);` di `quantitaNonValideOpzioni`).
   - il blocco che va dal `div` con testo `COMPONENTI A SCELTA` al terzo messaggio (`{opzioniSenzaRighe.length === 0 && quantitaNonValideOpzioni.size > 0 && (…)}`) compreso diventa:

```tsx
        {/* I componenti a scelta (spec fase 7 §B.3 punto 4): le callback sono quelle di
            sempre, lo stato resta qui. Il contenitore tiene il distacco di oggi finché la
            pagina non passa ai Blocchi (Task 6). */}
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ComponentiPiatto
            componenti={componenti}
            catalogoPerId={catalogoPerId}
            onAggiungiComponente={aggiungiComponente}
            onRimuoviComponente={rimuoviComponente}
            onCambiaNomeComponente={cambiaNomeComponente}
            onAggiungiOpzione={aggiungiOpzione}
            onRimuoviOpzione={rimuoviOpzione}
            onAggiungiIngrediente={(componenteId, opzioneId) => setSelettore({ tipo: 'opzione', componenteId, opzioneId })}
            onCambiaQuantita={cambiaQuantitaOpzione}
            onRimuoviRiga={rimuoviRigaOpzione}
          />
        </div>
```

   Nessun test di `page.test.tsx` o `vista.test.tsx` cambia: i selettori sui componenti (`AGGIUNGI COMPONENTE`, `Nome del componente 1`, `Aggiungi ingrediente all'opzione 1 del componente 1`, `/Ogni opzione deve avere almeno un ingrediente/`, il valore `Pane`, `Grammatura di Fiocchi d'avena`) sono quelli di oggi.

- [ ] **Step 4: verifica che passino**

Run: `npx vitest run "src/app/(app)/piatti/[id]" "src/app/(app)/piatti/__tests__/vista.test.tsx"`
Expected: PASS, tutti. In particolare restano verdi *«aggiungere un componente con un'opzione e salvare chiama salvaPiatto con la struttura componenti attesa»*, *«un'opzione senza righe blocca il salva»*, *«un piatto caricato con componenti li mostra»*, *«conserva un componente attraverso il giro bozza»*, *«aprire un piatto con componenti e salvare senza toccare nulla conserva gli id originali»*.

- [ ] **Step 5: controlli**

- `grep -nE "#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}\b|rgba\(" "src/app/(app)/piatti/[id]/ComponentiPiatto.tsx"` → nessuna riga.
- `grep -n "TESTO_COMPONENTE_SENZA_NOME\|TESTO_OPZIONE_SENZA_RIGHE\|TESTO_OPZIONE_QUANTITA\|quantitaNonValideOpzioni" "src/app/(app)/piatti/[id]/page.tsx"` → nessuna riga.
- `grep -n $'\xc3\x83' "src/app/(app)/piatti/[id]/ComponentiPiatto.tsx" "src/app/(app)/piatti/[id]/page.tsx" "src/app/(app)/piatti/[id]/__tests__/componenti.test.tsx"` → vuoto.
- `npm test`, `npx tsc --noEmit`, `npm run lint`: verdi.

- [ ] **Step 6: commit**

```bash
git add "src/app/(app)/piatti/[id]/ComponentiPiatto.tsx" "src/app/(app)/piatti/[id]/page.tsx" "src/app/(app)/piatti/[id]/__tests__/componenti.test.tsx"
git commit -m "feat(piatto): i componenti a scelta in ComponentiPiatto, widget bianchi con le ✕ tonde

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

**Test esistenti toccati (Task 5)**

- Nessuno cambia: `page.test.tsx`, `vista.test.tsx` e `bozza.test.ts` restano verdi con i selettori di oggi (vedi Step 4). `componenti.test.tsx` è nuovo.

---

### Task 6: L'editor a un modo solo

**Files:**
- Modify (riscrittura): `src/app/(app)/piatti/[id]/page.tsx`
- Modify: `src/app/(app)/piatti/[id]/__tests__/page.test.tsx`
- Rename + riscrittura: `src/app/(app)/piatti/__tests__/vista.test.tsx` → `src/app/(app)/piatti/__tests__/apertura.test.tsx`

**Interfaces:**
- Consumes:
  - `TestataModifica` (Task 2, Interfacce vincolanti): `TestataModifica({ freccia: { etichetta, onTorna }, area?, nome?, children? })`, da `@/components/TestataModifica`.
  - `SelettoreIngrediente` (Task 4, **Produces**): `{ ingredienti, onScegli, onChiudi, hrefNuovo, onPrimaDiCreare }`.
  - `ComponentiPiatto` (Task 5, **Produces**): `{ componenti, catalogoPerId, onAggiungiComponente, onRimuoviComponente, onCambiaNomeComponente, onAggiungiOpzione, onRimuoviOpzione, onAggiungiIngrediente, onCambiaQuantita, onRimuoviRiga }`, da `./ComponentiPiatto`.
  - `AggiungiTratteggiato` (Task 1, Interfacce vincolanti): `{ etichetta, ariaLabel?, onClick }`, da `@/components/AggiungiTratteggiato`.
  - Di oggi: `Dock` da `@/components/Dock`; `FoglioDalBasso` da `@/components/FoglioDalBasso`; `DialogoConferma({ titolo, testo, azione, tono, erroreTesto, onConferma: () => Promise<void>, onAnnulla })` da `@/components/DialogoConferma`; `Blocco({ children, primo? })`, `Etichetta`, `MessaggioErrore({ children, ruolo? })`, `TastoSecondario` da `@/components/controlli`; `useNascondiBarra` da `@/components/barra-context`; `Carico` e `Nota({ children, ruolo? })` da `@/components/pannello/pezzi`; `type BozzaPiatto` da `./bozza`. Nei test: `SlotDockProvider` da `@/components/dock-slot`, `BarraProvider` da `@/components/barra-context`.
- Produces: niente per altri task.

**Cosa non cambia sui dati.** `salvaPiatto(...)` con gli stessi argomenti di oggi (`id`, `nome` trim, `slotEffettivo`, `fonte`, `attivo`, `descrizione` trim o null, `settimanaEffettiva`, `giornoCiclo`, `ingredienti`, `componentiEffettivi`); `eliminaPiatto(piattoOriginale.id)`; `carica()` con lo stesso `Promise.all`, la stessa applicazione del piatto, della bozza (che vince) e dell'ingrediente appena creato; `riparaBozzaPrimaDiUscire` identica; tutte le funzioni che modificano ingredienti e componenti identiche. Dopo l'eliminazione si va a `/piatti` con `scartaBozza(id)`, come oggi.

**Cosa cambia:**
- via `VistaPiatto`, `modalita`, `MODIFICA`, `annulla` (il ripristino da `piattoOriginale`), `tapCestino`, `eliminando`, `EtichettaCampo`, la `Cornice` con il cestino, il piede `coda-barra` con `ANNULLA` e `SALVA PIATTO`, il dialogo scritto a mano;
- la testata è `TestataModifica` con la freccia `Torna ai piatti` → `/piatti` e il nome come campo a 32;
- `useNascondiBarra(true)`;
- i blocchi sono `Blocco` / `Etichetta`; i messaggi che nascono da un dato scritto male (grammature mancanti, componente senza nome, opzione senza righe) in `--errore`; `TESTO_SENZA_INGREDIENTI` invece è una **Nota** (12,5 in `--testo-2`): spiega perché SALVA è spento, e su un piatto nuovo non deve essere rosso dalla prima apertura (DESIGN.md §8 Messaggi);
- `SALVA` nel Dock: spento finché niente cambia **o** il modulo non è valido; in volo `disabled` con lo stato spento di `.dock-primario:disabled`; l'errore sopra il Dock con `role="alert"`; dopo il salvataggio si torna a `/piatti` anche su un piatto esistente;
- `ELIMINA` in coda, solo su un piatto esistente → `DialogoConferma` distruttivo in un `FoglioDalBasso` con `TESTO_ELIMINA`.
- tre comportamenti diversi da oggi, voluti (spec §B.7): se l'eliminazione fallisce l'errore sta dentro il dialogo, che resta aperto; un caricamento fallito su `/piatti/nuovo` mostra solo l'errore, senza Dock (oggi si poteva salvare con `slot_def_id ''`); aprire e salvare senza toccare nulla non si può più (SALVA spento), quindi non si riscrive una `settimanaCiclo` fuori ciclo finché non si salva un cambiamento vero.

**Il confronto «è cambiato qualcosa?»** (spec §B.5, modello: `firma` dell'editor dell'ingrediente, riga 132). Il modulo ha la forma di `BozzaPiatto`: `nome`, `slotDefId`, `descrizione`, `settimanaCiclo`, `giornoCiclo`, `ingredienti`, `componenti` — cioè i sette campi che SALVA scrive e che la bozza mette al riparo. La firma è `JSON.stringify` di una tupla in ordine fisso con i valori **grezzi** del modulo (il nome non si ripulisce, come nell'ingrediente): righe come `[ingredientId, quantita, unita]` in ordine; componenti come `[id, nome, opzioni.map(o => [o.id, righe])]`. Tuple e non oggetti: l'ordine delle chiavi di un oggetto letto dal server o dalla bozza non conta. La firma di riferimento è quella del piatto letto dal server (`descrizione ?? ''`), **prima** della bozza: una bozza ripresa o un ingrediente appena creato contano come cambiamenti. Su `/piatti/nuovo` il riferimento è il modulo vuoto (`nome ''`, `slotDefId ''`, `descrizione ''`, `null`, `null`, `[]`, `[]`).

**La bozza all'uscita — verificato nel codice di oggi.** `scartaBozza(id)` si chiama in tre punti: dopo `salvaPiatto` riuscito, dopo `eliminaPiatto` riuscito, e in `annulla()` solo su un piatto esistente (su un piatto nuovo `annulla()` fa `router.push('/piatti')` senza toccarla). Le altre due uscite di oggi non la toccano: la freccia della vecchia intestazione (un `Link` a `/piatti`) e `Indietro` della vista (`router.back()`). La freccia nuova prende il posto di `ANNULLA` (spec §B.2: «come oggi `ANNULLA`»), quindi fa quello che faceva `annulla()` quando usciva: **su un piatto esistente `scartaBozza(id)` e poi `/piatti`; su un piatto nuovo solo `/piatti`**. Salvataggio ed eliminazione: identici a oggi.

- [ ] **Step 1: i test, prima**

**1a. Rinomina il test della vista** (prima di scriverci):

```bash
git mv "src/app/(app)/piatti/__tests__/vista.test.tsx" "src/app/(app)/piatti/__tests__/apertura.test.tsx"
```

e riscrivilo per intero così (resta il contratto «aprire un piatto non emette scritture»; spariscono i test su `MODIFICA`, sulla vista, su `ANNULLA` e su `Indietro`):

```tsx
// Il contratto dell'apertura (spec fase 7 §B.2): l'editor del Piatto ha un modo solo e si
// apre sempre modificabile, ma aprirlo NON emette scritture (né salvaPiatto né la bozza):
// SALVA resta spento finché niente cambia. Uscire con la freccia non scrive e tratta la
// bozza come la trattava ANNULLA prima della fase 7.
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Dish, Ingredient, MealSlotDef } from '@/domain/types';

vi.mock('@/data/repertorio', () => ({
  salvaPiatto: vi.fn(),
  eliminaPiatto: vi.fn(),
  leggiRepertorio: vi.fn(),
  leggiIngredienti: vi.fn(),
}));
vi.mock('@/data/impostazioni', () => ({
  leggiSlotDefs: vi.fn(),
  leggiImpostazioni: vi.fn(),
}));
vi.mock('@/data/settimana', () => ({
  leggiSettimanaCorrente: vi.fn(),
}));

// vi.hoisted: push deve essere la STESSA istanza a ogni chiamata di useRouter() (il
// componente lo richiama a ogni render).
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
let paramsId = 'd-1';
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: paramsId }),
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
}));

// Modulo mockato per intero (non solo spiato): verifica strutturale che all'apertura non
// parta nessun salvataggio automatico di bozza — se un effect nascosto la richiamasse a
// ogni render, questi mock lo intercetterebbero.
vi.mock('../[id]/bozza', () => ({
  raccogliIngredienteCreato: vi.fn(() => null),
  riprendiBozza: vi.fn(() => null),
  salvaBozza: vi.fn(),
  scartaBozza: vi.fn(),
}));

import { salvaPiatto, leggiRepertorio, leggiIngredienti } from '@/data/repertorio';
import { leggiImpostazioni, leggiSlotDefs } from '@/data/impostazioni';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { riprendiBozza, salvaBozza, scartaBozza } from '../[id]/bozza';
import { SlotDockProvider } from '@/components/dock-slot';
import { BarraProvider } from '@/components/barra-context';
import Piatto from '../[id]/page';

const ASSENZE = [false, false, false, false, false, false, false];
const SLOT_PRANZO: MealSlotDef = { id: 'sd-1', nome: 'Pranzo', posizione: 0, assenzeAbituali: ASSENZE };

const ING_RISO: Ingredient = {
  id: 'i-1', nome: 'Riso', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000, prezzoConfezione: null, ean: null,
};
const ING_FARINA: Ingredient = {
  id: 'i-2', nome: 'Farina', unitaBase: 'g', area: 'dispensa',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000, prezzoConfezione: null, ean: null,
};
const ING_PANE_INTEGRALE: Ingredient = {
  id: 'i-3', nome: 'Pane integrale', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'intero', deperibile: true, formatoConfezione: 500, prezzoConfezione: null, ean: null,
};

const PIATTO_ESISTENTE: Dish = {
  id: 'd-1',
  nome: 'Riso e pane',
  slotDefId: 'sd-1',
  fonte: 'proprio',
  attivo: true,
  descrizione: null,
  settimanaCiclo: 2,
  giornoCiclo: 3, // Giovedì
  ingredienti: [{ ingredientId: 'i-1', quantita: 80, unita: 'g' }],
  componenti: [
    {
      id: 'c-1',
      nome: 'Pane',
      opzioni: [
        { id: 'o-1', righe: [{ ingredientId: 'i-2', quantita: 50, unita: 'g' }] },
        { id: 'o-2', righe: [{ ingredientId: 'i-3', quantita: 40, unita: 'g' }] },
      ],
    },
  ],
};

function mockBase(settimaneCiclo = 2) {
  vi.mocked(leggiSlotDefs).mockResolvedValue([SLOT_PRANZO]);
  vi.mocked(leggiIngredienti).mockResolvedValue([ING_RISO, ING_FARINA, ING_PANE_INTEGRALE]);
  vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
  vi.mocked(leggiImpostazioni).mockResolvedValue({
    moltiplicatorePorzioni: 1,
    ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'],
    settimaneCiclo,
    cicloOrigine: '2026-08-24',
    giorniControllo: 90,
  });
  vi.mocked(leggiSettimanaCorrente).mockResolvedValue(null);
}

// Il Dock si monta nello slot che il Guscio renderizza: qui lo dà `rendi()`, come nei test
// dell'editor dell'ingrediente. Con `render` nudo SALVA non esisterebbe.
let slotDock: HTMLElement;
function rendi(ui: ReactNode = <Piatto />) {
  return render(<BarraProvider><SlotDockProvider slot={slotDock}>{ui}</SlotDockProvider></BarraProvider>);
}
const salva = () => screen.getByRole('button', { name: 'SALVA' });

describe('dettaglio piatto: si apre modificabile, senza scrivere niente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsId = 'd-1';
    vi.mocked(riprendiBozza).mockReturnValue(null);
    slotDock = document.createElement('div');
    document.body.appendChild(slotDock);
    mockBase();
  });

  afterEach(() => {
    slotDock.remove();
    vi.restoreAllMocks();
  });

  it('aprire un piatto esistente mostra il modulo, non emette scritture, e SALVA è spento', async () => {
    rendi();

    expect(await screen.findByDisplayValue('Riso e pane')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'MODIFICA' })).toBeNull();
    expect(salva()).toBeDisabled();
    expect(salvaPiatto).not.toHaveBeenCalled();
    expect(salvaBozza).not.toHaveBeenCalled();
    expect(scartaBozza).not.toHaveBeenCalled();
  });

  it('il modulo mostra pasto, settimana del giro e giorno fisso del piatto caricato', async () => {
    rendi();
    await screen.findByDisplayValue('Riso e pane');

    expect(screen.getByRole('button', { name: 'Pranzo' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Settimana del giro: Settimana 2 del giro' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Giorno fisso: Giovedì' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('il modulo mostra gli ingredienti fissi e i componenti con le loro opzioni', async () => {
    rendi();
    await screen.findByDisplayValue('Riso e pane');

    expect(screen.getByText('PER 1 PORZIONE')).toBeInTheDocument();
    expect(screen.getByText('Riso')).toBeInTheDocument();
    const pane = screen.getByRole('region', { name: 'Componente 1' });
    expect(within(pane).getByDisplayValue('Pane')).toBeInTheDocument();
    expect(within(pane).getByText('OPZIONE 1')).toBeInTheDocument();
    expect(within(pane).getByText('Farina')).toBeInTheDocument();
    expect(within(pane).getByText('OPZIONE 2')).toBeInTheDocument();
    expect(within(pane).getByText('Pane integrale')).toBeInTheDocument();
  });

  it('un piatto nuovo apre il modulo vuoto: SALVA spento, niente ELIMINA', async () => {
    paramsId = 'nuovo';
    vi.mocked(leggiRepertorio).mockResolvedValue([]);

    rendi();

    expect(await screen.findByPlaceholderText('Dai un nome al piatto')).toHaveValue('');
    expect(salva()).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Elimina piatto' })).toBeNull();
    expect(salvaBozza).not.toHaveBeenCalled();
  });

  it('una bozza pendente vince sul piatto del server, e SALVA si accende: è lavoro non ancora salvato', async () => {
    vi.mocked(riprendiBozza).mockReturnValue({
      nome: 'Riso e pane, modifica in corso',
      slotDefId: 'sd-1',
      descrizione: '',
      settimanaCiclo: 2,
      giornoCiclo: 3,
      ingredienti: [{ ingredientId: 'i-1', quantita: 80, unita: 'g' }],
      componenti: [],
    });

    rendi();

    expect(await screen.findByDisplayValue('Riso e pane, modifica in corso')).toBeInTheDocument();
    expect(salva()).toBeEnabled();
    expect(salvaPiatto).not.toHaveBeenCalled();
  });

  it('la freccia torna a /piatti senza chiedere e senza scrivere, e scarta la bozza come ANNULLA', async () => {
    rendi();
    fireEvent.change(await screen.findByDisplayValue('Riso e pane'), { target: { value: 'Nome cambiato per sbaglio' } });

    fireEvent.click(screen.getByRole('button', { name: 'Torna ai piatti' }));

    expect(push).toHaveBeenCalledWith('/piatti');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(salvaPiatto).not.toHaveBeenCalled();
    expect(scartaBozza).toHaveBeenCalledWith('d-1');
  });

  it('su un piatto nuovo la freccia torna a /piatti senza toccare la bozza, come ANNULLA', async () => {
    paramsId = 'nuovo';
    vi.mocked(leggiRepertorio).mockResolvedValue([]);
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');

    fireEvent.click(screen.getByRole('button', { name: 'Torna ai piatti' }));

    expect(push).toHaveBeenCalledWith('/piatti');
    expect(scartaBozza).not.toHaveBeenCalled();
    expect(salvaPiatto).not.toHaveBeenCalled();
  });

  // Prima della fase 7 `salvando` restava vero dopo un salvataggio andato su un piatto
  // esistente (review finale, finding critico): qui il caso che resta è il fallimento,
  // dopo il quale il secondo SALVA deve ripartire.
  it('un salvataggio fallito: l’errore sopra il Dock, e il secondo SALVA riparte e torna a /piatti', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(salvaPiatto).mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('d-1');
    rendi();
    fireEvent.change(await screen.findByDisplayValue('Riso e pane'), { target: { value: 'Riso e pane, seconda' } });

    fireEvent.click(salva());

    const dock = screen.getByRole('region', { name: 'Azione principale' });
    expect(await within(dock).findByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare il piatto. Riprova.');
    expect(push).not.toHaveBeenCalled();
    const secondo = within(dock).getByRole('button', { name: 'SALVA' });
    expect(secondo).toBeEnabled();

    fireEvent.click(secondo);

    await waitFor(() => expect(salvaPiatto).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti'));
    expect(within(dock).queryByRole('alert')).toBeNull();
  });
});
```

**1b. `src/app/(app)/piatti/[id]/__tests__/page.test.tsx`.**

Testa del file:
- `import { describe, it, expect, vi, beforeEach } from 'vitest';` → `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';`
- `import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';` → `import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';`
- dopo `import type { SettimanaCorrente } from '@/data/settimana';` aggiungi `import type { ReactNode } from 'react';`
- dopo `import { salvaBozza, riprendiBozza } from '../bozza';` aggiungi:

```tsx
import { SlotDockProvider } from '@/components/dock-slot';
import { BarraProvider } from '@/components/barra-context';
```

- **togli** l'helper `entraInModifica` col suo commento (righe 77–85).
- dopo `mockBase` aggiungi gli helper e sposta il `beforeEach` fuori dal `describe('Piatto (editor)')`, a livello di file, con lo slot:

```tsx
// Il Dock si monta nello slot che il Guscio renderizza: qui lo dà `rendi()`, come nei test
// dell'editor dell'ingrediente. Con `render` nudo SALVA non esisterebbe.
let slotDock: HTMLElement;
function rendi(ui: ReactNode = <Piatto />) {
  return render(<BarraProvider><SlotDockProvider slot={slotDock}>{ui}</SlotDockProvider></BarraProvider>);
}
const salva = () => screen.getByRole('button', { name: 'SALVA' });

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  paramsId = 'nuovo';
  slotDock = document.createElement('div');
  document.body.appendChild(slotDock);
  mockBase();
  nessunaSettimana();
});

afterEach(() => {
  slotDock.remove();
  // Toglie le spie di console.error: vi.clearAllMocks non le rimette a posto.
  vi.restoreAllMocks();
});
```

  e il `describe('Piatto (editor)', () => { beforeEach(…); …` perde il suo `beforeEach`.

Sostituzioni meccaniche in tutto il file:

| Oggi | Diventa |
|---|---|
| `render(<Piatto />)` | `rendi()` (anche `const { unmount } = render(<Piatto />)` → `const { unmount } = rendi()`) |
| `await entraInModifica();` | tolta: il piatto si apre già modificabile |
| `screen.getByRole('button', { name: 'SALVA PIATTO' })` | `salva()` |
| il cestino in testata `{ name: 'Elimina piatto' }` | invariato: è il nome accessibile del `TastoSecondario` `ELIMINA` in coda |
| `screen.getByText('Eliminare questo piatto?')` | `within(screen.getByRole('alertdialog')).getByText('Eliminare questo piatto?')` (il `queryByText(…)).not.toBeInTheDocument()` resta) |
| `screen.getByRole('button', { name: 'ELIMINA' })` del dialogo | `within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ELIMINA' })` |
| `screen.getByRole('button', { name: 'ANNULLA' })` della conferma | `within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ANNULLA' })` |

I selettori `/AGGIUNGI\s*INGREDIENTE/`, `Rimuovi …`, `Grammatura di …`, `Modifica Yogurt greco`, `/NUOVO\s*INGREDIENTE/`, `Cerca un ingrediente`, `AGGIUNGI COMPONENTE`, `Nome del componente 1`, `Aggiungi ingrediente all'opzione 1 del componente 1` restano: l'Aggiungi tratteggiato principale non ha `aria-label` e il suo nome è `AGGIUNGI INGREDIENTE`.

I test che cambiano anche nelle attese (codice completo, al posto di quello di oggi):

```tsx
  it('rimuovere l\'ultimo ingrediente ridisattiva il salvataggio', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    rendi();
    const nome = await screen.findByDisplayValue('Yogurt e avena');
    // Niente è cambiato: spento (spec fase 7 §B.5). Cambiato il nome, si accende.
    expect(salva()).toBeDisabled();
    fireEvent.change(nome, { target: { value: 'Yogurt e avena bis' } });
    expect(salva()).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Yogurt greco' }));

    expect(salva()).toBeDisabled();
  });

  it('modifica: carica nome, pasto e ingredienti del piatto esistente', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);

    rendi();

    expect(await screen.findByDisplayValue('Yogurt e avena')).toBeInTheDocument();
    expect(screen.getByText('Yogurt greco')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Colazione' })).toHaveAttribute('aria-pressed', 'true');
    // Aperto e basta: niente è cambiato, SALVA è spento (spec fase 7 §B.5).
    expect(salva()).toBeDisabled();
  });

  it('su un piatto nuovo ELIMINA non c’è: la freccia torna al repertorio senza chiedere conferma', async () => {
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');

    expect(screen.queryByRole('button', { name: 'Elimina piatto' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Torna ai piatti' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(push).toHaveBeenCalledWith('/piatti');
    expect(eliminaPiatto).not.toHaveBeenCalled();
  });

  it('ELIMINA su un piatto esistente chiede conferma, poi elimina (soft delete) e torna al repertorio', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    vi.mocked(eliminaPiatto).mockResolvedValue(undefined);

    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina piatto' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Eliminare questo piatto?' });
    expect(within(dialogo).getByText('Eliminare questo piatto?')).toBeInTheDocument();
    expect(within(dialogo).getByText(
      'Non comparirà più nel repertorio né nelle prossime settimane. Le settimane già passate restano invariate.',
    )).toBeInTheDocument();
    // Il velo del dialogo non chiude (DESIGN.md §8 Dialogo di conferma).
    fireEvent.click(screen.getAllByTestId('velo-foglio').at(-1)!);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(eliminaPiatto).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'ELIMINA' }));

    await waitFor(() => expect(eliminaPiatto).toHaveBeenCalledWith('d-1'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti'));
  });

  it('ANNULLA nella conferma chiude il dialogo senza eliminare', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);

    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina piatto' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ANNULLA' }));

    expect(screen.queryByText('Eliminare questo piatto?')).not.toBeInTheDocument();
    expect(eliminaPiatto).not.toHaveBeenCalled();
  });

  it('salvare il piatto scarta la bozza, così non riappare al rientro', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    vi.mocked(salvaPiatto).mockResolvedValue(undefined as never);

    rendi();
    const nome = await screen.findByDisplayValue('Yogurt e avena');
    fireEvent.change(nome, { target: { value: 'Yogurt e avena bis' } });
    salvaBozza('d-1', {
      nome: 'residuo', slotDefId: 'sd-1',
      descrizione: '', settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [],
    });

    fireEvent.click(salva());

    // Spec fase 7 §B.5: SALVA scrive e torna a /piatti anche su un piatto esistente.
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti'));
    expect(riprendiBozza('d-1')).toBeNull();
  });

  // Review round 1, finding MEDIUM: salvare un piatto con componenti già salvati non deve
  // rigenerare gli id di componenti/opzioni (salvaPiatto riusa solo id che sono già uuid:
  // rigenerarli invaliderebbe le meal_slot_choice registrate per quel componente). Dalla
  // fase 7 SALVA è spento finché niente cambia: si cambia il solo nome del piatto.
  it('aprire un piatto con componenti, cambiare solo il nome e salvare conserva gli id originali', async () => {
    paramsId = 'd-2';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_CON_COMPONENTI]);
    vi.mocked(salvaPiatto).mockResolvedValue('d-2');

    rendi();
    const nome = await screen.findByDisplayValue('Yogurt e avena');
    expect(salva()).toBeDisabled();
    fireEvent.change(nome, { target: { value: 'Yogurt e avena col pane' } });

    fireEvent.click(salva());

    await waitFor(() => expect(salvaPiatto).toHaveBeenCalled());
    const [chiamata] = vi.mocked(salvaPiatto).mock.calls[0];
    expect(chiamata.nome).toBe('Yogurt e avena col pane');
    expect(chiamata.componenti).toEqual([
      { id: 'c-1', nome: 'Pane', opzioni: [{ id: 'o-1', righe: [{ ingredientId: 'i-2', quantita: 40, unita: 'g' }] }] },
    ]);
  });
```

I test nuovi, in fondo al file:

```tsx
describe('Piatto (editor): un modo solo, SALVA nel Dock ed ELIMINA (spec fase 7 §B)', () => {
  it('la testata è quella di modifica: la freccia «Torna ai piatti» e il nome come campo a 32', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    rendi();

    const nome = await screen.findByDisplayValue('Yogurt e avena');
    expect(nome.tagName).toBe('TEXTAREA');
    expect(nome).toHaveAttribute('placeholder', 'Dai un nome al piatto');
    expect(nome.style.fontSize).toBe('32px');
    fireEvent.click(screen.getByRole('button', { name: 'Torna ai piatti' }));
    expect(push).toHaveBeenCalledWith('/piatti');
    // L'intestazione di oggi non c'è più.
    expect(screen.queryByText('PIATTO')).toBeNull();
  });

  it('SALVA sta nel Dock, senza tab bar, ed è spento finché niente cambia', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    rendi();
    const nome = await screen.findByDisplayValue('Yogurt e avena');

    const dock = screen.getByRole('region', { name: 'Azione principale' });
    expect(dock).toHaveClass('dock-senza-barra');
    expect(within(dock).getByRole('button', { name: 'SALVA' })).toHaveClass('dock-primario');
    expect(salva()).toBeDisabled();

    fireEvent.change(nome, { target: { value: 'Yogurt e avena bis' } });
    expect(salva()).toBeEnabled();
    // Rimesso com'era, non è cambiato niente.
    fireEvent.change(nome, { target: { value: 'Yogurt e avena' } });
    expect(salva()).toBeDisabled();

    // Anche una grammatura è un cambiamento, e tornare al valore di prima lo annulla.
    fireEvent.change(screen.getByLabelText('Grammatura di Yogurt greco'), { target: { value: '160' } });
    expect(salva()).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Grammatura di Yogurt greco'), { target: { value: '150' } });
    expect(salva()).toBeDisabled();

    // Il pasto, il giorno fisso, il procedimento: ognuno accende SALVA.
    fireEvent.click(screen.getByRole('button', { name: 'Cena' }));
    expect(salva()).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Colazione' }));
    expect(salva()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Giorno fisso: Martedì' }));
    expect(salva()).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /Giorno fisso: Lo sceglie l.app, ruotando/ }));
    expect(salva()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Procedimento del piatto'), { target: { value: 'Mescola.' } });
    expect(salva()).toBeEnabled();
  });

  it('un modulo cambiato ma non valido tiene SALVA spento, e la ragione resta scritta nel modulo come Nota', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Yogurt greco' }));

    expect(salva()).toBeDisabled();
    const ragione = screen.getByText(
      'Un piatto senza ingredienti non entra nella lista della spesa: è la grammatura di ogni ingrediente a dire quanto comprare. Aggiungine almeno uno.',
    );
    // Una Nota, non un errore: spiega perché SALVA è spento (DESIGN.md §8 Messaggi).
    expect(ragione.style.color).toBe('var(--testo-2)');
    expect(ragione.style.fontSize).toBe('12.5px');
    expect(ragione.closest('[role="region"]')).toBeNull(); // nel modulo, non sopra il Dock
  });

  it('su un piatto nuovo la ragione di SALVA spento non è rossa dalla prima apertura', async () => {
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');

    expect(salva()).toBeDisabled();
    const ragione = screen.getByText(
      'Un piatto senza ingredienti non entra nella lista della spesa: è la grammatura di ogni ingrediente a dire quanto comprare. Aggiungine almeno uno.',
    );
    expect(ragione.style.color).toBe('var(--testo-2)');
  });

  it('una grammatura mancante è un dato scritto male: il messaggio è in --errore', async () => {
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');
    fireEvent.click(screen.getByRole('button', { name: 'AGGIUNGI INGREDIENTE' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Aggiungi ingrediente' })).getByRole('button', { name: 'Yogurt greco' }));

    const messaggio = screen.getByText(/tocca il numero sulla tessera e scrivi quanto ne usi/);
    expect(messaggio.style.color).toBe('var(--errore)');
  });

  it('SALVA su un piatto esistente scrive e torna a /piatti', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    vi.mocked(salvaPiatto).mockResolvedValue('d-1');
    rendi();
    fireEvent.change(await screen.findByDisplayValue('Yogurt e avena'), { target: { value: 'Yogurt, avena e miele' } });

    fireEvent.click(salva());

    await waitFor(() => expect(salvaPiatto).toHaveBeenCalledWith({
      id: 'd-1',
      nome: 'Yogurt, avena e miele',
      slotDefId: 'sd-1',
      fonte: 'proprio',
      attivo: true,
      descrizione: null,
      settimanaCiclo: null,
      giornoCiclo: null,
      ingredienti: [{ ingredientId: 'i-1', quantita: 150, unita: 'g' }],
      componenti: [],
    }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piatti'));
  });

  it('in volo SALVA è spento con lo stato del sistema, non con l’opacità; se fallisce l’errore sta sopra il Dock', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    let rifiuta!: (e: unknown) => void;
    vi.mocked(salvaPiatto).mockReturnValue(new Promise((_, r) => { rifiuta = r; }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rendi();
    fireEvent.change(await screen.findByDisplayValue('Yogurt e avena'), { target: { value: 'Yogurt e avena bis' } });

    fireEvent.click(salva());

    await waitFor(() => expect(salva()).toBeDisabled());
    expect(salva()).toHaveTextContent('SALVA');
    expect(salva()).toHaveAttribute('aria-busy', 'true');
    expect(salva().style.opacity).toBe('');
    await act(async () => { rifiuta(new Error('rete')); });
    const dock = screen.getByRole('region', { name: 'Azione principale' });
    expect(within(dock).getByRole('alert')).toHaveTextContent('Non siamo riusciti a salvare il piatto. Riprova.');
    expect(within(dock).getByRole('button', { name: 'SALVA' })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });

  it('AGGIUNGI INGREDIENTE è l’Aggiungi tratteggiato sotto le tessere, e apre il selettore in un Foglio dal basso', async () => {
    rendi();
    await screen.findByPlaceholderText('Dai un nome al piatto');

    const aggiungi = screen.getByRole('button', { name: 'AGGIUNGI INGREDIENTE' });
    expect(aggiungi.style.height).toBe('56px');
    expect(aggiungi.style.border).toBe('2px dashed var(--bordo-tratteggio)');
    fireEvent.click(aggiungi);
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Aggiungi ingrediente' })).getByRole('button', { name: 'Yogurt greco' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByLabelText('Grammatura di Yogurt greco')).toBeInTheDocument();
  });

  it('se l’eliminazione fallisce l’errore resta nel dialogo, che non si chiude', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    vi.mocked(eliminaPiatto).mockRejectedValue(new Error('rete'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    fireEvent.click(screen.getByRole('button', { name: 'Elimina piatto' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ELIMINA' }));

    expect(await within(screen.getByRole('alertdialog')).findByText('Non siamo riusciti a eliminare il piatto. Riprova.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('ELIMINA è un tasto secondario in --errore, in coda', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    const elimina = screen.getByRole('button', { name: 'Elimina piatto' });
    expect(elimina).toHaveTextContent('ELIMINA');
    expect(elimina.style.color).toBe('var(--errore)');
    expect(elimina.style.height).toBe('54px');
  });

  it('un piatto non trovato: il messaggio, la freccia, niente Dock', async () => {
    paramsId = 'd-inesistente';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    rendi();

    expect(await screen.findByText('Piatto non trovato.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Torna ai piatti' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Elimina piatto' })).toBeNull();
  });

  it('un caricamento fallito: il messaggio in --errore, niente Dock', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiIngredienti).mockRejectedValue(new Error('rete'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rendi();

    const messaggio = await screen.findByRole('alert');
    expect(messaggio).toHaveTextContent('Non riusciamo a caricare il piatto. Riprova più tardi.');
    expect(messaggio.style.color).toBe('var(--errore)');
    expect(screen.queryByRole('region', { name: 'Azione principale' })).toBeNull();
  });

  it('in caricamento: la testata e CARICO…, niente Dock', async () => {
    vi.mocked(leggiSlotDefs).mockReturnValue(new Promise(() => {}));
    rendi();

    expect(await screen.findByText('CARICO…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Torna ai piatti' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).toBeNull();
  });

  it('la striscia dei giorni usa i token: il giorno in programma pieno in --ink, il testo in --superficie', async () => {
    paramsId = 'd-1';
    vi.mocked(leggiRepertorio).mockResolvedValue([PIATTO_ESISTENTE]);
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue({
      id: 'w-1', dataInizio: '2026-08-24', stato: 'confermata',
      slots: [{
        id: 's-lun', data: '2026-08-24', slotDefId: 'sd-1', stato: 'casa', dishId: 'd-1', fonteStato: 'default', scelte: {},
        porzioniPreparate: 0, daPronti: false,
      }],
    });
    rendi();
    await screen.findByDisplayValue('Yogurt e avena');

    const lun = screen.getAllByText('LUN').find((el) => el.closest('button') === null)!;
    expect(lun.style.background).toBe('var(--ink)');
    expect(lun.style.color).toBe('var(--superficie)');
    const mar = screen.getAllByText('MAR').find((el) => el.closest('button') === null)!;
    expect(mar.style.background).toBe('var(--spento)');
  });
});
```

- [ ] **Step 2: verifica che falliscano**

Run: `npx vitest run "src/app/(app)/piatti/[id]/__tests__/page.test.tsx" "src/app/(app)/piatti/__tests__/apertura.test.tsx"`
Expected: FAIL. Il tasto si chiama ancora `SALVA PIATTO` e non sta nel Dock (`Unable to find role="button" and name "SALVA"`); un piatto esistente apre in vista (`findByDisplayValue('Yogurt e avena')` non trova il campo); non c'è `Torna ai piatti`; il dialogo non ha `role="alertdialog"`. Passano solo i test che non toccano né SALVA né la testata (per esempio quelli del selettore su un piatto nuovo).

- [ ] **Step 3: la pagina** — riscrivi `src/app/(app)/piatti/[id]/page.tsx` per intero (con Write, dopo averlo letto):

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Componente, Dish, DishIngredient, Ingredient, MealSlotDef } from '@/domain/types';
import { salvaPiatto, leggiRepertorio, leggiIngredienti, eliminaPiatto } from '@/data/repertorio';
import { leggiImpostazioni, leggiSlotDefs } from '@/data/impostazioni';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { giorniDellaSettimana } from '@/domain/date';
import { Segmento } from '@/components/Segmento';
import { TesseraIngrediente } from '@/components/TesseraIngrediente';
import { TestataModifica } from '@/components/TestataModifica';
import { Dock } from '@/components/Dock';
import { FoglioDalBasso } from '@/components/FoglioDalBasso';
import { DialogoConferma } from '@/components/DialogoConferma';
import { Blocco, Etichetta, MessaggioErrore, TastoSecondario } from '@/components/controlli';
import { useNascondiBarra } from '@/components/barra-context';
import { AggiungiTratteggiato } from '@/components/AggiungiTratteggiato';
import { Carico, Nota } from '@/components/pannello/pezzi';
import { raccogliIngredienteCreato, riprendiBozza, salvaBozza, scartaBozza, type BozzaPiatto } from './bozza';
import { SelettoreIngrediente } from './SelettoreIngrediente';
import { ComponentiPiatto } from './ComponentiPiatto';

const GIORNI_LABEL = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];
const GIORNI_LUNGHI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const TESTO_SENZA_INGREDIENTI =
  'Un piatto senza ingredienti non entra nella lista della spesa: è la grammatura di ogni ' +
  'ingrediente a dire quanto comprare. Aggiungine almeno uno.';

const TESTO_NON_IN_PROGRAMMA =
  'Non ancora in programma. Comparirà qui appena lo assegni a un pasto dalla Settimana.';

const TESTO_ELIMINA =
  'Non comparirà più nel repertorio né nelle prossime settimane. Le settimane già passate restano invariate.';

/** Il testo di oggi dell'eliminazione fallita: dalla fase 7 lo mostra il Dialogo di conferma, sotto i tasti. */
const ERRORE_ELIMINA = 'Non siamo riusciti a eliminare il piatto. Riprova.';

/**
 * Stesso vincolo di `check (quantita > 0)` che vale per `ingredienti`, esteso
 * alle righe delle opzioni: sono la stessa tabella (`dish_ingredient`,
 * `option_id` non nullo), quindi la stessa violazione che I2 ha già corretto
 * per la lista fissa vale identica qui. Un componente senza nome o
 * un'opzione senza righe sono gli altri due modi in cui il salvataggio
 * scriverebbe qualcosa che salvaPiatto (Task 7) non può accettare o che
 * l'editor non potrebbe più mostrare in modo distinguibile.
 */
function componentiNonValidi(componenti: Componente[]): boolean {
  return componenti.some(
    (c) =>
      c.nome.trim() === '' ||
      c.opzioni.some((o) => o.righe.length === 0 || o.righe.some((r) => r.quantita <= 0)),
  );
}

// Solo 0-7 possibili (sette giorni): un lookup fisso è sicuro qui, a
// differenza di provare a pluralizzare un nome di pasto scritto liberamente
// dall'utente (quello sì fragile, ed è il motivo per cui la frase sotto non
// riproduce il gioco di parole "Sei... sei al bar" del mock).
const NUMERI_PAROLA = ['zero', 'una', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette'];

function volte(n: number): string {
  return n === 1 ? 'una volta' : `${NUMERI_PAROLA[n]} volte`;
}

/**
 * La frase di riepilogo sotto la striscia dei giorni, mostrata solo quando
 * il piatto è davvero in programma questa settimana (altrimenti si usa il
 * riquadro muto con TESTO_NON_IN_PROGRAMMA, copiato alla lettera da
 * VuotoPiatto.dc.html — niente striscia in quel caso, vedi il render).
 *
 * Non c'è un testo imposto dall'artboard per questo caso (in Piatto.dc.html
 * è un dato di mock, non copy fisso): tenendo dal mock i numeri scritti in
 * lettere e la struttura in due tempi — prima cosa succede in settimana, poi
 * la conseguenza sulla lista — senza il gioco di parole, che non regge con
 * un conteggio o un nome di pasto qualsiasi.
 */
function testoRiepilogo(nCasa: number, nFuori: number): string {
  if (nCasa === 0) {
    return `Fuori casa ${volte(nFuori)} questa settimana: non entra nella lista.`;
  }
  let frase = `In casa ${volte(nCasa)} questa settimana`;
  if (nFuori > 0) frase += `, fuori ${volte(nFuori)}`;
  frase += `. Il piatto entra ${volte(nCasa)} nella lista.`;
  return frase;
}

/** Il modulo dell'editor: gli stessi sette campi che la bozza mette al riparo e che SALVA scrive. */
type ModuloPiatto = BozzaPiatto;

const MODULO_NUOVO: ModuloPiatto = {
  nome: '', slotDefId: '', descrizione: '', settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [],
};

/**
 * Il confronto «è cambiato qualcosa?» (spec fase 7 §B.5, come `firma` dell'editor
 * dell'ingrediente): i sette campi del modulo con i valori grezzi — nome, pasto,
 * settimana e giorno del ciclo, ingredienti, componenti, descrizione. Le righe
 * contano in ordine e per valore (ingrediente, quantità, unità); i componenti e le
 * opzioni anche per id, perché salvaPiatto li riscrive in blocco. Tuple e non
 * oggetti: l'ordine delle chiavi di un oggetto letto dal server o dalla bozza non
 * deve contare.
 */
function firma(m: ModuloPiatto): string {
  const righe = (rr: DishIngredient[]) => rr.map((r) => [r.ingredientId, r.quantita, r.unita]);
  return JSON.stringify([
    m.nome,
    m.slotDefId,
    m.settimanaCiclo,
    m.giornoCiclo,
    righe(m.ingredienti),
    m.componenti.map((c) => [c.id, c.nome, c.opzioni.map((o) => [o.id, righe(o.righe)])]),
    m.descrizione,
  ]);
}

const FIRMA_NUOVO = firma(MODULO_NUOVO);

/** Il modulo come lo scrive il piatto letto dal server: la firma di riferimento di un piatto esistente. */
function moduloDaPiatto(p: Dish): ModuloPiatto {
  return {
    nome: p.nome, slotDefId: p.slotDefId, descrizione: p.descrizione ?? '', settimanaCiclo: p.settimanaCiclo,
    giornoCiclo: p.giornoCiclo, ingredienti: p.ingredienti, componenti: p.componenti,
  };
}

/**
 * Editor della ricetta: crea (`id === 'nuovo'`) o modifica un piatto del
 * repertorio. Dalla fase 7 ha un modo solo, come l'editor dell'ingrediente
 * (spec §B.2): si apre sempre modificabile, con la testata di modifica (la
 * freccia verso /piatti e il nome come campo), senza tab bar, e SALVA nel Dock
 * spento finché niente cambia o finché il modulo non è valido. Aprire un
 * piatto per guardarlo non scrive niente: si scrive solo con SALVA.
 */
export default function Piatto() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const nuovo = id === 'nuovo';
  // Pagina di modifica piena, senza tab bar (spec fase 7 §B.2): il Dock scende a 22 da sé.
  useNascondiBarra(true);

  const [caricamento, setCaricamento] = useState(true);
  const [erroreCarica, setErroreCarica] = useState<string | null>(null);
  const [erroreSalva, setErroreSalva] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [slotDefs, setSlotDefs] = useState<MealSlotDef[]>([]);
  const [catalogo, setCatalogo] = useState<Ingredient[]>([]);
  const [piattoOriginale, setPiattoOriginale] = useState<Dish | null>(null);
  // La firma del piatto letto dal server, prima della bozza: null finché non c'è.
  const [firmaIniziale, setFirmaIniziale] = useState<string | null>(null);
  const [giorniCasa, setGiorniCasa] = useState<Set<string>>(new Set());
  const [giorniFuori, setGiorniFuori] = useState<Set<string>>(new Set());
  const [dataInizioSettimana, setDataInizioSettimana] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [slotDefId, setSlotDefId] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [settimanaCiclo, setSettimanaCiclo] = useState<number | null>(null);
  const [giornoCiclo, setGiornoCiclo] = useState<number | null>(null);
  // Quante settimane ha il ciclo: sotto le due, la scelta della settimana non
  // ha nulla fra cui scegliere e la sezione non compare.
  const [settimaneCiclo, setSettimaneCiclo] = useState(1);
  const [ingredienti, setIngredienti] = useState<DishIngredient[]>([]);
  const [componenti, setComponenti] = useState<Componente[]>([]);
  // null = chiuso. 'principale' apre il selettore per `ingredienti` (comportamento
  // di sempre); 'opzione' lo apre per le righe di una singola opzione di un
  // componente — stesso selettore, target diverso, per non duplicare il
  // pattern (selezione, ricerca, "nessun risultato") su due liste.
  const [selettore, setSelettore] = useState<
    { tipo: 'principale' } | { tipo: 'opzione'; componenteId: string; opzioneId: string } | null
  >(null);
  const [confermaEliminazione, setConfermaEliminazione] = useState(false);
  const nomeRef = useRef<HTMLTextAreaElement>(null);

  // Il titolo va a capo su più righe come nell'artboard (che lo scrive con un
  // <br>): un <input> a riga singola l'avrebbe semplicemente tagliato fuori
  // dallo schermo. La textarea si auto-ridimensiona sul contenuto reale. Anche
  // su `caricamento`: la textarea nasce a caricamento finito, con il nome già scritto.
  useEffect(() => {
    const el = nomeRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [nome, caricamento]);

  useEffect(() => {
    let vivo = true;
    async function carica() {
      try {
        const [defs, catalogoIngredienti, settimana, repertorio, impostazioni] = await Promise.all([
          leggiSlotDefs(),
          leggiIngredienti(),
          leggiSettimanaCorrente(),
          nuovo ? Promise.resolve(null) : leggiRepertorio(),
          leggiImpostazioni(),
        ]);
        if (!vivo) return;
        setSlotDefs(defs);
        setCatalogo(catalogoIngredienti);
        setSettimaneCiclo(impostazioni.settimaneCiclo);
        if (settimana) setDataInizioSettimana(settimana.dataInizio);

        if (!nuovo) {
          const trovato = (repertorio ?? []).find((p) => p.id === id) ?? null;
          if (!trovato) {
            setErroreCarica('Piatto non trovato.');
          } else {
            setPiattoOriginale(trovato);
            setNome(trovato.nome);
            setSlotDefId(trovato.slotDefId);
            setDescrizione(trovato.descrizione ?? '');
            setSettimanaCiclo(trovato.settimanaCiclo);
            setGiornoCiclo(trovato.giornoCiclo);
            setIngredienti(trovato.ingredienti);
            // Byte per byte, id compresi: senza questo, salva() passava
            // sempre `componenti: []` a salvaPiatto (Task 7), che li riscrive
            // in blocco — aprire e salvare senza toccare nulla avrebbe
            // azzerato in cascata dish_option, le righe di opzione e
            // meal_slot_choice di un piatto già in uso (nota della review
            // del Task 1).
            setComponenti(trovato.componenti);
            // Il riferimento di «è cambiato qualcosa?» è il piatto del server,
            // non la bozza che si applica sotto: una bozza ripresa è lavoro non
            // salvato, e SALVA deve accendersi.
            setFirmaIniziale(firma(moduloDaPiatto(trovato)));
            if (settimana) {
              const casa = new Set<string>();
              const fuori = new Set<string>();
              for (const s of settimana.slots) {
                if (s.dishId !== trovato.id) continue;
                if (s.stato === 'casa') casa.add(s.data);
                else fuori.add(s.data);
              }
              setGiorniCasa(casa);
              setGiorniFuori(fuori);
            }
          }
        }

        // Dopo i dati veri, non prima: la bozza è più recente di quello che
        // c'è sul server (è lavoro non ancora salvato) e deve vincere.
        const bozza = riprendiBozza(id);
        if (bozza) {
          setNome(bozza.nome);
          setSlotDefId(bozza.slotDefId);
          setDescrizione(bozza.descrizione);
          setSettimanaCiclo(bozza.settimanaCiclo);
          setGiornoCiclo(bozza.giornoCiclo);
          setIngredienti(bozza.ingredienti);
          setComponenti(bozza.componenti);
        }

        // Chi è appena tornato dalla creazione di un ingrediente lo aveva
        // creato per questo piatto: entra da solo, con grammatura da
        // scrivere. Il catalogo appena letto è la fonte dell'unità di base.
        const creato = raccogliIngredienteCreato(id);
        if (creato) {
          const ing = catalogoIngredienti.find((i) => i.id === creato);
          if (ing) {
            setIngredienti((prev) =>
              prev.some((r) => r.ingredientId === creato)
                ? prev
                : [...prev, { ingredientId: creato, quantita: 0, unita: ing.unitaBase }],
            );
          }
        }
      } catch (errore) {
        console.error('piatto: caricamento fallito.', errore);
        if (vivo) setErroreCarica('Non riusciamo a caricare il piatto. Riprova più tardi.');
      } finally {
        if (vivo) setCaricamento(false);
      }
    }
    carica();
    return () => {
      vivo = false;
    };
  }, [id, nuovo]);

  /**
   * Unico punto in cui il selettore aggiunge davvero un ingrediente,
   * qualunque sia il target aperto: alla lista fissa `ingredienti` o alle
   * righe di un'opzione. Stesso selettore, stesso comportamento di sempre,
   * solo con una destinazione in più. Chiuderlo smonta `SelettoreIngrediente`
   * e con lui la ricerca: riaprendolo si riparte dall'elenco intero, perché la
   * ricerca di prima non ha niente a che vedere con l'ingrediente successivo.
   */
  function aggiungiIngrediente(ing: Ingredient) {
    if (!selettore) return;
    if (selettore.tipo === 'principale') {
      setIngredienti((prev) => [...prev, { ingredientId: ing.id, quantita: 0, unita: ing.unitaBase }]);
    } else {
      aggiungiRigaOpzione(selettore.componenteId, selettore.opzioneId, ing);
    }
    setSelettore(null);
  }

  function cambiaQuantita(ingredientId: string, quantita: number) {
    setIngredienti((prev) => prev.map((r) => (r.ingredientId === ingredientId ? { ...r, quantita } : r)));
  }

  function rimuoviIngrediente(ingredientId: string) {
    setIngredienti((prev) => prev.filter((r) => r.ingredientId !== ingredientId));
  }

  /**
   * Nome + prima opzione vuota, come da brief: un componente senza opzioni
   * non avrebbe nulla da mostrare in Scegli, quindi nasce sempre con una.
   */
  function aggiungiComponente() {
    setComponenti((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nome: '', opzioni: [{ id: crypto.randomUUID(), righe: [] }] },
    ]);
  }

  function rimuoviComponente(componenteId: string) {
    setComponenti((prev) => prev.filter((c) => c.id !== componenteId));
  }

  function cambiaNomeComponente(componenteId: string, nome: string) {
    setComponenti((prev) => prev.map((c) => (c.id === componenteId ? { ...c, nome } : c)));
  }

  function aggiungiOpzione(componenteId: string) {
    setComponenti((prev) =>
      prev.map((c) =>
        c.id === componenteId ? { ...c, opzioni: [...c.opzioni, { id: crypto.randomUUID(), righe: [] }] } : c,
      ),
    );
  }

  /**
   * Un componente sotto 1 opzione si elimina: sotto quella soglia il
   * componente non avrebbe più niente fra cui scegliere (brief, Step 1).
   */
  function rimuoviOpzione(componenteId: string, opzioneId: string) {
    setComponenti((prev) =>
      prev.flatMap((c) => {
        if (c.id !== componenteId) return [c];
        if (c.opzioni.length <= 1) return [];
        return [{ ...c, opzioni: c.opzioni.filter((o) => o.id !== opzioneId) }];
      }),
    );
  }

  function aggiungiRigaOpzione(componenteId: string, opzioneId: string, ing: Ingredient) {
    setComponenti((prev) =>
      prev.map((c) => {
        if (c.id !== componenteId) return c;
        return {
          ...c,
          opzioni: c.opzioni.map((o) => {
            if (o.id !== opzioneId) return o;
            // Stesso vincolo del catalogo principale (unique index
            // dish_ingredient_opzione_unica): un ingrediente non può comparire
            // due volte nella stessa opzione.
            if (o.righe.some((r) => r.ingredientId === ing.id)) return o;
            return { ...o, righe: [...o.righe, { ingredientId: ing.id, quantita: 0, unita: ing.unitaBase }] };
          }),
        };
      }),
    );
  }

  function cambiaQuantitaOpzione(componenteId: string, opzioneId: string, ingredientId: string, quantita: number) {
    setComponenti((prev) =>
      prev.map((c) => {
        if (c.id !== componenteId) return c;
        return {
          ...c,
          opzioni: c.opzioni.map((o) =>
            o.id !== opzioneId
              ? o
              : { ...o, righe: o.righe.map((r) => (r.ingredientId === ingredientId ? { ...r, quantita } : r)) },
          ),
        };
      }),
    );
  }

  function rimuoviRigaOpzione(componenteId: string, opzioneId: string, ingredientId: string) {
    setComponenti((prev) =>
      prev.map((c) => {
        if (c.id !== componenteId) return c;
        return {
          ...c,
          opzioni: c.opzioni.map((o) =>
            o.id !== opzioneId ? o : { ...o, righe: o.righe.filter((r) => r.ingredientId !== ingredientId) },
          ),
        };
      }),
    );
  }

  /**
   * Da chiamare prima di ogni uscita verso l'editor di un ingrediente: è
   * l'unica navigazione che si porta via lavoro non salvato, perché il
   * piatto qui esiste solo in memoria finché non si preme SALVA.
   */
  function riparaBozzaPrimaDiUscire() {
    salvaBozza(id, { nome, slotDefId, descrizione, settimanaCiclo, giornoCiclo, ingredienti, componenti });
  }

  /**
   * La freccia (spec fase 7 §B.2): esce verso /piatti senza chiedere, e le
   * modifiche non salvate si perdono, come con ANNULLA prima della fase 7. La
   * bozza si tratta come la trattava ANNULLA: su un piatto esistente si scarta,
   * perché un giro completo (uscita e rientro) non risusciti modifiche appena
   * buttate; su un piatto nuovo ANNULLA usciva senza toccarla, e così resta.
   */
  function esci() {
    if (!nuovo) scartaBozza(id);
    router.push('/piatti');
  }

  /**
   * La conferma del Dialogo (spec fase 7 §B.3 punto 7). Se l'eliminazione
   * fallisce l'errore si rilancia: il Dialogo lo mostra sotto i tasti e resta
   * aperto. Se riesce, come prima: via la bozza e ritorno a /piatti.
   */
  async function confermaElimina(): Promise<void> {
    if (!piattoOriginale) return;
    try {
      await eliminaPiatto(piattoOriginale.id);
    } catch (errore) {
      console.error('piatto: eliminazione fallita.', errore);
      throw errore;
    }
    scartaBozza(id);
    setConfermaEliminazione(false);
    router.push('/piatti');
  }

  const catalogoPerId = new Map(catalogo.map((i) => [i.id, i]));

  // La lista da cui il selettore esclude ciò che c'è già dipende dal target
  // aperto: `ingredienti` per il selettore principale, le righe della
  // singola opzione per quello aperto da un componente. Stesso selettore,
  // deduplica sulla lista giusta.
  const righeTargetSelettore: DishIngredient[] =
    selettore?.tipo === 'opzione'
      ? (componenti.find((c) => c.id === selettore.componenteId)?.opzioni.find((o) => o.id === selettore.opzioneId)
          ?.righe ?? [])
      : ingredienti;
  const nonAncoraNelPiatto = catalogo.filter((i) => !righeTargetSelettore.some((r) => r.ingredientId === i.id));

  const giorniSettimana = dataInizioSettimana ? giorniDellaSettimana(dataInizioSettimana) : [];
  const giorni = GIORNI_LABEL.map((label, i) => {
    const iso = giorniSettimana[i];
    return { label, inProgramma: iso ? giorniCasa.has(iso) : false };
  });
  const nCasa = giorni.filter((g) => g.inProgramma).length;
  const nFuori = giorniFuori.size;

  const senzaIngredienti = ingredienti.length === 0;
  // dish_ingredient ha `check (quantita > 0)`: un ingrediente aggiunto e mai
  // toccato parte da quantita: 0 (vedi aggiungiIngrediente sopra) e
  // salverebbe sempre lo stesso errore generico, senza dire quale tessera è
  // il problema (I2). Il salvataggio resta disattivato finché non è > 0.
  const quantitaNonValide = new Set(ingredienti.filter((r) => r.quantita <= 0).map((r) => r.ingredientId));

  const salvataggioDisabilitato =
    senzaIngredienti || quantitaNonValide.size > 0 || componentiNonValidi(componenti);
  const modulo: ModuloPiatto = { nome, slotDefId, descrizione, settimanaCiclo, giornoCiclo, ingredienti, componenti };
  const cambiato = firma(modulo) !== (nuovo ? FIRMA_NUOVO : firmaIniziale);
  // Spento se non è cambiato niente o se il modulo non è valido (spec fase 7 §B.5):
  // la ragione della seconda resta scritta nel modulo, dove sta.
  const spento = salvataggioDisabilitato || !cambiato;

  async function salva() {
    if (spento || salvando) return;
    setSalvando(true);
    setErroreSalva(null);
    try {
      // Fallback silenzioso sul primo pasto se l'utente non ne ha ancora
      // scelto uno: la schermata non blocca il salvataggio su questo (solo
      // sugli ingredienti, per Step 4), ma dish.slot_def_id non è nullable.
      const slotEffettivo = slotDefId || slotDefs[0]?.id || '';
      const nomeEffettivo = nome.trim();
      const descrizioneEffettiva = descrizione.trim() || null;
      // Una settimana del ciclo che il ciclo non contiene più (si è passati
      // da quattro settimane a due) filtrerebbe via il piatto per sempre: si
      // scrive solo quello che il ciclo corrente può ancora usare.
      const settimanaEffettiva = settimanaCiclo !== null && settimanaCiclo <= settimaneCiclo ? settimanaCiclo : null;
      const componentiEffettivi = componenti.map((c) => ({
        id: c.id,
        nome: c.nome.trim(),
        opzioni: c.opzioni.map((o) => ({ id: o.id, righe: o.righe })),
      }));
      await salvaPiatto({
        id: nuovo ? undefined : id,
        nome: nomeEffettivo,
        slotDefId: slotEffettivo,
        fonte: piattoOriginale?.fonte ?? 'proprio',
        attivo: piattoOriginale?.attivo ?? true,
        descrizione: descrizioneEffettiva,
        settimanaCiclo: settimanaEffettiva,
        giornoCiclo,
        ingredienti,
        componenti: componentiEffettivi,
      });
      scartaBozza(id);
      // SALVA torna a /piatti anche su un piatto esistente (spec fase 7 §B.5): la
      // vista a cui tornava prima non c'è più. `salvando` resta vero: la pagina si
      // smonta, e un secondo tocco nel frattempo non riscrive.
      router.push('/piatti');
    } catch (errore) {
      console.error('piatto: salvataggio fallito.', errore);
      setErroreSalva('Non siamo riusciti a salvare il piatto. Riprova.');
      setSalvando(false);
    }
  }

  const freccia = { etichetta: 'Torna ai piatti', onTorna: esci };

  if (erroreCarica) {
    // Niente Dock e niente ELIMINA: su un piatto che non si è letto non c'è niente da salvare né da eliminare.
    return (
      <TestataModifica freccia={freccia}>
        <div style={{ padding: '6px 16px' }}>
          <MessaggioErrore ruolo="alert">{erroreCarica}</MessaggioErrore>
        </div>
      </TestataModifica>
    );
  }

  if (caricamento) {
    return (
      <TestataModifica freccia={freccia}>
        <div style={{ padding: '6px 16px' }}>
          <Carico />
        </div>
      </TestataModifica>
    );
  }

  return (
    <TestataModifica
      freccia={freccia}
      nome={
        <textarea
          ref={nomeRef}
          rows={1}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => {
            // Il nome è una stringa sola: va a capo da solo per lunghezza,
            // non deve poter contenere newline inseriti a mano.
            if (e.key === 'Enter') e.preventDefault();
          }}
          placeholder="Dai un nome al piatto"
          className="nome-piatto"
          style={{
            display: 'block', width: '100%', resize: 'none', overflow: 'hidden',
            fontFamily: 'inherit', fontSize: 32, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.05,
            color: 'var(--ink)', padding: '0 2px 8px', border: 'none',
            borderBottom: '1.5px solid rgba(20,22,58,0.14)', background: 'transparent', outline: 'none',
          }}
        />
      }
    >
      <style jsx>{`
        .nome-piatto::placeholder,
        .ricetta::placeholder {
          color: var(--icona-spenta);
        }
      `}</style>

      <div
        className="sc scroll-app con-dock"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <Blocco primo>
          <Segmento
            opzioni={slotDefs.map((s) => ({ id: s.id, label: s.nome }))}
            valore={slotDefId}
            onCambia={setSlotDefId}
          />
        </Blocco>

        {/* Dove sta il piatto nel piano: la settimana del giro e il giorno
            fisso. Entrambi facoltativi — un piatto senza niente di dichiarato
            resta buono per tutte le settimane e per tutti i giorni, che è
            come si comportava il repertorio prima della rotazione. La
            settimana compare solo se un ciclo c'è: con una sola settimana non
            avrebbe nulla fra cui scegliere. */}
        <Blocco>
          <Etichetta>NEL PIANO</Etichetta>
          {settimaneCiclo > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <Etichetta>SETTIMANA DEL GIRO</Etichetta>
              <Pillole
                opzioni={[
                  { valore: null, label: 'TUTTE', descrizione: 'Va bene in ogni settimana del giro' },
                  ...Array.from({ length: settimaneCiclo }, (_, i) => ({
                    valore: i + 1,
                    label: String(i + 1),
                    descrizione: `Settimana ${i + 1} del giro`,
                  })),
                ]}
                valore={settimanaCiclo}
                onCambia={setSettimanaCiclo}
                gruppo="Settimana del giro"
              />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Etichetta>GIORNO FISSO</Etichetta>
            <Pillole
              opzioni={[
                { valore: null, label: 'LIBERO', descrizione: 'Lo sceglie l’app, ruotando' },
                ...GIORNI_LABEL.map((label, i) => ({ valore: i, label, descrizione: GIORNI_LUNGHI[i] })),
              ]}
              valore={giornoCiclo}
              onCambia={setGiornoCiclo}
              gruppo="Giorno fisso"
              aCapo
            />
          </div>
        </Blocco>

        <Blocco>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Etichetta>INGREDIENTI</Etichetta>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', color: 'var(--sec)' }}>
              PER 1 PORZIONE
            </span>
          </div>

          {ingredienti.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {ingredienti.map((riga) => {
                const ing = catalogoPerId.get(riga.ingredientId);
                if (!ing) return null;
                return (
                  <TesseraIngrediente
                    key={riga.ingredientId}
                    nome={ing.nome}
                    area={ing.area}
                    quantita={riga.quantita}
                    unita={riga.unita}
                    onCambiaQuantita={(q) => cambiaQuantita(riga.ingredientId, q)}
                    onRimuovi={() => rimuoviIngrediente(riga.ingredientId)}
                    quantitaValida={!quantitaNonValide.has(riga.ingredientId)}
                    hrefModifica={`/piatti/${id}/ingredienti/${riga.ingredientId}`}
                    onPrimaDiModificare={riparaBozzaPrimaDiUscire}
                  />
                );
              })}
            </div>
          )}

          <AggiungiTratteggiato etichetta="AGGIUNGI INGREDIENTE" onClick={() => setSelettore({ tipo: 'principale' })} />

          {/* Una Nota e non un errore (DESIGN.md §8 Messaggi): dice perché SALVA è
              spento. Su un piatto nuovo c'è dalla prima apertura, e lì non ha niente
              di sbagliato da segnalare: manca solo quello che si sta per scrivere. */}
          {senzaIngredienti && <Nota>{TESTO_SENZA_INGREDIENTI}</Nota>}

          {/* Il bordo rosso della tessera segnala che qualcosa non va, ma non
              dice cosa fare, e il numero in alto nella tessera non si legge
              come un campo da riempire — sembra un'etichetta. Senza questa
              riga il salvataggio resta bloccato senza spiegazione: si prova a
              toccare in giro finché non si scopre da soli che quel numero si
              scrive. Nominare gli ingredienti che mancano evita anche di
              doverli cercare a occhio in una griglia lunga. */}
          {!senzaIngredienti && quantitaNonValide.size > 0 && (
            <MessaggioErrore>
              {quantitaNonValide.size === 1 ? 'Manca la grammatura di' : 'Mancano le grammature di'}{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>
                {ingredienti
                  .filter((r) => quantitaNonValide.has(r.ingredientId))
                  .map((r) => catalogoPerId.get(r.ingredientId)?.nome)
                  .filter(Boolean)
                  .join(', ')}
              </strong>
              : tocca il numero sulla tessera e scrivi quanto ne usi per una porzione.
            </MessaggioErrore>
          )}
        </Blocco>

        <Blocco>
          <ComponentiPiatto
            componenti={componenti}
            catalogoPerId={catalogoPerId}
            onAggiungiComponente={aggiungiComponente}
            onRimuoviComponente={rimuoviComponente}
            onCambiaNomeComponente={cambiaNomeComponente}
            onAggiungiOpzione={aggiungiOpzione}
            onRimuoviOpzione={rimuoviOpzione}
            onAggiungiIngrediente={(componenteId, opzioneId) => setSelettore({ tipo: 'opzione', componenteId, opzioneId })}
            onCambiaQuantita={cambiaQuantitaOpzione}
            onRimuoviRiga={rimuoviRigaOpzione}
          />
        </Blocco>

        <Blocco>
          <Etichetta>COME SI FA</Etichetta>
          <textarea
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            placeholder="Il procedimento, se serve ricordarlo"
            aria-label="Procedimento del piatto"
            rows={4}
            className="ricetta"
            style={{
              display: 'block', width: '100%', boxSizing: 'border-box', resize: 'none',
              fontFamily: 'inherit', fontSize: 14, lineHeight: 1.5, color: 'var(--ink)',
              padding: '13px 14px', borderRadius: 14,
              background: 'var(--superficie)', border: '1px solid var(--bordo)', boxShadow: 'var(--ombra-pannello)', outline: 'none',
            }}
          />
        </Blocco>

        <Blocco>
          {nCasa === 0 && nFuori === 0 ? (
            // Non in programma: niente striscia di sette giorni tutti spenti
            // (rumore che non dice niente) — il riquadro muto di
            // VuotoPiatto.dc.html, copiato alla lettera, dice cosa manca e
            // cosa fare per rimediare.
            <>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--icona-spenta)' }}>
                IN QUESTA SETTIMANA
              </span>
              <div style={{ padding: '16px 18px', borderRadius: 18, background: 'var(--spento)', fontSize: 13, lineHeight: 1.45, color: 'var(--testo-2)' }}>
                {TESTO_NON_IN_PROGRAMMA}
              </div>
            </>
          ) : (
            <>
              <Etichetta>IN QUESTA SETTIMANA</Etichetta>
              <div style={{ display: 'flex', gap: 5 }}>
                {giorni.map((g) => (
                  <span
                    key={g.label}
                    style={{
                      flex: '1 1 0%', textAlign: 'center', padding: '11px 0', borderRadius: 12,
                      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: g.inProgramma ? 700 : 500, letterSpacing: '0.07em',
                      color: g.inProgramma ? 'var(--superficie)' : 'var(--ter)',
                      background: g.inProgramma ? 'var(--ink)' : 'var(--spento)',
                    }}
                  >
                    {g.label}
                  </span>
                ))}
              </div>
              <p style={{ margin: '2px 4px 0', fontSize: 13, lineHeight: 1.45, color: 'var(--testo-2)' }}>
                {testoRiepilogo(nCasa, nFuori)}
              </p>
            </>
          )}
        </Blocco>

        {/* ELIMINA in coda (spec fase 7 §B.3 punto 7), solo su un piatto che esiste:
            su uno nuovo non c'è niente da eliminare, e la freccia fa quel lavoro.
            Passa sempre dal Dialogo di conferma, mai con un tocco solo. Il nome
            accessibile è quello del cestino di prima. */}
        {!nuovo && (
          <Blocco>
            <TastoSecondario aria-label="Elimina piatto" onClick={() => setConfermaEliminazione(true)} style={{ color: 'var(--errore)' }}>
              ELIMINA
            </TastoSecondario>
          </Blocco>
        )}
      </div>

      <Dock>
        {erroreSalva && (
          // Sopra il Dock, come nell'editor dell'ingrediente: fuori dalla pillola, su fondo bianco, perché sotto scorre la pagina.
          <p role="alert" style={{
            position: 'absolute', left: 0, right: 0, bottom: 'calc(100% + 8px)', margin: 0, padding: '10px 14px',
            borderRadius: 14, background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)',
            fontSize: 12.5, lineHeight: 1.45, color: 'var(--errore)',
          }}>
            {erroreSalva}
          </p>
        )}
        {/* In volo lo stato spento del sistema (`.dock-primario:disabled`, DESIGN.md §13,
            26/09, punto 6), non l'opacità: con l'opacità il testo bianco scende sotto soglia. */}
        <button
          type="button"
          className="dock-primario"
          onClick={() => void salva()}
          disabled={spento || salvando}
          aria-busy={salvando || undefined}
        >
          SALVA
        </button>
      </Dock>

      {selettore && (
        <SelettoreIngrediente
          ingredienti={nonAncoraNelPiatto}
          onScegli={aggiungiIngrediente}
          onChiudi={() => setSelettore(null)}
          hrefNuovo={`/piatti/${id}/ingredienti/nuovo`}
          onPrimaDiCreare={riparaBozzaPrimaDiUscire}
        />
      )}

      {confermaEliminazione && (
        <FoglioDalBasso
          etichetta="Eliminare questo piatto?"
          onChiudi={() => setConfermaEliminazione(false)}
          altezza="contenuto"
          ruolo="alertdialog"
          chiudiDalVelo={false}
          livello={2}
        >
          <DialogoConferma
            titolo="Eliminare questo piatto?"
            testo={TESTO_ELIMINA}
            azione="ELIMINA"
            tono="distruttivo"
            erroreTesto={ERRORE_ELIMINA}
            onConferma={confermaElimina}
            onAnnulla={() => setConfermaEliminazione(false)}
          />
        </FoglioDalBasso>
      )}
    </TestataModifica>
  );
}

interface OpzionePillola {
  valore: number | null;
  label: string;
  descrizione: string;
}

/**
 * Fila di pillole a scelta singola, con `null` come prima opzione: è la
 * forma che serve qui, dove "non deciso" è una scelta legittima e va detta
 * esplicitamente invece di essere l'assenza di selezione.
 *
 * L'area di tap è 44px anche se la pillola disegnata è più bassa, come in
 * Segmento: la regola dei bersagli vale ovunque, non solo dove il disegno è
 * già abbastanza alto. Dalla fase 7 la pillola spenta è bianca (DESIGN.md §8
 * Pillole d'azione): il riquadro bianco che la conteneva non c'è più.
 */
function Pillole({ opzioni, valore, onCambia, gruppo, aCapo = false }: {
  opzioni: OpzionePillola[];
  valore: number | null;
  onCambia: (v: number | null) => void;
  gruppo: string;
  /**
   * Spec §C sui chip giorno: "tutti visibili senza scroll orizzontale (due
   * righe se serve)". Prop dedicata invece di cambiare il default: le
   * pillole di SETTIMANA DEL GIRO stanno comode su una riga con lo scroll
   * attuale, e non c'è motivo di toccarne il comportamento.
   */
  aCapo?: boolean;
}) {
  return (
    <div className="sc" style={aCapo ? undefined : { overflowX: 'auto' }}>
      <div style={{ display: 'flex', flexWrap: aCapo ? 'wrap' : 'nowrap', gap: 6, width: aCapo ? '100%' : 'max-content' }}>
        {opzioni.map((o) => {
          const attivo = o.valore === valore;
          return (
            <button
              key={o.descrizione}
              type="button"
              onClick={() => onCambia(o.valore)}
              aria-pressed={attivo}
              aria-label={`${gruppo}: ${o.descrizione}`}
              style={{ flex: 'none', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}
            >
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 42, height: 36, padding: '0 12px', borderRadius: 999,
                  fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: attivo ? 700 : 500,
                  letterSpacing: '0.09em',
                  color: attivo ? 'var(--superficie)' : 'var(--sec)',
                  background: attivo ? 'var(--ink)' : 'var(--superficie)',
                  border: attivo ? 'none' : '1px solid rgba(20,22,58,0.09)',
                }}
              >
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

Spariscono dal file (non copiarle): `VistaPiatto`, `EtichettaCampo`, `Cornice`, `annulla`, `tapCestino`, lo stato `modalita`, `errore`, `eliminando`, il ramo `if (modalita === 'vista')` con `testoRiga`/`righeIngredienti`/`righeComponenti`, il piede `coda-barra` con `ANNULLA`/`SALVA PIATTO`, il dialogo scritto a mano, gli import di `Link`, `nomeArea`, `type ReactNode`.

- [ ] **Step 4: verifica che passino**

Run: `npx vitest run "src/app/(app)/piatti"`
Expected: PASS, tutti (`page.test.tsx`, `apertura.test.tsx`, `selettore.test.tsx`, `componenti.test.tsx`, `bozza.test.ts`, e i test di Piatti, Piatti veloce e dell'editor dell'ingrediente, che non cambiano). Se un test del giro bozza fallisce, **non toccare `carica()` né `bozza.ts`**: controlla che la firma di riferimento si prenda dal piatto del server prima della bozza.

- [ ] **Step 5: controlli**

- `grep -nE "#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}\b|rgba\(20, ?22, ?58, ?0?\.(05|045|10|12|16|28|35)\)" "src/app/(app)/piatti/[id]/page.tsx"` → nessuna riga.
- `grep -n "rgba(" "src/app/(app)/piatti/[id]/page.tsx"` → due righe sole: `rgba(20,22,58,0.14)` sotto il nome (identica al campo del nome dell'editor dell'ingrediente) e `rgba(20,22,58,0.09)` sul bordo della pillola spenta (§2.5, pillole d'azione).
- `grep -nE "VistaPiatto|modalita|MODIFICA|EtichettaCampo|Cornice|coda-barra|con-piede|Annulla modifiche|SALVA PIATTO|fontSize: 34" "src/app/(app)/piatti/[id]/page.tsx"` → nessuna riga.
- `grep -rn "vista.test" src` → nessuna riga.
- `grep -n $'\xc3\x83' "src/app/(app)/piatti/[id]/page.tsx" "src/app/(app)/piatti/[id]/__tests__/page.test.tsx" "src/app/(app)/piatti/__tests__/apertura.test.tsx"` → vuoto.
- `npm test`, `npx tsc --noEmit`, `npm run lint`: verdi.

- [ ] **Step 6: commit**

```bash
git add "src/app/(app)/piatti/[id]/page.tsx" "src/app/(app)/piatti/[id]/__tests__/page.test.tsx" "src/app/(app)/piatti/__tests__/apertura.test.tsx"
git commit -m "feat(piatto): l'editor a un modo solo, con la testata di modifica, SALVA nel Dock ed ELIMINA dal dialogo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(il `git mv` di `vista.test.tsx` è già nell'indice.)

Scelte di resa di questo task, accettate: il filetto `0,14` sotto il nome (lo stesso del campo del nome dell'editor dell'ingrediente) e il bordo `0,09` delle pillole spente, che passano da `--fondo` a `--superficie` (il riquadro bianco di `NEL PIANO` non c'è più); il selettore ad `altezza="alto"` (top 88, come i fogli della Dispensa) invece di «alto quanto serve fino al 70 vh»; né il selettore né il dialogo mettono una voce nella cronologia (niente `useIndietroFogli`, come Confezioni in fase 6). Il nome si confronta grezzo, come nell'ingrediente: uno spazio in coda accende SALVA, che poi scrive il nome ripulito.

**Test esistenti toccati (Task 6)**

**`src/app/(app)/piatti/[id]/__tests__/page.test.tsx`**
- Solo selettori (`rendi()`, `salva()`, via `entraInModifica`, `within(alertdialog)`): *creazione: gli slot vengono dai meal_slot_def reali…*; *un piatto nuovo, senza ingredienti, ha il salvataggio bloccato…*; *aggiungere un ingrediente dal selettore NON sblocca il salvataggio…*; *la striscia dei sette giorni riflette la settimana reale…*; *un piatto assegnato ma sempre fuori casa…*; *salva chiama salvaPiatto con la grammatura non moltiplicata…*; *riprende il piatto lasciato a metà…*; *la bozza vince sui dati del server…*; *mette al riparo la bozza quando si esce a creare un ingrediente*; *ogni ingrediente del piatto ha un accesso al proprio editor*; *il selettore ha un campo di ricerca solo quando la lista e lunga*; *la ricerca filtra per nome…*; *senza risultati suggerisce di crearlo…*; *il selettore degli ingredienti è un Foglio dal basso…* (Task 4); *un piatto caricato con componenti li mostra*; *aggiungere un componente con un'opzione e salvare…*; *un'opzione senza righe blocca il salva*; *conserva un componente attraverso il giro bozza…*; *i chip GIORNO FISSO vanno a capo…*.
- Anche nelle attese: *rimuovere l'ultimo ingrediente ridisattiva il salvataggio* (prima si cambia il nome); *modifica: carica nome, pasto e ingredienti…* (SALVA spento); *il cestino su un piatto nuovo…* → *su un piatto nuovo ELIMINA non c'è: la freccia…*; *il cestino su un piatto esistente chiede conferma…* → *ELIMINA su un piatto esistente chiede conferma…*; *ANNULLA nella conferma chiude il dialogo…*; *salvare il piatto scarta la bozza…* (si cambia il nome, si torna a `/piatti`); *aprire un piatto con componenti e salvare senza toccare nulla…* → *…cambiare solo il nome e salvare conserva gli id originali*.

- Nuovi, in fondo al file: il blocco *Piatto (editor): un modo solo, SALVA nel Dock ed ELIMINA*, compresi i due test su `TESTO_SENZA_INGREDIENTI` come Nota e quello sulla grammatura mancante in `--errore`.

**`src/app/(app)/piatti/__tests__/vista.test.tsx` → `apertura.test.tsx`**
- Restano, riscritti: *apre in vista: niente input, niente SALVA…* → *aprire un piatto esistente mostra il modulo, non emette scritture…*; *la vista mostra nome, pasto, settimana e giorno…* → *il modulo mostra pasto, settimana del giro e giorno fisso…*; *la vista compone le righe…* → *il modulo mostra gli ingredienti fissi e i componenti…*; *un piatto nuovo apre direttamente in modifica…* → *un piatto nuovo apre il modulo vuoto…*; *una bozza pendente … apre direttamente in modifica* → *una bozza pendente vince … e SALVA si accende*; *un salvataggio fallito non lascia un errore fantasma…* e *SALVA→MODIFICA→SALVA…* → *un salvataggio fallito: l'errore sopra il Dock, e il secondo SALVA riparte…*; *ANNULLA dopo MODIFICA ripristina…* → *la freccia torna a /piatti … e scarta la bozza come ANNULLA* (più *su un piatto nuovo la freccia … senza toccare la bozza*).
- Tolti (il comportamento non esiste più): *MODIFICA accende l'editor attuale*; *SALVA su piatto esistente torna alla vista senza navigare* (ora torna a `/piatti`: lo copre *SALVA su un piatto esistente scrive e torna a /piatti* in `page.test.tsx`); *SALVA→MODIFICA→ANNULLA ripristina dallo stato appena salvato…*; *Indietro nella vista chiama router.back()*.

**Non toccati:** `src/app/(app)/piatti/[id]/__tests__/bozza.test.ts`, i test di Piatti (`page`, `ricerca`, `da`), di Piatti veloce e dell'editor dell'ingrediente.

---

### Task 7: I documenti di design

**Files:**
- Modify: `design/sistema/DESIGN.md`
- Modify: `docs/superpowers/specs/DESIGN-SYSTEM.md`

**Interfaces:** nessuna. Prima di scrivere leggi `git log --oneline origin/main..HEAD` e i diff dei task 1–6: se una misura o un nome qui sotto non corrisponde al codice, vince il codice, e lo scrivi nel report. Modifiche solo con Edit.

- [ ] **Step 1: `DESIGN.md` §8 Riga piatto** — in fondo alla voce aggiungi:

```markdown
**Due modi** (dal 26/09, fase 7). In Piatti la riga **apre** il piatto (`Apri {nome}`, chevron).
In Scegli la riga **sceglie** (`Scegli {nome}`, `aria-pressed`): la riga scelta è **piena**, fondo
`--ink`, nome in `--superficie`, sottoriga a `rgba(255,255,255,0.62)`, pallini d'area nel loro
colore, e al posto del chevron un tondo 24 in `--superficie` con la spunta `--ink` — la regola
«pieno = scelto» della Striscia dei giorni. Il piatto in programma dice `ORA IN PROGRAMMA · ` in
testa alla sottoriga: sulla riga non ci sono badge.
```

- [ ] **Step 2: `DESIGN.md` §8, una voce nuova `### Scegli`** subito dopo la voce Riga piatto:

```markdown
### Scegli
La schermata che cambia il piatto di un pasto, aperta dal chevron della riga pasto. Testata in
modo indietro (`PIANO`), titolo `Cosa mangi`, sotto la pillola col giorno e il pasto. La ricerca
di Piatti, ferma in alto; le righe piatto in modo **scegli**; sotto, solo se il piatto scelto ne
ha, i **componenti** come Righe di impostazione (il tocco passa all'opzione dopo; `IN CASA` nella
nota), i **conflitti** come Avvisi in linea, la **nota** su cosa cambia; in fondo l'Aggiungi
tratteggiato `CREA UN PIATTO NUOVO`. `SOSTITUISCI` nel Dock, spento finché niente cambia.
```

- [ ] **Step 3: `DESIGN.md` §8 Dock, «Cosa ci vive»** — aggiungi `` `SOSTITUISCI` (Scegli), `SALVA` (l'editor del Piatto e quello dell'ingrediente), `` dopo `CHIUDI LA SPESA` (Fine spesa).

- [ ] **Step 4: `DESIGN.md` §8 Testata** — in fondo alla sezione, dopo il capoverso su Entra, aggiungi:

```markdown
**Gli editor** (l'ingrediente dal 25/09, il piatto dal 26/09) non hanno la Testata: hanno la
**testata di modifica** (frame 12, `TestataModifica`): il tondo 44 su `--barra-attiva` con la
freccia, sotto, facoltativa, l'area in etichetta mono col quadratino, poi il nome come campo a
32/800. Sono pagine di modifica, senza titolo di schermata e senza tab bar; `SALVA` nel Dock.
```

- [ ] **Step 4b: `DESIGN.md` §8 Riga di impostazione** — in fondo alla voce aggiungi:

```markdown
**Il valore** (dal 26/09, fase 7) sta al massimo a metà riga, poi va in ellissi: in Scegli il
valore è il nome dell'opzione di un componente, che può essere lungo. Il testo intero resta nel
nome accessibile della riga, se chi la monta lo passa (`etichetta`).
```

- [ ] **Step 5: `DESIGN.md` §13** — in fondo al file:

```markdown
### Decisioni del 26/09/2026 (fase 7: Scegli e l'editor del Piatto)

1. **Scegli resta una schermata sua** e prende da Piatti la ricerca e la Riga piatto, con lo stato
   «scelto» (§8 Riga piatto). Conflitti, componenti e nota restano solo in Scegli.
2. **L'editor del Piatto ha un modo solo**, come quello dell'ingrediente: sempre modificabile, la
   testata di modifica, `SALVA` nel Dock spento finché niente cambia o finché il modulo non è
   valido, e dopo il salvataggio si torna a `/piatti`. `ELIMINA` passa dal Dialogo di conferma.
3. **Piatti veloce resta com'è**: si ridisegna più avanti come onboarding «più pronto».
```

- [ ] **Step 6: `DESIGN-SYSTEM.md`** — nella tabella del ponte:
  - riga **Riga piatto**: `src/components/RigaPiatto.tsx` (spostata da `ElencoPiatti.tsx`), modi `apri` e `scegli` dalla fase 7;
  - riga **Dock**: `SOSTITUISCI` in Scegli e `SALVA` nell'editor del Piatto dalla fase 7;
  - riga **Dialogo di conferma**: anche l'eliminazione del piatto dalla fase 7;
  - riga **Foglio dal basso**: anche il selettore degli ingredienti del piatto (`SelettoreIngrediente.tsx`) dalla fase 7;
  - riga **Editor dell'ingrediente**: la testata è `src/components/TestataModifica.tsx`, condivisa con l'editor del Piatto;
  - riga **Aggiungi tratteggiato**: `src/components/AggiungiTratteggiato.tsx` dalla fase 7 (Piatti, Scegli, l'editor del Piatto); `GestionePasti.tsx` ha ancora la sua copia;
  - riga **Pannello impostazioni · Riga di impostazione**: `RigaImpostazione` prende `etichetta` (l'`aria-label` della riga) e il valore sta al massimo a metà riga, dalla fase 7 (la usa anche Scegli per i componenti);
  - una riga nuova per l'editor del Piatto (`src/app/(app)/piatti/[id]/page.tsx`, `ComponentiPiatto.tsx`, `SelettoreIngrediente.tsx`).

  In §9, dopo il punto della fase 6, aggiungi:

```markdown
- **La fase 7 (Scegli e l'editor del Piatto) è chiusa con la PR del ramo `fase7-scegli-piatto`**.
  Le decisioni prese durante l'esecuzione stanno in `docs/<data>-fase7-decisioni-esecuzione.md`.
  Restano fuori dal sistema la **fase 8** (i passi di Importa oltre le due porte e la fotocamera)
  e **Piatti veloce**, da ridisegnare come onboarding.
```

  (`<data>` è la data del registro che scrive il controllore: chiedila nel report se non la trovi in `docs/`.) Nel punto della fase 6, la frase su «fase 7 (editor del Piatto, Piatti veloce, Scegli…)» diventa: *la **fase 7** (editor del Piatto e Scegli; Piatti veloce è passata all'onboarding)*.

- [ ] **Step 7: controlli** — `npm run design:token`; `npm test -- scripts/__tests__/token-check.test.ts`; `grep -n $'\xc3\x83' design/sistema/DESIGN.md docs/superpowers/specs/DESIGN-SYSTEM.md` vuoto.

- [ ] **Step 8: commit**

```bash
git add design/sistema/DESIGN.md docs/superpowers/specs/DESIGN-SYSTEM.md
git commit -m "docs: DESIGN.md e il ponte con la fase 7, la Riga piatto a due modi, Scegli e la testata di modifica

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Dopo i task (le fa il controllore, non un implementatore)

1. **La sonda nel browser** (spec §F), 360 × 640, dev server con chiavi Supabase finte, pagina sonda sotto `src/app/auth/` che monta con dati finti: la Riga piatto nei due modi (riga scelta: contrasto dei pallini su `--ink`, la spunta), il widget dei componenti di Scegli (un'opzione lunga va in ellissi a metà riga e non schiaccia il nome), il Dock di Scegli con `SOSTITUISCI` spento e acceso, `TestataModifica` con il campo del nome, l'editor col Dock senza barra (a 22 dal fondo), il Dialogo di eliminazione. In più, la Riga di impostazione a valore con `NESSUNO FUORI CASA` (il valore più lungo del Pannello di oggi): si misura che non si tagli con il limite a metà riga; se si taglia, il limite si alza prima del merge. Alla fine: sonda e `.next/dev` cancellati, `git checkout next-env.d.ts`.
2. **Il registro** `docs/<data>-fase7-decisioni-esecuzione.md`: i ruling del ledger, le misure [misurato], i limiti, le prove dal telefono (spec §F).
3. **La review finale** su tutto il ramo (opus), con una review di correttezza dei dati già fatta sui task 3 e 6, poi una sola ondata di correzioni.
