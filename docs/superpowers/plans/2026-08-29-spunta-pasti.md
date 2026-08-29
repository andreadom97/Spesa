# Spunta Pasti Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La spunta pasti leggera collegata al residuo: "saltato / ho mangiato altro / ho mangiato un altro piatto" per pasto, con storno immediato sul residuo via ledger `meal_slot_storno`.

**Architecture:** Un modulo di dominio puro (`storno.ts`) calcola cosa consuma uno slot e la differenza fra prima e dopo una mutazione; `aggiornaSlot` — l'unico varco di scrittura degli slot — registra la differenza in un ledger cumulativo e la applica a `pantry_state` quando la lista è già generata; `chiudiSpesa` riapplica gli storni della settimana dopo la sovrascrittura assoluta del residuo. La UI resta nella pagina Settimana: action sheet sulla zona destra delle righe pasto per i giorni ≤ oggi, più la navigazione alla settimana precedente.

**Tech Stack:** Next.js 16 (App Router) + TypeScript, Supabase (RLS), Vitest + Testing Library (jsdom). Nessuna dipendenza nuova.

**Spec:** `docs/superpowers/specs/2026-08-29-spunta-pasti-design.md`

## Global Constraints

- **La migrazione `0008_spunta_pasti.sql` NON si applica a nessun database durante l'esecuzione del piano**: si scrive il file e basta. L'applicazione in produzione è un gate esplicito di Andrea a fine lavori.
- `src/domain/` resta puro: niente rete, niente DB, niente fs (spec §3).
- Lo storno si scrive **solo se la settimana non è `bozza`** (spec §2).
- Il ledger registra il delta **calcolato**; ogni applicazione al residuo clampa `Math.max(0, residuo + delta)` (spec §3).
- Le spunte scrivono `fonte: 'checkin'` (spec §5.1).
- Copy italiane esatte: "Saltato", "Ho mangiato altro", "Ho mangiato un altro piatto", "Torna al piano", "‹ SETTIMANA SCORSA", "SETTIMANA CORRENTE ›", "Questa settimana non è mai stata creata: non c'è nulla da correggere." (spec §6).
- Il repo AGENTS.md avverte: questo Next.js NON è quello del training — prima di toccare comportamento Next leggere `node_modules/next/dist/docs/`. I task qui sotto toccano solo componenti client e data layer, nessuna API Next nuova.
- La cartella `diete/` è gitignored e contiene dati sanitari veri: mai toccarla, mai citarne il contenuto.
- Test: `npx vitest run` (suite completa verde a fine di ogni task; oggi 417 test).

## File Structure

| File | Ruolo |
|---|---|
| `supabase/migrations/0008_spunta_pasti.sql` (create) | Ledger `meal_slot_storno` + stato `'sostituito'` |
| `src/domain/types.ts` (modify) | `StatoSlot` guadagna `'sostituito'` |
| `src/domain/storno.ts` (create) | `consumoSlot`, `deltaStorno` — puro |
| `src/domain/__tests__/storno.test.ts` (create) | Test dominio |
| `src/data/settimana.ts` (modify) | `leggiSettimana(lunedi)`, estensione `aggiornaSlot` |
| `src/data/__tests__/settimana.leggiSettimana.test.ts` (create) | Test lettura parametrica |
| `src/data/__tests__/settimana.aggiornaSlot.test.ts` (create) | Test ledger + pantry |
| `src/data/lista.ts` (modify) | `chiudiSpesa` riapplica gli storni |
| `src/data/__tests__/lista.chiudiSpesa.test.ts` (modify) | Test riapplicazione |
| `src/app/(app)/settimana/[data]/[slotDefId]/scegli/page.tsx` (modify) | Carica la settimana della data, non la corrente |
| `src/components/RigaPasto.tsx` (modify) | Prop `stato` + zona destra ad azioni |
| `src/components/FoglioAzioniPasto.tsx` (create) | Action sheet |
| `src/components/__tests__/FoglioAzioniPasto.test.tsx` (create) | Test sheet |
| `src/app/(app)/settimana/page.tsx` (modify) | Spunte + settimana precedente |
| `src/app/(app)/settimana/__tests__/page.test.tsx` (modify) | Test UI |
| `README.md` (modify) | Sezione breve sulla spunta |

---

### Task 1: Migrazione 0008 + `StatoSlot` 'sostituito'

**Files:**
- Create: `supabase/migrations/0008_spunta_pasti.sql`
- Modify: `src/domain/types.ts:8`

**Interfaces:**
- Produces: tabella `meal_slot_storno(id, user_id, meal_slot_id, ingredient_id, delta, aggiornato_il)` con `unique (meal_slot_id, ingredient_id)`; `StatoSlot = 'casa' | 'fuori' | 'saltato' | 'sostituito'`. I Task 4-7 dipendono da entrambi.

Contesto: ogni confronto su `StatoSlot` nel codice è `=== 'casa'` (verificato con grep il 29/08: `settimana/page.tsx`, `piatti/[id]/page.tsx`, `StrisciaGiorni.tsx`, `list-builder.ts`, `week-shape.ts`), quindi `'sostituito'` si comporta ovunque come "non consuma / riga spenta" senza altri ritocchi.

- [ ] **Step 1: Scrivi la migrazione**

```sql
-- Il ledger degli storni (spec spunta-pasti §4): la memoria di quanto ogni
-- spunta ha spostato nel residuo. Una riga CUMULATIVA per (slot, ingrediente),
-- aggiornata leggi-somma-scrivi da aggiornaSlot; cancellata quando il cumulo
-- torna a 0. delta > 0 = riaccredito al residuo, delta < 0 = addebito.
create table meal_slot_storno (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_slot_id uuid not null references meal_slot(id) on delete cascade,
  ingredient_id uuid not null references ingredient(id) on delete cascade,
  delta numeric not null,
  aggiornato_il timestamptz not null default now(),
  unique (meal_slot_id, ingredient_id)
);

-- RLS: stesso blocco di 0002_rls.sql / 0007_import_draft.sql.
do $$
begin
  execute 'alter table meal_slot_storno enable row level security';
  execute 'alter table meal_slot_storno force row level security';
  execute 'create policy meal_slot_storno_proprietario on meal_slot_storno for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)';
end $$;

-- 'sostituito' = "ho mangiato altro": per il residuo equivale a saltato, a
-- schermo si distingue. Il sostituto DEL REPERTORIO invece non è uno stato:
-- lo slot resta 'casa', cambia dish_id, il ledger pareggia (spec §4).
-- Nome del constraint verificato in produzione il 29/08: meal_slot_stato_check.
alter table meal_slot drop constraint meal_slot_stato_check;
alter table meal_slot add constraint meal_slot_stato_check
  check (stato in ('casa', 'fuori', 'saltato', 'sostituito'));
```

**NON applicare la migrazione a nessun database** (Global Constraints).

- [ ] **Step 2: Allarga `StatoSlot`**

In `src/domain/types.ts` sostituisci la riga 8:

```ts
export type StatoSlot = 'casa' | 'fuori' | 'saltato' | 'sostituito';
```

- [ ] **Step 3: Suite completa verde**

Run: `npx vitest run`
Expected: tutti i test passano (nessun confronto esaustivo su `StatoSlot` esiste nel codice).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0008_spunta_pasti.sql src/domain/types.ts
git commit -m "feat(schema): migrazione 0008, il ledger degli storni e lo stato sostituito"
```

---

### Task 2: Dominio `storno.ts`

**Files:**
- Create: `src/domain/storno.ts`
- Test: `src/domain/__tests__/storno.test.ts`

**Interfaces:**
- Consumes: `righeEffettive(dish, scelte)` da `./opzioni`; `convertiInUnitaBase(quantita, da, base)` da `./unita`; `IngredienteMancanteError` da `./list-builder`; tipi da `./types`.
- Produces (i Task 4-5 li usano con queste firme esatte):
  - `consumoSlot(i: ConsumoSlotInput): Map<string, number>` con `ConsumoSlotInput = { slot: MealSlot; dish: Dish | null; ingredients: Ingredient[]; moltiplicatorePorzioni: number }`
  - `deltaStorno(prima: Map<string, number>, dopo: Map<string, number>): DeltaStorno[]` con `DeltaStorno = { ingredientId: string; delta: number }`

- [ ] **Step 1: Scrivi i test (falliranno)**

```ts
import { describe, it, expect } from 'vitest';
import type { Dish, Ingredient, MealSlot, StatoSlot } from '../types';
import { consumoSlot, deltaStorno } from '../storno';
import { IngredienteMancanteError } from '../list-builder';

const ING_POLLO: Ingredient = {
  id: 'i-pollo', nome: 'Pollo', unitaBase: 'g', area: 'macelleria',
  classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000,
};
const ING_RISO: Ingredient = {
  id: 'i-riso', nome: 'Riso', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500,
};
const ING_OLIO: Ingredient = {
  id: 'i-olio', nome: 'Olio', unitaBase: 'ml', area: 'dispensa',
  classeResiduo: 'stima', deperibile: false, formatoConfezione: 1000,
};
const ING_UOVA: Ingredient = {
  id: 'i-uova', nome: 'Uova', unitaBase: 'pz', area: 'latticini',
  classeResiduo: 'intero', deperibile: true, formatoConfezione: 6,
};
const INGREDIENTI = [ING_POLLO, ING_RISO, ING_OLIO, ING_UOVA];

