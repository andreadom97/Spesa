# Icone ingrediente — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrare sulle tessere Lista, Dispensa e ingrediente del piatto un'icona di tratto che fa riconoscere l'ingrediente. Il nome resta leggibile grazie a un alone del colore del fondo.

**Architecture:**
- Un modulo di dominio puro (`src/domain/icone-ingredienti.ts`) traduce il nome libero dell'ingrediente in una chiave d'icona, tramite catalogo, sinonimi e radici delle parole.
- Un file di tracciati SVG (`src/components/tracciati-ingredienti.ts`) e un componente (`src/components/IconaIngrediente.tsx`) disegnano l'icona nel tono giusto.
- Le tre tessere chiamano `trovaIcona(nome)`: se c'è una chiave, montano l'icona e l'alone sul nome.
- Niente DB, niente migrazioni.

**Tech Stack:** Next 16 (App Router), React 19, TypeScript, stili inline, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-09-26-icone-ingredienti-design.md`
**Delta del pilota (fonte dei valori e dei tracciati):** `docs/design-delta/DELTA-2026-09-26-icone-ingrediente.md`
**Catalogo rivisto:** `docs/superpowers/specs/2026-09-26-icone-ingredienti-lista.md`

## Global Constraints

- Branch di lavoro: `icone-ingredienti`. **Mai committare su `main`**: il merge su main va in produzione subito (Vercel), e serve l'ok esplicito di Andrea.
- Tracciati su `viewBox="0 0 24 24"`, `fill="none"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.
  - Primo path (`d`, sagoma) a `strokeWidth 2`.
  - Secondo path (`dd`, dettagli) a `strokeWidth 1.25`.
- Taglia e posizione:
  - Tessera normale: **52 px**, `right/bottom: -10`.
  - Hero: **84 px**, `right/bottom: -17`.
  - Sempre `position: absolute`, `aria-hidden`, `pointer-events: none`.
- Tessera: `position: relative; overflow: hidden`. Ogni testo sopra l'icona ha `position: relative`, altrimenti l'icona posizionata lo copre.
- Colore dell'icona:
  - `area`: tono medio dell'area, opacità 1.
  - `hero`: `#FFFFFF` a 0,42.
  - `spento`: `#9A9AA6` a 0,5.
- Tono medio per area: ortofrutta `#7AA838` · macelleria `#D88384` · latticini `#759EC8` · cereali `#BB9609` · dispensa `#D48949` · surgelati `#9D91D6`.
- Alone sul nome: `text-shadow` a 8 direzioni senza sfocatura più 1 sfocata (`0 0 {px+1}px`), nel colore **opaco** del fondo.
  - 2 px sui nomi a 17 px, 3 px sulla hero.
  - Colori: Lista normale `#FFFFFF` · hero = colore dell'area · spuntata `#F7F7F8` · Dispensa in casa = tinta opaca dell'area · Dispensa finita o mai comprato `#FFFFFF` · ingrediente del piatto `#FFFFFF`.
  - Tinta opaca Dispensa: ortofrutta `#E8F5D8` · macelleria `#FCE5E5` · latticini `#E5F0FC` · cereali `#FCF2D4` · dispensa `#FCE7D7` · surgelati `#EDEAFC`.
- Nome in colore opaco sulle tessere spente: spuntata `#ABACB8` (era `rgba(20,22,58,0.34)`), Dispensa finita `#ADAEBA` (era `rgba(20,22,58,0.34)`).
- Fuori catalogo: nessuna icona e nessun alone. La tessera resta identica a oggi.
- Mai emoji. Commenti e testi in italiano, come nel resto del codice.
- Ogni file che ne ha bisogno ridefinisce il proprio `rgba()`: è una scelta del progetto, non va estratto.

## Decisione presa dal delta, da confermare con Andrea

