# Import dieta da foto/PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** l'utente fotografa la dieta (o carica un PDF), un estrattore (oggi mock) produce un `PianoEstratto`, una revisione guidata pasto per pasto lo conferma, un passo formati completa gli ingredienti nuovi, e il commit sostituisce il piano attivo.

**Architecture:** formato intermedio `PianoEstratto` + bozza persistita in `import_draft` (migrazione 0007) + estrattore dietro API route (`/api/import/estrai`, mock oggi, Claude poi) + logica pura in `src/domain/import/` (validazione, mapping alimento→ingrediente, traduzione bozza→scritture) + wizard `/importa` a 5 passi. Il dominio non vede mai stati intermedi: le scritture vere avvengono solo al commit finale.

**Tech Stack:** Next.js 16 (App Router, route handlers), TypeScript, Supabase (RLS), Vitest + Testing Library, getUserMedia.

**Spec:** `docs/superpowers/specs/2026-08-29-import-dieta-design.md` — il piano argomenta dalla spec; in conflitto vince la spec.

## Global Constraints

- **Next.js 16 non è quello del training**: prima di scrivere codice Next (route handler, pagine), leggere la guida pertinente in `node_modules/next/dist/docs/` (vedi AGENTS.md). Il blocco AGENTS.md ricreato da `next dev` si committa col lavoro.
- **`src/domain/` è puro**: nessun import da `src/data/`, nessuna rete, nessun accesso a Supabase o `fs`. Le funzioni ricevono tutto per parametro (inclusa la data odierna).
- **Nessun dato di diete vere entra in git**: `diete/` è gitignored e resta tale. I fixture committati sono sintetici (inventati). Il fixture reale di dieta6 vive in `diete/estrazioni/piani/` (fuori git).
- **Verifica prima di ogni commit**: `npm test && npx tsc --noEmit && npm run build && npm run lint` (da README).
- **RLS su ogni tabella nuova**: stesso blocco `do $$` di `0006_alternative.sql` (enable + force + policy `auth.uid() = user_id`).
- **La migrazione 0007 NON si applica al database di produzione dentro un task**: si crea il file; l'applicazione è un gate esplicito di Andrea gestito dal controller.
- **Range già collassati sull'estremo alto** nel `PianoEstratto`; unità non-gramme = `quantita: null` + `testoOriginale` integro; mai conversioni di unità inventate (g↔ml vietato, come in `src/domain/unita.ts`).
- Nomi e commenti in italiano, stile del codice esistente: commenti solo per vincoli che il codice non mostra.
- I piatti creati dall'import hanno `fonte: 'nutrizionista'`; la sostituzione disattiva (`attivo=false`) solo i piatti `fonte='nutrizionista'`, mai quelli `proprio`.

**Chiarimento meccanica condimenti** (la spec dice "si mappa su uno slot"; la meccanica precisa): un pasto `nomeOriginale: 'condimenti'` mappato sullo slot X **non diventa un piatto sorella** (il planner lo tratterebbe come alternativa alla cena). Le sue righe si accodano alle `righeFisse` di **ogni** piatto dello stesso giorno il cui pasto è mappato su X; se quel giorno nessun pasto è mappato su X, diventa un piatto a sé ("Condimenti") su X.

---

## Mappa dei file

