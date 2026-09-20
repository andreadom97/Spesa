# Guscio comune (fase 1 del redesign) — piano di esecuzione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** portare nel codice il guscio condiviso del redesign (gradiente, tab bar flottante che si restringe con il Marchio come icona della Lista, testata con menù utente, titoli in sentence case, Settimana → Piano, contenuto che passa dietro la barra) senza cambiare il comportamento di nessuna schermata.

**Architecture:** un componente client `Guscio` nel layout del gruppo `(app)` possiede lo stato grande/ridotta della barra, lo ascolta da un solo listener `scroll` in cattura e lo espone come `data-barra`; il CSS globale decide `--fine` e le misure. La `TabBar` diventa assoluta sopra il contenuto e riceve le aree mancanti dalla Lista via un contesto minimo. La `Testata` perde il Marchio e guadagna il menù utente con l'iniziale letta da Supabase. La cartella `settimana/` diventa `piano/` con redirect permanenti in `next.config.ts`.

**Tech Stack:** Next.js (App Router, `next.config.ts` con `redirects`), React client components, CSS custom properties, Vitest + Testing Library (jsdom), Supabase `@supabase/ssr` (`client()` in `src/data/supabase.ts`).

**Spec:** `docs/superpowers/specs/2026-09-20-guscio-comune-design.md`

## Global Constraints

- Codice, commenti, test e documenti in **italiano**; commit in italiano con `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Nessun cambiamento di comportamento: stessi dati, stesse azioni, stesse route (più il redirect `/settimana` → `/piano`).
- Colori solo via `var(--…)` nel codice nuovo; nessuna emoji; nessun gradiente oltre `--sfondo-schermata`; animazioni solo dentro `@media (prefers-reduced-motion: no-preference)`.
- Titoli in sentence case: `Lista`, `Piano`, `Piatti`, `Dispensa`, `Importa la dieta`. Etichette della barra: testo `Lista` `Piano` `Piatti` `Dispensa`, maiuscolo via `text-transform`.
- Nome accessibile del menù utente: `Impostazioni`, `href="/impostazioni"`. Bersagli ≥ 44 px.
- Misure dalla spec: barra 84/66, lati 16/46, fondo 22, voce 72/54, icone 26, `--fine` 128/110, `--coda` 140, 200 ms `cubic-bezier(.2,.8,.25,1)`.
- Prima di ogni commit: `npx vitest run` verde sui file toccati; a fine piano `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`.
- I subagent **non committano**: l'orchestratore rivede il diff e committa un task per volta.

---

### Task 1: Token, fondo a gradiente, colore del tema

**Files:**
- Modify: `src/app/globals.css` (blocco `:root` righe 4–24, regola `body` righe 36–41)
- Modify: `src/app/layout.tsx:12` (`themeColor`)
- Modify: `public/manifest.json` (`theme_color`, `background_color`)
- Reference: `design/sistema/tokens.css` (valori e commenti da copiare)
- Test: `src/app/__tests__/token.test.ts` (nuovo)

**Interfaces:**
- Produces: variabili CSS `--testo-2 --avviso --errore --freddo --icona-spenta`, `--ombra-tessera --ombra-casetta --ombra-tasto --ombra-pannello --ombra-nav --ombra-alta`, `--sfondo-schermata`, `--fine-barra-grande --fine-barra-piccola --moto-barra --curva-barra --raggio-casella-barra`, `--barra-lato --barra-lato-giu --barra-fondo --barra-alta --barra-bassa --barra-voce --barra-voce-giu --barra-padding --barra-gap --barra-icona --barra-segno --barra-attiva`, `--coda`. Le usano i task 2, 3, 4.

- [ ] **Step 1: Scrivi il test che legge `globals.css` come testo**

```ts
// src/app/__tests__/token.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.resolve(__dirname, '../globals.css'), 'utf8');