Il delta fissa una regola: «i composti prendono l'icona dell'ingrediente base (Passata di pomodoro → pomodoro)». Il piano la applica al catalogo:
- **latta pomodoro** (#61) confluisce in **pomodoro**: passata e pelati mostrano il pomodoro.
- **scatoletta** (#62) confluisce in **pesce**: tonno in scatola e sgombro mostrano il pesce.

Il catalogo scende a **68 icone**. Di queste, 12 hanno già il tracciato dal pilota, e il cioccolato ha una bozza (la tavoletta usata nella prova dei nomi). Ne restano **56** da disegnare nel Task 6: una, il cioccolato, parte dalla bozza.

Tornare indietro costa poco: si aggiunge la chiave e si spostano i sinonimi.

## File

| File | Responsabilità |
|---|---|
| `src/domain/aree.ts` (modifica) | tono medio e tinta opaca per area |
| `src/domain/icone-ingredienti.ts` (nuovo) | catalogo chiave → sinonimi, `trovaIcona(nome)` |
| `src/domain/__tests__/icone-ingredienti.test.ts` (nuovo) | test del catalogo e della ricerca |
| `src/components/tracciati-ingredienti.ts` (nuovo) | tracciati SVG per chiave |
| `src/components/IconaIngrediente.tsx` (nuovo) | componente icona + `alone()` |
| `src/components/__tests__/icona-ingrediente.test.tsx` (nuovo) | test del componente e della copertura dei tracciati |
| `src/components/Tessera.tsx` (modifica) | icona nella Lista |
| `src/app/(app)/dispensa/TesseraDispensa.tsx` (modifica) | icona nella Dispensa |
| `src/components/TesseraIngrediente.tsx` (modifica) | icona nel piatto, matita in alto |
| `src/app/(app)/foglio-icone/page.tsx` (nuovo) | foglio di controllo, solo in sviluppo |
| `design/sistema/DESIGN.md`, `design/sistema/tokens.css`, `src/app/globals.css`, `docs/superpowers/specs/DESIGN-SYSTEM.md` (modifica) | regole e token |

---

### Task 1: Tono medio e tinta opaca per area

**Files:**
- Modify: `src/domain/aree.ts`
- Test: `src/domain/__tests__/aree-toni.test.ts` (nuovo)

**Interfaces:**
- Produces: `tonoMedioArea(id: AreaId): string` e `tintaOpacaArea(id: AreaId): string`. Entrambe restituiscono un hex maiuscolo a 6 cifre.

- [ ] **Step 1: Scrivi il test che fallisce**

```ts
// src/domain/__tests__/aree-toni.test.ts
import { describe, it, expect } from 'vitest';
import { AREE, tonoMedioArea, tintaOpacaArea } from '../aree';

describe('toni delle aree per le icone ingrediente (delta 26/09)', () => {
  it('tono medio: stessa tinta, luminosità a 2,8:1 su bianco', () => {
    expect(AREE.map((a) => tonoMedioArea(a.id))).toEqual([
      '#7AA838', '#D88384', '#759EC8', '#BB9609', '#D48949', '#9D91D6',
    ]);
  });

  it('tinta opaca: il 26% della Dispensa steso sul bianco, colore dell\'alone', () => {
    expect(AREE.map((a) => tintaOpacaArea(a.id))).toEqual([
      '#E8F5D8', '#FCE5E5', '#E5F0FC', '#FCF2D4', '#FCE7D7', '#EDEAFC',
    ]);
  });
});
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run src/domain/__tests__/aree-toni.test.ts`
Expected: FAIL, `tonoMedioArea is not a function` (o export mancante).

- [ ] **Step 3: Implementa**

In `src/domain/aree.ts`:
- estendi l'interfaccia `Area`;
- aggiungi i campi a ogni voce di `AREE`;
- aggiungi le due funzioni accanto a `coloreArea`.

```ts
export interface Area {
  id: AreaId;
  nome: string;
  colore: string;
  /** Tono medio (26/09): stessa tinta OKLCH, luminosità abbassata fino a 2,8:1 su bianco. Solo icone ingrediente. */
  tonoMedio: string;
  /** Il colore al 26% della Dispensa steso sul bianco: colore opaco dell'alone sul nome. */
  tintaOpaca: string;
}

export const AREE: readonly Area[] = [
  { id: 'ortofrutta', nome: 'ORTOFRUTTA', colore: '#A8D96A', tonoMedio: '#7AA838', tintaOpaca: '#E8F5D8' },
  { id: 'macelleria', nome: 'MACELLERIA E PESCHERIA', colore: '#F29B9B', tonoMedio: '#D88384', tintaOpaca: '#FCE5E5' },
  { id: 'latticini', nome: 'LATTICINI, UOVA E SALUMI', colore: '#9CC7F2', tonoMedio: '#759EC8', tintaOpaca: '#E5F0FC' },
  { id: 'cereali', nome: 'PASTA, RISO E CEREALI', colore: '#F5CE5B', tonoMedio: '#BB9609', tintaOpaca: '#FCF2D4' },
  { id: 'dispensa', nome: 'DISPENSA E CONSERVE', colore: '#F2A465', tonoMedio: '#D48949', tintaOpaca: '#FCE7D7' },
  { id: 'surgelati', nome: 'SURGELATI', colore: '#B9AEF5', tonoMedio: '#9D91D6', tintaOpaca: '#EDEAFC' },
] as const;

export function tonoMedioArea(id: AreaId): string {
  const a = PER_ID.get(id);
  if (!a) throw new Error(`Area sconosciuta: ${id}`);
  return a.tonoMedio;
}

export function tintaOpacaArea(id: AreaId): string {
  const a = PER_ID.get(id);
  if (!a) throw new Error(`Area sconosciuta: ${id}`);
  return a.tintaOpaca;
}
```

- [ ] **Step 4: Verifica che passi, insieme al resto della suite**

Run: `npx vitest run src/domain && npx tsc --noEmit`
Expected: PASS, nessun errore di tipo. Se qualche file costruisce un `Area` a mano, `tsc` lo segnala: aggiungi lì i due campi.

- [ ] **Step 5: Commit**

```bash
git add src/domain/aree.ts src/domain/__tests__/aree-toni.test.ts
git commit -m "feat(aree): tono medio e tinta opaca per le icone ingrediente"
```

---

### Task 2: Catalogo e `trovaIcona`

**Files:**
- Create: `src/domain/icone-ingredienti.ts`
- Test: `src/domain/__tests__/icone-ingredienti.test.ts`

**Interfaces:**
- Consumes: `normalizza(s: string): string` da `src/domain/import/mapping.ts`.
- Produces:
  - `CATALOGO_ICONE: Record<ChiaveIcona, readonly string[]>`
  - `type ChiaveIcona`
  - `CHIAVI_ICONE: ChiaveIcona[]`
  - `trovaIcona(nome: string): ChiaveIcona | null`

**Algoritmo:**
- Nome e sinonimi passano per `normalizza`, poi vengono spezzati in parole, e ogni parola è ridotta a una radice (`radice`). La radice assorbe singolare e plurale:
  - zucchina e zucchine → `zucchin`;
  - pomodoro e pomodori → `pomodor`;
  - arancia e arance → `aranc`.
- Vince il sinonimo la cui sequenza di radici compare **contigua** nel nome. A parità conta prima la lunghezza del sinonimo (più lungo vince: «pane in cassetta» batte «pane», «burro di arachidi» batte «burro»), poi la posizione (prima vince).
- Le radici evitano i falsi positivi per sottostringa: «pepe» non trova «peperoni», «sale» non trova «salmone».

- [ ] **Step 1: Scrivi i test che falliscono**

```ts
// src/domain/__tests__/icone-ingredienti.test.ts
import { describe, it, expect } from 'vitest';
import { CATALOGO_ICONE, CHIAVI_ICONE, trovaIcona } from '../icone-ingredienti';
import { normalizza } from '../import/mapping';
import { INGREDIENTI_BASE } from '../ingredienti-base';

describe('trovaIcona', () => {
  it.each([
    // nomi reali della produzione e del seed (query del 26/09)
    ['Olio extravergine', 'olio'],
    ['Cipolle', 'cipolla'],
    ['Limoni', 'limone'],
    ['Pane', 'pane'],
    ['Pomodorini', 'pomodorini'],
    ['Ceci lessati', 'legumi'],
    ['Uova', 'uovo'],
    ['Pasta integrale', 'pasta'],
    ['Petto di pollo', 'cosciotto'],
    ['Fesa di tacchino', 'cosciotto'],
    ['Macinato di manzo', 'bistecca'],
    ['Filetto di merluzzo', 'pesce'],
    ['Salmone surgelato', 'pesce'],
    ['Tonno in scatola', 'pesce'],
    ['Passata di pomodoro', 'pomodoro'],
    ['Pelati', 'pomodoro'],
    ['Pane in cassetta', 'pancarre'],
    ['Fette biscottate', 'pancarre'],
    ['Burro di arachidi', 'arachide'],
    ['Burro', 'burro'],
    ['Amido di mais', 'farina'],
    ['Mais', 'mais'],
    ['Pepe', 'spezie'],
    ['Peperoni', 'peperone'],
    ['Sale', 'sale'],
    ['Yogurt greco', 'yogurt'],
    ['Philadelphia', 'formaggio-fresco'],
    ['Tofu', 'formaggio-fresco'],
    ['Gocce di Cioccolato', 'cioccolato'],
    ['Minestrone surgelato', 'minestra'],
    ['Spinaci surgelati', 'foglie'],
    ['Piselli surgelati', 'piselli'],
    ['Fagiolini', 'fagiolini'],
    ['Fagioli lessati', 'legumi'],
    ['Lenticchie secche', 'legumi'],
    ['Cous cous', 'chicchi'],
    ['Fiocchi di avena', 'avena'],
    ['Caffè', 'caffe'],
    ['Würstel', 'salsiccia'],
    ['Funghi champignon', 'fungo'],
    ['Finocchi', 'finocchio'],
    ['Arance', 'arancia'],
    ['Noce moscata', 'spezie'],
  ])('%s → %s', (nome, chiave) => {
    expect(trovaIcona(nome)).toBe(chiave);
  });

  it('ignora maiuscole, accenti e spazi doppi', () => {
    expect(trovaIcona('  PETTO  di   Pollo ')).toBe('cosciotto');
    expect(trovaIcona('caffe')).toBe('caffe');
  });

  it('fuori catalogo: null', () => {
    expect(trovaIcona('Quark')).toBeNull();
    expect(trovaIcona('')).toBeNull();
  });

  it('copre tutti gli INGREDIENTI_BASE', () => {
    const scoperti = INGREDIENTI_BASE.map((i) => i.nome).filter((n) => trovaIcona(n) === null);
    expect(scoperti).toEqual([]);
  });
});

describe('CATALOGO_ICONE', () => {
  it('68 icone', () => {
    expect(CHIAVI_ICONE).toHaveLength(68);
  });

  it('ogni sinonimo appartiene a una sola chiave', () => {
    const visti = new Map<string, string>();
    const doppi: string[] = [];
    for (const k of CHIAVI_ICONE) {
      for (const s of CATALOGO_ICONE[k]) {
        const n = normalizza(s);
        if (visti.has(n)) doppi.push(`${s}: ${visti.get(n)} e ${k}`);
        visti.set(n, k);
      }
    }
    expect(doppi).toEqual([]);
  });
});
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run src/domain/__tests__/icone-ingredienti.test.ts`
Expected: FAIL, modulo `../icone-ingredienti` non trovato.

- [ ] **Step 3: Implementa**

```ts
// src/domain/icone-ingredienti.ts
import { normalizza } from './import/mapping';

/**
 * Le icone ingrediente (spec 2026-09-26, delta del pilota). Ogni chiave ha i
 * nomi che la accendono; singolare e plurale li assorbe `radice`, quindi qui
 * basta una forma. Le famiglie (pesce, legumi, spezie…) hanno un solo
 * rappresentante; i composti prendono l'icona dell'ingrediente base
 * (Passata di pomodoro → pomodoro, Tonno in scatola → pesce).
 */
export const CATALOGO_ICONE = {
  // ortofrutta
  banana: ['banana'],
  mela: ['mela'],
  pera: ['pera'],
  arancia: ['arancia', 'mandarino', 'clementina'],
  limone: ['limone', 'lime'],
  avocado: ['avocado'],
  zucchina: ['zucchina', 'zucchino'],
  melanzana: ['melanzana'],
  peperone: ['peperone'],
  broccolo: ['broccolo', 'cavolfiore', 'cavolo'],
  finocchio: ['finocchio'],
  sedano: ['sedano'],
  pomodoro: ['pomodoro', 'passata', 'passata di pomodoro', 'pelati', 'polpa di pomodoro', 'concentrato di pomodoro'],
  pomodorini: ['pomodorino', 'ciliegino', 'datterino'],
  insalata: ['insalata', 'lattuga', 'valeriana', 'songino', 'iceberg'],
  foglie: ['spinaci', 'rucola', 'bietola', 'bieta', 'erbette', 'coste'],
  carota: ['carota'],
  patata: ['patata', 'patata dolce', 'batata'],
  cipolla: ['cipolla', 'cipollotto', 'scalogno', 'porro'],
  aglio: ['aglio'],
  fungo: ['fungo', 'funghi', 'champignon'],
  zucca: ['zucca'],
  fagiolini: ['fagiolino'],
  uva: ['uva'],
  fragola: ['fragola', 'frutti di bosco', 'mirtillo', 'lampone'],
  cetriolo: ['cetriolo'],
  kiwi: ['kiwi'],
  erbe: ['basilico', 'prezzemolo', 'menta', 'rosmarino', 'salvia', 'erba cipollina'],
  // carne e pesce
  bistecca: ['manzo', 'macinato', 'vitello', 'carne', 'bistecca', 'hamburger'],
  cosciotto: ['pollo', 'tacchino'],
  salsiccia: ['salsiccia', 'wurstel'],
  pesce: ['pesce', 'salmone', 'merluzzo', 'branzino', 'spigola', 'orata', 'tonno', 'sgombro', 'platessa', 'nasello', 'pesce spada'],
  gambero: ['gambero', 'gamberetto', 'mazzancolla'],
  affettato: ['prosciutto', 'bresaola', 'speck', 'mortadella', 'salame', 'affettato'],
  pancetta: ['pancetta', 'guanciale'],
  // latticini e uova
  uovo: ['uovo'],
  latte: ['latte'],
  yogurt: ['yogurt', 'skyr', 'kefir'],
  formaggio: ['formaggio', 'parmigiano', 'grana', 'pecorino', 'feta', 'emmental', 'provola', 'scamorza'],
  mozzarella: ['mozzarella', 'burrata', 'stracciatella', 'fiordilatte'],
  'formaggio-fresco': ['ricotta', 'philadelphia', 'formaggio spalmabile', 'stracchino', 'fiocchi di latte', 'tofu'],
  burro: ['burro'],
  // cereali e forno
  pasta: ['pasta', 'spaghetti', 'penne', 'fusilli', 'rigatoni', 'linguine', 'tagliatelle', 'gnocchi'],
  riso: ['riso'],
  chicchi: ['farro', 'orzo', 'cous cous', 'couscous', 'quinoa', 'bulgur', 'miglio'],
  avena: ['avena', 'fiocchi di avena', 'porridge'],
  pane: ['pane', 'pagnotta', 'panino', 'baguette'],
  pancarre: ['pane in cassetta', 'pancarre', 'fetta biscottata', 'pane tostato'],
  biscotto: ['biscotto', 'cracker', 'crackers', 'galletta'],
  farina: ['farina', 'amido di mais', 'maizena', 'pangrattato'],
  cornetto: ['cornetto', 'brioche', 'croissant'],
  // dispensa
  olio: ['olio'],
  ampolla: ['aceto', 'salsa di soia'],
  sale: ['sale'],
  spezie: ['pepe', 'cannella', 'cumino', 'curry', 'paprika', 'origano', 'curcuma', 'noce moscata', 'zenzero', 'peperoncino'],
  zucchero: ['zucchero'],
  miele: ['miele'],
  marmellata: ['marmellata', 'confettura'],
  caffe: ['caffe'],
  mais: ['mais'],
  legumi: ['legumi', 'ceci', 'cece', 'fagioli', 'cannellini', 'borlotti', 'lenticchie'],
  piselli: ['pisello', 'edamame'],
  noce: ['noce', 'frutta secca'],
  mandorla: ['mandorla'],
  arachide: ['arachide', 'burro di arachidi', 'noccioline'],
  cioccolato: ['cioccolato', 'cacao'],
  // pronti e bevande
  minestra: ['minestrone', 'minestra', 'brodo', 'zuppa', 'vellutata'],
  acqua: ['acqua'],
} as const satisfies Record<string, readonly string[]>;

export type ChiaveIcona = keyof typeof CATALOGO_ICONE;
export const CHIAVI_ICONE = Object.keys(CATALOGO_ICONE) as ChiaveIcona[];

/**
 * Radice di una parola: toglie la vocale finale e poi una `i` rimasta
 * (pomodori/pomodoro → pomodor, arance/arancia → aranc, finocchi/finocchio →
 * finocch). Le parole fino a tre lettere restano intere.
 */
function radice(parola: string): string {
  if (parola.length <= 3) return parola;
  let r = parola.replace(/[aeiou]$/, '');
  if (r.length > 3) r = r.replace(/i$/, '');
  return r;
}

function radici(s: string): string[] {
  const n = normalizza(s);
  return n === '' ? [] : n.split(' ').map(radice);
}

interface Voce { chiave: ChiaveIcona; radici: string[]; lunghezza: number }

const VOCI: Voce[] = CHIAVI_ICONE.flatMap((chiave) =>
  CATALOGO_ICONE[chiave].map((s) => ({ chiave, radici: radici(s), lunghezza: normalizza(s).length })),
);

function posizione(nome: string[], cerca: string[]): number {
  for (let i = 0; i + cerca.length <= nome.length; i++) {
    if (cerca.every((r, j) => nome[i + j] === r)) return i;
  }
  return -1;
}

/**
 * La chiave d'icona per un nome libero, o null se fuori catalogo. Vince il
 * sinonimo più lungo che compare intero nel nome; a parità, il primo.
 */
export function trovaIcona(nome: string): ChiaveIcona | null {
  const n = radici(nome);
  let migliore: { chiave: ChiaveIcona; lunghezza: number; pos: number } | null = null;
  for (const v of VOCI) {
    const pos = posizione(n, v.radici);
    if (pos < 0) continue;
    if (!migliore || v.lunghezza > migliore.lunghezza || (v.lunghezza === migliore.lunghezza && pos < migliore.pos)) {
      migliore = { chiave: v.chiave, lunghezza: v.lunghezza, pos };
    }
  }
  return migliore?.chiave ?? null;
}
```

- [ ] **Step 4: Verifica che passi**

Run: `npx vitest run src/domain/__tests__/icone-ingredienti.test.ts`
Expected: PASS.
- Se un caso fallisce, correggi il **catalogo** (aggiungi la forma irregolare come sinonimo), non l'algoritmo. L'algoritmo si tocca solo se il caso rivela un errore di regola, e in quel caso va aggiunto un test dedicato.
- Se «copre tutti gli INGREDIENTI_BASE» fallisce su un nome, aggiungi il sinonimo alla chiave giusta secondo la lista rivista.

- [ ] **Step 5: Commit**

```bash
git add src/domain/icone-ingredienti.ts src/domain/__tests__/icone-ingredienti.test.ts
git commit -m "feat(icone): catalogo delle icone ingrediente e ricerca per nome"
```

---

### Task 3: Tracciati del pilota e componente `IconaIngrediente`

**Files:**
- Create: `src/components/tracciati-ingredienti.ts`
- Create: `src/components/IconaIngrediente.tsx`
- Test: `src/components/__tests__/icona-ingrediente.test.tsx`

**Interfaces:**
- Consumes: `ChiaveIcona` e `CHIAVI_ICONE` (Task 2), `tonoMedioArea` (Task 1).
- Produces:
  - `TRACCIATI: Partial<Record<ChiaveIcona, Tracciato>>`, dove `Tracciato = { d: string; dd: string; rot?: string }`.
  - `IconaIngrediente(props: { chiave: ChiaveIcona; area: AreaId; tono: TonoIcona; taglia: 52 | 84 })`. Rende un `<svg data-icona={chiave}>`, oppure `null` se la chiave non ha tracciato.
  - `type TonoIcona = 'area' | 'hero' | 'spento'`.
  - `alone(colore: string, px: 2 | 3): string`, il valore di `text-shadow`.

- [ ] **Step 1: Scrivi i test che falliscono**

```tsx
// src/components/__tests__/icona-ingrediente.test.tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { IconaIngrediente, alone } from '../IconaIngrediente';
import { TRACCIATI } from '../tracciati-ingredienti';

const PILOTA = ['bistecca', 'cosciotto', 'pesce', 'carota', 'pomodoro', 'uovo', 'latte', 'formaggio', 'pasta', 'pane', 'legumi', 'piselli'] as const;

function svg(c: HTMLElement) {
  return c.querySelector('svg[data-icona]') as SVGSVGElement;
}

describe('IconaIngrediente', () => {
  it('tono area: tono medio pieno, 52 px, tagliata di 10 px', () => {
    const { container } = render(<IconaIngrediente chiave="carota" area="ortofrutta" tono="area" taglia={52} />);
    const s = svg(container);
    expect(s).toHaveAttribute('aria-hidden', 'true');
    expect(s).toHaveAttribute('width', '52');
    expect(s).toHaveAttribute('stroke', '#7AA838');
    expect(s.style.right).toBe('-10px');
    expect(s.style.bottom).toBe('-10px');
    expect(s.style.opacity).toBe('1');
    expect(s.style.pointerEvents).toBe('none');
    const [sagoma, dettagli] = s.querySelectorAll('path');
    expect(sagoma).toHaveAttribute('stroke-width', '2');
    expect(dettagli).toHaveAttribute('stroke-width', '1.25');
  });

  it('tono hero: bianco a 0,42, 84 px, tagliata di 17 px', () => {
    const { container } = render(<IconaIngrediente chiave="pane" area="cereali" tono="hero" taglia={84} />);
    const s = svg(container);
    expect(s).toHaveAttribute('stroke', '#FFFFFF');
    expect(s).toHaveAttribute('width', '84');
    expect(s.style.opacity).toBe('0.42');
    expect(s.style.right).toBe('-17px');
  });

  it('tono spento: --off a 0,5', () => {
    const { container } = render(<IconaIngrediente chiave="uovo" area="latticini" tono="spento" taglia={52} />);
    const s = svg(container);
    expect(s).toHaveAttribute('stroke', '#9A9AA6');
    expect(s.style.opacity).toBe('0.5');
  });

  it('pasta ruotata di -28° come nel pilota', () => {
    const { container } = render(<IconaIngrediente chiave="pasta" area="cereali" tono="area" taglia={52} />);
    expect(svg(container).querySelector('path')).toHaveAttribute('transform', 'rotate(-28 12 12)');
  });

  it('chiave senza tracciato: nulla', () => {
    const { container } = render(<IconaIngrediente chiave="acqua" area="dispensa" tono="area" taglia={52} />);
    expect(svg(container)).toBeNull();
  });

  it('i dodici del pilota hanno il tracciato', () => {
    expect(PILOTA.filter((k) => !TRACCIATI[k])).toEqual([]);
  });
});

describe('alone', () => {
  it('otto direzioni senza sfocatura e una sfocata, nel colore dato', () => {
    expect(alone('#FFFFFF', 2)).toBe(
      '2px 0px 0 #FFFFFF,-2px 0px 0 #FFFFFF,0px 2px 0 #FFFFFF,0px -2px 0 #FFFFFF,'
      + '1.41px 1.41px 0 #FFFFFF,-1.41px 1.41px 0 #FFFFFF,1.41px -1.41px 0 #FFFFFF,-1.41px -1.41px 0 #FFFFFF,'
      + '0 0 3px #FFFFFF',
    );
    expect(alone('#F5CE5B', 3)).toContain('2.12px 2.12px 0 #F5CE5B');
    expect(alone('#F5CE5B', 3).endsWith('0 0 4px #F5CE5B')).toBe(true);
  });
});
```

Nel test «chiave senza tracciato» si usa `acqua`, che nel Task 6 riceve il tracciato. In quel task il test va cambiato come indicato lì.

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run src/components/__tests__/icona-ingrediente.test.tsx`
Expected: FAIL, moduli non trovati.

- [ ] **Step 3: Implementa i tracciati**

```ts
// src/components/tracciati-ingredienti.ts
import type { ChiaveIcona } from '@/domain/icone-ingredienti';

/** `d` è la sagoma (tratto 2), `dd` i segni interni (tratto 1,25); `rot` ruota entrambi. */
export interface Tracciato { d: string; dd: string; rot?: string }

/** Un cerchio come path: serve dove la sagoma e i fori stanno nello stesso `d`. */
const circ = (x: number, y: number, r: number) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

/**
 * Griglia 24, grammatica del delta del 26/09 (docs/design-delta/DELTA-2026-09-26-icone-ingrediente.md):
 * sagoma fra 2 e 22, ciò che fa riconoscere l'ingrediente fuori dalla fascia
 * tagliata (x o y oltre 19,2), fino a tre segni interni, riflesso ad arco a
 * sinistra sugli oggetti tondi, oggetti allungati in diagonale.
 */
export const TRACCIATI: Partial<Record<ChiaveIcona, Tracciato>> = {
  bistecca: {
    d: 'M2.8 19C1 17 2.4 13 6 9.6 9.6 6.2 13.8 2.8 17.8 2.6c3.4-.2 4.6 3 4.2 7.4-.4 4-2 7-5 7.2-3.4.2-6.6-.6-9.2.6-2 1-4 2.6-5 1.2Z',
    dd: 'M4.8 16.8c-.6-1.8 1.2-4.2 3.6-5.6 1.8-1 3.2-.6 3.4.8.2 1.6-.8 2.6-2.6 3.2-1.8.6-3.4 2.6-4.4 1.6ZM14 6.8c0-1.6 1.8-2.6 3.8-2.4 2.2.2 2.8 2.6 2.6 5.2-.2 2.6-1.2 5.2-2.8 5.2-1.4 0-1.8-2.2-2.2-3.8-.2-.8-.8-1-1.2-1.6-.3-.5-.2-1.4-.2-2.6ZM16.4 7.6a1.3 .9 0 1 0 2.6 0a1.3 .9 0 1 0-2.6 0',
  },
  cosciotto: {
    d: 'M10.69 14.07 8.43 16.33A1.7 1.7 0 1 1 5.81 17.39A1.7 1.7 0 1 1 6.87 14.77L9.13 12.51C8.5 10.5 9.15 7.13 10.15 5.4A5.6 5.6 0 1 1 17.8 13.05C16.07 14.05 12.7 14.7 10.69 14.07Z',
    dd: 'M13.4 5.9c1.5-.4 3 .2 3.9 1.4M12.6 11.6l.9-.9',
  },
  pesce: {
    d: 'M21.4 12C19.4 6.6 12 5.2 7.6 10.2L3.2 7.8 4.6 12 3.2 16.2l4.4-2.4C12 18.8 19.4 17.4 21.4 12ZM10.4 8.3l1.6-2.7c1.5 0 2.9.4 3.9 1.2' + circ(18.2, 10.9, 0.9),
    dd: 'M15.2 8.4c1.3 2.1 1.3 5.1 0 7.2M9.6 12.6l1.2-1.2M11.6 13.4l1.2-1.2',
  },
  carota: {
    d: 'M4.6 19.4C7.4 17.8 14.8 12.6 17 10.3A2.4 2.4 0 0 0 13.7 7C11.4 9.2 6.2 16.5 4.6 19.4ZM15.4 8.6 16.4 3.6M15.4 8.6l3.6-3.4M15.4 8.6l5 -1',
    dd: 'M8.6 13.9l1.3 1.3M11.2 11.3l1.3 1.3M13.4 9.3l1 1',
  },
  pomodoro: {
    d: 'M8 6.8A8.8 7.4 0 1 0 16 6.8M12 12 12.8 8.9 16 9.1 13.3 7.4 14.5 4.4 12 6.4 9.5 4.4 10.7 7.4 8 9.1 11.2 8.9ZM12 6.4V2.8',
    dd: 'M6.4 14.2c.2-1.7 1-3 2.2-3.8M7.4 17.2c.5.6 1.1 1 1.8 1.3',
  },
  uovo: {
    d: 'M7 13.6C7 8.2 9.2 3.4 12 3.4s5 4.8 5 10.2M5.6 13.6h12.8c0 3.2-2.8 5.4-6.4 5.4s-6.4-2.2-6.4-5.4ZM12 19v1.8M9 20.8h6',
    dd: 'M9.4 10.4c0-1.4.4-2.8 1.1-3.8M8.6 15.8c.8.9 2 1.4 3.4 1.4',
  },
  latte: {
    d: 'M5.4 20.8V9.4L8 5h8l2.6 4.4v11.4ZM8 5V3h8v2',
    dd: 'M5.4 9.4h13.2M12 12.2c-1.4 1.9-2.1 2.9-2.1 4a2.1 2.1 0 0 0 4.2 0c0-1.1-.7-2.1-2.1-4ZM8 18.4h8',
  },
  formaggio: {
    d: 'M3.2 19V13.4L16.4 5.4c2.8.5 4.6 2.6 4.6 5.4V19Z',
    dd: 'M3.2 13.4H21M16.4 5.4c-.6 1.2-.8 2.3-.6 3.4' + circ(8, 16.3, 1.5) + circ(14.6, 16.1, 1.8) + circ(12.6, 10.6, 1.2),
  },
  pasta: {
    rot: 'rotate(-28 12 12)',
    d: 'M6 8H21L17.4 15H2.4Z',
    dd: 'M6.6 9.8H18.8M5.6 11.5H17.9M4.7 13.2H17',
  },
  pane: {
    d: 'M3 19.2V12.4C1.6 11.6 2 7.4 5.6 7.4H9c3.6 0 4 4.2 2.6 5v6.8ZM9 7.4h8.6c3.6 0 4.6 3.8 3 5v6.8h-9',
    dd: 'M5 17.4v-5.8c-.9-.6-.6-2.4 1-2.4h1.8c1.6 0 1.9 1.8 1 2.4v5.8ZM14.8 7.8 14 9.6M18.2 8.2l-.8 1.6',
  },
  legumi: {
    d: 'M8 5C11.4 3.2 16.8 4.2 19 8.4c2.1 4.1.6 9.4-3.4 10.9-2.7 1-4.6-.9-5-3.1-.4-2-2.2-2.3-3.8-3.1C4 11.6 4.8 6.8 8 5Z',
    dd: 'M8.6 11.6c1 .5 1.8 1.3 2.3 2.3M13.4 6.4c2 .3 3.6 1.5 4.3 3.3',
  },
  piselli: {
    d: 'M3 6.6C5.4 14.2 13.6 17.8 20.6 11.8 15.6 12.2 8.2 11.4 3 6.6Z' + circ(7.4, 8.8, 1.8) + circ(12, 10.4, 1.8) + circ(16.4, 11.2, 1.8),
    dd: 'M20.6 11.8c.9-.4 1.5-1.4 1.4-2.6M3 6.6 2.4 4.6M6.4 13.6c2.6 2 6 2.6 9.4 1.6',
  },
};
```

- [ ] **Step 4: Implementa il componente**

```tsx
// src/components/IconaIngrediente.tsx
import type { AreaId } from '@/domain/types';
import type { ChiaveIcona } from '@/domain/icone-ingredienti';
import { tonoMedioArea } from '@/domain/aree';
import { TRACCIATI } from './tracciati-ingredienti';

export type TonoIcona = 'area' | 'hero' | 'spento';

/**
 * L'icona ingrediente (DESIGN.md §6, eccezione del 26/09): di tratto, in basso
 * a destra, tagliata dal bordo per il 20% — la tessera che la ospita deve
 * avere `position: relative; overflow: hidden`, e i testi sopra
 * `position: relative`. Decorativa: aria-hidden, nessun tocco.
 */
export function IconaIngrediente({ chiave, area, tono, taglia }: {
  chiave: ChiaveIcona; area: AreaId; tono: TonoIcona; taglia: 52 | 84;
}) {
  const t = TRACCIATI[chiave];
  if (!t) return null;
  const colore = tono === 'hero' ? '#FFFFFF' : tono === 'spento' ? '#9A9AA6' : tonoMedioArea(area);
  const opacita = tono === 'hero' ? 0.42 : tono === 'spento' ? 0.5 : 1;
  const taglio = taglia === 84 ? -17 : -10;
  return (
    <svg
      data-icona={chiave}
      aria-hidden="true"
      width={taglia}
      height={taglia}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colore}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ position: 'absolute', right: taglio, bottom: taglio, opacity: opacita, pointerEvents: 'none' }}
    >
      <path d={t.d} transform={t.rot} strokeWidth={2} />
      <path d={t.dd} transform={t.rot} strokeWidth={1.25} />
    </svg>
  );
}

