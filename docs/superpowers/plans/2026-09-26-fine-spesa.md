# Fase 6 — Fine della spesa ed Entra: piano di esecuzione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ridisegnare nel sistema di `DESIGN.md` v3 il traguardo (`/lista/fatta`), Confezioni diverse (`/lista/confezioni`) ed Entra (`/entra`), senza cambiare niente nei dati.

**Architecture:** tre pagine riscritte con componenti che esistono già (`Testata` in modo indietro, `Dock`, `FoglioDalBasso` + `LettoreCodice`, `Marchio`, `controlli.tsx`). Due fondamenta prima: la regola «lista finita» in un modulo di dominio (oggi è copiata tre volte) e la pillola settimana della `Testata` anche in modo indietro. Alla fine i documenti di design.

**Tech Stack:** Next.js 16 App Router (client components), React, Vitest + Testing Library (`fireEvent`: `user-event` non è installato), stile inline con classi condivise in `src/app/globals.css`.

**Spec:** `docs/superpowers/specs/2026-09-26-fine-spesa-design.md` (approvata da Andrea il 26/09, con il titolo `Fine spesa`, la guardia di 400 ms e i testi di Entra).

## Global Constraints

- **Worktree:** `/Users/andreadominici/Documents/Claude/Projects/Spesa/.claude/worktrees/fase6-fine-spesa`, ramo `fase6-fine-spesa`. Ogni comando parte da lì. Comandi git semplici, uno alla volta; mai `git add -A` o `git add .`: si aggiungono i file per nome.
- **Il database non cambia.** `chiudiSpesa`, `aggiornaFormatoDaScansione`, `leggiListe`, `leggiVociComprate`, `leggiRisparmioSettimana`, `leggiSettimanaCorrente`, `signInWithOtp` e la route `/api/prodotto/[ean]` si chiamano con gli stessi argomenti di oggi. Nessun file in `src/data/` o `supabase/` cambia.
- **Colori solo come token** `var(--…)`: nei file toccati non resta `#FFFFFF`, `#14163A`, `#8A8A96` né `rgba(20,22,58,0.16)`. Le alfe su `--ink` ammesse qui: `0.035` (schede secondarie), `0.04` (riquadro esito della scansione).
- **Niente Tailwind** nei file toccati (`className` solo per le classi di `globals.css`: `sc`, `scroll-app`, `con-dock`, `corpo-foglio`, `dock-primario`).
- **Bersagli toccabili alti almeno 44.**
- **In volo** un tasto è `disabled` e prende lo **stile spento del sistema** (`.dock-primario:disabled` in `globals.css`, `TastoPrimario` con `disabled`), non un'opacità. *Ruling del piano sulla spec §A.4 e §C.2, che dicevano «opacità 0,5»: `globals.css` riga ~200 spiega che l'opacità porta il testo bianco sotto soglia di contrasto, e il Dock del Piano fa già così.*
- **I testi che la spec dice «di oggi» restano parola per parola**, apostrofi tipografici compresi (`L’app`, `l’olio`).
- **`page.tsx` di Next esporta solo il default:** ogni funzione o costante che un test deve fermare sta in un modulo accanto (`guardia.ts`), mai esportata dalla pagina.
- **Test:** un file con `npx vitest run <percorso>`; la suite con `npm test`; poi `npx tsc --noEmit` e `npm run lint`. Tutti verdi prima di ogni commit.
- **Commit in italiano**, messaggio che finisce con una riga vuota e `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Commenti nel codice in italiano**, con la densità dei file intorno: un blocco `/** … */` che dice il perché, non il cosa.

## Mappa dei file

| File | Task | Responsabilità |
|---|---|---|
| `src/domain/lista-finita.ts` (nuovo) | 1 | la regola «lista finita» e il conto delle voci |
| `src/domain/__tests__/lista-finita.test.ts` (nuovo) | 1 | i suoi casi |
| `src/app/(app)/lista/page.tsx` | 1 | importa `listaFinita` al posto di `tuttoFatto` |
| `src/components/Testata.tsx` + `__tests__/testata.test.tsx` | 2 | pillola settimana anche in modo indietro |
| `src/app/(app)/lista/fatta/page.tsx` + `guardia.ts` (nuovo) + `__tests__/page.test.tsx` | 3 | il traguardo |
| `src/app/(app)/lista/confezioni/page.tsx` + `__tests__/page.test.tsx` | 4 | Confezioni col foglio |
| `src/components/Scanner.tsx`, `src/components/__tests__/scanner.test.tsx` | 4 | si cancellano |
| `src/app/entra/page.tsx` + `src/app/entra/__tests__/page.test.tsx` (nuovo) | 5 | Entra |
| `design/sistema/DESIGN.md`, `docs/superpowers/specs/DESIGN-SYSTEM.md` | 6 | i documenti |

L'ordine conta per due motivi: 3 e 4 importano `listaFinita` (task 1); 3 e 4 usano la `Testata` con `settimana` in modo indietro (task 2, solo 3 la passa). 5 non dipende da nessuno.

---

### Task 1: La regola «lista finita» in un posto solo

**Files:**
- Create: `src/domain/lista-finita.ts`
- Create: `src/domain/__tests__/lista-finita.test.ts`
- Modify: `src/app/(app)/lista/page.tsx` (la funzione `tuttoFatto`, righe ~31-41, e i suoi usi)

**Interfaces:**
- Produces:
  ```ts
  export interface SezioneDaSpuntare { voci: { spuntato: boolean }[]; controlli: unknown[] }
  export interface ListaDaSpuntare { base: SezioneDaSpuntare[]; topup: SezioneDaSpuntare[] }
  export function listaFinita(lista: ListaDaSpuntare): boolean;
  export function contaVoci(lista: ListaDaSpuntare): number;
  ```
  Tipi strutturali di proposito: `src/domain/` non importa mai da `src/data/`, e `ListaSalvata` di `@/data/lista` li soddisfa così com'è.

- [ ] **Step 1: il test che fallisce** — `src/domain/__tests__/lista-finita.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { listaFinita, contaVoci, type SezioneDaSpuntare } from '../lista-finita';

function sezione(spunte: boolean[], controlli = 0): SezioneDaSpuntare {
  return { voci: spunte.map((spuntato) => ({ spuntato })), controlli: Array.from({ length: controlli }, () => ({})) };
}

describe('listaFinita', () => {
  it('una lista senza voci non è finita: non c\'è niente da aver preso', () => {
    expect(listaFinita({ base: [], topup: [] })).toBe(false);
    expect(listaFinita({ base: [sezione([])], topup: [] })).toBe(false);
  });

  it('una voce non spuntata basta a non finire', () => {
    expect(listaFinita({ base: [sezione([true, false])], topup: [] })).toBe(false);
  });

  it('tutto spuntato ma un controllo in sospeso: non è finita (un controllo si risponde, non si spunta)', () => {
    expect(listaFinita({ base: [sezione([true]), sezione([], 1)], topup: [] })).toBe(false);
  });

  it('tutto spuntato e nessun controllo: finita', () => {
    expect(listaFinita({ base: [sezione([true, true])], topup: [] })).toBe(true);
  });

  it('base e top-up contano insieme', () => {
    expect(listaFinita({ base: [sezione([true])], topup: [sezione([false])] })).toBe(false);
    expect(listaFinita({ base: [sezione([true])], topup: [sezione([true])] })).toBe(true);
    // Solo il top-up ha voci: basta quello.
    expect(listaFinita({ base: [sezione([])], topup: [sezione([true])] })).toBe(true);
  });
});

describe('contaVoci', () => {
  it('conta le voci di base e top-up, non i controlli', () => {
    expect(contaVoci({ base: [sezione([true, true], 2)], topup: [sezione([true])] })).toBe(3);
    expect(contaVoci({ base: [], topup: [] })).toBe(0);
  });
});
```

- [ ] **Step 2: verifica che fallisca**

Run: `npx vitest run src/domain/__tests__/lista-finita.test.ts`
Expected: FAIL, `Failed to resolve import "../lista-finita"`.

- [ ] **Step 3: il modulo** — `src/domain/lista-finita.ts`:

```ts
/** La parte di una sezione della lista che serve a dire se la spesa è finita. */
export interface SezioneDaSpuntare {
  voci: { spuntato: boolean }[];
  controlli: unknown[];
}

/**
 * Tipo strutturale e non `ListaSalvata`: il dominio non importa dal data layer, e
 * `ListaSalvata` lo soddisfa così com'è.
 */
export interface ListaDaSpuntare {
  base: SezioneDaSpuntare[];
  topup: SezioneDaSpuntare[];
}

/**
 * Vero solo quando non resta più niente da fare: almeno una voce, ogni voce spuntata *e*
 * nessun controllo in sospeso, su base e top-up insieme. Un controllo si risponde, non si
 * spunta: finché non ha risposta la spesa non è finita. La usano la Lista (per mostrare
 * HAI PRESO TUTTO), il traguardo e Confezioni (per non mostrarsi a spesa non finita): una
 * regola sola, perché se le tre copie divergessero il Dock porterebbe a una pagina che
 * rimanda indietro.
 */
export function listaFinita(lista: ListaDaSpuntare): boolean {
  const sezioni = [...lista.base, ...lista.topup];
  return contaVoci(lista) > 0 && sezioni.every((s) => s.controlli.length === 0 && s.voci.every((v) => v.spuntato));
}

