# Oggi, la home: le decisioni prese durante l'esecuzione

**Data:** 03/10/2026 · **Ramo:** `oggi-home` (da `f3a45c9`, il commit del piano) · **Piano:**
`docs/superpowers/plans/2026-10-03-oggi.md` · **Spec:**
`docs/superpowers/specs/2026-10-03-oggi-design.md` (approvata da Andrea il 03/10, precisata in
esecuzione lo stesso giorno: ogni precisazione è marcata «precisato in esecuzione, 03/10»)

**In una riga.** Oggi è costruita e rivista sul ramo, task per task e poi con una review finale.
La verifica nel browser è **in parte eseguita** (aspetto verificato su pagina sonda, navigazione con sessione da fare; motivo e checklist sotto); il merge su `main`, che pubblica da solo (Vercel),
aspetta l'ok di Andrea. Nessuna migrazione.

**Cosa resta, in ordine:**
1. Le prove nel browser (checklist in «La verifica nel browser: in parte eseguita»), da fare con
   Andrea, solo in lettura.
2. Sette domande di prodotto e di disegno per Andrea («Le domande aperte»). Nessuna blocca il
   merge; la prima (il flag `congelato`) cambia cosa vede chi ha qualcosa in congelatore. L'ottava (la domenica, quando la settimana dopo non esiste) è decisa da Andrea il 03/10,
   opzione a: la domenica Oggi apre anche la settimana di domani (ruling 11; precisato in
   esecuzione, 03/10).
3. Le prove dal telefono (spec §J.4), dopo il merge.

Questo file sostituisce il registro che l'esecuzione subagent-driven tiene in `.superpowers/`
(cartella ignorata da git, cancellata alla fine). Raccoglie le decisioni di Andrea, i ruling del
controller col loro costo se sbagliati, come sono stati eseguiti i task, i test del piano
cambiati e perché, le misure, i limiti noti e le prove da fare.

Etichette: `[misurato]` per ciò che è stato misurato, `[calcolato]` per ciò che discende da una
formula o dal CSS letto, senza misura a schermo, `[ipotesi, non testata]` per ciò che non lo è,
`[fonte: …]` per ciò che viene da altrove. Una prova non fatta si scrive **NON ESEGUITA**.
**I numeri della sezione «La verifica nel browser» sono stati misurati su pagina sonda; nel resto del file nessun numero è stato misurato nel browser o sul telefono.**

## Le decisioni di Andrea (03/10)

Dal brainstorming con i mockup, in testa alla spec; una riga per tema.