/**
 * Alone sul nome: otto copie senza sfocatura più una sfocata, nel colore
 * opaco del fondo della tessera. Si vede solo dove interrompe il tratto
 * dell'icona; sul fondo nudo è invisibile.
 */
export function alone(colore: string, px: 2 | 3): string {
  const k = +(px * 0.707).toFixed(2);
  const dir: [number, number][] = [[px, 0], [-px, 0], [0, px], [0, -px], [k, k], [-k, k], [k, -k], [-k, -k]];
  return dir.map(([x, y]) => `${x}px ${y}px 0 ${colore}`).concat(`0 0 ${px + 1}px ${colore}`).join(',');
}
```

- [ ] **Step 5: Verifica che passi**

Run: `npx vitest run src/components/__tests__/icona-ingrediente.test.tsx`
Expected: PASS.

Se jsdom normalizza `opacity` diversamente (per esempio `'0.42'` contro `0.42`), adegua l'asserzione al valore stringa che jsdom restituisce, senza cambiare il componente.

- [ ] **Step 6: Commit**

```bash
git add src/components/tracciati-ingredienti.ts src/components/IconaIngrediente.tsx src/components/__tests__/icona-ingrediente.test.tsx
git commit -m "feat(icone): tracciati del pilota e componente IconaIngrediente"
```

---

### Task 4: Icona sulla tessera della Lista

**Files:**
- Modify: `src/components/Tessera.tsx`
- Test: `src/components/__tests__/tessera.test.tsx` (aggiunte)

**Interfaces:**
- Consumes: `trovaIcona` (Task 2), `IconaIngrediente` e `alone` (Task 3).

- [ ] **Step 1: Aggiungi i test che falliscono**

In fondo a `src/components/__tests__/tessera.test.tsx`, dentro un nuovo `describe`. `base` esiste già nel file (nome `Zucchine`, area `ortofrutta`).

```tsx
describe('Tessera · icona ingrediente', () => {
  const icona = (c: HTMLElement) => c.querySelector('svg[data-icona]');

  it('accesa: icona nel tono medio, alone bianco sul nome', () => {
    const { container } = render(<Tessera {...base} spuntato={false} protagonista={false} />);
    expect(icona(container)).toHaveAttribute('data-icona', 'zucchina');
    expect(icona(container)).toHaveAttribute('stroke', '#7AA838');
    expect(icona(container)).toHaveAttribute('width', '52');
    expect(screen.getByText('Zucchine').style.textShadow).toContain('#FFFFFF');
    const t = screen.getByRole('button');
    expect(t.style.position).toBe('relative');
    expect(t.style.overflow).toBe('hidden');
  });

  it('protagonista: icona bianca a 84 px, alone nel colore d\'area a 3 px', () => {
    const { container } = render(<Tessera {...base} spuntato={false} protagonista />);
    expect(icona(container)).toHaveAttribute('stroke', '#FFFFFF');
    expect(icona(container)).toHaveAttribute('width', '84');
    expect(screen.getByText('Zucchine').style.textShadow).toContain('0 0 4px #A8D96A');
  });

  it('spenta: icona spenta, nome opaco #ABACB8 con alone #F7F7F8', () => {
    const { container } = render(<Tessera {...base} spuntato protagonista={false} />);
    expect(icona(container)).toHaveAttribute('stroke', '#9A9AA6');
    const nome = screen.getByText('Zucchine');
    expect(nome).toHaveStyle({ color: '#ABACB8' });
    expect(nome.style.textShadow).toContain('#F7F7F8');
  });

  it('fuori catalogo: nessuna icona e nessun alone', () => {
    const { container } = render(<Tessera {...base} nome="Quark" spuntato={false} protagonista={false} />);
    expect(icona(container)).toBeNull();
    expect(screen.getByText('Quark').style.textShadow).toBe('');
  });
});
```

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/components/__tests__/tessera.test.tsx`
Expected: FAIL sui quattro nuovi casi. I casi esistenti passano ancora.

