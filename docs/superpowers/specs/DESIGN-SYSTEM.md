# Dispesa — il design system visto dal codice

**Cosa è questo file.** Il ponte fra le regole e i file: dove vive ogni componente, quanto il
codice si scosta dalle regole, e cosa deve fare chi scrive codice.

**Cosa NON è.** Non contiene regole di design. La fonte di verità è una sola:
`design/sistema/DESIGN.md` (v3, 20/09/2026). Se cerchi un valore — un colore, una taglia, un
raggio, l'anatomia di un componente — sta là. La cronaca di come le decisioni sono state prese
sta in `design/sistema/CLAUDE.md`; i delta delle sessioni di design in `docs/design-delta/`.

**Perché è stato svuotato (21/09/2026).** Fino al 20/09 questo file ripeteva le regole con una
numerazione propria, e dieci di esse erano già state cambiate dal ridisegno del 19/09: chi
leggeva «tre ombre, nient'altro ha ombra» in §2.7 doveva sapere che il §9 punto 2 le aveva
portate a sei. Due copie della stessa regola, di cui una vecchia, costano più di nessuna copia —
`design/ridisegno/ANALISI.md` si apre con l'avvertenza di non confondere le due numerazioni.
Ora la regola sta in un posto solo, e qui resta ciò che `DESIGN.md` non può sapere: i nomi dei
file.

**I numeri dei paragrafi rimasti (§3, §6, §7) non sono cambiati**, così i piani e le spec che
li citano restano validi.

---

## Dove è finita ogni regola

| Prima, qui | Adesso, in `DESIGN.md` v3 |
|---|---|
| §1 Principi | §1 I sei principi |
| §2.1 Colori neutri | §2.1 Neutri (con `--testo-2` fra i neutri) |
| §2.2 Colori delle sei aree | **§2.3** Le sei aree (cinque usi del colore, non più quattro) |
| §2.3 Colori semantici | **§2.2** Semantici (i quattro token, ora nel codice) |
| §2.4 Tipografia | §3 Tipografia (titoli in sentence case dal 20/09) |
| §2.5 Spaziatura | §4 Spaziatura |
| §2.6 Raggi · §2.7 Bordi e ombre | §5 Raggi, bordi, ombre (sei ombre, due raggi fuori scala dichiarati) |
| §2.8 Icone | §6 Icone |
| §2.9 Movimento | §7 Movimento (più `.anim-barra` e la maschera di scorrimento) |
| §3 Componenti (anatomia e misure) | §8 Componenti — 29 voci, contro le 16 di qui |
| §4 Pattern | §9 Pattern · §10 Copy · §11 Accessibilità |
| §5 Cosa non c'è, di proposito | §12 Cosa non c'è, di proposito (il gradiente non è più fra le esclusioni) |
| §8 Decisioni del 17/09 · §9 Redesign del 19–20/09 | §13 Le decisioni, e la cronaca in `design/sistema/CLAUDE.md` |

Le due inversioni della prima colonna — aree e semantici — sono la trappola segnalata da
`ANALISI.md`: un «§2.2» scritto prima del 21/09 può voler dire due cose diverse.

---

## 3. Ogni componente, e dove vive

L'anatomia, le misure e gli stati di ogni voce stanno in `DESIGN.md` §8, sotto lo stesso nome.
Qui c'è solo il ponte verso il codice: 34 voci `###` in `DESIGN.md` §8, 42 file `.tsx` in
`src/components/` e `src/components/pannello/` [contati di nuovo il 26/09, a fase 5 finita]. I componenti della Dispensa
vivono accanto alla pagina, in `src/app/(app)/dispensa/`: dove la tabella scrive solo il nome
del file, è lì.

