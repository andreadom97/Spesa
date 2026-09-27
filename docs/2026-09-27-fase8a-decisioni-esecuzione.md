# Fase 8a del ridisegno: le decisioni prese durante l'esecuzione

**Data:** 27/09/2026 · **Ramo:** `fase8a-importa-stati` · **Piano:**
`docs/superpowers/plans/2026-09-27-importa-8a.md` · **Spec:**
`docs/superpowers/specs/2026-09-27-importa-8a-design.md`

L'esecuzione subagent-driven tiene il suo registro in `.superpowers/`, una cartella che git ignora e
che alla fine viene cancellata. Questo file la sostituisce. Raccoglie:
- le decisioni di Andrea, prese prima dell'esecuzione;
- come sono stati eseguiti i task;
- le misure fatte nel browser;
- ciò che resta aperto;
- le prove da fare dal telefono.

Etichette: `[misurato]` per ciò che è stato misurato, `[ipotesi]` per ciò che non lo è.

## Le decisioni di Andrea (27/09)

1. **La fase 8 si divide.** L'8a porta nel sistema ripresa, attesa, rifiuto, errore e riepilogo con
   i pezzi che esistono: lo Stato vuoto (§8) con l'azione nel Dock, il Dialogo di conferma. L'8b,
   Revisione e Formati, aspetta un giro in Claude Design.
2. **Il riepilogo chiede conferma solo se disattiva qualcosa.** Senza piatti del nutrizionista da
   disattivare il Dock dice `CREA IL PIANO` e scrive subito; altrimenti `SOSTITUISCI IL PIANO` e il
   Dialogo di conferma rosso. Il conto è una scheda con una riga per voce.
3. **L'attesa dell'estrazione usa `.anim-luce-testo`** (§7) sul titolo dello Stato vuoto, con la nota
   «Resta su questa pagina: se la lasci, la lettura si perde.»
4. **Nel rifiuto l'azione è `PROVA UN ALTRO FILE`**: alle Impostazioni riporta la pillola.

## Come è stato eseguito

- **Task 1** (`238cc42`): `StatoImporta.tsx`, lo Stato vuoto locale di Importa.
- **Task 2** (`12bb6c0`): ripresa, attesa, rifiuto ed errore in `StatoImporta` con l'azione nel Dock;
  dialogo di Ricominciare con `useIndietroFogli`; l'ascoltatore popstate della fotocamera ora agisce
  solo a fotocamera aperta (prima scartava per 400 ms i tocchi dopo ogni popstate, anche quelli dei
  pannelli).
- **Task 3** (`53dc260`): `Riepilogo.tsx` con conto in righe, `CREA IL PIANO` / `SOSTITUISCI IL
  PIANO` + dialogo, errore sopra il Dock, `replace('/piano')`. Review di correttezza con un test
  differenziale vecchio/nuovo su 5 scenari: scritture, letture e protezione dai doppioni identiche;
  differenze solo quelle volute dalla spec [misurato dal revisore].
- **Ruling del controller**, da riportare a chi tocca i test del riepilogo: nei test del riepilogo si
  aspetta il conto prima di cercare il Dock (al primo calcolo il riepilogo non rende niente).
- **Task 4** (questo task): DESIGN.md §13, DESIGN-SYSTEM.md e questo registro. Nessun codice
  toccato.

## Misure

Da completare dopo la review finale — il Task 4 è solo documenti, nessuna misura nel browser.

## Rimasto aperto

- Da completare dopo la review finale.

## Prove dal telefono

Da fare dopo il merge, in produzione (spec §G):
1. **Attesa.** Importa un PDF: durante l'attesa il titolo luccica e c'è la nota «Resta su questa
   pagina».
2. **Ripresa e Ricominciare.** Con un import lasciato a metà, riapri Importa: `RIPRENDI` nel Dock;
   `RICOMINCIA` apre il dialogo, e l'indietro di Android lo chiude.
3. **Riepilogo che sostituisce.** Al riepilogo di un import che sostituisce un piano: la riga «da
   disattivare», `SOSTITUISCI IL PIANO`, il dialogo rosso. Dopo, l'indietro di Android dal Piano non
   torna al riepilogo.
4. **Rifiuto ed errore.** Un file che non è una dieta, o una dieta con sole macro: l'errore o il
   rifiuto, con la sua azione nel Dock.