- [ ] **Step 3: Implementa**

In `src/components/Tessera.tsx`:

1. Import:
```tsx
import { trovaIcona } from '@/domain/icone-ingredienti';
import { IconaIngrediente, alone } from './IconaIngrediente';
```
2. Accanto a `OFF_INK`:
```tsx
/** Il nome spento in colore opaco: con l'alone sotto, un testo trasparente lascerebbe trasparire l'alone (delta 26/09). Su #F7F7F8 vale quanto rgba(20,22,58,0.34). */
const OFF_NOME = '#ABACB8';
```
3. Nel ramo `if (!acceso)`: `nameColor = OFF_NOME;` al posto di `nameColor = OFF_INK;` (la pillola resta su `OFF_INK`).
4. Dopo il calcolo dei colori:
```tsx
const chiave = trovaIcona(nome);
const tonoIcona = !acceso ? 'spento' : protagonista ? 'hero' : 'area';
const coloreAlone = !acceso ? '#F7F7F8' : protagonista ? colore : '#FFFFFF';
```
5. Nello `style` del `<button>` aggiungi `position: 'relative', overflow: 'hidden'`.
6. Primo figlio del `<button>`:
```tsx
{chiave && <IconaIngrediente chiave={chiave} area={area} tono={tonoIcona} taglia={protagonista ? 84 : 52} />}
```
7. Aggiungi `position: 'relative'` allo `style` della riga della pillola (il `div` con `display: 'flex', alignItems: 'center', gap: 6`) e al `div` che contiene nome e sottotitolo (`minWidth: 0, marginTop: 10`).
8. Sullo `style` del nome aggiungi `textShadow: chiave ? alone(coloreAlone, protagonista ? 3 : 2) : undefined`.