| Componente (`DESIGN.md` §8) | Dove vive nel codice | Stato |
|---|---|---|
| Testata | `src/components/Testata.tsx` | fase 5: modo indietro a pillola (`indietro: { etichetta, ariaLabel, onTorna }`) in Piatti e Importa; fase 6: in modo indietro anche la pillola settimana; etichetta `FINE SPESA` in Confezioni |
| Menù utente | dentro `Testata.tsx` | fase 5: un `button` che apre il pannello, `aria-expanded`, nome `{Nome}: profilo e impostazioni` |
| Tab bar | `src/components/TabBar.tsx`, dentro `Guscio.tsx` | fase 5: tre voci (Lista · Piano · Dispensa), pillola 304 / 244 centrata, voci `flex` con un tetto di 96 / 76 (con tre voci sono esattamente quelle), anima `width`; `data-marchio-barra` sul segno della Lista |
| Marchio | `src/components/Marchio.tsx` (+ `marchio-context.tsx`); l'avvio in `src/components/AvvioMarchio.tsx`, montato nel `Guscio` | 3 × 2, sei aree; dalla fase 5 l'avvio `.anim-avvio-*` con `@keyframes pb`, una volta per sessione su `/lista`; resa grande a 20 in `lista/fatta/page.tsx` ed `entra/page.tsx` |
| Dock | `src/components/Dock.tsx`, montato con `createPortal` nello slot di `dock-slot.tsx`, reso da `Guscio.tsx` | fatto nella fase 2; dalla fase 3 è una regione di nome «Azione principale» (tutti i Dock), e porta anche ESTRAI LA DIETA in Importa col PDF scelto. In Lista `HAI PRESO TUTTO` e i primari dei due stati vuoti; nel Piano la sola conferma — lo stato vuoto del Piano resta una scheda con un link in linea, di proposito. Dalla fase 4 anche **sciolto** (`<Dock sciolto>`, classe `.dock-sciolto`): nella Dispensa `DockDispensa.tsx` mette `Modifica con l'AI` e il tondo del microfono, senza contenitore bianco. Dalla fase 5 `.dock-senza-barra` a `bottom 22` quando una schermata nasconde la barra (l'editor dell'ingrediente); dalla fase 6 anche `CHIUDI LA SPESA` in `lista/fatta/page.tsx`, con la guardia in `lista/fatta/guardia.ts` |
| Tasti | nessun file: le tre basi sono copiate in otto punti | deriva dichiarata e accettata (§6) |
| Pillole d'azione | `RigaControllo.tsx`, `Segmento.tsx` (variante pillola) | |
| Segmento a blocco | `Segmento.tsx` (variante blocco) | |
| Tessera widget di sezione | `CartaSezione`, dentro `src/app/(app)/lista/page.tsx` | fatta nella fase 2 |
| Tessera della Lista | `src/components/Tessera.tsx` | allineata nella fase 2: l'accesa non protagonista perde fondo e ombra dentro il widget |
| Riga di controllo | `src/components/RigaControllo.tsx` | fase 5: la cadenza viene dalle impostazioni (`giorniControllo`, `testoCadenza`) |
| Riga pasto | `src/components/RigaPasto.tsx` | |
| Riga piatto | `src/app/(app)/piatti/ElencoPiatti.tsx` (`RigaPiatto`) | fatta nella fase 3 |
| Striscia dei giorni | `src/components/StrisciaGiorni.tsx` | fase 5: pallini in griglia di tre colonne gap 3 (`posizionePallino`), sei pasti a 360 senza deroga |
| Pannello impostazioni · Riga di impostazione | `src/components/pannello/`: `PannelloProvider.tsx`, `Pannello.tsx`, `Cima.tsx`, `TesserePannello.tsx`, `RigaImpostazione.tsx`, `CampoPersone.tsx`, `NotaRisparmio.tsx`, `PiedePannello.tsx`, `schermate.tsx`, i dati in `DatiPannello.tsx` | fatto nella fase 5: pannello a due livelli montato nel `Guscio`, otto sotto-schermate, `?impostazioni=` e gesto indietro con `src/components/useIndietroFogli.ts` |
| Matrice dei pasti | `src/components/pannello/PastiACasa.tsx` | fatta nella fase 5: casetta al posto del pallino, 360 nel mandato |
| Aggiungi tratteggiato (in Gestione dei pasti) | `src/components/pannello/GestionePasti.tsx` | fase 5: in fondo al blocco |
| Tessera di dispensa | `TesseraDispensa.tsx` | fatta nella fase 4: in casa con la tinta d'area al 26%, finita e mai comprata tratteggiate, una pillola di stato sola |
| Tessera del lotto (dentro Tessera di dispensa) | `TesseraLotto.tsx` | fatta nella fase 4, nel widget Pronti |
| Widget d'area (la Tessera widget di sezione della Dispensa) | `WidgetArea.tsx` | fatto nella fase 4: un widget per area più Pronti |
| Caricamento a widget vuoti (§9 Caricamento, eccezione del 25/09) | `WidgetVuoti.tsx` (+ `.anim-luce-widget` in `globals.css`) | fatto nella fase 4: tre widget, luci in fase, dopo 8 s l'errore (il timer sta in `page.tsx`) |
| Widget AI (Dispensa) · Onda di dettatura | `WidgetAI.tsx` + `useDettatura.ts` (+ `useAltezzaTastiera.ts`; `.onda-barra` e `.anim-luce-testo` in `globals.css`) | fatto nella fase 4; sostituisce il Foglio del Dock della Dispensa e `NotaDispensa.tsx`, cancellato |
| Stato "Registro" | nessun file: `NotaDispensa.tsx` è stato cancellato nella fase 4 | la voce resta in `DESIGN.md` §8 senza codice; la dettatura della Dispensa usa l'Onda di dettatura |
| Dettaglio di ingrediente | `DettaglioIngrediente.tsx` + `src/components/controlli.tsx` (Sì/No, campo con `SALVA`, tasti, blocchi; spostato dalla Dispensa nella fase 5); il lotto in `DettaglioLotto.tsx` | fatto nella fase 4 |
| Riga di scadenza | `RigaScadenza.tsx` | fatta nella fase 4 |
| Dialogo di conferma | `src/components/DialogoConferma.tsx`, dentro un `FoglioDalBasso` con `ruolo="alertdialog"`; `DialogoElimina.tsx` della Dispensa ne è un uso | generalizzato nella fase 5: tono `distruttivo` in `--errore` e `primario` in `--ink` (Esci) |
| Anteprima di scansione | `LettoreCodice.tsx` + `src/components/useLettoreCodici.ts` (la lettura, condivisa con `Scanner.tsx`); l'esito in `ScansioneConfezione.tsx` | fatta nella fase 4; dalla fase 6 anche in `lista/confezioni/page.tsx`, in un `FoglioDalBasso`; `src/components/Scanner.tsx` è stato cancellato |
| Nuovo ingrediente | `NuovoIngrediente.tsx` | fatto nella fase 4; non è una voce di `DESIGN.md` §8, lo descrive la spec della fase 4 §C |
| Editor dell'ingrediente | `src/app/(app)/piatti/[id]/ingredienti/[ingId]/page.tsx` | frame 12 della fase 5: SALVA nel Dock senza barra, scansione con `LettoreCodice`; non è una voce di `DESIGN.md` §8 |
| Tasto di scatto · Banda dei comandi · Striscia dei fogli presi | `src/app/(app)/importa/Camera.tsx` (+ `.scatto`, `.guida-angolo` in `globals.css`), «Rivedi i fogli presi» in `src/app/(app)/importa/FogliPresi.tsx` | fatti nella fase 3 |
| Stato vuoto · Campo di testo · Scheda · Etichetta di sezione · Messaggi | sparsi nelle pagine, in stile inline; la modalità ricerca del Campo di testo vive in `src/app/(app)/piatti/ElencoPiatti.tsx` | scelta del progetto, non una deriva (§6, prima riga) |
| Foglio dal basso | `src/components/FoglioDalBasso.tsx` (con `TestataFoglio` e `TondoFoglio`); prima di lui, scritti a mano, `src/components/FoglioAzioniPasto.tsx` e `src/app/(app)/importa/FogliPresi.tsx` | componente dalla fase 4: i quattro fogli della Dispensa; gli altri due non sono stati migrati |
| Porta | `src/components/Porta.tsx` | nata nello stato vuoto di Piatti, condivisa dalla fase 3 con Importa. Non è una voce di `DESIGN.md` §8 |

