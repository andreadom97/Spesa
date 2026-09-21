# Fase 2 del ridisegno: Lista e Piano — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** portare nel codice il corpo di Lista e Piano: una lista sola per reparto con le sezioni
come widget, il tasto primario in un Dock flottante, e il Piano con il quarto stato della cella,
l'etichetta che titola il giorno scelto e la pillola della settimana.

**Architecture:** il dato non cambia — la fusione base/top-up è una funzione pura che gira in
lettura, sopra la `ListaSalvata` che già arriva dal server. Il Dock è un componente condiviso che
si monta con `createPortal` in uno slot del `Guscio`, così galleggia accanto alla tab bar invece
di stare dentro lo scroller della pagina. Tutto il resto è lavoro di presentazione su tre
componenti esistenti e due pagine.

**Tech Stack:** Next.js 16 App Router, React client components, TypeScript, Supabase
(`@supabase/ssr`), Vitest + Testing Library (jsdom), stile inline con le classi condivise in
`src/app/globals.css`.

**Spec:** `docs/superpowers/specs/2026-09-21-lista-piano-design.md`

## Global Constraints

- **Il database non cambia.** Nessuna migrazione. `generaListe`, `allineaTopUp`, `chiudiSpesa` e
  lo schema `shopping_list` / `shopping_list_item` non si toccano: la fusione è solo in lettura.
- **Nessun testo inventato.** Ogni stringa nuova è quella della spec §I; tutte le altre restano
  identiche a oggi, maiuscole comprese.
- **Colori dei testi:** gli errori a schermo in `--errore`, i testi che portano informazione in
  `--testo-2` (decisioni 1 e 7 del 17/09). Mai un alfa su `--ink` per un testo informativo.
- **Bersagli tappabili ≥ 44 px**, sempre, anche quando il disegno è più piccolo.
- **Animazioni solo dentro** `@media (prefers-reduced-motion: no-preference)`.
- **Niente misure dedotte.** Le geometrie (Dock che non copre, sfumatura, sei pallini) si
  verificano nel browser nel Task 7 e si riportano misurate. Un numero non misurato va scritto
  come `[ipotesi]`.
- **Stile inline** come nel resto del progetto, tranne le classi condivise in `globals.css`
  (precedente della fase 1: `.guscio`, `.barra`, `.scroll-app`).
- **Chi implementa committa**, con il messaggio già scritto in coda al suo task, e non tocca la
  storia oltre il proprio commit. Corretto il 21/09 prima dell'esecuzione: il primo giro di
  questo piano diceva che committava il coordinatore, ma la review di ogni task legge un
  intervallo `BASE..HEAD` di git — senza il commit dell'implementatore il diff da rivedere è
  vuoto e il cancello non c'è. Il coordinatore resta proprietario del messaggio, che è qui.
- Commenti, test e messaggi di commit in italiano.

## Struttura dei file

| File | Responsabilità | Task |
|---|---|---|
| `src/domain/settimana-label.ts` (nuovo) | `etichettaSettimana`, `parolaTemporale`: le due etichette testuali, pure | 1 |
| `src/data/lista.ts` (modifica) | `ordineAree` in `ListaSalvata`, `fondiSezioni`, `VoceFusa`, `SezioneFusa` | 1 |
| `src/components/dock-slot.tsx` (nuovo) | il contesto che porta il nodo dello slot dal `Guscio` al `Dock` | 2 |
| `src/components/Dock.tsx` (nuovo) | il contenitore flottante, montato nello slot con un portale | 2 |
| `src/components/Guscio.tsx` (modifica) | renderizza lo slot e lo pubblica | 2 |
| `src/app/globals.css` (modifica) | token del dock, `.dock`, `.dock-slot`, `.dock-primario`, `.con-dock` | 2 |
| `src/components/Tessera.tsx` (modifica) | l'accesa non protagonista perde fondo e ombra | 3 |
| `src/components/RigaControllo.tsx` (modifica) | sottoriga da `GIORNI_CONTROLLO_STAPLE`, senza `SCADUTO`, in `--testo-2` | 3 |
| `src/components/StrisciaGiorni.tsx` (modifica) | quattro stati con `inset`, `aria-label` completa | 3 |
| `src/app/(app)/lista/page.tsx` (modifica) | una lista sola, widget, Dock, stati vuoti | 4 |
| `src/app/(app)/piano/page.tsx` (modifica) | etichetta del giorno, pillola, Dock, errori nello scroller | 5 |
| `src/app/(app)/lista/fatta/page.tsx` (modifica) | la pillola usa il formatter condiviso | 6 |
| `src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx` (modifica) | l'ultima riga che nomina TOP-UP | 6 |
| `docs/superpowers/specs/DESIGN-SYSTEM.md` (modifica) | registro delle derive del codice, aggiornato | 6 |

Modelli suggeriti al dispatch: Task 1, 3 e 6 hanno il codice completo qui dentro (trascrizione +
test) → modello economico. Task 2 è un pezzo di architettura piccolo ma nuovo → modello medio.
Task 4 e 5 toccano file da 800 e 670 righe con test da 1255 e 908 → modello capace. Task 7 è
misura e giudizio → modello capace.

---

### Task 1: il dato e le etichette

**Files:**
- Create: `src/domain/settimana-label.ts`
- Create: `src/domain/__tests__/settimana-label.test.ts`
- Modify: `src/data/lista.ts` (interfaccia `ListaSalvata` a riga 33, `leggiListe` a riga 302)
- Test: `src/data/__tests__/lista.test.ts` (esiste: si aggiunge un `describe`)

**Interfaces:**
- Consuma: `ORDINE_AREE_DEFAULT` da `@/domain/aree`, `giorniTra` da `@/domain/date`,
  `VoceSalvata` / `SezioneSalvata` / `ListaSalvata` già in `src/data/lista.ts`.
- Produce: `etichettaSettimana(dataInizio: string): string`,
  `parolaTemporale(data: string, oggi: string): 'Ieri' | 'Oggi' | 'Domani' | null`,
  `fondiSezioni(lista: ListaSalvata): SezioneFusa[]`,
  `type VoceFusa = VoceSalvata & { listaId: string }`,
  `interface SezioneFusa { area: AreaId; voci: VoceFusa[]; controlli: VoceFusa[] }`,
  e il campo facoltativo `ordineAree?: AreaId[]` su `ListaSalvata`.

- [ ] **Step 1: il test delle etichette, prima del codice**

Crea `src/domain/__tests__/settimana-label.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { etichettaSettimana, parolaTemporale } from '../settimana-label';

describe('etichettaSettimana', () => {
  it('nomina il lunedì della settimana in parole', () => {
    expect(etichettaSettimana('2026-09-21')).toBe('Settimana del 21 settembre');
  });

  it('funziona il primo del mese', () => {
    expect(etichettaSettimana('2026-06-01')).toBe('Settimana del 1 giugno');
  });

  it('nomina il lunedì anche quando la settimana finisce nel mese dopo', () => {
    // 29 settembre → domenica 5 ottobre: l'etichetta non prova a dire due mesi.
    expect(etichettaSettimana('2026-09-29')).toBe('Settimana del 29 settembre');
  });

  it('con una data non valida non scrive "NaN": torna stringa vuota e la pillola non compare', () => {
    expect(etichettaSettimana('non-una-data')).toBe('');
  });
});

describe('parolaTemporale', () => {
  it('dice Oggi, Domani e Ieri', () => {
    expect(parolaTemporale('2026-09-17', '2026-09-17')).toBe('Oggi');
    expect(parolaTemporale('2026-09-18', '2026-09-17')).toBe('Domani');
    expect(parolaTemporale('2026-09-16', '2026-09-17')).toBe('Ieri');
  });

  it('tace sui giorni più lontani', () => {
    expect(parolaTemporale('2026-09-19', '2026-09-17')).toBeNull();
    expect(parolaTemporale('2026-09-15', '2026-09-17')).toBeNull();
  });
});
```

- [ ] **Step 2: lancia il test e verifica che fallisca**

Run: `npx vitest run src/domain/__tests__/settimana-label.test.ts`
Expected: FAIL, `Failed to resolve import "../settimana-label"`.

- [ ] **Step 3: scrivi `src/domain/settimana-label.ts`**

```ts
import { giorniTra } from './date';

const MESI_LUNGHI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

/**
 * "Settimana del 21 settembre" dal lunedì della settimana (ridisegno del
 * 19/09, spec fase 2 §H). Sostituisce il formato "31 AGO — 6 SET": nomina un
 * giorno solo, quindi non deve scrivere due mesi quando la settimana ne
 * attraversa due.
 *
 * Il testo si scrive in sentence case e lo rende maiuscolo la pillola
 * (`text-transform`), come vuole DESIGN.md §3.
 *
 * Data non valida: stringa vuota, non "NaN". Chi la usa passa il valore a
 * `Testata`, che senza `settimana` non disegna la pillola — meglio nessuna
 * pillola che una pillola che dice NaN.
 */
export function etichettaSettimana(dataInizio: string): string {
  const inizio = new Date(`${dataInizio}T00:00:00Z`);
  if (Number.isNaN(inizio.getTime())) return '';
  return `Settimana del ${inizio.getUTCDate()} ${MESI_LUNGHI[inizio.getUTCMonth()]}`;
}

/**
 * La parola che dice dov'è un giorno rispetto a oggi, o null per i giorni
 * lontani: solo ieri, oggi e domani hanno un nome proprio (nota "L'etichetta
 * del giorno" di `Piano - oggi e domani.html`). Entrambe le date sono ISO
 * `YYYY-MM-DD`.
 */
export function parolaTemporale(data: string, oggi: string): 'Ieri' | 'Oggi' | 'Domani' | null {
  const d = giorniTra(oggi, data);
  if (d === 0) return 'Oggi';
  if (d === 1) return 'Domani';
  if (d === -1) return 'Ieri';
  return null;
}
```