- [ ] **Step 4: Verifica che passi**

Run: `npx vitest run src/components/__tests__/tessera.test.tsx "src/app/(app)/lista"`
Expected: PASS, compresi i test esistenti della Lista.

Se jsdom riscrive i colori dentro `textShadow` in forma `rgb(...)`, confronta con quella forma (per esempio `rgb(255, 255, 255)`), senza cambiare il componente. Vale anche per i test del Task 5.

- [ ] **Step 5: Commit**

```bash
git add src/components/Tessera.tsx src/components/__tests__/tessera.test.tsx
git commit -m "feat(lista): icona ingrediente sulle tessere, bianca sulla protagonista"
```

---

### Task 5: Icona sulla Dispensa e sull'ingrediente del piatto

Le due tessere sono insieme perché la modifica è la stessa (icona, alone, `position`). Nel piatto si aggiunge lo spostamento della matita.

**Files:**
- Modify: `src/app/(app)/dispensa/TesseraDispensa.tsx`
- Modify: `src/components/TesseraIngrediente.tsx`
- Test: `src/app/(app)/dispensa/__tests__/pezzi.test.tsx` (aggiunte), `src/components/__tests__/TesseraIngrediente.test.tsx` (aggiunte)

**Interfaces:**
- Consumes: `trovaIcona`, `IconaIngrediente`, `alone`, `tintaOpacaArea` (Task 1–3).

