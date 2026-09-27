# Fase 8a: gli stati e il riepilogo di Importa

**Obiettivo:** portare nel sistema di `design/sistema/DESIGN.md` le cinque schermate di Importa
rimaste fuori che si costruiscono con i pezzi che esistono già: ripresa, attesa dell'estrazione,
rifiuto, errore e riepilogo. Il primo import di un utente nuovo diventa più leggero di un passo.

Ha funzionato se:
- nelle parti toccate non restano colori scritti a mano, dialoghi scritti a mano, la classe
  `coda-barra` o tasti fuori dal Dock;
- l'azione di ogni schermata sta nel Dock;
- al primo import (nessun piatto da disattivare) il piano si crea con un tocco solo;
- le scritture sono identiche a oggi: `traduciBozza`, `eseguiScritture`, `salvaBozzaImport`,
  `cancellaBozzaImport` si chiamano come oggi, i test di dato restano verdi, nessuna migrazione.

**Le decisioni di Andrea (27/09):**
1. **La fase 8 si divide.** L'8a (questa spec) va subito, con i pezzi del sistema. L'8b,
   Revisione e Formati, aspetta un giro in Claude Design: sono le schermate più dense e non hanno
   artboard.
2. **Il dialogo «Sostituire il piano attuale?» compare solo se l'import disattiva qualcosa.**
   Altrimenti il tasto si chiama `CREA IL PIANO` e scrive subito.
3. **L'attesa usa `.anim-luce-testo`**, la sfumatura che la Dispensa usa già mentre l'AI lavora.
   Nessuna animazione nuova.
4. **Nel rifiuto l'azione principale è `PROVA UN ALTRO FILE`**, che riporta alle due porte. Alle
   Impostazioni si torna con la pillola della testata.

**Fuori perimetro, esplicitamente:**
- Revisione (`Revisione.tsx`) e Formati (`Formati.tsx`): fase 8b. I loro tasti finali restano
  com'è oggi fino all'8b;
- le due porte (`Acquisizione.tsx`), la fotocamera e i fogli presi: già nel sistema dalla fase 3;
- la macchina a stati di `page.tsx`, la chiamata a `/api/import/estrai` e i suoi messaggi per
  codice HTTP, `traduciBozza`, `eseguiScritture`, la bozza: si chiamano come oggi;
- la testata (`Cornice`: «Importa la dieta» con la pillola IMPOSTAZIONI): resta com'è.

**Il database non cambia. Nessuna migrazione.**

---

## A. Lo stato di Importa

Ripresa, attesa, rifiuto, errore e i due stati d'errore del riepilogo sono lo **Stato vuoto** di
DESIGN.md §8. Oggi lo stato vuoto è scritto dentro ogni pagina, per scelta del progetto
(DESIGN-SYSTEM.md §3); qui lo usano sei stati dello stesso flusso, quindi diventa **un componente
locale di Importa**, `src/app/(app)/importa/StatoImporta.tsx`. Non va in `src/components/`.

- **Disegno:** quello dello stato vuoto della Lista (`lista/page.tsx`, «La lista non c'è
  ancora»), coi token al posto dei letterali: scheda raggio 22, fondo `--superficie`, bordo 1 px
  `--bordo`, padding `26px 20px`, testo centrato; quadrato 46 raggio 14 con bordo 2 px tratteggiato
  `--bordo-tratteggio`, e dentro l'icona del foglio (un rettangolo con tre righe, tratto 1,9 in
  `--icona-spenta`); titolo 21/800, `-0.035em`, `lh 1.2`, `--ink`; testo 14, `lh 1.5`,
  `--testo-2`, largo al massimo 30ch. Un secondo paragrafo di testo facoltativo, stesso stile.
- **Posto:** dentro uno scroller `sc scroll-app`, centrato in verticale. Con un'azione nel Dock lo
  scroller prende anche `con-dock`.
- **Props:** `titolo`, `testo`, `testo2?`, `luce?` (il titolo prende `.anim-luce-testo`),
  `stato?` (la scheda prende `role="status"`), `children?` (un tasto secondario sotto il testo,
  per la ripresa).