describe('token del guscio comune (spec 20/09 §A)', () => {
  it.each([
    ['--testo-2', '#5C5F7A'], ['--avviso', '#9A5C00'], ['--errore', '#C4423E'],
    ['--freddo', '#2F6FBF'], ['--icona-spenta', '#C4C4CE'],
    ['--fine-barra-grande', '128px'], ['--fine-barra-piccola', '110px'],
    ['--moto-barra', '200ms'], ['--curva-barra', 'cubic-bezier(.2, .8, .25, 1)'],
    ['--barra-alta', '84px'], ['--barra-bassa', '66px'], ['--barra-lato', '16px'],
    ['--barra-lato-giu', '46px'], ['--coda', '140px'], ['--raggio-casella-barra', '2.52px'],
  ])('%s vale %s', (nome, valore) => {
    expect(css).toMatch(new RegExp(`${nome}:\\s*${valore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*;`));
  });

  it('il gradiente di schermata ha le quattro fermate del ridisegno', () => {
    expect(css).toContain('--sfondo-schermata: linear-gradient(180deg, #EDECEA 0%, #F2F1EF 34%, #F8F8F7 70%, #FCFCFB 100%);');
  });

  it('le sei ombre esistono come token', () => {
    for (const o of ['--ombra-tessera', '--ombra-casetta', '--ombra-tasto', '--ombra-pannello', '--ombra-nav', '--ombra-alta']) {
      expect(css).toMatch(new RegExp(`${o}:`));
    }
  });
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run src/app/__tests__/token.test.ts`
Expected: FAIL, i token non esistono ancora in `globals.css`.

- [ ] **Step 3: Aggiungi i token a `globals.css`**

Dentro `:root`, dopo `--spento`, aggiungi (valori copiati da `design/sistema/tokens.css`):

```css
  /* Testi che portano informazione (deciso 17/09): note, sottotitoli, errori, avvisi. */
  --testo-2: #5C5F7A;
  --avviso: #9A5C00;
  --errore: #C4423E;
  --freddo: #2F6FBF;
  --icona-spenta: #C4C4CE;

  /* Le sei ombre: tre storiche come token, tre del ridisegno (19/09). */
  --ombra-tessera: 0 1px 2px rgba(20, 22, 58, 0.05);
  --ombra-casetta: 0 1px 3px rgba(20, 22, 58, 0.28);
  --ombra-tasto: 0 3px 10px rgba(20, 22, 58, 0.24);
  --ombra-pannello: 0 1px 2px rgba(20, 22, 58, .05), 0 6px 16px rgba(20, 22, 58, .06);
  --ombra-nav: 0 2px 6px rgba(20, 22, 58, .08), 0 12px 30px rgba(20, 22, 58, .16);
  --ombra-alta: 0 8px 24px rgba(20, 22, 58, .28), 0 26px 64px rgba(20, 22, 58, .26);

  /* Il fondo della schermata: in alto grigio tenue, in basso quasi bianco, mai bianco puro. */
  --sfondo-schermata: linear-gradient(180deg, #EDECEA 0%, #F2F1EF 34%, #F8F8F7 70%, #FCFCFB 100%);

  /* La tab bar flottante (versione B) e il suo movimento. */
  --barra-lato: 16px;
  --barra-lato-giu: 46px;
  --barra-fondo: 22px;
  --barra-alta: 84px;
  --barra-bassa: 66px;
  --barra-voce: 72px;
  --barra-voce-giu: 54px;
  --barra-padding: 6px;
  --barra-gap: 2px;
  --barra-icona: 26px;
  --barra-segno: 26px;
  --barra-attiva: rgba(20, 22, 58, 0.07);
  --raggio-casella-barra: 2.52px;
  --moto-barra: 200ms;
  --curva-barra: cubic-bezier(.2, .8, .25, 1);

  /* La maschera di scorrimento: fino a --fine il contenuto è opaco, poi sfuma dietro la barra. */
  --fine-barra-grande: 128px;
  --fine-barra-piccola: 110px;
  --fine: var(--fine-barra-grande);
  /* Coda in fondo agli scroller: 84 di barra + 22 dal fondo + 34 di respiro. Con il Dock (fase 2) diventa 194. */
  --coda: 140px;
```

Il `body` resta `background: var(--fondo)`: il gradiente lo dipinge il `Guscio` (task 2), perché `background-attachment: fixed` non è affidabile su iOS.

- [ ] **Step 4: Colore del tema**

In `src/app/layout.tsx` riga 12: `themeColor: "#EDECEA",`. In `public/manifest.json`: `"background_color": "#EDECEA"`, `"theme_color": "#EDECEA"`.

- [ ] **Step 5: Esegui il test e la suite dell'identità**

Run: `npx vitest run src/app/__tests__/token.test.ts src/app/__tests__/identita.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx public/manifest.json src/app/__tests__/token.test.ts
git commit -m "feat(guscio): token del ridisegno, sei ombre, gradiente di schermata, colore del tema"
```

---

### Task 2: `Guscio`, barra che ascolta lo scorrimento, scroller con la sfumatura

**Files:**
- Create: `src/components/Guscio.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/globals.css` (aggiungi `.scroll-app`, `[data-barra]`, `.anim-barra`)
- Modify: i 18 scroller delle pagine (`className="sc"` → `className="sc scroll-app"`): `src/app/(app)/lista/page.tsx:552,597`, `lista/fatta/page.tsx:186` (qui non c'è `className`: aggiungi `className="scroll-app"`), `lista/confezioni/page.tsx:351`, `settimana/page.tsx:508`, `settimana/[data]/[slotDefId]/scegli/page.tsx:480`, `dispensa/page.tsx:318`, `piatti/page.tsx:124,256`, `piatti/veloce/page.tsx:272`, `piatti/[id]/page.tsx:620` (NON la 1093, che è il foglio), `piatti/[id]/ingredienti/[ingId]/page.tsx:293`, `impostazioni/page.tsx:395`, `impostazioni/ingredienti/page.tsx:91`, `impostazioni/reparti/page.tsx:96`, `importa/page.tsx:344,657`.
- Test: `src/components/__tests__/guscio.test.tsx` (nuovo)

**Interfaces:**
- Produces: `export function Guscio({ children }: { children: ReactNode })` che rende `<div data-barra="grande|ridotta" className="guscio">{children}<TabBar/></div>` e monta `MarchioProvider` (task 3). Esporta anche `export function calcolaStatoBarra(prec: 'grande'|'ridotta', scrollTop: number, delta: number): 'grande'|'ridotta'` (pura, testabile).
- Consumes: `TabBar` (task 3; finché il task 3 non è fatto, importa la `TabBar` attuale: il layout compila lo stesso).

- [ ] **Step 1: Test della funzione pura e del `data-barra`**

```tsx
// src/components/__tests__/guscio.test.tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

const percorso = vi.hoisted(() => ({ valore: '/lista' }));
vi.mock('next/navigation', () => ({ usePathname: () => percorso.valore }));
vi.mock('../TabBar', () => ({ TabBar: () => <nav aria-label="Sezioni" /> }));

import { Guscio, calcolaStatoBarra } from '../Guscio';

describe('calcolaStatoBarra (spec §B)', () => {
  it('si riduce scorrendo giù di almeno 6 oltre i 24 di scrollTop', () => {
    expect(calcolaStatoBarra('grande', 40, 6)).toBe('ridotta');
    expect(calcolaStatoBarra('grande', 40, 5)).toBe('grande');
    expect(calcolaStatoBarra('grande', 20, 30)).toBe('grande');
  });
  it('torna grande scorrendo su di almeno 6 o sotto gli 8 di scrollTop', () => {
    expect(calcolaStatoBarra('ridotta', 300, -6)).toBe('grande');
    expect(calcolaStatoBarra('ridotta', 300, -5)).toBe('ridotta');
    expect(calcolaStatoBarra('ridotta', 4, 0)).toBe('grande');
  });
});

describe('Guscio', () => {
  it('parte grande, si riduce a uno scroll verso il basso di un figlio e torna grande risalendo', () => {
    const { container } = render(
      <Guscio><div className="sc scroll-app" data-testid="s" style={{ height: 100, overflowY: 'auto' }}><div style={{ height: 1000 }} /></div></Guscio>,
    );
    const guscio = container.firstElementChild as HTMLElement;
    const s = container.querySelector('[data-testid="s"]') as HTMLElement;
    expect(guscio.dataset.barra).toBe('grande');
    Object.defineProperty(s, 'scrollTop', { value: 80, configurable: true, writable: true });
    fireEvent.scroll(s);
    expect(guscio.dataset.barra).toBe('ridotta');
    Object.defineProperty(s, 'scrollTop', { value: 60, configurable: true, writable: true });
    fireEvent.scroll(s);
    expect(guscio.dataset.barra).toBe('grande');
  });

  it('dipinge il gradiente e monta la tab bar', () => {
    const { container } = render(<Guscio><p>x</p></Guscio>);
    const guscio = container.firstElementChild as HTMLElement;
    expect(guscio.className).toContain('guscio');
    expect(container.querySelector('nav[aria-label="Sezioni"]')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npx vitest run src/components/__tests__/guscio.test.tsx`
Expected: FAIL, `../Guscio` non esiste.

- [ ] **Step 3: Scrivi `Guscio.tsx`**

```tsx
// src/components/Guscio.tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { TabBar } from './TabBar';
import { MarchioProvider } from './marchio-context';

export type StatoBarra = 'grande' | 'ridotta';

/** Soglie della spec §B: si riduce oltre 24 di scrollTop scendendo di ≥ 6; torna grande salendo di ≥ 6 o sotto 8. */
export function calcolaStatoBarra(prec: StatoBarra, scrollTop: number, delta: number): StatoBarra {
  if (scrollTop < 8) return 'grande';
  if (delta <= -6) return 'grande';
  if (delta >= 6 && scrollTop > 24) return 'ridotta';
  return prec;
}

/**
 * Il guscio dell'app: fondo a gradiente, contenuto, tab bar flottante sopra.
 * Gli eventi `scroll` non risalgono ma si catturano: un solo ascoltatore sul
 * documento vede tutti gli scroller delle pagine, senza che le pagine sappiano
 * nulla. Lo stato è esposto come `data-barra`: il CSS decide --fine e misure.
 */
export function Guscio({ children }: { children: ReactNode }) {
  const [barra, setBarra] = useState<StatoBarra>('grande');
  const pathname = usePathname();
  const ultimo = useRef(new WeakMap<Element, number>());

  useEffect(() => { setBarra('grande'); }, [pathname]);

  useEffect(() => {
    const h = (e: Event) => {
      const t = e.target;
      if (!(t instanceof Element) || !t.classList.contains('scroll-app')) return;
      const top = t.scrollTop;
      const prec = ultimo.current.get(t) ?? top;
      ultimo.current.set(t, top);
      setBarra((s) => calcolaStatoBarra(s, top, top - prec));
    };
    document.addEventListener('scroll', h, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', h, { capture: true });
  }, []);

  return (
    <MarchioProvider>
      <div className="guscio" data-barra={barra}>
        <main className="guscio-main">{children}</main>
        <TabBar />
      </div>
    </MarchioProvider>
  );
}
```

Nota: finché il task 3 non esiste, crea un `marchio-context.tsx` minimo con `export function MarchioProvider({ children }) { return <>{children}</>; }` così il file compila; il task 3 lo sostituisce.

- [ ] **Step 4: CSS del guscio, della maschera e del movimento in `globals.css`**

Aggiungi in coda, fuori dai layer:

```css
/* ---------- guscio comune (spec 20/09 §B) ---------- */
.guscio { position: relative; display: flex; flex-direction: column; flex: 1; min-height: 0; background: var(--sfondo-schermata); }
.guscio-main { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; }
.guscio[data-barra="grande"] { --fine: var(--fine-barra-grande); }
.guscio[data-barra="ridotta"] { --fine: var(--fine-barra-piccola); }

/* Lo scroller di ogni pagina: passa dietro la barra e sfuma; la coda tiene l'ultima voce raggiungibile.
   `!important` perché i padding delle pagine sono inline: si cambia un valore solo, non 18 file. */
.scroll-app {
  -webkit-mask-image: linear-gradient(180deg, #000 0, #000 calc(100% - var(--fine)), rgba(0,0,0,.55) calc(100% - 74px), rgba(0,0,0,0) calc(100% - 30px));
  mask-image: linear-gradient(180deg, #000 0, #000 calc(100% - var(--fine)), rgba(0,0,0,.55) calc(100% - 74px), rgba(0,0,0,0) calc(100% - 30px));
  padding-bottom: var(--coda) !important;
}

@media (prefers-reduced-motion: no-preference) {
  .anim-barra { transition: height var(--moto-barra) var(--curva-barra), left var(--moto-barra) var(--curva-barra), right var(--moto-barra) var(--curva-barra); }
  .anim-barra-voce { transition: height var(--moto-barra) var(--curva-barra), gap var(--moto-barra) var(--curva-barra); }
  .anim-barra-etichetta { transition: max-height var(--moto-barra) var(--curva-barra), opacity 150ms linear; }
}
```

- [ ] **Step 5: Il layout usa il `Guscio`**

```tsx
// src/app/(app)/layout.tsx
import type { ReactNode } from 'react';
import { PrimoAvvio } from '@/components/PrimoAvvio';
import { Guscio } from '@/components/Guscio';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Guscio>
      <PrimoAvvio>{children}</PrimoAvvio>
    </Guscio>
  );
}
```

- [ ] **Step 6: Censimento dei 18 scroller**

In ogni file elencato sopra, sulla riga indicata, `className="sc"` diventa `className="sc scroll-app"`; in `lista/fatta/page.tsx:186` il `div` non ha `className`: aggiungi `className="scroll-app"`. Non toccare `piatti/[id]/page.tsx:1093` (è il foglio del selettore). Verifica con:

Run: `grep -rn 'scroll-app' src/app --include=page.tsx | wc -l`
Expected: `18`.

- [ ] **Step 7: Esegui il test del guscio e le suite delle pagine toccate**

Run: `npx vitest run src/components/__tests__/guscio.test.tsx src/app`
Expected: PASS (le pagine cambiano solo una classe).

- [ ] **Step 8: Commit**

```bash
git add src/components/Guscio.tsx src/components/marchio-context.tsx src/components/__tests__/guscio.test.tsx src/app/globals.css "src/app/(app)"
git commit -m "feat(guscio): Guscio con lo stato della barra, gradiente, maschera e coda sugli scroller"
```

---

### Task 3: Tab bar flottante, Marchio in barra, contesto delle aree mancanti

**Files:**
- Modify: `src/components/TabBar.tsx` (riscrittura)
- Modify: `src/components/Marchio.tsx` (prop `gap`, `raggio`)
- Create/Modify: `src/components/marchio-context.tsx`
- Modify: `src/app/globals.css` (regole `.barra*`)
- Modify: `src/app/(app)/lista/page.tsx` (pubblica le aree: vedi Step 7)
- Test: `src/components/__tests__/tabbar.test.tsx` (riscrittura), `src/components/__tests__/marchio-context.test.tsx` (nuovo)
- Reference: SVG delle icone piene in `design/sistema/schermate/lista.html` righe 221–231.

**Interfaces:**
- Produces: `MarchioProvider`, `useAreeMancanti(aree: AreaId[]): void` (pubblica finché il chiamante è montato; allo smontaggio azzera), `useAreeMancantiCorrenti(): AreaId[]` (letto dalla `TabBar`). `Marchio` accetta `lato?: number` (default 16), `gap?: number` (default 4), `raggio?: number` (default `lato * 0.28`).
- Consumes: token del task 1, `data-barra` del task 2 (via CSS).

- [ ] **Step 1: Test del contesto**

```tsx
// src/components/__tests__/marchio-context.test.tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarchioProvider, useAreeMancanti, useAreeMancantiCorrenti } from '../marchio-context';

function Pubblica({ aree }: { aree: ('ortofrutta' | 'cereali')[] }) { useAreeMancanti(aree); return null; }
function Legge() { const a = useAreeMancantiCorrenti(); return <output>{a.join(',')}</output>; }

describe('marchio-context (spec §C)', () => {
  it('senza chi pubblica il default è vuoto: marchio tutto pieno', () => {
    const { getByRole } = render(<MarchioProvider><Legge /></MarchioProvider>);
    expect(getByRole('status')).toHaveTextContent('');
  });
  it('la Lista pubblica e la barra legge; lo smontaggio azzera', () => {
    const { getByRole, rerender } = render(<MarchioProvider><Pubblica aree={['ortofrutta', 'cereali']} /><Legge /></MarchioProvider>);
    expect(getByRole('status')).toHaveTextContent('ortofrutta,cereali');
    rerender(<MarchioProvider><Legge /></MarchioProvider>);
    expect(getByRole('status')).toHaveTextContent('');
  });
});
```

- [ ] **Step 2: Test della tab bar**

```tsx
// src/components/__tests__/tabbar.test.tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const percorso = vi.hoisted(() => ({ valore: '/lista' }));
vi.mock('next/navigation', () => ({ usePathname: () => percorso.valore }));

import { TabBar } from '../TabBar';
import { MarchioProvider, useAreeMancanti } from '../marchio-context';

function Pubblica({ aree }: { aree: 'ortofrutta'[] }) { useAreeMancanti(aree); return null; }
const monta = (extra?: React.ReactNode) => render(<MarchioProvider>{extra}<TabBar /></MarchioProvider>);

describe('TabBar (spec §C)', () => {
  it('ha quattro voci nell\'ordine Lista, Piano, Piatti, Dispensa con gli href giusti', () => {
    monta();
    const voci = screen.getAllByRole('link');
    expect(voci.map((v) => v.textContent)).toEqual(['Lista', 'Piano', 'Piatti', 'Dispensa']);
    expect(voci.map((v) => v.getAttribute('href'))).toEqual(['/lista', '/piano', '/piatti', '/dispensa']);
  });

  it('la voce attiva è quella il cui href è prefisso del percorso, con aria-current', () => {
    percorso.valore = '/piano/2026-09-21/sd-1/scegli';
    monta();
    expect(screen.getByRole('link', { name: 'Piano' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Lista' })).not.toHaveAttribute('aria-current');
    percorso.valore = '/lista';
  });

  it('la voce Lista porta il Marchio e riflette le aree mancanti', () => {
    monta(<Pubblica aree={['ortofrutta']} />);
    const lista = screen.getByRole('link', { name: 'Lista' });
    expect(lista.querySelectorAll('[data-area]')).toHaveLength(6);
    expect(lista.querySelector('[data-area="ortofrutta"]')).toHaveAttribute('data-stato', 'vuoto');
    expect(lista.querySelector('[data-area="cereali"]')).toHaveAttribute('data-stato', 'pieno');
  });

  it('il nav si chiama Sezioni e le etichette restano nel DOM (a barra ridotta sono nascoste dal CSS, non tolte)', () => {
    monta();
    expect(screen.getByRole('navigation', { name: 'Sezioni' })).toBeInTheDocument();
    expect(screen.getByText('Dispensa')).toHaveClass('barra-etichetta');
  });
});
```

- [ ] **Step 3: Esegui e verifica che falliscano**

Run: `npx vitest run src/components/__tests__/tabbar.test.tsx src/components/__tests__/marchio-context.test.tsx`
Expected: FAIL (`useAreeMancanti` non esiste; le voci hanno testo maiuscolo e href `/settimana`).

- [ ] **Step 4: Il contesto**

```tsx
// src/components/marchio-context.tsx
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AreaId } from '@/domain/types';

const Aree = createContext<AreaId[]>([]);
const Pubblica = createContext<(aree: AreaId[]) => void>(() => {});

/** Le aree in cui manca ancora qualcosa: le pubblica solo la Lista, le legge il Marchio in tab bar. */
export function MarchioProvider({ children }: { children: ReactNode }) {
  const [aree, setAree] = useState<AreaId[]>([]);
  return <Pubblica.Provider value={setAree}><Aree.Provider value={aree}>{children}</Aree.Provider></Pubblica.Provider>;
}

/** Da chiamare nella pagina che conosce le aree mancanti; allo smontaggio il marchio torna tutto pieno. */
export function useAreeMancanti(aree: AreaId[]): void {
  const pubblica = useContext(Pubblica);
  const chiave = aree.join(',');
  useEffect(() => { pubblica(aree); }, [pubblica, chiave]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => pubblica([]), [pubblica]);
}

export function useAreeMancantiCorrenti(): AreaId[] {
  return useContext(Aree);
}
```

Il `Legge` del test usa `<output>`, che ha ruolo `status`.

- [ ] **Step 5: `Marchio` con `gap` e `raggio`**

In `src/components/Marchio.tsx` la firma diventa `{ aree, lato = 16, gap = 4, raggio }: Props` con `raggio?: number` nei `Props`; `const r = raggio ?? lato * 0.28;` e nello stile `gap` e `borderRadius: r`. Tutto il resto invariato.

- [ ] **Step 6: La `TabBar`**

```tsx
// src/components/TabBar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Marchio } from './Marchio';
import { useAreeMancantiCorrenti } from './marchio-context';

/** Icone piene a 26 (DESIGN.md v3 §6): copiate da design/sistema/schermate/lista.html. */
const ICONE: Record<'piano' | 'piatti' | 'dispensa', (c: string) => React.ReactNode> = {
  piano: (c) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="15.5" rx="4.4" fill={c} />
      <rect x="6.2" y="8.4" width="11.6" height="2.2" rx="1.1" fill="#fff" opacity=".9" />
      <rect x="6.2" y="12.6" width="7" height="2.2" rx="1.1" fill="#fff" opacity=".9" />
    </svg>
  ),
  piatti: (c) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill={c} />
      <circle cx="12" cy="12" r="4.1" fill="#fff" opacity=".9" />
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

const VOCI = [
  { href: '/lista', etichetta: 'Lista' },
  { href: '/piano', etichetta: 'Piano', icona: 'piano' as const },
  { href: '/piatti', etichetta: 'Piatti', icona: 'piatti' as const },
  { href: '/dispensa', etichetta: 'Dispensa', icona: 'dispensa' as const },
];

/**
 * Tab bar flottante (versione B): pillola bianca 84 che scende a 66 quando il
 * Guscio segna data-barra="ridotta"; le etichette si nascondono ma la voce resta
 * alta 54 e cliccabile. La voce Lista porta il Marchio, che riflette le aree in
 * cui manca ancora qualcosa. Misure e movimento in globals.css.
 */
export function TabBar() {
  const pathname = usePathname();
  const aree = useAreeMancantiCorrenti();

  return (
    <nav className="barra anim-barra" aria-label="Sezioni">
      {VOCI.map((voce) => {
        const attiva = pathname?.startsWith(voce.href) ?? false;
        const colore = attiva ? 'var(--ink)' : 'var(--off)';
        return (
          <Link
            key={voce.href}
            href={voce.href}
            aria-current={attiva ? 'page' : undefined}
            className={`barra-voce anim-barra-voce${attiva ? ' attiva' : ''}`}
          >
            <span className="barra-segno">
              {voce.icona ? ICONE[voce.icona](colore) : <Marchio aree={aree} lato={9} gap={4} />}
            </span>
            <span className="barra-etichetta anim-barra-etichetta">{voce.etichetta}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

Per il colore del Marchio spento non serve nulla: le caselle sono sempre nei colori d'area (regola del design system).

- [ ] **Step 7: CSS della barra in `globals.css`**

```css
/* ---------- tab bar versione B (spec 20/09 §C) ---------- */
.barra { position: absolute; left: var(--barra-lato); right: var(--barra-lato); bottom: var(--barra-fondo); height: var(--barra-alta); border-radius: 999px; display: flex; align-items: center; gap: var(--barra-gap); padding: var(--barra-padding); background: var(--superficie); box-shadow: var(--ombra-nav); z-index: 20; }
.barra-voce { flex: 1; height: var(--barra-voce); border-radius: 999px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; overflow: hidden; text-decoration: none; }
.barra-voce.attiva { background: var(--barra-attiva); }
.barra-segno { display: flex; align-items: center; justify-content: center; flex: none; height: var(--barra-segno); }
.barra-etichetta { font-family: var(--font-mono); font-size: 8.5px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: var(--off); white-space: nowrap; max-height: 12px; opacity: 1; line-height: 1; }
.barra-voce.attiva .barra-etichetta { color: var(--ink); font-weight: 700; }
.guscio[data-barra="ridotta"] .barra { height: var(--barra-bassa); left: var(--barra-lato-giu); right: var(--barra-lato-giu); }
.guscio[data-barra="ridotta"] .barra-voce { height: var(--barra-voce-giu); gap: 0; }
.guscio[data-barra="ridotta"] .barra-etichetta { max-height: 0; opacity: 0; }
```

- [ ] **Step 8: La Lista pubblica le aree**

In `src/app/(app)/lista/page.tsx`, dentro `Cornice` (riga 780): aggiungi `useAreeMancanti(aree ?? []);` come prima riga del corpo e importa `useAreeMancanti` da `@/components/marchio-context`. Il prop `aree` di `Cornice` resta (serve al contesto); smette solo di essere passato a `Testata` nel task 4.

- [ ] **Step 9: Esegui i test dei componenti e della Lista**

Run: `npx vitest run src/components "src/app/(app)/lista"`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/components/TabBar.tsx src/components/Marchio.tsx src/components/marchio-context.tsx src/components/__tests__/tabbar.test.tsx src/components/__tests__/marchio-context.test.tsx src/app/globals.css "src/app/(app)/lista/page.tsx"
git commit -m "feat(guscio): tab bar flottante versione B con il Marchio come icona della Lista"
```

---

### Task 4: Testata con il menù utente, iniziale da Supabase, titoli in sentence case, Dispensa con la Testata

**Files:**
- Create: `src/data/utente.ts`
- Modify: `src/components/Testata.tsx` (riscrittura)
- Modify: `src/app/(app)/lista/page.tsx:528,551,585,596,780-783` (titolo `Lista`, niente `aree` alla Testata)
- Modify: `src/app/(app)/lista/fatta/page.tsx:284` (`titolo="Lista"`, via `aree`)
- Modify: `src/app/(app)/piatti/page.tsx:167` (via `aree`)
- Modify: `src/app/(app)/settimana/page.tsx:662` (`titolo="Piano"`, via `aree`)
- Modify: `src/app/(app)/dispensa/page.tsx:825-846` (`Cornice` monta `Testata`)
- Test: `src/components/__tests__/testata.test.tsx` (riscrittura), `src/data/__tests__/utente.test.ts` (nuovo)

**Interfaces:**
- Produces: `export async function leggiIniziale(): Promise<string>` in `src/data/utente.ts` (prima lettera maiuscola di `user_metadata.nome`, altrimenti dell'email; `'·'` se manca tutto o la lettura fallisce); `export function useIniziale(): string` (hook client, parte da `'·'`). `Testata` props: `{ titolo: string; settimana?: string; indietro?: boolean }`: **`aree` rimosso**.
- Consumes: `client()` da `@/data/supabase`.

- [ ] **Step 1: Test di `leggiIniziale`**

```ts
// src/data/__tests__/utente.test.ts
import { describe, it, expect, vi } from 'vitest';

const getUser = vi.hoisted(() => vi.fn());
vi.mock('@/data/supabase', () => ({ client: () => ({ auth: { getUser } }) }));

import { leggiIniziale } from '../utente';

describe('leggiIniziale (spec §D)', () => {
  it('usa il nome se c\'è', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'x@y.it', user_metadata: { nome: 'andrea' } } } });
    expect(await leggiIniziale()).toBe('A');
  });
  it('altrimenti l\'email', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'dom@y.it', user_metadata: {} } } });
    expect(await leggiIniziale()).toBe('D');
  });
  it('senza utente o con errore torna il puntino', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await leggiIniziale()).toBe('·');
    getUser.mockRejectedValue(new Error('rete'));
    expect(await leggiIniziale()).toBe('·');
  });
});
```

- [ ] **Step 2: Test della Testata**

```tsx
// src/components/__tests__/testata.test.tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/data/utente', () => ({ useIniziale: () => 'A', leggiIniziale: vi.fn() }));

import { Testata } from '../Testata';

describe('Testata (spec §D)', () => {
  it('il menù utente porta alle impostazioni, si chiama Impostazioni e mostra l\'iniziale', () => {
    render(<Testata titolo="Lista" />);
    const menu = screen.getByRole('link', { name: 'Impostazioni' });
    expect(menu).toHaveAttribute('href', '/impostazioni');
    expect(menu).toHaveTextContent('A');
  });

  it('il titolo è in sentence case così come passato e non c\'è più il Marchio né il link Vai alla lista', () => {
    render(<Testata titolo="Piano" />);
    expect(screen.getByText('Piano')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Vai alla lista' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-area]')).toBeNull();
  });

  it('la pillola settimana è testo, senza svg dentro', () => {
    render(<Testata titolo="Lista" settimana="31 AGO — 6 SET" />);
    const pillola = screen.getByText('31 AGO — 6 SET').parentElement!;
    expect(pillola.querySelector('svg')).toBeNull();
  });

  it('con indietro c\'è il link Indietro e non c\'è Impostazioni', () => {
    render(<Testata titolo="Importa la dieta" indietro />);
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/impostazioni');
    expect(screen.queryByRole('link', { name: 'Impostazioni' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Esegui e verifica che falliscano**

Run: `npx vitest run src/data/__tests__/utente.test.ts src/components/__tests__/testata.test.tsx`
Expected: FAIL (`@/data/utente` non esiste; la Testata ha ancora l'ingranaggio e il Marchio).

- [ ] **Step 4: `src/data/utente.ts`**

```ts
'use client';

import { useEffect, useState } from 'react';
import { client } from '@/data/supabase';

/** L'iniziale per il menù utente: nome se c'è, altrimenti email; '·' se manca tutto. Solo lettura. */
export async function leggiIniziale(): Promise<string> {
  try {
    const { data } = await client().auth.getUser();
    const u = data.user;
    if (!u) return '·';
    const nome = typeof u.user_metadata?.nome === 'string' ? u.user_metadata.nome.trim() : '';
    const base = nome || u.email || '';
    return base ? base[0].toLocaleUpperCase('it') : '·';
  } catch {
    return '·';
  }
}

export function useIniziale(): string {
  const [iniziale, setIniziale] = useState('·');
  useEffect(() => {
    let vivo = true;
    leggiIniziale().then((i) => { if (vivo) setIniziale(i); });
    return () => { vivo = false; };
  }, []);
  return iniziale;
}
```

- [ ] **Step 5: `Testata.tsx`**

```tsx
import Link from 'next/link';
import { useIniziale } from '@/data/utente';

interface Props {
  titolo: string;
  /** Etichetta della pillola settimana (es. "31 AGO — 6 SET"). Assente = niente pillola. */
  settimana?: string;
  /** Modalità indietro: freccia di ritorno a /impostazioni al posto del menù utente. */
  indietro?: boolean;
}

/**
 * Testata condivisa (redesign 19/09): titolo in sentence case a sinistra e, a
 * destra, il menù utente — pillola con il tondo dell'iniziale e il kebab — che
 * porta a /impostazioni come faceva l'ingranaggio (stesso nome accessibile).
 * Il Marchio non vive più qui: sta nella tab bar, come icona della Lista.
 */
export function Testata({ titolo, settimana, indietro = false }: Props) {
  const iniziale = useIniziale();
  return (
    <div style={{ padding: '20px 18px 12px', display: 'flex', flexDirection: 'column', gap: 15 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, minWidth: 0 }}>
          {indietro && (
            <Link
              href="/impostazioni"
              aria-label="Indietro"
              style={{ width: 44, height: 44, margin: '4px -10px 0 0', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m12 4-8 6 8 6" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
          <h1 style={{ margin: 0, fontSize: 52, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: 'var(--ink)' }}>
            {titolo}
          </h1>
        </div>
        {!indietro && (
          <Link
            href="/impostazioni"
            aria-label="Impostazioni"
            style={{
              height: 50, display: 'flex', alignItems: 'center', gap: 5, margin: '0 -2px -3px 0', flex: 'none',
              background: 'var(--barra-attiva)', borderRadius: 999, padding: '0 12px 0 6px', textDecoration: 'none',
            }}
          >
            <span style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1, color: 'var(--superficie)' }}>
                {iniziale}
              </span>
            </span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="4" r="1.8" fill="var(--ink)" /><circle cx="10" cy="10" r="1.8" fill="var(--ink)" /><circle cx="10" cy="16" r="1.8" fill="var(--ink)" />
            </svg>
          </Link>
        )}
      </div>
      {settimana && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start', height: 34, padding: '0 14px', borderRadius: 999, background: 'var(--ink)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.13em', color: 'var(--superficie)' }}>
            {settimana}
          </span>
        </div>
      )}
    </div>
  );
}
```

Il file resta un client component: aggiungi `'use client';` in testa (usa un hook).

- [ ] **Step 6: I chiamanti**

- `lista/page.tsx`: le quattro `Cornice titolo="Spesa"` diventano `titolo="Lista"`; in `Cornice` (783) `<Testata titolo={titolo} settimana={settimana} />` (via `aree`; `aree` resta come prop di `Cornice` per il contesto del task 3).
- `lista/fatta/page.tsx:284`: `<Testata titolo="Lista" settimana={settimana} />`.
- `piatti/page.tsx:167`: `<Testata titolo="Piatti" />`; aggiorna il commento alle righe 43–44 (il marchio non è più in testata).
- `settimana/page.tsx:662`: `<Testata titolo="Piano" />`.
- `dispensa/page.tsx`, funzione `Cornice` (825–846): sostituisci l'header con la freccia con `<Testata titolo="Dispensa" />`; importa `Testata`; rimuovi `Link` se non più usato nel file; aggiorna il commento («Stesso header delle altre sottopagine» → «La Dispensa è una voce della tab bar: Testata come le altre radici»).

- [ ] **Step 7: Esegui i test dei componenti e delle quattro pagine**

Run: `npx vitest run src/components src/data "src/app/(app)/lista" "src/app/(app)/piatti/__tests__" "src/app/(app)/settimana/__tests__" "src/app/(app)/dispensa"`
Expected: PASS. Se un test di pagina cerca `getByRole('link', { name: 'Impostazioni' })` continua a passare; se uno cerca `Torna alle impostazioni` nella Dispensa, aggiornalo a `Impostazioni` con `href` `/impostazioni`.

- [ ] **Step 8: Commit**

```bash
git add src/data/utente.ts src/data/__tests__/utente.test.ts src/components/Testata.tsx src/components/__tests__/testata.test.tsx "src/app/(app)/lista" "src/app/(app)/piatti/page.tsx" "src/app/(app)/settimana/page.tsx" "src/app/(app)/dispensa/page.tsx"
git commit -m "feat(guscio): Testata con il menù utente e i titoli in sentence case; la Dispensa adotta la Testata"
```

---

### Task 5: Settimana diventa Piano — cartella, link, redirect, guscio offline, test

**Files:**
- Rename: `src/app/(app)/settimana/` → `src/app/(app)/piano/` (`git mv`, con `[data]/[slotDefId]/scegli` e i `__tests__`)
- Modify (13 riferimenti): `lista/page.tsx:547`, `lista/fatta/page.tsx:123,158`, `lista/confezioni/page.tsx:179,275`, `piano/page.tsx:598,643`, `piano/[data]/[slotDefId]/scegli/page.tsx:433,677,727,734,735`, `importa/page.tsx:604`, `piatti/veloce/page.tsx:430`
- Modify: `public/sw.js:2`
- Modify: `next.config.ts`
- Test: `src/app/__tests__/redirect-piano.test.ts` (nuovo); aggiorna i test elencati allo Step 6.

**Interfaces:**
- Produces: route `/piano` e `/piano/[data]/[slotDefId]/scegli`; `redirects()` in `next.config.ts`.
- Consumes: la `TabBar` del task 3 già punta a `/piano`.

- [ ] **Step 1: Test dei redirect in `next.config.ts`**

```ts
// src/app/__tests__/redirect-piano.test.ts
import { describe, it, expect } from 'vitest';
import config from '../../../next.config';

describe('redirect Settimana → Piano (spec §E)', () => {
  it('/settimana e i suoi sottopercorsi vanno a /piano, permanenti', async () => {
    const r = await config.redirects!();
    expect(r).toEqual(expect.arrayContaining([
      { source: '/settimana', destination: '/piano', permanent: true },
      { source: '/settimana/:path*', destination: '/piano/:path*', permanent: true },
    ]));
  });
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npx vitest run src/app/__tests__/redirect-piano.test.ts`
Expected: FAIL, `config.redirects` non definito.

- [ ] **Step 3: `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

- [ ] **Step 4: Rinomina la cartella e i riferimenti**

```bash
git mv "src/app/(app)/settimana" "src/app/(app)/piano"
```

Poi, nei file elencati, ogni `'/settimana'`, `"/settimana"` e `` `/settimana/${…}` `` diventa `/piano`. In `piano/[data]/[slotDefId]/scegli/page.tsx:735` l'`aria-label="Torna alla Settimana"` diventa `"Torna al Piano"`; il commento alla riga 727 cita `/piano`. In `public/sw.js:2`: `const GUSCIO = ['/lista', '/piano', '/piatti', '/manifest.json'];` e alza `CACHE` a `'spesa-v2'` così i client installati scaricano il guscio nuovo.

Verifica: `grep -rn "settimana'" src --include='*.tsx' --include='*.ts' | grep -v __tests__ | grep -v "data/settimana\|domain\|leggiSettimana\|settimanaLabel"` → nessuna route `/settimana` residua (i moduli `@/data/settimana` e le parole del dominio restano).

- [ ] **Step 5: I test di pagina**

Aggiorna le asserzioni:
- `lista/__tests__/page.test.tsx:319,362,373`: `href` `'/piano'`.
- `lista/fatta/__tests__/page.test.tsx:75,194`: `'/piano'`; il nome del test alla riga 70 dice «rimanda a /piano».
- `lista/confezioni/__tests__/page.test.tsx:161,471`: `'/piano'`.
- `importa/__tests__/riepilogo.test.tsx:93,160`: `'/piano'`.
- `piano/__tests__/page.test.tsx:364`: `` `/piano/${OGGI}/sd-1/scegli` ``.
- `piano/[data]/[slotDefId]/scegli/__tests__/page.test.tsx:349,368,383,396,415,469`: `'/piano'`; riga 414: `getByLabelText('Torna al Piano')`.
- `piatti/veloce/__tests__/page.test.tsx:200,601,615`: `'/piano'`.
- `components/__tests__/FoglioAzioniPasto.test.tsx:23`: `hrefScegli="/piano/2026-08-26/sd-3/scegli"`.

- [ ] **Step 6: Esegui tutta la suite**

Run: `npx vitest run`
Expected: PASS, nessun test cita più la route `/settimana`.

- [ ] **Step 7: Commit**

```bash
git add -A src next.config.ts public/sw.js
git commit -m "feat(guscio): Settimana diventa Piano — route /piano, redirect permanenti, guscio offline"
```

---

### Task 6: Verifica nel browser, README, punto di ripresa

**Files:**
- Modify: `README.md` (sezione «Le schermate della v1» righe 404–418: aggiungi un paragrafo «Il guscio del redesign (20/09)»; sezione «Dove sta cosa»: `Guscio.tsx`, `marchio-context.tsx`, `data/utente.ts`; ogni `/settimana` nel testo diventa `/piano`)
- Modify: `docs/superpowers/specs/DESIGN-SYSTEM.md` §6 (le righe delle derive che il guscio ha chiuso: titoli, header della Dispensa, token nuovi ora in `globals.css`)
- Modify: `docs/2026-09-06-ripresa.md` (una riga: fase 1 consegnata, cosa provare dal telefono)

- [ ] **Step 1: Suite completa, tipi, lint, build**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: tutto verde. Se `tsc` segnala `LayoutProps` in `layout.tsx` senza `.next/types`, è il caso noto: rifai dopo il `build`.

- [ ] **Step 2: Verifica nel browser a 375×812** (preview `spesa-dev`, `IMPORT_MOCK` non serve)

Per ognuna delle sedici route (`/lista`, `/lista/fatta`, `/lista/confezioni`, `/piano`, `/piano/{data}/{slot}/scegli`, `/dispensa`, `/piatti`, `/piatti/veloce`, `/piatti/{id}`, `/piatti/{id}/ingredienti/{ingId}`, `/impostazioni`, `/impostazioni/ingredienti`, `/impostazioni/reparti`, `/importa`, `/entra`, `/settimana` → redirect): fondo a gradiente; barra flottante con Lista · Piano · Piatti · Dispensa e la voce attiva giusta (nessuna su Impostazioni e Importa); scorrendo giù la barra si riduce e le etichette spariscono ma la voce si tocca; risalendo torna grande; l'ultima voce della pagina è raggiungibile sopra la barra; il contenuto sfuma dietro la barra; il tondo mostra l'iniziale e porta a `/impostazioni`; in Lista il Marchio in barra ha le caselle contornate delle aree con voci da prendere; `read_console_messages` senza errori. Uno screenshot per Lista, Piano, Dispensa con barra grande e uno con barra ridotta.

- [ ] **Step 3: README e documenti**

Nel README, dopo «Le schermate della v1», aggiungi:

```markdown
## Il guscio del redesign (20/09/2026)

Dal 20/09 tutte le schermate vivono nel guscio del redesign approvato in Claude Design
(`design/sistema/DESIGN.md` v3): fondo a gradiente, tab bar flottante che si restringe
scorrendo (`src/components/Guscio.tsx` ascolta gli scroller con un solo listener in cattura
ed espone `data-barra`; `TabBar.tsx` porta il Marchio come icona della Lista, alimentato da
`marchio-context.tsx`), testata con il menù utente al posto dell'ingranaggio
(`Testata.tsx`, iniziale da `src/data/utente.ts`), titoli in sentence case e la sezione
Settimana che si chiama **Piano** (`/piano`, con redirect permanente da `/settimana`). Il
corpo delle schermate è quello di prima: le fasi 2–5 del redesign lo cambiano una coppia di
schermate per volta. Gli scroller delle pagine portano la classe `scroll-app`, che aggiunge
la sfumatura e la coda di 140 px sopra la barra.
```

In `DESIGN-SYSTEM.md` §6 segna come chiuse le righe «titoli sentence case» (ora è la regola), «header della Dispensa» e «token nuovi assenti». In `docs/2026-09-06-ripresa.md`, in coda a «Da fare in locale»: «10. Fase 1 del redesign consegnata il 20/09: rifare le prove 5, 6, 8, 8b, 8c dal telefono con il guscio nuovo; controllare che la PWA installata segua il redirect `/settimana` → `/piano`».

- [ ] **Step 4: Commit**

```bash
git add README.md docs/superpowers/specs/DESIGN-SYSTEM.md docs/2026-09-06-ripresa.md
git commit -m "docs: il guscio del redesign nel README, derive chiuse, prove da rifare dal telefono"
```

---

## Dopo il piano

Review di correttezza e di sicurezza in sola lettura (il listener globale, `useIniziale`, il redirect), poi un subagent di correzione con la lista consolidata, poi PR verso `main`. Il gate finale è di Andrea: le prove del 15/09 rifatte dal telefono con il guscio nuovo.