- [ ] **Step 1: Aggiungi i test della Dispensa**

In `pezzi.test.tsx`. `voce()` esiste già: `Petto di pollo`, macelleria, residuo 600.

```tsx
describe('TesseraDispensa · icona ingrediente', () => {
  const icona = (c: HTMLElement) => c.querySelector('svg[data-icona]');

  it('in casa: icona nel tono medio, alone nella tinta opaca d\'area', () => {
    const { container } = render(<TesseraDispensa voce={voce()} pillola={null} onApri={vi.fn()} />);
    expect(icona(container)).toHaveAttribute('data-icona', 'cosciotto');
    expect(icona(container)).toHaveAttribute('stroke', '#D88384');
    expect(screen.getByText('Petto di pollo').style.textShadow).toContain('#FCE5E5');
    const t = screen.getByRole('button');
    expect(t.style.position).toBe('relative');
    expect(t.style.overflow).toBe('hidden');
  });

  it('finita: icona spenta, nome opaco #ADAEBA, alone bianco', () => {
    const { container } = render(<TesseraDispensa voce={voce({ residuo: 0 })} pillola={null} onApri={vi.fn()} />);
    expect(icona(container)).toHaveAttribute('stroke', '#9A9AA6');
    const nome = screen.getByText('Petto di pollo');
    expect(nome).toHaveStyle({ color: '#ADAEBA' });
    expect(nome.style.textShadow).toContain('#FFFFFF');
  });

  it('mai comprato: icona spenta', () => {
    const { container } = render(<TesseraDispensa voce={voce({ residuo: 0, ultimoAcquisto: null })} pillola={null} onApri={vi.fn()} />);
    expect(icona(container)).toHaveAttribute('stroke', '#9A9AA6');
  });
});
```

- [ ] **Step 2: Aggiungi i test dell'ingrediente del piatto**

In `TesseraIngrediente.test.tsx`. `rendi()` usa `Olio di semi`, che avrà il tracciato solo nel Task 6. Per questo il primo caso usa `Uova`, che fa parte del pilota.

```tsx
describe('TesseraIngrediente · icona ingrediente', () => {
  it('icona in basso a destra nel tono medio, alone bianco su nome ed etichetta d\'area', () => {
    const { container } = rendi({ nome: 'Uova', area: 'latticini' });
    const s = container.querySelector('svg[data-icona]');
    expect(s).toHaveAttribute('data-icona', 'uovo');
    expect(s).toHaveAttribute('stroke', '#759EC8');
    expect(screen.getByText('Uova').style.textShadow).toContain('#FFFFFF');
    expect(screen.getByText('LATTICINI, UOVA E SALUMI').style.textShadow).toContain('#FFFFFF');
  });

  it('la matita sale in alto, accanto alla X: l\'angolo in basso a destra è dell\'icona', () => {
    rendi({ hrefModifica: '/piatti/p1/ingredienti/olio-1' });
    const matita = screen.getByRole('link', { name: 'Modifica Olio di semi' });
    expect(matita.style.top).toBe('0px');
    expect(matita.style.right).toBe('44px');
    expect(matita.style.bottom).toBe('');
    const x = screen.getByRole('button', { name: 'Rimuovi Olio di semi' });
    expect(x.style.right).toBe('0px');
  });
});
```

- [ ] **Step 3: Verifica che falliscano**

Run: `npx vitest run "src/app/(app)/dispensa/__tests__/pezzi.test.tsx" src/components/__tests__/TesseraIngrediente.test.tsx`
Expected: FAIL sui nuovi casi.

- [ ] **Step 4: Implementa la Dispensa**

In `TesseraDispensa.tsx`:
```tsx
import { coloreArea, tintaOpacaArea } from '@/domain/aree';
import { trovaIcona } from '@/domain/icone-ingredienti';
import { IconaIngrediente, alone } from '@/components/IconaIngrediente';
```
Dentro il componente, dopo `inCasa`:
```tsx
const { nome, area } = voce.ingrediente;
const chiave = trovaIcona(nome);
```
Poi, nel markup:
- nello `style` del `<button>` aggiungi `position: 'relative', overflow: 'hidden'`;
- come primo figlio del `<button>`:
```tsx
{chiave && <IconaIngrediente chiave={chiave} area={area} tono={inCasa ? 'area' : 'spento'} taglia={52} />}
```
- aggiungi `position: 'relative'` alle due pillole (quantità e scadenza) e al nome;
- colore del nome finito: `'rgba(20,22,58,0.34)'` diventa `'#ADAEBA'`;
- sul nome: `textShadow: chiave ? alone(inCasa ? tintaOpacaArea(area) : '#FFFFFF', 2) : undefined`.

- [ ] **Step 5: Implementa l'ingrediente del piatto**

In `TesseraIngrediente.tsx`:
- Import di `trovaIcona` e di `IconaIngrediente` / `alone`.
- `const chiave = trovaIcona(nome);`
- Nello `style` del `<div>` esterno (ha già `position: 'relative'`) aggiungi `overflow: 'hidden'`.
- Come primo figlio del `<div>`:
```tsx
{chiave && <IconaIngrediente chiave={chiave} area={area} tono="area" taglia={52} />}
```
- Link della matita: `bottom: 0, right: 0` diventa `top: 0, right: 44`. Riscrivi il commento sopra:
```tsx
{/* Accanto alla ✕, stessa area di tap da 44px: l'angolo in basso a destra è
    dell'icona ingrediente (delta 26/09). X all'esterno, matita all'interno. */}
```
- Aggiungi `position: 'relative'` al `<label>` della quantità, al nome e all'etichetta d'area.
- Sul nome e sull'etichetta d'area: `textShadow: chiave ? alone('#FFFFFF', 2) : undefined`.

Il `<label>` della quantità sta a sinistra. I due bersagli da 44 px in alto a destra occupano 88 px su una tessera di circa 170 px: controlla nel Task 7 che non si sovrappongano alla pillola.

- [ ] **Step 6: Verifica che passi**

Run: `npx vitest run "src/app/(app)/dispensa" src/components "src/app/(app)/piatti"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/dispensa/TesseraDispensa.tsx" src/components/TesseraIngrediente.tsx "src/app/(app)/dispensa/__tests__/pezzi.test.tsx" src/components/__tests__/TesseraIngrediente.test.tsx
git commit -m "feat(dispensa,piatti): icona ingrediente, matita accanto alla X"
```

---

### Task 6: Le altre 56 icone e il foglio di controllo

**Files:**
- Modify: `src/components/tracciati-ingredienti.ts`
- Create: `src/app/(app)/foglio-icone/page.tsx`
- Test: `src/components/__tests__/icona-ingrediente.test.tsx` (modifica)

**Interfaces:**
- Consumes: `CHIAVI_ICONE`, `CATALOGO_ICONE` (Task 2), `TRACCIATI` e `IconaIngrediente` (Task 3), `Tessera`, `TesseraDispensa`, `TesseraIngrediente` (Task 4–5).
- Produces: `TRACCIATI` completo per tutte le 68 chiavi.

- [ ] **Step 1: Scrivi il test di copertura che fallisce**

In `icona-ingrediente.test.tsx`:
- sostituisci il caso «chiave senza tracciato: nulla» con il test di copertura qui sotto;
- tieni il test del `null` forzando una chiave fuori tipo.

```tsx
import { CHIAVI_ICONE } from '@/domain/icone-ingredienti';

it('ogni chiave del catalogo ha il tracciato', () => {
  expect(CHIAVI_ICONE.filter((k) => !TRACCIATI[k])).toEqual([]);
});

it('ogni tracciato ha sagoma e dettagli', () => {
  const vuoti = CHIAVI_ICONE.filter((k) => !TRACCIATI[k]?.d || !TRACCIATI[k]?.dd);
  expect(vuoti).toEqual([]);
});

it('chiave senza tracciato: nulla', () => {
  const { container } = render(
    <IconaIngrediente chiave={'inesistente' as never} area="dispensa" tono="area" taglia={52} />,
  );
  expect(svg(container)).toBeNull();
});
```

Run: `npx vitest run src/components/__tests__/icona-ingrediente.test.tsx`
Expected: FAIL. La lista delle 56 chiavi mancanti è l'elenco di lavoro.

