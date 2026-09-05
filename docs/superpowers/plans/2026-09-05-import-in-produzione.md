# Import in produzione Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare l'estrattore sotto il limite di durata di Vercel con l'estrazione a pagine in parallelo (indice → pagine → fusione), mettere un tetto di import per utente, e far produrre all'eval un confronto Sonnet/Opus leggibile, così che la scelta del modello e l'accensione della chiave in produzione siano due passi da un quarto d'ora in locale.

**Architecture:** Le parti pure prima (indice e fusione in `src/domain/import/`, testate senza rete), poi il server (`import-ai.ts` con orchestratore e cache, `pdf-pagine.ts`), poi i dati (`import_uso` con RLS senza update/delete e il modulo `src/data/import-uso.ts`), poi la route che li compone (limite → divisione PDF → pipeline), poi l'eval e il README. Ogni task chiude con suite verde e un commit. La v1 (`estraiPiano`, una chiamata) non si tocca: resta il caso a una pagina e la baseline.

**Tech Stack:** Next.js 16 (App Router), TypeScript, `@anthropic-ai/sdk` 0.122 (structured output beta, streaming, `cache_control`), `pdf-lib` 1.17 (nuova dipendenza, JavaScript puro), Supabase (JWT + RLS), Vitest 4.

**Spec:** `docs/superpowers/specs/2026-09-05-import-in-produzione-design.md`

## Global Constraints

- `diete/` è gitignored e contiene dati sanitari veri: MAI in git, MAI nei test committati, MAI in un report fuori da `diete/`. Il report dell'eval si scrive SOLO in `diete/estrazioni/`.
- `ANTHROPIC_API_KEY` solo in env. Nessun test della suite normale chiama la rete: il client Anthropic si mocka con `vi.hoisted` + `vi.mock('@/server/anthropic', ...)`.
- Messaggi errore route, verbatim, in aggiunta a quelli esistenti: 429 `hai già fatto ${limite} import negli ultimi 30 giorni: il prossimo dal ${gg/mm/aaaa}`; 400 per PDF illeggibile resta `richiesta non valida`.
- `maxDuration` resta 300. Cap invariati: 12 immagini, 4 MB, MIME della v1.
- Env nuove: `IMPORT_LIMITE_30GG` (default `3`, `0` = disattivato), `IMPORT_CONCORRENZA` (default `4`). Lette a ogni richiesta, mai cachate a modulo.
- Structured output: schema dedicato per l'indice, schema della v1 per le pagine. Beta `structured-outputs-2025-12-15` come oggi. Streaming sempre.
- `cache_control: { type: 'ephemeral' }` sull'ULTIMO blocco pagina (immagine o documento) di ogni chiamata. L'ordine dei blocchi è `system → pagine → testo` e non cambia fra indice e pagine, altrimenti la cache non prende.
- Test route con `/** @vitest-environment node */`; mock con `vi.hoisted`.
- Codice, commenti e test in italiano, stile del file toccato. Suite verde a ogni commit: `npm test && npx tsc --noEmit && npm run lint`.
- Nessuna modifica a `Revisione.tsx`, `commit.ts`, `valida.ts` oltre a `validaPianoParziale`.

---

## Lotto 1 — dominio puro

### Task 1: Indice: tipi e validatore

**Files:**
- Create: `src/domain/import/indice.ts`
- Test: `src/domain/import/__tests__/indice.test.ts`

**Interfaces:**
- Consumes: `ArchetipoImportabile`, `RifiutoImport` da `types.ts`; `PianoNonValidoError` da `valida.ts`.
- Produces: `VocePagina`, `PaginaIndice`, `IndiceEstrazione`, `EsitoIndice`, `validaIndice(v: unknown): EsitoIndice`.

- [x] **Step 1: Test che falliscono**