const POLLO_E_RISO: Dish = {
  id: 'd-1', nome: 'Pollo e riso', slotDefId: 'sd-cena', fonte: 'proprio',
  attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [
    { ingredientId: 'i-pollo', quantita: 200, unita: 'g' },
    { ingredientId: 'i-riso', quantita: 0.08, unita: 'kg' },
    { ingredientId: 'i-olio', quantita: 10, unita: 'ml' },
  ],
  componenti: [],
};

const CON_COMPONENTE: Dish = {
  id: 'd-2', nome: 'Piatto con contorno', slotDefId: 'sd-cena', fonte: 'proprio',
  attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-pollo', quantita: 150, unita: 'g' }],
  componenti: [{
    id: 'c-contorno', nome: 'contorno',
    opzioni: [
      { id: 'o-riso', righe: [{ ingredientId: 'i-riso', quantita: 80, unita: 'g' }] },
      { id: 'o-uova', righe: [{ ingredientId: 'i-uova', quantita: 2, unita: 'pz' }] },
    ],
  }],
};

function slot(stato: StatoSlot, dishId: string | null, scelte: MealSlot['scelte'] = {}): MealSlot {
  return { id: 's-1', data: '2026-08-26', slotDefId: 'sd-cena', stato, dishId, fonteStato: 'checkin', scelte };
}

describe('consumoSlot', () => {
  it('somma le righe in unità base col moltiplicatore, escludendo la classe stima', () => {
    const c = consumoSlot({
      slot: slot('casa', 'd-1'), dish: POLLO_E_RISO,
      ingredients: INGREDIENTI, moltiplicatorePorzioni: 2,
    });
    expect(c.get('i-pollo')).toBe(400);
    expect(c.get('i-riso')).toBe(160); // 0.08 kg → 80 g, ×2
    expect(c.has('i-olio')).toBe(false); // stima: nessuna aritmetica (regola 7)
  });

  it('uno slot che non è a casa non consuma nulla, qualunque sia lo stato', () => {
    for (const stato of ['fuori', 'saltato', 'sostituito'] as const) {
      const c = consumoSlot({
        slot: slot(stato, 'd-1'), dish: POLLO_E_RISO,
        ingredients: INGREDIENTI, moltiplicatorePorzioni: 1,
      });
      expect(c.size).toBe(0);
    }
  });

  it('senza piatto non consuma nulla', () => {
    const c = consumoSlot({
      slot: slot('casa', null), dish: null,
      ingredients: INGREDIENTI, moltiplicatorePorzioni: 1,
    });
    expect(c.size).toBe(0);
  });

  it('rispetta la scelta del componente; scelta assente = prima opzione', () => {
    const conScelta = consumoSlot({
      slot: slot('casa', 'd-2', { 'c-contorno': { opzioneId: 'o-uova', fonte: 'manuale' } }),
      dish: CON_COMPONENTE, ingredients: INGREDIENTI, moltiplicatorePorzioni: 1,
    });
    expect(conScelta.get('i-uova')).toBe(2);
    expect(conScelta.has('i-riso')).toBe(false);

    const senzaScelta = consumoSlot({
      slot: slot('casa', 'd-2'), dish: CON_COMPONENTE,
      ingredients: INGREDIENTI, moltiplicatorePorzioni: 1,
    });
    expect(senzaScelta.get('i-riso')).toBe(80);
    expect(senzaScelta.has('i-uova')).toBe(false);
  });

  it('un ingrediente citato dal piatto ma assente dal repertorio esplode', () => {
    expect(() => consumoSlot({
      slot: slot('casa', 'd-1'), dish: POLLO_E_RISO,
      ingredients: [ING_RISO, ING_OLIO], moltiplicatorePorzioni: 1,
    })).toThrow(IngredienteMancanteError);
  });
});

describe('deltaStorno', () => {
  it('prima − dopo per ingrediente; le voci a delta zero non compaiono', () => {
    const prima = new Map([['a', 100], ['b', 50]]);
    const dopo = new Map([['b', 50], ['c', 30]]);
    const deltas = deltaStorno(prima, dopo);
    expect(deltas).toHaveLength(2);
    expect(deltas.find((d) => d.ingredientId === 'a')).toEqual({ ingredientId: 'a', delta: 100 });
    expect(deltas.find((d) => d.ingredientId === 'c')).toEqual({ ingredientId: 'c', delta: -30 });
  });

  it('telescopio: una sequenza di mutazioni che torna al punto di partenza somma a zero', () => {
    const base = { ingredients: INGREDIENTI, moltiplicatorePorzioni: 1 };
    // casa d-1 → saltato → casa d-2 → casa d-1: il cammino torna all'origine.
    const stati = [
      consumoSlot({ slot: slot('casa', 'd-1'), dish: POLLO_E_RISO, ...base }),
      consumoSlot({ slot: slot('saltato', 'd-1'), dish: POLLO_E_RISO, ...base }),
      consumoSlot({ slot: slot('casa', 'd-2'), dish: CON_COMPONENTE, ...base }),
      consumoSlot({ slot: slot('casa', 'd-1'), dish: POLLO_E_RISO, ...base }),
    ];
    const somme = new Map<string, number>();
    for (let i = 1; i < stati.length; i++) {
      for (const d of deltaStorno(stati[i - 1], stati[i])) {
        somme.set(d.ingredientId, (somme.get(d.ingredientId) ?? 0) + d.delta);
      }
    }
    for (const v of somme.values()) expect(v).toBe(0);
  });
});
```

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/domain/__tests__/storno.test.ts`
Expected: FAIL — modulo `../storno` inesistente.

- [ ] **Step 3: Implementa `src/domain/storno.ts`**

```ts
import type { Dish, Ingredient, MealSlot } from './types';
import { righeEffettive } from './opzioni';
import { convertiInUnitaBase } from './unita';
import { IngredienteMancanteError } from './list-builder';

export interface ConsumoSlotInput {
  slot: MealSlot;
  /** Il piatto di slot.dishId, o null se nessuno. */
  dish: Dish | null;
  ingredients: Ingredient[];
  moltiplicatorePorzioni: number;
}

/**
 * Cosa consuma questo slot, in unità base per ingrediente. Vuota se lo slot
 * non consuma (stato ≠ 'casa', o nessun piatto). Stessa aritmetica di
 * costruisciLista — righeEffettive rispetta le scelte dei componenti, il
 * moltiplicatore si applica riga per riga — o lo storno non pareggerebbe mai
 * il fabbisogno che la lista ha consumato. La classe 'stima' resta fuori:
 * nessuna aritmetica sul residuo (regola 7 della spec di list-builder).
 */
export function consumoSlot(i: ConsumoSlotInput): Map<string, number> {
  const consumo = new Map<string, number>();
  if (i.slot.stato !== 'casa' || !i.dish) return consumo;
  const perId = new Map(i.ingredients.map((x) => [x.id, x]));
  for (const riga of righeEffettive(i.dish, i.slot.scelte)) {
    const ing = perId.get(riga.ingredientId);
    if (!ing) throw new IngredienteMancanteError(riga.ingredientId);
    if (ing.classeResiduo === 'stima') continue;
    const q = convertiInUnitaBase(riga.quantita, riga.unita, ing.unitaBase)
      * i.moltiplicatorePorzioni;
    consumo.set(ing.id, (consumo.get(ing.id) ?? 0) + q);
  }
  return consumo;
}

export interface DeltaStorno {
  ingredientId: string;
  /** Positivo = riaccredito al residuo, negativo = addebito. */
  delta: number;
}

/**
 * prima − dopo, per ingrediente. È la quantità da restituire alla dispensa
 * quando il consumo di uno slot cambia: le mutazioni telescopizzano, quindi
 * qualunque giro di ripensamenti lascia il totale pari a "congelato − consumo
 * attuale" (spec spunta-pasti §2). Chi applica i delta clampa sempre a zero:
 * il ledger registra il calcolato, non l'applicato (spec §3).
 */
export function deltaStorno(
  prima: Map<string, number>,
  dopo: Map<string, number>,
): DeltaStorno[] {
  const ids = new Set([...prima.keys(), ...dopo.keys()]);
  const out: DeltaStorno[] = [];
  for (const id of ids) {
    const delta = (prima.get(id) ?? 0) - (dopo.get(id) ?? 0);
    if (delta !== 0) out.push({ ingredientId: id, delta });
  }
  return out;
}
```

- [ ] **Step 4: Verifica che passino**

Run: `npx vitest run src/domain/__tests__/storno.test.ts`
Expected: PASS (7 test).

- [ ] **Step 5: Commit**