Fuori dal sistema, perché è infrastruttura e non disegno: `Guscio.tsx` (il guscio comune della
fase 1: stato della barra, maschera di scorrimento, reset di route), `PrimoAvvio.tsx`,
`RegistraSW.tsx`, `TesseraIngrediente.tsx`, `barra-context.tsx`.

---

## 6. Deviazioni misurate nel codice (16/09/2026)

I conteggi sono quelli misurati il 16/09 su `src/` con grep, non stime, e non sono stati
rimisurati dopo. La colonna «Regola violata» rimanda a `DESIGN.md` v3.

| Cosa | Misura | Regola violata | Rimedio proposto |
|---|---|---|---|
| Stile inline ovunque: `style={{}}` in ogni pagina (81 in Piatto, 78 in Impostazioni), Tailwind usato solo per `font-mono` (171), `.sc` e `.anim-*` | grep su `src/` | nessuna, è la scelta del progetto | [deciso 17/09] si tiene così com'è, **senza** un modulo di basi condivise: questo documento è l'unica guardia, e le otto copie dei tasti restano finché non si tocca il file |
| `#FFFFFF` letterale | 84 usi contro 39 `var(--superficie)` | token | sostituire |
| `#14163A` e `#8A8A96` letterali | 20 e 17 usi (a fronte di 195 e 149 con `var()`) | token | sostituire; `Tessera`, `RigaControllo`, `RigaPasto` ridefiniscono `INK`/`MUT` come costanti locali |
| Grigi decorativi `#C4C4CE` `#BFBFC9` `#B6B6C0` | 14 usi, nessun token | `DESIGN.md` §2.2 | un token `--icona-spenta` |
| Avviso/errore/congelato senza token | 3 + 1 + 2 usi | `DESIGN.md` §2.2 | tre token, scuriti a 4,5:1 — i token esistono in globals.css dal 20/09 (guscio comune); i letterali nei file restano finché non si toccano |
| 22 taglie di carattere, 12 spaziature | grep `fontSize`/`letterSpacing` | `DESIGN.md` §3 | scala a 9 livelli |
| 15 raggi | grep `borderRadius` | `DESIGN.md` §5 | scala a 5 |
| 8 spessori di tratto SVG | grep `strokeWidth` | `DESIGN.md` §6 | 1.8 e 2.1 |
| Bordo dei campi numerici `0.12`–`0.16` invece di `--bordo` | 2 file | `DESIGN.md` §8 Campo di testo | `--bordo` |
| Le tre basi dei tasti copiate in 8 punti | grep ombra primario | `DESIGN.md` §8 Tasti | [deciso 17/09] restano copiate; si allineano a mano a questo documento quando si tocca il file |
| `rgba(hex, alpha)` ridefinita in tre componenti | commento nel codice: "per scelta del progetto" | — | lasciare, o una funzione in `src/ui/colore.ts` |
| Testo secondario sotto AA | 3,0:1 su fondo | `DESIGN.md` §11 | `--testo-2` sui testi che informano (`DESIGN.md` §2.1) |