| File | Responsabilità |
|---|---|
| `src/domain/import/types.ts` | Tipi del contratto: `PianoEstratto`, `RifiutoImport`, `EsitoEstrazione`, `StatoRevisione`, `IngredienteProposto`, `chiavePasto`, `pastoEffettivo` |
| `src/domain/import/valida.ts` | Validazione runtime del JSON (bordo API e jsonb): `validaEsito` |
| `src/domain/import/fixtures.ts` | 3 fixture sintetici condivisi da test e route mock |
| `src/domain/import/formati-tipici.ts` | Tabella statica formati tipici supermercato italiano + `proponi` |
| `src/domain/import/mapping.ts` | `normalizza`, `abbina`, `proponiSlot`, `ingredientiDaAbbinare` |
| `src/domain/import/commit.ts` | `traduciBozza` → `ScrittureImport` (pura, testata a fondo) |
| `supabase/migrations/0007_import_draft.sql` | Tabella `import_draft` + RLS |
| `src/data/importa.ts` | CRUD bozza + `eseguiScritture` (l'esecutore del commit) |
| `src/app/api/import/estrai/route.ts` | Route estrazione: mock da fixture, 503 senza |
| `src/app/(app)/importa/Camera.tsx` | Camera in-app multi-scatto + fallback picker |
| `src/app/(app)/importa/page.tsx` | Wizard a 5 passi |
| `src/app/(app)/importa/Revisione.tsx` | Passo 3: revisione pasto per pasto |
| `src/app/(app)/importa/Formati.tsx` | Passo 4: ingredienti nuovi |
| `diete/estrazioni/piani/dieta6.json` | Fixture reale (fuori git), trascritto dallo spike |

---

### Task 1: Tipi, validazione e fixture sintetici

**Files:**
- Create: `src/domain/import/types.ts`
- Create: `src/domain/import/valida.ts`
- Create: `src/domain/import/fixtures.ts`
- Test: `src/domain/import/__tests__/valida.test.ts`

**Interfaces:**
- Consumes: `UnitaBase`, `AreaId`, `ClasseResiduo` da `@/domain/types`.
- Produces: tutti i tipi del contratto; `validaEsito(v: unknown): EsitoEstrazione` (lancia `PianoNonValidoError`); `chiavePasto(settimana, giorno, indicePasto): string`; `pastoEffettivo(piano, correzioni, chiave): PastoEstratto`; fixture `FIXTURE_MENU_SETTIMANALE`, `FIXTURE_GIORNATA_UNICA`, `FIXTURE_RIFIUTO_MACRO`.

- [ ] **Step 1: scrivere `types.ts`**

```ts
import type { AreaId, ClasseResiduo, UnitaBase } from '@/domain/types';

/** 'solo_macro' non produce mai un piano: è l'archetipo del rifiuto onesto. */
export type ArchetipoImportabile = 'menu_settimanale' | 'giornata_unica' | 'griglia_alternative';

export interface RigaEstratta {
  alimento: string;
  /** null = quantità non in grammi/ml/pz ("q.b.", "1 scatoletta piccola"): la risolve l'utente in revisione. */
  quantita: number | null;
  unita: UnitaBase | null;
  /** Il testo letto dal foglio, mai riscritto: è la garanzia anti-fabbricazione mostrata in revisione. */
  testoOriginale: string;
}

export interface ComponenteEstratto {
  nome: string;
  /** Ogni opzione è >=1 righe ("ricotta 50g + noci 20g" è UNA opzione). */
  opzioni: RigaEstratta[][];
}

export interface PiattoEstratto {
  nome: string;
  righeFisse: RigaEstratta[];
  componenti: ComponenteEstratto[];
  descrizione: string | null;
}

export interface PastoEstratto {
  /** Il nome del pasto come scritto nella dieta; 'condimenti' è il pasto sintetico giornaliero. */
  nomeOriginale: string;
  /** >1 = piatti sorella (alternative fra pasti, come nel dominio). */
  piatti: PiattoEstratto[];
}

export interface GiornoEstratto {
  /** 0 = lunedì, come ovunque nel dominio. */
  giorno: number;
  pasti: PastoEstratto[];
}

export interface SettimanaEstratta {
  /** 1..4, il limite di settimaneCiclo. */
  numero: number;
  giorni: GiornoEstratto[];
}

export interface PianoEstratto {
  archetipo: ArchetipoImportabile;
  fonte: string;
  settimane: SettimanaEstratta[];
  noteEstrazione: string[];
}

export interface RifiutoImport {
  archetipo: 'solo_macro';
  motivazione: string;
}

export type EsitoEstrazione =
  | { tipo: 'piano'; piano: PianoEstratto }
  | { tipo: 'rifiuto'; rifiuto: RifiutoImport };

export interface IngredienteProposto {
  /** Il nome estratto normalizzato: è la chiave che riaggancia le righe all'ingrediente creato. */
  alimento: string;
  nome: string;
  unitaBase: UnitaBase;
  area: AreaId;
  classeResiduo: ClasseResiduo;
  deperibile: boolean;
  formatoConfezione: number;
}

export type PassoRevisione = 'revisione' | 'formati' | 'riepilogo';

export interface StatoRevisione {
  passo: PassoRevisione;
  /** nomeOriginale (normalizzato) -> slotDefId. */
  mappaturaPasti: Record<string, string>;
  pastiConfermati: string[];
  /** chiavePasto -> pasto editato. Il piano estratto resta immutato. */
  correzioni: Record<string, PastoEstratto>;
  /** Compilati entrando nel passo formati; editati lì. */
  ingredientiNuovi: IngredienteProposto[];
}

export function chiavePasto(settimana: number, giorno: number, indicePasto: number): string {
  return `${settimana}-${giorno}-${indicePasto}`;
}

/** Il pasto con le correzioni della revisione applicate, o l'originale se non toccato. */
export function pastoEffettivo(
  piano: PianoEstratto,
  correzioni: Record<string, PastoEstratto>,
  settimana: number,
  giorno: number,
  indicePasto: number,
): PastoEstratto {
  const chiave = chiavePasto(settimana, giorno, indicePasto);
  if (correzioni[chiave]) return correzioni[chiave];
  const s = piano.settimane.find((x) => x.numero === settimana);
  const g = s?.giorni.find((x) => x.giorno === giorno);
  const p = g?.pasti[indicePasto];
  if (!p) throw new Error(`pastoEffettivo: pasto ${chiave} inesistente nel piano`);
  return p;
}
```

- [ ] **Step 2: test di validazione (falliscono: `valida.ts` non esiste)**

```ts
// src/domain/import/__tests__/valida.test.ts
import { describe, it, expect } from 'vitest';
import { validaEsito, PianoNonValidoError } from '../valida';
import { FIXTURE_MENU_SETTIMANALE, FIXTURE_GIORNATA_UNICA, FIXTURE_RIFIUTO_MACRO } from '../fixtures';

describe('validaEsito', () => {
  it('accetta i fixture sintetici così come sono', () => {
    expect(validaEsito(structuredClone(FIXTURE_MENU_SETTIMANALE))).toEqual(FIXTURE_MENU_SETTIMANALE);
    expect(validaEsito(structuredClone(FIXTURE_GIORNATA_UNICA))).toEqual(FIXTURE_GIORNATA_UNICA);
    expect(validaEsito(structuredClone(FIXTURE_RIFIUTO_MACRO))).toEqual(FIXTURE_RIFIUTO_MACRO);
  });

  it('rifiuta ciò che non è un esito', () => {
    expect(() => validaEsito(null)).toThrow(PianoNonValidoError);
    expect(() => validaEsito({ tipo: 'boh' })).toThrow(PianoNonValidoError);
    expect(() => validaEsito({ tipo: 'piano', piano: {} })).toThrow(PianoNonValidoError);
  });

  it('rifiuta un giorno fuori 0..6 e una settimana fuori 1..4', () => {
    const rotto = structuredClone(FIXTURE_MENU_SETTIMANALE);
    rotto.piano.settimane[0].giorni[0].giorno = 7;
    expect(() => validaEsito(rotto)).toThrow(PianoNonValidoError);
    const rotto2 = structuredClone(FIXTURE_MENU_SETTIMANALE);
    rotto2.piano.settimane[0].numero = 5;
    expect(() => validaEsito(rotto2)).toThrow(PianoNonValidoError);
  });

  it('rifiuta una riga con quantita numerica ma unita null (o viceversa quantita null con unita)', () => {
    const rotto = structuredClone(FIXTURE_MENU_SETTIMANALE);
    rotto.piano.settimane[0].giorni[0].pasti[0].piatti[0].righeFisse[0] = {
      alimento: 'riso', quantita: 80, unita: null, testoOriginale: 'riso 80g',
    };
    expect(() => validaEsito(rotto)).toThrow(PianoNonValidoError);
  });

  it("rifiuta un'opzione vuota e un componente con meno di due opzioni", () => {
    const rotto = structuredClone(FIXTURE_MENU_SETTIMANALE);
    // Nel fixture il primo piatto della cena di lunedì ha un componente con 2 opzioni.
    rotto.piano.settimane[0].giorni[0].pasti[1].piatti[0].componenti[0].opzioni = [[]];
    expect(() => validaEsito(rotto)).toThrow(PianoNonValidoError);
  });

  it('rifiuta un piano con zero settimane o un pasto con zero piatti (salvo condimenti, che ha piatti)', () => {
    const rotto = structuredClone(FIXTURE_MENU_SETTIMANALE);
    rotto.piano.settimane = [];
    expect(() => validaEsito(rotto)).toThrow(PianoNonValidoError);
  });
});
```

- [ ] **Step 3: scrivere `fixtures.ts`** — sintetici, inventati, piccoli ma con tutti i casi: componenti con opzioni, piatti sorella, `quantita: null`, pasto condimenti, 2 settimane.

```ts
import type { EsitoEstrazione, PianoEstratto } from './types';

/** 2 settimane × 2 giorni, con: componente a opzioni, piatti sorella, quantita null, condimenti. Tutto inventato. */
export const PIANO_MENU_SETTIMANALE: PianoEstratto = {
  archetipo: 'menu_settimanale',
  fonte: 'fixture sintetico',
  noteEstrazione: ['dati inventati per i test'],
  settimane: [
    {
      numero: 1,
      giorni: [
        {
          giorno: 0,
          pasti: [
            {
              nomeOriginale: 'colazione',
              piatti: [{
                nome: 'Porridge', descrizione: null, componenti: [],
                righeFisse: [
                  { alimento: "fiocchi d'avena", quantita: 30, unita: 'g', testoOriginale: "30g fiocchi d'avena" },
                  { alimento: 'latte parzialmente scremato', quantita: 150, unita: 'ml', testoOriginale: '150ml latte parz. scremato' },
                ],
              }],
            },
            {
              nomeOriginale: 'cena',
              piatti: [{
                nome: 'Tacchino con pane', descrizione: null,
                righeFisse: [{ alimento: 'fesa di tacchino', quantita: 120, unita: 'g', testoOriginale: 'Fesa di tacchino (120g)' }],
                componenti: [{
                  nome: 'pane',
                  opzioni: [
                    [{ alimento: 'pane integrale', quantita: 60, unita: 'g', testoOriginale: 'pane integrale (60g)' }],
                    [{ alimento: 'pane di segale', quantita: 60, unita: 'g', testoOriginale: 'o di segale (60g)' }],
                  ],
                }],
              }],
            },
            {
              nomeOriginale: 'condimenti',
              piatti: [{
                nome: 'Condimenti', descrizione: null, componenti: [],
                righeFisse: [{ alimento: 'olio extravergine di oliva', quantita: 20, unita: 'ml', testoOriginale: 'Olio EVO (20ml - 4 cucchiaini)' }],
              }],
            },
          ],
        },
        {
          giorno: 1,
          pasti: [
            {
              nomeOriginale: 'colazione',
              piatti: [{
                nome: 'Porridge', descrizione: null, componenti: [],
                righeFisse: [
                  { alimento: "fiocchi d'avena", quantita: 30, unita: 'g', testoOriginale: "30g fiocchi d'avena" },
                  { alimento: 'latte parzialmente scremato', quantita: 150, unita: 'ml', testoOriginale: '150ml latte parz. scremato' },
                ],
              }],
            },
            {
              nomeOriginale: 'cena',
              piatti: [
                {
                  nome: 'Merluzzo', descrizione: null, componenti: [],
                  righeFisse: [
                    { alimento: 'filetto di merluzzo', quantita: 120, unita: 'g', testoOriginale: 'Filetto di merluzzo (120g)' },
                    { alimento: 'olive taggiasche', quantita: null, unita: null, testoOriginale: '2-3 olive taggiasche' },
                  ],
                },
                {
                  nome: 'Tonno in insalata', descrizione: null, componenti: [],
                  righeFisse: [{ alimento: 'tonno al naturale', quantita: 50, unita: 'g', testoOriginale: 'tonno al naturale (50g)' }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      numero: 2,
      giorni: [{
        giorno: 0,
        pasti: [{
          nomeOriginale: 'colazione',
          piatti: [{
            nome: 'Yogurt e frutta', descrizione: null, componenti: [],
            righeFisse: [{ alimento: 'yogurt greco', quantita: 150, unita: 'g', testoOriginale: 'Yogurt greco (150g)' }],
          }],
        }],
      }],
    },
  ],
};

export const FIXTURE_MENU_SETTIMANALE: EsitoEstrazione = { tipo: 'piano', piano: PIANO_MENU_SETTIMANALE };

/** Giornata unica già espansa dall'estrattore in 7 giorni identici (qui 2 per brevità dei test). */
export const FIXTURE_GIORNATA_UNICA: EsitoEstrazione = {
  tipo: 'piano',
  piano: {
    archetipo: 'giornata_unica',
    fonte: 'fixture sintetico',
    noteEstrazione: [],
    settimane: [{
      numero: 1,
      giorni: [0, 1].map((giorno) => ({
        giorno,
        pasti: [{
          nomeOriginale: 'pranzo',
          piatti: [{
            nome: 'Pasta al pomodoro', descrizione: null, componenti: [],
            righeFisse: [{ alimento: 'pasta di semola', quantita: 80, unita: 'g', testoOriginale: 'pasta 80g' }],
          }],
        }],
      })),
    }],
  },
};

export const FIXTURE_RIFIUTO_MACRO: EsitoEstrazione = {
  tipo: 'rifiuto',
  rifiuto: {
    archetipo: 'solo_macro',
    motivazione: 'La dieta prescrive target di proteine, carboidrati e grassi per pasto, senza alimenti: non c\'è un menu da cui derivare una lista della spesa.',
  },
};
```

- [ ] **Step 4: scrivere `valida.ts`** — validazione strutturale completa, un errore con il percorso del campo rotto:

```ts
import type { EsitoEstrazione, PastoEstratto, PianoEstratto, RigaEstratta } from './types';

export class PianoNonValidoError extends Error {
  constructor(percorso: string, motivo: string) {
    super(`Piano estratto non valido (${percorso}): ${motivo}`);
    this.name = 'PianoNonValidoError';
  }
}

const UNITA = new Set(['g', 'ml', 'pz']);

function ogg(v: unknown, percorso: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new PianoNonValidoError(percorso, 'non è un oggetto');
  return v as Record<string, unknown>;
}
function arr(v: unknown, percorso: string): unknown[] {
  if (!Array.isArray(v)) throw new PianoNonValidoError(percorso, 'non è un array');
  return v;
}
function str(v: unknown, percorso: string): string {
  if (typeof v !== 'string') throw new PianoNonValidoError(percorso, 'non è una stringa');
  return v;
}

function validaRiga(v: unknown, percorso: string): RigaEstratta {
  const r = ogg(v, percorso);
  const alimento = str(r.alimento, `${percorso}.alimento`);
  if (alimento.trim() === '') throw new PianoNonValidoError(`${percorso}.alimento`, 'vuoto');
  const testoOriginale = str(r.testoOriginale, `${percorso}.testoOriginale`);
  const quantita = r.quantita;
  const unita = r.unita;
  if (quantita === null) {
    if (unita !== null) throw new PianoNonValidoError(percorso, 'quantita null con unita valorizzata');
  } else {
    if (typeof quantita !== 'number' || !Number.isFinite(quantita) || quantita <= 0)
      throw new PianoNonValidoError(`${percorso}.quantita`, 'non è un numero positivo');
    if (typeof unita !== 'string' || !UNITA.has(unita))
      throw new PianoNonValidoError(`${percorso}.unita`, 'quantita valorizzata con unita mancante o sconosciuta');
  }
  return { alimento, quantita: quantita as number | null, unita: (unita ?? null) as RigaEstratta['unita'], testoOriginale };
}

function validaPasto(v: unknown, percorso: string): PastoEstratto {
  const p = ogg(v, percorso);
  const nomeOriginale = str(p.nomeOriginale, `${percorso}.nomeOriginale`);
  const piatti = arr(p.piatti, `${percorso}.piatti`);
  if (piatti.length === 0) throw new PianoNonValidoError(`${percorso}.piatti`, 'vuoto');
  return {
    nomeOriginale,
    piatti: piatti.map((piatto, i) => {
      const pi = ogg(piatto, `${percorso}.piatti[${i}]`);
      const righeFisse = arr(pi.righeFisse, `${percorso}.piatti[${i}].righeFisse`).map((r, j) =>
        validaRiga(r, `${percorso}.piatti[${i}].righeFisse[${j}]`));
      const componenti = arr(pi.componenti, `${percorso}.piatti[${i}].componenti`).map((c, j) => {
        const co = ogg(c, `${percorso}.piatti[${i}].componenti[${j}]`);
        const opzioni = arr(co.opzioni, `${percorso}.piatti[${i}].componenti[${j}].opzioni`);
        if (opzioni.length < 2) throw new PianoNonValidoError(`${percorso}.piatti[${i}].componenti[${j}]`, 'meno di due opzioni');
        return {
          nome: str(co.nome, `${percorso}.piatti[${i}].componenti[${j}].nome`),
          opzioni: opzioni.map((o, k) => {
            const righe = arr(o, `${percorso}.piatti[${i}].componenti[${j}].opzioni[${k}]`);
            if (righe.length === 0) throw new PianoNonValidoError(`${percorso}.piatti[${i}].componenti[${j}].opzioni[${k}]`, 'opzione vuota');
            return righe.map((r, l) => validaRiga(r, `${percorso}.piatti[${i}].componenti[${j}].opzioni[${k}][${l}]`));
          }),
        };
      });
      if (righeFisse.length === 0 && componenti.length === 0)
        throw new PianoNonValidoError(`${percorso}.piatti[${i}]`, 'piatto senza righe né componenti');
      return {
        nome: str(pi.nome, `${percorso}.piatti[${i}].nome`),
        righeFisse,
        componenti,
        descrizione: pi.descrizione === null ? null : str(pi.descrizione, `${percorso}.piatti[${i}].descrizione`),
      };
    }),
  };
}

const ARCHETIPI = new Set(['menu_settimanale', 'giornata_unica', 'griglia_alternative']);

function validaPiano(v: unknown): PianoEstratto {
  const p = ogg(v, 'piano');
  const archetipo = str(p.archetipo, 'piano.archetipo');
  if (!ARCHETIPI.has(archetipo)) throw new PianoNonValidoError('piano.archetipo', `sconosciuto: ${archetipo}`);
  const settimane = arr(p.settimane, 'piano.settimane');
  if (settimane.length === 0 || settimane.length > 4) throw new PianoNonValidoError('piano.settimane', 'da 1 a 4');
  return {
    archetipo: archetipo as PianoEstratto['archetipo'],
    fonte: str(p.fonte, 'piano.fonte'),
    noteEstrazione: arr(p.noteEstrazione, 'piano.noteEstrazione').map((n, i) => str(n, `piano.noteEstrazione[${i}]`)),
    settimane: settimane.map((s, i) => {
      const se = ogg(s, `piano.settimane[${i}]`);
      const numero = se.numero;
      if (typeof numero !== 'number' || numero < 1 || numero > 4)
        throw new PianoNonValidoError(`piano.settimane[${i}].numero`, 'fuori da 1..4');
      const giorni = arr(se.giorni, `piano.settimane[${i}].giorni`);
      if (giorni.length === 0) throw new PianoNonValidoError(`piano.settimane[${i}].giorni`, 'vuoto');
      return {
        numero,
        giorni: giorni.map((g, j) => {
          const gi = ogg(g, `piano.settimane[${i}].giorni[${j}]`);
          const giorno = gi.giorno;
          if (typeof giorno !== 'number' || giorno < 0 || giorno > 6)
            throw new PianoNonValidoError(`piano.settimane[${i}].giorni[${j}].giorno`, 'fuori da 0..6');
          const pasti = arr(gi.pasti, `piano.settimane[${i}].giorni[${j}].pasti`);
          if (pasti.length === 0) throw new PianoNonValidoError(`piano.settimane[${i}].giorni[${j}].pasti`, 'vuoto');
          return { giorno, pasti: pasti.map((pa, k) => validaPasto(pa, `piano.settimane[${i}].giorni[${j}].pasti[${k}]`)) };
        }),
      };
    }),
  };
}

export function validaEsito(v: unknown): EsitoEstrazione {
  const e = ogg(v, 'esito');
  if (e.tipo === 'piano') return { tipo: 'piano', piano: validaPiano(e.piano) };
  if (e.tipo === 'rifiuto') {
    const r = ogg(e.rifiuto, 'rifiuto');
    if (r.archetipo !== 'solo_macro') throw new PianoNonValidoError('rifiuto.archetipo', 'deve essere solo_macro');
    return { tipo: 'rifiuto', rifiuto: { archetipo: 'solo_macro', motivazione: str(r.motivazione, 'rifiuto.motivazione') } };
  }
  throw new PianoNonValidoError('esito.tipo', 'né piano né rifiuto');
}
```

- [ ] **Step 5: `npx vitest run src/domain/import` → verde; poi la verifica completa e commit**

```bash
npm test && npx tsc --noEmit && npm run build && npm run lint
git add src/domain/import AGENTS.md
git commit -m "feat(import): il contratto PianoEstratto, la validazione e i fixture sintetici"
```

---

### Task 2: Formati tipici e mapping alimento→ingrediente / pasto→slot

**Files:**
- Create: `src/domain/import/formati-tipici.ts`
- Create: `src/domain/import/mapping.ts`
- Test: `src/domain/import/__tests__/mapping.test.ts`

**Interfaces:**
- Consumes: `Ingredient`, `MealSlotDef`, `UnitaBase` da `@/domain/types`; `IngredienteProposto`, `PianoEstratto`, `RigaEstratta` dal Task 1.
- Produces: `normalizza(s: string): string`; `abbina(alimento: string, unita: UnitaBase | null, ingredienti: Ingredient[]): Ingredient | null`; `proponi(alimento: string, unita: UnitaBase | null): IngredienteProposto`; `proponiSlot(nomeOriginale: string, slotDefs: MealSlotDef[]): string | null`; `ingredientiDaAbbinare(piano, correzioni): { alimento: string; unita: UnitaBase | null }[]` (unione deduplicata di tutte le righe, fisse e di opzione, con correzioni applicate).

- [ ] **Step 1: test (falliscono)**

```ts
// src/domain/import/__tests__/mapping.test.ts
import { describe, it, expect } from 'vitest';
import type { Ingredient, MealSlotDef } from '@/domain/types';
import { normalizza, abbina, proponiSlot, ingredientiDaAbbinare } from '../mapping';
import { proponi } from '../formati-tipici';
import { PIANO_MENU_SETTIMANALE } from '../fixtures';

const ing = (nome: string, unitaBase: Ingredient['unitaBase'] = 'g'): Ingredient => ({
  id: `i-${normalizza(nome)}`, nome, unitaBase, area: 'dispensa',
  classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500,
});

describe('normalizza', () => {
  it('minuscole, senza accenti, spazi collassati', () => {
    expect(normalizza('  Caffè   d\'Orzo ')).toBe("caffe d'orzo");
  });
});

describe('abbina', () => {
  it('match esatto sul nome normalizzato', () => {
    const riso = ing('Riso');
    expect(abbina('riso', 'g', [riso, ing('Riso venere')])).toBe(riso);
  });
  it('match per inclusione, preferendo il nome più corto', () => {
    const avena = ing("Fiocchi d'avena");
    expect(abbina("fiocchi d'avena", 'g', [ing("Fiocchi d'avena integrali bio"), avena])).toBe(avena);
  });
  it('unità incompatibile rompe il match: mai una conversione inventata', () => {
    expect(abbina('latte', 'ml', [ing('Latte', 'g')])).toBeNull();
  });
  it('unita null (quantità irrisolta) abbina solo per nome', () => {
    const olive = ing('Olive taggiasche', 'pz');
    expect(abbina('olive taggiasche', null, [olive])).toBe(olive);
  });
  it('nessun fuzzy: "pollo" non abbina "petto di tacchino"', () => {
    expect(abbina('pollo', 'g', [ing('Petto di tacchino')])).toBeNull();
  });
});

describe('proponi', () => {
  it('un alimento in tabella eredita i suoi default', () => {
    const p = proponi('pasta di semola', 'g');
    expect(p.formatoConfezione).toBe(500);
    expect(p.area).toBe('cereali');
    expect(p.alimento).toBe('pasta di semola');
  });
  it('fuori tabella: fallback prudente dispensa/stima/500', () => {
    const p = proponi('alchermes', 'ml');
    expect(p).toMatchObject({ area: 'dispensa', classeResiduo: 'stima', formatoConfezione: 500, unitaBase: 'ml' });
  });
  it('senza unità estratta il fallback è in grammi', () => {
    expect(proponi('cosa ignota', null).unitaBase).toBe('g');
  });
});

describe('proponiSlot', () => {
  const slot = (id: string, nome: string): MealSlotDef => ({ id, nome, posizione: 0, assenzeAbituali: Array(7).fill(false) });
  const defs = [slot('s1', 'Colazione'), slot('s2', 'Spuntino mattina'), slot('s3', 'Pranzo'), slot('s4', 'Cena')];
  it('match diretto e sinonimi', () => {
    expect(proponiSlot('colazione', defs)).toBe('s1');
    expect(proponiSlot('spuntino_mattina', defs)).toBe('s2');
    expect(proponiSlot('merenda', defs)).toBe('s2'); // sinonimo di spuntino
  });
  it('condimenti e nomi ignoti non hanno proposta', () => {
    expect(proponiSlot('condimenti', defs)).toBeNull();
    expect(proponiSlot('pasto libero', defs)).toBeNull();
  });
});

describe('ingredientiDaAbbinare', () => {
  it('unisce righe fisse e di opzione, deduplicate per alimento normalizzato', () => {
    const voci = ingredientiDaAbbinare(PIANO_MENU_SETTIMANALE, {});
    const alimenti = voci.map((v) => v.alimento);
    expect(alimenti).toContain("fiocchi d'avena");
    expect(alimenti).toContain('pane integrale');   // riga di opzione
    expect(alimenti).toContain('pane di segale');   // altra opzione
    // "fiocchi d'avena" compare in 3 pasti del fixture ma una volta sola qui.
    expect(alimenti.filter((a) => a === "fiocchi d'avena")).toHaveLength(1);
  });
  it('le correzioni sostituiscono il pasto originale', () => {
    const correzione = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[0].pasti[0]);
    correzione.piatti[0].righeFisse = [{ alimento: 'muesli', quantita: 40, unita: 'g', testoOriginale: '40g muesli' }];
    const voci = ingredientiDaAbbinare(PIANO_MENU_SETTIMANALE, { '1-0-0': correzione });
    expect(voci.map((v) => v.alimento)).toContain('muesli');
  });
});
```

- [ ] **Step 2: scrivere `formati-tipici.ts`** — la tabella completa (~40 voci; valori = default correggibili, non misure). Struttura e prime voci; l'implementatore completa la lista con voci analoghe per: riso, farina 00, pane (deperibile, 500g), fette biscottate 315g, fiocchi d'avena 500g, cous cous 500g, latte 1000ml (deperibile, latticini), yogurt 125g, yogurt greco 170g, parmigiano 200g, mozzarella 125g, feta 200g, ricotta 250g, uova 6pz, petto di pollo 300g (macelleria, deperibile), fesa di tacchino 300g, manzo 300g, prosciutto cotto 120g, bresaola 100g, tonno al naturale 160g, filetto di merluzzo 300g (surgelati, congelabile→area surgelati), salmone 200g, ceci 240g, fagioli 240g, lenticchie 250g, piselli surgelati 450g, passata di pomodoro 700ml, pomodorini 500g (ortofrutta, deperibile), insalata 200g, zucchine 500g, carote 500g, patate 1000g, mela/frutta fresca 1000g, frutta secca 200g, olio extravergine di oliva 1000ml, olio di semi 1000ml, cioccolato fondente 100g, marmellata 350g, miele 400g, crackers 250g:

```ts
import type { AreaId, ClasseResiduo, UnitaBase } from '@/domain/types';
import type { IngredienteProposto } from './types';
import { normalizza } from './mapping';

interface VoceFormato {
  /** Chiave di ricerca, già normalizzata: si confronta per inclusione col nome estratto. */
  chiave: string;
  nome: string;
  unitaBase: UnitaBase;
  area: AreaId;
  classeResiduo: ClasseResiduo;
  deperibile: boolean;
  formatoConfezione: number;
}

/**
 * Formati tipici del supermercato italiano: default proposti al passo formati,
 * sempre correggibili dall'utente. Quando arriverà l'estrattore Claude, la sua
 * proposta rimpiazzerà la tabella per i casi non coperti; il fallback resta.
 */
const VOCI: VoceFormato[] = [
  { chiave: 'pasta', nome: 'Pasta di semola', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 },
  { chiave: 'riso', nome: 'Riso', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 },
  { chiave: 'latte', nome: 'Latte', unitaBase: 'ml', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000 },
  { chiave: 'olio extravergine', nome: 'Olio extravergine di oliva', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 },
  { chiave: 'uova', nome: 'Uova', unitaBase: 'pz', area: 'latticini', classeResiduo: 'intero', deperibile: true, formatoConfezione: 6 },
  // ... (l'elenco completo dei ~40, una riga per voce, come da lista nel piano)
];

/** Il default per un alimento non abbinato: dalla tabella se una chiave è inclusa nel nome, altrimenti prudente. */
export function proponi(alimento: string, unita: UnitaBase | null): IngredienteProposto {
  const norm = normalizza(alimento);
  // La voce con la chiave più lunga inclusa nel nome vince: "olio extravergine" batte "olio".
  const voce = VOCI
    .filter((v) => norm.includes(v.chiave))
    .sort((a, b) => b.chiave.length - a.chiave.length)[0];
  if (voce && (unita === null || unita === voce.unitaBase)) {
    return { alimento: norm, nome: voce.nome, unitaBase: voce.unitaBase, area: voce.area, classeResiduo: voce.classeResiduo, deperibile: voce.deperibile, formatoConfezione: voce.formatoConfezione };
  }
  return {
    alimento: norm,
    nome: alimento.charAt(0).toUpperCase() + alimento.slice(1),
    unitaBase: unita ?? 'g',
    area: 'dispensa',
    classeResiduo: 'stima',
    deperibile: false,
    formatoConfezione: 500,
  };
}
```

**Nota:** il fallback quando la voce di tabella esiste ma l'unità estratta non coincide (alimento estratto in ml, voce in g) è il ramo prudente, non la voce: mai forzare un'unità diversa da quella con cui la dieta misura l'alimento.

- [ ] **Step 3: scrivere `mapping.ts`**

```ts
import type { Ingredient, MealSlotDef, UnitaBase } from '@/domain/types';
import type { PastoEstratto, PianoEstratto, RigaEstratta } from './types';
import { pastoEffettivo } from './types';

export function normalizza(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match esatto sul nome normalizzato, poi per inclusione (in entrambi i versi)
 * preferendo il nome più corto. Niente fuzzy a distanza: un abbinamento
 * sbagliato silenzioso è peggio di un ingrediente doppio, e l'utente vede
 * comunque l'esito nel passo formati. Un conflitto di unità rompe il match.
 */
export function abbina(alimento: string, unita: UnitaBase | null, ingredienti: Ingredient[]): Ingredient | null {
  const norm = normalizza(alimento);
  const compatibili = ingredienti.filter((i) => unita === null || i.unitaBase === unita);
  const esatto = compatibili.find((i) => normalizza(i.nome) === norm);
  if (esatto) return esatto;
  const inclusi = compatibili
    .filter((i) => {
      const n = normalizza(i.nome);
      return n.includes(norm) || norm.includes(n);
    })
    .sort((a, b) => a.nome.length - b.nome.length);
  return inclusi[0] ?? null;
}

const SINONIMI_SLOT: Record<string, string[]> = {
  colazione: ['colazione'],
  spuntino: ['spuntino', 'merenda', 'break'],
  pranzo: ['pranzo'],
  cena: ['cena'],
};

/**
 * Proposta di slot per il nome pasto della dieta: match per inclusione sul
 * nome slot normalizzato, con i sinonimi comuni. 'condimenti' e i nomi ignoti
 * restano null: li mappa l'utente. In caso di più slot plausibili
 * ("Spuntino mattina" e "Spuntino pomeriggio" per "spuntino_mattina") vince
 * quello il cui nome condivide più parole col nome della dieta.
 */
export function proponiSlot(nomeOriginale: string, slotDefs: MealSlotDef[]): string | null {
  const norm = normalizza(nomeOriginale.replace(/_/g, ' '));
  if (norm === 'condimenti') return null;
  const parole = new Set(norm.split(' '));
  let migliore: { id: string; punteggio: number } | null = null;
  for (const def of slotDefs) {
    const nomeSlot = normalizza(def.nome);
    const paroleSlot = nomeSlot.split(' ');
    const base = paroleSlot[0];
    const famiglia = Object.entries(SINONIMI_SLOT).find(([, sin]) => sin.some((s) => norm.includes(s)));
    const stessaFamiglia = famiglia !== undefined && SINONIMI_SLOT[famiglia[0]].some((s) => base.includes(s) || s.includes(base));
    if (!stessaFamiglia && !norm.includes(base) && !nomeSlot.includes(norm)) continue;
    const punteggio = paroleSlot.filter((p) => parole.has(p)).length + (stessaFamiglia ? 1 : 0);
    if (!migliore || punteggio > migliore.punteggio) migliore = { id: def.id, punteggio };
  }
  return migliore?.id ?? null;
}

function tutteLeRighe(pasto: PastoEstratto): RigaEstratta[] {
  return pasto.piatti.flatMap((p) => [...p.righeFisse, ...p.componenti.flatMap((c) => c.opzioni.flat())]);
}

/** L'unione deduplicata (per alimento normalizzato) di tutte le righe del piano, correzioni applicate. */
export function ingredientiDaAbbinare(
  piano: PianoEstratto,
  correzioni: Record<string, PastoEstratto>,
): { alimento: string; unita: UnitaBase | null }[] {
  const visti = new Map<string, { alimento: string; unita: UnitaBase | null }>();
  for (const settimana of piano.settimane) {
    for (const giorno of settimana.giorni) {
      giorno.pasti.forEach((_, indice) => {
        const pasto = pastoEffettivo(piano, correzioni, settimana.numero, giorno.giorno, indice);
        for (const riga of tutteLeRighe(pasto)) {
          const chiave = normalizza(riga.alimento);
          const esistente = visti.get(chiave);
          // Un'unità nota vince su null: la prima riga con grammatura fissa il tipo.
          if (!esistente || (esistente.unita === null && riga.unita !== null)) {
            visti.set(chiave, { alimento: chiave, unita: riga.unita });
          }
        }
      });
    }
  }
  return [...visti.values()];
}
```

- [ ] **Step 4: verde + verifica completa + commit**

```bash
npm test && npx tsc --noEmit && npm run build && npm run lint
git add src/domain/import
git commit -m "feat(import): formati tipici e mapping alimento-ingrediente, pasto-slot"
```

---

### Task 3: `traduciBozza` — dalla bozza alle scritture di dominio

**Files:**
- Create: `src/domain/import/commit.ts`
- Test: `src/domain/import/__tests__/commit.test.ts`

**Interfaces:**
- Consumes: Task 1 (tipi, `pastoEffettivo`, `chiavePasto`), Task 2 (`normalizza`, `abbina`); `Dish`, `Ingredient` da `@/domain/types`; `lunediDi` da `@/domain/date`.
- Produces:

```ts
type RigaTradotta = { quantita: number; unita: UnitaBase } & ({ ingredientId: string } | { nuovoAlimento: string });
interface PiattoDaCreare {
  /** id esistente da riusare (upsert) se un piatto uguale per nome+slot+giorno+settimana è già lì: idempotenza. */
  riusaDishId: string | null;
  nome: string; slotDefId: string;
  settimanaCiclo: number | null; giornoCiclo: number | null;
  descrizione: string | null;
  righe: RigaTradotta[];
  componenti: { nome: string; opzioni: RigaTradotta[][] }[];
}
interface ScrittureImport {
  ingredientiDaCreare: IngredienteProposto[];
  piattiDaDisattivare: string[];
  piattiDaCreare: PiattoDaCreare[];
  impostazioni: { settimaneCiclo: number; cicloOrigine: string };
}
class BozzaIncompletaError extends Error {}
function traduciBozza(
  piano: PianoEstratto, stato: StatoRevisione,
  ingredientiEsistenti: Ingredient[], repertorioEsistente: Dish[],
  oggi: string, // ISO yyyy-mm-dd, per cicloOrigine
): ScrittureImport
```

**Regole (dalla spec §6 + chiarimento condimenti dei Global Constraints):**
1. Ogni riga si risolve: `abbina` → `{ingredientId}`; altrimenti cerca in `stato.ingredientiNuovi` per `alimento` → `{nuovoAlimento}`; se nemmeno lì, `BozzaIncompletaError`. Una riga con `quantita: null` sopravvissuta alla revisione → `BozzaIncompletaError` (la UI la blocca, il dominio la rifiuta comunque).
2. `ingredientiDaCreare` = i soli `stato.ingredientiNuovi` il cui `alimento` non è abbinabile a un ingrediente esistente (così il re-run dopo un commit interrotto non li duplica) **ed è effettivamente usato** da almeno una riga.
3. Pasti `condimenti`: righe accodate alle `righe` di ogni `PiattoDaCreare` dello stesso giorno/settimana con lo stesso slot mappato; se nessuno, piatto a sé `nome: 'Condimenti'`.
4. Compattazione: dentro una settimana, se per uno slot il **pasto intero** (piatti sorella, righe ordinate per alimento, componenti e opzioni comprese, condimenti già accodati) è strutturalmente identico in tutti i giorni della settimana che hanno quello slot, si emette una sola serie di piatti con `giornoCiclo: null`; altrimenti una serie per giorno con `giornoCiclo` fissato. Il confronto usa `JSON.stringify` su una forma canonica (righe ordinate per chiave alimento/ingredientId).
5. `settimanaCiclo` = `null` se il piano ha una sola settimana, altrimenti `settimana.numero`.
6. Riuso: un `Dish` esistente attivo `fonte='nutrizionista'` con stessi `nome`+`slotDefId`+`giornoCiclo`+`settimanaCiclo` di un piatto da creare → `riusaDishId` (salvaPiatto farà upsert su quell'id). `piattiDaDisattivare` = gli attivi `fonte='nutrizionista'` NON riusati.
7. `impostazioni` = `{ settimaneCiclo: piano.settimane.length, cicloOrigine: lunediDi(oggi) + 7 giorni }` (il lunedì successivo: il piano nuovo vale dal prossimo check-in). Calcolo: `lunediDi(oggi)` poi `new Date(t + 7*86400000)` in UTC sulle date ISO.
8. Mappatura slot: `stato.mappaturaPasti[normalizza(nomeOriginale)]`; assente → `BozzaIncompletaError`.

- [ ] **Step 1: test (falliscono)** — coprire ognuna delle 8 regole:

```ts
// src/domain/import/__tests__/commit.test.ts
import { describe, it, expect } from 'vitest';
import type { Dish, Ingredient } from '@/domain/types';
import { traduciBozza, BozzaIncompletaError } from '../commit';
import type { StatoRevisione, PastoEstratto } from '../types';
import { PIANO_MENU_SETTIMANALE, FIXTURE_GIORNATA_UNICA } from '../fixtures';

const AVENA: Ingredient = { id: 'i-avena', nome: "Fiocchi d'avena", unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 };

function statoCompleto(): StatoRevisione {
  // Mappa tutti i nomi pasto del fixture, risolve la riga "2-3 olive" e dichiara i nuovi.
  const oliveRisolte = structuredClone(PIANO_MENU_SETTIMANALE.settimane[0].giorni[1].pasti[1]);
  oliveRisolte.piatti[0].righeFisse[1] = { alimento: 'olive taggiasche', quantita: 3, unita: 'pz', testoOriginale: '2-3 olive taggiasche' };
  return {
    passo: 'riepilogo',
    mappaturaPasti: { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' },
    pastiConfermati: [],
    correzioni: { '1-1-1': oliveRisolte },
    ingredientiNuovi: [
      { alimento: 'latte parzialmente scremato', nome: 'Latte parz. scremato', unitaBase: 'ml', area: 'latticini', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 1000 },
      { alimento: 'fesa di tacchino', nome: 'Fesa di tacchino', unitaBase: 'g', area: 'macelleria', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 300 },
      { alimento: 'pane integrale', nome: 'Pane integrale', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 },
      { alimento: 'pane di segale', nome: 'Pane di segale', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: true, formatoConfezione: 500 },
      { alimento: 'olio extravergine di oliva', nome: 'Olio EVO', unitaBase: 'ml', area: 'dispensa', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 1000 },
      { alimento: 'filetto di merluzzo', nome: 'Filetto di merluzzo', unitaBase: 'g', area: 'surgelati', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 300 },
      { alimento: 'olive taggiasche', nome: 'Olive taggiasche', unitaBase: 'pz', area: 'dispensa', classeResiduo: 'stima', deperibile: false, formatoConfezione: 30 },
      { alimento: 'tonno al naturale', nome: 'Tonno al naturale', unitaBase: 'g', area: 'dispensa', classeResiduo: 'intero', deperibile: false, formatoConfezione: 160 },
      { alimento: 'yogurt greco', nome: 'Yogurt greco', unitaBase: 'g', area: 'latticini', classeResiduo: 'intero', deperibile: true, formatoConfezione: 170 },
    ],
  };
}

describe('traduciBozza', () => {
  it('risolve le righe: abbinate a esistenti o dichiarate nuove', () => {
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, statoCompleto(), [AVENA], [], '2026-08-29');
    const colazione = s.piattiDaCreare.find((p) => p.nome === 'Porridge' && p.settimanaCiclo === 1)!;
    expect(colazione.righe).toContainEqual({ ingredientId: 'i-avena', quantita: 30, unita: 'g' });
    expect(colazione.righe).toContainEqual({ nuovoAlimento: 'latte parzialmente scremato', quantita: 150, unita: 'ml' });
  });

  it('una riga irrisolta o una mappatura mancante fermano tutto', () => {
    const senzaOlive = statoCompleto();
    delete senzaOlive.correzioni['1-1-1']; // le olive restano quantita: null
    expect(() => traduciBozza(PIANO_MENU_SETTIMANALE, senzaOlive, [AVENA], [], '2026-08-29')).toThrow(BozzaIncompletaError);
    const senzaMappa = statoCompleto();
    delete senzaMappa.mappaturaPasti['cena'];
    expect(() => traduciBozza(PIANO_MENU_SETTIMANALE, senzaMappa, [AVENA], [], '2026-08-29')).toThrow(BozzaIncompletaError);
  });

  it('i condimenti si accodano ai piatti dello slot mappato, non diventano sorelle', () => {
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, statoCompleto(), [AVENA], [], '2026-08-29');
    // Lunedì sett.1: condimenti mappati su cena -> l'olio finisce nelle righe del piatto di cena.
    const cenaLun = s.piattiDaCreare.find((p) => p.nome === 'Tacchino con pane')!;
    expect(cenaLun.righe).toContainEqual({ nuovoAlimento: 'olio extravergine di oliva', quantita: 20, unita: 'ml' });
    expect(s.piattiDaCreare.some((p) => p.nome === 'Condimenti')).toBe(false);
  });

  it('compatta i giorni identici: la giornata unica produce un piatto con giornoCiclo null', () => {
    const stato: StatoRevisione = { passo: 'riepilogo', mappaturaPasti: { pranzo: 's-pranzo' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [{ alimento: 'pasta di semola', nome: 'Pasta', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 }] };
    const s = traduciBozza(FIXTURE_GIORNATA_UNICA.piano, stato, [], [], '2026-08-29');
    expect(s.piattiDaCreare).toHaveLength(1);
    expect(s.piattiDaCreare[0]).toMatchObject({ nome: 'Pasta al pomodoro', giornoCiclo: null, settimanaCiclo: null });
  });

  it('la colazione uguale nei 2 giorni della sett.1 si compatta; le cene diverse no', () => {
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, statoCompleto(), [AVENA], [], '2026-08-29');
    const colazioni = s.piattiDaCreare.filter((p) => p.nome === 'Porridge' && p.settimanaCiclo === 1);
    expect(colazioni).toHaveLength(1);
    expect(colazioni[0].giornoCiclo).toBeNull();
    // Le cene di lun e mar sono diverse: restano per giorno. Martedì ha due sorelle.
    const cene = s.piattiDaCreare.filter((p) => p.slotDefId === 's-cena' && p.settimanaCiclo === 1);
    expect(cene.map((p) => p.giornoCiclo).sort()).toEqual([0, 1, 1]);
  });

  it('multi-settimana: settimanaCiclo dal numero, settimaneCiclo dal conteggio, origine il lunedì prossimo', () => {
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, statoCompleto(), [AVENA], [], '2026-08-29'); // sabato
    expect(s.impostazioni).toEqual({ settimaneCiclo: 2, cicloOrigine: '2026-08-31' });
    expect(s.piattiDaCreare.some((p) => p.settimanaCiclo === 2)).toBe(true);
  });

  it('idempotenza: piatti già creati vengono riusati, ingredienti già esistenti non ricreati', () => {
    const gemello: Dish = {
      id: 'd-gia', nome: 'Pasta al pomodoro', slotDefId: 's-pranzo', fonte: 'nutrizionista', attivo: true,
      descrizione: null, settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [],
    };
    const pasta: Ingredient = { id: 'i-pasta', nome: 'Pasta di semola', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 };
    const stato: StatoRevisione = { passo: 'riepilogo', mappaturaPasti: { pranzo: 's-pranzo' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [{ alimento: 'pasta di semola', nome: 'Pasta', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 }] };
    const s = traduciBozza(FIXTURE_GIORNATA_UNICA.piano, stato, [pasta], [gemello], '2026-08-29');
    expect(s.piattiDaCreare[0].riusaDishId).toBe('d-gia');
    expect(s.piattiDaDisattivare).toHaveLength(0);
    expect(s.ingredientiDaCreare).toHaveLength(0);
  });

  it('disattiva i piatti nutrizionista non riusati, mai i propri', () => {
    const vecchio: Dish = { id: 'd-old', nome: 'Vecchio piatto', slotDefId: 's-cena', fonte: 'nutrizionista', attivo: true, descrizione: null, settimanaCiclo: null, giornoCiclo: null, ingredienti: [], componenti: [] };
    const proprio: Dish = { ...vecchio, id: 'd-mio', nome: 'Piatto mio', fonte: 'proprio' };
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, statoCompleto(), [AVENA], [vecchio, proprio], '2026-08-29');
    expect(s.piattiDaDisattivare).toEqual(['d-old']);
  });

  it('gli ingredienti nuovi non usati da nessuna riga non si creano', () => {
    const stato = statoCompleto();
    stato.ingredientiNuovi.push({ alimento: 'zafferano', nome: 'Zafferano', unitaBase: 'g', area: 'dispensa', classeResiduo: 'stima', deperibile: false, formatoConfezione: 1 });
    const s = traduciBozza(PIANO_MENU_SETTIMANALE, stato, [AVENA], [], '2026-08-29');
    expect(s.ingredientiDaCreare.some((i) => i.alimento === 'zafferano')).toBe(false);
  });
});
```

- [ ] **Step 2: implementare `commit.ts`** — struttura suggerita: (a) helper `risolviRiga(riga) → RigaTradotta` con `abbina` + lookup nei nuovi; (b) per settimana/giorno: mappa slot→pasti, accoda condimenti, costruisce i `PiattoDaCreare` per giorno; (c) passata di compattazione per (settimana, slot) su forma canonica; (d) riuso e disattivazioni; (e) impostazioni. La forma canonica di un piatto: `{ nome, righe: [...ordinate per chiave], componenti: [{nome, opzioni: [[...ordinate]]}] }` serializzata con `JSON.stringify`; la chiave di una riga è `ingredientId` o `nuovoAlimento`.

- [ ] **Step 3: verde + verifica completa + commit**

```bash
npm test && npx tsc --noEmit && npm run build && npm run lint
git add src/domain/import
git commit -m "feat(import): traduciBozza, dalla bozza revisionata alle scritture di dominio"
```

---

### Task 4: Migrazione 0007 e CRUD della bozza

**Files:**
- Create: `supabase/migrations/0007_import_draft.sql`
- Create: `src/data/importa.ts` (solo la parte bozza; `eseguiScritture` è Task 5)

**Interfaces:**
- Consumes: `client()` da `src/data/supabase.ts`; `PianoEstratto`, `StatoRevisione`, `validaEsito` dal Task 1.
- Produces: `interface BozzaImport { piano: PianoEstratto; statoRevisione: StatoRevisione }`; `leggiBozzaImport(): Promise<BozzaImport | null>`; `salvaBozzaImport(b: BozzaImport): Promise<void>`; `cancellaBozzaImport(): Promise<void>`.

- [ ] **Step 1: scrivere la migrazione** (solo il file: **NON applicarla a nessun database** — gate di Andrea):

```sql
-- La bozza dell'import dieta (spec 2026-08-29-import-dieta-design.md §3).
-- Una riga per utente: un solo import in corso alla volta. Si cancella al
-- commit o su "ricomincia". Il PianoEstratto resta immutato in `piano`;
-- le decisioni della revisione vivono in `stato_revisione`.
create table import_draft (
  user_id uuid primary key references auth.users(id) on delete cascade,
  piano jsonb not null,
  stato_revisione jsonb not null,
  creato_il timestamptz not null default now()
);

-- RLS: stesso blocco di 0002_rls.sql / 0006_alternative.sql.
do $$
begin
  execute 'alter table import_draft enable row level security';
  execute 'alter table import_draft force row level security';
  execute 'create policy import_draft_proprietario on import_draft for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)';
end $$;
```

- [ ] **Step 2: scrivere il CRUD in `src/data/importa.ts`**

```ts
import type { PianoEstratto, StatoRevisione } from '@/domain/import/types';
import { validaEsito } from '@/domain/import/valida';
import { client } from './supabase';

export interface BozzaImport {
  piano: PianoEstratto;
  statoRevisione: StatoRevisione;
}

export async function leggiBozzaImport(): Promise<BozzaImport | null> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { data, error } = await sb
    .from('import_draft')
    .select('piano, stato_revisione')
    .eq('user_id', utente.user!.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Il jsonb torna dal database senza garanzie di forma: si rivalida come al
  // bordo API. Una bozza corrotta si tratta come assente, non come un crash.
  try {
    const esito = validaEsito({ tipo: 'piano', piano: data.piano });
    if (esito.tipo !== 'piano') return null;
    return { piano: esito.piano, statoRevisione: data.stato_revisione as StatoRevisione };
  } catch {
    return null;
  }
}

export async function salvaBozzaImport(b: BozzaImport): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { error } = await sb.from('import_draft').upsert({
    user_id: utente.user!.id,
    piano: b.piano,
    stato_revisione: b.statoRevisione,
  });
  if (error) throw error;
}

export async function cancellaBozzaImport(): Promise<void> {
  const sb = client();
  const { data: utente } = await sb.auth.getUser();
  const { error } = await sb.from('import_draft').delete().eq('user_id', utente.user!.id);
  if (error) throw error;
}
```

- [ ] **Step 3: verifica completa + commit** (il pattern data-layer esistente non ha test contro il DB; la validazione al rientro è coperta dai test del Task 1)

```bash
npm test && npx tsc --noEmit && npm run build && npm run lint
git add supabase/migrations/0007_import_draft.sql src/data/importa.ts
git commit -m "feat(schema): migrazione 0007, la bozza dell'import dieta"
```

---

### Task 5: `eseguiScritture` — l'esecutore del commit

**Files:**
- Modify: `src/data/importa.ts` (aggiunge `eseguiScritture`)
- Test: `src/data/__tests__/importa.test.ts`

**Interfaces:**
- Consumes: `ScrittureImport`, `RigaTradotta`, `PiattoDaCreare` dal Task 3; `salvaIngrediente`, `salvaPiatto`, `eliminaPiatto` da `src/data/repertorio.ts`; `leggiImpostazioni`, `salvaImpostazioni` da `src/data/impostazioni.ts`; `cancellaBozzaImport` (Task 4).
- Produces: `eseguiScritture(s: ScrittureImport): Promise<void>`.

**Ordine (dalla spec §6, un'interruzione lascia al peggio ingredienti in più e piatti disattivati, mai un piano mezzo attivo):** ingredienti → disattivazioni → piatti → impostazioni → cancella bozza.

- [ ] **Step 1: test (falliscono)** — con `vi.mock` dei moduli data sottostanti, si verifica ordine e traduzione:

```ts
// src/data/__tests__/importa.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../repertorio', () => ({ salvaIngrediente: vi.fn(), salvaPiatto: vi.fn(), eliminaPiatto: vi.fn() }));
vi.mock('../impostazioni', () => ({ leggiImpostazioni: vi.fn(), salvaImpostazioni: vi.fn() }));
vi.mock('../supabase', () => ({ client: vi.fn() }));

import { salvaIngrediente, salvaPiatto, eliminaPiatto } from '../repertorio';
import { leggiImpostazioni, salvaImpostazioni } from '../impostazioni';
import { client } from '../supabase';
import { eseguiScritture } from '../importa';
import type { ScrittureImport } from '@/domain/import/commit';

const SCRITTURE: ScrittureImport = {
  ingredientiDaCreare: [{ alimento: 'pasta di semola', nome: 'Pasta', unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 }],
  piattiDaDisattivare: ['d-old'],
  piattiDaCreare: [{
    riusaDishId: null, nome: 'Pasta al pomodoro', slotDefId: 's-pranzo',
    settimanaCiclo: null, giornoCiclo: null, descrizione: null,
    righe: [{ nuovoAlimento: 'pasta di semola', quantita: 80, unita: 'g' }],
    componenti: [{ nome: 'contorno', opzioni: [[{ nuovoAlimento: 'pasta di semola', quantita: 10, unita: 'g' }], [{ ingredientId: 'i-riso', quantita: 10, unita: 'g' }]] }],
  }],
  impostazioni: { settimaneCiclo: 1, cicloOrigine: '2026-08-31' },
};

function mockBozzaDelete() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const del = vi.fn(() => ({ eq }));
  vi.mocked(client).mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn(() => ({ delete: del })),
  } as never);
}

describe('eseguiScritture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBozzaDelete();
    vi.mocked(salvaIngrediente).mockResolvedValue('i-pasta-nuovo');
    vi.mocked(salvaPiatto).mockResolvedValue('d-nuovo');
    vi.mocked(eliminaPiatto).mockResolvedValue();
    vi.mocked(leggiImpostazioni).mockResolvedValue({ moltiplicatorePorzioni: 1, ordineAree: ['ortofrutta', 'macelleria', 'latticini', 'cereali', 'dispensa', 'surgelati'], settimaneCiclo: 1, cicloOrigine: null });
    vi.mocked(salvaImpostazioni).mockResolvedValue();
  });

  it('crea gli ingredienti, poi sostituisce nuovoAlimento con gli id veri nelle righe e nelle opzioni', async () => {
    await eseguiScritture(SCRITTURE);
    expect(salvaIngrediente).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Pasta' }));
    const piatto = vi.mocked(salvaPiatto).mock.calls[0][0];
    expect(piatto.ingredienti).toEqual([{ ingredientId: 'i-pasta-nuovo', quantita: 80, unita: 'g' }]);
    expect(piatto.componenti[0].opzioni[0].righe).toEqual([{ ingredientId: 'i-pasta-nuovo', quantita: 10, unita: 'g' }]);
    expect(piatto.componenti[0].opzioni[1].righe).toEqual([{ ingredientId: 'i-riso', quantita: 10, unita: 'g' }]);
    expect(piatto).toMatchObject({ fonte: 'nutrizionista', attivo: true });
  });

  it("l'ordine è: ingredienti, disattivazioni, piatti, impostazioni", async () => {
    const ordine: string[] = [];
    vi.mocked(salvaIngrediente).mockImplementation(async () => { ordine.push('ingrediente'); return 'i-x'; });
    vi.mocked(eliminaPiatto).mockImplementation(async () => { ordine.push('disattiva'); });
    vi.mocked(salvaPiatto).mockImplementation(async () => { ordine.push('piatto'); return 'd-x'; });
    vi.mocked(salvaImpostazioni).mockImplementation(async () => { ordine.push('impostazioni'); });
    await eseguiScritture(SCRITTURE);
    expect(ordine).toEqual(['ingrediente', 'disattiva', 'piatto', 'impostazioni']);
  });

  it('il riuso passa id al salvataggio; le impostazioni preservano i campi non toccati', async () => {
    await eseguiScritture({ ...SCRITTURE, piattiDaCreare: [{ ...SCRITTURE.piattiDaCreare[0], riusaDishId: 'd-gia' }] });
    expect(vi.mocked(salvaPiatto).mock.calls[0][0].id).toBe('d-gia');
    expect(salvaImpostazioni).toHaveBeenCalledWith(expect.objectContaining({ moltiplicatorePorzioni: 1, settimaneCiclo: 1, cicloOrigine: '2026-08-31' }));
  });
});
```

- [ ] **Step 2: implementare `eseguiScritture`** in `src/data/importa.ts`: crea gli ingredienti (`salvaIngrediente`) costruendo `Map<alimento, id>`; disattiva (`eliminaPiatto`); per ogni `PiattoDaCreare` costruisce l'`Omit<Dish,'id'> & {id?}` (righe risolte con la mappa, componenti con `id: crypto.randomUUID()` per componente e opzione — `salvaPiatto` rigenera comunque i componente_id non-uuid, ma il tipo `Componente` li richiede) e chiama `salvaPiatto` (con `id: riusaDishId ?? undefined`); poi `leggiImpostazioni()` → spread con i nuovi `settimaneCiclo`/`cicloOrigine` → `salvaImpostazioni` (riscrive la riga intera: leggere prima è obbligatorio, vedi commento in `impostazioni.ts`); infine `cancellaBozzaImport()`.

- [ ] **Step 3: verde + verifica completa + commit**

```bash
npm test && npx tsc --noEmit && npm run build && npm run lint
git add src/data
git commit -m "feat(import): eseguiScritture, il commit della bozza sul dominio"
```

---

### Task 6: Route `/api/import/estrai` (mock)

**Files:**
- Create: `src/app/api/import/estrai/route.ts`
- Test: `src/app/api/import/estrai/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `validaEsito`, fixtures dal Task 1. **Leggere prima** `node_modules/next/dist/docs/` sulla parte route handlers (App Router).
- Produces: `POST /api/import/estrai` con body `FormData` (`immagini`: File[] oppure `documento`: File) → 200 `EsitoEstrazione` JSON | 503 `{ errore: 'estrazione non disponibile' }` | 500 `{ errore: string }`.

**Comportamento:**
1. Se `process.env.ANTHROPIC_API_KEY` è assente (oggi sempre): si va di mock.
2. Mock: `IMPORT_MOCK` sceglie la sorgente — `'sintetico'` → `FIXTURE_MENU_SETTIMANALE`; `'rifiuto'` → `FIXTURE_RIFIUTO_MACRO`; qualunque altro valore (default `'dieta6'`) → legge `diete/estrazioni/piani/${IMPORT_MOCK}.json` da `process.cwd()` con `fs/promises` (il route handler gira sul server: qui `fs` è lecito, è `src/domain` che deve restarne pulito). File assente → 503.
3. Qualunque contenuto passa da `validaEsito` prima di uscire: un fixture rotto è un 500 con l'errore di validazione, non un JSON malformato che arriva alla UI.
4. L'input (le foto) si legge e si ignora nel mock; la firma resta quella vera, così `estrattoreClaude` sarà un cambio di implementazione, non di contratto.

- [ ] **Step 1: test (falliscono)** — chiamando `POST` direttamente:

```ts
// src/app/api/import/estrai/__tests__/route.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';
import { FIXTURE_MENU_SETTIMANALE, FIXTURE_RIFIUTO_MACRO } from '@/domain/import/fixtures';

function richiesta(): Request {
  const fd = new FormData();
  fd.append('immagini', new File(['x'], 'pagina1.jpg', { type: 'image/jpeg' }));
  return new Request('http://localhost/api/import/estrai', { method: 'POST', body: fd });
}

describe('POST /api/import/estrai (mock)', () => {
  const originale = { ...process.env };
  beforeEach(() => { delete process.env.ANTHROPIC_API_KEY; });
  afterEach(() => { process.env.IMPORT_MOCK = originale.IMPORT_MOCK; });

  it('IMPORT_MOCK=sintetico serve il fixture del menu', async () => {
    process.env.IMPORT_MOCK = 'sintetico';
    const res = await POST(richiesta());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(FIXTURE_MENU_SETTIMANALE);
  });

  it('IMPORT_MOCK=rifiuto serve il rifiuto macro', async () => {
    process.env.IMPORT_MOCK = 'rifiuto';
    const res = await POST(richiesta());
    expect(await res.json()).toEqual(FIXTURE_RIFIUTO_MACRO);
  });

  it('fixture su file assente → 503 estrazione non disponibile', async () => {
    process.env.IMPORT_MOCK = 'dieta-inesistente';
    const res = await POST(richiesta());
    expect(res.status).toBe(503);
    expect((await res.json()).errore).toBe('estrazione non disponibile');
  });
});
```

- [ ] **Step 2: implementare la route** (dopo aver letto la doc Next 16 sui route handlers; `export async function POST(req: Request): Promise<Response>`, `NextResponse.json` o `Response.json`).

- [ ] **Step 3: verde + verifica completa + commit**

```bash
npm test && npx tsc --noEmit && npm run build && npm run lint
git add src/app/api
git commit -m "feat(import): la route di estrazione, per ora mock sui fixture"
```

---

### Task 7: Trascrizione del fixture reale dieta6 (fuori git)

**Files:**
- Create: `diete/estrazioni/piani/dieta6.json` (**gitignored**, non si committa)
- Test: `src/domain/import/__tests__/fixture-reale.test.ts` (committato; si salta se il file non c'è)

**Interfaces:**
- Consumes: `diete/estrazioni/dieta6.json` (l'estrazione dello spike: 7 giorni, pasti come array di stringhe) e il contratto del Task 1.
- Produces: un `EsitoEstrazione` (`{ tipo: 'piano', piano: { archetipo: 'menu_settimanale', settimane: [{ numero: 1, giorni: [...] }] } }`) in cui ogni stringa del pasto è scomposta in `PiattoEstratto` con righe strutturate.

**Questo è un task di trascrizione, non di codice**: leggere le stringhe della dieta 6 (frasi composte del tipo, esempio inventato: "Insalata di farro (60g) con verdure grigliate con ceci (40g freschi o in scatola) e sgombro al naturale (50g)") e produrre righe `{ alimento, quantita, unita, testoOriginale }`. Regole: range → estremo alto ("2-3 olive" → `quantita: null`, non è un range in grammi ma un conteggio ambiguo: lasciare irrisolto); "cacao o cannella" → componente con due opzioni, `quantita: null` ciascuna; "q.b." e "a piacere" → `quantita: null`; il blocco condimenti del giorno → pasto `nomeOriginale: 'condimenti'`; `testoOriginale` = la stringa sorgente sempre, intera per la riga che ne deriva. I nomi pasto restano quelli del JSON di spike (`colazione`, `spuntino_mattina`, `pranzo`, `spuntino_pomeriggio`, `cena`, `spuntino_sera`, `condimenti`).

- [ ] **Step 1: scrivere il test-guardiano (committato)**

```ts
// src/domain/import/__tests__/fixture-reale.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validaEsito } from '../valida';

// Il fixture reale è fuori git (dati sanitari): su una macchina che non ce
// l'ha questi test si saltano, non falliscono.
const PERCORSO = join(process.cwd(), 'diete/estrazioni/piani/dieta6.json');

describe.skipIf(!existsSync(PERCORSO))('fixture reale dieta6', () => {
  it('è un EsitoEstrazione valido con 7 giorni', () => {
    const esito = validaEsito(JSON.parse(readFileSync(PERCORSO, 'utf8')));
    expect(esito.tipo).toBe('piano');
    if (esito.tipo !== 'piano') return;
    expect(esito.piano.settimane).toHaveLength(1);
    expect(esito.piano.settimane[0].giorni).toHaveLength(7);
    // Ogni giorno ha il pasto sintetico dei condimenti (nella dieta 6 c'è sempre).
    for (const g of esito.piano.settimane[0].giorni) {
      expect(g.pasti.some((p) => p.nomeOriginale === 'condimenti')).toBe(true);
    }
  });
});
```

- [ ] **Step 2: trascrivere** `diete/estrazioni/dieta6.json` → `diete/estrazioni/piani/dieta6.json`, giorno per giorno, con le regole sopra. Verificare che `git status` NON mostri il file (è sotto `diete/`, gitignored) prima di committare.

- [ ] **Step 3: verde + verifica completa + commit (solo il test)**

```bash
npm test && npx tsc --noEmit && npm run build && npm run lint
git add src/domain/import/__tests__/fixture-reale.test.ts
git commit -m "test(import): il guardiano del fixture reale dieta6 (il fixture resta fuori git)"
```

---

### Task 8: Camera in-app multi-scatto

**Files:**
- Create: `src/app/(app)/importa/Camera.tsx`
- Test: `src/app/(app)/importa/__tests__/camera.test.tsx`

**Interfaces:**
- Consumes: niente dal resto del piano (componente isolato).
- Produces: `<Camera onFoto={(foto: Blob[]) => void} />` — gestisce da sé permessi, scatti, miniature; chiama `onFoto` con l'elenco corrente a ogni cambiamento (aggiunta, rimozione, riordino).

**Comportamento:**
- Al mount prova `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` e collega lo stream a un `<video autoPlay playsInline muted>`. Allo smontaggio ferma tutte le tracce (`stream.getTracks().forEach(t => t.stop())`).
- "Scatta": disegna il frame corrente su un `<canvas>` ridimensionato a max 2048px sul lato lungo, `canvas.toBlob(..., 'image/jpeg', 0.8)`, aggiunge il blob alla lista.
- Striscia miniature sotto l'anteprima (object URL, da revocare con `URL.revokeObjectURL` alla rimozione): numerate ("pag. 1"), con ✕ per eliminare e frecce ◀▶ per riordinare.
- `getUserMedia` assente o rifiutato (catch) → si mostra al suo posto `<input type="file" accept="image/*" multiple capture="environment">` con la stessa striscia miniature; la label spiega: "La fotocamera non è disponibile: scegli le foto dei fogli".

- [ ] **Step 1: test (falliscono)** — in jsdom `getUserMedia` non esiste: il ramo fallback è quello testabile per primo; il ramo camera si testa con un mock che risolve uno stream finto:

```tsx
// src/app/(app)/importa/__tests__/camera.test.tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Camera } from '../Camera';

beforeEach(() => {
  vi.restoreAllMocks();
  // jsdom non ha mediaDevices: di default siamo nel ramo fallback.
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  // jsdom non implementa gli object URL.
  URL.createObjectURL = vi.fn(() => 'blob:finto');
  URL.revokeObjectURL = vi.fn();
});

describe('Camera', () => {
  it('senza getUserMedia mostra il picker di fallback', async () => {
    render(<Camera onFoto={() => {}} />);
    expect(await screen.findByLabelText(/scegli le foto/i)).toBeInTheDocument();
  });

  it('le foto scelte dal picker producono miniature e arrivano a onFoto', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    const f1 = new File(['a'], 'p1.jpg', { type: 'image/jpeg' });
    const f2 = new File(['b'], 'p2.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [f1, f2] } });
    await waitFor(() => expect(onFoto).toHaveBeenLastCalledWith([f1, f2]));
    expect(screen.getByText('pag. 1')).toBeInTheDocument();
    expect(screen.getByText('pag. 2')).toBeInTheDocument();
  });

  it('eliminare una pagina aggiorna elenco e numerazione', async () => {
    const onFoto = vi.fn();
    render(<Camera onFoto={onFoto} />);
    const input = await screen.findByLabelText(/scegli le foto/i);
    const f1 = new File(['a'], 'p1.jpg', { type: 'image/jpeg' });
    const f2 = new File(['b'], 'p2.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [f1, f2] } });
    fireEvent.click(await screen.findByRole('button', { name: /elimina pag\. 1/i }));
    await waitFor(() => expect(onFoto).toHaveBeenLastCalledWith([f2]));
    expect(screen.queryByText('pag. 2')).not.toBeInTheDocument();
  });

  it('con getUserMedia disponibile mostra anteprima e pulsante scatta, e ferma le tracce allo smontaggio', async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      configurable: true,
    });
    const { unmount } = render(<Camera onFoto={() => {}} />);
    expect(await screen.findByRole('button', { name: /scatta/i })).toBeInTheDocument();
    unmount();
    expect(stop).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: implementare `Camera.tsx`** (`'use client'`; stato: `foto: { blob: Blob; url: string }[]`, `stream: MediaStream | null`, `fallback: boolean`). Attenzione a `videoRef.current.srcObject = stream` e a chiamare `onFoto` dentro le stesse funzioni che aggiornano lo stato (non in un effect sulla lista, per evitare chiamate al mount).

- [ ] **Step 3: verde + verifica completa + commit**

```bash
npm test && npx tsc --noEmit && npm run build && npm run lint
git add "src/app/(app)/importa"
git commit -m "feat(import): la camera in-app multi-scatto con fallback al picker"
```

---

### Task 9: Wizard `/importa` — acquisizione, estrazione, rifiuto, ripresa

**Files:**
- Create: `src/app/(app)/importa/page.tsx`
- Test: `src/app/(app)/importa/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `Camera` (Task 8), `leggiBozzaImport`/`salvaBozzaImport`/`cancellaBozzaImport` (Task 4), `validaEsito` (Task 1), `leggiSlotDefs` da `src/data/impostazioni.ts`, `proponiSlot`+`normalizza` (Task 2); i componenti `Testata`/`Tessera` esistenti per l'aspetto.
- Produces: la pagina wizard; per i Task 10-11 espone la scelta del passo: `Revisione` e `Formati` sono figli renderizzati in base a `statoRevisione.passo` (interfacce nei rispettivi task; in questo task al loro posto ci sono due segnaposto `<p>` che il Task 10/11 sostituisce).

**Comportamento:**
- Al mount: `leggiBozzaImport()`. Bozza presente → banner "Hai un import in corso" con RIPRENDI (va al passo salvato) e RICOMINCIA (conferma → `cancellaBozzaImport()` → acquisizione). Assente → acquisizione.
- Acquisizione: due tab (Segmento esistente) FOTO / PDF. FOTO → `Camera`; PDF → `<input type="file" accept="application/pdf">`. "ESTRAI LA DIETA" attivo con ≥1 foto o un PDF.
- Estrazione: costruisce `FormData` (`immagini` ripetuto, o `documento`), `fetch('/api/import/estrai', { method: 'POST', body })`. Attesa con messaggio ("Sto leggendo la dieta…"). Risposta:
  - 200 + `tipo: 'piano'` (rivalidato con `validaEsito` — mai fidarsi del wire): `leggiSlotDefs()`, costruisce `mappaturaPasti` iniziale con `proponiSlot` su ogni `nomeOriginale` distinto (chiave normalizzata; i `null` restano fuori dalla mappa), salva la bozza `{ piano, statoRevisione: { passo: 'revisione', mappaturaPasti, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] } }` e passa alla revisione.
  - 200 + `tipo: 'rifiuto'`: schermata dedicata — titolo "Questa dieta non ha un menu", la `motivazione`, e la spiegazione fissa: "Prescrive obiettivi nutrizionali, non alimenti: Spesa costruisce la lista dai piatti, e qui non ci sono piatti da cui partire." Nessuna bozza creata. Un link torna a Impostazioni.
  - 503: "L'estrazione non è disponibile su questo ambiente." (produzione senza chiave).
  - Errore/altro: messaggio + RIPROVA; le foto restano nello stato del componente.

- [ ] **Step 1: test (falliscono)**

```tsx
// src/app/(app)/importa/__tests__/page.test.tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
vi.mock('@/data/importa', () => ({ leggiBozzaImport: vi.fn(), salvaBozzaImport: vi.fn(), cancellaBozzaImport: vi.fn() }));
vi.mock('@/data/impostazioni', () => ({ leggiSlotDefs: vi.fn() }));
import { leggiBozzaImport, salvaBozzaImport, cancellaBozzaImport } from '@/data/importa';
import { leggiSlotDefs } from '@/data/impostazioni';
import { FIXTURE_MENU_SETTIMANALE, FIXTURE_RIFIUTO_MACRO } from '@/domain/import/fixtures';
import Importa from '../page';

const SLOTS = [
  { id: 's-col', nome: 'Colazione', posizione: 0, assenzeAbituali: Array(7).fill(false) },
  { id: 's-cena', nome: 'Cena', posizione: 5, assenzeAbituali: Array(7).fill(false) },
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  URL.createObjectURL = vi.fn(() => 'blob:finto');
  URL.revokeObjectURL = vi.fn();
  vi.mocked(leggiBozzaImport).mockResolvedValue(null);
  vi.mocked(leggiSlotDefs).mockResolvedValue(SLOTS);
});

function caricaUnaFoto() {
  const input = screen.getByLabelText(/scegli le foto/i);
  fireEvent.change(input, { target: { files: [new File(['a'], 'p1.jpg', { type: 'image/jpeg' })] } });
}

describe('Importa', () => {
  it("senza bozza parte dall'acquisizione; il pulsante estrai si attiva con una foto", async () => {
    render(<Importa />);
    const estrai = await screen.findByRole('button', { name: /estrai la dieta/i });
    expect(estrai).toBeDisabled();
    caricaUnaFoto();
    await waitFor(() => expect(estrai).toBeEnabled());
  });

  it('estrazione ok: salva la bozza con la mappatura proposta e va in revisione', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_MENU_SETTIMANALE });
    render(<Importa />);
    await screen.findByRole('button', { name: /estrai la dieta/i });
    caricaUnaFoto();
    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));
    await waitFor(() => expect(salvaBozzaImport).toHaveBeenCalled());
    const bozza = vi.mocked(salvaBozzaImport).mock.calls[0][0];
    expect(bozza.statoRevisione.passo).toBe('revisione');
    expect(bozza.statoRevisione.mappaturaPasti).toMatchObject({ colazione: 's-col', cena: 's-cena' });
    expect(bozza.statoRevisione.mappaturaPasti.condimenti).toBeUndefined();
  });

  it('rifiuto macro: schermata onesta, nessuna bozza', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => FIXTURE_RIFIUTO_MACRO });
    render(<Importa />);
    await screen.findByRole('button', { name: /estrai la dieta/i });
    caricaUnaFoto();
    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));
    expect(await screen.findByText(/questa dieta non ha un menu/i)).toBeInTheDocument();
    expect(salvaBozzaImport).not.toHaveBeenCalled();
  });

  it('503: estrazione non disponibile', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ errore: 'estrazione non disponibile' }) });
    render(<Importa />);
    await screen.findByRole('button', { name: /estrai la dieta/i });
    caricaUnaFoto();
    fireEvent.click(screen.getByRole('button', { name: /estrai la dieta/i }));
    expect(await screen.findByText(/non è disponibile/i)).toBeInTheDocument();
  });

  it('bozza esistente: riprendi/ricomincia; ricominciare la cancella', async () => {
    vi.mocked(leggiBozzaImport).mockResolvedValue({
      piano: FIXTURE_MENU_SETTIMANALE.piano!,
      statoRevisione: { passo: 'revisione', mappaturaPasti: {}, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] },
    } as never);
    render(<Importa />);
    expect(await screen.findByText(/import in corso/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ricomincia/i }));
    fireEvent.click(await screen.findByRole('button', { name: /sì, ricomincia/i }));
    await waitFor(() => expect(cancellaBozzaImport).toHaveBeenCalled());
  });
});
```

**Nota sul fixture nel test:** `FIXTURE_MENU_SETTIMANALE.piano` esiste solo sul ramo `tipo: 'piano'`; nel test si usa con `!`/`as never` per brevità — l'implementatore può estrarre `const PIANO = (FIXTURE_MENU_SETTIMANALE as { piano: PianoEstratto }).piano` se preferisce.

- [ ] **Step 2: implementare `page.tsx`** — `'use client'`; stato principale `vista: 'caricamento' | 'ripresa' | 'acquisizione' | 'estrazione' | 'rifiuto' | 'errore' | 'bozza'` + `bozza: BozzaImport | null`; con `vista === 'bozza'` renderizza il segnaposto del passo (`statoRevisione.passo`) che i Task 10-11 sostituiscono. Testata coerente con le altre schermate (`<Testata titolo="Importa la dieta" />` se l'API del componente esistente combacia — verificarla prima di usarla).

- [ ] **Step 3: verde + verifica completa + commit**

```bash
npm test && npx tsc --noEmit && npm run build && npm run lint
git add "src/app/(app)/importa"
git commit -m "feat(import): il wizard di importazione, acquisizione ed estrazione"
```

---

### Task 10: Revisione pasto per pasto

**Files:**
- Create: `src/app/(app)/importa/Revisione.tsx`
- Modify: `src/app/(app)/importa/page.tsx` (sostituisce il segnaposto del passo `revisione`)
- Test: `src/app/(app)/importa/__tests__/revisione.test.tsx`

**Interfaces:**
- Consumes: tipi e `chiavePasto`/`pastoEffettivo` (Task 1), `normalizza` (Task 2), `MealSlotDef`.
- Produces: `<Revisione piano={PianoEstratto} stato={StatoRevisione} slotDefs={MealSlotDef[]} onStato={(s: StatoRevisione) => void} />` — ogni modifica risale con `onStato`; la pagina la persiste con `salvaBozzaImport` (debounce non necessario: si salva su conferma pasto e su cambio giorno, non a ogni tasto).

**Comportamento:**
- Navigazione per giorno: intestazione "Lunedì — giorno 1 di 7 · settimana 1 di 2", frecce avanti/indietro su tutti i giorni di tutte le settimane in sequenza.
- Ogni pasto è una card: select dello slot (etichetta = `nomeOriginale`, opzioni = slotDefs + "— scegli —" se non mappato); cambiare la mappatura aggiorna `mappaturaPasti[normalizza(nomeOriginale)]` (vale per tutti i giorni).
- Piatti: nome editabile; righe con alimento (testo), quantità (numero), unità (select g/ml/pz); sotto ogni riga il `testoOriginale` in corpo minore (non editabile). Righe eliminabili; piatti eliminabili (con conferma se è l'ultimo del pasto: elimina il pasto intero dal giorno — nella correzione, `piatti: []` non è ammesso dal validatore, quindi il pasto eliminato si rappresenta togliendolo dalla correzione? No: si rappresenta con una correzione `{ ...pasto, piatti: [] }` gestita SOLO in memoria di revisione — vedere nota sotto).
- **Nota pasto eliminato:** il validatore rifiuta `piatti: []` sul wire, ma le correzioni sono un altro tipo di dato (stato di revisione, non esito di estrazione). Per non complicare: eliminare l'ultimo piatto di un pasto scrive la correzione `{ nomeOriginale, piatti: [] }` e `traduciBozza` la interpreta come "pasto rimosso" (nessun piatto da creare, nessun errore). Aggiungere al Task 3 il caso: già coperto se `traduciBozza` itera sui piatti del pasto effettivo — zero piatti = zero scritture; verificare che la mappatura mancante di un pasto SVUOTATO non lanci `BozzaIncompletaError` (il controllo di mappatura scatta solo se il pasto ha piatti).
- Righe `quantita: null`: bordo/etichetta di avviso "quantità da indicare", e CONFERMA PASTO disabilitato finché esistono nel pasto.
- Componenti: per ogni componente, nome + le opzioni elencate ("oppure" fra loro), righe editabili come le fisse.
- CONFERMA PASTO: aggiunge `chiavePasto` a `pastiConfermati` (e la card si compatta a una riga con ✓, riapribile). Quando TUTTI i pasti di tutti i giorni sono confermati e ogni pasto non vuoto è mappato, compare "VAI AI FORMATI" → `onStato({ ...stato, passo: 'formati' })`.

- [ ] **Step 1: test (falliscono)** — i comportamenti chiave:

```tsx
// src/app/(app)/importa/__tests__/revisione.test.tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Revisione } from '../Revisione';
import { PIANO_MENU_SETTIMANALE } from '@/domain/import/fixtures';
import type { StatoRevisione } from '@/domain/import/types';