- [ ] **Step 4: lancia il test e verifica che passi**

Run: `npx vitest run src/domain/__tests__/settimana-label.test.ts`
Expected: PASS, 6 test.

Se `giorniTra` restituisse un segno opposto a quello atteso, **non cambiare `giorniTra`**: è usata
da `pantry.ts` e `scadenza.ts`. Adatta `parolaTemporale` e lascia una riga di commento sul verso.

- [ ] **Step 5: il test della fusione, prima del codice**

In `src/data/__tests__/lista.test.ts` aggiungi in coda. Se il file non espone già un costruttore
di voci, scrivilo lì dentro come segue (non importarlo da altrove).

```ts
import { fondiSezioni, type ListaSalvata, type SezioneSalvata, type VoceSalvata } from '../lista';

function voce(nome: string, area: VoceSalvata['area'], confezioni: number, extra: Partial<VoceSalvata> = {}): VoceSalvata {
  return {
    id: `item-${nome}`, ingredientId: `ing-${nome}`, nome, area, unita: 'g',
    fabbisogno: 100, residuo: 0, confezioni, quantitaTotale: 100 * confezioni,
    spuntato: false, origine: 'piano', mostraDettaglio: true, ...extra,
  };
}
function sezione(area: SezioneSalvata['area'], voci: VoceSalvata[], controlli: VoceSalvata[] = []): SezioneSalvata {
  return { area, voci, controlli };
}
function lista(p: Partial<ListaSalvata>): ListaSalvata {
  return { base: [], topup: [], baseListaId: 'lista-base', topupListaId: 'lista-topup', ...p };
}

describe('fondiSezioni', () => {
  it('mette nella stessa sezione le voci base e top-up della stessa area', () => {
    const fuse = fondiSezioni(lista({
      base: [sezione('ortofrutta', [voce('Patate', 'ortofrutta', 1)])],
      topup: [sezione('ortofrutta', [voce('Insalata', 'ortofrutta', 1)])],
      ordineAree: ['ortofrutta'],
    }));
    expect(fuse).toHaveLength(1);
    expect(fuse[0].voci.map((v) => v.nome)).toEqual(['Insalata', 'Patate']);
  });

  it('marca ogni voce con l\'id della lista da cui viene', () => {
    const fuse = fondiSezioni(lista({
      base: [sezione('cereali', [voce('Pasta', 'cereali', 1)])],
      topup: [sezione('cereali', [voce('Pane', 'cereali', 1)])],
      ordineAree: ['cereali'],
    }));
    const perNome = new Map(fuse[0].voci.map((v) => [v.nome, v.listaId]));
    expect(perNome.get('Pasta')).toBe('lista-base');
    expect(perNome.get('Pane')).toBe('lista-topup');
  });

  it('segue ordineAree, non la concatenazione delle due liste', () => {
    const fuse = fondiSezioni(lista({
      base: [sezione('ortofrutta', [voce('Patate', 'ortofrutta', 1)]), sezione('cereali', [voce('Pasta', 'cereali', 1)])],
      topup: [sezione('latticini', [voce('Ricotta', 'latticini', 1)])],
      ordineAree: ['ortofrutta', 'latticini', 'cereali'],
    }));
    expect(fuse.map((s) => s.area)).toEqual(['ortofrutta', 'latticini', 'cereali']);
  });

  it('senza ordineAree (istantanea offline vecchia) usa l\'ordine di default', () => {
    const senzaCampo = lista({ base: [sezione('cereali', [voce('Pasta', 'cereali', 1)])] });
    delete (senzaCampo as { ordineAree?: unknown }).ordineAree;
    expect(fondiSezioni(senzaCampo).map((s) => s.area)).toEqual(['cereali']);
  });

  it('riordina l\'unione per confezioni e poi per nome, non accoda una lista all\'altra', () => {
    const fuse = fondiSezioni(lista({
      base: [sezione('dispensa', [voce('Olio', 'dispensa', 1)])],
      topup: [sezione('dispensa', [voce('Tonno', 'dispensa', 3), voce('Aceto', 'dispensa', 1)])],
      ordineAree: ['dispensa'],
    }));
    expect(fuse[0].voci.map((v) => v.nome)).toEqual(['Tonno', 'Aceto', 'Olio']);
  });

  it('ordina i controlli per nome e li tiene separati dalle voci', () => {
    const fuse = fondiSezioni(lista({
      base: [sezione('dispensa', [], [voce('Sale', 'dispensa', 1, { origine: 'controllo' })])],
      topup: [sezione('dispensa', [], [voce('Farina', 'dispensa', 1, { origine: 'controllo' })])],
      ordineAree: ['dispensa'],
    }));
    expect(fuse[0].voci).toEqual([]);
    expect(fuse[0].controlli.map((c) => c.nome)).toEqual(['Farina', 'Sale']);
  });

  it('salta le aree senza niente', () => {
    const fuse = fondiSezioni(lista({
      base: [sezione('cereali', [voce('Pasta', 'cereali', 1)])],
      ordineAree: ['ortofrutta', 'cereali', 'latticini'],
    }));
    expect(fuse.map((s) => s.area)).toEqual(['cereali']);
  });

  it('scarta le voci di una lista senza id: non saprebbero dove scrivere la risposta', () => {
    const fuse = fondiSezioni(lista({
      base: [sezione('cereali', [voce('Pasta', 'cereali', 1)])],
      topup: [sezione('cereali', [voce('Pane', 'cereali', 1)])],
      topupListaId: null,
      ordineAree: ['cereali'],
    }));
    expect(fuse[0].voci.map((v) => v.nome)).toEqual(['Pasta']);
  });
});
```

- [ ] **Step 6: lancia il test e verifica che fallisca**

Run: `npx vitest run src/data/__tests__/lista.test.ts`
Expected: FAIL, `fondiSezioni is not a function` (o errore di tipo su `ordineAree`).

- [ ] **Step 7: aggiungi `ordineAree` a `ListaSalvata` e riempilo in `leggiListe`**

In `src/data/lista.ts`, dentro `interface ListaSalvata`, dopo `topupListaId`:

```ts
  /**
   * L'ordine dei reparti scelto dall'utente, come lo legge `leggiListe` dalle
   * impostazioni: serve a `fondiSezioni` per ordinare le aree della lista
   * unica. **Facoltativo di proposito**: un'istantanea offline salvata prima
   * della fase 2 non lo ha, e il tipo deve dire la verità su quel dato.
   */
  ordineAree?: AreaId[];
```

E nel `return` di `leggiListe` (riga ~325), aggiungi il campo:

```ts
  return {
    base: perTipo('base'), topup: perTipo('topup'),
    baseListaId: idPerTipo('base'), topupListaId: idPerTipo('topup'),
    ordineAree: impostazioni.ordineAree,
  };
```

- [ ] **Step 8: scrivi `fondiSezioni`**

In `src/data/lista.ts`, subito dopo `raggruppaInSezioni`. Aggiungi l'import di
`ORDINE_AREE_DEFAULT` da `@/domain/aree` in testa al file.

```ts
/** Una voce con l'id della lista da cui viene: `rispondiControllo` scrive su quella. */
export type VoceFusa = VoceSalvata & { listaId: string };

export interface SezioneFusa {
  area: AreaId;
  voci: VoceFusa[];
  controlli: VoceFusa[];
}

/**
 * Le due liste (base e top-up) lette come una sola, per reparto: è la
 * decisione del 20/09 (la lista è una, la distinzione secco/fresco resta nel
 * dominio per scadenze e decadimento, non in corsia).
 *
 * Fusione **solo in lettura**: `shopping_list` resta con le sue due righe per
 * settimana e nessuna scrittura cambia. Ogni voce porta il `listaId` della
 * lista da cui viene, perché `rispondiControllo` fa upsert su
 * (shopping_list_id, ingredient_id) e deve colpire quella giusta.
 *
 * Non si concatenano due elenchi già ordinati: si riordina l'unione, con lo
 * stesso criterio di `raggruppaInSezioni`. Concatenare darebbe, con ordine
 * [A, B, C] e base [A, C], topup [B], la sequenza A C B.
 */
export function fondiSezioni(lista: ListaSalvata): SezioneFusa[] {
  const ordine = lista.ordineAree ?? ORDINE_AREE_DEFAULT;

  // Una lista senza id non può ricevere risposte ai controlli: le sue voci si
  // scartano invece di mostrarle destinate al nulla. Non dovrebbe capitare
  // (generaListe crea sempre le due righe insieme), quindi si logga.
  const lati: Array<SezioneSalvata & { listaId: string }> = [];
  const aggiungi = (sezioni: SezioneSalvata[], listaId: string | null, tipo: string) => {
    if (listaId === null) {
      if (sezioni.length > 0) console.error(`lista: sezioni ${tipo} senza id di lista, scartate.`);
      return;
    }
    for (const s of sezioni) lati.push({ ...s, listaId });
  };
  aggiungi(lista.base, lista.baseListaId, 'base');
  aggiungi(lista.topup, lista.topupListaId, 'top-up');

  const out: SezioneFusa[] = [];
  for (const area of ordine) {
    const voci: VoceFusa[] = [];
    const controlli: VoceFusa[] = [];
    for (const s of lati) {
      if (s.area !== area) continue;
      for (const v of s.voci) voci.push({ ...v, listaId: s.listaId });
      for (const c of s.controlli) controlli.push({ ...c, listaId: s.listaId });
    }
    if (voci.length === 0 && controlli.length === 0) continue;
    voci.sort((a, b) => b.confezioni - a.confezioni || a.nome.localeCompare(b.nome, 'it'));
    controlli.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    out.push({ area, voci, controlli });
  }
  return out;
}
```