- [ ] **Step 2: Disegna le icone, una famiglia per commit**

Regole (grammatica del delta, non negoziabili):
- La sagoma sta fra 2 e 22.
- Ciò che fa riconoscere l'ingrediente sta fuori dalla fascia x > 19,2 o y > 19,2.
- `d` a tratto 2 contiene la sagoma e il tratto identificativo. `dd` a tratto 1,25 contiene al massimo tre segni interni.
- Riflesso ad arco a sinistra sugli oggetti tondi.
- Nessun foro con raggio sotto 1,6.
- Oggetti allungati in diagonale, dal basso a sinistra all'alto a destra.
- Usa `circ()` per i tondi.
- Prendi i dodici del pilota come riferimento di peso e di dettaglio. Nessuna icona deve essere più ricca di bistecca o piselli.

| Chiave | Sagoma (tratto 2) | Segni interni (1,25) |
|---|---|---|
| banana | falce in diagonale, punta in alto a destra con picciolo squadrato | una costa lungo la curva |
| mela | tondo con incavo in cima, picciolo, una foglia | riflesso ad arco a sinistra |
| pera | goccia larga in basso, collo stretto, picciolo inclinato | riflesso a sinistra |
| arancia | tondo pieno, piccola foglia in cima | riflesso, tre puntini della buccia (raggio ≥ 1,6) o un arco |
| limone | ovale appuntito ai due capi, inclinato | riflesso ad arco |
| avocado | mezza goccia tagliata | nocciolo tondo grande (r ≥ 2,5), riga della polpa |
| zucchina | cilindro allungato in diagonale, capi arrotondati, peduncolo a stella piccola | due righe per il lungo |
| melanzana | goccia allungata in diagonale, calice a tre punte in cima | riflesso ad arco |
| peperone | corpo a tre lobi in basso, spalla larga, picciolo curvo | due solchi verticali |
| broccolo | chioma a tre lobi, gambo corto | due rami nel gambo |
| finocchio | bulbo largo in basso, tre gambi verso l'alto con ciuffo | due guaine sul bulbo |
| sedano | tre coste parallele in diagonale, foglie in cima | una riga per costa |
| pomodorini | tre tondi a grappolo su un rametto | riflesso sul tondo davanti |
| insalata | cespo a ventaglio, foglie ondulate | due nervature |
| foglie | foglia singola a punta in diagonale, picciolo | nervatura centrale + due laterali |
| patata | ovale irregolare bitorzoluto | tre occhi (archi corti) |
| cipolla | goccia con punta in alto, radici corte sotto | due archi verticali delle tuniche |
| aglio | testa a spicchi con punta, radici sotto | due linee degli spicchi |
| fungo | cappello a cupola, gambo | lamelle sotto il cappello (un arco), un punto del cappello |
| zucca | tondo schiacciato a spicchi, picciolo spesso | due solchi degli spicchi |
| fagiolini | due baccelli sottili incrociati in diagonale | punta ricurva |
| uva | grappolo di acini (6, r ≥ 1,8), raspo | foglia piccola a sinistra |
| fragola | cuore arrotondato a punta in basso, calice in cima | tre semi (trattini) |
| cetriolo | cilindro in diagonale, capi arrotondati | quattro trattini delle spine |
| kiwi | tondo tagliato a metà | anello interno, raggi corti dei semi |
| erbe | rametto con cinque foglie a coppie | nervatura di due foglie |
| salsiccia | due tozzi a catena in diagonale, legatura in mezzo | riflesso lungo |
| gambero | corpo a C segmentato, coda a ventaglio, antenne | tre segmenti |
| affettato | fetta tonda leggermente ondulata, piegata | bordo di grasso (arco interno) |
| pancetta | rettangolo allungato con bordo ondulato | due strisce di grasso |
| yogurt | vasetto tronco di cono, coperchio con linguetta | etichetta: una riga orizzontale sul vasetto |
| mozzarella | sfera con nodo in cima | riflesso ad arco |
| formaggio-fresco | vaschetta bassa con coperchio | segno di spatola (arco) sulla superficie |
| burro | panetto a parallelepipedo, carta aperta | riga della carta, ricciolo in cima |
| riso | ciotola con cumulo | tre chicchi (ovali piccoli) sul cumulo |
| chicchi | spiga in diagonale, chicchi a coppie | resta (due baffi) in cima |
| avena | ciotola con cucchiaio | due fiocchi sulla superficie |
| pancarre | fetta di pancarré quadrata a cupola | crosta come contorno interno |
| biscotto | biscotto tondo con bordo smerlato | tre fori (r ≥ 1,6) |
| farina | sacchetto con bocca arrotolata | spiga piccola sul fronte |
| cornetto | mezzaluna a segmenti | due linee dei segmenti |
| olio | bottiglia alta a collo stretto, tappo | goccia sul fronte |
| ampolla | ampolla panciuta con becco | riga del livello |
| sale | saliera a cupola con fori | tre fori (r ≥ 1,6 se nella fascia visibile) |
| spezie | barattolino con coperchio a vite | tre puntini sul coperchio |
| zucchero | due zollette cubiche sovrapposte | spigoli interni |
| miele | barattolo con coperchio | cucchiaio da miele (spirale) appoggiato |
| marmellata | barattolo con coperchio a stoffa legato | etichetta con un frutto (tondo) |
| caffe | moka: base ottagonale, vita stretta, beccuccio, manico | riga della vita |
| mais | pannocchia in diagonale con foglie aperte | griglia di chicchi: due righe |
| noce | guscio tondo con cresta centrale | due solchi a cervello |
| mandorla | goccia appuntita in diagonale | due righe curve |
| arachide | baccello a otto in diagonale | tre trattini della rete |
| cioccolato | tavoletta a quadretti inclinata (bozza del pilota: `rot: 'rotate(-12 12 12)'`, `d: 'M6 3.6h10a2 2 0 0 1 2 2v12.8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5.6a2 2 0 0 1 2-2Z'`, `dd: 'M4 9.2h14M4 14.2h14M11 3.6v16.8'`) | righe dei quadretti |
| minestra | ciotola con tre fili di vapore | cucchiaio |
| acqua | bottiglia con collo e tappo, fianchi a onda | goccia o riga del livello |

Ordine di lavoro, con un commit per famiglia:
- ortofrutta (26 chiavi);
- carne e pesce (4);
- latticini (4);
- cereali e forno (7);
- dispensa (13, il cioccolato parte dalla bozza del pilota);
- pronti e bevande (2).

Dopo ogni famiglia:
```bash
npx vitest run src/components/__tests__/icona-ingrediente.test.tsx
git add src/components/tracciati-ingredienti.ts
git commit -m "feat(icone): tracciati — <famiglia>"
```
Il test di copertura resta rosso finché non c'è l'ultima famiglia. Nei commit intermedi è l'unico caso rosso ammesso.

- [ ] **Step 3: Scrivi il foglio di controllo (solo sviluppo)**

```tsx
// src/app/(app)/foglio-icone/page.tsx
import { notFound } from 'next/navigation';
import { CATALOGO_ICONE, CHIAVI_ICONE, type ChiaveIcona } from '@/domain/icone-ingredienti';
import { AREE } from '@/domain/aree';
import type { AreaId } from '@/domain/types';
import { IconaIngrediente } from '@/components/IconaIngrediente';
import { FoglioTessere } from './FoglioTessere';

/**
 * Foglio di controllo delle icone ingrediente (spec 2026-09-26, passo 3):
 * ogni icona in tono medio sulle sei aree e in bianco sui sei colori pieni,
 * poi le tessere vere con nomi corti e lunghi. Non esiste in produzione.
 */
export default function FoglioIcone() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 4 }}>
        <tbody>
          {CHIAVI_ICONE.map((k) => (
            <tr key={k}>
              <th style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textAlign: 'left', verticalAlign: 'middle' }}>
                {k}<br /><span style={{ fontWeight: 400, color: 'var(--testo-2)' }}>{CATALOGO_ICONE[k].slice(0, 3).join(', ')}</span>
              </th>
              {AREE.map((a) => <Cella key={`t-${a.id}`} chiave={k} area={a.id} sfondo="#FFFFFF" bordo={a.colore} tono="area" />)}
              {AREE.map((a) => <Cella key={`h-${a.id}`} chiave={k} area={a.id} sfondo={a.colore} bordo={a.colore} tono="hero" />)}
            </tr>
          ))}
        </tbody>
      </table>
      <FoglioTessere />
    </main>
  );
}

function Cella({ chiave, area, sfondo, bordo, tono }: { chiave: ChiaveIcona; area: AreaId; sfondo: string; bordo: string; tono: 'area' | 'hero' }) {
  return (
    <td>
      <div style={{ position: 'relative', width: 64, height: 64, borderRadius: 12, background: sfondo, border: `1px solid ${bordo}` }}>
        <div style={{ position: 'absolute', inset: 6 }}>
          <IconaIngrediente chiave={chiave} area={area} tono={tono} taglia={52} />
        </div>
      </div>
    </td>
  );
}
```