const SLOTS = [
  { id: 's-col', nome: 'Colazione', posizione: 0, assenzeAbituali: Array(7).fill(false) },
  { id: 's-cena', nome: 'Cena', posizione: 5, assenzeAbituali: Array(7).fill(false) },
];
const STATO: StatoRevisione = {
  passo: 'revisione',
  mappaturaPasti: { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' },
  pastiConfermati: [], correzioni: {}, ingredientiNuovi: [],
};

describe('Revisione', () => {
  it('mostra il giorno corrente con i testi originali sotto le righe', () => {
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={STATO} slotDefs={SLOTS as never} onStato={() => {}} />);
    expect(screen.getByText(/giorno 1 di 3/i)).toBeInTheDocument();
    expect(screen.getByText("30g fiocchi d'avena")).toBeInTheDocument();
  });

  it('modificare una quantità produce una correzione, non tocca il piano', () => {
    const onStato = vi.fn();
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={STATO} slotDefs={SLOTS as never} onStato={onStato} />);
    const campo = screen.getAllByLabelText(/quantità/i)[0];
    fireEvent.change(campo, { target: { value: '40' } });
    fireEvent.click(within(screen.getByText('Porridge').closest('section')!).getByRole('button', { name: /conferma pasto/i }));
    const stato = onStato.mock.calls.at(-1)![0] as StatoRevisione;
    expect(stato.correzioni['1-0-0'].piatti[0].righeFisse[0].quantita).toBe(40);
    expect(stato.pastiConfermati).toContain('1-0-0');
  });

  it('una riga con quantità mancante blocca la conferma del suo pasto', () => {
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={STATO} slotDefs={SLOTS as never} onStato={() => {}} />);
    // Giorno 2 (martedì) ha le olive senza quantità.
    fireEvent.click(screen.getByRole('button', { name: /giorno successivo/i }));
    const cardMerluzzo = screen.getByText('Merluzzo').closest('section')!;
    expect(within(cardMerluzzo).getByText(/quantità da indicare/i)).toBeInTheDocument();
    expect(within(cardMerluzzo).getByRole('button', { name: /conferma pasto/i })).toBeDisabled();
  });

  it('VAI AI FORMATI compare solo con tutti i pasti confermati', () => {
    const tutti: string[] = [];
    for (const s of PIANO_MENU_SETTIMANALE.settimane) for (const g of s.giorni) g.pasti.forEach((_, i) => tutti.push(`${s.numero}-${g.giorno}-${i}`));
    const onStato = vi.fn();
    render(<Revisione piano={PIANO_MENU_SETTIMANALE} stato={{ ...STATO, pastiConfermati: tutti }} slotDefs={SLOTS as never} onStato={onStato} />);
    fireEvent.click(screen.getByRole('button', { name: /vai ai formati/i }));
    expect(onStato.mock.calls.at(-1)![0].passo).toBe('formati');
  });
});
```

(Nel primo test "giorno 1 di 3": il fixture ha 2 giorni in settimana 1 + 1 in settimana 2 = 3 tappe di navigazione.)

- [ ] **Step 2: implementare `Revisione.tsx`** e collegarla in `page.tsx` (il passo `revisione` la renderizza; `onStato` salva con `salvaBozzaImport` e aggiorna lo stato della pagina).

- [ ] **Step 3: aggiornare il Task 3 se serve** — se il test del pasto svuotato (`piatti: []` nelle correzioni) non era già coperto, aggiungere in `commit.test.ts`:

```ts
it('un pasto svuotato in revisione non produce piatti e non pretende mappatura', () => {
  const stato = statoCompleto();
  stato.correzioni['1-0-2'] = { nomeOriginale: 'condimenti', piatti: [] };
  delete stato.mappaturaPasti['condimenti'];
  const s = traduciBozza(PIANO_MENU_SETTIMANALE, stato, [AVENA], [], '2026-08-29');
  expect(s.piattiDaCreare.every((p) => !p.righe.some((r) => 'nuovoAlimento' in r && r.nuovoAlimento === 'olio extravergine di oliva'))).toBe(true);
});
```

- [ ] **Step 4: verde + verifica completa + commit**

```bash
npm test && npx tsc --noEmit && npm run build && npm run lint
git add "src/app/(app)/importa" src/domain/import
git commit -m "feat(import): la revisione guidata pasto per pasto"
```

---

### Task 11: Passo formati, riepilogo, commit e ingresso da Impostazioni

**Files:**
- Create: `src/app/(app)/importa/Formati.tsx`
- Modify: `src/app/(app)/importa/page.tsx` (passi `formati` e `riepilogo`)
- Modify: `src/app/(app)/impostazioni/page.tsx` (link "Importa la dieta" → `/importa`, accanto al link Reparti esistente)
- Modify: `README.md` (sezione breve: cos'è l'import, stato mock, come si prova con `IMPORT_MOCK`)
- Test: `src/app/(app)/importa/__tests__/formati.test.tsx`

**Interfaces:**
- Consumes: `ingredientiDaAbbinare`+`abbina` (Task 2), `proponi` (Task 2), `traduciBozza`+`BozzaIncompletaError` (Task 3), `eseguiScritture` (Task 5), `leggiIngredienti`, `leggiRepertorio` da `src/data/repertorio.ts`; `useRouter` per il redirect finale.
- Produces: `<Formati piano stato ingredientiEsistenti onStato />`; il riepilogo vive in `page.tsx`.

**Comportamento — Formati:**
- Entrando nel passo: se `stato.ingredientiNuovi` è vuoto, si calcola — `ingredientiDaAbbinare(piano, correzioni)` → per ogni voce senza `abbina` → `proponi(alimento, unita)`; il risultato si salva subito in `statoRevisione` (così un refresh non ricalcola sopra le correzioni dell'utente). Se non è vuoto, si riparte da lì.
- Una card per ingrediente proposto: nome, unità base (select), area (select con `nomeArea` da `@/domain/aree`), classe residuo (select), deperibile (toggle), formato confezione (numero). Un'azione secondaria "è lo stesso di…" apre un select degli ingredienti esistenti compatibili per unità: sceglierne uno RIMUOVE la proposta (la riga si abbinerà in `traduciBozza`)? No — `abbina` non lo saprebbe ritrovare. Meccanica corretta: la scelta rinomina la proposta col nome esatto dell'esistente, così `abbina` la aggancia per match esatto e `traduciBozza` la esclude dai `ingredientiDaCreare` (regola 2 del Task 3). Etichetta UI: "Usa l'ingrediente esistente".
- "VAI AL RIEPILOGO" → `onStato({ ...stato, ingredientiNuovi, passo: 'riepilogo' })`.

**Comportamento — Riepilogo (in `page.tsx`):**
- Chiama `traduciBozza` (in try/catch: `BozzaIncompletaError` mostra il messaggio e un link per tornare alla revisione) con `leggiIngredienti()` e `leggiRepertorio()` freschi e `oggi` = data locale ISO.
- Mostra: "N piatti su M settimane · K ingredienti nuovi · X piatti del piano attuale verranno disattivati" (N/K/X dai campi di `ScrittureImport`).
- "SOSTITUISCI IL PIANO" con conferma a due passi (stesso pattern delle conferme esistenti): al sì, `eseguiScritture(scritture)` → `router.push('/settimana')`. Errore a metà: messaggio "Qualcosa si è fermato: riprova, l'import riprende da dove era" (l'idempotenza del Task 3/5 rende il retry sicuro).

- [ ] **Step 1: test (falliscono)**

```tsx
// src/app/(app)/importa/__tests__/formati.test.tsx
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Formati } from '../Formati';
import { PIANO_MENU_SETTIMANALE } from '@/domain/import/fixtures';
import type { Ingredient } from '@/domain/types';
import type { StatoRevisione } from '@/domain/import/types';