- [ ] **Step 9: lancia i test e verifica che passino**

Run: `npx vitest run src/data/__tests__/lista.test.ts src/domain/__tests__/settimana-label.test.ts`
Expected: PASS.

- [ ] **Step 10: la suite intera resta verde**

Run: `npm test -- --run` poi `npx tsc --noEmit` e `npm run lint`
Expected: 93 file verdi come oggi, nessun errore di tipo, lint pulito. `ordineAree` è
facoltativo, quindi nessun chiamante esistente si rompe.

- [ ] **Step 11: Commit (lo fa il coordinatore dopo la review)**

```
feat: fondiSezioni e le etichette della fase 2

La lista diventa una sola in lettura: fondiSezioni unisce base e top-up per
reparto marcando ogni voce con l'id della lista da cui viene, così
rispondiControllo continua a scrivere sulla riga giusta. Il database non
cambia. ordineAree arriva da leggiListe ed è facoltativo di proposito: le
istantanee offline salvate prima di oggi non lo hanno e ripiegano su
ORDINE_AREE_DEFAULT. etichettaSettimana e parolaTemporale sono le due
etichette testuali del ridisegno, pure e testate.
```

---

### Task 2: il Dock

**Files:**
- Create: `src/components/dock-slot.tsx`
- Create: `src/components/Dock.tsx`
- Create: `src/components/__tests__/dock.test.tsx`
- Modify: `src/components/Guscio.tsx` (il `return`, righe 53-60)
- Modify: `src/app/globals.css` (token in `:root`, classi dopo `.coda-barra`)

**Interfaces:**
- Consuma: `MarchioProvider` e `TabBar` già montati in `Guscio`.
- Produce: `<Dock>{children}</Dock>`, `SlotDockProvider`, `useSlotDock()`, e le classi
  `.dock`, `.dock-slot`, `.dock-primario`, `.scroll-app.con-dock`.

- [ ] **Step 1: il contesto dello slot**

Crea `src/components/dock-slot.tsx`:

```tsx
'use client';

import { createContext, useContext, type ReactNode } from 'react';

const Slot = createContext<HTMLElement | null>(null);

/** Pubblica il nodo in cui il Dock si monta: lo renderizza `Guscio`, accanto alla tab bar. */
export function SlotDockProvider({ slot, children }: { slot: HTMLElement | null; children: ReactNode }) {
  return <Slot.Provider value={slot}>{children}</Slot.Provider>;
}

/** null finché il nodo non è montato: `Dock` in quel caso non renderizza nulla. */
export function useSlotDock(): HTMLElement | null {
  return useContext(Slot);
}
```

- [ ] **Step 2: il test del Dock, prima del componente**

Crea `src/components/__tests__/dock.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dock } from '../Dock';
import { SlotDockProvider } from '../dock-slot';

describe('Dock', () => {
  it('senza slot non renderizza niente', () => {
    const { container } = render(
      <SlotDockProvider slot={null}>
        <Dock><button type="button">HAI PRESO TUTTO</button></Dock>
      </SlotDockProvider>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: 'HAI PRESO TUTTO' })).not.toBeInTheDocument();
  });

  it('con lo slot monta il contenuto dentro lo slot, non dov\'è scritto', () => {
    const slot = document.createElement('div');
    document.body.appendChild(slot);
    const { container } = render(
      <SlotDockProvider slot={slot}>
        <Dock><button type="button">HAI PRESO TUTTO</button></Dock>
      </SlotDockProvider>,
    );
    expect(container).toBeEmptyDOMElement();
    const tasto = screen.getByRole('button', { name: 'HAI PRESO TUTTO' });
    expect(slot.contains(tasto)).toBe(true);
    expect(slot.querySelector('.dock')).not.toBeNull();
    slot.remove();
  });
});
```

- [ ] **Step 3: lancia il test e verifica che fallisca**

Run: `npx vitest run src/components/__tests__/dock.test.tsx`
Expected: FAIL, `Failed to resolve import "../Dock"`.

- [ ] **Step 4: scrivi `src/components/Dock.tsx`**

```tsx
'use client';

import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { useSlotDock } from './dock-slot';

/**
 * Il posto dell'azione principale: una pillola bianca a portata di pollice
 * sopra la tab bar, che scende con lei quando la barra si restringe
 * (DESIGN.md §8 Dock, una riga sola dal 20/09).
 *
 * Si monta con un portale in uno slot del `Guscio`, non dove è scritto nella
 * pagina. Le pagine stanno dentro `<main className="guscio-main">`, che
 * scorre: un figlio assoluto dentro un contenitore che scorre è la
 * situazione in cui iOS lo taglia o lo trascina. Nello slot il Dock è
 * fratello della tab bar e la domanda non si pone.
 *
 * Finché lo slot non c'è (primo render, prima che il ref si attacchi) non
 * renderizza: nessuna delle schermate mostra il Dock prima che i dati
 * arrivino, quindi non si vede nessun salto.
 */
export function Dock({ children }: { children: ReactNode }) {
  const slot = useSlotDock();
  if (slot === null) return null;
  return createPortal(<div className="dock anim-dock">{children}</div>, slot);
}
```

- [ ] **Step 5: lancia il test e verifica che passi**

Run: `npx vitest run src/components/__tests__/dock.test.tsx`
Expected: PASS, 2 test.

- [ ] **Step 6: `Guscio` renderizza e pubblica lo slot**

In `src/components/Guscio.tsx`: aggiungi `SlotDockProvider` agli import, uno stato per il nodo, e
sostituisci il `return`.

```tsx
import { SlotDockProvider } from './dock-slot';
```

Dentro il componente, accanto agli altri hook:

```tsx
  // Il nodo dello slot va in stato, non in un ref: il contesto deve
  // ri-renderizzare i figli quando il nodo si attacca, e un ref non lo fa.
  // Il callback del ref è il setter: React lo chiama col nodo al mount.
  const [slotDock, setSlotDock] = useState<HTMLDivElement | null>(null);
```

E il `return`:

```tsx
  return (
    <MarchioProvider>
      <div className="guscio" data-barra={barra}>
        <SlotDockProvider slot={slotDock}>
          <main className="guscio-main">{children}</main>
        </SlotDockProvider>
        {/* Lo slot copre la cornice ma non intercetta niente: `pointer-events: none`
            sul contenitore, `auto` su quello che il Dock ci mette dentro. Senza,
            un velo invisibile mangerebbe lo scorrimento di tutta l'app. */}
        <div className="dock-slot" ref={setSlotDock} />
        <TabBar />
      </div>
    </MarchioProvider>
  );
```

- [ ] **Step 7: token e classi in `src/app/globals.css`**

In `:root`, dopo il blocco `--fine` / `--coda`:

```css
  /* Il Dock (spec fase 2 §A): una riga sola, 8 + 54 + 8 = 70 di altezza. */
  --dock-lato: 16px;
  --dock-fondo: 114px;      /* 84 di barra + 22 dal fondo + 8 di respiro */
  --dock-fondo-giu: 96px;   /* 66 + 22 + 8 */
  --dock-padding: 8px;
  --dock-respiro: 8px;
  --dock-primario: 54px;
  --coda-dock: 194px;       /* 70 di dock + 114 dal fondo + 10 */
  --coda-dock-giu: 176px;   /* 70 + 96 + 10 */
```

Dopo le regole di `.coda-barra`:

```css
/* ---------- Dock (spec fase 2 §A) ---------- */
/* Il contenitore dello slot copre la cornice per dare al Dock il suo sistema di
   coordinate, ma è trasparente ai tocchi: solo il Dock che ci sta dentro li prende. */
.dock-slot { position: absolute; inset: 0; pointer-events: none; z-index: 19; }
.dock-slot > * { pointer-events: auto; }

.dock {
  position: absolute; left: var(--dock-lato); right: var(--dock-lato); bottom: var(--dock-fondo);
  background: var(--superficie); border-radius: 999px; box-shadow: var(--ombra-nav);
  padding: var(--dock-padding); display: flex; gap: var(--dock-respiro);
}
.guscio[data-barra="ridotta"] .dock { bottom: var(--dock-fondo-giu); }

/* Il primario del Dock: una classe e non quattro copie di stile inline, perché i
   chiamanti sono un <Link> in Lista e un <button> in Piano e devono essere identici. */
.dock-primario {
  flex: 1; height: var(--dock-primario); border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 12px; font-weight: 700; letter-spacing: 0.09em;
  background: var(--ink); color: var(--superficie); box-shadow: var(--ombra-tasto);
  text-decoration: none;
}
/* Stato spento del sistema (DESIGN.md §8 Tasti), non un'opacità: con opacity il
   testo bianco scende sotto soglia di contrasto. */
.dock-primario:disabled { background: rgba(20, 22, 58, 0.10); color: var(--ter); box-shadow: none; }

/* Lo scroller di una pagina che ha il Dock: il contenuto gli passa dietro, la coda
   tiene l'ultima voce sopra di lui. */
.scroll-app.con-dock { --coda: var(--coda-dock); }
.guscio[data-barra="ridotta"] .scroll-app.con-dock { --coda: var(--coda-dock-giu); }

@media (prefers-reduced-motion: no-preference) {
  .anim-dock { transition: bottom var(--moto-barra) var(--curva-barra); }
}
```

