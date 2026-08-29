# Alternative nel dominio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rappresentare gli "oppure" delle diete vere (piatti sorella sullo stesso giorno + componenti con opzioni dentro il piatto), risolti al check-in dal planner col criterio "meno confezioni nuove vince, a parità rotazione".

**Architecture:** Approccio ibrido della spec: le alternative fra pasti sono più piatti fissati sullo stesso `slotDefId+giornoCiclo+settimanaCiclo` (nessun campo nuovo); quelle dentro il piatto sono `Componente[]` con `OpzioneComponente[]`; la scelta della settimana vive su `MealSlot.scelte` con fonte per singola scelta. Piatto senza componenti = caso degenere identico a oggi.

**Tech Stack:** Next.js + TypeScript strict, Vitest, Supabase (Postgres + RLS). Dominio puro in `src/domain` (niente rete, niente DB), data layer in `src/data`.

**Spec:** `docs/superpowers/specs/2026-08-29-alternative-design.md` — il piano ne implementa ogni sezione; leggerla prima.

## Global Constraints

- Dominio puro: le funzioni in `src/domain` non toccano rete, DB, LLM (commento in testa a `list-builder.ts`).
- Regressione: i test esistenti restano verdi; le uniche modifiche ammesse ai file esistenti di test/fixture sono aggiunte di campi richieste dal typecheck (`componenti: []`, `scelte: {}`).
- Tutto il codice, i commenti e i messaggi in italiano, nello stile dei file esistenti (commenti che spiegano il perché, non il cosa).
- Ogni tabella nuova: `user_id` + RLS identica al blocco di `0002_rls.sql`.
- Verifica completa prima di ogni commit: `npm test && npx tsc --noEmit`. Alla fine del piano anche `npm run build && npm run lint`.
- Non applicare la migrazione al database di produzione senza l'ok esplicito di Andrea (Task 8, passo dedicato).

---

### Task 1: Tipi di dominio e costruttori degeneri

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/__tests__/fixtures.ts` (aggiunta campi ai piatti/slot esistenti)
- Modify: `src/data/mappers.ts:29-38` (`aMealSlot`)
- Modify: `src/data/repertorio.ts:19-29` (`leggiRepertorio` — literal `Dish`)
- Test: la suite esistente (nessun test nuovo: questo task non aggiunge comportamento)

**Interfaces:**
- Produces: `Componente { id, nome, opzioni }`, `OpzioneComponente { id, righe }`, `Scelta { opzioneId, fonte }`, `Dish.componenti: Componente[]`, `MealSlot.scelte: Record<string, Scelta>` — tutti i task successivi li consumano con questi nomi esatti.

- [ ] **Step 1: Aggiungere i tipi a `src/domain/types.ts`**

Dopo `DishIngredient`, prima di `Dish`:

```ts
export interface OpzioneComponente {
  id: string;
  /** Le righe ingrediente che questa opzione comporta (>=1: "ricotta 50g + noci 20g" è UNA opzione). */
  righe: DishIngredient[];
}

export interface Componente {
  id: string;
  /** Etichetta mostrata in Scegli e nell'editor: "pane", "farcitura". */
  nome: string;
  /** >=1. La prima è il default quando nessuna scelta è registrata. */
  opzioni: OpzioneComponente[];
}

export interface Scelta {
  opzioneId: string;
  /** Come fonteStato: una scelta 'manuale' non viene mai sovrascritta dal planner. */
  fonte: 'planner' | 'manuale';
}
```

In `Dish`, dopo `ingredienti: DishIngredient[];`:

```ts
  /** Componenti a scelta. [] = piatto senza alternative = comportamento identico a prima. */
  componenti: Componente[];
```

In `MealSlot`, dopo `fonteStato: FonteStato;`:

```ts
  /**
   * componenteId -> scelta della settimana. Vuoto finché il planner non
   * risolve. La fonte è per singola scelta: si può correggere a mano un solo
   * componente e lasciare gli altri al planner.
   */
  scelte: Record<string, Scelta>;
```

- [ ] **Step 2: Aggiornare i costruttori esistenti perché il typecheck torni verde**

In `src/domain/__tests__/fixtures.ts`: aggiungere `componenti: []` ai piatti `colazione` e `frittata`, e `scelte: {}` agli slot di `cinqueColazioni()`.

In `src/data/mappers.ts`, `aMealSlot`: aggiungere `scelte: {}` al literal (le scelte vere arrivano dal Task 8 con la lettura di `meal_slot_choice`; qui il default degenere).

In `src/data/repertorio.ts`, `leggiRepertorio`: aggiungere `componenti: []` al literal (la lettura vera arriva dal Task 7).

- [ ] **Step 3: Verificare**

Run: `npm test && npx tsc --noEmit`
Expected: suite verde, zero errori di tipo.

- [ ] **Step 4: Commit**

```bash
git add src/domain/types.ts src/domain/__tests__/fixtures.ts src/data/mappers.ts src/data/repertorio.ts
git commit -m "feat(tipi): componenti con opzioni sul piatto, scelte sullo slot - caso degenere invariato"
```

---

### Task 2: Migrazione 0006

**Files:**
- Create: `supabase/migrations/0006_alternative.sql`

**Interfaces:**
- Produces: tabelle `dish_option`, `meal_slot_choice`; colonna `dish_ingredient.option_id`. I Task 7-8 le leggono/scrivono con questi nomi esatti.

- [ ] **Step 1: Scrivere il file**

```sql
-- Le alternative delle diete vere ("oppure"), decise nel design del 29/08/2026.
--
-- Fra pasti: nessuna tabella — due piatti fissati sullo stesso
-- slot_def_id+giorno_ciclo+settimana_ciclo SONO il gruppo, sceglie il planner.
-- Dentro il piatto: un componente ("pane", "farcitura") raggruppa opzioni;
-- ogni opzione possiede le sue righe in dish_ingredient via option_id.
-- La scelta della settimana vive in meal_slot_choice: è un fatto della
-- settimana, non del piatto.

create table dish_option (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dish_id uuid not null references dish(id) on delete cascade,
  -- Il componente non ha una tabella: è una chiave di raggruppamento più il
  -- suo nome, ripetuti su ogni opzione. Una tabella in più non comprerebbe
  -- niente: il componente non ha altri attributi.
  componente_id uuid not null,
  componente_nome text not null,
  -- Ordine dentro il componente: la posizione 0 è l'opzione di default.
  posizione int not null check (posizione >= 0),
  unique (dish_id, componente_id, posizione)
);

-- Riga fissa = option_id NULL (tutte le righe esistenti restano valide così).
alter table dish_ingredient
  add column option_id uuid references dish_option(id) on delete cascade;