```ts
// src/domain/import/__tests__/indice.test.ts
import { describe, it, expect } from 'vitest';
import { validaIndice } from '../indice';
import { PianoNonValidoError } from '../valida';

const buono = {
  tipo: 'indice',
  indice: {
    archetipo: 'menu_settimanale', fonte: '3 foto', noteEstrazione: [],
    pagine: [
      { pagina: 1, continuaDallaPrecedente: false, contenuto: [{ settimana: 1, giorno: 0, titolo: null, pasti: ['colazione', 'pranzo'] }] },
      { pagina: 2, continuaDallaPrecedente: true, contenuto: [{ settimana: 1, giorno: 0, titolo: null, pasti: ['pranzo', 'cena'] }] },
      { pagina: 3, continuaDallaPrecedente: false, contenuto: [] },
    ],
  },
};

describe('validaIndice', () => {
  it('accetta un indice ben formato, pagine vuote incluse', () => {
    expect(validaIndice(buono).tipo).toBe('indice');
  });
  it('accetta il rifiuto onesto', () => {
    expect(validaIndice({ tipo: 'rifiuto', rifiuto: { archetipo: 'solo_macro', motivazione: 'solo macro' } }).tipo).toBe('rifiuto');
  });
  it('rifiuta pagine non contigue', () => {
    const v = structuredClone(buono); v.indice.pagine[1].pagina = 5;
    expect(() => validaIndice(v)).toThrow(PianoNonValidoError);
  });
  it('rifiuta titolo non nullo fuori da giorni_tipo', () => {
    const v = structuredClone(buono); v.indice.pagine[0].contenuto[0].titolo = 'Piano 1';
    expect(() => validaIndice(v)).toThrow(/titolo/);
  });
  it('esige titolo in giorni_tipo', () => {
    const v = structuredClone(buono); v.indice.archetipo = 'giorni_tipo';
    expect(() => validaIndice(v)).toThrow(/titolo/);
  });
  it('rifiuta giorno fuori da 0..6 negli archetipi settimanali', () => {
    const v = structuredClone(buono); v.indice.pagine[0].contenuto[0].giorno = 7;
    expect(() => validaIndice(v)).toThrow(/giorno/);
  });
});
```

- [x] **Step 2: Implementare `indice.ts`** con i tipi di spec §2.1 e `validaIndice` che lancia `PianoNonValidoError` con messaggi `indice.pagine: non contigue`, `indice.pagine[k].contenuto[i].titolo: ...`, `...giorno: fuori intervallo`.
- [x] **Step 3: Suite verde, commit** `feat(import): indice di estrazione — tipi e validatore`.

### Task 2: `validaPianoParziale`

**Files:**
- Modify: `src/domain/import/valida.ts`
- Test: `src/domain/import/__tests__/valida.test.ts` (aggiunte in coda)

**Interfaces:**
- Produces: `validaPianoParziale(v: unknown): PianoEstratto` — stessa forma e stesse normalizzazioni legacy di `validaPiano`, senza le regole d'insieme (contiguità settimane, un solo giorno per `giornata_unica`, ecc.).

- [x] **Step 1: Test che falliscono**: una pagina con la sola settimana 2 passa `validaPianoParziale` e fallisce `validaEsito`; una riga senza `testoOriginale` fallisce entrambe; `quantitaInferita` assente si normalizza a `false`.
- [x] **Step 2: Implementare** estraendo da `validaPiano` la parte di forma in una funzione interna condivisa; `validaPiano` = forma + regole d'insieme.
- [x] **Step 3: Suite verde, commit** `feat(import): validaPianoParziale — la forma senza le regole d'insieme`.

### Task 3: Fusione delle pagine

**Files:**
- Create: `src/domain/import/fusione.ts`
- Test: `src/domain/import/__tests__/fusione.test.ts`

**Interfaces:**
- Consumes: `IndiceEstrazione`, `PianoEstratto`, `normalizza` da `mapping.ts`.
- Produces: `fondiPagine(indice, pagine: { pagina: number; piano: PianoEstratto }[]): PianoEstratto` (spec §2.3).

- [x] **Step 1: Test che falliscono** (costruire i piani parziali a partire da `PIANO_MENU_SETTIMANALE` in `fixtures.ts`, spezzandolo per giorni):

```ts
it('due pagine con giorni diversi si accodano in ordine di giorno', ...)
it('stesso giorno su due pagine: i pasti si accodano', ...)
it('continuaDallaPrecedente + stesso nome pasto: i piatti si concatenano in un pasto solo', ...)
it('continuaDallaPrecedente ma nome diverso: due pasti', ...)
it('archetipo e fonte dall\'indice; pagina che contraddice → nota', ...)
it('titolo: primo non nullo vince, secondo diverso → nota', ...)
it('note prefissate con "pagina k:"', ...)
it('settimane e giorni ordinati anche se le pagine arrivano in disordine', ...)
it('il risultato della dieta spezzata e rifusa passa validaEsito ed è deep-equal all\'originale', ...)
```

- [x] **Step 2: Implementare** come da spec §2.3, senza mutare gli input.
- [x] **Step 3: Suite verde, commit** `feat(import): fondiPagine — la fusione deterministica delle pagine`.

---

## Lotto 2 — server