Nessuna di queste è un bug visibile: sono il costo di due settimane di sviluppo a
velocità. Il documento serve a fermare la crescita del debito, non a imporre un
refactor: **si corregge un file quando lo si tocca per altri motivi**, e ogni componente
nuovo nasce già sulla scala.

---

## 7. Come si applica, per chi scrive codice

1. Prima di scrivere una schermata nuova: leggere `DESIGN.md` §1 (principi), §8 (il
   componente che ti serve) e §9–§11 (pattern, copy, accessibilità), più la riga di quel
   componente nel §3 qui sopra per sapere se un file esiste già. Se serve un componente che
   non c'è, va scritto in `DESIGN.md` §8 **prima** che nel codice, e la sua riga va aggiunta
   al §3 qui.
2. Colori solo via `var(--…)`. Un hex letterale nel `tsx` è un errore di review.
3. Taglie, raggi e spaziature solo dalla scala. Un valore fuori scala va motivato in un
   commento o riportato alla scala.
4. Ogni controllo nasce con nome accessibile, `aria-pressed` se è un toggle, 44 px di tap.
5. Ogni numero mostrato ha una provenienza nel dato; gli euro solo da un prezzo
   dell'utente.
6. Ogni testo nuovo passa da `DESIGN.md` §10 Copy: maiuscolo mono per etichette e tasti,
   frasi altrove, niente esclamativi, niente claim.
7. Ogni animazione nuova va in `globals.css`, dentro il media di reduced-motion, e va
   aggiunta a `DESIGN.md` §7.
