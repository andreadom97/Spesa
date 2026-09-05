# Contatore "non hai ricomprato" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Far vedere ogni settimana quante confezioni l'utente non ha ricomprato grazie al residuo derivato, quanto pesano e quanto valgono in euro se c'è un prezzo, senza chiedere nulla all'utente: il conteggio si fissa alla generazione della lista, si legge in "Hai preso tutto" e si somma in Dispensa sulle settimane chiuse.

**Architecture:** Il dominio prima (`evitato` in `costruisciLista` e il riassunto puro in `risparmio.ts`), in parallelo il prezzo per confezione (colonna, tipo, mapper, salvataggio, import). Poi la persistenza (`risparmio_settimana` scritta da `generaListe`, letture in `src/data/risparmio.ts`) e i due campi prezzo in UI. Infine le due righe di UI e la documentazione. Ogni task chiude con suite verde e un commit.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase, Vitest 4 + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-05-non-ricomprato-design.md`

## Global Constraints

- Zero cambi di comportamento a `base` e `topup` di `costruisciLista`: i test esistenti di `list-builder` devono restare verdi; se confrontano l'intero `ListaRisultato` con `toEqual`, si aggiornano aggiungendo `evitato`, mai allentando le asserzioni.
- Il conteggio usa `confezioniNecessarie` per entrambe le baseline: nessuna seconda aritmetica delle confezioni.
- Formattazione italiana: virgola decimale, spazio prima dell'unità, `kg`/`l` da 1000 in su con una cifra decimale, euro interi, "meno di 1 €" sotto l'unità. Copy esatti dalla spec §5.
- RLS su `risparmio_settimana` come le altre tabelle (`for all` per il proprietario, `enable` + `force`). `prezzo_confezione` nullable con `check (> 0)`.
- Codice, commenti e test in italiano, stile del file toccato (inline style nelle pagine, pattern dei test vicini). Suite verde a ogni commit: `npm test && npx tsc --noEmit && npm run build && npm run lint` (tsc ha un errore preesistente su `LayoutProps` in `layout.tsx`: si ignora).
- Nessuna modifica a `chiudiSpesa`, `allineaTopUp`, `planner`, `chiusura`.

---

## Lotto 1 — dominio e prezzo (in parallelo)

### Task 1: `evitato` in list-builder e `risparmio.ts`

**Files:**
- Modify: `src/domain/list-builder.ts`
- Create: `src/domain/risparmio.ts`
- Test: `src/domain/__tests__/list-builder.test.ts` (aggiunte), `src/domain/__tests__/risparmio.test.ts` (nuovo)

**Interfaces:**
- Produces: `VoceEvitata`, `ListaRisultato.evitato`, `riassumiEvitato`, `RiassuntoEvitato`, `formattaQuantita`, `formattaEuro` (spec §2).
- Consumes: `confezioniNecessarie`, `residuoUtilizzabile`, `Ingredient.prezzoConfezione` (Task 2: finché non c'è, leggerlo come `(ing as { prezzoConfezione?: number | null }).prezzoConfezione ?? null` NON è ammesso; coordinarsi: Task 2 aggiunge il campo al tipo, Task 1 lo usa. Se Task 2 non è ancora committato, aggiungere il campo al tipo `Ingredient` qui con lo stesso nome e tipo, e i due diff si fonderanno senza conflitto).

- [ ] **Step 1: Test che falliscono** (list-builder): con residuo che copre tutto il fabbisogno di un ingrediente, `evitato` ha quella voce con `confezioniReali 0`, `confezioniIngenue` = ceil(fabbisogno/formato), `confezioniEvitate` uguale, `quantitaEvitata` = evitate × formato; con residuo parziale, evitate = ingenue − reali; classe `intero`: quantità in pezzi (formato effettivo 1); classe `stima` esclusa; residuo scaduto (deperibile vecchio) → evitate 0; ordine per nome; `prezzoConfezione` copiato dall'ingrediente (null se assente); `base`/`topup` invariati (asserzione su un caso esistente).
- [ ] **Step 2: Test che falliscono** (risparmio): `riassumiEvitato` somma confezioni, quantità per unità, euro solo dove c'è prezzo (null se nessuno), conta ingredienti evitati e con prezzo; `formattaQuantita({g: 1400, ml: 0, pz: 2})` → `1,4 kg · 2 pz`, `{g: 350}` → `350 g`, `{ml: 1000}` → `1,0 l`, tutto zero → `""`; `formattaEuro(11.4)` → `circa 11 €`, `(0.6)` → `meno di 1 €`.
- [ ] **Step 3: Implementare** nello stesso ciclo delle voci in `costruisciLista` (prima del `continue` su confezioni 0), e `risparmio.ts` puro.
- [ ] **Step 4: Suite verde, commit** `feat(domain): evitato in costruisciLista e riassunto del non ricomprato`.

### Task 2: Prezzo per confezione: colonna, tipo, mapper, salvataggio, import

**Files:**
- Create: `supabase/migrations/0011_prezzo_e_risparmio.sql` (SQL della spec §3, con blocco RLS nello stile di `0009_meal_prepping.sql`)
- Modify: `src/domain/types.ts` (`Ingredient.prezzoConfezione: number | null`), `src/data/mappers.ts`, `src/data/repertorio.ts` (`salvaIngrediente`), `src/domain/import/types.ts` (`IngredienteProposto.prezzoConfezione: number | null`), `src/domain/import/valida.ts` (`validaStatoRevisione`: legacy → `null`), `src/domain/import/commit.ts` (passa il prezzo a `salvaIngrediente`), e ogni fixture/test che costruisce un `Ingredient` o un `IngredienteProposto` letterale (aggiungere il campo, `null`)
- Test: aggiunte in `src/data/__tests__/mappers.test.ts`, `src/domain/import/__tests__/valida.test.ts`, `src/domain/import/__tests__/commit.test.ts` (o dove vive il test del commit)

- [ ] **Step 1: Test che falliscono**: `aIngrediente` legge `prezzo_confezione` (numero, o `null` se assente/null); `salvaIngrediente` scrive `prezzo_confezione`; `validaStatoRevisione` normalizza un `ingredientiNuovi` legacy senza prezzo a `null` e rifiuta un prezzo ≤ 0; il commit passa il prezzo all'ingrediente creato.
- [ ] **Step 2: Implementare** e sistemare i letterali con `npx tsc --noEmit` come guida.
- [ ] **Step 3: Suite verde, commit** `feat(data): prezzo per confezione sull'ingrediente, dal DB all'import`.

---

## Lotto 2 — persistenza e campi prezzo (in parallelo, dopo il Lotto 1)

### Task 3: `risparmio_settimana` scritta da `generaListe`, letture

**Files:**
- Modify: `src/data/lista.ts` (`generaListe`)
- Create: `src/data/risparmio.ts`
- Test: `src/data/__tests__/lista.generaListe.test.ts` (aggiunte), `src/data/__tests__/risparmio.test.ts` (nuovo)

**Interfaces:**
- Produces: `leggiRisparmioSettimana(weekId): Promise<VoceEvitata[]>`, `leggiRisparmioTotale(): Promise<VoceEvitata[]>` (solo settimane `chiusa`, join `week!inner(stato)` con `.eq('week.stato', 'chiusa')`, stile della query degli storni in `chiudiSpesa`).
- `generaListe`: dopo le due liste, `delete` da `risparmio_settimana` per `week_id`, poi `insert` delle righe di `risultato.evitato` (colonne della spec §3, `prezzo_confezione` = `prezzoConfezione`), solo se ce ne sono.

- [ ] **Step 1: Test che falliscono** con il mock del client (pattern di `lista.generaListe.test.ts`): le righe scritte corrispondono a `evitato`; settimana chiusa → nessuna scrittura; `leggiRisparmioSettimana` mappa le colonne a `VoceEvitata`; `leggiRisparmioTotale` filtra su stato chiusa.
- [ ] **Step 2: Implementare, suite verde, commit** `feat(data): risparmio_settimana — il non ricomprato fissato alla generazione`.

### Task 4: Campo prezzo nell'editor ingrediente e nel passo formati dell'import

**Files:**
- Modify: `src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx`, `src/app/(app)/importa/Formati.tsx`
- Test: i test vicini (`.../[ingId]/__tests__/page.test.tsx`, `importa/__tests__/formati.test.tsx`)

- [ ] **Step 1: Test che falliscono**: l'editor mostra "Prezzo di una confezione" con il valore esistente, salva `null` se vuoto e il numero se compilato, blocca il salvataggio con un prezzo ≤ 0 o non numerico; il passo formati mostra la colonna facoltativa e la propaga in `ingredientiNuovi`.
- [ ] **Step 2: Implementare** con lo stile dei campi esistenti (il formato è il modello). Copy: etichetta `PREZZO DI UNA CONFEZIONE`, aiuto `Facoltativo, in euro: serve solo a contare quanto non ricompri`.
- [ ] **Step 3: Suite verde, commit** `feat(ui): prezzo per confezione nell'editor ingrediente e nell'import`.

---

## Lotto 3 — le due righe

### Task 5: Lista fatta e Dispensa

**Files:**
- Modify: `src/app/(app)/lista/fatta/page.tsx`, `src/app/(app)/dispensa/page.tsx`
- Test: `src/app/(app)/lista/__tests__/page.test.tsx` o il test della pagina fatta se esiste (altrimenti nuovo `lista/fatta/__tests__/page.test.tsx`), `src/app/(app)/dispensa/__tests__/page.test.tsx` (aggiunte)

- [ ] **Step 1: Test che falliscono** (mock di `leggiRisparmioSettimana` / `leggiRisparmioTotale`): la scheda `NON RICOMPRATO QUESTA SETTIMANA` con i tre copy della spec §5 (evitate > 0 con e senza prezzi, evitate = 0, nessuna riga → scheda assente); la Dispensa mostra la riga del totale solo con confezioni > 0, con il copy esatto.
- [ ] **Step 2: Implementare** riusando `riassumiEvitato`, `formattaQuantita`, `formattaEuro`; stile della scheda "CHIUDENDO LA SPESA" per la Lista fatta; in Dispensa una riga di testo sotto la testata, prima dell'inventario, con lo stile della riga di spiegazione esistente.
- [ ] **Step 3: Suite verde, `npm run build`, commit** `feat(ui): il non ricomprato in Hai preso tutto e il totale in Dispensa`.

---

## Lotto 4 — documentazione

### Task 6: README, backlog, stato della spec

- [ ] README: sottosezione "Quanto non hai ricomprato" nella parte prodotto (definizione in due frasi, dove si vede, dove si mette il prezzo, i limiti dichiarati), riga in "Dove sta cosa" per la spec, nota sulla migrazione 0011 nel deploy.
- [ ] `spesa-backlog-nicchia.md`: P2 spostato in "Cosa è già stato fatto" con l'evidenza; P3 diventa la prossima priorità.
- [ ] Spec: stato aggiornato. Commit `docs: contatore non ricomprato consegnato`.

## Checklist locale per Andrea

- [ ] Applicare `0011_prezzo_e_risparmio.sql` sul progetto Supabase (prima del deploy: `generaListe` scrive nella tabella nuova).
- [ ] Mettere un prezzo a una decina di ingredienti ricorrenti (riso, olio, pasta, legumi) dall'editor.
- [ ] Alla prossima generazione della lista, controllare "Hai preso tutto"; dopo la chiusura, la riga in Dispensa.
