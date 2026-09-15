# Piano: rifare la lista a mano, uscire dall'account

**Spec:** `docs/superpowers/specs/2026-09-15-rigenera-lista-design.md`,
`docs/superpowers/specs/2026-09-15-esci-design.md`. Metodo: un subagent per task su
file disgiunti, TDD; i subagent non committano; l'orchestratore rivede, fa girare
`npx vitest run && npx tsc --noEmit && npm run lint && npm run build`, committa per task,
pusha; poi review di correttezza e sicurezza in sola lettura e un subagent di
correzione.

## Task 0 (fatto, orchestratore)
`BottoneDueTocchi` estratto in `src/components/BottoneDueTocchi.tsx`.

## Task A — Rifare la lista (file: `src/data/lista.ts` + test, `src/app/(app)/lista/page.tsx` + test)
1. `rigeneraListe(weekId)` in `src/data/lista.ts` con i tre guard e le righe manuali (spec §2), test in `src/data/__tests__/lista.test.ts`.
2. La pagina Lista tiene `stato` della settimana in `StatoCarico`; tasto `RIFAI LA LISTA` a due tocchi in fondo, solo a `confermata` e online; al tap: `svuotaCoda`, `rigeneraListe`, `cancellaIstantaneaLista`, `versioneTocchi++`, `carica()`; errore a riga. Test in `src/app/(app)/lista/__tests__/page.test.tsx`.

## Task B — Uscire dall'account (file: `src/data/sessione.ts` + test, `src/app/(app)/impostazioni/page.tsx` + test)
1. `src/data/sessione.ts`: `esciDallAccount`, `emailAccount` (spec §2), test.
2. Impostazioni: sezione `ACCOUNT` in fondo (spec §1) e la riga sotto le porzioni (spec §3). Test.

## Task C — Documenti (orchestratore)
README (sezioni "Rifare la lista" e "Uscire"), `spesa-backlog-nicchia.md` (i due punti spuntati), `docs/2026-09-06-ripresa.md`.

## Review
Correttezza e sicurezza in sola lettura su A e B, poi correzioni.