- [ ] **Step 8: il test del guscio resta verde e lo slot c'è**

In `src/components/__tests__/guscio.test.tsx` aggiungi un caso:

```tsx
  it('renderizza lo slot del dock accanto alla tab bar', () => {
    const { container } = render(<Guscio><div /></Guscio>);
    const slot = container.querySelector('.dock-slot');
    expect(slot).not.toBeNull();
    expect(slot?.nextElementSibling?.tagName).toBe('NAV');
  });
```

Run: `npx vitest run src/components/__tests__/guscio.test.tsx src/components/__tests__/dock.test.tsx`
Expected: PASS.

- [ ] **Step 9: suite, tipi, lint**

Run: `npm test -- --run` poi `npx tsc --noEmit` e `npm run lint`
Expected: tutto verde. Nessuna pagina usa ancora il Dock: questo task non cambia niente a schermo.

- [ ] **Step 10: Commit (lo fa il coordinatore dopo la review)**

```
feat: il Dock, contenitore condiviso dell'azione principale

Una pillola bianca sopra la tab bar che scende con lei: è il posto del tasto
primario ora che il fondo schermo è occupato dalla barra flottante. Si monta
con createPortal in uno slot del Guscio invece di stare dentro lo scroller
della pagina, dove iOS taglia i figli assoluti. Lo slot copre la cornice ma è
trasparente ai tocchi, altrimenti mangerebbe lo scorrimento dell'app.
Nessuna pagina lo usa ancora: a schermo non cambia niente.
```

---

### Task 3: i tre componenti

**Files:**
- Modify: `src/components/Tessera.tsx` (il ramo `else` a riga 79-85, `borderRadius` a riga 107)
- Modify: `src/components/RigaControllo.tsx` (riga 64-77)
- Modify: `src/components/StrisciaGiorni.tsx` (tutto il corpo del `map`)
- Test: `src/components/__tests__/striscia-giorni.test.tsx` (esiste),
  `src/components/__tests__/riga-controllo.test.tsx` (**da creare**),
  `src/components/__tests__/tessera.test.tsx` (**da creare**)

**Interfaces:**
- Consuma: `parolaTemporale` da `@/domain/settimana-label` (Task 1),
  `GIORNI_CONTROLLO_STAPLE` da `@/domain/pantry`.
- Produce: nessuna firma nuova. `StrisciaGiorni` mantiene esattamente i suoi sei prop.

- [ ] **Step 1: il test di `Tessera`**

Crea `src/components/__tests__/tessera.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tessera } from '../Tessera';

const base = {
  nome: 'Zucchine', area: 'ortofrutta' as const, unita: 'g' as const,
  fabbisogno: 540, residuo: 0, confezioni: 1, quantitaTotale: 600,
  mostraDettaglio: true, onToggle: vi.fn(),
};

describe('Tessera', () => {
  it('accesa dentro il widget: nessun fondo bianco, nessuna ombra, solo il filo d\'area', () => {
    render(<Tessera {...base} spuntato={false} protagonista={false} />);
    const t = screen.getByRole('button');
    expect(t.style.background).toBe('none');
    expect(t.style.boxShadow).toBe('');
    expect(t.style.border).toContain('rgba(168, 217, 106, 0.45)');
  });

  it('protagonista: fondo pieno nel colore d\'area', () => {
    render(<Tessera {...base} spuntato={false} protagonista />);
    expect(screen.getByRole('button').style.background).toBe('rgb(168, 217, 106)');
  });

  it('spenta: fondo --spento e nome barrato', () => {
    render(<Tessera {...base} spuntato protagonista={false} />);
    const t = screen.getByRole('button');
    expect(t.style.background).toBe('rgba(20, 22, 58, 0.035)');
    expect(screen.getByText('Zucchine')).toHaveStyle({ textDecoration: 'line-through' });
  });
});
```

- [ ] **Step 2: lancialo e guarda fallire il primo caso**

Run: `npx vitest run src/components/__tests__/tessera.test.tsx`
Expected: FAIL sul primo caso (`background` è `rgb(255, 255, 255)`), gli altri due PASS.

- [ ] **Step 3: modifica `Tessera.tsx`**

Nel ramo `else` (accesa non protagonista):

```ts
  } else {
    // Dentro la Tessera widget di sezione la tessera accesa non ha bisogno di un
    // secondo fondo bianco sul bianco: la tiene il filo nel colore d'area
    // (variante 1 del foglio a cinque versioni, decisa il 19/09).
    background = 'none';
    border = `1px solid ${rgba(colore, 0.45)}`;
    boxShadow = undefined;
    nameColor = INK; qtyColor = MUT;
    pillBg = rgba(colore, 0.32); pillTxt = INK;
  }
```

E nello `style` del `<button>`, il raggio della non protagonista passa da 15 a 14:

```ts
        borderRadius: protagonista ? 18 : 14,
```

- [ ] **Step 4: verifica**

Run: `npx vitest run src/components/__tests__/tessera.test.tsx`
Expected: PASS, 3 test.

- [ ] **Step 5: il test di `RigaControllo`**

Crea `src/components/__tests__/riga-controllo.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RigaControllo } from '../RigaControllo';
import { GIORNI_CONTROLLO_STAPLE } from '@/domain/pantry';

describe('RigaControllo', () => {
  it('la sottoriga riporta la cadenza vera e non dice più SCADUTO', () => {
    render(<RigaControllo nome="farina" area="cereali" onSi={vi.fn()} onNo={vi.fn()} />);
    expect(screen.getByText(`CONTROLLO OGNI ${GIORNI_CONTROLLO_STAPLE} GIORNI`)).toBeInTheDocument();
    expect(screen.queryByText(/SCADUTO/)).not.toBeInTheDocument();
  });

  it('le pillole restano SÌ e NO, coi loro nomi accessibili', () => {
    render(<RigaControllo nome="farina" area="cereali" onSi={vi.fn()} onNo={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Sì, hai ancora farina' })).toHaveTextContent('SÌ');
    expect(screen.getByRole('button', { name: 'No, comprane una confezione di farina' })).toHaveTextContent('NO');
  });
});
```

- [ ] **Step 6: lancialo e guarda fallire il primo caso**

Run: `npx vitest run src/components/__tests__/riga-controllo.test.tsx`
Expected: FAIL sul primo caso (il testo è `CONTROLLO OGNI 90 GIORNI · SCADUTO`).

- [ ] **Step 7: modifica `RigaControllo.tsx`**

Aggiungi l'import:

```ts
import { GIORNI_CONTROLLO_STAPLE } from '@/domain/pantry';
```

Nel contenitore, togli il margine (lo dà ora il gap del widget che la contiene):

```ts
        margin: 0, padding: '14px 15px', borderRadius: 18,
```

E la sottoriga:

```tsx
        {/* La riga esiste solo quando il controllo è scaduto: dirlo di nuovo era
            ridondante. Il numero viene dalla costante del dominio, non riscritto qui. */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.11em', color: 'var(--testo-2)', marginTop: 4 }}>
          {`CONTROLLO OGNI ${GIORNI_CONTROLLO_STAPLE} GIORNI`}
        </div>
```

- [ ] **Step 8: verifica**

Run: `npx vitest run src/components/__tests__/riga-controllo.test.tsx`
Expected: PASS, 2 test.

- [ ] **Step 9: il test della striscia**

In `src/components/__tests__/striscia-giorni.test.tsx` aggiungi un `describe` (non toccare i casi
esistenti finché non falliscono; se un caso esistente asserisce il bordo 3 px di oggi, aggiornalo
in questo step e scrivilo nel rapporto):