```bash
git add src/domain/storno.ts src/domain/__tests__/storno.test.ts
git commit -m "feat(domain): consumoSlot e deltaStorno, l'aritmetica pura dello storno"
```

---

### Task 3: `leggiSettimana(lunedi)` e Scegli sulla settimana della data

**Files:**
- Modify: `src/data/settimana.ts:27-48` (leggiSettimanaCorrente)
- Modify: `src/app/(app)/settimana/[data]/[slotDefId]/scegli/page.tsx` (import + riga 240)
- Modify: `src/app/(app)/settimana/[data]/[slotDefId]/scegli/__tests__/page.test.tsx` (factory del mock)
- Test: `src/data/__tests__/settimana.leggiSettimana.test.ts` (create)

**Interfaces:**
- Produces: `leggiSettimana(lunedi: string): Promise<SettimanaCorrente | null>` esportata da `src/data/settimana.ts`. Il Task 7 la usa per la settimana precedente. `leggiSettimanaCorrente()` resta, come delega.

- [ ] **Step 1: Scrivi il test (fallirà)**

`src/data/__tests__/settimana.leggiSettimana.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiImpostazioni: vi.fn(), leggiSlotDefs: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiRepertorio: vi.fn(), leggiIngredienti: vi.fn() }));
vi.mock('../dispensa', () => ({ leggiDispensa: vi.fn() }));

import { client } from '../supabase';
import { leggiSettimana, leggiSettimanaCorrente } from '../settimana';

interface Chiamata { metodo: string; args: unknown[] }

/** Stessa controfigura del query builder usata negli altri test data (vedi lista.chiudiSpesa.test.ts). */
function creaClientMock(risolvi: (tabella: string, chiamate: Chiamata[]) => { data?: unknown; error?: unknown }) {
  const letture: Record<string, Chiamata[][]> = {};
  function from(tabella: string) {
    const chiamate: Chiamata[] = [];
    const registra = (metodo: string) => (...args: unknown[]) => {
      chiamate.push({ metodo, args });
      return proxy;
    };
    const proxy: Record<string, unknown> = {
      select: registra('select'), eq: registra('eq'), in: registra('in'),
      update: registra('update'), insert: registra('insert'), upsert: registra('upsert'),
      delete: registra('delete'), order: registra('order'),
      returns: () => proxy, single: () => proxy, maybeSingle: () => proxy,
      then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
        (letture[tabella] ??= []).push(chiamate);
        return Promise.resolve(risolvi(tabella, chiamate)).then(onFulfilled, onRejected);
      },
    };
    return proxy;
  }
  return {
    sb: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) }, from },
    letture,
  };
}

function risolviCon(week: unknown) {
  return (tabella: string) => {
    if (tabella === 'week') return { data: week, error: null };
    if (tabella === 'meal_slot') return { data: [], error: null };
    return { data: null, error: null };
  };
}

describe('leggiSettimana', () => {
  beforeEach(() => vi.mocked(client).mockReset());
  afterEach(() => vi.useRealTimers());

  it('filtra la week sul lunedì passato, non su quello di oggi', async () => {
    const { sb, letture } = creaClientMock(
      risolviCon({ id: 'w-prec', data_inizio: '2026-08-17', stato: 'chiusa' }),
    );
    vi.mocked(client).mockReturnValue(sb as never);

    const s = await leggiSettimana('2026-08-17');

    expect(s).toEqual({ id: 'w-prec', dataInizio: '2026-08-17', stato: 'chiusa', slots: [] });
    const filtri = letture['week']![0]!.filter((c) => c.metodo === 'eq');
    expect(filtri).toContainEqual({ metodo: 'eq', args: ['data_inizio', '2026-08-17'] });
  });

  it('restituisce null se la settimana non esiste', async () => {
    const { sb } = creaClientMock(risolviCon(null));
    vi.mocked(client).mockReturnValue(sb as never);
    expect(await leggiSettimana('2026-08-17')).toBeNull();
  });

  it('leggiSettimanaCorrente delega col lunedì di oggi', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-02T10:00:00Z')); // mercoledì
    const { sb, letture } = creaClientMock(risolviCon(null));
    vi.mocked(client).mockReturnValue(sb as never);

    await leggiSettimanaCorrente();

    const filtri = letture['week']![0]!.filter((c) => c.metodo === 'eq');
    expect(filtri).toContainEqual({ metodo: 'eq', args: ['data_inizio', '2026-08-31'] });
  });
});
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run src/data/__tests__/settimana.leggiSettimana.test.ts`
Expected: FAIL — `leggiSettimana` non esportata.

- [ ] **Step 3: Implementa in `src/data/settimana.ts`**

Sostituisci `leggiSettimanaCorrente` (righe 19-48) con:

```ts
/**
 * La settimana che inizia al lunedì passato. `data_inizio` è sempre un lunedì
 * (vedi creaSettimana) e l'unique `(user_id, data_inizio)` garantisce al più
 * una riga. Parametrica dal 2026-08-29: la spunta pasti arriva anche alla
 * settimana precedente (spec spunta-pasti §6), e Scegli deve caricare la
 * settimana della SUA data, non quella di oggi.
 */
export async function leggiSettimana(lunedi: string): Promise<SettimanaCorrente | null> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { data: settimana, error } = await sb
    .from('week')
    .select('id, data_inizio, stato')
    .eq('user_id', utente.user!.id)
    .eq('data_inizio', lunedi)
    .maybeSingle();
  if (error) throw error;
  if (!settimana) return null;

  const weekId = String(settimana.id);
  const slots = await leggiSlotSettimana(weekId);
  return {
    id: weekId,
    dataInizio: String(settimana.data_inizio).slice(0, 10),
    stato: settimana.stato as SettimanaCorrente['stato'],
    slots,
  };
}

/**
 * La settimana corrente è quella che **contiene oggi**, non l'ultima creata:
 * se Andrea non apre l'app per due settimane, "l'ultima creata" sarebbe una
 * settimana passata, e `generaListe` costruirebbe la lista sugli slot sbagliati.
 */
export async function leggiSettimanaCorrente(): Promise<SettimanaCorrente | null> {
  const oggi = new Date().toISOString().slice(0, 10);
  return leggiSettimana(lunediDi(oggi));
}
```

(`lunediDi` è già importata in testa al file.)

- [ ] **Step 4: Verifica che passi**

Run: `npx vitest run src/data/__tests__/settimana.leggiSettimana.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Scegli carica la settimana della sua data**

In `src/app/(app)/settimana/[data]/[slotDefId]/scegli/page.tsx`:

1. Nell'import da `@/data/settimana` sostituisci `leggiSettimanaCorrente` con `leggiSettimana`.
2. Alla riga 240, sostituisci `leggiSettimanaCorrente(),` con `leggiSettimana(lunediDi(dataParam)),` (`lunediDi` è già importata alla riga 11).

Poi in `scegli/__tests__/page.test.tsx`: nella factory `vi.mock('@/data/settimana', ...)` aggiungi `leggiSettimana: vi.fn(),` e sostituisci OGNI occorrenza di `leggiSettimanaCorrente` nel file (import e `vi.mocked(...)`) con `leggiSettimana` — il mock risponde qualunque sia il lunedì, i valori attesi non cambiano.

- [ ] **Step 6: Suite completa verde**

Run: `npx vitest run`
Expected: tutti i test passano.

- [ ] **Step 7: Commit**

```bash
git add src/data/settimana.ts src/data/__tests__/settimana.leggiSettimana.test.ts "src/app/(app)/settimana/[data]/[slotDefId]/scegli/page.tsx" "src/app/(app)/settimana/[data]/[slotDefId]/scegli/__tests__/page.test.tsx"
git commit -m "feat(data): leggiSettimana parametrica, e Scegli carica la settimana della sua data"
```

---

### Task 4: `aggiornaSlot` scrive il ledger e applica gli storni

**Files:**
- Modify: `src/data/settimana.ts:187-260` (aggiornaSlot)
- Test: `src/data/__tests__/settimana.aggiornaSlot.test.ts` (create)

**Interfaces:**
- Consumes: `consumoSlot`, `deltaStorno` da `@/domain/storno` (Task 2); tabella `meal_slot_storno` (Task 1); `leggiRepertorio`, `leggiIngredienti` da `./repertorio`; `leggiImpostazioni` da `./impostazioni` (tutti già importati in `settimana.ts`).
- Produces: la firma di `aggiornaSlot` NON cambia — cambia solo cosa scrive. Il Task 7 continua a chiamarla come oggi.

- [ ] **Step 1: Scrivi i test (falliranno)**

`src/data/__tests__/settimana.aggiornaSlot.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiImpostazioni: vi.fn(), leggiSlotDefs: vi.fn() }));
vi.mock('../repertorio', () => ({ leggiRepertorio: vi.fn(), leggiIngredienti: vi.fn() }));
vi.mock('../dispensa', () => ({ leggiDispensa: vi.fn() }));