- **L'azione principale non sta nel componente:** chi lo usa monta il suo `<Dock>` con il
  `.dock-primario`, come la Lista.

## B. Le quattro schermate prima della bozza

| Schermata | Titolo | Testo | Dock | Altro |
|---|---|---|---|---|
| **Ripresa** | Hai un import in corso | «C'è una dieta già estratta in attesa di revisione: puoi riprenderla da dove l'hai lasciata, oppure ricominciare da capo.» (di oggi) | `RIPRENDI` | `RICOMINCIA` è un `TastoSecondario` nella scheda e apre il Dialogo di conferma (§D) |
| **Attesa** | Sto leggendo la dieta… (con `luce`) | «Resta su questa pagina: se la lasci, la lettura si perde.» | nessuno | La scheda ha `role="status"` |
| **Rifiuto** | Questa dieta non ha un menu (di oggi) | la motivazione dell'AI; `testo2` = `SPIEGAZIONE_RIFIUTO` di oggi | `PROVA UN ALTRO FILE` | Il tasto torna alle porte **svuotando** PDF e foto: si parte da un file nuovo |
| **Errore** | La lettura si è fermata | il messaggio di oggi, uno per codice HTTP, invariato | `RIPROVA` | Come oggi: torna alle porte **tenendo** PDF e foto, per riprovare lo stesso file |

Il testo dell'attesa è vero per il codice di oggi: la bozza si salva solo quando arriva la
risposta di `/api/import/estrai` (`page.tsx`, `salvaBozzaImport` dopo la `fetch`). Chi lascia la
pagina prima perde la lettura.

Il caso «dieta senza menu» oggi ha il tasto `TORNA A IMPOSTAZIONI`, che fa la stessa cosa della
pillola. Sparisce: la decisione 4 lo sostituisce.

## C. Il riepilogo

**Il conto.** In cima un titolo di scheda, «Il nuovo piano», 21/800. Sotto una scheda (raggio 18,
`--superficie`, bordo `--bordo`, `--ombra-pannello`) con una riga per voce, separate da un filetto
1 px `--bordo`, alte almeno 44:

| Voce | Valore |
|---|---|
| Piatti | `piattiDaCreare.length` |
| Settimane del giro | `impostazioni.settimaneCiclo` |
| Ingredienti nuovi | `ingredientiDaCreare.length` |
| Piatti del piano attuale da disattivare | `piattiDaDisattivare.length`, **solo se è più di 0** |

Il nome della voce a sinistra, 14/500 `--testo-2`; il numero a destra, 17/700 `--ink`,
`tabular-nums`. Sostituisce la frase unica di oggi («N piatti su M settimane · …»).

**L'azione, secondo cosa si disattiva (decisione 2):**
- **`piattiDaDisattivare.length > 0`:** nel Dock `SOSTITUISCI IL PIANO`. Apre il Dialogo di
  conferma (§D): titolo «Sostituire il piano attuale?», testo di oggi («I piatti del nutrizionista
  non più presenti nella nuova dieta verranno disattivati; questa azione non si annulla.»), azione
  `SOSTITUISCI`, tono `distruttivo`.
- **`piattiDaDisattivare.length === 0`:** nel Dock `CREA IL PIANO`. Scrive subito, senza dialogo.
- **Finché le scritture non sono pronte** (primo calcolo, o ricalcolo dopo un errore) il tasto del
  Dock è spento (`disabled`, lo stato spento del sistema, niente opacità).
- **In volo** il tasto del Dock resta spento, con la stessa scritta.
- **Se `eseguiScritture` fallisce:** il meccanismo di oggi resta (`tentativo` sale, le scritture si
  ricalcolano da capo, niente doppioni). L'errore «Qualcosa si è fermato: riprova, l'import
  riprende da dove era.» si mostra con `ErroreSopraDock`. Se l'errore arriva dal dialogo, il
  dialogo **si chiude** e l'errore sta sopra il Dock: così il tasto per riprovare è uno solo, il
  Dock, spento finché il ricalcolo non è pronto. `DialogoConferma` non ha un modo per restare
  spento dopo un errore, e non serve aggiungerglielo.