### Task 4: `import-ai.ts`: indice, pagina, orchestratore, usage, cache

**Files:**
- Modify: `src/server/import-ai.ts`
- Test: `src/server/__tests__/import-ai.test.ts` (nuovo o aggiunte)

**Interfaces:**
- Produces:
  ```ts
  export interface UsoEstrazione { chiamate: number; inputTokens: number; outputTokens: number; cacheLetti: number; cacheScritti: number; durataMs: number }
  export interface EstrazioneConUso { grezzo: unknown; uso: UsoEstrazione }
  export async function estraiIndice(files: FileEstrazione[], modello: string): Promise<EstrazioneConUso>
  export async function estraiPagina(files: FileEstrazione[], pagina: PaginaIndice, indice: IndiceEstrazione, modello: string): Promise<EstrazioneConUso>
  export async function estraiPianoAPagine(files: FileEstrazione[], modello: string, opzioni?: { concorrenza?: number }): Promise<EstrazioneConUso>
  export function concorrenzaImportConfigurata(): number  // IMPORT_CONCORRENZA, default 4
  export function effortImportConfigurato(): 'low' | 'medium' | 'high' | undefined  // IMPORT_AI_EFFORT, default assente
  ```
  `estraiPianoAPagine`: 1 file → `estraiPiano` avvolto con `uso`; N file → indice (se `rifiuto` ritorna subito) → pagine con `contenuto` non vuoto in parallelo con concorrenza limitata → `validaPianoParziale` su ognuna → `fondiPagine` → ritorna il piano fuso come `grezzo` (la route lo passa a `validaEsito` come oggi). Una pagina fallita dopo i retry → l'errore propaga.
- Consumes: `clientAnthropic` (mockato nei test), `validaIndice`, `validaPianoParziale`, `fondiPagine`.

- [x] **Step 1: Test che falliscono** con un finto client (`vi.mock('@/server/anthropic')`) il cui `beta.messages.stream(...).finalMessage()` risponde per turno con contenuti preparati e `usage` finti:
  - i blocchi della richiesta sono `system → N pagine → testo`, con `cache_control` SOLO sull'ultimo blocco pagina, identico fra indice e pagine;
  - l'indice usa `max_tokens` 4000 e lo schema dell'indice; le pagine usano lo schema della v1;
  - con concorrenza 2 e 5 pagine, non più di 2 chiamate sono in volo insieme (contatore nel mock);
  - le pagine con `contenuto: []` non generano chiamate;
  - rifiuto dall'indice → nessuna chiamata di pagina, `grezzo` è il rifiuto;
  - una pagina che lancia → `estraiPianoAPagine` lancia (nessun piano parziale);
  - `uso` somma token e chiamate; `cacheLetti` prende `cache_read_input_tokens`;
  - 1 file → una sola chiamata, schema v1.
- [x] **Step 2: Implementare.** Prompt dell'indice (nuova costante): stesse regole anti-invenzione, output = solo l'indice, "una pagina senza pasti va dichiarata con contenuto vuoto". Prompt di pagina = `PROMPT_SISTEMA_IMPORT` invariato + istruzione utente che nomina la pagina k, l'archetipo e le voci attese. Helper interno `limitaConcorrenza(n, tasks)`. Se `IMPORT_AI_EFFORT` è impostata, `output_config.effort` su tutte le chiamate (utile con Opus: `low`). `maxRetries: 4` via `client.withOptions` (o opzione equivalente dell'SDK: verificare nel `node_modules/@anthropic-ai/sdk`) sulle chiamate di pagina.
- [x] **Step 3: Suite verde, commit** `feat(import-ai): estrazione a pagine — indice, pagine in parallelo con cache, fusione, usage`.

### Task 5: Divisione del PDF

**Files:**
- Add dependency: `pdf-lib@^1.17.1` (`npm install pdf-lib`)
- Create: `src/server/pdf-pagine.ts`
- Test: `src/server/__tests__/pdf-pagine.test.ts`

**Interfaces:**
- Produces: `dividiPdf(base64: string): Promise<string[]>` (una stringa base64 per pagina; 1 pagina → array di 1); `PdfIllegibileError`.

- [x] **Step 1: Test che falliscono**: un PDF a 3 pagine generato nel test con `PDFDocument.create()` → 3 base64 ciascuno con `getPageCount() === 1`; un PDF a 1 pagina → 1; byte casuali → `PdfIllegibileError`.
- [x] **Step 2: Implementare** con `PDFDocument.load` (`ignoreEncryption: false`), `copyPages` in un nuovo documento per pagina, `saveAsBase64()`.
- [x] **Step 3: Suite verde, commit** `feat(import): dividiPdf — un documento per pagina con pdf-lib`.