const AVENA: Ingredient = { id: 'i-avena', nome: "Fiocchi d'avena", unitaBase: 'g', area: 'cereali', classeResiduo: 'porzionabile', deperibile: false, formatoConfezione: 500 };
const STATO: StatoRevisione = { passo: 'formati', mappaturaPasti: { colazione: 's-col', cena: 's-cena', condimenti: 's-cena' }, pastiConfermati: [], correzioni: {}, ingredientiNuovi: [] };

describe('Formati', () => {
  it('propone i soli non abbinati: l\'avena esistente non compare', async () => {
    render(<Formati piano={PIANO_MENU_SETTIMANALE} stato={STATO} ingredientiEsistenti={[AVENA]} onStato={() => {}} />);
    expect(await screen.findByDisplayValue(/latte/i)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/avena/i)).not.toBeInTheDocument();
  });

  it('correggere il formato e andare al riepilogo persiste gli ingredienti nello stato', async () => {
    const onStato = vi.fn();
    render(<Formati piano={PIANO_MENU_SETTIMANALE} stato={STATO} ingredientiEsistenti={[AVENA]} onStato={onStato} />);
    const formato = (await screen.findAllByLabelText(/formato confezione/i))[0];
    fireEvent.change(formato, { target: { value: '750' } });
    fireEvent.click(screen.getByRole('button', { name: /vai al riepilogo/i }));
    await waitFor(() => {
      const stato = onStato.mock.calls.at(-1)![0] as StatoRevisione;
      expect(stato.passo).toBe('riepilogo');
      expect(stato.ingredientiNuovi.some((i) => i.formatoConfezione === 750)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: implementare `Formati.tsx`, il riepilogo in `page.tsx`, il link in Impostazioni, la sezione README.**
- [ ] **Step 3: verde + verifica completa + commit**

```bash
npm test && npx tsc --noEmit && npm run build && npm run lint
git add "src/app/(app)/importa" "src/app/(app)/impostazioni" README.md
git commit -m "feat(import): formati, riepilogo e commit del piano importato"
```

---

## Dopo l'ultimo task (fuori dai task, per il controller)

1. Review finale dell'intero branch (modello più capace).
2. Giro E2E manuale in locale col mock `IMPORT_MOCK=dieta6` (serve il fixture del Task 7 e **la migrazione 0007 applicata** — gate di Andrea prima di applicarla in produzione; per il giro locale serve comunque, il progetto usa il DB di produzione: chiedere l'ok PRIMA del giro).
3. Merge su main + deploy: gate di Andrea.