```tsx
  describe('i quattro stati e l\'etichetta (fase 2)', () => {
    it('tutte e sette le celle hanno lo stesso bordo: lo stato non cambia l\'ingombro', () => {
      render(<StrisciaGiorni {...props} />);
      const bordi = screen.getAllByRole('button').map((b) => b.style.border);
      expect(new Set(bordi).size).toBe(1);
    });

    it('oggi porta un inset 3px anche quando il giorno scelto è un altro', () => {
      render(<StrisciaGiorni {...props} selezionato={0} />);
      const celle = screen.getAllByRole('button');
      const cellaOggi = celle.find((c) => c.dataset.oggi === 'true')!;
      expect(cellaOggi.style.boxShadow).toContain('inset 0 0 0 3px');
    });

    it('oggi e selezionato insieme: fondo pieno più i due inset', () => {
      const iOggi = props.giorni.indexOf(props.oggi);
      render(<StrisciaGiorni {...props} selezionato={iOggi} />);
      const cella = screen.getAllByRole('button')[iOggi];
      expect(cella.style.boxShadow).toContain('inset 0 0 0 3px #FFFFFF');
      expect(cella.style.boxShadow).toContain('inset 0 0 0 4.5px');
    });

    it('l\'etichetta dice giorno, parola temporale, pasti a casa e selezione', () => {
      const iOggi = props.giorni.indexOf(props.oggi);
      render(<StrisciaGiorni {...props} selezionato={iOggi} />);
      // Il numero di pasti a casa dipende dalle fixture del file: si asserisce la forma.
      expect(screen.getAllByRole('button')[iOggi].getAttribute('aria-label'))
        .toMatch(/^\w+ \d+, oggi, \d+ past[oi] a casa, selezionato$/);
    });

    it('i giorni lontani non hanno la parola temporale', () => {
      render(<StrisciaGiorni {...props} />);
      const lontani = screen.getAllByRole('button')
        .filter((b) => b.dataset.oggi !== 'true')
        .map((b) => b.getAttribute('aria-label') ?? '');
      expect(lontani.some((l) => /, (oggi|ieri|domani),/.test(l))).toBe(false);
    });

    it('con sei pasti disegna sei pallini per cella', () => {
      const sei = Array.from({ length: 6 }, (_, i) => ({ id: `def-${i}`, nome: `Pasto ${i}`, posizione: i }));
      render(<StrisciaGiorni {...props} slotDefs={sei as typeof props.slotDefs} />);
      expect(screen.getAllByRole('button')[0].querySelectorAll('[data-pallino]')).toHaveLength(6);
    });
  });
```

`props` è l'oggetto di prop che il file già costruisce per i suoi casi; se non esiste una
costante riutilizzabile, estraila in cima al file senza cambiare i casi esistenti. Il caso dei sei
pallini richiede l'attributo `data-pallino` sui pallini: si aggiunge nello step seguente.

- [ ] **Step 10: lancialo e guarda fallire**

Run: `npx vitest run src/components/__tests__/striscia-giorni.test.tsx`
Expected: FAIL sui casi nuovi (bordi diversi, nessun `boxShadow` con inset, `aria-label` corta,
nessun `data-pallino`).

- [ ] **Step 11: riscrivi il corpo di `StrisciaGiorni.tsx`**

Import in testa:

```ts
import { parolaTemporale } from '@/domain/settimana-label';
```

Il commento del prop `slotDefs` passa a **«Da 3 a 6, ordinati per posizione»** (decisione 4 del
20/09). Dentro il `map`, prima del `return`:

```tsx
        const sel = indice === selezionato;
        const isOggi = data === oggi;
        const numero = String(Number(data.slice(8, 10)));
        const quando = parolaTemporale(data, oggi);
        const aCasa = slotDefs.filter((def) => {
          const slot = slots.find((s) => s.data === data && s.slotDefId === def.id);
          return !!slot && slot.stato === 'casa' && slot.dishId !== null;
        }).length;
        // "Venerdì 18, domani, 3 pasti a casa, selezionato": la stessa frase
        // dell'etichetta sotto la striscia, così chi legge con lo schermo
        // sente quello che gli altri vedono.
        const etichetta = [
          `${NOME_GIORNO[indice]} ${numero}`,
          quando ? quando.toLowerCase() : null,
          `${aCasa} ${aCasa === 1 ? 'pasto' : 'pasti'} a casa`,
          sel ? 'selezionato' : null,
        ].filter(Boolean).join(', ');

        // I quattro stati stanno tutti nel box-shadow, mai nel bordo: "oggi" come
        // bordo 3 px rimpiccioliva la cella dentro e i due stati insieme non
        // avevano forma. Con gli inset le sette celle restano identiche.
        const ombra = sel
          ? (isOggi
            ? '0 2px 6px rgba(20,22,58,0.20), inset 0 0 0 3px #FFFFFF, inset 0 0 0 4.5px #14163A'
            : '0 2px 6px rgba(20,22,58,0.20)')
          : (isOggi
            ? 'var(--ombra-pannello), inset 0 0 0 3px #14163A'
            : 'var(--ombra-pannello)');
```

Lo `style` del `<button>`:

```tsx
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              padding: '9px 0 10px',
              borderRadius: 14,
              border: 0,
              background: sel ? '#14163A' : '#FFFFFF',
              boxShadow: ombra,
            }}
```

`aria-label={etichetta}` al posto di quello di oggi. Il contenitore dei pallini passa a
`gap: 3` senza `marginTop` (lo dà il `gap: 5` della colonna) e ogni pallino prende
`data-pallino`:

```tsx
            <div style={{ display: 'flex', gap: 3 }}>
              {slotDefs.map((def) => {
                const slot = slots.find((s) => s.data === data && s.slotDefId === def.id);
                const pieno = !!slot && slot.stato === 'casa' && slot.dishId !== null;
                return (
                  <span
                    key={def.id}
                    data-pallino
                    style={{
                      width: 5, height: 5, borderRadius: 999, display: 'inline-block',
                      background: pieno
                        ? (sel ? '#FFFFFF' : '#14163A')
                        : (sel ? 'rgba(255,255,255,0.32)' : 'rgba(20,22,58,0.18)'),
                    }}
                  />
                );
              })}
            </div>
```

Sigla e numero non cambiano, tranne che la sigla resta `var(--ter)` e su cella selezionata
`rgba(255,255,255,0.62)` come oggi.

- [ ] **Step 12: verifica**

Run: `npx vitest run src/components/__tests__/striscia-giorni.test.tsx`
Expected: PASS. Se un caso preesistente asseriva il bordo, l'aggiornamento va nel rapporto con la
riga esatta.

- [ ] **Step 13: suite, tipi, lint**

Run: `npm test -- --run` poi `npx tsc --noEmit` e `npm run lint`
Expected: verde. Attenzione: i test di pagina di Lista e Piano possono cadere qui se asserivano
lo stile della tessera o il bordo della cella — in quel caso **non aggiustarli**: annotali nel
rapporto, sono materia dei Task 4 e 5.

- [ ] **Step 14: Commit (lo fa il coordinatore dopo la review)**

```
feat: tessera nuda nel widget, cadenza vera nel controllo, quattro stati nella striscia

Tessera: l'accesa non protagonista perde fondo bianco e ombra e resta tenuta
dal filo d'area al 45%, come vuole la variante 1 del widget di sezione.
RigaControllo: la sottoriga prende il numero da GIORNI_CONTROLLO_STAPLE
invece di riscriverlo, non dice più SCADUTO (la riga esiste solo se lo è) e
passa a --testo-2. Il mockup diceva "ogni 4 settimane": la cadenza vera è 90
giorni e vince il codice.
StrisciaGiorni: i quattro stati stanno nel box-shadow con gli inset, così le
sette celle hanno lo stesso ingombro e "oggi" e "selezionato" convivono.
L'aria-label dice giorno, parola temporale, pasti a casa e selezione.
```

---

### Task 4: la Lista

**Files:**
- Modify: `src/app/(app)/lista/page.tsx`
- Test: `src/app/(app)/lista/__tests__/page.test.tsx` (1255 righe: si aggiorna, non si riscrive)

**Interfaces:**
- Consuma: `fondiSezioni`, `SezioneFusa`, `VoceFusa` da `@/data/lista` (Task 1);
  `etichettaSettimana` da `@/domain/settimana-label` (Task 1); `Dock` da `@/components/Dock`
  (Task 2); `Tessera` e `RigaControllo` modificate (Task 3).
- Produce: nessuna firma pubblica.

- [ ] **Step 1: il censimento dei test da aggiornare**

Prima di toccare il codice, scrivi nel rapporto l'elenco esatto, con numero di riga, di ogni test
che asserisce qualcosa che sta per cambiare. Comando:

```bash
grep -n "TOP-UP\|'BASE'\|DA PRENDERE\|La spesa grossa\|Il fresco, e quello\|VAI ALLA SETTIMANA\|AGO — " "src/app/(app)/lista/__tests__/page.test.tsx"
```

Già noti (21/09): riga 116 e 752 (`24 AGO — 30 AGO` nella pillola), 223-228 (il tab TOP-UP mostra
le sue sezioni), 246 (nomi accessibili dei due pulsanti col conteggio), 333/358/376/387
(`VAI ALLA SETTIMANA`), 632 e 742 (`settimanaLabel` nell'istantanea), 716 (la riga offline che
nomina la settimana). Il censimento va rifatto e non copiato: il file può essere cambiato.

- [ ] **Step 2: togli il selettore e la fusione entra**

Cancella da `page.tsx`: `SPIEGA_TAB` (righe 33-36), `formattaPillola` con il suo `MESI`
(righe 27-44 nella parte del formatter), `tally` (righe 47-58), il componente `SelettoreTab`
(righe 736-790), lo stato `const [tab, setTab] = useState<'base' | 'topup'>('base')` (riga 227).

Aggiungi gli import:

```ts
import { leggiListe, spunta, allineaTopUp, fondiSezioni, type ListaSalvata, type SezioneFusa, type VoceFusa } from '@/data/lista';
import { etichettaSettimana } from '@/domain/settimana-label';
import { Dock } from '@/components/Dock';
```

