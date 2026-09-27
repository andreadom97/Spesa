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
   «Se chiudi l'app prima che abbia finito, la lettura si perde.» Il primo testo, «Resta su questa
   pagina: se la lasci, la lettura si perde.», era falso: lasciando la pagina la `fetch` non si
   annulla, la bozza si salva all'arrivo della risposta e si ritrova in «Hai un import in corso».
   Corretto dopo la review finale (ruling del controller, sotto).
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
- **Task 4** (`1f1987d`, `c6e90b1`): DESIGN.md §13, DESIGN-SYSTEM.md e questo registro. Nessun
  codice toccato.
- **Correzioni della review finale** (`7431a65`, `5e468de`, `ab55c57` e i documenti): un'ondata sola
  per I1–I3 e M1–M4.
  - I1: dopo un errore di `eseguiScritture` il Dock del riepilogo si riaccendeva per un commit con le
    scritture di prima; ora `setPronto(false)` nel `catch`. Il test del retry tiene in sospeso il
    ricalcolo e osserva `disabled` con un `MutationObserver`.
  - I2: lo scroller di `StatoImporta` centra con `justifyContent: 'safe center'`, come Fine spesa.
  - I3: il testo dell'attesa (decisione 3).
  - M1: `ricomincia` porta la vista a `caricamento` prima di cancellare la bozza: con la
    cancellazione in volo `RIPRENDI` non c'è più.
  - M2: due test col PDF: dopo un rifiuto `PROVA UN ALTRO FILE` toglie il file, dopo un errore
    `RIPROVA` lo tiene.

## Misure

- **Task 3, differenziale vecchio/nuovo** su 5 scenari (S1–S5): scritture, letture e protezione dai
  doppioni identiche; differenze solo quelle volute dalla spec (`replace`, `RIPROVA`, niente dialogo
  senza disattivazioni) [misurato dal revisore].
- **Review finale** (`64864fb..c6e90b1`):
  - I1: con una sonda jsdom e un `MutationObserver` sull'attributo `disabled`, dopo un errore di
    scrittura il tasto del Dock passa spento → acceso → spento [misurato dal revisore]. Dopo la
    correzione il nuovo test del retry non vede nessun cambio di `disabled` fra l'errore e la fine
    del ricalcolo; senza la correzione ne vede 2 [misurato].
  - I2: su una replica, con `justifyContent: 'center'` e testi lunghi su un telefono piccolo la cima
    della scheda esce sopra lo scroller e non si raggiunge scorrendo [misurato dal revisore su
    replica]. Nel browser vero, dopo `safe center`, non ancora riprovato [ipotesi].
  - I3: uscendo dalla pagina durante l'attesa la `fetch` non si annulla e `salvaBozzaImport` parte
    lo stesso [misurato dal revisore].
- **Suite intere** (`npx vitest run`; i 3 saltati sono i test della domenica):
  - Task 1: 152 file verdi + 1 saltato; 2315 test verdi, 3 saltati [misurato].
  - Task 2: 4 test rossi attesi in `riepilogo.test.tsx` (`RIPRENDI` nel Dock senza
    `SlotDockProvider`), chiusi dal Task 3 come da ruling [misurato].
  - Task 3: 152 file verdi + 1 saltato; 2319 test verdi, 3 saltati [misurato].
  - Correzioni finali: 152 file verdi + 1 saltato; 2323 test verdi, 3 saltati [misurato]. Al primo
    giro un test della Dispensa («ELIMINA dal dialogo (2 → 0) chiama go(-2) una volta», file non
    toccato) era fallito; da solo 3 volte su 3 verde, e verde al secondo giro della suite intera:
    instabile sotto carico [misurato], causa non indagata [ipotesi].
  - `npx tsc --noEmit`, `npx eslint "src/app/(app)/importa"` e `npm run -s design:token` (11/11)
    puliti a ogni task che li ha eseguiti e dopo le correzioni finali [misurato].