L'icona è posizionata con `right/bottom` negativi, quindi dentro la cella esce di 10 px. Nel foglio va bene: si vede lo stesso taglio della tessera. Se serve la vista intera, avvolgi l'icona in un contenitore con `right: 10, bottom: 10`.

```tsx
// src/app/(app)/foglio-icone/FoglioTessere.tsx
'use client';

import { Tessera } from '@/components/Tessera';
import { TesseraIngrediente } from '@/components/TesseraIngrediente';
import { TesseraDispensa } from '../dispensa/TesseraDispensa';
import type { AreaId, Ingredient } from '@/domain/types';

const NOMI: [string, AreaId][] = [
  ['Uova', 'latticini'], ['Pane', 'cereali'], ['Latte', 'latticini'],
  ['Petto di pollo', 'macelleria'], ['Pomodori', 'ortofrutta'],
  ['Passata di pomodoro', 'dispensa'], ['Cioccolato fondente', 'dispensa'],
  ['Macinato di manzo', 'macelleria'], ['Filetto di merluzzo', 'surgelati'],
  ['Minestrone surgelato', 'surgelati'], ['Olio extravergine', 'dispensa'],
];

const nulla = () => {};

function ingrediente(nome: string, area: AreaId): Ingredient {
  return { id: nome, nome, area, unitaBase: 'g', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500, prezzoConfezione: null, ean: null };
}

/** Le tre tessere vere, in una colonna larga come il telefono (393 − 2×16). */
export function FoglioTessere() {
  const griglia = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: 361, padding: 12, background: '#FFFFFF', borderRadius: 22 } as const;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
      <div style={griglia}>
        {NOMI.map(([n, a], i) => (
          <Tessera key={n} nome={n} area={a} unita="g" fabbisogno={500} residuo={0} confezioni={1} quantitaTotale={500}
            spuntato={i % 4 === 3} mostraDettaglio={false} protagonista={i === 0} onToggle={nulla} />
        ))}
      </div>
      <div style={griglia}>
        {NOMI.map(([n, a], i) => (
          <TesseraDispensa key={n} pillola={null} onApri={nulla}
            voce={{ ingrediente: ingrediente(n, a), residuo: i % 3 === 2 ? 0 : 300, ultimoAcquisto: i % 6 === 5 ? null : '2026-09-24', congelato: false, scadenzaManuale: null }} />
        ))}
      </div>
      <div style={griglia}>
        {NOMI.map(([n, a]) => (
          <TesseraIngrediente key={n} nome={n} area={a} quantita={100} unita="g"
            onCambiaQuantita={nulla} onRimuovi={nulla} hrefModifica="#" />
        ))}
      </div>
    </div>
  );
}
```

Prima di usarle, verifica le props reali di `Tessera`, `TesseraDispensa` e `TesseraIngrediente`: se `tsc` segnala un nome diverso, adegua il foglio, non i componenti.

- [ ] **Step 4: Verifica tutto**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tutto PASS.

- [ ] **Step 5: Guarda il foglio nel browser**

1. `preview_start` con `{ name: "spesa-dev" }`.
2. Fai login con il magic link dalla Gmail di Andrea. È già stato autorizzato una volta: se serve di nuovo, chiedi.
3. Vai su `/foglio-icone` e fai screenshot della tabella e delle tessere.
4. Per ogni icona controlla:
   - si capisce senza leggere la chiave?
   - si distingue dalle vicine (legumi e piselli, pane e pancarré, olio, ampolla e acqua, noce e mandorla)?
   - il tratto identificativo resta visibile dopo il taglio?
5. Correggi e ricommitta. Un'icona che non si capisce dopo due tentativi va segnalata ad Andrea con la proposta di passarla a un'icona di famiglia.

- [ ] **Step 6: Commit del foglio**

```bash
git add "src/app/(app)/foglio-icone" src/components/__tests__/icona-ingrediente.test.tsx
git commit -m "feat(icone): foglio di controllo delle icone ingrediente (solo sviluppo)"
```

- [ ] **Step 7: Gate — Andrea rivede il foglio**

Manda ad Andrea gli screenshot del foglio (SendUserFile) e **fermati**. Si prosegue solo col suo ok. Le icone che rifiuta tornano allo Step 2.

---

### Task 7: Verifica sulle schermate vere e regole del design system

**Files:**
- Modify: `design/sistema/DESIGN.md` (§2.3, §6, §12)
- Modify: `design/sistema/tokens.css`, `src/app/globals.css` (token del tono medio)
- Modify: `docs/superpowers/specs/DESIGN-SYSTEM.md` (indice componente → file)

- [ ] **Step 1: Verifica nel browser, in larghezza telefono**

`resize_window` con preset `mobile`, poi apri `/lista`, `/dispensa` e la pagina di un piatto.

Controlla:
- l'icona sta in basso a destra ed è tagliata dal raggio della tessera;
- il nome si legge sopra l'icona, anche quando va a capo;
- sulle tessere senza icona non cambia nulla;
- nel piatto, la matita e la X stanno in alto a destra e **non si sovrappongono alla pillola della quantità**. Misura con `javascript_tool`:
```js
const t = [...document.querySelectorAll('[data-quantita-valida]')][0];
const q = t.querySelector('label').getBoundingClientRect();
const m = t.querySelector('a[aria-label^="Modifica"]').getBoundingClientRect();
({ pillolaFinisce: q.right, matitaInizia: m.left, sovrapposti: q.right > m.left });
```
  Se `sovrapposti` è `true`, riferisci ad Andrea la misura e **non** inventare una soluzione. È un punto «aperto» del delta.
- Hero gialla (cereali) e verde (ortofrutta): l'icona bianca a 0,42 si vede? Il delta la dà per «al limite». Fai uno screenshot e riferisci.

Fai gli screenshot delle tre schermate e riporta `read_console_messages` senza errori. Alla fine torna a `resize_window` con preset `desktop`.

- [ ] **Step 2: Aggiorna DESIGN.md**

Applica il testo esatto della sezione «Testo per DESIGN.md» di `docs/design-delta/DELTA-2026-09-26-icone-ingrediente.md`:
- §6: la frase delle taglie, il paragrafo «Icone ingrediente», la frase sulle illustrazioni;
- §12: il paragrafo dell'eccezione;
- §2.3: la colonna del tono medio.

Aggiungi anche una riga alla tabella delle decisioni (§13), nel formato delle righe esistenti: «Icone ingrediente | 68 icone di tratto, tono medio d'area, alone sul nome | §2.3, §6, §12».

- [ ] **Step 3: Aggiungi i token**

In `design/sistema/tokens.css`, subito dopo `--area-surgelati`:
```css
  --tono-ortofrutta: #7AA838;         /* tono medio (26/09): icone ingrediente — 2,8:1 su bianco */
  --tono-macelleria: #D88384;
  --tono-latticini: #759EC8;
  --tono-cereali: #BB9609;
  --tono-dispensa: #D48949;
  --tono-surgelati: #9D91D6;
```
In `src/app/globals.css`, dopo `--area-surgelati`, aggiungi le stesse sei righe senza commento.

Run: `npm run design:token`
Expected: PASS.

- [ ] **Step 4: Aggiorna il ponte col codice**

In `docs/superpowers/specs/DESIGN-SYSTEM.md`, nell'indice componente → file, aggiungi:

`Icona ingrediente → src/components/IconaIngrediente.tsx (tracciati in tracciati-ingredienti.ts, catalogo in src/domain/icone-ingredienti.ts)`

- [ ] **Step 5: Suite completa e build**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: tutto PASS.

Annota il peso della pagina `/lista` riportato da `next build`, prima e dopo: fai `git stash` su un checkout di `main`, oppure confronta con l'output del build di `main`. È la misura che la spec chiedeva al posto della stima «qualche decina di KB».

- [ ] **Step 6: Commit**

```bash
git add design/sistema/DESIGN.md design/sistema/tokens.css src/app/globals.css docs/superpowers/specs/DESIGN-SYSTEM.md
git commit -m "docs(design): icone ingrediente, eccezione dichiarata in §6 e §12, token del tono medio"
```

- [ ] **Step 7: Gate — merge**

Non fare il merge. Riferisci ad Andrea:
- gli screenshot;
- la misura del peso;
- l'esito della verifica su matita e pillola;
- l'esito della verifica sulle hero gialla e verde.

Chiedi l'ok per aprire la PR verso `main`. Il merge pubblica in produzione: niente migrazioni in questo lavoro, quindi niente altro da applicare prima.