-- Lo stesso ingrediente può comparire in più opzioni dello stesso piatto
-- (pane 60g nell'opzione A, pane 80g nella B): il vincolo unico originale lo
-- impedirebbe. Si sostituisce con due indici: le righe fisse restano uniche
-- per ingrediente, le righe di opzione sono uniche dentro la loro opzione.
alter table dish_ingredient
  drop constraint dish_ingredient_dish_id_ingredient_id_key;
create unique index dish_ingredient_fisso_unico
  on dish_ingredient (dish_id, ingredient_id) where option_id is null;
create unique index dish_ingredient_opzione_unica
  on dish_ingredient (option_id, ingredient_id) where option_id is not null;

create table meal_slot_choice (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_slot_id uuid not null references meal_slot(id) on delete cascade,
  componente_id uuid not null,
  option_id uuid not null references dish_option(id) on delete cascade,
  fonte text not null check (fonte in ('planner', 'manuale')),
  unique (meal_slot_id, componente_id)
);

create index on dish_option (dish_id);
create index on meal_slot_choice (meal_slot_id);

-- RLS: stesso blocco di 0002_rls.sql, solo per le due tabelle nuove.
do $$
declare t text;
begin
  foreach t in array array['dish_option', 'meal_slot_choice'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy %I on %I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_proprietario', t
    );
  end loop;
end $$;

comment on table dish_option is
  'Un''opzione di un componente del piatto. componente_id+componente_nome raggruppano; posizione 0 = default.';
comment on table meal_slot_choice is
  'Quale opzione vale per quel pasto in quella settimana. fonte=manuale non viene mai sovrascritta dal planner.';
```

- [ ] **Step 2: Verificare che il nome del constraint da rimuovere sia quello vero**

Run (MCP supabase, sola lettura): `execute_sql` con
`select conname from pg_constraint where conrelid = 'dish_ingredient'::regclass and contype = 'u';`
Expected: `dish_ingredient_dish_id_ingredient_id_key`. Se il nome differisce, correggere il `drop constraint` nel file.

**NON applicare la migrazione ora**: si applica nel Task 8, dopo che il codice che la usa esiste, con l'ok di Andrea (è il database di produzione).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0006_alternative.sql
git commit -m "feat(schema): migrazione 0006, opzioni per componente e scelte della settimana"
```

---

### Task 3: `confezioniNecessarie` condivisa

Chiude il primo gap della spec: il conta-confezioni del planner non duplica l'aritmetica del list-builder — la stessa funzione serve entrambi.

**Files:**
- Create: `src/domain/confezioni.ts`
- Create: `src/domain/__tests__/confezioni.test.ts`
- Modify: `src/domain/list-builder.ts:123-127` (usare la funzione al posto dell'aritmetica inline)

**Interfaces:**
- Produces: `confezioniNecessarie(i: ConfezioniInput): ConfezioniRisultato` con
  `ConfezioniInput { fabbisogno: number; residuo: number; classeResiduo: 'porzionabile' | 'intero'; formatoConfezione: number }` e
  `ConfezioniRisultato { daComprare: number; confezioni: number; quantitaTotale: number }`.
  La classe `stima` è esclusa per contratto: chi chiama filtra prima (regola 7).

- [ ] **Step 1: Scrivere i test**

```ts
// src/domain/__tests__/confezioni.test.ts
import { describe, expect, it } from 'vitest';
import { confezioniNecessarie } from '../confezioni';

describe('confezioniNecessarie', () => {
  it('arrotonda per eccesso al formato confezione', () => {
    const r = confezioniNecessarie({ fabbisogno: 80, residuo: 0, classeResiduo: 'porzionabile', formatoConfezione: 1000 });
    expect(r).toEqual({ daComprare: 80, confezioni: 1, quantitaTotale: 1000 });
  });

  it('il residuo copre tutto: zero confezioni', () => {
    const r = confezioniNecessarie({ fabbisogno: 80, residuo: 920, classeResiduo: 'porzionabile', formatoConfezione: 1000 });
    expect(r).toEqual({ daComprare: 0, confezioni: 0, quantitaTotale: 0 });
  });

  it('classe intero: il formato è 1, si compra a pezzi', () => {
    const r = confezioniNecessarie({ fabbisogno: 3, residuo: 1, classeResiduo: 'intero', formatoConfezione: 6 });
    expect(r).toEqual({ daComprare: 2, confezioni: 2, quantitaTotale: 2 });
  });

  it('residuo maggiore del fabbisogno non produce numeri negativi', () => {
    const r = confezioniNecessarie({ fabbisogno: 50, residuo: 200, classeResiduo: 'porzionabile', formatoConfezione: 500 });
    expect(r).toEqual({ daComprare: 0, confezioni: 0, quantitaTotale: 0 });
  });
});
```

- [ ] **Step 2: Verificare che falliscano**

Run: `npx vitest run src/domain/__tests__/confezioni.test.ts`
Expected: FAIL (modulo inesistente).

- [ ] **Step 3: Implementare `src/domain/confezioni.ts`**

```ts
import type { ClasseResiduo } from './types';

export interface ConfezioniInput {
  /** In unitaBase dell'ingrediente, già moltiplicato per le porzioni. */
  fabbisogno: number;
  /** Residuo utilizzabile (residuoUtilizzabile già applicato da chi chiama). */
  residuo: number;
  /** `stima` esclusa per contratto: regola 7, nessuna aritmetica. Chi chiama filtra. */
  classeResiduo: Exclude<ClasseResiduo, 'stima'>;
  formatoConfezione: number;
}

export interface ConfezioniRisultato {
  daComprare: number;
  confezioni: number;
  /** confezioni × formato effettivo: quanto entra in casa comprando. */
  quantitaTotale: number;
}

/**
 * L'aritmetica delle confezioni, unica per list-builder e planner: se
 * divergessero, il planner sceglierebbe un'opzione "che non costa niente"
 * e la lista poi la farebbe pagare.
 */
export function confezioniNecessarie(i: ConfezioniInput): ConfezioniRisultato {
  const daComprare = Math.max(0, i.fabbisogno - i.residuo);
  const formato = i.classeResiduo === 'intero' ? 1 : i.formatoConfezione;
  const confezioni = Math.ceil(daComprare / formato);
  return { daComprare, confezioni, quantitaTotale: confezioni * formato };
}
```

- [ ] **Step 4: Usarla nel list-builder**

In `src/domain/list-builder.ts`, sostituire le righe 123-127 (da `const daComprare` a `const quantitaTotale`) con:

```ts
    const { daComprare, confezioni, quantitaTotale } = confezioniNecessarie({
      fabbisogno,
      residuo,
      classeResiduo: ing.classeResiduo, // 'stima' è già stata esclusa sopra (regola 7)
      formatoConfezione: ing.formatoConfezione,
    });
    if (confezioni === 0) continue; // il residuo copre già tutto
```

(l'`if` esistente resta, il calcolo di `residuoPrevisto` sotto non cambia). Aggiungere l'import in testa: `import { confezioniNecessarie } from './confezioni';`. TypeScript accetterà `ing.classeResiduo` perché il `continue` sulla riga 110 ha già escluso `stima`? No: il narrowing non attraversa il loop — usare `ing.classeResiduo as Exclude<ClasseResiduo, 'stima'>` con un commento di una riga che rimanda alla regola 7, e importare `ClasseResiduo` dai tipi.

- [ ] **Step 5: Verificare tutto**

Run: `npm test && npx tsc --noEmit`
Expected: verde — in particolare `list-builder.test.ts` invariato e verde (refactor senza cambio di comportamento).

- [ ] **Step 6: Commit**

```bash
git add src/domain/confezioni.ts src/domain/__tests__/confezioni.test.ts src/domain/list-builder.ts
git commit -m "refactor(dominio): aritmetica delle confezioni estratta, unica per lista e planner"
```

---

### Task 4: `righeEffettive` e l'espansione delle opzioni nel list-builder

**Files:**
- Create: `src/domain/opzioni.ts`
- Create: `src/domain/__tests__/opzioni.test.ts`
- Modify: `src/domain/list-builder.ts:93-104` (espansione slot → righe)
- Modify: `src/domain/__tests__/fixtures.ts` (nuovo piatto con componenti)
- Test: `src/domain/__tests__/list-builder.test.ts` (aggiunta casi, senza toccare gli esistenti)

**Interfaces:**
- Consumes: `Componente`, `OpzioneComponente`, `Scelta` dal Task 1.
- Produces: `righeEffettive(dish: Dish, scelte: Record<string, Scelta>): DishIngredient[]`, `descriviScelte(dish: Dish, scelte: Record<string, Scelta>, nomePerIngrediente: Map<string, string>): string | null`, `class OpzioneMancanteError`. Il planner (Task 6) e le schermate (Task 9-10) li consumano.

- [ ] **Step 1: Fixture con componenti**

In `src/domain/__tests__/fixtures.ts` aggiungere (dopo `frittata`), riusando gli ingredienti esistenti:

```ts
/** Piatto con un componente a due opzioni: yogurt (default) oppure uova+passata. */
export const wrap: Dish = {
  id: 'pranzo-wrap', nome: 'Wrap', slotDefId: 'pra',
  fonte: 'nutrizionista', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null,
  ingredienti: [{ ingredientId: 'avena', quantita: 80, unita: 'g' }],
  componenti: [{
    id: 'farcitura', nome: 'farcitura',
    opzioni: [
      { id: 'farcitura-yogurt', righe: [{ ingredientId: 'yogurt', quantita: 100, unita: 'g' }] },
      { id: 'farcitura-uova', righe: [
        { ingredientId: 'uova', quantita: 2, unita: 'pz' },
        { ingredientId: 'passata', quantita: 50, unita: 'g' },
      ] },
    ],
  }],
};
```

- [ ] **Step 2: Scrivere i test di `righeEffettive` e `descriviScelte`**

```ts
// src/domain/__tests__/opzioni.test.ts
import { describe, expect, it } from 'vitest';
import { righeEffettive, descriviScelte, OpzioneMancanteError } from '../opzioni';
import { colazione, wrap } from './fixtures';

describe('righeEffettive', () => {
  it('piatto senza componenti: solo le righe fisse, identiche', () => {
    expect(righeEffettive(colazione, {})).toEqual(colazione.ingredienti);
  });

  it('espande l’opzione scelta insieme alle righe fisse', () => {
    const righe = righeEffettive(wrap, { farcitura: { opzioneId: 'farcitura-uova', fonte: 'planner' } });
    expect(righe).toEqual([
      { ingredientId: 'avena', quantita: 80, unita: 'g' },
      { ingredientId: 'uova', quantita: 2, unita: 'pz' },
      { ingredientId: 'passata', quantita: 50, unita: 'g' },
    ]);
  });

  it('scelta assente: vale la prima opzione, la lista non si rompe mai', () => {
    const righe = righeEffettive(wrap, {});
    expect(righe).toEqual([
      { ingredientId: 'avena', quantita: 80, unita: 'g' },
      { ingredientId: 'yogurt', quantita: 100, unita: 'g' },
    ]);
  });

  it('scelta che punta a un’opzione inesistente: errore esplicito, mai un salto silenzioso', () => {
    expect(() => righeEffettive(wrap, { farcitura: { opzioneId: 'fantasma', fonte: 'manuale' } }))
      .toThrow(OpzioneMancanteError);
  });
});

describe('descriviScelte', () => {
  const nomi = new Map([['yogurt', 'Yogurt greco'], ['uova', 'Uova'], ['passata', 'Passata di pomodoro']]);

  it('piatto senza componenti: niente sottotitolo', () => {
    expect(descriviScelte(colazione, {}, nomi)).toBeNull();
  });

  it('descrive l’opzione scelta coi nomi degli ingredienti', () => {
    expect(descriviScelte(wrap, { farcitura: { opzioneId: 'farcitura-uova', fonte: 'planner' } }, nomi))
      .toBe('Uova + Passata di pomodoro');
  });

  it('scelta assente: descrive il default', () => {
    expect(descriviScelte(wrap, {}, nomi)).toBe('Yogurt greco');
  });
});
```

- [ ] **Step 3: Verificare che falliscano**

Run: `npx vitest run src/domain/__tests__/opzioni.test.ts`
Expected: FAIL (modulo inesistente).

- [ ] **Step 4: Implementare `src/domain/opzioni.ts`**

```ts
import type { Dish, DishIngredient, Scelta } from './types';

export class OpzioneMancanteError extends Error {
  constructor(dishNome: string, componenteNome: string, opzioneId: string) {
    super(
      `Il piatto "${dishNome}" non ha più l'opzione ${opzioneId} del componente ` +
      `"${componenteNome}": la scelta registrata punta nel vuoto. Riapri il pasto ` +
      `da Scegli e conferma un'opzione esistente.`,
    );
    this.name = 'OpzioneMancanteError';
  }
}