`SezioneSalvata` e `VoceSalvata` restano importati dove ancora servono (`tuttoFatto`,
`areeMancanti`, `conSpuntaLocale`). La chiamata a riga 296 diventa:

```ts
        const label = etichettaSettimana(settimana.dataInizio);
```

e lo stesso per `settimanaLabelVuoto`, dove oggi chiama `formattaPillola`.

- [ ] **Step 3: il corpo del render**

Sostituisci il blocco da `const { lista } = stato;` fino alla fine del `return` principale con:

```tsx
  const { lista } = stato;
  const sezioni = fondiSezioni(lista);
  // Un solo booleano decide due cose che non possono divergere: se il Dock
  // c'è, e se lo scroller deve lasciargli la coda.
  const finito = tuttoFatto(lista);

  return (
    <Cornice titolo="Lista" settimana={stato.settimanaLabel} aree={areeMancanti(lista)}>
      <div
        className={`sc scroll-app${finito ? ' con-dock' : ''}`}
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px 4px 14px', display: 'flex', flexDirection: 'column' }}
      >
        {stato.offline && (
          <p style={{ margin: '0 16px 12px', fontSize: 12.5, lineHeight: 1.4, color: 'var(--sec)' }}>
            {`Sei offline: questa è la lista di ${stato.settimanaLabel} salvata l'ultima volta che l'hai aperta. Le spunte si sincronizzano appena torna la rete.`}
          </p>
        )}
        {erroreAzione && (
          <p style={{ margin: '0 16px 12px', fontSize: 12.5, color: 'var(--errore)' }}>{erroreAzione}</p>
        )}
        {sezioni.length === 0 && (
          <p style={{ margin: '20px 16px', fontSize: 14, color: 'var(--sec)', textAlign: 'center' }}>
            Niente da comprare qui.
          </p>
        )}
        {sezioni.map((sezione) => (
          <CartaSezione
            key={sezione.area}
            sezione={sezione}
            rigaInVolo={rigaInVolo}
            onToggleVoce={toggleVoce}
            onSi={(c) => rispondi(c, c.listaId, true)}
            onNo={(c) => rispondi(c, c.listaId, false)}
          />
        ))}
      </div>

      {finito && (
        <Dock>
          <Link href="/lista/fatta" className="dock-primario">HAI PRESO TUTTO</Link>
        </Dock>
      )}
    </Cornice>
  );
```

Il padding dello scroller passa da `6px 16px 14px` a `6px 4px 14px`: i 12 px di margine del
widget danno i 16 finali dal bordo della cornice. La riga offline e quella d'errore recuperano i
16 con un margine proprio.

- [ ] **Step 4: `CartaSezione` diventa il widget**

```tsx
function CartaSezione({
  sezione, rigaInVolo, onToggleVoce, onSi, onNo,
}: {
  sezione: SezioneFusa;
  rigaInVolo: string | null;
  onToggleVoce: (v: VoceFusa) => void;
  onSi: (c: VoceFusa) => void;
  onNo: (c: VoceFusa) => void;
}) {
  return (
    // flexShrink: 0 non è cosmetico. La carta sta in un contenitore flex in
    // colonna, e i figli flex si comprimono quando lo spazio non basta:
    // sommato a overflow hidden, il risultato è una tessera tagliata a metà
    // invece di una lista che scorre.
    <div
      style={{
        margin: '0 12px 12px', background: '#FFFFFF', borderRadius: 22,
        border: '1px solid var(--bordo)', boxShadow: 'var(--ombra-pannello)',
        padding: '14px 12px 12px', display: 'flex', flexDirection: 'column', gap: 12,
        overflow: 'hidden', flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: 4, flex: 'none', background: coloreArea(sezione.area), display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: INK }}>
            {nomeArea(sezione.area)}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', color: MUT }}>
          {sezione.voci.length} {sezione.voci.length === 1 ? 'VOCE' : 'VOCI'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {ordinaPerCarrello(sezione.voci).map((v, i) => (
          <Tessera
            key={v.id}
            nome={v.nome}
            area={v.area}
            unita={v.unita}
            fabbisogno={v.fabbisogno}
            residuo={v.residuo}
            confezioni={v.confezioni}
            quantitaTotale={v.quantitaTotale}
            spuntato={v.spuntato}
            mostraDettaglio={v.mostraDettaglio}
            // Grande a piena larghezza solo se è la prossima da prendere.
            protagonista={i === 0 && !v.spuntato}
            onToggle={() => onToggleVoce(v)}
          />
        ))}
      </div>
      {sezione.controlli.map((c) => (
        <RigaControllo
          key={c.id}
          nome={c.nome}
          area={c.area}
          onSi={() => onSi(c)}
          onNo={() => onNo(c)}
          disabilitato={rigaInVolo === c.id}
        />
      ))}
    </div>
  );
}
```

`ordinaPerCarrello` diventa generico sul tipo di voce, così accetta `VoceFusa[]` e restituisce lo
stesso tipo:

```ts
function ordinaPerCarrello<T extends { spuntato: boolean }>(voci: T[]): T[] {
  return [...voci].sort((a, b) => Number(a.spuntato) - Number(b.spuntato));
}
```

- [ ] **Step 5: gli stati vuoti mettono il primario nel Dock**