/** Le voci di base e top-up, senza i controlli: il «N voci su N» del traguardo. */
export function contaVoci(lista: ListaDaSpuntare): number {
  return [...lista.base, ...lista.topup].reduce((n, s) => n + s.voci.length, 0);
}
```

- [ ] **Step 4: verifica che passi**

Run: `npx vitest run src/domain/__tests__/lista-finita.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: la Lista la importa** — in `src/app/(app)/lista/page.tsx` cancella la funzione `tuttoFatto` (il blocco `/** Vero solo quando non resta più nulla da fare … */` e la funzione, righe ~31-41), aggiungi fra gli import `import { listaFinita } from '@/domain/lista-finita';` e sostituisci ogni chiamata `tuttoFatto(` con `listaFinita(` (cerca con `grep -n "tuttoFatto" "src/app/(app)/lista/page.tsx"`; il commento di `areeMancanti` che nomina `tuttoFatto()` diventa `listaFinita()`). Se l'import di `ListaSalvata` resta senza usi, toglilo.

*Il traguardo e Confezioni hanno le loro copie: le sostituiscono i task 3 e 4, che riscrivono quelle pagine.*

- [ ] **Step 6: la Lista resta verde**

Run: `npx vitest run "src/app/(app)/lista/__tests__"` poi `npx tsc --noEmit` e `npm run lint`
Expected: PASS, nessun errore.

- [ ] **Step 7: commit**

