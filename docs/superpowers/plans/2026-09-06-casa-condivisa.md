# Casa condivisa (P6) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Due account sulla stessa casa: stesso piano, stessa lista, stessa dispensa, spunta da entrambi i telefoni. Invito con codice, uscita, rimozione.

**Architecture:** La casa è l'account del proprietario. Una funzione SQL `casa_id()` risolve l'account effettivo e tutte le policy RLS passano da lei; il data layer sostituisce `auth.getUser().id` con `idCasa()` (una RPC memorizzata). Cinque RPC `security definer` per invito, ingresso, uscita, rimozione e stato. Una sezione CASA in Impostazioni. La Lista rilegge al ritorno in primo piano.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (RLS, RPC), Vitest 4 + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-06-casa-condivisa-design.md`

## Global Constraints

- Nessuna funzione di `src/data/*.ts` cambia firma. Nessun cambio al dominio.
- La migrazione rigenera le policy di **tutte** le tabelle con `user_id` (ciclo su `information_schema`), non un elenco a mano.
- Copy esatti della spec §4. Codice, commenti e test in italiano.
- Suite verde a ogni commit: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`. I subagent non committano.
- La parte "per quante persone" (spec §6) NON si costruisce: decisione aperta.

---

## Lotto 1 (in parallelo)

### Task 1: Migrazione `supabase/migrations/0012_casa.sql`
- [ ] Tabelle `casa_membro`, `casa_invito` con RLS propria (spec §1).
- [ ] `casa_id()`; ciclo che elimina e ricrea le policy su ogni tabella `public` con colonna `user_id` (forma `for all` con `using`/`with check` su `casa_id()`; per `import_uso` select e insert separate, nessun update/delete, privilegi di colonna invariati).
- [ ] Le cinque funzioni RPC (spec §2) con `security definer`, `set search_path = public`, `grant execute to authenticated`, `revoke` da `anon`/`public`.
- [ ] Riletto due volte; commit `feat(db): casa condivisa — casa_id(), inviti e policy rigenerate`.

### Task 2: `src/data/casa.ts`
- [ ] Test: memoria di `idCasa`, `dimenticaIdCasa`, `statoCasa`, errori propagati.
- [ ] Implementare (spec §3). Commit `feat(data): casa.ts — idCasa memorizzata e le RPC della casa`.

## Lotto 2 (in parallelo, dopo il Lotto 1)

### Task 3: `idCasa()` nel data layer e nella route
- Modify: gli otto file di `src/data/`, `src/app/api/import/estrai/route.ts`, i loro test.
- [ ] Ogni `utente.user!.id` usato per `user_id` o per filtri → `await idCasa()`; `auth.getUser()` resta solo dove serve altro. Route: `sbUtente.rpc('casa_id')`.
- [ ] Test esistenti verdi con `vi.mock('../casa')`. Commit `refactor(data): user_id è la casa, non l'account`.

### Task 4: Impostazioni → CASA e Lista in primo piano
- Modify: `src/app/(app)/impostazioni/page.tsx`, `src/app/(app)/lista/page.tsx`, i loro test.
- [ ] Test: i tre stati, codice, ENTRA, errori, due tocchi, reload (mock di `window.location.assign`); Lista che rilegge su `visibilitychange`.
- [ ] Implementare (spec §4, §5). Commit `feat(ui): la casa in Impostazioni; la Lista si aggiorna al ritorno`.

## Lotto 3

### Task 5: Documentazione
- [ ] README (sezione "La casa condivisa", migrazione 0012 nel deploy, decisione aperta §6), backlog (P6 consegnato salvo "per quante persone"), `docs/2026-09-06-ripresa.md`. Commit `docs: casa condivisa consegnata`.

## Checklist locale per Andrea
- [ ] Applicare `0012_casa.sql` sul progetto Supabase **prima** del deploy: le policy vecchie vengono sostituite; senza la migrazione `idCasa()` fallisce (RPC assente) e l'app non carica.
- [ ] Con due account: creare il codice dal primo, entrare dal secondo, spuntare da entrambi, uscire.
- [ ] Decidere su "per quante persone" (spec §6).
