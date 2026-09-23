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
Qui c'è solo il ponte verso il codice: 29 voci `###` in `DESIGN.md` §8, 20 file `.tsx` in
`src/components/` [contati di nuovo il 23/09, a fase 3 finita].

| Componente (`DESIGN.md` §8) | Dove vive nel codice | Stato |
|---|---|---|
| Testata | `src/components/Testata.tsx` | allineata alla fase 1 (20/09): menù utente e titoli in sentence case |
| Menù utente | dentro `Testata.tsx` | fatto nella fase 1 |
| Tab bar | `src/components/TabBar.tsx`, dentro `Guscio.tsx` | fatta nella fase 1: due stati, nomi, Marchio come icona della Lista |
| Marchio | `src/components/Marchio.tsx` (+ `marchio-context.tsx`) | 3 × 2, sei aree |
| Dock | `src/components/Dock.tsx`, montato con `createPortal` nello slot di `dock-slot.tsx`, reso da `Guscio.tsx` | fatto nella fase 2; dalla fase 3 è una regione di nome «Azione principale» (tutti i Dock), e porta anche ESTRAI LA DIETA in Importa col PDF scelto. In Lista `HAI PRESO TUTTO` e i primari dei due stati vuoti; nel Piano la sola conferma — lo stato vuoto del Piano resta una scheda con un link in linea, di proposito |
| Tasti | nessun file: le tre basi sono copiate in otto punti | deriva dichiarata e accettata (§6) |
| Pillole d'azione | `RigaControllo.tsx`, `Segmento.tsx` (variante pillola) | |
| Segmento a blocco | `Segmento.tsx` (variante blocco) | |
| Tessera widget di sezione | `CartaSezione`, dentro `src/app/(app)/lista/page.tsx` | fatta nella fase 2 |
| Tessera della Lista | `src/components/Tessera.tsx` | allineata nella fase 2: l'accesa non protagonista perde fondo e ombra dentro il widget |
| Riga di controllo | `src/components/RigaControllo.tsx` | allineata nella fase 2: la cadenza viene da `GIORNI_CONTROLLO_STAPLE`, la sottoriga è in `--testo-2` |
| Riga pasto | `src/components/RigaPasto.tsx` | |
| Riga piatto | `src/app/(app)/piatti/ElencoPiatti.tsx` (`RigaPiatto`) | fatta nella fase 3 |
| Striscia dei giorni | `src/components/StrisciaGiorni.tsx` | allineata nella fase 2: quattro stati negli `inset`, sette celle dello stesso ingombro, regge da 3 a 6 pasti fino a 360 px |
| Pannello impostazioni · Riga di impostazione | — | **da fare**, fase 5: oggi le Impostazioni sono una schermata, non un pannello |
| Matrice dei pasti | — | **da fare**, fase 5: sotto-schermata delle Impostazioni |
| Tessera di dispensa | `src/app/(app)/dispensa/page.tsx` | la schermata c'è, la tinta d'area al 26% no: fase 4 |
| Foglio del Dock della Dispensa | le tre vie esistono separate: `NotaDispensa.tsx` (nota e voce), `Scanner.tsx` (scansione), campi residuo nella pagina | **da fare**, fase 4: il foglio che le raccoglie |
| Stato "Registro" | dentro `NotaDispensa.tsx` (dettatura) | l'animazione di livello non c'è: fase 4 |
| Tasto di scatto · Banda dei comandi · Striscia dei fogli presi | `src/app/(app)/importa/Camera.tsx` (+ `.scatto`, `.guida-angolo` in `globals.css`), «Rivedi i fogli presi» in `src/app/(app)/importa/FogliPresi.tsx` | fatti nella fase 3 |
| Stato vuoto · Campo di testo · Scheda · Etichetta di sezione · Messaggi | sparsi nelle pagine, in stile inline; la modalità ricerca del Campo di testo vive in `src/app/(app)/piatti/ElencoPiatti.tsx` | scelta del progetto, non una deriva (§6, prima riga) |
| Foglio dal basso | `src/components/FoglioAzioniPasto.tsx`, `src/app/(app)/importa/FogliPresi.tsx` | |
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

---

## 9. Cosa il codice non ha ancora

Il conto aperto verso `DESIGN.md` v3, al 23/09/2026.

- **La fase 2 (Lista e Piano) è chiusa** il 22/09 (PR #4). Le decisioni prese durante
  l'esecuzione, con il costo di ognuna, stanno in `docs/2026-09-22-fase2-decisioni-esecuzione.md`.
- **La fase 3 (Piatti e fotocamera) è chiusa il `<data>`**.
- **Le schermate non ancora ridisegnate**: Dispensa, Impostazioni a pannello.
- **55 token dichiarati nel design e assenti dal codice** [misurato il 23/09 col guardiano, a
  fase 3 finita: `tokens.css` ne dichiara 115, `src/app/globals.css` ne ha 62, 60 in comune, 0
  divergenti; prima della fase 3 erano 54 nel codice e 52 in comune, il 21/09 48 e 45]. Sono soprattutto la scala tipografica
  (`--testo-*`), le spaziature (`--spazio-*`), i raggi (`--raggio-*`) e il moto. Del Dock ne
  restano solo due, `--dock-altezza` e `--dock-pillola`: gli altri sono entrati con la fase 2.
  I 55 il codice li ha scritti a mano dentro i componenti, e finché è così cambiare un raggio
  nel design vuol dire cercarlo nei file. Si portano dentro **una famiglia per volta, sulle
  schermate che si stanno già toccando**, non in un refactor a sé.
- **Due token che il codice ha e il design non nomina**: `--coda` e `--fine` (il design li
  chiama `--coda-scroll` e `--fine-barra-*`). O entrano in `tokens.css` con questo nome, o si
  rinominano.

Che `tokens.css` e `globals.css` non divergano in silenzio non è più affidato alla memoria:
`npm test` fallisce se lo stesso token vale due cose diverse
(`scripts/__tests__/token-check.test.ts`, da solo con `npm run design:token`). I 55 e i 2 qui
sopra il test li riporta come lavoro aperto, non come errore.