import type { Dish, Ingredient } from '@/domain/types';
import { client } from '../supabase';
import { leggiImpostazioni } from '../impostazioni';
import { leggiRepertorio, leggiIngredienti } from '../repertorio';
import { aggiornaSlot } from '../settimana';

interface Chiamata { metodo: string; args: unknown[] }

function creaClientMock(risolvi: (tabella: string, chiamate: Chiamata[]) => { data?: unknown; error?: unknown }) {
  const scritture: Record<string, Chiamata[][]> = {};
  function from(tabella: string) {
    const chiamate: Chiamata[] = [];
    const registra = (metodo: string) => (...args: unknown[]) => {
      chiamate.push({ metodo, args });
      return proxy;
    };
    const proxy: Record<string, unknown> = {
      select: registra('select'), eq: registra('eq'), in: registra('in'),
      update: registra('update'), insert: registra('insert'), upsert: registra('upsert'),
      delete: registra('delete'), order: registra('order'),
      returns: () => proxy, single: () => proxy, maybeSingle: () => proxy,
      then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
        (scritture[tabella] ??= []).push(chiamate);
        return Promise.resolve(risolvi(tabella, chiamate)).then(onFulfilled, onRejected);
      },
    };
    return proxy;
  }
  return {
    sb: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) }, from },
    scritture,
  };
}

const ING_POLLO: Ingredient = {
  id: 'i-pollo', nome: 'Pollo', unitaBase: 'g', area: 'macelleria',
  classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000,
};
const ING_RISO: Ingredient = {
  id: 'i-riso', nome: 'Riso', unitaBase: 'g', area: 'cereali',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500,
};
const ING_OLIO: Ingredient = {
  id: 'i-olio', nome: 'Olio', unitaBase: 'ml', area: 'dispensa',
  classeResiduo: 'stima', deperibile: false, formatoConfezione: 1000,
};

const DISH_POLLO: Dish = {
  id: 'd-1', nome: 'Pollo', slotDefId: 'sd-1', fonte: 'proprio', attivo: true,
  descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [
    { ingredientId: 'i-pollo', quantita: 200, unita: 'g' },
    { ingredientId: 'i-olio', quantita: 10, unita: 'ml' },
  ],
  componenti: [],
};
const DISH_RISO: Dish = {
  id: 'd-2', nome: 'Riso', slotDefId: 'sd-1', fonte: 'proprio', attivo: true,
  descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'i-riso', quantita: 100, unita: 'g' }],
  componenti: [],
};

function rigaSlot(stato: string, dishId: string | null = 'd-1') {
  return {
    id: 's-1', user_id: 'user-1', week_id: 'w-1', data: '2026-08-26',
    slot_def_id: 'sd-1', stato, dish_id: dishId, fonte_stato: 'default',
    meal_slot_choice: [],
  };
}

/**
 * Risolutore standard: slot come da `riga`, week con lo stato dato, ledger
 * esistente come da `ledger`, pantry_state con le righe date. Le scritture
 * (upsert/delete/update/insert) rispondono sempre { error: null }.
 */
function risolutore(opts: {
  riga: Record<string, unknown>;
  statoWeek: string;
  ledger?: Array<{ ingredient_id: string; delta: number }>;
  pantry?: Array<{ ingredient_id: string; residuo: number }>;
}) {
  return (tabella: string, chiamate: Chiamata[]) => {
    const legge = chiamate.some((c) => c.metodo === 'select');
    if (tabella === 'meal_slot' && legge) return { data: opts.riga, error: null };
    if (tabella === 'week' && legge) return { data: { stato: opts.statoWeek }, error: null };
    if (tabella === 'meal_slot_storno' && legge) return { data: opts.ledger ?? [], error: null };
    if (tabella === 'pantry_state' && legge) return { data: opts.pantry ?? [], error: null };
    return { data: null, error: null };
  };
}

function scrittureDi(scritture: Record<string, Chiamata[][]>, tabella: string, metodo: string) {
  return (scritture[tabella] ?? []).flat().filter((c) => c.metodo === metodo);
}