Nel ramo `nonTrovata`, `VAI ALLA SETTIMANA` diventa `VAI AL PIANO` (l'href è già `/piano`), la
scheda resta nello scroller e il tasto passa nel Dock:

```tsx
    return (
      <Cornice titolo="Lista" settimana={settimanaLabelVuoto} aree={[]}>
        <div className="sc scroll-app con-dock" style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* la scheda resta identica a oggi */}
        </div>
        <Dock>
          <Link href={vuoto.href} className="dock-primario">{vuoto.bottone}</Link>
        </Dock>
      </Cornice>
    );
```

Il ramo `erroreCaricamento` passa il testo a `color: 'var(--errore)'` e non ha Dock.

- [ ] **Step 6: `rispondi` prende il `listaId` dalla voce**

La firma diventa `async function rispondi(controllo: VoceFusa, listaId: string, ancora: boolean)`
— non più `string | null`, perché `fondiSezioni` scarta le voci senza id. Se il corpo conteneva
una guardia `if (listaId === null) return`, va via e con lei il suo commento; se quella guardia
mostrava un errore all'utente, il caso non è più raggiungibile e il rapporto lo dice.

- [ ] **Step 7: aggiorna i test di pagina censiti**

Regole, una per riga cambiata:

- `24 AGO — 30 AGO` → `Settimana del 24 agosto` (le fixture usano la settimana del 24/08/2026).
- Il caso «il tab TOP-UP mostra le sue sezioni, non quelle di BASE» si **riscrive** come «le voci
  base e top-up della stessa area stanno nella stessa sezione», senza click.
- Il caso «i pulsanti BASE e TOP-UP hanno un nome accessibile col conteggio» si **cancella**: i
  pulsanti non esistono più. Cancellarlo è la scelta giusta solo perché nessun'altra asserzione
  del file copre il conteggio globale, che il ridisegno toglie; scrivilo nel rapporto.
- `VAI ALLA SETTIMANA` → `VAI AL PIANO`, quattro occorrenze.
- Dove un test cercava il tasto `HAI PRESO TUTTO` in coda al contenuto, ora lo cerca comunque per
  `getByRole('link', { name: 'HAI PRESO TUTTO' })`: il portale lo monta in `document.body` del
  test, che Testing Library interroga già.

Casi **nuovi** da aggiungere:

```tsx
  it('a lista non finita il Dock non c\'è e lo scroller non tiene la coda del dock', async () => {
    // fixture: una voce non spuntata
    await schermo();
    expect(screen.queryByRole('link', { name: 'HAI PRESO TUTTO' })).not.toBeInTheDocument();
    expect(document.querySelector('.scroll-app.con-dock')).toBeNull();
  });

  it('con tutte le voci spuntate il Dock compare', async () => {
    await schermo(/* tutte spuntate */);
    expect(await screen.findByRole('link', { name: 'HAI PRESO TUTTO' })).toHaveAttribute('href', '/lista/fatta');
    expect(document.querySelector('.scroll-app.con-dock')).not.toBeNull();
  });

  it('con un controllo ancora in sospeso il Dock non compare, anche se ogni voce è spuntata', async () => {
    await schermo(/* voci spuntate + un controllo */);
    expect(screen.queryByRole('link', { name: 'HAI PRESO TUTTO' })).not.toBeInTheDocument();
  });

  it('risponde a un controllo che vive nella lista top-up scrivendo sull\'id giusto', async () => {
    await schermo(/* controllo solo in topup */);
    fireEvent.click(screen.getByRole('button', { name: /^Sì, hai ancora/ }));
    expect(rispondiControllo).toHaveBeenCalledWith(expect.any(String), 'lista-topup', true);
  });

  it('non mostra più il selettore né le righe di spiegazione della vista', async () => {
    await schermo();
    expect(screen.queryByText('TOP-UP')).not.toBeInTheDocument();
    expect(screen.queryByText(/La spesa grossa/)).not.toBeInTheDocument();
  });
```

`schermo()` è l'helper di montaggio che il file già usa; adattane il nome a quello vero.

- [ ] **Step 8: verifica**

Run: `npx vitest run "src/app/(app)/lista/__tests__/page.test.tsx"`
Expected: PASS, con il numero di test dichiarato nel rapporto insieme a quanti sono stati
aggiunti, cambiati e cancellati.

- [ ] **Step 9: suite, tipi, lint**

Run: `npm test -- --run` poi `npx tsc --noEmit` e `npm run lint`
Expected: verde.

- [ ] **Step 10: Commit (lo fa il coordinatore dopo la review)**

```
feat: la Lista è una sola, per reparto, col primario nel Dock

Via il selettore BASE / TOP-UP e le sue due righe di spiegazione: le voci
delle due liste stanno nella stessa sezione d'area, ordinate insieme, e ogni
voce porta l'id della lista su cui rispondere ai controlli. Le sezioni
diventano tessere-widget con l'ombra dei pannelli, e la tessera accesa dentro
di esse non ha più il fondo bianco. HAI PRESO TUTTO passa nel Dock e compare
solo a lista davvero finita; gli stati vuoti mettono il loro primario nello
stesso posto, e VAI ALLA SETTIMANA diventa VAI AL PIANO, che è dove già
portava. La pillola dice "Settimana del 24 agosto". Sparisce il contatore
globale "N DA PRENDERE": il segnale di quanto manca resta il Marchio in barra.
```

---

### Task 5: il Piano

**Files:**
- Modify: `src/app/(app)/piano/page.tsx`
- Test: `src/app/(app)/piano/__tests__/page.test.tsx` (908 righe)

**Interfaces:**
- Consuma: `etichettaSettimana` e `parolaTemporale` da `@/domain/settimana-label` (Task 1),
  `Dock` (Task 2), `StrisciaGiorni` modificata (Task 3).
- Produce: nessuna firma pubblica.

- [ ] **Step 1: il censimento**

```bash
grep -n "Giorno precedente\|Giorno successivo\|PASTI A CASA IN SETTIMANA\|SETTIMANA SCORSA\|CONFERMA E CREA LA LISTA\|VAI ALLA LISTA" "src/app/(app)/piano/__tests__/page.test.tsx"
```

Già noti (21/09): riga 284 (`Giorno precedente` esiste), 516-518 (un click su
`Giorno successivo` per cambiare giorno), 374 (`14 PASTI A CASA IN SETTIMANA`), 685/713/737/827
(`‹ SETTIMANA SCORSA`, che **resta**: quei casi non si toccano). Rifai il censimento.

- [ ] **Step 2: la pillola arriva sul Piano**

`Cornice` passa la settimana alla Testata:

```tsx
/** Colonna a tutta altezza con la testata fissa in cima: solo il corpo passato come children scorre. */
function Cornice({ settimana, children }: { settimana?: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Testata titolo="Piano" settimana={settimana} />
      {children}
    </div>
  );
}
```

I chiamanti di `<Cornice>` nei rami di caricamento ed errore passano `settimana` quando la
settimana è nota, e niente quando non lo è. Nel ramo principale:

```tsx
    <Cornice settimana={etichettaSettimana(settimana.dataInizio)}>
```

`settimana.dataInizio` esiste già su questa pagina (`piano/page.tsx:48` nel tipo, usato a 252
per `giorniDellaSettimana`): passa quello e **non** ricalcolare il lunedì con `lunediDi`.
`LUNGHI` (riga 25) e `oggi` (riga 254) sono già in scope per lo step 4.

- [ ] **Step 3: la Testata rende maiuscola la pillola**

In `src/components/Testata.tsx`, allo `<span>` del testo della pillola aggiungi
`textTransform: 'uppercase'`. Senza, `Settimana del 21 settembre` resterebbe minuscolo contro
`DESIGN.md` §3; la stringa si scrive in sentence case e la rende la pillola.

- [ ] **Step 4: via le frecce, arriva l'etichetta del giorno**

Cancella il blocco con le due frecce tonde e il nome del giorno a 21 px (righe ~512-544: il `div`
che contiene `Giorno precedente`, il nome centrato e `Giorno successivo`). Al suo posto, come
primo figlio dello scroller:

```tsx
        {/* L'etichetta di sezione titola il giorno scelto: nome, parola temporale per
            ieri/oggi/domani, e a destra i pasti a casa di QUEL giorno. Le frecce non
            servono più — la striscia sopra fa la stessa cosa con sette bersagli. */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, padding: '0 0 10px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'var(--ink)' }}>
            {`${LUNGHI[selezionato]} ${Number(dataSelezionata.slice(8, 10))}`}
            {parolaTemporale(dataSelezionata, oggi) && (
              <span style={{ color: 'var(--testo-2)' }}>{` · ${parolaTemporale(dataSelezionata, oggi)}`}</span>
            )}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', color: 'var(--sec)' }}>
            {`${nCasaGiorno} ${nCasaGiorno === 1 ? 'PASTO' : 'PASTI'} A CASA`}
          </span>
        </div>
```

Il conteggio del giorno, accanto a `pastiOrdinati`:

```ts
  // Il conteggio del giorno scelto, non della settimana: decisione del 21/09.
  // Il totale settimanale sparisce con la riga che lo conteneva.
  const nCasaGiorno = settimana.slots
    .filter((s) => s.data === dataSelezionata && s.stato === 'casa' && s.dishId !== null).length;
```

e `nCasaSettimana` si cancella.

- [ ] **Step 5: gli errori entrano nello scroller, il primario nel Dock**

`erroreCheckin` passa a `color: 'var(--errore)'`. Subito sotto, dentro lo scroller, entra
`erroreConferma`, che oggi sta accanto al tasto:

```tsx
        {erroreConferma && (
          <p style={{ margin: '0 4px 9px', fontSize: 12.5, color: 'var(--errore)' }}>{erroreConferma}</p>
        )}
```

Il blocco `{vista === 'corrente' && (<div className="coda-barra" …>)}` in fondo diventa:

```tsx
      {vista === 'corrente' && (
        <Dock>
          <button type="button" onClick={confermaEVaiLista} disabled={confermando} className="dock-primario">
            {testoConferma}
          </button>
        </Dock>
      )}
```

Lo `opacity: confermando ? 0.7 : 1` non serve più: lo stato spento lo dà `.dock-primario:disabled`.

- [ ] **Step 6: lo scroller tiene la coda del Dock**

```tsx
      <div className={`sc scroll-app${vista === 'corrente' ? ' con-dock' : ''}`} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 12px' }}>
```

Nella vista precedente non c'è Dock e lo scroller resta quello di sempre: il contenuto passa
dietro la barra con la coda di 140.

- [ ] **Step 7: aggiorna e aggiungi i test**

- Riga 284: il caso su `Giorno precedente` si **riscrive** come «la striscia ha sette celle
  cliccabili», oppure si cancella se un caso equivalente esiste già sulla striscia; la scelta va
  nel rapporto.
- Righe 516-518: il click su `Giorno successivo` diventa un click sulla cella del giorno voluto
  (`screen.getAllByRole('button')` filtrati per `aria-label`, o il `data-giorno` che la striscia
  già espone).
- Riga 374: `14 PASTI A CASA IN SETTIMANA` si cancella e al suo posto va il conteggio del giorno.

Casi nuovi:

```tsx
  it('la pillola della settimana c\'è, in maiuscolo', async () => {
    await schermo();
    expect(await screen.findByText('SETTIMANA DEL 14 SETTEMBRE')).toBeInTheDocument();
  });

  it('l\'etichetta titola il giorno scelto con la parola temporale e i pasti a casa di quel giorno', async () => {
    await schermo();
    expect(await screen.findByText(/GIOVEDÌ 17/)).toBeInTheDocument();
    expect(screen.getByText('· Oggi')).toBeInTheDocument();
    expect(screen.getByText('3 PASTI A CASA')).toBeInTheDocument();
  });

  it('le frecce del giorno non esistono più', async () => {
    await schermo();
    expect(screen.queryByLabelText('Giorno precedente')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Giorno successivo')).not.toBeInTheDocument();
  });

  it('il primario sta nel Dock e porta il testo giusto secondo lo stato della settimana', async () => {
    await schermo(/* bozza */);
    const tasto = await screen.findByRole('button', { name: 'CONFERMA E CREA LA LISTA' });
    expect(tasto.closest('.dock')).not.toBeNull();
  });

  it('mentre conferma il tasto è disabilitato', async () => {
    await schermo(/* bozza, conferma lenta */);
    fireEvent.click(await screen.findByRole('button', { name: 'CONFERMA E CREA LA LISTA' }));
    expect(screen.getByRole('button', { name: 'CONFERMA E CREA LA LISTA' })).toBeDisabled();
  });

  it('l\'errore di conferma compare nello scroller, non accanto al tasto', async () => {
    await schermo(/* conferma che fallisce */);
    expect(await screen.findByText('Non siamo riusciti a confermare la settimana. Riprova.')).toBeInTheDocument();
  });
```

I testi dell'etichetta dipendono dalle fixture del file (che data è "oggi"): adattali ai valori
veri e non inventare una data.

- [ ] **Step 8: verifica**

Run: `npx vitest run "src/app/(app)/piano/__tests__/page.test.tsx"`
Expected: PASS. I quattro casi sulla vista «settimana scorsa» devono restare verdi **senza
modifiche**: se uno cade, è un effetto collaterale da capire, non un test da aggiornare.

- [ ] **Step 9: suite, tipi, lint**

Run: `npm test -- --run` poi `npx tsc --noEmit` e `npm run lint`
Expected: verde.

- [ ] **Step 10: Commit (lo fa il coordinatore dopo la review)**

```
feat: il Piano titola il giorno scelto e mette la conferma nel Dock

L'etichetta di sezione sotto la striscia dice il giorno per nome, con la
parola temporale per ieri, oggi e domani, e a destra i pasti a casa di quel
giorno: le due frecce tonde spariscono, perché la striscia fa la stessa cosa
con sette bersagli invece di due. Il contatore settimanale si cancella con la
riga che lo conteneva (decisione del 21/09). Arriva la pillola della
settimana, che la Testata rende maiuscola. CONFERMA E CREA LA LISTA passa nel
Dock con lo stato spento del sistema al posto dell'opacità, e l'errore di
conferma si sposta nello scroller accanto a quello di check-in, entrambi in
--errore. La vista "settimana scorsa" resta dov'è, per decisione esplicita.
```

---

### Task 6: i due residui di copy e il registro

**Files:**
- Modify: `src/app/(app)/lista/fatta/page.tsx` (righe 14-22: `MESI` e `formattaPillola`)
- Modify: `src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx` (riga 396)
- Modify: `docs/superpowers/specs/DESIGN-SYSTEM.md`
- Test: `src/app/(app)/lista/fatta/__tests__/page.test.tsx` e
  `src/app/(app)/piatti/[id]/ingredienti/[ingId]/__tests__/page.test.tsx` (righe 157, 162, 197)

**Interfaces:**
- Consuma: `etichettaSettimana` da `@/domain/settimana-label` (Task 1).

- [ ] **Step 1: la pillola del traguardo usa il formatter condiviso**

In `lista/fatta/page.tsx` cancella `MESI` e `formattaPillola` e importa
`etichettaSettimana` da `@/domain/settimana-label`, sostituendo la chiamata. La schermata resta
fuori dal ridisegno (il suo primario tiene `.coda-barra`), ma la pillola deve dire la stessa cosa
della Lista da cui si arriva: due pillole adiacenti con due formati diversi sono un difetto
visibile in tre tap.

- [ ] **Step 2: l'ultima riga che nomina TOP-UP**

`piatti/[id]/ingredienti/[ingId]/page.tsx` riga 396 è l'ultimo posto in cui l'utente incontra la
parola. Oggi:

```tsx
              {deperibile ? 'FINISCE NELLA LISTA TOP-UP' : 'FINISCE NELLA LISTA BASE'}
```

Diventa la conseguenza vera del flag, che con una lista sola non è più in quale lista finisce ma
come si comporta il residuo (`pantry.ts:101`: il residuo di un deperibile non arriva alla
settimana dopo):

```tsx
              {/* Con una lista sola il flag non decide più in quale lista finisce (decisione
                  del 20/09): decide se il residuo sopravvive alla settimana (pantry.ts). */}
              {deperibile ? 'IL RESIDUO NON ARRIVA ALLA SETTIMANA DOPO' : 'IL RESIDUO RESTA IN DISPENSA'}
```

Aggiorna le tre asserzioni del suo test (righe 157, 162, 197).

- [ ] **Step 3: il registro delle derive**

In `docs/superpowers/specs/DESIGN-SYSTEM.md`, nella sezione che elenca le derive del codice,
segna come chiuse quelle che la fase 2 ha chiuso (tessera nel widget, quattro stati della cella,
titolo del giorno, primari nel Dock per Lista e Piano) e lascia aperte quelle delle schermate non
ancora ridisegnate, dicendo per ognuna in quale fase cade. Non aggiungere voci nuove: questo file
registra, non decide.

- [ ] **Step 4: verifica**

Run: `npm test -- --run` poi `npx tsc --noEmit` e `npm run lint`
Expected: verde.

- [ ] **Step 5: Commit (lo fa il coordinatore dopo la review)**

```
fix: gli ultimi due posti che parlavano la lingua vecchia

Il traguardo della spesa usa lo stesso formatter della Lista: due pillole
adiacenti con due formati diversi si notano in tre tap. E la riga della
schermata Ingrediente non dice più in quale lista finisce l'ingrediente (le
liste sono una) ma cosa fa davvero il flag deperibile: se il residuo arriva
alla settimana dopo. DESIGN-SYSTEM.md segna chiuse le derive che questa fase
ha chiuso.
```

---

### Task 7: la verifica nel browser

**Files:**
- Create (temporaneo, **da cancellare e non committare**): `src/app/auth/prova-fase2/page.tsx`
- Modify: nessuno, se non emergono difetti.

- [ ] **Step 1: la sonda**

Come in fase 1: il proxy di autenticazione protegge per esclusione e lascia passare `/auth/*`,
quindi una pagina sotto `src/app/auth/` si apre senza sessione. La sonda monta il `Guscio` con
dentro, in sequenza: una Lista finta a lista **non** finita, una a lista finita (con Dock), e un
Piano finto con la striscia nei quattro stati e sei pasti. Dati inventati, nessuna chiamata a
Supabase.

- [ ] **Step 2: il server**

Run dal worktree: `npm run dev -- -p 3002` in background (mai `sleep` in primo piano: usa un
ciclo `until` o l'esecuzione in background).

- [ ] **Step 3: le misure, a 375 × 812**

Apri `http://localhost:3002/auth/prova-fase2` e misura con gli strumenti del browser, riportando
i numeri veri:

1. Il fondo dell'ultima tessera contro il **cielo del Dock**, a barra grande e a barra ridotta:
   la tessera non deve mai finire sotto. (In fase 1 lo stesso controllo, fatto solo a codice,
   aveva lasciato passare un difetto.)
2. Il `bottom` del Dock: 114 a barra grande, 96 a ridotta, con la transizione di 200 ms.
3. La sfumatura: nessuna voce tagliata a metà schermo, né in Lista né in Piano.
4. La striscia con **sei** pasti: sei pallini per cella, nessun taglio, celle di larghezza uguale.
5. I quattro stati della cella distinguibili, e le sette celle della stessa dimensione.
6. Lo slot del Dock non intercetta lo scorrimento: si scorre la lista trascinando **sopra** la
   zona del Dock dove il Dock non c'è.

- [ ] **Step 4: cancella la sonda**

`rm "src/app/auth/prova-fase2/page.tsx"` e verifica con `git status` che non resti niente.

- [ ] **Step 5: il rapporto**

Scrivi le sei misure con i valori veri, etichettate `[misurato]`, e i difetti trovati. Un difetto
trovato qui si corregge in questo task, con il suo commit, e si rimisura.

- [ ] **Step 6: Commit (solo se ci sono correzioni)**

```
fix: geometria del Dock verificata nel browser

<il difetto trovato, la misura prima e dopo>
```

---

## Dopo i sette task

1. Review finale su tutto il ramo (modello capace), con attenzione a: il portale del Dock e lo
   slot che non deve intercettare i tocchi; `fondiSezioni` e il `listaId` che arriva a
   `rispondiControllo`; i test cancellati, uno per uno, con la ragione.
2. `superpowers:finishing-a-development-branch`: PR verso `main`, CI, merge.
3. Deploy in produzione: lo fa Andrea (`npx vercel login` e poi `--prod`; il token scade spesso).
4. **Gate finale di Andrea**, dal telefono: una spesa vera — spuntare in corsia, arrivare a
   `HAI PRESO TUTTO`, chiudere da `/lista/fatta` — e una conferma di settimana dal Piano.
5. Aggiornare `docs/2026-09-06-ripresa.md` e la memoria di progetto con l'esito.

## Auto-review del piano

**Copertura della spec.** §A → Task 2. §B → Task 1 e 4. §C → Task 3 e 4. §D → Task 4. §E → Task 3.
§F → Task 5. §G → Task 5 (più il `textTransform` della Testata, che sta in Task 5 Step 3 perché
è la pillola del Piano a renderlo necessario). §H → Task 1 e 6. §I → Task 4, 5, 6. §J → i casi
limite stanno nei test dei Task 1, 2, 3 e nel Task 7 per le geometrie. §K → distribuito. §L → le
due decisioni sono applicate in Task 5 (contatore) e nel non-fare del Task 5 (settimana scorsa).
§M → questi sette task.

**Segnaposto.** Nessun `TBD`. I tre punti dove il piano dice «adatta al valore vero del file»
(il nome dell'helper di montaggio nei test di pagina, il nome del campo del lunedì nella
`settimana` del Piano, le fixture delle date) sono fatti che stanno nel file da leggere, non
decisioni rimandate: ognuno ha l'istruzione di scrivere nel rapporto il valore trovato.

**Coerenza dei tipi.** `fondiSezioni` produce `SezioneFusa` con `VoceFusa`; Task 4 usa quei due
nomi in `CartaSezione` e in `rispondi`. `ordinaPerCarrello` diventa generica perché riceve
`VoceFusa[]` e non più `VoceSalvata[]`. `parolaTemporale` torna `'Ieri' | 'Oggi' | 'Domani' | null`
ed è usata sia da `StrisciaGiorni` (minuscola, nell'`aria-label`) sia dal Piano (come viene, nel
testo) — le due maiuscole diverse sono volute e scritte in entrambi i punti.
