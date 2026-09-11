# Lettura offline della lista (P7) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Senza rete la Lista mostra l'ultima lista aperta, con la coda delle spunte sopra e una riga che dice che è una copia; con la rete torna fresca.

**Architecture:** Un modulo `src/offline/lista-cache.ts` (localStorage, come `coda.ts`) e la Lista che salva al successo, cancella quando la lista non c'è, ripiega nel `catch`. `casa.ts` cancella l'istantanea quando si cambia casa. Nessun cambio al service worker.

**Spec:** `docs/superpowers/specs/2026-09-06-lista-offline-design.md`

## Global Constraints
- L'istantanea contiene la lista come letta dal server, mai con la coda applicata.
- Copy esatti della spec §1. Codice, commenti e test in italiano.
- Suite verde a ogni commit: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`. I subagent non committano.

## Task 1: `src/offline/lista-cache.ts` e la Lista
- Create: `src/offline/lista-cache.ts`, `src/offline/__tests__/lista-cache.test.ts`
- Modify: `src/app/(app)/lista/page.tsx`, `src/app/(app)/lista/__tests__/page.test.tsx`, `src/data/casa.ts`, `src/data/__tests__/casa.test.ts`
- [x] Test del modulo (spec §4), poi il modulo.
- [x] Test della Lista (spec §4), poi la pagina (spec §3).
- [x] `entraInCasa`/`esciDallaCasa` chiamano `cancellaIstantaneaLista()` (test).
- [x] Commit `feat(offline): la Lista si legge senza rete dall'ultima istantanea`.

## Task 2: Documentazione
- [x] README: la sezione "Limite noto: la lista non è ancora leggibile offline" diventa "La lista offline" (cosa si vede, i limiti §5); "Cosa resta non provato" aggiornato; conteggio test. Backlog: P7 consegnato, P8 prossimo. `docs/2026-09-06-ripresa.md`.
- [x] Commit `docs: lista offline consegnata`.

## Checklist locale per Andrea
- [ ] Aprire la Lista con rete, mettere il telefono in aereo, riaprire l'app: la lista c'è con la riga "Sei offline"; spuntare due voci; togliere l'aereo: le spunte arrivano e la riga sparisce.