describe('aggiornaSlot e il ledger degli storni', () => {
  beforeEach(() => {
    vi.mocked(client).mockReset();
    vi.mocked(leggiImpostazioni).mockResolvedValue({
      moltiplicatorePorzioni: 1,
      ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'],
      settimaneCiclo: 1, cicloOrigine: null,
    });
    vi.mocked(leggiRepertorio).mockResolvedValue([DISH_POLLO, DISH_RISO]);
    vi.mocked(leggiIngredienti).mockResolvedValue([ING_POLLO, ING_RISO, ING_OLIO]);
  });

  it('a settimana bozza non tocca né ledger né pantry', async () => {
    const { sb, scritture } = creaClientMock(risolutore({ riga: rigaSlot('casa'), statoWeek: 'bozza' }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { stato: 'saltato' }, 'checkin');

    expect(scritture['meal_slot_storno']).toBeUndefined();
    expect(scritture['pantry_state']).toBeUndefined();
  });

  it('casa→saltato a settimana confermata: riaccredito nel ledger e nel residuo, la classe stima esclusa', async () => {
    const { sb, scritture } = creaClientMock(risolutore({
      riga: rigaSlot('casa'), statoWeek: 'confermata',
      pantry: [{ ingredient_id: 'i-pollo', residuo: 40 }],
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { stato: 'saltato' }, 'checkin');

    const ledger = scrittureDi(scritture, 'meal_slot_storno', 'upsert');
    expect(ledger).toHaveLength(1); // solo il pollo: l'olio è classe stima
    expect(ledger[0]!.args[0]).toMatchObject({ meal_slot_id: 's-1', ingredient_id: 'i-pollo', delta: 200 });

    const pantry = scrittureDi(scritture, 'pantry_state', 'upsert');
    expect(pantry).toHaveLength(1);
    expect(pantry[0]!.args[0]).toMatchObject({ ingredient_id: 'i-pollo', residuo: 240 });
  });

  it('saltato→casa inverte: cumulo a zero cancella la riga di ledger, il residuo scende clampato', async () => {
    const { sb, scritture } = creaClientMock(risolutore({
      riga: rigaSlot('saltato'), statoWeek: 'chiusa',
      ledger: [{ ingredient_id: 'i-pollo', delta: 200 }],
      pantry: [{ ingredient_id: 'i-pollo', residuo: 150 }],
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { stato: 'casa' }, 'checkin');

    expect(scrittureDi(scritture, 'meal_slot_storno', 'delete')).toHaveLength(1);
    expect(scrittureDi(scritture, 'meal_slot_storno', 'upsert')).toHaveLength(0);
    const pantry = scrittureDi(scritture, 'pantry_state', 'upsert');
    // 150 − 200 clampato a 0: il ledger registra il calcolato, l'applicazione clampa.
    expect(pantry[0]!.args[0]).toMatchObject({ ingredient_id: 'i-pollo', residuo: 0 });
  });

  it('cambio piatto: storna il vecchio e addebita il nuovo', async () => {
    const { sb, scritture } = creaClientMock(risolutore({
      riga: rigaSlot('casa', 'd-1'), statoWeek: 'chiusa',
      pantry: [{ ingredient_id: 'i-pollo', residuo: 40 }],
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { dishId: 'd-2' }, 'checkin');

    const ledger = scrittureDi(scritture, 'meal_slot_storno', 'upsert');
    const perIngrediente = new Map(ledger.map((c) => {
      const r = c.args[0] as Record<string, unknown>;
      return [r.ingredient_id, r.delta];
    }));
    expect(perIngrediente.get('i-pollo')).toBe(200); // storno del piatto vecchio
    expect(perIngrediente.get('i-riso')).toBe(-100); // addebito del nuovo

    const pantry = scrittureDi(scritture, 'pantry_state', 'upsert');
    const residui = new Map(pantry.map((c) => {
      const r = c.args[0] as Record<string, unknown>;
      return [r.ingredient_id, r.residuo];
    }));
    expect(residui.get('i-pollo')).toBe(240);
    expect(residui.get('i-riso')).toBe(0); // nessuna riga pantry: 0 − 100 clampato
  });

  it('una fonte troppo debole non cambia lo stato, quindi niente storno', async () => {
    const riga = { ...rigaSlot('casa'), fonte_stato: 'checkin' };
    const { sb, scritture } = creaClientMock(risolutore({ riga, statoWeek: 'confermata' }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { stato: 'saltato' }, 'default');

    expect(scritture['meal_slot_storno']).toBeUndefined();
    expect(scritture['pantry_state']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/data/__tests__/settimana.aggiornaSlot.test.ts`
Expected: FAIL — i test bozza/fonte-debole possono già passare (nessuna scrittura oggi), gli altri tre falliscono: `aggiornaSlot` non scrive ancora ledger né pantry.

- [ ] **Step 3: Estendi `aggiornaSlot`**

In `src/data/settimana.ts`: aggiungi in testa al file gli import mancanti:

```ts
import { consumoSlot, deltaStorno } from '@/domain/storno';
```

Poi dentro `aggiornaSlot`:

**(a)** Cambia la select dello slot per caricare anche le scelte (servono a `consumoSlot`: senza, un piatto a componenti verrebbe stornato sull'opzione di default invece che su quella scelta):

```ts
  const { data: riga, error } = await sb
    .from('meal_slot')
    .select('*, meal_slot_choice(componente_id, option_id, fonte)')
    .eq('id', slotId)
    .eq('user_id', userId)
    .single();
  if (error) throw error;

  const attuale: MealSlot = {
    ...aMealSlot(riga),
    scelte: Object.fromEntries(
      ((riga.meal_slot_choice ?? []) as Record<string, unknown>[]).map((c) => [
        String(c.componente_id),
        { opzioneId: String(c.option_id), fonte: c.fonte as Scelta['fonte'] },
      ]),
    ),
  };
```

(serve `import type { MealSlot }` nell'import dei tipi in testa al file, se non già presente). Estrai anche il flag del cambio piatto PRIMA del blocco delete esistente, e usalo sia lì sia più sotto:

```ts
  const cambioPiatto = patch.dishId !== undefined && patch.dishId !== attuale.dishId;
  if (cambioPiatto) {
    // ... blocco delete di meal_slot_choice esistente, invariato ...
  }
```

**(b)** In coda alla funzione, DOPO l'upsert di `patch.scelte` esistente, aggiungi il blocco storno:

```ts
  // ── Il ledger degli storni (spec spunta-pasti §5.1) ─────────────────────
  // Da quando la lista è generata, ogni mutazione che cambia il consumo dello
  // slot scrive la differenza nel ledger e la applica al residuo. Prima
  // (settimana bozza) il toggle è pianificazione: ci pensa costruisciLista,
  // e accreditare qui sarebbe un doppio credito.
  const { data: week, error: eWeek } = await sb
    .from('week')
    .select('stato')
    .eq('id', String(riga.week_id))
    .eq('user_id', userId)
    .single();
  if (eWeek) throw eWeek;
  if (week.stato === 'bozza') return;

  // Lo slot come le scritture sopra lo hanno lasciato: stato passato dal
  // cancello delle fonti (se troppo debole, aggiornamento.stato è assente e
  // lo stato resta quello di prima), piatto dal patch, scelte con la stessa
  // regola della scrittura (cambio piatto = si riparte dal patch; altrimenti
  // merge sulle esistenti).
  const statoDopo = (aggiornamento.stato as StatoSlot | undefined) ?? attuale.stato;
  const dishIdDopo = patch.dishId !== undefined ? patch.dishId : attuale.dishId;
  const scelteDopo = cambioPiatto ? (patch.scelte ?? {}) : { ...attuale.scelte, ...(patch.scelte ?? {}) };

  const [repertorio, ingredienti, impostazioni] = await Promise.all([
    leggiRepertorio(), leggiIngredienti(), leggiImpostazioni(),
  ]);
  const piattoPerId = new Map(repertorio.map((d) => [d.id, d]));

  // consumoSlot può lanciare (ingrediente sparito, opzione rimossa): succede
  // QUI, prima di ogni scrittura di ledger/pantry — o il calcolo è completo
  // o non si applica nulla (spec §7).
  const prima = consumoSlot({
    slot: attuale,
    dish: attuale.dishId ? piattoPerId.get(attuale.dishId) ?? null : null,
    ingredients: ingredienti,
    moltiplicatorePorzioni: impostazioni.moltiplicatorePorzioni,
  });
  const dopo = consumoSlot({
    slot: { ...attuale, stato: statoDopo, dishId: dishIdDopo, scelte: scelteDopo },
    dish: dishIdDopo ? piattoPerId.get(dishIdDopo) ?? null : null,
    ingredients: ingredienti,
    moltiplicatorePorzioni: impostazioni.moltiplicatorePorzioni,
  });
  const deltas = deltaStorno(prima, dopo);
  if (deltas.length === 0) return;

  // Una riga CUMULATIVA per (slot, ingrediente): leggi-somma-scrivi, cumulo a
  // zero = riga cancellata. Non è atomico, ma l'app è mono-utente e il danno
  // peggiore (doppio tap ravvicinato) è uno storno doppio, visibile in
  // Dispensa e invertibile con "Torna al piano" (spec §7).
  const { data: righeLedger, error: eLedger } = await sb
    .from('meal_slot_storno')
    .select('ingredient_id, delta')
    .eq('meal_slot_id', slotId);
  if (eLedger) throw eLedger;
  const cumuloEsistente = new Map(
    (righeLedger ?? []).map((r) => [String(r.ingredient_id), Number(r.delta)]),
  );

  for (const d of deltas) {
    const cumulo = (cumuloEsistente.get(d.ingredientId) ?? 0) + d.delta;
    if (cumulo === 0) {
      const { error: eDel } = await sb
        .from('meal_slot_storno')
        .delete()
        .eq('meal_slot_id', slotId)
        .eq('ingredient_id', d.ingredientId);
      if (eDel) throw eDel;
    } else {
      const { error: eUps } = await sb.from('meal_slot_storno').upsert(
        {
          user_id: userId, meal_slot_id: slotId, ingredient_id: d.ingredientId,
          delta: cumulo, aggiornato_il: new Date().toISOString(),
        },
        { onConflict: 'meal_slot_id,ingredient_id' },
      );
      if (eUps) throw eUps;
    }
  }

  // L'applicazione al residuo: upsert per lo stesso motivo di chiudiSpesa
  // (I1: la riga può non esistere), clamp a zero come nuovoResiduo.
  const { data: righePantry, error: ePantry } = await sb
    .from('pantry_state')
    .select('ingredient_id, residuo')
    .in('ingredient_id', deltas.map((d) => d.ingredientId));
  if (ePantry) throw ePantry;
  const residuoPerId = new Map(
    (righePantry ?? []).map((r) => [String(r.ingredient_id), Number(r.residuo)]),
  );

  for (const d of deltas) {
    const residuo = Math.max(0, (residuoPerId.get(d.ingredientId) ?? 0) + d.delta);
    const { error: eUps } = await sb.from('pantry_state').upsert(
      { ingredient_id: d.ingredientId, user_id: userId, residuo },
      { onConflict: 'ingredient_id' },
    );
    if (eUps) throw eUps;
  }
```

Aggiorna anche il commento di testa di `aggiornaSlot` con un paragrafo che rimanda alla spec spunta-pasti §5.1 per l'ordine "scritture slot → ledger → pantry" (un fallimento a metà degenera in uno storno visibile e correggibile dalla Dispensa, mai in uno stato slot incoerente).

- [ ] **Step 4: Verifica che passino**

Run: `npx vitest run src/data/__tests__/settimana.aggiornaSlot.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Suite completa verde**

Run: `npx vitest run`
Expected: tutti i test passano (la select estesa con `meal_slot_choice` non rompe i mock esistenti: il modulo è mockato per intero nei test delle pagine).

- [ ] **Step 6: Commit**

```bash
git add src/data/settimana.ts src/data/__tests__/settimana.aggiornaSlot.test.ts
git commit -m "feat(data): aggiornaSlot scrive il ledger degli storni e li applica al residuo"
```

---

### Task 5: `chiudiSpesa` riapplica gli storni della settimana

**Files:**
- Modify: `src/data/lista.ts:355-453` (chiudiSpesa)
- Test: `src/data/__tests__/lista.chiudiSpesa.test.ts` (aggiunte)

**Interfaces:**
- Consumes: tabella `meal_slot_storno` (Task 1). Nessuna nuova esportazione.

- [ ] **Step 1: Scrivi i test (falliranno)**

In `lista.chiudiSpesa.test.ts`, il risolutore `risolviSettimanaConfermata` deve rispondere anche alle nuove letture. Sostituiscilo con:

```ts
/**
 * Risolve week (select) come confermata, shopping_list (select) con le liste
 * passate e meal_slot_storno (select) con gli storni passati. Il default []
 * riproduce il mondo senza spunte: i test pre-esistenti non cambiano di una
 * virgola.
 */
function risolviSettimanaConfermata(
  liste: unknown[],
  storni: Array<{ ingredient_id: string; delta: number }> = [],
) {
  return (tabella: string, chiamate: Chiamata[]) => {
    const legge = chiamate.some((c) => c.metodo === 'select');
    if (tabella === 'week' && legge) {
      return { data: { stato: 'confermata' }, error: null };
    }
    if (tabella === 'shopping_list' && legge) {
      return { data: liste, error: null };
    }
    if (tabella === 'meal_slot_storno' && legge) {
      return { data: storni, error: null };
    }
    return { data: null, error: null };
  };
}
```

Poi aggiungi in coda al `describe('chiudiSpesa')`:

```ts
  it('riapplica gli storni della settimana sopra il residuo congelato', async () => {
    // Lo yogurt ha uno storno di +100 (una colazione saltata prima della
    // chiusura): la sovrascrittura assoluta lo cancellerebbe, la
    // riapplicazione lo somma — 50 + 1000 − 750 + 100 = 400 (spec §5.2).
    const { sb, scritture } = creaClientMock(risolviSettimanaConfermata(
      LISTE_LETTURA,
      [{ ingredient_id: 'ing-yogurt', delta: 100 }],
    ));
    vi.mocked(client).mockReturnValue(sb as never);

    await chiudiSpesa('week-1');

    expect(patchPantry(scritture['pantry_state'] ?? [], 'ing-yogurt'))
      .toEqual({ residuo: 400, ultimo_acquisto: '2026-09-06' });
  });

  it('uno storno su un ingrediente fuori lista NON si riapplica: il residuo vivo lo ha già', async () => {
    // Il piatto sostituito ha addebitato un ingrediente mai entrato in lista:
    // il delta è stato applicato al residuo vivo al momento del tap, e la
    // chiusura non sovrascrive quella riga. Riapplicarlo qui lo conterebbe
    // due volte (spec §5.2).
    const { sb, scritture } = creaClientMock(risolviSettimanaConfermata(
      LISTE_LETTURA,
      [{ ingredient_id: 'ing-fagioli', delta: -30 }],
    ));
    vi.mocked(client).mockReturnValue(sb as never);

    await chiudiSpesa('week-1');

    expect(patchPantry(scritture['pantry_state'] ?? [], 'ing-fagioli')).toBeUndefined();
  });

  it('la riapplicazione clampa a zero, come ogni applicazione di storno', async () => {
    const { sb, scritture } = creaClientMock(risolviSettimanaConfermata(
      LISTE_LETTURA,
      [{ ingredient_id: 'ing-pasta', delta: -700 }],
    ));
    vi.mocked(client).mockReturnValue(sb as never);

    await chiudiSpesa('week-1');

    // Pasta congelata: 100 + 0 − 500 → 0; storno −700 → max(0, 0 − 700) = 0.
    expect(patchPantry(scritture['pantry_state'] ?? [], 'ing-pasta'))
      .toEqual({ residuo: 0 });
  });
```

Nota per l'implementatore: `patchPantry` restituisce `undefined` quando nessun upsert su `pantry_state` riguarda quell'ingrediente — è l'asserzione del secondo test.

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/data/__tests__/lista.chiudiSpesa.test.ts`
Expected: i 3 test nuovi FAIL, i pre-esistenti PASS.

- [ ] **Step 3: Implementa in `chiudiSpesa`**

In `src/data/lista.ts`, subito DOPO `const aggiornamenti = calcolaChiusura({ voci, oggi });` aggiungi:

```ts
  // ── Riapplicazione degli storni (spec spunta-pasti §5.2) ────────────────
  // La sovrascrittura qui sotto è ASSOLUTA, dai dati congelati: uno storno
  // registrato fra la generazione della lista e questa chiusura (salti il
  // pranzo di lunedì, spesa la sera) verrebbe cancellato. Si sommano quindi
  // gli storni degli slot della settimana al residuo in scrittura — ma SOLO
  // per gli ingredienti che la chiusura sovrascrive: uno storno su un
  // ingrediente fuori dalla lista congelata è già nel residuo vivo dal
  // momento del tap, e l'overwrite non lo tocca — riapplicarlo lo conterebbe
  // due volte. La riapplicazione compensa esattamente ciò che l'overwrite
  // cancella, niente di più; il guard di idempotenza la fa girare una volta.
  const { data: righeStorno, error: eStorni } = await sb
    .from('meal_slot_storno')
    .select('ingredient_id, delta, meal_slot!inner(week_id)')
    .eq('meal_slot.week_id', weekId);
  if (eStorni) throw eStorni;
  const stornoPerIngrediente = new Map<string, number>();
  for (const r of (righeStorno ?? []) as Array<Record<string, unknown>>) {
    const id = String(r.ingredient_id);
    stornoPerIngrediente.set(id, (stornoPerIngrediente.get(id) ?? 0) + Number(r.delta));
  }
```

Poi modifica la costruzione di `scrittureDispensa` esistente: dentro il `.map`, sostituisci la riga `if (a.residuo !== null) patch.residuo = a.residuo;` con:

```ts
      if (a.residuo !== null) {
        patch.residuo = Math.max(0, a.residuo + (stornoPerIngrediente.get(a.ingredientId) ?? 0));
      }
```

- [ ] **Step 4: Verifica che passino**

Run: `npx vitest run src/data/__tests__/lista.chiudiSpesa.test.ts`
Expected: PASS, nuovi e pre-esistenti.

- [ ] **Step 5: Suite completa verde + commit**

Run: `npx vitest run` — tutti verdi. Poi:

```bash
git add src/data/lista.ts src/data/__tests__/lista.chiudiSpesa.test.ts
git commit -m "feat(data): chiudiSpesa riapplica gli storni sopra il residuo congelato"
```

---

### Task 6: `RigaPasto` a stati + `FoglioAzioniPasto`

**Files:**
- Modify: `src/components/RigaPasto.tsx`
- Modify: `src/app/(app)/settimana/page.tsx:282` (solo l'adattamento della prop, il resto è Task 7)
- Create: `src/components/FoglioAzioniPasto.tsx`
- Test: `src/components/__tests__/FoglioAzioniPasto.test.tsx` (create)

**Interfaces:**
- Produces (il Task 7 li usa con queste firme esatte):
  - `RigaPasto`: la prop `aCasa: boolean` diventa `stato: StatoSlot`; nuova prop opzionale `onApriAzioni?: () => void` — se presente, la zona destra è un bottone `aria-label={'Azioni per ' + nomePasto}` che la invoca al posto del Link a `hrefScegli`.
  - `FoglioAzioniPasto` con props `{ nomePasto: string; spuntato: boolean; hrefScegli: string; onSaltato: () => void; onMangiatoAltro: () => void; onTornaAlPiano: () => void; onChiudi: () => void }`.

- [ ] **Step 1: Scrivi i test del foglio (falliranno)**

`src/components/__tests__/FoglioAzioniPasto.test.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FoglioAzioniPasto } from '../FoglioAzioniPasto';

function renderFoglio(spuntato: boolean) {
  const onSaltato = vi.fn();
  const onMangiatoAltro = vi.fn();
  const onTornaAlPiano = vi.fn();
  const onChiudi = vi.fn();
  render(
    <FoglioAzioniPasto
      nomePasto="Cena"
      spuntato={spuntato}
      hrefScegli="/settimana/2026-08-26/sd-3/scegli"
      onSaltato={onSaltato}
      onMangiatoAltro={onMangiatoAltro}
      onTornaAlPiano={onTornaAlPiano}
      onChiudi={onChiudi}
    />,
  );
  return { onSaltato, onMangiatoAltro, onTornaAlPiano, onChiudi };
}

describe('FoglioAzioniPasto', () => {
  it('mostra le tre azioni; "Torna al piano" solo se lo slot è già spuntato', () => {
    renderFoglio(false);
    expect(screen.getByRole('button', { name: 'Saltato' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ho mangiato altro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ho mangiato un altro piatto' }))
      .toHaveAttribute('href', '/settimana/2026-08-26/sd-3/scegli');
    expect(screen.queryByRole('button', { name: 'Torna al piano' })).not.toBeInTheDocument();
  });

  it('su uno slot spuntato compare "Torna al piano" e invoca il suo handler', () => {
    const { onTornaAlPiano } = renderFoglio(true);
    fireEvent.click(screen.getByRole('button', { name: 'Torna al piano' }));
    expect(onTornaAlPiano).toHaveBeenCalledTimes(1);
  });

  it('le azioni invocano i rispettivi handler', () => {
    const { onSaltato, onMangiatoAltro } = renderFoglio(false);
    fireEvent.click(screen.getByRole('button', { name: 'Saltato' }));
    expect(onSaltato).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Ho mangiato altro' }));
    expect(onMangiatoAltro).toHaveBeenCalledTimes(1);
  });

  it('il tap sul fondale chiude', () => {
    const { onChiudi } = renderFoglio(false);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onChiudi).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/components/__tests__/FoglioAzioniPasto.test.tsx`
Expected: FAIL — componente inesistente.

- [ ] **Step 3: Implementa `src/components/FoglioAzioniPasto.tsx`**

```tsx
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

interface Props {
  /** Nome del meal_slot_def, es. "Cena": intitola il foglio. */
  nomePasto: string;
  /** true se lo slot è già 'saltato' o 'sostituito': mostra "Torna al piano". */
  spuntato: boolean;
  /** "Ho mangiato un altro piatto" porta a Scegli: il cambio di dishId passa da aggiornaSlot, che genera da solo storno e addebito. */
  hrefScegli: string;
  onSaltato: () => void;
  onMangiatoAltro: () => void;
  onTornaAlPiano: () => void;
  onChiudi: () => void;
}

const stileVoce = {
  width: '100%',
  minHeight: 50,
  borderRadius: 15,
  background: 'rgba(20,22,58,0.04)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 15.5,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: 'var(--ink)',
} as const;

function Voce({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={stileVoce}>
      {children}
    </button>
  );
}

/**
 * L'action sheet della spunta pasti (spec spunta-pasti §6): si apre dalla zona
 * destra di RigaPasto per i giorni ≤ oggi a settimana non-bozza. Il default
 * resta "mangiato come da piano" — qui si registrano solo le eccezioni, e per
 * questo non esiste una voce "Fatto".
 */
export function FoglioAzioniPasto({
  nomePasto, spuntato, hrefScegli, onSaltato, onMangiatoAltro, onTornaAlPiano, onChiudi,
}: Props) {
  return (
    <div
      role="dialog"
      aria-label={`Com'è andata: ${nomePasto}`}
      onClick={onChiudi}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(20,22,58,0.35)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', background: '#FFFFFF',
          borderRadius: '22px 22px 0 0', padding: '16px 16px 26px',
          display: 'flex', flexDirection: 'column', gap: 9,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.13em', color: '#8A8A96', padding: '0 4px 4px',
          }}
        >
          COM&rsquo;È ANDATA — {nomePasto.toUpperCase()}
        </span>
        <Voce onClick={onSaltato}>Saltato</Voce>
        <Voce onClick={onMangiatoAltro}>Ho mangiato altro</Voce>
        <Link href={hrefScegli} style={stileVoce}>
          Ho mangiato un altro piatto
        </Link>
        {spuntato && <Voce onClick={onTornaAlPiano}>Torna al piano</Voce>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verifica che passino**

Run: `npx vitest run src/components/__tests__/FoglioAzioniPasto.test.tsx`
Expected: PASS (4 test).

- [ ] **Step 5: `RigaPasto` a stati**

In `src/components/RigaPasto.tsx`:

**(a)** Import e props:

```tsx
import type { AreaId, StatoSlot } from '@/domain/types';
```

Nella `interface Props` sostituisci `/** true se lo stato dello slot è 'casa'. */ aCasa: boolean;` con:

```tsx
  /** Stato dello slot: pilota etichetta e accensione della riga. */
  stato: StatoSlot;
```

e aggiungi dopo `hrefScegli: string;`:

```tsx
  /**
   * Se presente, la zona destra apre l'action sheet della spunta invece di
   * navigare a Scegli (giorni ≤ oggi a settimana non-bozza, spec §6).
   */
  onApriAzioni?: () => void;
```

**(b)** Nel corpo del componente, aggiorna la destructuring (`stato` e `onApriAzioni` al posto di `aCasa`) e aggiungi in testa:

```tsx
  const aCasa = stato === 'casa';
```

Tutti gli stili esistenti basati su `aCasa` restano identici (le righe saltate/sostituite ereditano lo stile spento di "Fuori casa", spec §6).

**(c)** L'etichetta della riga spenta non è più fissa. Sostituisci la riga
`{aCasa ? (nomePiatto ?? 'Nessun piatto assegnato') : 'Fuori casa'}` con:

```tsx
          {aCasa ? (nomePiatto ?? 'Nessun piatto assegnato') : ETICHETTA_SPENTO[stato as Exclude<StatoSlot, 'casa'>]}
```

(il cast serve perché il narrowing di `stato` non attraversa la costante `aCasa`)

e aggiungi a livello di modulo (fuori dal componente):

```tsx
/** Cosa dice la riga spenta, per ciascun modo di non mangiare il piatto. */
const ETICHETTA_SPENTO: Record<Exclude<StatoSlot, 'casa'>, string> = {
  fuori: 'Fuori casa',
  saltato: 'Saltato',
  sostituito: 'Ho mangiato altro',
};
```

**(d)** Zona destra condizionale — sostituisci l'intero `<Link ...>...</Link>` finale con:

```tsx
      {onApriAzioni ? (
        <button
          type="button"
          onClick={onApriAzioni}
          aria-label={`Azioni per ${nomePasto}`}
          style={{
            width: 44,
            alignSelf: 'stretch',
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="3" r="1.5" fill="#C4C4CE" />
            <circle cx="8" cy="8" r="1.5" fill="#C4C4CE" />
            <circle cx="8" cy="13" r="1.5" fill="#C4C4CE" />
          </svg>
        </button>
      ) : (
        <Link
          href={hrefScegli}
          aria-label={`Scegli il piatto per ${nomePasto}`}
          style={{
            width: 44,
            alignSelf: 'stretch',
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M6 3.2 10.4 8 6 12.8" stroke="#C4C4CE" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
```

**(e)** Adatta l'unico chiamante per tenere verde la build: in `src/app/(app)/settimana/page.tsx` riga 282 sostituisci `aCasa={slot.stato === 'casa'}` con `stato={slot.stato}` (il collegamento di `onApriAzioni` è del Task 7).

- [ ] **Step 6: Suite completa verde + commit**

Run: `npx vitest run` — tutti verdi (i test della pagina Settimana passano attraverso le nuove props senza asserzioni sul vecchio nome).

```bash
git add src/components/RigaPasto.tsx src/components/FoglioAzioniPasto.tsx src/components/__tests__/FoglioAzioniPasto.test.tsx "src/app/(app)/settimana/page.tsx"
git commit -m "feat(ui): RigaPasto a stati e il foglio azioni della spunta"
```

---

### Task 7: Pagina Settimana — spunte e settimana precedente

**Files:**
- Modify: `src/app/(app)/settimana/page.tsx`
- Modify: `src/app/(app)/settimana/__tests__/page.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: `leggiSettimana` (Task 3), `aggiornaSlot` (firma invariata, Task 4), `FoglioAzioniPasto` e `RigaPasto` (Task 6), `sommaGiorni` da `@/domain/date`.

- [ ] **Step 1: Scrivi i test (falliranno)**

In `src/app/(app)/settimana/__tests__/page.test.tsx`:

**(a)** Nella factory `vi.mock('@/data/settimana', ...)` aggiungi `leggiSettimana: vi.fn(),` e aggiungi `leggiSettimana` all'import da `@/data/settimana`. Aggiungi `sommaGiorni` all'import da `@/domain/date`.

**(b)** In coda al file aggiungi (usa gli helper e i fixture già presenti nel file — `OGGI`, `LUNEDI`, `GIORNI`, `SLOT_DEFS`, `buildSlots`, `ORDINE_AREE_TEST` e la funzione con cui i test esistenti preparano i mock e renderizzano; se esiste un helper tipo `montaPagina`/`setupMocks`, riusalo, altrimenti replica il beforeEach dei test esistenti):

```tsx
describe('spunta pasti', () => {
  it('a settimana confermata la zona destra di oggi apre il foglio e "Saltato" spunta lo slot', async () => {
    const settimana: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'confermata', slots: buildSlots() };
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(settimana);
    vi.mocked(aggiornaSlot).mockResolvedValue(undefined);
    // ...stessi mock di repertorio/slotDefs/impostazioni dei test esistenti...

    render(<StrictMode><Settimana /></StrictMode>);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByRole('button', { name: 'Azioni per Cena' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Saltato' }));

    await waitFor(() => {
      expect(aggiornaSlot).toHaveBeenCalledWith(`${OGGI}:sd-3`, { stato: 'saltato' }, 'checkin');
    });
    expect(screen.getByText('Saltato')).toBeInTheDocument();
  });

  it('a settimana bozza la zona destra resta il link a Scegli', async () => {
    const settimana: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'bozza', slots: buildSlots() };
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(settimana);
    // ...stessi mock dei test esistenti...

    render(<StrictMode><Settimana /></StrictMode>);
    await screen.findByText('Yogurt e frutta');

    expect(screen.queryByRole('button', { name: 'Azioni per Cena' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Scegli il piatto per Cena' })).toBeInTheDocument();
  });
});

describe('settimana precedente', () => {
  const LUNEDI_PREC = sommaGiorni(LUNEDI, -7);
  const GIORNI_PREC = giorniDellaSettimana(LUNEDI_PREC);

  function slotsPrecedenti(): MealSlot[] {
    return GIORNI_PREC.map((data) => ({
      id: `${data}:sd-1`, data, slotDefId: 'sd-1', stato: 'casa' as const,
      dishId: DISH_COLAZIONE.id, fonteStato: 'default' as const, scelte: {},
    }));
  }

  it('il link carica la settimana di sette giorni fa, senza bottone di conferma', async () => {
    const corrente: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'confermata', slots: buildSlots() };
    const precedente: SettimanaCorrente = { id: 'w-0', dataInizio: LUNEDI_PREC, stato: 'chiusa', slots: slotsPrecedenti() };
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(corrente);
    vi.mocked(leggiSettimana).mockResolvedValue(precedente);
    // ...stessi mock dei test esistenti...

    render(<StrictMode><Settimana /></StrictMode>);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByRole('button', { name: '‹ SETTIMANA SCORSA' }));

    await waitFor(() => expect(leggiSettimana).toHaveBeenCalledWith(LUNEDI_PREC));
    await screen.findByRole('button', { name: 'SETTIMANA CORRENTE ›' });
    expect(screen.queryByText('CONFERMA E CREA LA LISTA')).not.toBeInTheDocument();
    expect(screen.queryByText('VAI ALLA LISTA')).not.toBeInTheDocument();
    // Tutti i giorni della precedente sono passati: la zona destra è ad azioni.
    expect(screen.getAllByRole('button', { name: 'Azioni per Colazione' }).length).toBeGreaterThan(0);
  });

  it('precedente mai creata: stato vuoto, nessuna creaSettimana', async () => {
    const corrente: SettimanaCorrente = { id: 'w-1', dataInizio: LUNEDI, stato: 'confermata', slots: buildSlots() };
    vi.mocked(leggiSettimanaCorrente).mockResolvedValue(corrente);
    vi.mocked(leggiSettimana).mockResolvedValue(null);
    // ...stessi mock dei test esistenti...

    render(<StrictMode><Settimana /></StrictMode>);
    await screen.findByText('Yogurt e frutta');

    fireEvent.click(screen.getByRole('button', { name: '‹ SETTIMANA SCORSA' }));

    await screen.findByText('Questa settimana non è mai stata creata: non c\'è nulla da correggere.');
    expect(creaSettimana).not.toHaveBeenCalled();
  });
});
```

(Adatta i commenti `...stessi mock...` replicando le righe con cui i test esistenti preparano `leggiRepertorio`, `leggiIngredienti`, `leggiSlotDefs`, `leggiImpostazioni`.)

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run "src/app/(app)/settimana/__tests__/page.test.tsx"`
Expected: FAIL sui 4 test nuovi, PASS sui pre-esistenti.

- [ ] **Step 3: Implementa la pagina**

In `src/app/(app)/settimana/page.tsx`:

**(a)** Import: aggiungi `leggiSettimana` all'import da `@/data/settimana`, `sommaGiorni` all'import da `@/domain/date`, `FoglioAzioniPasto` da `@/components/FoglioAzioniPasto`, e `MealSlotDef` è già importato dai tipi.

**(b)** Stato nuovo, accanto agli useState esistenti:

```tsx
  // 'corrente' | 'precedente': la spunta arriva fino alla settimana scorsa
  // (spec spunta-pasti §6) — il lunedì "ieri" è domenica, e senza la
  // precedente il weekend sarebbe incorreggibile.
  const [vista, setVista] = useState<'corrente' | 'precedente'>('corrente');
  const [precedenteVuota, setPrecedenteVuota] = useState(false);
  const [foglio, setFoglio] = useState<{ slot: MealSlot; def: MealSlotDef } | null>(null);
```

**(c)** L'effetto di caricamento diventa dipendente da `vista` (deps `[vista]`) e azzera lo stato a ogni cambio. Struttura del nuovo `carica()` — il ramo corrente è il codice esistente, invariato:

```tsx
  useEffect(() => {
    let vivo = true;
    setDati(null);
    setPrecedenteVuota(false);
    setFoglio(null);

    async function carica() {
      try {
        let corrente: Awaited<ReturnType<typeof leggiSettimanaCorrente>> = null;
        if (vista === 'precedente') {
          // Mai creaSettimana per il passato: se non esiste, non c'è nulla
          // da correggere (spec §6).
          corrente = await leggiSettimana(sommaGiorni(lunediDi(oggiIso()), -7));
          if (!corrente) {
            if (vivo) setPrecedenteVuota(true);
            return;
          }
        } else {
          corrente = await leggiSettimanaCorrente();
          if (!corrente) {
            // ... ramo di creazione esistente, INVARIATO (creazioneInCorsoRef ecc.) ...
          }
          if (!corrente) throw new Error('Settimana non disponibile dopo la creazione.');
        }

        // ... letture parallele e setDati esistenti, INVARIATI ...

        const giorni = giorniDellaSettimana(corrente.dataInizio);
        if (vista === 'precedente') {
          // Si arriva qui quasi sempre per il weekend appena passato.
          setSelezionato(6);
        } else {
          const indiceOggi = giorni.indexOf(oggiIso());
          setSelezionato(indiceOggi >= 0 ? indiceOggi : 0);
        }
      } catch (errore) {
        console.error('settimana: caricamento fallito.', errore);
        if (vivo) setErroreCaricamento('Non riusciamo a caricare la settimana. Riprova più tardi.');
      }
    }

    carica();
    return () => {
      vivo = false;
    };
  }, [vista]);
```

**(d)** Ramo di render per la precedente vuota, PRIMA di `if (!dati)`:

```tsx
  if (precedenteVuota) {
    return (
      <Cornice>
        <p style={{ margin: '20px 18px', color: 'var(--sec)' }}>
          Questa settimana non è mai stata creata: non c&rsquo;è nulla da correggere.
        </p>
        <div style={{ padding: '0 16px' }}>
          <button
            type="button"
            onClick={() => setVista('corrente')}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.11em', color: 'var(--ter)', padding: '4px 2px',
            }}
          >
            SETTIMANA CORRENTE ›
          </button>
        </div>
      </Cornice>
    );
  }
```

**(e)** Handler della spunta, accanto a `toggleStato` (stesso pattern ottimistico):

```tsx
  /**
   * La spunta: saltato / sostituito / ritorno a casa, fonte 'checkin'.
   * Ottimistico come toggleStato; aggiornaSlot scrive da solo ledger e
   * residuo quando la settimana non è bozza (spec spunta-pasti §5.1).
   */
  async function spuntaStato(slot: MealSlot, stato: StatoSlot) {
    setFoglio(null);
    const risultato = applicaStato(slot, stato, 'checkin');
    setErroreCheckin(null);
    aggiornaSlotLocale(risultato);
    try {
      await aggiornaSlot(slot.id, { stato }, 'checkin');
    } catch (errore) {
      console.error('settimana: spunta fallita.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
    }
  }
```

**(f)** Il selettore di vista, nel JSX subito sopra il blocco della StrisciaGiorni:

```tsx
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 16px 0' }}>
        <button
          type="button"
          onClick={() => setVista((v) => (v === 'corrente' ? 'precedente' : 'corrente'))}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.11em', color: 'var(--ter)', padding: '4px 2px',
          }}
        >
          {vista === 'corrente' ? '‹ SETTIMANA SCORSA' : 'SETTIMANA CORRENTE ›'}
        </button>
      </div>
```

**(g)** Le righe pasto — nel `.map` esistente, prima del `return`:

```tsx
            const spuntabile = settimana.stato !== 'bozza' && dataSelezionata <= oggi;
```

e nel `<RigaPasto ...>` aggiungi:

```tsx
                onApriAzioni={spuntabile ? () => setFoglio({ slot, def }) : undefined}
```

(la prop `stato={slot.stato}` è già stata adattata nel Task 6).

**(h)** Il blocco finale con contatore + bottone conferma va reso solo per la corrente: avvolgilo in `{vista === 'corrente' && ( ... )}`.

**(i)** Il foglio, in fondo al JSX di `Cornice`, prima della chiusura:

```tsx
      {foglio && (
        <FoglioAzioniPasto
          nomePasto={foglio.def.nome}
          spuntato={foglio.slot.stato === 'saltato' || foglio.slot.stato === 'sostituito'}
          hrefScegli={`/settimana/${foglio.slot.data}/${foglio.def.id}/scegli`}
          onSaltato={() => spuntaStato(foglio.slot, 'saltato')}
          onMangiatoAltro={() => spuntaStato(foglio.slot, 'sostituito')}
          onTornaAlPiano={() => spuntaStato(foglio.slot, 'casa')}
          onChiudi={() => setFoglio(null)}
        />
      )}
```

- [ ] **Step 4: Verifica che passino**

Run: `npx vitest run "src/app/(app)/settimana/__tests__/page.test.tsx"`
Expected: PASS, nuovi e pre-esistenti.

- [ ] **Step 5: README**

In `README.md`, dopo la sezione sull'import della dieta, aggiungi:

```markdown
## Spunta pasti

Il piano assume che ogni pasto avvenga com'è scritto; la spunta corregge le
eccezioni. Dalla Settimana, per i giorni già passati (e per la settimana
precedente, dal link "‹ settimana scorsa"): **Saltato**, **Ho mangiato
altro**, oppure **Ho mangiato un altro piatto** scegliendolo dal repertorio.
Un pasto saltato riporta subito i suoi ingredienti nel residuo; un piatto
sostituito storna il previsto e addebita il sostituto. Il default resta
"mangiato come da piano": si spuntano solo le eccezioni, niente streak né
diari.
```

- [ ] **Step 6: Suite completa verde + commit**

Run: `npx vitest run` — tutti verdi. Poi:

```bash
git add "src/app/(app)/settimana/page.tsx" "src/app/(app)/settimana/__tests__/page.test.tsx" README.md
git commit -m "feat(ui): la spunta pasti in Settimana, e la settimana precedente correggibile"
```

---

## Dopo l'ultimo task (fuori dal perimetro dei subagent)

1. Review finale whole-branch (modello più capace).
2. **Gate di Andrea**: applicazione della migrazione 0008 in produzione + giro E2E in locale.
3. **Gate di Andrea**: merge su main + deploy.
