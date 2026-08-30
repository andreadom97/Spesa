# Meal Prepping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Meal prepping collegato al residuo: porzioni extra quando si cucina, slot coperti da porzioni pronte, lotti con decadimento nella sezione "Pronti" della Dispensa.

**Architecture:** Una formula sola — `fattoreConsumo(slot) = (casa && !daPronti ? 1 : 0) + porzioniPreparate` — letta da `consumoSlot` (ledger P2) e da `costruisciLista`, così lista e residuo restano coerenti gratis. Due campi nuovi su `meal_slot`, una tabella `porzione_pronta` a lotti (fresco 3 giorni, congelato 90), scritture dei Pronti dentro `aggiornaSlot` (ordine: slot → Pronti → ledger → pantry, con i Pronti PRIMA del check bozza: la pianificazione crea lotti anche a settimana bozza). UI: foglio azioni esteso a tutti i giorni con sezione MEAL PREP, sezione "Pronti" in Dispensa.

**Tech Stack:** Next.js 16 (App Router) + TypeScript, Supabase (RLS), Vitest + Testing Library (jsdom). Nessuna dipendenza nuova.

**Spec:** `docs/superpowers/specs/2026-08-30-meal-prepping-design.md`

## Global Constraints

- **La migrazione `0009_meal_prepping.sql` NON si applica a nessun database durante l'esecuzione del piano**: file soltanto; l'applicazione in produzione è un gate esplicito di Andrea.
- `src/domain/` resta puro (niente rete/DB/fs).
- `fattoreConsumo` vive in UN posto solo (`src/domain/pronti.ts`): `consumoSlot` e `costruisciLista` la importano, mai duplicata.
- Le scritture dei Pronti in `aggiornaSlot` avvengono PRIMA del check `week.stato === 'bozza'` (spec §5: la pianificazione vale anche in bozza); ledger e pantry restano dopo, come nel P2.
- Costanti verbatim: `GIORNI_PRONTO_FRESCO = 3`, `GIORNI_PRONTO_CONGELATO = 90`.
- Copy italiane esatte: "MEAL PREP", "Ne preparo di più", "Uso una porzione pronta", "Non uso la porzione pronta", "Cucinato ma non mangiato", "Cambia piatto", "Porzione pronta", "PRONTI", "Nessuna porzione pronta di questo piatto."
- La cartella `diete/` è gitignored (dati sanitari veri): mai toccarla.
- Test: `npx vitest run` tutta verde a fine di ogni task (oggi 447 test); `npx eslint src` e `npx tsc --noEmit` puliti prima di ogni commit.

## File Structure

| File | Ruolo |
|---|---|
| `supabase/migrations/0009_meal_prepping.sql` (create) | Colonne slot + tabella `porzione_pronta` + RLS |
| `src/domain/types.ts` (modify) | `MealSlot` += `porzioniPreparate`/`daPronti`; nuovo `LottoPronto` |
| `src/domain/pronti.ts` (create) | `fattoreConsumo`, `porzioniUtilizzabili`, costanti |
| `src/domain/__tests__/pronti.test.ts` (create) | Test dominio |
| `src/domain/storno.ts` (modify) | `consumoSlot` legge `fattoreConsumo` |
| `src/domain/list-builder.ts` (modify) | Regole 1-3 leggono `fattoreConsumo` |
| `src/domain/week-shape.ts` (modify) | `generaSettimana` inizializza i campi nuovi |
| `src/data/mappers.ts` (modify) | `aMealSlot` += campi (tolleranti); nuovo `aLottoPronto` |
| `src/data/pronti.ts` (create) | CRUD lotti per la Dispensa |
| `src/data/__tests__/pronti.test.ts` (create) | Test data |
| `src/data/settimana.ts` (modify) | `aggiornaSlot`: patch esteso + scritture Pronti |
| `src/data/__tests__/settimana.aggiornaSlot.test.ts` (modify) | Test Pronti + ledger |
| `src/components/FoglioAzioniPasto.tsx` (modify) | Sezioni, stepper, gesti prep |
| `src/components/__tests__/FoglioAzioniPasto.test.tsx` (modify) | Test foglio |
| `src/app/(app)/settimana/page.tsx` (modify) | Wiring gesti, foglio su tutti i giorni, sottotitoli |
| `src/app/(app)/settimana/__tests__/page.test.tsx` (modify) | Test pagina |
| `src/app/(app)/dispensa/page.tsx` (modify) | Sezione "Pronti" |
| `src/app/(app)/dispensa/__tests__/page.test.tsx` (modify, se esiste — altrimenti create) | Test sezione |
| `README.md` (modify) | Paragrafo meal prepping |

---

### Task 1: Migrazione 0009, tipi e mapper

**Files:**
- Create: `supabase/migrations/0009_meal_prepping.sql`
- Modify: `src/domain/types.ts` (MealSlot, + LottoPronto), `src/domain/week-shape.ts:29-37`, `src/data/mappers.ts` (aMealSlot, + aLottoPronto)
- Modify: ogni file che costruisce un letterale `MealSlot` (li elenca `tsc`)

**Interfaces:**
- Produces: colonne `meal_slot.porzioni_preparate` / `meal_slot.da_pronti`; tabella `porzione_pronta`; `MealSlot.porzioniPreparate: number` e `MealSlot.daPronti: boolean` (obbligatori); `LottoPronto { id, dishId, porzioni, congelato, preparataIl, mealSlotId: string | null }`; `aLottoPronto(r: Record<string, unknown>): LottoPronto`. Tutti i task successivi dipendono da questi nomi esatti.

- [ ] **Step 1: Scrivi la migrazione**

```sql
-- Meal prepping (spec 2026-08-30-meal-prepping-design.md §4).
-- porzioni_preparate: quante porzioni EXTRA questo slot cucina (entrano nei
-- Pronti); da_pronti: il pasto è coperto da una porzione già pronta, non
-- consuma ingredienti crudi.
alter table meal_slot add column porzioni_preparate integer not null default 0
  check (porzioni_preparate >= 0);
alter table meal_slot add column da_pronti boolean not null default false;

-- I lotti dei Pronti: porzioni cucinate in anticipo, per piatto, datate al
-- giorno in cui vengono (o verranno) preparate. Il decadimento è derivato in
-- lettura (porzioniUtilizzabili), mai scritto. meal_slot_id lega il lotto
-- alla dichiarazione sullo slot: cambiare N su quello slot aggiorna QUESTO
-- lotto; null per i lotti creati o corretti a mano dalla Dispensa.
create table porzione_pronta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dish_id uuid not null references dish(id) on delete cascade,
  porzioni integer not null check (porzioni > 0),
  congelato boolean not null default false,
  preparata_il date not null,
  meal_slot_id uuid references meal_slot(id) on delete set null,
  unique (meal_slot_id)
);

-- RLS: stesso blocco di 0002_rls.sql / 0008_spunta_pasti.sql.
do $$
begin
  execute 'alter table porzione_pronta enable row level security';
  execute 'alter table porzione_pronta force row level security';
  execute 'create policy porzione_pronta_proprietario on porzione_pronta for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)';
end $$;
```

**NON applicare la migrazione a nessun database** (Global Constraints).

- [ ] **Step 2: Estendi i tipi**

In `src/domain/types.ts`, dentro `interface MealSlot`, dopo `scelte`:

```ts
  /** Porzioni EXTRA che questo slot cucina (entrano nei Pronti). 0 = pasto normale. */
  porzioniPreparate: number;
  /** Il pasto è coperto da una porzione già pronta: niente consumo di crudo. */
  daPronti: boolean;
```

In coda al file:

```ts
export interface LottoPronto {
  id: string;
  dishId: string;
  /** > 0; il lotto a 0 si cancella. */
  porzioni: number;
  congelato: boolean;
  /** ISO yyyy-mm-dd: il giorno dello slot che l'ha creato. Può essere futuro (batch pianificato). */
  preparataIl: string;
  /** Lo slot della dichiarazione, null per i lotti manuali della Dispensa. */
  mealSlotId: string | null;
}
```

- [ ] **Step 3: Mapper**

In `src/data/mappers.ts`, dentro `aMealSlot`, dopo `fonteStato`:

```ts
    // `?? 0` / Boolean: le righe di mock nei test non portano le colonne nuove,
    // e un undefined qui diventerebbe NaN/undefined nel dominio.
    porzioniPreparate: num(r.porzioni_preparate ?? 0),
    daPronti: Boolean(r.da_pronti),
```

In coda al file:

```ts
export function aLottoPronto(r: Record<string, unknown>): LottoPronto {
  return {
    id: String(r.id),
    dishId: String(r.dish_id),
    porzioni: num(r.porzioni),
    congelato: Boolean(r.congelato),
    preparataIl: data(r.preparata_il),
    mealSlotId: r.meal_slot_id ? String(r.meal_slot_id) : null,
  };
}
```