/**
 * Le righe ingrediente che questo piatto comporta davvero, date le scelte
 * della settimana: righe fisse + l'opzione scelta di ogni componente.
 * Scelta assente → prima opzione (il default): uno slot mai passato dal
 * planner non deve mai rompere la lista. Scelta verso un'opzione rimossa →
 * errore esplicito: il piatto è cambiato sotto una scelta già registrata,
 * e saltare la riga in silenzio produrrebbe una lista sbagliata senza avviso.
 */
export function righeEffettive(dish: Dish, scelte: Record<string, Scelta>): DishIngredient[] {
  const righe = [...dish.ingredienti];
  for (const componente of dish.componenti) {
    const scelta = scelte[componente.id];
    const opzione = scelta === undefined
      ? componente.opzioni[0]
      : componente.opzioni.find((o) => o.id === scelta.opzioneId);
    if (!opzione) throw new OpzioneMancanteError(dish.nome, componente.nome, scelte[componente.id]!.opzioneId);
    righe.push(...opzione.righe);
  }
  return righe;
}

/**
 * Il sottotitolo della Settimana: le opzioni scelte, coi nomi degli
 * ingredienti ("Uova + Passata di pomodoro"; più componenti separati da " · ").
 * null per il piatto senza componenti: nessun sottotitolo da mostrare.
 */