```bash
git add src/domain/lista-finita.ts src/domain/__tests__/lista-finita.test.ts "src/app/(app)/lista/page.tsx"
git commit -m "refactor: la regola «lista finita» in un modulo di dominio, usata dalla Lista

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: La pillola settimana anche in modo indietro

**Files:**
- Modify: `src/components/Testata.tsx` (il ramo `if (indietro)`, righe ~37-44, e il blocco `{settimana && (…)}`, righe ~73-79)
- Test: `src/components/__tests__/testata.test.tsx`

**Interfaces:**
- Consumes: niente.
- Produces: `<Testata titolo settimana? indietro? />` con la stessa firma di oggi; in modo indietro, se `settimana` c'è, la pillola settimana sta sotto il titolo. Il task 3 la usa.

- [ ] **Step 1: i test che falliscono** — in fondo a `src/components/__tests__/testata.test.tsx`, dentro un nuovo `describe`:

```tsx
describe('Testata in modo indietro con la settimana (spec fase 6 §D.2)', () => {
  const indietro = { etichetta: 'LISTA', ariaLabel: 'Torna alla lista', onTorna: vi.fn() };

  it('mostra la pillola settimana sotto il titolo, e niente Menù utente', () => {
    render(<Testata titolo="Fine spesa" settimana="Settimana del 21 settembre" indietro={indietro} />);
    const titolo = screen.getByRole('heading', { level: 1, name: 'Fine spesa' });
    const pillola = screen.getByText('Settimana del 21 settembre');
    expect(titolo.compareDocumentPosition(pillola) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pillola.style.textTransform).toBe('uppercase');
    expect(screen.queryByRole('button', { name: /profilo e impostazioni/ })).not.toBeInTheDocument();
  });

  it('senza settimana la pillola non c\'è', () => {
    render(<Testata titolo="Confezioni" indietro={indietro} />);
    expect(screen.getByRole('button', { name: 'Torna alla lista' })).toBeInTheDocument();
    expect(screen.queryByText(/Settimana del/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: verifica che il primo fallisca**

Run: `npx vitest run src/components/__tests__/testata.test.tsx`
Expected: FAIL sul primo test nuovo (`Unable to find an element with the text: Settimana del 21 settembre`); il secondo passa già.

- [ ] **Step 3: l'implementazione** — in `src/components/Testata.tsx`:

1. Estrai la pillola settimana del modo normale in una funzione in fondo al file, accanto a `PillolaIndietro`, con lo stesso stile di oggi:

```tsx
/** La pillola settimana (DESIGN.md §8 Testata): informativa, non si tocca. */
function PillolaSettimana({ testo }: { testo: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start', height: 34, padding: '0 14px', borderRadius: 999, background: 'var(--ink)' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--superficie)' }}>
        {testo}
      </span>
    </div>
  );
}
```

2. Nel modo normale sostituisci il blocco `{settimana && (<div …>…</div>)}` con `{settimana && <PillolaSettimana testo={settimana} />}`.

3. Il ramo del modo indietro diventa:

```tsx
  if (indietro) {
    return (
      <div style={{ padding: '20px 18px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PillolaIndietro {...indietro} />
        <h1 style={STILE_TITOLO}>{titolo}</h1>
        {settimana && <PillolaSettimana testo={settimana} />}
      </div>
    );
  }
```

4. Nel commento della prop `indietro` aggiungi: *«La pillola settimana, se c'è, sta sotto il titolo anche qui (spec fase 6 §D.2): il traguardo chiude* quella *settimana.»*

- [ ] **Step 4: verifica che passi**

Run: `npx vitest run src/components/__tests__/testata.test.tsx`
Expected: PASS, tutti (anche quelli di prima: il modo normale rende la stessa pillola).

- [ ] **Step 5: nessun altro chiamante cambia** — `grep -rn "indietro={" src --include=*.tsx | grep -v __tests__` (se zsh si lamenta del glob, `grep -rn "indietro={" src | grep -v __tests__`): Piatti, Importa e l'editor dell'ingrediente non passano `settimana`. Poi `npx tsc --noEmit` e `npm run lint`.

- [ ] **Step 6: commit**

```bash
git add src/components/Testata.tsx src/components/__tests__/testata.test.tsx
git commit -m "feat: la Testata in modo indietro mostra anche la pillola settimana

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Il traguardo — `/lista/fatta`

**Files:**
- Create: `src/app/(app)/lista/fatta/guardia.ts`
- Modify (riscrittura): `src/app/(app)/lista/fatta/page.tsx`
- Modify: `src/app/(app)/lista/fatta/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `listaFinita`, `contaVoci` da `@/domain/lista-finita` (task 1); `Testata` con `settimana` in modo indietro (task 2); `Dock` (`@/components/Dock`); `SlotDockProvider` (`@/components/dock-slot`, solo nei test); `Marchio` (`@/components/Marchio`, prop `aree` obbligatoria: `[]` = pieno); `MessaggioErrore` (`@/components/controlli`); `Carico` (`@/components/pannello/pezzi`).
- Produces: `guardia.ts` con `GUARDIA_DOPPIO_TOCCO_MS = 400` e `adesso(): number`. Nessun altro task lo usa.

- [ ] **Step 1: il modulo della guardia** — `src/app/(app)/lista/fatta/guardia.ts`:

```ts
/**
 * `CHIUDI LA SPESA` compare nel Dock nello stesso punto dove un attimo prima c'era
 * `HAI PRESO TUTTO`: un doppio tocco non deve chiudere la spesa, che non si riapre
 * (spec fase 6 §A.4, DESIGN.md §9). Il tasto ignora i tocchi per questo tempo da quando
 * compare.
 */
export const GUARDIA_DOPPIO_TOCCO_MS = 400;

/** Il tempo della guardia, in un modulo suo perché i test lo possano fermare. */
export function adesso(): number {
  return performance.now();
}
```

- [ ] **Step 2: i test, prima** — in `src/app/(app)/lista/fatta/__tests__/page.test.tsx`:

1. Fra i mock in testa aggiungi:

```tsx
vi.mock('../guardia', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../guardia')>()),
  adesso: vi.fn(),
}));
```

e fra gli import `import { SlotDockProvider } from '@/components/dock-slot';` e `import { adesso } from '../guardia';`.

2. Sotto `beforeEach` aggiungi l'orologio fermo e il montaggio con lo slot del Dock:

```tsx
/** L'orologio della guardia: fermo a 0 quando il tasto compare, poi lo si sposta a mano. */
let orologio = 0;

/**
 * La pagina con uno slot vero per il Dock, come nel Guscio. Lo slot si attacca al body
 * dopo il render: così nel documento viene dopo il corpo della pagina, come nell'app.
 */
function monta() {
  const slot = document.createElement('div');
  const esito = render(<SlotDockProvider slot={slot}><ListaFatta /></SlotDockProvider>);
  document.body.appendChild(slot);
  return esito;
}

/** Il primo tocco utile: la guardia è passata. */
function oltreLaGuardia() {
  orologio = 10_000;
}
```

e dentro `beforeEach`: `orologio = 0; vi.mocked(adesso).mockReset().mockImplementation(() => orologio);`.

3. **Ogni `render(<ListaFatta />)` diventa `monta()`.** Ogni test che clicca `CHIUDI LA SPESA` chiama `oltreLaGuardia()` subito prima del click (oggi è uno: *se la lettura del risparmio fallisce la pagina resta usabile e si chiude lo stesso*).

4. Il test *il link alle confezioni sta prima di CHIUDI LA SPESA* diventa:

```tsx
  it('il link alle confezioni sta prima di CHIUDI LA SPESA e porta a /lista/confezioni', async () => {
    monta();

    const link = await screen.findByRole('link', { name: 'CONFEZIONI DIVERSE? SCANSIONA' });
    expect(link).toHaveAttribute('href', '/lista/confezioni');
    const chiudi = screen.getByRole('button', { name: 'CHIUDI LA SPESA' });
    expect(link.compareDocumentPosition(chiudi) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(link.style.minHeight).toBe('44px');
  });
```

5. In fondo, i test nuovi:

```tsx
describe('Lista fatta — Testata, Dock e guardia (spec fase 6 §A)', () => {
  it('titolo Fine spesa, pillola Torna alla lista e pillola settimana', async () => {
    monta();

    expect(await screen.findByRole('heading', { level: 1, name: 'Fine spesa' })).toBeInTheDocument();
    expect(screen.getByText('Settimana del 24 agosto')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Torna alla lista' }));
    expect(push).toHaveBeenCalledWith('/lista');
    expect(screen.queryByRole('link', { name: 'TORNA ALLA LISTA' })).not.toBeInTheDocument();
  });

  it('CHIUDI LA SPESA sta nel Dock, la regione Azione principale', async () => {
    monta();

    const regione = await screen.findByRole('region', { name: 'Azione principale' });
    expect(within(regione).getByRole('button', { name: 'CHIUDI LA SPESA' })).toHaveClass('dock-primario');
  });

  it('in caricamento: CARICO… e niente Dock', async () => {
    vi.mocked(leggiListe).mockReturnValue(new Promise(() => {}));
    monta();

    expect(await screen.findByText('CARICO…')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Azione principale' })).not.toBeInTheDocument();
  });

  it('errore di caricamento: il messaggio in --errore e niente Dock', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(leggiListe).mockRejectedValue(new Error('rete'));
    monta();

    const msg = await screen.findByText('Non riusciamo a caricare la spesa. Riprova più tardi.');
    expect(msg.style.color).toBe('var(--errore)');
    expect(screen.queryByRole('region', { name: 'Azione principale' })).not.toBeInTheDocument();
    errore.mockRestore();
  });

  it('la guardia: un tocco entro 400 ms dalla comparsa si ignora, quello a 400 chiude', async () => {
    monta();
    const chiudi = await screen.findByRole('button', { name: 'CHIUDI LA SPESA' });

    orologio = 399;
    fireEvent.click(chiudi);
    expect(chiudiSpesa).not.toHaveBeenCalled();

    orologio = 400;
    fireEvent.click(chiudi);
    await waitFor(() => expect(chiudiSpesa).toHaveBeenCalledWith('week-1'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/piano'));
  });

  it('in volo il tasto è disabled; se la chiusura fallisce, il messaggio e si riprova', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    let rifiuta: (e: Error) => void = () => {};
    vi.mocked(chiudiSpesa).mockReturnValueOnce(new Promise((_, r) => { rifiuta = r; }));
    monta();
    const chiudi = await screen.findByRole('button', { name: 'CHIUDI LA SPESA' });
    oltreLaGuardia();

    fireEvent.click(chiudi);
    await waitFor(() => expect(chiudi).toBeDisabled());
    rifiuta(new Error('rete'));

    const msg = await screen.findByRole('alert');
    expect(msg).toHaveTextContent('Non siamo riusciti a chiudere la spesa. Riprova.');
    expect(chiudi).not.toBeDisabled();
    fireEvent.click(chiudi);
    await waitFor(() => expect(chiudiSpesa).toHaveBeenCalledTimes(2));
    errore.mockRestore();
  });

  it('il Marchio è pieno, lato 20, e il testo che informa è in --testo-2', async () => {
    const { container } = monta();

    await screen.findByText('Hai preso tutto');
    const caselle = container.querySelectorAll('[data-area]');
    expect(caselle).toHaveLength(6);
    caselle.forEach((c) => {
      expect(c).toHaveAttribute('data-stato', 'pieno');
      expect((c as HTMLElement).style.width).toBe('20px');
    });
    expect(screen.getByText(/voci su 1, 6 aree finite/).style.color).toBe('var(--testo-2)');
  });
});
```

`within` va aggiunto all'import da `@testing-library/react`. *L'etichetta della settimana: `etichettaSettimana('2026-08-24')`; se il test dice un testo diverso da `Settimana del 24 agosto`, usa quello che rende la funzione (è il suo test a fissarlo, non questo).*

- [ ] **Step 3: verifica che falliscano**

Run: `npx vitest run "src/app/(app)/lista/fatta/__tests__/page.test.tsx"`
Expected: FAIL sui test nuovi e su quello del link (la pagina di oggi non ha Dock, titolo, guardia).

- [ ] **Step 4: la pagina** — riscrivi `src/app/(app)/lista/fatta/page.tsx` così (le funzioni `leggiEvitatoSenzaBloccare` e `testoNonRicomprato` e i loro commenti restano identici a oggi; `contaEControlli` e `tuttoFatto` spariscono):

```tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ORDINE_MARCHIO } from '@/domain/aree';
import { listaFinita, contaVoci } from '@/domain/lista-finita';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { leggiListe, chiudiSpesa } from '@/data/lista';
import { leggiRisparmioSettimana } from '@/data/risparmio';
import type { VoceEvitata } from '@/domain/list-builder';
import { riassumiEvitato, formattaQuantita, formattaEuro } from '@/domain/risparmio';
import { etichettaSettimana } from '@/domain/settimana-label';
import { GIORNI_CONTROLLO_DEFAULT, fraCadenza, type GiorniControllo } from '@/domain/pantry';
import { Testata } from '@/components/Testata';
import { Marchio } from '@/components/Marchio';
import { Dock } from '@/components/Dock';
import { MessaggioErrore } from '@/components/controlli';
import { Carico } from '@/components/pannello/pezzi';
import { GUARDIA_DOPPIO_TOCCO_MS, adesso } from './guardia';

interface Stato {
  weekId: string;
  settimanaLabel: string;
  totaleVoci: number;
  /** Il non ricomprato fissato alla generazione della lista; vuoto se la settimana non ha piano o la lettura è fallita. */
  evitato: VoceEvitata[];
  /** La cadenza dei controlli, per la frase di CHIUDENDO LA SPESA: viaggia con la lista (leggiListe). */
  giorniControllo: GiorniControllo;
}

// … leggiEvitatoSenzaBloccare e testoNonRicomprato, identiche a oggi …

/** Il ritorno alla Lista: la pillola della Testata in modo indietro (spec fase 6 §A.2). */
type Indietro = { etichetta: string; ariaLabel: string; onTorna: () => void };

/**
 * Il traguardo, «Fine spesa»: l'unico momento in cui il residuo smette di essere previsto
 * e diventa reale. Senza CHIUDI LA SPESA la registrazione silenziosa non ha un istante in
 * cui avvenire — la settimana dopo la lista ricomprerebbe tutto da capo.
 *
 * Raggiungibile solo a spesa davvero finita: un link diretto o una ricarica a metà spunta
 * non deve mai mostrare "tutto pieno" quando non lo è, quindi si torna a /lista invece di
 * inventare un traguardo.
 *
 * CHIUDI LA SPESA non chiede conferma (DESIGN.md §9, eccezione del 26/09): si arriva qui
 * solo da HAI PRESO TUTTO, e questa pagina è il secondo passo. Sta nel Dock, dove era HAI
 * PRESO TUTTO, e per questo ignora i tocchi per GUARDIA_DOPPIO_TOCCO_MS da quando compare.
 */
export default function ListaFatta() {
  const router = useRouter();
  const [stato, setStato] = useState<Stato | null>(null);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);
  const [chiudendo, setChiudendo] = useState(false);
  const [erroreChiusura, setErroreChiusura] = useState<string | null>(null);
  /** Quando è comparso CHIUDI LA SPESA: la guardia del doppio tocco conta da qui. */
  const comparsoRef = useRef<number | null>(null);

  useEffect(() => {
    let vivo = true;

    async function carica() {
      try {
        const settimana = await leggiSettimanaCorrente();
        if (!settimana) {
          router.replace('/lista');
          return;
        }
        // Spesa già chiusa (un link vecchio, il tasto indietro): il traguardo
        // è passato e CHIUDI sarebbe un no-op che sembra fare qualcosa.
        if (settimana.stato === 'chiusa') {
          router.replace('/piano');
          return;
        }
        const lista = await leggiListe(settimana.id);
        if (!lista || !listaFinita(lista)) {
          router.replace('/lista');
          return;
        }
        const evitato = await leggiEvitatoSenzaBloccare(settimana.id);
        if (!vivo) return;
        setStato({
          weekId: settimana.id,
          settimanaLabel: etichettaSettimana(settimana.dataInizio),
          totaleVoci: contaVoci(lista),
          evitato,
          giorniControllo: lista.giorniControllo ?? GIORNI_CONTROLLO_DEFAULT,
        });
      } catch (errore) {
        console.error('lista/fatta: caricamento fallito.', errore);
        if (vivo) setErroreCaricamento('Non riusciamo a caricare la spesa. Riprova più tardi.');
      }
    }

    carica();
    return () => {
      vivo = false;
    };
  }, [router]);

  // Il Dock compare nel render in cui `stato` arriva: l'effetto dopo quel render segna l'istante.
  useEffect(() => {
    if (stato && comparsoRef.current === null) comparsoRef.current = adesso();
  }, [stato]);

  async function onChiudi() {
    if (!stato || chiudendo) return;
    // Il secondo tocco di un doppio tocco su HAI PRESO TUTTO, che stava qui: si ignora.
    if (comparsoRef.current === null || adesso() - comparsoRef.current < GUARDIA_DOPPIO_TOCCO_MS) return;
    setChiudendo(true);
    setErroreChiusura(null);
    try {
      await chiudiSpesa(stato.weekId);
      router.push('/piano');
    } catch (errore) {
      console.error('lista/fatta: chiusura della spesa fallita.', errore);
      setErroreChiusura('Non siamo riusciti a chiudere la spesa. Riprova.');
      setChiudendo(false);
    }
  }

  const indietro: Indietro = { etichetta: 'LISTA', ariaLabel: 'Torna alla lista', onTorna: () => router.push('/lista') };

  if (erroreCaricamento) {
    return (
      <Cornice indietro={indietro}>
        <div style={{ padding: '6px 16px' }}>
          <MessaggioErrore>{erroreCaricamento}</MessaggioErrore>
        </div>
      </Cornice>
    );
  }

  if (!stato) {
    return (
      <Cornice indietro={indietro}>
        <div style={{ padding: '6px 16px' }}>
          <Carico />
        </div>
      </Cornice>
    );
  }

  const nonRicomprato = stato.evitato.length > 0 ? testoNonRicomprato(stato.evitato) : null;

  return (
    <Cornice settimana={stato.settimanaLabel} indietro={indietro}>
      <div
        className="sc scroll-app con-dock"
        style={{
          flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12,
        }}
      >
        <div style={{ padding: '26px 20px', borderRadius: 22, background: 'var(--superficie)', border: '1px solid var(--bordo)', textAlign: 'center' }}>
          {/* Il Marchio pieno nella resa grande (DESIGN.md §8 Marchio): decorativo, il testo sotto dice lo stesso. */}
          <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <Marchio aree={[]} lato={20} />
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.2, color: 'var(--ink)', marginBottom: 8 }}>
            Hai preso tutto
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--testo-2)' }}>
            {stato.totaleVoci} voci su {stato.totaleVoci}, {ORDINE_MARCHIO.length} aree finite. Il marchio in
            alto è tutto pieno: ogni area è a posto, non ti manca niente.
          </div>
        </div>

        {/* Il residuo derivato reso visibile: quante confezioni la lista non
            ha chiesto perché c'erano già. Assente senza righe (settimana
            senza piano): niente scheda vuota. */}
        {nonRicomprato && (
          <Riquadro etichetta="NON RICOMPRATO QUESTA SETTIMANA">
            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink)' }}>{nonRicomprato.principale}</div>
            {nonRicomprato.secondaria && (
              <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--testo-2)', marginTop: 3 }}>{nonRicomprato.secondaria}</div>
            )}
          </Riquadro>
        )}

        <Riquadro etichetta="CHIUDENDO LA SPESA">
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink)' }}>
            {`L’app registra cosa hai comprato e quando. Serve solo a ricordarti ${fraCadenza(stato.giorniControllo)} che l’olio sta per finire: non lo vedi da nessuna parte finché non serve.`}
          </div>
        </Riquadro>

        {/* Prima di chiudere: le confezioni vere (spec scan-confezione §1).
            Dopo la chiusura il residuo è già accreditato e la correzione non
            avrebbe più effetto, per questo il link sta qui e non altrove. */}
        <Link
          href="/lista/confezioni"
          style={{
            alignSelf: 'center', minHeight: 44, display: 'flex', alignItems: 'center', padding: '0 8px',
            fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em',
            color: 'var(--ink)', textDecoration: 'underline', textUnderlineOffset: 3,
          }}
        >
          CONFEZIONI DIVERSE? SCANSIONA
        </Link>

        {erroreChiusura && <MessaggioErrore ruolo="alert">{erroreChiusura}</MessaggioErrore>}
      </div>

      <Dock>
        <button type="button" className="dock-primario" onClick={() => void onChiudi()} disabled={chiudendo}>
          CHIUDI LA SPESA
        </button>
      </Dock>
    </Cornice>
  );
}

/** Le schede secondarie del traguardo: fondo a 0,035 (§2.5), etichetta mono in --testo-2. */
function Riquadro({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <div style={{ padding: '16px 18px', borderRadius: 20, background: 'rgba(20,22,58,0.035)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--testo-2)', marginBottom: 7 }}>
        {etichetta}
      </div>
      {children}
    </div>
  );
}

/** Colonna a tutta altezza con la testata fissa in cima: solo il corpo passato come children scorre. */
function Cornice({ settimana, indietro, children }: { settimana?: string; indietro: Indietro; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Fine spesa" settimana={settimana} indietro={indietro} />
      {children}
    </div>
  );
}
```

*Il test *la scheda sta sopra "CHIUDENDO LA SPESA"* e quelli del non ricomprato cercano i testi, non la struttura: devono passare senza modifiche. Se uno cercava lo stile `#8A8A96` o `0.045`, aggiornalo ai token nuovi.*

- [ ] **Step 5: verifica che passino**

Run: `npx vitest run "src/app/(app)/lista/fatta/__tests__/page.test.tsx"`
Expected: PASS, tutti.

- [ ] **Step 6: niente colori scritti a mano, e la suite**

Run: `grep -nE "#[0-9A-Fa-f]{6}|rgba\(20,22,58,0\.(16|07|045)\)" "src/app/(app)/lista/fatta/page.tsx"` → nessuna riga.
Poi `npm test`, `npx tsc --noEmit`, `npm run lint`.

- [ ] **Step 7: commit**

```bash
git add "src/app/(app)/lista/fatta/guardia.ts" "src/app/(app)/lista/fatta/page.tsx" "src/app/(app)/lista/fatta/__tests__/page.test.tsx"
git commit -m "feat: il traguardo Fine spesa, con CHIUDI LA SPESA nel Dock e la guardia del doppio tocco

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Confezioni diverse — `/lista/confezioni`

**Files:**
- Modify (riscrittura): `src/app/(app)/lista/confezioni/page.tsx`
- Modify: `src/app/(app)/lista/confezioni/__tests__/page.test.tsx`
- Delete: `src/components/Scanner.tsx`, `src/components/__tests__/scanner.test.tsx`

**Interfaces:**
- Consumes: `listaFinita` (task 1); `Testata` in modo indietro (task 2, senza `settimana`); `FoglioDalBasso`, `TestataFoglio` da `@/components/FoglioDalBasso`; `LettoreCodice`, `cercaProdotto` da `@/app/(app)/dispensa/LettoreCodice` (`cercaProdotto(ean): Promise<RispostaProdotto | 'errore' | 'sessione'>`, dove `RispostaProdotto` è quello di `@/domain/scansione-dispensa`, identico al tipo locale di oggi); `TastoPrimario`, `TastoSecondario`, `MessaggioErrore`, `STILE_PILLOLA` da `@/components/controlli`; `Carico` da `@/components/pannello/pezzi`.
- Produces: niente per altri task.

**Il comportamento sui dati non cambia.** Restano identici: le guardie d'ingresso; `quantita`, `rigaProdotto`, `numeroDaCampo`, `interoDaCampo`, `necessarieCon` coi loro commenti; `scrivi` (per voce, `attivaRef`, `scrivendo` per voce, `spesa già chiusa` → `/piano`); la decisione dopo il codice; ogni testo degli esiti. Cambia dove si mostra: in un foglio, non dentro la scheda.

- [ ] **Step 1: i test, prima** — in `src/app/(app)/lista/confezioni/__tests__/page.test.tsx`:

1. L'helper `scansiona` diventa:

```tsx
/** Apre il foglio sulla voce, digita il codice (in jsdom la fotocamera non c'è) e preme CERCA IL CODICE. */
async function scansiona(codice = EAN, nome = 'Pasta') {
  fireEvent.click(await screen.findByRole('button', { name: `Scansiona ${nome}` }));
  const campo = await screen.findByLabelText('Codice a barre');
  fireEvent.change(campo, { target: { value: codice } });
  fireEvent.click(screen.getByRole('button', { name: 'CERCA IL CODICE' }));
}
```

2. Le sostituzioni meccaniche in tutto il file:

| Oggi | Diventa |
|---|---|
| `{ name: 'SCANSIONA' }` | `{ name: 'Scansiona Pasta' }` (o il nome della voce del test); `findAllByRole('button', { name: /^Scansiona / })` dove se ne contano più d'una |
| `'Scrivi il codice'` | `'Codice a barre'` |
| il bottone `CERCA` | `CERCA IL CODICE` |
| `ANNULLA` dello scanner | il ✕ del foglio: `{ name: 'Chiudi la scansione' }` |
| `CHIUDI` dei riquadri | invariato (`TastoSecondario` `CHIUDI` nel foglio) |
| `within(schedaPasta)` (la scheda risalita con `parentElement`) | `within(screen.getByRole('dialog', { name: 'Confezione di Pasta' }))` |

3. Il primo test (*mostra solo le voci porzionabili…*) al posto delle tre righe sull'intestazione:

```tsx
    expect(screen.getByRole('heading', { level: 1, name: 'Confezioni' })).toBeInTheDocument();
    expect(screen.queryByText('Le confezioni vere')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'TORNA A HAI PRESO TUTTO' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Torna a fine spesa' }));
    expect(push).toHaveBeenCalledWith('/lista/fatta');
```

4. *ANNULLA nello scanner torna alla scheda* diventa *il ✕ chiude il foglio senza cercare niente*: apre con `Scansiona Pasta`, aspetta `Codice a barre`, clicca `Chiudi la scansione`, verifica che il `dialog` non ci sia più, che `Scansiona Pasta` ci sia e che `fetchMock` non sia stato chiamato.

5. *con due voci lo scanner si apre su una sola alla volta* diventa: due pulsanti `/^Scansiona /`; dopo il click sul primo c'è un solo `dialog`, di nome `Confezione di Pasta`, e dentro c'è `Codice a barre`.

6. **I tre test di concorrenza** (*una scrittura in volo … non chiude lo scanner aperto intanto su un'altra*, *… non blocca il "formato uguale" di un'altra*, *la risposta in ritardo … non copre lo scanner aperto su un'altra*): fra l'azione sulla prima voce e l'apertura della seconda si chiude il foglio col ✕ (`Chiudi la scansione`), perché un foglio copre la pagina. Le attese sul risultato restano le stesse: è la semantica di `attivaRef` e `scrivendo` che questi test proteggono.

7. I test su 401 e redirect restano (li gestisce `cercaProdotto` con `'sessione'`). Se un test verificava il testo di `console.error` della pagina (`lista/confezioni: catalogo non raggiungibile.`), ora il log è di `cercaProdotto` (`dispensa: catalogo non raggiungibile.`): verifica solo che `console.error` sia stato chiamato.

8. I test nuovi, in fondo:

```tsx
describe('Confezioni — il foglio (spec fase 6 §B.4)', () => {
  it('SCANSIONA apre un dialogo col nome della voce, e LettoreCodice dentro', async () => {
    render(<Confezioni />);
    fireEvent.click(await screen.findByRole('button', { name: 'Scansiona Pasta' }));

    const foglio = screen.getByRole('dialog', { name: 'Confezione di Pasta' });
    expect(await within(foglio).findByLabelText('Codice a barre')).toBeInTheDocument();
  });

  it('dopo la lettura il riquadro dice il codice letto', async () => {
    fetchMock.mockResolvedValue(rispostaJson(OFF_500G));
    render(<Confezioni />);
    await scansiona();

    expect(await screen.findByText(`CODICE ${EAN}`)).toBeInTheDocument();
  });

  it('AGGIORNA scrive e chiude il foglio; la riga dice AGGIORNATO', async () => {
    fetchMock.mockResolvedValue(rispostaJson(OFF_500G));
    render(<Confezioni />);
    await scansiona();
    fireEvent.click(await screen.findByRole('button', { name: 'AGGIORNA' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('2 × 500 g · AGGIORNATO')).toBeInTheDocument();
  });

  it('LASCIA chiude il foglio senza scrivere', async () => {
    fetchMock.mockResolvedValue(rispostaJson(OFF_500G));
    render(<Confezioni />);
    await scansiona();
    fireEvent.click(await screen.findByRole('button', { name: 'LASCIA' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(aggiornaFormatoDaScansione).not.toHaveBeenCalled();
  });

  it('la pillola SCANSIONA è alta almeno 44 e ha il nome della voce', async () => {
    render(<Confezioni />);
    const pillola = await screen.findByRole('button', { name: 'Scansiona Pasta' });
    expect(pillola).toHaveTextContent('SCANSIONA');
    expect(pillola.style.minHeight).toBe('44px');
  });

  it('in caricamento: CARICO…', async () => {
    vi.mocked(leggiVociComprate).mockReturnValue(new Promise(() => {}));
    render(<Confezioni />);
    expect(await screen.findByText('CARICO…')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: verifica che falliscano**

Run: `npx vitest run "src/app/(app)/lista/confezioni/__tests__/page.test.tsx"`
Expected: FAIL (niente `Scansiona Pasta`, niente dialogo).

- [ ] **Step 3: la pagina** — riscrivi `src/app/(app)/lista/confezioni/page.tsx`. Testa del file:

```tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { UnitaBase } from '@/domain/types';
import { formatoProposto } from '@/domain/ean';
import { confezioniNecessarie } from '@/domain/confezioni';
import { listaFinita } from '@/domain/lista-finita';
import { leggiSettimanaCorrente } from '@/data/settimana';
import { leggiListe } from '@/data/lista';
import {
  leggiVociComprate, aggiornaFormatoDaScansione, FORMATO_MAX, CONFEZIONI_MAX, type VoceComprata,
} from '@/data/confezioni';
import { Testata } from '@/components/Testata';
import { FoglioDalBasso, TestataFoglio } from '@/components/FoglioDalBasso';
import { TastoPrimario, TastoSecondario, MessaggioErrore, STILE_PILLOLA } from '@/components/controlli';
import { Carico } from '@/components/pannello/pezzi';
import { LettoreCodice, cercaProdotto } from '@/app/(app)/dispensa/LettoreCodice';
```

Restano **identiche a oggi**, coi loro commenti: `quantita`, `rigaProdotto`, `numeroDaCampo`, `interoDaCampo`, `necessarieCon`, e il grande commento sopra il componente (aggiungi in fondo una riga: *«La scansione si apre in un foglio dal basso con `LettoreCodice`, come nella Dispensa (spec fase 6 §B.4): un foglio alla volta, quindi una sola voce aperta.»*). Spariscono: `tuttoFatto`, il tipo locale `RispostaProdotto`, `Riquadro`, `Errore`, `Azioni`, `Primario`, `Secondario`, la `Cornice` di oggi.

I tipi cambiano così (il codice letto si ricorda sulla voce aperta, per il `CODICE …` in cima al riquadro):

```tsx
/** Cosa mostra il foglio di una voce dopo la lettura del codice. */
type Esito =
  | { tipo: 'cerco' }
  | { tipo: 'unita-diversa'; unitaOff: UnitaBase }
  /** Formato uguale: il codice si sta memorizzando (o la scrittura è fallita e si può riprovare). */
  | { tipo: 'confermo'; formato: number; ean: string }
  /** Formato uguale e codice memorizzato. */
  | { tipo: 'confermato'; formato: number }
  | { tipo: 'proposta'; marca: string; nome: string; formato: number; ean: string }
  | {
      /** Non trovato (o senza quantità) oppure catalogo non raggiungibile: si scrive a mano. */
      tipo: 'manuale';
      messaggio: string;
      marca: string;
      nome: string;
      /** Il codice si memorizza solo se il catalogo lo conosce. */
      ean: string | null;
    };

interface Attiva {
  itemId: string;
  /** Il codice letto, per il riquadro; null finché si sta leggendo. */
  codice: string | null;
  esito: Esito | null;
}
```

Il componente: lo stato, `carica` (con `listaFinita(lista)` al posto di `tuttoFatto(lista)`), `apri`, `chiudi`, `scrivi` restano quelli di oggi. Cambiano:

```tsx
  function apriScanner(itemId: string) {
    apri({ itemId, codice: null, esito: null });
  }

  /**
   * Un esito arrivato da una fetch: vale solo se la voce è ancora quella aperta. Se
   * intanto si è chiuso il foglio e aperto un'altra voce, la risposta in ritardo non
   * deve coprire la sua lettura.
   */
  function seAncoraAperta(voce: VoceComprata, esito: Esito) {
    setAttiva((a) => (a?.itemId === voce.itemId ? { ...a, esito } : a));
  }

  async function onCodice(voce: VoceComprata, ean: string) {
    apri({ itemId: voce.itemId, codice: ean, esito: { tipo: 'cerco' } });
    const risposta = await cercaProdotto(ean);
    // Sessione scaduta: non è un errore del catalogo, si va a entrare.
    if (risposta === 'sessione') {
      router.replace('/entra');
      return;
    }
    if (risposta === 'errore') {
      seAncoraAperta(voce, {
        tipo: 'manuale',
        messaggio: 'Non riusciamo a interrogare il catalogo. Riprova, o scrivi il formato a mano.',
        marca: '', nome: '', ean: null,
      });
      return;
    }
    // … da qui in giù identico a oggi: !risposta.trovato || !risposta.quantita → manuale;
    // formatoProposto null → unita-diversa; uguale → confermo + scrivi(…, 'confermato');
    // diverso → proposta.
  }
```

Il render:

```tsx
  const indietro = { etichetta: 'FINE SPESA', ariaLabel: 'Torna a fine spesa', onTorna: () => router.push('/lista/fatta') };

  if (erroreCaricamento) {
    return (
      <Cornice indietro={indietro}>
        <div style={{ padding: '6px 16px' }}><MessaggioErrore>{erroreCaricamento}</MessaggioErrore></div>
      </Cornice>
    );
  }

  if (!stato) {
    return (
      <Cornice indietro={indietro}>
        <div style={{ padding: '6px 16px' }}><Carico /></div>
      </Cornice>
    );
  }

  const voceAperta = attiva ? stato.voci.find((v) => v.itemId === attiva.itemId) ?? null : null;

  return (
    <Cornice indietro={indietro}>
      <div className="sc scroll-app" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: '0 2px', fontSize: 13, lineHeight: 1.5, color: 'var(--testo-2)' }}>
          Scansiona quello che hai comprato: se la confezione è diversa dal formato che l’app assume, il residuo si
          corregge da solo.
        </p>

        {stato.voci.length === 0 && (
          <div style={{ padding: '16px 18px', borderRadius: 20, background: 'rgba(20,22,58,0.035)', fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink)' }}>
            Niente da scansionare: le voci comprate sono tutte a pezzo o a stima.
          </div>
        )}

        {stato.voci.map((voce) => (
          <div
            key={voce.itemId}
            style={{ padding: 16, borderRadius: 22, background: 'var(--superficie)', border: '1px solid var(--bordo)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {voce.nome}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--testo-2)', marginTop: 2 }}>
                {`${voce.confezioni} × ${quantita(voce.formato, voce.unita)}`}
                {aggiornati.has(voce.itemId) && ' · AGGIORNATO'}
              </div>
            </div>
            <button
              type="button"
              aria-label={`Scansiona ${voce.nome}`}
              onClick={() => apriScanner(voce.itemId)}
              style={{ ...STILE_PILLOLA, flex: 'none', border: 'none', background: 'var(--ink)', color: 'var(--superficie)' }}
            >
              SCANSIONA
            </button>
          </div>
        ))}
      </div>

      {attiva && voceAperta && (
        <FoglioDalBasso etichetta={`Confezione di ${voceAperta.nome}`} onChiudi={chiudi}>
          <TestataFoglio onChiudi={chiudi} etichettaChiudi="Chiudi la scansione">
            <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--ink)' }}>{voceAperta.nome}</span>
          </TestataFoglio>
          <div className="sc corpo-foglio" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {corpoFoglio(voceAperta, attiva)}
          </div>
        </FoglioDalBasso>
      )}
    </Cornice>
  );
```

`corpoFoglio` è una funzione **dentro** il componente (legge `manuale`, `comprate`, `scrivendo`, `erroreScrittura`), che rende quello che oggi rende il blocco `{aperta && …}` della scheda, con i pezzi nuovi:

```tsx
  function corpoFoglio(voce: VoceComprata, a: Attiva): ReactNode {
    const esito = a.esito;
    if (esito === null) return <LettoreCodice onCodice={(ean) => void onCodice(voce, ean)} />;

    const formatoManuale = numeroDaCampo(manuale);
    // Il formato su cui si chiede "quante ne hai comprate": quello proposto dal catalogo,
    // o quello scritto a mano se è valido.
    const formatoInDomanda = esito.tipo === 'proposta' ? esito.formato : esito.tipo === 'manuale' ? formatoManuale : null;
    const necessarie = formatoInDomanda === null ? null : necessarieCon(voce, formatoInDomanda);
    const confezioniComprate = necessarie === null ? null : interoDaCampo(comprate ?? String(necessarie));
    const inVolo = scrivendo === voce.itemId;

    return (
      <>
        <div style={{ background: 'rgba(20,22,58,0.04)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {a.codice && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.13em', color: 'var(--testo-2)' }}>
              {`CODICE ${a.codice}`}
            </span>
          )}
          {esito.tipo === 'cerco' && <Testo secondario>Cerco nel catalogo…</Testo>}
          {esito.tipo === 'unita-diversa' && (
            <Testo>{`Unità diversa (${esito.unitaOff} contro ${voce.unita}): non aggiorno. Correggi il formato a mano se serve.`}</Testo>
          )}
          {esito.tipo === 'confermo' && !erroreScrittura && (
            <Testo>{`Formato ${quantita(esito.formato, voce.unita)}, come in lista. Memorizzo il codice…`}</Testo>
          )}
          {esito.tipo === 'confermato' && <Testo>{`Formato confermato: ${quantita(esito.formato, voce.unita)}.`}</Testo>}
          {esito.tipo === 'proposta' && (
            <>
              <Testo forte>{rigaProdotto(esito.marca, esito.nome, quantita(esito.formato, voce.unita))}</Testo>
              <Testo>
                {`La confezione è ${quantita(esito.formato, voce.unita)}, nel formato avevi ${quantita(voce.formato, voce.unita)}. Aggiorno per questa settimana e per le prossime?`}
              </Testo>
            </>
          )}
          {esito.tipo === 'manuale' && (
            <>
              <Testo>{esito.messaggio}</Testo>
              {(esito.marca || esito.nome) && <Testo forte>{rigaProdotto(esito.marca, esito.nome)}</Testo>}
              <CampoNumerico
                aria="Formato a mano"
                valore={manuale}
                segnaposto={String(voce.formato)}
                unita={voce.unita}
                onChange={(v) => {
                  setManuale(v);
                  // Le confezioni digitate erano per il formato di prima: con un altro
                  // formato la proposta cambia e il campo deve tornare a seguirla.
                  setComprate(null);
                }}
              />
            </>
          )}
          {necessarie !== null && formatoInDomanda !== null && (
            <>
              <Testo>
                {`Con confezioni da ${quantita(formatoInDomanda, voce.unita)} ne bastano ${necessarie} (la lista ne chiedeva ${voce.confezioni}). Quante ne hai comprate?`}
              </Testo>
              <CampoNumerico aria="Confezioni comprate" valore={comprate ?? String(necessarie)} unita="confezioni" onChange={setComprate} />
            </>
          )}
        </div>

        {erroreScrittura && <MessaggioErrore>{erroreScrittura}</MessaggioErrore>}

        {(esito.tipo === 'unita-diversa' || esito.tipo === 'confermato') && (
          <TastoSecondario onClick={chiudi}>CHIUDI</TastoSecondario>
        )}
        {esito.tipo === 'confermo' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <TastoSecondario onClick={chiudi} style={{ flex: 1 }}>CHIUDI</TastoSecondario>
            {erroreScrittura && (
              <TastoPrimario disabled={inVolo} onClick={() => void scrivi(voce, esito.formato, esito.ean, voce.confezioni, 'confermato')} style={{ flex: 1 }}>
                RIPROVA
              </TastoPrimario>
            )}
          </div>
        )}
        {(esito.tipo === 'proposta' || esito.tipo === 'manuale') && (
          <div style={{ display: 'flex', gap: 8 }}>
            <TastoSecondario onClick={chiudi} style={{ flex: 1 }}>LASCIA</TastoSecondario>
            <TastoPrimario
              disabled={inVolo || confezioniComprate === null || (esito.tipo === 'manuale' && formatoManuale === null)}
              onClick={() => {
                const formato = esito.tipo === 'proposta' ? esito.formato : formatoManuale;
                if (formato !== null && confezioniComprate !== null) void scrivi(voce, formato, esito.ean, confezioniComprate, 'chiudi');
              }}
              style={{ flex: 1 }}
            >
              AGGIORNA
            </TastoPrimario>
          </div>
        )}
      </>
    );
  }
```

*Attenzione a una differenza voluta dal codice di oggi: nella proposta la domanda «Quante ne hai comprate?» c'era solo se `necessarie !== null`, nel manuale solo se anche `formatoManuale !== null`. Il blocco unico sopra dà lo stesso risultato, perché per il manuale `formatoInDomanda` è `formatoManuale` e `necessarie` è `null` quando lui è `null`. Il test «correggere il formato a mano azzera le confezioni digitate» lo verifica.*

In fondo al file, i pezzi:

```tsx
function Testo({ children, forte = false, secondario = false }: { children: ReactNode; forte?: boolean; secondario?: boolean }) {
  return (
    <p style={{ margin: 0, fontSize: forte ? 15.5 : secondario ? 12.5 : 13.5, lineHeight: 1.5, fontWeight: forte ? 700 : 400, color: secondario ? 'var(--testo-2)' : 'var(--ink)' }}>
      {children}
    </p>
  );
}

/** Campo numerico di DESIGN.md §8: largo 96, mono 14/700 a destra, l'unità in mono 10 --ter. */
function CampoNumerico({ aria, valore, segnaposto, unita, onChange }: {
  aria: string; valore: string; segnaposto?: string; unita: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="text"
        aria-label={aria}
        inputMode="numeric"
        placeholder={segnaposto}
        value={valore}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 96, height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 12px', textAlign: 'right',
          border: '1px solid var(--bordo)', background: 'var(--superficie)',
          fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--ink)',
        }}
      />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--ter)' }}>{unita}</span>
    </div>
  );
}

/** Colonna a tutta altezza con la Testata in modo indietro verso il traguardo (spec fase 6 §B.2). */
function Cornice({ indietro, children }: { indietro: { etichetta: string; ariaLabel: string; onTorna: () => void }; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Confezioni" indietro={indietro} />
      {children}
    </div>
  );
}
```

*Il testo `confezioni` accanto al campo delle confezioni comprate resta minuscolo nel DOM e si vede maiuscolo dal CSS: un test che cercava `getByText('confezioni')` continua a trovarlo.*

- [ ] **Step 4: verifica che passino**

Run: `npx vitest run "src/app/(app)/lista/confezioni/__tests__/page.test.tsx"`
Expected: PASS, tutti. Se un test di concorrenza fallisce, **non cambiare la semantica di `scrivi`/`attivaRef`**: controlla prima di aver chiuso il foglio fra le due voci (Step 1.6).

- [ ] **Step 5: cancella lo Scanner**

Run: `grep -rn "components/Scanner\|from '../Scanner'" src` → deve restare solo `src/components/__tests__/scanner.test.tsx`. Poi:

```bash
git rm src/components/Scanner.tsx src/components/__tests__/scanner.test.tsx
```

`src/components/useLettoreCodici.ts` resta: lo usa `LettoreCodice`. Se il suo commento nomina `Scanner`, correggi la frase perché dica che l'unico chiamante è `LettoreCodice`.

- [ ] **Step 6: niente colori scritti a mano, e la suite**

Run: `grep -nE "#[0-9A-Fa-f]{6}|rgba\(20,22,58,0\.(16|07|045)\)|var\(--sec\)" "src/app/(app)/lista/confezioni/page.tsx"` → nessuna riga.
Poi `npm test`, `npx tsc --noEmit`, `npm run lint`.

- [ ] **Step 7: commit**

```bash
git add "src/app/(app)/lista/confezioni/page.tsx" "src/app/(app)/lista/confezioni/__tests__/page.test.tsx" src/components/useLettoreCodici.ts
git commit -m "feat: Confezioni scansiona in un foglio con LettoreCodice, come la Dispensa; via lo Scanner

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(se `useLettoreCodici.ts` non è cambiato, toglilo dal `git add`; i due `git rm` sono già nell'indice).

---

### Task 5: Entra — `/entra`

**Files:**
- Modify (riscrittura): `src/app/entra/page.tsx`
- Create: `src/app/entra/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `client` da `@/data/supabase` (`client().auth.signInWithOtp`); `Marchio` (`aree={[]}`); `TastoPrimario`, `TastoSecondario`, `MessaggioErrore` da `@/components/controlli`.
- Produces: niente per altri task.

- [ ] **Step 1: i test che falliscono** — `src/app/entra/__tests__/page.test.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const signInWithOtp = vi.hoisted(() => vi.fn());
vi.mock('@/data/supabase', () => ({ client: () => ({ auth: { signInWithOtp } }) }));

import Entra from '../page';

/** Il modulo si invia con submit: jsdom non fa la validazione interattiva del browser. */
function invia() {
  fireEvent.submit(screen.getByRole('button', { name: 'ENTRA CON UN LINK' }).closest('form')!);
}

beforeEach(() => {
  signInWithOtp.mockReset().mockResolvedValue({ error: null });
  window.history.replaceState(null, '', '/entra');
});

describe('Entra (spec fase 6 §C)', () => {
  it('Marchio pieno, Dispesa, il campo EMAIL con la sua etichetta e ENTRA CON UN LINK', () => {
    const { container } = render(<Entra />);

    expect(screen.getByRole('heading', { level: 1, name: 'Dispesa' })).toBeInTheDocument();
    const campo = screen.getByLabelText('EMAIL');
    expect(campo).toHaveAttribute('type', 'email');
    expect(campo).toHaveAttribute('autocomplete', 'email');
    expect(campo).toBeRequired();
    expect(screen.getByRole('button', { name: 'ENTRA CON UN LINK' })).toHaveAttribute('type', 'submit');
    const caselle = container.querySelectorAll('[data-area]');
    expect(caselle).toHaveLength(6);
    caselle.forEach((c) => expect(c).toHaveAttribute('data-stato', 'pieno'));
    expect(container.querySelector('[class*="bg-"], [class*="flex-"]')).toBeNull();
  });

  it('invia il link con il ritorno su /auth/callback, poi dice a quale indirizzo', async () => {
    render(<Entra />);
    fireEvent.change(screen.getByLabelText('EMAIL'), { target: { value: 'andrea@example.it' } });
    invia();

    await waitFor(() => expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'andrea@example.it',
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    }));
    const frase = await screen.findByText(/Ti ho mandato un link a/);
    expect(frase).toHaveTextContent('Ti ho mandato un link a andrea@example.it: aprilo per entrare.');
    expect(screen.queryByLabelText('EMAIL')).not.toBeInTheDocument();
  });

  it('USA UN’ALTRA EMAIL torna al modulo, col campo vuoto', async () => {
    render(<Entra />);
    fireEvent.change(screen.getByLabelText('EMAIL'), { target: { value: 'andrea@example.it' } });
    invia();
    fireEvent.click(await screen.findByRole('button', { name: 'USA UN’ALTRA EMAIL' }));

    expect(screen.getByLabelText('EMAIL')).toHaveValue('');
    expect(screen.queryByText(/Ti ho mandato/)).not.toBeInTheDocument();
  });

  it('in volo il tasto è disabled e il testo non cambia', async () => {
    signInWithOtp.mockReturnValue(new Promise(() => {}));
    render(<Entra />);
    fireEvent.change(screen.getByLabelText('EMAIL'), { target: { value: 'andrea@example.it' } });
    invia();

    await waitFor(() => expect(screen.getByRole('button', { name: 'ENTRA CON UN LINK' })).toBeDisabled());
  });

  it('se l\'invio fallisce: il messaggio in --errore, come alert, e il modulo resta', async () => {
    const errore = vi.spyOn(console, 'error').mockImplementation(() => {});
    signInWithOtp.mockResolvedValue({ error: new Error('rate limit') });
    render(<Entra />);
    fireEvent.change(screen.getByLabelText('EMAIL'), { target: { value: 'andrea@example.it' } });
    invia();

    const msg = await screen.findByRole('alert');
    expect(msg).toHaveTextContent('Non siamo riusciti a inviare il link. Riprova.');
    expect(msg.style.color).toBe('var(--errore)');
    expect(screen.getByLabelText('EMAIL')).toBeInTheDocument();
    errore.mockRestore();
  });

  it.each([
    ['link-non-valido', 'Questo link non è valido. Richiedine uno nuovo qui sotto.'],
    ['accesso-fallito', 'Non siamo riusciti a completare l’accesso. Richiedi un nuovo link.'],
    ['boh', 'Non siamo riusciti a completare l’accesso. Riprova.'],
  ])('?errore=%s dice «%s»', async (codice, testo) => {
    window.history.replaceState(null, '', `/entra?errore=${codice}`);
    render(<Entra />);
    expect(await screen.findByRole('alert')).toHaveTextContent(testo);
  });
});
```

- [ ] **Step 2: verifica che falliscano**

Run: `npx vitest run src/app/entra/__tests__/page.test.tsx`
Expected: FAIL (niente `Dispesa`, niente `EMAIL` visibile, niente `ENTRA CON UN LINK`).

- [ ] **Step 3: la pagina** — riscrivi `src/app/entra/page.tsx`. `MESSAGGI_ERRORE`, il suo commento e l'effetto che legge `?errore=` (con il suo commento e l'`eslint-disable`) restano **identici**. Il resto:

```tsx
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { client } from '@/data/supabase';
import { Marchio } from '@/components/Marchio';
import { TastoPrimario, TastoSecondario, MessaggioErrore } from '@/components/controlli';

// … MESSAGGI_ERRORE identico a oggi …

/**
 * La porta dell'app, prima dell'accesso: fuori dal Guscio, quindi senza Testata né tab bar
 * (spec fase 6 §C). Marchio e nome, poi il Campo di testo e il Tasto primario di §8. Dopo
 * l'invio dice a quale indirizzo è partito il link: un refuso si vede subito, e USA
 * UN’ALTRA EMAIL lo corregge senza ricaricare.
 */
export default function Entra() {
  const [email, setEmail] = useState('');
  const [caricando, setCaricando] = useState(false);
  /** L'indirizzo a cui è partito il link; null finché non è partito. */
  const [inviataA, setInviataA] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  // … l'effetto su ?errore= identico a oggi …

  async function inviaLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (caricando) return;
    setErrore(null);
    setCaricando(true);
    const { error } = await client().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setCaricando(false);
    if (error) {
      console.error('entra: signInWithOtp fallita.', error);
      setErrore('Non siamo riusciti a inviare il link. Riprova.');
      return;
    }
    setInviataA(email);
  }

  function altraEmail() {
    setInviataA(null);
    setEmail('');
    setErrore(null);
  }

  return (
    <main
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 16px', boxSizing: 'border-box', background: 'var(--sfondo-schermata)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column' }}>
        <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Marchio aree={[]} lato={20} />
        </div>
        <h1 style={{ margin: '0 0 40px', textAlign: 'center', fontSize: 52, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: 'var(--ink)' }}>
          Dispesa
        </h1>

        {inviataA !== null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ margin: 0, textAlign: 'center', fontSize: 15, lineHeight: 1.5, color: 'var(--ink)' }}>
              Ti ho mandato un link a <strong style={{ fontWeight: 700 }}>{inviataA}</strong>: aprilo per entrare.
            </p>
            <TastoSecondario onClick={altraEmail}>USA UN’ALTRA EMAIL</TastoSecondario>
          </div>
        ) : (
          <form onSubmit={inviaLink} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <label
                htmlFor="email"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}
              >
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="La tua email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  height: 44, boxSizing: 'border-box', borderRadius: 14, padding: '0 14px',
                  border: '1px solid var(--bordo)', background: 'var(--superficie)', boxShadow: 'var(--ombra-pannello)',
                  fontSize: 14, color: 'var(--ink)', outline: 'none',
                }}
              />
            </div>
            <TastoPrimario type="submit" disabled={caricando}>ENTRA CON UN LINK</TastoPrimario>
            {errore && <MessaggioErrore ruolo="alert">{errore}</MessaggioErrore>}
          </form>
        )}
      </div>
    </main>
  );
}
```

*Il messaggio da `?errore=` compare nel modulo come `role="alert"`: è lo stesso posto dell'errore d'invio. Se `outline: 'none'` fa scattare una regola di lint o di accessibilità del progetto, toglilo: il campo tiene il fuoco di sistema.*

- [ ] **Step 4: verifica che passino**

Run: `npx vitest run src/app/entra/__tests__/page.test.tsx`
Expected: PASS (8 test: 5 + 3 del `it.each`).

- [ ] **Step 5: niente Tailwind né colori scritti a mano, e la suite**

Run: `grep -nE "className|#[0-9A-Fa-f]{6}" src/app/entra/page.tsx` → nessuna riga.
Poi `npm test`, `npx tsc --noEmit`, `npm run lint`.

- [ ] **Step 6: commit**

```bash
git add src/app/entra/page.tsx src/app/entra/__tests__/page.test.tsx
git commit -m "feat: Entra nel sistema, con Marchio e Dispesa, EMAIL e ENTRA CON UN LINK, e l'indirizzo dopo l'invio

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: I documenti di design

**Files:**
- Modify: `design/sistema/DESIGN.md`
- Modify: `docs/superpowers/specs/DESIGN-SYSTEM.md`

**Interfaces:** nessuna. Si scrive quello che i task 1–5 hanno fatto: prima di scrivere, leggi `git log --oneline origin/main..HEAD` e i diff dei task 3, 4 e 5, e se una misura qui sotto non corrisponde al codice vince il codice (e lo scrivi nel report).

- [ ] **Step 1: `DESIGN.md` §9, Conferme** — in fondo all'elenco delle «Eccezioni dichiarate» (dopo il punto *togliere un pasto chiede il dialogo solo se il pasto ha piatti*), aggiungi:

```markdown
- (26/09, fase 6) **`CHIUDI LA SPESA` non chiede il dialogo** pur essendo irreversibile: ci si
  arriva solo da `HAI PRESO TUTTO`, e il traguardo (`Fine spesa`) è il secondo passo. Sta nel
  Dock, nel punto dove era `HAI PRESO TUTTO`: per questo ignora i tocchi per **400 ms** da
  quando compare, e un doppio tocco non chiude la spesa.
```

- [ ] **Step 2: `DESIGN.md` §8 Dock, «Cosa ci vive»** — dopo `` `HAI PRESO TUTTO` (Lista), `` aggiungi `` `CHIUDI LA SPESA` (Fine spesa), ``.

- [ ] **Step 3: `DESIGN.md` §8 Testata, modalità indietro** — nel paragrafo *Modalità indietro*:
  - la frase sulle etichette diventa: *un'etichetta mono 11/700/0,08em che dice **dove porta**: `IMPOSTAZIONI`, `LISTA`, `PIANO` o `FINE SPESA`. L'`aria-label` lo dice per intero: `Torna alle impostazioni`, `Torna alla lista`, `Torna al piano`, `Torna a fine spesa`.*
  - la frase che apre il paragrafo diventa *per le pagine piene aperte dal Pannello impostazioni, dagli stati vuoti e dai passi della fine spesa*;
  - dopo *Sotto, il titolo 52, a 12 dalla pillola.* aggiungi: *Se la pagina ha una settimana (il traguardo), la pillola settimana sta sotto il titolo, a 12 (dal 26/09).*
  - in fondo alla sezione Testata aggiungi un capoverso: *
**Entra** (`/entra`) non ha Testata: è fuori dal Guscio, prima dell'accesso. Dall'alto, centrati
in una colonna larga al massimo 360 sul fondo di §2.4: il Marchio pieno a 20, `Dispesa` 52/800,
il Campo di testo con l'etichetta `EMAIL`, `ENTRA CON UN LINK` (Tasto primario). Dopo l'invio,
l'indirizzo a cui è partito il link e `USA UN’ALTRA EMAIL` (secondario).*

- [ ] **Step 4: `DESIGN.md` §8 Marchio** — la riga delle rese grandi diventa: *Nelle **rese grandi** (copertine, schede di sistema, la scheda di `Fine spesa`, Entra): lato 16 o 20, gap 4, raggio `lato × 0,28`.*

- [ ] **Step 5: `DESIGN.md` §8 Anteprima di scansione** — in fondo alla voce aggiungi: *Dal 26/09 la usa anche Confezioni diverse, in un foglio dal basso per voce: il vecchio scanner in linea non c'è più.*

- [ ] **Step 6: `DESIGN.md` §13** — in fondo al file, dopo le decisioni del 25/09 (fase 5):

```markdown
### Decisioni del 26/09/2026 (fase 6: Fine della spesa ed Entra)

1. **`CHIUDI LA SPESA` resta a due passi**, senza dialogo: eccezione scritta in §9, con la guardia
   di 400 ms contro il doppio tocco.
2. **Il traguardo si chiama `Fine spesa`**, usa la Testata in modo indietro (`LISTA`) con la
   pillola settimana, e porta `CHIUDI LA SPESA` nel Dock. `TORNA ALLA LISTA` sparisce.
3. **Confezioni diverse scansiona in un foglio dal basso** con l'Anteprima di scansione, come la
   Dispensa. Titolo `Confezioni`, pillola `FINE SPESA`.
4. **Entra mostra Marchio e nome**, senza la frase di posizionamento, che resta alla landing.
5. Restano fuori dal sistema, per le fasi 7 e 8: l'editor del Piatto, Piatti veloce, Scegli e i
   passi di Importa diversi dalle due porte e dalla fotocamera.
```

- [ ] **Step 7: `DESIGN-SYSTEM.md`** — nella tabella del ponte:
  - riga **Testata**: aggiungi *«fase 6: in modo indietro anche la pillola settimana; etichetta `FINE SPESA` in Confezioni»*;
  - riga **Dock**: aggiungi *«dalla fase 6 anche `CHIUDI LA SPESA` in `lista/fatta/page.tsx`, con la guardia in `lista/fatta/guardia.ts`»*;
  - riga **Anteprima di scansione**: aggiungi *«dalla fase 6 anche in `lista/confezioni/page.tsx`, in un `FoglioDalBasso`; `src/components/Scanner.tsx` è stato cancellato»*;
  - riga **Marchio**: aggiungi *«resa grande a 20 in `lista/fatta/page.tsx` ed `entra/page.tsx`»*;
  
  e in §9 *Cosa il codice non ha ancora*, dopo il punto della fase 5, aggiungi:

```markdown
- **La fase 6 (Fine della spesa ed Entra) è chiusa con la PR del ramo `fase6-fine-spesa`**. Le
  decisioni prese durante l'esecuzione stanno in `docs/2026-09-26-fase6-decisioni-esecuzione.md`.
- **Fuori dal sistema restano**, divisi in due fasi decise il 26/09: la **fase 7** (editor del
  Piatto, Piatti veloce, Scegli; aspetta la decisione se Scegli riusa Piatti) e la **fase 8**
  (i passi di Importa oltre le due porte e la fotocamera; probabilmente un selettore nuovo, quindi
  un giro in Claude Design). L'audit del 26/09 li misura uno per uno.
```

  Correggi anche la frase del punto fase 5 *«Con lei tutte le schermate di `DESIGN.md` v3 sono ridisegnate»*: aggiungi *«; restano fuori le schermate che `DESIGN.md` non disegna, vedi sotto»*.

- [ ] **Step 8: il guardiano dei token**

Run: `npm run design:token` e `npm test -- scripts/__tests__/token-check.test.ts`
Expected: nessuna divergenza (questa fase non tocca `tokens.css` né i token di `globals.css`).

- [ ] **Step 9: commit**

```bash
git add design/sistema/DESIGN.md docs/superpowers/specs/DESIGN-SYSTEM.md
git commit -m "docs: DESIGN.md e il ponte con la fase 6, l'eccezione di CHIUDI LA SPESA e le decisioni del 26/09

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Dopo i task (le fa il controllore, non un implementatore)

1. **La sonda nel browser** (spec §F.2), con il metodo delle fasi 3–5: dev server da Bash nel worktree con `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` finte, pagine sonda sotto `src/app/auth/` che montano il traguardo e Confezioni con i dati finti; alla fine si cancellano le sonde e `.next/dev`, e si fa `git checkout next-env.d.ts`. Si misura:
   - il tempo fra il tocco su `HAI PRESO TUTTO` e la comparsa del Dock del traguardo, con le letture a latenza zero e a 100 ms; un doppio tocco sintetico a 80 ms non deve chiudere;
   - il foglio di Confezioni a 360 × 640 con l'esito `proposta`: `AGGIORNA` si vede?;
   - l'altezza del link `CONFEZIONI DIVERSE? SCANSIONA` e delle pillole `SCANSIONA` (≥ 44);
   - Entra a 360 × 640: niente scorrimento orizzontale.
2. **Il registro** `docs/2026-09-26-fase6-decisioni-esecuzione.md`: i ruling del ledger, le misure della sonda etichettate [misurato], i limiti, e la prova dal telefono da fare (compresa quella di Entra, che chiede di uscire e rientrare col link).
3. **La review finale** su tutto il ramo, poi una sola ondata di correzioni.