| # | Tema | Decisione |
|---|---|---|
| 1 | Che home | Operativa, niente statistiche: né calorie né aderenza al piano (con 233 pasti passati, 0 saltati e 3 spunte in tutto, l'aderenza uscirebbe ~100% per costruzione [fonte: spec, misurato il 03/10]) |
| 2 | Tab | Nuova «Oggi», prima voce della barra, e l'app parte da lì: Oggi · Lista · Piano · Dispensa |
| 3 | Quale pasto | Dall'ora, con fasce stimate dal nome del pasto: senza impostazioni né migrazione |
| 4 | Che azioni | Cambiare piatto (Scegli), segnare com'è andata (foglio azioni), proposte «con quello che hai» |
| 5 | Fattibile | Tutto in casa, poi «manca solo una cosa»; al massimo 2 proposte |
| 6 | Dalla dispensa, in home | Scade presto, da scongelare, Pronti; ogni blocco sparisce quando è vuoto |
| 7 | Forma | C2b «Bento», con le alternative B1 «Carte chiare» in un carosello dentro il poster |
| 8 | Dispensa non aggiornata | La home nasconde tutto ciò che ne deriva e si riempie col piano, più una tessera che spiega perché |
| 9 | Aggiornata | Ultima spesa chiusa nell'app entro 9 giorni; le modifiche a mano in Dispensa non contano |
| 10 | Il poster | Salta i buchi: sempre il prossimo pasto a casa con un piatto |
| 11 | Dal mockup al codice | Diretto, senza giro in Claude Design; i pezzi nuovi si scrivono in DESIGN.md |

Due correzioni ai mockup: via la riga «Hai tutto in casa» dal poster (dopo una spesa chiusa è vera
per costruzione); nessun avviso a tempo dopo `SCAMBIA`, l'annullo sta dentro il poster.

## Come è stato eseguito, task per task

Ogni task ha avuto un implementatore e una review (spec e qualità); i commit dei task:

| Task | Commit | Cosa |
|---|---|---|
| 1 | `eb2d8fe`, `c03af5e` | il tempo della giornata: fasce, prossimo pasto, caselle |
| 2 | `f0bd6c6`, `22355e6` | dispensa aggiornata, ingrediente principale, alternative |
| 3 | `e5ad09d` | scade presto, da scongelare, Pronti per piatto |
| 4 | `924f5ff` | i testi della home |
| 5 | `8851fc3` | l'ultima spesa chiusa e l'apertura della settimana |
| 6 | `990a59a`, `8e365ce` | token del poster, poster, carosello, tessere |
| 7 | `d321729`, `839c816` | la pagina `/oggi`, con scambio, annullo e foglio azioni |
| 8 | `dde7531` | la tab bar a quattro voci |
| 9 | `556043e` | gli ingressi, Scegli da Oggi, la Dispensa aperta su una voce |
| 10 | `0d4d3a1` | i documenti |
| Review finale | `fb04045` (codice), e il commit dei documenti che porta questa riga | le correzioni della review finale: sezione «La review finale» |

Sotto, per ogni task: i ruling (una riga del ledger ciascuno, **in ordine**, col costo se
sbagliati), le deviazioni dell'implementatore accettate dalla review, e l'esito della review.

### Prima dei task (il controller)

Gate e pre-flight [fonte: ledger del controller]: la 8c è su `main` (`quantita: number | null` in
`src/domain/types.ts:42`); l'helper della data locale del lavoro «data locale» (task_6f8e8d7e) non
c'è in `src/domain/date.ts`, quindi `oggiLocale` formatta da sé; le firme delle funzioni e dei
componenti esistenti che il piano usa verificate contro il codice; nessuna coppia di task con
interfacce incompatibili. Nel worktree nuovo `tsc` dava un `LayoutProps` mancante (i tipi generati di Next
assenti): `npx next typegen` li genera in `.next`, ignorata da git.

- **Ruling.** `CARICO…` resta maiuscolo letterale in `oggi/page.tsx`: è l'idioma di tutte le
  pagine (Scegli, Lista fatta, Dispensa) e i loro test lo cercano così; il vincolo «sentence
  case» vale per i testi nuovi del poster e della griglia. *Se sbagliato:* una stringa da cambiare.
- **Ruling.** `etichetta: 'OGGI'` nell'indietro di Scegli: l'API `Indietro` di `Testata` prende
  l'etichetta già maiuscola (precedente `'PIANO'` nello stesso file). *Se sbagliato:* una stringa.
- **Ruling.** `'#fff'` nell'icona di Oggi in `TabBar.tsx` è ammesso: è il bianco che usano le
  altre icone dello stesso file, e `var()` negli attributi SVG di presentazione non è affidabile.
  *Se sbagliato:* un token in `style`.
- **Ruling.** `oggiLocale` formatta la data da sé (l'helper locale manca): task_6f8e8d7e non è
  atterrato. *Se sbagliato:* quando il fix della data arriva, `oggiLocale` va riallineata al suo
  helper (pochi minuti).

### Task 1: il tempo della giornata (`eb2d8fe`, `c03af5e`)

`oggiLocale`, `fasceDi`, `prossimoPasto`, `pastoDopo`, `caselleGiornata`, in `src/domain/oggi.ts`.
Review 1: spec ❌ con due Important (la regex di `normalizza` aveva i caratteri combinanti
letterali invece dell'escape; il «senza piatto» di §B.3 non era fissato da un test) e sette
minor. Giro di correzione: tre punti risolti, zero aperti.
- **Ruling.** §B.3 «Senza piatto → come futuro» si legge con la precedenza della spec (poster >
  fuori > fascia finita > futuro): un pasto senza piatto non ha un aspetto suo, quindi è «futura»
  se la fascia non è finita e «passata» se è finita. Il codice resta; un test lo fissa. *Se
  sbagliato:* una riga in `caselleGiornata` e un'attesa nel test. Precisato nella spec §B.3.
- **Deviazione accettata:** le firme della spec §G.3 e §G.4 (`fasciaDi`, `oggi.test.ts`,
  `caselleGiornata({ data, adesso, slotPoster })`) sono state precisate dal piano in `fasceDi`,
  `oggi.tempo.test.ts`, `caselleGiornata({ slots, defs, minuti, slotPosterId })` e nell'unione
  `Prossimo`. La spec è allineata in §G.3 e §G.4.
- L'implementatore aveva lasciato `src/domain/oggi.ts.bak` non tracciato (una modifica via shell,
  contro il vincolo «solo Edit e Write»): il controller l'ha controllato e cancellato, e ha
  verificato il risultato sui byte.

### Task 2: dispensa aggiornata, ingrediente principale, alternative (`f0bd6c6`, `22355e6`)

Review: spec ✅, qualità Approved (col fix pre-review).
- **Ruling.** `ingredientePrincipale` non lancia mai: se `righeEffettive` o `convertiInUnitaBase`
  lanciano (opzione rimossa, unità incompatibile) restituisce `null`, perché l'icona è decorativa;
  in `alternative`, `consumoSlot` del piatto di stasera a settimana chiusa è avvolto: se lancia,
  `liberato` è una mappa vuota (prudente: meno proposte, mai un falso «tutto in casa»). Più test
  per i due casi e per il candidato illeggibile, perché la pagina del Task 7 li chiama nel render
  e un piatto corrotto renderebbe bianca tutta la home. *Se sbagliato:* due `try/catch` da togliere.
- **Spec precisata** (§C.3), **poi corretta dalla review finale**: la precisazione di questo task
  leggeva «× persone» come `× persone × fattoreConsumo(slot)`, cioè `1 + porzioniPreparate`,
  «perché lo scambio eredita le porzioni da preparare». La premessa è **falsa**: `aggiornaSlot` con
  un cambio di piatto azzera `porzioniPreparate` e cancella il lotto dei Pronti dello slot
  (`src/data/settimana.ts:358`). La regola in vigore è quella della review finale (precisato in
  esecuzione, 03/10): niente banda con porzioni da preparare (spec §C.1), e per gli altri slot il
  fabbisogno è quantità × persone, fattore 1. Il test del piano che fissava `× (1 + N)` è
  cambiato (sezione «I test del piano corretti»).
- **Spec precisata** (§G.4): `ingredientePrincipale` restituisce `{ ingrediente, icona } | null` e
  `alternative` prende `AlternativeInput`.

### Task 3: scade presto, da scongelare, Pronti (`e5ad09d`)

Review: spec ✅, qualità Approved; le due deviazioni accettate dal revisore.
- **Verifica richiesta dalla spec §D.2** [misurato, leggendo il codice]: `chiudiSpesa`
  (`src/data/lista.ts`, righe 547–557), a un riacquisto, scrive `residuo` e `ultimo_acquisto` e
  azzera `scadenza_manuale`, ma **non tocca `congelato`**: il flag resta vero dopo un riacquisto
  fresco.
- **Ruling.** La tessera `SCONGELA` segue il flag così com'è: la home dice quello che dice la
  Dispensa, che mostra lo stesso ingrediente «in congelatore» e ne stima la durata a 90 giorni
  (`GIORNI_CONGELATO` in `src/domain/pantry.ts`). Azzerare il flag alla chiusura cambia la
  semantica della spesa ed è una scelta di prodotto fuori da questo piano. *Se sbagliato:* una
  tessera `SCONGELA` a torto per un ingrediente ricomprato fresco dopo essere stato congelato;
  oggi in produzione non c'è niente in congelatore [fonte: spec, misurato il 03/10]. È la
  domanda 1 per Andrea.
- **Deviazione accettata:** un lotto congelato compare una volta sola: due pasti `daPronti` di
  domani sullo stesso piatto davano due tessere uguali sullo stesso lotto, con chiave React
  doppia. Un test lo fissa.
- **Deviazione accettata:** un test in più, «piatto illeggibile non fa lanciare `daFare`».
- **Risolto dal controller:** `daFare` vede domani anche quando cade nella settimana dopo, perché
  il Task 7 passa `tuttiGliSlot` = settimana + settimana di domani. Coperto da un test della
  pagina (domenica sera, tessera «Scongela» da un'altra settimana). Precisato in esecuzione,
  03/10: quando la domenica Oggi apre con successo la settimana di domani (ruling 11) quello stato si
  raggiunge in produzione [calcolato dal codice, non provato in produzione], e il test gira sul mock di `apriSettimanaCorrente`.

### Task 4: i testi della home (`924f5ff`)

Review: spec ✅, qualità Approved. Nessun test cambiato; il codice non importa `sommaGiorni`
(le interfacce del piano lo citavano, il codice non lo usa).

### Task 5: l'ultima spesa chiusa e l'apertura della settimana (`8851fc3`)

Review: spec ✅, qualità Approved. Nessuna deviazione dal piano.
- **Ruling.** Oggi non chiama `completaAssegnazioni`: `creaSettimana` assegna già i piatti col
  planner, `completaAssegnazioni` ripara solo le bozze con buchi ed è una scrittura di
  pianificazione che sta al Piano; la home salta comunque i pasti senza piatto (§B.1). *Se
  sbagliato:* in una bozza coi buchi la home mostra meno pasti finché non si apre il Piano.
- **Spec precisata** (§F e §G.3): l'helper è `apriSettimanaCorrente(oggi)` in
  `src/data/apertura.ts`, non `apriSettimanaCorrente()` in `src/data/settimana.ts`.

### Task 6: token, poster, carosello, tessere (`990a59a`, `8e365ce`)

Implementatore DONE_WITH_CONCERNS. Review 1: spec ❌ con un Important imposto dal piano (l'area di
tap di `.pillola-poster` era 42, non 44) e sei minor. Giro di correzione: due punti risolti.
- **Ruling.** L'etichetta della banda usa `--poster-testo-3` (66%), non un decimo token al 60%
  come dice §C.5: sei punti di alfa su un'etichetta mono non giustificano un token in più.
  *Se sbagliato:* un token e una riga. Precisato nella spec §C.5 e scritto in DESIGN.md.
- **Ruling.** Con la banda delle alternative il poster non mostra la sua icona (il Task 7 passa
  `icona = null` quando ci sono voci): è il mockup B1 approvato
  (`oggi-caroselli-v2.html:116-128`, poster con banda senza icona hero), e l'icona finirebbe
  coperta dalle carte. *Se sbagliato:* il poster con proposte perde un'icona decorativa.
  Precisato nella spec §B.4.6 e scritto in DESIGN.md.
- **Ruling.** `larga` resta la lettura del piano: `span 2` e altezza minima 64, il contenuto
  decide il resto (una forma davvero compatta, nome a 14–17 su una riga, sarebbe da disegnare).
- **Ruling.** `.pillola-poster::before` passa a `inset: -4px 0`: il bordo da 1 px riduce il
  padding box su cui si posiziona il `::before` a 36, e con −3 l'area era 42. Il vincolo globale
  «tap ≥ 44» vince sul codice del piano. *Se sbagliato:* 2 px di area di tap in più.
- **Ruling.** L'etichetta di `TesseraBianca` (`POI · {PASTO}`, `DOMANI · {PASTO}`) passa da `--sec`
  a `--testo-2`: porta un'informazione, e DESIGN.md §2.1 e §11 riservano `--sec` alla
  decorazione (3,41:1 contro 6,23:1 su bianco [calcolato ora]). La spec tace sul colore. *Se
  sbagliato:* un'etichetta un po' più scura.
- **Correzioni dichiarate dall'implementatore, tutte confermate dalla review:** l'alone del nome
  in `TesseraPiena` usa `coloreArea` (come `Tessera.tsx` della Lista) e non `tintaOpacaArea`;
  `role="list"` esplicito sul carosello (spec §C.5); `RIMETTI QUELLO DEL PIANO` su una riga sua
  (spec §C.6, «sotto le azioni»); `APRI LA LISTA` come pillola d'azione 38 con tap 44; il
  sottotitolo di `TesseraPiena` in `--ink-2` quando c'è l'area (4,63–6,46:1 contro 2,95–4,11:1 di
  `--testo-2` [calcolato ora]); sottotitolo con `maxWidth: 80%` e `lineHeight: 1.5`; `minHeight`
  tolto da `sopra()` (ridondante); `data-puntini` sul gruppo dei puntini (serve ai test).
- **Aggiunte non nel piano:** `.pillola-poster:disabled` e `.tasto-scambia:disabled`, senza
  opacità. `.tasto-scambia:disabled` usa `--tinta-neutra` (0,06) dove DESIGN.md §8 «Spento» dice
  0,10: dichiarata come eccezione in DESIGN.md §2.5, non allineata.
- **Concern all'epoca, ora nei documenti:** `.pillola-poster` a 0,09em e padding 14 contro 0,08em
  e 15 delle pillole d'azione (eccezione dichiarata); `--ink-2` in un ruolo nuovo (dichiarato in
  §2.1 e §2.5); `SCONGELA` a 4,3:1 (§D.2 alla lettera, sotto 4,5: domanda 2).

### Task 7: la pagina `/oggi` (`d321729`, `839c816`)

Review 1 (opus): spec ✅ nei percorsi normali, un Important (una ricarica silenziosa che sostituisce
una non silenziosa: se fallisce, la pagina resta su `CARICO…` senza `RIPROVA`, o mostra lo stato
prima dello scambio senza errore) e otto minor. Le sette scritture del foglio azioni sono
identiche al Piano (verificato riga per riga). Giro di correzione: tre punti risolti.
- **Ruling.** Il minor «scritture concorrenti sullo stesso slot» (`scriviDalFoglio` senza
  `inVolo`, `COM'È ANDATA` mai spento durante uno scambio) sale a Important: `aggiornaSlot` è
  read-modify-write, e due azioni ravvicinate calcolano lo storno su uno stato vecchio, cioè un
  ledger della dispensa sbagliato. *Se sbagliato:* due righe in più.
- **Deviazioni dal piano, accettate:** (1) l'annullo si legge in `carica`, non nel render
  (`leggiPianoPrima` può cancellare l'annotazione di un altro slot, e il render non scrive in
  `sessionStorage`); (2) un piatto non più nel repertorio (`attivo = false`, soft delete) vale
  «senza piatto» e il poster lo salta: la bozza avrebbe mostrato un titolo vuoto; (3) la
  rilettura al ritorno in primo piano è silenziosa, e dopo una scrittura un fallimento mostra
  l'errore; (4) un contatore scarta le risposte superate (ritorno in primo piano, Strict Mode);
  (5) `APRI LA LISTA` nell'errore di caricamento è una pillola (spec §F), non un link di testo;
  (6) `settimanaDelPasto` usa `settimanaDomani ?? settimana` invece di un'asserzione di tipo;
  (7) la tessera «Domani» con la dispensa ferma esclude anche il caso in cui sia il pasto del
  poster stesso (oltre la lettera della spec, §D.5, che dice «se è diverso da Poi»).
- **Le note per l'implementatore** (`iconaIngrediente`, `LargaInCoda`, il commento `eslint-disable`)
  sono in «Le note per l'implementatore dei Task 6–9». Inoltre `CARICO…` esce dal componente
  `Carico` di `pannello/pezzi`, lo stesso di Lista fatta e Piatto, invece di un `<p>` in linea.
- **Trailer:** il commit del primo giro portava `Co-Authored-By: Claude Sonnet 5.5`, contro il
  vincolo; emendato (`0923065` → `d321729`, commit non pubblicato).
- Il giro di correzione ha aggiunto un ref `letturaAttesa` (un errore si mostra se manca una
  lettura non silenziosa riuscita), `inVolo` anche nel foglio azioni, `COM'È ANDATA` spento in
  volo.

### Task 8: la tab bar a quattro voci (`dde7531`)

Review: spec ✅, qualità Approved. Nessun'altra misura derivava dalla larghezza a tre voci: il Dock
è ancorato a `--dock-lato` e `AvvioMarchio` misura dal vivo. Cambiato anche
`src/app/__tests__/token.test.ts`, che ha i valori scritti a mano.
- **Ruling.** La verifica nel browser del Task 8 (barra a riposo e ridotta, larghezza misurata di
  `DISPENSA`) passa al Task 10 insieme alle altre prove nel browser: un solo avvio del dev server,
  con tutte le route pronte. *Se sbagliato:* un difetto di barra si scopre due task dopo.

### Task 9: gli ingressi, Scegli da Oggi, la Dispensa su una voce (`556043e`)

Implementatore DONE_WITH_CONCERNS. Review: spec ✅, qualità Approved. Il revisore conferma sul
sorgente di Next 16 (`app-router.js`, righe 268–279 e 84–96) che `{}` è giusto e che la lettera
del brief avrebbe fatto riaprire il foglio al ricaricamento.
- **Ruling.** Nella Dispensa la pulizia dell'indirizzo usa `replaceState({}, '', '/dispensa')` al
  posto di `window.history.state`: in Next 16 uno stato con `__NA` salta il wrapper del router e
  `canonicalUrl` resterebbe col parametro; è lo stesso schema di `vaiA` in
  `PannelloProvider.tsx:174-178`. *Se sbagliato:* una riga. **Da verificare nel browser:**
  l'indietro chiude il foglio e resta su `/dispensa`; uscire e rientrare non riapre il foglio.
- **Deviazione accettata:** cinque file di test fuori dal brief, che codificavano `/lista`
  (`guscio`, `rimando`, `piatti/da`, `piatti/page`, `importa/page`): il piano non li elencava, li
  ha fatti emergere la suite intera (7 fallimenti in 5 file); cambia solo il percorso atteso.
- **Concern:** con `useState` + `useEffect` (il codice del brief) Scegli può mostrare per un
  istante la pillola `PIANO` prima di `OGGI`; `piatti/page.tsx` evita il caso con
  `useSyncExternalStore`. Lasciato per tenere minimo il diff di Scegli (accordo con la 8c).

### Le note per l'implementatore dei Task 6–9, e come sono finite

Il piano lasciava all'implementatore alcune scelte, da annotare:
- **Task 6, il nome accessibile** di `CAMBIA` e `COM'È ANDATA` è il loro testo nel DOM: il
  maiuscolo lo fa `.pillola-poster` con `text-transform`, e il JSX scrive `Com&apos;è andata`
  (`react/no-unescaped-entities`). Eseguita come scritta.
- **Task 6, `tintaOpacaArea` o `coloreArea` per l'alone** di `TesseraPiena`. La firma di
  `tintaOpacaArea` era quella attesa, ma la tessera ha il colore d'area pieno come fondo, non la
  sua tinta al 26% (che è il fondo della tessera di dispensa): su un fondo saturo l'alone chiaro si
  vedrebbe come un contorno del testo. Scelto `coloreArea`, come `Tessera.tsx` della Lista.
- **Task 7, `iconaIngrediente`:** il piatto finto di una riga è sostituito da `trovaIcona(nome)`.
  Differenza voluta: la ricerca diretta dà l'icona anche a un ingrediente di classe `stima` che
  scade, che `ingredientePrincipale` scarta.
- **Task 7, `LargaInCoda`:** tolto il contenitore; la tessera dispari riceve la prop `larga`.
- **Task 7, il commento `eslint-disable-next-line react-hooks/set-state-in-effect`:** tenuto,
  perché serve (tolto per prova, il lint dà un errore su `void carica()`).
- **Task 8, la larghezza di `DISPENSA`** da misurare nel browser: **49,0 px su 80**, misurata
  su pagina sonda (vedi «La verifica nel browser: in parte eseguita»).
- **Task 9, `window.history.state` nella pulizia dell'indirizzo della Dispensa:** sostituito da
  `{}`, ruling sopra.

### Task 10: i documenti (`0d4d3a1`)

Scritto, senza toccare logica: in `design/sistema/DESIGN.md` le sezioni §8 «Poster del pasto»,
«Carta alternativa e carosello nel poster» e «Tessere di Oggi», la «Tab bar» a quattro voci, gli
alfa di Oggi in §2.5, le due eccezioni in §12 e §13 «Decisioni del 03/10/2026 (Oggi)»; il ponte
`docs/superpowers/specs/DESIGN-SYSTEM.md`; le precisazioni della spec (B.3, B.4.6, C.3, C.5, D.2,
D.4, F, G.2, G.3, G.4); l'intestazione di `design/sistema/tokens.css`; due commenti di
`AvvioMarchio.tsx` che dicevano ancora Lista (solo commenti).
- **Oltre il brief, per non lasciare falsità** (ritocchi di una frase, nessuna riscrittura):
  DESIGN.md §2.1 (la riga di `--ink-2`), §4 (tab bar 338 / 274), §6 (le icone piene della barra),
  §7 (`.anim-avvio` parte su `/oggi`, non su `/lista`).
- **Ruling.** L'icona dell'ingrediente principale sulle tessere `Poi` e `Domani` (codice del
  piano, Task 7) resta: stessa grammatica di `TesseraBianca` (60, tono `area`), e la spec §D.4
  tace. È scritta come costruita in DESIGN.md §12 e nella spec, marcata «da confermare con
  Andrea» (domanda 3). La tessera `Scongela` di un lotto ha l'icona per spec §D.2: non è in
  questione. *Se sbagliato:* togliere il prop `icona` in `tesseraPasto` di `page.tsx` (una riga:
  la stessa funzione fa sia `Poi` sia `Domani`; il ledger diceva «due punti», e nel codice ne
  risulta uno [letto in `page.tsx`]).
- **Ruling.** Le misure fuori scala (raggio 3 delle caselle, nome della carta a 18, mono 9 e 9,5)
  sono dichiarate nell'anatomia di §8 e in DESIGN-SYSTEM §9, non aggiunte alle scale di §3 e §5.
  *Se sbagliato:* promuoverle alle scale è, per ognuna, un cambio di una riga nei documenti
  [fonte: DESIGN-SYSTEM §9].

### La review finale (`f3a45c9..0d4d3a1`)

Verdetto dell'ultima review (opus): «merge con correzioni» [fonte: ledger del controller]. Nessun
percorso che sporchi il ledger della dispensa o il residuo; i test di Oggi verdi con `TZ` UTC,
Europe/Rome e America/Los_Angeles [fonte: ledger; non rieseguito in questa ondata]; i trailer dei
14 commit corretti. Due difetti Important e alcuni minor. I ruling, **nell'ordine in cui sono stati
presi**, ciascuno col costo se sbagliato; le correzioni di codice sono in `fb04045`, quelle dei
documenti in questo commit.

1. **I1: niente banda delle alternative quando il pasto del poster ha porzioni da preparare.**
   Confermato dal controller sul codice: `aggiornaSlot` con un cambio di piatto azzera
   `porzioniPreparate` e cancella il lotto dei Pronti dello slot (`src/data/settimana.ts:358`),
   quindi `SCAMBIA` cancellerebbe in silenzio il meal prep pianificato e `RIMETTI QUELLO DEL PIANO`
   non rimetterebbe «Cucina N in più». Ruling: nessuna banda (come per `daPronti`, spec §C.1); in
   `alternative` il fabbisogno è quantità × persone, fattore 1; il test che fissava `× (1 + N)`, la
   spec §C.3 e questo registro (Task 2) sono corretti; per cambiare quel pasto resta Scegli.
   *Se sbagliato:* nelle sere di meal prep niente proposte (si può ripensare con un annullo a due
   scritture).
2. **I2: `"id": "/lista"` nel manifest.** Senza `id` l'identità della PWA è lo `start_url`, e
   cambiarlo può far trattare l'app aggiornata come un'altra app [fonte:
   developer.chrome.com/docs/capabilities/pwa-manifest-id, indicata dal controller, non riletta in
   questa ondata]. Con `id: "/lista"` (l'id calcolato delle installazioni di oggi, che non ne
   avevano) l'identità resta e lo `start_url` nuovo arriva con l'aggiornamento del manifest. Questo
   registro non dice più «reinstallarla è la prova» (sezione «Le prove dal telefono da fare»).
   *Se sbagliato:* un `id` in più nel manifest, innocuo.
3. **I3: la domenica la settimana dopo non esiste. Non si corregge in questo ramo.** È un bivio di
   prodotto, e va ad Andrea (domanda 7). *Se sbagliato:* la domenica sera senza dopocena il poster
   resta un vicolo cieco fino alla sua scelta. **Poi deciso da Andrea il 03/10, opzione a** (precisato
   in esecuzione, 03/10): ruling 11.
4. **M1: se non si leggono la dispensa o l'ultima chiusura, la home non mostra niente che ne derivi
   e nemmeno la tessera tratteggiata.** Le due letture sono tollerate (la home regge senza), ma il
   ripiego (dispensa vuota, nessuna chiusura) faceva dire «Chiudi la prima spesa» a chi l'ha già
   chiusa e proporre alternative su una dispensa vuota. Le due letture stanno o cadono insieme
   (`leggiDispensaTollerata` in `page.tsx`); la tessera «Domani» che riempie il posto della
   tratteggiata resta, perché viene dal piano e non dalla dispensa. *Se sbagliato:* una condizione
   in `page.tsx`, e il rischio del testo falso torna.
5. **M5: `apriSettimanaCorrente` parte insieme alle letture che non ne dipendono** (definizioni
   dei pasti, repertorio, ingredienti, impostazioni, Pronti, dispensa, ultima chiusura); la
   settimana di domani si legge dopo, solo se cade in un'altra settimana (precisato in esecuzione,
   03/10: dal ruling 11 parte nello stesso giro, e si apre invece di leggersi). Le letture
   tollerate restano tolleranti; la gestione delle gare (`ultimaLettura`, `letturaAttesa`) non
   cambia. *Se sbagliato:* un giro di rete in più all'apertura (la sequenza di prima).
6. **M6: `overflowWrap: 'anywhere'` sul nome a 25 della tessera piena**, come in
   `TesseraDispensa.tsx`, e sugli altri nomi grandi (nome della tessera bianca, della carta
   alternativa, titolo del poster): una parola lunga va a capo invece di uscire dalla tessera.
   *Se sbagliato:* una proprietà CSS in meno per nome, e le parole lunghe tornano a poter uscire.
7. **M2: il Piano su `apriSettimanaCorrente`, rimandato.** Tocca `piano/page.tsx`, che il fix della
   data locale di un'altra sessione può toccare; sta fra i seguiti («I limiti noti»). *Se
   sbagliato:* i due creatori con deduplica separata restano, e il rischio descritto sotto resta.
8. **M3: nei documenti, «non ruba mai» vale solo a settimana chiusa.** In `confermata` il residuo è
   già impegnato dalla lista generata, e `allineaTopUp` (`src/data/lista.ts:177`) compensa alla
   prossima apertura della Lista. Corretti spec §C.3 e §I, e «I limiti noti». *Se sbagliato:* i
   documenti promettono più di quanto il codice fa in `confermata`.
9. **M4 e M7, rimandati.** M4 (`CAMBIA` attivo mentre una scrittura è in volo): probabilità
   bassa. M7 (fissare `TZ` in vitest): è un cambio globale della suite. Entrambi fra i seguiti.
   *Se sbagliato:* M4, `CAMBIA` apre Scegli mentre `aggiornaSlot` scrive sullo stesso slot; M7, la
   suite può passare con un difetto di data locale che si vede solo fuori da UTC.
10. **I minor documentali del Task 10, dentro la stessa ondata** (i conti 6 e 3 dei token del
    poster, il mono 9 che è già in §3, i ruling col costo e in ordine, la domanda 3 senza il
    lotto da scongelare, «per slot», la prima persona, «rivisto»), **più i minor che contano,
    riportati qui prima che il ledger sparisca** (sezione «I limiti noti»). *Se sbagliato:* frasi
    imprecise restano nei documenti.
11. **I3 deciso da Andrea il 03/10, opzione a: la domenica Oggi apre anche la settimana di domani**
    (seguito alla review finale; precisato in esecuzione, 03/10). Quando domani cade in un'altra
    settimana (`lunediDi(domani) !== lunediDi(oggi)`, cioè la domenica) `caricaDati` chiama
    `apriSettimanaCorrente(domani)` (`src/data/apertura.ts`): la legge e, se manca, la crea come il
    Piano (`creaSettimana` col planner, una creazione sola grazie alla mappa `inVolo`). Parte nello
    stesso `Promise.all` delle altre letture, perché si sa dalla data se serve. È **tollerata**
    (`tollera`): se fallisce (rete, «Configura prima i tuoi pasti», doppione non risolto) la home
    regge coi dati di oggi, `settimanaDomani` vale `null`, c'è un `console.error`, e il poster ricade
    su «Il piano di domani non c'è ancora.» con `APRI IL PIANO`; non è un errore di caricamento e non
    lascia rejection non gestite. Non toccati: `src/data/settimana.ts`, `src/data/apertura.ts`,
    `piano/page.tsx`; nessuna migrazione. Test: i tre casi «domenica» di `page.test.tsx`
    riscritti sul mock di `apriSettimanaCorrente` per argomento (il primo, «il piano non c'è»,
    diventa «l'apertura di domani fallisce»), più la domenica con la settimana di domani che parte
    insieme alle altre letture, la domenica con entrambe le aperture che falliscono, e mercoledì e
    sabato con una chiamata sola; scritti prima, visti cadere (5 su 60 nella cartella di Oggi), poi
    verdi (60 su 60) [misurato il 03/10]. *Se sbagliato:* (1) al primo caricamento di Oggi della domenica, a qualunque ora,
    nasce la bozza di lunedì con il repertorio e la dispensa di quel momento: se cambiano prima del
    lunedì la settimana esiste già e non si rigenera (l'unique su `data_inizio` impedisce un secondo
    `creaSettimana`) [letto in `creaSettimana`, non provato]; (2) i creatori della settimana sono
    ora due anche per la settimana di domani (il Piano ha il suo, con la deduplica separata, M2):
    il lunedì il Piano legge la settimana corrente e la crea solo se manca, quindi la trova già
    creata [letto in `piano/page.tsx`, non provato in produzione]; (3) un'apertura che fallisce
    ogni domenica (per esempio nessun pasto configurato) lascia il testo di prima, senza danno ma
    senza via d'uscita. Per tornare indietro basta rimettere `leggiSettimana(lunediDi(domani))`
    nella pagina: una riga e i test di domenica.

Due ruling di prima, che mancavano del costo se sbagliati, ora ce l'hanno nel loro posto: l'icona
su `Poi` e `Domani` e le misure fuori scala in «Task 10», la verifica nel browser in «La verifica
nel browser: NON ESEGUITA».

## I test del piano corretti, e perché

La regola: il codice di test del piano è una bozza da verificare, e se contraddice la spec vince la
spec. **Nessuna asserzione del piano è stata tolta o allentata, tranne una** (la prima riga
«Review finale» della tabella: il fabbisogno `× (1 + porzioni da preparare)` era costruito su una
premessa falsa); gli altri test sono stati aggiunti [fonte: i report dei task e le review; non
riverificato test per test in questo task].

| Task | Test | Cambiamento | Perché |
|---|---|---|---|
| 1, 2, 3, 4, 5, 6 | quelli del piano | nessuno | nessuna contraddizione con la spec; più test aggiunti (Task 1: accenti e «senza piatto»; Task 2: tre; Task 3: due; Task 6: otto più un'asserzione sul colore dell'etichetta di Poi) |
| 7 | «SCAMBIA fallito» | `vi.spyOn(console, 'error')` e `expect(log).toHaveBeenCalled()`; in più, il poster resta com'era | la pagina fa un `console.error` voluto; la spec §C.6 dice che il poster resta com'era |
| 7 | «errore di caricamento» | lo stesso spy e la stessa attesa | stesso `console.error` voluto |
| 7 | `beforeEach` / `afterEach` | default `leggiSettimana` → `null`; `vi.restoreAllMocks()`; due import in più | la pagina chiamava `leggiSettimana` solo quando domani cade nella settimana dopo; gli spy vanno ripristinati. Precisato in esecuzione, 03/10: dal ruling 11 la pagina non la chiama più, e il mock resta per asserire che non venga chiamata |
| 7 | `componenti.test.tsx`, RIMETTI in volo | controlla anche `COM'È ANDATA` spento e riacceso | la correzione delle scritture concorrenti |
| 8 | `tabbar.test.tsx`, il primo | quattro voci nell'ordine Oggi, Lista, Piano, Dispensa con gli href; più un test su `/oggi` attiva | il piano aveva tre voci |
| 8 | `token.test.ts` | i valori scritti a mano (338, 274, 80, 64) e un commento | fuori dal brief: il file ha le misure della barra |
| 9 | Scegli, `describe` di `?da=oggi` | `window.history.replaceState(null, '', '/')` nel `beforeEach` | un test con `?da=oggi` che fallisce prima di ripulire non sporca gli altri |
| 9 | Dispensa | `afterEach` che azzera l'indirizzo; tre test oltre ai due del brief | la pulizia dell'indirizzo prima del foglio, un id inesistente, nessun parametro |
| 9 | cinque file fuori brief | il percorso atteso passa da `/lista` a `/oggi` | conseguenza diretta di §A.3; non cambiano altro |
| Review finale | `oggi.dispensa.test.ts`, «le persone e le porzioni da preparare moltiplicano il fabbisogno» | diventa «le persone moltiplicano il fabbisogno; le porzioni da preparare dello slot no»: con `porzioniPreparate: 1` e patate 300 la Frittata (200 g) è «tutto», non «manca la patata» | lo scambio non eredita le porzioni da preparare (`aggiornaSlot` le azzera): l'asserzione `× (1 + N)` poggiava su una premessa falsa |
| Review finale | `page.test.tsx` (quattro nuovi), `componenti.test.tsx` (due), `manifest.test.ts` (nuovo, due test) | slot con porzioni da preparare: niente banda, con controprova; ultima chiusura non letta: niente tessera tratteggiata e niente banda; dispensa non letta con chiusura recente: niente banda su una dispensa vuota; le sette letture partono con una settimana lenta; `overflowWrap` sui nomi grandi; `id` e `start_url` del manifest | un test per ognuna delle correzioni di codice; scritti prima, visti cadere, poi verdi |
| Domenica (ruling 11) | `page.test.tsx`: i tre casi «domenica» | riscritti sul mock di `apriSettimanaCorrente` per argomento (`apriPerData`) invece di `leggiSettimana`; il primo («il piano non c'è») diventa «l'apertura di domani fallisce», con `console.error` asserito e le tessere di oggi; quattro test nuovi (domani parte insieme alle altre letture; entrambe le aperture falliscono; mercoledì e sabato con una chiamata sola) | la pagina apre la settimana di domani invece di leggerla; il vecchio primo caso descriveva uno stato che ora è il ripiego di un errore. Un'asserzione tolta: `leggiSettimana` chiamata con lunedì. Scritti prima, visti cadere (5), poi verdi |

Prove che i test nuovi mordono, dal report del Task 7 [fonte: mutazioni temporanee, poi
ripristinate]: icona sempre passata al poster → cade il test della banda; `larga` mai passata →
cade il test della tessera dispari; `settimanaDelPasto = settimana` → cade il test di lunedì in
bozza; `tuttiGliSlot = settimana.slots` → cade il test «Scongela» di domenica sera.

## Le misure

| Cosa | Valore | Provenienza |
|---|---|---|
| Suite di base, prima dei task | 163 file passati + 1 saltato; 2680 test passati + 1 saltato; 41 s | [misurato dal controller, nel worktree] |
| Suite intera sul ramo | 173 file passati + 1 saltato (174); 2811 test passati + 1 saltato (2812); 38,2 s | [misurato il 03/10 dopo la review finale, a `fb04045`, con i documenti non ancora committati]. Prima, a `0d4d3a1`: 172 file + 1 saltato, 2803 test + 1 saltato, 33,9 s [misurato allora] |
| Suite intera dopo il seguito della domenica | 173 file passati + 1 saltato (174); 2815 test passati + 1 saltato (2816); 52,45 s | [misurato il 03/10 a `4898775`, con i documenti non ancora committati]. Cartella di Oggi: 3 file, 60 test, tutti verdi. `npx tsc --noEmit` exit 0 e `npx eslint "src/app/(app)/oggi/"` exit 0 [misurato allora]; `npx eslint .` e `npx next build` **NON ESEGUITI** dopo il seguito |
| Crescita rispetto alla base | +10 file (i nove file di test nuovi del piano, più `manifest.test.ts`), +135 test | [calcolato: 2815 − 2680] |
| `npx tsc --noEmit` | exit 0, nessun output | [misurato il 03/10 dopo la review finale] |
| `npx eslint .` | exit 0, nessun output | [misurato il 03/10 dopo la review finale] |
| `npm run design:token` | 11 test su 11 | [misurato il 03/10 dopo la review finale, prima dei documenti] |
| `npx vitest run src/components/__tests__/avvio-marchio.test.tsx` | 19 su 19 | [misurato nel Task 10; non rieseguito da solo dopo la review finale: il file è nella suite intera, verde] |
| `npx next build` | compilato; `/oggi` fra le route (statica, client); tipi ok | [misurato dal controller prima del Task 10, nel worktree, con `.env.local` copiato dal repo principale]. **NON ESEGUITO dopo la review finale**, che ha cambiato `page.tsx`, `Poster.tsx`, `TesseraOggi.tsx`, `Alternative.tsx`, `oggi.ts` e il manifest: `tsc` e la suite li coprono, la build no |
| Instabili noti (`gestione-pasti.test.tsx`, «ELIMINA dal dialogo» nella Dispensa) | non sono falliti in nessuna delle corse registrate | [misurato dagli agenti dei Task 7 e 9 e dopo la review finale] |
| Conti della barra | 4 × 80 + 3 × 2 + 2 × 6 = 338; 4 × 64 + 3 × 2 + 2 × 6 = 274; con le misure di prima, 4 × 96 + 3 × 2 + 12 = 402, più dei 393 della cornice | [calcolato, spec §A.2] |
| Area di tap | `.pillola-poster` 38 − 2 (bordo) + 4 + 4 = 44; `.tasto-scambia` 36 + 4 + 4 = 44 | [calcolato dal CSS, non misurato nel browser] |
| Contrasti | `--ink-2` sulle sei aree 4,63–6,46:1 (`--testo-2` 2,95–4,11:1); `--poster-testo-3` su `--ink` 8,1:1; `--testo-2` su bianco 6,2:1 (`--sec` 3,4:1); `--avviso` su `--tinta-avviso` 4,7:1; `--freddo` su `--tinta-freddo` 4,3:1; `--errore` su `--ink` 3,5:1 | [calcolato ora con la formula WCAG sugli hex dei token; non misurato a schermo] |
| La seconda carta, a riposo | larghezza visibile = lista − 260: 56 px a 360, 71 a 375, 89 a 393 | [calcolato dal CSS, con il poster largo come lo schermo meno 28; non misurato] |
| Il secondo puntino | non si accende mai oltre circa 442 px | [calcolato dal CSS, stesso modello; non misurato] |
| Larghezza di `DISPENSA` in mono 8,5 / 0,12em | 49,0 px su 80 | [misurato il 03/10, pagina sonda] |
| Stato dei dati di Andrea | ultima spesa chiusa il 28/08; quindi dispensa «non aggiornata» il 03/10 | [fonte: spec, misurato il 03/10 in produzione] |

## I limiti noti

Dalla spec §I, che l'esecuzione non ha chiuso:
- **Il residuo è un avanzo, non un inventario.** A metà settimana `pantry_state.residuo` è ciò che
  resta dopo il piano della settimana: per questo, **a settimana chiusa**, le proposte non rubano
  ai pasti dopo, e il poster non dice «hai tutto». In `confermata` non vale: il residuo è già
  impegnato dalla lista generata, e `allineaTopUp` (`src/data/lista.ts:177`) compensa alla
  prossima apertura della Lista (review finale, M3).
- **Le fasce sbagliano a cavallo:** una cena alle 21:45 risulta già passata. Si corregge solo se
  succede davvero.
- **Data UTC nel resto dell'app.** Fra mezzanotte e le 2 Oggi (data locale) e il Piano (UTC)
  possono dire due giorni diversi. Difetto preesistente, fuori da questo piano; `oggiLocale` va
  riallineata all'helper quando il fix arriva (ruling del pre-flight).
- **Da scongelare non provato coi dati veri**, perché in produzione non c'è niente in congelatore.
- **Android:** il carosello scorre in orizzontale dentro il poster, lontano dai bordi (padding 16
  e margine 14), per non pestare il gesto Indietro dal bordo. **NON ESEGUITA** la prova.
- **Spesa ponte e scansione libera** sono i sotto-progetti 2 e 3: la home non ha né il tasto per
  rigenerare la lista né il tondo dello scan.

Emersi dall'esecuzione:
- **`SCONGELA` segue il flag `congelato`** anche dopo un riacquisto fresco (Task 3, domanda 1).
  In più, un lotto da scongelare compare anche se un lotto fresco più vecchio dello stesso piatto
  verrebbe mangiato prima, e due lotti congelati dello stesso piatto con due pasti domani danno
  una tessera sola (dedup sul lotto più vecchio): due domande di prodotto, non difetti provati.
- **Il secondo puntino non si accende oltre circa 442 px** di larghezza: il carosello funziona, il
  puntino no (Task 6) [calcolato].
- **`inVolo` si libera solo quando il `carica()` della scrittura si chiude** (Task 7): se una
  lettura superata si blocca, i tasti restano spenti anche con dati freschi a schermo
  [ipotesi, non testata].
- **Scegli aperto da Oggi può mostrare per un frame la pillola `PIANO` prima di `OGGI`** (Task 9)
  [ipotesi, non visto]. Nella barra, su Scegli, resta accesa la voce Piano, perché il percorso è
  `/piano/…` e l'attiva è un `startsWith` [letto dal codice, non visto].
- **Un errore inline sopravvive alle ricariche riuscite e al cambio di slot del poster; `RIPROVA`
  toglie l'errore prima che arrivino i dati e mostra lo stato vecchio con i tasti attivi** (Task 7).
- **La forma «compatta» a due colonne non ha un disegno proprio** (Task 6): `larga` allarga la
  tessera e ne abbassa l'altezza minima, il contenuto decide il resto.
- **`SCONGELA` a 4,3:1**, sotto 4,5 (spec §D.2 alla lettera, Task 6) [calcolato].
- **Oggi non chiama `completaAssegnazioni`** (ruling del Task 5): una bozza coi buchi mostra meno
  pasti finché non si apre il Piano.
- **La Dispensa apre il foglio da `?ingrediente=` e `?lotto=` una volta per montaggio**, e quello
  di un lotto anche se non è più «vivo» (Task 9): oggi si entra sempre da un'altra pagina, e il
  lotto del link è il vivo più vecchio.
- **Il caricamento fa un giro solo** (review finale, M5; prima erano tre in sequenza): la
  settimana corrente e le sette letture partono insieme, e con loro la settimana di domani quando
  cade in un'altra settimana (la domenica: si apre, e se manca si crea; precisato in esecuzione,
  03/10, ruling 11; prima si leggeva dopo, in un secondo giro). `page.tsx` è di 480 righe
  [misurato, `wc -l`, a `fb04045`; prima del seguito della domenica] con quattro responsabilità (caricamento, scritture, poster, griglia): un
  hook `useGiornata` e una funzione pura per la griglia lo alleggerirebbero.
- **Rischi di deriva nel dominio** (Task 2 e 5): `alternative` ricalcola a mano l'aritmetica di
  `consumoSlot` (`oggi.ts` contro `storno.ts`), e le `catch` di `oggi.ts` non discriminano (un
  errore di programmazione verrebbe inghiottito come un piatto illeggibile);
  `apriSettimanaCorrente` inghiotte qualunque errore se la settimana poi esiste (una creazione
  parziale sembra un successo), con la stessa guardia del Piano per mandato della spec.
- **Seguiti della review finale, rimandati con ruling** (sono i minor che contano, riportati qui
  prima che il ledger sparisca):
  - **M2: il Piano non passa a `apriSettimanaCorrente`.** I creatori della settimana corrente sono
    due, con deduplica separata: il Piano ha il suo (`creazioneInCorsoRef` in `piano/page.tsx`,
    righe 88–160, per componente), Oggi quello di `src/data/apertura.ts` (una mappa a livello di
    modulo). La pagina d'ingresso crea la settimana alla prima apertura, e il lunedì mattina il
    Piano può mostrare una settimana vuota fino alla ricarica [ipotesi della review finale,
    meccanismo non riprodotto]. Il seguito è far usare `apriSettimanaCorrente` al Piano; tocca
    `piano/page.tsx`, che il fix della data locale di un'altra sessione può toccare, quindi non in
    questo ramo.
  - **M4: `CAMBIA` resta attivo mentre una scrittura è in volo.** È un `Link`, e `inVolo` spegne
    `COM'È ANDATA` e `RIMETTI` ma non lui [letto in `Poster.tsx`, riga 53]: si può aprire Scegli
    mentre `aggiornaSlot` scrive sullo stesso slot. Probabilità bassa.
  - **M7: il test «a mezzanotte e mezza è già il giorno dopo»** (`oggi.tempo.test.ts`, riga 29) ha
    denti solo con un fuso fuori da UTC [fonte: review finale; i test di Oggi erano verdi con `TZ`
    UTC, Europe/Rome e America/Los_Angeles]. Fissare `TZ` in vitest è un cambio globale della
    suite, quindi non qui.
  - **`leggiPianoPrima` non valida la forma** della voce di `sessionStorage`: `JSON.parse(...) as
    PianoPrima` [letto in `piano-prima.ts`, riga 16]. Una voce con lo `slotId` giusto ma senza
    `dishId` passerebbe; la scrive solo Oggi, quindi è un rischio di manomissione, non di uso.
  - **`dataLunga` su una data malformata** scrive «NaN undefined» (`oggi-testi.ts`, riga 49): la
    data viene dal database, quindi oggi non si vede [letto dal codice, non provato].
  - **Già sopra, fra gli «Emersi dall'esecuzione»:** il secondo puntino del carosello oltre circa
    442 px, `inVolo` che resta acceso se una lettura superata si blocca, il lampo `PIANO` → `OGGI`
    in Scegli, il flag `congelato` non azzerato alla chiusura (domanda 1).
- **Test che mancano** (minori rinviati): il ramo «da domani non si va a dopodomani» di
  `pastoDopo`; i confini di fascia (10:30, 12:00, 15:00); un pasto da Pronti come poster; gli
  slot orfani; i tetti a 2 di scongela e Pronti; l'uso con `fattoreConsumo` 0; i rami di
  `alternative` coperti solo dal caso chiuso (q.b., priorità di scadenza, scala persone); `select`
  e `limit` di `leggiUltimaChiusura`; domenica e giorni a una cifra in `dataLunga`; il test «su
  /oggi» della barra non rimette il percorso se fallisce; il ramo «Settimana non disponibile
  dopo la creazione» e il doppio fallimento concorrente di `apriSettimanaCorrente`; lo scarto delle
  letture superate e
  «scambio ok, ricarica ko, RIPROVA → RIMETTI» nella pagina; la pulizia dell'indirizzo con
  `?lotto=` e «una volta sola» dopo `spesa:dispensa-cambiata`; il testo `OGGI` della pillola in
  Scegli (solo l'`aria-label`); il colore di `alone()`.

## Le domande aperte per Andrea

Sette aperte (dalla 1 alla 7). L'8 è decisa da Andrea il 03/10 (opzione a) e resta in fondo per
memoria.

1. **Il flag `congelato` dopo un riacquisto.** Azzerarlo quando una chiusura ricompra
   l'ingrediente, o lasciarlo com'è? Oggi la tessera `SCONGELA` segue il flag e può comparire per
   un ingrediente comprato fresco dopo essere stato congelato (spec §D.2).
2. **`SCONGELA` a 4,3:1.** Scurire il testo o abbassare l'alfa della tinta, per arrivare a 4,5:1?
3. **L'icona sulle tessere `Poi` e `Domani`.** Il piano la mette, la spec (§D.4, §G.2) non la
   nomina: tenerla o toglierla? (La tessera `Scongela` di un lotto ha l'icona per spec §D.2: non è
   in questione.)
4. **Le due eccezioni minori:** `SCAMBIA` spento a 0,06 invece di 0,10 e le pillole del poster a
   0,09em e padding 14 invece di 0,08em e 15. Restano dichiarate, o si allineano (una riga di CSS
   ciascuna)?
5. **La forma compatta a due colonne** per la tessera dispari in coda: oggi è solo più larga e più
   bassa di altezza minima. Serve un disegno vero?
6. **Il fix della data locale** (13 punti UTC, quattro test [fonte: memoria del progetto, audit
   del 03/10]) può ripartire ora che la 8c è su `main` [fonte: `git log`, PR #25]; `oggiLocale`
   va riallineata al suo helper quando arriva.
7. **Altezza della tessera dispari in coda.** È 70 px, non 64 come dice la spec §D (il contenuto supera il `minHeight`): accettare o stringere?
8. **La domenica la settimana dopo non esiste** (review finale, I3) — **decisa da Andrea il
   03/10: opzione a** (precisato in esecuzione, 03/10; non è più aperta, resta qui per memoria).
   Piano e Oggi creavano solo la settimana che contiene oggi: la domenica sera, a pasti di oggi
   finiti, il poster diceva «Il piano di domani non c'è ancora.», `APRI IL PIANO` portava a un
   Piano che la settimana di lunedì non la crea, e la tessera `Scongela` per il lunedì non
   compariva mai [fonte: review finale; non provato in produzione]. Le due strade erano **(a)**
   al primo caricamento di Oggi della domenica, a qualunque ora, Oggi apre la settimana di domani quando cade in un'altra settimana: una creazione; **(b)** solo testo, senza il tasto. Andrea ha scelto la
   (a): eseguita nel ruling 11. Il testo «Il piano di domani non c'è ancora.» resta per quando
   l'apertura fallisce, e il codice sulle due settimane (`settimanaDomani`, `tuttiGliSlot`) copre
   uno stato che in produzione si raggiunge quando l'apertura della domenica ha successo [calcolato dal codice, non provato in produzione].

## La verifica nel browser: in parte eseguita (03/10)

Il link di accesso di Andrea è tornato a spesa-zeta.vercel.app (produzione) anziché a localhost — Supabase non ha accettato l'indirizzo locale [ipotesi: le Redirect URLs di Supabase non includono localhost, non verificato] — e poi il limite di email di Supabase ha bloccato ulteriori link (429 «email rate limit exceeded» [misurato]). Così le verifiche visive sono state fatte su una pagina locale temporanea sotto `/entra` (pubblica per il proxy) che rendeva i VERI componenti (Poster, Alternative, TesseraOggi) dentro lo shell vero dell'app (Guscio, con la vera TabBar e la barra che si riduce nello scroll), con dati falsi, a viewport 375×812, dev server che esegue il codice del worktree. La pagina è stata cancellata e mai committata.

Verificato sul rendering dei componenti reali:

- [x] Barra a riposo 338 × 84, voci 80 × 72; ridotta 274 × 66, voci 64 × 54 (etichette nascoste, come il disegno esistente). [misurato il 03/10, pagina sonda]
- [x] Larghezza delle etichette: Oggi 24,5 px, Lista 30,6, Piano 30,6, **Dispensa 49,0 px su 80**, nessuna tagliata (la spec stimava circa 49). [misurato il 03/10, pagina sonda]
- [x] Pillole del poster alte 38 con `::before` a −4 px e bordo 1 px: area di tap 44. SCAMBIA alto 36 con `::before` a −4 px: 44. [misurato il 03/10, pagina sonda]
- [x] Carosello: carte 252 × 150; `scroll-snap-type: x mandatory`; lasciato a 140 px si ferma a 197 (la seconda carta, fine corsa); la seconda carta spunta dal bordo a riposo; puntini larghi 6 e 16, si accende il secondo. Con una proposta sola la carta è larga 315 su 315 e non ci sono puntini. [misurato il 03/10, pagina sonda]
- [x] Nessun elemento sotto la barra: ultima tessera fino a 672 px, barra grande da 706, ridotta da 724. [misurato il 03/10, pagina sonda]
- [x] RIMETTI QUELLO DEL PIANO su una riga sua sotto CAMBIA e COM'È ANDATA. [misurato il 03/10, pagina sonda]
- [x] Con la dispensa non aggiornata: poster con l'icona del piatto, tessera tratteggiata «La dispensa è ferma al 28 agosto» con APRI LA LISTA, poi Poi e Domani. Poster vuoto «Il piano di domani non c'è ancora.» con APRI IL PIANO. [misurato il 03/10, pagina sonda]
- [~] Tessera dispari in coda: prende le due colonne (347 px) ma è alta **70 px, non 64** come dice la spec §D: il contenuto (etichetta e nome) supera il `minHeight` 64. Scarto minore, da decidere se conta. [misurato il 03/10, pagina sonda]
- [x] Nessun errore in console dal rendering (gli unici errori sono i 429 dei tentativi di accesso). [misurato il 03/10, pagina sonda]
- [ ] NON ESEGUITI, servono la sessione: `/` porta a `/oggi`; il poster coi dati veri; CAMBIA → Scegli con la pillola OGGI e ritorno; una tessera che apre il foglio della Dispensa e l'indietro che lo chiude restando su `/dispensa`; il Marchio d'avvio su `/oggi`; la voce OGGI attiva su `/oggi` (coperta dai test di TabBar). Si fanno sul telefono dopo il merge (prove §J.4) o nel pannello browser, in sola lettura, quando l'accesso locale funziona.

**Ruling.** L'aspetto visivo è verificato su componenti reali dentro lo shell vero dell'app; la navigazione e gli stati con sessione restano da fare nel pannello browser. *Se sbagliato:* un difetto visivo arriva alle prove dal telefono invece che prima del merge.

**Da fare con Andrea**, con l'accesso fatto nel pannello browser e **solo prove in lettura**
(nessuno `SCAMBIA`, nessuna conferma in Scegli, nessuna scelta nel foglio azioni):
- [ ] `/` porta a `/oggi`.
- [ ] La barra a quattro voci a riposo (338 × 84, voci 80 × 72) e ridotta (274 × 66, voci 64 × 54),
      nessun testo tagliato, le quattro icone allineate, `OGGI` attiva su `/oggi`.
- [ ] Il poster con i dati veri; con la dispensa non aggiornata di Andrea (ultima spesa chiusa il
      28/08) la banda delle alternative e le tessere Scade, Scongela e Pronti **non** ci sono:
      c'è la tessera tratteggiata, e «Poi».
- [ ] Il carosello (serve una dispensa aggiornata o un utente di prova): scorre e si ferma su ogni
      carta (scroll-snap), la seconda carta spunta dal bordo, i puntini seguono; con una proposta
      sola niente puntini.
- [ ] Nessun elemento finisce sotto la barra in fondo alla pagina (`scroll-app` con la coda), a
      barra grande e ridotta.
- [ ] `CAMBIA` apre Scegli con la pillola `OGGI`; la pillola riporta a `/oggi` senza scrivere
      (la conferma di Scegli scrive: non farla sui dati veri).
- [ ] Una tessera Scade o Pronti apre la Dispensa col foglio giusto, e l'indietro lo chiude
      restando su `/dispensa` (il punto del ruling `replaceState({})` del Task 9); uscire e
      rientrare non riapre il foglio.
- [ ] Il Marchio d'avvio parte su `/oggi`, una volta per sessione, e atterra sul segno della Lista.
- [ ] Screenshot del poster con le alternative e della tessera tratteggiata, da incollare qui.

## Le prove dal telefono da fare

Su Chrome Android con l'indietro di sistema, dopo il merge. Spec §J.4. Tutte **NON ESEGUITE**.
Nota: con i dati del 03/10 la home di Andrea è «non aggiornata», quindi le proposte e le scadenze
si vedono solo dopo una spesa chiusa nell'app [calcolato dalla regola §E].

- [ ] **L'app installata, dopo l'aggiornamento, si apre su `/oggi`** [ipotesi, da validare sul
      telefono]. Il manifest ha ora `id: "/lista"` (l'id calcolato delle installazioni di prima,
      che non ne avevano): l'identità resta, e lo `start_url` nuovo dovrebbe arrivare con
      l'aggiornamento del manifest, dopo quello del service worker a `dispesa-v2` (l'`activate`
      cancella da sé la cache `dispesa-v1`). Se resta su `/lista`, guardare in DevTools ›
      Application › Manifest › Identity prima di toccare altro.
- [ ] Il poster giusto **in tre momenti della giornata**, a confronto con le fasce dal nome del
      pasto (per esempio mattina, primo pomeriggio, sera).
- [ ] `COM'È ANDATA` → saltato fa passare al pasto dopo (scrive un dato vero: il pasto si rimette
      a casa dal foglio azioni del Piano).
- [ ] `CAMBIA` → Scegli → conferma → torna a Oggi; la pillola dice `OGGI` e non `PIANO` (nessun
      lampo di `PIANO`, il minor del Task 9).
- [ ] **L'indietro di sistema da Scegli torna a Oggi.**
- [ ] **L'indietro di sistema dal foglio della Dispensa aperto da una tessera** (Scade o Pronti)
      **chiude il foglio e resta su `/dispensa`**; uscire dalla Dispensa e rientrare non riapre il
      foglio e l'indirizzo non ha più il parametro.
- [ ] **Con la dispensa non aggiornata (il suo caso al 03/10) la tessera tratteggiata dice «28
      agosto»** («La dispensa è ferma al 28 agosto»).
- [ ] **La domenica sera** (precisato in esecuzione, 03/10, ruling 11): domenica sera dopo cena il
      poster mostra la colazione del lunedì; il Piano, aperto lunedì, trova la settimana già
      creata.
- [ ] Dopo una spesa chiusa compaiono le proposte e le scadenze.
- [ ] `SCAMBIA` cambia il piatto e la dispensa si corregge da sola (storno); `RIMETTI QUELLO DEL
      PIANO` rimette piatto e scelte.
- [ ] La barra a quattro voci sul telefono vero: `DISPENSA` non tagliata, a riposo e ridotta.
- [ ] Il carosello scorre col dito e non pesta il gesto Indietro dal bordo (§I, Android).
- [ ] Dopo il login con il link via email e dopo `Entra in una casa` dal pannello, si arriva su
      Oggi.
- [ ] Con la rete spenta, Oggi dice «Non riusciamo a caricare la giornata.» con `APRI LA LISTA`, e
      la Lista si apre (spec §F).

## Prima del merge

Merge e deploy **solo con l'ok di Andrea**: il merge su `main` va in produzione da solo (Vercel).
Nessuna migrazione, quindi nessun ordine da rispettare con il database. Il service worker passa a
`dispesa-v2`. Restano da fare, in quest'ordine: le prove nel browser sopra, le sette domande
aperte, il merge, le prove dal telefono.