8. Un valore nuovo che vale per tutto il sistema è un token: prima `DESIGN.md`, poi
   `tokens.css`, poi `globals.css`. Il test `npm run design:token` tiene gli ultimi due
   d'accordo.
9. Chi monta un Dock (fasi 3, 4 e 5) usa `<Dock>`, che lo mette nello slot del `Guscio`, e dà
   al proprio scroller la classe `con-dock`. **La coda è una sola, `--coda-scroll-dock`, e non
   deve cambiare con `data-barra`**: una coda che cambia con la barra fa ritagliare `scrollTop`
   dal browser e lascia l'ultima voce dietro il Dock — il perché, misurato, sta nel commento in
   `globals.css`. La spec e il piano del 21/09 nominano ancora `--coda-dock-giu`: non esiste.
   Una schermata che nasconde la barra non fa niente per il Dock: lo sposta `.dock-senza-barra`.

---

## 9. Cosa il codice non ha ancora

Il conto aperto verso `DESIGN.md` v3, al 26/09/2026.

- **La fase 2 (Lista e Piano) è chiusa** il 22/09 (PR #4). Le decisioni prese durante
  l'esecuzione, con il costo di ognuna, stanno in `docs/2026-09-22-fase2-decisioni-esecuzione.md`.
- **La fase 3 (Piatti e fotocamera) è chiusa con la PR del ramo `redesign/piatti-fotocamera`**.
- **La fase 4 (Dispensa) è chiusa con la PR del ramo `redesign/dispensa`**. Le decisioni prese
  durante l'esecuzione stanno in `docs/2026-09-25-fase4-decisioni-esecuzione.md`.
- **La fase 5 (Impostazioni) è chiusa con la PR del ramo `fase5-impostazioni`**. Le decisioni prese
  durante l'esecuzione, le misure nel browser e i gate di Andrea stanno in
  `docs/2026-09-25-fase5-decisioni-esecuzione.md`. Con lei tutte le schermate di `DESIGN.md` v3 sono
  ridisegnate; restano fuori le schermate che `DESIGN.md` non disegna, vedi sotto.
- **La fase 6 (Fine della spesa ed Entra) è chiusa con la PR del ramo `fase6-fine-spesa`**. Le
  decisioni prese durante l'esecuzione stanno in `docs/2026-09-26-fase6-decisioni-esecuzione.md`.
- **Fuori dal sistema restano**, divisi in due fasi decise il 26/09: la **fase 7** (editor del
  Piatto, Piatti veloce, Scegli; aspetta la decisione se Scegli riusa Piatti) e la **fase 8**
  (i passi di Importa oltre le due porte e la fotocamera; probabilmente un selettore nuovo, quindi
  un giro in Claude Design). L'audit del 26/09 li misura uno per uno.
- **53 token dichiarati nel design e assenti dal codice** [misurato il 26/09 con le funzioni del guardiano, a
  fase 5 finita: `tokens.css` ne dichiara 118, `src/app/globals.css` ne ha 67, 65 in comune, 0
  divergenti (`npm run design:token`); il 25/09, a fase 4 finita, erano 115, 62 e 60, con 55 assenti; prima della
  fase 3 erano 54 nel codice e 52 in comune, il 21/09 48 e 45]. Sono soprattutto la scala tipografica
  (`--testo-*`), le spaziature (`--spazio-*`), i raggi (`--raggio-*`) e il moto. Del Dock ne
  restano solo due, `--dock-altezza` e `--dock-pillola`: gli altri sono entrati con la fase 2.
  I 53 il codice li ha scritti a mano dentro i componenti, e finché è così cambiare un raggio
  nel design vuol dire cercarlo nei file. Si portano dentro **una famiglia per volta, sulle
  schermate che si stanno già toccando**, non in un refactor a sé.
- **Due token che il codice ha e il design non nomina**: `--coda` e `--fine` (il design li
  chiama `--coda-scroll` e `--fine-barra-*`). O entrano in `tokens.css` con questo nome, o si
  rinominano.

Che `tokens.css` e `globals.css` non divergano in silenzio non è più affidato alla memoria:
`npm test` fallisce se lo stesso token vale due cose diverse
(`scripts/__tests__/token-check.test.ts`, da solo con `npm run design:token`). I 53 e i 2 qui
sopra il test li riporta come lavoro aperto, non come errore.