## Rimasto aperto

Minori rinviati durante i task e non toccati dall'ondata finale (ledger dell'esecuzione):
- `StatoImporta`: con `stato` e `children` insieme un tasto finirebbe dentro una regione
  `role="status"`. Nessuno stato lo fa oggi.
- `page.test.tsx`, test di ANNULLA: il commento dice che in jsdom il `popstate` di `history.go` va
  mandato a mano, ma jsdom lo manda da sé.
- `riepilogo.test.tsx`, test di SOSTITUISCI: il `popstate` sintetico parte prima che la scrittura
  finisca, e il test passa per un'altra strada (il `popstate` del `go(-1)` che jsdom manda da sé).
  Basterebbe togliere il `dispatchEvent`. Difetto nel testo del piano.
- `Riepilogo.tsx`: dopo un errore di scrittura seguito da un errore di caricamento e da `RIPROVA`,
  il vecchio errore di esecuzione resta sopra il Dock.

Accettati, non da correggere: la frase in più in DESIGN-SYSTEM.md §9 che rimanda a questo registro
(modello delle fasi 5-7); il co-autore Sonnet nei commit dei Task 1 e 4 (modello reale dell'agente,
niente amend).

## Rulings

Le decisioni del controller durante l'esecuzione, dal ledger:
- In T2 `riepilogo.test.tsx` può fallire solo perché `RIPRENDI` non si trova (manca lo
  `SlotDockProvider`): lo chiude T3, che riscrive quel file. Costo se sbagliato: un task T2 con un
  test rosso transitorio, visibile nel report.
- T3: accettata l'attesa del conto (`findByRole list`) prima di `dock()` nei test «errore dal
  dialogo» e «retry»: senza, il Dock non c'è ancora al primo calcolo; nessuna asserzione allentata.
  Costo se sbagliato: nessuno sul codice, solo un'attesa in più nel test.
- I3: il testo vero dell'attesa è «Se chiudi l'app prima che abbia finito, la lettura si perde.» (la
  lettura continua anche uscendo dalla pagina e la bozza si ritrova in «Hai un import in corso»),
  corretto in page.tsx, spec §B, DESIGN.md §13 e registro, perché la regola anti-fabbricazione di
  Andrea vale anche per il copy. Costo se sbagliato: Andrea preferisce un'altra frase, cambio di una
  riga.
- Nella stessa ondata si correggono anche M1, M2, M3, M4 (economici) insieme a I1, I2, I3. Costo se
  sbagliato: un diff un po' più largo da rivedere.
- I2: `justifyContent: 'safe center'` (come Fine spesa nella fase 6), misurato dal revisore su una
  replica. Costo se sbagliato: su un browser senza `safe` il valore è ignorato e la scheda va in
  cima (non tagliata).

## Prove dal telefono

Da fare dopo il merge, in produzione (spec §G):
1. **Attesa.** Importa un PDF: durante l'attesa il titolo luccica e c'è la nota «Se chiudi l'app
   prima che abbia finito, la lettura si perde.».
2. **Ripresa e Ricominciare.** Con un import lasciato a metà, riapri Importa: `RIPRENDI` nel Dock;
   `RICOMINCIA` apre il dialogo, e l'indietro di Android lo chiude.
3. **Riepilogo che sostituisce.** Al riepilogo di un import che sostituisce un piano: la riga «da
   disattivare», `SOSTITUISCI IL PIANO`, il dialogo rosso. Dopo, l'indietro di Android dal Piano non
   torna al riepilogo: dopo CREA/SOSTITUISCI l'indietro di Android porta al pannello impostazioni
   sopra la pagina da cui eri partito (non a Importa): è voluto.
4. **Rifiuto ed errore.** Un file che non è una dieta, o una dieta con sole macro: l'errore o il
   rifiuto, con la sua azione nel Dock.