---

## Lotto 3 — dati e route

### Task 6: `import_uso`: migrazione e modulo dati

**Files:**
- Create: `supabase/migrations/0010_import_uso.sql`
- Create: `src/data/import-uso.ts`
- Test: `src/data/__tests__/import-uso.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function limiteImport30ggConfigurato(): number  // IMPORT_LIMITE_30GG, default 3
  export async function contaImportRecenti(sb: SupabaseClient, userId: string, adesso: Date): Promise<{ conteggio: number; piuVecchio: Date | null }>
  export async function registraImport(sb: SupabaseClient, userId: string, pagine: number, modello: string): Promise<void>
  ```
  Il client `sb` è quello costruito nella route con il JWT dell'utente negli header (`global.headers.Authorization`), così la RLS vale: la route NON usa una service key.

- [x] **Step 1: Migrazione**

```sql
-- Tetto di import per utente (spec 2026-09-05-import-in-produzione-design.md §3).
-- Solo metadati: mai contenuto della dieta. Nessuna policy di update/delete:
-- il contatore non si azzera dal client.
create table import_uso (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  avviato_il timestamptz not null default now(),
  pagine int not null check (pagine between 1 and 12),
  modello text not null
);
create index import_uso_utente_data on import_uso (user_id, avviato_il desc);
do $$
begin
  execute 'alter table import_uso enable row level security';
  execute 'alter table import_uso force row level security';
  execute 'create policy import_uso_leggi on import_uso for select to authenticated using (auth.uid() = user_id)';
  execute 'create policy import_uso_scrivi on import_uso for insert to authenticated with check (auth.uid() = user_id)';
end $$;
```

- [x] **Step 2: Test che falliscono** con un mock del client Supabase (stile `src/data/__tests__/importa.test.ts`): `contaImportRecenti` filtra `avviato_il >= adesso - 30 giorni` e restituisce conteggio e più vecchio; `registraImport` inserisce `user_id, pagine, modello`; `limiteImport30ggConfigurato` legge l'env a ogni chiamata, `0` e valori non numerici → `0` e `3`.
- [x] **Step 3: Implementare, suite verde, commit** `feat(data): import_uso — tetto di import per utente con RLS senza update/delete`.

### Task 7: Route: limite, PDF diviso, pipeline a pagine

**Files:**
- Modify: `src/app/api/import/estrai/route.ts`
- Modify: `src/app/api/import/estrai/__tests__/route.test.ts`

**Interfaces:**
- Consumes: Task 4, 5, 6.
- Ordine nella route: auth → parsing → cap → **limite** (se `limite > 0`: `contaImportRecenti`; `conteggio >= limite` → 429 col messaggio della spec, data = `piuVecchio + 30 giorni` in `it-IT` `gg/mm/aaaa`) → `registraImport` → rami chiave/mock/503 → per la chiave: PDF → `dividiPdf` (errore → 400) → `FileEstrazione[]` → `estraiPianoAPagine(files, modello, { concorrenza })` → `validaEsito` come oggi.
- Mock e 503 NON consumano slot né registrano: `registraImport` sta dentro il ramo chiave, prima della chiamata.

- [x] **Step 1: Test che falliscono** (mock di `estraiPianoAPagine`, `dividiPdf`, `contaImportRecenti`, `registraImport`):
  - sotto il limite: `registraImport` chiamato una volta con `pagine` = numero di immagini, poi `estraiPianoAPagine`;
  - al limite: 429, messaggio con la data giusta, nessuna registrazione né chiamata;
  - `IMPORT_LIMITE_30GG=0`: nessun conteggio;
  - PDF a 3 pagine: `dividiPdf` → 3 `FileEstrazione` tipo `pdf`; `PdfIllegibileError` → 400 `richiesta non valida`;
  - ramo mock: né conteggio né registrazione;
  - i test esistenti restano verdi (aggiornare i mock da `estraiPiano` a `estraiPianoAPagine`).
- [x] **Step 2: Implementare.**
- [x] **Step 3: Pagina Importa**: 429 → messaggio della route verbatim (stesso ramo del 413); test in `src/app/(app)/importa/__tests__/page.test.tsx`.
- [x] **Step 4: Suite verde, commit** `feat(import): route con tetto per utente, PDF diviso e pipeline a pagine`.

---

## Lotto 4 — eval e documentazione

### Task 8: Eval con manifest, pipeline, set e report

