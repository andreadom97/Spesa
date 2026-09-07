# Scan del codice a barre → formato confezione reale (P8) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prima di chiudere la spesa, scansionare (o digitare) il codice a barre di un prodotto comprato e far diventare il formato confezione quello vero, per questa settimana e per le prossime.

**Architecture:** Dominio puro per validare l'EAN e leggere la quantità di Open Food Facts; una route server che interroga OFF; una colonna `ean`; un data layer che aggiorna ingrediente e righe della settimana; un componente Scanner (BarcodeDetector con fallback al campo) e una schermata `/lista/confezioni` raggiunta da "Hai preso tutto".

**Spec:** `docs/superpowers/specs/2026-09-07-scan-confezione-design.md`

## Global Constraints
- OFF non è raggiungibile dal container di sviluppo: la route si testa con `fetch` finto.
- Nessun log del codice a barre; nome e marca tagliati a 80 caratteri.
- Copy esatti della spec §1. Codice, commenti e test in italiano. Suite verde a ogni commit. I subagent non committano.

## Lotto 1 (in parallelo)
### Task 1: `src/domain/ean.ts` (+ test)
- [ ] `eanValido`, `analizzaQuantitaOFF`, `formatoProposto` (spec §4, §6).
### Task 2: migrazione 0013, `Ingredient.ean`, `src/data/confezioni.ts` (+ test), mapper
- [ ] Colonna, tipo, `aIngrediente`, `salvaIngrediente` (scrive `ean`), letture/scrittura (spec §4).

## Lotto 2 (in parallelo, dopo il Lotto 1)
### Task 3: route `src/app/api/prodotto/[ean]/route.ts` (+ test)
- [ ] Spec §2.
### Task 4: `src/components/Scanner.tsx`, `src/app/(app)/lista/confezioni/page.tsx`, link in `lista/fatta` (+ test)
- [ ] Spec §1, §3.

## Lotto 3
### Task 5: documentazione
- [ ] README (sezione "Il formato vero", migrazione 0013 nel deploy), backlog (P8 consegnato, P9 prossimo), `docs/2026-09-06-ripresa.md`.

## Checklist locale per Andrea
- [ ] Applicare `0013_ean.sql`.
- [ ] Con la lista tutta spuntata: "CONFEZIONI DIVERSE? SCANSIONA", scansionare un pacco di pasta, vedere la proposta, AGGIORNA, chiudere la spesa e controllare il residuo in Dispensa.
- [ ] Un prodotto non in OFF: scrivere il formato a mano.