- **Riuscito:** si va al Piano con `router.replace('/piano')`, non `push`. La bozza è cancellata, e
  l'indietro di sistema non deve tornare su un Importa che riparte dalle porte.

**Gli stati d'errore del riepilogo** diventano `StatoImporta`:
- `BozzaIncompletaError`: titolo «C'è ancora qualcosa da sistemare», testo il messaggio
  dell'errore, Dock `TORNA ALLA REVISIONE` (come oggi: `passo: 'revisione'`);
- caricamento fallito: titolo «Il riepilogo non è pronto», testo di oggi («Non siamo riusciti a
  preparare il riepilogo. Riprova più tardi.»), Dock `RIPROVA`, che fa salire `tentativo` e
  rilegge.
- Il primo caricamento (scritture ancora nulle, nessun errore) resta com'è: niente sotto la
  testata.

## D. I dialoghi e l'indietro di sistema

I due dialoghi (Ricominciare, Sostituire) sono `DialogoConferma` dentro un `FoglioDalBasso` con
`ruolo="alertdialog"`, `altezza="contenuto"`, `chiudiDalVelo={false}`, come nell'editor del Piatto.
Ognuno mette la sua voce di cronologia con `useIndietroFogli`, così l'indietro di Android lo chiude
invece di lasciare Importa. Uscire dalla pagina con un dialogo aperto passa da `chiudiTuttoPoi`.

- **Ricominciare:** `onConferma` chiama la `ricomincia` di oggi e il dialogo si chiude. Oggi
  `ricomincia` non lancia mai: se `cancellaBozzaImport` fallisce registra l'errore e riparte
  comunque dalle porte (`page.tsx`, `ricomincia`) [misurato: letto]. Resta così: `erroreTesto` è
  obbligatorio in `DialogoConferma`, e vale «Non siamo riusciti a ricominciare. Riprova.», ma
  con il comportamento di oggi non compare mai.
- **Sostituire:** §C.

## E. Test

I test di oggi (`page.test.tsx`, `riepilogo.test.tsx`) sono funzionali e restano; cambiano solo le
asserzioni sui testi e sui tasti che la spec cambia. Si aggiungono:
- ogni stato (ripresa, rifiuto, errore, errori del riepilogo) ha la sua azione nel Dock, nella
  regione «Azione principale»; l'attesa non ha Dock e ha `role="status"`;
- `PROVA UN ALTRO FILE` svuota PDF e foto, `RIPROVA` li tiene;
- `RICOMINCIA` apre il dialogo, che chiama `cancellaBozzaImport` solo alla conferma;
- riepilogo: senza piatti da disattivare, `CREA IL PIANO` scrive subito e non c'è dialogo né la riga
  «da disattivare»; con piatti da disattivare, `SOSTITUISCI IL PIANO` apre il dialogo e scrive solo
  alla conferma; alla riuscita `replace('/piano')`;
- un errore di `eseguiScritture` chiude il dialogo, mostra l'errore sopra il Dock, spegne il tasto
  fino al ricalcolo e non duplica le scritture (il test d'idempotenza di oggi resta verde).

## F. Documenti

- DESIGN.md §13: le decisioni del 27/09 della fase 8a; la frase «Restano fuori … i passi di Importa
  diversi dalle due porte e dalla fotocamera» si aggiorna: restano fuori Revisione e Formati.
- DESIGN-SYSTEM.md: la riga di Importa e §9.
- Un registro `docs/2026-09-27-fase8a-decisioni-esecuzione.md`, come nelle fasi precedenti, con le
  prove dal telefono.

## G. Prove dal telefono, dopo il merge

1. Importa un PDF: durante l'attesa il titolo luccica e c'è la nota «Resta su questa pagina».
2. Con un import lasciato a metà, riapri Importa: `RIPRENDI` nel Dock; `RICOMINCIA` apre il
   dialogo, e l'indietro di Android lo chiude.
3. Al riepilogo di un import che sostituisce un piano: la riga «da disattivare», `SOSTITUISCI IL
   PIANO`, il dialogo rosso. Dopo, l'indietro di Android dal Piano non torna al riepilogo.
4. Un file che non è una dieta, o una dieta con sole macro: l'errore o il rifiuto, con la sua
   azione nel Dock.