**Files:**
- Modify: `scripts/eval-import.eval.ts`
- Create: `scripts/eval-import-report.ts` (formattazione della tabella e stima costi, pura, testabile)
- Test: `scripts/__tests__/eval-import-report.test.ts` (nuovo; aggiungere `scripts/__tests__` all'`include` di `vitest.config.ts` se non c'è)

**Interfaces:**
- Manifest opzionale `diete/eval-manifest.json`:
  ```json
  [{ "nome": "dieta6", "foto": "Dieta 6", "fotoCompresse": "Dieta 6 compresse", "pdf": null, "groundTruth": "estrazioni/piani/dieta6.json" }]
  ```
  Percorsi relativi a `diete/`. Senza manifest → il caso di oggi (dieta 6, `EVAL_IMPORT_DIR_FOTO`).
- Env: `EVAL_IMPORT_MODELLI` (invariata), `EVAL_IMPORT_PIPELINE` = `pagine` (default) | `singola` | `entrambe`, `EVAL_IMPORT_SET` = `originali` | `compresse` | `entrambi` (default `entrambi` se il manifest ha le compresse).
- Report: `formattaReport(casi: CasoEval[]): string` → markdown con una tabella per dieta × set; colonne: modello, pipeline, durata s, settimane, abbinati (n/N e %), estranei, esatte (n/N), inferite, fabbricate, token in, token out, cache letti, costo stimato €. Prezzi in una costante `PREZZI_EUR_PER_MILIONE` con data nel commento. Scritto in `diete/estrazioni/report-<aaaammgg-hhmm>.md`.
- Gate invariati: `validaEsito`, `fabbricate === 0`, fallimento se tutte le chiamate falliscono.

- [x] **Step 1: Test che falliscono** su `formattaReport` e sulla stima costi (nessuna rete, casi finti): la tabella ha una riga per caso, la percentuale è arrotondata a intero, il costo con due decimali, nessun campo testuale della dieta compare.
- [x] **Step 2: Implementare** l'harness: caricamento manifest o default, prodotto cartesiano modelli × pipeline × set, `estraiPianoAPagine` o `estraiPiano` secondo la pipeline, metriche come oggi + `uso`, report su console e su file.
- [x] **Step 3: Suite verde (`npm test` non esegue l'eval), `npm run eval:import` senza chiave stampa NON ESEGUITO ed esce 0, commit** `feat(eval-import): manifest, pipeline e set a confronto, report con costi`.

### Task 9: README e stato reale

**Files:**
- Modify: `README.md` (sezione "Importa la dieta": il paragrafo "Stato: l'estrazione è mockata" e la tabella `IMPORT_MOCK`; nuova sottosezione "Estrazione a pagine" e "Tetto di import"; sezione eval)

- [x] **Step 1:** Riscrivere il paragrafo: l'estrattore è in codice (`src/server/import-ai.ts`), si accende con `ANTHROPIC_API_KEY`, il modello con `IMPORT_AI_MODEL`, il tetto con `IMPORT_LIMITE_30GG`, la concorrenza con `IMPORT_CONCORRENZA`; il mock resta solo per lo sviluppo. Rimandare alla spec 05/09 per la pipeline.
- [x] **Step 2: Commit** `docs(readme): stato reale dell'import — estrattore vero, chiave, tetto, eval`.

---

## Checklist locale per Andrea (dopo il merge, non automatizzabile da remoto)

- [ ] Applicare `0010_import_uso.sql` sul progetto Supabase.
- [ ] Spend limit mensile sul workspace Anthropic dal pannello.
- [ ] Creare `diete/eval-manifest.json` e la cartella delle foto compresse (salvate dall'app o prodotte con la stessa funzione della Camera).
- [ ] `EVAL_IMPORT_MODELLI=claude-sonnet-5,claude-opus-5 EVAL_IMPORT_PIPELINE=entrambe npm run eval:import`; leggere `diete/estrazioni/report-*.md`.
- [ ] Decidere il modello con la regola della spec §4; se Opus, `IMPORT_AI_MODEL=claude-opus-5` e effort `low` (Task 4 legge `IMPORT_AI_EFFORT`, default assente = nessun `output_config.effort`).
- [ ] Su Vercel: `ANTHROPIC_API_KEY`, e le altre env solo se diverse dai default. Redeploy.
- [ ] Import della dieta 6 dal telefono in produzione, cronometro: sotto i 150 s è il criterio di successo della spec.
- [ ] Con un secondo account, quattro import di fila: il quarto deve dare il 429 con la data.