export function descriviScelte(
  dish: Dish,
  scelte: Record<string, Scelta>,
  nomePerIngrediente: Map<string, string>,
): string | null {
  if (dish.componenti.length === 0) return null;
  const parti: string[] = [];
  for (const componente of dish.componenti) {
    const scelta = scelte[componente.id];
    const opzione = scelta === undefined
      ? componente.opzioni[0]
      : componente.opzioni.find((o) => o.id === scelta.opzioneId);
    if (!opzione) continue; // il sottotitolo non è il posto dove esplodere: ci pensa righeEffettive
    parti.push(
      opzione.righe
        .map((r) => nomePerIngrediente.get(r.ingredientId) ?? '?')
        .join(' + '),
    );
  }
  return parti.length > 0 ? parti.join(' · ') : null;
}
```

- [ ] **Step 5: Verificare che passino**

Run: `npx vitest run src/domain/__tests__/opzioni.test.ts`
Expected: PASS.

- [ ] **Step 6: Usare `righeEffettive` nel list-builder**

In `src/domain/list-builder.ts`, dentro il loop delle regole 1-3 (riga 97), sostituire `for (const riga of piatto.ingredienti) {` con:

```ts
    for (const riga of righeEffettive(piatto, slot.scelte)) {
```

Import in testa: `import { righeEffettive } from './opzioni';`.

- [ ] **Step 7: Test del list-builder con opzioni**

In `src/domain/__tests__/list-builder.test.ts` aggiungere (in coda, senza toccare i casi esistenti) un blocco che usa `wrap`: uno slot `{ id: 's1', data: '2026-08-31', slotDefId: 'pra', stato: 'casa', dishId: 'pranzo-wrap', fonteStato: 'default', scelte: { farcitura: { opzioneId: 'farcitura-uova', fonte: 'planner' } } }` con dispensa vuota deve produrre fabbisogni per avena, uova e passata e NON per yogurt; lo stesso slot con `scelte: {}` deve produrre avena e yogurt e NON uova. Usare `INGREDIENTI`, `IMPOSTAZIONI`, `dispensaVuota()` dalle fixtures come fanno i test esistenti.

- [ ] **Step 8: Verifica completa e commit**

Run: `npm test && npx tsc --noEmit`
Expected: verde, inclusi tutti i casi pre-esistenti del list-builder (il caso degenere è degenere).

```bash
git add src/domain/opzioni.ts src/domain/__tests__/opzioni.test.ts src/domain/list-builder.ts src/domain/__tests__/list-builder.test.ts src/domain/__tests__/fixtures.ts
git commit -m "feat(dominio): righeEffettive - la lista compra per l'opzione scelta, default la prima"
```

---

### Task 5: Planner — piatti sorella sullo stesso giorno

**Files:**
- Modify: `src/domain/planner.ts`
- Test: `src/domain/__tests__/planner.test.ts` (aggiunta casi)

**Interfaces:**
- Consumes: `confezioniNecessarie` (Task 3), `righeEffettive` (Task 4).
- Produces: `AssegnaPiattiInput` esteso con `ingredients?: Ingredient[]`, `pantry?: PantryState[]`, `oggi?: string`, `moltiplicatorePorzioni?: number` — tutti facoltativi insieme: senza, il criterio del residuo è spento e vale la sola rotazione (comportamento compatibile). Produce anche la funzione interna `costoInConfezioni(righe, residuoLavoro)` riusata dal Task 6.

- [ ] **Step 1: Scrivere i test delle sorelle**

In `src/domain/__tests__/planner.test.ts`, in coda. Servono fixture locali al test: due ingredienti (`cioccolato` formato 100 g, `noci` formato 200 g, entrambi `porzionabile`, non deperibili, area `dispensa`) e due piatti sorella fissati allo stesso giorno (`slotDefId: 'spu'`, `giornoCiclo: 0`, `settimanaCiclo: null`), `spuntinoCioccolato` (10 g cioccolato) e `spuntinoNoci` (20 g noci), `componenti: []`. Un solo slot lunedì `2026-08-31`, `slotDefId: 'spu'`, `stato: 'casa'`, `dishId: null`, `scelte: {}`.

```ts
describe('piatti sorella sullo stesso giorno', () => {
  it('vince la sorella che richiede meno confezioni nuove', () => {
    // 90 g di cioccolato in dispensa, niente noci: il cioccolato costa 0 confezioni, le noci 1.
    const out = assegnaPiatti({
      slots: [slotSpuntinoLunedi()],
      dishes: [spuntinoNoci, spuntinoCioccolato], // ordine sfavorevole: non deve contare
      ingredients: [cioccolato, noci],
      pantry: [residuoDi('cioccolato', 90)],
      oggi: '2026-08-31',
      moltiplicatorePorzioni: 1,
    });
    expect(out[0].dishId).toBe('spuntino-cioccolato');
  });

  it('a parità di confezioni decide la rotazione, che avanza con le settimane', () => {
    // Dispensa vuota: entrambe costano 1 confezione. settimaneTrascorse pari/dispari alterna.
    const pari = assegnaPiatti({ slots: [slotSpuntinoLunedi()], dishes: [spuntinoCioccolato, spuntinoNoci], ingredients: [cioccolato, noci], pantry: [], oggi: '2026-08-31', settimaneTrascorse: 0 });
    const dispari = assegnaPiatti({ slots: [slotSpuntinoLunedi()], dishes: [spuntinoCioccolato, spuntinoNoci], ingredients: [cioccolato, noci], pantry: [], oggi: '2026-08-31', settimaneTrascorse: 1 });
    expect(pari[0].dishId).not.toBe(dispari[0].dishId);
  });

  it('senza dati di dispensa (input facoltativi assenti) sceglie per rotazione', () => {
    const out = assegnaPiatti({ slots: [slotSpuntinoLunedi()], dishes: [spuntinoCioccolato, spuntinoNoci], settimaneTrascorse: 0 });
    expect(out[0].dishId).toBe('spuntino-cioccolato'); // ordinale 0 sull'elenco ordinato per id? No: sull'ordine dell'array — vedi Step 3
  });

  it('è deterministico: stessi input, stessa scelta', () => {
    const a = assegnaPiatti({ slots: [slotSpuntinoLunedi()], dishes: [spuntinoCioccolato, spuntinoNoci], ingredients: [cioccolato, noci], pantry: [residuoDi('cioccolato', 90)], oggi: '2026-08-31' });
    const b = assegnaPiatti({ slots: [slotSpuntinoLunedi()], dishes: [spuntinoNoci, spuntinoCioccolato], ingredients: [cioccolato, noci], pantry: [residuoDi('cioccolato', 90)], oggi: '2026-08-31' });
    expect(a[0].dishId).toBe(b[0].dishId);
  });
});
```

Nota per l'implementatore sul terzo test: la stabilità rispetto all'ordine dell'array vale per il *criterio del residuo* (test 4: il vincitore per costo non dipende dall'ordine). A parità di costo la rotazione usa l'ordinale sull'elenco dei candidati **ordinato per `id`** — così anche il tie-break è stabile rispetto all'ordine dell'array. Aggiornare il terzo test di conseguenza: con ordinamento per id, ordinale 0 → `spuntino-cioccolato` ('spuntino-cioccolato' < 'spuntino-noci').

- [ ] **Step 2: Verificare che falliscano**

Run: `npx vitest run src/domain/__tests__/planner.test.ts`
Expected: i casi nuovi FAIL (oggi `find` prende il primo fissato), gli esistenti PASS.

- [ ] **Step 3: Implementare**

In `src/domain/planner.ts`:

1. Estendere `AssegnaPiattiInput`:

```ts
  /**
   * I quattro input del criterio "residuo prima, rotazione poi". Tutti
   * facoltativi insieme: senza dispensa non c'è costo da confrontare e
   * decide la sola rotazione — il comportamento di prima del design delle
   * alternative.
   */
  ingredients?: Ingredient[];
  pantry?: PantryState[];
  /** ISO yyyy-mm-dd: serve a residuoUtilizzabile per la freschezza. */
  oggi?: string;
  moltiplicatorePorzioni?: number;
```

2. All'inizio di `assegnaPiatti`, costruire la **copia di lavoro del residuo** (una `Map<string, number>` ingredientId → residuo utilizzabile a `oggi`, via `residuoUtilizzabile` di `./pantry`; vuota se `pantry`/`ingredients`/`oggi` assenti).

3. Funzione interna `costoInConfezioni(righe: DishIngredient[], residuoLavoro: Map<string, number>): number`: somma su ogni riga di `confezioniNecessarie({...}).confezioni` con `fabbisogno = convertiInUnitaBase(...) × moltiplicatore` e `residuo = residuoLavoro.get(id) ?? 0`. Righe con ingrediente sconosciuto o classe `stima` → costo 0 e nessun conteggio (il planner non deve far fallire la creazione della settimana: agli errori pensa il list-builder). Se la copia di lavoro è vuota perché gli input facoltativi mancano → ritorna sempre 0 (tutte le opzioni pari → decide la rotazione).

4. Funzione interna `consumaDaResiduo(righe, residuoLavoro)`: per ogni riga non-`stima`, `fabbisogno` come sopra; se `residuoLavoro ≥ fabbisogno` scala; altrimenti simula l'acquisto: `residuoLavoro = residuo + quantitaTotale − fabbisogno` (da `confezioniNecessarie`). È la scalatura sequenziale della spec: il pasto di martedì non conta il residuo già impegnato da lunedì, e l'avanzo della confezione aperta lunedì è disponibile martedì.

5. Nel passo "il giorno fisso vince": raccogliere **tutti** i fissati di quel giorno (`filter`, non `find`). Uno solo → quello (e `consumaDaResiduo`). Più d'uno → ordinarli per `id`, calcolare `costoInConfezioni(righeEffettive(d, {}), residuoLavoro)` di ciascuno (le opzioni si valutano col default qui: la risoluzione fine dei componenti è del Task 6); vincitore = costo minimo; a parità, `pool[posizione]` con l'ordinale esistente (`settimaneTrascorse * 7 + indice data`) applicato ai soli pari-merito ordinati per id. Poi `consumaDaResiduo`.

6. Gli slot vanno processati **in ordine di data** perché la scalatura sia sequenziale: al posto di `input.slots.map(...)` ordinare prima gli indici per `(data, slotDefId)`, assegnare in quell'ordine, e restituire l'array nell'ordine originale di input (l'ordine di ritorno è parte del contratto attuale: non cambiarlo).

7. Anche il ramo "il resto ruota" chiama `consumaDaResiduo` sul piatto assegnato: la rotazione dei liberi non cambia criterio (nessun costo confrontato: il pool dei liberi resta a rotazione pura, come oggi — il criterio del residuo vale solo fra sorelle fissate e fra opzioni, com'è scritto nella spec), ma il consumo va comunque registrato per i pasti successivi.

- [ ] **Step 4: Verificare**

Run: `npm test && npx tsc --noEmit`
Expected: tutto verde, inclusi i test planner esistenti (nessun input nuovo → rotazione identica a prima).

- [ ] **Step 5: Commit**

```bash
git add src/domain/planner.ts src/domain/__tests__/planner.test.ts
git commit -m "feat(planner): fra piatti sorella vince chi costa meno confezioni, a parita' la rotazione"
```

---

### Task 6: Planner — risoluzione dei componenti

**Files:**
- Modify: `src/domain/planner.ts`
- Test: `src/domain/__tests__/planner.test.ts` (aggiunta casi)

**Interfaces:**
- Consumes: `wrap` (fixture Task 4), `costoInConfezioni`/`consumaDaResiduo` (Task 5), `Scelta` (Task 1).
- Produces: gli slot in uscita hanno `scelte` popolate (`fonte: 'planner'`) per ogni componente del piatto assegnato; le scelte con `fonte: 'manuale'` in ingresso restano intatte. Il Task 8 le persiste.

- [ ] **Step 1: Scrivere i test**

In coda a `planner.test.ts`. Fixture: `wrap` dal Task 4 (componente `farcitura`: yogurt 100g oppure uova 2pz + passata 50g) più gli ingredienti delle fixtures. Slot pranzo lunedì con `dishId: null` e un solo piatto `wrap` per lo slot (nessuna sorella: si testa la risoluzione, non la selezione).

```ts
describe('risoluzione dei componenti', () => {
  it('sceglie l’opzione coperta dal residuo e la registra con fonte planner', () => {
    // 500 g di yogurt in casa, niente uova: l'opzione yogurt costa 0, quella uova 2 (uova pz + passata).
    const out = assegnaPiatti({
      slots: [slotPranzoLunedi()],
      dishes: [wrap],
      ingredients: INGREDIENTI,
      pantry: [residuoDi('yogurt', 500)],
      oggi: '2026-08-31',
    });
    expect(out[0].scelte).toEqual({ farcitura: { opzioneId: 'farcitura-yogurt', fonte: 'planner' } });
  });

  it('una scelta manuale non si tocca, qualunque cosa dica il residuo', () => {
    const slot = { ...slotPranzoLunedi(), scelte: { farcitura: { opzioneId: 'farcitura-uova', fonte: 'manuale' as const } } };
    const out = assegnaPiatti({
      slots: [slot], dishes: [wrap], ingredients: INGREDIENTI,
      pantry: [residuoDi('yogurt', 500)], oggi: '2026-08-31',
    });
    expect(out[0].scelte.farcitura).toEqual({ opzioneId: 'farcitura-uova', fonte: 'manuale' });
  });

  it('la scalatura è sequenziale: due pasti non si aggiudicano lo stesso residuo', () => {
    // Fixture locali al test: `succo` (porzionabile, formato 200, non
    // deperibile, area dispensa) e piatto `merenda` (slotDefId 'mer', nessuna
    // riga fissa) con un componente 'bevanda' a due opzioni NELL'ORDINE:
    // 'opz-a-succo' (succo 200 g) poi 'opz-b-avena' (avena 40 g).
    // Dispensa: succo 200, avena 500. Tre slot merenda: lun, mar, mer.
    const out = assegnaPiatti({
      slots: [slotMerenda('2026-08-31'), slotMerenda('2026-09-01'), slotMerenda('2026-09-02')],
      dishes: [merenda],
      ingredients: [...INGREDIENTI, succo],
      pantry: [residuoDi('succo', 200), residuoDi('avena', 500)],
      oggi: '2026-08-31',
      settimaneTrascorse: 0,
    });
    // Lunedì: entrambe le opzioni costano 0 -> parità -> ordinale 0 -> succo.
    expect(out[0].scelte.bevanda.opzioneId).toBe('opz-a-succo');
    // Martedì: il succo è stato consumato lunedì (200-200=0) -> costa 1, l'avena 0.
    expect(out[1].scelte.bevanda.opzioneId).toBe('opz-b-avena');
    // Mercoledì È l'asserzione che discrimina: con scalatura vera l'avena ha
    // ancora 420 g -> costo 0 -> vince di nuovo; senza scalatura sarebbe di
    // nuovo parità e l'ordinale 2 riporterebbe al succo.
    expect(out[2].scelte.bevanda.opzioneId).toBe('opz-b-avena');
  });
});
```

A parità di costo fra opzioni: rotazione con lo stesso ordinale del Task 5, applicato all'elenco delle opzioni **nell'ordine dichiarato nel componente** (le opzioni hanno già una posizione d'autore: la prima è il default; non si riordina per id).

- [ ] **Step 2: Verificare che falliscano**

Run: `npx vitest run src/domain/__tests__/planner.test.ts`
Expected: casi nuovi FAIL (`scelte` resta `{}`), esistenti PASS.

- [ ] **Step 3: Implementare**

In `assegnaPiatti`, dopo l'assegnazione del `dishId` di uno slot (in entrambi i rami: fissato e ruotato — e anche per gli slot che ENTRANO già con un `dishId` scelto a mano, che oggi vengono restituiti subito: anche loro vanno risolti, senza toccare il `dishId`):

```ts
    const scelte: Record<string, Scelta> = { ...slot.scelte };
    for (const componente of piatto.componenti) {
      if (scelte[componente.id]?.fonte === 'manuale') continue; // mai sovrascrivere una scelta manuale
      let migliore = componente.opzioni[0];
      let costoMigliore = Infinity;
      componente.opzioni.forEach((opzione, i) => {
        const costo = costoInConfezioni(opzione.righe, residuoLavoro);
        // A parità vince l'opzione indicata dall'ordinale di rotazione,
        // nell'ordine d'autore delle opzioni.
        const preferita = i === posizioneRotazione % componente.opzioni.length;
        if (costo < costoMigliore || (costo === costoMigliore && preferita)) {
          migliore = opzione; costoMigliore = costo;
        }
      });
      scelte[componente.id] = { opzioneId: migliore.id, fonte: 'planner' };
      consumaDaResiduo(migliore.righe, residuoLavoro);
    }
```

dove `posizioneRotazione = settimaneTrascorse * 7 + indice della data nella sequenza ordinata` (lo stesso ordinale del Task 5). Le righe fisse del piatto (`piatto.ingredienti`) vanno consumate una volta sola, prima del loop dei componenti. Attenzione all'interazione col Task 5: quando le sorelle si valutano con `righeEffettive(d, {})`, il consumo del vincitore NON va fatto lì per le righe dei componenti (verrebbero contate col default e poi di nuovo qui) — nel Task 5 `consumaDaResiduo` sul vincitore consuma le sole righe fisse, e i componenti si consumano qui, opzione scelta per opzione scelta. Sistemare il Task 5 di conseguenza (il suo test non se ne accorge: i suoi piatti non hanno componenti).

- [ ] **Step 4: Verificare tutto e committare**

Run: `npm test && npx tsc --noEmit`
Expected: verde.

```bash
git add src/domain/planner.ts src/domain/__tests__/planner.test.ts
git commit -m "feat(planner): risoluzione delle opzioni al check-in, scelte manuali intoccabili"
```

---

### Task 7: Data layer — repertorio con opzioni

**Files:**
- Modify: `src/data/mappers.ts` (nuovo `aComponenti`)
- Modify: `src/data/repertorio.ts` (`leggiRepertorio`, `salvaPiatto`)
- Test: `src/data/__tests__/mappers.test.ts` (aggiunta casi)

**Interfaces:**
- Consumes: tabelle del Task 2, tipi del Task 1.
- Produces: `aComponenti(opzioni: Record<string, unknown>[], righe: Record<string, unknown>[]): Componente[]`; `leggiRepertorio` ritorna `Dish.componenti` popolati; `salvaPiatto` accetta e riscrive `componenti`. I Task 9 e 11 li consumano.

- [ ] **Step 1: Test del mapper**

In `src/data/__tests__/mappers.test.ts`, in coda — righe DB simulate come le restituisce la select del passo 3 (dish_option con `id, componente_id, componente_nome, posizione`; dish_ingredient con `ingredient_id, quantita, unita, option_id`):

```ts
describe('aComponenti', () => {
  const opzioni = [
    { id: 'o2', componente_id: 'c1', componente_nome: 'farcitura', posizione: 1 },
    { id: 'o1', componente_id: 'c1', componente_nome: 'farcitura', posizione: 0 },
  ];
  const righe = [
    { ingredient_id: 'yogurt', quantita: '100', unita: 'g', option_id: 'o1' },
    { ingredient_id: 'uova', quantita: '2', unita: 'pz', option_id: 'o2' },
    { ingredient_id: 'avena', quantita: '80', unita: 'g', option_id: null },
  ];

  it('raggruppa per componente e ordina le opzioni per posizione (la 0 è il default)', () => {
    expect(aComponenti(opzioni, righe)).toEqual([{
      id: 'c1', nome: 'farcitura',
      opzioni: [
        { id: 'o1', righe: [{ ingredientId: 'yogurt', quantita: 100, unita: 'g' }] },
        { id: 'o2', righe: [{ ingredientId: 'uova', quantita: 2, unita: 'pz' }] },
      ],
    }]);
  });

  it('ignora le righe fisse (option_id null): quelle restano in Dish.ingredienti', () => {
    expect(aComponenti([], righe)).toEqual([]);
  });
});
```

- [ ] **Step 2: Verificare che falliscano, poi implementare `aComponenti` in `mappers.ts`**

```ts
export function aComponenti(
  opzioni: Record<string, unknown>[],
  righe: Record<string, unknown>[],
): Componente[] {
  const perComponente = new Map<string, Componente>();
  for (const o of [...opzioni].sort((a, b) => num(a.posizione) - num(b.posizione))) {
    const componenteId = String(o.componente_id);
    const componente = perComponente.get(componenteId)
      ?? { id: componenteId, nome: String(o.componente_nome), opzioni: [] };
    componente.opzioni.push({
      id: String(o.id),
      righe: righe.filter((r) => r.option_id === o.id).map(aDishIngredient),
    });
    perComponente.set(componenteId, componente);
  }
  return [...perComponente.values()];
}
```

(import di `Componente` nei tipi in testa al file.)

- [ ] **Step 3: `leggiRepertorio` legge le opzioni**

Nella select, aggiungere `option_id` alle colonne di `dish_ingredient` e la relazione `dish_option(id, componente_id, componente_nome, posizione)`. Nel literal:

```ts
    ingredienti: (r.dish_ingredient ?? [])
      .filter((ri: Record<string, unknown>) => ri.option_id == null)
      .map(aDishIngredient),
    componenti: aComponenti(r.dish_option ?? [], r.dish_ingredient ?? []),
```

- [ ] **Step 4: `salvaPiatto` riscrive anche le opzioni**

Dopo la riscrittura in blocco di `dish_ingredient` (lo stesso principio del commento esistente: sono poche, la diff non vale il codice): cancellare `dish_option` del piatto (`delete().eq('dish_id', dishId)` — il cascade porta via le righe opzione rimaste), poi per ogni `componente` di `piatto.componenti` inserire le sue opzioni in `dish_option` (generando `componente_id` con `crypto.randomUUID()` se il componente è nuovo — id non-uuid provenienti dall'editor — altrimenti riusando quello esistente; `posizione` = indice dell'opzione) e, con gli id ritornati dall'insert (`.select('id')`), inserire le righe di ogni opzione in `dish_ingredient` con `option_id` valorizzato. Ordine delle operazioni: prima `dish_ingredient` fisse, poi `dish_option`, poi le righe con `option_id` — mai il contrario, la FK lo impedisce.

Attenzione: la cancellazione di `dish_option` fa sparire (cascade) le `meal_slot_choice` che vi puntavano — è il comportamento voluto: un piatto modificato invalida le scelte registrate, e `righeEffettive` ripiega sul default invece di esplodere (l'`OpzioneMancanteError` resta per il caso di scelte lette PRIMA della modifica).

- [ ] **Step 5: Verifica e commit**

Run: `npm test && npx tsc --noEmit`
Expected: verde (i test data esistenti mockano la catena supabase: se il mock di `leggiRepertorio` in qualche test non prevede `dish_option`, il `?? []` lo copre).

```bash
git add src/data/mappers.ts src/data/repertorio.ts src/data/__tests__/mappers.test.ts
git commit -m "feat(data): il repertorio legge e scrive i componenti con le loro opzioni"
```

---

### Task 8: Data layer — persistenza delle scelte + applicazione migrazione

**Files:**
- Modify: `src/data/settimana.ts` (`creaSettimana`, `leggiSlotSettimana`, `aggiornaSlot`)
- Test: `src/data/__tests__/settimana.creaSettimana.test.ts` (aggiunta casi)

**Interfaces:**
- Consumes: planner esteso (Task 5-6), `meal_slot_choice` (Task 2), `leggiDispensa` esistente in `src/data/dispensa.ts`.
- Produces: `aggiornaSlot(slotId, patch: { stato?; dishId?; scelte? }, fonte)` — il Task 9 lo consuma per salvare le scelte manuali; `leggiSlotSettimana` ritorna slot con `scelte` popolate.

- [ ] **Step 1: Applicare la migrazione 0006 — SOLO con l'ok esplicito di Andrea**

Chiedere ad Andrea conferma di applicare `0006_alternative.sql` al progetto Supabase di produzione, poi applicarla via MCP `apply_migration` (o dirgli di eseguirla nell'SQL editor come da README). Verificare con `list_tables` che `dish_option` e `meal_slot_choice` esistano. Senza migrazione applicata i passi seguenti falliscono a runtime (non nei test, che mockano).

- [ ] **Step 2: `creaSettimana` passa la dispensa al planner e persiste le scelte**

Aggiungere `leggiDispensa()` e `leggiIngredienti()` al `Promise.all` del caricamento. Passare a `assegnaPiatti` i nuovi input: `ingredients`, `pantry`, `oggi: new Date().toISOString().slice(0, 10)`, `moltiplicatorePorzioni: impostazioni.moltiplicatorePorzioni`. Dopo l'insert degli slot (che oggi non ritorna gli id: aggiungere `.select('id, data, slot_def_id')` all'insert), costruire le righe di `meal_slot_choice` abbinando gli slot inseriti a quelli assegnati per `(data, slot_def_id)` e inserire, per ogni slot con `scelte` non vuote, una riga per componente: `{ user_id, meal_slot_id, componente_id, option_id: scelta.opzioneId, fonte: scelta.fonte }`.

- [ ] **Step 3: `leggiSlotSettimana` legge le scelte**

Estendere la select: `.select('*, meal_slot_choice(componente_id, option_id, fonte)')` e mappare:

```ts
  return data.map((r) => ({
    ...aMealSlot(r),
    scelte: Object.fromEntries(
      ((r.meal_slot_choice ?? []) as Record<string, unknown>[]).map((c) => [
        String(c.componente_id),
        { opzioneId: String(c.option_id), fonte: c.fonte as Scelta['fonte'] },
      ]),
    ),
  }));
```

- [ ] **Step 4: `aggiornaSlot` accetta un patch di scelte**

Firma: `patch: { stato?: StatoSlot; dishId?: string | null; scelte?: Record<string, Scelta> }`. Per il patch `scelte`: upsert su `meal_slot_choice` con `onConflict: 'meal_slot_id,componente_id'` (una riga per componente del patch; le scelte non nominate nel patch restano). Percorso indipendente dalla gerarchia delle fonti, come `dishId` — con una differenza: quando il patch contiene anche `dishId` (Scegli ha sostituito il piatto), cancellare prima TUTTE le `meal_slot_choice` dello slot: le scelte del piatto vecchio non hanno significato sul nuovo.

- [ ] **Step 5: Test**

In `src/data/__tests__/settimana.creaSettimana.test.ts`, seguendo il pattern di mock esistente del file: un caso in cui il repertorio contiene un piatto con componenti e si verifica che dopo `creaSettimana` sia partito un insert su `meal_slot_choice` con `fonte: 'planner'` e l'`option_id` atteso. Un caso su `aggiornaSlot` con patch `{ dishId, scelte }` che verifica delete + upsert nell'ordine giusto.

- [ ] **Step 6: Verifica e commit**

Run: `npm test && npx tsc --noEmit`

```bash
git add src/data/settimana.ts src/data/__tests__/settimana.creaSettimana.test.ts
git commit -m "feat(data): le scelte della settimana si salvano e si rileggono con lo slot"
```

---

### Task 9: UI Scegli — componenti, chip IN CASA, salvataggio manuale

**Files:**
- Modify: `src/app/(app)/settimana/[data]/[slotDefId]/scegli/page.tsx`
- Test: `src/app/(app)/settimana/[data]/[slotDefId]/scegli/__tests__/page.test.tsx` (aggiunta casi, pattern esistente del file)

**Interfaces:**
- Consumes: `Dish.componenti`, `slot.scelte` (`leggiSettimanaCorrente`), `aggiornaSlot` col patch `scelte` (Task 8), `confezioniNecessarie` + `residuoUtilizzabile` per il chip, `leggiDispensa` da `src/data/dispensa.ts`.

- [ ] **Step 1: Stato e caricamento**

Aggiungere al caricamento `leggiDispensa()`. Stato nuovo: `scelteCorrenti: Record<string, Scelta>` inizializzato da `slot.scelte`. In `DatiScegli` aggiungere `scelteOriginali: Record<string, Scelta>` e `dispensa: PantryState[]`.

- [ ] **Step 2: La sezione componenti del piatto selezionato**

Sotto la lista dei piatti (dopo il `</div>` della colonna, prima del link "CREA UN PIATTO NUOVO"), se il piatto selezionato (`scelto`) ha `componenti.length > 0`, per ogni componente una riga-bottone nello stile delle tessere esistenti (bianco, bordo `var(--bordo)`, radius 20): etichetta mono maiuscola col `componente.nome`, sotto il nome dell'opzione corrente (nomi ingredienti uniti con " + ", riusare `descriviScelte` su un piatto fittizio con quel solo componente oppure una piccola funzione locale identica), e il chip `IN CASA` (stesso stile del badge `ORA IN PROGRAMMA`, righe 218-231) quando l'opzione corrente ha costo 0 confezioni: calcolo col pattern del dominio — per ogni riga dell'opzione, `residuoUtilizzabile` sull'ingrediente + `confezioniNecessarie`; costo 0 su tutte le righe non-`stima` → chip. Il tap sulla riga cicla: `scelteCorrenti[componente.id] = { opzioneId: opzioneSuccessiva.id, fonte: 'manuale' }` (successiva nell'ordine d'autore, wrap-around).

- [ ] **Step 3: Salvataggio**

`cambiato` diventa: piatto diverso OPPURE scelte diverse dalle originali (confronto per `opzioneId` sui componenti del piatto selezionato). In `confermaScelta`, passare il patch completo: `aggiornaSlot(dati.slotId, { dishId: scelto, scelte: scelteCorrenti }, 'correzione')` quando il piatto è lo stesso; quando il piatto è cambiato, passare `{ dishId: scelto, scelte: scelteManualiDelNuovo }` dove le scelte sono solo quelle toccate a mano sul nuovo piatto (di default vuote: il default lo mostra la UI, il fallback di `righeEffettive` fa il resto).

- [ ] **Step 4: Test**

Nel pattern del test di pagina esistente: (1) un piatto con componente a due opzioni mostra la riga del componente col nome dell'opzione di default; (2) il tap cicla alla seconda opzione e abilita il bottone SOSTITUISCI; (3) il chip IN CASA compare quando la dispensa mockata copre l'opzione. Verificare che `aggiornaSlot` venga chiamato col patch `scelte` atteso.

- [ ] **Step 5: Verifica e commit**

Run: `npm test && npx tsc --noEmit`

```bash
git add "src/app/(app)/settimana/[data]/[slotDefId]/scegli/page.tsx" "src/app/(app)/settimana/[data]/[slotDefId]/scegli/__tests__/page.test.tsx"
git commit -m "feat(scegli): le opzioni del piatto si ciclano col tap, il chip dice cosa e' gia' in casa"
```

---

### Task 10: UI Settimana — sottotitolo delle scelte

**Files:**
- Modify: `src/app/(app)/settimana/page.tsx`
- Modify (se serve una prop): `src/components/RigaPasto.tsx`
- Test: `src/app/(app)/settimana/__tests__/page.test.tsx` (aggiunta caso)

**Interfaces:**
- Consumes: `descriviScelte` (Task 4), `slot.scelte` (Task 8).

- [ ] **Step 1: Calcolare il sottotitolo**

Dove la pagina costruisce le righe dei pasti (individuare il punto in cui abbina slot → piatto: la pagina carica già repertorio e ingredienti o va aggiunto `leggiIngredienti()` al suo caricamento), calcolare `descriviScelte(piatto, slot.scelte, nomePerIngrediente)` e passarlo a `RigaPasto`. Se `RigaPasto` non ha una prop adatta, aggiungere `sottotitolo?: string | null` renderizzata sotto il nome del piatto nello stile dei sottotitoli esistenti del componente (seguire il font/size dei dettagli già presenti; niente sottotitolo = layout identico a oggi).

- [ ] **Step 2: Test**

Caso nuovo nel test di pagina: slot con piatto a componenti e scelta registrata → il nome dell'opzione compare; piatto senza componenti → nessun sottotitolo.

- [ ] **Step 3: Verifica e commit**

Run: `npm test && npx tsc --noEmit`

```bash
git add "src/app/(app)/settimana/page.tsx" src/components/RigaPasto.tsx "src/app/(app)/settimana/__tests__/page.test.tsx"
git commit -m "feat(settimana): il sottotitolo dice quale opzione vale questa settimana"
```

---

### Task 11: UI Piatto — editor dei componenti

**Files:**
- Modify: `src/app/(app)/piatti/[id]/page.tsx`
- Test: `src/app/(app)/piatti/[id]/__tests__/page.test.tsx` (aggiunta casi)

**Interfaces:**
- Consumes: `salvaPiatto` con `componenti` (Task 7); i pattern UI esistenti della pagina (righe ingrediente, tessere).

- [ ] **Step 1: Sezione COMPONENTI A SCELTA**

Sotto la sezione ingredienti esistente: elenco dei componenti del piatto; ogni componente mostra il nome (input testo nello stile degli input esistenti della pagina) e le sue opzioni; ogni opzione elenca le sue righe ingrediente riusando ESATTAMENTE il pattern con cui la pagina gestisce già le righe di `ingredienti` (stessa selezione ingrediente, quantità, unità). Azioni: aggiungi componente (nome + prima opzione vuota), aggiungi opzione a un componente, elimina opzione (un componente sotto 1 opzione si elimina), elimina componente. Id dei nuovi componenti/opzioni: `crypto.randomUUID()` lato client — `salvaPiatto` (Task 7) li riscrive comunque in blocco.

- [ ] **Step 2: Salvataggio e validazione**

Il salva della pagina passa `componenti` a `salvaPiatto`. Validazione minima coerente con la pagina: un componente senza nome o con un'opzione senza righe blocca il salvataggio con il pattern di errore già usato per gli ingredienti.

- [ ] **Step 3: Test**

Nel pattern del file: (1) un piatto caricato con componenti li mostra; (2) aggiungere un componente con un'opzione e salvare chiama `salvaPiatto` con la struttura `componenti` attesa; (3) un'opzione senza righe blocca il salva.

- [ ] **Step 4: Verifica e commit**

Run: `npm test && npx tsc --noEmit`

```bash
git add "src/app/(app)/piatti/[id]/page.tsx" "src/app/(app)/piatti/[id]/__tests__/page.test.tsx"
git commit -m "feat(piatto): l'editor dei componenti - le opzioni si scrivono dove si scrivono gli ingredienti"
```

---

### Task 12: Verifica finale

- [ ] **Step 1: Tutta la batteria**

Run: `npm test && npx tsc --noEmit && npm run build && npm run lint`
Expected: tutto verde. I test pre-esistenti non modificati (eccetto le aggiunte di campi del Task 1): `git diff --stat` sui file di test deve mostrare solo aggiunte.

- [ ] **Step 2: Prova dal vivo del caso degenere**

Con `preview_start` (launch.json) aprire l'app: la Settimana corrente e la Lista devono essere identiche a prima della feature (il repertorio non ha ancora componenti). Screenshot di verifica.

- [ ] **Step 3: Prova dal vivo delle opzioni**

Aggiungere a UN piatto vero un componente con due opzioni dall'editor (Task 11), rigenerare la settimana prossima o usare Scegli: la scelta compare, il sottotitolo pure, la lista compra per l'opzione scelta. Verificare su `meal_slot_choice` (MCP `execute_sql`, select) che fonte e opzione siano quelle attese.

- [ ] **Step 4: Commit finale se restano modifiche fuori dai commit precedenti**

```bash
git status --short   # deve essere pulito; committare eventuali resti con un messaggio onesto
```

---

## Self-review (fatta in scrittura)

- **Coverage spec:** modello dati → Task 1-2; planner (criterio, scalatura, manuali) → Task 5-6; list-builder (espansione, fallback, errore) → Task 4; `confezioniNecessarie` (gap 1 della spec) → Task 3; chip "in casa" ricalcolato alla lettura (gap 2, opzione preferita della spec) → Task 9; UX Scegli/Settimana/Piatto → Task 9-11; migrazione additiva → Task 2+8; regressione 291 test → Global Constraints e Task 12. Il terzo gap della spec (maxi-formati) è accettato e non ha task, come da spec.
- **Scoperta in scrittura piano (non nella spec):** il vincolo `unique (dish_id, ingredient_id)` su `dish_ingredient` è incompatibile con lo stesso ingrediente in più opzioni — la migrazione lo sostituisce con due indici parziali (Task 2). E la valutazione delle sorelle col default (Task 5) non deve consumare le righe dei componenti, che vengono consumate dalla risoluzione fine (Task 6).
- **Tipi coerenti fra task:** `Componente/OpzioneComponente/Scelta` (T1) usati identici in T4-T9; `confezioniNecessarie` (T3) consumata in T5 e T9; `righeEffettive`/`descriviScelte` (T4) consumate in T5-T6, T9-T10; patch `scelte` di `aggiornaSlot` (T8) consumato in T9.