(aggiungi `LottoPronto` all'import dei tipi in testa al file).

- [ ] **Step 4: Inizializza i campi in `generaSettimana`**

In `src/domain/week-shape.ts`, nel letterale slot (righe ~29-37), dopo `scelte: {}`:

```ts
        porzioniPreparate: 0,
        daPronti: false,
```

- [ ] **Step 5: Ripara ogni letterale `MealSlot`**

Run: `npx tsc --noEmit` — ogni errore "missing properties porzioniPreparate, daPronti" è un letterale da completare con `porzioniPreparate: 0, daPronti: false`. Attesi (almeno): helper `slot()` in `src/domain/__tests__/storno.test.ts`, fixture in `src/domain/__tests__/list-builder.test.ts` e `planner.test.ts` e `week-shape.test.ts` (se costruiscono slot), `buildSlots()`/`slotsPrecedenti()` in `src/app/(app)/settimana/__tests__/page.test.tsx`, eventuali slot nei test di Scegli e Piatti. Le righe RAW dei mock data-layer (es. `rigaSlot()` in `settimana.aggiornaSlot.test.ts`) NON vanno toccate: sono `Record<string, unknown>` e il mapper le tollera. Se `mappers.test.ts` fa `toEqual` sull'output di `aMealSlot`, aggiorna l'atteso con i due campi nuovi.

- [ ] **Step 6: Suite completa verde**

Run: `npx tsc --noEmit && npx vitest run`
Expected: zero errori di tipo, tutti i test passano.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0009_meal_prepping.sql src/domain/types.ts src/domain/week-shape.ts src/data/mappers.ts
git add -A src
git commit -m "feat(schema): migrazione 0009, i lotti dei Pronti e i campi prep sullo slot"
```

---

### Task 2: Dominio `pronti.ts`

**Files:**
- Create: `src/domain/pronti.ts`
- Test: `src/domain/__tests__/pronti.test.ts`

**Interfaces:**
- Consumes: `MealSlot`, `LottoPronto` da `./types`; `giorniTra` da `./date`.
- Produces (Task 3-8 li usano verbatim): `fattoreConsumo(slot: Pick<MealSlot, 'stato' | 'daPronti' | 'porzioniPreparate'>): number`; `porzioniUtilizzabili(lotto: LottoPronto, oggi: string): number`; `GIORNI_PRONTO_FRESCO = 3`; `GIORNI_PRONTO_CONGELATO = 90`.

- [ ] **Step 1: Scrivi i test (falliranno)**

```ts
import { describe, it, expect } from 'vitest';
import type { LottoPronto, MealSlot, StatoSlot } from '../types';
import { fattoreConsumo, porzioniUtilizzabili, GIORNI_PRONTO_FRESCO, GIORNI_PRONTO_CONGELATO } from '../pronti';

function slot(stato: StatoSlot, daPronti: boolean, porzioniPreparate: number): Pick<MealSlot, 'stato' | 'daPronti' | 'porzioniPreparate'> {
  return { stato, daPronti, porzioniPreparate };
}

function lotto(sovrascrivi: Partial<LottoPronto>): LottoPronto {
  return {
    id: 'l-1', dishId: 'd-1', porzioni: 2, congelato: false,
    preparataIl: '2026-08-28', mealSlotId: null, ...sovrascrivi,
  };
}

describe('fattoreConsumo — la matrice della spec §2', () => {
  it.each([
    ['pasto normale', slot('casa', false, 0), 1],
    ['ne preparo 2 in più', slot('casa', false, 2), 3],
    ['uso una porzione pronta', slot('casa', true, 0), 0],
    ['saltato', slot('saltato', false, 0), 0],
    ['cucinato ma non mangiato', slot('saltato', false, 1), 1],
    ['fuori ma ho cucinato per dopo', slot('fuori', false, 2), 2],
    ['sostituito', slot('sostituito', false, 0), 0],
    ['porzione pronta su slot saltato', slot('saltato', true, 0), 0],
  ])('%s → %i', (_nome, s, atteso) => {
    expect(fattoreConsumo(s)).toBe(atteso);
  });
});

describe('porzioniUtilizzabili', () => {
  it('lotto fresco entro i 3 giorni: tutte; oltre: zero', () => {
    expect(porzioniUtilizzabili(lotto({ preparataIl: '2026-08-28' }), '2026-08-31')).toBe(2);
    expect(porzioniUtilizzabili(lotto({ preparataIl: '2026-08-27' }), '2026-08-31')).toBe(0);
  });

  it('lotto congelato: 90 giorni', () => {
    expect(porzioniUtilizzabili(lotto({ congelato: true, preparataIl: '2026-06-05' }), '2026-08-31')).toBe(2);
    expect(porzioniUtilizzabili(lotto({ congelato: true, preparataIl: '2026-05-01' }), '2026-08-31')).toBe(0);
  });

  it('lotto pianificato (preparataIl futura) è utilizzabile', () => {
    expect(porzioniUtilizzabili(lotto({ preparataIl: '2026-09-06' }), '2026-08-31')).toBe(2);
  });

  it('le costanti sono quelle della spec', () => {
    expect(GIORNI_PRONTO_FRESCO).toBe(3);
    expect(GIORNI_PRONTO_CONGELATO).toBe(90);
  });
});
```

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/domain/__tests__/pronti.test.ts`
Expected: FAIL — modulo `../pronti` inesistente.

- [ ] **Step 3: Implementa `src/domain/pronti.ts`**

```ts
import type { LottoPronto, MealSlot } from './types';
import { giorniTra } from './date';

/** Il cotto in frigo dura 2-3 giorni (linee guida di conservazione domestica, arrotondate come GIORNI_FRESCO). */
export const GIORNI_PRONTO_FRESCO = 3;
/** Come GIORNI_CONGELATO del residuo: il congelatore cambia l'ordine di grandezza. */
export const GIORNI_PRONTO_CONGELATO = 90;

/**
 * Quante porzioni di questo slot escono dalla dispensa cruda. È la formula
 * unica della spec meal-prepping §2: costruisciLista e consumoSlot la leggono
 * ENTRAMBE da qui — se divergessero, la lista comprerebbe una cosa e lo
 * storno ne pareggerebbe un'altra. porzioniPreparate conta qualunque sia lo
 * stato: cucinare per il futuro è indipendente dal dove si mangia oggi.
 */
export function fattoreConsumo(
  slot: Pick<MealSlot, 'stato' | 'daPronti' | 'porzioniPreparate'>,
): number {
  const mangiaCrudo = slot.stato === 'casa' && !slot.daPronti ? 1 : 0;
  return mangiaCrudo + slot.porzioniPreparate;
}

/**
 * Quante porzioni del lotto sono ancora davvero disponibili. Un lotto fresco
 * più vecchio di 3 giorni non esiste più (o l'hai mangiato o l'hai buttato):
 * stessa asimmetria dichiarata di residuoUtilizzabile — meglio una porzione
 * data per persa che una cena contata su una vaschetta che non c'è. Un lotto
 * con preparataIl futura è un batch pianificato: utilizzabile (le porzioni
 * esisteranno quando serviranno).
 */
export function porzioniUtilizzabili(lotto: LottoPronto, oggi: string): number {
  if (lotto.preparataIl > oggi) return lotto.porzioni;
  const soglia = lotto.congelato ? GIORNI_PRONTO_CONGELATO : GIORNI_PRONTO_FRESCO;
  return giorniTra(lotto.preparataIl, oggi) > soglia ? 0 : lotto.porzioni;
}
```

- [ ] **Step 4: Verifica che passino**

Run: `npx vitest run src/domain/__tests__/pronti.test.ts`
Expected: PASS (12 test).

- [ ] **Step 5: Commit**

```bash
git add src/domain/pronti.ts src/domain/__tests__/pronti.test.ts
git commit -m "feat(domain): fattoreConsumo e porzioniUtilizzabili, l'aritmetica dei Pronti"
```

---

### Task 3: `consumoSlot` e `costruisciLista` leggono `fattoreConsumo`

**Files:**
- Modify: `src/domain/storno.ts:22-35`, `src/domain/list-builder.ts:94-106`
- Test: `src/domain/__tests__/storno.test.ts`, `src/domain/__tests__/list-builder.test.ts` (aggiunte)

**Interfaces:**
- Consumes: `fattoreConsumo` (Task 2).
- Produces: firme invariate — cambia solo l'aritmetica interna.

- [ ] **Step 1: Scrivi i test (falliranno)**

In `storno.test.ts`, in coda al describe `consumoSlot` (l'helper `slot()` del file ha già i campi a 0/false dal Task 1 — aggiungi un parametro di override):

```ts
  it('le porzioni preparate moltiplicano il consumo; daPronti lo azzera', () => {
    const base = { dish: POLLO_E_RISO, ingredients: INGREDIENTI, moltiplicatorePorzioni: 1 };
    const doppio = consumoSlot({ slot: { ...slot('casa', 'd-1'), porzioniPreparate: 2 }, ...base });
    expect(doppio.get('i-pollo')).toBe(600); // (1 + 2) × 200

    const daPronti = consumoSlot({ slot: { ...slot('casa', 'd-1'), daPronti: true }, ...base });
    expect(daPronti.size).toBe(0);

    const cucinatoNonMangiato = consumoSlot({ slot: { ...slot('saltato', 'd-1'), porzioniPreparate: 1 }, ...base });
    expect(cucinatoNonMangiato.get('i-pollo')).toBe(200); // 0 mangiate + 1 preparata
  });
```

In `list-builder.test.ts`, in coda (usa i fixture del file: un piatto assegnato a uno slot casa; adatta i nomi a quelli reali del file):

```ts
  it('il fabbisogno segue fattoreConsumo: porzioni preparate moltiplicano, daPronti azzera', () => {
    // Prendi un caso già esistente nel file con uno slot 'casa' + piatto e il
    // suo fabbisogno atteso F per un ingrediente I; qui si riusa il fixture:
    // 1) slot con porzioniPreparate: 2 → fabbisogno 3×F per I;
    // 2) slot con daPronti: true → I non compare in lista (o fabbisogno 0).
    // Scrivi le due asserzioni con i valori concreti del fixture scelto.
  });
```

(Il commento sopra è l'istruzione per l'implementatore: il test VA scritto con i numeri concreti del fixture che sceglie nel file — non lasciarlo vuoto.)

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/domain/__tests__/storno.test.ts src/domain/__tests__/list-builder.test.ts`
Expected: FAIL sui test nuovi (consumo non moltiplicato, daPronti ignorato).

- [ ] **Step 3: Implementa**

In `src/domain/storno.ts`: aggiungi `import { fattoreConsumo } from './pronti';` e sostituisci in `consumoSlot`:

```ts
  const consumo = new Map<string, number>();
  const fattore = fattoreConsumo(i.slot);
  if (fattore === 0 || !i.dish) return consumo;
```

e la riga della quantità diventa:

```ts
    const q = convertiInUnitaBase(riga.quantita, riga.unita, ing.unitaBase)
      * i.moltiplicatorePorzioni * fattore;
```

Aggiorna il commento di testa: il gate non è più "stato ≠ casa" ma "fattoreConsumo zero" (spec meal-prepping §2-3).

In `src/domain/list-builder.ts`: aggiungi `import { fattoreConsumo } from './pronti';` e nelle regole 1-3 sostituisci:

```ts
  for (const slot of slots) {
    const fattore = fattoreConsumo(slot);
    if (fattore === 0 || !slot.dishId) continue;
    const piatto = piattoPerId.get(slot.dishId);
    if (!piatto) continue;
    for (const riga of righeEffettive(piatto, slot.scelte)) {
      const ing = perId.get(riga.ingredientId);
      if (!ing) throw new IngredienteMancanteError(riga.ingredientId);
      const q = convertiInUnitaBase(riga.quantita, riga.unita, ing.unitaBase)
        * impostazioni.moltiplicatorePorzioni * fattore;
      fabbisogni.set(ing.id, (fabbisogni.get(ing.id) ?? 0) + q);
    }
  }
```

- [ ] **Step 4: Suite completa verde + commit**

Run: `npx vitest run` — tutti verdi (i test esistenti non cambiano: con campi a 0/false il fattore è identico a prima).

```bash
git add src/domain/storno.ts src/domain/list-builder.ts src/domain/__tests__/storno.test.ts src/domain/__tests__/list-builder.test.ts
git commit -m "feat(domain): consumo e fabbisogno leggono fattoreConsumo"
```

---

### Task 4: Data layer dei lotti — `src/data/pronti.ts`

**Files:**
- Create: `src/data/pronti.ts`
- Test: `src/data/__tests__/pronti.test.ts`

**Interfaces:**
- Consumes: `client` da `./supabase`; `aLottoPronto` da `./mappers` (Task 1).
- Produces (Task 7-8 li usano verbatim): `leggiPronti(): Promise<LottoPronto[]>`; `correggiLotto(id: string, porzioni: number): Promise<void>` (≤ 0 cancella); `impostaCongelatoLotto(id: string, congelato: boolean): Promise<void>`; `eliminaLotto(id: string): Promise<void>`.

- [ ] **Step 1: Scrivi i test (falliranno)** — stessa controfigura del query builder degli altri test data (copiala da `settimana.leggiSettimana.test.ts`):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../supabase', () => ({ client: vi.fn() }));

import { client } from '../supabase';
import { leggiPronti, correggiLotto, impostaCongelatoLotto, eliminaLotto } from '../pronti';

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

function chiamateDi(scritture: Record<string, Chiamata[][]>, tabella: string, metodo: string) {
  return (scritture[tabella] ?? []).flat().filter((c) => c.metodo === metodo);
}

describe('data/pronti', () => {
  beforeEach(() => vi.mocked(client).mockReset());

  it('leggiPronti mappa le righe in LottoPronto, ordinate per preparata_il', async () => {
    const { sb, scritture } = creaClientMock((t) => t === 'porzione_pronta'
      ? { data: [{ id: 'l-1', dish_id: 'd-1', porzioni: '2', congelato: false, preparata_il: '2026-08-28', meal_slot_id: null }], error: null }
      : { data: null, error: null });
    vi.mocked(client).mockReturnValue(sb as never);

    const lotti = await leggiPronti();

    expect(lotti).toEqual([{ id: 'l-1', dishId: 'd-1', porzioni: 2, congelato: false, preparataIl: '2026-08-28', mealSlotId: null }]);
    const ordini = chiamateDi(scritture, 'porzione_pronta', 'order');
    expect(ordini[0]!.args[0]).toBe('preparata_il');
  });

  it('correggiLotto aggiorna le porzioni; a zero o meno cancella la riga', async () => {
    const { sb, scritture } = creaClientMock(() => ({ data: null, error: null }));
    vi.mocked(client).mockReturnValue(sb as never);

    await correggiLotto('l-1', 3);
    expect(chiamateDi(scritture, 'porzione_pronta', 'update')[0]!.args[0]).toEqual({ porzioni: 3 });

    await correggiLotto('l-1', 0);
    expect(chiamateDi(scritture, 'porzione_pronta', 'delete')).toHaveLength(1);
  });

  it('impostaCongelatoLotto ed eliminaLotto filtrano per id e user_id', async () => {
    const { sb, scritture } = creaClientMock(() => ({ data: null, error: null }));
    vi.mocked(client).mockReturnValue(sb as never);

    await impostaCongelatoLotto('l-1', true);
    await eliminaLotto('l-2');

    expect(chiamateDi(scritture, 'porzione_pronta', 'update')[0]!.args[0]).toEqual({ congelato: true });
    const filtri = (scritture['porzione_pronta'] ?? []).flat().filter((c) => c.metodo === 'eq');
    expect(filtri).toContainEqual({ metodo: 'eq', args: ['user_id', 'user-1'] });
  });
});
```

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/data/__tests__/pronti.test.ts`
Expected: FAIL — modulo inesistente.

- [ ] **Step 3: Implementa `src/data/pronti.ts`**

```ts
import type { LottoPronto } from '@/domain/types';
import { client } from './supabase';
import { aLottoPronto } from './mappers';

/** Tutti i lotti, dal più vecchio: il decadimento lo applica chi legge (porzioniUtilizzabili), qui non si filtra. */
export async function leggiPronti(): Promise<LottoPronto[]> {
  const { data, error } = await client()
    .from('porzione_pronta')
    .select('*')
    .order('preparata_il');
  if (error) throw error;
  return data.map(aLottoPronto);
}

/**
 * Correzione manuale dalla Dispensa: stessa filosofia di correggiResiduo —
 * il numero resta derivato dai gesti, questo rimette in pari quando la
 * realtà se n'è discostata. Zero o meno = il lotto non esiste più.
 */
export async function correggiLotto(id: string, porzioni: number): Promise<void> {
  if (!Number.isFinite(porzioni)) throw new Error(`Porzioni non valide: ${porzioni}.`);
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const userId = utente.user!.id;
  if (porzioni <= 0) {
    const { error } = await sb.from('porzione_pronta').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return;
  }
  const { error } = await sb
    .from('porzione_pronta')
    .update({ porzioni })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

/** Frigo ↔ freezer: cambia la soglia di decadimento del lotto, come il flag congelato del residuo. */
export async function impostaCongelatoLotto(id: string, congelato: boolean): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { error } = await sb
    .from('porzione_pronta')
    .update({ congelato })
    .eq('id', id)
    .eq('user_id', utente.user!.id);
  if (error) throw error;
}

export async function eliminaLotto(id: string): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { error } = await sb.from('porzione_pronta').delete().eq('id', id).eq('user_id', utente.user!.id);
  if (error) throw error;
}
```

- [ ] **Step 4: Verifica + suite + commit**

Run: `npx vitest run src/data/__tests__/pronti.test.ts` poi `npx vitest run`.

```bash
git add src/data/pronti.ts src/data/__tests__/pronti.test.ts
git commit -m "feat(data): il CRUD dei lotti pronti per la Dispensa"
```

---

### Task 5: `aggiornaSlot` — patch esteso e scritture dei Pronti

**Files:**
- Modify: `src/data/settimana.ts:202-384` (aggiornaSlot)
- Test: `src/data/__tests__/settimana.aggiornaSlot.test.ts` (aggiunte)

**Interfaces:**
- Consumes: `porzioniUtilizzabili` da `@/domain/pronti`; `aLottoPronto` da `./mappers`; colonne del Task 1.
- Produces (Task 6-7 lo usano verbatim): il patch diventa `{ stato?: StatoSlot; dishId?: string | null; scelte?: Record<string, Scelta>; porzioniPreparate?: number; daPronti?: boolean; prontiCongelato?: boolean }`. `prontiCongelato` ha significato solo insieme a `porzioniPreparate` (dove va il lotto: frigo default, freezer se true). Errore con messaggio esatto "Nessuna porzione pronta di questo piatto." quando `daPronti: true` non ha porzioni utilizzabili.

- [ ] **Step 1: Scrivi i test (falliranno)** — in coda al describe esistente di `settimana.aggiornaSlot.test.ts`. Il `risolutore` del file va esteso con un parametro `lotti` (default `[]`) che risolve le select su `porzione_pronta`:

```ts
// nel risolutore, accanto agli altri rami `legge`. ATTENZIONE: aggiornaSlot fa
// DUE select diverse su porzione_pronta — quella del lotto legato (filtra
// eq('meal_slot_id', ...) e finisce in maybeSingle: risposta UNA riga o null)
// e quella FIFO/restituzione (filtra eq('dish_id', ...): risposta array).
// Distinguerle dal filtro, o il maybeSingle riceverebbe un array:
//   if (tabella === 'porzione_pronta' && legge) {
//     const perSlot = chiamate.some((c) => c.metodo === 'eq' && c.args[0] === 'meal_slot_id');
//     if (perSlot) {
//       return { data: (opts.lotti ?? []).find((l) => l.meal_slot_id === 's-1') ?? null, error: null };
//     }
//     return { data: opts.lotti ?? [], error: null };
//   }
```

Le date dei lotti nei test vanno costruite RELATIVE a oggi (aggiornaSlot usa
l'orologio vero e `porzioniUtilizzabili` decade): in testa al blocco di test

```ts
import { sommaGiorni } from '@/domain/date';
const OGGI_REALE = new Date().toISOString().slice(0, 10);
const FRESCO_IERI = sommaGiorni(OGGI_REALE, -1);        // utilizzabile
const CONGELATO_9GG = sommaGiorni(OGGI_REALE, -9);      // utilizzabile (congelato)
const FRESCO_SCADUTO = sommaGiorni(OGGI_REALE, -10);    // decaduto
```

e nei lotti dei test qui sotto sostituisci: `'2026-08-20'` → `CONGELATO_9GG`,
`'2026-08-25'` → `FRESCO_IERI`, `'2026-08-01'` → `FRESCO_SCADUTO`. Le
`preparata_il` attese sugli INSERT restano `'2026-08-26'` (è `attuale.data`
della riga slot mockata, non dipende dall'orologio).

```ts
  it('porzioniPreparate crea il lotto legato allo slot e il ledger addebita le porzioni extra', async () => {
    const { sb, scritture } = creaClientMock(risolutore({
      riga: rigaSlot('casa'), statoWeek: 'chiusa',
      pantry: [{ ingredient_id: 'i-pollo', residuo: 500 }],
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { porzioniPreparate: 2 }, 'checkin');

    const lotti = scrittureDi(scritture, 'porzione_pronta', 'insert');
    expect(lotti).toHaveLength(1);
    expect(lotti[0]!.args[0]).toMatchObject({
      meal_slot_id: 's-1', dish_id: 'd-1', porzioni: 2,
      preparata_il: '2026-08-26', congelato: false,
    });
    // Consumo da 1× a 3×: il ledger addebita 2 porzioni di pollo (−400).
    const ledger = scrittureDi(scritture, 'meal_slot_storno', 'upsert');
    expect(ledger[0]!.args[0]).toMatchObject({ ingredient_id: 'i-pollo', delta: -400 });
    const pantry = scrittureDi(scritture, 'pantry_state', 'upsert');
    expect(pantry[0]!.args[0]).toMatchObject({ ingredient_id: 'i-pollo', residuo: 100 });
  });

  it('porzioniPreparate a zero cancella il lotto legato', async () => {
    const riga = { ...rigaSlot('casa'), porzioni_preparate: 2 };
    const { sb, scritture } = creaClientMock(risolutore({
      riga, statoWeek: 'chiusa',
      lotti: [{ id: 'l-1', dish_id: 'd-1', porzioni: 2, congelato: false, preparata_il: '2026-08-26', meal_slot_id: 's-1' }],
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { porzioniPreparate: 0 }, 'checkin');

    expect(scrittureDi(scritture, 'porzione_pronta', 'delete')).toHaveLength(1);
  });

  it('daPronti scala FIFO dal lotto utilizzabile più vecchio e il ledger accredita il crudo', async () => {
    const { sb, scritture } = creaClientMock(risolutore({
      riga: rigaSlot('casa'), statoWeek: 'chiusa',
      lotti: [
        { id: 'l-vecchio', dish_id: 'd-1', porzioni: 1, congelato: true, preparata_il: '2026-08-20', meal_slot_id: null },
        { id: 'l-nuovo', dish_id: 'd-1', porzioni: 2, congelato: false, preparata_il: '2026-08-25', meal_slot_id: null },
      ],
      pantry: [{ ingredient_id: 'i-pollo', residuo: 40 }],
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { daPronti: true }, 'checkin');

    // l-vecchio ha 1 porzione: si cancella (FIFO).
    expect(scrittureDi(scritture, 'porzione_pronta', 'delete')).toHaveLength(1);
    // Il consumo passa da 1× a 0: riaccredito del pollo.
    expect(scrittureDi(scritture, 'meal_slot_storno', 'upsert')[0]!.args[0]).toMatchObject({ ingredient_id: 'i-pollo', delta: 200 });
    expect(scrittureDi(scritture, 'pantry_state', 'upsert')[0]!.args[0]).toMatchObject({ ingredient_id: 'i-pollo', residuo: 240 });
  });

  it('daPronti senza porzioni utilizzabili fallisce con il messaggio esatto, senza scrivere nulla', async () => {
    const { sb, scritture } = creaClientMock(risolutore({
      riga: rigaSlot('casa'), statoWeek: 'chiusa',
      lotti: [{ id: 'l-scaduto', dish_id: 'd-1', porzioni: 2, congelato: false, preparata_il: '2026-08-01', meal_slot_id: null }],
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    await expect(aggiornaSlot('s-1', { daPronti: true }, 'checkin'))
      .rejects.toThrow('Nessuna porzione pronta di questo piatto.');
    expect(scritture['meal_slot']?.flat().filter((c) => c.metodo === 'update') ?? []).toHaveLength(0);
  });

  it('togliere daPronti restituisce la porzione al lotto utilizzabile più recente', async () => {
    const riga = { ...rigaSlot('casa'), da_pronti: true };
    const { sb, scritture } = creaClientMock(risolutore({
      riga, statoWeek: 'chiusa',
      lotti: [{ id: 'l-1', dish_id: 'd-1', porzioni: 1, congelato: true, preparata_il: '2026-08-20', meal_slot_id: null }],
      pantry: [{ ingredient_id: 'i-pollo', residuo: 240 }],
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { daPronti: false }, 'checkin');

    expect(scrittureDi(scritture, 'porzione_pronta', 'update')[0]!.args[0]).toEqual({ porzioni: 2 });
    // Torna a consumare crudo: addebito.
    expect(scrittureDi(scritture, 'pantry_state', 'upsert')[0]!.args[0]).toMatchObject({ ingredient_id: 'i-pollo', residuo: 40 });
  });

  it('il cambio piatto azzera daPronti (con restituzione) e cancella il lotto legato', async () => {
    const riga = { ...rigaSlot('casa'), da_pronti: true, porzioni_preparate: 1 };
    const { sb, scritture } = creaClientMock(risolutore({
      riga, statoWeek: 'chiusa',
      lotti: [
        { id: 'l-legato', dish_id: 'd-1', porzioni: 1, congelato: false, preparata_il: '2026-08-26', meal_slot_id: 's-1' },
        { id: 'l-libero', dish_id: 'd-1', porzioni: 1, congelato: true, preparata_il: '2026-08-20', meal_slot_id: null },
      ],
    }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { dishId: 'd-2' }, 'checkin');

    // Restituzione della porzione del piatto vecchio + cancellazione del lotto legato.
    expect(scrittureDi(scritture, 'porzione_pronta', 'update')[0]!.args[0]).toEqual({ porzioni: 2 });
    expect(scrittureDi(scritture, 'porzione_pronta', 'delete')).toHaveLength(1);
    const upd = scritture['meal_slot']!.flat().find((c) => c.metodo === 'update')!.args[0] as Record<string, unknown>;
    expect(upd).toMatchObject({ da_pronti: false, porzioni_preparate: 0, dish_id: 'd-2' });
  });

  it('a settimana bozza i Pronti si scrivono comunque, ledger e pantry no', async () => {
    const { sb, scritture } = creaClientMock(risolutore({ riga: rigaSlot('casa'), statoWeek: 'bozza' }));
    vi.mocked(client).mockReturnValue(sb as never);

    await aggiornaSlot('s-1', { porzioniPreparate: 2, prontiCongelato: true }, 'checkin');

    const lotti = scrittureDi(scritture, 'porzione_pronta', 'insert');
    expect(lotti[0]!.args[0]).toMatchObject({ porzioni: 2, congelato: true });
    expect(scritture['meal_slot_storno']).toBeUndefined();
    expect(scritture['pantry_state']).toBeUndefined();
  });
```

Nota: `rigaSlot()` del file non porta le colonne nuove — il mapper le
tollera (Task 1) e i default sono 0/false; gli override nei test le
aggiungono esplicitamente.

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/data/__tests__/settimana.aggiornaSlot.test.ts`
Expected: FAIL sui 7 test nuovi, PASS sui pre-esistenti.

- [ ] **Step 3: Implementa in `aggiornaSlot`**

Import in testa a `settimana.ts`:

```ts
import { porzioniUtilizzabili } from '@/domain/pronti';
import { aMealSlot, aLottoPronto } from './mappers';
```

**(a)** Firma del patch:

```ts
  patch: {
    stato?: StatoSlot; dishId?: string | null; scelte?: Record<string, Scelta>;
    porzioniPreparate?: number; daPronti?: boolean; prontiCongelato?: boolean;
  },
```

**(b)** Subito dopo il calcolo di `cambioPiatto` (riga ~229), i valori "dopo" del prep e il gate preventivo:

```ts
  // I valori prep "dopo": il cambio piatto li azzera sempre (spec §5 — i
  // valori del piatto vecchio non hanno significato sul nuovo).
  const daProntiDopo = cambioPiatto ? false : (patch.daPronti ?? attuale.daPronti);
  const porzioniPreparateDopo = cambioPiatto ? 0 : (patch.porzioniPreparate ?? attuale.porzioniPreparate);
  const oggi = new Date().toISOString().slice(0, 10);

  // Gate preventivo di daPronti: la porzione deve esistere PRIMA di toccare
  // lo slot — sola lettura, nessuno stato incoerente se fallisce.
  let lottoDaScalare: { id: string; porzioni: number } | null = null;
  if (daProntiDopo && !attuale.daPronti) {
    const dishPerPorzione = patch.dishId !== undefined ? patch.dishId : attuale.dishId;
    if (!dishPerPorzione) throw new Error('Nessuna porzione pronta di questo piatto.');
    const { data: righeLotti, error: eLotti } = await sb
      .from('porzione_pronta')
      .select('*')
      .eq('dish_id', dishPerPorzione)
      .eq('user_id', userId)
      .order('preparata_il');
    if (eLotti) throw eLotti;
    const utilizzabile = (righeLotti ?? []).map(aLottoPronto)
      .find((l) => porzioniUtilizzabili(l, oggi) > 0);
    if (!utilizzabile) throw new Error('Nessuna porzione pronta di questo piatto.');
    lottoDaScalare = { id: utilizzabile.id, porzioni: utilizzabile.porzioni };
  }
```

**(c)** Nel blocco `aggiornamento`, dopo il ramo di `patch.dishId`:

```ts
  if (daProntiDopo !== attuale.daPronti) aggiornamento.da_pronti = daProntiDopo;
  if (porzioniPreparateDopo !== attuale.porzioniPreparate) {
    aggiornamento.porzioni_preparate = porzioniPreparateDopo;
  }
```

**(d)** Dopo l'upsert di `patch.scelte` e PRIMA del blocco ledger (il check
bozza NON deve saltare i Pronti — spec §5: la pianificazione crea lotti
anche a settimana bozza):

```ts
  // ── I Pronti (spec meal-prepping §5): sempre, anche a settimana bozza ───
  // Il lotto legato allo slot segue porzioniPreparate.
  if (porzioniPreparateDopo !== attuale.porzioniPreparate) {
    if (porzioniPreparateDopo > 0) {
      const { data: lottoLegato, error: eLeggi } = await sb
        .from('porzione_pronta')
        .select('id')
        .eq('meal_slot_id', slotId)
        .maybeSingle();
      if (eLeggi) throw eLeggi;
      if (lottoLegato) {
        const patchLotto: Record<string, unknown> = { porzioni: porzioniPreparateDopo };
        if (patch.prontiCongelato !== undefined) patchLotto.congelato = patch.prontiCongelato;
        const { error: eUpd } = await sb.from('porzione_pronta')
          .update(patchLotto).eq('id', String(lottoLegato.id)).eq('user_id', userId);
        if (eUpd) throw eUpd;
      } else {
        const { error: eIns } = await sb.from('porzione_pronta').insert({
          user_id: userId,
          meal_slot_id: slotId,
          dish_id: dishIdDopoPerLotto(patch, attuale),
          porzioni: porzioniPreparateDopo,
          preparata_il: attuale.data,
          congelato: patch.prontiCongelato ?? false,
        });
        if (eIns) throw eIns;
      }
    } else {
      const { error: eDel } = await sb.from('porzione_pronta')
        .delete().eq('meal_slot_id', slotId).eq('user_id', userId);
      if (eDel) throw eDel;
    }
  }

  // daPronti che si accende: scala FIFO dal lotto trovato nel gate.
  if (daProntiDopo && !attuale.daPronti && lottoDaScalare) {
    if (lottoDaScalare.porzioni <= 1) {
      const { error: eDel } = await sb.from('porzione_pronta')
        .delete().eq('id', lottoDaScalare.id).eq('user_id', userId);
      if (eDel) throw eDel;
    } else {
      const { error: eUpd } = await sb.from('porzione_pronta')
        .update({ porzioni: lottoDaScalare.porzioni - 1 })
        .eq('id', lottoDaScalare.id).eq('user_id', userId);
      if (eUpd) throw eUpd;
    }
  }

  // daPronti che si spegne (ripensamento, o cambio piatto): restituzione al
  // lotto utilizzabile più RECENTE del piatto vecchio; se non ne esiste più
  // uno (decaduto nel frattempo), si ricrea un lotto datato allo slot —
  // best-effort dichiarato in spec §5, la Dispensa corregge in due tap.
  if (!daProntiDopo && attuale.daPronti && attuale.dishId) {
    const { data: righeLotti, error: eLotti } = await sb
      .from('porzione_pronta')
      .select('*')
      .eq('dish_id', attuale.dishId)
      .eq('user_id', userId)
      .order('preparata_il', { ascending: false });
    if (eLotti) throw eLotti;
    const destinazione = (righeLotti ?? []).map(aLottoPronto)
      .find((l) => porzioniUtilizzabili(l, oggi) > 0 && l.mealSlotId !== slotId);
    if (destinazione) {
      const { error: eUpd } = await sb.from('porzione_pronta')
        .update({ porzioni: destinazione.porzioni + 1 })
        .eq('id', destinazione.id).eq('user_id', userId);
      if (eUpd) throw eUpd;
    } else {
      const { error: eIns } = await sb.from('porzione_pronta').insert({
        user_id: userId, meal_slot_id: null, dish_id: attuale.dishId,
        porzioni: 1, preparata_il: attuale.data, congelato: false,
      });
      if (eIns) throw eIns;
    }
  }
```

con l'helper a livello di modulo (sopra `aggiornaSlot`):

```ts
/** Il piatto a cui appartiene il lotto della dichiarazione: quello del patch se presente, altrimenti quello registrato. */
function dishIdDopoPerLotto(
  patch: { dishId?: string | null },
  attuale: MealSlot,
): string {
  const dishId = patch.dishId !== undefined ? patch.dishId : attuale.dishId;
  if (!dishId) throw new Error('Questo pasto non ha un piatto: niente porzioni da preparare.');
  return dishId;
}
```

**(e)** Nel blocco ledger esistente, lo slot "dopo" include i campi nuovi —
sostituisci la costruzione di `dopo`:

```ts
  const dopo = consumoSlot({
    slot: {
      ...attuale, stato: statoDopo, dishId: dishIdDopo, scelte: scelteDopo,
      daPronti: daProntiDopo, porzioniPreparate: porzioniPreparateDopo,
    },
    dish: dishIdDopo ? piattoPerId.get(dishIdDopo) ?? null : null,
    ingredients: ingredienti,
    moltiplicatorePorzioni: impostazioni.moltiplicatorePorzioni,
  });
```

(`prima` resta com'è: `attuale` porta già i campi dal mapper.) Attenzione a
non dichiarare due volte `oggi` se il blocco ledger ne avesse già una.

- [ ] **Step 4: Verifica + suite + commit**

Run: `npx vitest run src/data/__tests__/settimana.aggiornaSlot.test.ts` poi `npx vitest run`.

```bash
git add src/data/settimana.ts src/data/__tests__/settimana.aggiornaSlot.test.ts
git commit -m "feat(data): aggiornaSlot scrive i Pronti — lotti legati, FIFO, restituzioni"
```

---

### Task 6: `FoglioAzioniPasto` — sezioni e gesti prep

**Files:**
- Modify: `src/components/FoglioAzioniPasto.tsx`
- Test: `src/components/__tests__/FoglioAzioniPasto.test.tsx` (riscrittura parziale)

**Interfaces:**
- Consumes: nulla di nuovo.
- Produces (il Task 7 le usa verbatim): props estese —

```ts
interface Props {
  nomePasto: string;
  /** true se lo slot è già 'saltato' o 'sostituito'. */
  spuntato: boolean;
  /** true per i giorni ≤ oggi: mostra la sezione spunte. false = giorno futuro: solo cambio piatto e meal prep. */
  passato: boolean;
  /** true se lo slot è 'casa' (serve al gate di "Cucinato ma non mangiato"). */
  aCasa: boolean;
  /** Porzioni extra già dichiarate sullo slot (0 = nessuna): valore iniziale dello stepper. */
  porzioniPreparate: number;
  /** true se lo slot è già coperto da una porzione pronta. */
  daPronti: boolean;
  /** Porzioni utilizzabili del piatto dello slot (0 nasconde "Uso una porzione pronta"). */
  prontiDisponibili: number;
  hrefScegli: string;
  onSaltato: () => void;
  onMangiatoAltro: () => void;
  onTornaAlPiano: () => void;
  onCucinatoNonMangiato: () => void;
  /** n = porzioni extra totali dello slot (0 rimuove); congelato = dove va il lotto. */
  onPreparaPorzioni: (n: number, congelato: boolean) => void;
  onUsaPronta: () => void;
  onNonUsarePronta: () => void;
  onChiudi: () => void;
}
```

- [ ] **Step 1: Riscrivi i test**

Sostituisci il contenuto di `FoglioAzioniPasto.test.tsx` con:

```tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FoglioAzioniPasto } from '../FoglioAzioniPasto';

function renderFoglio(sovrascrivi: Partial<Parameters<typeof FoglioAzioniPasto>[0]> = {}) {
  const handlers = {
    onSaltato: vi.fn(), onMangiatoAltro: vi.fn(), onTornaAlPiano: vi.fn(),
    onCucinatoNonMangiato: vi.fn(), onPreparaPorzioni: vi.fn(),
    onUsaPronta: vi.fn(), onNonUsarePronta: vi.fn(), onChiudi: vi.fn(),
  };
  render(
    <FoglioAzioniPasto
      nomePasto="Cena"
      spuntato={false}
      passato
      aCasa
      porzioniPreparate={0}
      daPronti={false}
      prontiDisponibili={0}
      hrefScegli="/settimana/2026-08-26/sd-3/scegli"
      {...handlers}
      {...sovrascrivi}
    />,
  );
  return handlers;
}

describe('FoglioAzioniPasto', () => {
  it('giorno passato: spunte visibili, link "Ho mangiato un altro piatto"', () => {
    renderFoglio();
    expect(screen.getByRole('button', { name: 'Saltato' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ho mangiato altro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ho mangiato un altro piatto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cucinato ma non mangiato' })).toBeInTheDocument();
  });

  it('giorno futuro: niente spunte, il link diventa "Cambia piatto"', () => {
    renderFoglio({ passato: false });
    expect(screen.queryByRole('button', { name: 'Saltato' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cucinato ma non mangiato' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cambia piatto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ne preparo di più' })).toBeInTheDocument();
  });

  it('"Cucinato ma non mangiato" solo se lo slot è a casa', () => {
    renderFoglio({ aCasa: false, spuntato: true });
    expect(screen.queryByRole('button', { name: 'Cucinato ma non mangiato' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Torna al piano' })).toBeInTheDocument();
  });

  it('"Uso una porzione pronta" compare solo con disponibilità, col numero', () => {
    renderFoglio({ prontiDisponibili: 0 });
    expect(screen.queryByText(/Uso una porzione pronta/)).not.toBeInTheDocument();
  });

  it('con disponibilità la voce mostra il numero e invoca il gesto', () => {
    const { onUsaPronta } = renderFoglio({ prontiDisponibili: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Uso una porzione pronta (2 pronte)' }));
    expect(onUsaPronta).toHaveBeenCalledTimes(1);
  });

  it('slot già daPronti: la voce diventa "Non uso la porzione pronta"', () => {
    const { onNonUsarePronta } = renderFoglio({ daPronti: true });
    fireEvent.click(screen.getByRole('button', { name: 'Non uso la porzione pronta' }));
    expect(onNonUsarePronta).toHaveBeenCalledTimes(1);
  });

  it('lo stepper parte dalle porzioni dichiarate e salva n + congelato', () => {
    const { onPreparaPorzioni } = renderFoglio({ porzioniPreparate: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Ne preparo di più' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una porzione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Freezer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salva porzioni' }));
    expect(onPreparaPorzioni).toHaveBeenCalledWith(3, true);
  });

  it('lo stepper a zero salva la rimozione', () => {
    const { onPreparaPorzioni } = renderFoglio({ porzioniPreparate: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Ne preparo di più' }));
    fireEvent.click(screen.getByRole('button', { name: 'Togli una porzione' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salva porzioni' }));
    expect(onPreparaPorzioni).toHaveBeenCalledWith(0, false);
  });

  it('il tap sul fondale chiude', () => {
    const { onChiudi } = renderFoglio();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onChiudi).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run src/components/__tests__/FoglioAzioniPasto.test.tsx`
Expected: FAIL (props nuove inesistenti).

- [ ] **Step 3: Implementa**

Riscrivi `FoglioAzioniPasto.tsx` mantenendo `stileVoce`, `Voce`, l'overlay
`role="dialog"` col fondale che chiude e il titolo esistente. Struttura del
corpo (dall'alto):

1. Titolo `COM'È ANDATA — {nome}` (invariato; per `passato === false` il
   titolo diventa `PROSSIMAMENTE — {nome}`).
2. **Sezione spunte, solo se `passato`**: `Saltato`, `Ho mangiato altro`,
   link `Ho mangiato un altro piatto` → `hrefScegli`,
   `Cucinato ma non mangiato` (solo se `aCasa`), `Torna al piano` (solo se
   `spuntato`).
3. Per `!passato`: solo il link con etichetta `Cambia piatto` → `hrefScegli`.
4. Separatore `MEAL PREP` (stesso stile mono del titolo).
5. `Uso una porzione pronta (N pronte)` se `!daPronti && prontiDisponibili > 0`
   (singolare "1 pronta" / plurale "N pronte");
   `Non uso la porzione pronta` se `daPronti`.
6. `Ne preparo di più` — al tap espande una riga stepper:

```tsx
function Stepper({ iniziale, onSalva }: { iniziale: number; onSalva: (n: number, congelato: boolean) => void }) {
  const [n, setN] = useState(iniziale);
  const [congelato, setCongelato] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px' }}>
      <button type="button" aria-label="Togli una porzione" onClick={() => setN((v) => Math.max(0, v - 1))} style={{ ...stileVoce, width: 44, minHeight: 44 }}>−</button>
      <span style={{ minWidth: 28, textAlign: 'center', fontSize: 17, fontWeight: 800 }}>{n}</span>
      <button type="button" aria-label="Aggiungi una porzione" onClick={() => setN((v) => Math.min(6, v + 1))} style={{ ...stileVoce, width: 44, minHeight: 44 }}>+</button>
      <button type="button" onClick={() => setCongelato(false)} aria-pressed={!congelato} style={{ ...stileVoce, flex: 1, minHeight: 44, opacity: congelato ? 0.45 : 1 }}>Frigo</button>
      <button type="button" onClick={() => setCongelato(true)} aria-pressed={congelato} style={{ ...stileVoce, flex: 1, minHeight: 44, opacity: congelato ? 1 : 0.45 }}>Freezer</button>
      <button type="button" aria-label="Salva porzioni" onClick={() => onSalva(n, congelato)} style={{ ...stileVoce, width: 74, minHeight: 44, background: '#14163A', color: '#FFFFFF' }}>Salva</button>
    </div>
  );
}
```

(`useState` va importato da `react`; lo stepper vive nello stesso file; il
bottone "Ne preparo di più" fa da toggle dell'espansione).

- [ ] **Step 4: Verifica + suite + commit**

Run: `npx vitest run src/components/__tests__/FoglioAzioniPasto.test.tsx` poi `npx vitest run` — attenzione: i test della pagina Settimana ora falliranno per le props mancanti SOLO se il componente le rende obbligatorie e la pagina non le passa ancora; per tenere la suite verde fra Task 6 e 7, in questo task aggiorna ANCHE la chiamata a `<FoglioAzioniPasto ...>` in `src/app/(app)/settimana/page.tsx` (righe ~436-445) passando i valori minimi coerenti con l'oggi:

```tsx
          passato={foglio.slot.data <= oggi}
          aCasa={foglio.slot.stato === 'casa'}
          porzioniPreparate={foglio.slot.porzioniPreparate}
          daPronti={foglio.slot.daPronti}
          prontiDisponibili={0}
          onCucinatoNonMangiato={() => {}}
          onPreparaPorzioni={() => {}}
          onUsaPronta={() => {}}
          onNonUsarePronta={() => {}}
```

(il collegamento vero è del Task 7; con `prontiDisponibili={0}` e handler
vuoti il comportamento visibile della pagina non cambia).

```bash
git add src/components/FoglioAzioniPasto.tsx src/components/__tests__/FoglioAzioniPasto.test.tsx "src/app/(app)/settimana/page.tsx"
git commit -m "feat(ui): il foglio azioni guadagna la sezione MEAL PREP"
```

---

### Task 7: Pagina Settimana — wiring dei gesti e foglio su tutti i giorni

**Files:**
- Modify: `src/app/(app)/settimana/page.tsx`
- Test: `src/app/(app)/settimana/__tests__/page.test.tsx` (aggiunte)

**Interfaces:**
- Consumes: `aggiornaSlot` col patch esteso (Task 5); `leggiPronti` (Task 4); `porzioniUtilizzabili` (Task 2); props del foglio (Task 6).

- [ ] **Step 1: Scrivi i test (falliranno)** — nel describe `spunta pasti` (che ha già il suo beforeEach), con i mock preparati come nei test esistenti del file più `vi.mocked(leggiPronti).mockResolvedValue([...])` (aggiungi `leggiPronti: vi.fn()` alla factory di un nuovo `vi.mock('@/data/pronti', ...)` e l'import):

```tsx
  it('a settimana confermata il foglio si apre anche sui giorni futuri, senza spunte', async () => {
    // settimana confermata, mock standard, leggiPronti → []
    // naviga a un giorno futuro con "Giorno successivo" finché il selezionato è > oggi
    // (o costruisci la settimana in modo che esista un giorno futuro; se oggi è
    // domenica, il test salta con it.skipIf(INDICE_OGGI === 6))
    // click su 'Azioni per Cena' → il foglio mostra 'Cambia piatto' e 'Ne preparo di più',
    // NON 'Saltato'.
  });

  it('"Ne preparo di più" salva porzioni e congelato via aggiornaSlot', async () => {
    // giorno di oggi, foglio aperto, 'Ne preparo di più' → stepper → '+' → 'Freezer' → 'Salva porzioni'
    // expect(aggiornaSlot).toHaveBeenCalledWith(`${OGGI}:sd-3`, { porzioniPreparate: 1, prontiCongelato: true }, 'checkin');
  });

  it('"Uso una porzione pronta" manda daPronti e stato casa; il sottotitolo mostra "Porzione pronta"', async () => {
    // leggiPronti → [{ id: 'l-1', dishId: DISH_CENA.id, porzioni: 2, congelato: true, preparataIl: <ieri>, mealSlotId: null }]
    // foglio su Cena di oggi → 'Uso una porzione pronta (2 pronte)'
    // expect(aggiornaSlot).toHaveBeenCalledWith(`${OGGI}:sd-3`, { daPronti: true, stato: 'casa' }, 'checkin');
    // await screen.findByText(/Porzione pronta/);
  });

  it('"Cucinato ma non mangiato" manda saltato + una porzione in più', async () => {
    // foglio su Cena di oggi (slot porzioniPreparate 0) → 'Cucinato ma non mangiato'
    // expect(aggiornaSlot).toHaveBeenCalledWith(`${OGGI}:sd-3`, { stato: 'saltato', porzioniPreparate: 1 }, 'checkin');
  });

  it('"Torna al piano" azzera anche daPronti', async () => {
    // slot di oggi con stato 'saltato' nei fixture → foglio → 'Torna al piano'
    // expect(aggiornaSlot).toHaveBeenCalledWith(`${OGGI}:sd-3`, { stato: 'casa', daPronti: false }, 'checkin');
  });
```

I cinque scheletri sopra vanno scritti per intero con i fixture reali del
file (buildSlots, DISH_CENA, OGGI): sono il contratto del task, non
suggerimenti.

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run "src/app/(app)/settimana/__tests__/page.test.tsx"`

- [ ] **Step 3: Implementa nella pagina**

**(a)** Import: `leggiPronti` da `@/data/pronti`, `porzioniUtilizzabili` da
`@/domain/pronti`, tipo `LottoPronto`.

**(b)** Stato: `const [lotti, setLotti] = useState<LottoPronto[]>([]);` —
caricato nel `Promise.all` dell'effetto (aggiungi `leggiPronti()`) e
ricaricato dopo ogni gesto prep (`leggiPronti().then(setLotti)` nel `try`
dei nuovi handler).

**(c)** Disponibilità per piatto:

```tsx
  const prontiPerPiatto = new Map<string, number>();
  for (const lotto of lotti) {
    prontiPerPiatto.set(
      lotto.dishId,
      (prontiPerPiatto.get(lotto.dishId) ?? 0) + porzioniUtilizzabili(lotto, oggi),
    );
  }
```

**(d)** Il foglio si apre su ogni giorno a settimana non-bozza — sostituisci
la riga di `spuntabile` (~388):

```tsx
            const apribile = settimana.stato !== 'bozza';
```

e `onApriAzioni={apribile ? () => setFoglio({ slot, def }) : undefined}`.

**(e)** Handler nuovi, accanto a `spuntaStato` (stesso pattern: chiudi
foglio, ottimismo locale dove sensato, revert su errore, `setErroreCheckin`;
dopo il successo dei gesti prep ricarica i lotti):

```tsx
  async function preparaPorzioni(slot: MealSlot, n: number, congelato: boolean) {
    setFoglio(null);
    setErroreCheckin(null);
    aggiornaSlotLocale({ ...slot, porzioniPreparate: n });
    try {
      await aggiornaSlot(slot.id, { porzioniPreparate: n, prontiCongelato: congelato }, 'checkin');
      setLotti(await leggiPronti());
    } catch (errore) {
      console.error('settimana: preparazione porzioni fallita.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
    }
  }

  async function usaPronta(slot: MealSlot) {
    setFoglio(null);
    setErroreCheckin(null);
    aggiornaSlotLocale({ ...slot, daPronti: true, stato: 'casa' });
    try {
      await aggiornaSlot(slot.id, { daPronti: true, stato: 'casa' }, 'checkin');
      setLotti(await leggiPronti());
    } catch (errore) {
      console.error('settimana: uso porzione pronta fallito.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
    }
  }

  async function nonUsarePronta(slot: MealSlot) {
    setFoglio(null);
    setErroreCheckin(null);
    aggiornaSlotLocale({ ...slot, daPronti: false });
    try {
      await aggiornaSlot(slot.id, { daPronti: false }, 'checkin');
      setLotti(await leggiPronti());
    } catch (errore) {
      console.error('settimana: restituzione porzione fallita.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
    }
  }

  async function cucinatoNonMangiato(slot: MealSlot) {
    setFoglio(null);
    setErroreCheckin(null);
    const risultato = { ...applicaStato(slot, 'saltato', 'checkin'), porzioniPreparate: slot.porzioniPreparate + 1 };
    aggiornaSlotLocale(risultato);
    try {
      await aggiornaSlot(slot.id, { stato: 'saltato', porzioniPreparate: slot.porzioniPreparate + 1 }, 'checkin');
      setLotti(await leggiPronti());
    } catch (errore) {
      console.error('settimana: cucinato-non-mangiato fallito.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
    }
  }
```

**(f)** "Torna al piano" azzera anche daPronti — nella chiamata del foglio
sostituisci `onTornaAlPiano={() => spuntaStato(foglio.slot, 'casa')}` con un
handler che manda il patch completo: crea

```tsx
  async function tornaAlPiano(slot: MealSlot) {
    setFoglio(null);
    setErroreCheckin(null);
    const risultato = { ...applicaStato(slot, 'casa', 'checkin'), daPronti: false };
    aggiornaSlotLocale(risultato);
    try {
      await aggiornaSlot(slot.id, { stato: 'casa', daPronti: false }, 'checkin');
      setLotti(await leggiPronti());
    } catch (errore) {
      console.error('settimana: torna al piano fallito.', errore);
      aggiornaSlotLocale(slot);
      setErroreCheckin('Non siamo riusciti a salvare il cambiamento. Riprova.');
    }
  }
```

**(g)** Il foglio riceve tutto (sostituisci il blocco ~436-445, eliminando i
segnaposto del Task 6):

```tsx
      {foglio && (
        <FoglioAzioniPasto
          nomePasto={foglio.def.nome}
          spuntato={foglio.slot.stato === 'saltato' || foglio.slot.stato === 'sostituito'}
          passato={foglio.slot.data <= oggi}
          aCasa={foglio.slot.stato === 'casa'}
          porzioniPreparate={foglio.slot.porzioniPreparate}
          daPronti={foglio.slot.daPronti}
          prontiDisponibili={foglio.slot.dishId ? prontiPerPiatto.get(foglio.slot.dishId) ?? 0 : 0}
          hrefScegli={`/settimana/${foglio.slot.data}/${foglio.def.id}/scegli`}
          onSaltato={() => spuntaStato(foglio.slot, 'saltato')}
          onMangiatoAltro={() => spuntaStato(foglio.slot, 'sostituito')}
          onTornaAlPiano={() => tornaAlPiano(foglio.slot)}
          onCucinatoNonMangiato={() => cucinatoNonMangiato(foglio.slot)}
          onPreparaPorzioni={(n, congelato) => preparaPorzioni(foglio.slot, n, congelato)}
          onUsaPronta={() => usaPronta(foglio.slot)}
          onNonUsarePronta={() => nonUsarePronta(foglio.slot)}
          onChiudi={() => setFoglio(null)}
        />
      )}
```

**(h)** Sottotitolo della riga pasto — dove oggi la pagina passa
`sottotitolo={piatto ? descriviScelte(...) : null}`, componi:

```tsx
                sottotitolo={[
                  slot.daPronti ? 'Porzione pronta' : null,
                  piatto ? descriviScelte(piatto, slot.scelte, nomePerIngrediente) : null,
                  slot.porzioniPreparate > 0 ? `+${slot.porzioniPreparate} porzioni` : null,
                ].filter(Boolean).join(' · ') || null}
```

- [ ] **Step 4: Verifica + suite + commit**

Run: `npx vitest run "src/app/(app)/settimana/__tests__/page.test.tsx"` poi `npx vitest run`, `npx eslint src`, `npx tsc --noEmit`.

```bash
git add "src/app/(app)/settimana/page.tsx" "src/app/(app)/settimana/__tests__/page.test.tsx"
git commit -m "feat(ui): i gesti del meal prep in Settimana, foglio su tutti i giorni"
```

---

### Task 8: Dispensa — sezione "Pronti" + README

**Files:**
- Modify: `src/app/(app)/dispensa/page.tsx`
- Test: `src/app/(app)/dispensa/__tests__/page.test.tsx` (aggiunte; se il file non esiste, crealo replicando il pattern di mock dei test delle altre pagine)
- Modify: `README.md`

**Interfaces:**
- Consumes: `leggiPronti`, `correggiLotto`, `impostaCongelatoLotto`, `eliminaLotto` (Task 4); `porzioniUtilizzabili` (Task 2); `leggiRepertorio` (nomi piatti — legge TUTTI i piatti, anche inattivi? No: `leggiRepertorio` filtra gli attivi; per il nome di un piatto inattivo con lotti si mostra "Piatto eliminato" — spec §7 accetta il caso); `leggiSettimanaCorrente` (impegni).

- [ ] **Step 1: Scrivi i test (falliranno)**

```tsx
// Mock: '@/data/pronti' (le 4 funzioni), '@/data/settimana' (leggiSettimanaCorrente),
// più i mock già usati dalla pagina ('@/data/repertorio', '@/data/dispensa',
// '@/data/impostazioni'). leggiRepertorio va aggiunto alla factory di repertorio
// se la pagina oggi importa solo leggiIngredienti.

  it('la sezione PRONTI mostra i lotti utilizzabili col nome del piatto e gli impegni', async () => {
    // leggiPronti → [lotto farrotto 2 porzioni congelato, lotto scaduto fresco di 10 giorni fa]
    // leggiRepertorio → [farrotto], leggiSettimanaCorrente → settimana con uno slot daPronti futuro sul farrotto
    // atteso: screen mostra 'PRONTI', 'Farrotto ai funghi', '2', '1 impegnata', e NON il lotto scaduto
  });

  it('senza lotti utilizzabili la sezione non compare', async () => {
    // leggiPronti → [] → queryByText('PRONTI') assente
  });

  it('correzione del numero e toggle freezer chiamano il data layer', async () => {
    // interazione sulla tessera → correggiLotto / impostaCongelatoLotto con gli id giusti
  });
```

(Anche qui: scheletri da scrivere per intero con fixture concreti.)

- [ ] **Step 2: Verifica che falliscano**, poi implementa.

- [ ] **Step 3: Implementa la sezione**

In `dispensa/page.tsx`:

**(a)** Import: `leggiPronti, correggiLotto, impostaCongelatoLotto, eliminaLotto` da `@/data/pronti`; `porzioniUtilizzabili` da `@/domain/pronti`; `leggiRepertorio` da `@/data/repertorio`; `leggiSettimanaCorrente` da `@/data/settimana`; tipi `LottoPronto, Dish, MealSlot`.

**(b)** Stato: `lotti: LottoPronto[]`, `nomiPiatti: Map<string, string>`, `impegniPerPiatto: Map<string, number>` — caricati nel `Promise.all` esistente (aggiungi `leggiPronti()`, `leggiRepertorio()`, `leggiSettimanaCorrente()`); gli impegni contano gli slot `daPronti` con `data >= oggi` della settimana corrente, per `dishId`.

**(c)** Render, PRIMA del `<Gruppo titolo="IN CASA" ...>`:

```tsx
        <SezionePronti
          lotti={lotti.filter((l) => porzioniUtilizzabili(l, oggi) > 0)}
          nomiPiatti={nomiPiatti}
          impegniPerPiatto={impegniPerPiatto}
          onCorreggi={correggiLottoOttimistico}
          onCongela={congelaLottoOttimistico}
          onElimina={eliminaLottoOttimistico}
        />
```

con `oggi = new Date().toISOString().slice(0, 10)` e i tre handler
ottimistici sul pattern di `salva`/`cambiaCongelato` esistenti (aggiorna
`lotti` localmente, chiama il data layer, revert + `setErroreSalvataggio`
su errore).

**(d)** `SezionePronti` come funzione nel file (stile di `Gruppo`): se
`lotti.length === 0` restituisce `null`; altrimenti titolo `PRONTI` e una
tessera per lotto: nome piatto (`nomiPiatti.get(dishId) ?? 'Piatto eliminato'`),
data breve (`dataBreve(preparataIl)` — la helper esiste già nel file),
numero porzioni con input numerico (blur → `onCorreggi(id, n)`), toggle
Frigo/Freezer (`onCongela(id, !congelato)`), bottone elimina
(`onElimina(id)`), e la riga impegni se `impegniPerPiatto.get(dishId)` > 0:
`"1 impegnata"` / `"N impegnate"`.

- [ ] **Step 4: README**

Dopo la sezione "Spunta pasti" del README aggiungi:

```markdown
## Meal prepping

Cucinare oggi quello che mangi un altro giorno. Dal foglio azioni di un
pasto: **Ne preparo di più** (le porzioni extra escono subito dal residuo ed
entrano nei Pronti, frigo o freezer), **Uso una porzione pronta** (il pasto
non consuma ingredienti crudi), **Cucinato ma non mangiato** (la tua
porzione finisce nei Pronti). La sezione **Pronti** della Dispensa mostra i
lotti: le porzioni fresche durano 3 giorni, le congelate 90, poi spariscono
da sole. Dichiarare il prep prima di confermare la settimana fa comprare
alla lista le quantità giuste; dopo la spesa, ci pensa il registro degli
storni.
```

- [ ] **Step 5: Verifica + suite + commit**

Run: `npx vitest run`, `npx eslint src`, `npx tsc --noEmit`.

```bash
git add "src/app/(app)/dispensa/page.tsx" "src/app/(app)/dispensa/__tests__/page.test.tsx" README.md
git commit -m "feat(ui): la sezione Pronti in Dispensa, coi lotti e gli impegni"
```

---

## Dopo l'ultimo task (fuori dal perimetro dei subagent)

1. Review finale whole-branch (modello più capace).
2. **Gate di Andrea**: applicazione della migrazione 0009 in produzione + giro E2E in locale (con snapshot e ripristino, come per il P2).
3. **Gate di Andrea**: merge su main + deploy.
