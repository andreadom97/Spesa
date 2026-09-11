# Avviso di scadenza del fresco e conflitto alla sostituzione — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrare il residuo derivato durante la settimana: in Settimana il pasto che troverà un fresco già scaduto, in Dispensa il giorno di scadenza e il fresco che nessun pasto usa in tempo, in Scegli il piatto sostituto che lascia un pasto successivo senza un ingrediente. Nessuna migrazione, nessuna API.

**Architecture:** Due moduli puri di dominio (`scadenza.ts`, `conflitto.ts`) costruiti sulle funzioni esistenti (`residuoUtilizzabile`, `consumoSlot`, `righeEffettive`, `fattoreConsumo`), poi tre pagine che li leggono e mostrano righe di testo con copy esatti. Ogni task chiude con suite verde e un commit.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Vitest 4 + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-06-scadenza-fresco-design.md`

## Global Constraints

- Nessuna seconda aritmetica: scadenza da `GIORNI_FRESCO`/`GIORNI_CONGELATO` come `residuoUtilizzabile`, consumo da `consumoSlot`, righe da `righeEffettive`, filtro da `fattoreConsumo`.
- Nessun cambio di comportamento a `costruisciLista`, `planner`, `aggiornaSlot`, `allineaTopUp`, `residuoUtilizzabile`.
- Letture aggiunte alle pagine sempre tolleranti (`try/catch` → nessun avviso), come `leggiRisparmioSenzaBloccare` in Dispensa.
- Copy esatti della spec §3. Codice, commenti e test in italiano, stile del file toccato (inline style, pattern dei test vicini, mock dei moduli `@/data/*`).
- Suite verde a ogni commit: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`.
- I subagent non committano: l'orchestratore rivede, verifica e committa un task per volta.

---

## Lotto 1 — dominio (in parallelo)

### Task 1: `src/domain/scadenza.ts`

**Files:**
- Create: `src/domain/scadenza.ts`, `src/domain/__tests__/scadenza.test.ts`

**Interfaces:** `scadenzaResiduo`, `AvvisoScadenza`, `avvisiScadenza`, `etichettaScadenza` (spec §2).

- [x] **Step 1: Test che falliscono.** Proprietà `residuoUtilizzabile > 0 ⇔ oggi ≤ scadenza` su una griglia di giorni (soglia−1, soglia, soglia+1) per un'area fresca, congelato (90), surgelati (null), non deperibile (null), mai comprato (null), residuo 0 (null). `avvisiScadenza`: i casi della spec §5. `etichettaScadenza`: oggi, domani, giorno della settimana entro sei giorni (minuscolo, con accento: "martedì"), oltre "il 9 set".
- [x] **Step 2: Implementare.** Slot con `OpzioneMancanteError` saltato. Ordine per scadenza poi nome (`localeCompare('it')`).
- [x] **Step 3: Suite verde.** Commit `feat(domain): scadenza del residuo e avvisi della settimana`.

### Task 2: `src/domain/conflitto.ts`

**Files:**
- Create: `src/domain/conflitto.ts`, `src/domain/__tests__/conflitto.test.ts`

**Interfaces:** `ConflittoResiduo`, `conflittiSostituzione` (spec §2, regole §1.3).

- [x] **Step 1: Test che falliscono.** Bozza → `[]`. Confermata, ingrediente in lista: residuo 100 g utilizzabile + 500 g in lista, fabbisogno dopo 750 g → mancante 150. Confermata, ingrediente non in lista → nessun conflitto anche se manca. Chiusa: residuo 50 g, piatto attuale consuma 200 g, candidato 400 g → mancante 150; `pastiDopo` con gli slot successivi (data ≥ oggi, non lo slot stesso) che lo usano, giorni passati esclusi. Residuo scaduto non conta. Classe `stima` esclusa. Stesso piatto con scelta di componente diversa.
- [x] **Step 2: Implementare** con `consumoSlot` (costruire lo slot "col candidato" come `{ ...slot, dishId: candidato.id, scelte }`).
- [x] **Step 3: Suite verde.** Commit `feat(domain): conflitto di residuo alla sostituzione di un piatto`.

---

## Lotto 2 — le tre schermate (in parallelo, dopo il Lotto 1)

### Task 3: Settimana e `RigaPasto`

**Files:**
- Modify: `src/components/RigaPasto.tsx` (prop `avvisi?: string[]`), `src/app/(app)/settimana/page.tsx`
- Test: `src/components/__tests__/riga-pasto.test.tsx` (aggiunte), `src/app/(app)/settimana/__tests__/page.test.tsx` (aggiunte: mock di `@/data/dispensa`)

- [x] **Step 1: Test che falliscono.** Con un residuo di pollo utilizzabile oggi che scade prima della cena di un giorno futuro della settimana, selezionando quel giorno la riga mostra `Pollo in casa: scade {etichetta}, prima di questo pasto`; oggi (pasto entro la scadenza) nessuna riga; vista precedente nessuna riga; `leggiDispensa` che fallisce → schermata normale senza avvisi.
- [x] **Step 2: Implementare.** `leggiDispensa` nel `Promise.all` dentro un helper tollerante; `avvisiScadenza` calcolata una volta per settimana; per la riga `(dataSelezionata, def.id)` le stringhe. Riga in `RigaPasto` solo a riga accesa, 12px, peso 600, `var(--ink-2)`.
- [x] **Step 3: Suite verde.** Commit `feat(ui): avviso di scadenza del fresco nella Settimana`.

### Task 4: Dispensa

**Files:**
- Modify: `src/app/(app)/dispensa/page.tsx`
- Test: `src/app/(app)/dispensa/__tests__/page.test.tsx` (aggiunte)

- [x] **Step 1: Test che falliscono.** Deperibile con scadenza futura → riga mono con `· SCADE IL 9 SET` (o `· SCADE OGGI`); non deperibile → niente; già decaduto → resta solo la riga esistente; con settimana corrente senza pasti che lo usano entro la scadenza (scadenza entro domenica) → `Nessun pasto in programma lo usa prima che scada.`; con un pasto entro → assente; scadenza oltre domenica → assente.
- [x] **Step 2: Implementare** riusando `dataBreve`, `scadenzaResiduo`, `avvisiScadenza` sui dati già caricati (`settimana?.slots`, `repertorio`, `ingredienti`, `dispensa`). `RigaDispensa` riceve le due informazioni come prop, non ricalcola.
- [x] **Step 3: Suite verde.** Commit `feat(ui): scadenza e fresco dimenticato in Dispensa`.

### Task 5: Scegli

**Files:**
- Modify: `src/app/(app)/settimana/[data]/[slotDefId]/scegli/page.tsx`
- Test: `src/app/(app)/settimana/[data]/[slotDefId]/scegli/__tests__/page.test.tsx` (aggiunte: mock di `@/data/lista` con `leggiListe`; aggiornare l'asserzione sulla nota)

- [x] **Step 1: Test che falliscono.** Settimana confermata, lista con yogurt 500 g, residuo 100 g, candidato che porta il fabbisogno a 750 g, cena di giovedì che usa lo yogurt → `Con questo piatto Yogurt non basta: ne mancano 150 g, e serve anche giovedì (Cena).`; bozza → nessuna riga; piatto originale selezionato → nessuna riga; `leggiListe` che fallisce → nessuna riga; nota nuova con `quello che manca entra nel top-up quando la riapri`.
- [x] **Step 2: Implementare**: `leggiListe(settimana.id)` tollerante, `vociLista` = tutte le voci di base e top-up; conflitti ricalcolati a ogni cambio di `scelto`/`scelteCorrenti`; etichette con `etichettaScadenza(data, oggi)` e nome del pasto da `slotDefs`; più di due pasti → `e altri N`.
- [x] **Step 3: Suite verde.** Commit `feat(ui): conflitto di residuo in Scegli e nota corretta`.

---

## Lotto 3 — documentazione

### Task 6: README, backlog, stato della spec

- [x] README: sottosezione "Il fresco che scade" (definizione della scadenza, le tre righe, i limiti dichiarati); riga in "Dove sta cosa"; "Cosa resta non provato" aggiornato se serve.
- [x] `spesa-backlog-nicchia.md`: P3 in "Cosa è già stato fatto", P4 diventa la prossima.
- [x] Spec: stato "approvata e implementata". Commit `docs: avviso di scadenza del fresco consegnato`.
